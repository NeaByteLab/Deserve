import type * as Types from '@interfaces/index.ts'

/**
 * Framework wide constant values.
 * @description Holds shared defaults, regexes, and lookup tables.
 */
export class Constant {
  /** Regex trimming leading and trailing spaces */
  static readonly cookieTrimRegex = /^[ \t]+|[ \t]+$/g
  /** Shared UTF-8 text decoder instance */
  static readonly decoder: TextDecoder = new TextDecoder()
  /** Default content type for unknown files */
  static readonly defaultContentType = 'application/octet-stream'
  /** Default worker pool size */
  static readonly defaultPoolSize = 4
  /** Default queue depth multiplier per worker */
  static readonly defaultQueueFactor = 8
  /** Default queue wait timeout in milliseconds */
  static readonly defaultQueueWaitMs = 2000
  /** Default session cookie option values */
  static readonly defaultSessionOptions: Readonly<Types.SessionDefaults> = {
    name: 'session',
    httpOnly: true,
    maxAge: 86400,
    path: '/',
    sameSite: 'Lax',
    secure: false
  }
  /** Default worker task timeout in milliseconds */
  static readonly defaultWorkerTaskTimeoutMs = 5000
  /** Regex escaping disposition filename characters */
  static readonly dispositionEscapeRegex = /[\\"]/g
  /** Regex matching non-ASCII disposition characters */
  static readonly dispositionNonAsciiRegex = /[\u0080-\u{10FFFF}]/u
  /** Regex stripping directory path prefix */
  static readonly dispositionPathRegex = /^.*[\\/]/
  /** Template file extension for views */
  static readonly dveExtension = '.dve'
  /** Shared UTF-8 text encoder instance */
  static readonly encoder: TextEncoder = new TextEncoder()
  /** HTML entity replacements for escaping */
  static readonly htmlEscapeMap: Readonly<Types.StringRecord> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  /** Regex matching characters needing HTML escape */
  static readonly htmlEscapeRegex = /[&<>"']/g
  /** Maximum allowed route parameter length */
  static readonly maxParamLength = 1024
  /** Maximum allowed request URL length */
  static readonly maxUrlLength = 8192
  /** Status codes that forbid response bodies */
  static readonly nullBodyStatuses: ReadonlySet<number> = new Set([101, 204, 205, 304])
  /** Content type for problem detail responses */
  static readonly problemJsonContentType = 'application/problem+json'
  /** Status codes treated as HTTP redirects */
  static readonly redirectStatuses: ReadonlySet<number> = new Set([301, 302, 303, 307, 308])
  /** Route reload debounce in milliseconds */
  static readonly routeDebounceMs = 150
  /** Template reload debounce in milliseconds */
  static readonly templateDebounceMs = 100
  /** Allowed route module file extensions */
  static readonly allowedExtensions: readonly string[] = ['cjs', 'js', 'jsx', 'mjs', 'ts', 'tsx']
  /** File extension to content type map */
  static readonly contentTypes: Readonly<Types.StringRecord> = {
    css: 'text/css; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    gif: 'image/gif',
    htm: 'text/html; charset=utf-8',
    html: 'text/html; charset=utf-8',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    js: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    map: 'application/json; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    pdf: 'application/pdf',
    png: 'image/png',
    svg: 'image/svg+xml; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    wasm: 'application/wasm',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    xml: 'application/xml; charset=utf-8'
  }
  /** Supported HTTP request methods */
  static readonly httpMethods: readonly Types.HttpMethod[] = [
    'DELETE',
    'GET',
    'HEAD',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT'
  ]
  /** Status code to reason phrase map */
  static readonly serverErrorMessages: Readonly<Partial<Record<Types.HttpStatusCode, string>>> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  }
  /** Security header names with default values */
  static readonly securityHeaders = {
    contentSecurityPolicy: { header: 'Content-Security-Policy', default: null },
    crossOriginEmbedderPolicy: { header: 'Cross-Origin-Embedder-Policy', default: null },
    crossOriginOpenerPolicy: { header: 'Cross-Origin-Opener-Policy', default: 'same-origin' },
    crossOriginResourcePolicy: { header: 'Cross-Origin-Resource-Policy', default: 'same-origin' },
    originAgentCluster: { header: 'Origin-Agent-Cluster', default: '?1' },
    referrerPolicy: { header: 'Referrer-Policy', default: 'no-referrer' },
    strictTransportSecurity: { header: 'Strict-Transport-Security', default: null },
    xContentTypeOptions: { header: 'X-Content-Type-Options', default: 'nosniff' },
    xDnsPrefetchControl: { header: 'X-DNS-Prefetch-Control', default: 'off' },
    xDownloadOptions: { header: 'X-Download-Options', default: 'noopen' },
    xFrameOptions: { header: 'X-Frame-Options', default: 'SAMEORIGIN' },
    xPermittedCrossDomainPolicies: {
      header: 'X-Permitted-Cross-Domain-Policies',
      default: 'none'
    }
  } as const
}
