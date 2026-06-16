import type * as Types from '@interfaces/index.ts'
import type { Context } from '@core/Context.ts'
import * as Core from '@core/index.ts'

/**
 * Handler utilities for routing layers.
 * @description Static helpers used by routing, middleware, and context layers.
 */
export class Handler {
  /** Well-known framework state keys */
  static readonly stateKeys: Types.StateKeysMap = {
    view: Handler.stateKey<Types.ViewEngine>('view'),
    worker: Handler.stateKey<Types.WorkerRunHandle>('worker'),
    session: Handler.stateKey<Types.DataRecord | null>('session'),
    setSession: Handler.stateKey<(data: Types.DataRecord) => Promise<void>>('setSession'),
    clearSession: Handler.stateKey<() => void>('clearSession'),
    validated: Handler.stateKey<Types.DataRecord>('validated')
  } as const
  /** Reserved framework state key names, not writable by public setState */
  static readonly reservedStateKeys: ReadonlySet<string> = new Set([
    'view',
    'worker',
    'session',
    'setSession',
    'clearSession',
    'validated'
  ])

  /**
   * Append Set-Cookie values to headers.
   * @description Appends each cookie value as a Set-Cookie header.
   * @param headers - Target Headers instance
   * @param cookieValues - Cookie values to append
   */
  static appendCookies(headers: Headers, cookieValues: readonly string[]): void {
    for (const cookieValue of cookieValues) {
      headers.append('Set-Cookie', cookieValue)
    }
  }

  /**
   * Assert a value is a positive finite number.
   * @description Single validator for positive-number construction options.
   * @param value - Value to validate
   * @param label - Option name surfaced in the error message
   * @param unit - Optional unit suffix, e.g. "milliseconds"
   * @returns The validated positive finite number
   * @throws {Deno.errors.InvalidData} When the value is non-finite or <= 0
   */
  static assertPositiveFinite(value: number, label: string, unit?: string): number {
    if (!Number.isFinite(value) || value <= 0) {
      const suffix = unit === undefined ? '' : ` of ${unit}`
      throw new Deno.errors.InvalidData(
        `${label} must be a positive finite number${suffix}, got ${value}`
      )
    }
    return value
  }

  /**
   * Build error response with format.
   * @description Tries middleware then JSON or HTML, masks error messages.
   * @param ctx - Request context
   * @param statusCode - HTTP status code
   * @param error - Thrown error
   * @param errorMiddleware - Optional custom handler
   * @returns Error response
   */
  static async buildResponse(
    ctx: Context,
    statusCode: number,
    error: globalThis.Error,
    errorMiddleware: Types.ErrorMiddleware | null
  ): Promise<globalThis.Response> {
    if (errorMiddleware) {
      const customResponse = await errorMiddleware(ctx, {
        url: ctx.url,
        method: ctx.request.method,
        pathname: ctx.pathname,
        statusCode,
        error
      })
      if (customResponse instanceof Core.API.Response) {
        return customResponse
      }
    }
    return Handler.errorResponse(ctx, statusCode)
  }

  /**
   * Create StatusError with status code.
   * @description Produces Error with immutable statusCode property attached.
   * @param statusCode - HTTP status code
   * @param message - Error message
   * @returns Error with statusCode property
   */
  static createStatusError(statusCode: number, message: string): Types.StatusError {
    const error = new Error(message) as Types.StatusError
    Object.defineProperty(error, 'statusCode', {
      value: statusCode,
      writable: false,
      enumerable: true,
      configurable: false
    })
    return error
  }

  /**
   * Minimal HTML error page.
   * @description Returns simple HTML with status and escaped message.
   * @param statusCode - Status code and title
   * @param message - Escaped message body
   * @returns HTML string
   */
  static defaultErrorHtml(statusCode: number, message: string): string {
    const escapedMessage = Handler.escapeHtml(message)
    return `<!DOCTYPE html>
<html>
<head><title>${statusCode}</title></head>
<body>
<h1>${statusCode}</h1>
<hr>
<p>${escapedMessage}</p>
</body>
</html>`
  }

