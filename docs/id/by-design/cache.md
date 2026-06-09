---
description: "Kenapa Deserve tidak punya middleware cache, dan cara session stateless ditambah map memori polos memenuhi kebutuhan."
---

# Caching

Deserve tidak membawa middleware cache, dan pipeline request tak menyimpan store tersembunyi sendiri. Itu menjaga perilaku memori tetap dapat ditebak, dan menyerahkan strategi caching ke developer.

## Kenapa Tidak Dibawa

Kebanyakan yang orang cari dari cache adalah menyimpan sedikit state per-pengguna lintas request. Tugas itu sudah ditangani. [Middleware session](/id/middleware/session) menyimpan data per-pengguna di cookie bertanda tangan, tanpa store sisi server yang tumbuh, kedaluwarsa, atau ter-evict. Untuk 80 persen yang umum, status login dan preferensi, datanya menumpang di klien dan server tetap stateless.

Sebuah middleware cache umum harus memilih kebijakan eviksi, strategi kunci, dan anggaran memori untuk semua orang sekaligus, dan pilihan itu milik aplikasi, bukan framework. Jadi keputusannya adalah meninggalkan store dan membiarkan developer menyimpan persis yang dibutuhkan kasusnya.

## Memori Tetap Bersih di Bawah Beban

Sebuah cache bawaan terasa menggoda karena memori bisa merayap naik seiring waktu. Kekhawatiran itu tak berlaku pada framework itu sendiri. Pipeline request mengalokasi per request dan membiarkan tiap [Context](/id/core-concepts/context-object) keluar dari scope begitu response dikirim, jadi tak ada tabel internal yang tumbuh dengan trafik. Di bawah trafik beban-tinggi berkelanjutan framework tidak membocorkan apa pun lintas pipeline, dan runtime merebut kembali tiap request yang selesai sendiri.

Garbage collection adalah tugas runtime, sejalan dengan [bangun di atas platform](/id/core-concepts/philosophy#bangun-di-atas-platform). Deno dan V8 memiliki heap dan kolektornya, dan Deserve tidak melawan maupun membungkusnya. Apa pun yang di-cache aplikasi tinggal di memori aplikasi, di mana umurnya adalah hak developer untuk memutuskan.

## Menyimpan Data di Memori

Ketika sebuah nilai memang perlu tinggal di server, sebuah `Map` polos yang dideklarasi di scope modul adalah seluruh polanya. Ia dibuat sekali dan dibagi ke setiap request ke modul itu.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// Satu store dibagi lintas request
const cache = new Map<string, unknown>()

export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.pathname

  // Sajikan nilai cache ketika ada
  const hit = cache.get(key)
  if (hit !== undefined) {
    return ctx.send.json({ source: 'cache', data: hit })
  }

  // Bangun sekali, lalu simpan untuk lain kali
  const data = await buildExpensiveData()
  cache.set(key, data)
  return ctx.send.json({ source: 'fresh', data })
}

declare function buildExpensiveData(): Promise<unknown>
```

## Membuat Entri Kedaluwarsa

Sebuah `Map` tak pernah meng-evict sendiri, jadi cache yang berjalan lama butuh time-to-live. Simpan nilai dengan cap kedaluwarsa dan perlakukan entri lama sebagai miss.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// Atur berapa lama entri tetap segar
const ttlMs = 30_000
const cache = new Map<string, { value: unknown, expiresAt: number }>()

export function GET(ctx: Context): Response {
  const key = ctx.pathname
  const entry = cache.get(key)

  // Entri segar menang, yang lama dibuang
  if (entry && Date.now() < entry.expiresAt) {
    return ctx.send.json({ source: 'cache', data: entry.value })
  }

  // Hitung ulang dan cap kedaluwarsa baru
  const value = { time: Date.now() }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
  return ctx.send.json({ source: 'fresh', data: value })
}
```

Sebuah `Map` yang dikunci dengan data request tumbuh dengan tiap kunci berbeda, jadi batasi atau sapu entri kedaluwarsa di timer. Ketika kuncinya objek alih-alih string, sebuah `WeakMap` membiarkan runtime membuang entri begitu kuncinya hilang, yang cocok untuk metadata per-objek tanpa pembersihan manual.

## Ketika Memori Tidak Cukup

Dua kasus menuntut lebih dari map lokal-proses. Sebuah cache yang harus bertahan dari restart, atau dibagi lintas beberapa instance, cocok di store eksternal seperti [Redis](https://redis.io/), dicapai dengan klien biasa di dalam handler. Sebuah cache yang sekadar butuh ruang lebih bisa berjalan di memori setelah heap V8 dinaikkan saat startup. Ukuran heap adalah flag runtime, bukan setelan framework, jadi [dokumentasi Deno](https://docs.deno.com/runtime/) adalah tempat untuk invokasi persisnya.

## Berbagi Per-Request

Caching lintas request adalah satu kebutuhan, mengoper sebuah nilai sepanjang satu request adalah kebutuhan lain. Sebuah nilai yang dihitung di middleware dan dibaca handler tak masuk cache sama sekali, ia masuk [`ctx.state`](/id/core-concepts/context-object#berbagi-state), yang hidup persis satu request dan hilang saat response dikirim.
