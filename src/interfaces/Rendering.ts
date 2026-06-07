import type { DataRecord, EventEmit, TagCarrier, TaggedVariant } from '@interfaces/index.ts'

/** Compiled DVE template result. */
export interface CompileResult {
  /** Parsed AST node array */
  readonly ast: readonly AstNode[]
}

/** DVE template parser stack frame. */
export interface DveStackFrame {
  /** True when inside else branch */
  inElse: boolean
  /** Block node type discriminant */
  readonly kind: AstBlockKind
  /** Parent block AST node */
  readonly node: AstBlockNode
}

/** Rendering engine constructor options. */
export interface EngineOptions {
  /** Optional lifecycle event emitter */
  readonly emit?: EventEmit
  /** Maximum loop iterations allowed */
  readonly maxIterations?: number
  /** Directory path for template views */
  readonly viewsDir: string
}

/**
 * View engine for templates.
 * @description Renders templates to string or readable stream.
 */
export interface ViewEngine {
  /**
   * Render template to string.
   * @param templatePath - Path to template file
   * @param data - Template data record
   * @returns Promise resolving to rendered HTML
   */
  render(...args: TemplateArgs): Promise<string>
  /**
   * Render template to readable stream.
   * @param templatePath - Path to template file
   * @param data - Template data record
   * @returns ReadableStream of rendered output
   */
  streamRender(...args: TemplateArgs): ReadableStream
}

/**
 * Watchable engine for cache invalidation.
 * @description Supports file watching and cache refresh.
 */
export interface WatchableEngine extends Pick<EngineOptions, 'viewsDir'> {
  /**
   * Invalidate cached template file.
   * @param absPath - Absolute path to invalidate
   */
  invalidateFile(absPath: string): void
  /**
   * Emit view:refreshed for changed paths.
   * @param paths - Absolute paths that were refreshed
   */
  notifyRefresh(paths: readonly string[]): void
  /** Refresh all template paths */
  refreshPaths(): void
}

/** Arithmetic sign for expressions. */
export type ArithmeticSign = '+' | '-'

/** Block-level AST node type discriminants. */
export type AstBlockKind = AstBlockNode['type']

/** Block-level AST node with children. */
export type AstBlockNode = Extract<AstNode, { type: 'each' } | { type: 'if' }>

/** DVE template AST node union. */
export type AstNode =
  | (TaggedVariant<'type', 'each', { path: string; itemName: string }> & { nodes: AstNode[] })
  | (TaggedVariant<'type', 'if', { path: string }> & { thenNodes: AstNode[]; elseNodes: AstNode[] })
  | TaggedVariant<'type', 'include', { templatePath: string }>
  | TaggedVariant<'type', 'text', { value: string }>
  | TaggedVariant<'type', 'var', { path: string; raw: boolean }>

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

/** DVE expression AST node union. */
export type ExprNode =
  | TaggedVariant<'type', 'binary', { op: BinaryOp; left: ExprNode; right: ExprNode }>
  | TaggedVariant<'type', 'ident', { name: string }>
  | TaggedVariant<'type', 'literal', { value: string | number }>
  | TaggedVariant<'type', 'member', { object: ExprNode; property: string }>
  | TaggedVariant<'type', 'ternary', { test: ExprNode; consequent: ExprNode; alternate: ExprNode }>
  | TaggedVariant<'type', 'unary', { op: UnaryOp; arg: ExprNode }>

/** Expression node type discriminant values. */
export type ExprNodeType = ExprNode['type']

/** Node shape exposing op discriminant. */
export type ExprOpCarrier = TagCarrier<'op'>

/** DVE expression evaluator token. */
export type ExprToken =
  | TaggedVariant<'kind', 'ident', { value: string }>
  | TaggedVariant<'kind', 'number', { value: number }>
  | TaggedVariant<'kind', 'op', { value: TokenOp }>
  | TaggedVariant<'kind', 'string', { value: string }>

/** Expression token kind discriminant values. */
export type ExprTokenKind = ExprToken['kind']

/** Node shape exposing type discriminant. */
export type ExprTypeCarrier = TagCarrier<'type'>

/** Structural operators in expression tokens. */
export type StructuralOp = '(' | ')' | '.' | ':' | '?' | '?.'

/** Template method parameter tuple. */
export type TemplateArgs = [templatePath: string, data?: DataRecord]

/** All operator literals in tokens. */
export type TokenOp = BinaryOp | StructuralOp | UnaryOp

/** Unary operator literals. */
export type UnaryOp = '!' | ArithmeticSign
