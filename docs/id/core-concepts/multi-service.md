---
description: "Menjalankan beberapa service Deserve berdampingan dalam satu proses Deno."
---

# Multi-Service

Deserve menjalankan beberapa server dari satu proses Deno. Setiap `Router` adalah server mandiri dengan rute, middleware, file watcher, dan port miliknya sendiri. Masing-masing terisolasi di tingkat request, jadi kesalahan di satu tidak pernah merembet ke yang lain, namun keduanya berbagi memori proses yang sama, yang membuat mereka bisa berbagi kode, state, dan infrastruktur tanpa overhead jaringan.

Secara tradisional, menjalankan 5 service berarti 5 proses, 5 deployment, dan 5 salinan kode bersama. Dengan Deserve, satu `main.ts` menjalankan sebanyak router yang muat di memori, dan masing-masing listen di port sendiri serta memantau direktorinya sendiri, sementara kesalahan di satu tetap terkurung alih-alih menjatuhkan sisanya.

![Satu proses Deno menjalankan router API, Auth, dan Web, masing-masing di port sendiri dengan satu klien terhubung ke tiap port](/diagrams/process-overview.png)

## Setup Dasar

Satu `Router` per service, satu port per router, satu `Promise.all` untuk menjalankan semuanya:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Satu Router per service
const api = new Router({ routesDir: './services/api/routes' })
const auth = new Router({ routesDir: './services/auth/routes' })
const web = new Router({
  routesDir: './services/web/routes',
  viewsDir: './services/web/views'
})

// Jalankan setiap service bersama
await Promise.all([
  api.serve(3001),
  auth.serve(3002),
  web.serve(3003)
])
```

Itu seluruh entry point-nya.

## Isolasi Router

Setiap `Router` berjalan dalam isolasi tingkat request. Masing-masing punya radix-tree router, middleware stack, instance Superwatcher, dan template engine opsional sendiri. Mereka tidak berbagi state internal kecuali dihubungkan secara eksplisit, sementara proses di bawahnya tetap dibagi, dan itulah yang membuat [berbagi kode dan state](#berbagi-kode-dan-state) di bawah ini bisa dilakukan.

Kesalahan terkurung di dua tingkat. Sebuah throw di dalam satu handler menjadi error response untuk satu request itu, jadi sisa service itu dan setiap service lain tetap melayani. Kesalahan yang lebih dalam yang lolos dari handler, seperti unhandled rejection atau upaya keluar dari proses, dijebak di seluruh proses oleh [proteksi proses](/id/getting-started/server-configuration#proteksi-proses) dan dimunculkan sebagai event alih-alih shutdown, jadi tidak ada service yang mati.

![Setiap router punya FastRouter, middleware, dan watcher sendiri secara terisolasi, dengan router Web juga memegang DVE engine](/diagrams/router-isolation.png)

Jika sebuah rute di API melempar, hanya request itu yang mendapat 500. Auth dan Web, serta setiap request API lain, tetap melayani normal.

## Struktur Direktori

Setiap service mengikuti konvensi folder yang sama. Anggota tim baru melihat layout ini dan langsung tahu di mana rute, view, dan kode bersama berada. Tanpa menebak, tanpa konvensi khusus proyek untuk dipelajari.

```
project/
├── main.ts
├── shared/
│   ├── utils.ts
│   ├── sessions.ts
│   ├── bus.ts
│   ├── cache.ts
│   ├── logger.ts
│   └── errors.ts
└── services/
    ├── api/
    │   └── routes/
    │       ├── health.ts          # GET  :3001/health
    │       ├── me.ts              # GET  :3001/me
    │       └── users/
    │           ├── index.ts       # GET  :3001/users
    │           └── [id].ts        # GET  :3001/users/:id
    ├── auth/
    │   └── routes/
    │       ├── login.ts           # POST :3002/login
    │       ├── logout.ts          # POST :3002/logout
    │       └── verify.ts          # GET  :3002/verify
    └── web/
        ├── routes/
        │   └── index.ts           # GET  :3003/
        └── views/
            └── home.dve
