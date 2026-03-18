import type * as Types from '@interfaces/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Security headers middleware.
 * @description Sets configurable security headers on response.
 */
export class SecHeaders {
  /** Option key to HTTP header name mapping. */
  private static readonly headerEntries: Types.SecurityHeaderEntry[] = [
    { key: 'contentSecurityPolicy', name: 'Content-Security-Policy' },
    { key: 'crossOriginEmbedderPolicy', name: 'Cross-Origin-Embedder-Policy' },
    { key: 'crossOriginOpenerPolicy', name: 'Cross-Origin-Opener-Policy' },
    { key: 'crossOriginResourcePolicy', name: 'Cross-Origin-Resource-Policy' },
    { key: 'originAgentCluster', name: 'Origin-Agent-Cluster' },
    { key: 'referrerPolicy', name: 'Referrer-Policy' },
    { key: 'strictTransportSecurity', name: 'Strict-Transport-Security' },
    { key: 'xContentTypeOptions', name: 'X-Content-Type-Options' },
    { key: 'xDnsPrefetchControl', name: 'X-DNS-Prefetch-Control' },
    { key: 'xDownloadOptions', name: 'X-Download-Options' },
    { key: 'xFrameOptions', name: 'X-Frame-Options' },
    { key: 'xPermittedCrossDomainPolicies', name: 'X-Permitted-Cross-Domain-Policies' },
    { key: 'xPoweredBy', name: 'X-Powered-By' }
  ]

  /**
   * Create security headers middleware.
   * @description Sets configured security headers on response.
   * @param options - Header values; false to omit
   * @returns Middleware that sets headers
   */
  static create(options: Types.SecurityHeadersOptions = {}): Types.Middleware {
    return Middleware.Utils.wrapMiddleware('Security headers error', async (ctx, next) => {
      for (const { key, name } of SecHeaders.headerEntries) {
        const value = options[key]
        if (value !== false && value !== undefined) {
          ctx.setHeader(name, value)
        }
      }
      return await next()
    })
  }
}
