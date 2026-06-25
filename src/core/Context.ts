import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import { Immutable } from '@neabyte/utils-core'

/**
 * Per request context object.
 * @description Exposes request reading and response building helpers.
 */
export class Context {
  /** Resolved client IP after proxy trust */
  readonly #clientIp: string | undefined
  /** Direct peer IP before proxy resolution */
  readonly #directIp: string | undefined
  /** Event emitter for observability signals */
  readonly #emitEvent: Types.EventFn
  /** Optional error middleware handler */
  readonly #errorHandler: Types.ErrorMiddleware | null
  /** Internal control surface for framework */
  readonly #internal: Types.ContextInternal
  /** Optional view rendering function */
  readonly #renderer: Types.RenderFn | null
  /** Accumulated response header values */
  readonly #responseHeaders: Types.StringRecord = Object.create(null)
  /** Accumulated Set-Cookie header values */
  readonly #setCookies: string[] = []
  /** Parsed request URL instance */
  readonly #url: URL
  /** Cached parsed request body data */
  #bodyData: unknown = undefined
  /** Format used to read request body */
  #bodyFormat: Types.BodyFormat | null = null
  /** Cached parsed cookie name value map */
  #cookieMap: Types.StringRecord | undefined = undefined
  /** Last framework error captured */
  #frameworkError: Error | null = null
  /** Cached frozen request reading helpers */
  #getHelpers: Types.GetHelpers | undefined = undefined
  /** Decoded route parameter map */
  #params: Types.StringRecord = Object.create(null)
  /** Underlying request instance */
  #req: Request
  /** Cached frozen response sending helpers */
  #sendHelpers: Types.SendHelpers | undefined = undefined
  /** Installed session controller instance */
  #session: Types.SessionController | null = null
  /** Cached frozen response setting helpers */
  #setHelpers: Types.SetHelpers | undefined = undefined
  /** Installed validated data controller */
  #validated: Types.ValidatedController | null = null
  /** Installed worker pool controller */
  #worker: Types.WorkerController | null = null

