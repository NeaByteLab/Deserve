---
description: "Filosofi desain di balik Deserve: konvensi di atas konfigurasi, tanpa dependensi, dan ergonomi Deno-native."
---

# Filosofi

Membangun server seharusnya terasa ringan, bukan seperti memecahkan teka-teki sebelum rute pertama sempat berjalan. Perasaan itulah alasan Deserve ada.

## Perjalanan

Seperti banyak pengembang, saya menghabiskan bertahun-tahun di ekosistem JavaScript, berpindah antar framework untuk setiap ide baru. [Express](https://github.com/expressjs/express) jadi markas saya, sederhana dan familiar, dan saya merilis banyak proyek di atasnya. Lalu Deno datang, dan sesuatu terasa pas.

Deno memberi runtime native yang kaya, tapi kaya bisa diam-diam berubah jadi berat. File config di satu sudut, registrasi rute di sudut lain, perakitan middleware berserakan di mana-mana. Saya ingin cara membangun di atas Deno yang tetap sekecil masalah di depan mata, jadi Deserve bermula sebagai framework yang saya harap sudah ada.

## Keyakinan Inti

Empat keyakinan ini membentuk setiap keputusan di framework, dan masing-masing terhubung ke fitur yang bisa dipakai hari ini.

![Masing-masing dari empat keyakinan inti memetakan ke fitur konkret yang bisa dipakai hari ini, di mana lebih sedikit bagian bergerak menuju zero dependency, struktur adalah API menuju file-based routing, bangun di atas platform menuju HTTP dan stream native, dan pengalaman yang ikut tumbuh menuju dibangun untuk tim](/diagrams/philosophy-beliefs-to-features.png)

![Pandangan abstrak bagaimana keyakinan berpikir sebagai satu pikiran, di mana satu ide akar tetap sekecil masalah memberi makan keempat keyakinan, keyakinan saling menguatkan menyusuri rantai, dan bersama mereka menyatu pada kesimpulan bahwa sederhana itu aman sebab makin sedikit kode berarti makin sedikit yang bisa salah](/diagrams/philosophy-principle-web.png)

### Lebih Sedikit Bagian Bergerak

Pohon dependensi terkecil adalah yang tidak bisa rusak. Deno sudah membawa penanganan request, pemantauan file, dan primitif keamanan, jadi bersandar pada runtime lebih baik daripada menarik paket lain. Karena itu Deserve berjalan dengan [zero npm dependencies](/id/core-concepts/zero-dependency), menjaga permukaannya cukup kecil untuk benar-benar dipercaya.

### Struktur Adalah API

Susunan folder sudah menggambarkan maksud, jadi ia juga yang menentukan rute. Tanpa langkah registrasi, tanpa tabel pusat yang harus disinkronkan, hanya file yang memetakan langsung ke URL lewat [file-based routing](/id/core-concepts/file-based-routing). Bentuk proyek adalah bentuk API.

### Bangun di Atas Platform

Ketika runtime memberi sesuatu yang kokoh, pakai itu daripada membangunnya ulang. Deserve membungkus HTTP, stream, dan worker native milik Deno alih-alih menyembunyikannya, jadi platform tetap dekat dan mudah ditebak di bawah setiap handler.

### Pengalaman yang Ikut Tumbuh

Kode harus enak dibaca, pola harus mudah ditebak, dan error harus menunjuk ke arah yang berguna. Perhatian itu bertahan baik saat satu orang ngoprek di akhir pekan maupun saat satu tim merilis bersama, dan itulah yang membuat Deserve [dibangun untuk tim](/id/getting-started/built-for-teams) sejak commit pertama.

## Aman Sejak Awal

Sederhana dan aman layak berada di kalimat yang sama. Router yang sedang melayani melindungi proses dari mati tak sengaja lewat [proteksi proses](/id/getting-started/server-configuration#proteksi-proses), dan kegagalan ditangkap berlapis lewat [defense in depth](/id/error-handling/defense-in-depth). Tetap kecil adalah bagian dari tetap aman, sebab makin sedikit kode berarti makin sedikit yang bisa salah.

## Kecil karena Sengaja

Deserve tidak hadir untuk menggantikan framework besar atau memenangkan adu benchmark. Ini alat untuk pengembang yang menyukai betapa ringannya Deno dan ingin menjaga rasa itu sampai ke produksi.

Terkadang solusi terbaik adalah yang sederhana. Terkadang solusi sederhana itu belum ada, jadi layak untuk membangunnya dan membagikannya secara terbuka.
