import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  UnderlineType,
  PageBreak
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLOR_PRIMARY = '1E3A8A'; // Navy Blue BPS
const COLOR_SECONDARY = '0284C7'; // Cyan / Sky Blue
const COLOR_DARK = '1E293B'; // Slate 800
const COLOR_MUTED = '64748B'; // Slate 500
const COLOR_BG_LIGHT = 'F1F5F9'; // Slate 100
const COLOR_BORDER = 'CBD5E1'; // Slate 300

function createTitlePara(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        color: COLOR_PRIMARY,
        font: 'Arial'
      })
    ]
  });
}

function createSubtitlePara(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 280 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: COLOR_SECONDARY,
        font: 'Arial'
      })
    ]
  });
}

function createH1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 180 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
        color: COLOR_PRIMARY,
        font: 'Arial'
      })
    ]
  });
}

function createH2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: COLOR_SECONDARY,
        font: 'Arial'
      })
    ]
  });
}

function createH3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 19,
        color: COLOR_DARK,
        font: 'Arial'
      })
    ]
  });
}

function createPara(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.JUSTIFY,
    spacing: { before: options.before || 60, after: options.after || 120, line: 276 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: options.size || 21,
        color: options.color || COLOR_DARK,
        bold: options.bold || false,
        italics: options.italics || false
      })
    ]
  });
}

function createBullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + ' ', bold: true, font: 'Arial', size: 21, color: COLOR_DARK }));
  }
  children.push(new TextRun({ text, font: 'Arial', size: 21, color: COLOR_DARK }));

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 60, line: 260 },
    children
  });
}

function createSubBullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + ' ', bold: true, font: 'Arial', size: 20, color: COLOR_DARK }));
  }
  children.push(new TextRun({ text, font: 'Arial', size: 20, color: COLOR_DARK }));

  return new Paragraph({
    bullet: { level: 1 },
    spacing: { before: 30, after: 50, line: 250 },
    children
  });
}

