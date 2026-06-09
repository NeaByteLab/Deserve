---
layout: home

hero:
  name: "Deserve"
  text: "Framework Web"
  tagline: "Bangun server HTTP dengan mudah tanpa konfigurasi untuk produktivitas maksimal."
  image:
    src: /image.png
    alt: Deserve

  actions:
    - theme: brand
      text: Mulai
      link: /id/getting-started/installation

    - theme: alt
      text: Lihat di GitHub
      link: https://github.com/NeaByteLab/Deserve

features:
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
    title: Super Cepat
    details: Dibangun untuk performa HTTP asli Deno. Tanpa overhead, kecepatan maksimal.
    link: /id/core-concepts/philosophy

  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
    title: Routing Berbasis File
    details: Struktur file menjadi struktur API. Intuitif dan mudah dirawat.
    link: /id/core-concepts/file-based-routing

  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>'
    title: Tanpa Konfigurasi
    details: Letakkan file di folder dan dapatkan endpoint API secara instan. Tidak perlu setup yang rumit.
    link: /id/core-concepts/route-patterns

  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
    title: Middleware Bawaan
    details: CORS, session, body limit, security headers, dan basic auth langsung tersedia.
    link: /id/middleware/global

  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline><line x1="13" y1="4" x2="11" y2="20"></line></svg>'
    title: Template Engine
    details: DVE template engine dengan kondisional, loop, include, dan streaming rendering.
    link: /id/rendering/

  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>'
    title: Hot Reload
    details: Route dan template otomatis dimuat ulang saat file berubah. Tanpa restart server.
    link: /id/core-concepts/hot-reload

  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>'
    title: Multi-Service
    details: Jalankan banyak server terisolasi dalam satu proses Deno. Berbagi state, tanpa overhead.
    link: /id/core-concepts/multi-service

  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>'
    title: Tanpa Dependensi
    details: Tanpa paket npm, tanpa node_modules untuk diaudit. Permukaan serangan lebih kecil.
    link: /id/core-concepts/zero-dependency

  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>'
    title: Pertahanan Berlapis
    details: Error melewati lima lapisan berurutan. Server tetap hidup, tidak akan pernah crash.
    link: /id/error-handling/defense-in-depth
