import type * as Types from '@interfaces/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Security headers middleware.
 * @description Sets configurable security headers on response.
 */
export class SecHeaders {
  /** Secure default values for security headers */
  private static readonly defaultValues: Readonly<Record<string, string>> = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Origin-Agent-Cluster': '?1',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Permitted-Cross-Domain-Policies': 'none'
  }
  /** Option key to header name map */
  private static readonly headerEntries: readonly Types.SecurityHeaderEntry[] = [
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
   * @description Sets secure defaults then applies overrides, false omits header.
   * @param options - Header values, false to omit a default
   * @returns Middleware that sets headers
   */
  static create(options: Types.SecurityHeadersOptions = {}): Types.Middleware {
    return Middleware.Utils.wrapMiddleware('Security headers error', async (ctx, next) => {
      for (const entry of SecHeaders.headerEntries) {
        const headerValue = options[entry.key]
        if (headerValue === false) {
          continue
        }
        if (headerValue !== undefined) {
          ctx.setHeader(entry.name, headerValue)
        } else if (Object.hasOwn(SecHeaders.defaultValues, entry.name)) {
          ctx.setHeader(entry.name, SecHeaders.defaultValues[entry.name]!)
        }
      }
      return await next()
    })
  }
}
