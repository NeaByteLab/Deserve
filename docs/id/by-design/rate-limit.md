---
description: "Kenapa Deserve tidak punya rate limiter bawaan, dan cara menyusunnya dari middleware global dan Context."
---

# Rate Limiting

Deserve tidak membawa rate limiter, dan itu pilihan ketimbang fitur yang hilang.

## Kenapa Tidak Dibawa

Rate limiting terlihat seperti satu fitur, tapi setiap tim mau bentuk berbeda. Satu proyek menghitung per IP, lain per API key, lain per user ID setelah login. Satu menyimpan penghitung di memori, lain di [Redis](https://redis.io/), lain di database yang sudah melacak penggunaan untuk penagihan. Jendelanya bisa tetap, geser, atau token bucket, dan response saat diblokir bisa `429`, redirect, atau pembuangan diam.

Satu jawaban bawaan akan cocok dengan satu selera dan melawan setiap selera lain. Jadi keputusannya adalah menyingkir. Deserve sudah memaparkan siklus hidup request penuh lewat [middleware global](/id/middleware/global) dan [objek Context](/id/core-concepts/context-object), dan sebuah limiter adalah komposisi kecil di atas bagian itu. Framework menyerahkan hook-nya, dan aturannya tinggal di tempatnya, di tangan developer.

## Bagian yang Sudah Ada

Sebuah limiter butuh empat hal, dan masing-masing sudah ada:

- **Kunci per klien** - baca `ctx.get.ip()` untuk IP pengunjung yang diresolusi, atau `ctx.get.header('x-api-key')` untuk API key. Lihat [`ctx.get.ip()`](/id/core-concepts/context-object#ctx-get-ip-options).
- **Tempat berjalan lebih awal** - [middleware global](/id/middleware/global) berjalan sebelum setiap route handler dan bisa menghentikan request dengan mengembalikan `Response`.
- **Cara memblokir** - kembalikan `ctx.send.text(...)` atau `ctx.send.json(...)` dengan status `429` untuk mengakhiri request di situ.
- **Cara memberitahu** - `ctx.set.header(...)` menambah header rate limit standar supaya klien bisa mundur.

## Limiter Fixed Window

Middleware ini menghitung request per IP dalam jendela waktu tetap. Ketika hitungannya melewati batas, request berhenti dengan `429`.

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Atur jendela dan batasnya
const windowMs = 60_000
const maxRequests = 100

// Lacak hitungan dan waktu reset per kunci
const hits = new Map<string, { count: number, resetAt: number }>()

router.use(async (ctx, next) => {
  // Pilih kunci klien
  const key = ctx.get.ip() ?? 'unknown'
  const now = Date.now()
  const entry = hits.get(key)

  // Jendela baru saat hilang atau kedaluwarsa
  if (!entry || now > entry.resetAt) {
    hits.set(key, {
      count: 1,
      resetAt: now + windowMs
    })
    return await next()
  }

  // Dalam jendela, hitung hit ini
  entry.count++

  // Lewat batas, blokir dengan 429
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    ctx.set.header('Retry-After', String(retryAfter))
    return ctx.send.text(
      'Too Many Requests',
      {
        status: 429
      }
    )
  }

  // Masih di bawah batas, lanjut
  return await next()
})

await router.serve(8000)
```

`Map` tinggal di memori, jadi hitungannya reset saat proses restart dan tak dibagi lintas banyak instance. Untuk satu server itu cukup. Untuk armada, ganti `Map` dengan store bersama seperti Redis dan pertahankan sisa bentuknya.

## Memberi Tahu Klien Sisa Kuotanya

Klien berperilaku lebih baik ketika bisa melihat anggarannya. Header standar melaporkan batas, sisa hit, dan kapan jendela reset. Atur di setiap response, bukan hanya saat diblokir.

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
const windowMs = 60_000
const maxRequests = 100
const hits = new Map<string, { count: number, resetAt: number }>()
// ---cut---
router.use(async (ctx, next) => {
  const key = ctx.get.ip() ?? 'unknown'
  const now = Date.now()
  let entry = hits.get(key)

  // Mulai jendela baru saat diperlukan
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + windowMs
    }
    hits.set(key, entry)
  }

  entry.count++
  const remaining = Math.max(0, maxRequests - entry.count)

  // Laporkan anggaran di setiap response
  ctx.set.headers({
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000))
  })

  // Blokir begitu batas dilewati
  if (entry.count > maxRequests) {
    return ctx.send.json(
      {
        error: 'Too Many Requests'
      },
      {
        status: 429
      }
    )
  }

  return await next()
})
```

## Membatasi Hanya Sebagian Rute

Form login butuh batas lebih ketat ketimbang halaman publik. Middleware per-path menerapkan aturan ke satu prefix dan membiarkan sisanya tak tersentuh.

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
declare function isOverLimit(key: string): boolean
// ---cut---
// Jaga hanya rute auth
router.use('/auth', async (ctx, next) => {
  const key = ctx.get.ip() ?? 'unknown'
  if (isOverLimit(key)) {
    return ctx.send.json(
      {
        error: 'Slow down'
      },
      {
        status: 429
      }
    )
  }
  return await next()
})
```

Ini bentuk per-path yang sama dibahas di [middleware global](/id/middleware/global#middleware-per-path), kini membawa batas alih-alih pengecekan auth.

## Membentuk Response Blokir

Contoh di atas mengembalikan `429` langsung dari middleware. Untuk mengarahkan setiap blokir lewat satu tempat, lempar di dalam [`Wrap.apply`](/id/middleware/global#membungkus-middleware-dengan-penanganan-error) dan bentuk balasannya dengan [`router.catch()`](/id/error-handling/object-details). Itu memisahkan aturan batas dan format error, yang membantu saat beberapa middleware berbagi satu gaya response.

## Mengamati Limiter Bekerja

Limiter memblokir request, dan [event observability](/id/middleware/observability/overview) melaporkan apa yang terjadi. Sebuah request yang diblokir selesai dengan status `429`, jadi ia tiba sebagai event `request:failed`. Berlangganan sekali untuk menghitung blokir atau melacak kunci mana yang menyentuh batas.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.on((event) => {
  // Catat setiap request yang diblokir
  if (event.kind === 'request:failed' && event.metadata.statusCode === 429) {
    console.log('Rate limited:', event.metadata.ip, event.metadata.url)
  }
})
```

Lihat [Referensi Event](/id/middleware/observability/events#request) untuk metadata lengkap pada event request.
