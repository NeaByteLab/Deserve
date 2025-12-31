import type { ErrorHandler } from '@app/Types.ts'

/**
 * Request context class.
 * @description Provides access to request data, headers, and response utilities.
 */
export class Context {
  /** Original request object */
  private req: Request
  /** Parsed URL object */
  private urlObj: URL
  /** Route parameters extracted from the URL */
  private routeParams: Record<string, string>
  /** Query parameters */
  private queryParams: Record<string, string> | undefined = undefined
  /** Header map */
  private headerMap: Record<string, string> | undefined = undefined
  /** Cookie map */
  private cookieMap: Record<string, string> | undefined = undefined
  /** Body data */
  private bodyData: unknown = undefined
  /** Body parsed */
  private bodyParsed = false
  /** Error handler callback */
  private errorHandler: ErrorHandler | undefined = undefined
  /** Response headers */
  private responseHeaders: Record<string, string> = {}

  /**
   * Creates a new context instance.
   * @param req - The original request object
   * @param url - The parsed URL object
   * @param params - Route parameters extracted from the URL
   * @param errorHandler - Optional error handler callback
   */
  constructor(req: Request, url: URL, params: Record<string, string>, errorHandler?: ErrorHandler) {
    this.req = req
    this.urlObj = url
    this.routeParams = params
    this.errorHandler = errorHandler
  }

  /**
   * Reads the request body as an ArrayBuffer.
   * @returns The request body as an ArrayBuffer
   */
  async arrayBuffer(): Promise<ArrayBuffer> {
    return await this.req.arrayBuffer()
  }

  /**
   * Reads the request body as a Blob.
   * @returns The request body as a Blob
   */
  async blob(): Promise<Blob> {
    return await this.req.blob()
  }

