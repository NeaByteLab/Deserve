import corsMiddleware from '@middlewares/CORS.ts'

/**
 * Built-in middleware registry.
 */
export const middlewares = {
  /** CORS middleware for handling cross-origin requests */
  cors: corsMiddleware
}
