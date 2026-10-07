import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb', type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

// Clean Seed Data for SIM Humas & Protokol BPS Kalbar (No dummy data)
const initialDb = {
  users: [
    { id: 1, username: 'admin', password: 'password', nama: 'Super Admin', role: 'admin', bidang: 'IPDS' },
    { id: 2, username: 'koordinator', password: 'password', nama: 'Azhari (Koordinator)', role: 'koordinator', bidang: 'Humas' },
    { id: 3, username: 'kepala', password: 'password', nama: 'Kepala BPS Kalbar', role: 'kepala', bidang: 'Pimpinan' },
    { id: 4, username: 'tim', password: 'password', nama: 'Staf Humas', role: 'tim', bidang: 'Humas' },
    { id: 5, username: 'pemohon', password: 'password', nama: 'User Bidang', role: 'pemohon', bidang: 'Sosial' },
    { id: 6, username: 'kabkot', password: 'password', nama: 'BPS Kab. Kubu Raya', role: 'kabkot', bidang: 'BPS Kab/Kota' }
  ],
  contentPlanner: [],
  brsSchedule: [],
  protocol: [],
  team: [],
  tickets: [],
  assets: [],
  monitoring: [],
  rekapRutin: [],
  adHoc: [],
  protokoler: [],
  mc: [],
  brsRilis: [],
  hariBesar: [],
  rekapKegiatan: [],
  notifications: [],
  auditTrail: [],
  masterData: [],
  assignments: [],
  repository: [
    {
      id: 1,
      nama_dokumen: 'Pedoman Standar Pelayanan Informasi Publik & Kehumasan BPS 2026',
      kategori: 'Pedoman',
      deskripsi: 'Panduan tata kelola penyebarluasan rilis data, protokol pimpinan, dan standar infografis.',
      tanggal: '2026-01-10',
      pic: 'Azhari (Koordinator)',
      link_cloud: 'https://drive.google.com/drive/folders/bps-kalbar-pedoman-humas',
      versi: 'v2.1',
      status: 'Aktif'
    },
    {
      id: 2,
      nama_dokumen: 'Template Desain Carousel & Infografis Rilis BRS (Adobe & Canva)',
      kategori: 'Template',
      deskripsi: 'Kit template grafis resmi identitas BPS Kalbar ukuran feed IG dan banner website.',
      tanggal: '2026-02-01',
      pic: 'Staf Humas',
      link_cloud: 'https://drive.google.com/drive/folders/bps-kalbar-template-desain',
      versi: 'v1.4',
      status: 'Aktif'
    },
    {
      id: 3,
      nama_dokumen: 'Daftar Kontak Media Partner & Wartawan Kalbar 2026',
      kategori: 'Daftar Kontak Media/Wartawan',
      deskripsi: 'Database jurnalis cetak, TV, radio, dan media siber lokal Pontianak dan sekitarnya.',
      tanggal: '2026-02-15',
      pic: 'Azhari (Koordinator)',
      link_cloud: 'https://docs.google.com/spreadsheets/d/bps-kalbar-kontak-wartawan',
      versi: '2026 Q1',
      status: 'Aktif'
    }
  ]
};

// In-Memory Database store
let database = JSON.parse(JSON.stringify(initialDb));

// Map sheet name in requests to database property
const SHEET_TO_PROP = {
  'content_planner': 'contentPlanner',
  'contentPlanner': 'contentPlanner',
  'brs_schedule': 'brsSchedule',
  'brsSchedule': 'brsSchedule',
  'protocol': 'protocol',
  'team': 'team',
  'tickets': 'tickets',
  'assets': 'assets',
  'monitoring': 'monitoring',
  'users': 'users',
  'rekap_rutin': 'rekapRutin',
  'rekapRutin': 'rekapRutin',
  'ad_hoc_2026': 'adHoc',
  'adHoc': 'adHoc',
  'protokoler': 'protokoler',
  'mc': 'mc',
  'brs_rilis': 'brsRilis',
  'brsRilis': 'brsRilis',
  'hari_besar': 'hariBesar',
  'hariBesar': 'hariBesar',
  'rekap_kegiatan': 'rekapKegiatan',
  'rekapKegiatan': 'rekapKegiatan',
  'notifications': 'notifications',
  'master_data': 'masterData',
  'masterData': 'masterData',
  'assignments': 'assignments',
  'auditTrail': 'auditTrail',
  'repository': 'repository'
};

