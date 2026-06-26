---
description: "Referensi semua event siklus hidup, keamanan, request, dan kesalahan yang dipancarkan router Deserve yang sedang melayani."
---

# Referensi Event

Setiap event dari [`router.on()`](/id/middleware/observability/overview) membawa diskriminan `kind` dan objek `metadata`. Halaman ini mendaftar setiap jenis dan field yang disediakannya.

![Event request bernilai external secara default tapi jadi internal ketika dipicu oleh timeout, error framework, atau context yang hilang, sementara setiap kind non-request lain bersifat internal kecuali process:failed yang selalu tetap external, jadi merutekan berdasarkan field type menjaga lalu lintas klien normal tetap di luar kanal alert kesalahan](/diagrams/obs-event-channel.png)

## Server

| Kind             | Metadata           |
| ---------------- | ------------------ |
| `server:started` | `port`, `hostname` |
| `server:stopped` | tidak ada          |

`server:started` menyala setelah server mengikat port. `server:stopped` menyala setelah server selesai menuntaskan request berjalan.

## Rute

| Kind            | Metadata          |
| --------------- | ----------------- |
| `route:added`   | `path`, `pattern` |
| `route:updated` | `path`, `pattern` |
| `route:removed` | `path`, `pattern` |
| `route:ignored` | `path`, `reason`  |
| `route:failed`  | `path`, `error`   |

`route:added` menyala saat berkas rute dimuat, `route:updated` saat [hot reload](/id/core-concepts/hot-reload) menangkap perubahan, dan `route:removed` saat sebuah berkas hilang. `route:ignored` menyebut berkas yang dilewati dan alasannya, sementara `route:failed` membawa error saat sebuah rute gagal dimuat.

## View

| Kind               | Metadata             |
| ------------------ | -------------------- |
| `view:compiled`    | `path`, `durationMs` |
| `view:rendered`    | `path`, `durationMs` |
| `view:invalidated` | `paths`              |
| `view:failed`      | `path`, `error`      |

Event view datang dari [mesin rendering DVE](/id/rendering/). `view:invalidated` menyala saat perubahan template membersihkan output yang di-cache, membawa setiap path yang terpengaruh.

## Worker

| Kind               | Metadata                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `worker:timeout`   | `index`, `timeoutMs`, `error`                                        |
| `worker:crashed`   | `index`, `error`                                                     |
| `worker:respawned` | `index`                                                              |
| `worker:rejected`  | `reason` (`queue-depth`, `queue-wait`), `queueDepth`, `maxQueueDepth` |

`worker:timeout` menyala saat sebuah task melewati tenggatnya, `worker:crashed` saat worker mati di tengah task, dan `worker:respawned` saat slot yang dibebaskan diganti. `worker:rejected` menyala saat sebuah dispatch ditolak di bawah beban, dengan `reason` menyebut apakah kedalaman antrean atau proyeksi tunggu yang memicu batas. Ini datang dari [worker pool](/id/recipes/worker-pool).

## Middleware Keamanan

| Kind                 | Metadata                                                  |
| -------------------- | --------------------------------------------------------- |
| `session:invalid`    | `cookieName`, `reason` (`tampered`, `expired`, `malformed`) |
| `csrf:failed`        | `rule` (`origin`, `secFetchSite`), `error`                |
| `cors:blocked`       | `origin`                                                  |
| `auth:failed`        | `reason` (`missing`, `malformed`, `invalid`)              |
| `ip:denied`          | `ip`                                                      |
| `validate:failed`    | `source` (`body`, `cookies`, `headers`, `query`), `reasons` |
| `body:rejected`      | `limit`, `declared`                                       |
| `websocket:rejected` | `reason` (`origin`, `version`, `malformed`)               |
| `static:missing`     | `path`                                                    |

Setiap event keamanan berpasangan dengan middleware-nya dan menyala saat pemeriksaan menolak request:

- `session:invalid` menyala saat cookie bertanda tangan gagal didekode, dengan `reason` menyebut nilai yang dirusak, yang sudah lewat `maxAge`, atau yang malformed, sementara request lanjut tanpa session terpasang. Ini datang dari [middleware session](/id/middleware/session).
- `csrf:failed` menyala saat aturan CSRF melempar, menyebut aturan mana yang rusak sementara pemeriksaan tetap jatuh aman ke penolakan. Ini datang dari [middleware CSRF](/id/middleware/csrf).
- `cors:blocked` menyala saat sebuah origin ditolak, membawa origin itu. Ini datang dari [middleware CORS](/id/middleware/cors).
- `auth:failed` menyala pada login yang ditolak, dengan `reason` menyebut header yang hilang, yang malformed, atau kredensial yang salah. Ini datang dari [middleware basic auth](/id/middleware/basic-auth).
- `ip:denied` menyala saat sebuah alamat diblokir, membawa IP yang ditolak. Ini datang dari [middleware pembatasan IP](/id/middleware/ip).
- `validate:failed` menyala saat sebuah kontrak menolak input, menyebut `source` dan `reasons`. Ini datang dari [validasi](/id/middleware/validation/overview).
- `body:rejected` menyala saat body yang dideklarasikan melampaui batas, membawa `limit` dan ukuran `declared`. Ini datang dari [middleware body limit](/id/middleware/body-limit).
- `websocket:rejected` menyala pada handshake yang ditolak, dengan `reason` menyebut origin yang buruk, ketidakcocokan versi, atau upgrade yang malformed. Ini datang dari [middleware WebSocket](/id/middleware/websocket).
- `static:missing` menyala saat sebuah path statis tidak menemukan berkas, membawa path itu.

## Request

| Kind                | Metadata                                              |
| ------------------- | ---------------------------------------------------- |
| `request:completed` | `method`, `statusCode`, `url`, `durationMs`, metrik   |
| `request:failed`    | sama dengan `request:completed`, plus `error` opsional |

`request:completed` menyala untuk setiap request yang selesai. `request:failed` menyala tambahan setiap kali status `400` atau lebih tinggi, dan membawa `error` hanya saat kegagalan dipicu oleh error framework. Keduanya membawa metrik selaras-OpenTelemetry opsional saat diketahui: `route`, `serverAddress`, `serverPort`, `userAgent`, `requestSize`, `responseSize`, dan `ip`.

Ubah ini menjadi log di [Request Logging](/id/middleware/observability/logging).

## Process

| Kind             | Metadata                                                                                |
| ---------------- | --------------------------------------------------------------------------------------- |
| `process:failed` | `error`, `origin` (`unhandledrejection`, `uncaughterror`, `process:exit`, `process:signal`) |

Router yang sedang melayani menjebak unhandled rejection, uncaught error, dan upaya menghentikan proses. Setiap kesalahan menjadi event `process:failed` alih-alih membuat server crash, jadi satu kegagalan tidak pernah menjatuhkan proses. Panggilan terminasi yang diblokir membawa `origin: 'process:exit'` dan menyebut panggilannya, contohnya `Blocked Deno.exit(0) process termination is not permitted from application code`. Lihat [Proteksi Proses](/id/getting-started/server-configuration#proteksi-proses) untuk alasannya, dan tangkap ini di [Pelaporan Error](/id/middleware/observability/errors).
