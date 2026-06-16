import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'
import type { ContractFn } from '@neabyte/typebox'

/** Per-source validation contract schema. */
export interface ValidationSchema {
  /** Contract for raw request body */
  readonly body?: ContractFn
  /** Contract for parsed request cookies */
  readonly cookies?: ContractFn
  /** Contract for request header record */
  readonly headers?: ContractFn
  /** Contract for parsed JSON body */
  readonly json?: ContractFn
  /** Contract for matched route params */
  readonly params?: ContractFn
  /** Contract for query string record */
  readonly query?: ContractFn
}

/**
 * Extract raw data from a source.
 * @description Reads one validation source from the context.
 * @param ctx - Request context instance
 * @returns Source value, possibly async
 */
export type SourceExtractor = (ctx: Core.Context) => Types.MaybeAsync<unknown>

/**
 * Validated output mapped from a schema.
 * @description Maps each source to its contract output type.
 * @template SchemaType - Validation schema being validated
 */
export type ValidatedData<SchemaType extends ValidationSchema> = {
  readonly [Key in keyof SchemaType]: SchemaType[Key] extends (input: never) => infer OutputType
    ? Awaited<OutputType>
    : never
}

/** Allowed validation source key. */
export type ValidationSource = keyof ValidationSchema
