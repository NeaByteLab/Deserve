---
description: 'Membungkus server Deserve dalam cangkang native dengan BrowserWindow, menu aplikasi dan konteks, ikon tray, perilaku dock, serta dialog native, semuanya terjaga agar entry yang sama berjalan di deno run.'
---

# Jendela, Menu, Tray dan Dialog

> **Referensi**: [Jendela Deno Desktop](https://docs.deno.com/runtime/desktop/windows/)

Cangkang native duduk di samping server Deserve, bukan di dalamnya. Server terus menyajikan halaman, dan blok kode penyiapan terpisah membuat jendela, menggantungkan menu padanya, menjatuhkan ikon di tray, serta menjawab dialog native. Semuanya berjalan dari file entry yang sama, jadi satu `main.ts` mencakup sisi web dan sisi native.

## Tetap Dwi-Mode

Kelas native tinggal di bawah `Deno` hanya di dalam bundle `deno desktop`. Di host dengan `deno run`, `Deno.BrowserWindow` tak terdefinisi. Sebuah penjaga memeriksanya sekali dan melewati seluruh penyiapan native saat ia hilang, yang menjaga pengembangan berbasis browser tetap jalan dari file yang sama:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const D = Deno as any

function isDesktop(): boolean {
  // Kelas native hanya ada di bundle
  return typeof D.BrowserWindow === 'function'
}

export function setupDesktop(): void {
  if (!isDesktop()) {
    // Lewati rangkaian native di host
    return
  }
  // ... buat jendela dan menu
}
```

Memanggil `setupDesktop()` dari `main.ts` sebelum `router.serve()` merangkai cangkang pada build desktop dan menyingkir di tempat lain.

## Membuat Jendela

Bundle terbuka dengan satu jendela awal implisit. Mengonstruksi [`BrowserWindow`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow) pertama mengadopsi jendela itu alih-alih membuka yang kedua, jadi judul dan ukuran berlaku pada jendela yang sudah di layar:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const D = Deno as any
// ---cut---
// Adopsi jendela awal implisit
const win = new D.BrowserWindow({
  title: 'Deserve Desktop',
  width: 980,
  height: 680
})
```

Objek jendela menggerakkan jendela terlihat dari sisi Deno. Langkah umumnya adalah `show()`, `hide()`, `focus()`, dan `reload()`, dan `executeJs()` menjalankan potongan JavaScript di dalam halaman, yang merupakan cara sisi Deno menjangkau kembali ke webview.

## Menu Aplikasi

[`setApplicationMenu()`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow.setApplicationMenu) membangun bilah menu dari sebuah array submenu. Tiap entri adalah `item` kustom dengan id dan akselerator opsional, atau `role` yang memetakan ke aksi bawaan seperti quit atau copy:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
win.setApplicationMenu([
  {
    submenu: {
      label: 'File',
      items: [
        // Item kustom dengan pintasan keyboard
        { item: { label: 'Save', id: 'save', accelerator: 'CmdOrCtrl+S', enabled: true } },
        // Role bawaan menangani dirinya
        { role: { role: 'quit' } }
      ]
    }
  }
])
```

Klik pada item kustom memicu event `menuclick` yang membawa id, jadi satu listener merutekan tiap pilihan menu. Handler menjangkau halaman dengan `executeJs()` saat aksi tergolong sisi web. Halaman menaruh fungsi `saveNote` di `window`, dan potongan memanggilnya setelah penjaga, karena fungsi hanya ada setelah halaman dimuat:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// deno-lint-ignore no-explicit-any
win.addEventListener('menuclick', (event: any) => {
  switch (event.detail.id) {
    case 'save':
      // Jalankan handler simpan halaman bila ada
      win.executeJs('if (window.saveNote) window.saveNote()')
      break
  }
})
```

Halaman menaruh `window.saveNote` agar pintasan menu dan tombol di halaman memicu satu jalur simpan. Arah Deno-ke-halaman lewat `executeJs()` ini berpasangan dengan panggilan HTTP halaman-ke-Deno dari [Menyajikan UI](/id/recipes/desktop/serving#berbicara-kembali-ke-server), dan bersama keduanya menggantikan kanal binding native yang dijelaskan di [Bindings dan Jembatan HTTP](/id/recipes/desktop/bindings).

## Menu Konteks

Klik kanan membuka menu konteks lewat [`showContextMenu()`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow.showContextMenu), diposisikan di kursor. Array menu memakai bentuk item yang sama dengan menu aplikasi, dan event `contextmenuclick` membawa id terpilih:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
const menu = [
  { item: { label: 'Reload', id: 'ctx-reload', enabled: true } },
  { item: { label: 'Quit', id: 'ctx-quit', enabled: true } }
]

// deno-lint-ignore no-explicit-any
win.addEventListener('mousedown', (event: any) => {
  // Tombol sekunder membuka menu
  if (event.button === 2) {
    win.showContextMenu(event.clientX, event.clientY, menu)
  }
})
```

## Event Jendela

Jendela memancarkan event siklus hidup. Listener `close` yang memanggil `preventDefault()` menjaga aplikasi tetap hidup saat jendela ditutup, yang cocok untuk aplikasi yang bersembunyi ke tray alih-alih keluar:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// deno-lint-ignore no-explicit-any
win.addEventListener('close', (event: any) => {
  // Sembunyi ke tray alih-alih keluar
  event.preventDefault()
  win.hide()
})
```

Menu tray lalu membawa quit eksplisit, jadi pengguna selalu punya jalan keluar.

## Ikon Tray

Sebuah [`Tray`](https://docs.deno.com/api/deno/~/Deno.Tray) menempatkan ikon di tray sistem dengan tooltip dan menu. Ikon menerima byte PNG mentah, dan menu memakai bentuk item yang sama seperti di atas:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const D = Deno as any
// deno-lint-ignore no-explicit-any
const win = {} as any
const iconBytes = new Uint8Array()
// ---cut---
const tray = new D.Tray()
// Atur ikon tray dari byte PNG
tray.setIcon(iconBytes)
tray.setTooltip('Deserve Desktop')
tray.setMenu([
  { item: { label: 'Show Window', id: 'show', enabled: true } },
  { item: { label: 'Quit', id: 'quit', enabled: true } }
])

tray.addEventListener('click', () => {
  // Klik tray memulihkan jendela
  win.show()
  win.focus()
})
```

## Perilaku Dock

Di macOS, objek [`dock`](https://docs.deno.com/api/deno/~/Deno.dock) menangani interaksi dock. Event `reopen` memicu saat ikon dock diklik tanpa jendela terlihat, yang merupakan saat untuk membawa UI kembali:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const D = Deno as any
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// deno-lint-ignore no-explicit-any
D.dock?.addEventListener('reopen', (event: any) => {
  // Buka kembali saat tak ada jendela terlihat
  if (!event.detail?.hasVisibleWindows) {
    win.show()
    win.focus()
  }
})
```

Objek dock hanya untuk macOS, jadi optional chaining membiarkan kode yang sama berjalan utuh di Windows dan Linux.

## Dialog Native

Fungsi dialog web meresolusi sebagai dialog OS native di dalam bundle. `alert()` menampilkan pesan, `confirm()` mengembalikan boolean, dan `prompt()` mengembalikan string yang diketik atau null. Mereka bekerja dari sisi Deno maupun sisi halaman:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// Blokir sampai pengguna menjawab
if (confirm('Quit Deserve Desktop?')) {
  Deno.exit(0)
}

// Baca kembali nilai dari pengguna
const name = prompt('Enter your name:', 'Deno')
win.executeJs(`document.title = ${JSON.stringify(String(name))}`)
```

Dengan cangkang terpasang, halaman berikutnya membahas satu fitur native yang tidak cocok dengan jalur serve Deserve, dan pola HTTP yang menggantikannya: [Bindings dan Jembatan HTTP](/id/recipes/desktop/bindings).
