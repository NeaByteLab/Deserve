import type * as Types from '@interfaces/index.ts'
import { Helper } from '@core/Helper.ts'

/**
 * Builds redirect Response with Location.
 * @description Resolves relative URL; merges headers.
 */
export class Redirect {
  /**
   * Create redirect response to URL.
   * @description Resolves relative URL; merges Location and headers.
   * @param requestUrl - Base for relative URL
   * @param responseHeaders - Headers to merge
   * @param url - Target URL (absolute or relative)
   * @param status - Redirect status code
   * @param extraHeaders - Optional extra headers
   * @returns Redirect response
   */
  static buildResponse(
    requestUrl: string,
    responseHeaders: Record<string, string>,
    url: string,
    status: Types.RedirectStatus,
    extraHeaders?: HeadersInit
  ): Response {
    const absolute = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : new URL(url, requestUrl).href
    const mergedHeaders = {
      ...responseHeaders,
      Location: absolute,
      ...Helper.toRecord(extraHeaders)
    }
    return new Response(null, { status, headers: new Headers(mergedHeaders) })
  }
}