  /**
   * Build error response by Accept header.
   * @description Single source of truth for safe error responses.
   * @param ctx - Request context
   * @param statusCode - HTTP status code
   * @returns Error response with masked message
   */
  static errorResponse(ctx: Context, statusCode: number): globalThis.Response {
    const errorMessage = Handler.safeMessage(statusCode)
    const wantsJson = Handler.wantsJson(ctx.request.headers)
    const reasons = Handler.safeReasons(ctx[Core.InternalContext].getFrameworkError())
    try {
      if (wantsJson) {
        return ctx.send.json(Handler.problemDetails(statusCode, ctx.pathname, undefined, reasons), {
          status: statusCode,
          headers: { 'Content-Type': Core.Constant.problemJsonContentType }
        })
      }
      return ctx.send.html(Handler.defaultErrorHtml(statusCode, errorMessage), {
        status: statusCode
      })
    } catch {
      return Handler.safeFallbackResponse(ctx, statusCode, errorMessage, wantsJson, reasons)
    }
  }

  /**
   * Escape HTML special characters.
   * @description Replaces &, <, >, ", ' with HTML entities.
   * @param text - Raw string
   * @returns Escaped string safe for HTML content
   */
  static escapeHtml(text: string): string {
    return text.replace(Core.Constant.htmlEscapeRegex, (ch) => Core.Constant.htmlEscapeMap[ch]!)
  }

  /**
   * Extract status code from error.
   * @description Prefers statusCode property, then Deno error class, else 500.
   * @param error - Unknown value from catch block
   * @returns Object with statusCode and Error instance
   */
  static extractError(error: unknown): Types.ExtractedError {
    if (Handler.isErrorWithStatus(error)) {
      return { statusCode: error.statusCode, error }
    }
    if (error instanceof Error) {
      return { statusCode: Handler.denoErrorStatus(error), error }
    }
    return { statusCode: 500, error: new Error(String(error)) }
  }

  /**
   * Check path is existing directory.
   * @description Returns false when path is missing or not directory.
   * @param resolvedDir - Absolute directory path
   * @returns True when the path exists and is a directory
   */
  static isDirectory(resolvedDir: string): boolean {
    try {
      return Deno.statSync(resolvedDir).isDirectory
    } catch {
      return false
    }
  }

  /**
   * Narrow a value to a status-bearing Error.
   * @description True for Errors whose statusCode is 400-599.
   * @param value - Unknown value from a catch block
   * @returns True when value is an Error with an in-range statusCode
   */
  static isErrorWithStatus(value: unknown): value is Types.StatusError {
    if (!(value instanceof Error) || !('statusCode' in value)) {
      return false
    }
    const statusValue = (value as Types.StatusCodeCarrier).statusCode
    return typeof statusValue === 'number' && statusValue >= 400 && statusValue < 600
  }

  /**
   * Build a content-negotiated error response.
   * @description Single site for JSON or HTML error bodies.
   * @param statusCode - HTTP status code to emit
   * @param message - Safe masked message
   * @param wantsJson - Whether the client prefers JSON
   * @param pathname - Optional request pathname included in JSON bodies
   * @returns Error response with security headers and the negotiated body
   */
  static negotiatedResponse(
    statusCode: number,
    message: string,
    wantsJson: boolean,
    pathname?: string,
    reasons?: readonly string[]
  ): globalThis.Response {
    const headers = new Core.API.Headers(Core.Constant.securityHeaderDefaults)
    if (wantsJson) {
      headers.set('Content-Type', Core.Constant.problemJsonContentType)
      const body = Handler.problemDetails(statusCode, pathname, message, reasons)
      return new Core.API.Response(Core.API.jsonStringify(body), { status: statusCode, headers })
    }
    headers.set('Content-Type', 'text/html; charset=utf-8')
    return new Core.API.Response(Handler.defaultErrorHtml(statusCode, message), {
      status: statusCode,
      headers
    })
  }

