---
description: "Referensi sintaks template DVE: variabel, kondisional, perulangan, dan include."
---

# Sintaks Template

Template DVE adalah HTML polos dengan sekumpulan kecil tag <code v-pre>{{ }}</code> untuk data, kondisi, perulangan, dan include. Pengaturan dan render pertama ada di [Ringkasan Rendering](/id/rendering/).

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

Pencarian hanya membaca properti milik objek itu sendiri, jadi `__proto__`, `constructor`, dan kunci warisan lain bernilai kosong. Itu memblokir prototype pollution lewat data pengguna.

## Kondisional

<code v-pre>{{#if}}</code> merender blok ketika nilainya truthy:

```html
<!-- Simple condition -->
{{#if user.isAdmin}}
<button>Delete User</button>
{{/if}}
```

Sebuah kondisi berpasangan dengan <code v-pre>{{else}}</code> untuk cabang cadangan, dan blok bisa bersarang bebas:

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

## Perulangan

<code v-pre>{{#each}}</code> menelusuri array dengan alias, lengkap dengan variabel metadata tiap putaran:

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

**Metadata each:**

- `@index` - Indeks item (mulai dari 0)
- `@first` - Boolean true bila item pertama
- `@last` - Boolean true bila item terakhir
- `@length` - Total jumlah item

Setiap perulangan dibatasi oleh `maxIterations`, dibahas di [Performa dan Batas](/id/rendering/performance#batas-iterasi).

## Include

Operator `>` menarik template lain ke dalam template saat ini:

```html
<!-- Include other template with > operator -->
{{> header.dve}}

<main>
  <h1>Page Content</h1>
</main>

{{> footer.dve}}
```

Include bersarang sampai kedalaman tetap, dibahas di [Performa dan Batas](/id/rendering/performance#batas-kedalaman-include).

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

- **Akses anggota** - `user.name`, `user.profile.email`, dan optional chaining `user?.name`
- **Matematika** - `+`, `-`, `*`, `/`, `%`, serta unary `+`, `-`, `!`
- **Perbandingan** - `===`, `!==`, `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Logika** - `&&`, `||`, `??`, dan ternary `cond ? a : b`
- **Literal** - angka, string kutip tunggal atau ganda, `true`, `false`, `null`, `undefined`
- **Pengelompokan** - tanda kurung, misalnya `(a + b) * c`

Demi menjaga template aman dan dapat ditebak, mesin menolak apa pun di luar subset itu dan melempar parse error. Pemanggilan fungsi seperti `format(price)`, pengindeksan bracket seperti `items[0]`, dan penugasan tidak diizinkan.

## Keluaran Mentah

Nilai di-escape HTML secara default, dan kurung tiga melewati escape itu untuk markup tepercaya saja:

```html
<!-- Default: HTML escaped (safe from XSS) -->
<p>{{userInput}}</p>

<!-- Raw: skips HTML escape, use only trusted markup -->
<p>{{{trustedHtml}}}</p>
```

## Komposisi Layout

Layout dibangun dengan menyertakan template kecil dan menaruh data ke variabel polos, jadi satu kerangka bersama membungkus tiap halaman tanpa mekanisme slot khusus:

```html
<!-- views/layouts/base.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
  </head>
  <body>
    <header>{{> header.dve}}</header>
    <main>{{{ content }}}</main>
    <footer>{{> footer.dve}}</footer>
  </body>
</html>
```

Nilai `content` datang dari data rute, dan kurung tiga merendernya sebagai HTML mentah ketika markup sudah tepercaya.
