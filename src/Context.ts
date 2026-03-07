import type * as Types from '@app/Types.ts'
import { Redirect, ResponseHelpers } from '@app/index.ts'

/**
 * Request wrapper with body, query, params.
 * @description Parses body once; exposes headers, cookies, state.
 */
export class Context {
  /** Parsed body; undefined until parsed. */
  private bodyData: unknown = undefined
  /** Format body was parsed as. */
  private bodyParsedAs: 'arraybuffer' | 'blob' | 'form' | 'json' | 'text' | null = null
  /** Parsed cookie name-to-value map; lazy. */
  private cookieMap: Record<string, string> | undefined = undefined
  /** Custom error handler when set. */
  private errorHandler: Types.ErrorHandler | undefined = undefined
  /** Lowercased request header map; lazy. */
  private headerMap: Record<string, string> | undefined = undefined
  /** Parsed query string params; lazy. */
  private queryParams: Record<string, string> | undefined = undefined
  /** Arbitrary state for middleware/handlers. */
  private requestState: Record<string, unknown> = {}
  /** Incoming fetch Request. */
  private req: Request
  /** Response headers to send. */
  private responseHeaders: Record<string, string> = {}
  /** Matched route path params. */
  private routeParams: Record<string, string>
  /** Parsed request URL. */
  private urlObj: URL

  /**
   * Create context for one request.
   * @description Binds request, URL, params, and optional error handler.
   * @param req - Incoming request
   * @param url - Parsed request URL
   * @param params - Route path params
   * @param errorHandler - Optional custom error handler
   */
  constructor(
    req: Request,
    url: URL,
    params: Record<string, string>,
    errorHandler?: Types.ErrorHandler
  ) {
    this.req = req
    this.urlObj = url
    this.routeParams = params
    this.errorHandler = errorHandler
    this.requestState = {}
  }

  /**
   * Read body as ArrayBuffer.
   * @description Parses once; returns cached if already read.
   * @returns Body as ArrayBuffer
   */
  async arrayBuffer(): Promise<ArrayBuffer> {
    if (this.bodyParsedAs === 'arraybuffer') {
      return this.bodyData as ArrayBuffer
    }
    this.ensureBodyNotConsumed()
    this.bodyData = await this.req.arrayBuffer()
    this.bodyParsedAs = 'arraybuffer'
    return this.bodyData as ArrayBuffer
  }

  /**
   * Read body as Blob.
   * @description Parses once; returns cached if already read.
   * @returns Body as Blob
   */
  async blob(): Promise<Blob> {
    if (this.bodyParsedAs === 'blob') {
      return this.bodyData as Blob
    }
    this.ensureBodyNotConsumed()
    this.bodyData = await this.req.blob()
    this.bodyParsedAs = 'blob'
    return this.bodyData as Blob
  }

