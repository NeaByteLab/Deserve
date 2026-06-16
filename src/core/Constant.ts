import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Shared constants and framework singletons.
 * @description Centralizes all static data: encoders, regexes, defaults, maps.
 */
export class Constant {
  /** Shared UTF-8 text decoder */
  static readonly decoder: TextDecoder = new Core.API.TextDecoder()
  /** Shared UTF-8 text encoder */
  static readonly encoder: TextEncoder = new Core.API.TextEncoder()
  /** HTML entity map for escaping */
  static readonly htmlEscapeMap: Readonly<Types.StringRecord> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  /** Matches characters needing HTML escaping */
  static readonly htmlEscapeRegex = /[&<>"']/g
  /** Strips separators and control characters */
  static readonly sanitizeRegex = /^.*[\\/]|\p{Cc}/gu
  /** Matches backslash or double-quote characters */
  static readonly escapeRegex = /[\\\"]/g
  /** Matches any non-ASCII character */
  static readonly nonAsciiRegex = /[\u0080-\u{10FFFF}]/u
  /** Matches all non-ASCII characters globally */
  static readonly nonAsciiGlobalRegex = /[\u0080-\u{10FFFF}]/gu
  /** Dotted path regex for fast-path */
  static readonly simplePathRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/
  /** Matches leading and trailing cookie whitespace */
  static readonly cookieTrimRegex = /^[ \t]+|[ \t]+$/g
  /** DVE template file extension */
  static readonly dveExtension = '.dve'
  /** Default worker pool size */
  static readonly defaultPoolSize = 4
  /** Default worker task timeout in ms */
  static readonly defaultWorkerTaskTimeoutMs = 5_000
  /** Default pending-task multiplier per worker slot */
  static readonly defaultQueueFactor = 8
  /** Default projected-wait deadline in ms */
  static readonly defaultQueueWaitMs = 2_000
  /** Null-body HTTP status codes */
  static readonly nullBodyStatuses: ReadonlySet<number> = new Set([101, 204, 205, 304])
  /** Valid redirect status codes */
  static readonly redirectStatuses: ReadonlySet<number> = new Set([301, 302, 303, 307, 308])
  /** Default max route parameter length */
  static readonly maxParamLength = 1024
  /** Default max request URL length */
  static readonly maxUrlLength = 8192
  /** Default max #each iterations */
  static readonly defaultMaxIterations = 100_000
  /** Default max #each body executions per render */
  static readonly defaultMaxRenderIterations = 1_000_000
  /** Default max output characters per render */
  static readonly defaultMaxOutputSize = 5_000_000
  /** Maximum template include nesting depth */
  static readonly maxIncludeDepth = 64
  /** Route watcher debounce in milliseconds */
  static readonly routeDebounceMs = 150
  /** Template watcher debounce in milliseconds */
  static readonly templateDebounceMs = 100
  /** Default session cookie options */
  static readonly defaultSessionOptions: Types.SessionCookieOpts = {
    cookieName: 'session',
    maxAge: 86400,
    path: '/',
    sameSite: 'Lax',
    httpOnly: true,
    secure: true
  }
  /** Problem details JSON content type */
  static readonly problemJsonContentType = 'application/problem+json'
  /** Status code to error message */
  static readonly serverErrorMessages: Readonly<
    Partial<Record<Types.HttpStatusCode, string>>
  > = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
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
  /** Secure default values for security headers */
  static readonly securityHeaderDefaults: Readonly<Types.StringRecord> = {
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
  /** File extensions allowed for route modules */
  static readonly allowedExtensions: readonly Types.RouteFileExtension[] = [
    'cjs',
    'js',
    'jsx',
    'mjs',
    'ts',
    'tsx'
  ]
  /** Extension to MIME type map */
  static readonly contentTypes: Readonly<Types.StringRecord> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    less: 'text/css',
    scss: 'text/css',
    sass: 'text/css',
    js: 'application/javascript',
    mjs: 'application/javascript',
    cjs: 'application/javascript',
    ts: 'application/typescript',
    tsx: 'application/typescript',
    jsx: 'application/javascript',
    json: 'application/json',
    jsonld: 'application/ld+json',
    ndjson: 'application/x-ndjson',
    map: 'application/json',
    geojson: 'application/geo+json',
    topojson: 'application/json',
    md: 'text/markdown',
    markdown: 'text/markdown',
    sh: 'application/x-sh',
    csh: 'application/x-csh',
    bash: 'text/plain',
    php: 'application/x-httpd-php',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    toml: 'text/toml',
    ics: 'text/calendar',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    avif: 'image/avif',
    apng: 'image/apng',
    heif: 'image/heif',
    heic: 'image/heic',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttc: 'font/collection',
    eot: 'application/vnd.ms-fontobject',
    pdf: 'application/pdf',
    epub: 'application/epub+zip',
    azw: 'application/vnd.amazon.ebook',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
    vsd: 'application/vnd.visio',
    mpkg: 'application/vnd.apple.installer+xml',
    xml: 'application/xml',
    xhtml: 'application/xhtml+xml',
    xul: 'application/vnd.mozilla.xul+xml',
    csv: 'text/csv',
    txt: 'text/plain',
    rtf: 'application/rtf',
    abw: 'application/x-abiword',
    bin: 'application/octet-stream',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    bz: 'application/x-bzip',
    bz2: 'application/x-bzip2',
    xz: 'application/x-xz',
    rar: 'application/vnd.rar',
    arc: 'application/x-freearc',
    jar: 'application/java-archive',
    '7z': 'application/x-7z-compressed',
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mpeg: 'video/mpeg',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    ogv: 'video/ogg',
    ogx: 'application/ogg',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2',
    mts: 'video/mp2t',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    opus: 'audio/opus',
    weba: 'audio/webm',
    mid: 'audio/midi',
    midi: 'audio/midi',
    cda: 'application/x-cdf',
    glb: 'model/gltf-binary',
    gltf: 'model/gltf+json',
    wasm: 'application/wasm',
    manifest: 'application/manifest+json',
    webmanifest: 'application/manifest+json',
    serviceworker: 'application/javascript'
  }
  /** Security header option to name */
  static readonly securityHeaders = {
    contentSecurityPolicy: 'Content-Security-Policy',
    crossOriginEmbedderPolicy: 'Cross-Origin-Embedder-Policy',
    crossOriginOpenerPolicy: 'Cross-Origin-Opener-Policy',
    crossOriginResourcePolicy: 'Cross-Origin-Resource-Policy',
    originAgentCluster: 'Origin-Agent-Cluster',
    referrerPolicy: 'Referrer-Policy',
    strictTransportSecurity: 'Strict-Transport-Security',
    xContentTypeOptions: 'X-Content-Type-Options',
    xDnsPrefetchControl: 'X-DNS-Prefetch-Control',
    xDownloadOptions: 'X-Download-Options',
    xFrameOptions: 'X-Frame-Options',
    xPermittedCrossDomainPolicies: 'X-Permitted-Cross-Domain-Policies',
    xPoweredBy: 'X-Powered-By'
  } as const satisfies Types.StringRecord
  /** HTTP methods used for route registration */
  static readonly httpMethods: readonly Types.HttpMethod[] = [
    'DELETE',
    'GET',
    'HEAD',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT'
  ]
}
