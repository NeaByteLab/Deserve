import type * as Core from '@core/index.ts'
import type {
  DataRecord,
  EngineOptions,
  ErrorResponseBuilder,
  RouteHandler,
  StateKey,
  StaticHandler,
  ViewEngine,
  WorkerPoolOptions,
  WorkerRunHandle
} from '@interfaces/index.ts'

/** Request handler configuration options. */
export interface HandlerOptions extends Partial<Pick<EngineOptions, 'maxIterations' | 'viewsDir'>> {
  /** Custom error response builder */
  readonly errorResponseBuilder?: ErrorResponseBuilder
  /** Maximum route parameter length */
  readonly maxParamLength?: number
  /** Maximum request URL length */
  readonly maxUrlLength?: number
  /** Request timeout in milliseconds */
  readonly requestTimeoutMs?: number
  /** Static file handler instance */
  readonly staticHandler?: StaticHandler
  /** Worker pool configuration options */
  readonly worker?: WorkerPoolOptions
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
  readonly view: StateKey<ViewEngine>
  /** Key for the worker handle */
  readonly worker: StateKey<WorkerRunHandle>
  /** Key for current session data */
  readonly session: StateKey<DataRecord | null>
  /** Key for the session setter */
  readonly setSession: StateKey<(data: DataRecord) => Promise<void>>
  /** Key for the session clearer */
  readonly clearSession: StateKey<() => void>
}

/** Route entry for type-safe dispatch. */
export type RouteEntry =
  | (RouteEntryBase & {
    readonly kind: 'handler'
    readonly handler: RouteHandler
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
