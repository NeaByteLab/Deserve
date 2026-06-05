import type * as Types from '@interfaces/index.ts'
import { Helper } from '@core/Helper.ts'

/**
 * Builds redirect Response with Location.
 * @description Resolves relative URL, merges headers.
 */
export class Redirect {
  /**
   * Create redirect response to URL.
   * @description Resolves relative URL, merges Location and headers.
   * @param requestUrl - Base for relative URL
   * @param responseHeaders - Headers to merge
   * @param setCookieValues - Cookie values to append
   * @param url - Target URL (absolute or relative)
   * @param status - Redirect status code
   * @param extraHeaders - Optional extra headers
   * @returns Redirect response
   */
  static buildResponse(
    requestUrl: string,
    responseHeaders: Record<string, string>,
    setCookieValues: readonly string[],
    url: string,
    status: Types.RedirectStatus,
    extraHeaders?: HeadersInit
  ): Response {
    const absolute = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : new URL(url, requestUrl).href
    if (!absolute.startsWith('http://') && !absolute.startsWith('https://')) {
      throw new Deno.errors.InvalidData(
        `Redirect URL must use http or https scheme, got "${absolute.slice(0, 64)}"`
      )
    }
    const extra = Helper.toRecord(extraHeaders)
    delete extra['Location']
    const mergedHeaders = {
      ...responseHeaders,
      ...extra,
      Location: absolute
    }
    const headers = new Headers(mergedHeaders)
    for (const cookie of setCookieValues) {
      headers.append('Set-Cookie', cookie)
    }
    return new Response(null, { status, headers })
  }
}
