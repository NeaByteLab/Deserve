import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Trusted proxy IP resolver.
 * @description Resolves client IP from forwarded headers.
 */
export class IpResolver {
  /** Preset CIDR rule groups by name */
  private static readonly presetRules: Record<string, readonly string[]> = {
    loopback: ['127.0.0.1/8', '::1/128'],
    linklocal: ['169.254.0.0/16', 'fe80::/10'],
    uniquelocal: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7']
  }
  /** Header names carrying a single IP */
  private static readonly singleIpHeaders: readonly string[] = ['cf-connecting-ip', 'x-real-ip']

  /**
   * Compile trust proxy configuration.
   * @description Expands presets then builds matcher function.
   * @param config - Trust proxy configuration value
   * @returns Matcher function or null
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
   * Resolve client IP from headers.
   * @description Walks forwarded chain skipping trusted hops.
   * @param directPeer - Direct peer IP address
   * @param headers - Request headers instance
   * @param trust - Trusted proxy matcher or null
   * @returns Resolved client IP or undefined
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
   * Build forwarded IP hop chain.
   * @description Reads x-forwarded-for then forwarded header.
   * @param headers - Request headers instance
   * @returns Ordered forwarded IP chain
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
   * Normalize forwarded token into IP.
   * @description Strips quotes, brackets, and trailing port.
   * @param token - Raw forwarded token value
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
   * Read single IP from headers.
   * @description Checks known single IP header names.
   * @param headers - Request headers instance
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
