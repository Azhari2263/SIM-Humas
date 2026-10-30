// Main Application Controller and Router for SIM HUMAS BPS Kalbar

// Global Navigation State
var currentState = 'dashboard';
var currentEditItem = null;
var currentModalType = null;
var isSubmitting = false;
var activeSearchQuery = '';

// Global Activity Logger
function logActivity(action, details) {
    const user = currentUser ? (currentUser.nama || currentUser.name || currentUser.username) : 'Sistem';
    
    if (!db.auditTrail) {
        db.auditTrail = [];
    }

    const logItem = {
        id: db.auditTrail.length + 1,
        user: user,
        action: action,
        details: details,
        timestamp: new Date().toISOString()
    };
    db.auditTrail.push(logItem);
    saveLocalFallback('auditTrail');
    console.log(`[Audit Log] ${user} - ${action}: ${details}`);
}
window.logActivity = logActivity;


// UI Helper: Toast Notification
function showToast(message, type = 'success', duration = 3500, onClick = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast flex items-start sm:items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-all duration-300 transform translate-y-2 opacity-0 shrink-0 max-w-md';
    if (onClick) {
        toast.classList.add('cursor-pointer', 'hover:shadow-2xl', 'hover:scale-[1.01]');
    }

    let icon = '';
    let borderColor = '';
    if (type === 'success') {
        icon = '<i class="fa-solid fa-circle-check text-emerald-500 text-lg shrink-0 mt-0.5 sm:mt-0"></i>';
        borderColor = 'border-l-4 border-l-emerald-500';
    } else if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-exclamation text-rose-500 text-lg shrink-0 mt-0.5 sm:mt-0"></i>';
        borderColor = 'border-l-4 border-l-rose-500';
    } else if (type === 'warning') {
        icon = '<i class="fa-solid fa-bell text-amber-500 text-lg shrink-0 mt-0.5 sm:mt-0 animate-bounce"></i>';
        borderColor = 'border-l-4 border-l-amber-500';
    } else {
        icon = '<i class="fa-solid fa-circle-info text-blue-500 text-lg shrink-0 mt-0.5 sm:mt-0"></i>';
        borderColor = 'border-l-4 border-l-blue-500';
    }

    toast.className += ` ${borderColor}`;
    toast.innerHTML = `
        ${icon}
        <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1 leading-relaxed">${message}</div>
        <button type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs ml-1.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0" onclick="event.stopPropagation(); this.closest('.toast')?.remove();" title="Tutup">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    if (onClick) {
        toast.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            onClick();
        });
    }

    container.appendChild(toast);

    // Trigger transition
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
        toast.classList.add('translate-y-[-10px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, duration);

    toast.dataset.dismissTimer = dismissTimer;
}

// Centralized helper to get all team member names across database
window.getCentralizedUserList = function() {
    const namesSet = new Set();
    if (typeof db !== 'undefined') {
        if (db.team && Array.isArray(db.team)) {
            db.team.forEach(m => {
                if (m && m.nama && m.nama.trim()) namesSet.add(m.nama.trim());
            });
        }
        if (db.users && Array.isArray(db.users)) {
            db.users.filter(u => ['tim', 'koordinator', 'admin'].includes(u.role)).forEach(u => {
                if (u && u.nama && u.nama.trim()) namesSet.add(u.nama.trim());
            });
        }
        const allTasks = [
            ...(db.assignments || []),
            ...(db.contentPlanner || []),
            ...(db.rekapRutin || []),
            ...(db.adHoc || []),
            ...(db.protokoler || []),
            ...(db.mc || []),
            ...(db.brsRilis || []),
            ...(db.hariBesar || [])
        ];
        allTasks.forEach(t => {
            const rawPic = t.pic || t.petugas || t['assign To'] || t.assignTo || t.assignedTo || t.assigned_to || t.pembuat_konten;
            if (rawPic && typeof rawPic === 'string' && rawPic.trim() && rawPic !== '-' && rawPic !== 'Belum Ditugaskan') {
                const parts = rawPic.split(/[,&\/]/).map(s => s.trim()).filter(Boolean);
                parts.forEach(p => {
                    const pLower = p.toLowerCase();
                    if (p.length >= 3 && !['tim humas', 'staf humas', 'semua', 'pimpinan'].includes(pLower)) {
                        namesSet.add(p);
                    }
                });
            }
        });
    }
    if (namesSet.size === 0) {
        ['Azhari (Koordinator)', 'Staf Humas'].forEach(n => namesSet.add(n));
    }
    return Array.from(namesSet);
};

// UI Helper: Custom Confirmation Modal (menggantikan confirm() browser)
function showConfirmModal(message, onConfirm, options = {}) {
    const existingModal = document.getElementById('confirm-modal');
    if (existingModal) existingModal.remove();

    const {
        title = 'Konfirmasi',
        confirmText = 'Ya, Lanjutkan',
        cancelText = 'Batal',
        type = 'danger', // 'danger' | 'warning' | 'info'
        icon = 'fa-triangle-exclamation'
    } = options;

    const iconColors = {
        danger: 'bg-rose-100 dark:bg-rose-950 text-rose-600',
        warning: 'bg-amber-100 dark:bg-amber-950 text-amber-600',
        info: 'bg-blue-100 dark:bg-blue-950 text-blue-600'
    };

    const btnColors = {
        danger: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-rose-100 dark:shadow-rose-900',
        warning: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white',
        info: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white'
    };

    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'confirm-modal';
    modal.innerHTML = `
        <div class="confirm-modal-box">
            <div class="flex items-start gap-4 mb-5">
                <div class="w-12 h-12 rounded-2xl ${iconColors[type]} flex items-center justify-center shrink-0">
                    <i class="fa-solid ${icon} text-xl"></i>
                </div>
                <div class="flex-1">
                    <h3 class="font-black text-slate-900 dark:text-white text-sm tracking-tight">${title}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">${message}</p>
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button id="confirm-modal-ok" class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md ${btnColors[type]}">
                    <i class="fa-solid ${type === 'danger' ? 'fa-trash' : 'fa-check'} mr-1.5"></i>${confirmText}
                </button>
                <button id="confirm-modal-cancel" class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                    <i class="fa-solid fa-xmark mr-1.5"></i>${cancelText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Bind actions
    document.getElementById('confirm-modal-ok').onclick = () => {
        modal.remove();
        if (typeof onConfirm === 'function') onConfirm();
    };
    document.getElementById('confirm-modal-cancel').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// // ===================================================================
// TIMEZONE-SAFE DATE/TIME HELPERS (WIB = UTC+7)
// Semua fungsi ini aman dari UTC-shift yang menyebabkan tanggal geser.
// ===================================================================

/**
 * Mendapatkan waktu "sekarang" yang akurat dalam zona waktu WIB (Asia/Jakarta, UTC+7).
 * Selalu gunakan ini sebagai pengganti `new Date()` untuk perhitungan dan perbandingan waktu
 * agar konsisten di semua perangkat dan container terlepas dari timezone mesin klien.
 */
function getNowWIB() {
    try {
        const now = new Date();
        const jakartaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const wibDate = new Date(jakartaStr);
        if (!isNaN(wibDate.getTime())) {
            return wibDate;
        }
    } catch (e) {
        // Fallback
    }
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcMs + (7 * 3600000));
}

/**
 * Mengekstrak komponen jam & menit dari string waktu berbagai format:
 * - "HH:MM", "HH.MM", "HH:MM:SS", ISO datetime "1899-12-30T..."
 * @returns {Object|null} { hours, minutes } atau null jika tidak valid
 */
function extractTimeComponents(timeStr) {
    if (!timeStr) return null;
    timeStr = String(timeStr).trim();

    // Format ISO datetime dari Google Sheets (1899-12-30T01:22:48.000Z = waktu Excel)
    if (timeStr.includes('T')) {
        try {
            const d = new Date(timeStr);
            if (!isNaN(d.getTime())) {
                if (timeStr.startsWith('1899-12-30')) {
                    // Waktu Excel-style: gunakan UTC hours
                    return { hours: d.getUTCHours(), minutes: d.getUTCMinutes() };
                } else {
                    // ISO datetime biasa: gunakan local hours
                    return { hours: d.getHours(), minutes: d.getMinutes() };
                }
            }
        } catch (e) { /* fallback */ }
    }

    // Format HH:MM atau HH.MM atau HH:MM:SS
    const match = timeStr.match(/^(\d{1,2})[:.:](\d{1,2})/);
    if (match) {
        return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
    }

    return null;
}

/**
 * Parse string tanggal/datetime menjadi Date object dalam timezone lokal (WIB).
 *
 * PENTING: Urutan deteksi:
 * 1. Full ISO datetime (YYYY-MM-DDTHH:MM...) → parse UTC, kemudian adjust ke WIB
 * 2. YYYY-MM-DD atau YYYY/MM/DD → local midnight (tidak kena UTC shift)
 * 3. DD/MM/YYYY atau DD-MM-YYYY → local midnight
 * 4. Nama bulan Indonesia (e.g. "24 Juni 2026") → local midnight
 */
function parseIndonesianDate(str) {
    if (!str && str !== 0) return null;
    if (str instanceof Date) return str;

    // Dukung format serial number Excel (contoh: 46152 untuk tanggal di tahun 2026)
    if (typeof str === 'number' || (typeof str === 'string' && /^\d{5}$/.test(str.trim()))) {
        const serial = typeof str === 'number' ? str : parseInt(str.trim(), 10);
        const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
        if (!isNaN(d.getTime())) return d;
    }

    str = String(str).trim();

    // 1. Full ISO datetime dengan komponen waktu (YYYY-MM-DDTHH:MM:SS...)
    //    HARUS dicek SEBELUM regex tanggal-saja agar komponen jam tidak dibuang
    const matchIsoFull = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (matchIsoFull) {
        // Parse sebagai UTC (sesuai standar ISO 8601) lalu konversi ke local time
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d;
    }

    // 2. YYYY-MM-DD atau YYYY/MM/DD (tanggal saja → buat sebagai local midnight)
    const matchIso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (matchIso) {
        const year  = parseInt(matchIso[1], 10);
        const month = parseInt(matchIso[2], 10) - 1;
        const day   = parseInt(matchIso[3], 10);
        return new Date(year, month, day, 0, 0, 0, 0); // local midnight
    }

    // 3. DD/MM/YYYY atau DD-MM-YYYY (tanggal saja → local midnight)
    const matchDmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (matchDmy) {
        const day   = parseInt(matchDmy[1], 10);
        const month = parseInt(matchDmy[2], 10) - 1;
        const year  = parseInt(matchDmy[3], 10);
        return new Date(year, month, day, 0, 0, 0, 0); // local midnight
    }

    // 4. Nama bulan Indonesia (e.g. "24 Juni 2026")
    const indMonthNames = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5,
        'jul': 6, 'agu': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
    };
    const parts = str.toLowerCase().split(/\s+/);
    if (parts.length === 3) {
        const day      = parseInt(parts[0], 10);
        const monthStr = parts[1];
        const year     = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(year) && indMonthNames[monthStr] !== undefined) {
            return new Date(year, indMonthNames[monthStr], day, 0, 0, 0, 0);
        }
    }

    // 5. Fallback: biarkan browser parse (terakhir, bisa kena UTC shift)
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    return null;
}

/**
 * Menggabungkan string tanggal + string waktu menjadi satu Date object WIB.
 * Digunakan untuk membuat datetime deadline yang akurat untuk perbandingan overdue.
 *
 * @param {string} dateStr  - String tanggal dalam format apapun yang didukung parseIndonesianDate
 * @param {string} timeStr  - String waktu (HH:MM, HH.MM, ISO, dsb.) — opsional
 * @param {boolean} endOfDay - Jika true dan tidak ada timeStr, gunakan 23:59:59 (akhir hari)
 * @returns {Date|null}
 */
function parseDateTimeWIB(dateStr, timeStr = null, endOfDay = false) {
    if (!dateStr) return null;

    const datePart = parseIndonesianDate(dateStr);
    if (!datePart || isNaN(datePart.getTime())) return null;

    // Buat base date dari tanggal (local midnight)
    const result = new Date(
        datePart.getFullYear(),
        datePart.getMonth(),
        datePart.getDate(),
        0, 0, 0, 0
    );

    if (timeStr) {
        const tc = extractTimeComponents(timeStr);
        if (tc) {
            result.setHours(tc.hours, tc.minutes, 0, 0);
            return result;
        }
    }

    // Tidak ada waktu: gunakan akhir hari atau midnight
    if (endOfDay) {
        result.setHours(23, 59, 59, 999);
    }
    return result;
}

/**
 * Format tanggal untuk display (e.g. "24 Juni 2026").
 * Selalu menggunakan parseIndonesianDate agar timezone-safe.
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        let d = parseIndonesianDate(dateString);
        if (!d || isNaN(d.getTime())) return dateString;
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return d.toLocaleDateString('id-ID', options);
    } catch (e) {
        return dateString;
    }
}

/**
 * Format tanggal untuk input[type=date] (YYYY-MM-DD).
 * Selalu timezone-safe.
 */
function formatDateInput(dateString) {
    if (!dateString) {
        const now = getNowWIB();
        const year  = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day   = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    try {
        let d = parseIndonesianDate(dateString);
        if (!d || isNaN(d.getTime())) return '';
        const year  = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day   = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return '';
    }
}


// Time Formatting Helpers
function formatTime(timeStr) {
    if (!timeStr) return '-';
    timeStr = String(timeStr).trim();
    
    let hours = '';
    let minutes = '';
    
    // Check if it's an ISO datetime string (like 1899-12-30T01:52:48.000Z from Google Sheets time cells)
    if (timeStr.includes('T')) {
        try {
            const d = new Date(timeStr);
            if (!isNaN(d.getTime())) {
                const parts = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).formatToParts(d);
                hours = parts.find(p => p.type === 'hour')?.value || '';
                minutes = parts.find(p => p.type === 'minute')?.value || '';
            }
        } catch (e) {
            // fallback
        }
    }
    
    if (!hours || !minutes) {
        // Match standard HH:MM:SS or HH:MM or HH.MM
        const match = timeStr.match(/^(\d{1,2})[:.](\d{1,2})/);
        if (match) {
            hours = match[1].padStart(2, '0');
            minutes = match[2].padStart(2, '0');
        }
    }
    
    if (hours && minutes) {
        return `${hours}.${minutes} WIB`;
    }
    
    return timeStr;
}

function formatTimeInput(timeStr) {
    if (!timeStr) return '09:00';
    timeStr = String(timeStr).trim();
    
    let hours = '';
    let minutes = '';
    
    if (timeStr.includes('T')) {
        try {
            const d = new Date(timeStr);
            if (!isNaN(d.getTime())) {
                const parts = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).formatToParts(d);
                hours = parts.find(p => p.type === 'hour')?.value || '';
                minutes = parts.find(p => p.type === 'minute')?.value || '';
            }
        } catch (e) {
            // fallback
        }
    }
    
    if (!hours || !minutes) {
        const match = timeStr.match(/^(\d{1,2})[:.](\d{1,2})/);
        if (match) {
            hours = match[1].padStart(2, '0');
            minutes = match[2].padStart(2, '0');
        }
    }
    
    if (hours && minutes) {
        return `${hours}:${minutes}`;
    }
    
    return '09:00';
}

/**
 * Format tanggal dan jam sekaligus dalam WIB
 * Contoh: "24 Juni 2026, 09.00 WIB"
 */
function formatDateTimeWIB(dateStr, timeStr = null) {
    if (!dateStr) return '-';
    const dateFormatted = formatDate(dateStr);
    if (!timeStr) return `${dateFormatted} WIB`;
    const timeFormatted = formatTime(timeStr);
    return `${dateFormatted}, ${timeFormatted}`;
}

/**
 * Live Digital Clock Widget (WIB - Asia/Jakarta, UTC+7)
 */
function updateRealtimeWIBClock() {
    const nowWIB = getNowWIB();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    const dayName = days[nowWIB.getDay()];
    const dateNum = String(nowWIB.getDate()).padStart(2, '0');
    const monthName = months[nowWIB.getMonth()];
    const yearNum = nowWIB.getFullYear();
    const dateFormatted = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;
    
    const hh = String(nowWIB.getHours()).padStart(2, '0');
    const mm = String(nowWIB.getMinutes()).padStart(2, '0');
    const ss = String(nowWIB.getSeconds()).padStart(2, '0');
    const timeFormatted = `${hh}:${mm}:${ss}`;

    const dateEl = document.getElementById('header-wib-date');
    const timeEl = document.getElementById('header-wib-time');
    if (dateEl) dateEl.textContent = dateFormatted;
    if (timeEl) timeEl.textContent = timeFormatted;
}

function initRealtimeWIBClock() {
    updateRealtimeWIBClock();
    if (!window._wibClockInterval) {
        window._wibClockInterval = setInterval(updateRealtimeWIBClock, 1000);
    }
}

// Expose helpers globally to avoid script loading order issues with views.js
window.parseIndonesianDate = parseIndonesianDate;
window.parseDateTimeWIB    = parseDateTimeWIB;
window.extractTimeComponents = extractTimeComponents;
window.getNowWIB           = getNowWIB;
window.formatDate          = formatDate;
window.formatDateInput     = formatDateInput;
window.formatTime          = formatTime;
window.formatTimeInput     = formatTimeInput;
window.formatDateTimeWIB   = formatDateTimeWIB;
window.initRealtimeWIBClock = initRealtimeWIBClock;


// Helpers for opening modals and viewing details via ID
function getItemByTypeAndId(type, id) {
    const sheetMapping = {
        'content': 'content_planner',
        'rekap_rutin': 'rekap_rutin',
        'ad_hoc': 'ad_hoc_2026',
        'protokoler': 'protokoler',
        'mc': 'mc',
        'brs_rilis': 'brs_rilis',
        'hari_besar': 'hari_besar',
        'team': 'team',
        'user_manager': 'users',
        'assignment': 'assignments',
        'tickets': 'tickets',
        'monitoring': 'monitoring',
        'repository': 'repository'
    };
    const sheetName = sheetMapping[type] || type;
    const varName = SHEET_TO_VAR[sheetName] || type;
    if (!db[varName]) return null;
    return db[varName].find(i => Number(i.id) === Number(id));
}

window.openModalById = function (type, id) {
    const item = getItemByTypeAndId(type, id);
    openModal(type, item);
};

let lastNavigationTime = 0;

window.showDetailById = function (type, id) {
    // Guard against ghost-clicks or touch fall-through during page transition or drawer close
    if (Date.now() - lastNavigationTime < 450) {
        return;
    }
    const item = getItemByTypeAndId(type, id);
    if (item) {
        showDetail(type, item);
    }
};

window.getIndonesianMonthName = function (dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return monthNames[d.getMonth()];
};

window.getIndonesianDayName = function (dateVal) {
    if (!dateVal) return '';
    const indDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    try {
        if (typeof dateVal === 'string') {
            const m = dateVal.trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
            if (m) {
                const y = parseInt(m[1], 10);
                const mo = parseInt(m[2], 10) - 1;
                const d = parseInt(m[3], 10);
                const dt = new Date(y, mo, d);
                return indDays[dt.getDay()] || '';
            }
        }
        const d = (typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dateVal) : new Date(dateVal));
        if (!d || isNaN(d.getTime())) return '';
        return indDays[d.getDay()] || '';
    } catch (e) {
        return '';
    }
};

function getIndonesianDayName(dateVal) {
    return window.getIndonesianDayName(dateVal);
}


// Mobile Sidebar Operations
function openMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Desktop Sidebar Toggle
function toggleDesktopSidebar() {
    const sidebar = document.getElementById('desktop-sidebar');
    const icon = document.getElementById('sidebar-toggle-icon');
    if (!sidebar) return;

    const isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('sim_humas_sidebar_collapsed', isCollapsed ? 'true' : 'false');

    if (icon) {
        icon.className = isCollapsed ? 'fa-solid fa-angles-right text-sm' : 'fa-solid fa-angles-left text-sm';
    }
}

function initSidebarState() {
    const sidebar = document.getElementById('desktop-sidebar');
    const icon = document.getElementById('sidebar-toggle-icon');
    if (!sidebar) return;

    const saved = localStorage.getItem('sim_humas_sidebar_collapsed');
    // On tablet viewports (768px <= width < 1024px), default to collapsed if user has no saved preference
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isCollapsed = saved !== null ? saved === 'true' : isTablet;

    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        if (icon) icon.className = 'fa-solid fa-angles-right text-sm';
    } else {
        sidebar.classList.remove('collapsed');
        if (icon) icon.className = 'fa-solid fa-angles-left text-sm';
    }
}

// Mobile Bottom Navigation Primary Action (role-aware)
function handleBottomNavPrimary() {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === 'pemohon') {
        router('tickets');
    } else if (role === 'tim') {
        router('assignment');
    } else if (role === 'koordinator') {
        router('planner');
    } else {
        router('tickets');
    }
}
window.handleBottomNavPrimary = handleBottomNavPrimary;

// Global System Notifications (Per-User Targeting)
function addNotification(title, message, target = 'all') {
    // target bisa berupa: 'all', role ('admin','tim',dll), atau username spesifik
    const timestamp = new Date().toISOString();
    const newNotif = {
        id: Date.now(), // unique ID
        user_target: target, // username spesifik, role, atau 'all'
        user_role: target,   // maps to Google Sheets header
        title: title,
        message: message,
        timestamp: timestamp,
        is_read: false
    };
    db.notifications.push(newNotif);
    saveLocalFallback('notifications');

    // Render
    renderNotificationsUI();

    // Sync to Sheets
    sendDataToServer('add', 'notifications', newNotif);
}

