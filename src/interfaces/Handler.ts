import type * as Types from '@interfaces/index.ts'

/** Handler options: error, static, request timeout, worker pool, view engine. */
export interface HandlerOptions {
  /** Custom error response builder */
  errorResponseBuilder?: Types.ErrorResponseBuilder
  /** Max request URL length; 414 when exceeded */
  maxUrlLength?: number
  /** Max length per route param; 414 when exceeded */
  maxRouteParamLength?: number
  /** Request timeout in ms; 503 on timeout when set */
  requestTimeoutMs?: number
  /** Custom static file handler */
  staticHandler?: Types.StaticHandler
  /** Root directory for .dve templates; when set, ctx.render() is available */
  viewsDir?: string
  /** Optional worker pool for CPU-bound work */
  worker?: Types.WorkerPoolOptions
}

/** Router constructor and serve options. */
export interface RouterOptions {
  /** Custom error response builder */
  errorResponseBuilder?: Types.ErrorResponseBuilder
  /** Max request URL length; 414 when exceeded */
  maxUrlLength?: number
  /** Max length per route param; 414 when exceeded */
  maxRouteParamLength?: number
  /** Request timeout in ms; 503 on timeout when set */
  requestTimeoutMs?: number
  /** Directory path for file-based routes */
  routesDir?: string
  /** Custom static file handler */
  staticHandler?: Types.StaticHandler
  /** Root directory for .dve templates; when set, ctx.render() is available */
  viewsDir?: string
  /** Optional worker pool for CPU-bound work; when set, ctx.state.worker is available in routes */
  worker?: Types.WorkerPoolOptions
}
