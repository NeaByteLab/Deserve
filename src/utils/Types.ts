/**
 * Router context containing the tree structure and static route cache.
 * @template T - Type of data associated with routes
 */
export interface RouterContext<T = unknown> {
  /** Root node of the router tree */
  root: RouterNode<T>
  /** Static route cache for fast lookups */
  static: Record<string, RouterNode<T> | undefined>
}

/**
 * Result of a successful route match.
 * @template T - Type of data associated with the matched route
 */
export interface RouterMatchedRoute<T = unknown> {
  /** Data associated with the matched route */
  data: T
  /** Extracted route parameters */
  params: Record<string, string> | undefined
}

/**
 * Method-specific data stored in router nodes.
 * @template T - Type of data associated with routes
 */
export interface RouterMethodData<T = unknown> {
  /** Data associated with the route */
  data: T
  /** Parameter mapping for route segments */
  paramsMap: RouterParamsMap | undefined
  /** Regular expressions for parameter validation */
  paramsRegexp: RegExp[]
}

/**
 * Node in the router tree structure.
 * @template T - Type of data associated with routes
 */
export interface RouterNode<T = unknown> {
  /** Node key/segment value */
  key: string
  /** Static child nodes */
  static?: Record<string, RouterNode<T>>
  /** Parameter child node */
  param?: RouterNode<T>
  /** Wildcard child node */
  wildcard?: RouterNode<T>
  /** Whether this node has regex parameter validation */
  hasRegexParam?: boolean
  /** HTTP method handlers */
  methods?: Record<string, RouterMethodData<T>[] | undefined>
}

/**
 * Parameter mapping array for route segments.
 * Each tuple contains [index, name/regex, optional]
 */
export type RouterParamsMap = Array<[Index: number, name: string | RegExp, optional: boolean]>
