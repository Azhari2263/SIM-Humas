import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const MONITORING_FILE = path.join(DATA_DIR, 'monitoring.json');
const TMP_MONITORING_FILE = path.join('/tmp', 'monitoring.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TMP_USERS_FILE = path.join('/tmp', 'users.json');

// Safe cross-version JSON loading (compatible with Node 18, 20, 22+)
let bundledMonitoringData = [];
try {
  if (fs.existsSync(MONITORING_FILE)) {
    bundledMonitoringData = JSON.parse(fs.readFileSync(MONITORING_FILE, 'utf8'));
  } else if (fs.existsSync(TMP_MONITORING_FILE)) {
    bundledMonitoringData = JSON.parse(fs.readFileSync(TMP_MONITORING_FILE, 'utf8'));
  }
} catch (loadErr) {
  console.warn('[Server] Could not load monitoring.json from disk:', loadErr.message);
}

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

// Allowed origins for CORS (production, preview, and local development)
const ALLOWED_ORIGINS = [
  'https://sim-humas.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://0.0.0.0:3000'
];

// Handle CORS, Security Headers, and Vercel internal rewrite path restoration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith('.run.app') ||
      origin.includes('localhost')
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-matched-path, x-forwarded-uri');
  
  // Standard Web Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const forwardedUri = req.headers && req.headers['x-forwarded-uri'];
  if (forwardedUri && forwardedUri.startsWith('/api') && !forwardedUri.startsWith('/api/index')) {
    req.url = forwardedUri;
  }
  next();
});

// Authoritative Google Sheets Endpoint for real-time synchronization
const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzqG9cQMjnpv-bOyifs4kfdpPYdEB5A5a7lw64Yod7GtfFKN4kcwN3BhYyeTQ90n4p7/exec';

// Helper untuk memfilter akun dummy warisan agar hanya akun dari spreadsheet yang digunakan
function isDummyUserAccount(u) {
  if (!u) return true;
  const uname = String(u.username || '').toLowerCase().trim();
  const nama = String(u.nama || u.name || '').toLowerCase().trim();
  if (['koordinator', 'kepala', 'tim', 'pemohon', 'kabkot', 'staf1'].includes(uname)) return true;
  if (['azhari (koordinator)', 'kepala bps kalbar', 'staf humas', 'user bidang', 'bps kab. kubu raya', 'super admin', 'admin humas'].includes(nama)) return true;
  return false;
}

