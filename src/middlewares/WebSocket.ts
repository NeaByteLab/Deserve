import type { RouterMiddleware } from '@app/Types.ts'

/**
 * WebSocket middleware configuration options.
 */
export interface WebSocketOptions {
  /** Specific path to listen for WebSocket upgrades */
  listener?: string
  /** WebSocket connection handler */
  onConnect?: (socket: WebSocket, req: Request) => void
  /** WebSocket message handler */
  onMessage?: (socket: WebSocket, event: MessageEvent, req: Request) => void
  /** WebSocket disconnect handler */
  onDisconnect?: (socket: WebSocket, req: Request) => void
  /** WebSocket error handler */
  onError?: (socket: WebSocket, event: Event, req: Request) => void
}

/**
 * WebSocket middleware factory function.
 * @param options - WebSocket configuration options
 * @returns Middleware function that handles WebSocket upgrades
 */
export default function websocketMiddleware(options?: WebSocketOptions): RouterMiddleware {
  return (req: Request, _res?: Response) => {
    if (!options?.listener) {
      return null
    }
    if (req.headers.get('upgrade') !== 'websocket') {
      return null
    }
    const url = new URL(req.url)
    if (!url.pathname.startsWith(options.listener)) {
      return null
    }
    try {
      const { socket, response } = Deno.upgradeWebSocket(req)
      socket.addEventListener('open', () => {
        options.onConnect?.(socket, req)
      })
      socket.addEventListener('message', (event) => {
        options.onMessage?.(socket, event, req)
      })
      socket.addEventListener('close', () => {
        options.onDisconnect?.(socket, req)
      })
      socket.addEventListener('error', (event) => {
        options.onError?.(socket, event, req)
      })
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`WebSocket upgrade failed: ${errorMessage}`)
    }
  }
}
