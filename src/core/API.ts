import type * as Types from '@interfaces/index.ts'
import { Immutable } from '@neabyte/utils-core'
import nodeUrl from 'node:url'

/**
 * Captured native runtime APIs.
 * @description Holds frozen references to native globals and helpers.
 */
export class API {
  /** Native Response constructor reference */
  static readonly Response = globalThis.Response
  /** Native Headers constructor reference */
  static readonly Headers = globalThis.Headers
  /** Native Request constructor reference */
  static readonly Request = globalThis.Request
  /** Native URL constructor reference */
  static readonly URL = globalThis.URL
  /** Native Error constructor reference */
  static readonly Error = globalThis.Error
  /** Native TextEncoder constructor reference */
  static readonly TextEncoder = globalThis.TextEncoder
  /** Native TextDecoder constructor reference */
  static readonly TextDecoder = globalThis.TextDecoder
  /** Native Worker constructor reference */
  static readonly Worker = globalThis.Worker
  /** Native SubtleCrypto instance reference */
  static readonly subtle = globalThis.crypto.subtle

  /** Dynamic import wrapper for route modules */
  private static readonly runtimeImport = new Function(
    'specifier',
    'return import(specifier)'
  ) as Types.RuntimeImport

  /**
   * Import route module from path.
   * @description Adds cache-busting query when isolate is set.
   * @param fullPath - Absolute path to module file
   * @param isolate - Force fresh import with version query
   * @returns Promise resolving to imported route module
   */
  static importRouteModule(fullPath: string, isolate = false): Promise<Types.RouteModule> {
    const baseUrl = nodeUrl.pathToFileURL(fullPath).href
    return API.runtimeImport(isolate ? `${baseUrl}?v=${Date.now()}` : baseUrl)
  }

  /**
   * Parse JSON text into value.
   * @description Uses captured native JSON parse function.
   * @param text - JSON text to parse
   * @returns Parsed value of unknown type
   */
  static jsonParse(text: string): unknown {
    return globalThis.JSON.parse(text)
  }

  /**
   * Serialize value into JSON text.
   * @description Uses captured native JSON stringify function.
   * @param value - Value to serialize
   * @returns JSON string representation
   */
  static jsonStringify(value: unknown): string {
    return globalThis.JSON.stringify(value)
  }
}

/** Freeze API class to prevent mutation */
Immutable.freeze(API)
/** Freeze API prototype to prevent mutation */
Immutable.freeze(API.prototype)
