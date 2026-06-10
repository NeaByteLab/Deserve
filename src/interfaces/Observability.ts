import type * as Types from '@interfaces/index.ts'

/** Metadata atom carrying an Error. */
type ErrorMeta = {
  /** Error instance describing the fault */
  error: Error
}

/** Metadata atom carrying a route path. */
type RouteMeta = {
  /** Registered route path string */
  routePath: string
}

/**
 * Discriminated union of lifecycle events.
 * @description Discriminated by kind, with fields under metadata.
 */
export type EventBase =
  | LifecycleEvent<'server:listening', { port: number; hostname: string }>
  | LifecycleEvent<'server:shutdown', Record<never, never>>
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
    'session:invalid',
    { cookieName: string; reason: 'tampered' | 'expired' | 'malformed' }
  >
  | LifecycleEvent<'csrf:rule-error', { rule: 'origin' | 'secFetchSite' } & ErrorMeta>
  | LifecycleEvent<'worker:timeout', { timeoutMs: number; workerIndex: number } & ErrorMeta>
  | LifecycleEvent<'worker:crash', { workerIndex: number } & ErrorMeta>
  | LifecycleEvent<'worker:respawn', { workerIndex: number }>
  | LifecycleEvent<
    'worker:rejected',
    { reason: 'queue-depth' | 'queue-wait'; queueDepth: number; maxQueueDepth: number }
  >
  | LifecycleEvent<
    'request:complete' | 'request:error',
    & {
      method: string
      statusCode: number
      url: string
      durationMs: number
      ip?: string
    }
    & Types.RequestMetrics
    & Partial<ErrorMeta>
  >

/**
 * Event member selected by kind.
 * @description Distributes over the union to keep grouped kinds.
 * @template Kind - Event kind discriminant literal
 */
export type EventByKind<Kind extends EventKind> = EventBase extends infer Member
  ? Member extends { kind: infer MemberKind } ? Kind extends MemberKind ? Member : never
  : never
  : never

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
