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
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-all duration-300 transform translate-y-2 opacity-0 shrink-0 max-w-sm';

    let icon = '';
    let borderColor = '';
    if (type === 'success') {
        icon = '<i class="fa-solid fa-circle-check text-emerald-500 text-lg"></i>';
        borderColor = 'border-l-4 border-l-emerald-500';
    } else if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-exclamation text-rose-500 text-lg"></i>';
        borderColor = 'border-l-4 border-l-rose-500';
    } else if (type === 'warning') {
        icon = '<i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg"></i>';
        borderColor = 'border-l-4 border-l-amber-500';
    } else {
        icon = '<i class="fa-solid fa-circle-info text-blue-500 text-lg"></i>';
        borderColor = 'border-l-4 border-l-blue-500';
    }

    toast.className += ` ${borderColor}`;
    toast.innerHTML = `${icon} <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1">${message}</span>`;
    container.appendChild(toast);

    // Trigger transition
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    // Auto dismiss
    setTimeout(() => {
        toast.classList.add('translate-y-[-10px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

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
 * Mendapatkan waktu "sekarang" dalam konteks WIB.
 * Selalu gunakan ini sebagai pengganti `new Date()` untuk perbandingan waktu.
 */
function getNowWIB() {
    return new Date(); // Browser sudah pakai local time (WIB jika OS diset WIB)
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
    if (!str) return null;
    if (str instanceof Date) return str;
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
    if (!dateString) return '';
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
    
    // Check if it's an ISO datetime string (like 1899-12-30T01:22:48.000Z)
    if (timeStr.includes('T')) {
        try {
            const d = new Date(timeStr);
            if (!isNaN(d.getTime())) {
                if (timeStr.startsWith('1899-12-30')) {
                    hours = String(d.getUTCHours()).padStart(2, '0');
                    minutes = String(d.getUTCMinutes()).padStart(2, '0');
                } else {
                    hours = String(d.getHours()).padStart(2, '0');
                    minutes = String(d.getMinutes()).padStart(2, '0');
                }
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
    if (!timeStr) return '08.30';
    timeStr = String(timeStr).trim();
    
    let hours = '';
    let minutes = '';
    
    if (timeStr.includes('T')) {
        try {
            const d = new Date(timeStr);
            if (!isNaN(d.getTime())) {
                if (timeStr.startsWith('1899-12-30')) {
                    hours = String(d.getUTCHours()).padStart(2, '0');
                    minutes = String(d.getUTCMinutes()).padStart(2, '0');
                } else {
                    hours = String(d.getHours()).padStart(2, '0');
                    minutes = String(d.getMinutes()).padStart(2, '0');
                }
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
        return `${hours}.${minutes}`;
    }
    
    return '08.30';
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
        'assignment': 'assignments'
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

window.showDetailById = function (type, id) {
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
    const isCollapsed = localStorage.getItem('sim_humas_sidebar_collapsed') === 'true';
    if (sidebar && isCollapsed) {
        sidebar.classList.add('collapsed');
        if (icon) icon.className = 'fa-solid fa-angles-right text-sm';
    }
}

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
// Helper to generate input fields HTML for each feature type
function getModalFieldsHTML(type, item) {
    if (type === 'content') {
        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-300">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Konten <span class="text-rose-500">*</span></label>
                    <input type="text" id="judul" value="${item?.judul || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium text-slate-800 dark:text-white" placeholder="Contoh: Rilis Data Kemiskinan Kalbar" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi Konsep <span class="text-rose-500">*</span></label>
                    <textarea id="konsep" rows="2.5" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="Deskripsikan ide visual..." required>${item?.konsep || ''}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenis</label>
                        <select id="jenis" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.jenis === 'Soft Selling' ? 'selected' : ''}>Soft Selling</option>
                            <option ${item?.jenis === 'Hard Selling' ? 'selected' : ''}>Hard Selling</option>
                            <option ${item?.jenis === 'Trend' ? 'selected' : ''}>Trend</option>
                            <option ${item?.jenis === 'Informasi' ? 'selected' : ''}>Informasi</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Post Type</label>
                        <select id="postType" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.postType === 'Carousel' ? 'selected' : ''}>Carousel</option>
                            <option ${item?.postType === 'Reels' ? 'selected' : ''}>Reels</option>
                            <option ${item?.postType === 'Single Image' ? 'selected' : ''}>Single Image</option>
                            <option ${item?.postType === 'Video' ? 'selected' : ''}>Video</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Progres (%)</label>
                        <input type="number" id="progres" value="${item?.progres || 0}" min="0" max="100" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jadwal Post <span class="text-rose-500">*</span></label>
                        <input type="date" id="jadwal" value="${formatDateInput(item?.jadwal)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs text-slate-800 dark:text-white" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.status === 'Draft' ? 'selected' : ''}>Draft</option>
                            <option ${item?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option ${item?.status === 'Done' ? 'selected' : ''}>Done</option>
                            <option ${item?.status === 'Posted' ? 'selected' : ''}>Posted</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ditugaskan ke (PIC)</label>
                        <select id="assignedTo" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.assignedTo === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'assignment') {
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
        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Kegiatan <span class="text-rose-500">*</span></label>
                    <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hari</label>
                        <select id="hari" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Hari...</option>
                            ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => `<option ${item?.hari === h ? 'selected' : ''} value="${h}">${h}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rubrikasi</label>
                        <select id="rubrikasi" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Rubrik...</option>
                            ${db.masterData.filter(m => m.kategori === 'Bidang').length > 0 ? db.masterData.filter(m => m.kategori === 'Rubrikasi').map(m => `<option ${item?.rubrikasi === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('') : '<option value="Rilis Berita Utama">Rilis Berita Utama</option>'}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Kegiatan Kehumasan <span class="text-rose-500">*</span></label>
                    <input type="text" id="kegiatan" value="${item?.kegiatan || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Publikasi Fliers Inflasi Bulanan" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Petugas Ditugaskan</label>
                        <select id="petugas" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.petugas === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Pekerjaan</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.status === 'Ditugaskan' ? 'selected' : ''}>Ditugaskan</option>
                            <option ${item?.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'ad_hoc') {
        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Penugasan <span class="text-rose-500">*</span></label>
                    <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hari</label>
                        <select id="hari" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Hari...</option>
                            ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => `<option ${item?.hari === h ? 'selected' : ''} value="${h}">${h}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jumlah Petugas</label>
                        <input type="number" id="jumlah_bertugas" value="${item?.jumlah_bertugas || 1}" min="1" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Agenda / Kegiatan <span class="text-rose-500">*</span></label>
                    <input type="text" id="kegiatan" value="${item?.kegiatan || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Rapat Koordinasi Wilayah Humas BPS" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Petugas (Pisahkan dengan koma untuk multi-person) <span class="text-rose-500">*</span></label>
                    <input type="text" id="petugas" value="${item?.petugas || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold" placeholder="Contoh: Rian, Siska, Dian" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan / Instruksi Khusus</label>
                    <textarea id="keterangan" rows="2.5" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">${item?.keterangan || ''}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Progress</label>
                    <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                        <option ${item?.status === 'Ditugaskan' ? 'selected' : ''}>Ditugaskan</option>
                        <option ${item?.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                    </select>
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
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Petugas Ditunjuk</label>
                        <select id="petugas" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.petugas === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Kegiatan</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.status === 'Ditugaskan' ? 'selected' : ''}>Ditugaskan</option>
                            <option ${item?.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan Tambahan</label>
                    <textarea id="keterangan" rows="2" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">${item?.keterangan || ''}</textarea>
                </div>
            </div>
        `;
    } else if (type === 'brs_rilis') {
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
                        <select id="pic_poster_info" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.pic_poster_info === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Dokumentasi Dalam Ruang</label>
                        <select id="pic_doc_ruang" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.pic_doc_ruang === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Dokumentasi YouTube & Zoom</label>
                    <select id="pic_doc_yt_zoom" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                        <option value="">Pilih Anggota...</option>
                        ${db.team.map(m => `<option ${item?.pic_doc_yt_zoom === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Highlight</label>
                    <input type="text" id="highlight" value="${item?.highlight || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                </div>
            </div>
        `;
    } else if (type === 'hari_besar') {
        return `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Peringatan Hari Besar <span class="text-rose-500">*</span></label>
                    <input type="text" id="hari_besar" value="${item?.hari_besar || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Hari Kemerdekaan RI" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Peringatan <span class="text-rose-500">*</span></label>
                    <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pembuat Konten (PIC)</label>
                        <select id="pembuat_konten" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.pembuat_konten === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status Pekerjaan</label>
                        <select id="status" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs">
                            <option ${item?.status === 'Draft' ? 'selected' : ''}>Draft</option>
                            <option ${item?.status === 'On Progress' ? 'selected' : ''}>On Progress</option>
                            <option ${item?.status === 'Revisi' ? 'selected' : ''}>Revisi</option>
                            <option ${item?.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan Data Pendukung / Aset (URL)</label>
                    <input type="text" id="data_pendukung" value="${item?.data_pendukung || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="https://example.com/asset.zip">
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
                        <input type="text" id="username" value="${item?.username || ''}" ${item?.username === 'admin' ? 'readonly' : ''} class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs font-medium" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Seksi/Bidang Kerja</label>
                        <select id="bidang" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs">
                            <option value="">Pilih Bidang...</option>
                            ${db.masterData.filter(m => m.kategori === 'Bidang').map(m => `<option ${item?.bidang === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hak Akses Peran (Role)</label>
                    <select id="role" class="w-full px-4 py-2 bg-white dark:bg-slate-755 border border-slate-205 rounded-lg text-xs">
                        <option ${item?.role === 'admin' ? 'selected' : ''} value="admin">Administrator Sistem</option>
                        <option ${item?.role === 'kepala' ? 'selected' : ''} value="kepala">Kepala BPS</option>
                        <option ${item?.role === 'koordinator' ? 'selected' : ''} value="koordinator">Koordinator Humas</option>
                        <option ${item?.role === 'tim' ? 'selected' : ''} value="tim">Tim Humas</option>
                        <option ${item?.role === 'pemohon' ? 'selected' : ''} value="pemohon">Pegawai/Pemohon</option>
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
            'user_manager': 'Ubah Akun Pengguna'
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
            'user_manager': 'Akun Pengguna'
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
    const schemas = {
        'content': ["judul", "konsep", "jenis", "postType", "progres", "jadwal", "status", "assignedTo"],
        'rekap_rutin': ["tanggal", "hari", "rubrikasi", "kegiatan", "petugas", "status"],
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
        'content': ["Infografis Inflasi Juni 2026", "Menampilkan data inflasi Kalbar bulanan", "Infografis", "Feeds", 50, "2026-06-25", "Draft", "Azhari"],
        'rekap_rutin': ["2026-06-24", "Rabu", "Humas", "Rapat Koordinasi Mingguan", "Rian", "Selesai"],
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
            ["konsep", "Opsional. Konsep atau deskripsi konten.", "Bebas"],
            ["jenis", "Opsional. Jenis media konten.", "Infografis, Video, Artikel, Rilis, Hari Besar"],
            ["postType", "Opsional. Tipe postingan.", "Feeds, Story, Reels, IGTV, Website"],
            ["progres", "Opsional. Angka kemajuan (0-100).", "0 s/d 100"],
            ["jadwal", "Wajib. Tanggal tayang konten (Format: YYYY-MM-DD).", "Contoh: 2026-06-25"],
            ["status", "Opsional. Status pengerjaan.", "Rencana, Draft, Posting, Selesai"],
            ["assignedTo", "Opsional. Nama petugas penanggung jawab.", "Bebas (Nama anggota tim)"]
        ],
        'rekap_rutin': [
            ["Nama Kolom", "Keterangan Aturan", "Pilihan Nilai Valid"],
            ["tanggal", "Wajib. Tanggal kegiatan (Format: YYYY-MM-DD).", "Contoh: 2026-06-24"],
            ["hari", "Opsional. Nama hari pelaksanaan.", "Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu"],
            ["rubrikasi", "Opsional. Kategori rubrikasi kegiatan.", "Bebas"],
            ["kegiatan", "Wajib. Deskripsi kegiatan rutin.", "Bebas"],
            ["petugas", "Opsional. Nama petugas pelaksana.", "Bebas"],
            ["status", "Opsional. Status pelaksanaan.", "Ditugaskan, Selesai"]
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

window.handleExcelUpload = function(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        showToast('Library parsing Excel belum terpasang/gagal dimuat.', 'error');
        return;
    }

    showToast('Sedang memproses berkas Excel...', 'info');

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

            if (jsonData.length === 0) {
                showToast('Berkas Excel kosong atau format kolom salah.', 'error');
                return;
            }

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
                'content': ["judul", "konsep", "jenis", "postType", "progres", "jadwal", "status", "assignedTo"],
                'rekap_rutin': ["tanggal", "hari", "rubrikasi", "kegiatan", "petugas", "status"],
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

            for (let row of jsonData) {
                const item = {};
                fields.forEach(f => {
                    item[f] = row[f] !== undefined ? row[f] : "";
                });

                if (type === 'ad_hoc' && item.jumlah_bertugas !== "") {
                    item.jumlah_bertugas = Number(item.jumlah_bertugas);
                }
                if ((type === 'content' || type === 'assignment') && item.progres !== "") {
                    item.progres = Number(item.progres);
                }

                // Generate ID
                const maxId = db[varName].reduce((max, i) => Math.max(max, Number(i.id) || 0), 0);
                item.id = maxId + 1;

                if (type === 'user_manager') {
                    item.password = 'password'; 
                }

                // Simpan local & server
                await sendDataToServer('add', sheetName, item);
                successCount++;
            }

            closeModal();
            showToast(`Berhasil mengimpor ${successCount} data dari Excel!`);
            router(currentState);

        } catch (error) {
            console.error('Import error:', error);
            showToast('Gagal memproses file Excel. Pastikan format kolom sesuai template.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
};



function closeModal() {
    const modal = document.getElementById('dynamic-modal');
    if (modal) modal.remove();
    currentEditItem = null;
    currentModalType = null;
    isSubmitting = false;
}

// Form Validation helper
function validateFormInput(type, data) {
    if (type === 'content' && (!data.judul || !data.konsep || !data.jadwal)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'rekap_rutin' && (!data.tanggal || !data.kegiatan)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'ad_hoc' && (!data.tanggal || !data.kegiatan || !data.petugas)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'protokoler' && (!data.kegiatan || !data.tanggal || !data.lokasi || !data.jam_mulai)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'mc' && (!data.kegiatan || !data.tanggal || !data.lokasi || !data.jam_mulai)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'brs_rilis' && (!data.judul || !data.tanggal_rilis)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'hari_besar' && (!data.hari_besar || !data.tanggal)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'team' && (!data.nama || !data.jabatan || !data.tugas || !data.kontak)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'user_manager' && (!data.nama || !data.username)) return 'Kolom bertanda bintang (*) wajib diisi.';
    if (type === 'assignment' && (!data.tugas || !data.deskripsi || !data.tanggal_penugasan || !data.deadline || !data.assigned_to)) return 'Kolom bertanda bintang (*) wajib diisi.';
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
        item.konsep = document.getElementById('konsep').value;
        item.jenis = document.getElementById('jenis').value;
        item.postType = document.getElementById('postType').value;
        item.progres = Number(document.getElementById('progres').value);
        item.jadwal = document.getElementById('jadwal').value;
        item.status = document.getElementById('status').value;
        item.assignedTo = document.getElementById('assignedTo').value;
    } else if (currentModalType === 'assignment') {
        item.tugas = document.getElementById('tugas').value;
        item.deskripsi = document.getElementById('deskripsi').value;
        item.prioritas = document.getElementById('prioritas').value;
        item.status = document.getElementById('status').value;
        item.tanggal_penugasan = document.getElementById('tanggal_penugasan').value;
        item.deadline = document.getElementById('deadline').value;
        item.progres = Number(document.getElementById('progres').value);
        item.assigned_to = document.getElementById('assigned_to').value;
        item.lampiran = document.getElementById('lampiran').value;
    } else if (currentModalType === 'rekap_rutin') {
        item.tanggal = document.getElementById('tanggal').value;
        item.hari = document.getElementById('hari').value;
        item.rubrikasi = document.getElementById('rubrikasi').value;
        item.kegiatan = document.getElementById('kegiatan').value;
        item.petugas = document.getElementById('petugas').value;
        item.status = document.getElementById('status').value;
    } else if (currentModalType === 'ad_hoc') {
        item.tanggal = document.getElementById('tanggal').value;
        item.hari = document.getElementById('hari').value;
        item.kegiatan = document.getElementById('kegiatan').value;
        item.jumlah_bertugas = Number(document.getElementById('jumlah_bertugas').value);
        item.petugas = document.getElementById('petugas').value;
        item.keterangan = document.getElementById('keterangan').value;
        item.status = document.getElementById('status').value;
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
    } else if (currentModalType === 'brs_rilis') {
        item.judul = document.getElementById('judul').value;
        item.tanggal_rilis = document.getElementById('tanggal_rilis').value;
        item.pic_poster_info = document.getElementById('pic_poster_info').value;
        item.pic_doc_ruang = document.getElementById('pic_doc_ruang').value;
        item.pic_doc_yt_zoom = document.getElementById('pic_doc_yt_zoom').value;
        item.highlight = document.getElementById('highlight').value;
    } else if (currentModalType === 'hari_besar') {
        item.hari_besar = document.getElementById('hari_besar').value;
        item.tanggal = document.getElementById('tanggal').value;
        item.pembuat_konten = document.getElementById('pembuat_konten').value;
        item.status = document.getElementById('status').value;
        item.data_pendukung = document.getElementById('data_pendukung').value;
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
        item.password = 'password';
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
        'assignment': 'assignments'
    };

    const sheetName = sheetMapping[currentModalType];

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
        'assignment': 'assignments'
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
window.saveTicketRequest = async function (event) {
    event.preventDefault();
    const judul = document.getElementById('req-title').value;
    const jenis = document.getElementById('req-type').value;
    const deadline = document.getElementById('req-deadline').value;
    const detail = document.getElementById('req-detail').value;

    const newTicket = {
        id: db.tickets.length + 1,
        pengaju: currentUser.name,
        bidang: currentUser.bidang || 'Internal',
        jenis: jenis,
        judul: judul,
        deadline: deadline,
        detail: detail,
        status: 'Pending',
        pic: ''
    };

    logActivity('Buat Pengajuan', `Mengirim permintaan layanan baru: "${judul}".`);
    addNotification('Pengajuan Layanan Baru', `Permintaan layanan "${judul}" berhasil diajukan dan sedang menunggu persetujuan.`, 'koordinator');

    await sendDataToServer('add', 'tickets', newTicket);
    closeModal();
    showToast('Pengajuan layanan berhasil dikirim!');
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
        jenis: 'Informasi',
        postType: ticket.jenis === 'Pembuatan Video' ? 'Video' : 'Single Image',
        progres: 10,
        jadwal: ticket.deadline,
        status: 'In Progress',
        assignedTo: pic
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
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Portal Media <span class="text-rose-500">*</span></label>
                            <input type="text" id="mon-media" value="${item?.media || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-600 rounded-lg text-xs font-medium dark:text-white" placeholder="Contoh: Tribun Pontianak" required>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sentimen <span class="text-rose-500">*</span></label>
                            <select id="mon-sentiment" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 dark:border-slate-600 rounded-lg text-xs dark:text-white" required>
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
    const title = document.getElementById('mon-title').value;
    const sentiment = document.getElementById('mon-sentiment').value;
    const summary = document.getElementById('mon-summary').value;
    const url = document.getElementById('mon-url').value;

    if (editId) {
        // Edit mode
        const existing = db.monitoring.find(m => m.id === editId);
        if (!existing) return;
        existing.media = media;
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
    let content = '';

    if (type === 'content') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Judul Konten:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.judul}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Deskripsi Konsep:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${item.konsep || 'Tidak ada konsep.'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Jenis Promosi:</strong><span class="font-bold">${item.jenis}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Post Type:</strong><span class="font-bold">${item.postType}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Target Jadwal:</strong><span class="font-bold text-rose-600">${formatDate(item.jadwal)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Progres Kerja:</strong><span class="font-black text-indigo-650">${item.progres}%</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Ditugaskan:</strong><span class="font-bold text-slate-800 dark:text-white">${item.assignedTo || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status Konten:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${item.status}</span></div>
            </div>
        `;
    } else if (type === 'protokoler' || type === 'mc') {
        const isProto = type === 'protokoler';
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Agenda:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.kegiatan}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal & Waktu:</strong><span class="font-bold">${formatDate(item.tanggal)} - ${item.jam_mulai || '08:30'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Lokasi Acara:</strong><span class="font-bold">${item.lokasi || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Jenis Agenda:</strong><span class="font-bold">${item.jenis || 'Internal'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Level Keprotokolan:</strong><span class="font-bold">${item.level || 'Formal'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Petugas ${isProto ? 'Protokol' : 'MC'}:</strong><span class="font-extrabold text-indigo-650 dark:text-indigo-400">${item.petugas || '-'}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Keterangan Acara:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${item.keterangan || 'Tidak ada keterangan tambahan.'}</span></div>
            </div>
        `;
    } else if (type === 'brs_rilis') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Judul Kegiatan Rilis:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.judul}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal Rilis:</strong><span class="font-bold">${formatDate(item.tanggal_rilis)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Poster & Infografis:</strong><span class="font-bold text-slate-800 dark:text-white">${item.pic_poster_info || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Dokumentasi Ruang:</strong><span class="font-bold text-slate-800 dark:text-white">${item.pic_doc_ruang || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Dok. YouTube & Zoom:</strong><span class="font-bold text-slate-800 dark:text-white">${item.pic_doc_yt_zoom || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Highlight Data:</strong><span class="font-bold">${item.highlight ? `<a href="${item.highlight}" target="_blank" class="text-indigo-650 hover:underline">Lihat PDF</a>` : '-'}</span></div>
            </div>
        `;
    } else if (type === 'rekap_rutin') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Kegiatan:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.kegiatan}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal & Hari:</strong><span class="font-bold">${formatDate(item.tanggal)} (${item.hari || '-'})</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Rubrikasi:</strong><span class="font-bold text-indigo-650 dark:text-indigo-400">${item.rubrikasi || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Petugas Humas:</strong><span class="font-bold text-slate-800 dark:text-white">${item.petugas || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${item.status || '-'}</span></div>
            </div>
        `;
    } else if (type === 'ad_hoc') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Kegiatan:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.kegiatan}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal & Hari:</strong><span class="font-bold">${formatDate(item.tanggal)} (${item.hari || '-'})</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Jumlah Bertugas:</strong><span class="font-bold">${item.jumlah_bertugas || 1} orang</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Petugas:</strong><span class="font-bold text-slate-800 dark:text-white">${item.petugas || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${item.status || '-'}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Keterangan:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${item.keterangan || 'Tidak ada keterangan tambahan.'}</span></div>
            </div>
        `;
    } else if (type === 'hari_besar') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Ucapan Hari Besar:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.hari_besar}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal:</strong><span class="font-bold">${formatDate(item.tanggal)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Pembuat Konten (PIC):</strong><span class="font-bold text-slate-800 dark:text-white">${item.pembuat_konten || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status Konten:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${item.status || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Aset Pendukung:</strong><span class="font-bold">${item.data_pendukung ? `<a href="${item.data_pendukung}" target="_blank" class="text-indigo-650 hover:underline">Buka Link Aset</a>` : '-'}</span></div>
            </div>
        `;
    } else if (type === 'team') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="text-center pb-4">
                    <div class="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-700 ${getAvatarBg(item.nama)} mx-auto flex items-center justify-center font-black text-lg shadow-sm">${getPicInitials(item.nama)}</div>
                    <h4 class="font-extrabold text-slate-800 dark:text-white text-sm mt-3">${item.nama}</h4>
                    <p class="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest mt-1">${item.jabatan}</p>
                </div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Bidang Kerja:</strong><span class="font-semibold">${item.bidang}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>No. Kontak WA:</strong><span class="font-bold text-slate-700 dark:text-slate-300">${item.kontak}</span></div>
                <div class="flex flex-col gap-1"><strong>Tugas Utama Kehumasan:</strong><p class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px] mt-1">${item.tugas || '-'}</p></div>
            </div>
        `;
    } else if (type === 'assignment') {
        content = `
            <div class="space-y-4 text-xs text-slate-655 dark:text-slate-300 font-sans">
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Nama Tugas:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.tugas}</span></div>
                <div class="flex flex-col gap-1 border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Deskripsi:</strong><span class="leading-relaxed bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[11px]">${item.deskripsi || 'Tidak ada deskripsi.'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Prioritas:</strong><span class="font-bold">${item.prioritas || 'Sedang'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Status:</strong><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold uppercase tracking-wider text-[9px]">${item.status || 'Belum Mulai'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal Ditugaskan:</strong><span class="font-bold">${formatDate(item.tanggal_penugasan)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Deadline:</strong><span class="font-bold text-rose-600">${formatDate(item.deadline)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Progres Kerja:</strong><span class="font-black text-indigo-650">${item.progres || 0}%</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Diberikan Kepada:</strong><span class="font-bold text-slate-800 dark:text-white">${item.assigned_to || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Lampiran:</strong><span class="font-bold">${item.lampiran ? `<a href="${item.lampiran}" target="_blank" class="text-indigo-650 dark:text-indigo-400 hover:underline">Buka Tautan</a>` : '-'}</span></div>
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
    const allowedPages = {
        admin: ['dashboard', 'planner', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar', 'settings', 'assignment'],
        kepala: ['dashboard', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar'],
        koordinator: ['dashboard', 'planner', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar'],
        tim: ['dashboard', 'calendar', 'assignment', 'rekap_kegiatan', 'monitoring'],
        pemohon: ['dashboard', 'tickets']
    };

    const userRole = currentUser ? currentUser.role : 'pemohon';

    // Safety redirect to dashboard if role doesn't have access
    if (!allowedPages[userRole].includes(page)) {
        page = 'dashboard';
    }

    currentState = page;

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

    const contentDiv = document.getElementById('app-content');
    if (!contentDiv) return;

    // Save scroll position when re-rendering the same page (after CRUD operations)
    const isSamePage = (page === currentState);
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
    initTheme();
    initSidebarState();
    checkAuth();

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
            if (typeof fetchDataFromSheets === 'function') {
                fetchDataFromSheets(true);
            }
        }
    }, 300000);
});
