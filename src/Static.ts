import type * as Types from '@app/index.ts'
import { Constant } from '@app/index.ts'

/**
 * Serves static files with etag and cache.
 * @description Resolves path under base; enforces same directory.
 */
export class Static {
  /**
   * Serve one file from static root.
   * @description Resolves path under base; sets Content-Type and etag.
   * @param ctx - Request context
   * @param options - Path, etag, cacheControl
   * @param urlPath - URL prefix for static route
   * @returns File response or 304 or error
   */
  static async serveStaticFile(
    ctx: Types.Context,
    options: Types.ServeOptions,
    urlPath: string
  ): Promise<Response> {
    try {
      let filePath = ctx.pathname
      if (urlPath !== '/') {
        filePath = ctx.pathname.slice(urlPath.length)
      }
      if (filePath === '/' || filePath === '') {
        filePath = 'index.html'
      } else if (filePath.startsWith('/')) {
        filePath = filePath.slice(1)
      }
      const staticBasePath = options.path.startsWith('/')
        ? options.path
        : `${Deno.cwd()}/${options.path}`
      const baseNormalized = staticBasePath.replace(/^\.\//, '').replace(/\/+$/, '') || '/'
      const fullPath = new URL(filePath, `file://${baseNormalized}/`).pathname
      const fileInfo = await Deno.stat(fullPath).catch(() => null)
      if (!fileInfo || !fileInfo.isFile) {
        return await ctx.handleError(404, new Error('File not found'))
      }
      let baseResolved: string
      let fileResolved: string
      try {
        baseResolved = (await Deno.realPath(baseNormalized)).replace(/\/+$/, '') + '/'
        fileResolved = await Deno.realPath(fullPath)
      } catch {
        return await ctx.handleError(404, new Error('File not found'))
      }
      if (fileResolved !== baseResolved.slice(0, -1) && !fileResolved.startsWith(baseResolved)) {
        return await ctx.handleError(404, new Error('File not found'))
      }
      const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
      const contentType = Constant.contentTypes[extension] ?? 'application/octet-stream'
      const file = await Deno.open(fileResolved, { read: true })
      let etag: string | null = null
      if (options.etag) {
        const hashBuffer = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(`${fileInfo.size}-${fileInfo.mtime?.getTime()}`)
        )
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
        etag = `"${hashHex}"`
      }
      if (etag && ctx.request.headers.get('If-None-Match') === etag) {
        file.close()
        ctx.setHeader('ETag', etag)
        if (options.cacheControl !== undefined) {
          ctx.setHeader('Cache-Control', `public, max-age=${options.cacheControl}`)
        }
        return ctx.send.custom(null, { status: 304, headers: ctx.responseHeadersMap })
      }
      ctx.setHeader('Content-Type', contentType)
      ctx.setHeader('Content-Length', fileInfo.size.toString())
      if (etag) {
        ctx.setHeader('ETag', etag)
      }
      if (options.cacheControl !== undefined) {
        ctx.setHeader('Cache-Control', `public, max-age=${options.cacheControl}`)
      }
      return ctx.send.custom(file.readable)
    } catch (staticFileError) {
      return await ctx.handleError(500, staticFileError as Error)
    }
  }
}