```

- Rute disimpan di `services/<nama>/routes/`
- Kode bersama disimpan di `shared/`
- `main.ts` menghubungkan semuanya

## Berbagi Kode dan State

Berbagi satu proses adalah tempat model multi-service membayar. Alih-alih Redis, HTTP call, atau message broker, service berbagi state lewat object biasa di memori secepat pemanggilan fungsi.

![Service mengimpor modul shared dan berkomunikasi lewat session store, event bus, dan cache dalam proses](/diagrams/shared-code-state.png)

### Modul Bersama

Fungsi utilitas, koneksi database, konfigurasi, skema validasi - tulis sekali di `shared/`, impor dari service mana pun:

```typescript twoslash
// shared/utils.ts
// Helper dan konstanta bersama
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!
}

export const APP_NAME = 'MyApp'
```

```typescript
// services/api/routes/index.ts
// Impor kode bersama, tanpa lompatan HTTP
import type { Context } from '@neabyte/deserve'
import { APP_NAME } from '../../../shared/utils.ts'

// Pakai konstanta bersama di sini
export function GET(ctx: Context): Response {
  return ctx.send.json({
    app: APP_NAME,
    service: 'api'
  })
}
```

### Session Store

Satu `Map` berfungsi sebagai session store untuk semua service. Auth menulis session saat login, API membacanya untuk autentikasi request. Tanpa Redis, tanpa HTTP call antar service:

```typescript twoslash
// shared/sessions.ts
// Store in-memory yang dibagi antar service
export const sessions = new Map<string, Record<string, unknown>>()
```

```typescript
// services/auth/routes/login.ts
import type { Context } from '@neabyte/deserve'
import { sessions } from '../../../shared/sessions.ts'

// Auth menyimpan session saat login
export async function POST(ctx: Context): Promise<Response> {
  const body = (await ctx.json()) as { username?: string }
  const id = crypto.randomUUID()
  sessions.set(id, {
    username: body?.username,
    loggedInAt: Date.now()
  })
  return ctx.send.json({ sessionId: id })
}
```

```typescript
// services/api/routes/me.ts
import type { Context } from '@neabyte/deserve'
import { sessions } from '../../../shared/sessions.ts'

// API membaca store yang sama langsung
export function GET(ctx: Context): Response {
  const id = ctx.header('x-session-id')
  const session = id ? sessions.get(id) : undefined
  if (!session) {
    return ctx.send.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return ctx.send.json({ user: session })
}
```

### Event Bus

Ketika API membuat user, Auth dan Web bisa mengetahuinya seketika, tanpa message queue dan tanpa polling, hanya pemanggilan fungsi langsung antar service. Bus ini membawa fakta aplikasi seperti `user:created`. Untuk aktivitas framework seperti request, rute, dan kesalahan, pakai [observability events](/id/middleware/observability/overview) bawaan sebagai gantinya.

![Service API memancarkan event ke EventBus, yang memberi tahu service Auth dan Web](/diagrams/event-bus.png)

```typescript twoslash
// shared/bus.ts
// Event bus in-process minimal
type Listener = (...args: unknown[]) => void
const listeners = new Map<string, Set<Listener>>()

export function emit(event: string, ...args: unknown[]): void {
  for (const fn of listeners.get(event) ?? []) {
    fn(...args)
  }
}

export function on(event: string, fn: Listener): void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }
  listeners.get(event)!.add(fn)
}
```

```typescript
// services/api/routes/users/index.ts
import type { Context } from '@neabyte/deserve'
import { emit } from '../../../../shared/bus.ts'

