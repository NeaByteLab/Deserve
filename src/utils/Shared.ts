import type { RouterMethodData, RouterNode, RouterParamsMap } from '@utils/Types.ts'

/**
 * Extract route parameters from path segments using parameter mapping.
 * @param segments - Path segments to extract parameters from
 * @param paramsMap - Parameter mapping configuration
 * @returns Object containing extracted parameters
 */
export function getMatchParams(
  segments: string[],
  paramsMap: RouterParamsMap
): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [index, name] of paramsMap) {
    let segment: string
    if (index < 0) {
      segment = segments.slice(-index).join('/')
    } else {
      segment = segments[index] ?? ''
    }
    if (typeof name === 'string') {
      params[name] = segment
    } else {
      const match = segment.match(name)
      if (match?.groups) {
        for (const key in match.groups) {
          if (Object.prototype.hasOwnProperty.call(match.groups, key)) {
            const value = match.groups[key]
            if (value !== undefined) {
              params[key] = value
            }
          }
        }
      }
    }
  }
  return params
}

/**
 * Recursively search router tree for matching route.
 * @param node - Current router node to search from
 * @param method - HTTP method to match
 * @param segments - Path segments to match
 * @param index - Current segment index
 * @returns Array of matching route data or undefined if no match
 */
export function searchTree<T>(
  node: RouterNode<T>,
  method: string,
  segments: string[],
  index: number
): Array<RouterMethodData<T>> | undefined {
  if (index === segments.length) {
    if (node.methods) {
      const match = node.methods[method] || node.methods['']
      if (match) {
        return match
      }
    }
    if (node.param?.methods) {
      const match = node.param.methods[method] || node.param.methods['']
      if (match?.[0]?.paramsMap?.[match[0].paramsMap.length - 1]?.[2]) {
        return match
      }
    }
    if (node.wildcard?.methods) {
      const match = node.wildcard.methods[method] || node.wildcard.methods['']
      if (match?.[0]?.paramsMap?.[match[0].paramsMap.length - 1]?.[2]) {
        return match
      }
    }
    return undefined
  }
  const segment = segments[index]
  if (!segment) {
    return undefined
  }
  if (node.static) {
    const staticChild = node.static[segment]
    if (staticChild) {
      const match = searchTree(staticChild, method, segments, index + 1)
      if (match) {
        return match
      }
    }
  }
  if (node.param) {
    const match = searchTree(node.param, method, segments, index + 1)
    if (match) {
      if (node.param.hasRegexParam) {
        const exactMatch = match.find((m) => m.paramsRegexp[index]?.test(segment))
        return exactMatch ? [exactMatch] : undefined
      }
      return match
    }
  }
  if (node.wildcard?.methods) {
    return node.wildcard.methods[method] || node.wildcard.methods['']
  }
  return undefined
}

/**
 * Split path into segments, removing empty segments.
 * @param path - Path string to split
 * @returns Array of non-empty path segments
 */
export function splitPath(path: string): string[] {
  const segments = path.split('/')
  return segments.filter((segment) => segment !== '')
}
