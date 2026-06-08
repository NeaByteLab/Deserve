import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Request wrapper with parsed body.
 * @description Parses body once, exposes headers, cookies, state.
 */
export class Context {
  /** Parsed body, undefined until parsed */
  private bodyData: unknown = undefined
  /** Format body was parsed as */
  private bodyParsedAs: Types.BodyParsedFormat | null = null
  /** Parsed cookie name-to-value map, lazy */
  private cookieMap: Types.StringRecord | undefined = undefined
  /** Custom error handler when set */
  private errorHandler: Types.ErrorHandler | undefined = undefined
  /** True once handleError ran a framework error path for this request */
  private frameworkErrorEmitted = false
  /** Framework error captured by handleError */
  private frameworkError: Error | null = null
  /** Incoming fetch Request */
  private req: Request
  /** Arbitrary state for middleware/handlers */
  private requestState: Types.DataRecord = {}
  /** Response headers to send */
  private responseHeaders: Types.StringRecord = {}
  /** Cached send helpers, lazy */
  private sendHelpers: Types.SendHelpers | undefined = undefined
  /** Set-Cookie values accumulated via setHeader */
  private setCookieValues: string[] = []
  /** Matched route path params */
  private routeParams: Types.StringRecord
  /** Parsed request URL */
  private parsedUrl: URL

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
    params: Types.StringRecord,
    errorHandler?: Types.ErrorHandler
  ) {
    this.req = req
    this.parsedUrl = url
    this.routeParams = Context.decodeParams(params)
    this.errorHandler = errorHandler
  }

  /** Raw request Headers */
  get headers(): Headers {
    return this.req.headers
  }

  /** Request pathname from URL */
  get pathname(): string {
    return this.parsedUrl.pathname
  }

  /** Raw Request object */
  get request(): Request {
    return this.req
  }

  /** All Set-Cookie header values */
  get responseCookies(): readonly string[] {
    return this.setCookieValues
  }

  /** Snapshot copy of response headers accumulated so far */
  get responseHeadersMap(): Types.StringRecord {
    return { ...this.responseHeaders }
  }

  /** Send helpers for response building */
  get send(): Types.SendHelpers {
    if (!this.sendHelpers) {
      this.sendHelpers = Core.Response.create(
        this.responseHeaders,
        this.setCookieValues,
        (url, status, extraHeaders) =>
          Core.Redirect.buildResponse(
            this.req.url,
            this.responseHeaders,
            this.setCookieValues,
            url,
            status,
            extraHeaders
          )
      )
    }
    return this.sendHelpers
  }

  /**
   * Shared mutable request state object.
   * @description Returns live record so writes persist per request.
   * @returns The request state record
   */
  get state(): Types.DataRecord {
    return this.requestState
  }

  /** Full request URL string */
  get url(): string {
    return this.req.url
  }

  /**
   * Read body as ArrayBuffer.
   * @description Parses once, returns cached if already read.
   * @returns Body as ArrayBuffer
   */
  async arrayBuffer(): Promise<ArrayBuffer> {
    if (this.bodyParsedAs === 'arraybuffer') {
      return this.bodyData as ArrayBuffer
    }
    this.guardBodyUse()
    try {
      this.bodyData = await this.req.arrayBuffer()
    } catch (parseError) {
      throw Context.toBodyError(parseError)
    }
    this.bodyParsedAs = 'arraybuffer'
    return this.bodyData as ArrayBuffer
  }

  /**
   * Read body as Blob.
   * @description Parses once, returns cached if already read.
   * @returns Body as Blob
   */
  async blob(): Promise<Blob> {
    if (this.bodyParsedAs === 'blob') {
      return this.bodyData as Blob
    }
    this.guardBodyUse()
    try {
      this.bodyData = await this.req.blob()
    } catch (parseError) {
      throw Context.toBodyError(parseError)
    }
    this.bodyParsedAs = 'blob'
    return this.bodyData as Blob
  }

  /**
   * Read body by content type.
   * @description Chooses parser from Content-Type, parses once.
   * @returns Parsed body (object, FormData, or string)
   */
  async body(): Promise<unknown> {
    if (this.bodyParsedAs !== null) {
      return this.bodyData
    }
    const mediaType = Context.parseMediaType(this.req.headers.get('content-type'))
    if (mediaType === 'application/json') {
      try {
        this.bodyData = await this.req.json()
      } catch (parseError) {
        Context.rethrowStatusError(parseError)
        this.bodyData = null
      }
      this.bodyParsedAs = 'json'
    } else if (
      mediaType === 'multipart/form-data' ||
      mediaType === 'application/x-www-form-urlencoded'
    ) {
      try {
        this.bodyData = await this.req.formData()
      } catch (parseError) {
        Context.rethrowStatusError(parseError)
        this.bodyData = null
      }
      this.bodyParsedAs = 'form'
    } else {
      try {
        this.bodyData = await this.req.text()
      } catch (parseError) {
        throw Context.toBodyError(parseError)
      }
      this.bodyParsedAs = 'text'
    }
    return this.bodyData
  }

  /**
   * Get cookie by key or all.
   * @description Parses Cookie header on first access.
   * @param key - Cookie name
   * @returns Cookie value or undefined
   */
  cookie(): Types.StringRecord
  cookie(key: string): string | undefined
  cookie(key?: string): string | Types.StringRecord | undefined {
    if (this.cookieMap === undefined) {
      this.parseCookies()
    }
    return key ? this.cookieMap?.[key] : this.cookieMap
  }

  /**
   * Apply accumulated headers to raw Response.
   * @description Merges middleware headers and cookies, existing values win.
   * @param response - The native Response returned by the handler
   * @returns The same Response with accumulated headers and cookies applied
   */
  finalizeRaw(response: Response): Response {
    for (const headerKey of Object.keys(this.responseHeaders)) {
      if (!response.headers.has(headerKey)) {
        response.headers.set(headerKey, this.responseHeaders[headerKey]!)
      }
    }
    if (this.setCookieValues.length > 0 && response.headers.get('Set-Cookie') === null) {
      for (const cookieValue of this.setCookieValues) {
        response.headers.append('Set-Cookie', cookieValue)
      }
    }
    return response
  }

  /**
   * Read body as FormData.
   * @description Parses once, returns cached if already read.
   * @returns Body as FormData
   */
  async formData(): Promise<FormData> {
    if (this.bodyParsedAs === 'form') {
      return this.bodyData as FormData
    }
    this.guardBodyUse()
    try {
      this.bodyData = await this.req.formData()
    } catch (parseError) {
      throw Context.toBodyError(parseError)
    }
    this.bodyParsedAs = 'form'
    return this.bodyData as FormData
  }

  /**
   * Get captured framework error.
   * @description Returns error from handleError or null if none.
   * @returns The captured Error or null
   */
  getFrameworkError(): Error | null {
    return this.frameworkError
  }

  /**
   * Get typed state value.
   * @description Type-safe alternative to `state[key] as T`.
   * @template T - Value type encoded in the key
   * @param key - Branded state key
   * @returns Typed value or undefined
   */
  getState<T>(key: Types.StateKey<T>): T | undefined {
    return this.requestState[key] as T | undefined
  }

  /**
   * Build error response via handler.
   * @description Uses errorHandler if set else custom response.
   * @param statusCode - HTTP status code
   * @param error - Error instance
   * @returns Error response
   */
  async handleError(statusCode: number, error: Error): Promise<Response> {
    this.frameworkErrorEmitted = true
    this.frameworkError = error
    if (this.errorHandler) {
      return await this.errorHandler(this, statusCode, error)
    }
    return Core.Handler.errorResponse(this, statusCode)
  }

  /**
   * Check if framework error occurred.
   * @description Returns true when handleError ran for this request.
   * @returns True if handleError ran
   */
  hasFrameworkError(): boolean {
    return this.frameworkErrorEmitted
  }

  /**
   * Get header by name.
   * @description Parses headers on first access, keys lowercased.
   * @param key - Header name
   * @returns Header value or undefined
   */
  header(): Types.StringRecord
  header(key: string): string | undefined
  header(key?: string): string | Types.StringRecord | undefined {
    if (key) {
      return this.req.headers.get(key) ?? undefined
    }
    const headerResult: Types.StringRecord = Object.create(null)
    for (const [headerKey, headerValue] of this.req.headers) {
      headerResult[headerKey] = headerValue
    }
    return headerResult
  }

  /**
   * Read body as JSON.
   * @description Parses once, returns cached if already read.
   * @returns Parsed JSON value
   */
  async json(): Promise<unknown> {
    if (this.bodyParsedAs === 'json') {
      return this.bodyData
    }
    this.guardBodyUse()
    try {
      this.bodyData = await this.req.json()
    } catch (parseError) {
      throw Context.toBodyError(parseError)
    }
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
  params(): Types.StringRecord {
    return { ...this.routeParams }
  }

  /**
   * Get all values for query key.
   * @description Returns all query values for repeated key.
   * @param key - Query parameter name
   * @returns Array of values
   */
  queries(key: string): string[] {
    return this.parsedUrl.searchParams.getAll(key)
  }

  /**
   * Get query param by key.
   * @description Parses search params on first access.
   * @param key - Query key
   * @returns Query value or undefined
   */
  query(): Types.StringRecord
  query(key: string): string | undefined
  query(key?: string): string | Types.StringRecord | undefined {
    if (key) {
      return this.parsedUrl.searchParams.get(key) ?? undefined
    }
    const queryResult: Types.StringRecord = Object.create(null)
    for (const [paramKey, paramValue] of this.parsedUrl.searchParams.entries()) {
      if (!Object.hasOwn(queryResult, paramKey)) {
        queryResult[paramKey] = paramValue
      }
    }
    return queryResult
  }

  /**
   * Redirect response to a URL.
   * @description Wraps `ctx.send.redirect` with same builder.
   * @param url - Target URL (relative same-origin or explicit absolute http(s))
   * @param status - Redirect status code, defaults to 302
   * @param options - Optional extra headers
   * @returns Redirect Response with Location header
   */
  redirect(
    url: string,
    status: Types.RedirectStatus = 302,
    options?: Types.RedirectInit
  ): Response {
    return this.send.redirect(url, status, options)
  }

  /**
   * Render template and return HTML response.
   * @description Requires viewsDir set in Router, uses ctx.state.view.
   * @param templatePath - Path to .dve template relative to viewsDir
   * @param data - Data for template
   * @returns Response with rendered HTML
   */
  async render(templatePath: string, data: Types.DataRecord = {}): Promise<Response> {
    const viewEngine = this.getState(Core.Handler.StateKeys.view)
    if (viewEngine === undefined) {
      throw new Deno.errors.NotSupported(
        'View engine not configured, set viewsDir in RouterOptions'
      )
    }
    const renderedHtml = await viewEngine.render(templatePath, data)
    return this.send.html(renderedHtml)
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

  /**
   * Set one response header.
   * @description Merges one header into response headers.
   * @param key - Header name
   * @param value - Header value
   * @returns this for chaining
   */
  setHeader(key: string, value: string): this {
    Context.assertValidHeader(key, value)
    if (key === 'Set-Cookie') {
      this.setCookieValues.push(value)
    } else {
      this.responseHeaders[key] = value
    }
    return this
  }

  /**
   * Set multiple response headers.
   * @description Merges headers into response headers.
   * @param headers - Key-value map of headers
   * @returns this for chaining
   */
  setHeaders(headers: Types.StringRecord): this {
    const entries = Object.entries(headers)
    for (const [key, value] of entries) {
      Context.assertValidHeader(key, value)
    }
    for (const [key, value] of entries) {
      if (key === 'Set-Cookie') {
        this.setCookieValues.push(value)
      } else {
        this.responseHeaders[key] = value
      }
    }
    return this
  }

  /**
   * Merge route params into context.
   * @description Percent-decodes incoming params, then merges with existing.
   * @param params - Params from router match
   */
  setParams(params: Types.StringRecord): void {
    this.routeParams = { ...this.routeParams, ...Context.decodeParams(params) }
  }

  /**
   * Set typed state value.
   * @description Type-safe alternative to `state[key] = value`.
   * @template T - Value type encoded in the key
   * @param key - Branded state key
   * @param value - Value matching the key's type
   */
  setState<T>(key: Types.StateKey<T>, value: T): void {
    this.requestState[key] = value
  }

  /**
   * Render template with streaming.
   * @description Requires viewsDir set in Router, validates before committing.
   * @param templatePath - Path to .dve template relative to viewsDir
   * @param data - Data for template
   * @returns Response with streaming HTML
   */
  async streamRender(templatePath: string, data: Types.DataRecord = {}): Promise<Response> {
    const viewEngine = this.getState(Core.Handler.StateKeys.view)
    if (viewEngine === undefined) {
      throw new Deno.errors.NotSupported(
        'View engine not configured, set viewsDir in RouterOptions'
      )
    }
    const htmlStream = await viewEngine.streamRender(templatePath, data)
    return this.send.stream(htmlStream, undefined, 'text/html; charset=utf-8')
  }

  /**
   * Read body as plain text.
   * @description Parses once, returns cached if already read.
   * @returns Body as string
   */
  async text(): Promise<string> {
    if (this.bodyParsedAs === 'text') {
      return this.bodyData as string
    }
    this.guardBodyUse()
    try {
      this.bodyData = await this.req.text()
    } catch (parseError) {
      throw Context.toBodyError(parseError)
    }
    this.bodyParsedAs = 'text'
    return this.bodyData as string
  }

  /**
   * Validate a response header pair.
   * @description Delegates to Headers built-in so invalid input fails fast.
   * @param key - Header name
   * @param value - Header value
   * @throws {Types.StatusError} When name or value is not RFC 7230 compliant
   */
  private static assertValidHeader(key: string, value: string): void {
    try {
      new Headers().set(key, value)
    } catch {
      throw Core.Handler.createStatusError(500, `Invalid response header "${key}"`)
    }
  }

  /**
   * Percent-decode route param values once.
   * @description Decodes each value once, raw fallback on malformed input.
   * @param params - Raw params from the router match
   * @returns New record with each value decoded once
   */
  private static decodeParams(params: Types.StringRecord): Types.StringRecord {
    const decoded: Types.StringRecord = Object.create(null)
    for (const paramKey of Object.keys(params)) {
      const rawValue = params[paramKey]!
      if (rawValue.indexOf('%') === -1) {
        decoded[paramKey] = rawValue
        continue
      }
      try {
        decoded[paramKey] = decodeURIComponent(rawValue)
      } catch {
        decoded[paramKey] = rawValue
      }
    }
    return decoded
  }

  /** Throws if body already consumed */
  private guardBodyUse(): void {
    if (this.bodyParsedAs !== null) {
      throw new Deno.errors.BadResource('Request body already consumed')
    }
  }

  /** Parse cookies, first occurrence wins */
  private parseCookies(): void {
    const parsedCookies = Object.create(null) as Types.StringRecord
    const cookieHeader = this.req.headers.get('cookie')
    if (cookieHeader) {
      const trimRegex = Core.Constant.cookieTrimRegex
      for (const cookiePart of cookieHeader.split(';')) {
        const trimmedPart = cookiePart.replace(trimRegex, '')
        const eqIndex = trimmedPart.indexOf('=')
        if (eqIndex <= 0) {
          continue
        }
        const cookieName = trimmedPart.slice(0, eqIndex).replace(trimRegex, '')
        const cookieValue = trimmedPart.slice(eqIndex + 1)
        if (cookieName && !Object.hasOwn(parsedCookies, cookieName)) {
          parsedCookies[cookieName] = cookieValue
        }
      }
    }
    this.cookieMap = parsedCookies
  }

  /**
   * Parse Content-Type to canonical media type.
   * @description Lowercases type, drops parameters after first semicolon.
   * @param contentType - Raw Content-Type header value or null
   * @returns Lowercased media type, empty string when absent
   */
  private static parseMediaType(contentType: string | null): string {
    if (!contentType) {
      return ''
    }
    const semicolonIndex = contentType.indexOf(';')
    const typePart = semicolonIndex === -1 ? contentType : contentType.slice(0, semicolonIndex)
    return typePart.trim().toLowerCase()
  }

  /**
   * Re-throw errors carrying valid status.
   * @description Ensures lenient body parsing never swallows status errors.
   * @param parseError - Error thrown while reading or parsing the body
   */
  private static rethrowStatusError(parseError: unknown): void {
    if (parseError instanceof Error && 'statusCode' in parseError) {
      const statusValue = (parseError as Types.StatusCodeCarrier).statusCode
      if (typeof statusValue === 'number' && statusValue >= 400 && statusValue < 600) {
        throw parseError
      }
    }
  }

  /**
   * Normalize body failure to client error.
   * @description Preserves existing status, else classifies as 400.
   * @param parseError - Error thrown while reading or parsing the body
   * @returns StatusError carrying the resolved status code
   */
  private static toBodyError(parseError: unknown): Types.StatusError {
    if (parseError instanceof Error && 'statusCode' in parseError) {
      const statusValue = (parseError as Types.StatusCodeCarrier).statusCode
      if (typeof statusValue === 'number' && statusValue >= 400 && statusValue < 600) {
        return parseError as Types.StatusError
      }
    }
    return Core.Handler.createStatusError(400, 'Malformed or unreadable request body')
  }
}
