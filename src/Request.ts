/**
 * Enhanced request wrapper with route parameter capabilities.
 * @description Extends Request with methods for route parameters and query strings.
 */
export class DeserveRequest {
  /** Internal request session */
  private reqSession: Request
  /** Route parameters extracted from URL */
  private reqSessionParams: Record<string, string>

  /**
   * Initialize DeserveRequest with Request and parameters.
   * @param req - Native HTTP request object
   * @param params - Route parameters extracted from URL pattern
   */
  constructor(req: Request, params: Record<string, string>) {
    this.reqSession = req
    this.reqSessionParams = params
  }

  /**
   * Get request body as ArrayBuffer.
   * @returns Promise resolving to ArrayBuffer
   */
  async arrayBuffer(): Promise<ArrayBuffer> {
    return await this.reqSession.arrayBuffer()
  }

  /**
   * Get request body as binary data.
   * @returns Promise resolving to Blob
   */
  async blob(): Promise<Blob> {
    return await this.reqSession.blob()
  }

  /**
   * Parse request body as form data.
   * @returns Promise resolving to FormData
   */
  async formData(): Promise<FormData> {
    return await this.reqSession.formData()
  }

  /**
   * Parse request body as JSON.
   * @returns Promise resolving to parsed JSON object
   */
  async json(): Promise<unknown> {
    return await this.reqSession.json()
  }

  /**
   * Get a single route parameter by key.
   * @param key - Parameter key to retrieve
   * @returns Parameter value or empty string if not found
   */
  param(key: string): string {
    return this.reqSessionParams[key] || ''
  }

  /**
   * Get all route parameters.
   * @returns Object containing all route parameters
   */
  params(): Record<string, string> {
    return this.reqSessionParams
  }

  /**
   * Get all query parameters as key-value pairs.
   * @returns Object containing all query parameters
   */
  query(): Record<string, string> {
    const url = new URL(this.reqSession.url)
    const result: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /**
   * Get all values for a specific query parameter key.
   * @param key - Query parameter key
   * @returns Array of all values for the key
   */
  queries(key: string): string[] {
    const url = new URL(this.reqSession.url)
    return url.searchParams.getAll(key)
  }

  /**
   * Get request body as raw text.
   * @returns Promise resolving to text string
   */
  async text(): Promise<string> {
    return await this.reqSession.text()
  }

  /**
   * Get the request body as a readable stream.
   * @returns Request body stream or null if no body
   */
  get body(): ReadableStream<Uint8Array> | null {
    return this.reqSession.body
  }

  /**
   * Check if the request body has been consumed.
   * @returns True if body has been read
   */
  get bodyUsed(): boolean {
    return this.reqSession.bodyUsed
  }

  /**
   * Get the request cache mode.
   * @returns Cache mode setting
   */
  get cache(): RequestCache {
    return this.reqSession.cache
  }

  /**
   * Get the request credentials mode.
   * @returns Credentials mode setting
   */
  get credentials(): RequestCredentials {
    return this.reqSession.credentials
  }

  /**
   * Get the request destination.
   * @returns Request destination type
   */
  get destination(): RequestDestination {
    return this.reqSession.destination
  }

  /**
   * Get the request headers.
   * @returns Headers object
   */
  get headers(): Headers {
    return this.reqSession.headers
  }

  /**
   * Get the request integrity hash.
   * @returns Integrity hash string
   */
  get integrity(): string {
    return this.reqSession.integrity
  }

  /**
   * Check if the request should keep the connection alive.
   * @returns True if keepalive is enabled
   */
  get keepalive(): boolean {
    return this.reqSession.keepalive
  }

  /**
   * Get the HTTP method.
   * @returns HTTP method string
   */
  get method(): string {
    return this.reqSession.method
  }

  /**
   * Get the request mode.
   * @returns Request mode setting
   */
  get mode(): RequestMode {
    return this.reqSession.mode
  }

  /**
   * Get the redirect handling mode.
   * @returns Redirect mode setting
   */
  get redirect(): RequestRedirect {
    return this.reqSession.redirect
  }

  /**
   * Get the referrer URL.
   * @returns Referrer URL string
   */
  get referrer(): string {
    return this.reqSession.referrer
  }

  /**
   * Get the referrer policy.
   * @returns Referrer policy setting
   */
  get referrerPolicy(): ReferrerPolicy {
    return this.reqSession.referrerPolicy
  }

  /**
   * Get the underlying native Request object.
   * @returns Native Request object
   */
  get request(): Request {
    return this.reqSession
  }

  /**
   * Get the abort signal.
   * @returns Abort signal for request cancellation
   */
  get signal(): AbortSignal {
    return this.reqSession.signal
  }

  /**
   * Get the request URL.
   * @returns Complete request URL string
   */
  get url(): string {
    return this.reqSession.url
  }
}
