/** Options for static file serving. */
export interface ServeOptions {
  /** Max-age in seconds for Cache-Control */
  cacheControl?: number
  /** Enable ETag generation and 304 */
  etag?: boolean
  /** File system path for static root */
  path: string
}
