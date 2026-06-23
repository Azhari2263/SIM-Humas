// Main Application Controller and Router for SIM HUMAS BPS Kalbar

// Global Navigation State
var currentState = 'dashboard';
var currentEditItem = null;
var currentModalType = null;
var isSubmitting = false;
var activeSearchQuery = '';

// UI Helper: Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-all duration-300 transform translate-y-2 opacity-0 shrink-0 max-w-sm';
    
    let icon = '';
    let borderColor = '';
    if (type === 'success') {
        icon = '<i class="fa-solid fa-circle-check text-emerald-500 text-lg"></i>';
        borderColor = 'border-emerald-250 dark:border-emerald-900 shadow-emerald-100/30';
    } else if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-exclamation text-rose-500 text-lg"></i>';
        borderColor = 'border-rose-250 dark:border-rose-900 shadow-rose-100/30';
    } else if (type === 'warning') {
        icon = '<i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg"></i>';
        borderColor = 'border-amber-250 dark:border-amber-900 shadow-amber-100/30';
    } else {
        icon = '<i class="fa-solid fa-circle-info text-blue-500 text-lg"></i>';
        borderColor = 'border-blue-250 dark:border-blue-900 shadow-blue-100/30';
    }

    toast.className += ` ${borderColor}`;
    toast.innerHTML = `${icon} <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">${message}</span>`;
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

// UI Helper: Date Formatting
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    } catch (e) {
        return dateString;
    }
}

