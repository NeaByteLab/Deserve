import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Observability helpers for the routing layer.
 * @description Stateless boundary emit and OTel-aligned metric derivation.
 */
export class Report {
  /**
   * Emit boundary observability for completed request.
   * @description Emits request:complete plus request:error when status exceeds.
   * @param emit - Event reporter
   * @param req - Incoming request
   * @param response - Final response sent to the client
   * @param startTime - performance.now() captured at request entry
   * @param holder - Per-request holder with ctx and any framework Error
   * @param timedOut - True when the response is the synthetic 503 timeout
   */
  static reportRequest(
    emit: Types.EventEmit,
    req: Request,
    response: Response,
    startTime: number,
    holder: Types.RequestHolder,
    timedOut: boolean
  ): void {
    const frameworkError = holder.frameworkError ??
      holder.ctx?.[Core.InternalContext].getFrameworkError() ?? null
    const channel: Types.EventChannel = timedOut || frameworkError !== null || holder.ctx === null
      ? 'internal'
      : 'external'
    const baseMetadata = {
      method: req.method,
      statusCode: response.status,
      url: req.url,
      durationMs: performance.now() - startTime,
      ...(holder.clientIp !== undefined && { ip: holder.clientIp }),
      ...Report.requestMetrics(req, response, holder),
      ...(frameworkError !== null && { error: frameworkError })
    }
    emit({
      type: channel,
      kind: 'request:complete',
      metadata: baseMetadata,
      timestamp: Date.now()
    })
    if (response.status >= 400) {
      emit({
        type: channel,
        kind: 'request:error',
        metadata: baseMetadata,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Parse Content-Length into a byte count.
   * @description Returns undefined for missing, chunked, or malformed values.
   * @param value - Raw Content-Length header value or null
   * @returns Parsed byte count or undefined
   */
  private static contentLength(value: string | null): number | undefined {
    if (value === null) {
      return undefined
    }
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed < 0 || String(parsed) !== value.trim()) {
      return undefined
    }
    return parsed
  }

  /**
   * Derive optional OTel-aligned request/response metrics.
   * @description Forwards only values known for certain, omits the rest.
   * @param req - Incoming request
   * @param response - Final response sent to the client
   * @param holder - Per-request holder carrying the matched route pattern
   * @returns Partial metadata with route, server, user-agent, and sizes
   */
  private static requestMetrics(
    req: Request,
    response: Response,
    holder: Types.RequestHolder
  ): Types.RequestMetrics {
    const userAgent = req.headers.get('user-agent') ?? undefined
    const requestSize = Report.contentLength(req.headers.get('content-length'))
    const responseSize = Report.contentLength(response.headers.get('content-length'))
    let serverAddress: string | undefined
    let serverPort: number | undefined
    const authority = holder.parsedUrl ?? Report.tryParseUrl(req.url)
    if (authority !== undefined) {
      serverAddress = authority.hostname || undefined
      serverPort = authority.port === '' ? undefined : Number.parseInt(authority.port, 10)
    }
    return {
      ...(holder.routePattern !== undefined && { route: holder.routePattern }),
      ...(serverAddress !== undefined && { serverAddress }),
      ...(serverPort !== undefined && Number.isFinite(serverPort) && { serverPort }),
      ...(userAgent !== undefined && { userAgent }),
      ...(requestSize !== undefined && { requestSize }),
      ...(responseSize !== undefined && { responseSize })
    }
  }

  /**
   * Parse a URL without throwing.
   * @description Fallback for metrics when the URL is unparsed.
   * @param url - Raw request URL
   * @returns Parsed URL or undefined when malformed
   */
  private static tryParseUrl(url: string): URL | undefined {
    try {
      return new Core.API.URL(url)
    } catch {
      return undefined
    }
  }
}
