import type * as Types from '@interfaces/index.ts'

/**
 * IP address parsing and matching utilities.
 * @description Canonical parsing, CIDR matching, shared across middleware.
 */
export class IpAddress {
  /**
   * Test an IP against matchers.
   * @description Returns true when any matcher accepts the IP.
   * @param matchers - Compiled rule matchers
   * @param ip - IP address string
   * @returns True when any matcher accepts
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
   * Compile a rule into a matcher.
   * @description Handles wildcard, CIDR, and exact addresses.
   * @param rule - Single rule string
   * @returns Matcher for the rule
   * @throws {Deno.errors.InvalidData} When the rule is malformed
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
   * Compile rule strings into matchers.
   * @description Validates each rule into a test.
   * @param rules - Rule strings or undefined
   * @returns Compiled matcher list
   * @throws {Deno.errors.InvalidData} When a rule is malformed
   */
  static compileRules(rules: readonly string[] | undefined): readonly Types.IpMatcher[] {
    if (!rules || rules.length === 0) {
      return []
    }
    return rules.map((rule) => IpAddress.compileRule(rule))
  }

  /**
   * Test whether a string is a valid IP address.
   * @description True only for non-empty strings that parse to an IP value.
   * @param address - Candidate IP string
   * @returns True when the address parses successfully
   */
  static isValid(address: string): boolean {
    return address.length > 0 && IpAddress.parse(address) !== null
  }

  /**
   * Parse an IP string into a canonical value.
   * @description Detects version and folds IPv4-mapped IPv6 to IPv4.
   * @param address - IP address string
   * @returns Parsed value and version, or null when invalid
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
   * Combine eight groups into a 128-bit value.
   * @description Shifts each hextet into place.
   * @param groups - Eight hextet values
   * @returns Combined 128-bit value
   */
  private static groupsToValue(groups: readonly bigint[]): bigint {
    let combinedValue = 0n
    for (const group of groups) {
      combinedValue = (combinedValue << 16n) | group
    }
    return combinedValue
  }

  /**
   * Parse IPv4 into a 32-bit value.
   * @description Validates four 0-255 octets without leading zeros.
   * @param address - IPv4 address string
   * @returns Numeric value or null when invalid
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
   * Parse IPv6 into a 128-bit value.
   * @description Expands "::" and validates hextets, allows IPv4 suffix.
   * @param address - IPv6 address string
   * @returns Numeric value or null when invalid
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
    const headTarget = groups
    if (!expand(headParts)) {
      return null
    }
    head.push(...headTarget)
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
