import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Default error response builder.
 * @description Runs error middleware then JSON or HTML by Accept.
 */
export class Error {
  /**
   * Build error response with middleware and format.
   * @description Tries error middleware then JSON or HTML.
   * @param ctx - Request context
   * @param statusCode - HTTP status code
   * @param error - Thrown error
   * @param errorMiddleware - Optional custom handler
   * @returns Error response
   */
  static async buildResponse(
    ctx: Core.Context,
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
      if (customResponse) {
        return customResponse
      }
    }
    const isJson = ctx.request.headers.get('accept')?.includes('application/json')
    if (isJson) {
      return ctx.send.json(
        {
          error: error.message,
          path: ctx.pathname,
          statusCode
        },
        { status: statusCode }
      )
    }
    return ctx.send.html(Error.defaultErrorHtml(statusCode, error.message), {
      status: statusCode
    })
  }

  /**
   * Minimal HTML error page.
   * @description Returns simple HTML with status and escaped message.
   * @param statusCode - Status code and title
   * @param message - Escaped message body
   * @returns HTML string
   */
  static defaultErrorHtml(statusCode: number, message: string): string {
    const escapedMessage = Error.escapeHtml(message)
    return `<!DOCTYPE html>
<html>
<head><title>${statusCode}</title></head>
<body>
<h1>${statusCode}</h1>
<hr>
<p>${escapedMessage}</p>
</body>
</html>
`
  }

  /**
   * Escape HTML special characters.
   * @description Escapes &, <, > for safe HTML.
   * @param text - Raw string
   * @returns Escaped string
   */
  static escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}
