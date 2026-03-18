/** Maps option key to header name. */
export interface SecurityHeaderEntry {
  /** Key in SecurityHeadersOptions */
  key: keyof SecurityHeadersOptions
  /** HTTP header name */
  name: string
}

/** Security header options; false to omit. */
export interface SecurityHeadersOptions {
  /** Content-Security-Policy value */
  contentSecurityPolicy?: string | false
  /** Cross-Origin-Embedder-Policy value */
  crossOriginEmbedderPolicy?: string | false
  /** Cross-Origin-Opener-Policy value */
  crossOriginOpenerPolicy?: string | false
  /** Cross-Origin-Resource-Policy value */
  crossOriginResourcePolicy?: string | false
  /** Origin-Agent-Cluster value */
  originAgentCluster?: string | false
  /** Referrer-Policy value */
  referrerPolicy?: string | false
  /** Strict-Transport-Security value */
  strictTransportSecurity?: string | false
  /** X-Content-Type-Options value */
  xContentTypeOptions?: string | false
  /** X-DNS-Prefetch-Control value */
  xDnsPrefetchControl?: string | false
  /** X-Download-Options value */
  xDownloadOptions?: string | false
  /** X-Frame-Options value */
  xFrameOptions?: string | false
  /** X-Permitted-Cross-Domain-Policies value */
  xPermittedCrossDomainPolicies?: string | false
  /** X-Powered-By value */
  xPoweredBy?: string | false
}