// Pancarkan event setelah membuat user
export async function POST(ctx: Context): Promise<Response> {
  const user = await ctx.json()
  emit('user:created', user)
  return ctx.send.json({ created: true })
}
```

Service mana pun bisa listen dengan `on('user:created', ...)` di `main.ts` atau di dalam rutenya sendiri.

### Cache

`Map` bersama dengan TTL menghilangkan pekerjaan duplikat. API menghitung dan menyimpan cache, Web membaca hasil yang di-cache. Tanpa biaya jaringan:

```typescript twoslash
// shared/cache.ts
// Cache bersama dengan kedaluwarsa per entri
const store = new Map<string, { value: unknown; expires: number }>()

export function get<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry || entry.expires < Date.now()) {
    store.delete(key)
    return undefined
  }
  return entry.value as T
}

export function set(key: string, value: unknown, ttlMs: number): void {
  store.set(key, {
    value,
    expires: Date.now() + ttlMs
  })
}
```

### HTTP Antar Service

Ketika satu service perlu memanggil endpoint HTTP service lain (bukan hanya kode bersama), pakai `fetch`. Kedua service berada di proses yang sama, jadi panggilan tetap di localhost:

```typescript twoslash
// services/web/routes/dashboard.ts
import type { Context } from '@neabyte/deserve'

// Panggil service API, lalu render template
export async function GET(ctx: Context): Promise<Response> {
  const users = await fetch('http://localhost:3001/users').then((r) => r.json())
  return await ctx.render('dashboard.dve', { users })
}
```

### Trade-off-nya

Shared state adalah fitur, bukan makan siang gratis. [Isolasi router](#isolasi-router) menjaga kesalahan di dalam satu service, namun `Map` bersama justru kebalikan dari isolasi secara desain, karena setiap service membaca dan menulis object yang sama. Satu service yang menulis data buruk ke store menyerahkan data buruk yang sama ke setiap pembaca lain, jadi keterikatan bergeser dari lapisan jaringan turun ke lapisan data. Kesalahan tetap terkurung, tapi data tidak. Jaga radius ledakan tetap kecil dengan membiarkan satu modul memiliki tiap store dan memvalidasi penulisan di tepinya, seperti `shared/sessions.ts` yang jadi satu-satunya pintu ke session map. Raih shared state saat kecepatan penting dan service memang seharusnya bersama, dan kembali ke [HTTP antar service](#http-antar-service) saat batas yang lebih bersih sepadan dengan lompatannya.

## Middleware

Setiap router punya middleware stack sendiri, jadi service dikonfigurasi independen dengan middleware berbeda masing-masing, atau berbagi middleware yang sama di semua. Di sinilah model satu-proses membayar, karena satu logger, satu error handler, dan satu auth check berlaku di mana pun dibutuhkan. Mekanik mendaftarkan middleware ada di [Global Middleware](/id/middleware/global) dan [Route-specific Middleware](/id/middleware/route-specific), dan bagian ini fokus pada menerapkannya di banyak service.

### Konfigurasi Per Service

Satu service bisa punya CORS dan body limit, yang lain bisa punya security headers, dan yang ketiga bisa berjalan tanpa middleware sama sekali:

![Setiap service menyusun rantai middleware sendiri sebelum rutenya: API menjalankan CORS lalu BodyLimit, Auth menjalankan SecHeaders, Web menjalankan rute dengan DVE](/diagrams/per-service-middleware.png)

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

// API mendapat CORS dan body limit
const api = new Router({ routesDir: './services/api/routes' })
api.use(Mware.cors({ origin: '*' }))
api.use(Mware.bodyLimit({ limit: 5 * 1024 * 1024 }))

// Auth mendapat security headers
const auth = new Router({ routesDir: './services/auth/routes' })
auth.use(Mware.securityHeaders({ xFrameOptions: 'DENY' }))

// Web berjalan tanpa middleware
const web = new Router({
  routesDir: './services/web/routes',
  viewsDir: './services/web/views'
})

// Jalankan setiap service bersama
await Promise.all([
  api.serve(3001),
  auth.serve(3002),
  web.serve(3003)
])
```

### Logger Bersama

