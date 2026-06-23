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
    assignments: []
};

const TABLES = [
    'contentPlanner', 'brsSchedule', 'protocol', 'team', 'tickets', 'assets', 'monitoring',
    'users', 'rekapRutin', 'adHoc', 'protokoler', 'mc', 'brsRilis', 'hariBesar', 'rekapKegiatan',
    'auditTrail', 'notifications', 'masterData', 'assignments'
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
    'notifications': 'notifications',
    'master_data': 'masterData',
    'assignments': 'assignments'
};

let isLoading = false;
let isError = false;
let errorMessage = '';

// Load fallback database from LocalStorage
function loadLocalFallbacks() {
    TABLES.forEach(tb => {
        const localData = localStorage.getItem('sim_humas_db_' + tb);
        if (localData) {
            try {
                db[tb] = JSON.parse(localData);
            } catch (e) {
                console.error('Failed to parse local fallback for ' + tb, e);
                db[tb] = [];
            }
        } else {
            db[tb] = [];
        }
    });

    // Seed default team data if empty
    if (db.team.length === 0) {
        db.team = [
            { id: 1, nama: "Azhari", jabatan: "Pranata Humas Ahli Muda", bidang: "Humas & Protokol", tugas: "Koordinator Kehumasan", kontak: "08125432109" },
            { id: 2, nama: "Rian", jabatan: "Pranata Komputer", bidang: "Diseminasi Informasi", tugas: "Pembuat Konten & Dokumentasi", kontak: "08125432110" },
            { id: 3, nama: "Siska", jabatan: "Staf Humas", bidang: "Humas & Protokol", tugas: "Petugas Protokoler & MC", kontak: "08125432111" },
            { id: 4, nama: "Dian", jabatan: "Staf Humas", bidang: "Humas & Protokol", tugas: "MC & Media Monitoring", kontak: "08125432112" }
        ];
        saveLocalFallback('team');
    }

    // Seed default users if empty or missing specific team users
    if (db.users.length === 0 || !db.users.some(u => u.username === 'rian')) {
        db.users = [
            { id: 1, username: "admin", nama: "Super Admin", role: "admin", bidang: "IT & Master" },
            { id: 2, username: "kepala", nama: "Kepala BPS Kalbar", role: "kepala", bidang: "Pimpinan" },
            { id: 3, username: "koordinator", nama: "Ketua Tim Humas", role: "koordinator", bidang: "Humas & Protokol" },
            { id: 4, username: "tim", nama: "Staf Humas", role: "tim", bidang: "Humas & Protokol" },
            { id: 5, username: "pemohon", nama: "User Bidang", role: "pemohon", bidang: "Seksi Sosial" },
            { id: 6, username: "rian", nama: "Rian", role: "tim", bidang: "Diseminasi Informasi" },
            { id: 7, username: "siska", nama: "Siska", role: "tim", bidang: "Humas & Protokol" },
            { id: 8, username: "dian", nama: "Dian", role: "tim", bidang: "Humas & Protokol" },
            { id: 9, username: "azhari", nama: "Azhari", role: "tim", bidang: "Humas & Protokol" }
        ];
        saveLocalFallback('users');
    }

    // Seed default master data if empty
    if (db.masterData.length === 0) {
        db.masterData = [
            { id: 1, kategori: "Bidang", nama: "Humas & Protokol" },
            { id: 2, kategori: "Bidang", nama: "Diseminasi Informasi" },
            { id: 3, kategori: "Bidang", nama: "Seksi Sosial" },
            { id: 4, kategori: "Bidang", nama: "Seksi Distribusi" },
            { id: 5, kategori: "Rubrikasi", nama: "Rilis Berita Utama" },
            { id: 6, kategori: "Rubrikasi", nama: "Sosialisasi Sensus" },
            { id: 7, kategori: "Rubrikasi", nama: "Infografis Rutin" },
            { id: 8, kategori: "Rubrikasi", nama: "Publikasi Video Dokumentasi" }
        ];
        saveLocalFallback('masterData');
    }

    // Seed default assignments if empty
    if (db.assignments.length === 0) {
        db.assignments = [
            { id: 1, tugas: "Membuat Infografis Statistik Sosial", deskripsi: "Infografis infografis statistik sosial bulan Juni 2026 untuk Instagram BPS Kalbar.", prioritas: "Tinggi", status: "Sedang Dikerjakan", tanggal_penugasan: "2026-06-20", deadline: "2026-06-25", progres: 60, lampiran: "https://drive.google.com/drive/folders/sample1", assigned_to: "Rian" },
            { id: 2, tugas: "Dokumentasi Liputan BRS", deskripsi: "Mengambil dokumentasi foto dan video serta press release BRS rilis inflasi Kalbar.", prioritas: "Sedang", status: "Belum Mulai", tanggal_penugasan: "2026-06-22", deadline: "2026-06-28", progres: 0, lampiran: "", assigned_to: "Siska" },
            { id: 3, tugas: "Master of Ceremony Acara Hari Besar", deskripsi: "Menyusun cue card dan memandu jalannya acara Hari Besar BPS Provinsi Kalimantan Barat.", prioritas: "Tinggi", status: "Selesai", tanggal_penugasan: "2026-06-15", deadline: "2026-06-23", progres: 100, lampiran: "https://drive.google.com/drive/folders/sample2", assigned_to: "Dian" }
        ];
        saveLocalFallback('assignments');
    }
}

