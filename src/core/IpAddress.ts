import type * as Types from '@interfaces/index.ts'

/**
 * IP address parsing and matching.
 * @description Parses IPv4 and IPv6 and compiles rules.
 */
export class IpAddress {
  /**
   * Check IP matches any matcher.
   * @description Returns true on first matcher hit.
   * @param matchers - Compiled IP matcher functions
   * @param ip - IP address to test
   * @returns True when any matcher matches
   */
  static anyMatch(matchers: readonly Types.IpMatcher[], ip: string): boolean {
    for (const matcher of matchers) {
      if (matcher(ip)) {
        return true
      }
    }
    return false
  }

  /**
   * Compile rule into matcher function.
   * @description Supports wildcard, exact, and CIDR rules.
   * @param rule - IP or CIDR rule string
   * @returns Matcher function for the rule
   * @throws When rule or CIDR prefix invalid
   */
  static compileRule(rule: string): Types.IpMatcher {
    if (rule === '*') {
      return () => true
    }
    const slashIndex = rule.indexOf('/')
    if (slashIndex === -1) {
      const parsedRule = IpAddress.parse(rule)
      if (parsedRule === null) {
        throw new Deno.errors.InvalidData(`Invalid IP rule "${rule}"`)
      }
      const ruleValue = parsedRule.value
      const ruleVersion = parsedRule.version
      return (ip) => {
        const targetIp = IpAddress.parse(ip)
        return targetIp !== null && targetIp.version === ruleVersion && targetIp.value === ruleValue
      }
    }
    const network = IpAddress.parse(rule.slice(0, slashIndex))
    const prefixText = rule.slice(slashIndex + 1)
    if (network === null || !/^\d{1,3}$/.test(prefixText)) {
      throw new Deno.errors.InvalidData(`Invalid CIDR rule "${rule}"`)
    }
    const prefix = Number(prefixText)
    const maxBits = network.version === 4 ? 32 : 128
    if (prefix > maxBits) {
      throw new Deno.errors.InvalidData(`Invalid CIDR prefix in rule "${rule}"`)
    }
    const totalBits = BigInt(maxBits)
    const mask = prefix === 0
      ? 0n
      : ((1n << totalBits) - 1n) ^ ((1n << (totalBits - BigInt(prefix))) - 1n)
    const networkBits = network.value & mask
    const networkVersion = network.version
    return (ip) => {
      const targetIp = IpAddress.parse(ip)
      return targetIp !== null && targetIp.version === networkVersion &&
        (targetIp.value & mask) === networkBits
    }
  }

  /**
   * Compile multiple rules into matchers.
   * @description Returns empty array when no rules.
   * @param rules - IP or CIDR rule strings
   * @returns Array of compiled matcher functions
   */
  static compileRules(rules: readonly string[] | undefined): readonly Types.IpMatcher[] {
    if (!rules || rules.length === 0) {
      return []
    }
    return rules.map((rule) => IpAddress.compileRule(rule))
  }

  /**
   * Check address is valid IP.
   * @description Parses address and checks success.
   * @param address - IP address string to validate
   * @returns True when address parses successfully
   */
  static isValid(address: string): boolean {
    return address.length > 0 && IpAddress.parse(address) !== null
  }

  /**
   * Parse address into value version.
   * @description Maps IPv4 in IPv6 to version four.
   * @param address - IP address string to parse
   * @returns Parsed IP value or null
   */
  static parse(address: string): Types.ParsedIp | null {
    if (address.includes(':')) {
      const ipValue = IpAddress.parseIPv6(address)
      if (ipValue === null) {
        return null
      }
      if (ipValue >> 32n === 0xffffn) {
        return { value: ipValue & 0xffffffffn, version: 4 }
      }
      return { value: ipValue, version: 6 }
    }
    const ipValue = IpAddress.parseIPv4(address)
    return ipValue === null ? null : { value: ipValue, version: 4 }
  }

  /**
   * Combine groups into single value.
   * @description Shifts each group by sixteen bits.
   * @param groups - Bigint groups to combine
   * @returns Combined bigint address value
   */
  private static groupsToValue(groups: readonly bigint[]): bigint {
    let combinedValue = 0n
    for (const group of groups) {
      combinedValue = (combinedValue << 16n) | group
    }
    return combinedValue
  }

  /**
   * Parse IPv4 address into value.
   * @description Validates four octets within byte range.
   * @param address - IPv4 address string to parse
   * @returns Bigint address value or null
   */
  private static parseIPv4(address: string): bigint | null {
    const parts = address.split('.')
    if (parts.length !== 4) {
      return null
    }
    let ipValue = 0n
    for (const part of parts) {
      if (!/^(0|[1-9]\d{0,2})$/.test(part)) {
        return null
      }
      const octet = Number(part)
      if (octet > 255) {
        return null
      }
      ipValue = (ipValue << 8n) | BigInt(octet)
    }
    return ipValue
  }

  /**
   * Parse IPv6 address into value.
   * @description Expands compression and embedded IPv4 groups.
   * @param address - IPv6 address string to parse
   * @returns Bigint address value or null
   */
  private static parseIPv6(address: string): bigint | null {
    const zoneIndex = address.indexOf('%')
    const cleanAddress = zoneIndex === -1 ? address : address.slice(0, zoneIndex)
    const halves = cleanAddress.split('::')
    if (halves.length > 2) {
      return null
    }
    const headParts = halves[0] === '' ? [] : halves[0]!.split(':')
    const tailParts = halves.length === 2 ? (halves[1] === '' ? [] : halves[1]!.split(':')) : null
    const groups: bigint[] = []
    const expand = (parts: string[]): boolean => {
      for (const part of parts) {
        if (part.includes('.')) {
          const ipv4Value = IpAddress.parseIPv4(part)
          if (ipv4Value === null) {
            return false
          }
          groups.push((ipv4Value >> 16n) & 0xffffn)
          groups.push(ipv4Value & 0xffffn)
          continue
        }
        if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
          return false
        }
        groups.push(BigInt(parseInt(part, 16)))
      }
      return true
    }
    if (tailParts === null) {
      if (!expand(headParts) || groups.length !== 8) {
        return null
      }
      return IpAddress.groupsToValue(groups)
    }
    const head: bigint[] = []
    const tail: bigint[] = []
    if (!expand(headParts)) {
      return null
    }
    head.push(...groups)
    groups.length = 0
    if (!expand(tailParts)) {
      return null
    }
    tail.push(...groups)
    const fillCount = 8 - head.length - tail.length
    if (fillCount < 0) {
      return null
    }
    const fullGroups = [...head, ...new Array<bigint>(fillCount).fill(0n), ...tail]
    if (fullGroups.length !== 8) {
      return null
    }
    return IpAddress.groupsToValue(fullGroups)
  }
}
