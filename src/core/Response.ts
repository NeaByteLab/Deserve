import type * as Types from '@interfaces/index.ts'

/**
 * Factory for ctx.send response helpers.
 * @description Merges context headers with each response.
 */
export class Response {
  /**
   * Create SendHelpers for headers and redirect.
   * @description Binds base headers and redirect builder to helpers.
   * @param responseHeaders - Base headers for every response
   * @param buildRedirect - Function to build redirect Response
   * @returns SendHelpers for ctx.send
   */
  static create(
    responseHeaders: Record<string, string>,
    buildRedirect: (url: string, status: number, extraHeaders?: HeadersInit) => globalThis.Response
  ): Types.SendHelpers {
    return {
      custom(body: BodyInit | null, options?: ResponseInit): globalThis.Response {
        return new globalThis.Response(body, {
          ...options,
          headers: Response.mergeHeaders(responseHeaders, options)
        })
      },
      data(
        data: Uint8Array | string,
        filename: string,
        options?: ResponseInit,
        contentType = 'application/octet-stream'
      ): globalThis.Response {
        const body = typeof data === 'string' ? new TextEncoder().encode(data) : data
        return new globalThis.Response(body as BodyInit, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': body.length.toString(),
            ...Response.mergeHeaders(responseHeaders, options)
          },
          ...options
        })
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
          const fileName = filename || filePath.split('/').pop() || 'download'
          return new globalThis.Response(file.readable, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${fileName}"`,
              'Content-Length': fileInfo.size.toString(),
              ...Response.mergeHeaders(responseHeaders, options)
            },
            ...options
          })
        } catch (error) {
          if (file) {
            file.close()
          }
          const errorMessage = error instanceof globalThis.Error ? error.message : 'Unknown error'
          throw new globalThis.Error(`Failed to read file: ${errorMessage}`)
        }
      },
      html(html: string, options?: ResponseInit): globalThis.Response {
        return new globalThis.Response(html, {
          headers: {
            'Content-Type': 'text/html',
            ...Response.mergeHeaders(responseHeaders, options)
          },
          ...options
        })
      },
      json(data: unknown, options?: ResponseInit): globalThis.Response {
        return globalThis.Response.json(data, {
          headers: {
            'Content-Type': 'application/json',
            ...Response.mergeHeaders(responseHeaders, options)
          },
          ...options
        })
      },
      redirect(url: string, status = 302, options?: ResponseInit): globalThis.Response {
        return buildRedirect(url, status, options?.headers)
      },
      stream(
        stream: ReadableStream,
        options?: ResponseInit,
        contentType = 'application/octet-stream'
      ): globalThis.Response {
        return new globalThis.Response(stream, {
          headers: {
            'Content-Type': contentType,
            ...Response.mergeHeaders(responseHeaders, options)
          },
          ...options
        })
      },
      text(text: string, options?: ResponseInit): globalThis.Response {
        return new globalThis.Response(text, {
          headers: {
            'Content-Type': 'text/plain',
            ...Response.mergeHeaders(responseHeaders, options)
          },
          ...options
        })
      }
    }
  }

  /**
   * Convert HeadersInit to string record.
   * @description Normalizes Headers, array, or object to key-value record.
   * @param init - Optional headers (Headers, array, or object)
   * @returns Record of header name to value
   */
  private static headersToRecord(init?: HeadersInit): Record<string, string> {
    if (!init) {
      return {}
    }
    if (init instanceof Headers) {
      const out: Record<string, string> = {}
      init.forEach((value, key) => {
        out[key] = value
      })
      return out
    }
    if (Array.isArray(init)) {
      return Object.fromEntries(init as [string, string][])
    }
    return { ...init }
  }

  /**
   * Merge base headers with options headers.
   * @description Overlays options.headers onto base; returns new record.
   * @param base - Base headers record
   * @param options - Optional ResponseInit with headers
   * @returns Merged headers record
   */
  private static mergeHeaders(
    base: Record<string, string>,
    options?: ResponseInit
  ): Record<string, string> {
    return { ...base, ...Response.headersToRecord(options?.headers) }
  }
}
