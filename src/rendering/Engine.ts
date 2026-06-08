import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Rendering from '@rendering/index.ts'
import * as EngineParts from '@rendering/engine/index.ts'

/**
 * Template rendering engine.
 * @description Compiles and renders DVE templates with cache.
 */
export class Engine implements Types.ViewEngine, Types.WatchableEngine {
  /** Default views directory */
  private readonly defaultViewsDir: string
  /** Max iterations per #each block */
  private readonly maxIterations: number
  /** Compiled template cache */
  private readonly compileCache = new Map<string, Types.CompileResult>()
  /** Discovered template path cache */
  private discoveredPaths: Set<string> | null = null
  /** Optional lifecycle event emitter */
  private readonly emit: Types.EventEmit | undefined

  /**
   * Create new engine instance.
   * @description Stores default viewsDir from options.
   * @param options - Engine configuration options
   */
  constructor(options: Types.EngineOptions) {
    this.defaultViewsDir = options.viewsDir
    this.maxIterations = options.maxIterations ?? Core.Constant.defaultMaxIterations
    this.emit = options.emit
  }

  /** Views directory for path resolution */
  get viewsDir(): string {
    return this.defaultViewsDir
  }

  /**
   * Invalidate cached template by absolute path.
   * @description Clears file and compile caches for the path.
   * @param absPath - Absolute template file path
   */
  invalidateFile(absPath: string): void {
    this.compileCache.delete(absPath)
  }

  /**
   * Emit view:refreshed for changed paths.
   * @description Called by watcher after invalidating changed paths.
   * @param paths - Absolute paths that were refreshed
   */
  notifyRefresh(paths: readonly string[]): void {
    this.emit?.({
      type: 'internal',
      kind: 'view:refreshed',
      metadata: { paths: [...paths] },
      timestamp: Date.now()
    })
  }

  /** Reset discovered template paths */
  refreshPaths(): void {
    this.discoveredPaths = null
  }

  /**
   * Render template with data.
   * @description Loads template and produces final HTML.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @param depth - Current include nesting depth
   * @returns Rendered HTML string
   * @throws {Deno.errors.NotFound} When template path not discovered
   * @throws {Deno.errors.InvalidData} When include depth exceeded
   */
  async render(templatePath: string, data: Types.DataRecord = {}, depth = 0): Promise<string> {
    if (depth > Core.Constant.maxIncludeDepth) {
      throw new Deno.errors.InvalidData(
        `Template include depth exceeded ${Core.Constant.maxIncludeDepth} for "${templatePath}"`
      )
    }
    const renderStart = depth === 0 ? performance.now() : 0
    const compiled = await this.resolveTemplate(templatePath)
    const outputHtml = await this.renderNodes(compiled.ast, data, this.defaultViewsDir, depth)
    if (depth === 0) {
      this.emit?.({
        type: 'internal',
        kind: 'view:rendered',
        metadata: { path: templatePath, durationMs: performance.now() - renderStart },
        timestamp: Date.now()
      })
    }
    return outputHtml
  }

  /**
   * Render template with streaming.
   * @description Resolves template up front, then streams compiled AST.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns Promise resolving to a ReadableStream with HTML content
   * @throws {Deno.errors.NotFound} When template not found
   * @throws {Deno.errors.InvalidData} When the template fails to compile
   */
  async streamRender(templatePath: string, data: Types.DataRecord = {}): Promise<ReadableStream> {
    const compiled = await this.resolveTemplate(templatePath)
    const { readable, writable } = new TransformStream()
    this.renderStream(compiled, templatePath, data, writable).catch((error: Error) => {
      this.emit?.({
        type: 'internal',
        kind: 'view:error',
        metadata: { path: templatePath, error },
        timestamp: Date.now()
      })
    })
    return readable
  }

  /**
   * Compile template and cache.
   * @description Parses template text into AST nodes.
   * @param absTemplatePath - Absolute path to template
   * @returns Compile result with AST
   */
  private async compileTemplate(absTemplatePath: string): Promise<Types.CompileResult> {
    const cachedCompile = this.compileCache.get(absTemplatePath)
    if (cachedCompile) {
      return cachedCompile
    }
    const compileStart = performance.now()
    const template = await Deno.readTextFile(absTemplatePath)
    const ast = EngineParts.Parser.parse(template)
    const compileResult = { ast }
    this.compileCache.set(absTemplatePath, compileResult)
    this.emit?.({
      type: 'internal',
      kind: 'view:compiled',
      metadata: { path: absTemplatePath, durationMs: performance.now() - compileStart },
      timestamp: Date.now()
    })
    return compileResult
  }

