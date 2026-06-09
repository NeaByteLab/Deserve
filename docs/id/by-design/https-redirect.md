---
description: "Kenapa Deserve tidak punya middleware HTTPS redirect, karena TLS ada di edge dan redirect paksa di aplikasi bisa berputar."
---

# HTTPS Redirect

Deserve tidak punya middleware HTTPS redirect, dan memaksakannya di dalam aplikasi adalah lapisan yang salah untuk pekerjaan itu. TLS diterminasi di edge, jadi aplikasi jarang melihat skema asli sejak awal.

## Kenapa Tidak Dibawa

Sebuah HTTPS redirect paksa mengirim request `http://` apa pun kembali sebagai `https://`. Masalahnya ada di mana TLS sebenarnya berada. Di produksi sertifikat duduk di proxy atau load balancer seperti [Cloudflare](https://www.cloudflare.com/learning/ssl/what-is-ssl/) atau [nginx](https://nginx.org/en/docs/http/configuring_https_servers.html), yang menterminasi TLS dan meneruskan HTTP polos ke origin. Aplikasi lalu melihat `http`, meski klien terhubung lewat `https`, jadi redirect yang dibangun dari skema lokal akan memantulkan request yang sudah aman.

Begitulah redirect loop terjadi. Proxy bicara HTTPS ke klien, origin melihat HTTP dan redirect ke HTTPS, proxy meneruskan HTTP lagi, dan loop tak pernah berakhir. Tempat aman untuk menegakkan HTTPS adalah lapisan yang memiliki sertifikat, sejalan dengan [bangun di atas platform](/id/core-concepts/philosophy#bangun-di-atas-platform).

## Di Mana HTTPS Berada

Redirect-nya sendiri adalah satu baris konfigurasi proxy, bukan kode aplikasi:

- **Di proxy** - [Cloudflare](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/) dan [nginx](https://nginx.org/en/docs/http/configuring_https_servers.html) redirect `http` ke `https` sebelum trafik mencapai origin, jadi aplikasi hanya pernah menyajikan request yang aman.
- **Di browser** - header `Strict-Transport-Security` memberi tahu browser untuk memakai HTTPS sendiri pada kunjungan berikutnya, yang menghapus redirect setelah response aman pertama.

Deserve sudah menangani separuh kedua. [Middleware security headers](/id/middleware/security-headers#stricttransportsecurity) mengatur HSTS lewat opsi `strictTransportSecurity`, mati secara default dan dimaksudkan menyala setelah server dicapai lewat HTTPS.

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Suruh browser tetap pakai HTTPS
router.use(
  Mware.securityHeaders({
    strictTransportSecurity: 'max-age=31536000; includeSubDomains'
  })
)

await router.serve(8000)
```

## Membaca Skema Asli

Ketika aplikasi memang perlu tahu apakah klien memakai HTTPS, jawabannya ada di header forwarded yang diatur proxy, bukan di koneksi lokal. Proxy tepercaya menambahkan [`X-Forwarded-Proto`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto), dibaca lewat [`ctx.header`](/id/core-concepts/context-object#akses-data-request).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Skema yang benar-benar dipakai klien
  const proto = ctx.header('x-forwarded-proto') ?? 'http'
  return ctx.send.json({ secure: proto === 'https' })
}
```

Percayai header ini hanya di belakang proxy yang dikonfigurasi lewat [`trustProxy`](/id/getting-started/server-configuration#resolusi-ip-klien), batas kepercayaan yang sama diandalkan [`ctx.ip`](/id/by-design/request-id#ip-adalah-sumber-kebenaran). Klien yang tak tepercaya bisa mengatur header apa pun, jadi nilainya tak berarti tanpa batas itu.

## Menyajikan HTTPS Langsung

Server tanpa proxy di depan bisa menterminasi TLS sendiri dengan memberikan sertifikat dan kunci ke [`Deno.serve`](https://docs.deno.com/runtime/fundamentals/http_server/#https-support), runtime di bawah [konfigurasi server](/id/getting-started/server-configuration). Bahkan saat itu redirect dari `http` ke `https` adalah urusan listener terpisah, bukan middleware, jadi aplikasi tetap fokus pada request yang diterimanya.
