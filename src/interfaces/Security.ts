/** Option key to header name map. */
export interface SecurityHeaderEntry {
  /** Key in SecurityHeadersOptions */
  key: SecurityHeaderKey
  /** HTTP header name */
  name: string
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

/** Security header partial options map. */
export type SecurityHeadersOptions = Partial<Record<SecurityHeaderKey, SecurityHeaderValue>>

/** Header value: string or false. */
type SecurityHeaderValue = string | false