  /**
   * Render node to chunk.
   * @description Renders individual node to HTML chunk.
   * @param node - AST node to render
   * @param data - Template scope data
   * @param viewsDir - Root directory for includes
   * @param depth - Current include nesting depth
   * @returns HTML chunk string or null
   */
  private async renderChunk(
    node: Types.AstNode,
    data: Types.DataRecord,
    viewsDir: string,
    depth: number
  ): Promise<string | null> {
    if (node.type === 'text') {
      return node.value
    }
    if (node.type === 'var') {
      const lookupValue = EngineParts.Eval.evaluate(node.path, data)
      const stringValue = lookupValue === null || lookupValue === undefined
        ? ''
        : String(lookupValue)
      return node.raw ? stringValue : EngineParts.Utils.escape(stringValue)
    }
    if (node.type === 'include') {
      return await this.render(node.templatePath, data, depth + 1)
    }
    if (node.type === 'if') {
      const lookupValue = EngineParts.Eval.evaluate(node.path, data)
      const nodes = lookupValue ? node.thenNodes : node.elseNodes
      return await this.renderNodes(nodes, data, viewsDir, depth)
    }
    if (node.type === 'each') {
      const lookupValue = EngineParts.Eval.evaluate(node.path, data)
      if (!Array.isArray(lookupValue)) {
        return null
      }
      if (lookupValue.length > this.maxIterations) {
        throw new Deno.errors.InvalidData(
          `Template #each exceeded ${this.maxIterations} iterations (got ${lookupValue.length})`
        )
      }
      const length = lookupValue.length
      let outputHtml = ''
      for (let index = 0; index < length; index++) {
        const item = lookupValue[index]
        const scopeData: Types.DataRecord = {
          ...data,
          [node.itemName]: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === length - 1,
          '@length': length
        }
        outputHtml += await this.renderNodes(node.nodes, scopeData, viewsDir, depth)
      }
      return outputHtml
    }
    return null
  }

  /**
   * Render AST nodes to HTML.
   * @description Evaluates variables, includes, and blocks.
   * @param ast - Parsed template AST nodes
   * @param data - Current scope data
   * @param viewsDir - Root directory for includes
   * @param depth - Current include nesting depth
   * @returns Rendered HTML string
   */
  private async renderNodes(
    ast: readonly Types.AstNode[],
    data: Types.DataRecord,
    viewsDir: string,
    depth: number
  ): Promise<string> {
    let outputHtml = ''
    for (const node of ast) {
      const chunk = await this.renderChunk(node, data, viewsDir, depth)
      if (chunk) {
        outputHtml += chunk
      }
    }
    return outputHtml
  }

  /**
   * Render compiled template nodes to stream.
   * @description Streams HTML output progressively from an already-compiled AST.
   * @param compiled - Pre-resolved compiled template
   * @param templatePath - Relative template path for events
   * @param data - Template scope data
   * @param writable - Writable stream for output
   */
  private async renderStream(
    compiled: Types.CompileResult,
    templatePath: string,
    data: Types.DataRecord,
    writable: WritableStream
  ): Promise<void> {
    const writer = writable.getWriter()
    const renderStart = performance.now()
    try {
      for (const node of compiled.ast) {
        const chunk = await this.renderChunk(node, data, this.defaultViewsDir, 0)
        if (chunk) {
          await writer.write(Core.Constant.encoder.encode(chunk))
        }
      }
      this.emit?.({
        type: 'internal',
        kind: 'view:rendered',
        metadata: { path: templatePath, durationMs: performance.now() - renderStart },
        timestamp: Date.now()
      })
    } finally {
      await writer.close()
    }
  }

  /**
   * Resolve template path to compiled result.
   * @description Discovers paths, normalizes, validates, and compiles.
   * @param templatePath - Relative template path
   * @returns Compiled template with AST
   * @throws {Deno.errors.NotFound} When template not found
   */
  private async resolveTemplate(templatePath: string): Promise<Types.CompileResult> {
    if (this.discoveredPaths === null) {
      this.discoveredPaths = await Rendering.Discover.discoverPaths(this.defaultViewsDir)
    }
    const normalizedPath = templatePath.replace(/\\/g, '/')
    const pathWithExtension = normalizedPath.toLowerCase().endsWith(Core.Constant.dveExtension)
      ? normalizedPath
      : `${normalizedPath}${Core.Constant.dveExtension}`
    if (!this.discoveredPaths.has(pathWithExtension)) {
      throw new Deno.errors.NotFound(`Template "${templatePath}" not found in views directory`)
    }
    const absPath = EngineParts.Utils.join(this.defaultViewsDir, pathWithExtension)
    return await this.compileTemplate(absPath)
  }
}
