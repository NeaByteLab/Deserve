---
description: "Referensi sintaks template DVE: variabel, kondisional, perulangan, layout, dan ekspresi."
---

# Sintaks Template

Template DVE adalah HTML polos dengan sekumpulan kecil tag <code v-pre>{{ }}</code> untuk data, komentar, kondisi, perulangan, include, dan layout. Pengaturan dan render pertama ada di [Ringkasan Rendering](/id/rendering/), dan semua yang masuk ke dalam tag cetak dirinci di [Ekspresi](#ekspresi).

## Variabel

Tag <code v-pre>{{ }}</code> mencetak sebuah nilai, dan akses anggota menjangkau data bersarang:

```html
<!-- Simple variable -->
<p>{{username}}</p>

<!-- Object property -->
<p>{{user.name}}</p>

<!-- Nested property -->
<p>{{user.profile.email}}</p>
```

Pencarian hanya membaca properti milik objek itu sendiri, jadi `__proto__`, `constructor`, dan kunci warisan lain bernilai kosong. Itu memblokir prototype pollution lewat data pengguna. Nilai yang hilang di mana pun sepanjang path bernilai string kosong.

## Komentar

Komentar DVE ditulis sebagai <code v-pre>{{!-- teks --}}</code> dan dibuang saat parsing, jadi tidak pernah mencapai keluaran. Komentar HTML biasa `<!-- teks -->` dibiarkan utuh dan tetap terkirim di response. Pakai bentuk DVE untuk menyembunyikan catatan dari klien.

## Kondisional

<code v-pre>{{#if}}</code> merender blok ketika nilainya truthy, dan setiap <code v-pre>{{#if}}</code> ditutup dengan <code v-pre>{{/if}}</code>:

```html
<!-- Simple condition -->
{{#if user.isAdmin}}
<button>Delete User</button>
{{/if}}
```

Cabang <code v-pre>{{else if}}</code> dan <code v-pre>{{else}}</code> bersifat opsional, dan blok bisa bersarang bebas:

```html
{{#if posts.length > 0}}
<div class="posts">
  <!-- Loop runs when posts exist -->
  {{#each posts as post}}
  <article>{{post.title}}</article>
  {{/each}}
</div>
{{else}}
<p>No posts found.</p>
{{/if}}
```

Sebuah rantai menambahkan <code v-pre>{{else if condition}}</code> sebelum <code v-pre>{{else}}</code> terakhir, dan tiap cabang diuji berurutan sampai satu cocok.

## Perulangan

<code v-pre>{{#each}}</code> menelusuri array dengan alias, dan alias-nya default ke `item` ketika bagian `as name` dihilangkan:

```html
{{#each users as u}}
<div class="user">
  <!-- Access property from alias -->
  <h3>{{u.name}}</h3>
  <p>{{u.email}}</p>
  <!-- Metadata variables available -->
  <small>Index: {{@index}}, First: {{@first}}, Last: {{@last}}, Total: {{@length}}</small>
</div>
{{/each}}
```

Sebuah <code v-pre>{{else}}</code> opsional merender ketika array kosong atau hilang:

```html
{{#each users as u}}
<p>{{u.name}}</p>
{{else}}
<p>No users yet.</p>
{{/each}}
```

**Metadata each:**

- `@index` - Indeks item, mulai dari 0, dan menerima aritmetika seperti <code v-pre>{{@index + 1}}</code>
- `@first` - Boolean true pada item pertama
- `@last` - Boolean true pada item terakhir
- `@length` - Total jumlah item

Setiap perulangan dibatasi oleh `maxIterations`, dan total berjalan di seluruh halaman dibatasi oleh `maxRenderIterations`. Keduanya ada di [Performa dan Batas](/id/rendering/performance#batas-iterasi).

## Includes

Operator `>` menarik template lain ke dalam template saat ini. Path-nya adalah teks persis di dalam tag, yang diresolusi Deserve terhadap direktori views:

```html
<!-- Include other template with > operator -->
{{> header.dve}}

<main>
  <h1>Page Content</h1>
</main>

{{> footer.dve}}
```

Include bersarang sampai kedalaman tetap, dibahas di [Performa dan Batas](/id/rendering/performance#batas-kedalaman-include).

## Layouts

Layout adalah kerangka bersama tempat halaman menancap. Layout menandai placeholder bernama dengan tag slot, dan sebuah halaman memperluasnya lalu mengisi tiap placeholder dengan tag block.

Definisikan kerangkanya, dengan tiap slot membawa konten default opsional:

```html
<!-- views/layouts/main.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{#slot title}}Untitled{{/slot}}</title>
  </head>
  <body>
    <main>{{#slot body}}{{/slot}}</main>
  </body>
</html>
```

Lalu sebuah halaman memperluas layout dengan operator `<` dan mengisi slot berdasarkan nama. Tag extend dibuka dengan <code v-pre>{{&lt; layout/path}}</code>, tiap <code v-pre>{{#block name}}</code> mengisi slot yang cocok, dan <code v-pre>{{/}}</code> kosong menutup layout:

<div v-pre>

```html
{{< layouts/main.dve}}
  {{#block title}}Home{{/block}}
  {{#block body}}<p>Welcome.</p>{{/block}}
{{/}}
```

</div>

Sebuah slot merender default-nya sendiri ketika tidak ada block yang cocok diberikan. Block yang menyebut slot yang tidak pernah dideklarasikan layout ditolak dengan error, yang menangkap salah ketik sebelum terkirim diam-diam. Rantai layout berbagi batas kedalaman include di [Performa dan Batas](/id/rendering/performance#batas-kedalaman-include).

## Kontrol Spasi

Sebuah `~` di sebelah kurung memangkas spasi yang menyentuh sisi tag itu, yang menjaga HTML hasil tetap rapi tanpa mengubah bentuk template:

<div v-pre>

```html
{{#each items as item~}}
  {{item}}
{{~/each}}
```

</div>

`~` bekerja pada tag mana pun, termasuk tag cetak, raw, dan block.

## Keluaran Mentah

Nilai di-escape HTML secara default, dan kurung tiga melewati escape itu untuk markup tepercaya saja:

```html
<!-- Default: HTML escaped (safe from XSS) -->
<p>{{userInput}}</p>

<!-- Raw: skips HTML escape, trusted markup only -->
<p>{{{trustedHtml}}}</p>
```

## Ekspresi

DVE mendukung ekspresi mirip JavaScript untuk pencarian dan operator:

```html
<!-- Optional chaining and nullish coalescing -->
<p>Hello {{ user?.name ?? 'Guest' }}.</p>

<!-- Math operators -->
<p>Total: {{ 1 + 2 * 3 }}</p>

<!-- Comparison -->
{{#if age >= 18}}Adult{{/if}}
```

Tata bahasanya adalah subset yang aman, bukan JavaScript penuh. Bagian yang didukung:

- **Akses anggota** - `user.name`, `user.profile.email`, dan optional chaining `user?.name`, keduanya null-safe
- **Matematika** - `+`, `-`, `*`, `/`, `%`, serta unary `+`, `-`, `!`
- **Perbandingan** - `===`, `!==`, `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Logika** - `&&`, `||`, `??`, dan ternary `cond ? a : b`
- **Literal** - angka termasuk eksponen seperti `1e3`, string kutip tunggal atau ganda, `true`, `false`, `null`, `undefined`
- **Pengelompokan** - tanda kurung, misalnya `(a + b) * c`

Literal string memahami escape sequence `\n`, `\t`, `\r`, `\b`, `\f`, `\v`, `\0`, `\\`, `\"`, `\'`, dan `\/`, plus escape code-point `\xNN`, `\uNNNN`, dan `\u{...}`.

Demi menjaga template aman dan dapat ditebak, mesin menolak apa pun di luar subset itu dan melempar parse error. Pemanggilan fungsi seperti `format(price)`, pengindeksan bracket seperti `items[0]`, penugasan, dan regular expression tidak diizinkan. Apa pun yang butuh logika nyata berada di route handler, tempat nilai jadi dihitung dan dioper ke template lewat data render.