Tulis satu logger, terapkan ke setiap service. Semua request dari semua port mengalir lewat fungsi yang sama, ditandai dengan nama service. Satu console, satu format, satu tempat untuk dicari saat ada yang salah:

```typescript twoslash
// shared/logger.ts
// Satu logger dipakai ulang oleh setiap service
import type { MiddlewareFn } from '@neabyte/deserve'

export function logger(service: string): MiddlewareFn {
  return async (ctx, next) => {
    const start = Date.now()
    const response = await next()
    const duration = Date.now() - start
    const status = response?.status ?? 0
    console.log(`[${service}] ${ctx.request.method} ${ctx.pathname} ${status} ${duration}ms`)
    return response
  }
}
```

Output dari semua service dalam satu stream:

```
[API]  GET  /users     200 3ms
[Auth] POST /login     200 12ms
[Web]  GET  /          200 5ms
[API]  GET  /users/99  404 1ms
```

### Error Handler Bersama

Satu error handler berlaku dengan [`router.catch()`](/id/error-handling/object-details), jadi setiap error yang dilempar, 404, atau 500 di semua service menghasilkan bentuk error yang sama, dan response tetap dapat ditebak terlepas dari service mana yang mengembalikannya:

```typescript twoslash
// shared/errors.ts
// Satu bentuk error handler untuk semua
import type { Context, ErrorInfo, ErrorMiddleware } from '@neabyte/deserve'

export function errorHandler(service: string): ErrorMiddleware {
  return (ctx: Context, error: ErrorInfo): Response | null => {
    console.error(
      `[${service}] ${error.method} ${error.pathname} ${error.statusCode} - ${error.error?.message}`
    )
    return ctx.send.json(
      {
        service,
        error: error.error?.message ?? 'Unknown error',
        statusCode: error.statusCode,
        path: error.pathname
      },
      { status: error.statusCode }
    )
  }
}
```

### Membungkus Middleware dengan Label

