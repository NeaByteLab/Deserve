import type * as Types from '@interfaces/index.ts'

/** Request handler configuration options. */
export interface HandlerOptions {
  /** Custom error response builder */
  readonly errorResponseBuilder?: Types.ErrorResponseBuilder
  /** Max route param length, 414 if exceeded */
  readonly maxRouteParamLength?: number
  /** Max URL length, 414 if exceeded */
  readonly maxUrlLength?: number
  /** Timeout in ms, 503 on expiry */
  readonly requestTimeoutMs?: number
  /** Custom static file handler */
  readonly staticHandler?: Types.StaticHandler
  /** Root directory for .dve templates */
  readonly viewsDir?: string
  /** Worker pool for CPU-bound work */
  readonly worker?: Types.WorkerPoolOptions
}

/** Pending route change entry for hot-reload. */
export interface RouteChangeEntry {
  /** Absolute file path */
  readonly fullPath: string
  /** Relative route path from routesDir */
  readonly routePath: string
}

/** Router constructor and serve options. */
export interface RouterOptions extends HandlerOptions {
  /** Directory path for file-based routes */
  readonly routesDir?: string
}

/** HTTP method literal union. */
export type HttpMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT'

/** Allowed file extensions for route modules. */
export type RouteFileExtension = 'cjs' | 'js' | 'jsx' | 'mjs' | 'ts' | 'tsx'
