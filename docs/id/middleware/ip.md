---
description: 'Batasi akses berdasarkan alamat IP memakai aturan whitelist dan blacklist dengan dukungan CIDR.'
---

# Middleware Pembatasan IP

Middleware pembatasan IP mengizinkan atau menolak request berdasarkan alamat IP klien yang diresolusi. Whitelist didahulukan, blacklist berjalan berikutnya, dan pemeriksaan gagal-aman dengan menolak request apa pun yang IP-nya tidak diketahui. Setiap aturan menerima alamat persis, rentang CIDR, atau wildcard `*`, dan baik IPv4 maupun IPv6 didukung.

## Penggunaan Dasar

Izinkan hanya alamat tepercaya dengan `Mware.ip()`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Izinkan hanya alamat terdaftar
router.use(
  Mware.ip({
    whitelist: ['127.0.0.1', '192.168.1.0/24']
  })
)

await router.serve(8000)
```

## Memblokir Alamat

Gunakan `blacklist` untuk menolak alamat tertentu sambil mengizinkan sisanya:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Tolak alamat terdaftar, izinkan lainnya
router.use(
  Mware.ip({
    blacklist: ['203.0.113.5', '198.51.100.0/24']
  })
)
```

## Format Aturan

Setiap entri di `whitelist` atau `blacklist` bisa berupa salah satu dari ini:

```typescript
// Alamat IPv4 atau IPv6 persis
'127.0.0.1'
'::1'

// Rentang CIDR
'10.0.0.0/8'
'fc00::/7'

// Wildcard, cocok dengan semua alamat
'*'
```

Aturan yang tidak valid melempar `Deno.errors.InvalidData` saat middleware dibuat.

## Opsi IP

| Opsi        | Default | Deskripsi                                     |
| ----------- | ------- | --------------------------------------------- |
| `whitelist` | -       | Aturan IP, CIDR, atau wildcard yang diizinkan |
| `blacklist` | -       | Aturan IP, CIDR, atau wildcard yang ditolak   |

## Cara Kerja

- **IP tidak diketahui** - request tanpa IP yang diresolusi ditolak.
- **Whitelist ada** - hanya IP yang cocok dengan whitelist lolos, selain itu ditolak.
- **Blacklist ada** - IP yang cocok dengan blacklist ditolak, sisanya lolos.
- **Tidak ada yang diatur** - setiap request lolos.

Middleware membaca IP klien yang diresolusi dari `ctx.ip`. Di balik proxy, atur [`trustProxy`](/id/getting-started/server-configuration#resolusi-ip-klien) supaya IP pengunjung asli yang dipakai.

## Penanganan Error

Ketika request ditolak, middleware menghasilkan **403** dan pesan `Access denied by IP restriction`. Kegagalan itu dialirkan ke [error handler terpusat](/id/error-handling/object-details), jadi bentuk response di sana atau andalkan [perilaku default](/id/error-handling/default-behavior).
