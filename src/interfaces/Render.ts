import type { DataRecord } from '@interfaces/Utility.ts'

/** Compiled DVE template result. */
export interface CompileResult {
  /** Parsed AST node array */
  readonly ast: readonly AstNode[]
}

/** DVE template parser stack frame. */
export interface DveStackFrame {
  /** True when inside else branch */
  inElse: boolean
  /** Block type derived from AstNode */
  readonly kind: AstBlockKind
  /** Current block AST node reference */
  readonly node: AstBlockNode
}

/** Rendering engine constructor options. */
export interface EngineOptions {
  /** Root directory for DVE templates */
  readonly viewsDir: string
}

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
  render(templatePath: string, data?: DataRecord): Promise<string>

  /**
   * Stream template to HTML.
   * @description Streams DVE template with scope data.
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns HTML readable stream
   */
  streamRender(templatePath: string, data?: DataRecord): ReadableStream
}

/**
 * Watchable engine for cache invalidation.
 * @description Exposes cache control methods for file watcher.
 */
export interface WatchableEngine {
  /** Root views directory path */
  readonly viewsDir: string
  /**
   * Invalidate cached template.
   * @description Removes compiled template from cache.
   * @param absPath - Absolute template file path
   */
  invalidateFile(absPath: string): void
  /** Reset discovered template paths */
  refreshPaths(): void
}

/** Arithmetic sign for expressions. */
export type ArithmeticSign = '+' | '-'

/** Block-level AST node type discriminants. */
export type AstBlockKind = AstBlockNode['type']

/** Block-level AST node with children. */
export type AstBlockNode = Extract<AstNode, { type: 'each' } | { type: 'if' }>

/** DVE template AST node. */
export type AstNode =
  | { readonly type: 'each'; readonly path: string; readonly itemName: string; nodes: AstNode[] }
  | {
    readonly type: 'if'
    readonly path: string
    thenNodes: AstNode[]
    elseNodes: AstNode[]
  }
  | { readonly type: 'include'; readonly templatePath: string }
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'var'; readonly path: string; readonly raw: boolean }

/** AST node type discriminant values. */
export type AstNodeType = AstNode['type']

/** Binary operator literals. */
export type BinaryOp =
  | '!='
  | '!=='
  | '%'
  | '&&'
  | '*'
  | '/'
  | '<'
  | '<='
  | '=='
  | '==='
  | '>'
  | '>='
  | '??'
  | '||'
  | ArithmeticSign

/** DVE expression AST node. */
export type ExprNode =
  | {
    readonly type: 'binary'
    readonly op: BinaryOp
    readonly left: ExprNode
    readonly right: ExprNode
  }
  | { readonly type: 'ident'; readonly name: string }
  | { readonly type: 'literal'; readonly value: string | number }
  | { readonly type: 'member'; readonly object: ExprNode; readonly property: string }
  | {
    readonly type: 'ternary'
    readonly test: ExprNode
    readonly consequent: ExprNode
    readonly alternate: ExprNode
  }
  | { readonly type: 'unary'; readonly op: UnaryOp; readonly arg: ExprNode }

/** Expression node type discriminant values. */
export type ExprNodeType = ExprNode['type']

/** DVE expression evaluator token. */
export type ExprToken =
  | { readonly kind: 'ident'; readonly value: string }
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'op'; readonly value: TokenOp }
  | { readonly kind: 'string'; readonly value: string }

/** Expression token kind discriminant values. */
export type ExprTokenKind = ExprToken['kind']

/** Structural operators in expression tokens. */
export type StructuralOp = '(' | ')' | '.' | ':' | '?' | '?.'

/** All operator literals in expression tokens. */
export type TokenOp = BinaryOp | StructuralOp | UnaryOp

/** Unary operator literals. */
export type UnaryOp = '!' | ArithmeticSign
