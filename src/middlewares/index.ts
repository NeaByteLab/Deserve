import corsMiddleware from '@middlewares/CORS.ts'
import websocketMiddleware from '@middlewares/WebSocket.ts'

/**
 * Built-in middleware registry.
 */
export const middlewares = {
  /** CORS middleware for handling cross-origin requests */
  cors: corsMiddleware,
  /** WebSocket middleware for handling WebSocket upgrades */
  websocket: websocketMiddleware
}
