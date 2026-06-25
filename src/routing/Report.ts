import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Request observability reporter.
 * @description Emits request completion and error events.
 */
export class Report {
  /**
   * Report request completion and errors.
   * @description Emits complete and error events with metadata.
   * @param emit - Event emitter function
   * @param req - Incoming request being reported
   * @param response - Final response produced
   * @param startTime - Request start timestamp in milliseconds
   * @param holder - Request state holder
   * @param timedOut - Whether request timed out
   */
  static reportRequest(
    emit: Types.EventFn,
    req: Request,
    response: Response,
    startTime: number,
    holder: Types.RequestHolder,
    timedOut: boolean
  ): void {
    const frameworkError = holder.frameworkError ??
      (holder.ctx === null ? null : Core.Context.internalOf(holder.ctx).getFrameworkError())
    const channel: Types.EventChannel = timedOut || frameworkError !== null || holder.ctx === null
      ? 'internal'
      : 'external'
    const metadata = {
      method: req.method,
      statusCode: response.status,
      url: req.url,
      durationMs: performance.now() - startTime,
      ...Report.requestMetrics(req, response, holder),
      ...(frameworkError !== null && { error: frameworkError })
    }
    emit({ type: channel, kind: 'request:completed', metadata, timestamp: Date.now() })
    if (response.status >= 400) {
      emit({ type: channel, kind: 'request:failed', metadata, timestamp: Date.now() })
    }
  }

  /**
   * Parse content-length header value.
   * @description Returns undefined for invalid numeric values.
   * @param value - Raw content-length header value
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
   * Collect metrics from request response.
   * @description Gathers size, address, agent, and route data.
   * @param req - Incoming request to inspect
   * @param response - Final response to inspect
   * @param holder - Request state holder
   * @returns Assembled request metrics object
   */
  private static requestMetrics(
    req: Request,
    response: Response,
    holder: Types.RequestHolder
  ): Types.RequestMetrics {
    const userAgent = req.headers.get('user-agent') ?? undefined
    const requestSize = Report.contentLength(req.headers.get('content-length'))
    const responseSize = Report.contentLength(response.headers.get('content-length'))
    const clientIp = holder.ctx?.get.ip()
    const authority = holder.parsedUrl ?? Report.tryParseUrl(req.url)
    const serverAddress = authority !== undefined && authority.hostname !== ''
      ? authority.hostname
      : undefined
    const serverPort = authority !== undefined && authority.port !== ''
      ? Number.parseInt(authority.port, 10)
      : undefined
    return {
      ...(clientIp !== undefined && { ip: clientIp }),
      ...(holder.routePattern !== undefined && { route: holder.routePattern }),
      ...(serverAddress !== undefined && { serverAddress }),
      ...(serverPort !== undefined && Number.isFinite(serverPort) && { serverPort }),
      ...(userAgent !== undefined && { userAgent }),
      ...(requestSize !== undefined && { requestSize }),
      ...(responseSize !== undefined && { responseSize })
    }
  }

  /**
   * Parse URL string safely.
   * @description Returns undefined when URL parsing fails.
   * @param url - URL string to parse
   * @returns Parsed URL or undefined
   */
  private static tryParseUrl(url: string): URL | undefined {
    try {
      return new Core.API.URL(url)
    } catch {
      return undefined
    }
  }
}
