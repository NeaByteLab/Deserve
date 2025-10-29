# WebSocket Middleware

> **Reference**: [Deno upgradeWebSocket API Documentation](https://docs.deno.com/api/deno/~/Deno.upgradeWebSocket)

WebSocket middleware handles WebSocket connection upgrades, allowing real-time bidirectional communication between client and server.

## Basic Usage

Apply WebSocket middleware using Deserve's built-in middleware:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

router.use(
  Mware.websocket({
    listener: '/ws',
    onConnect: (socket, ctx) => {
      console.log('WebSocket connected:', ctx.url)
      socket.send('Welcome!')
    }
  })
)

await router.serve(8000)
```

## WebSocket Options

### `listener`

Specify the path prefix for WebSocket upgrades:

```typescript
listener: '/ws'      // Matches /ws, /ws/chat, /ws/room/123, etc.
listener: '/api/ws'  // Matches /api/ws, /api/ws/data, etc.
```

**Important:** The middleware only upgrades requests that:
- Have `Upgrade: websocket` header
- Path starts with the `listener` value

### `onConnect`

Handle new WebSocket connections:

```typescript
onConnect: (socket: WebSocket, ctx: Context) => {
  console.log('Client connected:', ctx.url)
  socket.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }))
}
```

### `onMessage`

Handle incoming WebSocket messages:

```typescript
onMessage: (socket: WebSocket, event: MessageEvent, ctx: Context) => {
  console.log('Received:', event.data)
  try {
    const data = JSON.parse(event.data as string)
    socket.send(JSON.stringify({ echo: data }))
  } catch {
    socket.send(JSON.stringify({ error: 'Invalid JSON' }))
  }
}
```

### `onDisconnect`

Handle WebSocket disconnections:

```typescript
onDisconnect: (socket: WebSocket, ctx: Context) => {
  console.log('Client disconnected:', ctx.url)
  // Clean up resources, remove from rooms, etc.
}
```

### `onError`

Handle WebSocket errors:

```typescript
onError: (socket: WebSocket, event: Event, ctx: Context) => {
  console.error('WebSocket error:', event, 'on', ctx.url)
}
```

## Complete Example

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

router.use(
  Mware.websocket({
    listener: '/ws',
    onConnect: (socket, ctx) => {
      console.log(`WebSocket connected: ${ctx.url}`)
      socket.send(
        JSON.stringify({
          type: 'welcome',
          message: 'Connected to Deserve WebSocket server!'
        })
      )
    },
    onMessage: (socket, event, ctx) => {
      console.log(`Message from ${ctx.url}:`, event.data)
      try {
        const data = JSON.parse(event.data as string)
        if (data.type === 'ping') {
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }))
        } else {
          socket.send(JSON.stringify({
            type: 'echo',
            original: data,
            timestamp: Date.now()
          }))
        }
      } catch {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON'
        }))
      }
    },
    onDisconnect: (socket, ctx) => {
      console.log(`WebSocket disconnected: ${ctx.url}`)
    },
    onError: (socket, event, ctx) => {
      console.error(`WebSocket error on ${ctx.url}:`, event)
    }
  })
)

await router.serve(8000)
```

## Client-Side Usage

Connect from a browser using the native WebSocket API:

```typescript
const socket = new WebSocket('ws://localhost:8000/ws')

socket.addEventListener('open', () => {
  console.log('Connected!')
  socket.send(JSON.stringify({
    type: 'message',
    text: 'Hello!'
  }))
})

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
})

socket.addEventListener('close', () => {
  console.log('Disconnected')
})

socket.addEventListener('error', (error) => {
  console.error('Error:', error)
})
```

## WebSocket Properties

Access WebSocket properties in handlers:

```typescript
onConnect: (socket, ctx) => {
  console.log('URL:', socket.url)
  console.log('Protocol:', socket.protocol)
  console.log('State:', socket.readyState)
  // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
}
```

## Error Handling

The middleware throws an error if WebSocket upgrade fails:

```typescript
try {
  router.use(Mware.websocket({ listener: '/ws' }))
} catch (error) {
  console.error('WebSocket setup failed:', error)
}
```

## Integration with CORS

When using WebSocket with CORS-enabled clients:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

router.use(Mware.cors({ origin: '*' }))
router.use(Mware.websocket({ listener: '/ws' }))

await router.serve(8000)
```

CORS middleware handles HTTP requests, while WebSocket middleware handles WebSocket upgrades. Both work together seamlessly.

