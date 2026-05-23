import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Serves static files from path.
 * @description Handles file resolution and response.
 */
export interface StaticHandler {
  /**
   * Serve one static file request.
   * @description Resolves file and builds response.
   * @param ctx - Request context
   * @param options - Static serving options
   * @param urlPath - URL path prefix
   * @returns Promise resolving to file response
   */
  serve(ctx: Core.Context, options: Types.ServeOptions, urlPath: string): Promise<Response>
}

/** Static route handler descriptor. */
export type StaticFileHandler = {
  /** Executes static serve for the request */
  execute: (ctx: Core.Context) => Promise<Response>
  /** Marks this as a static route */
  staticRoute: true
  /** URL path prefix for static files */
  urlPath: string
}
