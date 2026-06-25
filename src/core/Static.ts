import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Filesystem static file server.
 * @description Serves files with caching, ranges, and security.
 */
export class Static {
  /**
   * Serve file from base directory.
   * @description Handles caching, ranges, and path containment.
   * @param ctx - Request context instance
   * @param options - Static serving options
   * @param urlPath - URL path relative to mount
   * @returns Promise resolving to file response
   */
  static async serveFile(
    ctx: Core.Context,
    options: Types.ServeOptions,
    urlPath: string
  ): Promise<Response> {
    const baseDirectory = Static.#baseDirectory(options.path)
    const relativePath = Static.#relativePath(urlPath)
    if (relativePath.split('/').some((segment) => segment.startsWith('.'))) {
      Core.Context.internalOf(ctx).emitEvent(
        Core.Observability.internalEvent('static:missing', { path: urlPath })
      )
      return await ctx.handleError(404, new Deno.errors.NotFound('static file not found'))
    }
    const resolved = await Static.#resolveContained(
      baseDirectory,
      `${baseDirectory}/${relativePath}`
    )
    if (resolved === null) {
      Core.Context.internalOf(ctx).emitEvent(
        Core.Observability.internalEvent('static:missing', { path: urlPath })
      )
      return await ctx.handleError(404, new Deno.errors.NotFound('static file not found'))
    }
    const method = ctx.get.method()
    if (method !== 'GET' && method !== 'HEAD') {
      ctx.set.header('Allow', 'GET, HEAD')
      return await ctx.handleError(
        405,
        new Deno.errors.NotSupported('static file supports GET and HEAD only')
      )
    }
    const lastModified = resolved.fileInfo.mtime ?? null
    const etag = (options.etag ?? true) ? await Static.#computeEtag(resolved.fileInfo) : null
    if (Static.#notModified(ctx.get.request().headers, etag, lastModified)) {
      Static.#applyCacheHeaders(ctx, options.cacheControl, etag, lastModified)
      return ctx.send.empty(304)
    }
    ctx.set.header('Accept-Ranges', 'bytes')
    const ifRange = ctx.get.request().headers.get('If-Range')
    const rangeAllowed = ifRange === null || Static.#ifRangeFresh(ifRange, lastModified)
    const rangeResult = rangeAllowed
      ? Static.#parseRange(ctx.get.request().headers.get('Range'), resolved.fileInfo.size)
      : null
    const contentType = Static.#contentType(relativePath)
    Static.#applyCacheHeaders(ctx, options.cacheControl, etag, lastModified)
    if (rangeResult === 'unsatisfiable') {
      ctx.set.header('Content-Range', `bytes */${resolved.fileInfo.size}`)
      return await ctx.handleError(
        416,
        new Deno.errors.InvalidData('static file range is not satisfiable')
      )
    }
    const file = await Deno.open(resolved.filePath, { read: true })
    ctx.set.header('Content-Type', contentType)
    if (rangeResult !== null) {
      await file.seek(rangeResult.start, Deno.SeekMode.Start)
      const length = rangeResult.end - rangeResult.start + 1
      ctx.set.header(
        'Content-Range',
        `bytes ${rangeResult.start}-${rangeResult.end}/${resolved.fileInfo.size}`
      )
      ctx.set.header('Content-Length', length.toString())
      return ctx.send.custom(Static.#boundedStream(file, length), { status: 206 })
    }
    ctx.set.header('Content-Length', resolved.fileInfo.size.toString())
    return ctx.send.custom(file.readable)
  }