function createCallout(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLOR_BG_LIGHT },
            borders: {
              left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_SECONDARY },
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE }
            },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: title, bold: true, color: COLOR_PRIMARY, font: 'Arial', size: 21 })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text, font: 'Arial', size: 20, color: COLOR_DARK })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createStyledTable(headers, rowsData) {
  const tableRows = [];

  // Header row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map(h => new TableCell({
        shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY },
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
          bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR_PRIMARY },
          left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
          right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: h, bold: true, color: 'FFFFFF', font: 'Arial', size: 19 })
            ]
          })
        ]
      }))
    })
  );

  // Data rows
  rowsData.forEach((row, rIdx) => {
    const isEven = rIdx % 2 === 0;
    tableRows.push(
      new TableRow({
        children: row.map((cellText, cIdx) => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: isEven ? 'FFFFFF' : COLOR_BG_LIGHT },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
            right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
          },
          children: [
            new Paragraph({
              alignment: cIdx === 0 || cellText.length <= 10 ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [
                new TextRun({ text: cellText, font: 'Arial', size: 18, color: COLOR_DARK })
              ]
            })
          ]
        }))
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

async function buildWordDocument() {
  const doc = new Document({
    creator: 'Tim Kehumasan & Pengolahan Data BPS Provinsi Kalimantan Barat',
    title: 'Buku Panduan Pengguna Resmi SIM-HUMAS BPS Kalbar',
    description: 'Panduan lengkap penggunaan sistem informasi manajemen kehumasan terpadu BPS Provinsi Kalimantan Barat',
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        children: [
          // ==========================================
          // COVER PAGE
          // ==========================================
          new Paragraph({ text: '', spacing: { before: 800 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'BADAN PUSAT STATISTIK',
                bold: true,
                size: 28,
                color: COLOR_MUTED,
                font: 'Arial'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 600 },
            children: [
              new TextRun({
                text: 'PROVINSI KALIMANTAN BARAT',
                bold: true,
                size: 32,
                color: COLOR_PRIMARY,
                font: 'Arial'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 200 },
            children: [
              new TextRun({
                text: 'BUKU PANDUAN PENGGUNA RESMI',
                bold: true,
                size: 40,
                color: COLOR_PRIMARY,
                font: 'Arial'
              })
            ]
          }),
          createSubtitlePara('SISTEM INFORMASI MANAJEMEN HUBUNGAN MASYARAKAT\n(SIM-HUMAS)'),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 800 },
            children: [
              new TextRun({
                text: 'Panduan Operasional Terpadu Multi-Role, Manajemen SLA, Pelayanan Informasi Publik, dan Administrasi Kehumasan',
                italics: true,
                size: 22,
                color: COLOR_MUTED,
                font: 'Arial'
              })
            ]
          }),
          new Paragraph({ text: '', spacing: { before: 1200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 60 },
            children: [
              new TextRun({ text: 'Versi Aplikasi: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: '1.2.0 (Integrated Triwulan & Background Sync)', size: 20, font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({ text: 'Penyusun: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: 'Tim Hubungan Masyarakat & Protokol BPS Provinsi Kalimantan Barat', size: 20, font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({ text: 'Tahun Penerbitan: ', bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: '2026', size: 20, font: 'Arial' })
            ]
          }),
          new PageBreak(),

          // ==========================================
          // KATA PENGANTAR
          // ==========================================
          createTitlePara('KATA PENGANTAR'),
          createPara('Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa atas tersusunnya Buku Panduan Pengguna Resmi Sistem Informasi Manajemen Hubungan Masyarakat (SIM-HUMAS) Badan Pusat Statistik Provinsi Kalimantan Barat. Aplikasi SIM-HUMAS hadir sebagai wujud nyata komitmen modernisasi tata kelola kehumasan dan keprotokolan terpadu yang terstruktur, transparan, dan berbasis digital.'),
          createPara('Buku panduan ini disusun secara komprehensif untuk memberikan pemahaman teknis dan operasional yang utuh bagi setiap personil, mulai dari pimpinan satuan kerja, koordinator kehumasan, anggota tim pelaksana, staf pemohon layanan, hingga satuan kerja BPS Kabupaten/Kota di seluruh wilayah Kalimantan Barat. Dengan buku ini, seluruh mekanisme input, delegasi tugas, monitoring SLA, hingga ekspor laporan dinas dapat dijalankan secara konsisten.'),
          createPara('Kami menyampaikan apresiasi setinggi-tingginya kepada seluruh pihak yang telah berkontribusi dalam perancangan, pengembangan, dan pengujian sistem ini. Semoga SIM-HUMAS mampu mendongkrak citra positif BPS dan memperkuat penyebarluasan data statistik yang berkualitas di Kalimantan Barat.'),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 300, after: 60 },
            children: [
              new TextRun({ text: 'Pontianak, Februari 2026', font: 'Arial', size: 21, italics: true })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({ text: 'Tim Penyusun SIM-HUMAS BPS Kalbar', bold: true, font: 'Arial', size: 21 })
            ]
          }),
          new PageBreak(),

          // ==========================================
          // DAFTAR ISI RINGKAS
          // ==========================================
          createTitlePara('DAFTAR ISI RINGKAS'),
          createBullet('BAB I: PENDAHULUAN & ARSITEKTUR SISTEM', '1.'),
          createBullet('BAB II: HAK AKSES & MATRIKS PERAN (ROLE MATRIX)', '2.'),
          createBullet('BAB III: AKSES AWAL, LOGIN, NAVIGASI & KEAMANAN AKUN', '3.'),
          createBullet('BAB IV: PANDUAN PENGGUNAAN 17 MODUL UTAMA APLIKASI', '4.'),
          createBullet('BAB V: STANDAR OPERASIONAL PROSEDUR (SOP) BERDASARKAN ROLE', '5.'),
          createBullet('BAB VI: PROSEDUR EKSPOR, IMPOR MASSAL EXCEL, & CETAK LAPORAN', '6.'),
          createBullet('BAB VII: SINKRONISASI LATAR BELAKANG & INTEGRITAS DATA', '7.'),
          createBullet('BAB VIII: TANYA JAWAB UMUM (FAQ) & DUKUNGAN TEKNIS', '8.'),
          new PageBreak(),

          // ==========================================
          // BAB I
          // ==========================================
          createH1('BAB I: PENDAHULUAN & ARSITEKTUR SISTEM'),
          createH2('1.1 Latar Belakang'),
          createPara('Kegiatan kehumasan pada Badan Pusat Statistik Provinsi Kalimantan Barat mencakup cakupan operasional yang sangat luas, meliputi perencanaan konten media sosial, produksi siaran pers rilis Berita Resmi Statistik (BRS), pelayanan informasi publik (PPID), keprotokolan pimpinan, penugasan MC dinas, kliping media massa, serta pengarsipan pedoman kehumasan.'),
          createPara('Sebelum adanya SIM-HUMAS, pencatatan dilakukan melalui spreadsheet terpisah yang rentan tumpang tindih data, keterlambatan pelaporan tugas, dan kesulitan dalam pemantauan kepatuhan Service Level Agreement (SLA). SIM-HUMAS mengintegrasikan seluruh alur kerja ini ke dalam satu basis data tunggal (Single Source of Truth).'),

          createH2('1.2 Maksud dan Tujuan'),
          createBullet('Mengintegrasikan seluruh data operasional kehumasan ke dalam sistem cloud terpadu.', 'a.'),
          createBullet('Menyediakan pengawasan kepatuhan batas waktu pengerjaan tugas (SLA) secara real-time.', 'b.'),
          createBullet('Membagi wewenang kerja yang akuntabel melalui 6 role pengguna terstandarisasi.', 'c.'),
          createBullet('Memfasilitasi pelaporan kinerja berkala dalam format ekspor resmi Excel dan PDF.', 'd.'),

          createH2('1.3 Arsitektur Data & Keandalan Sistem'),
          createPara('Aplikasi SIM-HUMAS dibangun dengan arsitektur modern berkeandalan tinggi (Hybrid Resilient Architecture):'),
          createBullet('Database Terpusat: Penyimpanan primer terkoneksi ke Google Workspace Spreadsheet terenkripsi.', '1.'),
          createBullet('Background Data Synchronization: Pembaruan data terjadi di latar belakang secara otomatis tanpa menyebabkan full page reload, form ter-reset, atau input pengguna yang sedang diketik terhapus.', '2.'),
          createBullet('Optimistic Local Cache: Perubahan data langsung direspon di layar peramban seketika sambil menyinkronkan tugas ke antrean server.', '3.'),
          new PageBreak(),

          // ==========================================
          // BAB II
          // ==========================================
          createH1('BAB II: HAK AKSES & MATRIKS PERAN (ROLE MATRIX)'),
          createH2('2.1 Definisi 6 Role Pengguna'),
          createBullet('Memiliki kewenangan tertinggi untuk mengelola seluruh data, hak akses akun, pengaturan master data rubrikasi, dan pemantauan sistem audit log.', '1. Administrator (admin):'),
          createBullet('Pejabat pimpinan dengan akses pemantauan eksekutif ke seluruh laporan, SLA kinerja, kalender pimpinan, dan kliping berita dalam mode tinjauan aman (read-only).', '2. Kepala BPS (kepala):'),
          createBullet('Ketua tim operasional yang berwenang merencanakan konten, mendelegasikan tugas, mengesahkan agenda protokol/MC/BRS, memproses tiket layanan PPID, dan mengunduh laporan berkala.', '3. Koordinator Humas (koordinator):'),
          createBullet('Pelaksana teknis yang bertugas mengeksekusi tugas, memperbarui progres pengerjaan (0-100%), mengunggah berkas repositori, dan melihat rekapitulasi kerja yang dikhususkan pada akun pribadinya.', '4. Tim Humas (tim):'),
          createBullet('Pengguna internal/eksternal yang membutuhkan layanan desain infografis, peliputan, atau data publikasi melalui modul permohonan tiket PPID.', '5. Pemohon Layanan (pemohon):'),
          createBullet('Satker daerah yang terhubung untuk mengambil rujukan pedoman, format template desain, dan direktori kontak personil humas provinsi.', '6. BPS Kabupaten/Kota (kabkot):'),

          createH2('2.2 Matriks Hak Akses Modul dan Tindakan'),
          createStyledTable(
            ['Nama Modul', 'Route URL', 'Admin', 'Kepala', 'Koordinator', 'Tim Humas', 'Pemohon', 'Kabkot'],
            [
              ['Dashboard', '/dashboard', 'CRUD', 'Lihat', 'CRUD', 'Lihat', 'Lihat', '-'],
              ['Penugasan Tim', '/penugasan', 'CRUD', '-', 'CRUD', 'Update Progres', '-', '-'],
              ['Content Planner', '/content-planner', 'CRUD', '-', 'CRUD', '-', '-', '-'],
              ['Rekap Rutin', '/rekap/rutin', 'CRUD', 'Lihat', 'CRUD', '-', '-', '-'],
              ['Rekap Ad Hoc', '/rekap/adhoc', 'CRUD', 'Lihat', 'CRUD', '-', '-', '-'],
              ['Protokoler', '/protokol', 'CRUD', 'Lihat', 'CRUD', '-', '-', '-'],
              ['Master of Ceremony', '/mc', 'CRUD', 'Lihat', 'CRUD', '-', '-', '-'],
              ['BRS Rilis', '/brs', 'CRUD', 'Lihat', 'CRUD', '-', '-', '-'],
              ['Ucapan Hari Besar', '/hari-besar', 'CRUD', 'Lihat', 'CRUD', '-', '-', '-'],
              ['SLA & Rekap Tugas', '/rekap', 'Penuh', 'Penuh', 'Penuh', 'Khusus Akun', '-', '-'],
              ['Layanan Tiket PPID', '/ppid', 'CRUD', 'Lihat', 'CRUD', '-', 'Buat/Pantau', '-'],
              ['Media Monitoring', '/monitoring', 'CRUD', 'Lihat', 'CRUD', 'Lihat', '-', '-'],
              ['Direktori Tim', '/tim', 'CRUD', 'Lihat', 'CRUD', '-', '-', 'Lihat'],
              ['Kalender Terpadu', '/kalender', 'CRUD', 'Lihat', 'CRUD', 'Lihat', '-', '-'],
              ['Pusat Dokumen', '/dokumen', 'CRUD', 'Lihat', 'CRUD', 'Tambah & Edit', '-', 'Unduh'],
              ['Master Data', '/pengaturan', 'CRUD', '-', '-', '-', '-', '-'],
              ['Manajemen User', '/manajemen-pengguna', 'CRUD', '-', '-', '-', '-', '-'],
              ['Reset Password', '/reset-akun', 'Mandiri', '-', 'Mandiri', 'Mandiri', '-', '-']
            ]
          ),
          new PageBreak(),

          // ==========================================
          // BAB III
          // ==========================================
          createH1('BAB III: AKSES AWAL, LOGIN, NAVIGASI & KEAMANAN AKUN'),
          createH2('3.1 Prosedur Masuk (Login)'),
          createPara('Untuk masuk ke dalam aplikasi SIM-HUMAS:'),
          createBullet('Buka peramban (Google Chrome, Microsoft Edge, atau Safari) dan akses tautan domain SIM-HUMAS.', '1.'),
          createBullet('Sistem otomatis mendeteksi sesi; jika belum masuk, Anda akan diarahkan ke halaman login (/login).', '2.'),
          createBullet('Ketikkan username terdaftar (huruf kecil, tanpa spasi, contoh: azhari, dian_pratama, admin).', '3.'),
          createBullet('Masukkan kata sandi akun Anda secara benar.', '4.'),
          createBullet('Klik tombol "Masuk ke SIM Humas" atau tekan tombol Enter.', '5.'),
          createBullet('Setelah validasi berhasil, sistem menyimpan token autentikasi dan mengarahkan Anda ke beranda modul sesuai hak akses.', '6.'),

          createH2('3.2 Navigasi Antarmuka & Tata Letak'),
          createBullet('Top Bar: Memuat logo instansi, penanda judul halaman aktif, tombol pencarian cepat, pengubah tema gelap/terang (Dark Mode), profil pengguna aktif, dan tombol keluar (Logout).', '•'),
          createBullet('Sidebar Desktop: Bilah menu vertikal sisi kiri yang menampilkan daftar modul yang diizinkan untuk role Anda.', '•'),
          createBullet('Bottom Navigation Bar: Bilah menu praktis di bawah layar khusus perangkat seluler (smartphone).', '•'),
          createBullet('Sistem Direct Routing: Pengguna dapat langsung membuka URL spesifik (misal: /rekap, /dokumen, /kalender), dan tombol Back/Forward browser berfungsi normal tanpa menyebabkan halaman kosong.', '•'),

          createH2('3.3 Fitur Reset Kredensial Mandiri (/reset-akun)'),
          createPara('Pengguna dengan role admin, koordinator, dan tim dapat memperbarui kata sandi mandiri:'),
          createBullet('Akses menu "Reset Kredensial" pada sidebar atau melalui URL /reset-akun.', '1.'),
          createBullet('Ketikkan kata sandi Anda yang lama pada kolom "Kata Sandi Sebelumnya" untuk verifikasi otentisitas.', '2.'),
          createBullet('Ketikkan kata sandi baru (minimal 6 karakter alfanumerik) pada kolom "Kata Sandi Baru".', '3.'),
          createBullet('Ulangi pengetikan kata sandi baru pada kolom "Konfirmasi Kata Sandi Baru".', '4.'),
          createBullet('Klik tombol "Simpan & Perbarui Akun". Sistem memverifikasi ke database dan memperbarui kredensial Anda secara permanen.', '5.'),
          new PageBreak(),

          // ==========================================
          // BAB IV
          // ==========================================
          createH1('BAB IV: PANDUAN PENGGUNAAN 17 MODUL UTAMA APLIKASI'),

          createH2('4.1 Modul Dashboard Terpadu (/dashboard)'),
          createPara('Pusat visualisasi data eksekutif yang menyajikan:'),
          createBullet('Kartu Statistik KPI: Total konten tayang, rilis BRS bulan berjalan, agenda protokol, dan kepatuhan SLA tim.', '•'),
          createBullet('Daftar Tugas & Agenda Hari Ini: Jadwal kegiatan yang jatuh tempo hari ini beserta penanggung jawab PIC.', '•'),
          createBullet('Grafik Distribusi Konten: Proporsi konten menurut kanal media sosial (Instagram, TikTok, YouTube, Portal).', '•'),

          createH2('4.2 Modul Penugasan Tim (/penugasan)'),
          createPara('Media delegasi tugas langsung dari Koordinator kepada personil Tim Humas:'),
          createBullet('Membuat Penugasan: Koordinator klik "+ Tambah Tugas", mengisi rincian tugas, menetapkan anggota pelaksana, prioritas, deadline, dan tautan TOR.', '•'),
          createBullet('Memperbarui Progres: Anggota tim mengklik ikon pena pada kartu tugasnya, mengubah status (Dalam Proses/Selesai), memperbarui nilai persen progres (0-100%), dan menempelkan link Google Drive bukti pengerjaan.', '•'),

          createH2('4.3 Modul Content Planner (/content-planner)'),
          createPara('Pengaturan strategi publikasi konten media digital:'),
          createBullet('Membuat Rencana: Klik "+ Tambah Rencana Konten", pilih format (Single Image, Carousel, Reels, Video), kanal publikasi, PIC pembuat, jam posting, dan tanggal tayang.', '•'),
          createBullet('Integrasi Otomatis: Konten yang statusnya diubah menjadi "Posted" secara otomatis disinkronkan ke modul Rekap Rutin untuk penghitungan rekapitulasi kehumasan.', '•'),

          createH2('4.4 Modul Rekap Rutin (/rekap/rutin)'),
          createPara('Pencatatan publikasi berkala berdasarkan rubrikasi resmi BPS: #SE2026, #DTSEN, #haribesar, #rilisbrs, #infografisbrs, #rilispublikasi, #SElasaSEnsus, #promosistatistik, #rripontianak, #zonaintegritas, #SKD, #ddakalbar, KLIK, dan Laporan. Memuat kolom tanggal, hari otomatis, nama petugas, tautan dokumentasi Drive, tautan konten tayang, dan opsi sinkronisasi ke kalender.'),

          createH2('4.5 Modul Kegiatan Ad Hoc (/rekap/adhoc)'),
          createPara('Pencatatan tugas liputan lapangan dan kepanitiaan insidental dengan dukungan pemilihan Multi-PIC otomatis. Pengguna dapat memilih beberapa personil sekaligus dan sistem secara otomatis menghitung kolom "Jumlah Bertugas".'),

          createH2('4.6 Modul Agenda Protokoler (/protokol)'),
          createPara('Pengawalan agenda kedinasan pimpinan dengan tingkat formalitas: Super Formal, Formal, Semi Formal, dan Non Formal. Mencatat lokasi, waktu mulai (format 24 jam), sifat kegiatan (internal/eksternal), dan petugas protokol pendamping.'),

          createH2('4.7 Modul Master of Ceremony (/mc)'),
          createPara('Penjadwalan pemandu acara resmi BPS guna mencegah jadwal ganda (conflict scheduling), memantau tingkat keformalan acara, dan menautkan naskah panduan MC digital.'),

          createH2('4.8 Modul Rilis Berita Resmi Statistik (/brs)'),
          createPara('Pengawalan agenda rilis bulanan data strategis (Inflasi, NTP, Pertumbuhan Ekonomi, Ekspor Impor, dsb). Mendukung penugasan tiga peran utama: PIC Poster/Infografis, PIC Dokumentasi Ruang Aula, dan PIC Live Streaming YouTube/Zoom.'),

          createH2('4.9 Modul Kalender Ucapan Hari Besar (/hari-besar)'),
          createPara('Pengingat peringatan hari besar keagamaan, nasional, internasional, dan hari jadi daerah Kalimantan Barat. Memuat bahan narasi sambutan pimpinan dan penetapan desainer grafis materi ucapan.'),

          createH2('4.10 Modul SLA & Rekapitulasi Tugas (/rekap)'),
          createPara('Modul analisis kinerja terlengkap yang menggabungkan seluruh 9 modul kerja:'),
          createBullet('Filter Berdasarkan Triwulan (Terbaru): Opsi penyaringan mencakup Semua TW, Triwulan I (Q1: Jan-Mar), Triwulan II (Q2: Apr-Jun), Triwulan III (Q3: Jul-Sep), dan Triwulan IV (Q4: Okt-Des). Pemilihan triwulan otomatis menyelaraskan pilihan dropdown Bulan, dan sebaliknya.', '•'),
          createBullet('Tampilan Terpersonalisasi Role Tim: Akun role tim langsung diarahkan ke tabel rekapitulasi tugas miliknya sendiri tanpa kategori umum dan tanpa rincian anggota lain.', '•'),
          createBullet('Status SLA: Penanda otomatis status Tepat Waktu (Hijau), Mendekati H-3 (Kuning), dan Terlambat Overdue (Merah).', '•'),
          createBullet('Ekspor Multifungsi: Tombol ekspor Excel multi-sheet, ekspor dokumen PDF resmi, dan tombol cetak.', '•'),

          createH2('4.11 Modul Layanan Humas / Tiket PPID (/ppid)'),
          createPara('Layanan terpadu permintaan data dan materi komunikasi publik:'),
          createBullet('Pemohon membuat tiket baru, mengisi kebutuhan dan melampirkan nota dinas.', '•'),
          createBullet('Koordinator/Admin mendisposisikan tiket kepada personil PIC pelaksana.', '•'),
          createBullet('Petugas menyelesaikan pekerjaan dan menyerahkan link hasil layanan pada tiket terkait.', '•'),

          createH2('4.12 Modul Media Monitoring (/monitoring)'),
          createPara('Kliping berita daring dan media cetak terkait BPS Kalbar yang memuat judul berita, media penerbit, tautan url, ringkasan, dan analisis sentimen (Positif, Netral, atau Negatif).'),

          createH2('4.13 Modul Direktori Tim Humas (/tim)'),
          createPara('Buku direktori resmi yang memuat profil 29 anggota tim kehumasan BPS Provinsi Kalimantan Barat lengkap dengan jabatan fungsional, seksi asal, tugas pokok, dan kontak WhatsApp aktif.'),

          createH2('4.14 Modul Kalender Terpadu (/kalender)'),
          createPara('Tampilan kalender visual yang memadukan jadwal Content Planner, Rilis BRS, Agenda Protokol, Penugasan MC, dan Hari Besar dalam satu matriks bulanan berwarna.'),

          createH2('4.15 Modul Pusat Dokumen & Repository (/dokumen)'),
          createPara('Katalog berkas digital kehumasan dengan folder Pedoman & Juknis, Template Desain, Registri Surat Masuk/Keluar, dan Kontak Mitra. Anggota role Tim memiliki hak penuh untuk menambah dan menyunting dokumen.'),

          createH2('4.16 Modul Pengaturan Sistem (/pengaturan)'),
          createPara('Khusus Administrator untuk mengelola master data seksi/bidang, daftar opsi rubrikasi kegiatan, dan kanal media publikasi.'),

          createH2('4.17 Modul Manajemen Pengguna (/manajemen-pengguna)'),
          createPara('Khusus Administrator untuk menambah pengguna baru, menyunting profil, mengatur role akun, mereset password pengguna, dan menonaktifkan akun yang sudah mutasi.'),
          new PageBreak(),

          // ==========================================
          // BAB V
          // ==========================================
          createH1('BAB V: STANDAR OPERASIONAL PROSEDUR (SOP) PENGGUNAAN BERDASARKAN ROLE'),

          createH2('5.1 SOP Role Administrator'),
          createBullet('Memastikan seluruh akun personil tim terdaftar dengan username dan role yang benar.', '1.'),
          createBullet('Memantau log aktivitas sistem untuk mendeteksi anomali perubahan data.', '2.'),
          createBullet('Memelihara kesesuaian master data kategori rubrikasi dengan program nasional sensus BPS.', '3.'),

          createH2('5.2 SOP Role Kepala BPS (Pemantauan Eksekutif)'),
          createBullet('Membuka Dashboard dan Kalender Terpadu di awal pekan untuk memantau agenda dinas pimpinan.', '1.'),
          createBullet('Membuka menu SLA & Rekap Tugas dan memilih filter Triwulan berjalan untuk mengevaluasi kepatuhan batas waktu tim.', '2.'),
          createBullet('Meninjau sentimen publikasi media pada modul Media Monitoring.', '3.'),

          createH2('5.3 SOP Role Koordinator Humas'),
          createBullet('Menyusun perencanaan konten mingguan pada modul Content Planner.', '1.'),
          createBullet('Mendelegasikan penugasan khusus dan agenda protokol/MC/BRS kepada personil anggota tim.', '2.'),
          createBullet('Memeriksa tiket permohonan layanan PPID yang masuk dan mendisposisikan kepada PIC pelaksana.', '3.'),
          createBullet('Mengunduh laporan kinerja berkala (Excel/PDF) pada akhir triwulan untuk laporan pimpinan.', '4.'),

          createH2('5.4 SOP Role Anggota Tim Humas'),
          createBullet('Mengecek daftar penugasan pribadi pada modul Penugasan Tim atau Dashboard.', '1.'),
          createBullet('Melaksanakan tugas dan mengunggah dokumen/hasil karya ke Google Drive resmi kantor.', '2.'),
          createBullet('Memperbarui status pengerjaan menjadi "Selesai" (100%) dan menautkan link Drive bukti pengerjaan.', '3.'),
          createBullet('Memeriksa capaian SLA pribadi pada menu SLA & Rekap Tugas.', '4.'),

          createH2('5.5 SOP Role Pemohon Layanan'),
          createBullet('Mengisi formulir tiket permohonan layanan PPID dengan rincian kebutuhan yang jelas.', '1.'),
          createBullet('Memantau notifikasi dan status progres tiket hingga pengerjaan tuntas.', '2.'),

          createH2('5.6 SOP Role BPS Kabupaten/Kota (Kabkot)'),
          createBullet('Mengakses menu Pusat Dokumen untuk mengunduh template materi promosi sensus dan pedoman rilis pers resmi.', '1.'),
          createBullet('Melihat kontak personil tim humas provinsi pada menu Direktori Tim jika memerlukan konsultasi.', '2.'),
          new PageBreak(),

          // ==========================================
          // BAB VI
          // ==========================================
          createH1('BAB VI: PROSEDUR EKSPOR, IMPOR MASSAL EXCEL, & CETAK LAPORAN'),

          createH2('6.1 Prosedur Ekspor Laporan Excel (.xlsx)'),
          createPara('Pada menu SLA & Rekap Tugas (/rekap):'),
          createBullet('Tentukan filter yang diinginkan (misal: Triwulan I, Tahun 2026, Kelompok Humas).', '1.'),
          createBullet('Arahkan kursor ke tombol hijau "Excel" di sudut kanan atas.', '2.'),
          createBullet('Pilih "Laporan Sesuai Filter Aktif" untuk data layar atau "Laporan Tahunan Berjalan" untuk rekapitulasi setahun penuh.', '3.'),
          createBullet('Sistem mengunduh berkas Excel multi-sheet resmi (Sheet Ringkasan Kinerja, Sheet Rekapitulasi Rubrikasi, dan Sheet Matriks Tugas Lengkap).', '4.'),

          createH2('6.2 Prosedur Ekspor Dokumen PDF & Cetak'),
          createPara('Arahkan kursor ke tombol merah "PDF" untuk mengunduh berkas laporan berformat PDF formal ber-kop instansi dengan kolom legalitas tanda tangan pimpinan, atau klik tombol "Cetak" untuk mencetak langsung ke kertas.'),

          createH2('6.3 Prosedur Impor Data Massal dengan Template Excel'),
          createPara('Untuk memasukkan puluhan baris kegiatan sekaligus secara cepat:'),
          createBullet('Klik "+ Tambah Data" pada modul yang bersangkutan (misal: Content Planner atau Rekap Rutin).', '1.'),
          createBullet('Pilih opsi "Impor Excel" lalu klik "Unduh Template Excel".', '2.'),
          createBullet('Buka template di Microsoft Excel, isi baris data sesuai aturan kolom pada sheet Panduan, lalu simpan berkas.', '3.'),
          createBullet('Unggah berkas tersebut kembali ke aplikasi SIM-HUMAS. Jendela status bar interaktif akan memvalidasi data hingga sukses tersimpan.', '4.'),
          new PageBreak(),

          // ==========================================
          // BAB VII
          // ==========================================
          createH1('BAB VII: SINKRONISASI LATAR BELAKANG & INTEGRITAS DATA'),
          createH2('7.1 Background Synchronization Tanpa Gangguan'),
          createPara('SIM-HUMAS menerapkan mekanisme sinkronisasi data cerdas:'),
          createBullet('Aplikasi mengambil pembaruan database secara otomatis di latar belakang tanpa me-refresh halaman web.', '•'),
          createBullet('Jika pengguna sedang mengetik pada formulir input, sistem menunda re-render komponen tersebut agar teks yang sedang diketik tidak hilang atau terganggu.', '•'),
          createBullet('Posisi scroll halaman, filter yang sedang aktif, dan tab yang sedang dibuka tetap dipertahankan.', '•'),

          createH2('7.2 Keamanan & Integritas Data'),
          createBullet('Proteksi Akun Utama: Akun Administrator utama dilindungi sistem dari penghapusan tidak disengaja.', '•'),
          createBullet('Pemisahan Akses: Pembatasan hak akses berbasis peran (RBAC) diterapkan di sisi peramban dan server.', '•'),
          new PageBreak(),

          // ==========================================
          // BAB VIII
          // ==========================================
          createH1('BAB VIII: TANYA JAWAB UMUM (FAQ) & DUKUNGAN TEKNIS'),

          createH3('Q1: Mengapa pada akun Tim Humas, menu SLA & Rekap hanya menampilkan data saya sendiri?'),
          createPara('Hal ini merupakan desain keamanan privasi aplikasi. Akun role tim difokuskan untuk memantau target dan capaian kinerjanya sendiri tanpa terganggu oleh data personil lain.'),

          createH3('Q2: Bagaimana cara mengganti kata sandi akun saya?'),
          createPara('Buka menu "Reset Kredensial" (/reset-akun), masukkan kata sandi lama Anda untuk verifikasi, lalu ketikkan kata sandi baru dan klik Simpan Data.'),

          createH3('Q3: Mengapa tombol Tambah Dokumen atau Edit Dokumen tidak muncul di akun saya?'),
          createPara('Ketersediaan tombol tindakan disesuaikan dengan role. Role Kepala dan Kabkot berada dalam mode peninjauan (read-only) untuk menjamin keamanan arsip dokumen.'),

          createH3('Q4: Bagaimana cara kerja filter Triwulan pada Rekap Tugas?'),
          createPara('Filter Triwulan membagi kalender ke dalam 4 kuartal (TW I: Jan-Mar, TW II: Apr-Jun, TW III: Jul-Sep, TW IV: Okt-Des). Memilih triwulan akan menyaring seluruh tugas dan menghitung ulang capaian SLA secara instan.'),

          createH3('Q5: Apakah saya bisa membuka halaman aplikasi secara langsung lewat URL?'),
          createPara('Ya. Setiap menu memiliki alamat URL tersendiri (contoh: /rekap, /dokumen, /kalender) dan mendukung fungsi navigasi Back/Forward pada browser Anda.'),

          createH2('Dukungan Teknis & Kontak Layanan'),
          createPara('Apabila Anda mengalami kendala teknis dalam pengoperasian SIM-HUMAS, hubungi Tim Pengolahan Data & Hubungan Masyarakat BPS Provinsi Kalimantan Barat:'),
          createBullet('Alamat: Jl. Jenderal Ahmad Yani No. 41, Pontianak, Kalimantan Barat', '•'),
          createBullet('Email: bps6100@bps.go.id / insancendekia2021@gmail.com', '•'),
          createBullet('Portal Bantuan: SIM-HUMAS BPS Kalbar (Menu Layanan Humas PPID)', '•')
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

async function main() {
  console.log('[Docx Generator] Generating Buku Panduan Pengguna SIM-HUMAS Word Document...');
  const buffer = await buildWordDocument();

  const publicDocsDir = path.join(__dirname, '..', 'public', 'docs');
  if (!fs.existsSync(publicDocsDir)) {
    fs.mkdirSync(publicDocsDir, { recursive: true });
  }

  const targetPath1 = path.join(publicDocsDir, 'Buku_Panduan_Pengguna_SIM-HUMAS_BPS_Kalbar.docx');
  const targetPath2 = path.join(__dirname, '..', 'Buku_Panduan_Pengguna_SIM-HUMAS_BPS_Kalbar.docx');

  fs.writeFileSync(targetPath1, buffer);
  fs.writeFileSync(targetPath2, buffer);

  console.log(`[Docx Generator] Successfully generated:`);
  console.log(` - ${targetPath1} (${buffer.length} bytes)`);
  console.log(` - ${targetPath2} (${buffer.length} bytes)`);
}

main().catch(err => {
  console.error('[Docx Generator] Error:', err);
  process.exit(1);
});
