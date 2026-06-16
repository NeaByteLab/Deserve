import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Request source value extractor.
 * @description Reads validation input from request sources.
 */
export class Source {
  /** Extractor map per validation source */
  private static readonly extractors: Readonly<
    Record<Types.ValidationSource, Types.SourceExtractor>
  > = {
    body: (ctx) => ctx.body(),
    cookies: (ctx) => ctx.cookie(),
    headers: (ctx) => ctx.header(),
    json: (ctx) => ctx.json(),
    params: (ctx) => ctx.params(),
    query: (ctx) => ctx.query()
  }

  /**
   * Extract input value for source.
   * @description Reads request data for the given source.
   * @param source - Validation source name
   * @param ctx - Request context instance
   * @returns Extracted source value
   */
  static extract(source: Types.ValidationSource, ctx: Core.Context): Types.MaybeAsync<unknown> {
    return Source.extractors[source](ctx)
  }
}
