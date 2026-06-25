import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import DVE from '@neabyte/dve'

/**
 * Template view rendering engine.
 * @description Compiles, caches, and renders DVE templates.
 */
export class Rendering {
  /** Underlying DVE engine instance */
  readonly #dve: DVE
  /** Base directory for template files */
  readonly #directory: string
  /** Compiled template cache by path */
  readonly #cache = new Map<string, Types.CompileResult>()
  /** Optional event emitter for render events */
  readonly #emit: Types.EventFn | null

  /**
   * Construct rendering engine instance.
   * @description Configures directory, limits, and event emitter.
   * @param options - Rendering configuration options
   * @param emit - Optional event emitter callback
   */
  constructor(options: Types.RenderingOptions, emit: Types.EventFn | null = null) {
    this.#directory = options.directory ?? './views'
    this.#emit = emit
    this.#dve = new DVE({
      resolveInclude: (path) => Deno.readTextFileSync(this.#resolvePath(path)),
      ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations }),
      ...(options.maxRenderIterations !== undefined && {
        maxRenderIterations: options.maxRenderIterations
      }),
      ...(options.maxOutputSize !== undefined && { maxOutputSize: options.maxOutputSize }),
      ...(options.maxTemplateSize !== undefined && { maxTemplateSize: options.maxTemplateSize })
    })
  }

  /** Base directory for template files */
  get directory(): string {
    return this.#directory
  }

  /**
   * Invalidate cached compiled template.
   * @description Removes cache entry and emits refresh event.
   * @param template - Template name to invalidate
   */
  invalidate(template: string): void {
    this.#cache.delete(this.#resolvePath(template))
    if (this.#emit !== null) {
      this.#emit(Core.Observability.internalEvent('view:invalidated', { paths: [template] }))
    }
  }

  /**
   * Render template into response.
   * @description Compiles template then streams or renders output.
   * @param template - Template name to render
   * @param data - View data for template
   * @param options - Render options like status
   * @returns Promise resolving to rendered response
   * @throws When template compile or render fails
   */
  async render(
    template: string,
    data: Types.ViewData,
    options: Types.RenderInit
  ): Promise<Response> {
    const start = this.#emit !== null ? performance.now() : 0
    try {
      const compiled = await this.#compile(template)
      const headers = { 'Content-Type': 'text/html; charset=utf-8' }
      const status = options.status ?? 200
      const body = options.stream === true
        ? this.#dve.renderStream(compiled, data, template)
        : this.#dve.render(compiled, data, template)
      if (this.#emit !== null) {
        this.#emit(
          Core.Observability.internalEvent('view:rendered', {
            path: template,
            durationMs: performance.now() - start
          })
        )
      }
      return new Core.API.Response(body, { status, headers })
    } catch (renderError) {
      if (this.#emit !== null) {
        this.#emit(
          Core.Observability.internalEvent('view:failed', {
            path: template,
            error: renderError instanceof Error ? renderError : new Error(String(renderError))
          })
        )
      }
      throw renderError
    }
  }

  /**
   * Compile template with caching.
   * @description Reads, compiles, and caches template once.
   * @param template - Template name to compile
   * @returns Promise resolving to compiled result
   */
  async #compile(template: string): Promise<Types.CompileResult> {
    const path = this.#resolvePath(template)
    const cached = this.#cache.get(path)
    if (cached !== undefined) {
      return cached
    }
    const start = this.#emit !== null ? performance.now() : 0
    const compiled = this.#dve.compile(await Deno.readTextFile(path), template)
    this.#cache.set(path, compiled)
    if (this.#emit !== null) {
      this.#emit(
        Core.Observability.internalEvent('view:compiled', {
          path: template,
          durationMs: performance.now() - start
        })
      )
    }
    return compiled
  }

  /**
   * Resolve template into file path.
   * @description Normalizes path and appends DVE extension.
   * @param template - Template name to resolve
   * @returns Absolute template file path
   */
  #resolvePath(template: string): string {
    const normalized = template.replace(/\\/g, '/').replace(/^\/+/, '')
    const withExtension = normalized.toLowerCase().endsWith(Core.Constant.dveExtension)
      ? normalized
      : `${normalized}${Core.Constant.dveExtension}`
    return `${this.#directory.replace(/\/+$/, '')}/${withExtension}`
  }
}
