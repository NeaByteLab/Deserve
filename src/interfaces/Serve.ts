/** Options for static file serving. */
export interface ServeOptions {
  /** Max-age in seconds for Cache-Control */
  readonly cacheControl?: number
  /** Enable ETag generation and 304 */
  readonly etag?: boolean
  /** File system path for static root */
  readonly path: string
}