  /**
   * Parses and returns the request body.
   * @returns The parsed request body
   */
  async body(): Promise<unknown> {
    if (this.bodyParsed && this.bodyData !== undefined) {
      return this.bodyData
    }
    const contentType = this.req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      this.bodyData = await this.req.json()
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      this.bodyData = await this.req.formData()
    } else {
      this.bodyData = await this.req.text()
    }
    this.bodyParsed = true
    return this.bodyData
  }

  /**
   * Gets cookie value by key or all cookies.
   * @param key - Cookie name to retrieve
   * @returns Cookie value, all cookies as object, or undefined
   */
  cookie(key?: string): string | Record<string, string> | undefined {
    if (this.cookieMap === undefined) {
      this.parseCookies()
    }
    return key ? this.cookieMap?.[key] : this.cookieMap
  }

  /**
   * Reads the request body as FormData.
   * @returns The request body as FormData
   */
  async formData(): Promise<FormData> {
    return await this.req.formData()
  }

  /**
   * Handles error responses with optional custom error middleware.
   * @param statusCode - HTTP status code
   * @param error - Error object
   * @returns Error response
   */
  handleError(statusCode: number, error: Error): Response {
    if (this.errorHandler) {
      return this.errorHandler(this, statusCode, error)
    }
    return this.send.custom(null, { status: statusCode, headers: this.responseHeadersMap })
  }

  /**
   * Gets header value by key or all headers.
   * @param key - Header name to retrieve (case-insensitive)
   * @returns Header value, all headers as object, or undefined
   */
  header(key?: string): string | Record<string, string> | undefined {
    if (this.headerMap === undefined) {
      this.parseHeaders()
    }
    return key ? this.headerMap?.[key?.toLowerCase()] : this.headerMap
  }

  /**
   * Gets all request headers.
   * @returns Headers object
   */
  get headers(): Headers {
    return this.req.headers
  }

  /**
   * Reads the request body as JSON.
   * @returns The request body parsed as JSON
   */
  async json(): Promise<unknown> {
    return await this.req.json()
  }

  /**
   * Gets a single route parameter by key.
   * @param key - Parameter key
   * @returns Parameter value or undefined
   */
  param(key: string): string | undefined {
    return this.routeParams[key]
  }

  /**
   * Gets all route parameters.
   * @returns Object containing all route parameters
   */
  params(): Record<string, string> {
    return { ...this.routeParams }
  }

  /**
   * Gets the URL pathname.
   * @returns The pathname portion of the URL
   */
  get pathname(): string {
    return this.urlObj.pathname
  }

  /**
   * Gets query parameter value by key or all query parameters.
   * @param key - Query parameter key
   * @returns Query parameter value, all parameters as object, or undefined
   */
  query(key?: string): string | Record<string, string> | undefined {
    if (this.queryParams === undefined) {
      this.parseQuery()
    }
    return key ? this.queryParams?.[key] : this.queryParams
  }

  /**
   * Gets all values for a query parameter.
   * @param key - Query parameter key
   * @returns Array of all values for the query parameter
   */
  queries(key: string): string[] {
    return this.urlObj.searchParams.getAll(key)
  }

  /**
   * Creates a redirect response.
   * @param url - URL to redirect to
   * @param status - HTTP status code (default: 302)
   * @returns Redirect response
   */
  redirect(url: string, status = 302): Response {
    return Response.redirect(url, status)
  }

  /**
   * Gets the original request object.
   * @returns The original Request object
   */
  get request(): Request {
    return this.req
  }

  /**
   * Gets all response headers.
   * @returns Object containing all response headers
   */
  get responseHeadersMap(): Record<string, string> {
    return { ...this.responseHeaders }
  }

  /**
   * Response sending utilities.
   * @returns Object with response utility methods
   */
  get send(): {
    custom: (body: BodyInit | null, options?: ResponseInit) => Response
    data: (
      data: Uint8Array | string,
      filename: string,
      options?: ResponseInit,
      contentType?: string
    ) => Response
    file: (filePath: string, filename?: string, options?: ResponseInit) => Promise<Response>
    html: (html: string, options?: ResponseInit) => Response
    json: (data: unknown, options?: ResponseInit) => Response
    redirect: (url: string, status?: number) => Response
    stream: (stream: ReadableStream, options?: ResponseInit, contentType?: string) => Response
    text: (text: string, options?: ResponseInit) => Response
  } {
    return {
      custom: (body: BodyInit | null, options?: ResponseInit): Response => {
        return new Response(body, {
          ...options,
          headers: {
            ...this.responseHeaders,
            ...(options?.headers || {})
          }
        })
      },
      data: (
        data: Uint8Array | string,
        filename: string,
        options?: ResponseInit,
        contentType = 'application/octet-stream'
      ): Response => {
        const body = typeof data === 'string' ? new TextEncoder().encode(data) : data
        return new Response(body as BodyInit, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': body.length.toString(),
            ...this.responseHeaders,
            ...(options?.headers || {})
          },
          ...options
        })
      },
      file: async (
        filePath: string,
        filename?: string,
        options?: ResponseInit
      ): Promise<Response> => {
        try {
          const file = await Deno.open(filePath, { read: true })
          const fileInfo = await file.stat()
          const fileName = filename || filePath.split('/').pop() || 'download'
          return new Response(file.readable, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${fileName}"`,
              'Content-Length': fileInfo.size.toString(),
              ...this.responseHeaders,
              ...(options?.headers || {})
            },
            ...options
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          throw new Error(`Failed to read file: ${errorMessage}`)
        }
      },
      html: (html: string, options?: ResponseInit): Response => {
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html',
            ...this.responseHeaders,
            ...(options?.headers || {})
          },
          ...options
        })
      },
      json: (data: unknown, options?: ResponseInit): Response => {
        return Response.json(data, {
          headers: {
            'Content-Type': 'application/json',
            ...this.responseHeaders,
            ...(options?.headers || {})
          },
          ...options
        })
      },
      redirect: (url: string, status = 302): Response => {
        return Response.redirect(url, status)
      },
      stream: (
        stream: ReadableStream,
        options?: ResponseInit,
        contentType = 'application/octet-stream'
      ): Response => {
        return new Response(stream, {
          headers: {
            'Content-Type': contentType,
            ...this.responseHeaders,
            ...(options?.headers || {})
          },
          ...options
        })
      },
      text: (text: string, options?: ResponseInit): Response => {
        return new Response(text, {
          headers: {
            'Content-Type': 'text/plain',
            ...this.responseHeaders,
            ...(options?.headers || {})
          },
          ...options
        })
      }
    }
  }

  /**
   * Sets a response header.
   * @param key - Header name
   * @param value - Header value
   * @returns The context instance for chaining
   */
  setHeader(key: string, value: string): this {
    this.responseHeaders[key] = value
    return this
  }

  /**
   * Sets multiple response headers.
   * @param headers - Object containing headers to set
   * @returns The context instance for chaining
   */
  setHeaders(headers: Record<string, string>): this {
    Object.assign(this.responseHeaders, headers)
    return this
  }

  /**
   * Sets route parameters.
   * @param params - Route parameters to set
   * @internal
   */
  setParams(params: Record<string, string>): void {
    Object.assign(this.routeParams, params)
  }

  /**
   * Reads the request body as text.
   * @returns The request body as text
   */
  async text(): Promise<string> {
    return await this.req.text()
  }

  /**
   * Gets the request URL.
   * @returns The request URL string
   */
  get url(): string {
    return this.req.url
  }

  /**
   * Parses cookies from the Cookie header.
   */
  private parseCookies(): void {
    const result: Record<string, string> = {}
    const cookieHeader = this.req.headers.get('cookie')
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [key, ...valueParts] = cookie.trim().split('=')
        if (key) {
          result[key] = valueParts.join('=')
        }
      })
    }
    this.cookieMap = result
  }

  /**
   * Parses headers from the request.
   */
  private parseHeaders(): void {
    const result: Record<string, string> = {}
    this.req.headers.forEach((value, key) => {
      result[key.toLowerCase()] = value
    })
    this.headerMap = result
  }

  /**
   * Parses query parameters from the URL.
   */
  private parseQuery(): void {
    const result: Record<string, string> = {}
    this.urlObj.searchParams.forEach((value, key) => {
      result[key] = value
    })
    this.queryParams = result
  }
}
