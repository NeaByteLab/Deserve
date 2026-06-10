import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

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
      const extra = options?.headers ? Core.Handler.toRecord(options.headers) : undefined
      return extra
        ? { ...responseHeaders, 'Content-Type': contentType, ...extra }
        : { ...responseHeaders, 'Content-Type': contentType }
    }
    const toInit = (headers: Types.StringRecord, options?: ResponseInit): ResponseInit => {
      if (options?.status !== undefined) {
        const status = options.status
        if (
          !Number.isInteger(status) ||
          ((status < 200 || status > 599) && !Core.Constant.nullBodyStatuses.has(status))
        ) {
          throw new Deno.errors.InvalidData(
            `Response status must be an integer in the 200-599 range, got "${String(status)}"`
          )
        }
      }
      return options ? { ...options, headers } : { headers }
    }
    const isNullBodyStatus = (options?: ResponseInit): boolean =>
      options?.status !== undefined && Core.Constant.nullBodyStatuses.has(options.status)
    const bodyForStatus = (body: BodyInit | null, options?: ResponseInit): BodyInit | null =>
      isNullBodyStatus(options) ? null : body
    const applyCookies = (response: globalThis.Response): globalThis.Response => {
      Core.Handler.appendCookies(response.headers, setCookieValues)
      return response
    }
    return {
      custom(body: BodyInit | null, options?: ResponseInit): globalThis.Response {
        const extraRecord = options?.headers ? Core.Handler.toRecord(options.headers) : undefined
        const headers = extraRecord
          ? { ...responseHeaders, ...extraRecord }
          : { ...responseHeaders }
        return applyCookies(
          new Core.API.Response(bodyForStatus(body, options), toInit(headers, options))
        )
      },
      data(
        data: Uint8Array | string,
        filename: string,
        options?: ResponseInit,
        contentType = 'application/octet-stream'
      ): globalThis.Response {
        const encodedBody = typeof data === 'string' ? Core.Constant.encoder.encode(data) : data
        if (isNullBodyStatus(options)) {
          return applyCookies(
            new Core.API.Response(null, toInit(mergedHeaders(contentType, options), options))
          )
        }
        return applyCookies(
          new Core.API.Response(
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
          if (isNullBodyStatus(options)) {
            fsFile.close()
            return applyCookies(
              new Core.API.Response(
                null,
                toInit(
                  {
                    ...mergedHeaders('application/octet-stream', options),
                    'Content-Disposition': Response.contentDisposition(downloadName)
                  },
                  options
                )
              )
            )
          }
          return applyCookies(
            new Core.API.Response(
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
          const errorMessage = error instanceof Core.API.Error ? error.message : 'Unknown error'
          throw new Deno.errors.NotFound(
            `Failed to read file "${filePath}" because ${errorMessage}`
          )
        }
      },
      html: (html: string, options?: ResponseInit) =>
        applyCookies(
          new Core.API.Response(
            bodyForStatus(html, options),
            toInit(mergedHeaders('text/html; charset=utf-8', options), options)
          )
        ),
      json: (data: unknown, options?: ResponseInit) => {
        const init = toInit(mergedHeaders('application/json', options), options)
        return isNullBodyStatus(options)
          ? applyCookies(new Core.API.Response(null, init))
          : applyCookies(Core.API.Response.json(data, init))
      },
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
          new Core.API.Response(
            bodyForStatus(stream, options),
            toInit(mergedHeaders(contentType, options), options)
          )
        ),
      text: (text: string, options?: ResponseInit) =>
        applyCookies(
          new Core.API.Response(
            bodyForStatus(text, options),
            toInit(mergedHeaders('text/plain; charset=utf-8', options), options)
          )
        )
    }
  }

  /**
   * Build Content-Disposition header value.
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
