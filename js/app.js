// Main Application Controller and Router for SIM HUMAS BPS Kalbar

// Global Navigation State
var currentState = 'dashboard';
var currentEditItem = null;
var currentModalType = null;

// UI Helper: Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-lg border bg-white/95 backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 shrink-0 max-w-sm';
    
    let icon = '';
    let borderColor = '';
    if (type === 'success') {
        icon = '<i class="fa-solid fa-circle-check text-green-500 text-lg"></i>';
        borderColor = 'border-green-200 shadow-green-100/30';
    } else if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-exclamation text-rose-500 text-lg"></i>';
        borderColor = 'border-rose-200 shadow-rose-100/30';
    } else {
        icon = '<i class="fa-solid fa-circle-info text-blue-500 text-lg"></i>';
        borderColor = 'border-blue-200 shadow-blue-100/30';
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
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Konten</label>
                    <input type="text" id="judul" value="${item?.judul || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi Konsep</label>
                    <input type="text" id="konsep" value="${item?.konsep || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenis</label>
                        <select id="jenis" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                            <option ${item?.jenis === 'Soft Selling' ? 'selected' : ''}>Soft Selling</option>
                            <option ${item?.jenis === 'Hard Selling' ? 'selected' : ''}>Hard Selling</option>
                            <option ${item?.jenis === 'Trend' ? 'selected' : ''}>Trend</option>
                            <option ${item?.jenis === 'Informasi' ? 'selected' : ''}>Informasi</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Post Type</label>
                        <select id="postType" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
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
                        <input type="number" id="progres" value="${item?.progres || 0}" min="0" max="100" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jadwal Post</label>
                        <input type="date" id="jadwal" value="${formatDateInput(item?.jadwal)}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                        <select id="status" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                            <option ${item?.status === 'Draft' ? 'selected' : ''}>Draft</option>
                            <option ${item?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option ${item?.status === 'Done' ? 'selected' : ''}>Done</option>
                            <option ${item?.status === 'Posted' ? 'selected' : ''}>Posted</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ditugaskan ke (PIC)</label>
                        <select id="assignedTo" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
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
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Rilis Statistik</label>
                    <input type="text" id="judul" value="${item?.judul || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Rilis</label>
                    <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Pembuat Poster</label>
                        <input type="text" id="pic_poster" value="${item?.pic_poster || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Infografis / Informasi</label>
                        <input type="text" id="pic_info" value="${item?.pic_info || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Dokumentasi Rilis</label>
                        <input type="text" id="pic_doc" value="${item?.pic_doc || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIC Highlight & Video Reels</label>
                        <input type="text" id="pic_high" value="${item?.pic_high || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'protocol') {
        title = item ? 'Edit Kegiatan Protokol' : 'Tambah Kegiatan Protokol';
        fields = `
            <div class="space-y-4 text-slate-700">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Kegiatan / Agenda</label>
                    <input type="text" id="kegiatan" value="${item?.kegiatan || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pendamping Pimpinan</label>
                        <input type="text" id="pimpinan" value="${item?.pimpinan || 'Kepala BPS Prov. Kalbar'}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Level Protokoler</label>
                        <select id="level" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                            <option ${item?.level === 'Formal' ? 'selected' : ''}>Formal</option>
                            <option ${item?.level === 'Non-Formal' ? 'selected' : ''}>Non-Formal</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Lokasi Kegiatan</label>
                    <input type="text" id="lokasi" value="${item?.lokasi || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Petugas Protokol / MC (Pisahkan dengan koma)</label>
                    <input type="text" id="petugas" value="${item?.petugas || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="Contoh: Dian, Azhari">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Kegiatan</label>
                    <input type="date" id="tanggal" value="${formatDateInput(item?.tanggal)}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                </div>
            </div>
        `;
    } else if (type === 'team') {
        title = item ? 'Edit Anggota Tim Humas' : 'Tambah Anggota Tim Humas';
        fields = `
            <div class="space-y-4 text-slate-700">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                    <input type="text" id="nama" value="${item?.nama || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jabatan</label>
                        <input type="text" id="jabatan" value="${item?.jabatan || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bidang / Seksi Kerja</label>
                        <input type="text" id="bidang" value="${item?.bidang || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Uraian Tugas Utama Kehumasan</label>
                    <textarea id="tugas" rows="3" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="Rincian deskripsi tugas harian anggota...">${item?.tugas || ''}</textarea>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">No. Telepon / Kontak</label>
                    <input type="number" id="kontak" value="${item?.kontak || ''}" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="Contoh: 08123456789">
                </div>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content p-6">
            <div class="flex justify-between items-center mb-5 border-b pb-3">
                <h3 class="text-xl font-bold text-slate-800">${title}</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="saveData(event)">
                ${fields}
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button type="submit" class="btn-primary flex-1 py-2.5"><i class="fa-solid fa-save mr-2"></i> Simpan Data</button>
                    <button type="button" onclick="closeModal()" class="btn-secondary flex-1 py-2.5">Batal</button>
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
}

function saveData(event) {
    event.preventDefault();

    let sheetName = '';
    if (currentModalType === 'content') sheetName = 'content_planner';
    else if (currentModalType === 'schedule') sheetName = 'brs_schedule';
    else if (currentModalType === 'protocol') sheetName = 'protocol';
    else if (currentModalType === 'team') sheetName = 'team';

    if (currentModalType === 'content') {
        const newItem = {
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

        const action = currentEditItem ? 'update' : 'add';

        if (currentEditItem) {
            const index = db.contentPlanner.findIndex(i => i.id === currentEditItem.id);
            if (index !== -1) db.contentPlanner[index] = newItem;
            showToast('Menyimpan perubahan rencana konten...');
        } else {
            db.contentPlanner.push(newItem);
            showToast('Menambahkan konten baru...');
        }
        sendDataToServer(action, sheetName, newItem);

    } else if (currentModalType === 'schedule') {
        const newItem = {
            id: currentEditItem?.id || Date.now(),
            judul: document.getElementById('judul').value,
            tanggal: document.getElementById('tanggal').value,
            pic_poster: document.getElementById('pic_poster').value,
            pic_info: document.getElementById('pic_info').value,
            pic_doc: document.getElementById('pic_doc').value,
            pic_high: document.getElementById('pic_high').value
        };
        const action = currentEditItem ? 'update' : 'add';

        if (currentEditItem) {
            const index = db.brsSchedule.findIndex(i => i.id === currentEditItem.id);
            if (index !== -1) db.brsSchedule[index] = newItem;
            showToast('Menyimpan jadwal BRS...');
        } else {
            db.brsSchedule.push(newItem);
            showToast('Menambahkan jadwal BRS...');
        }
        sendDataToServer(action, sheetName, newItem);

    } else if (currentModalType === 'protocol') {
        const newItem = {
            id: currentEditItem?.id || Date.now(),
            kegiatan: document.getElementById('kegiatan').value,
            pimpinan: document.getElementById('pimpinan').value,
            level: document.getElementById('level').value,
            lokasi: document.getElementById('lokasi').value,
            petugas: document.getElementById('petugas').value,
            tanggal: document.getElementById('tanggal').value
        };
        const action = currentEditItem ? 'update' : 'add';

        if (currentEditItem) {
            const index = db.protocol.findIndex(i => i.id === currentEditItem.id);
            if (index !== -1) db.protocol[index] = newItem;
            showToast('Menyimpan perubahan agenda protokol...');
        } else {
            db.protocol.push(newItem);
            showToast('Menambahkan agenda protokol...');
        }
        sendDataToServer(action, sheetName, newItem);

    } else if (currentModalType === 'team') {
        const newItem = {
            id: currentEditItem?.id || Date.now(),
            nama: document.getElementById('nama').value,
            jabatan: document.getElementById('jabatan').value,
            bidang: document.getElementById('bidang').value,
            tugas: document.getElementById('tugas').value,
            kontak: document.getElementById('kontak').value
        };
        const action = currentEditItem ? 'update' : 'add';

        if (currentEditItem) {
            const index = db.team.findIndex(i => i.id === currentEditItem.id);
            if (index !== -1) db.team[index] = newItem;
            showToast('Menyimpan data anggota tim...');
        } else {
            db.team.push(newItem);
            showToast('Menambahkan anggota tim baru...');
        }
        sendDataToServer(action, sheetName, newItem);
    }

    closeModal();
    router(currentState);
}

// Global Delete Handler
function deleteItem(type, id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini secara permanen?')) {
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
        }

        if (itemToDelete) {
            router(currentState);
            showToast('Data berhasil dihapus dari tampilan.');
            sendDataToServer('delete', sheetName, itemToDelete);
        }
    }
}

// Global Detail Modal View
function showDetail(type, item) {
    let content = '';
    if (type === 'content') {
        content = `
            <div class="space-y-4 font-sans text-slate-700">
                <div class="bg-stats-50 border border-stats-100 p-4 rounded-xl"><p class="text-[10px] text-stats-600 font-bold uppercase tracking-wider">Judul Konten</p><p class="font-extrabold text-lg text-slate-800 mt-1">${item.judul}</p></div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jenis</p><p class="font-semibold text-sm text-slate-800 mt-0.5">${item.jenis}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Format Post</p><p class="font-semibold text-sm text-slate-800 mt-0.5">${item.postType}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jadwal Tayang</p><p class="font-semibold text-sm text-slate-800 mt-0.5">${formatDate(item.jadwal)}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p><span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${item.status === 'Posted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${item.status}</span></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progres Pengerjaan</p>
                        <div class="w-full bg-slate-200 rounded-full h-2 mt-2"><div class="bg-gradient-to-r from-stats-400 to-stats-600 h-2 rounded-full" style="width: ${item.progres}%"></div></div>
                        <p class="text-xs font-bold text-slate-600 mt-1.5">${item.progres}% Selesai</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ditugaskan ke (PIC)</p><p class="font-bold text-sm text-slate-850 mt-1"><i class="fa-solid fa-user-circle text-stats-550 mr-1.5 text-base"></i>${item.assignedTo}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Konsep Rencana</p><p class="text-sm text-slate-650 mt-1 leading-relaxed">${item.konsep || 'Tidak ada deskripsi konsep.'}</p></div>
                </div>
            </div>
        `;
    } else if (type === 'schedule') {
        content = `
            <div class="space-y-4 font-sans text-slate-700">
                <div class="bg-stats-50 border border-stats-100 p-4 rounded-xl"><p class="text-[10px] text-stats-600 font-bold uppercase tracking-wider">Judul BRS</p><p class="font-extrabold text-lg text-slate-800 mt-1">${item.judul}</p></div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tanggal Rilis</p><p class="font-bold text-sm text-slate-800 mt-1"><i class="fa-regular fa-calendar text-stats-550 mr-1.5"></i>${formatDate(item.tanggal)}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Poster</p><p class="font-semibold text-sm text-slate-850 mt-1"><i class="fa-solid fa-palette text-stats-550 mr-1.5"></i>${item.pic_poster || '-'}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Infografis / Info</p><p class="font-semibold text-sm text-slate-850 mt-1"><i class="fa-solid fa-circle-info text-stats-550 mr-1.5"></i>${item.pic_info || '-'}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Dokumentasi</p><p class="font-semibold text-sm text-slate-850 mt-1"><i class="fa-solid fa-camera text-stats-550 mr-1.5"></i>${item.pic_doc || '-'}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Highlight & Video</p><p class="font-semibold text-sm text-slate-850 mt-1"><i class="fa-solid fa-star text-stats-550 mr-1.5"></i>${item.pic_high || '-'}</p></div>
                </div>
            </div>
        `;
    } else if (type === 'protocol') {
        content = `
            <div class="space-y-4 font-sans text-slate-700">
                <div class="bg-stats-50 border border-stats-100 p-4 rounded-xl"><p class="text-[10px] text-stats-600 font-bold uppercase tracking-wider">Agenda Kegiatan</p><p class="font-extrabold text-lg text-slate-800 mt-1">${item.kegiatan}</p></div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pendamping Pimpinan</p><p class="font-semibold text-sm text-slate-850 mt-1"><i class="fa-solid fa-user-tie text-stats-550 mr-1.5"></i>${item.pimpinan}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Level Acara</p><span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${item.level === 'Formal' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">${item.level}</span></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lokasi</p><p class="font-semibold text-sm text-slate-850 mt-1"><i class="fa-solid fa-map-marker-alt text-stats-550 mr-1.5"></i>${item.lokasi}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tanggal Pelaksanaan</p><p class="font-semibold text-sm text-slate-850 mt-1"><i class="fa-regular fa-calendar-alt text-stats-550 mr-1.5"></i>${formatDate(item.tanggal)}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Petugas Protokol & MC</p><p class="font-bold text-sm text-slate-800 mt-1"><i class="fa-solid fa-users text-stats-550 mr-1.5"></i>${item.petugas || 'Belum ada petugas ditunjuk.'}</p></div>
                </div>
            </div>
        `;
    } else if (type === 'team') {
        const taskCount = db.contentPlanner.filter(c => c.assignedTo === item.nama).length;
        content = `
            <div class="space-y-4 font-sans text-slate-700">
                <div class="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-stats-500 to-stats-700 flex items-center justify-center text-white text-2xl font-black shadow-md">${item.nama.charAt(0)}</div>
                    <div>
                        <h3 class="text-lg font-extrabold text-slate-800">${item.nama}</h3>
                        <p class="text-xs text-stats-600 font-semibold mt-0.5">${item.jabatan}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bidang Tugas</p><p class="font-semibold text-sm text-slate-800 mt-1">${item.bidang}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold text-stats-600">Total Rencana Konten</p><p class="font-black text-2xl text-slate-850 mt-0.5">${taskCount}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No. Telepon / Kontak</p><p class="font-semibold text-sm text-slate-850 mt-1"><i class="fa-solid fa-phone text-stats-550 mr-1.5"></i>${item.kontak || '-'}</p></div>
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-xl col-span-2"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Uraian Detail Tugas Humas</p><p class="text-xs text-slate-650 mt-1 leading-relaxed">${item.tugas || 'Belum ada uraian tugas khusus.'}</p></div>
                </div>
            </div>
        `;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content p-6 max-w-lg">
            <div class="flex justify-between items-center mb-5 border-b pb-3">
                <h3 class="text-xl font-bold text-slate-850 flex items-center gap-1.5"><i class="fa-solid fa-circle-info text-stats-550 text-base"></i> Detail Informasi</h3>
                <button onclick="this.closest('.modal').remove()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            ${content}
            <div class="mt-8 flex justify-end">
                <button onclick="this.closest('.modal').remove()" class="btn-primary px-6 py-2">Tutup</button>
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
        // If element is a link to the page, add class
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