function formatDateInput(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
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

// Global Activity Logging (Audit Trail)
function logActivity(action, detail) {
    const timestamp = new Date().toISOString();
    const user = currentUser ? currentUser.name : 'Sistem';
    const newLog = {
        id: db.auditTrail.length + 1,
        user: user,
        action: action,
        timestamp: timestamp,
        detail: detail
    };
    db.auditTrail.push(newLog);
    saveLocalFallback('auditTrail');
    
    // Sync to Sheets
    sendDataToServer('add', 'audit_trail', newLog);
}

// Global System Notifications
function addNotification(title, message, role = 'all') {
    const timestamp = new Date().toISOString();
    const newNotif = {
        id: db.notifications.length + 1,
        user_role: role,
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

function renderNotificationsUI() {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!list) return;

    // Filter by role
    const myNotifs = db.notifications.filter(n => n.user_role === 'all' || n.user_role === currentUser?.role);
    const unreadCount = myNotifs.filter(n => !n.is_read).length;

    // Badge
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Populate dropdown list
    myNotifs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (myNotifs.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-[10px] text-slate-400 font-bold">Tidak ada notifikasi baru.</div>`;
        return;
    }

    list.innerHTML = myNotifs.slice(0, 5).map(n => `
        <div class="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-xl transition-all border-b border-slate-100 dark:border-slate-700 last:border-none ${!n.is_read ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}">
            <h5 class="font-extrabold text-[10px] text-slate-800 dark:text-slate-200">${n.title}</h5>
            <p class="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">${n.message}</p>
            <span class="text-[8px] text-slate-400 font-medium block mt-1"><i class="fa-regular fa-clock"></i> ${new Date(n.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
    `).join('');
}

function toggleNotificationPanel() {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.toggle('hidden');
}

function markAllNotificationsRead() {
    db.notifications.forEach(n => {
        if (n.user_role === 'all' || n.user_role === currentUser?.role) {
            n.is_read = true;
        }
    });
    saveLocalFallback('notifications');
    renderNotificationsUI();
    showToast('Notifikasi ditandai dibaca.');
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
    } else if (currentState === 'monitoring') {
        monitoringSearch = query;
        drawMonitoringTable();
    } else if (currentState === 'team') {
        teamSearch = query;
        drawTeamGrid();
    } else if (currentState === 'audit_trail') {
        auditSearch = query;
        drawAuditTrail();
    }
}

// Modal Form Operations
function openModal(type, item = null) {
    currentModalType = type;
    currentEditItem = item;
    isSubmitting = false;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'dynamic-modal';

    let title = '';
    let fields = '';

    if (type === 'content') {
        title = item ? 'Edit Rencana Konten' : 'Tambah Rencana Konten';
        fields = `
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
    } else if (type === 'rekap_rutin') {
        title = item ? 'Edit Kegiatan Rutin' : 'Tambah Kegiatan Rutin';
        fields = `
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
                            ${db.masterData.filter(m => m.kategori === 'Rubrikasi').map(m => `<option ${item?.rubrikasi === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
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
        title = item ? 'Edit Kegiatan Ad Hoc' : 'Tambah Kegiatan Ad Hoc';
        fields = `
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
        title = item ? `Edit Agenda ${isProto ? 'Protokol' : 'MC'}` : `Tambah Agenda ${isProto ? 'Protokol' : 'MC'}`;
        fields = `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Agenda / Kegiatan <span class="text-rose-500">*</span></label>
                    <input type="text" id="kegiatan" value="${item?.kegiatan || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-medium" placeholder="Contoh: Audiensi Pimpinan Bank Indonesia" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Acara <span class="text-rose-500">*</span></label>
                        <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" required>
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
                        <input type="text" id="jam_mulai" value="${item?.jam_mulai || '08:30'}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="HH:MM" required>
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
                        <input type="text" id="petugas" value="${item?.petugas || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs font-semibold" placeholder="Contoh: Siska, Dian">
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
        title = item ? 'Edit Dokumen BRS' : 'Unggah Dokumen BRS';
        fields = `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Rilis Data BRS <span class="text-rose-500">*</span></label>
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
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan PDF Highlight Data (URL)</label>
                    <input type="text" id="highlight" value="${item?.highlight || ''}" class="w-full px-4 py-2 bg-white dark:bg-slate-750 border border-slate-205 rounded-lg text-xs" placeholder="https://example.com/highlight.pdf">
                </div>
            </div>
        `;
    } else if (type === 'hari_besar') {
        title = item ? 'Edit Kalender Ucapan' : 'Tambah Kalender Ucapan';
        fields = `
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
        title = item ? 'Edit Anggota Tim' : 'Tambah Anggota Tim';
        fields = `
            <div class="space-y-4 text-slate-700 dark:text-slate-350">
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
        title = item ? 'Ubah Akun Pengguna' : 'Tambah Akun Pengguna';
        fields = `
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

    modal.innerHTML = `
        <div class="modal-content p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">${title}</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
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
        </div>
    `;
    document.body.appendChild(modal);

    // Enforce RBAC constraints for Tim Humas role on editing
    if (currentUser && currentUser.role === 'tim') {
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
        item.jam_mulai = document.getElementById('jam_mulai').value;
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
        'user_manager': 'users'
    };

    const sheetName = sheetMapping[currentModalType];

    // Notification Triggers
    if (action === 'add' && item.petugas) {
        addNotification('Penugasan Baru', `Anda menugaskan ${item.petugas} pada kegiatan: ${item.judul || item.kegiatan || item.hari_besar}.`, 'all');
    } else if (action === 'update' && item.status && currentEditItem?.status !== item.status) {
        addNotification('Pembaruan Status', `Status tugas "${item.judul || item.kegiatan}" diubah menjadi: ${item.status}.`, 'all');
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
        'user_manager': 'Akun Pengguna'
    };

    const label = auditLabels[currentModalType];
    const itemDesc = item.judul || item.kegiatan || item.nama || item.hari_besar;

    logActivity(
        action === 'add' ? 'Tambah Data' : 'Ubah Data',
        `${action === 'add' ? 'Menambahkan' : 'Mengubah'} ${label}: "${itemDesc}".`
    );

    await sendDataToServer(action, sheetName, item);

    setSubmitLoading(false);
    closeModal();
    showToast('Data berhasil disimpan ke database!');
    router(currentState);
}

// Global Delete Handler
async function deleteItem(type, id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini secara permanen dari database?')) return;

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
        'masterData': 'master_data'
    };

    const sheetName = sheetMapping[type];
    const varName = SHEET_TO_VAR[sheetName] || type;

    // Log Activity before deleting
    const item = db[varName].find(i => Number(i.id) === Number(id));
    const itemDesc = item ? (item.judul || item.kegiatan || item.nama || item.hari_besar) : `ID ${id}`;

    logActivity(
        'Hapus Data',
        `Menghapus item dari ${sheetName}: "${itemDesc}".`
    );

    // Call server
    await sendDataToServer('delete', sheetName, { id: Number(id) });
    showToast('Data berhasil dihapus dari database!');
    router(currentState);
}

// Tickets Subsystems
window.saveTicketRequest = async function(event) {
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

window.confirmApproveTicket = async function(event, id) {
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
    addNotification('Penugasan Tugas Baru', `Anda ditugaskan sebagai PIC pengerjaan: "${ticket.judul}".`, 'tim');

    await sendDataToServer('update', 'tickets', ticket);
    await sendDataToServer('add', 'content_planner', newContent);

    document.getElementById('assign-pic-modal')?.remove();
    showToast('Tiket disetujui & tugas dibuat!');
    router(currentState);
};

window.rejectTicket = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menolak pengajuan ini?')) return;
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return;

    ticket.status = 'Rejected';
    logActivity('Tolak Tiket', `Menolak permintaan layanan "${ticket.judul}".`);

    await sendDataToServer('update', 'tickets', ticket);
    showToast('Pengajuan ditolak.');
    router(currentState);
};


// Media Monitoring Simulator
window.saveMonitoringItem = async function(event) {
    event.preventDefault();
    const media = document.getElementById('mon-media').value;
    const title = document.getElementById('mon-title').value;
    const sentiment = document.getElementById('mon-sentiment').value;
    const summary = document.getElementById('mon-summary').value;
    const url = document.getElementById('mon-url').value;

    const newItem = {
        id: db.monitoring.length + 1,
        media: media,
        judul: title,
        tanggal: new Date().toISOString().split('T')[0],
        sentimen: sentiment,
        ringkasan: summary,
        url: url
    };

    logActivity('Tambah Kliping', `Menambahkan kliping media baru: "${title}" (${media}).`);
    await sendDataToServer('add', 'monitoring', newItem);
    closeModal();
    showToast('Kliping berita berhasil disimpan!');
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
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Judul Rilis Data:</strong><span class="font-extrabold text-slate-800 dark:text-white max-w-[200px] text-right">${item.judul}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Tanggal Rilis:</strong><span class="font-bold">${formatDate(item.tanggal_rilis)}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Poster & Infografis:</strong><span class="font-bold text-slate-800 dark:text-white">${item.pic_poster_info || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Dokumentasi Ruang:</strong><span class="font-bold text-slate-800 dark:text-white">${item.pic_doc_ruang || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>PIC Dok. YouTube & Zoom:</strong><span class="font-bold text-slate-800 dark:text-white">${item.pic_doc_yt_zoom || '-'}</span></div>
                <div class="flex justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700"><strong>Highlight Data:</strong><span class="font-bold">${item.highlight ? `<a href="${item.highlight}" target="_blank" class="text-indigo-650 hover:underline">Lihat PDF</a>` : '-'}</span></div>
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

// Navigation & Routing System
function router(page) {
    const allowedPages = {
        admin: ['dashboard', 'planner', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar', 'audit_trail', 'settings'],
        kepala: ['dashboard', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar', 'audit_trail'],
        koordinator: ['dashboard', 'planner', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar', 'audit_trail'],
        tim: ['dashboard', 'planner', 'rekap_rutin', 'ad_hoc', 'protokoler_sep', 'mc_sep', 'brs_rilis', 'hari_besar', 'rekap_kegiatan', 'tickets', 'monitoring', 'team', 'calendar'],
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
        case 'audit_trail': renderAuditTrail(contentDiv); break;
        case 'settings': renderSettingsPage(contentDiv); break;
    }
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    
    // Periodically update notifications UI if user is logged in
    setInterval(() => {
        if (currentUser) {
            renderNotificationsUI();
        }
    }, 15000);
});
