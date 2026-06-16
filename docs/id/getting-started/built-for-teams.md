---
description: "Pola menata aplikasi Deserve yang lebih besar dengan scoping middleware dan konfigurasi bersama untuk tim."
---

# Dibangun untuk Tim

Deserve menjaga struktur aplikasi tetap jelas, jadi sebuah tim membaca pohon folder dan langsung tahu API-nya. Tidak ada tabel rute pusat untuk dipelajari dan tidak ada konfigurasi khusus framework untuk dikuasai lebih dulu. Ini mengikuti [filosofi](/id/core-concepts/philosophy#keyakinan-inti) bahwa struktur file adalah struktur API, yang menjaga basis kode mudah dirawat oleh tim.

## Folder Adalah Peta

Kontributor baru membuka folder `routes` dan membaca endpoint langsung dari path-nya:

```
routes/
├── index.ts            # GET  /
├── health.ts           # GET  /health
├── users/
│   ├── index.ts        # GET  /users
│   ├── [id].ts         # GET  /users/:id
│   └── [id]/
│       └── posts.ts    # GET  /users/:id/posts
└── orders/
    └── index.ts        # POST /orders
```

Tidak ada registry untuk dicek silang, tidak ada decorator untuk dilacak. Path di disk adalah path di jaringan, dibahas di [File-based Routing](/id/core-concepts/file-based-routing).

![Folder adalah peta: createPattern mengubah tiap path berkas langsung menjadi pola URL, jadi routes/index.ts menjadi GET /, routes/users/index.ts menjadi GET /users, routes/users/[id].ts menjadi GET /users/:id, dan berkas berawalan underscore dilewati sebagai privat](/diagrams/team-folder-map.png)

## Junior Merilis di Hari Pertama

Menambah endpoint berarti menambah berkas. Developer junior yang butuh rute `GET /products` membuat `routes/products/index.ts` dan mengekspor sebuah handler:

```typescript twoslash
// routes/products/index.ts
import type { Context } from '@neabyte/deserve'

// Endpoint baru, tanpa registrasi
export function GET(ctx: Context): Response {
  return ctx.send.json({
    products: []
  })
}
```

Rute langsung aktif pada simpan berikutnya lewat [Hot Reload](/id/core-concepts/hot-reload), tanpa restart dan tanpa mengedit berkas config bersama yang bisa memicu konflik merge.

![Junior merilis di hari pertama: membuat routes/products/index.ts memicu event file-created dari watcher, modulnya diimpor dan handler GET-nya didaftarkan, lalu rute menjawab GET /products pada request berikutnya, tanpa restart dan tanpa edit config bersama sehingga tidak ada konflik merge](/diagrams/team-junior-ships.png)

## Handler yang Dapat Ditebak

Setiap berkas rute mengikuti bentuk yang sama, jadi mereview kode rekan tim tidak perlu menebak. Nama fungsi yang diekspor adalah metode HTTP, dan `Context` memberi request serta helper response:

```typescript twoslash
// routes/orders/index.ts
import type { Context } from '@neabyte/deserve'

// Nama metode adalah verb HTTP
export async function POST(ctx: Context): Promise<Response> {
  const order = await ctx.body()
  return ctx.send.json(
    {
      created: true,
      order
    },
    { status: 201 }
  )
}
```

Reviewer membaca `POST` dan tahu verb-nya, membaca `ctx.body()` dan tahu input-nya, membaca `ctx.send.json()` dan tahu output-nya. Pola yang sama berlaku di setiap berkas, yang merupakan [pengalaman pengembang](/id/core-concepts/philosophy#keyakinan-inti) yang dituju framework. Detail ada di [Request Handling](/id/core-concepts/request-handling) dan [Objek Context](/id/core-concepts/context-object).

## Aturan Bersama di Satu Tempat

Urusan yang berlaku lintas rute tinggal di satu titik alih-alih tersebar di seluruh handler. Satu developer bisa memegang auth, yang lain memegang logging, dan tidak ada yang perlu menyentuh berkas rute orang lain:

```typescript twoslash
// main.ts
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Security headers untuk setiap rute
router.use(Mware.securityHeaders())

// Auth hanya untuk area admin
router.use(
  '/admin',
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: Deno.env.get('ADMIN_PASSWORD') ?? 'change-me'
      }
    ]
  })
)

await router.serve(8000)
```

Handler tetap fokus pada tugasnya sendiri, sementara perilaku bersama diterapkan sekali. Set lengkap blok penyusunnya ada di [Global Middleware](/id/middleware/global), dan error mengalir ke satu tempat lewat [penanganan error](/id/error-handling/object-details). Aturan input juga ada di sini, tempat kontrak [validasi](/id/middleware/validation/overview) memeriksa request sebelum handler sehingga tiap rute hanya membaca data yang sudah lolos.

![Aturan bersama di satu tempat: securityHeaders() yang didaftarkan dengan router.use(fn) menjangkau setiap rute, sedangkan basicAuth() yang didaftarkan dengan router.use('/admin', fn) hanya menjangkau /admin/*, jadi satu developer bisa memegang auth dan yang lain memegang logging tanpa menyentuh berkas rute satu sama lain](/diagrams/team-shared-rules.png)

## Banyak Tangan, Satu Proses

Tim yang lebih besar sering memecah aplikasi menjadi beberapa service. Deserve menjalankan beberapa router dalam satu proses, jadi satu orang bisa mengerjakan API sementara yang lain mengerjakan auth tanpa deployment terpisah atau lapisan jaringan di antara keduanya:

```typescript twoslash
// main.ts
import { Router } from '@neabyte/deserve'

const api = new Router({
  routesDir: './services/api/routes'
})
const auth = new Router({
  routesDir: './services/auth/routes'
})

// Tiap service punya folder dan port
await Promise.all([
  api.serve(3001),
  auth.serve(3002)
])
```

Tiap service punya folder, port, dan file watcher sendiri, jadi tim bergerak paralel tanpa saling mengganggu. Pola lengkapnya, termasuk kode bersama dan error handler bersama, ada di [Multi-Service](/id/core-concepts/multi-service).

![Banyak tangan, satu proses: satu proses Deno menjalankan router API milik dev A di port 3001 dan router Auth milik dev B di port 3002, masing-masing dengan routesDir dan file watcher sendiri, jadi kedua developer bekerja paralel tanpa deployment terpisah atau lapisan jaringan](/diagrams/team-many-hands.png)

## Langkah Berikutnya

- [File-based Routing](/id/core-concepts/file-based-routing) - cara folder memetakan ke URL
- [Hot Reload](/id/core-concepts/hot-reload) - perubahan aktif tanpa restart
- [Multi-Service](/id/core-concepts/multi-service) - banyak service dalam satu proses
- [Filosofi](/id/core-concepts/philosophy) - pemikiran di balik desain
