/**
 * HeadersInit to string record converter.
 * @description Normalizes Headers, array, or object to key-value record.
 */
export class Helper {
  /**
   * Convert HeadersInit to record.
   * @description Returns plain string record from any HeadersInit variant.
   * @param init - Headers, array, or object
   * @returns Key-value string record
   */
  static toRecord(init?: HeadersInit): Record<string, string> {
    if (!init) {
      return {}
    }
    if (init instanceof Headers) {
      return Object.fromEntries(init)
    }
    if (Array.isArray(init)) {
      return Object.fromEntries(init as [string, string][])
    }
    return { ...init }
  }
}
