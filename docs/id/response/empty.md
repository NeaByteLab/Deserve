---
description: "Kirim response kosong dengan ctx.send.empty() untuk status code tanpa konten."
---

# Response Kosong

Method `ctx.send.empty()` mengirim response tanpa body. Method ini cocok untuk status code seperti `204 No Content` di mana response tidak membawa apa pun selain status.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function DELETE(ctx: Context): Response {
  // 204 No Content, body kosong
  return ctx.send.empty(204)
}
```

## Tanpa Status

Panggil `ctx.send.empty()` tanpa argumen untuk mengirim body kosong dengan status default:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Body kosong, status default
  return ctx.send.empty()
}
```

## Dengan Header

Header yang diatur lewat `ctx.set.header()` tetap digabung ke response kosong:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function DELETE(ctx: Context): Response {
  // Atur header sebelum kirim
  ctx.set.header('X-Deleted-Resource', 'true')
  // 204 dengan header terpasang
  return ctx.send.empty(204)
}
```

## Status Code Body Null

Status code `101`, `204`, `205`, dan `304` selalu mengirim body null terlepas dari helper `ctx.send` mana yang dipakai. Memberikan salah satunya ke `ctx.send.json()` atau `ctx.send.text()` juga membuang body dan header `Content-Type`. `ctx.send.empty()` membuat maksud itu eksplisit.

## Tanda Tangan Method

```typescript
ctx.send.empty(status?: HttpStatusCode): Response
```

- **status** - status code HTTP opsional, default `200`
