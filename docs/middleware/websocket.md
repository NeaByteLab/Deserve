# WebSocket Middleware

> **Reference**: [Deno.upgradeWebSocket API Documentation](https://docs.deno.com/api/deno/~/Deno.upgradeWebSocket)

This middleware handles WebSocket upgrades and provides event handling for real-time communication with explicit path listeners and error management.

## Basic Usage

Apply WebSocket middleware using Deserve's built-in middleware:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Apply WebSocket with explicit listener path
router.apply([
  [
    'websocket',
    {
      listener: '/ws', // Matches /ws/* prefixes
      onConnect: (socket, req) => console.log('Client connected'),
      onMessage: (socket, event, req) => {
        if (event.data === 'ping') {
          socket.send('pong')
        }
      }
    }
  ]
])

router.serve(8000)
```

## Multiple WebSocket Endpoints

**⚠️ Important Limitation:** Deserve only processes the last WebSocket middleware pipeline. To support multiple endpoints, you must combine all WebSocket logic into a single middleware with path-based routing:

```typescript
router.apply([
  [
    'websocket',
    {
      listener: '/', // Matches /* prefixes, i.e. /ws/chat,  /api/ws, etc
      onConnect: (socket, req) => {
        const url = new URL(req.url)
        console.log(`WebSocket connected to ${url.pathname}!`)
        if (url.pathname === '/ws/chat') {
          socket.send(JSON.stringify({ type: 'connected', message: 'Welcome to chat!' }))
        } else if (url.pathname === '/ws/notifications') {
          socket.send(JSON.stringify({ type: 'connected', message: 'Notification service ready' }))
        } else if (url.pathname === '/api/ws') {
          socket.send(JSON.stringify({ type: 'api_ready' }))
        }
      },
      onMessage: (socket, event, req) => {
        const url = new URL(req.url)
        const data = JSON.parse(event.data)
        if (url.pathname === '/ws/chat') {
          // Handle chat messages
          if (data.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }))
          } else if (data.type === 'message') {
            socket.send(
              JSON.stringify({
                type: 'message',
                content: data.content,
                timestamp: new Date().toISOString(),
                user: data.user || 'anonymous'
              })
            )
          }
        } else if (url.pathname === '/ws/notifications') {
          // Handle notification subscriptions
          if (data.type === 'subscribe') {
            socket.send(
              JSON.stringify({
                type: 'subscribed',
                topic: data.topic,
                timestamp: new Date().toISOString()
              })
            )
          }
        } else if (url.pathname === '/api/ws') {
          // Handle API messages
          socket.send(
            JSON.stringify({
              type: 'api_response',
              data: data,
              timestamp: new Date().toISOString()
            })
          )
        }
      },
      onDisconnect: (socket, req) => {
        const url = new URL(req.url)
        console.log(`WebSocket disconnected from ${url.pathname}!`)
      }
    }
  ]
])
```

## WebSocket Options

### `listener` (Required)

Specify the path to listen for WebSocket upgrades:

```typescript
listener: '/ws' // Matches /ws and /ws/anything
listener: '/api/ws' // Matches /api/ws and /api/ws/anything
listener: '/ws/chat' // Matches /ws/chat and /ws/chat/anything
```

### `onConnect`

Handle new WebSocket connections:

```typescript
onConnect: (socket, req) => {
  console.log('New client connected')
  socket.send('Welcome to the server!')
}
```

### `onMessage`

Handle incoming WebSocket messages:

```typescript
onMessage: (socket, event, req) => {
  const data = JSON.parse(event.data)
  switch (data.type) {
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong' }))
      break
    case 'broadcast':
      // Broadcast to all connected clients
      break
  }
}
```

### `onDisconnect`

Handle WebSocket disconnections:

```typescript
onDisconnect: (socket, req) => {
  console.log('Client disconnected')
  // Clean up resources
}
```

### `onError`

Handle WebSocket errors:

```typescript
onError: (socket, event, req) => {
  console.error('WebSocket error:', event)
  // Handle error gracefully
}
```

## Client-Side Usage

Connect to WebSocket endpoints from JavaScript:

```javascript
// Connect to chat WebSocket
const chatSocket = new WebSocket('ws://localhost:8000/ws/chat')

// Handle connection open
chatSocket.onopen = () => {
  console.log('Connected to chat')
}

// Handle incoming messages
chatSocket.onmessage = event => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}

// Handle connection close
chatSocket.onclose = () => {
  console.log('Disconnected from chat')
}

// Send a message
chatSocket.send(
  JSON.stringify({
    type: 'chat',
    content: 'Hello, world!'
  })
)
```

## Best Practices

1. **Use explicit listeners** - Always specify the `listener` path for clarity
2. **Handle JSON parsing** - Wrap JSON.parse in try-catch blocks
3. **Validate message types** - Check message structure before processing
4. **Clean up resources** - Use `onDisconnect` to clean up connections
5. **Error handling** - Implement `onError` for graceful error handling
6. **Message validation** - Validate incoming message structure
7. **Connection limits** - Consider implementing connection limits for production

## Error Handling

WebSocket upgrade failures throw errors handled by Deserve's error middleware:

```typescript
// If WebSocket upgrade fails, the middleware throws an error
throw new Error(`WebSocket upgrade failed: ${errorMessage}`)
```

## Troubleshooting

### Common Issues

**WebSocket connection fails:**

- Check if `listener` path matches client connection URL
- Verify WebSocket upgrade headers are present
- Ensure server is running and accessible

**Messages not received:**

- Check `onMessage` handler implementation
- Verify JSON message format
- Check for errors in `onError` handler

**Connection drops unexpectedly:**

- Check network connectivity
- Implement proper `onError` handling
- Verify WebSocket protocol compatibility

**Multiple endpoints not working:**

- ⚠️ **Important:** Deserve WebSocket middleware processes only the LAST applied middleware
- Combine all WebSocket endpoints into a SINGLE middleware with path-based routing
- Use path-based routing with `url.pathname` to handle different endpoints
- Check for path conflicts in your routing logic

## Next Steps

- [Global Middleware](/middleware/global) - Cross-cutting functionality
- [Route-Specific Middleware](/middleware/route-specific) - Targeted middleware
- [CORS Middleware](/middleware/cors) - Cross-origin request handling
