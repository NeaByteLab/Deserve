---
description: "Referensi semua event siklus hidup dan error yang dipancarkan router Deserve yang sedang melayani."
---

# Referensi Event

Setiap event dari [`router.on()`](/id/middleware/observability/overview) membawa diskriminan `kind` dan objek `metadata`. Halaman ini mendaftar setiap jenis dan field yang disediakannya.

![Event request bernilai external secara default tapi jadi internal ketika dipicu oleh timeout, error framework, atau context yang hilang, sementara setiap kind non-request selalu internal, jadi merutekan berdasarkan field type menjaga lalu lintas klien normal tetap di luar kanal alert kesalahan](/diagrams/obs-event-channel.png)

## Server

| Kind                | Metadata                  |
| ------------------- | ------------------------- |
| `server:listening`  | `port`, `hostname`        |
| `server:shutdown`   | tidak ada                 |

`server:listening` menyala saat server mengikat port. `server:shutdown` menyala setelah server selesai menuntaskan request berjalan.

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

## Worker

| Kind              | Metadata                                          |
| ----------------- | ------------------------------------------------- |
| `worker:timeout`  | `workerIndex`, `timeoutMs`, `error`               |
| `worker:crash`    | `workerIndex`, `error`                            |
| `worker:respawn`  | `workerIndex`                                     |
| `worker:rejected` | `reason` (`queue-depth`, `queue-wait`), `queueDepth`, `maxQueueDepth` |

`worker:timeout` menyala saat sebuah task melewati tenggatnya, `worker:crash` saat worker mati di tengah task, dan `worker:respawn` saat slot yang dibebaskan diganti. `worker:rejected` menyala saat sebuah dispatch ditolak di bawah beban, dengan `reason` menyebut apakah kedalaman antrean atau proyeksi tunggu yang memicu batas. Ini datang dari [worker pool](/id/core-concepts/worker-pool).

## Middleware

| Kind              | Metadata                                          |
| ----------------- | ------------------------------------------------- |
| `session:invalid` | `cookieName`, `reason` (`tampered`, `expired`, `malformed`) |
| `csrf:rule-error` | `rule` (`origin`, `secFetchSite`), `error`        |

`session:invalid` menyala saat cookie bertanda tangan gagal didekode, dengan `reason` menyebut apakah nilainya dirusak, sudah lewat `maxAge`, atau malformed, sementara request lanjut tanpa session terpasang. Ini datang dari [middleware session](/id/middleware/session). `csrf:rule-error` menyala saat aturan CSRF kustom melempar, menyebut aturan mana yang rusak sementara pemeriksaan tetap jatuh aman ke penolakan. Ini datang dari [middleware CSRF](/id/middleware/csrf).

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
