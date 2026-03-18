/** CORS middleware options. */
export interface CorsOptions {
  /** Allowed request headers */
  allowedHeaders?: string[]
  /** Allow credentials */
  credentials?: boolean
  /** Headers exposed to client */
  exposedHeaders?: string[]
  /** Preflight cache max-age in seconds */
  maxAge?: number
  /** Allowed methods */
  methods?: string[]
  /** Allowed origin(s) or '*' */
  origin?: string | string[]
}
