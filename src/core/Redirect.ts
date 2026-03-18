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
    status: number,
    extraHeaders?: HeadersInit
  ): Response {
    const absolute = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : new URL(url, requestUrl).href
    const mergedHeaders = {
      ...responseHeaders,
      Location: absolute,
      ...Redirect.headersToRecord(extraHeaders)
    }
    return new Response(null, { status, headers: new Headers(mergedHeaders) })
  }

  /**
   * Convert HeadersInit to string record.
   * @description Normalizes Headers, array, or object to key-value record.
   * @param init - Optional headers (Headers, array, or object)
   * @returns Record of header name to value
   */
  private static headersToRecord(init?: HeadersInit): Record<string, string> {
    if (!init) {
      return {}
    }
    if (init instanceof Headers) {
      const out: Record<string, string> = {}
      init.forEach((value, key) => {
        out[key] = value
      })
      return out
    }
    if (Array.isArray(init)) {
      return Object.fromEntries(init as [string, string][])
    }
    return { ...init }
  }
}
