import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/** Static route handler descriptor. */
export type StaticFileHandler = {
  /** Executes static serve for the request */
  execute: (ctx: Core.Context) => Promise<Response>
  /** Marks this as a static route */
  staticRoute: true
  /** URL path prefix for static files */
  urlPath: string
}

/**
 * Serves static files from path.
 * @description Handles file resolution and response.
 */
export interface StaticHandler {
  /** Serves one static file for URL path. */
  serve(ctx: Core.Context, options: Types.ServeOptions, urlPath: string): Promise<Response>
}
