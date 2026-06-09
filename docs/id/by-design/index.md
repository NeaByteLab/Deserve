---
description: "Fitur yang sengaja tidak dibawa Deserve, dan cara menyusunnya dari primitif yang sudah ada."
---

# Sesuai Desain

Beberapa fitur sengaja tidak ada di Deserve. Setiap ketiadaan di sini adalah keputusan, bukan celah yang menunggu diisi. Framework menyediakan primitifnya, dan bentuk fiturnya diserahkan ke developer yang paling paham kebutuhannya.

Bagian ini menjelaskan alasan di balik tiap fitur yang ditinggalkan dan menunjukkan cara menyusun perilaku yang sama dari bagian yang sudah ada. Setiap resep bersandar pada alat yang sudah dibahas di tempat lain dalam dokumentasi, terutama [middleware global](/id/middleware/global), [objek Context](/id/core-concepts/context-object), dan [event observability](/id/middleware/observability/overview).

## Yang Ada di Sini

| Fitur                                          | Kenapa Tidak Dibawa                                                |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| [Kompresi](/id/by-design/compress)            | Runtime dan proxy sudah mengompresi response.                      |
| [Pretty JSON](/id/by-design/pretty-json)       | Pemformatan adalah tugas konsumen, jadi data di kabel tetap minified. |
| [HTTPS Redirect](/id/by-design/https-redirect) | TLS ada di edge, dan redirect paksa di aplikasi bisa berputar.     |
| [Bearer Auth](/id/by-design/bearer-auth)       | Skema token berbeda-beda, jadi verifikasi dibiarkan terbuka.       |
| [XSS Input Sanitizer](/id/by-design/xss)       | Escaping ada di sisi keluaran, dan view engine sudah melakukannya. |
| [Caching](/id/by-design/cache)                 | Session stateless ditambah map di memori sudah cukup.              |
| [Rate Limiting](/id/by-design/rate-limit)      | Setiap tim mau bentuk berbeda, disusun lewat middleware.           |
| [Request ID](/id/by-design/request-id)         | IP klien yang diresolusi adalah identitas tepercaya, bukan ID acak. |
| [Method Override](/id/by-design/method-override) | Setiap metode HTTP adalah rute kelas satu, jadi tak ada verb yang dipalsukan. |
| [Locale Redirect](/id/by-design/locale-redirect) | Membaca header bahasa lalu redirect cuma beberapa baris.          |
| [Server-Timing](/id/by-design/server-timing)   | Siklus hidup mengukur durasi, dan header-nya satu baris.           |
| [Distributed Tracing](/id/by-design/tracing)   | Tanpa OpenTelemetry SDK, karena event selaras OTel memberi makan backend apa pun. |

Setiap halaman mengikuti [filosofi](/id/core-concepts/philosophy) untuk tetap kecil karena sengaja. Meninggalkan sebuah fitur bukan bagian yang hilang, itu satu hal lebih sedikit yang bisa salah, dan primitif yang sudah ada cukup untuk membangun sisanya.
