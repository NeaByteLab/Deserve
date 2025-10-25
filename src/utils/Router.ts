import type {
  RouterContext,
  RouterMatchedRoute,
  RouterNode,
  RouterParamsMap
} from '@utils/Types.ts'
import { getMatchParams, searchTree, splitPath } from '@utils/Shared.ts'

/**
 * High-performance router implementation with static route optimization.
 * @description Fast router with radix tree structure for efficient route matching.
 * @template T - Type of data associated with routes
 */
export class FastRouter<T = unknown> {
  /** Internal router context containing tree structure and static routes */
  private context: RouterContext<T>

  /**
   * Initialize FastRouter with empty context.
   */
  constructor() {
    this.context = {
      root: { key: '' },
      static: Object.create(null)
    }
  }

  /**
   * Add a route to the router with optional data and HTTP method.
   * @param path - Route path pattern (supports :param, *, ** wildcards)
   * @param data - Optional data to associate with the route
   * @param method - HTTP method (default: empty string for any method)
   */
  add(path: string, data?: T, method = ''): void {
    const compMethod = method.toUpperCase()
    if (!path.startsWith('/')) {
      path = `/${path}`
    }
    let node = this.context.root
    let unnamedParamIndex = 0
    const segments = splitPath(path)
    const paramsMap: RouterParamsMap = []
    const paramsRegexp: RegExp[] = []
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      if (!segment) {
        continue
      }
      if (segment.startsWith('**')) {
        if (!node.wildcard) {
          node.wildcard = { key: '**' }
        }
        node = node.wildcard
        const paramName = segment.split(':')[1] ?? '_'
        paramsMap.push([-i, paramName, segment.length === 2])
        break
      }
      if (segment === '*' || segment.includes(':')) {
        if (!node.param) {
          node.param = { key: '*' }
        }
        node = node.param
        if (segment === '*') {
          paramsMap.push([i, `_${unnamedParamIndex++}`, true])
        } else {
          const regexMatch = segment.match(/^:(\w+)\((.+)\)$/)
          if (regexMatch) {
            const paramName = regexMatch[1]
            const regexPattern = regexMatch[2]
            const regex = new RegExp(`^(?<${paramName}>${regexPattern})$`)
            paramsRegexp[i] = regex
            node.hasRegexParam = true
            paramsMap.push([i, regex, false])
          } else {
            paramsMap.push([i, segment.slice(1), false])
          }
        }
        continue
      }
      const child = node.static?.[segment]
      if (child) {
        node = child
      } else {
        const staticNode: RouterNode<T> = { key: segment }
        if (!node.static) {
          node.static = Object.create(null)
        }
        if (node.static) {
          node.static[segment] = staticNode
        }
        node = staticNode
      }
    }
    const hasParams = paramsMap.length > 0
    if (!node.methods) {
      node.methods = Object.create(null)
    }
    if (node.methods) {
      if (!node.methods[compMethod]) {
        node.methods[compMethod] = []
      }
      const methodArray = node.methods[compMethod]
      if (methodArray) {
        methodArray.push({
          data: data ?? (null as T),
          paramsRegexp,
          paramsMap: hasParams ? paramsMap : undefined
        })
      }
    }
    if (!hasParams) {
      this.context.static[path] = node
    }
  }

  /**
   * Find matching route for given path and HTTP method.
   * @param path - Path to search for
   * @param opts - Search options
   * @param opts.params - Whether to extract parameters (default: true)
   * @param method - HTTP method to match (default: empty string for any method)
   * @returns Matched route data with parameters or undefined if not found
   */
  find(path: string, opts?: { params?: boolean }, method = ''): RouterMatchedRoute<T> | undefined {
    const compMethod = method.toUpperCase()
    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1)
    }
    if (!path || path === '') {
      path = '/'
    }
    const segments = splitPath(path)
    const staticNode = this.context.static[path]
    if (staticNode?.methods) {
      const staticMatch = staticNode.methods[compMethod] || staticNode.methods['']
      if (staticMatch?.[0]) {
        return {
          data: staticMatch[0].data,
          params: staticMatch[0].paramsMap
            ? getMatchParams(segments, staticMatch[0].paramsMap)
            : undefined
        }
      }
    }
    const match = searchTree(this.context.root, method, segments, 0)?.[0]
    if (!match) {
      return undefined
    }
    if (opts?.params === false) {
      return {
        data: match.data,
        params: undefined
      }
    }
    return {
      data: match.data,
      params: match.paramsMap ? getMatchParams(segments, match.paramsMap) : undefined
    }
  }
}
