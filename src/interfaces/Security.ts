/** Option key to header name map. */
export interface SecurityHeaderEntry {
  /** Key in SecurityHeadersOptions */
  readonly key: SecurityHeaderKey
  /** HTTP header name */
  readonly name: string
}

/** Security header option key union. */
export type SecurityHeaderKey =
  | 'contentSecurityPolicy'
  | 'crossOriginEmbedderPolicy'
  | 'crossOriginOpenerPolicy'
  | 'crossOriginResourcePolicy'
  | 'originAgentCluster'
  | 'referrerPolicy'
  | 'strictTransportSecurity'
  | 'xContentTypeOptions'
  | 'xDnsPrefetchControl'
  | 'xDownloadOptions'
  | 'xFrameOptions'
  | 'xPermittedCrossDomainPolicies'
  | 'xPoweredBy'

/** Header value: string or false to omit. */
export type SecurityHeaderValue = string | false

/** Security header partial options map. */
export type SecurityHeadersOptions = Partial<Record<SecurityHeaderKey, SecurityHeaderValue>>
