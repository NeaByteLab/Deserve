import type { Middleware } from '@app/index.ts'

/**
 * Security headers configuration options
 */
export interface SecurityHeadersOptions {
  /** Content Security Policy (e.g., "default-src 'self'") */
  contentSecurityPolicy?: string | false
  /** Cross-Origin-Embedder-Policy (require-corp, unsafe-none, credentialless) */
  crossOriginEmbedderPolicy?: string | false
  /** Cross-Origin-Opener-Policy (same-origin, same-origin-allow-popups, unsafe-none) */
  crossOriginOpenerPolicy?: string | false
  /** Cross-Origin-Resource-Policy (same-origin, same-site, cross-origin) */
  crossOriginResourcePolicy?: string | false
  /** Origin-Agent-Cluster (usually "?1") */
  originAgentCluster?: string | false
  /** Referrer-Policy (no-referrer, strict-origin-when-cross-origin, etc.) */
  referrerPolicy?: string | false
  /** Strict-Transport-Security (HSTS, e.g., "max-age=31536000; includeSubDomains") */
  strictTransportSecurity?: string | false
  /** X-Content-Type-Options (usually "nosniff") */
  xContentTypeOptions?: string | false
  /** X-DNS-Prefetch-Control (on, off) */
  xDnsPrefetchControl?: string | false
  /** X-Download-Options (usually "noopen") */
  xDownloadOptions?: string | false
  /** X-Frame-Options (DENY, SAMEORIGIN, ALLOW-FROM uri) */
  xFrameOptions?: string | false
  /** X-Permitted-Cross-Domain-Policies (none, master-only, all) */
  xPermittedCrossDomainPolicies?: string | false
  /** X-Powered-By (set to false to remove/exclude, string to set custom value) */
  xPoweredBy?: string | false
}

/**
 * Creates a security headers middleware.
 * @param options - Security headers configuration options
 * @returns Middleware function
 */
export function securityHeaders(options: SecurityHeadersOptions = {}): Middleware {
  return async (ctx, next) => {
    const {
      contentSecurityPolicy,
      crossOriginEmbedderPolicy,
      crossOriginOpenerPolicy,
      crossOriginResourcePolicy,
      originAgentCluster,
      referrerPolicy,
      strictTransportSecurity,
      xContentTypeOptions,
      xDnsPrefetchControl,
      xDownloadOptions,
      xFrameOptions,
      xPermittedCrossDomainPolicies,
      xPoweredBy
    } = options
    try {
      if (contentSecurityPolicy !== false && contentSecurityPolicy !== undefined) {
        ctx.setHeader('Content-Security-Policy', contentSecurityPolicy)
      }
      if (crossOriginEmbedderPolicy !== false && crossOriginEmbedderPolicy !== undefined) {
        ctx.setHeader('Cross-Origin-Embedder-Policy', crossOriginEmbedderPolicy)
      }
      if (crossOriginOpenerPolicy !== false && crossOriginOpenerPolicy !== undefined) {
        ctx.setHeader('Cross-Origin-Opener-Policy', crossOriginOpenerPolicy)
      }
      if (crossOriginResourcePolicy !== false && crossOriginResourcePolicy !== undefined) {
        ctx.setHeader('Cross-Origin-Resource-Policy', crossOriginResourcePolicy)
      }
      if (originAgentCluster !== false && originAgentCluster !== undefined) {
        ctx.setHeader('Origin-Agent-Cluster', originAgentCluster)
      }
      if (referrerPolicy !== false && referrerPolicy !== undefined) {
        ctx.setHeader('Referrer-Policy', referrerPolicy)
      }
      if (strictTransportSecurity !== false && strictTransportSecurity !== undefined) {
        ctx.setHeader('Strict-Transport-Security', strictTransportSecurity)
      }
      if (xContentTypeOptions !== false && xContentTypeOptions !== undefined) {
        ctx.setHeader('X-Content-Type-Options', xContentTypeOptions)
      }
      if (xDnsPrefetchControl !== false && xDnsPrefetchControl !== undefined) {
        ctx.setHeader('X-DNS-Prefetch-Control', xDnsPrefetchControl)
      }
      if (xDownloadOptions !== false && xDownloadOptions !== undefined) {
        ctx.setHeader('X-Download-Options', xDownloadOptions)
      }
      if (xFrameOptions !== false && xFrameOptions !== undefined) {
        ctx.setHeader('X-Frame-Options', xFrameOptions)
      }
      if (xPermittedCrossDomainPolicies !== false && xPermittedCrossDomainPolicies !== undefined) {
        ctx.setHeader('X-Permitted-Cross-Domain-Policies', xPermittedCrossDomainPolicies)
      }
      if (xPoweredBy !== false && xPoweredBy !== undefined) {
        ctx.setHeader('X-Powered-By', xPoweredBy)
      }
      return await next()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return ctx.handleError(500, new Error(`Security headers error: ${errorMessage}`))
    }
  }
}