// Seed Data for SIM Humas & Protokol BPS Kalbar synchronized with Google Sheets
const initialDb = {
  users: [],
  contentPlanner: [],
  brsSchedule: [],
  team: [],
  tickets: [],
  assets: [],
  monitoring: Array.isArray(bundledMonitoringData) ? bundledMonitoringData
    .filter(item => {
      if (!item || !item.tanggal) return false;
      const d = new Date((item.tanggal || item.tanggal_rilis) + 'T00:00:00Z');
      if (d.getUTCFullYear() !== 2026) return false;
      const maxDate = new Date();
      maxDate.setHours(23, 59, 59, 999);
      if (d > maxDate) return false;
      if (item.judul && item.judul.match(/(?:Triwulan\s+[IVX0-9\-]+\s*|SP|Regsosek\s+|Sensus\s+Pertanian\s+|Februari\s+|November\s+)(201[5-9]|202[0-5])/i)) return false;
      if (item.judul && (item.judul.includes('2018 - 2024') || item.judul.includes('triwulan III 2021'))) return false;
      return true;
    })
    .map(item => ({
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

// Load existing user data from newest persistent or tmp storage if present
let candidateUsersFile = null;
try {
  const hasTmpUsers = fs.existsSync(TMP_USERS_FILE);
  const hasDiskUsers = fs.existsSync(USERS_FILE);
  if (hasTmpUsers && hasDiskUsers) {
    const tmpMtime = fs.statSync(TMP_USERS_FILE).mtimeMs || 0;
    const diskMtime = fs.statSync(USERS_FILE).mtimeMs || 0;
    candidateUsersFile = tmpMtime > diskMtime ? TMP_USERS_FILE : USERS_FILE;
  } else if (hasTmpUsers) {
    candidateUsersFile = TMP_USERS_FILE;
  } else if (hasDiskUsers) {
    candidateUsersFile = USERS_FILE;
  }
} catch (_) {
  candidateUsersFile = fs.existsSync(TMP_USERS_FILE)
    ? TMP_USERS_FILE
    : (fs.existsSync(USERS_FILE) ? USERS_FILE : null);
}

if (candidateUsersFile) {
  try {
    const rawUsers = fs.readFileSync(candidateUsersFile, 'utf8');
    const parsedUsers = JSON.parse(rawUsers);
    if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
      database.users = parsedUsers.filter(u => !isDummyUserAccount(u));
      console.log(`[DB] Restored users cache from ${candidateUsersFile} (${database.users.length} users).`);
    }
  } catch (uErr) {
    console.warn('[DB] Could not load users.json:', uErr.message);
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

function persistUsersData() {
  const content = JSON.stringify(database.users || [], null, 2);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
    }
    fs.writeFileSync(USERS_FILE, content, 'utf8');
    if (fs.existsSync(TMP_USERS_FILE)) {
      try { fs.writeFileSync(TMP_USERS_FILE, content, 'utf8'); } catch (_) {}
    }
  } catch (e) {
    try {
      fs.writeFileSync(TMP_USERS_FILE, content, 'utf8');
    } catch (tmpErr) {
      console.warn('[DB] Could not save users data to disk or /tmp:', tmpErr.message);
    }
  }
}

// Synchronize user updates to Google Sheets database (Sheet: 'users' - Kolom B: username, Kolom C: password, Kolom D: nama, Kolom E: role, Kolom F: bidang)
async function syncUserToGoogleSheets(action, userItem) {
  if (!GOOGLE_SHEETS_API_URL || !userItem) return false;
  try {
    const payload = {
      action,
      sheet: 'users',
      item: {
        id: Number(userItem.id),
        username: userItem.username ? String(userItem.username).trim() : '',
        password: userItem.password !== undefined && userItem.password !== null && String(userItem.password).trim() !== '' ? String(userItem.password).trim() : 'password',
        nama: userItem.nama || userItem.name || userItem.username || '',
        role: String(userItem.role || 'tim').toLowerCase().trim(),
        bidang: userItem.bidang || ''
      }
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const resp = await fetch(GOOGLE_SHEETS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      redirect: 'follow',
      signal: controller.signal,
      body: JSON.stringify(payload)
    });
    clearTimeout(timer);
    if (resp.ok) {
      const resJson = await resp.json().catch(() => null);
      if (resJson && resJson.success === false) {
        console.warn(`[DB] Google Sheets rejected user ${action}:`, userItem.username, resJson.error);
        return false;
      }
      console.log(`[DB] Successfully synced user ${action} to Google Sheets:`, userItem.username, resJson);
      return true;
    }
  } catch (e) {
    console.warn(`[DB] Failed to sync user ${action} to Google Sheets:`, e.message);
  }
  return false;
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

// Background sync of users from Google Sheets (Authoritative source: Sheet users Kolom B: username, Kolom C: password)
let hasRefreshedUsersFromSheets = false;
let refreshUsersInFlight = null;
let refreshUsersInFlightStartedAt = 0;

async function refreshUsersFromSheets(options = {}) {
  const force = Boolean(options && options.force);
  const now = Date.now();
  if (refreshUsersInFlight && (!force || (now - refreshUsersInFlightStartedAt) < 2000)) {
    return refreshUsersInFlight;
  }

  const runRefresh = async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const separator = GOOGLE_SHEETS_API_URL.includes('?') ? '&' : '?';
      const fetchUrl = `${GOOGLE_SHEETS_API_URL}${separator}sheet=users`;
      const resp = await fetch(fetchUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timer);
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.users) && data.users.length > 0) {
          const sheetsUsersMap = new Map();

          data.users.forEach(u => {
            if (!u || isDummyUserAccount(u)) return;
            const rawId = u.id !== undefined && u.id !== null && String(u.id).trim() !== '' ? Number(u.id) : NaN;
            const uId = !Number.isNaN(rawId) && rawId > 0 ? rawId : undefined;
            const uUsername = String(u.username !== undefined && u.username !== null ? u.username : '').trim();
            const uPassword = String(u.password !== undefined && u.password !== null ? u.password : '').trim();
            const uNama = String(u.nama || u.name || uUsername || '').trim();
            const uRole = String(u.role || 'tim').toLowerCase().trim();
            const uBidang = String(u.bidang || '').trim();

            if (!uUsername) return;
            const idKey = uId ? `id:${uId}` : null;
            const unameKey = `uname:${uUsername.toLowerCase()}`;
            const key = idKey && !sheetsUsersMap.has(idKey) ? idKey : unameKey;
            sheetsUsersMap.set(key, {
              id: uId !== undefined ? uId : u.id,
              username: uUsername,
              password: uPassword,
              nama: uNama,
              name: uNama,
              role: uRole,
              bidang: uBidang
            });
          });

          database.users = Array.from(sheetsUsersMap.values());
          hasRefreshedUsersFromSheets = true;
          persistUsersData();
          console.log(`[DB] Successfully refreshed users from Google Sheets (${database.users.length} total users).`);
          return database.users;
        }
      }
    } catch (err) {
      console.warn('[DB] Could not refresh users from Google Sheets:', err.message);
    }
    return database.users || [];
  };

  refreshUsersInFlightStartedAt = now;
  const currentPromise = runRefresh().finally(() => {
    if (refreshUsersInFlight === currentPromise) {
      refreshUsersInFlight = null;
    }
  });
  refreshUsersInFlight = currentPromise;
  return currentPromise;
}

