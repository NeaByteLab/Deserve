import type * as Types from '@interfaces/index.ts'
import type { ContractFn } from '@neabyte/typebox'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Request validation middleware.
 * @description Validates request sources against contracts.
 */
export class Validate {
  /** Source readers mapping sources to getters */
  private static readonly sourceReaders: Types.SourceReaders = {
    body: (get) => get.body(),
    cookies: (get) => get.cookie(),
    headers: (get) => get.header(),
    query: (get) => get.query()
  }

  /**
   * Create validation middleware.
   * @description Validates configured sources against schema contracts.
   * @param schema - Validation schema keyed by source
   * @returns Middleware function validating request data
   * @throws {Deno.errors.InvalidData} When schema source is invalid
   * @template SchemaType - Validation schema shape
   */
  static check<SchemaType extends Types.ValidationSchema>(
    schema: SchemaType
  ): Types.MiddlewareFn {
    const sources = Object.keys(schema) as Types.ValidationSource[]
    if (sources.length === 0) {
      throw new Deno.errors.InvalidData('Validation schema needs at least one source contract')
    }
    for (const source of sources) {
      if (!(source in Validate.sourceReaders)) {
        throw new Deno.errors.InvalidData(
          `Validation source "${source}" is not supported, use body cookies headers or query`
        )
      }
    }
    return Middleware.Wrap.apply('validate', async (ctx, next) => {
      const validated: Record<string, unknown> = {}
      for (const source of sources) {
        const contract = schema[source]!
        const input = await Validate.sourceReaders[source](ctx.get)
        try {
          validated[source] = Validate.runContract(contract, input)
        } catch (caught) {
          const reasons = Validate.reasonsFrom(caught)
          Core.Context.internalOf(ctx).emitEvent(
            Core.Observability.internalEvent('validate:failed', { source, reasons })
          )
          throw caught
        }
      }
      Core.Context.internalOf(ctx).installValidated({ value: validated })
      return await next()
    })
  }

  /**
   * Extract failure reasons from error.
   * @description Reads cause array, message, or default reason.
   * @param caught - Caught error value to inspect
   * @returns List of failure reason strings
   */
  private static reasonsFrom(caught: unknown): readonly string[] {
    if (caught instanceof Error && Array.isArray(caught.cause)) {
      const reasons = caught.cause.filter((reason): reason is string => typeof reason === 'string')
      if (reasons.length > 0) {
        return reasons
      }
    }
    if (caught instanceof Error && caught.message.length > 0) {
      return [caught.message]
    }
    return ['validation failed']
  }

  /**
   * Run a contract against input value.
   * @description Throws status error when validation fails.
   * @param contract - Contract function to execute
   * @param input - Raw input value to validate
   * @returns Validated value from the contract
   * @throws {Error} Status error when contract rejects input
   */
  private static runContract(contract: ContractFn, input: unknown) {
    try {
      return (contract as (value: never) => unknown)(input as never)
    } catch (caught) {
      const reasons = Validate.reasonsFrom(caught)
      throw Core.Handler.createStatusError(422, reasons.join('; '), reasons)
    }
  }
}
