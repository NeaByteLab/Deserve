import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/** Request handler configuration options. */
export interface HandlerOptions extends
  Partial<
    Pick<
      Types.EngineOptions,
      'maxIterations' | 'maxRenderIterations' | 'maxOutputSize' | 'viewsDir'
    >
  > {
  /** Custom error response builder */
  readonly errorResponseBuilder?: Types.ErrorResponseBuilder
  /** Maximum route parameter length */
  readonly maxParamLength?: number
  /** Maximum request URL length */
  readonly maxUrlLength?: number
  /** Request timeout in milliseconds */
  readonly requestTimeoutMs?: number
  /** Static file handler instance */
  readonly staticHandler?: Types.StaticHandler
  /** Trusted proxy configuration for IP resolution */
  readonly trustProxy?: TrustProxyConfig
  /** Worker pool configuration options */
  readonly worker?: Types.WorkerPoolOptions
}

/** Server listen address info. */
export interface ListenAddr {
  /** Bound hostname */
  readonly hostname: string
  /** Bound port number */
  readonly port: number
}

/** Per-request context and error holder. */
export interface RequestHolder {
  /** Request context, null before creation */
  ctx: Core.Context | null
  /** Framework error captured during handling */
  frameworkError: Error | null
  /** Resolved client IP, undefined when unknown */
  clientIp: string | undefined
  /** Matched route pattern, undefined when unmatched */
  routePattern: string | undefined
  /** Parsed request URL, reused to avoid re-parsing for metrics */
  parsedUrl: URL | undefined
}

/** Optional OTel-aligned request metrics. */
export interface RequestMetrics {
  /** Matched route pattern */
  route?: string
  /** Resolved server hostname */
  serverAddress?: string
  /** Resolved server port number */
  serverPort?: number
  /** Request User-Agent header value */
  userAgent?: string
  /** Request body size in bytes */
  requestSize?: number
  /** Response body size in bytes */
  responseSize?: number
}

/** Route change entry for hot-reload. */
export interface RouteChangeEntry {
  /** Absolute filesystem path to module */
  readonly fullPath: string
  /** Registered route path pattern */
  readonly routePath: string
}

/** Shared route entry fields. */
export interface RouteEntryBase {
  /** URL pattern for route matching */
  readonly pattern: string
}

/** Router constructor and serve options. */
export interface RouterOptions extends HandlerOptions {
  /** Directory path for route modules */
  readonly routesDir?: string
}

/** Well-known framework state keys shape. */
export interface StateKeysMap {
  /** Key for the view engine */
  readonly view: Types.StateKey<Types.ViewEngine>
  /** Key for the worker handle */
  readonly worker: Types.StateKey<Types.WorkerRunHandle>
  /** Key for current session data */
  readonly session: Types.StateKey<Types.DataRecord | null>
  /** Key for the session setter */
  readonly setSession: Types.StateKey<(data: Types.DataRecord) => Promise<void>>
  /** Key for the session clearer */
  readonly clearSession: Types.StateKey<() => void>
}

/** Route entry for type-safe dispatch. */
export type RouteEntry =
  | (RouteEntryBase & {
    readonly kind: 'handler'
    readonly handler: Types.RouteHandler
  })
  | (RouteEntryBase & {
    readonly kind: 'static'
    readonly execute: (ctx: Core.Context) => Promise<Response>
    readonly urlPath: string
  })

/** Allowed route module file extensions. */
export type RouteFileExtension = 'cjs' | 'js' | 'jsx' | 'mjs' | 'ts' | 'tsx'

/** Loaded route module with method exports. */
export type RouteModule = Record<string, unknown>

/** Trusted proxy configuration for IP resolution. */
export type TrustProxyConfig = readonly string[] | Types.IpMatcher
