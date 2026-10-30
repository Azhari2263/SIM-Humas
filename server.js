import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  scrapeGoogleNewsBpsKalbar,
  generateMonitoringWorkbook,
  syncExcelToGoogleDrive,
  normalizeArticleTopic,
  DRIVE_FOLDER_ID,
  DRIVE_FOLDER_URL,
  MONTH_NAMES
} from './scripts/monitoringEngine.js';
import bundledMonitoringData from './data/monitoring.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const MONITORING_FILE = path.join(DATA_DIR, 'monitoring.json');
const TMP_MONITORING_FILE = path.join('/tmp', 'monitoring.json');

// Memory cache for Google Drive access token across requests
let serverCachedDriveToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN || null;

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb', type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

// Handle CORS and Vercel internal rewrite path restoration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-matched-path');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.headers && req.headers['x-matched-path'] && (req.url === '/api' || req.url === '/api/index' || req.url === '/')) {
    req.url = req.headers['x-matched-path'];
  }
  next();
});

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
  team: [
    { id: 1, nama: 'Azhari, S.Tr.Stat.', jabatan: 'Koordinator Tim Kehumasan & IPDS', seksi: 'Diseminasi & Humas', email: 'azhari@bps.go.id', kontak: '0812-3456-7890', status: 'Aktif' },
    { id: 2, nama: 'Rina Marlina, S.Si.', jabatan: 'Staf Kehumasan & Media Publikasi', seksi: 'Publikasi & Komunikasi', email: 'rina.marlina@bps.go.id', kontak: '0813-4567-8901', status: 'Aktif' },
    { id: 3, nama: 'Dedi Irawan, A.Md.', jabatan: 'Desainer Grafis & Infografis', seksi: 'Visual & Multimedia', email: 'dedi.irawan@bps.go.id', kontak: '0814-5678-9012', status: 'Aktif' },
    { id: 4, nama: 'Sarah Salsabila, S.Stat.', jabatan: 'Pengelola Konten & Media Sosial', seksi: 'Digital & Media Sosial', email: 'sarah.s@bps.go.id', kontak: '0815-6789-0123', status: 'Aktif' },
    { id: 5, nama: 'Wahyu Pratama, S.Tr.Stat.', jabatan: 'Protokoler & Dokumentasi Acara', seksi: 'Protokol & Hubungan Lembaga', email: 'wahyu.p@bps.go.id', kontak: '0816-7890-1234', status: 'Aktif' },
    { id: 6, nama: 'Nurul Hidayah, S.E.', jabatan: 'Layanan Hubungan Masyarakat & BRS', seksi: 'Layanan Publik & BRS', email: 'nurul.h@bps.go.id', kontak: '0817-8901-2345', status: 'Aktif' }
  ],
  tickets: [],
  assets: [],
  monitoring: Array.isArray(bundledMonitoringData) ? bundledMonitoringData.map(item => ({
    ...item,
    topik: normalizeArticleTopic(item.topik)
  })) : [],
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

// In-Memory Database store with disk persistence for monitoring
let database = JSON.parse(JSON.stringify(initialDb));

// Load existing monitoring data from persistent or tmp storage if larger
const candidateMonitoringFile = fs.existsSync(TMP_MONITORING_FILE)
  ? TMP_MONITORING_FILE
  : (fs.existsSync(MONITORING_FILE) ? MONITORING_FILE : null);

if (candidateMonitoringFile) {
  try {
    const raw = fs.readFileSync(candidateMonitoringFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const existingUrls = new Set(database.monitoring.map(m => (m.url || '').trim().toLowerCase()).filter(Boolean));
      const existingTitles = new Set(database.monitoring.map(m => `${(m.judul || '').trim().toLowerCase()}_${m.tanggal || ''}`));
      let addedFromCandidate = 0;
      parsed.forEach(item => {
        const u = (item.url || '').trim().toLowerCase();
        const k = `${(item.judul || '').trim().toLowerCase()}_${item.tanggal || ''}`;
        if ((u && !existingUrls.has(u)) || (!u && !existingTitles.has(k))) {
          database.monitoring.push({
            ...item,
            topik: normalizeArticleTopic(item.topik)
          });
          if (u) existingUrls.add(u);
          existingTitles.add(k);
          addedFromCandidate++;
        }
      });
      console.log(`[DB] Restored monitoring data (${candidateMonitoringFile}). Total articles: ${database.monitoring.length} (+${addedFromCandidate} new).`);
    }
  } catch (e) {
    console.warn('[DB] Could not load monitoring.json:', e.message);
  }
}