function saveLocalFallback(tb) {
    localStorage.setItem('sim_humas_db_' + tb, JSON.stringify(db[tb]));
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

    try {
        const response = await fetch(GOOGLE_SHEETS_API_URL);
        if (!response.ok) throw new Error('Gagal mengambil data dari server database (HTTP ' + response.status + ')');

        const data = await response.json();
        
        // Map database collections dynamically
        for (let sheetName in SHEET_TO_VAR) {
            const varName = SHEET_TO_VAR[sheetName];
            if (data[sheetName] !== undefined && Array.isArray(data[sheetName])) {
                db[varName] = data[sheetName];
            }
        }

        // Apply pending local changes from sync queue on top of fetched database
        if (typeof applySyncQueueToDb === 'function') {
            applySyncQueueToDb();
        }

        // Parse numeric/date properties safely
        TABLES.forEach(tb => {
            if (db[tb]) {
                db[tb].forEach(item => {
                    if (item.id !== undefined) item.id = Number(item.id);
                    if (item.progres !== undefined) item.progres = Number(item.progres);
                    if (item.progress !== undefined) item.progress = Number(item.progress);
                    if (item.jumlah_bertugas !== undefined) item.jumlah_bertugas = Number(item.jumlah_bertugas);
                    if (item.version !== undefined) item.version = Number(item.version);
                    if (item.is_read !== undefined) item.is_read = item.is_read === true || item.is_read === 'true';
                });
            }
        });

        // Cache all synced data
        TABLES.forEach(tb => {
            saveLocalFallback(tb);
        });

        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const lastSyncEl = document.getElementById('last-sync-date');
        if (lastSyncEl) lastSyncEl.textContent = dateStr;
        
        const mobileSyncEl = document.getElementById('mobile-last-sync-date');
        if (mobileSyncEl) mobileSyncEl.textContent = dateStr;

        if (!silent) {
            showToast('Data berhasil disinkronkan dari Google Sheets!');
        }
        router(currentState);

    } catch (error) {
        console.error('Error fetching data from sheets, using offline local copy:', error);
        if (!silent) {
            showToast('Menampilkan data offline lokal (Koneksi Sheets terhambat)', 'info');
        }
        router(currentState);
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

function applySyncQueueToDb() {
    syncQueue.forEach(task => {
        const varName = SHEET_TO_VAR[task.sheet] || task.sheet;
        if (!db[varName]) return;
        
        if (task.action === 'add') {
            const idx = db[varName].findIndex(i => Number(i.id) === Number(task.item.id));
            if (idx === -1) {
                db[varName].push(task.item);
            } else {
                db[varName][idx] = task.item;
            }
        } else if (task.action === 'update') {
            const idx = db[varName].findIndex(i => Number(i.id) === Number(task.item.id));
            if (idx !== -1) {
                db[varName][idx] = task.item;
            } else {
                db[varName].push(task.item);
            }
        } else if (task.action === 'delete') {
            db[varName] = db[varName].filter(i => Number(i.id) !== Number(task.item.id));
        }
    });
}

// Send local changes back to the GAS backend (Queued & Offline-Safe)
async function sendDataToServer(action, sheetName, item) {
    const varName = SHEET_TO_VAR[sheetName] || sheetName;
    
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
    router(currentState); // Instantly update view

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
            
            const response = await fetch(GOOGLE_SHEETS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error('HTTP Status ' + response.status);
            
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
});

// Periodic retry and initialization
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(processSyncQueue, 3000); // Wait 3s after boot
    setInterval(processSyncQueue, 120000); // Retry every 2 minutes
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