  /**
   * Apply cache related response headers.
   * @description Sets ETag, Last-Modified, and Cache-Control.
   * @param ctx - Request context instance
   * @param cacheControl - Max age seconds or undefined
   * @param etag - Entity tag value or null
   * @param lastModified - Last modified date or null
   */
  static #applyCacheHeaders(
    ctx: Core.Context,
    cacheControl: number | undefined,
    etag: string | null,
    lastModified: Date | null
  ): void {
    if (etag !== null) {
      ctx.set.header('ETag', etag)
    }
    if (lastModified !== null) {
      ctx.set.header('Last-Modified', lastModified.toUTCString())
    }
    if (cacheControl !== undefined && cacheControl >= 0) {
      ctx.set.header('Cache-Control', `public, max-age=${cacheControl}`)
    }
  }

  /**
   * Normalize base directory path.
   * @description Strips trailing slashes and validates input.
   * @param path - Configured static directory path
   * @returns Normalized base directory path
   * @throws When path is empty or invalid
   */
  static #baseDirectory(path: string): string {
    if (typeof path !== 'string' || path.length === 0) {
      throw new Deno.errors.InvalidData('static path must be a non-empty string')
    }
    return path.replace(/[\\/]+$/, '') || '/'
  }

  /**
   * Build length bounded read stream.
   * @description Caps emitted bytes to requested length.
   * @param file - Open file handle to read
   * @param length - Maximum bytes to emit
   * @returns Bounded readable byte stream
   */
  static #boundedStream(file: Deno.FsFile, length: number): ReadableStream<Uint8Array> {
    let remaining = length
    const reader = file.readable.getReader()
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (remaining <= 0) {
          controller.close()
          await reader.cancel()
          return
        }
        const result = await reader.read()
        if (result.done || result.value === undefined) {
          controller.close()
          return
        }
        if (result.value.byteLength <= remaining) {
          remaining -= result.value.byteLength
          controller.enqueue(result.value)
          return
        }
        controller.enqueue(result.value.subarray(0, remaining))
        remaining = 0
        controller.close()
        await reader.cancel()
      },
      async cancel() {
        await reader.cancel()
      }
    })
  }

  /**
   * Compute weak ETag for file.
   * @description Hashes size and modification time seed.
   * @param fileInfo - File info for hashing
   * @returns Weak ETag header value
   */
  static async #computeEtag(fileInfo: Deno.FileInfo): Promise<string> {
    const seed = `${fileInfo.size}-${fileInfo.mtime?.getTime() ?? 0}`
    const digest = await Core.API.subtle.digest('SHA-256', Core.Constant.encoder.encode(seed))
    const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
      .join('')
    return `W/"${hex}"`
  }

  /**
   * Resolve content type from path.
   * @description Maps file extension to known type.
   * @param relativePath - Relative file path used
   * @returns Content type header value
   */
  static #contentType(relativePath: string): string {
    const extension = relativePath.split('.').pop()?.toLowerCase() ?? ''
    return Core.Constant.contentTypes[extension] ?? Core.Constant.defaultContentType
  }

  /**
   * Check ETag matches header value.
   * @description Compares strong and weak tag forms.
   * @param headerValue - If-None-Match header value
   * @param etag - Current entity tag value
   * @returns True when ETag matches
   */
  static #etagMatches(headerValue: string | null, etag: string): boolean {
    if (headerValue === null) {
      return false
    }
    if (headerValue === '*') {
      return true
    }
    const target = etag.startsWith('W/') ? etag.slice(2) : etag
    for (const part of headerValue.split(',')) {
      const candidate = part.trim()
      const stripped = candidate.startsWith('W/') ? candidate.slice(2) : candidate
      if (candidate === etag || stripped === target) {
        return true
      }
    }
    return false
  }

  /**
   * Check If-Range freshness by date.
   * @description Rejects entity tags and compares seconds.
   * @param ifRange - If-Range header value
   * @param lastModified - Last modified date or null
   * @returns True when range is fresh
   */
  static #ifRangeFresh(ifRange: string, lastModified: Date | null): boolean {
    if (ifRange.startsWith('"') || ifRange.startsWith('W/')) {
      return false
    }
    const since = Date.parse(ifRange)
    return lastModified !== null && Number.isFinite(since) &&
      Math.floor(lastModified.getTime() / 1000) === Math.floor(since / 1000)
  }

  /**
   * Check resource is not modified.
   * @description Evaluates ETag then modified since headers.
   * @param headers - Request headers instance
   * @param etag - Current entity tag value
   * @param lastModified - Last modified date or null
   * @returns True when resource unchanged
   */
  static #notModified(headers: Headers, etag: string | null, lastModified: Date | null): boolean {
    const ifNoneMatch = headers.get('If-None-Match')
    if (ifNoneMatch !== null) {
      return etag !== null && Static.#etagMatches(ifNoneMatch, etag)
    }
    const ifModifiedSince = headers.get('If-Modified-Since')
    if (ifModifiedSince !== null && lastModified !== null) {
      const since = Date.parse(ifModifiedSince)
      return Number.isFinite(since) &&
        Math.floor(lastModified.getTime() / 1000) <= Math.floor(since / 1000)
    }
    return false
  }

  /**
   * Parse byte range request header.
   * @description Returns range, unsatisfiable, or null result.
   * @param headerValue - Range header value
   * @param size - Total file size in bytes
   * @returns Byte range, unsatisfiable, or null
   */
  static #parseRange(
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
      end = endToken === '' ? size - 1 : Math.min(Number.parseInt(endToken, 10), size - 1)
    }
    if (start > end || start >= size) {
      return 'unsatisfiable'
    }
    return { start, end }
  }

  /**
   * Normalize URL path into relative.
   * @description Strips leading slash and defaults index.
   * @param urlPath - URL path relative to mount
   * @returns Relative file path string
   */
  static #relativePath(urlPath: string): string {
    let filePath = urlPath
    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1)
    }
    if (filePath === '') {
      return 'index.html'
    }
    return filePath
  }

  /**
   * Resolve file within base directory.
   * @description Blocks path escape and non file targets.
   * @param baseDirectory - Allowed base directory path
   * @param requestedPath - Requested file path
   * @returns Resolved file info or null
   */
  static async #resolveContained(
    baseDirectory: string,
    requestedPath: string
  ): Promise<Types.ResolvedFile | null> {
    try {
      const baseResolved = `${(await Deno.realPath(baseDirectory)).replace(/[\\/]+$/, '')}/`
      const fileResolved = await Deno.realPath(requestedPath)
      const normalizedBase = baseResolved.replace(/\\/g, '/')
      const normalizedFile = fileResolved.replace(/\\/g, '/')
      if (
        normalizedFile !== normalizedBase.slice(0, -1) &&
        !normalizedFile.startsWith(normalizedBase)
      ) {
        return null
      }
      const info = await Deno.stat(fileResolved)
      if (!info.isFile) {
        return null
      }
      return { fileInfo: info, filePath: fileResolved }
    } catch {
      return null
    }
  }
}
