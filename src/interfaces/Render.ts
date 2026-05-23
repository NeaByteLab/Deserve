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
  render(templatePath: string, data?: Record<string, unknown>): Promise<string>

  /**
   * Stream template to HTML.
   * @description Streams DVE template with scope data.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns HTML readable stream
   */
  streamRender(templatePath: string, data?: Record<string, unknown>): ReadableStream
}

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
  /** Block type: if or each */
  kind: 'if' | 'each'
  /** Current AST node reference */
  node: AstNode
  /** True when inside else branch */
  inElse: boolean
}

/** Rendering engine constructor options. */
export type EngineOptions = {
  /** Root directory for DVE templates */
  viewsDir: string
}

/** DVE expression AST node. */
export type ExprNode =
  | { type: 'literal'; value: unknown }
  | { type: 'ident'; name: string }
  | { type: 'member'; object: ExprNode; property: string }
  | { type: 'unary'; op: '!' | '+' | '-'; arg: ExprNode }
  | { type: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { type: 'ternary'; test: ExprNode; consequent: ExprNode; alternate: ExprNode }

/** DVE expression evaluator token. */
export type ExprToken =
  | { kind: 'op'; value: string }
  | { kind: 'ident'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
