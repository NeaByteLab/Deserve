---
description: "Referensi semua event siklus hidup dan error yang dipancarkan router Deserve yang sedang melayani."
---

# Referensi Event

Setiap event dari [`router.on()`](/id/middleware/observability/overview) membawa diskriminan `kind` dan objek `metadata`. Halaman ini mendaftar setiap jenis dan field yang disediakannya.

![Event request bernilai external secara default tapi jadi internal ketika timeout, error framework, atau context yang hilang yang memicunya, sementara setiap kind non-request selalu internal, jadi merutekan berdasarkan field type menjaga lalu lintas klien normal tetap di luar kanal alert kesalahan](/diagrams/obs-event-channel.png)

## Server

| Kind                | Metadata                  |
| ------------------- | ------------------------- |
| `server:listening`  | `port`, `hostname`        |
| `server:shutdown`   | tidak ada                 |

`server:listening` menyala saat server mengikat port. `server:shutdown` menyala setelah server selesai dikuras.

## Rute

| Kind             | Metadata                          |
| ---------------- | --------------------------------- |
| `route:loaded`   | `routePath`, `pattern`            |
| `route:reloaded` | `routePath`, `pattern`            |
| `route:removed`  | `routePath`, `pattern`            |
| `route:skipped`  | `routePath`, `reason`             |
| `route:error`    | `routePath`, `error`              |
| `reload:error`   | `routePath`, `error`              |

Event reload datang dari hot reload saat berkas berubah di disk.

## View

| Kind             | Metadata                  |
| ---------------- | ------------------------- |
| `view:compiled`  | `path`, `durationMs`      |
| `view:rendered`  | `path`, `durationMs`      |
| `view:refreshed` | `paths`                   |
| `view:error`     | `path`, `error`           |

Event view datang dari [mesin rendering DVE](/id/rendering/).

## Request

| Kind                | Metadata                                            |
| ------------------- | --------------------------------------------------- |
| `request:complete`  | `method`, `statusCode`, `url`, `durationMs`, metrik  |
| `request:error`     | sama dengan `request:complete`, plus `error`        |

`request:complete` menyala untuk setiap request yang selesai. `request:error` menyala tambahan setiap kali status `400` atau lebih tinggi. Keduanya membawa metrik selaras-OpenTelemetry opsional saat diketahui: `route`, `serverAddress`, `serverPort`, `userAgent`, `requestSize`, `responseSize`, dan `ip`.

Ubah ini menjadi log di [Request Logging](/id/middleware/observability/logging).

## Process

| Kind            | Metadata                                                              |
| --------------- | -------------------------------------------------------------------- |
| `process:error` | `error`, `origin` (`unhandledrejection`, `uncaughterror`, `process:exit`) |

Router yang sedang melayani menjebak unhandled rejection, uncaught error, dan upaya menghentikan proses. Setiap kesalahan menjadi event `process:error` alih-alih membuat server crash, jadi satu kegagalan tidak pernah menjatuhkan proses. Panggilan terminasi yang diblokir membawa `origin: 'process:exit'` dan menyebut panggilannya, contohnya `Blocked Deno.exit(0) - process termination is not permitted from application code`. Lihat [Proteksi Proses](/id/getting-started/server-configuration#proteksi-proses) untuk alasannya, dan tangkap ini di [Pelaporan Error](/id/middleware/observability/errors).