  /**
   * Construct request context instance.
   * @description Wires request, URL, IP, renderer, and event emitter.
   * @param req - Incoming request instance
   * @param url - Parsed request URL
   * @param errorHandler - Optional error middleware handler
   * @param clientIp - Resolved client IP address
   * @param directIp - Direct peer IP address
   * @param renderer - Optional view rendering function
   * @param emitEvent - Event emitter for observability
   */
  constructor(
    req: Request,
    url: URL,
    errorHandler: Types.ErrorMiddleware | null,
    clientIp: string | undefined,
    directIp: string | undefined,
    renderer: Types.RenderFn | null,
    emitEvent: Types.EventFn
  ) {
    this.#req = req
    this.#url = url
    this.#errorHandler = errorHandler
    this.#clientIp = clientIp
    this.#directIp = directIp ?? clientIp
    this.#renderer = renderer
    this.#emitEvent = emitEvent
    this.#internal = {
      emitEvent: (event) => this.#emitEvent(event),
      finalizeRaw: (response) => this.#finalizeRaw(response),
      getFrameworkError: () => this.#frameworkError,
      installSession: (controller) => this.#installSession(controller),
      installValidated: (controller) => this.#installValidated(controller),
      installWorker: (controller) => this.#installWorker(controller),
      setParams: (params) => this.#setParams(params)
    }
  }

  /** Frozen request reading helpers */
  get get(): Types.GetHelpers {
    if (this.#getHelpers === undefined) {
      const helpers: Types.GetHelpers = {
        ip: (options) => (options?.direct === true ? this.#directIp : this.#clientIp),
        method: () => this.#req.method,
        url: () => this.#url,
        pathname: () => this.#url.pathname,
        request: () => this.#req,
        header: (key?: string) => this.#lookup(this.#req.headers, key),
        cookie: (key?: string) => this.#lookupCookie(key),
        query: (key?: string) => this.#lookup(this.#url.searchParams, key),
        param: (key?: string) => this.#lookupParam(key),
        body: <T>() => this.#readBody() as Promise<T>,
        json: <T>() => this.#read('json', (req) => req.json()) as Promise<T>,
        text: () => this.#read('text', (req) => req.text()),
        formData: () => this.#read('form', (req) => req.formData()),
        blob: () => this.#read('blob', (req) => req.blob()),
        bytes: () => this.#read('bytes', (req) => req.bytes()),
        session: () => this.#session?.state ?? null,
        validated: () => this.#readValidated(),
        worker: () => this.#readWorker()
      } as Types.GetHelpers
      this.#getHelpers = Object.freeze(helpers)
    }
    return this.#getHelpers
  }

  /** Frozen response setting helpers */
  get set(): Types.SetHelpers {
    if (this.#setHelpers === undefined) {
      const helpers: Types.SetHelpers = {
        header: (key, value) => {
          this.#applyHeader(key, value)
          return helpers
        },
        headers: (headers) => {
          for (const key of Object.keys(headers)) {
            this.#applyHeader(key, headers[key]!)
          }
          return helpers
        },
        cookie: (name, value, options) => {
          this.#setCookies.push(Core.Cookie.serialize(name, value, options))
          return helpers
        },
        session: (data) => this.#writeSession(data)
      }
      this.#setHelpers = Object.freeze(helpers)
    }
    return this.#setHelpers
  }

  /** Frozen response sending helpers */
  get send(): Types.SendHelpers {
    if (this.#sendHelpers === undefined) {
      const helpers: Types.SendHelpers = {
        json: (data, options) =>
          this.#build(Core.API.jsonStringify(data), 'application/json', options),
        text: (text, options) => this.#build(text, 'text/plain; charset=utf-8', options),
        html: (html, options) => this.#build(html, 'text/html; charset=utf-8', options),
        custom: (body, options) => this.#build(body, null, options),
        download: (body, filename, options) => {
          const disposition = Core.Handler.contentDisposition(filename)
          const headers = {
            ...Core.Handler.toRecord(options?.headers),
            'Content-Disposition': disposition
          }
          return this.#build(body, Core.Constant.defaultContentType, { ...options, headers })
        },
        empty: (status) => this.#build(null, null, status === undefined ? undefined : { status }),
        redirect: (url, status, options) =>
          Core.Redirect.buildResponse(
            this.#req.url,
            this.#responseHeaders,
            this.#setCookies,
            url,
            status ?? 302,
            options?.headers
          )
      }
      this.#sendHelpers = Object.freeze(helpers)
    }
    return this.#sendHelpers
  }

  /**
   * Build error response for status.
   * @description Uses error middleware when present otherwise default.
   * @param statusCode - HTTP status code to send
   * @param error - Caught error instance
   * @returns Promise resolving to error response
   */
  async handleError(statusCode: number, error: Error): Promise<Response> {
    this.#frameworkError = error
    if (this.#errorHandler) {
      return await Core.Handler.buildResponse(this, statusCode, error, this.#errorHandler)
    }
    return Core.Handler.errorResponse(this, statusCode)
  }

  /**
   * Expose internal control surface.
   * @description Returns framework only context internal handle.
   * @param ctx - Context instance to unwrap
   * @returns Internal control surface object
   */
  static internalOf(ctx: Context): Types.ContextInternal {
    return ctx.#internal
  }

  /**
   * Render template into response.
   * @description Requires configured view engine to render template.
   * @param template - Template name to render
   * @param data - View data for template
   * @param options - Render options like status
   * @returns Promise resolving to rendered response
   * @throws When view engine is not configured
   */
  async render(
    template: string,
    data: Types.ViewData = {},
    options: Types.RenderInit = {}
  ): Promise<Response> {
    if (this.#renderer === null) {
      throw new Deno.errors.NotSupported(
        'View engine not configured, set views directory in RouterOptions'
      )
    }
    return await this.#renderer(template, data, options)
  }

  /**
   * Apply a single response header.
   * @description Validates header then stores or queues cookie.
   * @param key - Header name to apply
   * @param value - Header value to set
   * @throws When header name or value is invalid
   */
  #applyHeader(key: string, value: string): void {
    try {
      new Core.API.Headers().set(key, value)
    } catch {
      throw Core.Handler.createStatusError(500, `Invalid response header "${key}"`)
    }
    if (key.toLowerCase() === 'set-cookie') {
      this.#setCookies.push(value)
    } else {
      this.#responseHeaders[key] = value
    }
  }

  /**
   * Validate optional response status code.
   * @description Allows null body statuses and 200 to 599.
   * @param status - Status code to validate
   * @throws When status is outside allowed range
   */
  #assertStatus(status?: number): void {
    if (status === undefined) {
      return
    }
    if (
      !Number.isInteger(status) ||
      ((status < 200 || status > 599) && !Core.Constant.nullBodyStatuses.has(status))
    ) {
      throw new Deno.errors.InvalidData(
        `Response status must be an integer in the 200-599 range, got "${String(status)}"`
      )
    }
  }

  /**
   * Build response with headers and cookies.
   * @description Merges headers, content type, and Set-Cookie values.
   * @param body - Response body or null
   * @param contentType - Content type or null
   * @param options - Optional response init values
   * @returns Constructed response instance
   */
  #build(body: BodyInit | null, contentType: string | null, options?: Types.SendInit): Response {
    this.#assertStatus(options?.status)
    const status = options?.status
    const isNullBody = status !== undefined && Core.Constant.nullBodyStatuses.has(status)
    const extra = Core.Handler.toRecord(options?.headers)
    const headers: Types.StringRecord = contentType && !isNullBody
      ? { ...this.#responseHeaders, 'Content-Type': contentType, ...extra }
      : { ...this.#responseHeaders, ...extra }
    const init: ResponseInit = options ? { ...options, headers } : { headers }
    const finalBody = isNullBody ? null : body
    const response = new Core.API.Response(finalBody, init)
    Core.Handler.appendCookies(response.headers, this.#setCookies)
    return response
  }

  /**
   * Merge pending headers into response.
   * @description Adds missing headers and queued Set-Cookie values.
   * @param response - Raw response to finalize
   * @returns Same response with merged headers
   */
  #finalizeRaw(response: Response): Response {
    for (const headerKey of Object.keys(this.#responseHeaders)) {
      if (!response.headers.has(headerKey)) {
        response.headers.set(headerKey, this.#responseHeaders[headerKey]!)
      }
    }
    if (this.#setCookies.length > 0 && response.headers.get('Set-Cookie') === null) {
      Core.Handler.appendCookies(response.headers, this.#setCookies)
    }
    return response
  }

  /**
   * Install session controller instance.
   * @description Stores controller for session reads and writes.
   * @param controller - Session controller to install
   */
  #installSession(controller: Types.SessionController): void {
    this.#session = controller
  }

  /**
   * Install validated data controller.
   * @description Stores controller for validated data reads.
   * @param controller - Validated controller to install
   */
  #installValidated(controller: Types.ValidatedController): void {
    this.#validated = controller
  }

  /**
   * Install worker pool controller.
   * @description Stores controller for worker task dispatch.
   * @param controller - Worker controller to install
   */
  #installWorker(controller: Types.WorkerController): void {
    this.#worker = controller
  }

  /**
   * Look up entry value or record.
   * @description Returns single value or full record map.
   * @param entries - Iterable key value entries
   * @param key - Optional key to look up
   * @returns Value, record map, or undefined
   */
  #lookup(
    entries: Iterable<readonly [string, string]>,
    key?: string
  ): Types.StringRecord | string | undefined {
    if (key !== undefined) {
      for (const [entryKey, entryValue] of entries) {
        if (entryKey === key) {
          return entryValue
        }
      }
      return undefined
    }
    return Context.collectRecord(entries)
  }

  /**
   * Look up cookie value or map.
   * @description Parses cookies once then caches the result.
   * @param key - Optional cookie name to read
   * @returns Cookie value, full map, or undefined
   */
  #lookupCookie(key?: string): Types.StringRecord | string | undefined {
    if (this.#cookieMap === undefined) {
      this.#cookieMap = this.#parseCookies()
    }
    return key !== undefined ? this.#cookieMap[key] : this.#cookieMap
  }

  /**
   * Look up route parameter value.
   * @description Returns single param or copied param map.
   * @param key - Optional parameter name to read
   * @returns Parameter value, copied map, or undefined
   */
  #lookupParam(key?: string): Types.StringRecord | string | undefined {
    return key !== undefined ? this.#params[key] : { ...this.#params }
  }

  /**
   * Parse cookies from request header.
   * @description Splits cookie header into name value pairs.
   * @returns Parsed cookie name value record
   */
  #parseCookies(): Types.StringRecord {
    const parsed: Types.StringRecord = Object.create(null)
    const cookieHeader = this.#req.headers.get('cookie')
    if (cookieHeader) {
      for (const cookiePart of cookieHeader.split(';')) {
        const trimmedPart = cookiePart.replace(Core.Constant.cookieTrimRegex, '')
        const eqIndex = trimmedPart.indexOf('=')
        if (eqIndex <= 0) {
          continue
        }
        const cookieName = trimmedPart.slice(0, eqIndex).replace(Core.Constant.cookieTrimRegex, '')
        if (cookieName.length > 0 && !Object.hasOwn(parsed, cookieName)) {
          parsed[cookieName] = trimmedPart.slice(eqIndex + 1)
        }
      }
    }
    return parsed
  }

  /**
   * Read request body in format.
   * @description Caches body and blocks conflicting format reads.
   * @param format - Body format to read
   * @param reader - Reader producing body value
   * @returns Promise resolving to body value
   * @throws When body already read as another format
   * @template R - Body value type returned
   */
  async #read<R>(format: Types.BodyFormat, reader: (req: Request) => Promise<R>): Promise<R> {
    if (this.#bodyFormat === format) {
      return this.#bodyData as R
    }
    if (this.#bodyFormat !== null) {
      throw Core.Handler.createStatusError(
        409,
        `Request body already read as ${this.#bodyFormat}`
      )
    }
    try {
      this.#bodyData = await reader(this.#req)
    } catch (cause) {
      throw Core.Handler.isStatusError(cause)
        ? cause
        : Core.Handler.createStatusError(400, 'Malformed or unreadable request body')
    }
    this.#bodyFormat = format
    return this.#bodyData as R
  }

  /**
   * Read body using content type.
   * @description Chooses JSON, form, or text reader.
   * @returns Promise resolving to parsed body
   */
  #readBody(): Promise<unknown> {
    const mediaType = Context.parseMediaType(this.#req.headers.get('content-type'))
    if (Context.isJsonMedia(mediaType)) {
      return this.#read('json', (req) => req.json())
    }
    if (
      mediaType === 'multipart/form-data' ||
      mediaType === 'application/x-www-form-urlencoded'
    ) {
      return this.#read('form', (req) => req.formData())
    }
    return this.#read('text', (req) => req.text())
  }

  /**
   * Read validated request data.
   * @description Requires validate middleware to be registered.
   * @returns Validated value of unknown type
   * @throws When validate middleware is not registered
   */
  #readValidated(): unknown {
    if (this.#validated === null) {
      throw new Deno.errors.NotSupported(
        'Validated read requires the validate middleware, register it before reading validated data'
      )
    }
    return this.#validated.value
  }

  /**
   * Read worker pool controller.
   * @description Requires configured worker pool to read.
   * @returns Worker controller instance
   * @throws When worker pool is not configured
   */
  #readWorker(): Types.WorkerController {
    if (this.#worker === null) {
      throw new Deno.errors.NotSupported(
        'Worker read requires a worker pool, configure RouterOptions worker before reading'
      )
    }
    return this.#worker
  }

  /**
   * Set decoded route parameters.
   * @description Decodes percent encoded parameter values.
   * @param params - Raw route parameter map
   */
  #setParams(params: Types.StringRecord): void {
    this.#params = Context.decodeParams(params)
  }

  /**
   * Write session data through controller.
   * @description Requires session middleware to be registered.
   * @param data - Session data or null
   * @returns Promise resolving when write completes
   * @throws When session middleware is not registered
   */
  #writeSession(data: Types.SessionData | null): Promise<void> {
    if (this.#session === null) {
      throw new Deno.errors.NotSupported(
        'Session write requires the session middleware, register it before writing session data'
      )
    }
    return this.#session.write(data)
  }

  /**
   * Collect entries into record map.
   * @description Keeps first value for duplicate keys.
   * @param entries - Iterable key value entries
   * @returns Record map of first values
   */
  private static collectRecord(
    entries: Iterable<readonly [string, string]>
  ): Types.StringRecord {
    const record: Types.StringRecord = Object.create(null)
    for (const [key, value] of entries) {
      if (!Object.hasOwn(record, key)) {
        record[key] = value
      }
    }
    return record
  }

  /**
   * Decode percent encoded parameters.
   * @description Falls back to raw value on decode failure.
   * @param params - Raw route parameter map
   * @returns Decoded parameter record map
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

  /**
   * Check media type is JSON.
   * @description Matches JSON, text JSON, and suffix types.
   * @param mediaType - Media type to inspect
   * @returns True when media type is JSON
   */
  private static isJsonMedia(mediaType: string): boolean {
    return mediaType === 'application/json' ||
      mediaType === 'text/json' ||
      mediaType.endsWith('+json')
  }

  /**
   * Parse media type from header.
   * @description Strips parameters and lowercases the type.
   * @param contentType - Content type header value
   * @returns Lowercased media type string
   */
  private static parseMediaType(contentType: string | null): string {
    if (!contentType) {
      return ''
    }
    const semicolonIndex = contentType.indexOf(';')
    const typePart = semicolonIndex === -1 ? contentType : contentType.slice(0, semicolonIndex)
    return typePart.trim().toLowerCase()
  }
}

Immutable.freeze(Context.prototype)
