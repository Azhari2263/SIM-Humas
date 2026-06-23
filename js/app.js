// Main Application Controller and Router for SIM HUMAS BPS Kalbar

// Global Navigation State
var currentState = 'dashboard';
var currentEditItem = null;
var currentModalType = null;
var isSubmitting = false;

// UI Helper: Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-lg border bg-white/95 backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 shrink-0 max-w-sm';
    
    let icon = '';
    let borderColor = '';
    if (type === 'success') {
        icon = '<i class="fa-solid fa-circle-check text-emerald-500 text-lg"></i>';
        borderColor = 'border-emerald-250 shadow-emerald-100/30';
    } else if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-exclamation text-rose-500 text-lg"></i>';
        borderColor = 'border-rose-250 shadow-rose-100/30';
    } else {
        icon = '<i class="fa-solid fa-circle-info text-blue-500 text-lg"></i>';
        borderColor = 'border-blue-250 shadow-blue-100/30';
    }

    toast.className += ` ${borderColor}`;
    toast.innerHTML = `${icon} <span class="text-xs font-semibold text-slate-800">${message}</span>`;
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
            <div class="space-y-4 text-slate-700">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Konten <span class="text-rose-500">*</span></label>
                    <input type="text" id="judul" value="${item?.judul || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Contoh: Rilis Data Inflasi Mei" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi Konsep <span class="text-rose-500">*</span></label>
                    <textarea id="konsep" rows="2.5" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-700" placeholder="Deskripsikan visualisasi data atau ide kreatif..." required>${item?.konsep || ''}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenis</label>
                        <select id="jenis" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                            <option ${item?.jenis === 'Soft Selling' ? 'selected' : ''}>Soft Selling</option>
                            <option ${item?.jenis === 'Hard Selling' ? 'selected' : ''}>Hard Selling</option>
                            <option ${item?.jenis === 'Trend' ? 'selected' : ''}>Trend</option>
                            <option ${item?.jenis === 'Informasi' ? 'selected' : ''}>Informasi</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Post Type</label>
                        <select id="postType" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
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
                        <input type="number" id="progres" value="${item?.progres || 0}" min="0" max="100" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jadwal Post <span class="text-rose-500">*</span></label>
                        <input type="date" id="jadwal" value="${formatDateInput(item?.jadwal)}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                        <select id="status" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                            <option ${item?.status === 'Draft' ? 'selected' : ''}>Draft</option>
                            <option ${item?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option ${item?.status === 'Done' ? 'selected' : ''}>Done</option>
                            <option ${item?.status === 'Posted' ? 'selected' : ''}>Posted</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ditugaskan ke (PIC)</label>
                        <select id="assignedTo" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.assignedTo === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'schedule') {
        title = item ? 'Edit Jadwal Rilis BRS' : 'Tambah Jadwal Rilis BRS';
        fields = `
            <div class="space-y-4 text-slate-700">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Rilis Statistik <span class="text-rose-500">*</span></label>
                    <input type="text" id="judul" value="${item?.judul || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Contoh: BRS Inflasi & NTP Juni 2026" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Rilis <span class="text-rose-500">*</span></label>
                    <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Pembuat Poster</label>
                        <select id="pic_poster" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.pic_poster === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Infografis / Informasi</label>
                        <select id="pic_info" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.pic_info === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Dokumentasi Rilis</label>
                        <select id="pic_doc" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.pic_doc === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Highlight & Video Reels</label>
                        <select id="pic_high" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                            <option value="">Pilih Anggota...</option>
                            ${db.team.map(m => `<option ${item?.pic_high === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'protocol') {
        title = item ? 'Edit Kegiatan Protokol' : 'Tambah Kegiatan Protokol';
        fields = `
            <div class="space-y-4 text-slate-700">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Kegiatan / Agenda <span class="text-rose-500">*</span></label>
                    <input type="text" id="kegiatan" value="${item?.kegiatan || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Contoh: Audiensi Kakanwil DJPb Kalbar" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pendamping Pimpinan <span class="text-rose-500">*</span></label>
                        <input type="text" id="pimpinan" value="${item?.pimpinan || 'Kepala BPS Prov. Kalbar'}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Level Protokoler</label>
                        <select id="level" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                            <option ${item?.level === 'Formal' ? 'selected' : ''}>Formal</option>
                            <option ${item?.level === 'Non-Formal' ? 'selected' : ''}>Non-Formal</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Lokasi Kegiatan <span class="text-rose-500">*</span></label>
                    <input type="text" id="lokasi" value="${item?.lokasi || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" placeholder="Contoh: Aula BPS Provinsi Kalbar" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Petugas Protokol / MC (Pisahkan dengan koma)</label>
                    <input type="text" id="petugas" value="${item?.petugas || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" placeholder="Contoh: Dian, Rian">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Kegiatan <span class="text-rose-500">*</span></label>
                    <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" required>
                </div>
            </div>
        `;
    } else if (type === 'team') {
        title = item ? 'Edit Anggota Tim Humas' : 'Tambah Anggota Tim Humas';
        fields = `
            <div class="space-y-4 text-slate-700">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap <span class="text-rose-500">*</span></label>
                    <input type="text" id="nama" value="${item?.nama || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Contoh: Azhari" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jabatan <span class="text-rose-500">*</span></label>
                        <input type="text" id="jabatan" value="${item?.jabatan || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" placeholder="Contoh: Pranata Humas" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bidang / Seksi Kerja <span class="text-rose-500">*</span></label>
                        <input type="text" id="bidang" value="${item?.bidang || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" placeholder="Contoh: Humas & Protokol" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Uraian Tugas Utama Kehumasan <span class="text-rose-500">*</span></label>
                    <textarea id="tugas" rows="2.5" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-700" placeholder="Contoh: Mengatur rilis data, caption media sosial..." required>${item?.tugas || ''}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">No. Telepon / Kontak <span class="text-rose-500">*</span></label>
                    <input type="text" id="kontak" value="${item?.kontak || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Contoh: 08123456789" required>
                </div>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content p-6 shadow-2xl border border-slate-100">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 class="text-lg font-black text-slate-900">${title}</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="saveData(event)">
                ${fields}
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
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
}

function closeModal() {
    const modal = document.getElementById('dynamic-modal');
    if (modal) modal.remove();
    currentEditItem = null;
    currentModalType = null;
    isSubmitting = false;
}

// Input validation helper
function validateFormInput(type, data) {
    if (type === 'content') {
        if (!data.judul.trim()) return 'Judul konten tidak boleh kosong!';
        if (!data.konsep.trim()) return 'Konsep rincian wajib diisi!';
        if (isNaN(data.progres) || data.progres < 0 || data.progres > 100) return 'Progres pengerjaan harus antara 0% s.d 100%!';
        if (!data.jadwal) return 'Tanggal jadwal tayang wajib dipilih!';
    } else if (type === 'schedule') {
        if (!data.judul.trim()) return 'Judul rilis BRS tidak boleh kosong!';
        if (!data.tanggal) return 'Tanggal rilis statistik wajib diisi!';
    } else if (type === 'protocol') {
        if (!data.kegiatan.trim()) return 'Nama kegiatan tidak boleh kosong!';
        if (!data.pimpinan.trim()) return 'Nama pendamping pimpinan tidak boleh kosong!';
        if (!data.lokasi.trim()) return 'Lokasi kegiatan wajib dicantumkan!';
        if (!data.tanggal) return 'Tanggal kegiatan wajib dipilih!';
    } else if (type === 'team') {
        if (!data.nama.trim()) return 'Nama lengkap wajib diisi!';
        if (!data.jabatan.trim()) return 'Jabatan struktural tidak boleh kosong!';
        if (!data.bidang.trim()) return 'Bidang/seksi kerja wajib diisi!';
        if (!data.tugas.trim()) return 'Uraian tugas tidak boleh kosong!';
        if (!data.kontak.trim()) return 'Nomor kontak/telepon wajib diisi!';
        if (!/^\d+$/.test(data.kontak.replace(/[\s\-\+]/g, ''))) return 'Nomor kontak hanya boleh berisi angka!';
    } else if (type === 'ticket_request') {
        if (!data.judul.trim()) return 'Judul permintaan tidak boleh kosong!';
        if (!data.deadline) return 'Batas waktu (deadline) wajib ditentukan!';
        if (!data.detail.trim()) return 'Detail rincian deskripsi wajib diisi!';
    } else if (type === 'asset_upload') {
        if (!data.nama.trim()) return 'Nama berkas aset wajib diisi!';
    } else if (type === 'add_monitoring') {
        if (!data.media.trim()) return 'Nama portal media tidak boleh kosong!';
        if (!data.judul.trim()) return 'Judul headline berita wajib diisi!';
        if (!data.ringkasan.trim()) return 'Kliping ringkasan berita tidak boleh kosong!';
        if (!data.url.trim() || !data.url.startsWith('http')) return 'Tautan URL berita tidak valid!';
    }
    return null;
}

// Disable submit button inside modal
function setSubmitLoading(loading) {
    isSubmitting = loading;
    const btn = document.getElementById('modal-submit-btn');
    if (!btn) return;
    
    if (loading) {
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Menyimpan...`;
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-70', 'cursor-not-allowed');
        btn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan Data`;
    }
}

// Save data handler (Content, Schedule, Protocol, Team)
async function saveData(event) {
    event.preventDefault();
    if (isSubmitting) return;

    let sheetName = '';
    let newItem = {};
    
    if (currentModalType === 'content') {
        sheetName = 'content_planner';
        newItem = {
            id: currentEditItem?.id || Date.now(),
            judul: document.getElementById('judul').value,
            konsep: document.getElementById('konsep').value,
            jenis: document.getElementById('jenis').value,
            postType: document.getElementById('postType').value,
            progres: parseInt(document.getElementById('progres').value || 0),
            jadwal: document.getElementById('jadwal').value,
            status: document.getElementById('status').value,
            assignedTo: document.getElementById('assignedTo').value
        };
    } else if (currentModalType === 'schedule') {
        sheetName = 'brs_schedule';
        newItem = {
            id: currentEditItem?.id || Date.now(),
            judul: document.getElementById('judul').value,
            tanggal: document.getElementById('tanggal').value,
            pic_poster: document.getElementById('pic_poster').value,
            pic_info: document.getElementById('pic_info').value,
            pic_doc: document.getElementById('pic_doc').value,
            pic_high: document.getElementById('pic_high').value
        };
    } else if (currentModalType === 'protocol') {
        sheetName = 'protocol';
        newItem = {
            id: currentEditItem?.id || Date.now(),
            kegiatan: document.getElementById('kegiatan').value,
            pimpinan: document.getElementById('pimpinan').value,
            level: document.getElementById('level').value,
            lokasi: document.getElementById('lokasi').value,
            petugas: document.getElementById('petugas').value,
            tanggal: document.getElementById('tanggal').value
        };
    } else if (currentModalType === 'team') {
        sheetName = 'team';
        newItem = {
            id: currentEditItem?.id || Date.now(),
            nama: document.getElementById('nama').value,
            jabatan: document.getElementById('jabatan').value,
            bidang: document.getElementById('bidang').value,
            tugas: document.getElementById('tugas').value,
            kontak: document.getElementById('kontak').value
        };
    }

    // Validate inputs
    const errorMsg = validateFormInput(currentModalType, newItem);
    if (errorMsg) {
        showToast(errorMsg, 'error');
        return;
    }

    setSubmitLoading(true);

    const action = currentEditItem ? 'update' : 'add';
    
    // Update local state temporarily (Optimistic UI)
    if (currentModalType === 'content') {
        if (currentEditItem) {
            const idx = db.contentPlanner.findIndex(i => i.id === currentEditItem.id);
            if (idx !== -1) db.contentPlanner[idx] = newItem;
        } else {
            db.contentPlanner.push(newItem);
        }
    } else if (currentModalType === 'schedule') {
        if (currentEditItem) {
            const idx = db.brsSchedule.findIndex(i => i.id === currentEditItem.id);
            if (idx !== -1) db.brsSchedule[idx] = newItem;
        } else {
            db.brsSchedule.push(newItem);
        }
    } else if (currentModalType === 'protocol') {
        if (currentEditItem) {
            const idx = db.protocol.findIndex(i => i.id === currentEditItem.id);
            if (idx !== -1) db.protocol[idx] = newItem;
        } else {
            db.protocol.push(newItem);
        }
    } else if (currentModalType === 'team') {
        if (currentEditItem) {
            const idx = db.team.findIndex(i => i.id === currentEditItem.id);
            if (idx !== -1) db.team[idx] = newItem;
        } else {
            db.team.push(newItem);
        }
    }

    router(currentState);
    closeModal();

    // Call API to sync database
    await sendDataToServer(action, sheetName, newItem);
}

// Global Delete Handler for all entities
async function deleteItem(type, id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini secara permanen dari server database?')) {
        let sheetName = '';
        let itemToDelete = null;

        if (type === 'content') {
            sheetName = 'content_planner';
            itemToDelete = db.contentPlanner.find(i => i.id === id);
            db.contentPlanner = db.contentPlanner.filter(i => i.id !== id);
        } else if (type === 'schedule') {
            sheetName = 'brs_schedule';
            itemToDelete = db.brsSchedule.find(i => i.id === id);
            db.brsSchedule = db.brsSchedule.filter(i => i.id !== id);
        } else if (type === 'protocol') {
            sheetName = 'protocol';
            itemToDelete = db.protocol.find(i => i.id === id);
            db.protocol = db.protocol.filter(i => i.id !== id);
        } else if (type === 'team') {
            sheetName = 'team';
            itemToDelete = db.team.find(i => i.id === id);
            db.team = db.team.filter(i => i.id !== id);
        } else if (type === 'tickets') {
            sheetName = 'tickets';
            itemToDelete = db.tickets.find(i => i.id === id);
            db.tickets = db.tickets.filter(i => i.id !== id);
        } else if (type === 'assets') {
            sheetName = 'assets';
            itemToDelete = db.assets.find(i => i.id === id);
            db.assets = db.assets.filter(i => i.id !== id);
        } else if (type === 'monitoring') {
            sheetName = 'monitoring';
            itemToDelete = db.monitoring.find(i => i.id === id);
            db.monitoring = db.monitoring.filter(i => i.id !== id);
        }

        if (itemToDelete) {
            router(currentState);
            showToast('Menghapus data di database...');
            await sendDataToServer('delete', sheetName, itemToDelete);
        }
    }
}

// CRUD: Tickets integration
window.saveTicketRequest = async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    const newTicket = {
        id: Date.now(),
        pengaju: currentUser.name || "Seksi Sosial",
        bidang: currentUser.role === 'internal' ? "Seksi Sosial" : "Statistik",
        jenis: document.getElementById('req-type').value,
        judul: document.getElementById('req-title').value,
        deadline: document.getElementById('req-deadline').value,
        detail: document.getElementById('req-detail').value,
        status: "Pending",
        pic: ""
    };

    // Validation
    const err = validateFormInput('ticket_request', newTicket);
    if (err) {
        showToast(err, 'error');
        return;
    }

    db.tickets.push(newTicket);
    closeModal();
    router('tickets');

    showToast("Mengirim permintaan layanan ke database...");
    await sendDataToServer('add', 'tickets', newTicket);
};

window.confirmApproveTicket = async function (event, ticketId) {
    event.preventDefault();
    const ticket = db.tickets.find(t => t.id === ticketId);
    const picName = document.getElementById('assign-pic-select').value;

    if (!picName) {
        showToast('Pilih petugas humas terlebih dahulu!', 'error');
        return;
    }

    if (ticket) {
        ticket.status = 'Approved';
        ticket.pic = picName;

        // Auto spawn content planner task
        const newContent = {
            id: Date.now(),
            judul: `[TIKET] ${ticket.judul}`,
            konsep: `Permintaan dari ${ticket.pengaju}. Rincian: ${ticket.detail}`,
            jenis: ticket.jenis === 'Infografis' ? 'Soft Selling' : 'Informasi',
            postType: ticket.jenis === 'Pembuatan Video' ? 'Reels' : 'Carousel',
            progres: 0,
            jadwal: ticket.deadline,
            status: 'In Progress',
            assignedTo: picName
        };

        db.contentPlanner.push(newContent);
        
        const modalEl = document.getElementById('assign-pic-modal');
        if (modalEl) modalEl.remove();
        
        router('tickets');

        showToast(`Memproses persetujuan tiket dan membuat kartu konten...`);
        // Sync both items
        await sendDataToServer('update', 'tickets', ticket);
        await sendDataToServer('add', 'content_planner', newContent);
    }
};

window.rejectTicket = async function (id) {
    if (confirm("Apakah Anda yakin ingin menolak permintaan ini?")) {
        const ticket = db.tickets.find(t => t.id === id);
        if (ticket) {
            ticket.status = 'Rejected';
            router('tickets');
            showToast("Menyimpan status penolakan...");
            await sendDataToServer('update', 'tickets', ticket);
        }
    }
};

// CRUD: Assets integration
window.saveAssetUpload = async function (event) {
    event.preventDefault();
    const fileInput = document.getElementById('asset-file');
    const fileName = document.getElementById('asset-name').value;
    const fileCat = document.getElementById('asset-cat').value;

    if (!fileName.trim()) {
        showToast('Nama aset wajib diisi!', 'error');
        return;
    }

    let fileSize = "1.8 MB";
    if (fileInput.files && fileInput.files[0]) {
        const bytes = fileInput.files[0].size;
        fileSize = (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    // Unsplash sample cover backgrounds based on category to replace placeholders dynamically
    const categoryCovers = {
        'Template': 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=300',
        'Logo': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300',
        'Foto': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300',
        'Dokumen': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=300'
    };

    const newAsset = {
        id: Date.now(),
        nama: fileName,
        kategori: fileCat,
        ukuran: fileSize,
        pengunggah: currentUser.name || "Staf Humas",
        tanggal: new Date().toISOString().split('T')[0],
        preview: categoryCovers[fileCat] || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300'
    };

    db.assets.push(newAsset);
    closeModal();
    router('assets');
    
    showToast("Mengunggah aset visual ke database...");
    await sendDataToServer('add', 'assets', newAsset);
};

// CRUD: Media Monitoring integration
window.saveMonitoringItem = async function (event) {
    event.preventDefault();
    
    const newMon = {
        id: Date.now(),
        media: document.getElementById('mon-media').value,
        judul: document.getElementById('mon-title').value,
        tanggal: new Date().toISOString().split('T')[0],
        sentimen: document.getElementById('mon-sentiment').value,
        ringkasan: document.getElementById('mon-summary').value,
        url: document.getElementById('mon-url').value
    };

    const err = validateFormInput('add_monitoring', newMon);
    if (err) {
        showToast(err, 'error');
        return;
    }

    db.monitoring.push(newMon);
    closeModal();
    router('monitoring');

    showToast("Menyimpan kliping berita ke database...");
    await sendDataToServer('add', 'monitoring', newMon);
};

// Global Detail Modal View
function showDetail(type, item) {
    let content = '';
    if (type === 'content') {
        content = `
            <div class="space-y-4 text-slate-700">
                <div class="bg-indigo-50/50 border border-indigo-100/60 p-4 rounded-xl">
                    <p class="text-[10px] text-indigo-650 font-bold uppercase tracking-wider">Judul Konten</p>
                    <p class="font-extrabold text-base text-slate-800 mt-1">${item.judul}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jenis</p>
                        <p class="font-semibold text-xs text-slate-800 mt-1">${item.jenis}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Format Post</p>
                        <p class="font-semibold text-xs text-slate-800 mt-1">${item.postType}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jadwal Tayang</p>
                        <p class="font-semibold text-xs text-slate-800 mt-1">${formatDate(item.jadwal)}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
                        <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Posted' ? 'bg-emerald-100 text-emerald-850' : 
                            item.status === 'Done' ? 'bg-indigo-100 text-indigo-850' :
                            item.status === 'In Progress' ? 'bg-blue-100 text-blue-850' : 'bg-slate-100 text-slate-700'
                        }">${item.status}</span>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progres Pengerjaan</p>
                        <div class="w-full bg-slate-200 rounded-full h-2 mt-2">
                            <div class="bg-gradient-to-r from-indigo-500 to-violet-600 h-2 rounded-full" style="width: ${item.progres}%"></div>
                        </div>
                        <p class="text-xs font-bold text-slate-600 mt-1.5">${item.progres}% Selesai</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ditugaskan ke (PIC)</p>
                        <p class="font-bold text-xs text-slate-800 mt-1 flex items-center gap-1.5">
                            <i class="fa-solid fa-circle-user text-indigo-650 text-sm"></i>${item.assignedTo || 'Belum ditugaskan'}
                        </p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Konsep Rencana</p>
                        <p class="text-xs text-slate-650 mt-1.5 leading-relaxed whitespace-pre-line">${item.konsep || 'Tidak ada deskripsi konsep.'}</p>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'schedule') {
        content = `
            <div class="space-y-4 text-slate-700">
                <div class="bg-indigo-50/50 border border-indigo-100/60 p-4 rounded-xl">
                    <p class="text-[10px] text-indigo-650 font-bold uppercase tracking-wider">Judul BRS</p>
                    <p class="font-extrabold text-base text-slate-800 mt-1">${item.judul}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tanggal Rilis</p>
                        <p class="font-bold text-xs text-slate-800 mt-1"><i class="fa-regular fa-calendar-check text-indigo-650 mr-1.5"></i>${formatDate(item.tanggal)}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Poster</p>
                        <p class="font-semibold text-xs text-slate-850 mt-1"><i class="fa-solid fa-palette text-indigo-650 mr-1.5"></i>${item.pic_poster || '-'}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Infografis / Info</p>
                        <p class="font-semibold text-xs text-slate-850 mt-1"><i class="fa-solid fa-circle-info text-indigo-650 mr-1.5"></i>${item.pic_info || '-'}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Dokumentasi</p>
                        <p class="font-semibold text-xs text-slate-850 mt-1"><i class="fa-solid fa-camera text-indigo-650 mr-1.5"></i>${item.pic_doc || '-'}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Highlight & Video</p>
                        <p class="font-semibold text-xs text-slate-850 mt-1"><i class="fa-solid fa-star text-indigo-650 mr-1.5"></i>${item.pic_high || '-'}</p>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'protocol') {
        content = `
            <div class="space-y-4 text-slate-700">
                <div class="bg-indigo-50/50 border border-indigo-100/60 p-4 rounded-xl">
                    <p class="text-[10px] text-indigo-650 font-bold uppercase tracking-wider">Agenda Kegiatan</p>
                    <p class="font-extrabold text-base text-slate-800 mt-1">${item.kegiatan}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pendamping Pimpinan</p>
                        <p class="font-semibold text-xs text-slate-850 mt-1"><i class="fa-solid fa-user-tie text-indigo-650 mr-1.5"></i>${item.pimpinan}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Level Acara</p>
                        <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.level === 'Formal' ? 'bg-indigo-50 text-indigo-750 border border-indigo-100' : 'bg-amber-50 text-amber-750 border border-amber-100'}">${item.level}</span>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lokasi</p>
                        <p class="font-semibold text-xs text-slate-850 mt-1"><i class="fa-solid fa-map-location text-indigo-650 mr-1.5"></i>${item.lokasi}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tanggal Pelaksanaan</p>
                        <p class="font-semibold text-xs text-slate-850 mt-1"><i class="fa-regular fa-calendar-days text-indigo-650 mr-1.5"></i>${formatDate(item.tanggal)}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Petugas Protokol & MC</p>
                        <p class="font-bold text-xs text-slate-800 mt-1"><i class="fa-solid fa-users-gear text-indigo-650 mr-1.5"></i>${item.petugas || 'Belum ada petugas ditunjuk.'}</p>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'team') {
        const taskCount = db.contentPlanner.filter(c => c.assignedTo === item.nama).length;
        content = `
            <div class="space-y-4 text-slate-700">
                <div class="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl font-black shadow-md">${item.nama.charAt(0)}</div>
                    <div>
                        <h3 class="text-base font-extrabold text-slate-800">${item.nama}</h3>
                        <p class="text-xs text-indigo-650 font-semibold mt-0.5">${item.jabatan}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bidang Tugas</p>
                        <p class="font-semibold text-xs text-slate-800 mt-1">${item.bidang}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold text-indigo-650">Total Rencana Konten</p>
                        <p class="font-extrabold text-xl text-slate-850 mt-1">${taskCount}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No. Telepon / Kontak</p>
                        <p class="font-semibold text-xs text-slate-850 mt-1"><i class="fa-solid fa-phone text-indigo-650 mr-1.5"></i>${item.kontak || '-'}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Uraian Detail Tugas Humas</p>
                        <p class="text-xs text-slate-650 mt-1 leading-relaxed">${item.tugas || 'Belum ada uraian tugas khusus.'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content p-6 max-w-md border border-slate-150 shadow-2xl">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 class="text-base font-black text-slate-900 flex items-center gap-1.5"><i class="fa-solid fa-circle-info text-indigo-650"></i> Detail Informasi</h3>
                <button onclick="this.closest('.modal').remove()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
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
        admin: ['dashboard', 'planner', 'schedule', 'protocol', 'tickets', 'assets', 'monitoring', 'team'],
        ketua: ['dashboard', 'planner', 'schedule', 'protocol', 'tickets', 'assets', 'monitoring', 'team'],
        staf: ['dashboard', 'planner', 'schedule', 'protocol', 'tickets', 'assets', 'monitoring'],
        internal: ['dashboard', 'tickets', 'assets']
    };

    const userRole = currentUser ? currentUser.role : 'internal';
    
    // Safety redirect to dashboard if role doesn't have access
    if (!allowedPages[userRole].includes(page)) {
        page = 'dashboard';
    }

    currentState = page;

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

    // Handle error or loading screen if necessary
    if (isError) {
        contentDiv.innerHTML = `
            <div class="flex flex-col justify-center items-center h-96 p-6 text-center">
                <div class="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-2xl mb-4 shadow-sm">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3 class="text-lg font-black text-slate-800">Sinkronisasi Database Gagal</h3>
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
        case 'schedule': renderSchedule(contentDiv); break;
        case 'protocol': renderProtocol(contentDiv); break;
        case 'tickets': renderTickets(contentDiv); break;
        case 'assets': renderAssets(contentDiv); break;
        case 'monitoring': renderMonitoring(contentDiv); break;
        case 'team': renderTeam(contentDiv); break;
    }
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
