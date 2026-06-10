import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Response-building helpers for the routing layer.
 * @description Stateless construction of error, HEAD, and validated responses.
 */
export class Respond {
  /**
   * Verify a value is a genuine Response.
   * @description Rejects prototype-only fakes whose slot access throws.
   * @param value - Candidate returned by a handler or middleware
   * @returns True only when the value is a real Response whose slots are readable
   */
  static isGenuineResponse(value: unknown): value is Response {
    if (!(value instanceof Core.API.Response)) {
      return false
    }
    try {
      void value.status
      return true
    } catch {
      return false
    }
  }

  /**
   * Build content-negotiated error response.
   * @description Returns JSON or HTML with security headers by Accept.
   * @param req - Incoming request
   * @param statusCode - HTTP status code to emit
   * @param label - Masked error label
   * @returns Error Response with security headers
   */
  static negotiatedError(req: Request, statusCode: number, label: string): Response {
    return Core.Handler.negotiatedResponse(statusCode, label, Core.Handler.wantsJson(req.headers))
  }

  /**
   * Build masked error response without Context.
   * @description Content-negotiated fallback for faults escaping handleRequest.
   * @param req - Incoming request
   * @param statusCode - Masked status code to emit
   * @returns Error Response with security headers
   */
  static safeServerError(req: Request, statusCode: number): Response {
    const errorLabel = Core.Constant.serverErrorMessages[statusCode as Types.HttpStatusCode] ??
      'Internal Server Error'
    return Respond.negotiatedError(req, statusCode, errorLabel)
  }

  /**
   * Build HEAD response preserving GET headers.
   * @description Strips and cancels body, keeps existing Content-Length unchanged.
   * @param response - The fully built GET-equivalent response
   * @returns Bodyless response with preserved representation headers
   */
  static async toHeadResponse(response: Response): Promise<Response> {
    const headHeaders = new Core.API.Headers(response.headers)
    if (response.body) {
      await response.body.cancel()
    }
    return new Core.API.Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers: headHeaders
    })
  }
}
