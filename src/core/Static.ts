import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Serves static files with caching.
 * @description Resolves path under base, enforces same directory.
 */
export class Static {
  /**
   * Serve one file from static root.
   * @description Resolves path under base, sets Content-Type and etag.
   * @param ctx - Request context
   * @param options - Path, etag, cacheControl
   * @param urlPath - URL prefix for static route
   * @returns File response or 304 or error
   */
  static async serveStaticFile(
    ctx: Core.Context,
    options: Types.ServeOptions,
    urlPath: string
  ): Promise<Response> {
    try {
      const notFound = (message: string): Promise<Response> =>
        ctx.handleError(404, new Deno.errors.NotFound(message))
      let filePath = ctx.pathname
      if (urlPath !== '/') {
        filePath = ctx.pathname.slice(urlPath.length)
      }
      if (filePath === '/' || filePath === '') {
        filePath = 'index.html'
      } else if (filePath.startsWith('/')) {
        filePath = filePath.slice(1)
      }
      const baseNormalized = options.path.replace(/^\.\//, '').replace(/[\\/]+$/, '') || '/'
      const fileSegments = filePath.split('/')
      for (const segment of fileSegments) {
        if (segment.startsWith('.')) {
          return await notFound(`Static file "${filePath}" was not found`)
        }
      }
      const fullPath = `${baseNormalized}/${filePath}`.replace(/\\/g, '/')
      const fileInfo = await Deno.stat(fullPath).catch(() => null)
      if (!fileInfo || !fileInfo.isFile) {
        return await notFound(`Static file "${filePath}" was not found`)
      }
      let baseResolved: string
      let fileResolved: string
      try {
        baseResolved = (await Deno.realPath(baseNormalized)).replace(/[\\/]+$/, '') + '/'
        fileResolved = await Deno.realPath(fullPath)
      } catch {
        return await notFound(`Static file path "${filePath}" cannot be resolved`)
      }
      const normalizedBase = baseResolved.replace(/\\/g, '/')
      const normalizedFile = fileResolved.replace(/\\/g, '/')
      if (
        normalizedFile !== normalizedBase.slice(0, -1) &&
        !normalizedFile.startsWith(normalizedBase)
      ) {
        return await notFound(`Static file "${filePath}" is outside the base directory`)
      }
      const fileExtension = filePath.split('.').pop()?.toLowerCase() ?? ''
      const contentType = Core.Constant.contentTypes[fileExtension] ?? 'application/octet-stream'
      let etag: string | null = null
      if (options.etag) {
        const hashDigest = await Core.API.subtle.digest(
          'SHA-256',
          Core.Constant.encoder.encode(`${fileInfo.size}-${fileInfo.mtime?.getTime() ?? 0}`)
        )
        const hashBytes = new Uint8Array(hashDigest)
        let hashHex = ''
        for (let i = 0; i < hashBytes.length; i++) {
          hashHex += (hashBytes[i]!).toString(16).padStart(2, '0')
        }
        etag = `"${hashHex}"`
      }
      if (etag && Static.etagMatch(ctx.request.headers.get('If-None-Match'), etag)) {
        Static.applyCacheHeaders(ctx, etag, options.cacheControl)
        return ctx.send.custom(null, { status: 304 })
      }
      ctx.setHeader('Accept-Ranges', 'bytes')
      const rangeResult = Static.parseRange(
        ctx.request.headers.get('Range'),
        fileInfo.size
      )
      if (rangeResult === 'unsatisfiable') {
        ctx.setHeader('Content-Range', `bytes */${fileInfo.size}`)
        return await ctx.handleError(
          416,
          new Deno.errors.InvalidData(
            `Static file range is not satisfiable for "${filePath}"`
          )
        )
      }
      const fsFile = await Deno.open(fileResolved, { read: true })
      ctx.setHeader('Content-Type', contentType)
      Static.applyCacheHeaders(ctx, etag, options.cacheControl)
      if (rangeResult !== null) {
        const { start, end } = rangeResult
        await fsFile.seek(start, Deno.SeekMode.Start)
        ctx.setHeader('Content-Range', `bytes ${start}-${end}/${fileInfo.size}`)
        ctx.setHeader('Content-Length', (end - start + 1).toString())
        return ctx.send.custom(Static.boundedStream(fsFile, end - start + 1), { status: 206 })
      }
      ctx.setHeader('Content-Length', fileInfo.size.toString())
      return ctx.send.custom(fsFile.readable)
    } catch (staticFileError) {
      const extractedError = Core.Handler.extractError(staticFileError)
      return await ctx.handleError(extractedError.statusCode, extractedError.error)
    }
  }

  /**
   * Apply ETag and Cache-Control headers.
   * @description Sets ETag when present and a public max-age when configured.
   * @param ctx - Request context receiving the headers
   * @param etag - Strong ETag value or null when disabled
   * @param cacheControl - Max-age in seconds, or undefined to skip
   */
  private static applyCacheHeaders(
    ctx: Core.Context,
    etag: string | null,
    cacheControl: number | undefined
  ): void {
    if (etag) {
      ctx.setHeader('ETag', etag)
    }
    if (cacheControl !== undefined && cacheControl >= 0) {
      ctx.setHeader('Cache-Control', `public, max-age=${cacheControl}`)
    }
  }

  /**
   * Stream bounded bytes then close file.
   * @description Emits at most length bytes, releasing handle on completion.
   * @param fsFile - Open file handle positioned at the range start
   * @param length - Number of bytes to emit
   * @returns ReadableStream emitting at most length bytes
   */
  private static boundedStream(fsFile: Deno.FsFile, length: number): ReadableStream<Uint8Array> {
    let remaining = length
    const streamReader = fsFile.readable.getReader()
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (remaining <= 0) {
          controller.close()
          await streamReader.cancel()
          return
        }
        const { value, done } = await streamReader.read()
        if (done || value === undefined) {
          controller.close()
          return
        }
        if (value.byteLength <= remaining) {
          remaining -= value.byteLength
          controller.enqueue(value)
        } else {
          controller.enqueue(value.subarray(0, remaining))
          remaining = 0
          controller.close()
          await streamReader.cancel()
        }
      },
      async cancel() {
        await streamReader.cancel()
      }
    })
  }

  /**
   * Weak ETag comparison for If-None-Match.
   * @description Matches exact, W/ stripped, list, or wildcard.
   * @param headerValue - If-None-Match header value
   * @param etag - Server-generated strong ETag
   * @returns True when any value matches
   */
  private static etagMatch(headerValue: string | null, etag: string): boolean {
    if (!headerValue) {
      return false
    }
    if (headerValue === '*') {
      return true
    }
    const strippedEtag = etag.startsWith('W/') ? etag.slice(2) : etag
    for (const part of headerValue.split(',')) {
      const candidate = part.trim()
      if (candidate === etag || candidate === strippedEtag) {
        return true
      }
      const weakStripped = candidate.startsWith('W/') ? candidate.slice(2) : candidate
      if (weakStripped === strippedEtag) {
        return true
      }
    }
    return false
  }

  /**
   * Parse single byte-range against known size.
   * @description Reads a single bytes range, ignores invalid values.
   * @param headerValue - Raw Range header value or null
   * @param size - Total representation size in bytes
   * @returns Inclusive start and end, unsatisfiable, or null fallback
   */
  private static parseRange(
    headerValue: string | null,
    size: number
  ): Types.ByteRange | 'unsatisfiable' | null {
    if (headerValue === null) {
      return null
    }
    const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(headerValue.trim())
    if (rangeMatch === null) {
      return null
    }
    const startToken = rangeMatch[1] ?? ''
    const endToken = rangeMatch[2] ?? ''
    if (startToken === '' && endToken === '') {
      return null
    }
    if (size === 0) {
      return 'unsatisfiable'
    }
    let start: number
    let end: number
    if (startToken === '') {
      const suffixLength = Number.parseInt(endToken, 10)
      if (suffixLength === 0) {
        return 'unsatisfiable'
      }
      start = Math.max(0, size - suffixLength)
      end = size - 1
    } else {
      start = Number.parseInt(startToken, 10)
      end = endToken === '' ? size - 1 : Number.parseInt(endToken, 10)
      if (end > size - 1) {
        end = size - 1
      }
    }
    if (start > end || start >= size) {
      return 'unsatisfiable'
    }
    return { start, end }
  }
}
