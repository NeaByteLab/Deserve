---
description: "Upgrade request menjadi koneksi WebSocket dengan callback siklus hidup di Deserve."
---

# Middleware WebSocket

> **Referensi**: [Dokumentasi API Deno upgradeWebSocket](https://docs.deno.com/api/deno/~/Deno.upgradeWebSocket)

Middleware WebSocket menangani upgrade koneksi WebSocket, memungkinkan komunikasi dua arah real-time antara klien dan server.

## Penggunaan Dasar

Terapkan middleware WebSocket memakai middleware bawaan Deserve:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Upgrade /ws dan sapa saat connect
router.use(
  Mware.websocket({
    listener: '/ws',
    onConnect: (socket, event, ctx) => {
      console.log('WebSocket connected:', ctx.url)
      socket.send('Welcome')
    }
  })
)

await router.serve(8000)
```

## Opsi WebSocket

### `listener`

Tentukan prefix path untuk upgrade WebSocket:

```typescript
listener: '/ws' // Cocok /ws, /ws/chat, /ws/room/123
listener: '/api/ws' // Cocok /api/ws, /api/ws/data
```

Pencocokan sadar-batas, jadi path harus sama persis dengan `listener` atau berlanjut dengan `/`. Dengan `listener: '/ws'`, request ke `/ws` atau `/ws/chat` di-upgrade, tapi `/wsfoo` tidak. Garis miring di akhir `listener` dipangkas, jadi `/ws/` berperilaku sama dengan `/ws`. Mengatur `listener: '/'` mencocokkan setiap path.

**Penting:** Middleware hanya mengupgrade request yang:

- Membawa header `Upgrade: websocket`
- Memakai metode `GET`
- Cocok dengan path `listener` seperti dijelaskan di atas

Tanpa `listener`, middleware meneruskan setiap request dan tidak pernah mengupgrade.

### `allowedOrigins`

Kontrol origin handshake mana yang diterima, yang mencegah pembajakan WebSocket lintas situs:

```typescript
allowedOrigins: '*' // Terima origin apa pun
allowedOrigins: ['https://example.com', 'https://app.example.com'] // Allowlist
```

Saat `allowedOrigins` dibiarkan undefined, hanya handshake same-origin yang diterima, dan handshake tanpa header `Origin` diloloskan karena tidak ada kebijakan yang disetel. Begitu allowlist atau `'*'` dikonfigurasi, `Origin` yang hilang langsung ditolak dan upgrade dibatalkan, yang menutup celah di mana header yang sekadar dihilangkan bisa lolos dari kebijakan. Origin yang ditolak mengembalikan **403 Forbidden**.

### `onConnect`

Menangani koneksi WebSocket baru:

```typescript
onConnect: (socket: WebSocket, event: Event, ctx: Context) => {
  console.log('Client connected:', ctx.url)
  socket.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected'
  }))
}
```

### `onMessage`

Menangani pesan WebSocket masuk:

```typescript
onMessage: (socket: WebSocket, event: MessageEvent, ctx: Context) => {
  console.log('Received:', event.data)
  try {
    const data = JSON.parse(event.data as string)
    socket.send(JSON.stringify({
      echo: data
    }))
  } catch {
    socket.send(JSON.stringify({
      error: 'Invalid JSON'
    }))
  }
}
```

### `onDisconnect`

Menangani pemutusan koneksi WebSocket. `CloseEvent` menyediakan `code`, `reason`, dan `wasClean`:

```typescript
onDisconnect: (socket: WebSocket, event: CloseEvent, ctx: Context) => {
  console.log('Client disconnected:', event.code, event.reason, event.wasClean)
}
```

### `onError`

Menangani error WebSocket:

```typescript
onError: (socket: WebSocket, event: Event, ctx: Context) => {
  console.error('WebSocket error:', event, 'on', ctx.url)
}
```

## Contoh Lengkap

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

router.use(
  Mware.websocket({
    listener: '/ws',
    onConnect: (socket, event, ctx) => {
      console.log(`WebSocket connected: ${ctx.url}`)
      socket.send(
        JSON.stringify({
          type: 'welcome',
          message: 'Connected to Deserve WebSocket server'
        })
      )
    },
    onMessage: (socket, event, ctx) => {
      console.log(`Message from ${ctx.url}:`, event.data)
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
            message: 'Invalid JSON'
          })
        )
      }
    },
    onDisconnect: (socket, event, ctx) => {
      console.log(`WebSocket disconnected: ${ctx.url} code=${event.code} reason=${event.reason}`)
    },
    onError: (socket, event, ctx) => {
      console.error(`WebSocket error on ${ctx.url}:`, event)
    }
  })
)

await router.serve(8000)
```

## Penggunaan Sisi Klien

Hubungkan dari browser dengan WebSocket API native:

```typescript twoslash
const socket = new WebSocket('ws://localhost:8000/ws')

socket.addEventListener('open', () => {
  console.log('Connected')
  socket.send(
    JSON.stringify({
      type: 'message',
      text: 'Hello'
    })
  )
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

## Properti WebSocket

Akses properti WebSocket di dalam handler:

```typescript
onConnect: (socket, event, ctx) => {
  console.log('URL:', socket.url)
  console.log('Protocol:', socket.protocol)
  console.log('State:', socket.readyState)
  // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
}
```

## Penanganan Error

Handshake yang ditolak diarahkan lewat error handler alih-alih melempar saat setup:

- **Origin tidak diizinkan** gagal dengan **403** dan pesan `WebSocket handshake rejected because the Origin is not allowed`.
- **Upgrade tidak valid** gagal dengan **400** dan pesan `WebSocket handshake is malformed because ...`.

Keduanya dialirkan ke [error handler terpusat](/id/error-handling/object-details), jadi bentuk response di sana atau andalkan [perilaku default](/id/error-handling/default-behavior).

## Integrasi Dengan CORS

WebSocket berpasangan dengan klien ber-CORS seperti ini:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// CORS menangani HTTP, WebSocket menangani upgrade
router.use(Mware.cors({
  origin: '*'
}))
router.use(Mware.websocket({
  listener: '/ws'
}))

await router.serve(8000)
```

Middleware CORS menangani HTTP request, sementara middleware WebSocket menangani upgrade, dan keduanya berjalan bersama tanpa konflik.