  /**
   * Build structured error problem details.
   * @description Returns problem body with type, title, status, optional instance.
   * @param statusCode - HTTP status code
   * @param pathname - Optional request pathname as instance
   * @param title - Optional title overriding safe message
   * @param reasons - Optional validation reasons added as errors
   * @returns Problem details object
   */
  static problemDetails(
    statusCode: number,
    pathname?: string,
    title?: string,
    reasons?: readonly string[]
  ): Types.ProblemDetails {
    const base: Types.ProblemDetails = {
      type: 'about:blank',
      title: title ?? Handler.safeMessage(statusCode),
      status: statusCode
    }
    const withInstance = pathname === undefined ? base : { ...base, instance: pathname }
    return reasons !== undefined && reasons.length > 0
      ? { ...withInstance, errors: reasons }
      : withInstance
  }

  /**
   * Resolve safe message for status.
   * @description Returns known message or generic fallback for status.
   * @param statusCode - HTTP status code
   * @returns Safe user-facing error message
   */
  static safeMessage(statusCode: number): string {
    return (
      Core.Constant.serverErrorMessages[statusCode as Types.HttpStatusCode] ??
        (statusCode >= 500 ? 'Internal Server Error' : 'Bad Request')
    )
  }

  /**
   * Extract safe reasons from error.
   * @description Returns string causes only for 422 status errors.
   * @param error - Error to inspect, or null
   * @returns Reason strings, or undefined when none
   */
  static safeReasons(error: Error | null): readonly string[] | undefined {
    if (
      error === null ||
      !Handler.isErrorWithStatus(error) ||
      error.statusCode !== 422 ||
      !Array.isArray(error.cause)
    ) {
      return undefined
    }
    const reasons = (error.cause as readonly unknown[]).filter(
      (reason): reason is string => typeof reason === 'string'
    )
    return reasons.length > 0 ? reasons : undefined
  }

  /**
   * Create a branded state key.
   * @description Returns type-branded string for compile-time safety.
   * @template T - The value type this key maps to
   * @param key - Raw string key
   * @returns Branded StateKey
   */
  static stateKey<T>(key: string): Types.StateKey<T> {
    return key as Types.StateKey<T>
  }

  /**
   * Convert HeadersInit to record.
   * @description Returns plain string record from any HeadersInit variant.
   * @param init - Headers, array, or object
   * @returns Key-value string record
   */
  static toRecord(init?: HeadersInit): Types.StringRecord {
    if (!init) {
      return {}
    }
    if (init instanceof Core.API.Headers) {
      return Object.fromEntries(init)
    }
    if (Array.isArray(init)) {
      return Object.fromEntries(init as Types.StringPair[])
    }
    return { ...init }
  }

  /**
   * Check client prefers JSON response.
   * @description Returns true when Accept header includes application/json.
   * @param headers - Request headers
   * @returns True when JSON is preferred
   */
  static wantsJson(headers: Headers): boolean {
    const accept = headers.get('accept')
    if (accept === null) {
      return false
    }
    return accept.includes('application/json') || accept.includes('application/problem+json')
  }

  /**
   * Map standard error class to status.
   * @description Whitelists unambiguous Deno error types, else returns 500.
   * @param error - Error instance to classify
   * @returns Canonical HTTP status code
   */
  private static denoErrorStatus(error: Error): number {
    if (error instanceof Deno.errors.NotFound) {
      return 404
    }
    if (error instanceof Deno.errors.PermissionDenied) {
      return 403
    }
    if (error instanceof Deno.errors.AlreadyExists) {
      return 409
    }
    if (error instanceof Deno.errors.InvalidData) {
      return 400
    }
    if (error instanceof Deno.errors.NotSupported) {
      return 501
    }
    if (error instanceof Deno.errors.TimedOut) {
      return 504
    }
    return 500
  }

  /**
   * Build a guaranteed-valid error response.
   * @description Emits baseline security headers when send path fails.
   * @param ctx - Request context
   * @param statusCode - HTTP status code
   * @param message - Safe masked message
   * @param wantsJson - Whether client prefers JSON
   * @returns Safe error response
   */
  private static safeFallbackResponse(
    ctx: Context,
    statusCode: number,
    message: string,
    wantsJson: boolean,
    reasons?: readonly string[]
  ): globalThis.Response {
    return Handler.negotiatedResponse(statusCode, message, wantsJson, ctx.pathname, reasons)
  }
}
