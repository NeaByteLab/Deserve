import type { HttpMethod } from '@interfaces/Handler.ts'

/** CORS middleware options. */
export interface CorsOptions {
  /** Allowed request headers */
  readonly allowedHeaders?: readonly string[]
  /** Allow credentials */
  readonly credentials?: boolean
  /** Headers exposed to client */
  readonly exposedHeaders?: readonly string[]
  /** Preflight cache max-age in seconds */
  readonly maxAge?: number
  /** Allowed methods */
  readonly methods?: readonly HttpMethod[]
  /** Allowed origin(s) or '*' */
  readonly origin?: string | readonly string[]
}
