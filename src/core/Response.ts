import type * as Types from '@interfaces/index.ts'
import { Helper } from '@core/Helper.ts'

/**
 * Factory for ctx.send response helpers.
 * @description Merges context headers with each response.
 */
export class Response {
  /**
   * Create SendHelpers for headers and redirect.
   * @description Binds base headers and redirect builder to helpers.
   * @param responseHeaders - Base headers for every response
   * @param setCookieValues - Cookie values to append
   * @param buildRedirect - Function to build redirect Response
   * @returns SendHelpers for ctx.send
   */
  static create(
    responseHeaders: Record<string, string>,
    setCookieValues: readonly string[],
    buildRedirect: Types.RedirectBuilder
  ): Types.SendHelpers {
    const mergedHeaders = (contentType: string, options?: ResponseInit) => ({
      'Content-Type': contentType,
      ...responseHeaders,
      ...Helper.toRecord(options?.headers)
    })

    const init = (headers: Record<string, string>, options?: ResponseInit): ResponseInit =>
      options ? { ...options, headers } : { headers }

    const applyCookies = (response: globalThis.Response): globalThis.Response => {
      for (const cookie of setCookieValues) {
        response.headers.append('Set-Cookie', cookie)
      }
      return response
    }

    return {
      custom(body: BodyInit | null, options?: ResponseInit): globalThis.Response {
        return applyCookies(
          new globalThis.Response(
            body,
            init(
              { ...responseHeaders, ...Helper.toRecord(options?.headers) },
              options
            )
          )
        )
      },
      data(
        data: Uint8Array | string,
        filename: string,
        options?: ResponseInit,
        contentType = 'application/octet-stream'
      ): globalThis.Response {
        const body = typeof data === 'string' ? new TextEncoder().encode(data) : data
        return applyCookies(
          new globalThis.Response(
            body as BodyInit,
            init({
              ...mergedHeaders(contentType, options),
              'Content-Disposition': `attachment; filename="${
                Response.sanitizeFilename(filename)
              }"`,
              'Content-Length': body.length.toString()
            }, options)
          )
        )
      },
      async file(
        filePath: string,
        filename?: string,
        options?: ResponseInit
      ): Promise<globalThis.Response> {
        let file: Deno.FsFile | null = null
        try {
          file = await Deno.open(filePath, { read: true })
          const fileInfo = await file.stat()
          const name = filename || filePath.split(/[\\/]/).pop() || 'download'
          return applyCookies(
            new globalThis.Response(
              file.readable,
              init({
                ...mergedHeaders('application/octet-stream', options),
                'Content-Disposition': `attachment; filename="${Response.sanitizeFilename(name)}"`,
                'Content-Length': fileInfo.size.toString()
              }, options)
            )
          )
        } catch (error) {
          file?.close()
          const message = error instanceof globalThis.Error ? error.message : 'Unknown error'
          throw new Deno.errors.NotFound(
            `Failed to read file "${filePath}" because ${message}`
          )
        }
      },
      html: (html: string, options?: ResponseInit) =>
        applyCookies(
          new globalThis.Response(
            html,
            init(mergedHeaders('text/html; charset=utf-8', options), options)
          )
        ),
      json: (data: unknown, options?: ResponseInit) =>
        applyCookies(
          globalThis.Response.json(data, init(mergedHeaders('application/json', options), options))
        ),
      redirect(
        url: string,
        status: Types.RedirectStatus = 302,
        options?: Types.RedirectInit
      ): globalThis.Response {
        return buildRedirect(url, status, options?.headers)
      },
      stream: (
        stream: ReadableStream,
        options?: ResponseInit,
        contentType = 'application/octet-stream'
      ) =>
        applyCookies(
          new globalThis.Response(stream, init(mergedHeaders(contentType, options), options))
        ),
      text: (text: string, options?: ResponseInit) =>
        applyCookies(
          new globalThis.Response(
            text,
            init(mergedHeaders('text/plain; charset=utf-8', options), options)
          )
        )
    }
  }

  /**
   * Sanitize filename for Content-Disposition.
   * @description Strips separators then escapes per RFC 6266.
   * @param filename - Raw filename string
   * @returns Escaped basename safe for quoted Content-Disposition
   */
  private static sanitizeFilename(filename: string): string {
    const stripped = filename.replace(/^.*[\\/]/, '')
    let clean = ''
    for (let i = 0; i < stripped.length; i++) {
      const code = stripped.charCodeAt(i)
      if (code >= 32 && code !== 127) {
        clean += stripped[i]
      }
    }
    return clean.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  }
}