`WrapMware` menandai middleware individual dengan label, jadi saat middleware itu melempar, log error menyertakan label dan menunjuk langsung middleware mana di service mana yang gagal. Signature dan perilaku dasarnya dibahas di [Global Middleware](/id/middleware/global#membungkus-middleware-dengan-penanganan-error), dan ia bertindak sebagai satu lapisan dalam [Defense in Depth](/id/error-handling/defense-in-depth):

```typescript
// main.ts
import { Router, WrapMware } from '@neabyte/deserve'
import { logger } from './shared/logger.ts'
import { errorHandler } from './shared/errors.ts'

// Beri label tiap middleware untuk log error
const apiAuth = WrapMware('APIAuth', async (ctx, next) => {
  if (!ctx.header('authorization')) {
    throw new Error('Missing API key')
  }
  return await next()
})

const authRateLimit = WrapMware('AuthRateLimit', async (ctx, next) => {
  // logika rate limit
  return await next()
})

const webCache = WrapMware('WebCache', async (ctx, next) => {
  // logika cache
  return await next()
})

// Sambungkan logger, middleware, error handler
const api = new Router({ routesDir: './services/api/routes' })
api.use(logger('API'))
api.use(apiAuth)
api.catch(errorHandler('API'))

const auth = new Router({ routesDir: './services/auth/routes' })
auth.use(logger('Auth'))
auth.use(authRateLimit)
auth.catch(errorHandler('Auth'))

const web = new Router({
  routesDir: './services/web/routes',
  viewsDir: './services/web/views'
})
web.use(logger('Web'))
web.use(webCache)
web.catch(errorHandler('Web'))

// Jalankan setiap service bersama
await Promise.all([
  api.serve(3001),
  auth.serve(3002),
  web.serve(3003)
])
```

Ketika `apiAuth` melempar, log terbaca `[API] GET /users 500 - APIAuth - Missing API key`. Ketika `authRateLimit` melempar, terbaca `[Auth] POST /login 500 - AuthRateLimit - Too many requests`. Nama service, rute, dan label middleware - semua dalam satu baris.

### OpenTelemetry

Karena setiap request sudah mengalir lewat middleware bersama, memasang OpenTelemetry mengikuti pola yang sama. Satu middleware OTel berlaku ke setiap service, jadi semua span dari semua port menuju satu collector, yang memberi distributed tracing, dashboard latensi, dan metrik error rate di seluruh sistem tanpa menginstrumentasi tiap service secara terpisah:

![Satu middleware OTel mengumpulkan span dari setiap service dan mengekspornya ke OTel Collector, lalu ke Jaeger, Grafana, atau Datadog](/diagrams/observability.png)

```typescript twoslash
// shared/otel.ts
// Satu middleware OTel untuk semua service
import type { MiddlewareFn } from '@neabyte/deserve'

export function otelMiddleware(service: string): MiddlewareFn {
  return async (ctx, next) => {
    const start = performance.now()
    const response = await next()
    const duration = performance.now() - start
    const status = response?.status ?? 0

    // Pancarkan span, ganti dengan OTel SDK
    console.log(JSON.stringify({
      traceId: crypto.randomUUID(),
      service,
      method: ctx.request.method,
      path: ctx.pathname,
      status,
      durationMs: Math.round(duration * 100) / 100,
      timestamp: new Date().toISOString()
    }))

    return response
  }
}
```

## Hot Reload

Setiap service punya file watcher sendiri, jadi menyimpan file me-reload hanya service yang memiliki direktori itu sementara service lain tetap melayani request tanpa gangguan. Untuk detail lengkap cara kerja hot reload, lihat [Hot Reload](/id/core-concepts/hot-reload).

- **Edit** `services/api/routes/users/index.ts` (hanya **:3001** yang reload rute)
- **Tambah** `services/auth/routes/reset.ts` (hanya **:3002** yang mendeteksi rute baru)
- **Edit** `services/web/views/home.dve` (hanya **:3003** yang membersihkan cache template)

Tim bisa bekerja di service berbeda pada saat bersamaan, dengan satu orang merefaktor rute API, yang lain memperbaiki logika Auth, dan yang ketiga memperbarui template Web, semua tanpa saling mengganggu.

## Deployment

### Docker

Semua service berjalan di satu container. Satu image, satu proses, semua port:

```dockerfile
FROM denoland/deno:2.7.0

WORKDIR /app
COPY . .

RUN deno cache main.ts

EXPOSE 3001 3002 3003
CMD ["deno", "run", "-A", "main.ts"]
```

### Reverse Proxy

Letakkan Nginx atau Caddy di depan untuk mengarahkan domain ke setiap port service:

![Reverse proxy seperti Nginx atau Caddy memetakan tiap hostname ke port per-service: api.example.com ke 3001, auth.example.com ke 3002, dan example.com ke 3003](/diagrams/reverse-proxy.png)

```nginx
# Service API
server {
    server_name api.example.com;
    location / { proxy_pass http://127.0.0.1:3001; }
}

# Service Auth
server {
    server_name auth.example.com;
    location / { proxy_pass http://127.0.0.1:3002; }
}

# Service Web
server {
    server_name example.com;
    location / { proxy_pass http://127.0.0.1:3003; }
}
```

## Scaling Out

Ketika sebuah service tumbuh melampaui monolit, ia diekstrak ke prosesnya sendiri. Salin foldernya, tambahkan `main.ts`, dan deploy secara independen. File rute tidak berubah, karena API `Router` sama baik satu service berjalan maupun sepuluh:

![Mengekstrak service dari satu proses menjadi proses API, Auth, dan Web yang terpisah](/diagrams/scaling-out.png)

- Salin `services/api/` ke repositori baru
- Tambahkan `main.ts` sendiri dengan satu `Router`
- Deploy secara independen

Mulai dengan semuanya dalam satu proses, dan pisahkan saat kebutuhannya muncul.