// Perform initial background sync
refreshUsersFromSheets().catch(() => {});

// Cryptographic Session Token & RBAC Security Engine (HMAC SHA-256)
const JWT_SECRET = process.env.SESSION_SECRET || 'sim-humas-bps-kalbar-secret-key-2026';
const revokedTokens = new Set();

function generateSessionToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    username: user.username,
    role: user.role,
    name: user.name || user.nama,
    bidang: user.bidang || '',
    iat: now,
    exp: now + (7 * 24 * 60 * 60) // 7 days expiration
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  if (revokedTokens.has(token)) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
  } catch (_) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) {
      return null; // Expired session
    }
    return data;
  } catch (_) {
    return null;
  }
}

// Secure server-side authentication endpoint with session token issue
app.post(['/api/auth/login', '/auth/login'], async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || password === undefined || password === null) {
      return res.status(400).json({ success: false, error: 'Nama pengguna dan kata sandi wajib diisi.' });
    }
    const rawUser = String(username).trim();
    const cleanUser = rawUser.toLowerCase();
    const rawPass = String(password);
    const cleanPass = rawPass.trim();

    // Helper untuk memvalidasi kata sandi murni dari spreadsheet (sheet users Kolom C)
    const checkPassword = (u) => {
      if (!u) return false;
      const expected = String(u.password !== undefined && u.password !== null ? u.password : '');
      const expectedTrim = expected.trim();

      if (expectedTrim && (rawPass === expected || cleanPass === expectedTrim)) {
        return true;
      }

      return false;
    };

    // Helper untuk mencocokkan akun berdasarkan username (Kolom B) atau nama (Kolom D) dari spreadsheet
    // Utamakan kecocokan username persis dan kandidat yang password-nya cocok jika ada lebih dari satu kandidat
    const matchUser = (userList) => {
      const validUsers = (userList || []).filter(u => u && !isDummyUserAccount(u));
      const byUsername = validUsers.filter(u => String(u.username || '').toLowerCase().trim() === cleanUser);
      if (byUsername.length > 0) {
        return byUsername.find(u => checkPassword(u)) || byUsername[0];
      }
      const byNama = validUsers.filter(u => String(u.nama || u.name || '').toLowerCase().trim() === cleanUser);
      if (byNama.length > 0) {
        return byNama.find(u => checkPassword(u)) || byNama[0];
      }
      return undefined;
    };

    let user = matchUser(database.users);

    // Jika pengguna belum ada di memory ATAU kata sandi tidak cocok,
    // langsung sinkronkan secara real-time dengan Google Sheets (sheet users kolom B & C)
    if (!user || !checkPassword(user)) {
      const refreshedUsers = await refreshUsersFromSheets({ force: true });
      const liveUser = matchUser(refreshedUsers);
      if (liveUser) {
        user = liveUser;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Nama pengguna tidak terdaftar dalam database.' });
    }

    if (!checkPassword(user)) {
      return res.status(401).json({ success: false, error: ' Username dan Kata sandi tidak sesuai.' });
    }

    // Return sanitized profile with cryptographic session token
    const safeUser = {
      id: user.id,
      username: user.username,
      role: String(user.role || 'tim').toLowerCase().trim(),
      name: user.nama || user.username,
      nama: user.nama || user.username,
      bidang: user.bidang || ''
    };
    const token = generateSessionToken(safeUser);
    return res.json({ success: true, user: safeUser, token });
  } catch (err) {
    console.error('[Auth Error]:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem saat proses login.' });
  }
});

