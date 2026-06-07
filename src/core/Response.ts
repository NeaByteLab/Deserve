import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import { Handler } from '@core/Handler.ts'

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
    responseHeaders: Types.StringRecord,
    setCookieValues: readonly string[],
    buildRedirect: Types.RedirectBuilder
  ): Types.SendHelpers {
    const mergedHeaders = (contentType: string, options?: ResponseInit) => {
      const extra = options?.headers ? Handler.toRecord(options.headers) : undefined
      return extra
        ? { 'Content-Type': contentType, ...responseHeaders, ...extra }
        : { 'Content-Type': contentType, ...responseHeaders }
    }
    const toInit = (headers: Types.StringRecord, options?: ResponseInit): ResponseInit =>
      options ? { ...options, headers } : { headers }
    const applyCookies = (response: globalThis.Response): globalThis.Response => {
      for (const cookieValue of setCookieValues) {
        response.headers.append('Set-Cookie', cookieValue)
      }
      return response
    }
    return {
      custom(body: BodyInit | null, options?: ResponseInit): globalThis.Response {
        const extraRecord = options?.headers ? Handler.toRecord(options.headers) : undefined
        const headers = extraRecord
          ? { ...responseHeaders, ...extraRecord }
          : { ...responseHeaders }
        return applyCookies(new globalThis.Response(body, toInit(headers, options)))
      },
      data(
        data: Uint8Array | string,
        filename: string,
        options?: ResponseInit,
        contentType = 'application/octet-stream'
      ): globalThis.Response {
        const encodedBody = typeof data === 'string' ? Core.Constant.encoder.encode(data) : data
        return applyCookies(
          new globalThis.Response(
            encodedBody as BodyInit,
            toInit(
              {
                ...mergedHeaders(contentType, options),
                'Content-Disposition': Response.contentDisposition(filename),
                'Content-Length': encodedBody.length.toString()
              },
              options
            )
          )
        )
      },
      async file(
        filePath: string,
        filename?: string,
        options?: ResponseInit
      ): Promise<globalThis.Response> {
        let fsFile: Deno.FsFile | null = null
        try {
          fsFile = await Deno.open(filePath, { read: true })
          const fileInfo = await fsFile.stat()
          const downloadName = filename || filePath.split(/[\\/]/).pop() || 'download'
          return applyCookies(
            new globalThis.Response(
              fsFile.readable,
              toInit(
                {
                  ...mergedHeaders('application/octet-stream', options),
                  'Content-Disposition': Response.contentDisposition(downloadName),
                  'Content-Length': fileInfo.size.toString()
                },
                options
              )
            )
          )
        } catch (error) {
          fsFile?.close()
          const errorMessage = error instanceof globalThis.Error ? error.message : 'Unknown error'
          throw new Deno.errors.NotFound(
            `Failed to read file "${filePath}" because ${errorMessage}`
          )
        }
      },
      html: (html: string, options?: ResponseInit) =>
        applyCookies(
          new globalThis.Response(
            html,
            toInit(mergedHeaders('text/html; charset=utf-8', options), options)
          )
        ),
      json: (data: unknown, options?: ResponseInit) =>
        applyCookies(
          globalThis.Response.json(
            data,
            toInit(mergedHeaders('application/json', options), options)
          )
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
          new globalThis.Response(stream, toInit(mergedHeaders(contentType, options), options))
        ),
      text: (text: string, options?: ResponseInit) =>
        applyCookies(
          new globalThis.Response(
            text,
            toInit(mergedHeaders('text/plain; charset=utf-8', options), options)
          )
        )
    }
  }

  /**
   * Build RFC 6266 Content-Disposition value.
   * @description Sanitizes filename, emits ASCII fallback and UTF-8 parameter.
   * @param filename - Raw filename string
   * @returns Safe attachment header value
   */
  private static contentDisposition(filename: string): string {
    const basename = filename.replace(Core.Constant.sanitizeRegex, '')
    const asciiFallback = basename
      .replace(Core.Constant.nonAsciiGlobalRegex, '_')
      .replace(Core.Constant.escapeRegex, (ch) => (ch === '\\' ? '\\\\' : '\\"'))
    let headerValue = `attachment; filename="${asciiFallback}"`
    if (Core.Constant.nonAsciiRegex.test(basename)) {
      headerValue += `; filename*=UTF-8''${encodeURIComponent(basename)}`
    }
    return headerValue
  }
}
