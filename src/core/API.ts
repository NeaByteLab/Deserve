import { Immutable } from '@neabyte/utils-core'

/** Pinned Response constructor */
const SafeResponse = globalThis.Response
/** Pinned Headers constructor */
const SafeHeaders = globalThis.Headers
/** Pinned Request constructor */
const SafeRequest = globalThis.Request
/** Pinned URL constructor */
const SafeURL = globalThis.URL
/** Pinned Worker constructor */
const SafeWorker = globalThis.Worker
/** Pinned Error constructor */
const SafeError = globalThis.Error
/** Pinned TextEncoder constructor */
const SafeTextEncoder = globalThis.TextEncoder
/** Pinned TextDecoder constructor */
const SafeTextDecoder = globalThis.TextDecoder
/** Pinned JSON parse function */
const safeJsonParse = globalThis.JSON.parse
/** Pinned JSON stringify function */
const safeJsonStringify = globalThis.JSON.stringify
/** Pinned SubtleCrypto instance */
const safeSubtle = globalThis.crypto.subtle

/**
 * Pinned runtime built-ins for Deserve.
 * @description Snapshotted at load before third-party code patches globals.
 */
export class API {
  /** Pinned Response constructor */
  static readonly Response = SafeResponse
  /** Pinned Headers constructor */
  static readonly Headers = SafeHeaders
  /** Pinned Request constructor */
  static readonly Request = SafeRequest
  /** Pinned URL constructor */
  static readonly URL = SafeURL
  /** Pinned Worker constructor */
  static readonly Worker = SafeWorker
  /** Pinned Error constructor */
  static readonly Error = SafeError
  /** Pinned TextEncoder constructor */
  static readonly TextEncoder = SafeTextEncoder
  /** Pinned TextDecoder constructor */
  static readonly TextDecoder = SafeTextDecoder
  /** Pinned SubtleCrypto instance */
  static readonly subtle = safeSubtle

  /**
   * Parse JSON text with pinned parser.
   * @description Uses the snapshotted JSON.parse, immune to patching.
   * @param text - JSON source text
   * @returns Parsed value
   */
  static jsonParse(text: string): unknown {
    return safeJsonParse(text)
  }

  /**
   * Serialize value with pinned serializer.
   * @description Uses the snapshotted JSON.stringify, immune to patching.
   * @param value - Value to serialize
   * @returns JSON string
   */
  static jsonStringify(value: unknown): string {
    return safeJsonStringify(value)
  }
}

/** Freeze API class object */
Immutable.freeze(API)
/** Freeze API prototype object */
Immutable.freeze(API.prototype)