// Secure server-side session termination endpoint
app.post(['/api/auth/logout', '/auth/logout'], (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.body && req.body.token);
    if (token) {
      revokedTokens.add(token);
    }
    return res.json({ success: true, message: 'Sesi berhasil diakhiri.' });
  } catch (err) {
    return res.json({ success: true });
  }
});

// =============================================================
// USER MANAGEMENT & CREDENTIAL RESET (ADMIN ROLE ONLY)
// =============================================================

function getAdminSession(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ((req.body && req.body.token) || (req.query && req.query.token));
  const session = verifySessionToken(token);
  if (!session) return null;
  if (String(session.role).toLowerCase().trim() !== 'admin') return null;
  return session;
}

// 1. Get full users list with credential status (Admin, Ketua Tim, and Tim)
app.get(['/api/admin/users', '/admin/users', '/api/users/list'], async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ((req.body && req.body.token) || (req.query && req.query.token));
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.'
    });
  }

  const role = String(session.role || '').toLowerCase().trim();
  if (role !== 'admin' && role !== 'koordinator' && role !== 'tim') {
    return res.status(403).json({
      success: false,
      error: 'Akses Ditolak (403 Forbidden): Hanya Administrator, Ketua Tim, atau Tim yang berhak mengakses data kredensial.'
    });
  }

  const forceRefresh = req.query && (req.query.refresh === '1' || req.query.refresh === 'true');
  if (!database.users || database.users.length === 0 || !hasRefreshedUsersFromSheets || forceRefresh) {
    await refreshUsersFromSheets({ force: forceRefresh });
  }

  const users = (database.users || []).filter(u => !isDummyUserAccount(u)).map(u => ({
    id: u.id,
    nama: u.nama || u.name || '',
    username: u.username || '',
    role: String(u.role || 'tim').toLowerCase().trim(),
    bidang: u.bidang || '',
    password: u.password !== undefined && u.password !== null ? u.password : '',
    isDefaultPassword: !u.password || u.password === 'password'
  }));

  return res.json({ success: true, users });
});

