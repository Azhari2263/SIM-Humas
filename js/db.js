const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzqG9cQMjnpv-bOyifs4kfdpPYdEB5A5a7lw64Yod7GtfFKN4kcwN3BhYyeTQ90n4p7/exec';

// Global database state (Real-Time Data from Google Sheets + LocalStorage fallback)
let db = {
    contentPlanner: [],
    brsSchedule: [],
    protocol: [],
    team: [],
    tickets: [],
    assets: [],
    monitoring: [],
    // New tables
    users: [],
    rekapRutin: [],
    adHoc: [],
    protokoler: [],
    mc: [],
    brsRilis: [],
    hariBesar: [],
    rekapKegiatan: [],
    auditTrail: [],
    notifications: [],
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

const TABLES = [
    'contentPlanner', 'brsSchedule', 'protocol', 'team', 'tickets', 'assets', 'monitoring',
    'users', 'rekapRutin', 'adHoc', 'protokoler', 'mc', 'brsRilis', 'hariBesar', 'rekapKegiatan',
    'auditTrail', 'notifications', 'masterData', 'assignments', 'repository'
];

const SHEET_TO_VAR = {
    'content_planner': 'contentPlanner',
    'brs_schedule': 'brsSchedule',
    'protocol': 'protocol',
    'team': 'team',
    'tickets': 'tickets',
    'assets': 'assets',
    'monitoring': 'monitoring',
    'users': 'users',
    'rekap_rutin': 'rekapRutin',
    'ad_hoc_2026': 'adHoc',
    'protokoler': 'protokoler',
    'mc': 'mc',
    'brs_rilis': 'brsRilis',
    'hari_besar': 'hariBesar',
    'rekap_kegiatan': 'rekapKegiatan',
    'audit_trail': 'auditTrail',
    'auditTrail': 'auditTrail',
    'notifications': 'notifications',
    'master_data': 'masterData',
    'assignments': 'assignments',
    'repository': 'repository'
};

let isLoading = false;
let isError = false;
let errorMessage = '';

// Purge legacy mock/dummy data from previous sessions so only genuine database records are shown
(function purgeLegacyDummyData() {
    try {
        const PURGE_KEY = 'sim_humas_purged_mock_v3';
        if (!localStorage.getItem(PURGE_KEY)) {
            const dummyIdentifiers = [
                'Infografis Pertumbuhan Ekonomi',
                'Pontianak Post',
                'Tribun Pontianak',
                'Rilis Berita Resmi Statistik (BRS) Inflasi & Pariwisata',
                'Desain Booklet Hasil Survei Kepuasan',
                'Dokumentasi Workshop Metadata Statistik',
                'Hari Puisi Sedunia',
                'Penyusunan Laporan Kinerja Humas Triwulan',
                'Azhari, S.Tr.Stat.'
            ];
            TABLES.forEach(tb => {
                if (tb !== 'users') {
                    const stored = localStorage.getItem('sim_humas_db_' + tb);
                    if (stored) {
                        const hasDummy = dummyIdentifiers.some(idStr => stored.includes(idStr));
                        if (hasDummy) {
                            localStorage.removeItem('sim_humas_db_' + tb);
                        }
                    }
                }
            });
            localStorage.setItem(PURGE_KEY, 'true');
        }
    } catch (_) {}
})();

// Load fallback database from LocalStorage
function loadLocalFallbacks() {
    TABLES.forEach(tb => {
        const localData = localStorage.getItem('sim_humas_db_' + tb);
        if (localData && localData !== 'undefined' && localData !== 'null') {
            try {
                db[tb] = JSON.parse(localData);
            } catch (e) {
                console.warn('Resetting invalid local fallback for ' + tb);
                db[tb] = [];
                try { localStorage.removeItem('sim_humas_db_' + tb); } catch (_) {}
            }
        } else {
            db[tb] = [];
            if (localData === 'undefined' || localData === 'null') {
                try { localStorage.removeItem('sim_humas_db_' + tb); } catch (_) {}
            }
        }
    });

    if (!db.users || db.users.length === 0) {
        db.users = [
            { id: 1, username: 'admin', password: 'password', nama: 'Super Admin', role: 'admin', bidang: 'IPDS' },
            { id: 2, username: 'koordinator', password: 'password', nama: 'Azhari (Koordinator)', role: 'koordinator', bidang: 'Humas' },
            { id: 3, username: 'kepala', password: 'password', nama: 'Kepala BPS Kalbar', role: 'kepala', bidang: 'Pimpinan' },
            { id: 4, username: 'tim', password: 'password', nama: 'Staf Humas', role: 'tim', bidang: 'Humas' },
            { id: 5, username: 'pemohon', password: 'password', nama: 'User Bidang', role: 'pemohon', bidang: 'Sosial' },
            { id: 6, username: 'kabkot', password: 'password', nama: 'BPS Kab. Kubu Raya', role: 'kabkot', bidang: 'BPS Kab/Kota' }
        ];
    }

    if (db.contentPlanner && Array.isArray(db.contentPlanner)) {
        db.contentPlanner.forEach(item => {
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

            if (item.status === 'Posted') {
                item.progres = 100;
            } else if (item.status === 'Done' && (!item.progres || Number(item.progres) === 0)) {
                item.progres = 90;
            }
        });
    }
}

function saveLocalFallback(tb) {
    const data = (db && db[tb] !== undefined) ? db[tb] : [];
    localStorage.setItem('sim_humas_db_' + tb, JSON.stringify(data));
}

// Fetch data from Google Sheets API
async function fetchDataFromSheets(silent = false) {
    if (isLoading) return;
    isLoading = true;
    isError = false;
    errorMessage = '';

    // First load from local storage fallback to ensure instant load (Optimistic Load)
    if (!silent) {
        loadLocalFallbacks();
        updateLoadingStateUI(true);
    }

    let data = null;

    // 1. Attempt to fetch from primary Google Sheets Apps Script URL
    try {
        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'GET',
            cache: 'no-cache'
        });
        if (response.ok) {
            const json = await response.json();
            if (json && typeof json === 'object') {
                data = json;
            }
        } else {
            console.warn(`[Sync] Primary Sheets URL returned HTTP ${response.status}. Checking local API fallback...`);
        }
    } catch (netErr) {
        console.warn('[Sync] Direct Google Sheets connection unavailable (network/CORS/offline):', netErr.message);
    }

    // 2. If primary Google Sheets URL was unavailable or returned non-200, try local API endpoint /api/sheets
    if (!data && GOOGLE_SHEETS_API_URL !== '/api/sheets') {
        try {
            const fallbackResp = await fetch('/api/sheets');
            if (fallbackResp.ok) {
                const json = await fallbackResp.json();
                if (json && typeof json === 'object') {
                    data = json;
                    console.log('[Sync] Connected to local database cache successfully.');
                }
            }
        } catch (apiErr) {
            console.warn('[Sync] Local API endpoint unavailable:', apiErr.message);
        }
    }

    // 3. If no network data could be retrieved, cleanly use offline LocalStorage
    if (!data) {
        console.warn('[Sync] Menampilkan data offline lokal (Koneksi Sheets terhambat/offline).');
        if (!silent) {
            showToast('Menampilkan data offline lokal (Koneksi Sheets terhambat)', 'info');
        }
        if (typeof currentUser !== 'undefined' && currentUser) {
            router(currentState);
        }
        isLoading = false;
        if (!silent) {
            updateLoadingStateUI(false);
        }
        return;
    }

    try {
        // Create temporary DB for comparison
        let tempDb = {};
        TABLES.forEach(tb => {
            tempDb[tb] = [];
        });

        // Map database collections dynamically
        for (let sheetName in SHEET_TO_VAR) {
            const varName = SHEET_TO_VAR[sheetName];
            // Support both snake_case (sheet name) and camelCase (variable name)
            const incoming = data[sheetName] !== undefined ? data[sheetName] : data[varName];
            if (incoming !== undefined && Array.isArray(incoming)) {
                // Perform deep copy to isolate tempDb from network payload references
                tempDb[varName] = JSON.parse(JSON.stringify(incoming));
            } else {
                tempDb[varName] = [];
            }
        }

        // Apply pending local changes from sync queue on top of fetched database
        applySyncQueueToTempDb(tempDb);

        // Parse numeric/date properties safely
        TABLES.forEach(tb => {
            if (tempDb[tb]) {
                tempDb[tb].forEach(item => {
                    if (item.id !== undefined) item.id = Number(item.id);
                    if (item.progres !== undefined) item.progres = Number(item.progres);
                    if (item.progress !== undefined) item.progress = Number(item.progress);
                    if (item.jumlah_bertugas !== undefined) item.jumlah_bertugas = Number(item.jumlah_bertugas);
                    if (item.version !== undefined) item.version = Number(item.version);
                    if (item.is_read !== undefined) item.is_read = item.is_read === true || item.is_read === 'true';
                });
            }
        });

        // Aturan Khusus Progres Content Planner & Normalisasi Field:
        // PIC di assignTo (kolom I), multi-media_post, dsb.
        if (tempDb.contentPlanner && Array.isArray(tempDb.contentPlanner)) {
            tempDb.contentPlanner.forEach(item => {
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
            });
        }

        // Normalisasi Hari Besar (Kategori Medsos Instansi vs Medsos Pimpinan)
        if (tempDb.hariBesar && Array.isArray(tempDb.hariBesar)) {
            tempDb.hariBesar.forEach(item => {
                item.kategori = item.kategori || 'Medsos Instansi';
                item.jenis_media = item.jenis_media || item.media || 'Instagram';
                item.data_pendukung = item.data_pendukung || item.link_cloud || '';
                item.status = item.status || 'Draft';
            });
        }

        // Normalisasi Rekap Rutin & Ad Hoc (Status Konsistensi)
        if (tempDb.rekapRutin && Array.isArray(tempDb.rekapRutin)) {
            tempDb.rekapRutin.forEach(item => {
                if (item.status === 'Sedang Dikerjakan') item.status = 'Sedang Dikerjakan';
                else if (!item.status) item.status = 'Draft';
            });
        }
        if (tempDb.adHoc && Array.isArray(tempDb.adHoc)) {
            tempDb.adHoc.forEach(item => {
                if (item.status === 'Sedang Dikerjakan') item.status = 'Sedang Dikerjakan';
                else if (!item.status) item.status = 'Draft';
            });
        }

        // Normalisasi Media Monitoring (Topik, Jenis Berita, dsb)
        if (tempDb.monitoring && Array.isArray(tempDb.monitoring)) {
            tempDb.monitoring.forEach(item => {
                item.topik = item.topik || 'Umum / Statistik';
                item.jenis_berita = item.jenis_berita || 'Media Online';
                item.sentimen = item.sentimen || 'Positif';
            });
        }

        // Normalisasi Permintaan Layanan Humas (Tiket)
        if (tempDb.tickets && Array.isArray(tempDb.tickets)) {
            tempDb.tickets.forEach(item => {
                if (item.status === 'Pending') item.status = 'Diajukan';
                else if (item.status === 'Approved') item.status = 'Diproses';
                else if (item.status === 'Rejected') item.status = 'Ditolak/Dibatalkan';
            });
        }

        // Pastikan Pusat Dokumen / Repository memiliki default jika kosong
        if ((!tempDb.repository || tempDb.repository.length === 0) && db.repository && db.repository.length > 0) {
            tempDb.repository = JSON.parse(JSON.stringify(db.repository));
        }

        // Detect if any table has changed
        let hasChanges = false;
        for (let i = 0; i < TABLES.length; i++) {
            const tb = TABLES[i];
            if (!areTablesEqual(db[tb], tempDb[tb])) {
                hasChanges = true;
                break;
            }
        }

        // If changes detected or initial non-silent sync, update and re-render
        if (hasChanges || !silent) {
            db = tempDb;

            // Cache all synced data
            TABLES.forEach(tb => {
                saveLocalFallback(tb);
            });

            if (!silent) {
                showToast('Data berhasil disinkronkan!');
            }
            if (typeof currentUser !== 'undefined' && currentUser) {
                router(currentState);
            }
        } else {
            console.log('[RealTime] Tidak ada perubahan data di database, lewati re-render.');
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB';

        const lastSyncEl = document.getElementById('last-sync-date');
        if (lastSyncEl) lastSyncEl.textContent = dateStr;

        const mobileSyncEl = document.getElementById('mobile-last-sync-date');
        if (mobileSyncEl) mobileSyncEl.textContent = dateStr;

    } catch (parseError) {
        console.warn('[Sync] Error processing database payload, using local fallback:', parseError);
        if (!silent) {
            showToast('Menampilkan data offline lokal', 'info');
        }
        if (typeof currentUser !== 'undefined' && currentUser) {
            router(currentState);
        }
    } finally {
        isLoading = false;
        if (!silent) {
            updateLoadingStateUI(false);
        }
    }
}

