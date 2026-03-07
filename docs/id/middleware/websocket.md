# Middleware WebSocket

> **Referensi**: [Dokumentasi Deno upgradeWebSocket API](https://docs.deno.com/api/deno/~/Deno.upgradeWebSocket)

Middleware WebSocket menangani upgrade koneksi WebSocket, memungkinkan komunikasi dua arah real-time antara klien dan server.

## Penggunaan Dasar

Terapkan middleware WebSocket menggunakan middleware built-in Deserve:

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Upgrade request ke WebSocket di path /ws; onConnect kirim welcome
router.use(
  Mware.websocket({
    listener: '/ws',
    onConnect: (socket, ctx) => {
      console.log('WebSocket terhubung:', ctx.url)
      socket.send('Selamat datang!')
    }
  })
)

// 4. Jalankan server
await router.serve(8000)
```

## Opsi WebSocket

### `listener`

Tentukan prefix path untuk upgrade WebSocket:

```typescript
listener: '/ws' // Cocok dengan /ws, /ws/chat, /ws/room/123, dll.
listener: '/api/ws' // Cocok dengan /api/ws, /api/ws/data, dll.
```

**Penting:** Middleware hanya akan mengupgrade request yang:

- Memiliki header `Upgrade: websocket`
- Path dimulai dengan nilai `listener`

### `onConnect`

Menangani koneksi WebSocket baru:

```typescript
onConnect: (socket: WebSocket, ctx: Context) => {
  console.log('Klien terhubung:', ctx.url)
  socket.send(JSON.stringify({ type: 'welcome', message: 'Terhubung!' }))
}
```

### `onMessage`

Menangani pesan WebSocket yang masuk:

```typescript
onMessage: (socket: WebSocket, event: MessageEvent, ctx: Context) => {
  console.log('Diterima:', event.data)
  try {
    const data = JSON.parse(event.data as string)
    socket.send(JSON.stringify({ echo: data }))
  } catch {
    socket.send(JSON.stringify({ error: 'JSON tidak valid' }))
  }
}
```

### `onDisconnect`

Menangani pemutusan koneksi WebSocket:

```typescript
onDisconnect: (socket: WebSocket, ctx: Context) => {
  console.log('Klien terputus:', ctx.url)
  // Bersihkan resource, hapus dari room, dll.
}
```

### `onError`

Menangani error WebSocket:

```typescript
onError: (socket: WebSocket, event: Event, ctx: Context) => {
  console.error('Error WebSocket:', event, 'pada', ctx.url)
}
```

## Contoh Lengkap

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router({ routesDir: './routes' })

// 3. Pasang WebSocket: listener path + lifecycle hooks
router.use(
  Mware.websocket({
    listener: '/ws',
    onConnect: (socket, ctx) => {
      console.log(`WebSocket terhubung: ${ctx.url}`)
      socket.send(
        JSON.stringify({
          type: 'welcome',
          message: 'Terhubung ke server WebSocket Deserve!'
        })
      )
    },
    onMessage: (socket, event, ctx) => {
      console.log(`Pesan dari ${ctx.url}:`, event.data)
      try {
        const data = JSON.parse(event.data as string)
        if (data.type === 'ping') {
          socket.send(
            JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            })
          )
        } else {
          socket.send(
            JSON.stringify({
              type: 'echo',
              original: data,
              timestamp: Date.now()
            })
          )
        }
      } catch {
        socket.send(
          JSON.stringify({
            type: 'error',
            message: 'JSON tidak valid'
          })
        )
      }
    },
    onDisconnect: (socket, ctx) => {
      console.log(`WebSocket terputus: ${ctx.url}`)
    },
    onError: (socket, event, ctx) => {
      console.error(`Error WebSocket pada ${ctx.url}:`, event)
    }
  })
)

// 4. Jalankan server
await router.serve(8000)
```

## Penggunaan Di Sisi Klien

Hubungkan dari browser menggunakan WebSocket API native:

```typescript
// 1. Buka koneksi ke path listener
const socket = new WebSocket('ws://localhost:8000/ws')

socket.addEventListener('open', () => {
  console.log('Terhubung!')
  socket.send(
    JSON.stringify({
      type: 'message',
      text: 'Halo!'
    })
  )
})

socket.addEventListener('message', event => {
  const data = JSON.parse(event.data)
  console.log('Diterima:', data)
})

socket.addEventListener('close', () => {
  console.log('Terputus')
})

socket.addEventListener('error', error => {
  console.error('Error:', error)
})
```

## Properti Objek WebSocket

Akses properti WebSocket di handler:

```typescript
onConnect: (socket, ctx) => {
  console.log('URL:', socket.url)
  console.log('Protocol:', socket.protocol)
  console.log('State:', socket.readyState)
  // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
}
```

## Penanganan Error

Middleware akan melempar error jika upgrade WebSocket gagal:

```typescript
try {
  router.use(Mware.websocket({ listener: '/ws' }))
} catch (error) {
  console.error('Setup WebSocket gagal:', error)
}
```

## Integrasi Dengan CORS

Saat menggunakan WebSocket dengan klien yang mengaktifkan CORS:

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. CORS dulu (preflight), lalu WebSocket
router.use(Mware.cors({ origin: '*' }))
router.use(Mware.websocket({ listener: '/ws' }))

// 4. Jalankan server
await router.serve(8000)
```

Middleware CORS menangani HTTP request, sementara middleware WebSocket menangani upgrade WebSocket. Keduanya bekerja bersama dengan mulus.