// 2. Reset Username & Password endpoint (Admin, Ketua Tim / Koordinator, and Tim)
app.post(['/api/admin/users/reset', '/api/users/reset', '/admin/users/reset'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ((req.body && req.body.token) || (req.query && req.query.token));
    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.'
      });
    }

    const body = req.body || {};
    const targetUserId = body.userId || body.id;
    const targetNewUsername = body.newUsername !== undefined ? body.newUsername : body.username;
    const targetNewPassword = body.newPassword !== undefined ? body.newPassword : body.password;
    const resetToDefault = body.resetToDefault;

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'ID Pengguna wajib disertakan.' });
    }

    let user = (database.users || []).find(u => Number(u.id) === Number(targetUserId));
    if (!user) {
      await refreshUsersFromSheets({ force: true });
      user = (database.users || []).find(u => Number(u.id) === Number(targetUserId));
    }
    if (!user) {
      return res.status(404).json({ success: false, error: 'Akun pengguna tidak ditemukan dalam database.' });
    }

    // Role-based access control for resetting credentials:
    // 1. Admin can reset any account
    // 2. Any user can reset their own username & password (sub or username match)
    // 3. Koordinator (Ketua Tim) can reset their own account OR any team member (role 'tim')
    const sessionRole = String(session.role || '').toLowerCase().trim();
    const isSelf = Number(session.sub) === Number(targetUserId) ||
                   String(session.username || '').toLowerCase().trim() === String(user.username || '').toLowerCase().trim();
    const isAdmin = sessionRole === 'admin';
    const isKetuaTim = sessionRole === 'koordinator';
    const targetIsTim = String(user.role || '').toLowerCase().trim() === 'tim';

    if (!isAdmin && !isSelf && !(isKetuaTim && targetIsTim)) {
      return res.status(403).json({
        success: false,
        error: 'Akses Ditolak: Anda tidak memiliki wewenang untuk mereset akun ini.'
      });
    }

    const targetNewNama = body.nama !== undefined ? body.nama : (body.newNama !== undefined ? body.newNama : body.name);
    const oldPassword = body.oldPassword !== undefined ? body.oldPassword : body.currentPassword;

    let usernameChanged = false;
    let passwordChanged = false;

    // Validasi Kata Sandi Sebelumnya sebagai validasi akun sebelum memasukkan Kata Sandi Baru
    if (targetNewPassword !== undefined && targetNewPassword !== null && !resetToDefault) {
      const checkOldPwdMatch = (u) => {
        const expectedPassword = String(u.password !== undefined && u.password !== null && String(u.password).trim() !== '' ? u.password : 'password').trim();
        return String(oldPassword).trim() === expectedPassword || (expectedPassword === 'password' && !u.password && String(oldPassword).trim() === 'password');
      };

      // Jika mereset akun sendiri atau jika oldPassword dikirimkan, wajibkan validasi sandi sebelumnya
      if (isSelf || oldPassword !== undefined) {
        if (!oldPassword || String(oldPassword).trim() === '') {
          return res.status(400).json({
            success: false,
            error: 'Kata sandi sebelumnya wajib diisi sebagai validasi akun sebelum memasukkan kata sandi baru.'
          });
        }
        if (!checkOldPwdMatch(user)) {
          // Cache memori/users.json bisa saja tertinggal dari Google Sheets — sinkronkan dulu sebelum menolak
          await refreshUsersFromSheets({ force: true });
          const refreshedUser = (database.users || []).find(u => Number(u.id) === Number(targetUserId));
          if (refreshedUser) {
            user = refreshedUser;
          }
          if (!checkOldPwdMatch(user)) {
            return res.status(400).json({
              success: false,
              error: 'Kata sandi sebelumnya tidak sesuai! Validasi akun gagal.'
            });
          }
        }
      }
    }

    // Ubah Nama Akun jika diberikan
    if (targetNewNama !== undefined && targetNewNama !== null) {
      const cleanNama = String(targetNewNama).trim();
      if (cleanNama) {
        user.nama = cleanNama;
        user.name = cleanNama;
      }
    }

    // Ubah Username jika diberikan
    if (targetNewUsername !== undefined && targetNewUsername !== null) {
      const cleanNewUser = String(targetNewUsername).trim();
      if (!cleanNewUser) {
        return res.status(400).json({ success: false, error: 'Username tidak boleh kosong.' });
      }
      if (!/^[a-zA-Z0-9_.\-]+$/.test(cleanNewUser)) {
        return res.status(400).json({ success: false, error: 'Username hanya boleh berupa huruf, angka, underscore (_), minus (-), atau titik (.) tanpa spasi.' });
      }

      // Pastikan username unik di antara akun lain
      const duplicate = (database.users || []).find(u =>
        Number(u.id) !== Number(targetUserId) &&
        u.username &&
        u.username.toLowerCase().trim() === cleanNewUser.toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({ success: false, error: `Username "${cleanNewUser}" sudah digunakan oleh akun lain (${duplicate.nama || duplicate.username}). Silakan pilih username yang berbeda.` });
      }

      if (user.username !== cleanNewUser) {
        user.username = cleanNewUser;
        usernameChanged = true;
      }
    }

    // Reset Password
    if (resetToDefault) {
      user.password = 'password';
      passwordChanged = true;
    } else if (targetNewPassword !== undefined && targetNewPassword !== null) {
      const cleanPwd = String(targetNewPassword).trim();
      if (cleanPwd.length < 4) {
        return res.status(400).json({ success: false, error: 'Kata sandi minimal terdiri dari 4 karakter.' });
      }
      user.password = cleanPwd;
      passwordChanged = true;
    }

    persistUsersData();
    const sheetsSynced = await syncUserToGoogleSheets('update', user);

    const safeUpdatedUser = {
      id: user.id,
      username: user.username,
      role: String(user.role || 'tim').toLowerCase().trim(),
      name: user.nama || user.username,
      nama: user.nama || user.username,
      bidang: user.bidang || ''
    };
    const refreshedToken = isSelf ? generateSessionToken(safeUpdatedUser) : undefined;

    return res.json({
      success: true,
      sheetsSynced,
      message: 'Username dan password berhasil diperbarui',
      ...(refreshedToken ? { token: refreshedToken } : {}),
      user: {
        id: user.id,
        nama: user.nama,
        username: user.username,
        role: user.role,
        bidang: user.bidang,
        password: user.password || 'password',
        isDefaultPassword: !user.password || user.password === 'password'
      },
      users: (database.users || []).filter(u => !isDummyUserAccount(u)).map(u => ({
        id: u.id,
        nama: u.nama || u.name || '',
        username: u.username || '',
        role: String(u.role || 'tim').toLowerCase().trim(),
        bidang: u.bidang || '',
        password: u.password !== undefined && u.password !== null && u.password !== '' ? u.password : 'password',
        isDefaultPassword: !u.password || u.password === 'password'
      })),
      usernameChanged,
      passwordChanged
    });
  } catch (err) {
    console.error('[Reset Credential Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memproses reset kredensial pengguna.' });
  }
});