// Persistent Sync Queue for Offline-Safe Operations
let syncQueue = JSON.parse(localStorage.getItem('sim_humas_sync_queue')) || [];
let isProcessingQueue = false;

function saveSyncQueue() {
    localStorage.setItem('sim_humas_sync_queue', JSON.stringify(syncQueue));
}

// Helper to compare two tables (arrays of objects) structurally
function areTablesEqual(tableA, tableB) {
    if (!tableA && !tableB) return true;
    if (!tableA || !tableB) return false;
    if (tableA.length !== tableB.length) return false;

    // Create sorted copies to ensure order differences don't trigger mismatch
    const sortedA = [...tableA].sort((x, y) => Number(x.id || 0) - Number(y.id || 0));
    const sortedB = [...tableB].sort((x, y) => Number(x.id || 0) - Number(y.id || 0));

    // Fast comparison using JSON stringify
    return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

// Apply offline sync queue to a temporary database object
function applySyncQueueToTempDb(targetDb) {
    syncQueue.forEach(task => {
        const varName = SHEET_TO_VAR[task.sheet] || task.sheet;
        if (!targetDb[varName]) return;

        if (task.action === 'add') {
            const idx = targetDb[varName].findIndex(i => Number(i.id) === Number(task.item.id));
            if (idx === -1) {
                targetDb[varName].push(task.item);
            } else {
                targetDb[varName][idx] = task.item;
            }
        } else if (task.action === 'update') {
            const idx = targetDb[varName].findIndex(i => Number(i.id) === Number(task.item.id));
            if (idx !== -1) {
                targetDb[varName][idx] = task.item;
            } else {
                targetDb[varName].push(task.item);
            }
        } else if (task.action === 'delete') {
            targetDb[varName] = targetDb[varName].filter(i => Number(i.id) !== Number(task.item.id));
        }
    });
}

function applySyncQueueToDb() {
    applySyncQueueToTempDb(db);
}

// Send local changes back to the GAS backend (Queued & Offline-Safe)
async function sendDataToServer(action, sheetName, item) {
    const varName = SHEET_TO_VAR[sheetName] || sheetName;

    if (varName === 'contentPlanner' && item) {
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
    }

    // Update local cache first (Optimistic UI update)
    if (action === 'add') {
        if (!item.id) {
            const maxId = db[varName].reduce((max, i) => Math.max(max, Number(i.id) || 0), 0);
            item.id = maxId + 1;
        }
        const idx = db[varName].findIndex(i => Number(i.id) === Number(item.id));
        if (idx === -1) {
            db[varName].push(item);
        } else {
            db[varName][idx] = item;
        }
    } else if (action === 'update') {
        const idx = db[varName].findIndex(i => Number(i.id) === Number(item.id));
        if (idx !== -1) {
            db[varName][idx] = item;
        } else {
            db[varName].push(item);
        }
    } else if (action === 'delete') {
        db[varName] = db[varName].filter(i => Number(i.id) !== Number(item.id));
    }

    saveLocalFallback(varName);
    if (typeof currentUser !== 'undefined' && currentUser) {
        router(currentState); // Instantly update view
    }

    // Add task to sync queue
    syncQueue.push({ action, sheet: sheetName, item });
    saveSyncQueue();

    // Process queue in the background
    processSyncQueue();
}

// Background Sync Queue Worker
async function processSyncQueue() {
    if (isProcessingQueue || syncQueue.length === 0) return;
    isProcessingQueue = true;

    console.log(`[Sync] Processing sync queue. Tasks: ${syncQueue.length}`);
    let successCount = 0;

    while (syncQueue.length > 0) {
        const task = syncQueue[0];
        try {
            const payload = {
                action: task.action,
                sheet: task.sheet,
                item: task.item
            };

            let response = null;
            try {
                response = await fetch(GOOGLE_SHEETS_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    body: JSON.stringify(payload)
                });
            } catch (err) {
                if (GOOGLE_SHEETS_API_URL !== '/api/sheets') {
                    try {
                        response = await fetch('/api/sheets', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    } catch (_) {}
                }
            }

            if (!response || !response.ok) throw new Error('HTTP Status ' + (response ? response.status : 'offline'));

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Server error');

            // Remove successfully processed task
            syncQueue.shift();
            saveSyncQueue();
            successCount++;
            console.log(`[Sync] Successfully synced task: ${task.action} on ${task.sheet}`);

        } catch (error) {
            console.warn('[Sync] Sync queue paused due to error:', error);
            break;
        }
    }

    isProcessingQueue = false;

    if (successCount > 0) {
        if (syncQueue.length === 0) {
            showToast('Semua perubahan berhasil disinkronkan ke server database!');
        } else {
            showToast('Beberapa perubahan disinkronkan, sisa masih disimpan offline', 'info');
        }
    } else if (syncQueue.length > 0) {
        showToast('Tersimpan di penyimpanan lokal (Menunggu jaringan/online)', 'warning');
    }
}

// Retry sync queue when network goes online
window.addEventListener('online', () => {
    console.log('[Sync] Network back online. Retrying sync queue...');
    processSyncQueue();
    fetchDataFromSheets(true); // Segera refresh data saat koneksi kembali
});

// -------------------------------------------------------
// REAL-TIME AUTO-POLLING (setiap 30 detik)
// Memungkinkan perubahan data dari pengguna lain (misal Ketua Tim)
// otomatis terlihat di browser pengguna lain (anggota tim)
// tanpa harus klik tombol Sinkron secara manual.
// -------------------------------------------------------
let realtimePollingInterval = null;
let lastFetchTimestamp = 0;
const POLLING_INTERVAL_MS = 30000; // 30 detik
const MIN_FETCH_GAP_MS = 10000;    // Minimal 10 detik antar fetch (anti-spam)

function startRealtimePolling() {
    if (realtimePollingInterval) return; // Sudah berjalan

    // Polling hanya berjalan jika role termasuk admin, koordinator, kepala, atau tim
    const userRole = typeof currentUser !== 'undefined' && currentUser ? currentUser.role : null;
    const allowedRoles = ['admin', 'koordinator', 'kepala', 'tim'];

    if (!userRole || !allowedRoles.includes(userRole)) {
        console.log(`[RealTime] Auto-polling dinonaktifkan untuk peran '${userRole || 'anonymous'}'.`);
        return;
    }

    console.log(`[RealTime] Memulai auto-polling setiap 30 detik untuk peran '${userRole}'...`);

    realtimePollingInterval = setInterval(async () => {
        // Skip jika tab sedang tidak aktif (hemat bandwidth)
        if (document.hidden) {
            console.log('[RealTime] Tab tidak aktif, polling ditunda.');
            return;
        }
        // Anti-spam: jangan fetch jika baru saja fetch < 10 detik lalu
        if (Date.now() - lastFetchTimestamp < MIN_FETCH_GAP_MS) {
            return;
        }
        // Skip jika sedang ada proses loading/sync aktif
        if (isLoading || isProcessingQueue) {
            return;
        }
        console.log('[RealTime] Auto-polling data dari server...');
        lastFetchTimestamp = Date.now();
        await fetchDataFromSheets(true); // silent = true (tidak tampil toast/loading)
        updateLiveIndicator(); // Update indikator live di UI
    }, POLLING_INTERVAL_MS);
}

function stopRealtimePolling() {
    if (realtimePollingInterval) {
        clearInterval(realtimePollingInterval);
        realtimePollingInterval = null;
        console.log('[RealTime] Auto-polling dihentikan.');
    }
}

// Update indikator "Live" di UI sidebar
function updateLiveIndicator() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' WIB';

    const lastSyncEl = document.getElementById('last-sync-date');
    if (lastSyncEl) lastSyncEl.textContent = dateStr;

    const mobileSyncEl = document.getElementById('mobile-last-sync-date');
    if (mobileSyncEl) mobileSyncEl.textContent = dateStr;

    // Animasi pulse pada live-dot indicator
    const dots = document.querySelectorAll('.live-dot');
    dots.forEach(dot => {
        dot.classList.add('live-dot-pulse');
        setTimeout(() => dot.classList.remove('live-dot-pulse'), 800);
    });
}

