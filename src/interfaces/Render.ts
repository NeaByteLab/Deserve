/**
 * View engine for templates.
 * @description Renders DVE templates to HTML strings.
 */
export interface ViewEngine {
  /**
   * Render template to HTML.
   * @description Renders DVE template with scope data.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns Rendered HTML string
   */
  render(templatePath: string, data?: TemplateData): Promise<string>

  /**
   * Stream template to HTML.
   * @description Streams DVE template with scope data.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns HTML readable stream
   */
  streamRender(templatePath: string, data?: TemplateData): ReadableStream
}

/** Block-level AST node types. */
export type AstBlockKind = Extract<AstNode, { nodes: AstNode[] } | { thenNodes: AstNode[] }>['type']

/** DVE template AST node. */
export type AstNode =
  | { type: 'each'; path: string; itemName: string; nodes: AstNode[] }
  | { type: 'if'; path: string; thenNodes: AstNode[]; elseNodes: AstNode[] }
  | { type: 'include'; templatePath: string }
  | { type: 'text'; value: string }
  | { type: 'var'; path: string; raw: boolean }

/** Compiled DVE template result. */
export type CompileResult = {
  /** Parsed AST node array */
  ast: AstNode[]
}

/** DVE template parser stack frame. */
export type DveStackFrame = {
  /** True when inside else branch */
  inElse: boolean
  /** Block type derived from AstNode */
  kind: AstBlockKind
  /** Current AST node reference */
  node: AstNode
}

/** Rendering engine constructor options. */
export type EngineOptions = {
  /** Root directory for DVE templates */
  viewsDir: string
}

/** DVE expression AST node. */
export type ExprNode =
  | { type: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { type: 'ident'; name: string }
  | { type: 'literal'; value: unknown }
  | { type: 'member'; object: ExprNode; property: string }
  | { type: 'ternary'; test: ExprNode; consequent: ExprNode; alternate: ExprNode }
  | { type: 'unary'; op: UnaryOp; arg: ExprNode }

/** DVE expression evaluator token. */
export type ExprToken =
  | { kind: 'ident'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'op'; value: string }
  | { kind: 'string'; value: string }

/** Template scope data for rendering. */
export type TemplateData = Record<string, unknown>

/** Unary operator literals. */
type UnaryOp = '!' | '+' | '-'
