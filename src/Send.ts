/**
 * Send utility class for creating HTTP responses.
 * @description Provides static methods for responses with headers.
 */
export class Send {
  /**
   * Create a download response from in-memory data.
   * @param data - File data as Uint8Array or string
   * @param filename - Filename for download
   * @param options - Additional response options
   * @param contentType - MIME type (default: application/octet-stream)
   * @returns Response object for file download
   */
  static data(
    data: Uint8Array | string,
    filename: string,
    options?: ResponseInit,
    contentType = 'application/octet-stream'
  ): Response {
    const body = typeof data === 'string' ? new TextEncoder().encode(data) : data
    return new Response(body as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': body.length.toString()
      },
      ...options
    })
  }

  /**
   * Create a file download response from filesystem.
   * @param filePath - Path to the file to download
   * @param filename - Optional custom filename for download
   * @param options - Additional response options
   * @returns Response object for file download
   */
  static async file(
    filePath: string,
    filename?: string,
    options?: ResponseInit
  ): Promise<Response> {
    try {
      const file = await Deno.readFile(filePath)
      const actualFilename = filename || filePath.split('/').pop() || 'download'
      return new Response(file, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${actualFilename}"`,
          'Content-Length': file.length.toString()
        },
        ...options
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to read file: ${errorMessage}`)
    }
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
}
