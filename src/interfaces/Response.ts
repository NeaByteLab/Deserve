/**
 * Helpers on context for responses.
 * @description Provides typed methods for common response formats.
 */
export interface SendHelpers {
  /**
   * Send custom body response.
   * @description Sends response with custom body and init.
   * @param body - Response body or null
   * @param options - Optional ResponseInit config
   * @returns Constructed response
   */
  readonly custom: (body: BodyInit | null, options?: ResponseInit) => Response
  /**
   * Send binary or string attachment.
   * @description Sends data as downloadable file attachment.
   * @param data - Binary or string content
   * @param filename - Attachment file name
   * @param options - Optional ResponseInit config
   * @param contentType - MIME type override
   * @returns Attachment response
   */
  readonly data: (
    data: Uint8Array | string,
    filename: string,
    options?: ResponseInit,
    contentType?: string
  ) => Response
  /**
   * Send file from disk path.
   * @description Reads file from disk and sends attachment.
   * @param filePath - Absolute or relative file path
   * @param filename - Override attachment file name
   * @param options - Optional ResponseInit config
   * @returns Promise resolving to file response
   */
  readonly file: (filePath: string, filename?: string, options?: ResponseInit) => Promise<Response>
  /**
   * Send HTML string response.
   * @description Sends HTML with correct content type.
   * @param html - HTML string body
   * @param options - Optional ResponseInit config
   * @returns HTML response
   */
  readonly html: (html: string, options?: ResponseInit) => Response
  /**
   * Send JSON-serialized response.
   * @description Serializes data and sets JSON content type.
   * @param data - Value to serialize as JSON
   * @param options - Optional ResponseInit config
   * @returns JSON response
   */
  readonly json: (data: unknown, options?: ResponseInit) => Response
  /**
   * Send redirect to target URL.
   * @description Sends redirect response to target URL.
   * @param url - Target redirect URL
   * @param status - HTTP redirect status code
   * @param options - Optional redirect headers
   * @returns Redirect response
   */
  readonly redirect: (url: string, status?: RedirectStatus, options?: RedirectInit) => Response
  /**
   * Send streaming response body.
   * @description Sends streaming response with content type.
   * @param stream - Readable stream body
   * @param options - Optional ResponseInit config
   * @param contentType - MIME type override
   * @returns Streaming response
   */
  readonly stream: (
    stream: ReadableStream,
    options?: ResponseInit,
    contentType?: string
  ) => Response
  /**
   * Send plain text response.
   * @description Sends text with plain content type.
   * @param text - Plain text body
   * @param options - Optional ResponseInit config
   * @returns Text response
   */
  readonly text: (text: string, options?: ResponseInit) => Response
}

/** Format the request body was parsed as. */
export type BodyParsedFormat = 'arraybuffer' | 'blob' | 'form' | 'json' | 'text'

/**
 * Callback that builds redirect Response.
 * @description Creates redirect response from URL and status.
 * @param url - Target redirect URL
 * @param status - HTTP redirect status code
 * @param extraHeaders - Additional headers to include
 * @returns Redirect response
 */
export type RedirectBuilder = (
  url: string,
  status: RedirectStatus,
  extraHeaders?: HeadersInit
) => Response

/** Optional headers for redirect init. */
export type RedirectInit = Pick<ResponseInit, 'headers'>

/** Valid HTTP redirect status codes. */
export type RedirectStatus = 301 | 302 | 303 | 307 | 308