// 3. User Management CRUD endpoint (Admin only)
app.post(['/api/admin/users', '/admin/users'], async (req, res) => {
  try {
    const admin = getAdminSession(req);
    if (!admin) {
      return res.status(403).json({
        success: false,
        error: 'Akses Ditolak (403 Forbidden): Hanya Administrator yang dapat mengelola akun pengguna.'
      });
    }

    const { action, user: item, userId } = req.body || {};

    if (action === 'delete') {
      const targetId = userId || (item && item.id);
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'ID Pengguna wajib disertakan untuk penghapusan.' });
      }
      const targetUser = (database.users || []).find(u => Number(u.id) === Number(targetId));
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Akun pengguna tidak ditemukan.' });
      }
      if (String(targetUser.username).toLowerCase().trim() === 'admin') {
        return res.status(400).json({ success: false, error: 'Akun Administrator utama ("admin") dilindungi dan tidak boleh dihapus.' });
      }

      database.users = database.users.filter(u => Number(u.id) !== Number(targetId));
      persistUsersData();
      const sheetsSynced = await syncUserToGoogleSheets('delete', { id: targetId });
      return res.json({ success: true, sheetsSynced, users: database.users, message: `Akun "${targetUser.nama || targetUser.username}" berhasil dihapus.` });
    }

    if (action === 'add') {
      if (!item || !item.nama || !item.username) {
        return res.status(400).json({ success: false, error: 'Nama lengkap dan username wajib diisi.' });
      }
      const cleanUser = String(item.username).trim();
      const duplicate = (database.users || []).find(u => u.username && u.username.toLowerCase().trim() === cleanUser.toLowerCase());
      if (duplicate) {
        return res.status(400).json({ success: false, error: `Username "${cleanUser}" sudah terdaftar.` });
      }

      const maxId = (database.users || []).reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
      const newId = item.id && !(database.users || []).some(u => Number(u.id) === Number(item.id)) ? Number(item.id) : (maxId + 1);
      const cleanNama = String(item.nama).trim();
      const newUser = {
        id: newId,
        nama: cleanNama,
        name: cleanNama,
        username: cleanUser,
        role: String(item.role || 'tim').toLowerCase().trim(),
        bidang: item.bidang || '',
        password: item.password && String(item.password).trim() ? String(item.password).trim() : 'password'
      };

      database.users.push(newUser);
      persistUsersData();
      const sheetsSynced = await syncUserToGoogleSheets('add', newUser);
      return res.json({ success: true, sheetsSynced, user: newUser, users: database.users, message: `Akun baru "${newUser.nama}" berhasil dibuat.` });
    }

    if (action === 'update') {
      if (!item || item.id === undefined) {
        return res.status(400).json({ success: false, error: 'ID Pengguna wajib disertakan.' });
      }
      const userIdx = (database.users || []).findIndex(u => Number(u.id) === Number(item.id));
      if (userIdx === -1) {
        return res.status(404).json({ success: false, error: 'Akun pengguna tidak ditemukan.' });
      }

      const existing = database.users[userIdx];
      if (item.username) {
        const cleanUser = String(item.username).trim();
        const duplicate = (database.users || []).find(u => Number(u.id) !== Number(item.id) && u.username && u.username.toLowerCase().trim() === cleanUser.toLowerCase());
        if (duplicate) {
          return res.status(400).json({ success: false, error: `Username "${cleanUser}" sudah digunakan oleh akun lain.` });
        }
        existing.username = cleanUser;
      }

      if (item.nama) {
        existing.nama = String(item.nama).trim();
        existing.name = existing.nama;
      }
      if (item.role) existing.role = String(item.role).toLowerCase().trim();
      if (item.bidang !== undefined) existing.bidang = item.bidang;
      if (item.password !== undefined && item.password !== null && String(item.password).trim() !== '') {
        existing.password = String(item.password).trim();
      }

      persistUsersData();
      const sheetsSynced = await syncUserToGoogleSheets('update', existing);
      return res.json({ success: true, sheetsSynced, user: existing, users: database.users, message: `Data akun "${existing.nama}" berhasil diperbarui.` });
    }

    return res.status(400).json({ success: false, error: 'Aksi tidak valid.' });
  } catch (err) {
    console.error('[Admin Users CRUD Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memproses manajemen akun.' });
  }
});

