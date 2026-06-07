import type * as Types from '@interfaces/index.ts'
import { Handler } from '@core/Handler.ts'

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
    responseHeaders: Types.StringRecord,
    setCookieValues: readonly string[],
    url: string,
    status: Types.RedirectStatus,
    extraHeaders?: HeadersInit
  ): Response {
    const absoluteUrl = Redirect.resolveLocation(requestUrl, url)
    const extraRecord = extraHeaders ? Handler.toRecord(extraHeaders) : undefined
    let mergedHeaders: Types.StringRecord
    if (extraRecord) {
      const { Location: _, ...rest } = extraRecord
      mergedHeaders = { ...responseHeaders, ...rest, Location: absoluteUrl }
    } else {
      mergedHeaders = { ...responseHeaders, Location: absoluteUrl }
    }
    const headers = new Headers(mergedHeaders)
    for (const cookieValue of setCookieValues) {
      headers.append('Set-Cookie', cookieValue)
    }
    return new Response(null, { status, headers })
  }

  /**
   * Resolve and validate a redirect Location.
   * @description Decides on parsed result, relative targets stay same-origin.
   * @param requestUrl - Base request URL for relative resolution
   * @param url - Caller-supplied redirect target
   * @returns Validated absolute URL string
   * @throws {Deno.errors.InvalidData} On unparseable, non-http(s), or cross-origin relative input
   */
  private static resolveLocation(requestUrl: string, url: string): string {
    const isExplicitAbsolute = /^https?:\/\//i.test(url)
    let resolvedUrl: URL
    let baseUrl: URL
    try {
      baseUrl = new URL(requestUrl)
      resolvedUrl = new URL(url, baseUrl)
    } catch {
      throw new Deno.errors.InvalidData(
        `Redirect URL could not be resolved, got "${url.slice(0, 64)}"`
      )
    }
    if (resolvedUrl.protocol !== 'http:' && resolvedUrl.protocol !== 'https:') {
      throw new Deno.errors.InvalidData(
        `Redirect URL must use http or https scheme, got "${resolvedUrl.href.slice(0, 64)}"`
      )
    }
    if (!isExplicitAbsolute && resolvedUrl.origin !== baseUrl.origin) {
      throw new Deno.errors.InvalidData(
        `Redirect target "${
          url.slice(0, 64)
        }" resolves to a different origin, pass a full https:// URL to redirect cross-origin intentionally`
      )
    }
    return resolvedUrl.href
  }
}
