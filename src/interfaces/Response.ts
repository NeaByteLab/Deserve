/** Helpers on context for sending responses. */
export type SendHelpers = {
  /** Custom body and ResponseInit */
  custom: (body: BodyInit | null, options?: ResponseInit) => Response
  /** Binary or string as attachment */
  data: (
    data: Uint8Array | string,
    filename: string,
    options?: ResponseInit,
    contentType?: string
  ) => Response
  /** File from path as attachment */
  file: (filePath: string, filename?: string, options?: ResponseInit) => Promise<Response>
  /** HTML string response */
  html: (html: string, options?: ResponseInit) => Response
  /** JSON-serialized response */
  json: (data: unknown, options?: ResponseInit) => Response
  /** Redirect to URL with status */
  redirect: (url: string, status?: number) => Response
  /** ReadableStream with optional content type */
  stream: (stream: ReadableStream, options?: ResponseInit, contentType?: string) => Response
  /** Plain text response */
  text: (text: string, options?: ResponseInit) => Response
}
