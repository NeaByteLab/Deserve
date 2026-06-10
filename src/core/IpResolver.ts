import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Trusted-proxy aware client IP resolution.
 * @description Resolves the real visitor IP from the peer and forwarded headers.
 */
export class IpResolver {
  /** Trusted-proxy presets expanded to CIDR rules */
  private static readonly presetRules: Record<string, readonly string[]> = {
    loopback: ['127.0.0.1/8', '::1/128'],
    linklocal: ['169.254.0.0/16', 'fe80::/10'],
    uniquelocal: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7']
  }
  /** Single-IP forwarding header names */
  private static readonly singleIpHeaders: readonly string[] = ['cf-connecting-ip', 'x-real-ip']

  /**
   * Compile a trust-proxy configuration into a tester.
   * @description Expands presets and CIDRs, or wraps a predicate.
   * @param config - Trust configuration or undefined
   * @returns Trust tester, or null when nothing is trusted
   * @throws {Deno.errors.InvalidData} When a rule is malformed
   */
  static compile(config: Types.TrustProxyConfig | undefined): Types.IpMatcher | null {
    if (config === undefined) {
      return null
    }
    if (typeof config === 'function') {
      return config
    }
    if (config.length === 0) {
      return null
    }
    const rules: string[] = []
    for (const entry of config) {
      const preset = IpResolver.presetRules[entry]
      if (preset !== undefined) {
        rules.push(...preset)
        continue
      }
      rules.push(entry)
    }
    const matchers: readonly Types.IpMatcher[] = Core.IpAddress.compileRules(rules)
    return (ip) => Core.IpAddress.anyMatch(matchers, ip)
  }

  /**
   * Resolve the real client IP.
   * @description Walks forwarded hops right-to-left through trusted proxies.
   * @param directPeer - Direct TCP peer IP, or undefined
   * @param headers - Request headers
   * @param trust - Compiled trust tester, or null when none trusted
   * @returns Real client IP, or undefined when peer is unknown
   */
  static resolve(
    directPeer: string | undefined,
    headers: Headers,
    trust: Types.IpMatcher | null
  ): string | undefined {
    if (directPeer === undefined || trust === null || !trust(directPeer)) {
      return directPeer
    }
    const forwardedIp = IpResolver.singleHeaderIp(headers)
    if (forwardedIp !== undefined) {
      return forwardedIp
    }
    const forwarded = IpResolver.forwardedChain(headers)
    if (forwarded.length === 0) {
      return directPeer
    }
    for (let index = forwarded.length - 1; index >= 0; index -= 1) {
      const hop = forwarded[index]!
      if (!trust(hop)) {
        return hop
      }
    }
    return forwarded[0]!
  }

  /**
   * Build the forwarded address chain.
   * @description Merges X-Forwarded-For and Forwarded header entries.
   * @param headers - Request headers
   * @returns Ordered client-to-proxy IP chain
   */
  private static forwardedChain(headers: Headers): readonly string[] {
    const chain: string[] = []
    const forwardedForHeader = headers.get('x-forwarded-for')
    if (forwardedForHeader !== null) {
      for (const token of forwardedForHeader.split(',')) {
        const ip = IpResolver.normalizeForwardedToken(token)
        if (ip !== undefined) {
          chain.push(ip)
        }
      }
    }
    if (chain.length > 0) {
      return chain
    }
    const forwarded = headers.get('forwarded')
    if (forwarded === null) {
      return chain
    }
    for (const element of forwarded.split(',')) {
      for (const pair of element.split(';')) {
        const equalIndex = pair.indexOf('=')
        if (equalIndex === -1) {
          continue
        }
        if (pair.slice(0, equalIndex).trim().toLowerCase() !== 'for') {
          continue
        }
        const ip = IpResolver.normalizeForwardedToken(pair.slice(equalIndex + 1))
        if (ip !== undefined) {
          chain.push(ip)
        }
      }
    }
    return chain
  }

  /**
   * Normalize a forwarded token into a bare IP.
   * @description Strips quotes, brackets, and trailing port.
   * @param token - Raw forwarded token
   * @returns Valid IP string or undefined
   */
  private static normalizeForwardedToken(token: string): string | undefined {
    let tokenValue = token.trim()
    if (tokenValue.startsWith('"') && tokenValue.endsWith('"') && tokenValue.length >= 2) {
      tokenValue = tokenValue.slice(1, -1).trim()
    }
    if (tokenValue.startsWith('[')) {
      const closeIndex = tokenValue.indexOf(']')
      if (closeIndex === -1) {
        return undefined
      }
      tokenValue = tokenValue.slice(1, closeIndex)
    } else {
      const colonIndex = tokenValue.indexOf(':')
      if (colonIndex !== -1 && tokenValue.indexOf(':', colonIndex + 1) === -1) {
        tokenValue = tokenValue.slice(0, colonIndex)
      }
    }
    if (!Core.IpAddress.isValid(tokenValue)) {
      return undefined
    }
    return tokenValue
  }

  /**
   * Read a single-IP forwarding header.
   * @description Returns the first valid configured single-IP header value.
   * @param headers - Request headers
   * @returns Valid IP string or undefined
   */
  private static singleHeaderIp(headers: Headers): string | undefined {
    for (const headerName of IpResolver.singleIpHeaders) {
      const rawValue = headers.get(headerName)
      if (rawValue === null) {
        continue
      }
      const candidate = rawValue.trim()
      if (Core.IpAddress.isValid(candidate)) {
        return candidate
      }
    }
    return undefined
  }
}
