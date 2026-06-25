import { assertEquals } from '@std/assert'
import type * as Types from '@interfaces/index.ts'
import * as Routing from '@routing/index.ts'
import * as Middleware from '@middleware/index.ts'

function freePort(): number {
  const listener = Deno.listen({ port: 0, hostname: '127.0.0.1' })
  const port = (listener.addr as Deno.NetAddr).port
  listener.close()
  return port
}

async function startServer(mw: Types.MiddlewareFn): Promise<{
  port: number
  stop: () => Promise<void>
}> {
  const router = new Routing.Router()
  router.use(mw)
  const listening = Promise.withResolvers<void>()
  router.on((event) => {
    if (event.kind === 'server:started') {
      listening.resolve()
    }
  })
  const port = freePort()
  const controller = new AbortController()
  const serving = router.serve(port, '127.0.0.1', controller.signal)
  await listening.promise
  return {
    port,
    stop: async () => {
      controller.abort()
      await serving
    }
  }
}

Deno.test('websocket echoes messages through the message callback', async () => {
  const server = await startServer(
    Middleware.Mware.websocket({
      listener: '/ws',
      onMessage: (socket, event) => {
        socket.send(`echo ${event.data as string}`)
      }
    })
  )
  const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`)
  const reply = Promise.withResolvers<string>()
  socket.addEventListener('open', () => {
    socket.send('hello')
  })
  socket.addEventListener('message', (event) => {
    reply.resolve(event.data as string)
  })
  assertEquals(await reply.promise, 'echo hello')
  const closed = Promise.withResolvers<void>()
  socket.addEventListener('close', () => {
    closed.resolve()
  })
  socket.close()
  await closed.promise
  await server.stop()
})

Deno.test('websocket passes a non-matching path through to the route chain', async () => {
  const server = await startServer(Middleware.Mware.websocket({ listener: '/ws' }))
  const response = await fetch(`http://127.0.0.1:${server.port}/health`, {
    signal: AbortSignal.timeout(5000)
  })
  await response.body?.cancel()
  assertEquals(response.status, 404)
  await server.stop()
})

Deno.test('websocket reports disconnect with a CloseEvent', async () => {
  const disconnected = Promise.withResolvers<CloseEvent>()
  const server = await startServer(
    Middleware.Mware.websocket({
      listener: '/ws',
      onDisconnect: (_socket, event) => {
        disconnected.resolve(event)
      }
    })
  )
  const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`)
  socket.addEventListener('open', () => {
    socket.close(1000, 'done')
  })
  const closeEvent = await disconnected.promise
  assertEquals(closeEvent.code, 1000)
  assertEquals(closeEvent.reason, 'done')
  await server.stop()
})

Deno.test('websocket returns 400 for a live missing Sec-WebSocket-Version', async () => {
  const server = await startServer(
    Middleware.Mware.websocket({ listener: '/ws', allowedOrigins: '*' })
  )
  const response = await fetch(`http://127.0.0.1:${server.port}/ws`, {
    headers: {
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      Origin: 'http://127.0.0.1'
    },
    signal: AbortSignal.timeout(5000)
  })
  await response.body?.cancel()
  assertEquals(response.status, 400)
  await server.stop()
})

Deno.test('websocket returns 403 for a live cross-origin handshake', async () => {
  const server = await startServer(Middleware.Mware.websocket({ listener: '/ws' }))
  const response = await fetch(`http://127.0.0.1:${server.port}/ws`, {
    headers: {
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      'Sec-WebSocket-Key': '************************',
      'Sec-WebSocket-Version': '13',
      Origin: 'https://external.example'
    },
    signal: AbortSignal.timeout(5000)
  })
  await response.body?.cancel()
  assertEquals(response.status, 403)
  await server.stop()
})

Deno.test('websocket returns 426 for a live wrong Sec-WebSocket-Version', async () => {
  const server = await startServer(
    Middleware.Mware.websocket({ listener: '/ws', allowedOrigins: '*' })
  )
  const response = await fetch(`http://127.0.0.1:${server.port}/ws`, {
    headers: {
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'Sec-WebSocket-Version': '12',
      Origin: 'http://127.0.0.1'
    },
    signal: AbortSignal.timeout(5000)
  })
  await response.body?.cancel()
  assertEquals(response.status, 426)
  assertEquals(response.headers.get('sec-websocket-version'), '13')
  assertEquals(response.headers.get('upgrade'), 'websocket')
  await server.stop()
})

Deno.test('websocket upgrades a live handshake and runs the connect callback', async () => {
  const connected = Promise.withResolvers<void>()
  const server = await startServer(
    Middleware.Mware.websocket({
      listener: '/ws',
      onConnect: (socket) => {
        socket.send('welcome')
        connected.resolve()
      }
    })
  )
  const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`)
  const firstMessage = Promise.withResolvers<string>()
  socket.addEventListener('message', (event) => {
    firstMessage.resolve(event.data as string)
  })
  await connected.promise
  assertEquals(await firstMessage.promise, 'welcome')
  const closed = Promise.withResolvers<void>()
  socket.addEventListener('close', () => {
    closed.resolve()
  })
  socket.close()
  await closed.promise
  await server.stop()
})