function persistMonitoringData() {
  const content = JSON.stringify(database.monitoring || [], null, 2);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
    }
    fs.writeFileSync(MONITORING_FILE, content, 'utf8');
  } catch (e) {
    // If running in a read-only filesystem environment (e.g. Vercel Serverless Function)
    try {
      fs.writeFileSync(TMP_MONITORING_FILE, content, 'utf8');
    } catch (tmpErr) {
      console.warn('[DB] Could not save monitoring data to disk or /tmp:', tmpErr.message);
    }
  }
}

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
  'ad_hoc': 'adHoc',
  'adHoc': 'adHoc',
  'protokoler': 'protokoler',
  'mc': 'mc',
  'brs_rilis': 'brsRilis',
  'brsRilis': 'brsRilis',
  'brs': 'brsRilis',
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
app.get(['/api/sheets', '/sheets'], (req, res) => {
  res.json(database);
});

// API endpoint matching code.gs doPost()
app.post(['/api/sheets', '/sheets'], (req, res) => {
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

    if (collectionName === 'brsRilis' && item) {
      item.rubrikasi = item.rubrikasi || '#rilisbrs';
      if (!item.tanggal_rilis && item.tanggal) item.tanggal_rilis = item.tanggal;
      if (!item.tanggal && item.tanggal_rilis) item.tanggal = item.tanggal_rilis;
      if (!item.judul && item.kegiatan) item.judul = item.kegiatan;
      if (!item.kegiatan && item.judul) item.kegiatan = item.judul;
      if (!item.petugas && (item.pic_poster_info || item.pic_doc_ruang || item.pic_doc_yt_zoom)) {
        item.petugas = [item.pic_poster_info, item.pic_doc_ruang, item.pic_doc_yt_zoom].filter(Boolean).join(', ');
      }
      item.status = item.status || (item.highlight ? 'Rilis' : 'Terjadwal');
    }

    if (collectionName === 'adHoc' && item) {
      if (typeof item.petugas === 'string' && item.petugas.trim()) {
        const parts = item.petugas.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
        item.jumlah_bertugas = parts.length;
      }
    }

    if (collectionName === 'hariBesar' && item) {
      item.rubrikasi = item.rubrikasi || '#haribesar';
      if (!item.hari_besar && item.judul) item.hari_besar = item.judul;
      if (!item.judul && item.hari_besar) item.judul = item.hari_besar;
      if (!item.kegiatan && item.hari_besar) item.kegiatan = item.hari_besar;
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

// =============================================================
// MEDIA MONITORING BPS KALBAR APIs
// =============================================================

// Helper to get active report filename
function getMonitoringReportFileName(year = 2026, startM = 1, endM = 10) {
  let sName = typeof startM === 'number' ? MONTH_NAMES[startM - 1] : startM;
  let eName = typeof endM === 'number' ? MONTH_NAMES[endM - 1] : endM;
  if (!sName) sName = 'Januari';
  if (!eName) eName = 'Desember';
  return `Laporan_Monitoring Berita_BPS_Kalbar_${year}_${sName}-${eName}.xlsx`;
}

// 0. Get Authoritative Monitoring Data
app.get(['/api/monitoring/data', '/monitoring/data'], (req, res) => {
  res.json({
    success: true,
    totalCount: (database.monitoring || []).length,
    articles: database.monitoring || []
  });
});

// 1. Run Scraper Pipeline
app.post(['/api/monitoring/run-scraper', '/monitoring/run-scraper'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let accessToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } else if (req.body && req.body.accessToken) {
      accessToken = req.body.accessToken;
    }

    if (accessToken) {
      serverCachedDriveToken = accessToken;
    } else if (!accessToken && serverCachedDriveToken) {
      accessToken = serverCachedDriveToken;
    }

    const year = parseInt(req.body.year, 10) || 2026;
    const startMonth = Math.max(1, Math.min(12, parseInt(req.body.startMonth, 10) || 1));
    const endMonth = Math.max(1, Math.min(12, parseInt(req.body.endMonth, 10) || 10));

    console.log(`[Scraper] Starting BPS Kalbar media monitoring scrape pipeline for ${year} (bulan ${startMonth} s/d ${endMonth})...`);
    const scrapedArticles = await scrapeGoogleNewsBpsKalbar(year);
    console.log(`[Scraper] Fetched ${scrapedArticles.length} raw articles from Google News RSS`);

    if (!database.monitoring) database.monitoring = [];

    // Filter duplicates: compare link/URL or (clean title + date)
    const existingUrls = new Set(database.monitoring.map(m => (m.url || '').trim().toLowerCase()).filter(Boolean));
    const existingTitleDates = new Set(database.monitoring.map(m => `${(m.judul || '').trim().toLowerCase()}_${m.tanggal || ''}`));

    let addedCount = 0;
    const newArticles = [];

    for (const art of scrapedArticles) {
      art.topik = normalizeArticleTopic(art.topik);
      const artUrl = (art.url || '').trim().toLowerCase();
      const artTitleDate = `${(art.judul || '').trim().toLowerCase()}_${art.tanggal || ''}`;

      if (artUrl && existingUrls.has(artUrl)) continue;
      if (existingTitleDates.has(artTitleDate)) continue;

      if (artUrl) existingUrls.add(artUrl);
      existingTitleDates.add(artTitleDate);

      const maxId = database.monitoring.reduce((max, i) => Math.max(max, Number(i.id) || 0), 0);
      art.id = maxId + 1;
      database.monitoring.unshift(art); // Add latest first
      newArticles.push(art);
      addedCount++;
    }

    // Persist to disk
    persistMonitoringData();

    console.log(`[Scraper] Scrape complete. ${addedCount} new unique articles added. Total stored: ${database.monitoring.length}`);

    // Generate Excel file for specified range
    const fileName = getMonitoringReportFileName(year, startMonth, endMonth);
    const workbook = await generateMonitoringWorkbook(database.monitoring, year, startMonth, endMonth);
    const fileBuffer = await workbook.xlsx.writeBuffer();

    let driveSyncResult = null;
    if (accessToken) {
      try {
        console.log(`[Drive Sync] Syncing newly generated Excel report to Google Drive: ${fileName}...`);
        driveSyncResult = await syncExcelToGoogleDrive(accessToken, fileBuffer, fileName);
        console.log('[Drive Sync] Successfully synced to Google Drive:', driveSyncResult);
      } catch (driveErr) {
        console.warn('[Drive Sync] Google Drive sync error:', driveErr.message);
        driveSyncResult = { success: false, error: driveErr.message };
      }
    }

    res.json({
      success: true,
      addedCount,
      totalCount: database.monitoring.length,
      articles: database.monitoring, // Authoritative full dataset to ensure web is 100% in sync
      newArticles,
      fileName,
      year,
      startMonth,
      endMonth,
      driveSync: driveSyncResult,
      driveFolderId: DRIVE_FOLDER_ID,
      driveFolderUrl: DRIVE_FOLDER_URL
    });
  } catch (err) {
    console.error('Error in /api/monitoring/run-scraper:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Export / Download Styled Excel
app.get(['/api/monitoring/export-excel', '/monitoring/export-excel'], async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || 2026;
    const startMonth = Math.max(1, Math.min(12, parseInt(req.query.startMonth, 10) || 1));
    const endMonth = Math.max(1, Math.min(12, parseInt(req.query.endMonth, 10) || 10));

    const fileName = getMonitoringReportFileName(year, startMonth, endMonth);
    const articles = database.monitoring || [];
    const workbook = await generateMonitoringWorkbook(articles, year, startMonth, endMonth);
    const fileBuffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (err) {
    console.error('Error generating Excel download:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Sync to Google Drive Endpoint
app.post(['/api/monitoring/sync-drive', '/monitoring/sync-drive'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let accessToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } else if (req.body && req.body.accessToken) {
      accessToken = req.body.accessToken;
    }

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Google OAuth Access Token diperlukan. Silakan login ke akun Google terlebih dahulu.'
      });
    }

    serverCachedDriveToken = accessToken;

    const year = parseInt(req.body.year, 10) || 2026;
    const startMonth = Math.max(1, Math.min(12, parseInt(req.body.startMonth, 10) || 1));
    const endMonth = Math.max(1, Math.min(12, parseInt(req.body.endMonth, 10) || 10));

    const fileName = getMonitoringReportFileName(year, startMonth, endMonth);
    const articles = database.monitoring || [];
    const workbook = await generateMonitoringWorkbook(articles, year, startMonth, endMonth);
    const fileBuffer = await workbook.xlsx.writeBuffer();

    const result = await syncExcelToGoogleDrive(accessToken, fileBuffer, fileName);
    res.json({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      webViewLink: result.webViewLink,
      driveFolderUrl: DRIVE_FOLDER_URL
    });
  } catch (err) {
    console.error('Error in /api/monitoring/sync-drive:', err);
    const isAuthError = err.message && (err.message.includes('401') || err.message.includes('UNAUTHENTICATED') || err.message.includes('invalid authentication credentials'));
    const status = isAuthError ? 401 : 500;
    res.status(status).json({ success: false, error: err.message, isAuthError });
  }
});

// Serve static frontend assets and data files
app.use('/data', express.static(DATA_DIR));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Single Page Application Fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SIM Humas] Server started successfully on http://0.0.0.0:${PORT}`);
  });
}

export default app;