// API endpoint matching code.gs doGet()
app.get('/api/sheets', (req, res) => {
  res.json(database);
});

// API endpoint matching code.gs doPost()
app.post('/api/sheets', (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
    }

    const { action, sheet, item } = body || {};
    if (!sheet) {
      return res.status(400).json({ success: false, error: 'Sheet name is required' });
    }

    const collectionName = SHEET_TO_PROP[sheet] || sheet;
    if (!database[collectionName]) {
      database[collectionName] = [];
    }

    const collection = database[collectionName];

    if (collectionName === 'contentPlanner' && item) {
      const pic = item['assign To'] || item.assignTo || item.assignedTo || item.pic || '';
      item['assign To'] = pic;
      item.assignTo = pic;
      item.assignedTo = pic;
      item.pic = pic;

      const media = item.media_post || item.media || 'Instagram';
      item.media_post = media;
      item.media = media;

      const jenis = item.jenis_konten || item.postType || item.jenis || 'Carousel';
      item.jenis_konten = jenis;
      item.postType = jenis;

      const jadwal = item.tanggal_posting || item.jadwal || '';
      item.tanggal_posting = jadwal;
      item.jadwal = jadwal;

      item.jam_posting = item.jam_posting || '09:00';

      const cloud = item.tautan_cloud || item.link_cloud || item.link_konten || '';
      item.tautan_cloud = cloud;
      item.link_cloud = cloud;
      item.link_konten = cloud;

      if (item.status === 'Posted') {
        item.progres = 100;
      } else if (item.status === 'Done' && (!item.progres || Number(item.progres) === 0)) {
        item.progres = 90;
      }
    }

    if (collectionName === 'hariBesar' && item) {
      item.kategori = item.kategori || 'Medsos Instansi';
      item.jenis_media = item.jenis_media || item.media || 'Instagram';
      item.data_pendukung = item.data_pendukung || item.link_cloud || '';
    }

    if (collectionName === 'rekapRutin' && item) {
      item.sifat_kegiatan = item.sifat_kegiatan || 'Rutin';
      if (item.status === 'Draft' || item.status === 'Sedang Dikerjakan') {
        // normalisasi status
      }
    }

    if (collectionName === 'monitoring' && item) {
      item.topik = item.topik || 'Umum';
      item.jenis_berita = item.jenis_berita || 'Media Online';
      item.sentimen = item.sentimen || 'Positif';
    }

    if (collectionName === 'tickets' && item) {
      if (item.status === 'Pending') item.status = 'Diajukan';
      else if (item.status === 'Approved') item.status = 'Diproses';
      else if (item.status === 'Rejected') item.status = 'Ditolak/Dibatalkan';
    }

    if (action === 'add') {
      if (!item) {
        return res.status(400).json({ success: false, error: 'Item data required' });
      }
      if (!item.id) {
        const maxId = collection.reduce((max, i) => Math.max(max, Number(i.id) || 0), 0);
        item.id = maxId + 1;
      }
      collection.push(item);
      return res.json({ success: true, item });
    }

    if (action === 'update') {
      if (!item || item.id === undefined) {
        return res.status(400).json({ success: false, error: 'Item ID required for update' });
      }
      const idx = collection.findIndex(i => Number(i.id) === Number(item.id));
      if (idx !== -1) {
        collection[idx] = { ...collection[idx], ...item };
        return res.json({ success: true, item: collection[idx] });
      } else {
        collection.push(item);
        return res.json({ success: true, item });
      }
    }

    if (action === 'delete') {
      if (!item || item.id === undefined) {
        return res.status(400).json({ success: false, error: 'Item ID required for delete' });
      }
      database[collectionName] = collection.filter(i => Number(i.id) !== Number(item.id));
      return res.json({ success: true });
    }

    res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('Error handling /api/sheets POST:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve static frontend assets
app.use(express.static(__dirname));

// Single Page Application Fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SIM Humas] Server started successfully on http://0.0.0.0:${PORT}`);
});