function getReadNotifIds() {
    if (!currentUser) return new Set();
    const key = 'sim_humas_read_notifs_' + (currentUser.username || 'guest');
    try {
        return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch (e) {
        return new Set();
    }
}

function saveReadNotifId(id) {
    if (!currentUser) return;
    const key = 'sim_humas_read_notifs_' + (currentUser.username || 'guest');
    const readIds = getReadNotifIds();
    readIds.add(Number(id));
    // Simpan max 200 ID terakhir
    const arr = Array.from(readIds).slice(-200);
    localStorage.setItem(key, JSON.stringify(arr));
}

function isNotifForMe(n) {
    if (!currentUser) return false;
    const target = String(n.user_target || n.user_role || 'all').toLowerCase();
    if (target === 'all') return true;
    // Cek berdasarkan username
    if (target === (currentUser.username || '').toLowerCase()) return true;
    // Cek berdasarkan nama
    if (target === (currentUser.name || '').toLowerCase()) return true;
    // Cek berdasarkan role
    if (target === (currentUser.role || '').toLowerCase()) return true;
    return false;
}

function renderNotificationsUI() {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!list) return;

    const readIds = getReadNotifIds();

    // Filter notifikasi yang relevan untuk user ini
    const myNotifs = db.notifications.filter(n => isNotifForMe(n));

    // Tandai is_read berdasarkan localStorage (bukan field di db yang bisa overwrite)
    const notifWithReadState = myNotifs.map(n => ({
        ...n,
        isReadLocal: readIds.has(Number(n.id))
    }));

    const unreadCount = notifWithReadState.filter(n => !n.isReadLocal).length;

    // Badge
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Sort by newest first
    notifWithReadState.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (notifWithReadState.length === 0) {
        list.innerHTML = `
            <div class="py-8 text-center">
                <div class="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <i class="fa-regular fa-bell-slash text-slate-400 text-xl"></i>
                </div>
                <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500">Tidak ada notifikasi.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notifWithReadState.slice(0, 8).map(n => {
        const timeAgo = formatTimeAgo(n.timestamp);
        return `
        <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-xl transition-all cursor-default ${!n.isReadLocal ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-l-2 border-indigo-400' : 'opacity-70'}">
            <div class="flex items-start gap-2.5">
                <div class="w-7 h-7 rounded-lg ${!n.isReadLocal ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'} flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fa-solid fa-bell text-[10px]"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-[10px] text-slate-800 dark:text-slate-200 leading-snug">${n.title}</p>
                    <p class="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">${n.message}</p>
                    <span class="text-[8px] text-slate-400 font-medium block mt-1">
                        <i class="fa-regular fa-clock mr-0.5"></i>${timeAgo}
                    </span>
                </div>
                ${!n.isReadLocal ? `
                <div class="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1"></div>
                ` : ''}
            </div>
        </div>
    `;
    }).join('');
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return '-';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return then.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}


function toggleNotificationPanel() {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.toggle('hidden');
    // Re-render when opening
    if (panel && !panel.classList.contains('hidden')) {
        renderNotificationsUI();
    }
}

function markAllNotificationsRead() {
    const readIds = getReadNotifIds();
    db.notifications.filter(n => isNotifForMe(n)).forEach(n => {
        readIds.add(Number(n.id));
        saveReadNotifId(n.id);
    });
    renderNotificationsUI();
    showToast('Semua notifikasi ditandai dibaca.');
    document.getElementById('notif-panel')?.classList.add('hidden');
}

// Dark Mode Toggler
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('sim_humas_dark', isDark ? 'true' : 'false');
    showToast(`Tema gelap ${isDark ? 'diaktifkan' : 'dinonaktifkan'}`);
}

function initTheme() {
    const isDark = localStorage.getItem('sim_humas_dark') === 'true';
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Global Search Active View Filter
function handleGlobalSearch(query) {
    activeSearchQuery = query;
    // Map Search to active modules
    if (currentState === 'rekap_rutin') {
        rutinSearch = query;
        drawRutinTable();
    } else if (currentState === 'ad_hoc') {
        adHocSearch = query;
        drawAdHocTable();
    } else if (currentState === 'protokoler_sep') {
        protoSearch = query;
        drawProtokolerTable();
    } else if (currentState === 'mc_sep') {
        mcSearch = query;
        drawMcTable();
    } else if (currentState === 'brs_rilis') {
        brsSearch = query;
        drawBrsGrid();
    } else if (currentState === 'hari_besar') {
        hariBesarSearch = query;
        drawHariBesarTable();
    } else if (currentState === 'planner') {
        plannerSearch = query;
        drawPlannerBoard();
    } else if (currentState === 'tickets') {
        ticketSearch = query;
        drawTicketsGrid();
    } else if (currentState === 'team') {
        teamSearch = query;
        drawTeamGrid();
    }
}

// Modal Form Operations
// Handler multi-select Media Post pada Content Planner
window.toggleMediaPostOption = function(mediaId) {
    const input = document.getElementById('media_post');
    if (!input) return;
    let list = input.value ? input.value.split(',').map(s => s.trim()).filter(Boolean) : [];
    const idx = list.indexOf(mediaId);
    if (idx > -1) {
        if (list.length > 1) {
            list.splice(idx, 1);
        } else {
            if (typeof showToast === 'function') showToast('Pilih minimal 1 media post', 'info');
            return;
        }
    } else {
        list.push(mediaId);
    }
    input.value = list.join(', ');
    updateMediaPostUI(list);
};

window.setAllMediaOptions = function(mode) {
    const input = document.getElementById('media_post');
    if (!input) return;
    let list = [];
    if (mode === 'all') {
        list = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];
    } else if (mode === 'popular') {
        list = ['Instagram', 'TikTok', 'YouTube'];
    } else {
        list = ['Instagram'];
    }
    input.value = list.join(', ');
    updateMediaPostUI(list);
};

function updateMediaPostUI(list) {
    document.querySelectorAll('#media-post-pill-group .media-post-pill').forEach(btn => {
        const id = btn.getAttribute('data-media-id');
        const isSel = list.includes(id);
        const check = btn.querySelector('.pill-check');
        const checkbox = btn.querySelector('.pill-checkbox');
        if (checkbox) checkbox.checked = isSel;
        if (isSel) {
            btn.className = 'media-post-pill flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 shadow-xs';
            if (check) check.classList.remove('hidden');
        } else {
            btn.className = 'media-post-pill flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer bg-white dark:bg-slate-750 border-slate-205 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:border-slate-300';
            if (check) check.classList.add('hidden');
        }
    });

    const summaryEl = document.getElementById('media-post-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `<span class="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full text-[11px]"><i class="fa-solid fa-circle-check"></i> ${list.length} Media Dipilih: ${list.join(', ')}</span>`;
    }
}

// Global XSS Sanitization Helper for defensive HTML rendering
var escapeHtml = window.escapeHtml = window.escapeHtml || function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Helper parsing daftar rubrikasi dari string terpisah koma atau array
window.parseRubrikasiArray = function(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    return String(val).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
};

// Handler multi-select Rubrikasi pada Formulir Penugasan / Kegiatan
window.toggleRubrikasiOption = function(rubrikVal, inputId = 'rubrikasi') {
    const input = document.getElementById(inputId);
    if (!input) return;
    let list = window.parseRubrikasiArray(input.value);
    const idx = list.indexOf(rubrikVal);
    if (idx > -1) {
        list.splice(idx, 1);
    } else {
        list.push(rubrikVal);
    }
    input.value = list.join(', ');
    window.updateRubrikasiPillUI(inputId);
};

window.setAllRubrikasiOptions = function(mode, inputId = 'rubrikasi') {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (mode === 'none') {
        input.value = '';
    } else if (mode === 'se2026') {
        let list = window.parseRubrikasiArray(input.value);
        if (!list.includes('#SE2026')) list.push('#SE2026');
        input.value = list.join(', ');
    } else if (mode === 'dtsen') {
        let list = window.parseRubrikasiArray(input.value);
        if (!list.includes('#DTSEN')) list.push('#DTSEN');
        input.value = list.join(', ');
    }
    window.updateRubrikasiPillUI(inputId);
};

window.updateRubrikasiPillUI = function(inputId = 'rubrikasi') {
    const input = document.getElementById(inputId);
    if (!input) return;
    const list = window.parseRubrikasiArray(input.value);

    const groupEl = document.getElementById(`${inputId}-pill-group`);
    if (groupEl) {
        groupEl.querySelectorAll('.rubrikasi-pill').forEach(btn => {
            const id = btn.getAttribute('data-rubrik-id');
            const isSel = list.includes(id);
            const check = btn.querySelector('.pill-check');
            const checkbox = btn.querySelector('.pill-checkbox');
            if (checkbox) checkbox.checked = isSel;
            if (isSel) {
                btn.className = 'rubrikasi-pill flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all select-none cursor-pointer bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 shadow-2xs';
                if (check) check.classList.remove('hidden');
            } else {
                btn.className = 'rubrikasi-pill flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all select-none cursor-pointer bg-white dark:bg-slate-750 border-slate-205 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:border-slate-300';
                if (check) check.classList.add('hidden');
            }
        });
    }

    const summaryEl = document.getElementById(`${inputId}-summary`);
    if (summaryEl) {
        if (list.length === 0) {
            summaryEl.innerHTML = `
                <span class="inline-flex items-center gap-1 font-semibold text-rose-500 text-[11px]">
                    <i class="fa-solid fa-triangle-exclamation"></i> Belum ada rubrikasi yang dipilih (Pilih minimal 1)
                </span>
            `;
        } else {
            summaryEl.innerHTML = `
                <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                        ${list.length} Rubrikasi Terpilih:
                    </span>
                    ${list.map(r => `
                        <span class="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full text-[10.5px]">
                            <span>${r}</span>
                            <button type="button" onclick="event.stopPropagation(); window.toggleRubrikasiOption('${r}', '${inputId}')" class="text-indigo-400 hover:text-rose-500 ml-0.5 cursor-pointer">
                                <i class="fa-solid fa-xmark text-[10px]"></i>
                            </button>
                        </span>
                    `).join('')}
                </div>
            `;
        }
    }
};

// =============================================================
// HANDLERS MULTI-SELECT PETUGAS PIC UNTUK PENUGASAN AD HOC
// Sumber personil: strictly dari sheet team (db.team)
// =============================================================
window.parseAdHocPicArray = function(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    const str = String(val).trim();
    if (!str) return [];

    // Prioritaskan pencocokan nama lengkap personil dari db.team
    const teamNames = (db.team || []).map(m => m && m.nama ? m.nama.trim() : '').filter(Boolean);
    const selected = [];
    let remaining = str;
    teamNames.forEach(tName => {
        if (remaining.includes(tName)) {
            selected.push(tName);
            remaining = remaining.replace(tName, '');
        }
    });

    if (selected.length > 0) {
        return selected;
    }

    // Fallback: split berdasarkan koma / titik koma / slash
    return str.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
};

window.toggleAdHocPic = function(encodedName) {
    const name = decodeURIComponent(encodedName);
    const input = document.getElementById('petugas');
    if (!input) return;
    let list = window.parseAdHocPicArray(input.value);
    const idx = list.indexOf(name);
    if (idx > -1) {
        list.splice(idx, 1);
    } else {
        list.push(name);
    }
    input.value = list.join(', ');
    window.updateAdHocPicUI();
};

window.setAllAdHocPics = function(mode) {
    const input = document.getElementById('petugas');
    if (!input) return;
    if (mode === 'none') {
        input.value = '';
    } else if (mode === 'all') {
        const allTeamNames = (db.team || []).map(m => m && m.nama ? m.nama.trim() : '').filter(Boolean);
        input.value = allTeamNames.join(', ');
    }
    window.updateAdHocPicUI();
};

window.updateAdHocPicUI = function() {
    const input = document.getElementById('petugas');
    if (!input) return;
    const list = window.parseAdHocPicArray(input.value);

    // Otomatisasi Nilai JML BERTUGAS mengikuti jumlah petugas PIC yang dipilih
    const jmlInput = document.getElementById('jumlah_bertugas');
    if (jmlInput) {
        jmlInput.value = list.length;
    }

    const groupEl = document.getElementById('adhoc-pic-pill-group');
    if (groupEl) {
        groupEl.querySelectorAll('.adhoc-pic-pill').forEach(btn => {
            const picName = btn.getAttribute('data-pic-name');
            const isSel = list.includes(picName);
            const check = btn.querySelector('.pic-check');
            const checkbox = btn.querySelector('.pic-checkbox');
            if (checkbox) checkbox.checked = isSel;
            if (isSel) {
                btn.className = 'adhoc-pic-pill flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 shadow-2xs';
                if (check) check.classList.remove('hidden');
            } else {
                btn.className = 'adhoc-pic-pill flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all select-none cursor-pointer bg-white dark:bg-slate-750 border-slate-205 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:border-slate-300';
                if (check) check.classList.add('hidden');
            }
        });
    }

    const summaryEl = document.getElementById('adhoc-pic-summary');
    if (summaryEl) {
        if (list.length === 0) {
            summaryEl.innerHTML = `
                <div class="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1.5">
                    <i class="fa-solid fa-triangle-exclamation text-xs"></i>
                    <span>Belum ada petugas PIC yang dipilih. Silakan pilih minimal 1 petugas dari daftar di atas.</span>
                </div>
            `;
        } else {
            summaryEl.innerHTML = `
                <div class="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 rounded-xl space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                            <i class="fa-solid fa-users text-indigo-600"></i> ${list.length} Petugas PIC Terpilih:
                        </span>
                        <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <i class="fa-solid fa-check-double mr-1"></i>Jml Bertugas: ${list.length} Orang
                        </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        ${list.map(n => `
                            <span class="inline-flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 px-2.5 py-1 rounded-lg text-[11px] shadow-2xs">
                                <i class="fa-solid fa-user-check text-[10px] text-indigo-500"></i>
                                <span>${n}</span>
                                <button type="button" onclick="event.stopPropagation(); window.toggleAdHocPic('${encodeURIComponent(n)}')" class="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer" title="Hapus ${n}">
                                    <i class="fa-solid fa-xmark text-[10px]"></i>
                                </button>
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
};

// Handler otomatis progres Content Planner berdasarkan status
window.handleContentStatusChange = function(status) {
    const progresInput = document.getElementById('progres');
    if (!progresInput) return;
    if (status === 'Posted') {
        progresInput.value = 100;
    } else if (status === 'Done') {
        progresInput.value = 90;
    }
};

// Helper to generate input fields HTML for each feature type
function getModalFieldsHTML(type, item) {
    if (type === 'content') {
        let initialProgres = item?.progres !== undefined ? Number(item.progres) : 0;
        if (item?.status === 'Posted') {
            initialProgres = 100;
        } else if (item?.status === 'Done' && (!initialProgres || initialProgres === 0)) {
            initialProgres = 90;
        }

        const currentJenis = item?.jenis_konten || item?.postType || item?.jenis || 'Carousel';
        const rawMedia = item?.media_post || item?.media || 'Instagram';
        const selectedMedia = rawMedia.split(',').map(s => s.trim()).filter(Boolean);
        const currentJam = item?.jam_posting || '09:00';
        let currentHour = '09';
        let currentMinute = '00';
        const normalizedJam = formatTimeInput(currentJam);
        const jamMatch = String(normalizedJam).match(/^(\d{1,2})[:.](\d{1,2})/);
        if (jamMatch) {
            currentHour = jamMatch[1].padStart(2, '0');
            currentMinute = jamMatch[2].padStart(2, '0');
        }

        let hourOptions = '';
        for (let h = 0; h < 24; h++) {
            const hStr = String(h).padStart(2, '0');
            hourOptions += `<option value="${hStr}" ${currentHour === hStr ? 'selected' : ''}>${hStr}</option>`;
        }

        let minuteOptions = '';
        for (let m = 0; m < 60; m += 5) {
            const mStr = String(m).padStart(2, '0');
            minuteOptions += `<option value="${mStr}" ${currentMinute === mStr ? 'selected' : ''}>${mStr}</option>`;
        }
        // Pastikan currentMinute jika bukan kelipatan 5 tetap ada di options
        if (!minuteOptions.includes(`value="${currentMinute}"`)) {
            minuteOptions += `<option value="${currentMinute}" selected>${currentMinute}</option>`;
        }
        const currentPic = item?.assignTo || item?.['assign To'] || item?.assignedTo || item?.pic || '';

        const mediaOptions = [
            { id: 'Instagram', label: 'Instagram', icon: 'fa-brands fa-instagram text-pink-500' },
            { id: 'TikTok', label: 'TikTok', icon: 'fa-brands fa-tiktok text-slate-800 dark:text-white' },
            { id: 'YouTube', label: 'YouTube', icon: 'fa-brands fa-youtube text-red-500' },
            { id: 'Facebook', label: 'Facebook', icon: 'fa-brands fa-facebook text-blue-600' }
        ];

        // Daftar PIC yang unik dan valid
        const memberList = [];
        const seenNames = new Set();
        (db.team && db.team.length > 0 ? db.team : db.users).forEach(m => {
            if (m && m.nama && !seenNames.has(m.nama)) {
                seenNames.add(m.nama);
                memberList.push(m.nama);
            }
        });
        if (currentPic && !seenNames.has(currentPic)) {
            memberList.push(currentPic);
        }

        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-300">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Konten <span class="text-rose-500">*</span></label>
                    <input type="text" id="judul" value="${item?.judul || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium text-slate-800 dark:text-white" placeholder="Contoh: Rilis Data Inflasi Kalbar" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenis Konten (Video/Carousel) <span class="text-rose-500">*</span></label>
                    <select id="jenis_konten" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                        <option ${currentJenis === 'Video' ? 'selected' : ''} value="Video">Video</option>
                        <option ${currentJenis === 'Carousel' ? 'selected' : ''} value="Carousel">Carousel</option>
                        <option ${currentJenis === 'Reels' ? 'selected' : ''} value="Reels">Reels</option>
                        <option ${currentJenis === 'Single Image' ? 'selected' : ''} value="Single Image">Single Image</option>
                    </select>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Media Post <span class="text-rose-500">*</span> 
                            <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold ml-1">(Bisa pilih lebih dari 1 media)</span>
                        </label>
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="setAllMediaOptions('all')" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline">Pilih Semua</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" onclick="setAllMediaOptions('popular')" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline">IG+TikTok+YT</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" onclick="setAllMediaOptions('ig')" class="text-[10px] font-bold text-slate-500 hover:text-slate-700 underline">Hanya IG</button>
                        </div>
                    </div>
                    <div id="media-post-pill-group" class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        ${mediaOptions.map(opt => {
                            const isChecked = selectedMedia.includes(opt.id) || (selectedMedia.length === 0 && opt.id === 'Instagram');
                            return `
                                <button type="button" 
                                        onclick="toggleMediaPostOption('${opt.id}')"
                                        data-media-id="${opt.id}"
                                        class="media-post-pill flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer ${
                                            isChecked
                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 shadow-xs'
                                            : 'bg-white dark:bg-slate-750 border-slate-205 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:border-slate-300'
                                        }">
                                    <span class="inline-flex items-center gap-1.5 truncate">
                                        <input type="checkbox" class="pill-checkbox rounded text-indigo-600 pointer-events-none" ${isChecked ? 'checked' : ''} tabindex="-1">
                                        <i class="${opt.icon}"></i>
                                        <span class="truncate">${opt.label}</span>
                                    </span>
                                    <i class="fa-solid fa-circle-check pill-check text-indigo-600 dark:text-indigo-400 text-xs shrink-0 ${isChecked ? '' : 'hidden'}"></i>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <div id="media-post-summary" class="mt-2">
                        <span class="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full text-[11px]">
                            <i class="fa-solid fa-circle-check"></i> ${selectedMedia.length > 0 ? selectedMedia.length : 1} Media Dipilih: ${selectedMedia.length > 0 ? selectedMedia.join(', ') : 'Instagram'}
                        </span>
                    </div>
                    <input type="hidden" id="media_post" value="${selectedMedia.length > 0 ? selectedMedia.join(', ') : 'Instagram'}" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC / Assign To (Kolom I) <span class="text-rose-500">*</span></label>
                    <div class="relative">
                        <input type="text" id="assignedTo" list="pic-options-planner" value="${currentPic}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold text-slate-800 dark:text-white" placeholder="Ketik atau pilih nama PIC..." required autocomplete="off">
                        <datalist id="pic-options-planner">
                            ${memberList.map(name => `<option value="${name}">${name}</option>`).join('')}
                        </datalist>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Posting <span class="text-rose-500">*</span></label>
                        <input type="date" id="jadwal" value="${formatDateInput(item?.jadwal || item?.tanggal_posting)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs text-slate-800 dark:text-white font-semibold" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jam Posting (WIB / 24 Jam) <span class="text-rose-500">*</span></label>
                        <div class="flex items-center gap-1.5">
                            <select id="jam_posting_hour" class="flex-1 px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold text-slate-800 dark:text-white" required>
                                ${hourOptions}
                            </select>
                            <span class="text-xs font-bold text-slate-400">:</span>
                            <select id="jam_posting_minute" class="flex-1 px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold text-slate-800 dark:text-white" required>
                                ${minuteOptions}
                            </select>
                            <span class="text-xs font-bold text-indigo-650 dark:text-indigo-400 ml-1">WIB</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                        <select id="status" onchange="handleContentStatusChange(this.value)" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            <option ${item?.status === 'Draft' ? 'selected' : ''}>Draft</option>
                            <option ${item?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option ${item?.status === 'Done' ? 'selected' : ''}>Done</option>
                            <option ${item?.status === 'Posted' ? 'selected' : ''}>Posted</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Progres (%)</label>
                        <input type="number" id="progres" value="${initialProgres}" min="0" max="100" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan Desain / Cloud Storage (Google Drive)</label>
                    <input type="url" id="tautan_cloud" value="${item?.tautan_cloud || item?.link_cloud || item?.cloud_storage || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-mono text-indigo-600 dark:text-indigo-400" placeholder="https://drive.google.com/drive/folders/...">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi Konsep / Catatan</label>
                    <textarea id="konsep" rows="2" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Deskripsikan ide visual/brief (opsional)...">${item?.konsep || ''}</textarea>
                </div>
            </div>
        `;
    } else if (type === 'assignment') {
        const assignRubrikOptions = [
            '#SE2026', '#DTSEN', '#haribesar/daerah/nasional/internasional', '#rilisbrs', '#infografisbrs', '#rilispublikasi',
            '#SElasaSEnsus', '#promosistatistik', '#rripontianak',
            '#zonaintegritas', '#SKD', '#ddakalbar', 'KLIK', 'Laporan'
        ];
        const selectedAssignRubriks = window.parseRubrikasiArray ? window.parseRubrikasiArray(item?.rubrikasi) : (item?.rubrikasi ? [item.rubrikasi] : []);
        selectedAssignRubriks.forEach(r => {
            if (r && !assignRubrikOptions.includes(r)) assignRubrikOptions.push(r);
        });
        const assignRubrikVal = selectedAssignRubriks.join(', ');

        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-300">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tugas <span class="text-rose-500">*</span></label>
                    <input type="text" id="tugas" value="${item?.tugas || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium text-slate-800 dark:text-white" placeholder="Contoh: Membuat Infografis Statistik" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi Detail <span class="text-rose-500">*</span></label>
                    <textarea id="deskripsi" rows="3" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Deskripsikan detail penugasan..." required>${item?.deskripsi || ''}</textarea>
                </div>
                <!-- Multiple Select Rubrikasi Penugasan -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Rubrikasi Penugasan (Bisa Pilih Lebih Dari Satu)
                        </label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="setAllRubrikasiOptions('se2026', 'assignment_rubrikasi')" class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">+ #SE2026</button>
                            <span class="text-slate-300 dark:text-slate-700">|</span>
                            <button type="button" onclick="setAllRubrikasiOptions('dtsen', 'assignment_rubrikasi')" class="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer">+ #DTSEN</button>
                            <span class="text-slate-300 dark:text-slate-700">|</span>
                            <button type="button" onclick="setAllRubrikasiOptions('none', 'assignment_rubrikasi')" class="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer">Reset</button>
                        </div>
                    </div>
                    <div id="assignment_rubrikasi-pill-group" class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-44 overflow-y-auto p-1.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                        ${assignRubrikOptions.map(r => {
                            const isChecked = selectedAssignRubriks.includes(r);
                            return `
                                <button type="button"
                                        onclick="toggleRubrikasiOption('${r}', 'assignment_rubrikasi')"
                                        data-rubrik-id="${r}"
                                        class="rubrikasi-pill flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all select-none cursor-pointer ${
                                            isChecked
                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 font-bold shadow-2xs'
                                            : 'bg-white dark:bg-slate-750 border-slate-205 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:border-slate-300 font-medium'
                                        }">
                                    <span class="inline-flex items-center gap-1.5 truncate">
                                        <input type="checkbox" class="pill-checkbox rounded text-indigo-600 pointer-events-none" ${isChecked ? 'checked' : ''} tabindex="-1">
                                        <span class="truncate">${r}</span>
                                    </span>
                                    <i class="fa-solid fa-circle-check pill-check text-indigo-600 dark:text-indigo-400 text-xs shrink-0 ${isChecked ? '' : 'hidden'}"></i>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <div id="assignment_rubrikasi-summary" class="mt-2 min-h-[22px]">
                        ${selectedAssignRubriks.length === 0 ? `
                            <span class="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                                <i class="fa-solid fa-info-circle"></i> Opsional: Pilih rubrikasi yang sesuai dengan penugasan ini
                            </span>
                        ` : `
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                                    ${selectedAssignRubriks.length} Rubrikasi Terpilih:
                                </span>
                                ${selectedAssignRubriks.map(r => `
                                    <span class="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full text-[10.5px]">
                                        <span>${r}</span>
                                        <button type="button" onclick="event.stopPropagation(); window.toggleRubrikasiOption('${r}', 'assignment_rubrikasi')" class="text-indigo-400 hover:text-rose-500 ml-0.5 cursor-pointer">
                                            <i class="fa-solid fa-xmark text-[10px]"></i>
                                        </button>
                                    </span>
                                `).join('')}
                            </div>
                        `}
                    </div>
                    <input type="hidden" id="assignment_rubrikasi" value="${assignRubrikVal}">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Prioritas</label>
                        <select id="prioritas" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.prioritas === 'Rendah' ? 'selected' : ''}>Rendah</option>
                            <option ${item?.prioritas === 'Sedang' ? 'selected' : '' || !item ? 'selected' : ''}>Sedang</option>
                            <option ${item?.prioritas === 'Tinggi' ? 'selected' : ''}>Tinggi</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.status === 'Belum Mulai' ? 'selected' : ''}>Belum Mulai</option>
                            <option ${item?.status === 'Sedang Dikerjakan' ? 'selected' : ''}>Sedang Dikerjakan</option>
                            <option ${item?.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                            <option ${item?.status === 'Revisi' ? 'selected' : ''}>Revisi</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Penugasan <span class="text-rose-500">*</span></label>
                        <input type="date" id="tanggal_penugasan" value="${formatDateInput(item?.tanggal_penugasan || new Date())}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deadline <span class="text-rose-500">*</span></label>
                        <input type="date" id="deadline" value="${formatDateInput(item?.deadline)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs text-slate-800 dark:text-white" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Progres (%)</label>
                        <input type="number" id="progres" value="${item?.progres || 0}" min="0" max="100" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ditugaskan ke (PIC) <span class="text-rose-500">*</span></label>
                        <select id="assigned_to" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.assigned_to === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Link Lampiran</label>
                    <input type="url" id="lampiran" value="${item?.lampiran || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="https://drive.google.com/...">
                </div>
            </div>
        `;
    } else if (type === 'rekap_rutin') {
        const rubrikOptions = [
            '#SE2026', '#DTSEN', '#haribesar/daerah/nasional/internasional', '#rilisbrs', '#infografisbrs', '#rilispublikasi',
            '#SElasaSEnsus', '#promosistatistik', '#rripontianak',
            '#zonaintegritas', '#SKD', '#ddakalbar', 'KLIK', 'Laporan'
        ];
        // Parse seluruh rubrikasi tersimpan (mendukung multiple select terpisah koma)
        const selectedRubriks = window.parseRubrikasiArray ? window.parseRubrikasiArray(item?.rubrikasi) : (item?.rubrikasi ? [item.rubrikasi] : []);
        // Pastikan nilai kustom yang sudah ada sebelumnya tetap muncul di daftar opsi
        selectedRubriks.forEach(r => {
            if (r && !rubrikOptions.includes(r)) {
                rubrikOptions.push(r);
            }
        });
        // Default jika item baru belum punya pilihan: default ke #haribesar/daerah/nasional/internasional jika list kosong
        if (!item && selectedRubriks.length === 0) {
            selectedRubriks.push('#haribesar/daerah/nasional/internasional');
        }
        const rubrikInputValue = selectedRubriks.join(', ');

        // Ambil daftar anggota tim dari db.team (Direktori Tim)
        const teamMembers = [];
        const seenNames = new Set();
        (db.team && db.team.length > 0 ? db.team : []).forEach(m => {
            if (m.nama) {
                // Bersihkan nama dari embel-embel jabatan atau peran seperti (Humas dan Protokoler)
                const cleanName = m.nama.replace(/\s*\([^)]*\)/g, '').trim();
                if (cleanName && !seenNames.has(cleanName)) {
                    seenNames.add(cleanName);
                    teamMembers.push({
                        nama: cleanName,
                        originalNama: m.nama.trim()
                    });
                }
            }
        });
        // Fallback ke db.users jika db.team kosong
        if (teamMembers.length === 0 && db.users && db.users.length > 0) {
            db.users.forEach(u => {
                if (u.nama) {
                    const cleanName = u.nama.replace(/\s*\([^)]*\)/g, '').trim();
                    if (cleanName && !seenNames.has(cleanName)) {
                        seenNames.add(cleanName);
                        teamMembers.push({
                            nama: cleanName,
                            originalNama: u.nama.trim()
                        });
                    }
                }
            });
        }

        const currentPetugas = item?.petugas ? item.petugas.trim() : '';
        const currentClean = currentPetugas.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
        const hasMatch = currentPetugas ? teamMembers.some(m => 
            m.nama.toLowerCase() === currentPetugas.toLowerCase() ||
            m.nama.toLowerCase() === currentClean ||
            (m.originalNama && m.originalNama.toLowerCase() === currentPetugas.toLowerCase())
        ) : true;

        const dateVal = formatDateInput(item?.tanggal);
        const autoHari = (dateVal ? getIndonesianDayName(dateVal) : '') || item?.hari || '';

        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-300">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Kegiatan <span class="text-rose-500">*</span></label>
                        <input type="date" id="tanggal" value="${dateVal}" oninput="if (window.getIndonesianDayName) { const h = window.getIndonesianDayName(this.value); if (h) document.getElementById('hari').value = h; }" onchange="if (window.getIndonesianDayName) { const h = window.getIndonesianDayName(this.value); if (h) document.getElementById('hari').value = h; }" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hari</label>
                        <select id="hari" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Hari...</option>
                            ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => `<option ${autoHari === h ? 'selected' : ''} value="${h}">${h}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sifat Kegiatan</label>
                        <select id="sifat_kegiatan" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            <option value="Rutin" ${item?.sifat_kegiatan === 'Rutin' || !item ? 'selected' : ''}>Rutin</option>
                            <option value="Ad Hoc" ${item?.sifat_kegiatan === 'Ad Hoc' ? 'selected' : ''}>Ad Hoc</option>
                        </select>
                    </div>
                </div>

                <!-- Bagian Rubrikasi Multi-Select -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Rubrikasi Kegiatan <span class="text-rose-500">*</span>
                        </label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="setAllRubrikasiOptions('none', 'rubrikasi')" class="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer">Reset</button>
                        </div>
                    </div>
                    <div id="rubrikasi-pill-group" class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-52 overflow-y-auto p-1.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                        ${rubrikOptions.map(r => {
                            const isChecked = selectedRubriks.includes(r);
                            return `
                                <button type="button"
                                        onclick="toggleRubrikasiOption('${r}', 'rubrikasi')"
                                        data-rubrik-id="${r}"
                                        class="rubrikasi-pill flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all select-none cursor-pointer ${
                                            isChecked
                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 font-bold shadow-2xs'
                                            : 'bg-white dark:bg-slate-750 border-slate-205 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:border-slate-300 font-medium'
                                        }">
                                    <span class="inline-flex items-center gap-1.5 truncate">
                                        <input type="checkbox" class="pill-checkbox rounded text-indigo-600 pointer-events-none" ${isChecked ? 'checked' : ''} tabindex="-1">
                                        <span class="truncate">${r}</span>
                                    </span>
                                    <i class="fa-solid fa-circle-check pill-check text-indigo-600 dark:text-indigo-400 text-xs shrink-0 ${isChecked ? '' : 'hidden'}"></i>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <div id="rubrikasi-summary" class="mt-2 min-h-[22px]">
                        ${selectedRubriks.length === 0 ? `
                            <span class="inline-flex items-center gap-1 font-semibold text-rose-500 text-[11px]">
                                <i class="fa-solid fa-triangle-exclamation"></i> Belum ada rubrikasi yang dipilih (Pilih minimal 1)
                            </span>
                        ` : `
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                                    ${selectedRubriks.length} Rubrikasi Terpilih:
                                </span>
                                ${selectedRubriks.map(r => `
                                    <span class="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full text-[10.5px]">
                                        <span>${r}</span>
                                        <button type="button" onclick="event.stopPropagation(); window.toggleRubrikasiOption('${r}', 'rubrikasi')" class="text-indigo-400 hover:text-rose-500 ml-0.5 cursor-pointer">
                                            <i class="fa-solid fa-xmark text-[10px]"></i>
                                        </button>
                                    </span>
                                `).join('')}
                            </div>
                        `}
                    </div>
                    <input type="hidden" id="rubrikasi" value="${rubrikInputValue}" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama / Judul Kegiatan <span class="text-rose-500">*</span></label>
                    <input type="text" id="kegiatan" value="${item?.kegiatan || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Publikasi Fliers Inflasi Bulanan" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Petugas PIC <span class="text-rose-500">*</span></span>
                            <span class="text-[10px] text-slate-400 font-normal">Sesuai Direktori Tim</span>
                        </label>
                        <select id="petugas" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-700 rounded-lg text-xs font-bold" required>
                            <option value="">-- Pilih Petugas PIC dari Direktori Tim --</option>
                            ${!hasMatch && currentPetugas ? `
                                <option value="${currentPetugas}" selected class="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/60">
                                    ⚠️ ${currentPetugas} (Belum sesuai Direktori Tim - Silakan pilih pengganti)
                                </option>
                            ` : ''}
                            ${teamMembers.map(m => {
                                const isSelected = currentPetugas && (
                                    m.nama.toLowerCase() === currentPetugas.toLowerCase() ||
                                    m.nama.toLowerCase() === currentClean ||
                                    (m.originalNama && m.originalNama.toLowerCase() === currentPetugas.toLowerCase())
                                );
                                return `<option value="${m.nama}" ${isSelected ? 'selected' : ''}>${m.nama}</option>`;
                            }).join('')}
                        </select>
                        ${!hasMatch && currentPetugas ? `
                            <p class="text-[10px] text-rose-500 font-medium mt-1 leading-tight">
                                <i class="fa-solid fa-triangle-exclamation mr-1"></i> Nama "<strong>${currentPetugas}</strong>" dari berkas Excel tidak cocok dengan Direktori Tim. Silakan pilih nama petugas yang sesuai dari dropdown.
                            </p>
                        ` : ''}
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Pekerjaan</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            <option ${item?.status === 'Draft' ? 'selected' : ''} value="Draft">Draft</option>
                            <option ${item?.status === 'Sedang Dikerjakan' ? 'selected' : ''} value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                            <option ${item?.status === 'Ditugaskan' || !item ? 'selected' : ''} value="Ditugaskan">Ditugaskan</option>
                            <option ${item?.status === 'Selesai' ? 'selected' : ''} value="Selesai">Selesai</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan Dokumentasi (Drive/Foto)</label>
                        <input type="url" id="tautan_dokumentasi" value="${item?.tautan_dokumentasi || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-mono" placeholder="https://drive.google.com/...">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan Konten / Publikasi</label>
                        <input type="url" id="tautan_konten" value="${item?.tautan_konten || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-mono" placeholder="https://instagram.com/p/...">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan / Catatan</label>
                    <textarea id="keterangan" rows="2" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Catatan tambahan...">${item?.keterangan || ''}</textarea>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input type="checkbox" id="hubungkan_content_planner" ${item?.hubungkan_content_planner ? 'checked' : ''} class="rounded text-indigo-600">
                        <span>Hubungkan ke Content Planner</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input type="checkbox" id="hubungkan_kalender" ${item?.hubungkan_kalender !== false ? 'checked' : ''} class="rounded text-indigo-600">
                        <span>Tampilkan di Kalender Kegiatan</span>
                    </label>
                </div>
            </div>
        `;
    } else if (type === 'ad_hoc') {
        // Ambil personil strictly dari sheet team (db.team)
        const teamList = (db.team && db.team.length > 0) ? db.team : [];
        const teamMembers = [];
        const seenTeamNames = new Set();
        teamList.forEach(m => {
            if (m && m.nama && !seenTeamNames.has(m.nama.trim())) {
                seenTeamNames.add(m.nama.trim());
                teamMembers.push({
                    nama: m.nama.trim(),
                    jabatan: m.jabatan || m.tugas || 'Tim Humas'
                });
            }
        });

        // Parse petugas yang sudah tersimpan sebelumnya
        const selectedPics = window.parseAdHocPicArray ? window.parseAdHocPicArray(item?.petugas) : [];
        // Pastikan nama historis dari data lama tetap muncul agar tidak hilang
        selectedPics.forEach(picName => {
            if (picName && !seenTeamNames.has(picName)) {
                seenTeamNames.add(picName);
                teamMembers.push({
                    nama: picName,
                    jabatan: 'Penugasan Khusus'
                });
            }
        });

        const initialJml = selectedPics.length;
        const dateVal = formatDateInput(item?.tanggal);
        const autoHari = (dateVal ? getIndonesianDayName(dateVal) : '') || item?.hari || '';

        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Penugasan <span class="text-rose-500">*</span></label>
                        <input type="date" id="tanggal" value="${dateVal}" oninput="if (window.getIndonesianDayName) { const h = window.getIndonesianDayName(this.value); if (h) document.getElementById('hari').value = h; }" onchange="if (window.getIndonesianDayName) { const h = window.getIndonesianDayName(this.value); if (h) document.getElementById('hari').value = h; }" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hari</label>
                        <select id="hari" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Hari...</option>
                            ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => `<option ${autoHari === h ? 'selected' : ''} value="${h}">${h}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Agenda / Kegiatan Ad Hoc <span class="text-rose-500">*</span></label>
                    <input type="text" id="kegiatan" value="${item?.kegiatan || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Rapat Koordinasi Wilayah Humas BPS" required>
                </div>
                <!-- Petugas PIC Multiple Select & Otomatisasi Jumlah Bertugas -->
                <div class="space-y-3 p-3.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div class="flex items-center justify-between">
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fa-solid fa-users text-indigo-600"></i>
                            <span>Petugas PIC <span class="text-rose-500">*</span></span>
                            <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold lowercase bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">(pilih 1 atau lebih)</span>
                        </label>
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="setAllAdHocPics('all')" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline cursor-pointer">Pilih Semua</button>
                            <span class="text-slate-300 dark:text-slate-600">|</span>
                            <button type="button" onclick="setAllAdHocPics('none')" class="text-[10px] font-bold text-rose-500 hover:text-rose-700 underline cursor-pointer">Reset</button>
                        </div>
                    </div>

                    <div id="adhoc-pic-pill-group" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        ${teamMembers.map(m => {
                            const isChecked = selectedPics.includes(m.nama);
                            return `
                                <button type="button"
                                        onclick="toggleAdHocPic('${encodeURIComponent(m.nama)}')"
                                        data-pic-name="${m.nama.replace(/"/g, '&quot;')}"
                                        class="adhoc-pic-pill flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all select-none cursor-pointer ${
                                            isChecked
                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 font-bold shadow-2xs'
                                            : 'bg-white dark:bg-slate-750 border-slate-205 dark:border-slate-700 text-slate-655 dark:text-slate-300 hover:border-slate-300 font-medium'
                                        }">
                                    <span class="inline-flex items-center gap-2 truncate text-left">
                                        <input type="checkbox" class="pic-checkbox rounded text-indigo-600 pointer-events-none" ${isChecked ? 'checked' : ''} tabindex="-1">
                                        <span class="truncate font-semibold">${m.nama}</span>
                                    </span>
                                    <i class="fa-solid fa-circle-check pic-check text-indigo-600 dark:text-indigo-400 text-xs shrink-0 ${isChecked ? '' : 'hidden'}"></i>
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <!-- Ringkasan Petugas PIC Terpilih -->
                    <div id="adhoc-pic-summary" class="min-h-[24px]">
                        ${selectedPics.length === 0 ? `
                            <div class="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1.5">
                                <i class="fa-solid fa-triangle-exclamation text-xs"></i>
                                <span>Belum ada petugas PIC yang dipilih. Silakan pilih minimal 1 petugas dari daftar di atas.</span>
                            </div>
                        ` : `
                            <div class="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 rounded-xl space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-[11px] font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                                        <i class="fa-solid fa-users text-indigo-600"></i> ${selectedPics.length} Petugas PIC Terpilih:
                                    </span>
                                    <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                        <i class="fa-solid fa-check-double mr-1"></i>Jml Bertugas: ${selectedPics.length} Orang
                                    </span>
                                </div>
                                <div class="flex flex-wrap items-center gap-1.5">
                                    ${selectedPics.map(n => `
                                        <span class="inline-flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 px-2.5 py-1 rounded-lg text-[11px] shadow-2xs">
                                            <i class="fa-solid fa-user-check text-[10px] text-indigo-500"></i>
                                            <span>${n}</span>
                                            <button type="button" onclick="event.stopPropagation(); window.toggleAdHocPic('${encodeURIComponent(n)}')" class="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer" title="Hapus ${n}">
                                                <i class="fa-solid fa-xmark text-[10px]"></i>
                                            </button>
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        `}
                    </div>
                    <input type="hidden" id="petugas" value="${selectedPics.join(', ')}" required>

                    <!-- JML BERTUGAS: Terisi otomatis, tidak manual -->
                    <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between">
                            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                JML BERTUGAS <span class="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">(Otomatis)</span>
                            </label>
                            <span class="text-[10px] text-slate-400">Dihitung otomatis dari banyaknya PIC terpilih</span>
                        </div>
                        <div class="mt-1 relative">
                            <input type="number" id="jumlah_bertugas" value="${initialJml}" readonly class="w-full px-4 py-2 bg-slate-100 dark:bg-slate-750 border border-slate-205 dark:border-slate-700 rounded-lg text-xs font-black text-indigo-650 dark:text-indigo-300 cursor-not-allowed">
                            <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400">Orang</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Progress</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            <option ${item?.status === 'Draft' ? 'selected' : ''} value="Draft">Draft</option>
                            <option ${item?.status === 'Sedang Dikerjakan' ? 'selected' : ''} value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                            <option ${item?.status === 'Ditugaskan' || !item ? 'selected' : ''} value="Ditugaskan">Ditugaskan</option>
                            <option ${item?.status === 'Selesai' ? 'selected' : ''} value="Selesai">Selesai</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan Dokumentasi (Drive)</label>
                        <input type="url" id="tautan_dokumentasi" value="${item?.tautan_dokumentasi || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-mono" placeholder="https://drive.google.com/...">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan / Instruksi Khusus</label>
                    <textarea id="keterangan" rows="2" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">${item?.keterangan || ''}</textarea>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input type="checkbox" id="hubungkan_content_planner" ${item?.hubungkan_content_planner ? 'checked' : ''} class="rounded text-indigo-600">
                        <span>Hubungkan ke Content Planner</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input type="checkbox" id="hubungkan_kalender" ${item?.hubungkan_kalender !== false ? 'checked' : ''} class="rounded text-indigo-600">
                        <span>Tampilkan di Kalender Kegiatan</span>
                    </label>
                </div>
            </div>
        `;
    } else if (type === 'protokoler' || type === 'mc') {
        const isProto = type === 'protokoler';
        const timeVal = item?.jam_mulai || '08.30';
        let currentHour = '08';
        let currentMinute = '30';
        const timeMatch = String(timeVal).match(/^(\d{1,2})[:.](\d{1,2})/);
        if (timeMatch) {
            currentHour = timeMatch[1].padStart(2, '0');
            currentMinute = timeMatch[2].padStart(2, '0');
        }

        let hourOptions = '';
        for (let h = 0; h < 24; h++) {
            const hStr = String(h).padStart(2, '0');
            hourOptions += `<option value="${hStr}" ${currentHour === hStr ? 'selected' : ''}>${hStr}</option>`;
        }

        let minuteOptions = '';
        for (let m = 0; m < 60; m++) {
            const mStr = String(m).padStart(2, '0');
            minuteOptions += `<option value="${mStr}" ${currentMinute === mStr ? 'selected' : ''}>${mStr}</option>`;
        }

        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Agenda / Kegiatan <span class="text-rose-500">*</span></label>
                    <input type="text" id="kegiatan" value="${item?.kegiatan || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Audiensi Pimpinan Bank Indonesia" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Acara <span class="text-rose-500">*</span></label>
                        <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" onchange="document.getElementById('bulan').value = getIndonesianMonthName(this.value)" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bulan Acara</label>
                        <input type="text" id="bulan" value="${item?.bulan || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Contoh: Juni">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Lokasi Kegiatan <span class="text-rose-500">*</span></label>
                        <input type="text" id="lokasi" value="${item?.lokasi || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Aula BPS Kalbar" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jam Mulai <span class="text-rose-500">*</span></label>
                        <div class="flex items-center gap-1.5">
                            <select id="jam_mulai_hour" class="flex-1 px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold" required>
                                ${hourOptions}
                            </select>
                            <span class="text-xs font-bold text-slate-400">:</span>
                            <select id="jam_mulai_minute" class="flex-1 px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold" required>
                                ${minuteOptions}
                            </select>
                            <span class="text-xs font-bold text-slate-400 ml-1">WIB</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenis Acara</label>
                        <select id="jenis" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.jenis === 'Internal' ? 'selected' : ''}>Internal</option>
                            <option ${item?.jenis === 'Eksternal' ? 'selected' : ''}>Eksternal</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Level Formalitas</label>
                        <select id="level" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.level === 'Super Formal' ? 'selected' : ''}>Super Formal</option>
                            <option ${item?.level === 'Formal' ? 'selected' : ''}>Formal</option>
                            <option ${item?.level === 'Semi Formal' ? 'selected' : ''}>Semi Formal</option>
                            <option ${item?.level === 'Non Formal' ? 'selected' : ''}>Non Formal</option>
                            <option ${item?.level === 'Hiburan' ? 'selected' : ''}>Hiburan</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Petugas Ditunjuk (PIC) <span class="text-rose-500">*</span></label>
                        <input type="text" id="petugas" list="pic-list-proto" value="${item?.petugas || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold" placeholder="Ketik atau pilih nama PIC..." required autocomplete="off">
                        <datalist id="pic-list-proto">
                            ${(window.getCentralizedUserList ? window.getCentralizedUserList() : db.team.map(m=>m.nama)).map(n => `<option value="${n}"></option>`).join('')}
                        </datalist>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Kegiatan</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            <option ${item?.status === 'Ditugaskan' || !item ? 'selected' : ''} value="Ditugaskan">Ditugaskan</option>
                            <option ${item?.status === 'Sedang Dikerjakan' ? 'selected' : ''} value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                            <option ${item?.status === 'Selesai' ? 'selected' : ''} value="Selesai">Selesai</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan Tambahan</label>
                    <textarea id="keterangan" rows="2" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Detail ruangan, instruksi, atau link panduan...">${item?.keterangan || ''}</textarea>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" id="hubungkan_kalender" ${item?.hubungkan_kalender !== false ? 'checked' : ''} class="rounded text-indigo-600">
                        <span>Tampilkan di Kalender Kegiatan Terintegrasi</span>
                    </label>
                </div>
            </div>
        `;
    } else if (type === 'brs_rilis') {
        const uList = window.getCentralizedUserList ? window.getCentralizedUserList() : db.team.map(m=>m.nama);
        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Kegiatan BRS <span class="text-rose-500">*</span></label>
                    <input type="text" id="judul" value="${item?.judul || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Rilis Pertumbuhan Ekonomi Triwulan I" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Rilis Resmi <span class="text-rose-500">*</span></label>
                    <input type="date" id="tanggal_rilis" value="${formatDateInput(item?.tanggal_rilis)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Poster & Infografis</label>
                        <input type="text" id="pic_poster_info" list="pic-list-brs" value="${item?.pic_poster_info || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold" placeholder="Ketik/pilih PIC...">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Dokumentasi Dalam Ruang</label>
                        <input type="text" id="pic_doc_ruang" list="pic-list-brs" value="${item?.pic_doc_ruang || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold" placeholder="Ketik/pilih PIC...">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Dokumentasi YouTube & Zoom</label>
                    <input type="text" id="pic_doc_yt_zoom" list="pic-list-brs" value="${item?.pic_doc_yt_zoom || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold" placeholder="Ketik/pilih PIC...">
                    <datalist id="pic-list-brs">
                        ${uList.map(n => `<option value="${n}"></option>`).join('')}
                    </datalist>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Highlight / Link Dokumen Ringkasan</label>
                    <input type="text" id="highlight" value="${item?.highlight || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-mono text-indigo-600 dark:text-indigo-400" placeholder="https://drive.google.com/...">
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" id="hubungkan_content_planner" ${item?.hubungkan_content_planner ? 'checked' : ''} class="rounded text-indigo-600">
                        <span>Hubungkan ke Content Planner</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" id="hubungkan_kalender" ${item?.hubungkan_kalender !== false ? 'checked' : ''} class="rounded text-indigo-600">
                        <span>Tampilkan di Kalender</span>
                    </label>
                </div>
            </div>
        `;
    } else if (type === 'hari_besar') {
        const currentKategori = item?.kategori || 'Medsos Instansi';
        const currentMedia = item?.jenis_media || item?.media || 'Instagram';
        const memberList = [];
        const seen = new Set();
        (db.team && db.team.length > 0 ? db.team : db.users).forEach(m => {
            if (m.nama && !seen.has(m.nama)) {
                seen.add(m.nama);
                memberList.push(m.nama);
            }
        });

        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-300">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Medsos <span class="text-rose-500">*</span></label>
                        <select id="kategori" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            <option ${currentKategori === 'Medsos Instansi' ? 'selected' : ''} value="Medsos Instansi">Medsos Instansi</option>
                            <option ${currentKategori === 'Medsos Pimpinan' ? 'selected' : ''} value="Medsos Pimpinan">Medsos Pimpinan</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenis Media <span class="text-rose-500">*</span></label>
                        <select id="jenis_media" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            <option ${currentMedia === 'Instagram' ? 'selected' : ''} value="Instagram">Instagram</option>
                            <option ${currentMedia === 'TikTok' ? 'selected' : ''} value="TikTok">TikTok</option>
                            <option ${currentMedia === 'YouTube' ? 'selected' : ''} value="YouTube">YouTube</option>
                            <option ${currentMedia === 'Facebook' ? 'selected' : ''} value="Facebook">Facebook</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Peringatan Hari Besar <span class="text-rose-500">*</span></label>
                    <input type="text" id="hari_besar" value="${item?.hari_besar || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold text-slate-800 dark:text-white" placeholder="Contoh: Hari Kemerdekaan Republik Indonesia" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hari / Tanggal Peringatan <span class="text-rose-500">*</span></label>
                        <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pembuat Konten (PIC)</label>
                        <input type="text" id="pembuat_konten" list="pic-list-haribesar" value="${item?.pembuat_konten || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold text-slate-800 dark:text-white" placeholder="Pilih atau ketik PIC...">
                        <datalist id="pic-list-haribesar">
                            ${memberList.map(m => `<option value="${m}"></option>`).join('')}
                        </datalist>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Pekerjaan</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            <option ${item?.status === 'Draft' ? 'selected' : ''} value="Draft">Draft</option>
                            <option ${item?.status === 'On Progress' || item?.status === 'Sedang Dikerjakan' ? 'selected' : ''} value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                            <option ${item?.status === 'Revisi' ? 'selected' : ''} value="Revisi">Revisi</option>
                            <option ${item?.status === 'Selesai' ? 'selected' : ''} value="Selesai">Selesai</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan Konten Tayang (URL)</label>
                        <input type="url" id="tautan_konten" value="${item?.tautan_konten || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-mono" placeholder="https://instagram.com/p/...">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan Cloud Storage (Google Drive / Aset)</label>
                    <input type="url" id="data_pendukung" value="${item?.data_pendukung || item?.link_cloud || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-mono text-indigo-600 dark:text-indigo-400" placeholder="https://drive.google.com/drive/folders/...">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan / Pesan Ucapan</label>
                    <textarea id="keterangan" rows="2" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Konsep ucapan atau catatan perayaan...">${item?.keterangan || ''}</textarea>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" id="hubungkan_content_planner" ${item?.hubungkan_content_planner ? 'checked' : ''} class="rounded text-indigo-600">
                        <span>Hubungkan ke Content Planner (Otomatis jadwalkan tanpa duplikasi)</span>
                    </label>
                </div>
            </div>
        `;
    } else if (type === 'team') {
        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-355">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap <span class="text-rose-500">*</span></label>
                    <input type="text" id="nama" value="${item?.nama || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Azhari" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jabatan Kehumasan <span class="text-rose-500">*</span></label>
                        <input type="text" id="jabatan" value="${item?.jabatan || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs" placeholder="Pranata Humas" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Seksi / Bidang Kerja <span class="text-rose-500">*</span></label>
                        <select id="bidang" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs" required>
                            <option value="">Pilih Bidang...</option>
                            ${db.masterData.filter(m => m.kategori === 'Bidang').map(m => `<option ${item?.bidang === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Uraian Tugas Utama Kehumasan <span class="text-rose-500">*</span></label>
                    <textarea id="tugas" rows="2.5" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs" required>${item?.tugas || ''}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">No. Kontak / Telepon <span class="text-rose-500">*</span></label>
                    <input type="text" id="kontak" value="${item?.kontak || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs font-medium" placeholder="0812XXXXXXXX" required>
                </div>
            </div>
        `;
    } else if (type === 'user_manager') {
        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-355">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap <span class="text-rose-500">*</span></label>
                    <input type="text" id="nama" value="${item?.nama || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Rian Komputer" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Username <span class="text-rose-500">*</span></label>
                        <input type="text" id="username" value="${item?.username || ''}" ${item?.username === 'admin' ? 'readonly' : ''} class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs font-medium" placeholder="username" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kata Sandi (Password)</label>
                        <input type="text" id="user_password" value="${item?.password || 'password'}" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs font-mono" placeholder="Default: password">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Seksi/Bidang Kerja</label>
                        <select id="bidang" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Bidang...</option>
                            ${db.masterData.filter(m => m.kategori === 'Bidang').map(m => `<option ${item?.bidang === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hak Akses Peran (Role)</label>
                        <select id="role" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.role === 'admin' ? 'selected' : ''} value="admin">Administrator Sistem</option>
                            <option ${item?.role === 'kepala' ? 'selected' : ''} value="kepala">Kepala BPS</option>
                            <option ${item?.role === 'koordinator' ? 'selected' : ''} value="koordinator">Koordinator Humas</option>
                            <option ${item?.role === 'tim' ? 'selected' : ''} value="tim">Tim Humas</option>
                            <option ${item?.role === 'pemohon' ? 'selected' : ''} value="pemohon">Pegawai/Pemohon</option>
                            <option ${item?.role === 'kabkot' ? 'selected' : ''} value="kabkot">BPS Kab/Kota</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'repository') {
        const uList = window.getCentralizedUserList ? window.getCentralizedUserList() : db.team.map(m=>m.nama);
        const categories = [
            'Pedoman',
            'Template',
            'Surat Masuk Humas',
            'Surat Keluar Humas',
            'Kontak Partner',
            'Dokumen lainnya'
        ];
        // Jika sedang berada di dalam folder tertentu, otomatis jadikan kategori folder tersebut sebagai pilihan default
        const activeCat = item?.kategori || (window.repoActiveFolder || 'Pedoman');
        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-300">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Dokumen / Berkas <span class="text-rose-500">*</span></label>
                    <input type="text" id="repo_nama" value="${item?.nama_dokumen || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold text-slate-800 dark:text-white" placeholder="Contoh: Pedoman Standar Kehumasan BPS 2026" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Folder <span class="text-rose-500">*</span></label>
                        <select id="repo_kategori" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                            ${categories.map(c => `<option ${activeCat === c ? 'selected' : ''} value="${c}">${c === 'Pedoman' ? 'Pedoman & Juknis' : (c === 'Template' ? 'Template Desain' : c)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Versi / Edisi</label>
                        <input type="text" id="repo_versi" value="${item?.versi || 'v1.0'}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold" placeholder="v1.0 / 2026 Q1">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Pembaruan / Terbit <span class="text-rose-500">*</span></label>
                        <input type="date" id="repo_tanggal" value="${formatDateInput(item?.tanggal || new Date().toISOString().split('T')[0])}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pemilik / PIC Dokumen</label>
                        <input type="text" id="repo_pic" list="pic-list-repo" value="${item?.pic || 'Azhari (Koordinator)'}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold" placeholder="Ketik atau pilih PIC...">
                        <datalist id="pic-list-repo">
                            ${uList.map(n => `<option value="${n}"></option>`).join('')}
                        </datalist>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan Berkas Cloud Storage (Google Drive) <span class="text-rose-500">*</span></label>
                    <input type="url" id="repo_link" value="${item?.link_cloud || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-mono text-indigo-600 dark:text-indigo-400" placeholder="https://drive.google.com/drive/folders/..." required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi Ringkas Dokumen</label>
                    <textarea id="repo_deskripsi" rows="2.5" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Uraian isi pedoman, aturan pakai, atau catatan isi berkas...">${item?.deskripsi || ''}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Dokumen</label>
                    <select id="repo_status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-bold">
                        <option ${item?.status === 'Aktif' || !item ? 'selected' : ''} value="Aktif">Aktif / Berlaku</option>
                        <option ${item?.status === 'Diarsipkan' ? 'selected' : ''} value="Diarsipkan">Diarsipkan / Versi Lama</option>
                    </select>
                </div>
            </div>
        `;
    }
    return '';
}

// Modal Form Operations
function openModal(type, item = null) {
    currentModalType = type;
    currentEditItem = item;
    isSubmitting = false;

    // Remove existing modal if any
    document.getElementById('dynamic-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'dynamic-modal';

    let title = '';
    let bodyHTML = '';

    if (item !== null) {
        // Edit mode: show manual edit form directly
        const titleMap = {
            'content': 'Edit Rencana Konten',
            'assignment': 'Edit Assignment Tugas',
            'rekap_rutin': 'Edit Kegiatan Rutin',
            'ad_hoc': 'Edit Kegiatan Ad Hoc',
            'protokoler': 'Edit Agenda Protokol',
            'mc': 'Edit Agenda MC',
            'brs_rilis': 'Edit Kegiatan BRS',
            'hari_besar': 'Edit Kalender Ucapan',
            'team': 'Edit Anggota Tim',
            'user_manager': 'Ubah Akun Pengguna',
            'repository': 'Edit Dokumen Pedoman / Template',
            'tickets': 'Edit Permintaan Layanan'
        };
        title = titleMap[type] || 'Ubah Data';
        const fields = getModalFieldsHTML(type, item);
        bodyHTML = `
            <form onsubmit="saveData(event)">
                ${fields}
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button type="submit" id="modal-submit-btn" class="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2">
                        <i class="fa-solid fa-save"></i> Simpan Data
                    </button>
                    <button type="button" onclick="closeModal()" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider">
                        Batal
                    </button>
                </div>
            </form>
        `;
    } else {
        // Add mode: show choice dialog
        const featureLabels = {
            'content': 'Rencana Konten',
            'assignment': 'Assignment Tugas',
            'rekap_rutin': 'Kegiatan Rutin',
            'ad_hoc': 'Kegiatan Ad Hoc',
            'protokoler': 'Agenda Protokol',
            'mc': 'Agenda MC',
            'brs_rilis': 'Kegiatan BRS',
            'hari_besar': 'Kalender Ucapan',
            'team': 'Anggota Tim',
            'user_manager': 'Akun Pengguna',
            'repository': 'Dokumen Pedoman / Template',
            'tickets': 'Permintaan Layanan'
        };
        const label = featureLabels[type] || 'Data Baru';
        title = `Tambah ${label}`;
        bodyHTML = `
            <div id="modal-method-container">
                <div class="space-y-6 py-4">
                    <p class="text-xs text-slate-500 dark:text-slate-400 text-center">Pilih cara bagaimana Anda ingin menambahkan data baru.</p>
                    <div class="grid grid-cols-2 gap-4">
                        <!-- Manual Card -->
                        <div onclick="renderManualForm('${type}')" class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-all mb-3.5 shadow-sm">
                                <i class="fa-solid fa-pen-to-square text-xl"></i>
                            </div>
                            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">Input Manual</h4>
                            <p class="text-[10px] text-slate-400 text-center mt-1">Isi formulir data secara langsung.</p>
                        </div>

                        <!-- Excel Card -->
                        <div onclick="renderExcelForm('${type}')" class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-all mb-3.5 shadow-sm">
                                <i class="fa-solid fa-file-excel text-xl"></i>
                            </div>
                            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">Impor Excel</h4>
                            <p class="text-[10px] text-slate-400 text-center mt-1">Unggah berkas spreadsheet Excel.</p>
                        </div>
                    </div>

                    <div class="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                        <button onclick="downloadExcelTemplate('${type}')" type="button" class="w-full btn-secondary py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                            <i class="fa-solid fa-download"></i> Unduh Template Excel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">${title}</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            ${bodyHTML}
        </div>
    `;

    document.body.appendChild(modal);

    if (type === 'ad_hoc' && typeof window.updateAdHocPicUI === 'function') {
        window.updateAdHocPicUI();
    }

    // Enforce RBAC constraints for Tim Humas role on editing
    if (item !== null && currentUser && currentUser.role === 'tim') {
        const modalInputs = modal.querySelectorAll('input, select, textarea');
        modalInputs.forEach(input => {
            const id = input.id;
            if (id !== 'status' && id !== 'progres' && id !== 'progress') {
                input.disabled = true;
                input.classList.add('bg-slate-100', 'dark:bg-slate-800', 'cursor-not-allowed', 'opacity-70');
            }
        });
    }
}

window.getModalFieldsHTML = getModalFieldsHTML;

window.renderManualForm = function(type) {
    const container = document.getElementById('modal-method-container');
    if (!container) return;

    const fields = getModalFieldsHTML(type, null);
    
    container.innerHTML = `
        <form onsubmit="saveData(event)">
            ${fields}
            <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" id="modal-submit-btn" class="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2">
                    <i class="fa-solid fa-save"></i> Simpan Data
                </button>
                <button type="button" onclick="openModal('${type}', null)" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider">
                    Kembali
                </button>
            </div>
        </form>
    `;

    if (type === 'ad_hoc' && typeof window.updateAdHocPicUI === 'function') {
        window.updateAdHocPicUI();
    }

    // Enforce Tim Humas restrictions if they click manual form
    if (currentUser && currentUser.role === 'tim') {
        const modalInputs = container.querySelectorAll('input, select, textarea');
        modalInputs.forEach(input => {
            const id = input.id;
            if (id !== 'status' && id !== 'progres' && id !== 'progress') {
                input.disabled = true;
                input.classList.add('bg-slate-100', 'dark:bg-slate-800', 'cursor-not-allowed', 'opacity-70');
            }
        });
    }
};

window.renderExcelForm = function(type) {
    const container = document.getElementById('modal-method-container');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6 py-4">
            <div class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 text-center relative group">
                <div class="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500 mb-4 shadow-xs">
                    <i class="fa-solid fa-file-arrow-up text-2xl"></i>
                </div>
                <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">Pilih Berkas Excel</h4>
                <p class="text-[10px] text-slate-400 mt-1 mb-4">Mendukung berkas format .xlsx, .xls, atau .csv</p>
                <input type="file" id="excel-file-input" onchange="handleExcelUpload(event, '${type}')" accept=".xlsx, .xls, .csv" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
                <button type="button" class="btn-primary py-2 px-4 text-[10px] font-bold uppercase tracking-wider pointer-events-none">
                    Pilih File
                </button>
            </div>
            
            <div class="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button onclick="downloadExcelTemplate('${type}')" type="button" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                    <i class="fa-solid fa-download"></i> Unduh Template
                </button>
                <button type="button" onclick="openModal('${type}', null)" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider">
                    Kembali
                </button>
            </div>
        </div>
    `;
};

window.downloadExcelTemplate = function(type) {
    const defaultPicName = (db.team && db.team[0] && db.team[0].nama) ? db.team[0].nama : 'Azhari';
    const schemas = {
        'content': ["judul", "jenis_konten", "media_post", "assignTo", "tanggal_posting", "jam_posting", "konsep", "status", "progres"],
        'rekap_rutin': [
            "tanggal", "hari", "rubrikasi", "sifat_kegiatan", "kegiatan", "petugas",
            "status", "tautan_dokumentasi", "tautan_konten", "keterangan",
            "hubungkan_content_planner", "hubungkan_kalender"
        ],
        'ad_hoc': ["tanggal", "hari", "kegiatan", "jumlah_bertugas", "petugas", "keterangan", "status"],
        'protokoler': ["tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
        'mc': ["tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
        'brs_rilis': ["tanggal_rilis", "judul", "pic_poster_info", "pic_doc_ruang", "pic_doc_yt_zoom", "highlight"],
        'hari_besar': ["tanggal", "hari_besar", "data_pendukung", "pembuat_konten", "status"],
        'team': ["nama", "jabatan", "bidang", "tugas", "kontak"],
        'user_manager': ["nama", "username", "role", "bidang"],
        'assignment': ["tugas", "deskripsi", "prioritas", "status", "tanggal_penugasan", "deadline", "progres", "lampiran", "assigned_to"]
    };

    const examples = {
        'content': ["Infografis Pertumbuhan Ekonomi Kalbar", "Carousel", "Instagram", "Azhari", "2026-06-25", "09:00", "5 slide carousel data ekonomi", "Draft", 0],
        'rekap_rutin': [
            "2026-06-24", "Rabu", "#haribesar", "Rutin", "Publikasi Hari Besar Nasional",
            defaultPicName, "Selesai",
            "https://drive.google.com/drive/folders/dokumentasi-kegiatan",
            "https://instagram.com/p/humas-bps-kalbar",
            "Publikasi tepat waktu", "YA", "YA"
        ],
        'ad_hoc': ["2026-06-24", "Rabu", "Peliputan Kunjungan Kerja Gubernur", 2, "Dian, Siska", "Mendokumentasikan acara di pendopo", "Selesai"],
        'protokoler': ["2026-06-24", "Juni", "Audiensi BPS dengan Kepala Dinas Kominfo", "Kantor Dinas Kominfo", "09.00", "Eksternal", "Formal", "Dian", "Membahas integrasi portal satu data", "Ditugaskan"],
        'mc': ["2026-06-24", "Juni", "Upacara Hari Lahir Pancasila", "Halaman Kantor Gubernur", "07.30", "Eksternal", "Super Formal", "Siska", "Membawa acara upacara bendera", "Ditugaskan"],
        'brs_rilis': ["2026-07-01", "Rilis Indeks Pembangunan Manusia 2026", "Rian", "Siska", "Dian", "IPM Kalbar meningkat pesat"],
        'hari_besar': ["2026-08-17", "Hari Kemerdekaan Republik Indonesia", "Link materi desain", "Azhari", "Draft"],
        'team': ["Azhari", "Pranata Komputer", "IPDS", "Penanggung Jawab Website BPS Kalbar", "08123456789"],
        'user_manager': ["Dian Pratama", "dian_pratama", "tim", "IPDS"],
        'assignment': ["Membuat Naskah BRS Inflasi", "Tulis draf rilis untuk persetujuan kepala", "Tinggi", "Dalam Proses", "2026-06-24", "2026-06-30", 30, "link_drive", "Rian"]
    };

    const guidance = {
        'content': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["judul", "Wajib. Judul rencana konten.", "Bebas"],
            ["jenis_konten", "Wajib. Jenis format konten.", "Video, Carousel, Reels, Single Image"],
            ["media_post", "Wajib. Platform media penayangan.", "Instagram, TikTok, YouTube, Facebook"],
            ["assignTo", "Wajib. Nama petugas penanggung jawab (PIC) - Kolom I.", "Bebas (Nama anggota tim)"],
            ["tanggal_posting", "Wajib. Tanggal penayangan konten (Format: YYYY-MM-DD).", "Contoh: 2026-06-25"],
            ["jam_posting", "Opsional. Jam penayangan konten (Format: HH:MM).", "Contoh: 09:00"],
            ["konsep", "Opsional. Konsep atau deskripsi konten.", "Bebas"],
            ["status", "Opsional. Status pengerjaan.", "Draft, In Progress, Done, Posted"],
            ["progres", "Opsional. Angka kemajuan (0-100).", "0 s/d 100"]
        ],
        'rekap_rutin': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["tanggal", "Wajib. Tanggal kegiatan (Format: YYYY-MM-DD).", "Contoh: 2026-06-24"],
            ["hari", "Opsional. Nama hari pelaksanaan.", "Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu"],
            ["rubrikasi", "Wajib. Kategori rubrikasi kegiatan (Pilihan sama dengan filter).", "#SE2026, #DTSEN, #haribesar/daerah/nasional/internasional, #rilisbrs, #infografisbrs, #rilispublikasi, #SElasaSEnsus, #promosistatistik, #rripontianak, #zonaintegritas, #SKD, #ddakalbar, KLIK, Laporan"],
            ["sifat_kegiatan", "Opsional. Sifat kegiatan.", "Rutin, Ad Hoc"],
            ["kegiatan", "Wajib. Nama atau judul kegiatan rutin.", "Bebas"],
            ["petugas", "Wajib. Nama Petugas PIC sesuai Direktori Tim.", "Sesuai nama pada Direktori Tim (Contoh: " + defaultPicName + ")"],
            ["status", "Opsional. Status pelaksanaan pekerjaan.", "Draft, Sedang Dikerjakan, Ditugaskan, Selesai"],
            ["tautan_dokumentasi", "Opsional. Tautan Google Drive dokumentasi / foto kegiatan.", "Contoh: https://drive.google.com/..."],
            ["tautan_konten", "Opsional. Tautan postingan konten publikasi/medsos.", "Contoh: https://instagram.com/p/..."],
            ["keterangan", "Opsional. Catatan atau keterangan tambahan.", "Bebas"],
            ["hubungkan_content_planner", "Opsional. Sinkronisasi ke modul Content Planner.", "YA / TIDAK"],
            ["hubungkan_kalender", "Opsional. Tampilkan pada Kalender Kegiatan.", "YA / TIDAK"]
        ],
        'ad_hoc': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["tanggal", "Wajib. Tanggal kegiatan (Format: YYYY-MM-DD).", "Contoh: 2026-06-24"],
            ["hari", "Opsional. Nama hari pelaksanaan.", "Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu"],
            ["kegiatan", "Wajib. Deskripsi kegiatan ad hoc.", "Bebas"],
            ["jumlah_bertugas", "Opsional. Jumlah orang yang bertugas (Angka).", "Contoh: 2"],
            ["petugas", "Wajib. Nama-nama petugas pelaksana.", "Bebas (Gunakan koma untuk multi-person)"],
            ["keterangan", "Opsional. Catatan atau deskripsi tambahan.", "Bebas"],
            ["status", "Opsional. Status pelaksanaan.", "Ditugaskan, Selesai"]
        ],
        'protokoler': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["tanggal", "Wajib. Tanggal agenda (Format: YYYY-MM-DD).", "Contoh: 2026-06-24"],
            ["bulan", "Opsional. Nama bulan pelaksanaan.", "Contoh: Juni"],
            ["kegiatan", "Wajib. Nama agenda/kegiatan keprotokolan.", "Bebas"],
            ["lokasi", "Wajib. Lokasi tempat kegiatan.", "Bebas"],
            ["jam_mulai", "Wajib. Waktu mulai (Format 24 Jam: HH.MM).", "Contoh: 09.00 atau 14.30"],
            ["jenis", "Opsional. Jenis keprotokolan.", "Internal, Eksternal"],
            ["level", "Opsional. Level formalitas acara.", "Super Formal, Formal, Semi Formal, Non Formal"],
            ["petugas", "Opsional. Nama petugas penanggung jawab.", "Bebas"],
            ["keterangan", "Opsional. Keterangan tambahan.", "Bebas"],
            ["status", "Opsional. Status agenda.", "Ditugaskan, Selesai"]
        ],
        'mc': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["tanggal", "Wajib. Tanggal agenda (Format: YYYY-MM-DD).", "Contoh: 2026-06-24"],
            ["bulan", "Opsional. Nama bulan pelaksanaan.", "Contoh: Juni"],
            ["kegiatan", "Wajib. Nama agenda/kegiatan MC.", "Bebas"],
            ["lokasi", "Wajib. Lokasi tempat kegiatan.", "Bebas"],
            ["jam_mulai", "Wajib. Waktu mulai (Format 24 Jam: HH.MM).", "Contoh: 09.00 atau 14.30"],
            ["jenis", "Opsional. Jenis acara.", "Internal, Eksternal"],
            ["level", "Opsional. Level formalitas acara.", "Super Formal, Formal, Semi Formal, Non Formal"],
            ["petugas", "Opsional. Nama petugas MC.", "Bebas"],
            ["keterangan", "Opsional. Keterangan tambahan.", "Bebas"],
            ["status", "Opsional. Status agenda.", "Ditugaskan, Selesai"]
        ],
        'brs_rilis': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["tanggal_rilis", "Wajib. Tanggal rilis BRS (Format: YYYY-MM-DD).", "Contoh: 2026-07-01"],
            ["judul", "Wajib. Judul materi rilis BRS.", "Bebas"],
            ["pic_poster_info", "Opsional. Penanggung jawab poster info.", "Bebas"],
            ["pic_doc_ruang", "Opsional. Penanggung jawab dokumentasi ruang.", "Bebas"],
            ["pic_doc_yt_zoom", "Opsional. Penanggung jawab YouTube / Zoom.", "Bebas"],
            ["highlight", "Opsional. Poin penting/highlight rilis.", "Bebas"]
        ],
        'hari_besar': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["tanggal", "Wajib. Tanggal peringatan (Format: YYYY-MM-DD).", "Contoh: 2026-08-17"],
            ["hari_besar", "Wajib. Nama hari besar/nasional/internasional.", "Bebas"],
            ["data_pendukung", "Opsional. Link materi pendukung atau narasi.", "Bebas"],
            ["pembuat_konten", "Opsional. Nama pembuat konten grafis.", "Bebas"],
            ["status", "Opsional. Status pengerjaan.", "Rencana, Draft, Posting, Selesai"]
        ],
        'team': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["nama", "Wajib. Nama lengkap anggota tim.", "Bebas"],
            ["jabatan", "Wajib. Jabatan fungsional/struktural.", "Bebas"],
            ["bidang", "Opsional. Seksi/bidang asal.", "Bebas"],
            ["tugas", "Wajib. Deskripsi tugas di tim humas.", "Bebas"],
            ["kontak", "Wajib. Nomor HP/WhatsApp aktif.", "Contoh: 08123456789"]
        ],
        'user_manager': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["nama", "Wajib. Nama lengkap user.", "Bebas"],
            ["username", "Wajib. Username untuk login (Unik, huruf kecil, tanpa spasi).", "Contoh: dian_pratama"],
            ["role", "Wajib. Peran hak akses sistem.", "admin, kepala, koordinator, tim, pemohon"],
            ["bidang", "Opsional. Seksi/bidang asal user.", "Bebas"]
        ],
        'assignment': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["tugas", "Wajib. Nama tugas yang didelegasikan.", "Bebas"],
            ["deskripsi", "Wajib. Rincian deskripsi instruksi tugas.", "Bebas"],
            ["prioritas", "Opsional. Tingkat prioritas tugas.", "Tinggi, Sedang, Rendah"],
            ["status", "Opsional. Status pengerjaan tugas.", "Belum Dimulai, Dalam Proses, Selesai, Tertunda"],
            ["tanggal_penugasan", "Wajib. Tanggal penugasan (Format: YYYY-MM-DD).", "Contoh: 2026-06-24"],
            ["deadline", "Wajib. Batas waktu pengerjaan (Format: YYYY-MM-DD).", "Contoh: 2026-06-30"],
            ["progres", "Opsional. Angka kemajuan tugas (0-100).", "0 s/d 100"],
            ["lampiran", "Opsional. Link materi pendukung / instruksi.", "Bebas"],
            ["assigned_to", "Wajib. Nama anggota tim pelaksana tugas.", "Bebas (Sesuai nama tim)"]
        ]
    };

    const headers = schemas[type];
    if (!headers) return;

    try {
        if (typeof XLSX === 'undefined') {
            showToast('Library parsing Excel sedang memuat. Coba lagi dalam 1 detik.', 'warning');
            return;
        }
        
        const wsTemplate = XLSX.utils.aoa_to_sheet([headers, examples[type]]);
        const wsPanduan = XLSX.utils.aoa_to_sheet(guidance[type]);
        const wb = XLSX.utils.book_new();
        
        XLSX.utils.book_append_sheet(wb, wsTemplate, "Template");
        XLSX.utils.book_append_sheet(wb, wsPanduan, "Panduan");
        
        XLSX.writeFile(wb, `template_${type}.xlsx`);
        showToast('Template Excel berhasil diunduh!');
    } catch (e) {
        console.error('Download error:', e);
        showToast('Gagal mengunduh template.', 'error');
    }
};

// =====================================================
// EXCEL IMPORT PROGRESS STATUS BAR POP-UP
// =====================================================
function showImportStatusBar(fileName, typeLabel, totalRows = 0) {
    const existing = document.getElementById('excel-import-status-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'excel-import-status-modal';
    overlay.className = 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in';
    overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 w-full max-w-md animate-scale-up">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <i class="fa-solid fa-file-excel text-lg"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-black text-slate-800 dark:text-white truncate">Import Berkas Excel</h3>
                    <p class="text-[11px] text-slate-400 dark:text-slate-400 truncate">${fileName} • <span class="font-semibold text-slate-600 dark:text-slate-300">${typeLabel}</span></p>
                </div>
                <span id="import-status-badge" class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                    Memproses
                </span>
            </div>

            <!-- Progress Bar Container -->
            <div class="space-y-2 mb-4">
                <div class="flex justify-between items-center text-xs">
                    <span id="import-status-phase" class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <i class="fa-solid fa-circle-notch fa-spin text-indigo-500 text-xs"></i>
                        <span>Membaca data berkas...</span>
                    </span>
                    <span id="import-status-percentage" class="font-black text-indigo-600 dark:text-indigo-400 text-sm">0%</span>
                </div>
                
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-600">
                    <div id="import-status-progress-bar" class="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-200" style="width: 0%"></div>
                </div>

                <div class="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold pt-0.5">
                    <span id="import-status-detail">Memulai parsing sheet Excel...</span>
                    <span id="import-status-count">0 / ${totalRows || '...'} baris</span>
                </div>
            </div>

            <!-- Notice box -->
            <div id="import-status-alert" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-150 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                <p class="flex items-center gap-1.5">
                    <i class="fa-solid fa-cloud-arrow-up text-indigo-500"></i>
                    <span>Sedang memvalidasi dan menyinkronkan data ke sistem...</span>
                </p>
            </div>

            <!-- Action buttons (revealed on completion or error) -->
            <div id="import-status-actions" class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 hidden">
                <button type="button" onclick="closeImportStatusBar(true)" class="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                    <i class="fa-solid fa-check"></i> Selesai & Tutup
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function updateImportStatusBar(progressPct, phaseText, detailText, currentCount, totalRows, isDone = false, errorMsg = '') {
    const bar = document.getElementById('import-status-progress-bar');
    const pct = document.getElementById('import-status-percentage');
    const phase = document.getElementById('import-status-phase');
    const detail = document.getElementById('import-status-detail');
    const count = document.getElementById('import-status-count');
    const badge = document.getElementById('import-status-badge');
    const alertBox = document.getElementById('import-status-alert');
    const actions = document.getElementById('import-status-actions');

    const roundedPct = Math.min(100, Math.max(0, Math.round(progressPct)));

    if (bar) bar.style.width = `${roundedPct}%`;
    if (pct) pct.textContent = `${roundedPct}%`;
    if (phase && phaseText) phase.innerHTML = phaseText;
    if (detail && detailText) detail.textContent = detailText;
    if (count && currentCount !== undefined) count.textContent = `${currentCount} / ${totalRows} baris`;

    if (errorMsg) {
        if (bar) bar.className = 'h-full bg-rose-500 rounded-full transition-all duration-200';
        if (pct) { pct.textContent = '!'; pct.className = 'font-black text-rose-500 text-sm'; }
        if (badge) {
            badge.className = 'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0';
            badge.textContent = 'Gagal';
        }
        if (alertBox) {
            alertBox.className = 'p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300';
            alertBox.innerHTML = `<p class="flex items-start gap-2"><i class="fa-solid fa-circle-xmark text-rose-500 mt-0.5 shrink-0"></i><span>${errorMsg}</span></p>`;
        }
        if (actions) actions.classList.remove('hidden');
    } else if (isDone) {
        if (bar) bar.className = 'h-full bg-emerald-500 rounded-full transition-all duration-200';
        if (pct) { pct.textContent = '100%'; pct.className = 'font-black text-emerald-600 dark:text-emerald-400 text-sm'; }
        if (badge) {
            badge.className = 'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0';
            badge.textContent = 'Sukses';
        }
        if (alertBox) {
            alertBox.className = 'p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300';
            alertBox.innerHTML = `
                <p class="flex items-center gap-2 font-bold">
                    <i class="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                    <span>Import berhasil! Seluruh ${currentCount} data berhasil disimpan ke sistem.</span>
                </p>
            `;
        }
        if (actions) actions.classList.remove('hidden');
    }
}

function closeImportStatusBar(shouldReload = false) {
    const modal = document.getElementById('excel-import-status-modal');
    if (modal) modal.remove();
    if (shouldReload) {
        closeModal();
        if (typeof router === 'function') router(currentState);
    }
}
window.closeImportStatusBar = closeImportStatusBar;

window.handleExcelUpload = function(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        showToast('Library parsing Excel belum terpasang/gagal dimuat.', 'error');
        return;
    }

    const typeNames = {
        'content': 'Rencana Konten',
        'rekap_rutin': 'Kegiatan Rutin',
        'ad_hoc': 'Kegiatan Ad Hoc',
        'protokoler': 'Agenda Protokol',
        'mc': 'Agenda MC',
        'brs_rilis': 'Kegiatan BRS',
        'hari_besar': 'Kalender Ucapan',
        'team': 'Direktori Tim',
        'user_manager': 'Pengguna',
        'assignment': 'Penugasan Tim'
    };
    const typeLabel = typeNames[type] || 'Data ' + type;

    // Tampilkan pop-up status bar import
    showImportStatusBar(file.name, typeLabel, 0);

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            updateImportStatusBar(10, '<i class="fa-solid fa-spinner fa-spin text-indigo-500 text-xs"></i> Membaca sheet Excel...', 'Memuat struktur berkas...', 0, 0);
            await new Promise(r => setTimeout(r, 80));

            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

            if (!jsonData || jsonData.length === 0) {
                updateImportStatusBar(0, 'Berkas Kosong', '', 0, 0, false, 'Berkas Excel kosong atau format kolom tidak sesuai.');
                showToast('Berkas Excel kosong atau format kolom salah.', 'error');
                return;
            }

            const totalRows = jsonData.length;
            updateImportStatusBar(20, '<i class="fa-solid fa-spinner fa-spin text-indigo-500 text-xs"></i> Memvalidasi baris data...', `Terdeteksi ${totalRows} baris data`, 0, totalRows);
            await new Promise(r => setTimeout(r, 100));

            const sheetMapping = {
                'content': 'content_planner',
                'rekap_rutin': 'rekap_rutin',
                'ad_hoc': 'ad_hoc_2026',
                'protokoler': 'protokoler',
                'mc': 'mc',
                'brs_rilis': 'brs_rilis',
                'hari_besar': 'hari_besar',
                'team': 'team',
                'user_manager': 'users',
                'assignment': 'assignments'
            };
            const sheetName = sheetMapping[type];
            const varName = SHEET_TO_VAR[sheetName] || type;

            let successCount = 0;
            const schemas = {
                'content': ["judul", "jenis_konten", "media_post", "assignTo", "assignedTo", "tanggal_posting", "jam_posting", "konsep", "status", "progres", "postType", "jadwal"],
                'rekap_rutin': [
                    "tanggal", "hari", "rubrikasi", "sifat_kegiatan", "kegiatan", "petugas",
                    "status", "tautan_dokumentasi", "tautan_konten", "keterangan",
                    "hubungkan_content_planner", "hubungkan_kalender"
                ],
                'ad_hoc': ["tanggal", "hari", "kegiatan", "jumlah_bertugas", "petugas", "keterangan", "status"],
                'protokoler': ["tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
                'mc': ["tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
                'brs_rilis': ["tanggal_rilis", "judul", "pic_poster_info", "pic_doc_ruang", "pic_doc_yt_zoom", "highlight"],
                'hari_besar': ["tanggal", "hari_besar", "data_pendukung", "pembuat_konten", "status"],
                'team': ["nama", "jabatan", "bidang", "tugas", "kontak"],
                'user_manager': ["nama", "username", "role", "bidang"],
                'assignment': ["tugas", "deskripsi", "prioritas", "status", "tanggal_penugasan", "deadline", "progres", "lampiran", "assigned_to"]
            };
            const fields = schemas[type];

            for (let i = 0; i < totalRows; i++) {
                const row = jsonData[i];
                const item = {};
                fields.forEach(f => {
                    item[f] = row[f] !== undefined ? row[f] : "";
                });

                if (type === 'ad_hoc') {
                    if (!item.hari && item.tanggal) {
                        item.hari = getIndonesianDayName(item.tanggal);
                    }
                    if (item.jumlah_bertugas !== "") {
                        item.jumlah_bertugas = Number(item.jumlah_bertugas);
                    }
                }
                if ((type === 'content' || type === 'assignment') && item.progres !== "") {
                    item.progres = Number(item.progres);
                }
                if (type === 'rekap_rutin') {
                    if (!item.hari && item.tanggal) {
                        item.hari = getIndonesianDayName(item.tanggal);
                    }
                    item.sifat_kegiatan = row.sifat_kegiatan || 'Rutin';
                    item.rubrikasi = row.rubrikasi || '#haribesar/daerah/nasional/internasional';
                    item.status = row.status || 'Ditugaskan';
                    item.tautan_dokumentasi = row.tautan_dokumentasi || '';
                    item.tautan_konten = row.tautan_konten || '';
                    item.keterangan = row.keterangan || '';
                    const parseBool = (v, defVal) => {
                        if (v === undefined || v === null || v === '') return defVal;
                        const s = String(v).trim().toLowerCase();
                        return s === 'ya' || s === 'yes' || s === 'true' || s === '1' || s === 'y';
                    };
                    item.hubungkan_content_planner = parseBool(row.hubungkan_content_planner, false);
                    item.hubungkan_kalender = parseBool(row.hubungkan_kalender, true);
                }
                if (type === 'content') {
                    const pic = row.assignTo || row['assign To'] || row.assignedTo || row.pic || row.PIC || '';
                    item.assignedTo = pic;
                    item.assignTo = pic;
                    item['assign To'] = pic;
                    item.pic = pic;

                    if (row.jenis_konten) item.jenis_konten = row.jenis_konten;
                    if (row.postType && !item.jenis_konten) item.jenis_konten = row.postType;
                    item.postType = item.jenis_konten || 'Carousel';

                    const media = row.media_post || row.media || 'Instagram';
                    item.media_post = media;
                    item.media = media;

                    if (row.tanggal_posting) item.tanggal_posting = row.tanggal_posting;
                    if (row.jadwal && !item.tanggal_posting) item.tanggal_posting = row.jadwal;
                    item.jadwal = item.tanggal_posting;
                    if (row.jam_posting) item.jam_posting = row.jam_posting;

                    if (item.status === 'Posted') {
                        item.progres = 100;
                    } else if (item.status === 'Done') {
                        if (item.progres === "" || item.progres === undefined || isNaN(item.progres) || item.progres === 0 || item.progres < 90) {
                            item.progres = 90;
                        }
                    }
                }

                // Generate ID
                const maxId = db[varName].reduce((max, it) => Math.max(max, Number(it.id) || 0), 0);
                item.id = maxId + 1;

                if (type === 'user_manager') {
                    item.password = 'password'; 
                }

                // Simpan local & server
                await sendDataToServer('add', sheetName, item);

                // Otomatis sinkronisasi tugas Content Planner yang selesai ke Rekap Rutin
                if (type === 'content' && typeof window.syncCompletedContentToRekapRutin === 'function') {
                    window.syncCompletedContentToRekapRutin(db, item, true);
                }

                successCount++;

                // Update status bar progress
                const currentPct = 20 + Math.round(((i + 1) / totalRows) * 75);
                const itemLabel = item.kegiatan || item.judul || item.tugas || item.nama || item.hari_besar || `Baris ${i + 1}`;
                updateImportStatusBar(
                    currentPct,
                    `<i class="fa-solid fa-cloud-arrow-up text-indigo-500 text-xs"></i> Menyimpan baris ${i + 1} dari ${totalRows}...`,
                    `Memproses: ${String(itemLabel).substring(0, 35)}`,
                    i + 1,
                    totalRows
                );
                // Beri jeda sejenak untuk rendering UI
                if (totalRows > 1) {
                    await new Promise(r => setTimeout(r, 15));
                }
            }

            updateImportStatusBar(100, '<i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i> Selesai!', 'Seluruh data berhasil diimpor.', successCount, totalRows, true);
            showToast(`Berhasil mengimpor ${successCount} data dari Excel!`);

            // Auto-close setelah 1.5 detik jika tidak ditutup manual
            setTimeout(() => {
                const modal = document.getElementById('excel-import-status-modal');
                if (modal) {
                    closeImportStatusBar(true);
                }
            }, 1500);

        } catch (error) {
            console.error('Import error:', error);
            updateImportStatusBar(0, 'Gagal Memproses Berkas', '', 0, 0, false, error.message || 'Gagal memproses file Excel. Pastikan format kolom sesuai template.');
            showToast('Gagal memproses file Excel. Pastikan format kolom sesuai template.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
};



// Helper untuk mendeteksi apakah pengguna sedang aktif mengedit/menginput atau membuka formulir/modal
window.isUserEditingOrInputting = function() {
    // 1. Cek apakah ada modal yang sedang terbuka / aktif di layar
    if (document.getElementById('dynamic-modal')) return true;
    if (document.getElementById('excel-import-status-modal')) return true;
    if (document.getElementById('custom-confirm-modal')) return true;
    if (document.getElementById('scraper-progress-modal')) return true;
    const modalEl = document.querySelector('.modal:not(.hidden), [id$="-modal"]:not(.hidden)');
    if (modalEl && modalEl.offsetParent !== null) return true;

    // 2. Cek apakah pengguna sedang memfokuskan kursor pada input, textarea, atau select
    const activeEl = document.activeElement;
    if (activeEl) {
        const tag = activeEl.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            return true;
        }
        if (activeEl.isContentEditable) {
            return true;
        }
    }

    // 3. Status submit form sedang berjalan
    if (typeof isSubmitting !== 'undefined' && isSubmitting) return true;

    return false;
};

function closeModal() {
    const modal = document.getElementById('dynamic-modal');
    if (modal) modal.remove();
    currentEditItem = null;
    currentModalType = null;
    isSubmitting = false;

    // Jika ada pembaruan view yang ditunda saat proses input/edit berlangsung, jalankan sekarang secara aman
    if (window._pendingViewRefresh && typeof router === 'function' && typeof currentState !== 'undefined') {
        window._pendingViewRefresh = false;
        router(currentState);
    }
}

// Form Validation helper
function validateFormInput(type, data) {
    if (type === 'content' && (!data.judul || !data.jadwal || !(data.assignTo || data.assignedTo || data['assign To']))) return 'Kolom bertanda bintang (*) wajib diisi (Judul, PIC, Tanggal Posting).';
    if (type === 'rekap_rutin' && (!data.tanggal || !data.kegiatan || !data.rubrikasi)) return 'Kolom bertanda bintang (*) wajib diisi (termasuk minimal 1 Rubrikasi).';
    if (type === 'ad_hoc' && (!data.tanggal || !data.kegiatan || !data.petugas)) return 'Kolom bertanda bintang (*) wajib diisi (Termasuk minimal 1 Petugas PIC).';
    if (type === 'protokoler' && (!data.kegiatan || !data.tanggal || !data.lokasi || !data.jam_mulai)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'mc' && (!data.kegiatan || !data.tanggal || !data.lokasi || !data.jam_mulai)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'brs_rilis' && (!data.judul || !data.tanggal_rilis)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'hari_besar' && (!data.hari_besar || !data.tanggal)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'team' && (!data.nama || !data.jabatan || !data.tugas || !data.kontak)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'user_manager' && (!data.nama || !data.username)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'assignment' && (!data.tugas || !data.deskripsi || !data.tanggal_penugasan || !data.deadline || !data.assigned_to)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'repository' && (!data.nama_dokumen || !data.link_cloud)) return 'Nama Dokumen dan Tautan Cloud Storage wajib diisi.';
    return null;
}

function setSubmitLoading(loading) {
    isSubmitting = loading;
    const btn = document.getElementById('modal-submit-btn');
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan Data`;
    }
}

// Global Save Handler
async function saveData(event) {
    event.preventDefault();
    if (isSubmitting) return;

    // Collect values dynamically based on currentModalType
    const item = currentEditItem ? { ...currentEditItem } : {};

    if (currentModalType === 'content') {
        item.judul = document.getElementById('judul').value;
        item.jenis_konten = document.getElementById('jenis_konten')?.value || 'Carousel';
        item.postType = item.jenis_konten;
        item.media_post = document.getElementById('media_post')?.value || 'Instagram';
        item.media = item.media_post;

        // Simpan PIC ke semua variasi key: assignTo (Kolom I), assignedTo, assign To, pic
        const picVal = document.getElementById('assignedTo')?.value || document.getElementById('assignTo')?.value || '';
        item.assignedTo = picVal;
        item.assignTo = picVal;
        item['assign To'] = picVal;
        item.pic = picVal;

        item.jadwal = document.getElementById('jadwal').value;
        item.tanggal_posting = item.jadwal;
        const jamH = document.getElementById('jam_posting_hour')?.value;
        const jamM = document.getElementById('jam_posting_minute')?.value;
        if (jamH && jamM) {
            item.jam_posting = `${jamH}:${jamM}`;
        } else {
            item.jam_posting = document.getElementById('jam_posting')?.value || '09:00';
        }
        item.progres = Number(document.getElementById('progres')?.value || 0);
        item.status = document.getElementById('status')?.value || 'Draft';
        item.konsep = document.getElementById('konsep')?.value || '';

        const cloud = document.getElementById('tautan_cloud')?.value || '';
        item.tautan_cloud = cloud;
        item.link_cloud = cloud;
        item.link_konten = cloud;

        // Aturan Progres Otomatis Content Planner:
        if (item.status === 'Posted') {
            item.progres = 100;
        } else if (item.status === 'Done') {
            if (item.progres === undefined || isNaN(item.progres) || item.progres === 0 || item.progres < 90) {
                item.progres = 90;
            }
        }
    } else if (currentModalType === 'assignment') {
        item.tugas = document.getElementById('tugas').value;
        item.deskripsi = document.getElementById('deskripsi').value;
        item.rubrikasi = document.getElementById('assignment_rubrikasi')?.value || '';
        item.prioritas = document.getElementById('prioritas').value;
        item.status = document.getElementById('status').value;
        item.tanggal_penugasan = document.getElementById('tanggal_penugasan').value;
        item.deadline = document.getElementById('deadline').value;
        item.progres = Number(document.getElementById('progres').value);
        item.assigned_to = document.getElementById('assigned_to').value;
        item.lampiran = document.getElementById('lampiran').value;
    } else if (currentModalType === 'rekap_rutin') {
        item.tanggal = document.getElementById('tanggal').value;
        const autoHariFromDate = item.tanggal && typeof window.getIndonesianDayName === 'function' ? window.getIndonesianDayName(item.tanggal) : '';
        item.hari = document.getElementById('hari')?.value || autoHariFromDate || '';
        const rubrikVal = document.getElementById('rubrikasi')?.value || '';
        if (!rubrikVal || rubrikVal.trim() === '') {
            if (typeof showToast === 'function') {
                showToast('Silakan pilih minimal 1 rubrikasi kegiatan!', 'warning');
            }
            return;
        }
        item.rubrikasi = rubrikVal;
        item.kegiatan = document.getElementById('kegiatan').value;
        item.sifat_kegiatan = document.getElementById('sifat_kegiatan')?.value || 'Rutin';
        item.petugas = document.getElementById('petugas').value;
        item.status = document.getElementById('status').value;
        item.tautan_dokumentasi = document.getElementById('tautan_dokumentasi')?.value || '';
        item.tautan_konten = document.getElementById('tautan_konten')?.value || '';
        item.keterangan = document.getElementById('keterangan')?.value || '';
        item.hubungkan_content_planner = document.getElementById('hubungkan_content_planner')?.checked || false;
        item.hubungkan_kalender = document.getElementById('hubungkan_kalender')?.checked !== false;
    } else if (currentModalType === 'ad_hoc') {
        item.tanggal = document.getElementById('tanggal').value;
        const autoHariFromDate = item.tanggal && typeof window.getIndonesianDayName === 'function' ? window.getIndonesianDayName(item.tanggal) : '';
        item.hari = document.getElementById('hari')?.value || autoHariFromDate || '';
        item.kegiatan = document.getElementById('kegiatan').value;
        const rawPetugas = document.getElementById('petugas').value;
        const picArray = typeof window.parseAdHocPicArray === 'function' 
            ? window.parseAdHocPicArray(rawPetugas) 
            : rawPetugas.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
        item.petugas = picArray.join(', ');
        // Jumlah bertugas wajib terisi otomatis sesuai banyaknya PIC yang dipilih
        item.jumlah_bertugas = picArray.length;
        item.keterangan = document.getElementById('keterangan').value;
        item.status = document.getElementById('status').value;
        item.tautan_dokumentasi = document.getElementById('tautan_dokumentasi')?.value || '';
        item.hubungkan_content_planner = document.getElementById('hubungkan_content_planner')?.checked || false;
        item.hubungkan_kalender = document.getElementById('hubungkan_kalender')?.checked !== false;
    } else if (currentModalType === 'protokoler' || currentModalType === 'mc') {
        item.kegiatan = document.getElementById('kegiatan').value;
        item.tanggal = document.getElementById('tanggal').value;
        item.bulan = document.getElementById('bulan').value;
        item.lokasi = document.getElementById('lokasi').value;
        const hour = document.getElementById('jam_mulai_hour')?.value || '08';
        const minute = document.getElementById('jam_mulai_minute')?.value || '30';
        item.jam_mulai = `${hour}.${minute}`;
        item.jenis = document.getElementById('jenis').value;
        item.level = document.getElementById('level').value;
        item.petugas = document.getElementById('petugas').value;
        item.status = document.getElementById('status').value;
        item.keterangan = document.getElementById('keterangan').value;
        item.hubungkan_kalender = document.getElementById('hubungkan_kalender')?.checked !== false;
    } else if (currentModalType === 'brs_rilis') {
        item.judul = document.getElementById('judul').value;
        item.kegiatan = item.judul; // dual-key compatibility untuk Google Sheets
        item.tanggal_rilis = document.getElementById('tanggal_rilis').value;
        item.tanggal = item.tanggal_rilis; // dual-key compatibility untuk Google Sheets
        item.jadwal = item.tanggal_rilis;
        item.pic_poster_info = document.getElementById('pic_poster_info')?.value || '';
        item.pic_doc_ruang = document.getElementById('pic_doc_ruang')?.value || '';
        item.pic_doc_yt_zoom = document.getElementById('pic_doc_yt_zoom')?.value || '';
        item.pic_poster = item.pic_poster_info;
        item.pic_info = item.pic_poster_info;
        item.pic_doc = item.pic_doc_ruang;
        item.pic_high = item.pic_doc_yt_zoom;
        const brsPics = [item.pic_poster_info, item.pic_doc_ruang, item.pic_doc_yt_zoom].filter(Boolean);
        item.petugas = brsPics.join(', ');
        item.pic = item.petugas;
        item.highlight = document.getElementById('highlight')?.value || '';
        item.link_cloud = item.highlight;
        item.tautan_dokumentasi = item.highlight;
        item.status = item.highlight ? 'Rilis' : (item.status || 'Terjadwal');
        // Otomatisasi rubrikasi #rilisbrs untuk menu BRS Rilis
        item.rubrikasi = '#rilisbrs';
        item.hubungkan_content_planner = document.getElementById('hubungkan_content_planner')?.checked || false;
        item.hubungkan_kalender = document.getElementById('hubungkan_kalender')?.checked !== false;
    } else if (currentModalType === 'hari_besar') {
        item.hari_besar = document.getElementById('hari_besar').value;
        item.judul = item.hari_besar; // dual-key compatibility
        item.kegiatan = item.hari_besar; // dual-key compatibility
        item.tanggal = document.getElementById('tanggal').value;
        item.kategori = document.getElementById('kategori')?.value || 'Medsos Instansi';
        item.jenis_media = document.getElementById('jenis_media')?.value || 'Instagram';
        item.pembuat_konten = document.getElementById('pembuat_konten').value;
        item.petugas = item.pembuat_konten;
        item.pic = item.pembuat_konten;
        item.assignedTo = item.pembuat_konten;
        item.status = document.getElementById('status').value;
        item.tautan_konten = document.getElementById('tautan_konten')?.value || '';
        item.data_pendukung = document.getElementById('data_pendukung')?.value || '';
        item.link_cloud = item.data_pendukung;
        item.keterangan = document.getElementById('keterangan')?.value || '';
        // Otomatisasi rubrikasi #haribesar untuk menu Ucapan Hari Besar
        item.rubrikasi = '#haribesar';
        item.hubungkan_content_planner = document.getElementById('hubungkan_content_planner')?.checked || false;
        item.hubungkan_kalender = document.getElementById('hubungkan_kalender')?.checked !== false;
    } else if (currentModalType === 'team') {
        item.nama = document.getElementById('nama').value;
        item.jabatan = document.getElementById('jabatan').value;
        item.bidang = document.getElementById('bidang').value;
        item.tugas = document.getElementById('tugas').value;
        item.kontak = document.getElementById('kontak').value;
    } else if (currentModalType === 'user_manager') {
        item.nama = document.getElementById('nama').value;
        item.username = document.getElementById('username').value;
        item.bidang = document.getElementById('bidang').value;
        item.role = document.getElementById('role').value;
        const pwdInput = document.getElementById('user_password');
        item.password = pwdInput && pwdInput.value ? pwdInput.value.trim() : (item.password || 'password');
    } else if (currentModalType === 'repository') {
        item.nama_dokumen = document.getElementById('repo_nama').value;
        item.kategori = document.getElementById('repo_kategori').value;
        item.versi = document.getElementById('repo_versi').value;
        item.tanggal = document.getElementById('repo_tanggal').value;
        item.pic = document.getElementById('repo_pic').value;
        item.link_cloud = document.getElementById('repo_link').value;
        item.deskripsi = document.getElementById('repo_deskripsi').value;
        item.status = document.getElementById('repo_status').value;
    }

    const err = validateFormInput(currentModalType, item);
    if (err) {
        showToast(err, 'error');
        return;
    }

    setSubmitLoading(true);

    const action = currentEditItem ? 'update' : 'add';
    const sheetMapping = {
        'content': 'content_planner',
        'rekap_rutin': 'rekap_rutin',
        'ad_hoc': 'ad_hoc_2026',
        'protokoler': 'protokoler',
        'mc': 'mc',
        'brs_rilis': 'brs_rilis',
        'hari_besar': 'hari_besar',
        'team': 'team',
        'user_manager': 'users',
        'assignment': 'assignments',
        'repository': 'repository'
    };

    const sheetName = sheetMapping[currentModalType];

    // Otomatis Hubungkan ke Content Planner jika dicentang dan belum ada (Single Source of Truth)
    if (item.hubungkan_content_planner) {
        const itemTitle = item.judul || item.kegiatan || item.hari_besar;
        const existingPlanner = (db.contentPlanner || []).find(p => 
            (p.linked_source === currentModalType && Number(p.linked_id) === Number(item.id)) ||
            (p.judul && p.judul === itemTitle)
        );
        if (!existingPlanner) {
            const autoRubrikasi = currentModalType === 'hari_besar' ? '#haribesar' : (currentModalType === 'brs_rilis' ? '#rilisbrs' : (item.rubrikasi || ''));
            const newPlanner = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                judul: itemTitle,
                rubrikasi: autoRubrikasi,
                jenis_konten: currentModalType === 'hari_besar' ? 'Single Image' : (item.rubrikasi?.includes('video') ? 'Video' : 'Carousel'),
                postType: currentModalType === 'hari_besar' ? 'Single Image' : (item.rubrikasi?.includes('video') ? 'Video' : 'Carousel'),
                media_post: item.jenis_media || item.media_post || 'Instagram',
                media: item.jenis_media || item.media_post || 'Instagram',
                assignTo: item.petugas || item.pembuat_konten || item.pic_poster_info || item.assignTo || '',
                assignedTo: item.petugas || item.pembuat_konten || item.pic_poster_info || item.assignTo || '',
                'assign To': item.petugas || item.pembuat_konten || item.pic_poster_info || item.assignTo || '',
                pic: item.petugas || item.pembuat_konten || item.pic_poster_info || item.assignTo || '',
                jadwal: item.tanggal || item.tanggal_rilis || item.jadwal,
                tanggal_posting: item.tanggal || item.tanggal_rilis || item.jadwal,
                jam_posting: item.jam_posting || '09:00',
                status: item.status === 'Selesai' ? 'Posted' : 'Draft',
                progres: item.status === 'Selesai' ? 100 : 10,
                tautan_cloud: item.tautan_dokumentasi || item.data_pendukung || item.link_cloud || item.tautan_cloud || '',
                link_cloud: item.tautan_dokumentasi || item.data_pendukung || item.link_cloud || item.tautan_cloud || '',
                konsep: item.keterangan || `Otomatis dibuat dari modul ${currentModalType}`,
                linked_source: currentModalType,
                linked_id: item.id
            };
            sendDataToServer('add', 'content_planner', newPlanner).catch(console.error);
        }
    }

    // Notification Triggers - kirim ke pegawai yang ditugaskan
    if (action === 'add' && item.petugas) {
        // Cari username dari nama pegawai
        const petugasUser = db.users.find(u => u.nama === item.petugas);
        const targetUsername = petugasUser ? petugasUser.username : item.petugas;
        addNotification(
            'Penugasan Baru Untukmu',
            `Kamu ditugaskan pada kegiatan: ${item.judul || item.kegiatan || item.hari_besar || 'Baru'}.`,
            targetUsername
        );
    } else if (action === 'add' && (item.assignedTo || item.pembuat_konten || item.assigned_to)) {
        const petugasNama = item.assignedTo || item.pembuat_konten || item.assigned_to;
        const petugasUser = db.users.find(u => u.nama === petugasNama);
        const targetUsername = petugasUser ? petugasUser.username : petugasNama;
        addNotification(
            'Tugas Baru Untukmu',
            `Kamu ditugaskan: ${item.judul || item.kegiatan || item.hari_besar || item.tugas || 'Baru'}.`,
            targetUsername
        );
    } else if (action === 'update' && item.status && currentEditItem?.status !== item.status) {
        addNotification(
            'Pembaruan Status Tugas',
            `Status "${item.judul || item.kegiatan}" diubah menjadi: ${item.status}.`,
            'koordinator'
        );
    }

    // Audit Log Trigger
    const auditLabels = {
        'content': 'Rencana Konten',
        'rekap_rutin': 'Kegiatan Rutin',
        'ad_hoc': 'Kegiatan Ad Hoc',
        'protokoler': 'Agenda Protokol',
        'mc': 'Penugasan MC',
        'brs_rilis': 'Dokumen BRS',
        'hari_besar': 'Ucapan Hari Besar',
        'team': 'Profil Anggota Tim',
        'assignment': 'Assignment Tugas',
        'user_manager': 'Akun Pengguna'
    };

    const label = auditLabels[currentModalType];
    const itemDesc = item.judul || item.kegiatan || item.nama || item.hari_besar;

    logActivity(
        action === 'add' ? 'Tambah Data' : 'Ubah Data',
        `${action === 'add' ? 'Menambahkan' : 'Mengubah'} ${label}: "${itemDesc}".`
    );

    // Simpan secara asinkron ke Google Sheets di latar belakang
    sendDataToServer(action, sheetName, item).catch(err => {
        console.error('Sync error:', err);
    });

    // Otomatis sinkronisasi tugas Content Planner yang selesai ke Rekap Rutin
    if (currentModalType === 'content' && typeof window.syncCompletedContentToRekapRutin === 'function') {
        window.syncCompletedContentToRekapRutin(db, item, true);
    }

    setSubmitLoading(false);
    closeModal();
    showToast('Data berhasil disimpan lokal (Sedang disinkronkan)...');
    router(currentState);
}

// Global Delete Handler
function deleteItem(type, id) {
    const sheetMapping = {
        'content': 'content_planner',
        'rekap_rutin': 'rekap_rutin',
        'ad_hoc': 'ad_hoc_2026',
        'protokoler': 'protokoler',
        'mc': 'mc',
        'brs_rilis': 'brs_rilis',
        'hari_besar': 'hari_besar',
        'team': 'team',
        'tickets': 'tickets',
        'assets': 'assets',
        'monitoring': 'monitoring',
        'users': 'users',
        'masterData': 'master_data',
        'assignment': 'assignments',
        'repository': 'repository'
    };

    const sheetName = sheetMapping[type];
    const varName = SHEET_TO_VAR[sheetName] || type;

    // Get item description before deleting
    const item = db[varName]?.find(i => Number(i.id) === Number(id));
    const itemDesc = item ? (item.judul || item.kegiatan || item.nama || item.hari_besar || item.media || `ID ${id}`) : `ID ${id}`;

    showConfirmModal(
        `Data "<strong>${itemDesc}</strong>" akan dihapus secara permanen dari database dan tidak dapat dikembalikan.`,
        () => {
            logActivity('Hapus Data', `Menghapus item dari ${sheetName}: "${itemDesc}".`);
            sendDataToServer('delete', sheetName, { id: Number(id) }).catch(err => {
                console.error('Delete sync error:', err);
            });
            showToast('Data berhasil dihapus!');
            router(currentState);
        },
        {
            title: 'Hapus Data Permanen',
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal',
            type: 'danger',
            icon: 'fa-trash'
        }
    );
}


// Tickets Subsystems
window.openTicketModal = function (item = null) {
    document.getElementById('dynamic-modal')?.remove();
    const uList = window.getCentralizedUserList ? window.getCentralizedUserList() : db.team.map(m => m.nama);
    const isEdit = !!item;
    const isStaffOrAdmin = isUserAdminOrKetua();

    const serviceTypes = [
        'Infografis / Poster Rilis',
        'Pembuatan Video / Reels',
        'Peliputan & Dokumentasi',
        'Desain Publikasi / Booklet',
        'Pendampingan Protokol & MC',
        'Live Streaming YouTube / Zoom',
        'Lainnya'
    ];

    const statuses = [
        'Diajukan',
        'Diproses',
        'Dijadwalkan',
        'Selesai',
        'Ditolak/Dibatalkan'
    ];

    const currentReqWaktu = item?.waktu || '09:00';
    let reqHour = '09';
    let reqMinute = '00';
    const reqTimeMatch = String(currentReqWaktu).match(/^(\d{1,2})[:.](\d{1,2})/);
    if (reqTimeMatch) {
        reqHour = reqTimeMatch[1].padStart(2, '0');
        reqMinute = reqTimeMatch[2].padStart(2, '0');
    }

    let reqHourOptions = '';
    for (let h = 0; h < 24; h++) {
        const hStr = String(h).padStart(2, '0');
        reqHourOptions += `<option value="${hStr}" ${reqHour === hStr ? 'selected' : ''}>${hStr}</option>`;
    }

    let reqMinuteOptions = '';
    for (let m = 0; m < 60; m += 5) {
        const mStr = String(m).padStart(2, '0');
        reqMinuteOptions += `<option value="${mStr}" ${reqMinute === mStr ? 'selected' : ''}>${mStr}</option>`;
    }
    if (!reqMinuteOptions.includes(`value="${reqMinute}"`)) {
        reqMinuteOptions += `<option value="${reqMinute}" selected>${reqMinute}</option>`;
    }

    const modalHTML = `
        <div class="modal" id="dynamic-modal">
            <div class="modal-content p-6 max-w-lg border border-slate-200 dark:border-slate-700 shadow-2xl relative">
                <button onclick="closeModal()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-all">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="mb-5 flex items-center gap-3">
                    <div class="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center text-indigo-650 text-lg">
                        <i class="fa-solid fa-ticket"></i>
                    </div>
                    <div>
                        <h3 class="font-black text-slate-900 dark:text-white text-base tracking-tight">${isEdit ? 'Ubah Pengajuan Layanan' : 'Form Permintaan Layanan Humas'}</h3>
                        <p class="text-[10px] text-slate-400 font-semibold">Alur Pengajuan & Penugasan Terintegrasi</p>
                    </div>
                </div>
                <form onsubmit="saveTicketRequest(event, ${isEdit ? item.id : 'null'})" class="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Pemohon <span class="text-rose-500">*</span></label>
                            <input type="text" id="req-pengaju" value="${item?.pengaju || currentUser.name || ''}" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg font-semibold dark:text-white" required>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit / Bagian <span class="text-rose-500">*</span></label>
                            <input type="text" id="req-bidang" value="${item?.bidang || currentUser.bidang || 'Bagian Umum'}" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg font-semibold dark:text-white" placeholder="Contoh: Tim Nerwilis" required>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Layanan <span class="text-rose-500">*</span></label>
                            <select id="req-type" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg font-bold dark:text-white">
                                ${serviceTypes.map(st => `<option ${item?.jenis === st ? 'selected' : ''} value="${st}">${st}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Batas Waktu / Deadline <span class="text-rose-500">*</span></label>
                            <input type="date" id="req-deadline" value="${formatDateInput(item?.deadline || new Date().toISOString().split('T')[0])}" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg font-semibold dark:text-white" required>
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Judul / Keperluan Layanan <span class="text-rose-500">*</span></label>
                        <input type="text" id="req-title" value="${item?.judul || ''}" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg font-bold dark:text-white" placeholder="Contoh: Pembuatan Infografis Hasil SAKERNAS 2026" required>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal Kegiatan</label>
                            <input type="date" id="req-tgl-kegiatan" value="${formatDateInput(item?.tanggal_kegiatan || item?.deadline)}" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg font-semibold dark:text-white">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Waktu (WIB / 24 Jam)</label>
                            <div class="flex items-center gap-1">
                                <select id="req-waktu-hour" class="flex-1 px-2 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold dark:text-white" required>
                                    ${reqHourOptions}
                                </select>
                                <span class="text-xs font-bold text-slate-400">:</span>
                                <select id="req-waktu-minute" class="flex-1 px-2 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold dark:text-white" required>
                                    ${reqMinuteOptions}
                                </select>
                                <span class="text-[10px] font-bold text-indigo-650 dark:text-indigo-400">WIB</span>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lokasi</label>
                            <input type="text" id="req-lokasi" value="${item?.lokasi || 'Kantor BPS Prov. Kalbar'}" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg font-semibold dark:text-white" placeholder="Ruang Rapat / Aula">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Deskripsi Kebutuhan</label>
                        <textarea id="req-detail" rows="2.5" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg dark:text-white" placeholder="Jelaskan kebutuhan konten, format, atau instruksi rilis..." required>${item?.detail || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tautan Lampiran / Data Pendukung (Google Drive)</label>
                        <input type="url" id="req-lampiran" value="${item?.lampiran || ''}" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg font-mono text-indigo-600 dark:text-indigo-400" placeholder="https://drive.google.com/...">
                    </div>

                    ${isStaffOrAdmin ? `
                        <div class="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-150 dark:border-indigo-900/60 space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">PIC Petugas Yang Ditugaskan</label>
                                    <input type="text" id="req-pic" list="pic-list-tickets" value="${item?.pic || ''}" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-indigo-200 rounded-lg font-bold text-indigo-700 dark:text-indigo-300" placeholder="Ketik atau pilih PIC...">
                                    <datalist id="pic-list-tickets">
                                        ${uList.map(n => `<option value="${n}"></option>`).join('')}
                                    </datalist>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">Status Permintaan</label>
                                    <select id="req-status" class="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-indigo-200 rounded-lg font-bold text-indigo-700 dark:text-indigo-300">
                                        ${statuses.map(st => `<option ${item?.status === st || (!item && st === 'Diajukan') ? 'selected' : ''} value="${st}">${st}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="flex flex-col sm:flex-row gap-3 pt-1">
                                <label class="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-indigo-800 dark:text-indigo-300">
                                    <input type="checkbox" id="req-hubungkan-kalender" checked class="rounded text-indigo-600">
                                    <span>Teruskan Menjadi Agenda Kalender</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-indigo-800 dark:text-indigo-300">
                                    <input type="checkbox" id="req-hubungkan-cp" class="rounded text-indigo-600">
                                    <span>Jadwalkan di Content Planner</span>
                                </label>
                            </div>
                        </div>
                    ` : `
                        <input type="hidden" id="req-pic" value="${item?.pic || ''}">
                        <input type="hidden" id="req-status" value="${item?.status || 'Diajukan'}">
                    `}

                    <div class="flex gap-3 pt-3">
                        <button type="submit" class="flex-1 btn-primary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                            <i class="fa-solid fa-paper-plane"></i> ${isEdit ? 'Simpan Perubahan' : 'Kirim Pengajuan'}
                        </button>
                        <button type="button" onclick="closeModal()" class="px-5 btn-secondary text-xs font-bold uppercase tracking-wider rounded-xl">Batal</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.saveTicketRequest = async function (event, editId = null) {
    event.preventDefault();
    const pengaju = document.getElementById('req-pengaju').value;
    const bidang = document.getElementById('req-bidang').value;
    const jenis = document.getElementById('req-type').value;
    const deadline = document.getElementById('req-deadline').value;
    const judul = document.getElementById('req-title').value;
    const tglKegiatan = document.getElementById('req-tgl-kegiatan')?.value || deadline;
    const reqWaktuHour = document.getElementById('req-waktu-hour')?.value;
    const reqWaktuMin = document.getElementById('req-waktu-minute')?.value;
    const waktu = (reqWaktuHour && reqWaktuMin) ? `${reqWaktuHour}:${reqWaktuMin}` : (document.getElementById('req-waktu')?.value || '09:00');
    const lokasi = document.getElementById('req-lokasi')?.value || 'Kantor BPS Kalbar';
    const detail = document.getElementById('req-detail').value;
    const lampiran = document.getElementById('req-lampiran')?.value || '';
    const pic = document.getElementById('req-pic')?.value || '';
    const status = document.getElementById('req-status')?.value || 'Diajukan';

    const hubungkanKalender = document.getElementById('req-hubungkan-kalender')?.checked;
    const hubungkanCp = document.getElementById('req-hubungkan-cp')?.checked;

    if (editId) {
        const ticket = db.tickets.find(t => t.id === editId);
        if (!ticket) return;
        ticket.pengaju = pengaju;
        ticket.bidang = bidang;
        ticket.jenis = jenis;
        ticket.deadline = deadline;
        ticket.judul = judul;
        ticket.tanggal_kegiatan = tglKegiatan;
        ticket.waktu = waktu;
        ticket.lokasi = lokasi;
        ticket.detail = detail;
        ticket.lampiran = lampiran;
        ticket.pic = pic;
        ticket.status = status;

        logActivity('Ubah Pengajuan', `Mengubah permintaan layanan: "${judul}".`);
        await sendDataToServer('update', 'tickets', ticket);
        showToast('Pengajuan berhasil diperbarui!');
    } else {
        const newTicket = {
            id: Date.now(),
            pengaju: pengaju,
            bidang: bidang,
            jenis: jenis,
            judul: judul,
            tanggal_kegiatan: tglKegiatan,
            waktu: waktu,
            lokasi: lokasi,
            deadline: deadline,
            detail: detail,
            lampiran: lampiran,
            status: status,
            pic: pic
        };

        logActivity('Buat Pengajuan', `Mengirim permintaan layanan baru: "${judul}".`);
        addNotification('Pengajuan Layanan Baru', `Permintaan layanan "${judul}" diajukan oleh ${pengaju}.`, 'koordinator');

        await sendDataToServer('add', 'tickets', newTicket);

        // Teruskan ke agenda kalender jika dicentang dan ada tanggal/PIC
        if (hubungkanKalender && (status === 'Diproses' || status === 'Dijadwalkan')) {
            const adHocItem = {
                id: Date.now() + 50,
                tanggal: tglKegiatan,
                hari: new Date(tglKegiatan).toLocaleDateString('id-ID', { weekday: 'long' }),
                kegiatan: `[Layanan] ${judul}`,
                jumlah_bertugas: 1,
                petugas: pic || 'Staf Humas',
                keterangan: `${detail} (Lokasi: ${lokasi})`,
                status: 'Sedang Dikerjakan',
                hubungkan_kalender: true
            };
            sendDataToServer('add', 'ad_hoc_2026', adHocItem).catch(console.error);
        }

        // Teruskan ke Content Planner jika dicentang
        if (hubungkanCp) {
            const cpItem = {
                id: Date.now() + 100,
                judul: `[Layanan] ${judul}`,
                jenis_konten: jenis.includes('Video') ? 'Video' : 'Carousel',
                postType: jenis.includes('Video') ? 'Video' : 'Carousel',
                media_post: 'Instagram',
                media: 'Instagram',
                assignTo: pic || 'Staf Humas',
                assignedTo: pic || 'Staf Humas',
                'assign To': pic || 'Staf Humas',
                pic: pic || 'Staf Humas',
                jadwal: deadline,
                tanggal_posting: deadline,
                jam_posting: waktu,
                status: 'Draft',
                progres: 10,
                konsep: detail,
                tautan_cloud: lampiran
            };
            sendDataToServer('add', 'content_planner', cpItem).catch(console.error);
        }

        showToast('Pengajuan layanan berhasil dikirim!');
    }

    closeModal();
    router(currentState);
};

window.confirmApproveTicket = async function (event, id) {
    event.preventDefault();
    const pic = document.getElementById('assign-pic-select').value;
    if (!pic) {
        showToast('Pilih petugas PIC terlebih dahulu.', 'error');
        return;
    }

    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return;

    ticket.status = 'Approved';
    ticket.pic = pic;

    // Auto create content planner task
    const newContent = {
        id: db.contentPlanner.length + 1,
        judul: `[Layanan] ${ticket.judul}`,
        konsep: ticket.detail,
        jenis_konten: ticket.jenis === 'Pembuatan Video' ? 'Video' : 'Single Image',
        postType: ticket.jenis === 'Pembuatan Video' ? 'Video' : 'Single Image',
        media_post: 'Instagram',
        media: 'Instagram',
        progres: 10,
        jadwal: ticket.deadline,
        tanggal_posting: ticket.deadline,
        jam_posting: '09:00',
        status: 'In Progress',
        assignedTo: pic,
        assignTo: pic,
        'assign To': pic,
        pic: pic
    };

    logActivity('Approve Tiket', `Menyetujui permintaan layanan "${ticket.judul}" dan menugaskan ${pic}.`);

    // Kirim notifikasi ke PIC yang ditugaskan (bukan ke semua 'tim')
    // Cari username dari nama PIC
    const picUser = db.users.find(u => u.nama === pic || u.username === pic);
    const targetUsername = picUser ? picUser.username : (pic || 'tim');
    addNotification(
        'Penugasan Tugas Baru',
        `Anda ditugaskan sebagai PIC pengerjaan layanan: "${ticket.judul}".`,
        targetUsername
    );

    // Notifikasi ke pengaju bahwa tiket disetujui
    const pengajuUser = db.users.find(u => u.nama === ticket.pengaju || u.username === ticket.pengaju);
    if (pengajuUser) {
        addNotification(
            'Pengajuan Disetujui',
            `Permintaan layanan "${ticket.judul}" telah disetujui dan dikerjakan oleh ${pic}.`,
            pengajuUser.username
        );
    }

    await sendDataToServer('update', 'tickets', ticket);
    await sendDataToServer('add', 'content_planner', newContent);

    document.getElementById('assign-pic-modal')?.remove();
    showToast('Tiket disetujui & tugas dibuat!');
    router(currentState);
};


window.rejectTicket = async function (id) {
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return;

    showConfirmModal(
        `Pengajuan "<strong>${ticket.judul}</strong>" akan ditolak. Pemohon akan diberitahu.`,
        async () => {
            ticket.status = 'Rejected';
            logActivity('Tolak Tiket', `Menolak permintaan layanan "${ticket.judul}".`);

            // Notifikasi ke pengaju
            const pengajuUser = db.users.find(u => u.nama === ticket.pengaju || u.username === ticket.pengaju);
            if (pengajuUser) {
                addNotification(
                    'Pengajuan Ditolak',
                    `Maaf, permintaan layanan "${ticket.judul}" tidak dapat diproses saat ini.`,
                    pengajuUser.username
                );
            }

            await sendDataToServer('update', 'tickets', ticket);
            showToast('Pengajuan ditolak.');
            router(currentState);
        },
        {
            title: 'Tolak Pengajuan',
            confirmText: 'Ya, Tolak',
            type: 'warning',
            icon: 'fa-ban'
        }
    );
};



// Media Monitoring CRUD
function _buildMonitoringModalHTML(item = null) {
    return `
        <div class="modal" id="dynamic-modal">
            <div class="modal-content p-7 relative">
                <button onclick="closeModal()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-all">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="mb-5 flex items-center gap-3">
                    <div class="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center text-indigo-650 text-lg">
                        <i class="fa-solid fa-newspaper"></i>
                    </div>
                    <div>
                        <h3 class="font-black text-slate-900 dark:text-white text-base tracking-tight">${item ? 'Edit Kliping Berita' : 'Tambah Kliping Berita'}</h3>
                        <p class="text-[10px] text-slate-400 font-semibold">Media Monitoring</p>
                    </div>
                </div>
                <form onsubmit="saveMonitoringItem(event, ${item ? item.id : 'null'})" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Portal Media <span class="text-rose-500">*</span></label>
                            <input type="text" id="mon-media" value="${item?.media || ''}" class="w-full px-3.5 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-600 rounded-lg text-xs font-medium dark:text-white" placeholder="Contoh: Tribun Pontianak" required>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Topik Berita <span class="text-rose-500">*</span></label>
                            <select id="mon-topik" class="w-full px-3.5 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-600 rounded-lg text-xs dark:text-white" required>
                                ${['Inflasi','Perdagangan','Kemiskinan','Indikator Strategis','Ketenagakerjaan','Luas Panen dan Produksi Padi','Pertumbuhan Ekonomi','Sektoral','Ekspor Impor','Indeks Pembangunan Manusia','Kependudukan','Rekrutmen CPNS','Sensus Ekonomi 2026','Transportasi','Wisatawan Mancanegara','Wisatawan Nusantara','Ketimpangan Gender','Nilai Tukar Petani','Opini Publik Pegawai','Indeks Demokrasi','Indeks Kebahagiaan'].map(t => {
                                    const currT = (item?.topik === 'Rilis BRS' || item?.topik === 'Sensus Ekonomi 2026' || item?.topik === 'SE2026' || item?.topik === 'Sensus Ekonomi' || item?.topik === 'Sensus Ekonomi 2026 (SE2026)') ? 'Sensus Ekonomi 2026' : (item?.topik || 'Sektoral');
                                    return `<option ${currT === t ? 'selected' : ''} value="${t}">${t}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sentimen <span class="text-rose-500">*</span></label>
                            <select id="mon-sentiment" class="w-full px-3.5 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-600 rounded-lg text-xs dark:text-white" required>
                                <option ${item?.sentimen === 'Positif' ? 'selected' : ''} value="Positif">Positif</option>
                                <option ${item?.sentimen === 'Netral' ? 'selected' : ''} value="Netral">Netral</option>
                                <option ${item?.sentimen === 'Negatif' ? 'selected' : ''} value="Negatif">Negatif</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Berita / Kliping <span class="text-rose-500">*</span></label>
                        <input type="text" id="mon-title" value="${item?.judul || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-600 rounded-lg text-xs font-medium dark:text-white" placeholder="Contoh: BPS Kalbar Rilis Data Kemiskinan 2026" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kutipan Ringkasan</label>
                        <textarea id="mon-summary" rows="2" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-600 rounded-lg text-xs dark:text-white" placeholder="Ringkasan isi berita...">${item?.ringkasan || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan URL Artikel</label>
                        <input type="url" id="mon-url" value="${item?.url || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-600 rounded-lg text-xs dark:text-white" placeholder="https://www.pontianak.tribunnews.com/...">
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 btn-primary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                            <i class="fa-solid ${item ? 'fa-floppy-disk' : 'fa-plus'}"></i> ${item ? 'Simpan Perubahan' : 'Tambah Kliping'}
                        </button>
                        <button type="button" onclick="closeModal()" class="px-5 btn-secondary text-xs font-bold uppercase tracking-wider rounded-xl">Batal</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

window.openAddMonitoringModal = function () {
    document.getElementById('dynamic-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', _buildMonitoringModalHTML(null));
};

window.openEditMonitoringModal = function (id) {
    const item = db.monitoring.find(m => m.id === id);
    if (!item) return;
    document.getElementById('dynamic-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', _buildMonitoringModalHTML(item));
};

window.saveMonitoringItem = async function (event, editId = null) {
    event.preventDefault();
    const media = document.getElementById('mon-media').value;
    const topik = document.getElementById('mon-topik')?.value || 'Sensus Ekonomi 2026';
    const title = document.getElementById('mon-title').value;
    const sentiment = document.getElementById('mon-sentiment').value;
    const summary = document.getElementById('mon-summary').value;
    const url = document.getElementById('mon-url').value;

    if (editId) {
        // Edit mode
        const existing = db.monitoring.find(m => m.id === editId);
        if (!existing) return;
        existing.media = media;
        existing.topik = topik;
        existing.judul = title;
        existing.sentimen = sentiment;
        existing.ringkasan = summary;
        existing.url = url;
        logActivity('Edit Kliping', `Mengubah kliping media: "${title}" (${media}).`);
        await sendDataToServer('update', 'monitoring', existing);
        showToast('Kliping berhasil diperbarui!');
    } else {
        // Add mode
        const newItem = {
            id: Date.now(),
            media: media,
            topik: topik,
            judul: title,
            tanggal: new Date().toISOString().split('T')[0],
            sentimen: sentiment,
            ringkasan: summary,
            url: url
        };
        logActivity('Tambah Kliping', `Menambahkan kliping media baru: "${title}" (${media}).`);
        await sendDataToServer('add', 'monitoring', newItem);
        showToast('Kliping berita berhasil disimpan!');
    }

    closeModal();
    router(currentState);
};

// Detail modal builder
function showDetail(type, item) {
    if (Date.now() - lastNavigationTime < 450) {
        return;
    }
    // Remove any existing detail modal
    document.querySelectorAll('.modal').forEach(m => m.remove());
    let content = '';

    if (type === 'content') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Judul:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${escapeHtml(item.judul)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Jenis Konten:</strong><span class="font-bold">${escapeHtml(item.jenis_konten || item.postType || item.jenis || 'Carousel')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Media Post:</strong><span class="font-bold">${escapeHtml(item.media_post || item.media || 'Instagram')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC:</strong><span class="font-bold text-slate-800 dark:text-white">${escapeHtml(item['assign To'] || item.assignTo || item.assignedTo || item.pic || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal Posting:</strong><span class="font-bold text-rose-600">${formatDate(item.jadwal || item.tanggal_posting)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Jam Posting:</strong><span class="font-bold">${formatTime(item.jam_posting || '09:00')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${escapeHtml(item.status || 'Draft')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Progres:</strong><span class="font-black text-indigo-650">${escapeHtml(item.progres || 0)}%</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Deskripsi Konsep / Catatan:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${escapeHtml(item.konsep || 'Tidak ada catatan khusus.')}</span></div>
            </div>
        `;
    } else if (type === 'protokoler' || type === 'mc') {
        const isProto = type === 'protokoler';
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Agenda:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${escapeHtml(item.kegiatan)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal & Waktu:</strong><span class="font-bold">${formatDate(item.tanggal)} - ${formatTime(item.jam_mulai || '08:30')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Lokasi Acara:</strong><span class="font-bold">${escapeHtml(item.lokasi || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Jenis Agenda:</strong><span class="font-bold">${escapeHtml(item.jenis || 'Internal')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Level Keprotokolan:</strong><span class="font-bold">${escapeHtml(item.level || 'Formal')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Petugas ${isProto ? 'Protokol' : 'MC'}:</strong><span class="font-extrabold text-indigo-650 dark:text-indigo-400">${escapeHtml(item.petugas || '-')}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Keterangan Acara:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${escapeHtml(item.keterangan || 'Tidak ada keterangan tambahan.')}</span></div>
            </div>
        `;
    } else if (type === 'brs_rilis') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Judul Kegiatan Rilis:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${escapeHtml(item.judul)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal Rilis:</strong><span class="font-bold">${formatDate(item.tanggal_rilis)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Poster & Infografis:</strong><span class="font-bold text-slate-800 dark:text-white">${escapeHtml(item.pic_poster_info || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Dokumentasi Ruang:</strong><span class="font-bold text-slate-800 dark:text-white">${escapeHtml(item.pic_doc_ruang || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Dok. YouTube & Zoom:</strong><span class="font-bold text-slate-800 dark:text-white">${escapeHtml(item.pic_doc_yt_zoom || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Highlight Data:</strong><span class="font-bold">${item.highlight ? `<a href="${escapeHtml(item.highlight)}" target="_blank" class="text-indigo-650 hover:underline">Lihat PDF</a>` : '-'}</span></div>
            </div>
        `;
    } else if (type === 'rekap_rutin') {
        const rubriks = window.parseRubrikasiArray ? window.parseRubrikasiArray(item.rubrikasi) : (item.rubrikasi ? [item.rubrikasi] : []);
        const rubrikBadges = rubriks.length > 0
            ? `<div class="flex flex-wrap gap-1 justify-end max-w-[260px]">${rubriks.map(r => `<span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md font-bold text-[10px]">${escapeHtml(r)}</span>`).join('')}</div>`
            : `<span class="font-bold text-slate-400">-</span>`;
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Kegiatan:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${escapeHtml(item.kegiatan)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal & Hari:</strong><span class="font-bold">${formatDate(item.tanggal)} (${escapeHtml(item.hari || '-')})</span></div>
                <div class="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Rubrikasi:</strong>${rubrikBadges}</div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Petugas Humas:</strong><span class="font-bold text-slate-800 dark:text-white">${escapeHtml(item.petugas || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${escapeHtml(item.status || '-')}</span></div>
            </div>
        `;
    } else if (type === 'ad_hoc') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Kegiatan:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${escapeHtml(item.kegiatan)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal & Hari:</strong><span class="font-bold">${formatDate(item.tanggal)} (${escapeHtml(item.hari || '-')})</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Jumlah Bertugas:</strong><span class="font-bold">${escapeHtml(item.jumlah_bertugas || 1)} orang</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Petugas:</strong><span class="font-bold text-slate-800 dark:text-white">${escapeHtml(item.petugas || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${escapeHtml(item.status || '-')}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Keterangan:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${escapeHtml(item.keterangan || 'Tidak ada keterangan tambahan.')}</span></div>
            </div>
        `;
    } else if (type === 'hari_besar') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Ucapan Hari Besar:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${escapeHtml(item.hari_besar)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal:</strong><span class="font-bold">${formatDate(item.tanggal)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Pembuat Konten (PIC):</strong><span class="font-bold text-slate-800 dark:text-white">${escapeHtml(item.pembuat_konten || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status Konten:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${escapeHtml(item.status || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Aset Pendukung:</strong><span class="font-bold">${item.data_pendukung ? `<a href="${escapeHtml(item.data_pendukung)}" target="_blank" class="text-indigo-650 hover:underline">Buka Link Aset</a>` : '-'}</span></div>
            </div>
        `;
    } else if (type === 'team') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="text-center pb-4">
                    <div class="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-700 ${getAvatarBg(item.nama)} mx-auto flex items-center justify-center font-black text-lg shadow-sm">${getPicInitials(item.nama)}</div>
                    <h4 class="font-extrabold text-slate-800 dark:text-white text-sm mt-3">${escapeHtml(item.nama)}</h4>
                    <p class="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest mt-1">${escapeHtml(item.jabatan)}</p>
                </div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Bidang Kerja:</strong><span class="font-semibold">${escapeHtml(item.bidang)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>No. Kontak WA:</strong><span class="font-bold text-slate-700 dark:text-slate-300">${escapeHtml(item.kontak)}</span></div>
                <div class="flex flex-col gap-1"><strong>Tugas Utama Kehumasan:</strong><p class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px] mt-1">${escapeHtml(item.tugas || '-')}</p></div>
            </div>
        `;
    } else if (type === 'assignment') {
        const assignRubriks = window.parseRubrikasiArray ? window.parseRubrikasiArray(item.rubrikasi) : (item.rubrikasi ? [item.rubrikasi] : []);
        const assignRubrikBadges = assignRubriks.length > 0
            ? `<div class="flex flex-wrap gap-1 justify-end max-w-[260px]">${assignRubriks.map(r => `<span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md font-bold text-[10px]">${escapeHtml(r)}</span>`).join('')}</div>`
            : `<span class="font-bold text-slate-400">-</span>`;
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Tugas:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${escapeHtml(item.tugas)}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Deskripsi:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${escapeHtml(item.deskripsi || 'Tidak ada deskripsi.')}</span></div>
                <div class="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Rubrikasi:</strong>${assignRubrikBadges}</div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Prioritas:</strong><span class="font-bold">${escapeHtml(item.prioritas || 'Sedang')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${escapeHtml(item.status || 'Belum Mulai')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal Ditugaskan:</strong><span class="font-bold">${formatDate(item.tanggal_penugasan)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Deadline:</strong><span class="font-bold text-rose-600">${formatDate(item.deadline)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Progres Kerja:</strong><span class="font-black text-indigo-650">${escapeHtml(item.progres || 0)}%</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Diberikan Kepada:</strong><span class="font-bold text-slate-800 dark:text-white">${escapeHtml(item.assigned_to || '-')}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Lampiran:</strong><span class="font-bold">${item.lampiran ? `<a href="${escapeHtml(item.lampiran)}" target="_blank" class="text-indigo-650 dark:text-indigo-400 hover:underline">Buka Tautan</a>` : '-'}</span></div>
            </div>
        `;
    } else if (type === 'repository') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Dokumen:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${escapeHtml(item.nama_dokumen)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Kategori:</strong><span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded font-bold uppercase tracking-wider text-[9px] border border-amber-200 dark:border-amber-800">${item.kategori || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Versi / Edisi:</strong><span class="font-bold">${item.versi || 'v1.0'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal Pembaruan:</strong><span class="font-bold">${formatDate(item.tanggal)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Pemilik / PIC:</strong><span class="font-bold text-slate-800 dark:text-white">${item.pic || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 ${item.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'} rounded font-bold uppercase tracking-wider text-[9px]">${item.status || 'Aktif'}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Deskripsi Ringkas:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${item.deskripsi || 'Tidak ada deskripsi.'}</span></div>
                <div class="flex justify-between pt-1"><strong>Tautan Cloud:</strong><span>${item.link_cloud ? `<a href="${item.link_cloud}" target="_blank" class="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Buka di Google Drive</a>` : '-'}</span></div>
            </div>
        `;
    } else if (type === 'monitoring') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Media:</strong><span class="font-extrabold text-slate-800 dark:text-white">${item.media}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Judul:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.judul}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal:</strong><span class="font-bold">${formatDate(item.tanggal)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Sentimen:</strong><span class="font-bold">${item.sentimen || 'Netral'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Topik:</strong><span class="font-bold">${item.topik || '-'}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Ringkasan:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${item.ringkasan || '-'}</span></div>
                <div class="flex justify-between pt-1"><strong>Tautan Berita:</strong><span>${item.url ? `<a href="${item.url}" target="_blank" class="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Buka Tautan Berita</a>` : '-'}</span></div>
            </div>
        `;
    } else if (type === 'tickets') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Pengaju:</strong><span class="font-extrabold text-slate-800 dark:text-white">${item.pengaju}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Bidang:</strong><span class="font-bold">${item.bidang}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Jenis Layanan:</strong><span class="font-bold">${item.jenis}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Judul Permohonan:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.judul}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${item.status || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Deadline / Jadwal:</strong><span class="font-bold text-rose-600">${formatDate(item.deadline)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Petugas / PIC:</strong><span class="font-bold text-slate-800 dark:text-white">${item.pic || '-'}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Rincian Kebutuhan:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${item.detail || '-'}</span></div>
                <div class="flex justify-between pt-1"><strong>Lampiran:</strong><span>${item.lampiran ? `<a href="${item.lampiran}" target="_blank" class="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Buka Berkas Lampiran</a>` : '-'}</span></div>
            </div>
        `;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content p-6 max-w-md border border-slate-150 dark:border-slate-700 shadow-2xl">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 class="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider"><i class="fa-solid fa-circle-info text-indigo-650 dark:text-indigo-455"></i> Rincian Informasi</h3>
                <button onclick="this.closest('.modal').remove()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            ${content}
            <div class="mt-8 flex justify-end">
                <button onclick="this.closest('.modal').remove()" class="btn-primary px-6 py-2 text-xs font-bold uppercase tracking-wider">Tutup</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// =====================================================
// DEBOUNCE UTILITY
// =====================================================
function debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
window.debounce = debounce;

// Navigation & Routing System
function router(page) {
    if (!currentUser) return;
    const allowedPages = {
        admin: ['dashboard', 'planner', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar', 'settings', 'assignment', 'repository'],
        kepala: ['dashboard', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar', 'repository'],
        koordinator: ['dashboard', 'planner', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar', 'repository'],
        tim: ['dashboard', 'calendar', 'assignment', 'rekap_kegiatan', 'monitoring', 'repository'],
        pemohon: ['dashboard', 'tickets'],
        kabkot: ['repository', 'team']
    };

    const userRole = currentUser ? currentUser.role : 'pemohon';
    const roleAllowed = allowedPages[userRole] || allowedPages['pemohon'];

    // Safety redirect to first permitted page if role doesn't have access
    if (!roleAllowed.includes(page)) {
        page = roleAllowed[0] || 'dashboard';
    }

    const isSamePage = (page === currentState);
    currentState = page;
    lastNavigationTime = Date.now();

    // Reset Search query
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) searchInput.value = '';
    activeSearchQuery = '';

    // Update Desktop Sidebar active classes
    document.querySelectorAll('.sidebar-link').forEach(el => {
        el.classList.remove('active');
        if (el.id === `nav-${page}`) {
            el.classList.add('active');
        }
    });

    // Update Mobile Sidebar active classes
    document.querySelectorAll('#mobile-sidebar .sidebar-link').forEach(el => {
        el.classList.remove('active');
        if (el.id === `mobile-nav-${page}`) {
            el.classList.add('active');
        }
    });

    // Update Mobile Bottom Bar active classes & role-specific primary button
    const bottomBar = document.getElementById('mobile-bottom-bar');
    if (bottomBar) {
        const primaryIcon = document.getElementById('bottom-nav-primary-icon');
        const primaryLabel = document.getElementById('bottom-nav-primary-label');
        const primaryBtn = document.getElementById('bottom-nav-primary-btn');

        if (currentUser) {
            if (currentUser.role === 'tim') {
                if (primaryIcon) primaryIcon.className = 'fa-solid fa-clipboard-list text-base transition-transform';
                if (primaryLabel) primaryLabel.textContent = 'Tugas';
                if (primaryBtn) primaryBtn.dataset.page = 'assignment';
            } else if (currentUser.role === 'koordinator') {
                if (primaryIcon) primaryIcon.className = 'fa-solid fa-list-check text-base transition-transform';
                if (primaryLabel) primaryLabel.textContent = 'Planner';
                if (primaryBtn) primaryBtn.dataset.page = 'planner';
            } else {
                if (primaryIcon) primaryIcon.className = 'fa-solid fa-ticket text-base transition-transform';
                if (primaryLabel) primaryLabel.textContent = 'Layanan';
                if (primaryBtn) primaryBtn.dataset.page = 'tickets';
            }
        }

        document.querySelectorAll('#mobile-bottom-bar .bottom-nav-btn').forEach(el => {
            const targetPage = el.dataset.page;
            const icon = el.querySelector('i');
            if (targetPage === page) {
                el.classList.remove('text-slate-500', 'dark:text-slate-400');
                el.classList.add('text-indigo-650', 'dark:text-indigo-400', 'font-black');
                if (icon) icon.classList.add('scale-110');
            } else {
                el.classList.remove('text-indigo-650', 'dark:text-indigo-400', 'font-black');
                el.classList.add('text-slate-500', 'dark:text-slate-400');
                if (icon) icon.classList.remove('scale-110');
            }
        });
    }

    const contentDiv = document.getElementById('app-content');
    if (!contentDiv) return;

    // Save scroll position when re-rendering the same page (after CRUD operations)
    const savedScroll = isSamePage ? contentDiv.scrollTop : 0;

    // Clean up charts before switching views
    if (window.chartInstance) {
        window.chartInstance.destroy();
        window.chartInstance = null;
    }
    if (window.sentimentChartInstance) {
        window.sentimentChartInstance.destroy();
        window.sentimentChartInstance = null;
    }

    // Remove any leftover modals from previous views
    document.querySelectorAll('.modal, .confirm-modal, #dynamic-modal').forEach(m => m.remove());
    lastNavigationTime = Date.now();

    contentDiv.innerHTML = '';

    // Trigger fade-in transition
    contentDiv.classList.remove('fade-in');
    void contentDiv.offsetWidth; // force reflow
    contentDiv.classList.add('fade-in');

    if (isError) {
        contentDiv.innerHTML = `
            <div class="flex flex-col justify-center items-center h-96 p-6 text-center">
                <div class="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-655 text-2xl mb-4 shadow-xs">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3 class="text-lg font-black text-slate-800 dark:text-white">Sinkronisasi Database Gagal</h3>
                <p class="text-sm text-slate-500 max-w-md mt-2">${errorMessage}</p>
                <div class="mt-6 flex gap-3">
                    <button onclick="syncData()" class="btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-6 py-2.5">
                        <i class="fa-solid fa-rotate animate-spin-reverse"></i> Coba Hubungkan Kembali
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Render corresponding view
    switch (page) {
        case 'dashboard': renderDashboard(contentDiv); break;
        case 'planner': renderPlanner(contentDiv); break;
        case 'rekap_rutin': renderRekapRutin(contentDiv); break;
        case 'ad_hoc': renderAdHoc(contentDiv); break;
        case 'protokoler_sep': renderProtokolerSeparate(contentDiv); break;
        case 'mc_sep': renderMcSeparate(contentDiv); break;
        case 'brs_rilis': renderBrsRilis(contentDiv); break;
        case 'hari_besar': renderHariBesar(contentDiv); break;
        case 'rekap_kegiatan': renderRekapKegiatan(contentDiv); break;
        case 'tickets': renderTickets(contentDiv); break;
        case 'monitoring': renderMonitoring(contentDiv); break;
        case 'team': renderTeam(contentDiv); break;
        case 'calendar': renderIntegratedCalendar(contentDiv); break;
        case 'settings': renderSettingsPage(contentDiv); break;
        case 'assignment': renderAssignmentPage(contentDiv); break;
        case 'repository': renderRepository(contentDiv); break;
    }

    // Restore scroll position if re-rendering same page (after save/delete)
    if (isSamePage && savedScroll > 0) {
        requestAnimationFrame(() => {
            contentDiv.scrollTop = savedScroll;
        });
    }
}

// Expose showDetail globally
window.showDetail = showDetail;

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initRealtimeWIBClock();
    initTheme();
    initSidebarState();
    checkAuth();

    // Responsive viewport listener for mobile/tablet rotation and layout adjustments
    window.addEventListener('resize', debounce(() => {
        const saved = localStorage.getItem('sim_humas_sidebar_collapsed');
        if (saved === null) {
            initSidebarState();
        }
    }, 250));

    // Close notification panel when clicking outside
    document.addEventListener('click', (e) => {
        const notifPanel = document.getElementById('notif-panel');
        const notifBtn = e.target.closest('[onclick="toggleNotificationPanel()"]');
        if (notifPanel && !notifPanel.classList.contains('hidden') && !notifPanel.contains(e.target) && !notifBtn) {
            notifPanel.classList.add('hidden');
        }
    });

    // Periodically update notifications UI if user is logged in
    setInterval(() => {
        if (currentUser) {
            renderNotificationsUI();
        }
    }, 15000);

    // Periodically sync data in the background silently (every 5 minutes)
    setInterval(() => {
        if (currentUser) {
            if (typeof window.isUserEditingOrInputting === 'function' && window.isUserEditingOrInputting()) {
                console.log('[Sync] User sedang menginput/mengedit, background sync ditunda.');
                return;
            }
            if (typeof fetchDataFromSheets === 'function') {
                fetchDataFromSheets(true);
            }
        }
    }, 300000);
});
