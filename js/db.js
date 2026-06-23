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
    masterData: []
};

const TABLES = [
    'contentPlanner', 'brsSchedule', 'protocol', 'team', 'tickets', 'assets', 'monitoring',
    'users', 'rekapRutin', 'adHoc', 'protokoler', 'mc', 'brsRilis', 'hariBesar', 'rekapKegiatan',
    'auditTrail', 'notifications', 'masterData'
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
    'notifications': 'notifications',
    'master_data': 'masterData'
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

    // Seed default users if empty
    if (db.users.length === 0) {
        db.users = [
            { id: 1, username: "admin", nama: "Super Admin", role: "admin", bidang: "IT & Master" },
            { id: 2, username: "kepala", nama: "Kepala BPS Kalbar", role: "kepala", bidang: "Pimpinan" },
            { id: 3, username: "koordinator", nama: "Koordinator Humas", role: "koordinator", bidang: "Humas & Protokol" },
            { id: 4, username: "tim", nama: "Staf Humas", role: "tim", bidang: "Humas & Protokol" },
            { id: 5, username: "pemohon", nama: "User Bidang", role: "pemohon", bidang: "Seksi Sosial" }
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
}

function saveLocalFallback(tb) {
    localStorage.setItem('sim_humas_db_' + tb, JSON.stringify(db[tb]));
}

// Fetch data from Google Sheets API
async function fetchDataFromSheets() {
    if (isLoading) return;
    isLoading = true;
    isError = false;
    errorMessage = '';

    // First load from local storage fallback to ensure instant load (Optimistic Load)
    loadLocalFallbacks();

    updateLoadingStateUI(true);

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

        showToast('Data berhasil disinkronkan dari Google Sheets!');
        router(currentState);

    } catch (error) {
        console.error('Error fetching data from sheets, using offline local copy:', error);
        // We already loaded local fallbacks, so we just inform the user and proceed
        showToast('Menampilkan data offline lokal (Koneksi Sheets terhambat)', 'info');
        router(currentState);
    } finally {
        isLoading = false;
        updateLoadingStateUI(false);
    }
}

// Send local changes back to the GAS backend
async function sendDataToServer(action, sheetName, item) {
    const varName = SHEET_TO_VAR[sheetName] || sheetName;
    
    // Update local cache first (Optimistic UI update)
    if (action === 'add') {
        if (!item.id) {
            const maxId = db[varName].reduce((max, i) => Math.max(max, Number(i.id) || 0), 0);
            item.id = maxId + 1;
        }
        db[varName].push(item);
    } else if (action === 'update') {
        const idx = db[varName].findIndex(i => Number(i.id) === Number(item.id));
        if (idx !== -1) {
            db[varName][idx] = item;
        }
    } else if (action === 'delete') {
        db[varName] = db[varName].filter(i => Number(i.id) !== Number(item.id));
    }

    saveLocalFallback(varName);
    router(currentState); // Instantly update view

    try {
        const payload = {
            action: action,
            sheet: sheetName,
            item: item
        };

        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('HTTP Status ' + response.status);
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Server error');

        showToast('Perubahan berhasil disimpan ke database!');
        // Silently fetch fresh data
        const freshResponse = await fetch(GOOGLE_SHEETS_API_URL);
        if (freshResponse.ok) {
            const freshData = await freshResponse.json();
            for (let sName in SHEET_TO_VAR) {
                const vName = SHEET_TO_VAR[sName];
                if (freshData[sName] !== undefined && Array.isArray(freshData[sName])) {
                    db[vName] = freshData[sName];
                    saveLocalFallback(vName);
                }
            }
            router(currentState);
        }

    } catch (error) {
        console.warn('Gagal menyimpan ke Google Sheets, tetap disimpan lokal:', error);
        showToast('Tersimpan di penyimpanan lokal (Offline)', 'warning');
    }
}

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
