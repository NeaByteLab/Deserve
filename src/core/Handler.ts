import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * HTTP error and header helpers.
 * @description Builds error responses, headers, and status errors.
 */
export class Handler {
  /**
   * Append Set-Cookie header values.
   * @description Adds each cookie value as separate header.
   * @param headers - Headers instance to mutate
   * @param cookieValues - Cookie header strings to append
   */
  static appendCookies(headers: Headers, cookieValues: readonly string[]): void {
    for (const cookieValue of cookieValues) {
      headers.append('Set-Cookie', cookieValue)
    }
  }

  /**
   * Assert value is positive finite.
   * @description Throws labeled error when value is invalid.
   * @param value - Number value to validate
   * @param label - Label used in error message
   * @param unit - Optional unit used in message
   * @returns Same value when valid
   * @throws When value is not positive finite
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
   * Build error response with middleware.
   * @description Uses middleware response when valid otherwise default.
   * @param ctx - Request context instance
   * @param statusCode - HTTP status code to send
   * @param error - Caught error instance
   * @param errorMiddleware - Optional error middleware handler
   * @returns Promise resolving to error response
   */
  static async buildResponse(
    ctx: Core.Context,
    statusCode: number,
    error: globalThis.Error,
    errorMiddleware: Types.ErrorMiddleware | null
  ): Promise<globalThis.Response> {
    if (errorMiddleware) {
      const customResponse = await errorMiddleware(ctx, {
        url: ctx.get.url().href,
        method: ctx.get.method(),
        pathname: ctx.get.pathname(),
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
   * Build content disposition header value.
   * @description Sanitizes filename and adds UTF-8 fallback.
   * @param filename - Download filename to encode
   * @returns Content-Disposition header value
   */
  static contentDisposition(filename: string): string {
    const baseName = filename.replace(Core.Constant.dispositionPathRegex, '')
    const safeName = Handler.stripControlChars(baseName) || 'download'
    const asciiName = Array.from(safeName, (char) => char.codePointAt(0)! > 127 ? '_' : char).join(
      ''
    )
      .replace(Core.Constant.dispositionEscapeRegex, (match) => `\\${match}`)
    const asciiFallback = asciiName || 'download'
    let headerValue = `attachment; filename="${asciiFallback}"`
    if (Core.Constant.dispositionNonAsciiRegex.test(safeName)) {
      headerValue += `; filename*=UTF-8''${encodeURIComponent(safeName)}`
    }
    return headerValue
  }

  /**
   * Create error with status code.
   * @description Attaches non-writable status code property.
   * @param statusCode - HTTP status code to attach
   * @param message - Error message text
   * @param cause - Optional cause detail strings
   * @returns Error carrying status code
   */
  static createStatusError(
    statusCode: number,
    message: string,
    cause?: readonly string[]
  ): Types.StatusError {
    const error =
      (cause === undefined
        ? new Error(message)
        : new Error(message, { cause })) as Types.StatusError
    Object.defineProperty(error, 'statusCode', {
      value: statusCode,
      writable: false,
      enumerable: true,
      configurable: false
    })
    return error
  }

  /**
   * Build default error HTML page.
   * @description Escapes message into simple HTML document.
   * @param statusCode - HTTP status code to show
   * @param message - Error message text
   * @returns HTML error page string
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
   * Build negotiated error response.
   * @description Sends JSON or HTML based on accept.
   * @param ctx - Request context instance
   * @param statusCode - HTTP status code to send
   * @returns Negotiated error response
   */
  static errorResponse(ctx: Core.Context, statusCode: number): globalThis.Response {
    const errorMessage = Handler.safeMessage(statusCode)
    const wantsJson = Handler.wantsJson(ctx.get.request().headers)
    try {
      if (wantsJson) {
        return ctx.send.json(Handler.problemDetails(statusCode, ctx.get.pathname()), {
          status: statusCode as Types.HttpStatusCode,
          headers: { 'Content-Type': Core.Constant.problemJsonContentType }
        })
      }
      return ctx.send.html(Handler.defaultErrorHtml(statusCode, errorMessage), {
        status: statusCode as Types.HttpStatusCode
      })
    } catch {
      return Handler.negotiatedResponse(statusCode, errorMessage, wantsJson, ctx.get.pathname())
    }
  }

  /**
   * Escape HTML special characters.
   * @description Replaces unsafe characters with HTML entities.
   * @param text - Text to escape
   * @returns Escaped HTML safe text
   */
  static escapeHtml(text: string): string {
    return text.replace(Core.Constant.htmlEscapeRegex, (ch) => Core.Constant.htmlEscapeMap[ch]!)
  }

  /**
   * Extract status and error value.
   * @description Maps Deno errors to HTTP status codes.
   * @param error - Unknown thrown value
   * @returns Status code and error pair
   */
  static extractError(error: unknown): Types.ExtractedError {
    if (Handler.isStatusError(error)) {
      return { statusCode: error.statusCode, error }
    }
    if (error instanceof Error) {
      return { statusCode: Handler.denoErrorStatus(error), error }
    }
    return { statusCode: 500, error: new Error(String(error)) }
  }

  /**
   * Check path is a directory.
   * @description Returns false when stat call fails.
   * @param path - Filesystem path to check
   * @returns True when path is directory
   */
  static isDirectory(path: string): boolean {
    try {
      return Deno.statSync(path).isDirectory
    } catch {
      return false
    }
  }

  /**
   * Check value carries HTTP status.
   * @description Validates error with status in client range.
   * @param value - Unknown value to inspect
   * @returns True when value is status error
   */
  static isStatusError(value: unknown): value is Types.StatusError {
    if (!(value instanceof Error) || !('statusCode' in value)) {
      return false
    }
    const statusValue = (value as Types.StatusCarrier<unknown>).statusCode
    return typeof statusValue === 'number' && statusValue >= 400 && statusValue < 600
  }

  /**
   * Build response without context helpers.
   * @description Produces JSON or HTML error directly.
   * @param statusCode - HTTP status code to send
   * @param message - Error message text
   * @param wantsJson - Send JSON when true
   * @param pathname - Optional request path instance
   * @returns Negotiated error response
   */
  static negotiatedResponse(
    statusCode: number,
    message: string,
    wantsJson: boolean,
    pathname?: string
  ): globalThis.Response {
    const headers = new Core.API.Headers()
    if (wantsJson) {
      headers.set('Content-Type', Core.Constant.problemJsonContentType)
      const body = Handler.problemDetails(statusCode, pathname, message)
      return new Core.API.Response(Core.API.jsonStringify(body), { status: statusCode, headers })
    }
    headers.set('Content-Type', 'text/html; charset=utf-8')
    return new Core.API.Response(Handler.defaultErrorHtml(statusCode, message), {
      status: statusCode,
      headers
    })
  }

  /**
   * Build problem details object.
   * @description Includes instance path when provided.
   * @param statusCode - HTTP status code to report
   * @param pathname - Optional instance path value
   * @param title - Optional problem title text
   * @returns Problem details payload object
   */
  static problemDetails(
    statusCode: number,
    pathname?: string,
    title?: string
  ): Types.ProblemDetails {
    const base: Types.ProblemDetails = {
      type: 'about:blank',
      title: title ?? Handler.safeMessage(statusCode),
      status: statusCode
    }
    return pathname === undefined ? base : { ...base, instance: pathname }
  }

  /**
   * Resolve safe status message text.
   * @description Falls back by client or server range.
   * @param statusCode - HTTP status code to map
   * @returns Reason phrase for status
   */
  static safeMessage(statusCode: number): string {
    return (
      Core.Constant.serverErrorMessages[statusCode as Types.HttpStatusCode] ??
        (statusCode >= 500 ? 'Internal Server Error' : 'Bad Request')
    )
  }

  /**
   * Strip control characters from text.
   * @description Removes characters below 32 and delete.
   * @param text - Text to sanitize
   * @returns Text without control characters
   */
  static stripControlChars(text: string): string {
    let result = ''
    for (const char of text) {
      const code = char.codePointAt(0)!
      if (code >= 32 && code !== 127) {
        result += char
      }
    }
    return result
  }

  /**
   * Convert headers init to record.
   * @description Normalizes Headers, array, or object input.
   * @param init - Optional headers init value
   * @returns String record of header pairs
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
   * Check accept header wants JSON.
   * @description Detects JSON or problem JSON accept values.
   * @param headers - Request headers instance
   * @returns True when client accepts JSON
   */
  static wantsJson(headers: Headers): boolean {
    const accept = headers.get('accept')
    if (accept === null) {
      return false
    }
    return accept.includes('application/json') || accept.includes('application/problem+json')
  }

  /**
   * Map Deno error to status.
   * @description Returns specific code or 500 default.
   * @param error - Error instance to inspect
   * @returns HTTP status code for error
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
}
