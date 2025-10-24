/**
 * Send utility class for creating HTTP responses.
 * @description Provides static methods for responses with headers.
 */
export class Send {
  /**
   * Create a JSON response with proper Content-Type header.
   * @param data - Data to serialize as JSON
   * @param options - Additional response options
   * @returns Response object with JSON content
   */
  static json(data: unknown, options?: ResponseInit): Response {
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      },
      ...options
    })
  }

  /**
   * Create a text response with proper Content-Type header.
   * @param text - Text content
   * @param options - Additional response options
   * @returns Response object with text content
   */
  static text(text: string, options?: ResponseInit): Response {
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain'
      },
      ...options
    })
  }

  /**
   * Create an HTML response with proper Content-Type header.
   * @param html - HTML content
   * @param options - Additional response options
   * @returns Response object with HTML content
   */
  static html(html: string, options?: ResponseInit): Response {
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html'
      },
      ...options
    })
  }

  /**
   * Create a redirect response.
   * @param url - URL to redirect to
   * @param status - HTTP status code (default: 302)
   * @returns Response object for redirect
   */
  static redirect(url: string, status = 302): Response {
    return new Response(null, {
      status,
      headers: {
        Location: url
      }
    })
  }
}
