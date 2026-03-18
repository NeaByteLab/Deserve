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
   * @param options - Render options override values
   * @returns Rendered HTML string
   * @throws {Error} When template path not discovered
   */
  async render(
    templatePath: string,
    data: Record<string, unknown> = {},
    options?: Types.EngineRenderOptions
  ): Promise<string> {
    const viewsDir = options?.viewsDir ?? this.defaultViewsDir
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
    const absPath = EngineParts.Utils.join(viewsDir, pathWithExt)
    const compiled = await this.compileTemplate(absPath)
    return await this.renderNodes(compiled.ast, data, viewsDir)
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
   * Read template text with cache
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
        outputHtml += await this.render(node.templatePath, data, { viewsDir })
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
}
