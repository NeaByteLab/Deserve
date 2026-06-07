import type * as Types from '@interfaces/index.ts'
import type { Context } from '@core/Context.ts'
import * as Core from '@core/index.ts'

/**
 * Handler utilities for routing layers.
 * @description Static helpers used by routing, middleware, and context layers.
 */
export class Handler {
  /** Well-known framework state keys */
  static readonly StateKeys: Types.StateKeysMap = {
    view: Handler.stateKey<Types.ViewEngine>('view'),
    worker: Handler.stateKey<Types.WorkerRunHandle>('worker'),
    session: Handler.stateKey<Types.DataRecord | null>('session'),
    setSession: Handler.stateKey<(data: Types.DataRecord) => Promise<void>>('setSession'),
    clearSession: Handler.stateKey<() => void>('clearSession')
  } as const

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
      if (customResponse instanceof globalThis.Response) {
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
    const wantsJson = ctx.request.headers.get('accept')?.includes('application/json')
    try {
      if (wantsJson) {
        return ctx.send.json(
          { error: errorMessage, path: ctx.pathname, statusCode },
          { status: statusCode }
        )
      }
      return ctx.send.html(Handler.defaultErrorHtml(statusCode, errorMessage), {
        status: statusCode
      })
    } catch {
      return Handler.safeFallbackResponse(ctx, statusCode, errorMessage, wantsJson === true)
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
    if (error instanceof Error) {
      const statusValue = 'statusCode' in error
        ? (error as Types.StatusCodeCarrier).statusCode
        : undefined
      if (typeof statusValue === 'number' && statusValue >= 400 && statusValue < 600) {
        return { statusCode: statusValue, error }
      }
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
    if (init instanceof Headers) {
      return Object.fromEntries(init)
    }
    if (Array.isArray(init)) {
      return Object.fromEntries(init as Types.StringPair[])
    }
    return { ...init }
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
    wantsJson: boolean
  ): globalThis.Response {
    const fallbackHeaders = new globalThis.Headers(Core.Constant.securityHeaderDefaults)
    const responseBody = wantsJson
      ? JSON.stringify({ error: message, path: ctx.pathname, statusCode })
      : Handler.defaultErrorHtml(statusCode, message)
    fallbackHeaders.set('Content-Type', wantsJson ? 'application/json' : 'text/html; charset=utf-8')
    return new globalThis.Response(responseBody, { status: statusCode, headers: fallbackHeaders })
  }
}
