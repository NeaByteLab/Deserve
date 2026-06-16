---
description: "Kenapa Deserve tidak punya middleware XSS input sanitizer, karena escaping ada di keluaran dan view engine sudah melakukannya."
---

# XSS Input Sanitizer

Deserve tidak punya middleware input sanitizer, dan itu default yang lebih aman. Cross-site scripting dihentikan dengan escaping pada saat sebuah nilai dirender, yang sudah dilakukan [view engine](/id/rendering/syntax) sendiri.

## Kenapa Tidak Dibawa

Sebuah input sanitizer membersihkan `body`, `query`, dan `params` masuk dari HTML sebelum handler melihatnya, tugas paket seperti `xss-clean` yang kini usang. Pendekatannya lapisan yang salah, dan [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) merekomendasikan output encoding sadar-konteks ketimbang pembersihan input pukul rata.

Alasannya, escaping bergantung pada di mana sebuah nilai mendarat. Karakter yang sama ter-encode satu cara di dalam HTML, lain di dalam URL, dan lain di dalam JavaScript. Sebuah sanitizer di gerbang masuk belum bisa tahu itu, jadi dia entah membersihkan terlalu banyak dan merusak data asli, seperti komentar berisi `<3` atau cuplikan kode, atau membersihkan terlalu sedikit dan menyisakan celah. Membersihkan input sekali juga memberi rasa aman palsu, karena nilai tersimpan tetap harus di-escape di mana pun nanti ditampilkan.

## Escaping Terjadi Saat Render

Tempat yang tepat untuk escape adalah titik keluaran, dan itu tertanam di DVE. Nilai dalam kurung kurawal ganda di-escape HTML setiap kali, jadi data dari form atau database dirender sebagai teks dan tak pernah sebagai markup.

```html
<!-- Di-escape default, aman dari XSS -->
<p>{{ comment }}</p>
```

Karena escape jalan saat render, nilai mentah tetap utuh di penyimpanan dan di API, dan hanya tampilan HTML yang mengubahnya jadi entitas. Ini langkah `escapeHtml` yang sama dipakai framework untuk halaman error, jadi perilakunya konsisten di seluruh permukaan. Aturan lengkapnya ada di [Keluaran Mentah](/id/rendering/syntax#keluaran-mentah).

## Mengecualikan untuk Markup Tepercaya

Beberapa nilai memang dimaksudkan jadi HTML, seperti konten dari editor tepercaya. Kurung kurawal tiga melewati escape untuk satu nilai itu, sebuah pilihan eksplisit alih-alih setelan global.

```html
<!-- HTML mentah, markup tepercaya saja -->
<p>{{{ trustedHtml }}}</p>
```

Opt-out ini sengaja dan lokal, jadi default tetap aman dan hanya nilai yang butuh markup mentah yang ditandai begitu. Mengirim JSON sama sekali tak butuh escaping, karena data tak pernah diurai sebagai markup, dibahas di [response JSON](/id/response/json). Memeriksa bentuk dan tipe data masuk adalah tugas terpisah yang berjalan sebelum handler lewat kontrak [validasi](/id/middleware/validation/overview), yang merupakan validasi ketimbang escaping.
