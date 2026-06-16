import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Validation error to status mapper.
 * @description Maps validation throws to HTTP status errors.
 */
export class Reason {
  /**
   * Map a validation error to status.
   * @description Preserves existing status, else maps client input to 422.
   * @param error - Unknown value thrown during validation
   * @returns StatusError carrying the resolved status code
   */
  static toStatusError(error: unknown): Types.StatusError {
    if (Core.Handler.isErrorWithStatus(error)) {
      return error
    }
    if (error instanceof Error && Array.isArray(error.cause)) {
      const reasons = (error.cause as readonly unknown[]).filter(
        (reason): reason is string => typeof reason === 'string'
      )
      const message = reasons.length > 0 ? reasons.join('; ') : 'Validation failed'
      const statusError = Core.Handler.createStatusError(422, message)
      Object.defineProperty(statusError, 'cause', {
        value: reasons,
        writable: false,
        enumerable: false,
        configurable: false
      })
      return statusError
    }
    return Core.Handler.createStatusError(422, 'Unprocessable request input')
  }
}
