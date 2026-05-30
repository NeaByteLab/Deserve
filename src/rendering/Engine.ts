import type * as Types from '@interfaces/index.ts'
import * as Rendering from '@rendering/index.ts'
import * as EngineParts from '@rendering/engine/index.ts'

/**
 * Template rendering engine.
 * @description Compiles and renders DVE templates with cache.
 */
export class Engine implements Types.ViewEngine, Types.WatchableEngine {
  /** Default views directory */
  private readonly defaultViewsDir: string
  /** Compiled template cache */
  private readonly compileCache = new Map<string, Types.CompileResult>()
  /** Raw file contents cache */
  private readonly fileCache = new Map<string, string>()
  /** Discovered template path cache */
  private discoveredPaths: Set<string> | null = null

  /**
   * Create new engine instance.
   * @description Stores default viewsDir from options.
   * @param options - Engine configuration options
   */
  constructor(options: Types.EngineOptions) {
    this.defaultViewsDir = options.viewsDir
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
    this.fileCache.delete(absPath)
    this.compileCache.delete(absPath)
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
   * @returns Rendered HTML string
   * @throws {Deno.errors.NotFound} When template path not discovered
   */
  async render(templatePath: string, data: Types.DataRecord = {}): Promise<string> {
    const compiled = await this.resolveTemplate(templatePath)
    return await this.renderNodes(compiled.ast, data, this.defaultViewsDir)
  }

  /**
   * Render template with streaming.
   * @description Streams HTML output as it renders.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns ReadableStream with HTML content
   * @throws {Deno.errors.NotFound} When template not found
   */
  streamRender(templatePath: string, data: Types.DataRecord = {}): ReadableStream {
    const { readable, writable } = new TransformStream()
    this.renderNodesToStream(templatePath, data, writable).catch((error: Error) => {
      console.error('Stream rendering error:', error)
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
    const template = await this.loadTemplate(absTemplatePath)
    const ast = EngineParts.Parser.parse(template)
    const compileResult = { ast }
    this.compileCache.set(absTemplatePath, compileResult)
    return compileResult
  }

  /**
   * Load template text with cache.
   * @description Loads file contents from disk once.
   * @param absPath - Absolute template file path
   * @returns Template file contents
   */
  private async loadTemplate(absPath: string): Promise<string> {
    const cachedTemplateText = this.fileCache.get(absPath)
    if (cachedTemplateText !== undefined) {
      return cachedTemplateText
    }
    const templateText = await Deno.readTextFile(absPath)
    this.fileCache.set(absPath, templateText)
    return templateText
  }

  /**
   * Render node to chunk.
   * @description Renders individual node to HTML chunk.
   * @param node - AST node to render
   * @param data - Template scope data
   * @param viewsDir - Root directory for includes
   * @returns HTML chunk string or null
   */
  private async renderNodeToChunk(
    node: Types.AstNode,
    data: Types.DataRecord,
    viewsDir: string
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
      return await this.render(node.templatePath, data)
    }
    if (node.type === 'if') {
      const lookupValue = EngineParts.Eval.evaluate(node.path, data)
      const nodes = lookupValue ? node.thenNodes : node.elseNodes
      return await this.renderNodes(nodes, data, viewsDir)
    }
    if (node.type === 'each') {
      const lookupValue = EngineParts.Eval.evaluate(node.path, data)
      if (!Array.isArray(lookupValue)) {
        return null
      }
      const length = lookupValue.length
      let output = ''
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
        output += await this.renderNodes(node.nodes, scopeData, viewsDir)
      }
      return output
    }
    return null
  }

  /**
   * Render AST nodes to HTML.
   * @description Evaluates variables, includes, and blocks.
   * @param ast - Parsed template AST nodes
   * @param data - Current scope data
   * @param viewsDir - Root directory for includes
   * @returns Rendered HTML string
   */
  private async renderNodes(
    ast: readonly Types.AstNode[],
    data: Types.DataRecord,
    viewsDir: string
  ): Promise<string> {
    let outputHtml = ''
    for (const node of ast) {
      const chunk = await this.renderNodeToChunk(node, data, viewsDir)
      if (chunk) {
        outputHtml += chunk
      }
    }
    return outputHtml
  }

  /**
   * Render template nodes to stream.
   * @description Streams HTML output progressively.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @param writable - Writable stream for output
   */
  private async renderNodesToStream(
    templatePath: string,
    data: Types.DataRecord,
    writable: WritableStream
  ): Promise<void> {
    const writer = writable.getWriter()
    const encoder = new TextEncoder()
    try {
      const compiled = await this.resolveTemplate(templatePath)
      for (const node of compiled.ast) {
        const chunk = await this.renderNodeToChunk(node, data, this.defaultViewsDir)
        if (chunk) {
          await writer.write(encoder.encode(chunk))
        }
      }
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
    const pathWithExt = normalizedPath.toLowerCase().endsWith('.dve')
      ? normalizedPath
      : `${normalizedPath}.dve`
    if (!this.discoveredPaths.has(pathWithExt)) {
      throw new Deno.errors.NotFound(`Template "${templatePath}" not found in views directory`)
    }
    const absPath = EngineParts.Utils.join(this.defaultViewsDir, pathWithExt)
    return await this.compileTemplate(absPath)
  }
}
