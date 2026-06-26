---
description: "Pasang Deserve ke proyek Deno memakai registry paket JSR."
---

# Instalasi

Tambahkan Deserve ke proyek Deno dalam satu perintah, lalu lanjut ke gagasan di baliknya di [Core Concepts](/id/core-concepts/philosophy), dimulai dari pendekatan [filosofi](/id/core-concepts/philosophy) dan [zero dependency](/id/core-concepts/zero-dependency).

## Prasyarat

- [Deno](https://github.com/denoland/deno_install) 2.8.3+ terpasang

Tetap pada rilis Deno terbaru itu ide bagus, karena Deserve berjalan di atas runtime dan setiap pembaruan performa Deno mengalir langsung ke Deserve.

## Install Deserve

[Package manager Deno](https://docs.deno.com/runtime/reference/cli/add/) menambahkan Deserve ke proyek. Perintah ini menulis dependensi ke `deno.json` dan menghasilkan `deno.lock`:

::: code-group

```bash [deno]
deno add jsr:@neabyte/deserve
```

:::

Perintah ini melakukan tiga hal:

- Menambahkan Deserve ke imports `deno.json`
- Membuat atau memperbarui file `deno.lock`
- Membuat Deserve tersedia untuk import

Dengan Deserve terpasang, [Quick Start](/id/getting-started/quick-start) membangun server dan rute pertama, dan [File-based Routing](/id/core-concepts/file-based-routing) menjelaskan bagaimana struktur folder menjadi API.
