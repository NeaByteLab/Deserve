import type * as Types from '@interfaces/index.ts'
import * as Rendering from '@rendering/index.ts'
import * as EngineParts from '@rendering/engine/index.ts'

/**
 * Template rendering engine
 * @description Compiles and renders DVE templates with cache
 */
export class Engine implements Types.ViewEngine {
  /** Default views directory */
  private readonly defaultViewsDir: string
  /** Compiled template cache */
  private readonly compileCache = new Map<string, Types.CompileResult>()
  /** Raw file contents cache */
  private readonly fileCache = new Map<string, string>()
  /** Discovered template path cache */
  private discoveredPaths: Set<string> | null = null

  /**
   * Create new engine instance
   * @description Stores default viewsDir from options
   * @param options - Engine configuration options
   */
  constructor(options: Types.EngineOptions) {
    this.defaultViewsDir = options.viewsDir
  }

  /**
   * Render template with data
   * @description Loads template and produces final HTML
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns Rendered HTML string
   * @throws {Error} When template path not discovered
   */
  async render(templatePath: string, data: Record<string, unknown> = {}): Promise<string> {
    if (this.discoveredPaths === null) {
      this.discoveredPaths = await Rendering.Discover.discoverPaths(this.defaultViewsDir)
    }
    const discoveredTemplatePaths = this.discoveredPaths
    const normalizedPath = templatePath.replace(/\\/g, '/')
    const pathWithExt = normalizedPath.toLowerCase().endsWith('.dve')
      ? normalizedPath
      : `${normalizedPath}.dve`
    if (!discoveredTemplatePaths.has(pathWithExt)) {
      throw new Error(`Template not found: ${templatePath}.`)
    }
    const absPath = EngineParts.Utils.join(this.defaultViewsDir, pathWithExt)
    const compiled = await this.compileTemplate(absPath)
    return await this.renderNodes(compiled.ast, data, this.defaultViewsDir)
  }

  /**
   * Render template with streaming.
   * @description Streams HTML output as it renders.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns ReadableStream with HTML content
   * @throws {Error} When template not found
   */
  streamRender(templatePath: string, data: Record<string, unknown> = {}): ReadableStream {
    const { readable, writable } = new TransformStream()
    this.renderNodesToStream(templatePath, data, writable).catch((error: Error) => {
      console.error('Stream rendering error:', error)
    })
    return readable
  }

  /**
   * Compile template and cache
   * @description Parses template text into AST nodes
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
   * Load template text with cache
   * @description Loads file contents from disk once
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
   * Render AST nodes to HTML
   * @description Evaluates variables, includes, and blocks
   * @param ast - Parsed template AST nodes
   * @param data - Current scope data
   * @param viewsDir - Root directory for includes
   * @returns Rendered HTML string
   */
  private async renderNodes(
    ast: Types.AstNode[],
    data: Record<string, unknown>,
    viewsDir: string
  ): Promise<string> {
    let outputHtml = ''
    for (const node of ast) {
      if (node.type === 'text') {
        outputHtml += node.value
        continue
      }
      if (node.type === 'var') {
        const lookupValue = EngineParts.Eval.evaluate(node.path, data)
        const stringValue = lookupValue === null || lookupValue === undefined
          ? ''
          : String(lookupValue)
        outputHtml += node.raw ? stringValue : EngineParts.Utils.escape(stringValue)
        continue
      }
      if (node.type === 'include') {
        outputHtml += await this.render(node.templatePath, data)
        continue
      }
      if (node.type === 'if') {
        const lookupValue = EngineParts.Eval.evaluate(node.path, data)
        outputHtml += await this.renderNodes(
          lookupValue ? node.thenNodes : node.elseNodes,
          data,
          viewsDir
        )
        continue
      }
      if (node.type === 'each') {
        const lookupValue = EngineParts.Eval.evaluate(node.path, data)
        if (!Array.isArray(lookupValue)) {
          continue
        }
        const length = lookupValue.length
        for (let index = 0; index < length; index++) {
          const item = lookupValue[index]
          const scopeData: Record<string, unknown> = {
            ...data,
            [node.itemName]: item,
            '@index': index,
            '@first': index === 0,
            '@last': index === length - 1,
            '@length': length
          }
          outputHtml += await this.renderNodes(node.nodes, scopeData, viewsDir)
        }
        continue
      }
    }
    return outputHtml
  }

  /**
   * Render node to chunk
   * @description Renders individual node to HTML chunk
   * @param node - AST node to render
   * @param data - Template scope data
   * @param viewsDir - Root directory for includes
   * @returns HTML chunk string or null
   */
  private async renderNodeToChunk(
    node: Types.AstNode,
    data: Record<string, unknown>,
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
      return await this.renderNodesToString(nodes, data, viewsDir)
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
        const scopeData: Record<string, unknown> = {
          ...data,
          [node.itemName]: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === length - 1,
          '@length': length
        }
        output += await this.renderNodesToString(node.nodes, scopeData, viewsDir)
      }
      return output
    }
    return null
  }

  /**
   * Render nodes to string
   * @description Renders multiple nodes to HTML string
   * @param ast - Parsed template AST nodes
   * @param data - Current scope data
   * @param viewsDir - Root directory for includes
   * @returns Rendered HTML string
   */
  private async renderNodesToString(
    ast: Types.AstNode[],
    data: Record<string, unknown>,
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
   * Render template nodes to stream
   * @description Streams HTML output progressively
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @param writable - Writable stream for output
   */
  private async renderNodesToStream(
    templatePath: string,
    data: Record<string, unknown>,
    writable: WritableStream
  ): Promise<void> {
    const writer = writable.getWriter()
    const encoder = new TextEncoder()
    try {
      if (this.discoveredPaths === null) {
        this.discoveredPaths = await Rendering.Discover.discoverPaths(this.defaultViewsDir)
      }
      const discoveredTemplatePaths = this.discoveredPaths
      const normalizedPath = templatePath.replace(/\\/g, '/')
      const pathWithExt = normalizedPath.toLowerCase().endsWith('.dve')
        ? normalizedPath
        : `${normalizedPath}.dve`
      if (!discoveredTemplatePaths.has(pathWithExt)) {
        throw new Error(`Template not found: ${templatePath}.`)
      }
      const absPath = EngineParts.Utils.join(this.defaultViewsDir, pathWithExt)
      const compiled = await this.compileTemplate(absPath)
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
}
