/**
 * Request class with automatic query parsing.
 * @description Extends Request with convenient methods.
 */
export class DeserveRequest extends Request {
  /** Route parameters extracted from URL pattern matching */
  private urlParams: Record<string, string>

  /**
   * Create a new DeserveRequest instance.
   * @param req - Native Request object
   * @param params - Route parameters from URL pattern matching
   */
  constructor(req: Request, params: Record<string, string>) {
    super(req)
    this.urlParams = params
  }

  /**
   * Get a single route parameter value.
   * @param key - Route parameter key
   * @returns Parameter value or empty string
   */
  param(key: string): string {
    return this.urlParams[key] || ''
  }

  /**
   * Get all route parameters as an object.
   * @returns Object with route parameter key-value pairs
   */
  params(): Record<string, string> {
    return this.urlParams
  }

  /**
   * Get all query parameters as an object.
   * @returns Object with query parameter key-value pairs
   */
  query(): Record<string, string> {
    const url = new URL(this.url)
    const result: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /**
   * Get multiple values for the same query parameter key.
   * @param key - Query parameter key
   * @returns Array of values for the key
   */
  queries(key: string): string[] {
    const url = new URL(this.url)
    return url.searchParams.getAll(key)
  }
}
