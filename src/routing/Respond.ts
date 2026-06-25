import * as Core from '@core/index.ts'

/**
 * Response helper utilities.
 * @description Builds error and HEAD responses safely.
 */
export class Respond {
  /**
   * Check value is a genuine Response.
   * @description Verifies instance and readable status access.
   * @param value - Value to test for Response
   * @returns True when value is usable Response
   */
  static isGenuine(value: unknown): value is Response {
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
   * @description Chooses JSON or text based on request.
   * @param req - Incoming request for negotiation
   * @param statusCode - HTTP status code to return
   * @param label - Error label text
   * @returns Negotiated error response
   */
  static negotiatedError(req: Request, statusCode: number, label: string): Response {
    return Core.Handler.negotiatedResponse(statusCode, label, Core.Handler.wantsJson(req.headers))
  }

  /**
   * Build safe server error response.
   * @description Uses safe message for the status code.
   * @param req - Incoming request for negotiation
   * @param statusCode - HTTP status code to return
   * @returns Negotiated safe error response
   */
  static safeServerError(req: Request, statusCode: number): Response {
    return Respond.negotiatedError(req, statusCode, Core.Handler.safeMessage(statusCode))
  }

  /**
   * Convert response into HEAD response.
   * @description Drops body and preserves status headers.
   * @param response - Source response to convert
   * @returns Promise resolving to bodyless response
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