  /**
   * Read body as JSON, form, or text.
   * @description Chooses parser from Content-Type; parses once.
   * @returns Parsed body (object, FormData, or string)
   */
  async body(): Promise<unknown> {
    if (this.bodyParsedAs !== null) {
      return this.bodyData
    }
    const contentType = this.req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      this.bodyData = await this.req.json()
      this.bodyParsedAs = 'json'
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      this.bodyData = await this.req.formData()
      this.bodyParsedAs = 'form'
    } else {
      this.bodyData = await this.req.text()
      this.bodyParsedAs = 'text'
    }
    return this.bodyData
  }

  /**
   * Get cookie by key or all cookies.
   * @description Parses Cookie header on first access.
   * @param key - Optional cookie name
   * @returns Cookie value or full map
   */
  cookie(key?: string): string | Record<string, string> | undefined {
    if (this.cookieMap === undefined) {
      this.parseCookies()
    }
    return key ? this.cookieMap?.[key] : this.cookieMap
  }

  /**
   * Read body as FormData.
   * @description Parses once; returns cached if already read.
   * @returns Body as FormData
   */
  async formData(): Promise<FormData> {
    if (this.bodyParsedAs === 'form') {
      return this.bodyData as FormData
    }
    this.ensureBodyNotConsumed()
    this.bodyData = await this.req.formData()
    this.bodyParsedAs = 'form'
    return this.bodyData as FormData
  }

  /**
   * Build error response via handler.
   * @description Uses errorHandler if set else custom response.
   * @param statusCode - HTTP status code
   * @param error - Error instance
   * @returns Error response
   */
  async handleError(statusCode: number, error: Error): Promise<Response> {
    if (this.errorHandler) {
      return await this.errorHandler(this, statusCode, error)
    }
    return this.send.custom(null, { status: statusCode, headers: this.responseHeadersMap })
  }

  /**
   * Get header by name or all headers.
   * @description Parses headers on first access; keys lowercased.
   * @param key - Optional header name
   * @returns Header value or full map
   */
  header(key?: string): string | Record<string, string> | undefined {
    if (this.headerMap === undefined) {
      this.parseHeaders()
    }
    return key ? this.headerMap?.[key?.toLowerCase()] : this.headerMap
  }

  /** Raw request Headers */
  get headers(): Headers {
    return this.req.headers
  }

  /**
   * Read body as JSON.
   * @description Parses once; returns cached if already read.
   * @returns Parsed JSON value
   */
  async json(): Promise<unknown> {
    if (this.bodyParsedAs === 'json') {
      return this.bodyData
    }
    this.ensureBodyNotConsumed()
    this.bodyData = await this.req.json()
    this.bodyParsedAs = 'json'
    return this.bodyData
  }

  /**
   * Get single route param by key.
   * @description Returns one named param from route match.
   * @param key - Param name from pattern
   * @returns Param value or undefined
   */
  param(key: string): string | undefined {
    return this.routeParams[key]
  }

  /**
   * Get all route path params.
   * @description Returns copy of params from route match.
   * @returns Copy of params object
   */
  params(): Record<string, string> {
    return { ...this.routeParams }
  }

  /** Request pathname from URL */
  get pathname(): string {
    return this.urlObj.pathname
  }

  /**
   * Get query param by key or all.
   * @description Parses search params on first access.
   * @param key - Optional query key
   * @returns Query value or full map
   */
  query(key?: string): string | Record<string, string> | undefined {
    if (this.queryParams === undefined) {
      this.parseQuery()
    }
    return key ? this.queryParams?.[key] : this.queryParams
  }

  /**
   * Get all values for a query key.
   * @description Returns all query values for repeated key.
   * @param key - Query parameter name
   * @returns Array of values
   */
  queries(key: string): string[] {
    return this.urlObj.searchParams.getAll(key)
  }

  /**
   * Build redirect response to URL.
   * @description Resolves relative URL against request URL.
   * @param url - Target URL (absolute or relative)
   * @param status - Redirect status; default 302
   * @param init - Optional extra headers
   * @returns Redirect response
   */
  redirect(url: string, status = 302, init?: { headers?: HeadersInit }): Response {
    return Redirect.buildResponse(this.req.url, this.responseHeaders, url, status, init?.headers)
  }

  /** Raw Request object */
  get request(): Request {
    return this.req
  }

  /**
   * Replace request and reset body state.
   * @description Used by body-limiting middleware to replace request.
   * @param req - New request to use
   */
  replaceRequest(req: Request): void {
    this.req = req
    this.bodyData = undefined
    this.bodyParsedAs = null
  }

  /** Copy of response headers set on context */
  get responseHeadersMap(): Record<string, string> {
    return { ...this.responseHeaders }
  }

  /** Helpers to send JSON, HTML, file, redirect, etc. */
  get send(): Types.SendHelpers {
    return ResponseHelpers.create(
      this.responseHeaders,
      (url, status, extraHeaders) =>
        Redirect.buildResponse(this.req.url, this.responseHeaders, url, status, extraHeaders)
    )
  }

  /**
   * Set one response header.
   * @description Merges one header into response headers.
   * @param key - Header name
   * @param value - Header value
   * @returns this for chaining
   */
  setHeader(key: string, value: string): this {
    this.responseHeaders[key] = value
    return this
  }

  /**
   * Set multiple response headers.
   * @description Merges headers into response headers.
   * @param headers - Key-value map of headers
   * @returns this for chaining
   */
  setHeaders(headers: Record<string, string>): this {
    Object.assign(this.responseHeaders, headers)
    return this
  }

  /**
   * Merge route params into context.
   * @description Assigns params from router match to context.
   * @param params - Params from router match
   */
  setParams(params: Record<string, string>): void {
    Object.assign(this.routeParams, params)
  }

  /** Mutable state shared by middleware and route */
  get state(): Record<string, unknown> {
    return this.requestState
  }

  /**
   * Read body as plain text.
   * @description Parses once; returns cached if already read.
   * @returns Body as string
   */
  async text(): Promise<string> {
    if (this.bodyParsedAs === 'text') {
      return this.bodyData as string
    }
    this.ensureBodyNotConsumed()
    this.bodyData = await this.req.text()
    this.bodyParsedAs = 'text'
    return this.bodyData as string
  }

  /** Full request URL string */
  get url(): string {
    return this.req.url
  }

  /** Throws if body was already consumed. */
  private ensureBodyNotConsumed(): void {
    if (this.bodyParsedAs !== null) {
      throw new Error('Request body already consumed')
    }
  }

  /** Parse Cookie header into key-value map. */
  private parseCookies(): void {
    const result: Record<string, string> = {}
    const cookieHeader = this.req.headers.get('cookie')
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookiePart) => {
        const [key, ...valueParts] = cookiePart.trim().split('=')
        if (key) {
          result[key] = valueParts.join('=')
        }
      })
    }
    this.cookieMap = result
  }

  /** Parse request headers into lowercased map. */
  private parseHeaders(): void {
    const result: Record<string, string> = {}
    this.req.headers.forEach((headerValue, headerKey) => {
      result[headerKey.toLowerCase()] = headerValue
    })
    this.headerMap = result
  }

  /** Parse URL search params into map. */
  private parseQuery(): void {
    const result: Record<string, string> = {}
    this.urlObj.searchParams.forEach((paramValue, paramKey) => {
      result[paramKey] = paramValue
    })
    this.queryParams = result
  }
}
