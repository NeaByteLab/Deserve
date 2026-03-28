# Rendering

Deserve menyediakan template rendering engine bawaan dengan DVE (Deserve View Engine) untuk membangun HTML dinamis dengan sintaks sederhana.

> [!INFO]
> Lihat dokumentasi [syntax highlighting DVE](https://github.com/NeaByteLab/Deserve/tree/main/editor) untuk dukungan editor dan referensi sintaks lengkap.

## View Engine

### Setup

```typescript
// 1. Impor Router
import { Router } from '@neabyte/deserve'

// 2. Buat router dengan views directory
const router = new Router({
  viewsDir: './views' // Folder untuk .dve templates
})

// 3. Jalankan server
await router.serve(8000)
```

### Template Dasar

Buat template di `views/` folder:

```dve
<!-- views/welcome.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{judul}}</title>
  </head>
  <body>
    <h1>Halo {{nama}}!</h1>
    <p>Hari ini: {{tanggal}}</p>
  </body>
</html>
```

### Render di Route

```typescript
// routes/welcome.ts
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Render template dengan data
  return ctx.render('welcome', {
    judul: 'Halaman Selamat Datang',
    nama: 'John Doe',
    tanggal: new Date().toLocaleDateString()
  })
}
```

## DVE Template Syntax

### Variables

```dve
<!-- Variabel sederhana -->
<p>{{namaPengguna}}</p>

<!-- Properti objek -->
<p>{{pengguna.nama}}</p>

<!-- Properti bersarang -->
<p>{{pengguna.profil.email}}</p>
```

### Conditionals

```dve
{{#if pengguna.isAdmin}}
<button>Hapus Pengguna</button>
{{/if}} {{#if postingan.length > 0}}
<div class="posts">
  <!-- Loop dengan alias -->
  {{#each postingan as post}}
  <article>{{post.judul}}</article>
  {{/each}}
</div>
{{else}}
<p>Tidak ada postingan.</p>
{{/if}}
```

### Loops

```dve
{{#each pengguna as p}}
<div class="user">
  <!-- Akses properti dari alias -->
  <h3>{{p.nama}}</h3>
  <p>{{p.email}}</p>

  <!-- Variabel metadata tersedia -->
  <small>Indeks: {{@index}}, Pertama: {{@first}}, Terakhir: {{@last}}, Total: {{@length}}</small>
</div>
{{/each}}
```

**Metadata Each:**

- `@index` - Indeks item (0-based)
- `@first` - Boolean true jika item pertama
- `@last` - Boolean true jika item terakhir
- `@length` - Total jumlah item

### Includes

```dve
<!-- Include template lain dengan operator > -->
{{> header.dve}}

<main>
  <h1>Konten Halaman</h1>
</main>

{{> footer.dve}}
```

### Expressions

DVE mendukung expression seperti JavaScript untuk lookup dan operator:

```dve
<!-- Optional chaining dan nullish coalescing -->
<p>Halo {{ pengguna?.nama ?? 'Tamu' }}.</p>

<!-- Operator matematika -->
<p>Total: {{ 1 + 2 * 3 }}</p>

<!-- Perbandingan -->
{{#if umur >= 18}}Dewasa{{/if}}
```

### Raw Output

```dve
<!-- Default: HTML di-escape (aman dari XSS) -->
<p>{{inputPengguna}}</p>

<!-- Raw: tanpa HTML escape (hati-hati!) -->
<p>{{{htmlTerverifikasi}}}</p>
```

## Advanced Features

### Template Inheritance

```dve
<!-- views/layouts/base.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{judul}}</title>
  </head>
  <body>
    <!-- Include header -->
    <header>{{> header.dve}}</header>

    <main>
      {{konten}}
      <!-- Slot konten -->
    </main>

    <!-- Include footer -->
    <footer>{{> footer.dve}}</footer>
  </body>
</html>

<!-- views/pages/home.dve -->
{{#if konten}} {{konten}} {{else}}
<h1>Selamat Datang di Rumah!</h1>
{{/if}}
```

### Helper Functions

```typescript
// Helper kustom bisa ditambahkan via context state
export function GET(ctx: Context): Response {
  ctx.state.formatTanggal = (date: Date) => date.toLocaleDateString()
  ctx.state.formatMataUang = (amount: number) => `$${amount.toFixed(2)}`
  return ctx.render('dashboard', {
    transaksi: getTransaksi()
  })
}
```

```dve
<p>Tanggal: {{formatTanggal(transaksi.tanggal)}}</p>
<p>Jumlah: {{formatMataUang(transaksi.jumlah)}}</p>
```

## Performance

### Caching

Templates otomatis di-cache setelah kompilasi pertama:

```typescript
// Render pertama: kompilasi dan cache template AST
await ctx.render('template', data)

// Render selanjutnya: gunakan versi AST yang di-cache
await ctx.render('template', newData) // Cepat
```

**Catatan**: Cache hanya untuk kompilasi template, bukan data atau logic backend.

## Error Handling

```typescript
export function GET(ctx: Context): Response {
  try {
    return ctx.render('template', data)
  } catch (error) {
    if (error.message.includes('Template tidak ditemukan')) {
      return ctx.send.json({ error: 'Template hilang' }, { status: 404 })
    }
    return ctx.send.json({ error: 'Render gagal' }, { status: 500 })
  }
}
```

DVE memberikan balance antara simplicity dan power. Cukup sederhana untuk quick prototyping dan cukup tanggung untuk layanan production.
