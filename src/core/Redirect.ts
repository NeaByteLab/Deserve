import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * HTTP redirect response builder.
 * @description Builds redirect responses with safe location.
 */
export class Redirect {
  /**
   * Build redirect response with location.
   * @description Validates status then merges headers and cookies.
   * @param requestUrl - Originating request URL
   * @param responseHeaders - Accumulated response headers
   * @param setCookieValues - Set-Cookie header values
   * @param url - Redirect target location
   * @param status - Redirect HTTP status code
   * @param extraHeaders - Optional extra header values
   * @returns Redirect response instance
   * @throws When status code is not a redirect
   */
  static buildResponse(
    requestUrl: string,
    responseHeaders: Types.StringRecord,
    setCookieValues: readonly string[],
    url: string,
    status: Types.RedirectStatus,
    extraHeaders?: HeadersInit
  ): Response {
    if (!Core.Constant.redirectStatuses.has(status)) {
      throw new Deno.errors.InvalidData(
        `Redirect status must be one of 301, 302, 303, 307, 308, got "${String(status)}"`
      )
    }
    const absoluteUrl = Redirect.resolveLocation(requestUrl, url)
    const extraRecord = extraHeaders ? Core.Handler.toRecord(extraHeaders) : undefined
    let mergedHeaders: Types.StringRecord
    if (extraRecord) {
      const { Location: _, ...rest } = extraRecord
      mergedHeaders = { ...responseHeaders, ...rest, Location: absoluteUrl }
    } else {
      mergedHeaders = { ...responseHeaders, Location: absoluteUrl }
    }
    const headers = new Core.API.Headers(mergedHeaders)
    Core.Handler.appendCookies(headers, setCookieValues)
    return new Core.API.Response(null, { status, headers })
  }

  /**
   * Resolve and validate redirect location.
   * @description Blocks cross origin unless explicitly absolute.
   * @param requestUrl - Originating request URL
   * @param url - Redirect target location
   * @returns Absolute resolved location URL
   * @throws When URL invalid, wrong scheme, or cross origin
   */
  private static resolveLocation(requestUrl: string, url: string): string {
    const isExplicitAbsolute = /^https?:\/\//i.test(url)
    let resolvedUrl: URL
    let baseUrl: URL
    try {
      baseUrl = new Core.API.URL(requestUrl)
      resolvedUrl = new Core.API.URL(url, baseUrl)
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
        }" resolves to a different origin, pass a full https URL to redirect cross-origin intentionally`
      )
    }
    return resolvedUrl.href
  }
}
