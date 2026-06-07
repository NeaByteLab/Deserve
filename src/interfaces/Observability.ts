/**
 * Discriminated union of lifecycle events.
 * @description Discriminated by kind, with fields under metadata.
 */
export type EventBase =
  | LifecycleEvent<'server:listening', { port: number; hostname: string }>
  | LifecycleEvent<
    'route:loaded' | 'route:reloaded' | 'route:removed',
    { routePath: string; pattern: string }
  >
  | LifecycleEvent<'route:skipped', { routePath: string; reason: string }>
  | LifecycleEvent<'route:error' | 'reload:error', { routePath: string; error: Error }>
  | LifecycleEvent<'view:compiled' | 'view:rendered', { path: string; durationMs: number }>
  | LifecycleEvent<'view:refreshed', { paths: readonly string[] }>
  | LifecycleEvent<'view:error', { path: string; error: Error }>
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
  readonly type: EventChannel
  readonly kind: Kind
  readonly metadata: Readonly<Metadata>
  readonly timestamp: number
}