// Refresh segera saat user kembali ke tab ini (setelah buka tab lain)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('[RealTime] Tab aktif kembali. Refresh data segera...');
        if (Date.now() - lastFetchTimestamp > MIN_FETCH_GAP_MS) {
            lastFetchTimestamp = Date.now();
            fetchDataFromSheets(true).then(updateLiveIndicator);
        }
    }
});

// Expose fungsi untuk digunakan dari luar
window.startRealtimePolling = startRealtimePolling;
window.stopRealtimePolling = stopRealtimePolling;

// Periodic retry and initialization
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(processSyncQueue, 3000); // Wait 3s after boot
    setInterval(processSyncQueue, 120000); // Retry every 2 minutes

    // Mulai real-time polling setelah initial data load selesai
    // Delay 5 detik agar initial fetch dari fetchDataFromSheets() selesai dulu
    setTimeout(() => {
        lastFetchTimestamp = Date.now(); // Catat waktu initial fetch
        startRealtimePolling();
        console.log('[RealTime] Auto-polling aktif. Data akan diperbarui otomatis setiap 30 detik.');
    }, 5000);
});

async function syncData() {
    await fetchDataFromSheets();
}

// Update loading skeleton UI on demand
function updateLoadingStateUI(loading) {
    const contentDiv = document.getElementById('app-content');
    if (!contentDiv) return;

    if (loading && db.contentPlanner.length === 0 && db.brsSchedule.length === 0) {
        contentDiv.innerHTML = `
            <div class="flex flex-col justify-center items-center h-96 animate-pulse">
                <div class="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-650 animate-spin mb-4"></div>
                <p class="text-sm font-semibold text-slate-500">Menghubungkan ke database Google Sheets...</p>
                <p class="text-xs text-slate-400 mt-1">Mengunduh data riil dan menyinkronkan komponen</p>
            </div>
        `;
    }
}

// Seed initial system data if first time
loadLocalFallbacks();