// API endpoint matching code.gs doGet() with user credentials sanitized
app.get(['/api/sheets', '/sheets'], (req, res) => {
  const safeDatabase = { ...database };
  if (Array.isArray(safeDatabase.users)) {
    safeDatabase.users = safeDatabase.users.map(({ password, ...u }) => u);
  }
  res.json(safeDatabase);
});

// API endpoint matching code.gs doPost() with payload sanitization & validation
app.post(['/api/sheets', '/sheets'], async (req, res) => {
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
    if (!sheet || typeof sheet !== 'string') {
      return res.status(400).json({ success: false, error: 'Sheet name is required' });
    }

    const collectionName = SHEET_TO_PROP[sheet] || sheet;

    // SEC-01 & SEC-02 FIX: Require session token validation for mutation requests
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (body && body.token);
    const session = token ? verifySessionToken(token) : null;

    // User management through sheets: allowed for admin, or self/koordinator on update
    if (collectionName === 'users' || sheet === 'users' || String(sheet).toLowerCase().includes('user')) {
      const sessionRole = session ? String(session.role || '').toLowerCase().trim() : '';
      const isAdmin = sessionRole === 'admin';
      const isSelfUpdate = action === 'update' && session && item && (
        Number(session.sub) === Number(item.id) ||
        (session.username && item.username && String(session.username).toLowerCase().trim() === String(item.username).toLowerCase().trim())
      );
      const isKetuaTimUpdate = action === 'update' && sessionRole === 'koordinator' && item;

      if (!isAdmin && !isSelfUpdate && !isKetuaTimUpdate) {
        return res.status(403).json({
          success: false,
          error: 'Akses Ditolak (403 Forbidden): Koleksi data pengguna dilindungi dan hanya dapat dimodifikasi oleh pengguna terkait atau Administrator.'
        });
      }

      if (action === 'add') {
        if (!item || !item.username) return res.status(400).json({ success: false, error: 'Data username wajib diisi' });
        const maxId = (database.users || []).reduce((m, u) => Math.max(m, Number(u.id) || 0), 0);
        item.id = item.id || (maxId + 1);
        if (!item.password) item.password = 'password';
        database.users.push(item);
        persistUsersData();
        syncUserToGoogleSheets('add', item).catch(() => {});
        return res.json({ success: true, item });
      }

      if (action === 'update') {
        if (!item || item.id === undefined) return res.status(400).json({ success: false, error: 'User ID diperlukan' });
        const idx = (database.users || []).findIndex(u => Number(u.id) === Number(item.id));
        if (idx !== -1) {
          database.users[idx] = { ...database.users[idx], ...item };
          persistUsersData();
          const sheetsSynced = await syncUserToGoogleSheets('update', database.users[idx]);
          return res.json({ success: true, sheetsSynced, item: database.users[idx] });
        } else {
          database.users.push(item);
          persistUsersData();
          const sheetsSynced = await syncUserToGoogleSheets('update', item);
          return res.json({ success: true, sheetsSynced, item });
        }
      }

      if (action === 'delete') {
        if (!item || item.id === undefined) return res.status(400).json({ success: false, error: 'User ID diperlukan' });
        const target = (database.users || []).find(u => Number(u.id) === Number(item.id));
        if (target && String(target.username).toLowerCase() === 'admin') {
          return res.status(400).json({ success: false, error: 'Akun admin utama tidak boleh dihapus.' });
        }
        database.users = database.users.filter(u => Number(u.id) !== Number(item.id));
        persistUsersData();
        syncUserToGoogleSheets('delete', { id: item.id }).catch(() => {});
        return res.json({ success: true });
      }
    }

    // Reject unauthenticated mutations in production or when an invalid/expired token is supplied
    if (token && !session) {
      return res.status(401).json({
        success: false,
        error: 'Sesi Tidak Valid atau Kedaluwarsa (401 Unauthorized): Silakan login kembali.'
      });
    }

    if (!SHEET_TO_PROP[sheet] && !database[collectionName]) {
      return res.status(400).json({ success: false, error: `Invalid sheet target: ${sheet}` });
    }

    const allowedActions = ['add', 'update', 'delete', 'batch_update', 'sync'];
    if (action && !allowedActions.includes(action)) {
      return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
    }

    // Defensive prototype pollution & oversized payload guard
    if (item && typeof item === 'object') {
      delete item.__proto__;
      delete item.constructor;
      delete item.prototype;
      for (const k of Object.keys(item)) {
        if (typeof item[k] === 'string' && item[k].length > 10000) {
          item[k] = item[k].substring(0, 10000);
        }
      }
    }

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

      const cloud = item.tautan_cloud || item.tautan_dokumentasi || item.link_cloud || '';
      const konten = item.tautan_konten || item.link_konten || cloud || '';
      item.tautan_cloud = cloud;
      item.tautan_dokumentasi = cloud;
      item.link_cloud = cloud;
      item.tautan_konten = konten;
      item.link_konten = konten;

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

// Cooldown guard to prevent scraping denial-of-service and rate limit bans
let lastScraperRunTime = 0;
const SCRAPER_COOLDOWN_MS = 10000; // 10 seconds cooldown between executions

// 1. Run Scraper Pipeline
app.post(['/api/monitoring/run-scraper', '/monitoring/run-scraper'], async (req, res) => {
  try {
    const now = Date.now();
    if (now - lastScraperRunTime < SCRAPER_COOLDOWN_MS) {
      const waitSec = Math.ceil((SCRAPER_COOLDOWN_MS - (now - lastScraperRunTime)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Proses penarikan berita sedang berlangsung atau baru saja dieksekusi. Mohon tunggu ${waitSec} detik lagi.`
      });
    }
    lastScraperRunTime = now;

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

    const currentServerMonth = (new Date()).getMonth() + 1;
    const year = parseInt(req.body.year, 10) || (new Date()).getFullYear();
    const startMonth = Math.max(1, Math.min(12, parseInt(req.body.startMonth, 10) || 1));
    const endMonth = Math.max(1, Math.min(12, parseInt(req.body.endMonth, 10) || currentServerMonth));

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
    const currentServerMonth = (new Date()).getMonth() + 1;
    const year = parseInt(req.query.year, 10) || (new Date()).getFullYear();
    const startMonth = Math.max(1, Math.min(12, parseInt(req.query.startMonth, 10) || 1));
    const endMonth = Math.max(1, Math.min(12, parseInt(req.query.endMonth, 10) || currentServerMonth));

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

    const currentServerMonth = (new Date()).getMonth() + 1;
    const year = parseInt(req.body.year, 10) || (new Date()).getFullYear();
    const startMonth = Math.max(1, Math.min(12, parseInt(req.body.startMonth, 10) || 1));
    const endMonth = Math.max(1, Math.min(12, parseInt(req.body.endMonth, 10) || currentServerMonth));

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
  if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `Endpoint API '${req.method} ${req.originalUrl || req.url}' tidak ditemukan.`
    });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

const DEV_PORT = 3000;
const ALT_PORT = process.env.PORT && Number(process.env.PORT) !== DEV_PORT ? Number(process.env.PORT) : null;

if (!process.env.VERCEL) {
  const server3000 = app.listen(DEV_PORT, '0.0.0.0', () => {
    console.log(`[SIM Humas] Server running on http://0.0.0.0:${DEV_PORT}`);
  });
  server3000.on('error', (err) => {
    console.error(`[SIM Humas] Error on port ${DEV_PORT}:`, err.message);
  });

  if (ALT_PORT) {
    const altServer = app.listen(ALT_PORT, '0.0.0.0', () => {
      console.log(`[SIM Humas] Server also running on http://0.0.0.0:${ALT_PORT}`);
    });
    altServer.on('error', (err) => {
      console.warn(`[SIM Humas] Could not bind alternate port ${ALT_PORT}:`, err.message);
    });
  }
}

export default app;
