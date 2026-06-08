/** Metadata atom carrying a route path. */
type RouteMeta = { routePath: string }

/** Metadata atom carrying an Error. */
type ErrorMeta = { error: Error }

/**
 * Discriminated union of lifecycle events.
 * @description Discriminated by kind, with fields under metadata.
 */
export type EventBase =
  | LifecycleEvent<'server:listening', { port: number; hostname: string }>
  | LifecycleEvent<
    'route:loaded' | 'route:reloaded' | 'route:removed',
    RouteMeta & { pattern: string }
  >
  | LifecycleEvent<'route:skipped', RouteMeta & { reason: string }>
  | LifecycleEvent<'route:error' | 'reload:error', RouteMeta & ErrorMeta>
  | LifecycleEvent<
    'process:error',
    ErrorMeta & { origin: 'unhandledrejection' | 'uncaughterror' | 'process:exit' }
  >
  | LifecycleEvent<'view:compiled' | 'view:rendered', { path: string; durationMs: number }>
  | LifecycleEvent<'view:refreshed', { paths: readonly string[] }>
  | LifecycleEvent<'view:error', { path: string } & ErrorMeta>
  | LifecycleEvent<
    'request:complete' | 'request:error',
    { method: string; statusCode: number; url: string; durationMs: number; error?: Error }
  >

/** Origin channel of an event. */
export type EventChannel = 'internal' | 'external'

/** Emit function passed into internal subsystems. */
export type EventEmit = (event: EventBase) => void

/** Discriminant value of a lifecycle event. */
export type EventKind = EventBase['kind']

/** Listener invoked for emitted events. */
export type EventListener = (event: EventBase) => void

/**
 * Lifecycle event envelope with metadata.
 * @description Pairs a kind discriminant with its readonly metadata.
 * @template Kind - Event kind discriminant literal
 * @template Metadata - Event-specific metadata shape
 */
export type LifecycleEvent<Kind extends string, Metadata> = {
  /** Origin channel of the event */
  readonly type: EventChannel
  /** Event kind discriminant value */
  readonly kind: Kind
  /** Readonly event-specific metadata */
  readonly metadata: Readonly<Metadata>
  /** Creation time in epoch milliseconds */
  readonly timestamp: number
}
