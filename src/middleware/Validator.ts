import type * as Types from '@interfaces/index.ts'
import * as Middleware from '@middleware/index.ts'
import { Define } from '@neabyte/typebox'

/**
 * Validator factory collection.
 * @description Exposes validation check and schema define.
 */
export const Validator = {
  check: <SchemaType extends Types.ValidationSchema>(schema: SchemaType): Types.MiddlewareFn =>
    Middleware.Validate.check(schema),
  define: Define
} as const
