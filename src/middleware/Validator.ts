import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'
import * as Validation from '@validation/index.ts'
import type { ContractFn } from '@neabyte/typebox'

/**
 * Request validation middleware for sources.
 * @description Runs source contracts, stores validated data on context.
 */
export class Validator {
  /**
   * Create validation middleware from schema.
   * @description Validates each source contract, stores result on context.
   * @param schema - Per-source validation contracts
   * @returns Middleware that validates request sources
   * @throws {Deno.errors.InvalidData} When schema has no source contract
   * @throws {Deno.errors.InvalidData} When schema validates params, unavailable before routing
   */
  static create(schema: Types.ValidationSchema): Types.MiddlewareFn {
    const entries = Object.entries(schema).filter(
      (entry): entry is [Types.ValidationSource, ContractFn] => typeof entry[1] === 'function'
    )
    if (entries.length === 0) {
      throw new Deno.errors.InvalidData('Validator requires at least one source contract')
    }
    if (entries.some(([source]) => source === 'params')) {
      throw new Deno.errors.InvalidData(
        'Validator cannot validate params in middleware, route params resolve after middleware runs, validate them inside the handler with Validator.check(contract, ctx.params())'
      )
    }
    return Middleware.WrapMware('Validation error', async (ctx, next) => {
      const existing = ctx.getState(Core.Handler.stateKeys.validated)
      const validated: Types.DataRecord = { ...existing }
      for (const [source, contract] of entries) {
        const input = await Validation.Source.extract(source, ctx)
        try {
          validated[source] = contract(input as never)
        } catch (error) {
          throw Validation.Reason.toStatusError(error)
        }
      }
      ctx[Core.InternalContext].setInternalState(Core.Handler.stateKeys.validated, validated)
      return await next()
    })
  }
}
