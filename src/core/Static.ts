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
      const fsFile = await Deno.open(fileResolved, { read: true })
      ctx.setHeader('Content-Type', contentType)
      ctx.setHeader('Content-Length', fileInfo.size.toString())
      Static.applyCacheHeaders(ctx, etag, options.cacheControl)
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
}
