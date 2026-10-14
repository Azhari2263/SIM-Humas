# Pembaruan Identitas Logo SIM Humas: Maskot "Si Humas" BPS Kalbar

Rencana pembaruan identitas visual aplikasi SIM Humas BPS Kalbar dengan mengganti logo generic chart/kamera menjadi ikon Maskot resmi "Si Humas" (karakter jurnalis berompi pers, ID card PERS BPS, dan mikrofon berita) secara seragam pada seluruh antarmuka web dan ikon instalasi aplikasi (PWA).

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan desain telah diselaraskan melalui klarifikasi interaktif:
> - **Karakter Logo Terpilih**: Maskot "Si Humas" berompi pers BPS, headset kehumasan, dan mikrofon berita (elemen ikonik dari halaman login).
> - **Cakupan Penerapan**: Seluruh titik kontak aplikasi mencakup sidebar navigasi desktop, header mobile sidebar, favicon tab browser, serta paket ikon instalasi PWA (`icon.svg`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, dan `apple-touch-icon.png`).
> - **Prinsip Batasan Ketat**: Hanya memperbarui logo dan aset terkait; tidak mengubah tata letak, fungsi data, media monitoring, autentikasi, maupun komponen lainnya yang tidak diminta.

## 1. Overview & Core Concept

- **Apa yang Berubah**: Transformasi logo aplikasi dari ikon grafis umum (*pie chart / camera icon*) menjadi representasi visual khas BPS Kalbar berupa Maskot "Si Humas" yang ramah, profesional, dan berwibawa di dunia kehumasan.
- **Audiens & Konteks**: Seluruh pimpinan, koordinator, staf humas, serta pemohon layanan BPS Provinsi Kalimantan Barat yang mengakses aplikasi via browser maupun aplikasi terinstal di Android, iOS, dan Desktop.
- **Nilai Utama**: Memperkuat *brand identity* SIM Humas, menciptakan keselarasan visual antara halaman login dan aplikasi utama, serta memberikan pengalaman aplikasi native yang konsisten saat terpasang di *home screen* ponsel pintar.

## 2. User Experience & Visual Design

### Titik Penerapan Visual

1. **Sidebar Desktop (`#desktop-sidebar .sidebar-logo-section`)**:
   - Wadah squircle logo (40x40px) diisi dengan vector SVG Maskot Si Humas berlatar gradien indigo-blue BPS yang tajam dan presisi.
   - Tetap mempertahankan tipografi teks "SIM Humas - BPS Prov. Kalbar" yang sudah rapi.

2. **Sidebar Mobile (`#mobile-sidebar`) & Navigasi**:
   - Ikon logo di bagian atas drawer mobile diselaraskan dengan vector Maskot Si Humas.

3. **Favicon Tab Browser (`<link rel="icon">`)**:
   - Berkas `icon.svg` diperbarui dengan komposisi Maskot Si Humas beresolusi tinggi, kontras tinggi, dan tajam pada ukuran tab 16px hingga 64px.

4. **Ikon Home Screen PWA & Dialog Instalasi**:
   - Dialog panduan instalasi PWA (modal Android/PC dan iOS) menampilkan avatar Maskot Si Humas.
   - Pembangkitan ulang aset biner PNG PWA (`pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`) dengan *safe-zone padding* (15%) agar tidak terpotong saat dipotong melingkar oleh launcher Android/iOS.

```
┌────────────────────────────────────────────────────────┐
│            IDENTITAS VISUAL MASKOT SI HUMAS            │
├──────────────────────────┬─────────────────────────────┤
│ Kepala & Wajah           │ Bulat ramah, senyum ceria,  │
│                          │ headset reporter biru       │
├──────────────────────────┼─────────────────────────────┤
│ Atribut Kehumasan        │ Rompi navy, lanyard kuning, │
│                          │ kartu pers putih "PERS BPS" │
├──────────────────────────┼─────────────────────────────┤
│ Alat Liputan             │ Mikrofon pers kubus BPS     │
│                          │ dengan gelombang suara biru │
├──────────────────────────┼─────────────────────────────┤
│ Latar Belakang Squircle  │ Gradien Deep Indigo & Blue  │
│                          │ (#4f46e5 -> #1e1b4b)        │
└──────────────────────────┴─────────────────────────────┘
```

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Vektorisasi SVG Terpadu vs Gambar Raster**
  - *Pendekatan Terpilih*: Menggunakan vector SVG murni yang dioptimalkan untuk `icon.svg` dan markup sidebar, serta skrip generator PNG beresolusi tinggi untuk PWA.
  - *Alasan*: SVG menghasilkan ketajaman sempurna tanpa pikselasi di layar Retina/AMOLED, ringan (dibawah 3KB), dan cepat dimuat.
  
- **Keputusan 2: Pemenuhan Standar Maskable Icon Android**
  - *Pendekatan Terpilih*: Pada `pwa-maskable-512x512.png`, karakter Maskot diletakkan di dalam *safe-zone* 80% dengan margin 15% di sekelilingnya berlatar gradien penuh.
  - *Alasan*: Mencegah kepala maskot atau mikrofon terpotong saat Android merender ikon menjadi lingkaran atau squircle.

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STRUKTUR PENGGANTIAN ASET & LOGO                         │
└─────────────────────────────────────────────────────────────────────────────┘

       [ Maskot SVG "Si Humas" ]
                   │
         ┌─────────┴──────────────┬────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
 ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
 │   index.html  │        │    icon.svg   │        │ scripts/      │
 │ (Desktop &    │        │ (Favicon Tab  │        │ generate-pwa- │
 │ Mobile Logo)  │        │ & Vector PWA) │        │ assets.js     │
 └───────────────┘        └───────────────┘        └───────┬───────┘
                                                           │
                                        ┌──────────────────┴──────────────────┐
                                        ▼                                     ▼
                               ┌─────────────────┐                   ┌─────────────────┐
                               │ pwa-192x192.png │                   │ apple-touch-    │
                               │ pwa-512x512.png │                   │ icon.png (iOS)  │
                               │ maskable (512)  │                   └─────────────────┘
                               └─────────────────┘
```

### Langkah Eksekusi (Setelah Approval)
1. Perbarui `icon.svg` dengan komposisi Maskot Si Humas lengkap dengan latar squircle BPS.
2. Perbarui `scripts/generate-pwa-assets.js` dan jalankan untuk meregenerasi seluruh biner PNG PWA (`pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`).
3. Perbarui elemen logo sidebar desktop (`#desktop-sidebar`) dan sidebar mobile (`#mobile-sidebar`) di `index.html` dengan ikon vector Maskot Si Humas.
4. Perbarui ikon di modal petunjuk instalasi PWA (`#pwa-generic-modal`).
5. Jalankan `compile_applet` untuk memverifikasi integritas build.
