import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Validation from '@validation/index.ts'
import type { ContractFn, ContractInput } from '@neabyte/typebox'

/**
 * Standalone contract validation helpers.
 * @description Validates input and reads validated request data.
 */
export class Validator {
  /**
   * Validate input against a contract.
   * @description Runs contract, maps failures to status errors.
   * @param contract - Typebox contract function
   * @param input - Value to validate
   * @returns Validated contract result
   * @throws {Types.StatusError} When validation fails
   * @template ContractType - Contract function type
   */
  static check<ContractType extends ContractFn>(
    contract: ContractType,
    input: ContractInput<ContractType>
  ): ReturnType<ContractType> {
    try {
      return contract(input as never) as ReturnType<ContractType>
    } catch (error) {
      throw Validation.Reason.toStatusError(error)
    }
  }

  /**
   * Read validated data from context.
   * @description Returns state set by the validator middleware.
   * @param ctx - Request context instance
   * @returns Validated data for the schema
   * @throws {Types.StatusError} When no validated data exists
   * @template SchemaType - Validation schema type
   */
  static read<SchemaType extends Types.ValidationSchema>(
    ctx: Core.Context
  ): Types.ValidatedData<SchemaType> {
    const validated = ctx.getState(Core.Handler.stateKeys.validated)
    if (validated === undefined) {
      throw Core.Handler.createStatusError(
        500,
        'No validated data found, register Mware.validator(schema) before reading it'
      )
    }
    return validated as Types.ValidatedData<SchemaType>
  }
}
