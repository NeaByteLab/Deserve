---
description: "Alasan Deserve hadir tanpa dependensi pihak ketiga dan hanya bersandar pada runtime standar Deno."
---

# Tanpa Dependensi

Deserve berjalan di runtime Deno dan tidak ada apa pun dari npm. Tidak ada folder `node_modules/` untuk diinstal, diaudit, atau dikhawatirkan.

## Kenapa Ini Penting

Luka terbesar Node adalah rantai pasok. Proyek baru menarik ratusan paket transitif, dan salah satunya bisa merilis pembaruan yang dikompromikan dalam semalam. Risiko itu masih menghantui `node_modules/` setiap hari, dan kebanyakan tim tidak pernah membaca kode yang mereka instal.

Deserve menempuh jalan lain. Ia membangun di atas yang sudah disediakan Deno dan menjaga pohon dependensi tetap di luar gambaran, jadi tidak ada registry npm dalam alur dan jauh lebih sedikit permukaan untuk serangan rantai pasok mendarat. Lebih sedikit yang dipercaya berarti lebih sedikit yang bisa rusak.

## Mengikuti Visi Deno

Deno dirancang dengan default yang lebih aman, dan pilihan ini mengikuti arah itu. Runtime membawa penanganan request yang kaya, pemantauan berkas, dan primitif keamanan secara bawaan, jadi meraih paket npm jarang jadi jawaban. Industri bergerak menuju peduli lebih pada orang yang memakai software, dan merilis lebih sedikit bagian bergerak adalah bagian dari kepedulian itu.

## Aman Sejak Awal

Keamanan seharusnya jadi titik mulai, bukan peningkatan belakangan. Keyakinan itu bukan janji kesempurnaan, melainkan sebuah arah. Pohon dependensi yang lebih kecil, [proteksi proses](/id/getting-started/server-configuration#proteksi-proses), dan [penanganan error berlapis](/id/error-handling/defense-in-depth) semuanya menunjuk arah yang sama, menuju server yang tetap aman bahkan ketika ada yang salah.

## Terbuka dan Dapat Diaudit

Setiap modul yang memang diandalkan Deserve bersifat open source dan diterbitkan di [JSR](https://jsr.io/), jadi kodenya ada untuk dibaca, diaudit, dan dikontribusikan. Transparansi adalah intinya. Tidak ada yang sembunyi di balik bundel terminifikasi, dan siapa pun bisa memeriksa persis apa yang berjalan.

Ini berpasangan dengan sisa [filosofi](/id/core-concepts/philosophy): jaga tetap sederhana, bangun di atas platform, dan tetap jujur soal trade-off-nya.
