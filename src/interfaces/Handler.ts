import type * as Types from '@interfaces/index.ts'

/** Request handler configuration options. */
export interface HandlerOptions {
  /** Custom error response builder */
  errorResponseBuilder?: Types.ErrorResponseBuilder
  /** Max route param length, 414 if exceeded */
  maxRouteParamLength?: number
  /** Max URL length, 414 if exceeded */
  maxUrlLength?: number
  /** Timeout in ms, 503 on expiry */
  requestTimeoutMs?: number
  /** Custom static file handler */
  staticHandler?: Types.StaticHandler
  /** Root directory for .dve templates */
  viewsDir?: string
  /** Worker pool for CPU-bound work */
  worker?: Types.WorkerPoolOptions
}

/** Router constructor and serve options. */
export interface RouterOptions extends HandlerOptions {
  /** Directory path for file-based routes */
  routesDir?: string
}
