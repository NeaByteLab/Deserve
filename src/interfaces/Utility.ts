/** Generic string-keyed data record. */
export type DataRecord = Record<string, unknown>

/**
 * Sync or async value.
 * @template T - Wrapped value type
 */
export type MaybeAsync<T> = T | Promise<T>
