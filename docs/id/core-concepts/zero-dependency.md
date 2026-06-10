---
description: "Alasan Deserve hadir tanpa dependensi pihak ketiga dan hanya bersandar pada runtime standar Deno."
---

# Tanpa Dependensi

Deserve berjalan di runtime Deno dan tidak ada apa pun dari npm. Tidak ada folder `node_modules/` untuk diinstal, diaudit, atau dikhawatirkan.

## Kenapa Ini Penting

Kelemahan terbesar Node ada di rantai pasoknya. Proyek baru menarik ratusan paket transitif, dan salah satunya bisa merilis pembaruan yang sudah disusupi dalam semalam. Risiko itu masih membayangi `node_modules/` setiap hari, dan kebanyakan tim tidak pernah membaca kode yang mereka pasang.

Deserve menempuh jalan lain. Framework ini membangun di atas yang sudah disediakan Deno dan menghapus pohon dependensi sepenuhnya, jadi tidak ada registry npm dalam alurnya dan permukaan serangan rantai pasok jauh lebih sempit. Makin sedikit yang dipercaya berarti makin sedikit yang bisa rusak.

![Proyek Node menarik kode aplikasi lewat registry npm ke ratusan dependensi transitif yang pembaruannya bisa berbahaya, sementara proyek Deserve hanya memakai runtime Deno dan sedikit modul JSR yang teraudit](/diagrams/zero-dep-supply-chain.png)

## Mengikuti Visi Deno

Deno dirancang dengan default yang lebih aman, dan pilihan ini mengikuti arah itu. Runtime-nya membawa penanganan request yang kaya, pemantauan berkas, dan primitif keamanan secara bawaan, jadi mengambil paket npm jarang jadi jawaban. Industri bergerak ke arah lebih peduli pada orang yang memakai software, dan merilis lebih sedikit bagian bergerak adalah bagian dari kepedulian itu.

![Deserve mengambil penanganan request, pemantauan berkas, primitif keamanan, dan flag izin langsung dari runtime Deno bawaan, jadi tidak butuh paket npm](/diagrams/zero-dep-runtime-primitives.png)

## Aman Sejak Awal

Keamanan seharusnya jadi titik mulai, bukan peningkatan belakangan. Keyakinan itu bukan janji kesempurnaan, melainkan sebuah arah. Pohon dependensi yang lebih kecil, [proteksi proses](/id/getting-started/server-configuration#proteksi-proses), dan [penanganan error berlapis](/id/error-handling/defense-in-depth) semuanya menunjuk arah yang sama, menuju server yang tetap aman bahkan ketika ada yang salah.

![Sebuah sentinel proses menyela panggilan terminasi yang dikenal, jadi Deno.exit dan process.exit ke diri sendiri diblokir dan unhandled rejection ditangkap sementara kill ke pid lain tetap lewat, menjaga proses tetap hidup dan memancarkan event process error](/diagrams/zero-dep-process-guard.png)

## Terbuka dan Dapat Diaudit

Setiap modul yang memang diandalkan Deserve bersifat open source dan diterbitkan di [JSR](https://jsr.io/), jadi kodenya tersedia untuk dibaca, diaudit, dan dikontribusikan. Transparansi adalah intinya. Tidak ada yang disembunyikan di balik bundel yang diminifikasi, dan siapa pun bisa memeriksa persis apa yang berjalan.

![Apa yang dilindungi guard, terminasi diri, fault tak tertangkap, dan denial of service, disandingkan dengan apa yang tidak dilakukannya, karena ini bukan sandbox dan kode tak tepercaya tetap berjalan, jadi ia berpasangan dengan flag izin Deno dan review dependensi](/diagrams/zero-dep-best-effort.png)

Ini berpasangan dengan sisa [filosofi](/id/core-concepts/philosophy): jaga tetap sederhana, bangun di atas platform, dan tetap jujur soal trade-off-nya.
