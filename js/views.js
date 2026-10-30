// Views rendering engine for SIM Humas & Protokol BPS Kalbar

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

// Helper: Check if logged-in user is Admin or Ketua Tim Humas
function isUserAdminOrKetua() {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'koordinator');
}

// Helper: Check if task belongs to current user (Tim Humas scopes)
function isTaskForCurrentUser(item) {
    if (!currentUser) return false;
    if (currentUser.role !== 'tim') return true; // Admins, Kepala, Koordinator see all

    const userName = (currentUser.username || '').toLowerCase().trim();
    const displayName = (currentUser.name || '').toLowerCase().trim();
    const cleanDisplayName = displayName.replace(/\(.*?\)/g, '').replace(/,\s*[a-z0-9\.\s]+$/, '').trim();
    const firstDisplayName = cleanDisplayName.split(' ')[0] || '';

    // Check all possible PIC/petugas columns in item
    const rawPicFields = [
        item.petugas,
        item.assignedTo,
        item.assignTo,
        item['assign To'],
        item.pic,
        item.pembuat_konten,
        item.pic_poster_info,
        item.pic_doc_ruang,
        item.pic_doc_yt_zoom,
        item.assigned_to
    ].filter(Boolean);

    if (rawPicFields.length === 0) return false;

    return rawPicFields.some(fieldVal => {
        const valStr = String(fieldVal).toLowerCase().trim();
        const cleanVal = valStr.replace(/\(.*?\)/g, '').replace(/,\s*[a-z0-9\.\s]+$/, '').trim();

        if (userName && (valStr === userName || valStr.includes(userName) || userName.includes(valStr))) return true;
        if (displayName && (valStr === displayName || valStr.includes(displayName) || displayName.includes(valStr))) return true;
        if (cleanDisplayName && cleanDisplayName.length >= 3 && (cleanVal.includes(cleanDisplayName) || cleanDisplayName.includes(cleanVal))) return true;
        if (firstDisplayName && firstDisplayName.length >= 4 && cleanVal.includes(firstDisplayName)) return true;
        if (valStr.includes('staf humas') || valStr.includes('tim humas')) return true;

        // Comma / slash / ampersand split
        if (valStr.includes(',') || valStr.includes('&') || valStr.includes('/')) {
            const splitted = valStr.split(/[,&\/]/).map(s => s.trim().replace(/\(.*?\)/g, '').toLowerCase());
            if (splitted.some(s => (cleanDisplayName && s === cleanDisplayName) || (userName && s === userName) || (cleanDisplayName && cleanDisplayName.length >= 3 && s.includes(cleanDisplayName)))) {
                return true;
            }
        }
        return false;
    });
}

// Helper: Get user avatar initials
function getPicInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
}

// Helper: Get avatar color scheme based on name hashing
function getAvatarBg(name) {
    if (!name) return 'bg-slate-100 text-slate-700';
    const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
        'bg-indigo-50 text-indigo-750 border-indigo-150 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
        'bg-emerald-50 text-emerald-750 border-emerald-150 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
        'bg-amber-50 text-amber-750 border-amber-150 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
        'bg-rose-55 text-rose-750 border-rose-150 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
        'bg-violet-50 text-violet-750 border-violet-150 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
        'bg-sky-50 text-sky-750 border-sky-150 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
    ];
    return colors[nameHash % colors.length];
}

// Helper: Generic CSV exporter
function downloadCSV(headers, rows, filename) {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
    rows.forEach(row => {
        csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper: Generic Excel exporter using HTML spreadsheet format
function downloadExcel(headers, rows, filename) {
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Laporan</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 11pt; }
                th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
                td { mso-number-format: "\\@"; border: 1px solid #cbd5e1; padding: 6px 10px; }
            </style>
        </head>
        <body>
            <table border="1">
                <thead>
                    <tr style="background-color: #f1f5f9; font-weight: bold;">
                        ${headers.map(h => `<th style="background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 10px;">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            ${row.map(val => `<td style="mso-number-format:'\\@'; border: 1px solid #cbd5e1; padding: 6px 10px;">${val !== undefined && val !== null ? String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Helper: Generic Template downloader
function downloadTemplate(headers, filename) {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
    // Add placeholder row
    csvContent += headers.map(() => `""`).join(",") + "\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper: Generic Print window exporter
function openPrintReportWindow(title, headers, rows) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let headersHtml = headers.map(h => `<th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; background-color: #f1f5f9; font-size: 11px; text-transform: uppercase;">${h}</th>`).join('');
    let rowsHtml = rows.map(row => `
        <tr style="page-break-inside: avoid;">
            ${row.map(val => `<td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 11px;">${val}</td>`).join('')}
        </tr>
    `).join('');

    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                h1 { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
                p { font-size: 11px; color: #64748b; margin-top: -5px; }
                .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; pt: 10px; font-size: 9px; color: #94a3b8; text-align: right; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <p>Dicetak otomatis dari SIM Humas BPS Kalbar - Tanggal: ${(typeof getNowWIB === 'function' ? getNowWIB() : new Date()).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short', hour12: false })} WIB</p>
            <table>
                <thead><tr>${headersHtml}</tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div class="footer">SIM Humas & Protokol BPS Provinsi Kalimantan Barat</div>
            <script>window.print();</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Helper: Reusable Pagination Component (20, 50, 100 per halaman)
function renderPaginationControls({
    totalItems,
    currentPage,
    pageSize,
    onPageChangeFn,
    onPageSizeChangeFn,
    containerId
}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!totalItems || totalItems === 0) {
        container.innerHTML = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const startItem = (safeCurrentPage - 1) * pageSize + 1;
    const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

    container.innerHTML = `
        <div class="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-150 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div class="flex items-center gap-1.5 text-center sm:text-left">
                <span>Menampilkan <strong class="font-bold text-slate-800 dark:text-slate-200">${startItem}</strong> - <strong class="font-bold text-slate-800 dark:text-slate-200">${endItem}</strong> dari <strong class="font-bold text-slate-800 dark:text-slate-200">${totalItems}</strong> data</span>
            </div>
            <div class="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
                <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-semibold text-slate-500">Tampilkan:</span>
                    <select onchange="${onPageSizeChangeFn}(this.value)" class="text-xs font-bold py-1 px-2.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer shadow-xs">
                        <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
                        <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="${onPageChangeFn}(1)" ${safeCurrentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400"' : 'class="p-1.5 px-2 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-semibold" title="Halaman Pertama"'}>
                        <i class="fa-solid fa-angles-left text-[10px]"></i>
                    </button>
                    <button onclick="${onPageChangeFn}(${safeCurrentPage - 1})" ${safeCurrentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400"' : 'class="p-1.5 px-2 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-semibold" title="Sebelumnya"'}>
                        <i class="fa-solid fa-chevron-left text-[10px]"></i>
                    </button>
                    <span class="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        Hal ${safeCurrentPage} / ${totalPages}
                    </span>
                    <button onclick="${onPageChangeFn}(${safeCurrentPage + 1})" ${safeCurrentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400"' : 'class="p-1.5 px-2 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-semibold" title="Selanjutnya"'}>
                        <i class="fa-solid fa-chevron-right text-[10px]"></i>
                    </button>
                    <button onclick="${onPageChangeFn}(${totalPages})" ${safeCurrentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400"' : 'class="p-1.5 px-2 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-semibold" title="Halaman Terakhir"'}>
                        <i class="fa-solid fa-angles-right text-[10px]"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// 1. INTEGRATED DASHBOARD VIEW
// -------------------------------------------------------------
function renderDashboard(container) {
    if (!currentUser) return;
    const userRole = currentUser.role;
    const isTim = userRole === 'tim';

    if (userRole === 'pemohon') {
        renderPemohonDashboard(container);
        return;
    }

    const now = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getTaskItemDate = (item) => {
        if (!item) return null;
        return item.tanggal || item.jadwal || item.tanggal_posting || item.tanggal_rilis || item.deadline || item.tayang || item.date || null;
    };

    const getMonthFilter = (itemOrDate) => {
        const dStr = (typeof itemOrDate === 'object' && itemOrDate !== null) ? getTaskItemDate(itemOrDate) : itemOrDate;
        if (!dStr && dStr !== 0) return false;
        const d = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : new Date(dStr);
        if (!d || isNaN(d.getTime())) return false;
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    // Filter based on Tim Humas assignments
    const rutinSrc = db.rekapRutin.filter(isTaskForCurrentUser);
    const adHocSrc = db.adHoc.filter(isTaskForCurrentUser);
    const protoSrc = db.protokoler.filter(isTaskForCurrentUser);
    const mcSrc = db.mc.filter(isTaskForCurrentUser);
    const brsSrc = db.brsRilis.filter(isTaskForCurrentUser);
    const hbSrc = db.hariBesar.filter(isTaskForCurrentUser);
    const plannerSrc = db.contentPlanner.filter(isTaskForCurrentUser);
    const assignmentSrc = db.assignments.filter(isTaskForCurrentUser);
    const ticketSrc = (db.tickets || []).filter(t => t.status === 'Approved').filter(isTaskForCurrentUser);

    const totalRutin = rutinSrc.filter(getMonthFilter).length;
    const totalAdHoc = adHocSrc.filter(getMonthFilter).length;
    const totalProto = protoSrc.filter(getMonthFilter).length;
    const totalMc = mcSrc.filter(getMonthFilter).length;
    const totalBrs = brsSrc.filter(getMonthFilter).length;
    const totalHariBesar = hbSrc.filter(getMonthFilter).length;
    const totalPlanner = plannerSrc.filter(getMonthFilter).length;
    const totalAssignments = assignmentSrc.filter(getMonthFilter).length;
    const totalTickets = ticketSrc.filter(getMonthFilter).length;

    const totalKegiatanBulanIni = totalRutin + totalAdHoc + totalProto + totalMc + totalBrs + totalHariBesar + totalPlanner + totalAssignments + totalTickets;

    let selesaiCount = 0;
    let progressCount = 0;

    const evalStatus = (status, item) => {
        if (item && Number(item.progres) >= 100) {
            selesaiCount++;
            return;
        }
        if (!status) return;
        const st = String(status).toLowerCase().trim();
        if (st === 'selesai' || st === 'done' || st === 'posted' || st === 'tercapai' || st === 'terbit' || st === 'sukses' || st === 'published') {
            selesaiCount++;
        } else if (st === 'ditugaskan' || st === 'on progress' || st === 'in progress' || st === 'revisi' || st === 'draft' || st === 'belum mulai' || st === 'sedang dikerjakan' || st === 'berjalan') {
            progressCount++;
        }
    };

    rutinSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));
    adHocSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));
    protoSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));
    mcSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));
    brsSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));
    hbSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));
    plannerSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));
    assignmentSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));
    ticketSrc.filter(getMonthFilter).forEach(i => evalStatus(i.status, i));

    const belumSelesaiBulanIni = Math.max(0, totalKegiatanBulanIni - selesaiCount);
    const totalPegawaiAktif = (db.team && db.team.length > 0) ? db.team.length : (db.users ? db.users.filter(u => u.role === 'tim' || u.role === 'koordinator').length : 0);

    // === REFERENSI WAKTU (WIB) ===
    const nowWIB = getNowWIB(); // waktu sekarang
    const todayMidnight = new Date(nowWIB);
    todayMidnight.setHours(0, 0, 0, 0);  // awal hari ini
    const tomorrowMidnight = new Date(todayMidnight);
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1); // awal besok
    const h3EndMidnight = new Date(todayMidnight);
    h3EndMidnight.setDate(h3EndMidnight.getDate() + 4); // awal H+4 (batas atas H+3)

    const todayStr = formatDateInput(nowWIB);

    // === TUGAS TERLAMBAT (OVERDUE) ===
    // Overdue = deadline datetime SUDAH terlewati dari SEKARANG (bukan hanya hari)
    // Untuk item tanpa jam → deadline = akhir hari (23:59:59)
    // Untuk protokoler/MC → gunakan jam_selesai jika ada
    const overdueStatuses = ['Selesai', 'Done', 'Posted'];
    const overdueTasks = [
        // Assignment: deadline adalah tanggal saja → overdue jika hari sudah terlewati penuh
        ...assignmentSrc.map(item => ({
            judul: item.tugas,
            tanggal: item.deadline,
            waktu: null, // tidak ada jam untuk assignment
            status: item.status,
            pic: item.assigned_to || '-',
            sumber: 'Tugas'
        })),
        // Content Planner: jadwal adalah tanggal posting
        ...plannerSrc.map(item => ({
            judul: item.judul,
            tanggal: item.jadwal,
            waktu: null,
            status: item.status,
            pic: item['assign To'] || item.assignTo || item.assignedTo || item.pic || '-',
            sumber: 'Konten'
        })),
        // Rekap Rutin: tanggal kegiatan
        ...rutinSrc.map(item => ({
            judul: item.kegiatan,
            tanggal: item.tanggal,
            waktu: null,
            status: item.status,
            pic: item.petugas || '-',
            sumber: 'Rutin'
        })),
        // Ad Hoc: tanggal penugasan
        ...adHocSrc.map(item => ({
            judul: item.kegiatan,
            tanggal: item.tanggal,
            waktu: null,
            status: item.status,
            pic: item.petugas || '-',
            sumber: 'Ad Hoc'
        })),
        // Protokoler: gunakan jam_selesai untuk datetime penuh
        ...protoSrc.map(item => ({
            judul: item.kegiatan,
            tanggal: item.tanggal,
            waktu: item.jam_selesai || item.jam_mulai || null,
            status: item.status,
            pic: item.petugas || '-',
            sumber: 'Protokoler'
        })),
        // MC: gunakan jam_selesai untuk datetime penuh
        ...mcSrc.map(item => ({
            judul: item.kegiatan,
            tanggal: item.tanggal,
            waktu: item.jam_selesai || item.jam_mulai || null,
            status: item.status,
            pic: item.petugas || '-',
            sumber: 'MC'
        }))
    ]
    .filter(item => {
        if (!item.tanggal || overdueStatuses.includes(item.status)) return false;
        // Bangun datetime deadline lengkap (tanggal + jam jika ada, else akhir hari)
        const deadlineDT = parseDateTimeWIB(item.tanggal, item.waktu, true);
        if (!deadlineDT || isNaN(deadlineDT.getTime())) return false;
        // OVERDUE jika deadline datetime SUDAH LEBIH KECIL dari waktu sekarang
        return deadlineDT < nowWIB;
    })
    .sort((a, b) => {
        const da = parseDateTimeWIB(a.tanggal, a.waktu, true);
        const db2 = parseDateTimeWIB(b.tanggal, b.waktu, true);
        return (da || 0) - (db2 || 0); // urutkan dari paling lama terlambat
    })
    .slice(0, 5);

    // === BATAS WAKTU TERDEKAT (H+1 s/d H+3) ===
    // Hanya tampilkan H+1, H+2, H+3. Exclude overdue & hari ini.
    const upcomingDeadlines = [
        ...plannerSrc.map(item => ({
            judul: item.judul,
            tanggal: item.jadwal,
            waktu: null,
            sumber: 'Konten',
            pic: item['assign To'] || item.assignTo || item.assignedTo || item.pic || '-'
        })),
        ...db.tickets.filter(t => t.status === 'Approved').filter(isTaskForCurrentUser).map(item => ({
            judul: item.judul,
            tanggal: item.deadline,
            waktu: null,
            sumber: 'Layanan',
            pic: item.pic || item.pemohon || '-'
        })),
        ...assignmentSrc.map(item => ({
            judul: item.tugas,
            tanggal: item.deadline,
            waktu: null,
            sumber: 'Tugas',
            pic: item.assigned_to || '-'
        }))
    ]
    .filter(item => {
        if (!item.tanggal) return false;
        const deadlineDT = parseDateTimeWIB(item.tanggal, item.waktu, true);
        if (!deadlineDT || isNaN(deadlineDT.getTime())) return false;
        // Hanya H+1 s/d H+3: lebih besar dari sekarang DAN sebelum H+4 midnight
        return deadlineDT >= tomorrowMidnight && deadlineDT < h3EndMidnight;
    })
    .sort((a, b) => {
        const da = parseDateTimeWIB(a.tanggal, a.waktu, true);
        const db2 = parseDateTimeWIB(b.tanggal, b.waktu, true);
        return (da || 0) - (db2 || 0);
    })
    .slice(0, 6);

    // === PUBLISH HARI INI ===
    // Item dari Content Planner, Hari Besar, dan Layanan Humas yang jadwalnya hari ini
    const publishHariIni = [
        ...plannerSrc
            .filter(i => i.jadwal && formatDateInput(i.jadwal) === todayStr)
            .map(i => ({ judul: i.judul, tipe: 'Content Planner', pic: i['assign To'] || i.assignTo || i.assignedTo || i.pic || '-', status: i.status })),
        ...hbSrc
            .filter(i => i.tanggal && formatDateInput(i.tanggal) === todayStr)
            .map(i => ({ judul: i.judul || i.kegiatan, tipe: 'Hari Besar', pic: i.petugas || 'Tim Humas', status: i.status })),
        ...db.tickets
            .filter(t => t.status === 'Approved')
            .filter(isTaskForCurrentUser)
            .filter(i => i.deadline && formatDateInput(i.deadline) === todayStr)
            .map(i => ({ judul: i.judul, tipe: 'Layanan Humas', pic: i.pic || i.pemohon || '-', status: i.status }))
    ];
    const todayActivities = [
        ...rutinSrc.filter(i => i.tanggal && formatDateInput(i.tanggal).includes(todayStr)).map(i => ({ judul: i.kegiatan, tipe: 'Rutin', jam: 'Rutin', pic: i.petugas })),
        ...adHocSrc.filter(i => i.tanggal && formatDateInput(i.tanggal).includes(todayStr)).map(i => ({ judul: i.kegiatan, tipe: 'Ad Hoc', jam: 'Ad Hoc', pic: i.petugas })),
        ...protoSrc.filter(i => i.tanggal && formatDateInput(i.tanggal).includes(todayStr)).map(i => ({ judul: i.kegiatan, tipe: 'Protokoler', jam: formatTime(i.jam_mulai), pic: i.petugas })),
        ...mcSrc.filter(i => i.tanggal && formatDateInput(i.tanggal).includes(todayStr)).map(i => ({ judul: i.kegiatan, tipe: 'MC', jam: formatTime(i.jam_mulai), pic: i.petugas })),
        ...brsSrc.filter(i => i.tanggal_rilis && formatDateInput(i.tanggal_rilis).includes(todayStr)).map(i => ({ judul: i.judul, tipe: 'Rilis BRS', jam: '09:00', pic: 'Tim Humas' }))
    ];

    container.innerHTML = `
        <div class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <i class="fa-solid fa-chart-line text-indigo-650 dark:text-indigo-400"></i>
                    Executive Monitoring Dashboard
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Status kehumasan terintegrasi dan beban kerja pegawai BPS Provinsi Kalimantan Barat</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 border border-indigo-150 dark:border-indigo-900 text-indigo-750 dark:text-indigo-300 font-extrabold text-[10px] uppercase rounded-xl tracking-wider shadow-sm flex items-center gap-1.5">
                    <i class="fa-solid fa-calendar"></i> Bulan Ini: ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>
            </div>
        </div>

        ${isTim ? `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-center text-indigo-650 dark:text-indigo-400 shrink-0"><i class="fa-solid fa-calendar-check text-lg sm:text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kegiatan Baru</p><p class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5 stat-number">${totalKegiatanBulanIni}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-center text-emerald-650 dark:text-emerald-400 shrink-0"><i class="fa-solid fa-circle-check text-lg sm:text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Selesai</p><p class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5 stat-number">${selesaiCount}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 dark:bg-rose-950 border border-rose-100 dark:border-rose-900 rounded-xl flex items-center justify-center text-rose-650 dark:text-rose-400 shrink-0"><i class="fa-solid fa-clock-rotate-left text-lg sm:text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Belum Selesai</p><p class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5 stat-number">${belumSelesaiBulanIni}</p></div>
            </div>
        </div>
        ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-center text-indigo-650 dark:text-indigo-400 shrink-0"><i class="fa-solid fa-calendar-check text-lg sm:text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kegiatan Baru</p><p class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5 stat-number">${totalKegiatanBulanIni}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-center text-emerald-650 dark:text-emerald-400 shrink-0"><i class="fa-solid fa-circle-check text-lg sm:text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Selesai</p><p class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5 stat-number">${selesaiCount}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-xl flex items-center justify-center text-blue-650 dark:text-blue-400 shrink-0"><i class="fa-solid fa-spinner fa-spin text-lg sm:text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aktif Ditugaskan</p><p class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5 stat-number">${progressCount}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3 sm:gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-violet-50 dark:bg-violet-950 border border-violet-100 dark:border-violet-900 rounded-xl flex items-center justify-center text-violet-650 dark:text-violet-400 shrink-0"><i class="fa-solid fa-users text-lg sm:text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pegawai Aktif</p><p class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-0.5 stat-number">${totalPegawaiAktif}</p></div>
            </div>
        </div>
        `}

        ${isTim ? `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8 items-stretch">
            <!-- DISTRIBUSI JUMLAH TUGAS BULANAN (Col 7 on LG) - Di sebelah kiri -->
            <div id="tim-monthly-distribution-card" class="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                    <!-- Header -->
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3.5">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs shrink-0">
                                <i class="fa-solid fa-chart-column"></i>
                            </span>
                            <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Distribusi Jumlah Tugas Bulanan</h3>
                            <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">Januari - Desember ${currentYear}</span>
                        </div>
                        <div class="text-[9px] font-bold uppercase tracking-wider flex items-center gap-2">
                            <span class="inline-flex items-center"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1.5"></span> Selesai</span>
                            <span class="inline-flex items-center"><span class="w-2.5 h-2.5 rounded-sm bg-rose-500 mr-1.5"></span> Belum Selesai</span>
                        </div>
                    </div>

                    <!-- Micro Metric Quick Summary Strip -->
                    <div class="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/90 dark:bg-slate-750/50 rounded-xl border border-slate-150 dark:border-slate-700/60 mb-2.5 text-center">
                        <div>
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Total Tugas Tahunan</span>
                            <span id="timMonthlyTotalTasksBadge" class="text-xs sm:text-sm font-black text-slate-800 dark:text-white">0 tugas</span>
                        </div>
                        <div class="border-x border-slate-200 dark:border-slate-700">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Rata-rata / Bulan</span>
                            <span id="timMonthlyAvgBadge" class="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">0 tugas/bln</span>
                        </div>
                        <div>
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Bulan Paling Sibuk</span>
                            <span id="timMonthlyBusiestBadge" class="text-xs sm:text-sm font-black text-slate-800 dark:text-white">-</span>
                        </div>
                    </div>
                </div>

                <!-- Main Chart Canvas Area -->
                <div class="relative w-full flex-1 min-h-[220px] max-h-[260px] flex items-center justify-center my-1.5">
                    <canvas id="timMonthlyTasksChart" class="w-full h-full"></canvas>
                </div>

                <!-- Bottom Summary Strip -->
                <div class="pt-2.5 border-t border-slate-100 dark:border-slate-700/70 mt-1.5">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Rincian Tugas Bulanan</span>
                        <span class="text-[9px] font-bold text-slate-500 dark:text-slate-400" id="timMonthlyStatusSummaryText">Total: 0 Selesai, 0 Belum</span>
                    </div>
                    <div id="timMonthlyChips" class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <!-- Populated dynamically with monthly mini cards/chips -->
                    </div>
                </div>
            </div>

            <!-- CAPAIAN TARGET TAHUNAN (Col 5 on LG) - Di sebelah kanan grafik -->
            <div id="tim-annual-achievement-card" class="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                    <!-- Header with Title & Year Badge -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs shrink-0">
                                    <i class="fa-solid fa-bullseye"></i>
                                </span>
                                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Capaian Target Tahunan</h3>
                            </div>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Persentase tugas selesai vs belum selesai</p>
                        </div>
                        <div class="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                            <span class="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                                <i class="fa-solid fa-calendar mr-1"></i>Tahun ${currentYear}
                            </span>
                        </div>
                    </div>

                    <!-- Target Status Alert Pill -->
                    <div id="timTargetStatusPillContainer" class="mb-2.5">
                        <!-- Populated: e.g. Target Tercapai Optimal (85%) -->
                    </div>

                    <!-- Donut Chart & Stat Cards (Side-by-side on sm/lg) -->
                    <div class="flex flex-col sm:flex-row items-center gap-3.5 my-2 p-2.5 bg-slate-50/70 dark:bg-slate-750/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div class="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                            <canvas id="timAnnualAchievementChart" class="w-full h-full"></canvas>
                            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                <span id="timTargetPercentDisplay" class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">0%</span>
                                <span id="timTargetStatusBadgeText" class="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Selesai</span>
                            </div>
                        </div>

                        <!-- Stat Cards: Selesai vs Belum Selesai -->
                        <div class="flex-1 w-full grid grid-cols-2 sm:grid-cols-1 gap-2">
                            <div class="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-800/50 flex flex-col justify-between">
                                <div class="flex items-center justify-between text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                    <span class="flex items-center gap-1"><i class="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i> Selesai</span>
                                    <span id="timTargetTercapaiPct" class="font-black text-xs">0%</span>
                                </div>
                                <p id="timTargetTercapaiCount" class="text-sm sm:text-base font-black text-slate-800 dark:text-white mt-0.5">0 <span class="text-[9px] font-medium text-slate-400">tugas</span></p>
                            </div>
                            <div class="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 border border-rose-200/70 dark:border-rose-800/50 flex flex-col justify-between">
                                <div class="flex items-center justify-between text-[10px] font-bold text-rose-700 dark:text-rose-400">
                                    <span class="flex items-center gap-1"><i class="fa-solid fa-circle-xmark text-rose-500 text-[10px]"></i> Belum Selesai</span>
                                    <span id="timTargetBelumPct" class="font-black text-xs">0%</span>
                                </div>
                                <p id="timTargetBelumCount" class="text-sm sm:text-base font-black text-slate-800 dark:text-white mt-0.5">0 <span class="text-[9px] font-medium text-slate-400">tugas</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Section: Quick Monthly Trend Pills & Rubrikasi Breakdown -->
                <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Capaian Antar Bulan</span>
                        <span id="timTargetTotalMonthLabel" class="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">Total: 0 Tugas</span>
                    </div>

                    <!-- Mini Horizontal Scrollable Month Track -->
                    <div id="timTargetMonthlyStrip" class="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                        <!-- Populated with Jan - Des pills with % -->
                    </div>

                    <!-- Breakdown Rubrikasi / Kategori Tugas Saya -->
                    <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <div class="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
                            <span>Proporsi Rubrikasi Tugas Saya</span>
                            <span class="text-[9px] text-slate-400 font-normal">Capaian</span>
                        </div>
                        <div id="tim-bidang-breakdown" class="flex flex-col gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            <!-- Populated with Rubrikasi bars -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ` : `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8 items-stretch">
            <!-- DISTRIBUSI BEBAN KERJA TIM (Col 7 on LG) -->
            <div class="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                    <!-- Header -->
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3.5">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs shrink-0">
                                <i class="fa-solid fa-chart-column"></i>
                            </span>
                            <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Distribusi Beban Kerja Tim</h3>
                            <span id="workloadMonthIndicator" class="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"></span>
                        </div>
                        <div class="text-[9px] font-bold text-slate-450 uppercase tracking-wider flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span class="inline-flex items-center"><span class="w-2 h-2 rounded-full bg-indigo-500 mr-1"></span> Rutin</span>
                            <span class="inline-flex items-center"><span class="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span> Ad Hoc</span>
                            <span class="inline-flex items-center"><span class="w-2 h-2 rounded-full bg-violet-500 mr-1"></span> Protokol</span>
                            <span class="inline-flex items-center"><span class="w-2 h-2 rounded-full bg-sky-500 mr-1"></span> Konten</span>
                        </div>
                    </div>

                    <!-- Micro Metric Quick Summary Strip -->
                    <div id="workloadSummaryStrip" class="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/90 dark:bg-slate-750/50 rounded-xl border border-slate-150 dark:border-slate-700/60 mb-2.5 text-center">
                        <div>
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Total Tugas</span>
                            <span id="workloadTotalTasksBadge" class="text-xs sm:text-sm font-black text-slate-800 dark:text-white">0 tugas</span>
                        </div>
                        <div class="border-x border-slate-200 dark:border-slate-700">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Personil Terjadwal</span>
                            <span id="workloadActiveMembersBadge" class="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">0 orang</span>
                        </div>
                        <div>
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Rata-rata Beban</span>
                            <span id="workloadAvgTasksBadge" class="text-xs sm:text-sm font-black text-slate-800 dark:text-white">0 tugas/org</span>
                        </div>
                    </div>
                </div>

                <!-- Main Chart Canvas Area -->
                <div class="relative w-full flex-1 min-h-[220px] max-h-[260px] flex items-center justify-center my-1.5">
                    <canvas id="stackedTasksChart" class="w-full h-full"></canvas>
                </div>

                <!-- Bottom Team Member Contribution Chips -->
                <div class="pt-2.5 border-t border-slate-100 dark:border-slate-700/70 mt-1.5">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Beban per Anggota Tim</span>
                        <span class="text-[9px] font-bold text-slate-500 dark:text-slate-400" id="workloadTopContributorText">Beban tertinggi: -</span>
                    </div>
                    <div id="workloadMemberChips" class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <!-- Populated dynamically with member chips -->
                    </div>
                </div>
            </div>

            <!-- CAPAIAN TARGET BULANAN (Col 5 on LG) -->
            <div id="target-monthly-achievement-card" class="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                    <!-- Header with Title & Month Selector -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs shrink-0">
                                    <i class="fa-solid fa-bullseye"></i>
                                </span>
                                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Capaian Target Bulanan</h3>
                            </div>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Persentase target tercapai vs belum tercapai</p>
                        </div>
                        <div class="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                            <select id="targetMonthSelector" onchange="renderTargetAchievementChart(this.value)" class="text-[11px] font-bold px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl outline-hidden cursor-pointer hover:border-indigo-400 transition-all">
                                <!-- Populated dynamically -->
                            </select>
                        </div>
                    </div>

                    <!-- Target Status Alert Pill -->
                    <div id="targetStatusPillContainer" class="mb-2.5">
                        <!-- Populated: e.g. Target Tercapai (85%) -->
                    </div>

                    <!-- Donut Chart & Stat Cards (Side-by-side on sm/lg) -->
                    <div class="flex flex-col sm:flex-row items-center gap-3.5 my-2 p-2.5 bg-slate-50/70 dark:bg-slate-750/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div class="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                            <canvas id="bidangContributionChart" class="w-full h-full"></canvas>
                            <div id="targetAchievementCenter" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                <span id="targetPercentDisplay" class="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">0%</span>
                                <span id="targetStatusBadgeText" class="text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mt-0.5">Tercapai</span>
                            </div>
                        </div>

                        <!-- Stat Cards: Tercapai vs Belum Tercapai -->
                        <div class="flex-1 w-full grid grid-cols-2 sm:grid-cols-1 gap-2">
                            <div class="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-800/50 flex flex-col justify-between">
                                <div class="flex items-center justify-between text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                    <span class="flex items-center gap-1"><i class="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i> Tercapai</span>
                                    <span id="targetTercapaiPct" class="font-black text-xs">0%</span>
                                </div>
                                <p id="targetTercapaiCount" class="text-sm sm:text-base font-black text-slate-800 dark:text-white mt-0.5">0 <span class="text-[9px] font-medium text-slate-400">tugas</span></p>
                            </div>
                            <div class="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 border border-rose-200/70 dark:border-rose-800/50 flex flex-col justify-between">
                                <div class="flex items-center justify-between text-[10px] font-bold text-rose-700 dark:text-rose-400">
                                    <span class="flex items-center gap-1"><i class="fa-solid fa-circle-xmark text-rose-500 text-[10px]"></i> Belum/Tidak</span>
                                    <span id="targetBelumPct" class="font-black text-xs">0%</span>
                                </div>
                                <p id="targetBelumCount" class="text-sm sm:text-base font-black text-slate-800 dark:text-white mt-0.5">0 <span class="text-[9px] font-medium text-slate-400">tugas</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Section: Quick Monthly Trend Pills & Rubrikasi Breakdown -->
                <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Capaian Antar Bulan</span>
                        <span id="targetTotalMonthLabel" class="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">Total: 0 Target</span>
                    </div>

                    <!-- Mini Horizontal Scrollable Month Track -->
                    <div id="targetMonthlyStrip" class="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                        <!-- Populated with Jan - Des pills with % -->
                    </div>

                    <!-- Breakdown Rubrikasi / Kategori Bulan Ini -->
                    <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <div class="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
                            <span>Proporsi Rubrikasi Tugas</span>
                            <span class="text-[9px] text-slate-400 font-normal">Capaian</span>
                        </div>
                        <div id="bidang-breakdown" class="flex flex-col gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            <!-- Populated with Rubrikasi bars -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `}

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div class="bg-gradient-to-br from-indigo-500/10 to-indigo-650/10 border border-indigo-150 dark:border-indigo-950 p-4 sm:p-5 rounded-2xl">
                <div class="flex justify-between items-start">
                    <h4 class="text-[9px] sm:text-[10px] font-black text-indigo-750 dark:text-indigo-400 uppercase tracking-widest">MC</h4>
                    <span class="px-2 py-0.5 bg-indigo-500 text-white rounded text-[8px] font-black uppercase tracking-wider">${totalMc}</span>
                </div>
                <p class="text-xl font-extrabold text-slate-800 dark:text-white mt-3">${totalMc} <span class="text-xs font-semibold text-slate-455">agenda</span></p>
            </div>
            <div class="bg-gradient-to-br from-violet-500/10 to-violet-650/10 border border-violet-150 dark:border-violet-950 p-4 sm:p-5 rounded-2xl">
                <div class="flex justify-between items-start">
                    <h4 class="text-[9px] sm:text-[10px] font-black text-violet-750 dark:text-violet-400 uppercase tracking-widest">Protokol</h4>
                    <span class="px-2 py-0.5 bg-violet-500 text-white rounded text-[8px] font-black uppercase tracking-wider">${totalProto}</span>
                </div>
                <p class="text-xl font-extrabold text-slate-800 dark:text-white mt-3">${totalProto} <span class="text-xs font-semibold text-slate-455">agenda</span></p>
            </div>
            <div class="bg-gradient-to-br from-emerald-500/10 to-emerald-650/10 border border-emerald-150 dark:border-emerald-950 p-4 sm:p-5 rounded-2xl">
                <div class="flex justify-between items-start">
                    <h4 class="text-[9px] sm:text-[10px] font-black text-emerald-750 dark:text-emerald-400 uppercase tracking-widest">Rilis BRS</h4>
                    <span class="px-2 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-wider">${totalBrs}</span>
                </div>
                <p class="text-xl font-extrabold text-slate-800 dark:text-white mt-3">${totalBrs} <span class="text-xs font-semibold text-slate-455">dirilis</span></p>
            </div>
            <div class="bg-gradient-to-br from-rose-500/10 to-rose-650/10 border border-rose-150 dark:border-rose-950 p-4 sm:p-5 rounded-2xl">
                <div class="flex justify-between items-start">
                    <h4 class="text-[9px] sm:text-[10px] font-black text-rose-750 dark:text-rose-455 uppercase tracking-widest">Hari Besar</h4>
                    <span class="px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-wider">${totalHariBesar}</span>
                </div>
                <p class="text-xl font-extrabold text-slate-800 dark:text-white mt-3">${totalHariBesar} <span class="text-xs font-semibold text-slate-455">ucapan</span></p>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-8">

            <!-- Card 1: Agenda Hari Ini -->
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-bell-concierge text-indigo-500"></i> Agenda Hari Ini
                </h3>
                <div class="space-y-2 flex-1 overflow-y-auto max-h-[230px] pr-1">
                    ${todayActivities.length > 0 ? todayActivities.map(act => `
                        <div class="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                            <div class="flex justify-between items-center text-[8px] font-extrabold uppercase tracking-widest text-slate-400">
                                <span>${act.tipe}</span>
                                <span class="text-indigo-650 dark:text-indigo-400">${act.jam}</span>
                            </div>
                            <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-1">${act.judul}</h4>
                            <p class="text-[9px] text-slate-500 mt-0.5 font-semibold">Petugas: ${act.pic || '-'}</p>
                        </div>
                    `).join('') : `
                        <div class="text-center py-10 text-slate-400">
                            <i class="fa-solid fa-mug-hot text-2xl mb-1 text-slate-350"></i>
                            <p class="text-[10px] font-bold">Tidak ada agenda hari ini.</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Card 2: Publish Hari Ini -->
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-paper-plane text-sky-500"></i> Publish Hari Ini
                    ${publishHariIni.length > 0 ? `<span class="ml-auto text-[9px] font-black bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-full">${publishHariIni.length} item</span>` : ''}
                </h3>
                <div class="space-y-2 flex-1 overflow-y-auto max-h-[230px] pr-1">
                    ${publishHariIni.length > 0 ? publishHariIni.map(p => `
                        <div class="p-2.5 bg-sky-50/60 dark:bg-sky-900/20 border border-sky-200/60 dark:border-sky-800/40 rounded-xl">
                            <span class="text-[8px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-sky-400">${p.tipe}</span>
                            <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-2">${p.judul}</h4>
                            <div class="flex items-center justify-between mt-1">
                                <p class="text-[9px] text-slate-500 font-semibold">PIC: ${p.pic}</p>
                                <span class="text-[8px] font-black px-1.5 py-0.5 rounded ${
                                    p.status === 'Done' || p.status === 'Posted' || p.status === 'Selesai'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                }">${p.status || '-'}</span>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="text-center py-10 text-slate-400">
                            <i class="fa-solid fa-calendar-check text-2xl mb-1 text-slate-300"></i>
                            <p class="text-[10px] font-bold">Tidak ada jadwal publish hari ini.</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Card 3: Batas Waktu Terdekat (H+1 s/d H+3) -->
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5">
                    <i class="fa-regular fa-clock text-amber-500"></i> Batas Waktu Terdekat
                    <span class="ml-auto text-[8px] font-black bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">H+1 s/d H+3</span>
                </h3>
                <div class="space-y-2 flex-1 overflow-y-auto max-h-[230px] pr-1">
                    ${upcomingDeadlines.length > 0 ? upcomingDeadlines.map(dl => {
                        const dlDate = parseDateTimeWIB(dl.tanggal, null, true);
                        const diffDays = dlDate ? Math.ceil((dlDate - todayMidnight) / (1000*60*60*24)) : 0;
                        const dayLabel = diffDays === 1 ? 'Besok' : diffDays === 2 ? 'Lusa' : `H+${diffDays}`;
                        return `
                        <div class="p-2.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-900/55 rounded-xl">
                            <div class="flex items-center justify-between">
                                <span class="text-[8px] font-extrabold uppercase tracking-widest text-amber-600">${dl.sumber}</span>
                                <span class="text-[8px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">${dayLabel}</span>
                            </div>
                            <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-1">${dl.judul}</h4>
                            <p class="text-[9px] text-slate-500 mt-0.5">PIC: ${dl.pic} &nbsp;•&nbsp; ${formatDate(dl.tanggal)}</p>
                        </div>
                    `}).join('') : `
                        <div class="text-center py-10 text-slate-400">
                            <i class="fa-solid fa-folder-open text-2xl mb-1 text-slate-350"></i>
                            <p class="text-[10px] font-bold">Tidak ada batas waktu 3 hari ke depan.</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Card 4: Tugas Terlambat (Overdue - datetime penuh) -->
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-triangle-exclamation text-rose-500"></i> Tugas Terlambat
                    ${overdueTasks.length > 0 ? `<span class="ml-auto text-[9px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">${overdueTasks.length}</span>` : ''}
                </h3>
                <div class="space-y-2 flex-1 overflow-y-auto max-h-[230px] pr-1">
                    ${overdueTasks.length > 0 ? overdueTasks.map(ov => `
                        <div class="p-2.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-900/55 rounded-xl">
                            <div class="flex items-center justify-between gap-1">
                                <span class="text-[8px] font-extrabold uppercase tracking-widest text-rose-500">${ov.sumber || ''}</span>
                                <span class="text-[8px] font-black text-rose-700 dark:text-rose-350 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 whitespace-nowrap">${formatDate(ov.tanggal)}</span>
                            </div>
                            <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 mt-0.5">${ov.judul}</h4>
                            <p class="text-[9px] text-slate-500 mt-0.5 font-semibold">PIC: ${ov.pic} &nbsp;•&nbsp; <span class="text-rose-600 font-bold">${ov.status || 'Ditugaskan'}</span></p>
                        </div>
                    `).join('') : `
                        <div class="text-center py-10 text-slate-400">
                            <i class="fa-solid fa-circle-check text-2xl mb-1 text-emerald-500"></i>
                            <p class="text-[10px] font-bold text-emerald-600">Semua tugas tepat waktu!</p>
                        </div>
                    `}
                </div>
            </div>

        </div>
    `;

    setTimeout(() => {
        if (!isTim) {
            // Render Distribusi Beban Kerja Tim untuk bulan terkait
            if (typeof window.renderTeamWorkloadChart === 'function') {
                window.renderTeamWorkloadChart(currentMonth);
            }

            // Render Capaian Target Bulanan & Proporsi Rubrikasi
            if (typeof window.renderTargetAchievementChart === 'function') {
                window.renderTargetAchievementChart(currentMonth);
            }
        } else {
            // Render Capaian Target Tahunan & Distribusi Jumlah Tugas Bulanan khusus role Tim
            if (typeof window.renderTimDashboardCharts === 'function') {
                window.renderTimDashboardCharts();
            }
        }
    }, 50);
}

// Helper: Memeriksa apakah suatu tugas ditugaskan ke anggota tim tertentu
function isTaskForMember(task, member) {
    if (!task || !member || !member.nama) return false;

    // Bersihkan nama member: buang catatan kurung e.g. (Koordinator), buang gelar akademik e.g. , S.Tr.Stat.
    const cleanMemberName = member.nama.replace(/\(.*?\)/g, '').replace(/,\s*[A-Za-z0-9\.\s]+$/, '').trim().toLowerCase();
    const rawMemberName = member.nama.trim().toLowerCase();
    const memberFirst = cleanMemberName.split(' ')[0];

    const picFields = [
        task.petugas,
        task.pic,
        task['assign To'],
        task.assignTo,
        task.assignedTo,
        task.assigned_to,
        task.pembuat_konten,
        task.pic_poster_info,
        task.pic_doc_ruang,
        task.pic_doc_yt_zoom
    ].filter(Boolean);

    if (picFields.length === 0) return false;

    return picFields.some(fieldVal => {
        const valStr = String(fieldVal).trim().toLowerCase();
        const cleanVal = valStr.replace(/\(.*?\)/g, '').replace(/,\s*[A-Za-z0-9\.\s]+$/, '').trim();

        // Exact match
        if (cleanVal === cleanMemberName || valStr === rawMemberName) return true;

        // Mutual containment (e.g. 'Azhari' in 'Azhari (Koordinator)', or 'Azhari, S.Tr.Stat.' contains 'Azhari')
        if (cleanMemberName.length >= 3 && cleanVal.includes(cleanMemberName)) return true;
        if (cleanVal.length >= 3 && cleanMemberName.includes(cleanVal)) return true;

        // Multiple PICs separated by comma / slash / ampersand
        if (valStr.includes(',') || valStr.includes('&') || valStr.includes('/')) {
            const splitted = valStr.split(/[,&\/]/).map(s => s.trim().replace(/\(.*?\)/g, '').toLowerCase());
            if (splitted.some(s => s === cleanMemberName || (s.length >= 3 && cleanMemberName.includes(s)) || (cleanMemberName.length >= 3 && s.includes(cleanMemberName)))) {
                return true;
            }
        }

        // First name match if at least 4 letters
        if (memberFirst.length >= 4 && cleanVal.split(' ')[0] === memberFirst) {
            return true;
        }

        return false;
    });
}

/**
 * Render dynamic stacked team workload distribution chart based on the selected month
 * @param {number|string} targetMonthParam - month index (0-11) or 'all'
 */
window.renderTeamWorkloadChart = function(targetMonthParam) {
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const now = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();

    let targetMonth;
    if (targetMonthParam === 'all') {
        targetMonth = 'all';
    } else if (targetMonthParam !== undefined && targetMonthParam !== null && targetMonthParam !== '') {
        const parsedM = parseInt(targetMonthParam, 10);
        targetMonth = isNaN(parsedM) ? currentMonthIdx : parsedM;
    } else {
        targetMonth = currentMonthIdx;
    }

    // Update workload month indicator badge
    const indicatorEl = document.getElementById('workloadMonthIndicator');
    if (indicatorEl) {
        indicatorEl.textContent = targetMonth === 'all' ? `Tahun ${currentYear}` : `${monthNames[targetMonth]} ${currentYear}`;
    }

    // Helper filter per targetMonth & currentYear
    const isTaskInSelectedMonth = (item) => {
        if (!item) return false;
        const dStr = item.tanggal || item.jadwal || item.tanggal_posting || item.tanggal_rilis || item.deadline || item.tayang || item.date;
        if (!dStr && dStr !== 0) return false;
        const d = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : new Date(dStr);
        if (!d || isNaN(d.getTime())) return false;
        if (d.getFullYear() !== currentYear) return false;
        if (targetMonth !== 'all' && d.getMonth() !== targetMonth) return false;
        return true;
    };

    const rutinInMonth = (db.rekapRutin || []).filter(isTaskInSelectedMonth);
    const adHocInMonth = (db.adHoc || []).filter(isTaskInSelectedMonth);
    const protoInMonth = (db.protokoler || []).filter(isTaskInSelectedMonth);
    const mcInMonth = (db.mc || []).filter(isTaskInSelectedMonth);
    const brsInMonth = (db.brsRilis || []).filter(isTaskInSelectedMonth);
    const hbInMonth = (db.hariBesar || []).filter(isTaskInSelectedMonth);
    const plannerInMonth = (db.contentPlanner || []).filter(isTaskInSelectedMonth);
    const assignInMonth = (db.assignments || []).filter(isTaskInSelectedMonth);
    const ticketsInMonth = (db.tickets || []).filter(t => t.status === 'Approved').filter(isTaskInSelectedMonth);

    // List of team members: HANYA pegawai yang terdaftar pada sheet team di database (db.team)
    const memberMap = new Map();

    const addMemberIfValid = (rawName, role = 'tim') => {
        if (!rawName || typeof rawName !== 'string') return;
        const trimmed = rawName.trim();
        if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'belum ditugaskan' || trimmed.toLowerCase() === 'null') return;
        const clean = trimmed.replace(/\(.*?\)/g, '').replace(/,\s*[A-Za-z0-9\.\s]+$/, '').trim();
        if (!clean || clean.length < 2) return;
        const key = clean.toLowerCase();

        // Abaikan entitas non-personil
        if (['pimpinan', 'bps ri', 'bps kalbar', 'semua', 'umum'].includes(key)) return;

        if (!memberMap.has(key)) {
            memberMap.set(key, { nama: trimmed, cleanName: clean, role });
        }
    };

    // Sumber daftar pegawai strictly hanya dari sheet team (db.team)
    (db.team || []).forEach(m => {
        if (m && m.nama) {
            addMemberIfValid(m.nama, m.jabatan || m.role || 'tim');
        }
    });

    const teamSource = Array.from(memberMap.values());

    const memberTasks = teamSource.map(member => {
        const rTasks = rutinInMonth.filter(r => isTaskForMember(r, member)).length +
                       brsInMonth.filter(b => isTaskForMember(b, member)).length;
        const aTasks = adHocInMonth.filter(a => isTaskForMember(a, member)).length;
        const pTasks = protoInMonth.filter(p => isTaskForMember(p, member)).length + 
                       mcInMonth.filter(m => isTaskForMember(m, member)).length;
        const cTasks = plannerInMonth.filter(c => isTaskForMember(c, member)).length + 
                       assignInMonth.filter(as => isTaskForMember(as, member)).length +
                       hbInMonth.filter(h => isTaskForMember(h, member)).length +
                       ticketsInMonth.filter(t => isTaskForMember(t, member)).length;

        const cleanName = member.cleanName || (member.nama || 'Anggota').replace(/\(.*?\)/g, '').replace(/,\s*[A-Za-z0-9\.\s]+$/, '').trim();
        const shortName = cleanName.split(' ')[0] || cleanName;

        return {
            name: shortName,
            fullName: cleanName,
            rTasks,
            aTasks,
            pTasks,
            cTasks,
            total: rTasks + aTasks + pTasks + cTasks
        };
    });

    // Urutkan anggota: Yang memiliki beban tugas lebih banyak ditampilkan lebih dulu
    memberTasks.sort((a, b) => b.total - a.total);

    // Hitung ringkasan beban kerja tim untuk micro-metrics
    const totalTeamTasks = memberTasks.reduce((acc, m) => acc + m.total, 0);
    const activeMembersCount = memberTasks.filter(m => m.total > 0).length;
    const avgPerMember = memberTasks.length > 0 ? (totalTeamTasks / memberTasks.length).toFixed(1) : 0;
    const topMember = memberTasks.find(m => m.total > 0);

    // Update Quick Metric Strip di atas chart
    const totalBadgeEl = document.getElementById('workloadTotalTasksBadge');
    if (totalBadgeEl) totalBadgeEl.textContent = `${totalTeamTasks} tugas`;

    const activeBadgeEl = document.getElementById('workloadActiveMembersBadge');
    if (activeBadgeEl) activeBadgeEl.textContent = `${activeMembersCount} dari ${memberTasks.length} org`;

    const avgBadgeEl = document.getElementById('workloadAvgTasksBadge');
    if (avgBadgeEl) avgBadgeEl.textContent = `${avgPerMember} tugas/org`;

    const topContributorEl = document.getElementById('workloadTopContributorText');
    if (topContributorEl) {
        topContributorEl.innerHTML = topMember 
            ? `Beban tertinggi: <strong class="text-indigo-650 dark:text-indigo-400 font-bold">${topMember.name}</strong> (${topMember.total} tugas)` 
            : 'Belum ada agenda tugas';
    }

    // Update Member Breakdown Chips di bawah chart
    const chipsEl = document.getElementById('workloadMemberChips');
    if (chipsEl) {
        if (memberTasks.length === 0 || totalTeamTasks === 0) {
            chipsEl.innerHTML = `<span class="text-[10px] text-slate-400 italic py-1">Belum ada tugas terjadwal untuk personil tim pada bulan ini.</span>`;
        } else {
            chipsEl.innerHTML = memberTasks.map(m => {
                const initials = typeof getPicInitials === 'function' ? getPicInitials(m.fullName) : m.name.charAt(0);
                const avatarBg = typeof getAvatarBg === 'function' ? getAvatarBg(m.fullName) : 'bg-slate-200';
                const sharePct = totalTeamTasks > 0 ? Math.round((m.total / totalTeamTasks) * 100) : 0;
                let badgeClass = 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
                if (m.total > 0) {
                    badgeClass = sharePct >= 25 
                        ? 'bg-indigo-600 text-white font-extrabold shadow-2xs' 
                        : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 font-bold';
                }
                return `
                    <div class="px-2.5 py-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-750/70 border border-slate-200/70 dark:border-slate-700 flex items-center gap-2 shrink-0 transition-all hover:border-indigo-400 shadow-2xs">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ${avatarBg}">${initials}</div>
                        <div class="flex flex-col text-left">
                            <span class="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">${m.name}</span>
                            <span class="text-[8px] text-slate-400 leading-none">${m.fullName !== m.name ? m.fullName.slice(0, 12) : 'Tim Humas'}</span>
                        </div>
                        <span class="ml-0.5 px-1.5 py-0.5 rounded-md text-[9px] ${badgeClass}">
                            ${m.total} <span class="text-[7.5px] font-normal opacity-85">(${sharePct}%)</span>
                        </span>
                    </div>
                `;
            }).join('');
        }
    }

    const labels = memberTasks.map(m => m.name);
    const rutinData = memberTasks.map(m => m.rTasks);
    const adhocData = memberTasks.map(m => m.aTasks);
    const protoData = memberTasks.map(m => m.pTasks);
    const plannerData = memberTasks.map(m => m.cTasks);

    const ctxStack = document.getElementById('stackedTasksChart')?.getContext('2d');
    if (ctxStack) {
        if (window.chartInstance) {
            window.chartInstance.destroy();
            window.chartInstance = null;
        }
        window.chartInstance = new Chart(ctxStack, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Rutin & BRS', data: rutinData, backgroundColor: '#6366f1', borderRadius: 5, maxBarThickness: 38, categoryPercentage: 0.72, barPercentage: 0.85 },
                    { label: 'Ad Hoc', data: adhocData, backgroundColor: '#10b981', borderRadius: 5, maxBarThickness: 38, categoryPercentage: 0.72, barPercentage: 0.85 },
                    { label: 'Protokol & MC', data: protoData, backgroundColor: '#8b5cf6', borderRadius: 5, maxBarThickness: 38, categoryPercentage: 0.72, barPercentage: 0.85 },
                    { label: 'Konten & Tugas', data: plannerData, backgroundColor: '#0ea5e9', borderRadius: 5, maxBarThickness: 38, categoryPercentage: 0.72, barPercentage: 0.85 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 6, bottom: 2, left: 2, right: 6 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        padding: 10,
                        titleFont: { size: 11, weight: 'bold' },
                        bodyFont: { size: 10 },
                        footerFont: { size: 10, weight: 'bold' },
                        callbacks: {
                            afterTitle: function(context) {
                                const idx = context[0]?.dataIndex;
                                if (idx !== undefined && memberTasks[idx]) {
                                    return memberTasks[idx].fullName;
                                }
                                return '';
                            },
                            footer: function(context) {
                                const idx = context[0]?.dataIndex;
                                if (idx !== undefined && memberTasks[idx]) {
                                    return `Total: ${memberTasks[idx].total} tugas (${targetMonth === 'all' ? 'Tahun ' + currentYear : monthNames[targetMonth]})`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        stacked: true, 
                        grid: { display: false }, 
                        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } } 
                    },
                    y: { 
                        stacked: true, 
                        grid: { color: 'rgba(226, 232, 240, 0.35)' }, 
                        beginAtZero: true, 
                        grace: '10%',
                        ticks: { stepSize: 1, precision: 0, color: '#94a3b8', font: { size: 9 } } 
                    }
                }
            }
        });
    }
};

/**
 * Render dynamic monthly target achievement chart, stats, monthly selector, and rubrikasi breakdown
 * @param {number|string} selectedMonthParam - month index (0-11) or 'all'
 */
window.renderTargetAchievementChart = function(selectedMonthParam) {
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const now = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();

    let targetMonth;
    if (selectedMonthParam === 'all') {
        targetMonth = 'all';
    } else if (selectedMonthParam !== undefined && selectedMonthParam !== null && selectedMonthParam !== '') {
        const parsedM = parseInt(selectedMonthParam, 10);
        targetMonth = isNaN(parsedM) ? currentMonthIdx : parsedM;
    } else {
        targetMonth = currentMonthIdx;
    }

    // Selaraskan tampilan distribusi beban kerja tim dengan bulan yang dipilih
    if (typeof window.renderTeamWorkloadChart === 'function') {
        window.renderTeamWorkloadChart(targetMonth);
    }

    // Populate or sync Month Selector dropdown
    const selectorEl = document.getElementById('targetMonthSelector');
    if (selectorEl) {
        if (selectorEl.options.length === 0) {
            let opts = '';
            monthNames.forEach((mName, idx) => {
                const isSel = idx === targetMonth ? 'selected' : '';
                opts += `<option value="${idx}" ${isSel}>${mName} ${currentYear}</option>`;
            });
            opts += `<option value="all" ${targetMonth === 'all' ? 'selected' : ''}>Sepanjang Tahun ${currentYear}</option>`;
            selectorEl.innerHTML = opts;
        } else if (String(selectorEl.value) !== String(targetMonth)) {
            selectorEl.value = String(targetMonth);
        }
    }

    const isTaskDone = (status, item) => {
        if (item && Number(item.progres) >= 100) return true;
        if (!status) return false;
        const st = String(status).toLowerCase().trim();
        return st === 'selesai' || st === 'done' || st === 'posted' || st === 'tercapai' || st === 'terbit' || st === 'sukses' || st === 'published';
    };

    // Calculate stats for a given month or all
    const computeStatsForMonth = (mIdx) => {
        let total = 0;
        let tercapai = 0;
        let belum = 0;
        const rubrikBreakdown = {};

        const processItem = (item, dateField, defaultRubrik) => {
            if (!item) return;
            const dStr = item[dateField] || item.tanggal || item.jadwal || item.tanggal_posting || item.tanggal_rilis || item.deadline || item.tanggal_penugasan || item.tayang || item.date;
            if (!dStr && dStr !== 0) return;
            const parsed = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : new Date(dStr);
            if (!parsed || isNaN(parsed.getTime())) return;

            // Filter year
            if (parsed.getFullYear() !== currentYear) return;

            // Filter month if not 'all'
            if (mIdx !== 'all' && parsed.getMonth() !== mIdx) return;

            total++;
            const done = isTaskDone(item.status, item);
            if (done) {
                tercapai++;
            } else {
                belum++;
            }

            const rubrik = item.rubrikasi || defaultRubrik || 'Umum';
            if (!rubrikBreakdown[rubrik]) {
                rubrikBreakdown[rubrik] = { total: 0, tercapai: 0 };
            }
            rubrikBreakdown[rubrik].total++;
            if (done) rubrikBreakdown[rubrik].tercapai++;
        };

        (db.rekapRutin || []).forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Rutin Humas'));
        (db.adHoc || []).forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Ad Hoc & Peliputan'));
        (db.protokoler || []).forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Keprotokolan'));
        (db.mc || []).forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Master of Ceremony'));
        (db.brsRilis || []).forEach(i => processItem(i, 'tanggal_rilis', i.rubrikasi || 'Rilis Statistik (BRS)'));
        (db.hariBesar || []).forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Hari Besar & Medsos'));
        (db.contentPlanner || []).forEach(i => processItem(i, 'jadwal', i.rubrikasi || i.jenis_konten || 'Konten Publikasi'));
        (db.assignments || []).forEach(i => processItem(i, 'deadline', i.rubrikasi || 'Penugasan Tim'));
        (db.tickets || []).filter(t => t.status === 'Approved').forEach(i => processItem(i, 'deadline', i.rubrikasi || 'Layanan Humas'));

        const pct = total > 0 ? Math.round((tercapai / total) * 100) : 0;
        const belumPct = total > 0 ? (100 - pct) : 0;

        return { total, tercapai, belum, pct, belumPct, rubrikBreakdown };
    };

    const activeStats = computeStatsForMonth(targetMonth);

    // Update center percentage & badges
    const pctDisplay = document.getElementById('targetPercentDisplay');
    if (pctDisplay) pctDisplay.textContent = `${activeStats.pct}%`;

    const statusBadge = document.getElementById('targetStatusBadgeText');
    if (statusBadge) {
        if (activeStats.total === 0) {
            statusBadge.textContent = 'Belum Ada Target';
            statusBadge.className = 'text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1';
        } else if (activeStats.pct >= 80) {
            statusBadge.textContent = 'Target Tercapai';
            statusBadge.className = 'text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-1';
        } else if (activeStats.pct >= 50) {
            statusBadge.textContent = 'Progres Baik';
            statusBadge.className = 'text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-1';
        } else {
            statusBadge.textContent = 'Belum Tercapai';
            statusBadge.className = 'text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mt-1';
        }
    }

    const tercapaiPctEl = document.getElementById('targetTercapaiPct');
    if (tercapaiPctEl) tercapaiPctEl.textContent = `${activeStats.pct}%`;

    const tercapaiCountEl = document.getElementById('targetTercapaiCount');
    if (tercapaiCountEl) tercapaiCountEl.innerHTML = `${activeStats.tercapai} <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500">tugas</span>`;

    const belumPctEl = document.getElementById('targetBelumPct');
    if (belumPctEl) belumPctEl.textContent = `${activeStats.belumPct}%`;

    const belumCountEl = document.getElementById('targetBelumCount');
    if (belumCountEl) belumCountEl.innerHTML = `${activeStats.belum} <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500">tugas</span>`;

    const totalLabelEl = document.getElementById('targetTotalMonthLabel');
    if (totalLabelEl) {
        const monthTitle = targetMonth === 'all' ? `Tahun ${currentYear}` : `${monthNames[targetMonth]} ${currentYear}`;
        totalLabelEl.textContent = `${activeStats.total} Target (${monthTitle})`;
    }

    // Status pill alert
    const pillContainer = document.getElementById('targetStatusPillContainer');
    if (pillContainer) {
        if (activeStats.total === 0) {
            pillContainer.innerHTML = `
                <div class="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-600/50 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <i class="fa-solid fa-circle-info text-slate-400"></i>
                    <span>Belum ada agenda target tugas tercatat pada periode ini.</span>
                </div>
            `;
        } else if (activeStats.pct >= 80) {
            pillContainer.innerHTML = `
                <div class="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-800/60 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                    <span class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i> Target Tercapai Optimal (${activeStats.pct}%)</span>
                    <span class="text-[10px] font-black px-2 py-0.5 bg-emerald-500 text-white rounded-md">${activeStats.tercapai}/${activeStats.total} Selesai</span>
                </div>
            `;
        } else if (activeStats.pct >= 50) {
            pillContainer.innerHTML = `
                <div class="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-300/60 dark:border-amber-800/60 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                    <span class="flex items-center gap-1.5"><i class="fa-solid fa-clock-rotate-left text-amber-500 text-xs"></i> Capaian Berjalan (${activeStats.pct}%)</span>
                    <span class="text-[10px] font-black px-2 py-0.5 bg-amber-500 text-white rounded-md">${activeStats.tercapai}/${activeStats.total} Selesai</span>
                </div>
            `;
        } else {
            pillContainer.innerHTML = `
                <div class="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-300/60 dark:border-rose-800/60 flex items-center justify-between text-[11px] text-rose-800 dark:text-rose-300 font-semibold">
                    <span class="flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation text-rose-500 text-xs"></i> Target Belum Tercapai (${activeStats.pct}%)</span>
                    <span class="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-md">${activeStats.tercapai}/${activeStats.total} Selesai</span>
                </div>
            `;
        }
    }

    // Chart.js doughnut update
    const ctxBidang = document.getElementById('bidangContributionChart')?.getContext('2d');
    if (ctxBidang) {
        if (window.sentimentChartInstance) window.sentimentChartInstance.destroy();

        let chartData = [];
        let chartColors = [];
        let chartLabels = [];

        if (activeStats.total === 0) {
            chartData = [1];
            chartColors = ['#cbd5e1'];
            chartLabels = ['Belum ada target'];
        } else {
            chartData = [activeStats.tercapai, activeStats.belum];
            chartColors = ['#10b981', '#f43f5e'];
            chartLabels = ['Target Tercapai', 'Belum / Tidak Tercapai'];
        }

        window.sentimentChartInstance = new Chart(ctxBidang, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                if (activeStats.total === 0) return ' Belum ada target';
                                const val = context.raw || 0;
                                const p = Math.round((val / activeStats.total) * 100);
                                return ` ${context.label}: ${val} tugas (${p}%)`;
                            }
                        }
                    }
                },
                cutout: '72%'
            }
        });
    }

    // Populate Monthly Strip Pills (Jan - Des)
    const monthlyStripEl = document.getElementById('targetMonthlyStrip');
    if (monthlyStripEl) {
        let stripHtml = '';
        monthShort.forEach((mShort, idx) => {
            const mStats = computeStatsForMonth(idx);
            const isActive = targetMonth === idx;
            let badgeBg = 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-650';
            let dotColor = 'bg-slate-300 dark:bg-slate-600';

            if (mStats.total > 0) {
                if (mStats.pct >= 80) {
                    badgeBg = isActive ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400/50' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100';
                    dotColor = isActive ? 'bg-white' : 'bg-emerald-500';
                } else if (mStats.pct >= 50) {
                    badgeBg = isActive ? 'bg-amber-600 text-white font-black shadow-xs ring-2 ring-amber-400/50' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100';
                    dotColor = isActive ? 'bg-white' : 'bg-amber-500';
                } else {
                    badgeBg = isActive ? 'bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-400/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-100';
                    dotColor = isActive ? 'bg-white' : 'bg-rose-500';
                }
            } else if (isActive) {
                badgeBg = 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 font-bold ring-2 ring-indigo-500/50';
                dotColor = 'bg-slate-400';
            }

            const pctText = mStats.total > 0 ? `${mStats.pct}%` : '-';

            stripHtml += `
                <button type="button" onclick="renderTargetAchievementChart(${idx})" class="px-2 py-1 rounded-lg text-[9px] flex flex-col items-center justify-center shrink-0 min-w-[42px] transition-all cursor-pointer ${badgeBg}">
                    <span class="font-bold uppercase tracking-tight">${mShort}</span>
                    <span class="flex items-center gap-1 mt-0.5 font-bold">
                        <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
                        <span>${pctText}</span>
                    </span>
                </button>
            `;
        });
        monthlyStripEl.innerHTML = stripHtml;
    }

    // Populate Rubrikasi Breakdown
    const breakdownEl = document.getElementById('bidang-breakdown');
    if (breakdownEl) {
        const rubrikKeys = Object.keys(activeStats.rubrikBreakdown);
        if (rubrikKeys.length === 0) {
            breakdownEl.innerHTML = `<p class="text-slate-400 dark:text-slate-500 italic text-[10px] text-center py-1.5">Tidak ada rincian tugas pada periode ini</p>`;
        } else {
            const rubrikColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f43f5e'];
            breakdownEl.innerHTML = `
                <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                    ${rubrikKeys.slice(0, 8).map((key, idx) => {
                        const item = activeStats.rubrikBreakdown[key];
                        const rPct = item.total > 0 ? Math.round((item.tercapai / item.total) * 100) : 0;
                        const c = rubrikColors[idx % rubrikColors.length];
                        return `
                            <div class="space-y-1">
                                <div class="flex justify-between items-center text-[10px]">
                                    <span class="flex items-center gap-1.5 truncate max-w-[170px]">
                                        <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${c}"></span>
                                        <span class="truncate font-medium text-slate-700 dark:text-slate-300">${key}</span>
                                    </span>
                                    <span class="font-bold text-slate-700 dark:text-slate-200 shrink-0">
                                        <span class="${rPct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}">${item.tercapai}/${item.total}</span>
                                        <span class="text-[9px] text-slate-400 ml-0.5">(${rPct}%)</span>
                                    </span>
                                </div>
                                <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div class="h-full rounded-full transition-all duration-500" style="width: ${rPct}%; background-color: ${c}"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }
};

/**
 * Render dynamic annual target achievement chart, monthly task distribution (Jan-Des),
 * and individual metrics specifically for role Tim (Tim Humas)
 */
window.renderTimDashboardCharts = function() {
    if (!currentUser || currentUser.role !== 'tim') return;

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const now = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    const currentYear = now.getFullYear();

    const isTaskDone = (status, item) => {
        if (item && Number(item.progres) >= 100) return true;
        if (!status) return false;
        const st = String(status).toLowerCase().trim();
        return st === 'selesai' || st === 'done' || st === 'posted' || st === 'tercapai' || st === 'terbit' || st === 'sukses' || st === 'published';
    };

    // Filter task sources for current logged-in team member only
    const userRutin = (db.rekapRutin || []).filter(isTaskForCurrentUser);
    const userAdHoc = (db.adHoc || []).filter(isTaskForCurrentUser);
    const userProto = (db.protokoler || []).filter(isTaskForCurrentUser);
    const userMc = (db.mc || []).filter(isTaskForCurrentUser);
    const userBrs = (db.brsRilis || []).filter(isTaskForCurrentUser);
    const userHb = (db.hariBesar || []).filter(isTaskForCurrentUser);
    const userPlanner = (db.contentPlanner || []).filter(isTaskForCurrentUser);
    const userAssign = (db.assignments || []).filter(isTaskForCurrentUser);
    const userTickets = (db.tickets || []).filter(t => t.status === 'Approved').filter(isTaskForCurrentUser);

    // Compute stats per month (0 to 11) for currentYear
    const monthlyStats = [];
    const rubrikBreakdown = {};
    let annualTotal = 0;
    let annualSelesai = 0;
    let annualBelum = 0;

    for (let m = 0; m < 12; m++) {
        monthlyStats.push({ monthIdx: m, name: monthNames[m], short: monthShort[m], total: 0, selesai: 0, belum: 0 });
    }

    const processItem = (item, dateField, defaultRubrik) => {
        if (!item) return;
        const dStr = item[dateField] || item.tanggal || item.jadwal || item.tanggal_posting || item.tanggal_rilis || item.deadline || item.tanggal_penugasan || item.tayang || item.date;
        if (!dStr && dStr !== 0) return;
        const parsed = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : new Date(dStr);
        if (!parsed || isNaN(parsed.getTime())) return;
        if (parsed.getFullYear() !== currentYear) return;

        const mIdx = parsed.getMonth();
        if (mIdx < 0 || mIdx > 11) return;

        const done = isTaskDone(item.status, item);
        monthlyStats[mIdx].total++;
        annualTotal++;

        if (done) {
            monthlyStats[mIdx].selesai++;
            annualSelesai++;
        } else {
            monthlyStats[mIdx].belum++;
            annualBelum++;
        }

        const rubrik = item.rubrikasi || defaultRubrik || 'Umum';
        if (!rubrikBreakdown[rubrik]) {
            rubrikBreakdown[rubrik] = { total: 0, selesai: 0 };
        }
        rubrikBreakdown[rubrik].total++;
        if (done) rubrikBreakdown[rubrik].selesai++;
    };

    userRutin.forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Rutin Humas'));
    userAdHoc.forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Ad Hoc & Peliputan'));
    userProto.forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Keprotokolan'));
    userMc.forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Master of Ceremony'));
    userBrs.forEach(i => processItem(i, 'tanggal_rilis', i.rubrikasi || 'Rilis Statistik (BRS)'));
    userHb.forEach(i => processItem(i, 'tanggal', i.rubrikasi || 'Hari Besar & Medsos'));
    userPlanner.forEach(i => processItem(i, 'jadwal', i.rubrikasi || i.jenis_konten || 'Konten Publikasi'));
    userAssign.forEach(i => processItem(i, 'deadline', i.rubrikasi || 'Penugasan Tim'));
    userTickets.forEach(i => processItem(i, 'deadline', i.rubrikasi || 'Layanan Humas'));

    const annualPct = annualTotal > 0 ? Math.round((annualSelesai / annualTotal) * 100) : 0;
    const annualBelumPct = annualTotal > 0 ? (100 - annualPct) : 0;

    // --- 1. Populate Capaian Target Tahunan (Left Card) ---
    const pctDisplay = document.getElementById('timTargetPercentDisplay');
    if (pctDisplay) pctDisplay.textContent = `${annualPct}%`;

    const statusBadge = document.getElementById('timTargetStatusBadgeText');
    if (statusBadge) {
        if (annualTotal === 0) {
            statusBadge.textContent = 'Belum Ada Tugas';
            statusBadge.className = 'text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5';
        } else if (annualPct >= 80) {
            statusBadge.textContent = 'Selesai Optimal';
            statusBadge.className = 'text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5';
        } else if (annualPct >= 50) {
            statusBadge.textContent = 'Progres Baik';
            statusBadge.className = 'text-[8px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-0.5';
        } else {
            statusBadge.textContent = 'Belum Optimal';
            statusBadge.className = 'text-[8px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mt-0.5';
        }
    }

    const tercapaiPctEl = document.getElementById('timTargetTercapaiPct');
    if (tercapaiPctEl) tercapaiPctEl.textContent = `${annualPct}%`;

    const tercapaiCountEl = document.getElementById('timTargetTercapaiCount');
    if (tercapaiCountEl) tercapaiCountEl.innerHTML = `${annualSelesai} <span class="text-[9px] font-medium text-slate-400">tugas</span>`;

    const belumPctEl = document.getElementById('timTargetBelumPct');
    if (belumPctEl) belumPctEl.textContent = `${annualBelumPct}%`;

    const belumCountEl = document.getElementById('timTargetBelumCount');
    if (belumCountEl) belumCountEl.innerHTML = `${annualBelum} <span class="text-[9px] font-medium text-slate-400">tugas</span>`;

    const totalLabelEl = document.getElementById('timTargetTotalMonthLabel');
    if (totalLabelEl) totalLabelEl.textContent = `Total: ${annualTotal} Tugas (Tahun ${currentYear})`;

    // Status pill
    const pillContainer = document.getElementById('timTargetStatusPillContainer');
    if (pillContainer) {
        if (annualTotal === 0) {
            pillContainer.innerHTML = `
                <div class="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-600/50 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <i class="fa-solid fa-circle-info text-slate-400"></i>
                    <span>Belum ada agenda tugas tercatat untuk akun Anda di tahun ${currentYear}.</span>
                </div>
            `;
        } else if (annualPct >= 80) {
            pillContainer.innerHTML = `
                <div class="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-800/60 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                    <span class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i> Capaian Tahunan Sangat Baik (${annualPct}%)</span>
                    <span class="text-[10px] font-black px-2 py-0.5 bg-emerald-500 text-white rounded-md">${annualSelesai}/${annualTotal} Selesai</span>
                </div>
            `;
        } else if (annualPct >= 50) {
            pillContainer.innerHTML = `
                <div class="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-300/60 dark:border-amber-800/60 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                    <span class="flex items-center gap-1.5"><i class="fa-solid fa-clock-rotate-left text-amber-500 text-xs"></i> Capaian Tahunan Berjalan (${annualPct}%)</span>
                    <span class="text-[10px] font-black px-2 py-0.5 bg-amber-500 text-white rounded-md">${annualSelesai}/${annualTotal} Selesai</span>
                </div>
            `;
        } else {
            pillContainer.innerHTML = `
                <div class="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-300/60 dark:border-rose-800/60 flex items-center justify-between text-[11px] text-rose-800 dark:text-rose-300 font-semibold">
                    <span class="flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation text-rose-500 text-xs"></i> Tugas Belum Selesai Cukup Tinggi (${annualPct}%)</span>
                    <span class="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-md">${annualSelesai}/${annualTotal} Selesai</span>
                </div>
            `;
        }
    }

    // Donut Chart for Annual Achievement
    const ctxDonut = document.getElementById('timAnnualAchievementChart')?.getContext('2d');
    if (ctxDonut) {
        if (window.timDonutChartInstance) window.timDonutChartInstance.destroy();

        let chartData = [];
        let chartColors = [];
        let chartLabels = [];

        if (annualTotal === 0) {
            chartData = [1];
            chartColors = ['#cbd5e1'];
            chartLabels = ['Belum ada tugas'];
        } else {
            chartData = [annualSelesai, annualBelum];
            chartColors = ['#10b981', '#f43f5e'];
            chartLabels = ['Selesai', 'Belum Selesai'];
        }

        window.timDonutChartInstance = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                if (annualTotal === 0) return ' Belum ada tugas';
                                const val = context.raw || 0;
                                const p = Math.round((val / annualTotal) * 100);
                                return ` ${context.label}: ${val} tugas (${p}%)`;
                            }
                        }
                    }
                },
                cutout: '72%'
            }
        });
    }

    // Monthly Strip Jan - Des
    const monthlyStripEl = document.getElementById('timTargetMonthlyStrip');
    if (monthlyStripEl) {
        let stripHtml = '';
        monthlyStats.forEach((m) => {
            const mPct = m.total > 0 ? Math.round((m.selesai / m.total) * 100) : 0;
            let badgeBg = 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400';
            let dotColor = 'bg-slate-300 dark:bg-slate-600';

            if (m.total > 0) {
                if (mPct >= 80) {
                    badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40';
                    dotColor = 'bg-emerald-500';
                } else if (mPct >= 50) {
                    badgeBg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40';
                    dotColor = 'bg-amber-500';
                } else {
                    badgeBg = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40';
                    dotColor = 'bg-rose-500';
                }
            }

            const pctText = m.total > 0 ? `${mPct}%` : '-';

            stripHtml += `
                <div class="px-2 py-1 rounded-lg text-[9px] flex flex-col items-center justify-center shrink-0 min-w-[42px] ${badgeBg}">
                    <span class="font-bold uppercase tracking-tight">${m.short}</span>
                    <span class="flex items-center gap-1 mt-0.5 font-bold">
                        <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
                        <span>${pctText}</span>
                    </span>
                </div>
            `;
        });
        monthlyStripEl.innerHTML = stripHtml;
    }

    // Rubrikasi Breakdown
    const breakdownEl = document.getElementById('tim-bidang-breakdown');
    if (breakdownEl) {
        const rubrikKeys = Object.keys(rubrikBreakdown);
        if (rubrikKeys.length === 0) {
            breakdownEl.innerHTML = `<p class="text-slate-400 dark:text-slate-500 italic text-[10px] text-center py-1.5">Tidak ada rincian tugas pada tahun ini</p>`;
        } else {
            const rubrikColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f43f5e'];
            breakdownEl.innerHTML = `
                <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                    ${rubrikKeys.slice(0, 8).map((key, idx) => {
                        const item = rubrikBreakdown[key];
                        const rPct = item.total > 0 ? Math.round((item.selesai / item.total) * 100) : 0;
                        const c = rubrikColors[idx % rubrikColors.length];
                        return `
                            <div class="space-y-1">
                                <div class="flex justify-between items-center text-[10px]">
                                    <span class="flex items-center gap-1.5 truncate max-w-[170px]">
                                        <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${c}"></span>
                                        <span class="truncate font-medium text-slate-700 dark:text-slate-300">${key}</span>
                                    </span>
                                    <span class="font-bold text-slate-700 dark:text-slate-200 shrink-0">
                                        <span class="${rPct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}">${item.selesai}/${item.total}</span>
                                        <span class="text-[9px] text-slate-400 ml-0.5">(${rPct}%)</span>
                                    </span>
                                </div>
                                <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div class="h-full rounded-full transition-all duration-500" style="width: ${rPct}%; background-color: ${c}"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }

    // --- 2. Populate Distribusi Jumlah Tugas Bulanan (Right Card) ---
    const totalBadgeEl = document.getElementById('timMonthlyTotalTasksBadge');
    if (totalBadgeEl) totalBadgeEl.textContent = `${annualTotal} tugas`;

    const avgTasks = (annualTotal / 12).toFixed(1);
    const avgBadgeEl = document.getElementById('timMonthlyAvgBadge');
    if (avgBadgeEl) avgBadgeEl.textContent = `${avgTasks} tugas/bln`;

    // Find busiest month
    let busiest = null;
    let maxTasks = -1;
    monthlyStats.forEach(m => {
        if (m.total > maxTasks) {
            maxTasks = m.total;
            busiest = m;
        }
    });

    const busiestBadgeEl = document.getElementById('timMonthlyBusiestBadge');
    if (busiestBadgeEl) {
        busiestBadgeEl.textContent = (busiest && maxTasks > 0) ? `${busiest.name} (${busiest.total})` : '-';
    }

    const summaryTextEl = document.getElementById('timMonthlyStatusSummaryText');
    if (summaryTextEl) {
        summaryTextEl.textContent = `Total: ${annualSelesai} Selesai, ${annualBelum} Belum Selesai`;
    }

    // Mini monthly chips at bottom
    const chipsEl = document.getElementById('timMonthlyChips');
    if (chipsEl) {
        chipsEl.innerHTML = monthlyStats.map(m => {
            const isCurrentM = m.monthIdx === now.getMonth();
            let borderCls = isCurrentM ? 'border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400/30' : 'border-slate-200/70 dark:border-slate-700';
            return `
                <div class="px-2.5 py-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-750/70 ${borderCls} flex items-center gap-2 shrink-0 transition-all shadow-2xs">
                    <span class="text-[10px] font-bold text-slate-700 dark:text-slate-300">${m.short}</span>
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold ${m.total > 0 ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}">
                        ${m.total}
                    </span>
                    <span class="text-[8px] text-slate-400">(${m.selesai}✓ / ${m.belum}⏳)</span>
                </div>
            `;
        }).join('');
    }

    // Chart.js Stacked Bar Chart for 12 months (Jan - Des)
    const ctxBar = document.getElementById('timMonthlyTasksChart')?.getContext('2d');
    if (ctxBar) {
        if (window.timMonthlyChartInstance) {
            window.timMonthlyChartInstance.destroy();
            window.timMonthlyChartInstance = null;
        }

        const labels = monthlyStats.map(m => m.short);
        const selesaiData = monthlyStats.map(m => m.selesai);
        const belumData = monthlyStats.map(m => m.belum);

        window.timMonthlyChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Selesai',
                        data: selesaiData,
                        backgroundColor: '#10b981',
                        borderRadius: 4,
                        maxBarThickness: 32,
                        categoryPercentage: 0.75,
                        barPercentage: 0.85
                    },
                    {
                        label: 'Belum Selesai',
                        data: belumData,
                        backgroundColor: '#f43f5e',
                        borderRadius: 4,
                        maxBarThickness: 32,
                        categoryPercentage: 0.75,
                        barPercentage: 0.85
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 6, bottom: 2, left: 2, right: 6 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        padding: 10,
                        titleFont: { size: 11, weight: 'bold' },
                        bodyFont: { size: 10 },
                        footerFont: { size: 10, weight: 'bold' },
                        callbacks: {
                            title: function(context) {
                                const idx = context[0]?.dataIndex;
                                return idx !== undefined ? `${monthlyStats[idx].name} ${currentYear}` : '';
                            },
                            footer: function(context) {
                                const idx = context[0]?.dataIndex;
                                if (idx !== undefined) {
                                    const m = monthlyStats[idx];
                                    const pct = m.total > 0 ? Math.round((m.selesai / m.total) * 100) : 0;
                                    return `Total: ${m.total} tugas (Capaian: ${pct}%)`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(226, 232, 240, 0.35)' },
                        beginAtZero: true,
                        grace: '10%',
                        ticks: { stepSize: 1, precision: 0, color: '#94a3b8', font: { size: 9 } }
                    }
                }
            }
        });
    }
};

// -------------------------------------------------------------
// PEMOHON / INTERNAL USER DASHBOARD VIEW
// -------------------------------------------------------------
function renderPemohonDashboard(container) {
    const myTickets = db.tickets.filter(t => t.pengaju.toLowerCase().includes(currentUser.name.toLowerCase()) || t.pengaju.toLowerCase().includes(currentUser.username.toLowerCase()));
    const totalTickets = myTickets.length;
    const pendingTickets = myTickets.filter(t => t.status === 'Pending').length;
    const approvedTickets = myTickets.filter(t => t.status === 'Approved').length;

    container.innerHTML = `
        <div class="mb-8 animate-fade-in">
            <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Portal Layanan Humas</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Selamat datang kembali, <span class="font-bold text-indigo-650 dark:text-indigo-400">${currentUser.name}</span>. Ajukan dan pantau status permohonan kehumasan Anda.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-11 h-11 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-center text-indigo-655 shrink-0"><i class="fa-solid fa-ticket text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Pengajuan</p><p class="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">${totalTickets}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-11 h-11 bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 rounded-xl flex items-center justify-center text-amber-600 shrink-0"><i class="fa-solid fa-clock-rotate-left text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menunggu Review</p><p class="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">${pendingTickets}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-11 h-11 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-center text-emerald-655 shrink-0"><i class="fa-solid fa-circle-check text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Disetujui / PIC</p><p class="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">${approvedTickets}</p></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs">
                <div class="flex justify-between items-center mb-5 border-b pb-3.5 border-slate-100 dark:border-slate-700">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2"><i class="fa-solid fa-ticket-simple text-indigo-650 dark:text-indigo-400"></i> Riwayat Pengajuan Layanan Anda</h3>
                    <button onclick="router('tickets')" class="text-xs font-semibold text-indigo-650 dark:text-indigo-400 hover:text-indigo-800 hover:underline">Selengkapnya →</button>
                </div>
                <div class="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    ${myTickets.length > 0 ? myTickets.slice(0, 5).map(item => `
                        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 last:border-none last:pb-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 p-2 rounded-xl transition-all">
                            <div>
                                <p class="font-bold text-xs text-slate-800 dark:text-slate-200">${item.judul}</p>
                                <p class="text-[10px] text-slate-450 mt-1 flex items-center gap-2">
                                    <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-150 dark:border-slate-600 rounded text-[9px] font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider">${item.jenis}</span>
                                    <span>•</span>
                                    <span>Batas: ${formatDate(item.deadline)}</span>
                                </p>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200' :
            item.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-305 border border-amber-200' :
                'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-305 border border-rose-200'
        }">${item.status === 'Approved' ? 'Disetujui' : item.status === 'Pending' ? 'Menunggu' : 'Ditolak'}</span>
                        </div>
                    `).join('') : `
                        <div class="text-center py-12 text-slate-400">
                            <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-350"></i>
                            <p class="text-xs font-semibold">Belum ada pengajuan layanan.</p>
                            <button onclick="router('tickets')" class="mt-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 text-indigo-650 dark:text-indigo-400 text-[10px] py-1.5 px-3 rounded-lg font-bold hover:bg-indigo-100/60 transition-all">BUAT PENGAJUAN BARU</button>
                        </div>
                    `}
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-205 dark:border-slate-700 p-6 shadow-xs flex flex-col">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-5 border-b pb-3.5 border-slate-100 dark:border-slate-700 flex items-center gap-2"><i class="fa-regular fa-calendar-days text-indigo-650 dark:text-indigo-400"></i> BRS Terdekat</h3>
                <div class="space-y-4 flex-1">
                    ${db.brsSchedule.length > 0 ? db.brsSchedule.slice(0, 3).map(item => `
                        <div class="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl hover:shadow-xs hover:border-slate-200 transition-all">
                            <p class="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">${item.judul}</p>
                            <p class="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
                                <i class="fa-solid fa-calendar-check text-slate-400"></i>${formatDate(item.tanggal)}
                            </p>
                        </div>
                    `).join('') : `
                        <div class="text-center py-8 text-slate-400">
                            <p class="text-xs font-medium">Tidak ada rilis terdekat.</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------------------------// 2. CONTENT PLANNER (TABLE VIEW)
// -------------------------------------------------------------
let plannerSearch = '';
let plannerPicFilter = '';
let plannerStatusFilter = '';
let plannerMonthFilter = '';
let plannerSortField = 'jadwal';
let plannerSortAsc = true;
let plannerPage = 1;
let plannerPageSize = 20;

function renderPlanner(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <i class="fa-solid fa-list-check text-indigo-650 dark:text-indigo-400"></i>
                    Content Planner
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Kelola dan jadwalkan rencana konten visual tim Humas BPS Provinsi Kalimantan Barat.</p>
            </div>
            ${!isKepala && isUserAdminOrKetua() ? `
                <button onclick="openModal('content')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-plus text-xs"></i> Tambah Konten Baru
                </button>
            ` : ''}
        </div>

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="planner-search-input" oninput="handlePlannerSearch(this.value)" value="${plannerSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none placeholder-slate-450 dark:text-white text-slate-750 transition-all" placeholder="Cari judul, konsep, PIC, tanggal...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-400"></i> Bulan:</span>
                <select id="planner-month-select" oninput="handlePlannerMonthFilter(this.value)" onchange="handlePlannerMonthFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Bulan</option>
                    ${(() => {
                        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        const monthMap = new Map();
                        (db.contentPlanner || []).forEach(c => {
                            const dFormatted = formatDateInput(c.jadwal || c.tanggal_posting);
                            if (dFormatted && dFormatted.length >= 7) {
                                const key = dFormatted.slice(0, 7);
                                const [y, m] = key.split('-');
                                const mIdx = parseInt(m, 10) - 1;
                                if (mIdx >= 0 && mIdx < 12) {
                                    monthMap.set(key, `${monthNames[mIdx]} ${y}`);
                                }
                            }
                        });
                        const sortedKeys = Array.from(monthMap.keys()).sort().reverse();
                        return sortedKeys.map(k => `<option ${plannerMonthFilter === k ? 'selected' : ''} value="${k}">${monthMap.get(k)}</option>`).join('');
                    })()}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-400"></i> Status:</span>
                <select id="planner-status-select" oninput="handlePlannerStatusFilter(this.value)" onchange="handlePlannerStatusFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Status</option>
                    <option ${plannerStatusFilter === 'Draft' ? 'selected' : ''} value="Draft">Draft</option>
                    <option ${plannerStatusFilter === 'In Progress' ? 'selected' : ''} value="In Progress">In Progress</option>
                    <option ${plannerStatusFilter === 'Done' ? 'selected' : ''} value="Done">Done</option>
                    <option ${plannerStatusFilter === 'Posted' ? 'selected' : ''} value="Posted">Posted</option>
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-user-tag mr-1 text-slate-405"></i> PIC:</span>
                <select id="planner-pic-select" oninput="handlePlannerPicFilter(this.value)" onchange="handlePlannerPicFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua PIC</option>
                    ${(() => {
                        const picSet = new Set();
                        (db.team || []).forEach(m => m.nama && picSet.add(m.nama));
                        (db.users || []).forEach(u => u.nama && picSet.add(u.nama));
                        (db.contentPlanner || []).forEach(c => {
                            const p = c['assign To'] || c.assignTo || c.assignedTo || c.pic;
                            if (p && p !== '-') picSet.add(p);
                        });
                        return Array.from(picSet).map(name => `<option ${plannerPicFilter === name ? 'selected' : ''} value="${name}">${name}</option>`).join('');
                    })()}
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetPlannerFilters()" class="w-full btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <!-- DESKTOP TABLE VIEW -->
            <div class="desktop-table-view overflow-x-auto hidden md:block">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 select-none">
                            <th class="py-3.5 px-4 w-12 text-center">No</th>
                            <th onclick="handlePlannerSort('judul')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                Judul <span id="sort-icon-judul" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handlePlannerSort('jenis_konten')" class="py-3.5 px-4 w-44 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                Jenis Konten (Video/Carousel) <span id="sort-icon-jenis_konten" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handlePlannerSort('media_post')" class="py-3.5 px-4 w-36 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                Media Post <span id="sort-icon-media_post" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handlePlannerSort('assignedTo')" class="py-3.5 px-4 w-36 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                PIC <span id="sort-icon-assignedTo" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handlePlannerSort('jadwal')" class="py-3.5 px-4 w-36 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                Tanggal Posting <span id="sort-icon-jadwal" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handlePlannerSort('jam_posting')" class="py-3.5 px-4 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center">
                                Jam Posting (WIB) <span id="sort-icon-jam_posting" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            ${!isKepala ? `<th class="py-3.5 px-4 w-24 text-center">Aksi</th>` : ''}
                        </tr>
                    </thead>
                    <tbody id="planner-table-body" class="text-xs divide-y divide-slate-100 dark:divide-slate-800">
                        <!-- Table rows populated dynamically -->
                    </tbody>
                </table>
            </div>
            <!-- MOBILE CARD VIEW -->
            <div class="mobile-table-view md:hidden p-4 space-y-4" id="planner-mobile-body">
                <!-- Mobile cards populated dynamically -->
            </div>
            <!-- PAGINATION -->
            <div id="planner-pagination"></div>
        </div>
    `;

    drawPlannerBoard();
}

window.getPlannerMediaIcon = function(media) {
    if (!media) return '<span class="text-slate-400 text-xs font-semibold">-</span>';
    const list = String(media).split(',').map(s => s.trim()).filter(Boolean);
    if (list.length === 0) return '<span class="text-slate-400 text-xs font-semibold">-</span>';

    const badges = list.map(item => {
        const m = item.toLowerCase();
        if (m.includes('instagram')) return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800 text-[9px] font-bold whitespace-nowrap"><i class="fa-brands fa-instagram text-pink-500"></i> Instagram</span>';
        if (m.includes('tiktok')) return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[9px] font-bold whitespace-nowrap"><i class="fa-brands fa-tiktok text-slate-700 dark:text-white"></i> TikTok</span>';
        if (m.includes('youtube')) return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 text-[9px] font-bold whitespace-nowrap"><i class="fa-brands fa-youtube text-red-500"></i> YouTube</span>';
        if (m.includes('website')) return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[9px] font-bold whitespace-nowrap"><i class="fa-solid fa-globe text-blue-500"></i> Website</span>';
        if (m.includes('facebook')) return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[9px] font-bold whitespace-nowrap"><i class="fa-brands fa-facebook text-blue-600"></i> Facebook</span>';
        if (m.includes('twitter') || m.includes('x')) return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 text-[9px] font-bold whitespace-nowrap"><i class="fa-brands fa-x-twitter"></i> X</span>';
        if (m.includes('whatsapp')) return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[9px] font-bold whitespace-nowrap"><i class="fa-brands fa-whatsapp text-emerald-500"></i> WhatsApp</span>';
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[9px] font-bold whitespace-nowrap"><i class="fa-solid fa-share-nodes text-indigo-500"></i> ${item}</span>`;
    });

    return `<div class="flex flex-wrap gap-1 items-center">${badges.join('')}</div>`;
};

window.getJenisKontenBadge = function(jenis) {
    if (!jenis) return '<span class="text-slate-400 text-xs font-semibold">-</span>';
    const j = String(jenis).toLowerCase();
    if (j.includes('video') || j.includes('reels')) {
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-[10px] font-extrabold"><i class="fa-solid fa-video text-violet-500"></i> Video</span>';
    }
    if (j.includes('carousel')) {
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-extrabold"><i class="fa-solid fa-images text-indigo-500"></i> Carousel</span>';
    }
    if (j.includes('single') || j.includes('image') || j.includes('poster')) {
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold"><i class="fa-regular fa-image text-emerald-500"></i> Single Image</span>';
    }
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold">${jenis}</span>`;
};

window.changePlannerPage = function(p) {
    plannerPage = p;
    drawPlannerBoard();
};

window.changePlannerPageSize = function(s) {
    plannerPageSize = parseInt(s, 10) || 20;
    plannerPage = 1;
    drawPlannerBoard();
};

window.handlePlannerSearch = function(val) {
    plannerSearch = val;
    plannerPage = 1;
    drawPlannerBoard();
};

window.handlePlannerPicFilter = function(val) {
    plannerPicFilter = val;
    plannerPage = 1;
    drawPlannerBoard();
};

window.handlePlannerStatusFilter = function(val) {
    plannerStatusFilter = val;
    plannerPage = 1;
    drawPlannerBoard();
};

window.handlePlannerMonthFilter = function(val) {
    plannerMonthFilter = val;
    plannerPage = 1;
    drawPlannerBoard();
};

window.resetPlannerFilters = function() {
    plannerSearch = '';
    plannerPicFilter = '';
    plannerStatusFilter = '';
    plannerMonthFilter = '';
    plannerPage = 1;
    const searchInput = document.getElementById('planner-search-input');
    if (searchInput) searchInput.value = '';
    const monthSelect = document.getElementById('planner-month-select');
    if (monthSelect) monthSelect.value = '';
    const statusSelect = document.getElementById('planner-status-select');
    if (statusSelect) statusSelect.value = '';
    const picSelect = document.getElementById('planner-pic-select');
    if (picSelect) picSelect.value = '';
    drawPlannerBoard();
};

window.handlePlannerSort = function(field) {
    if (plannerSortField === field) {
        plannerSortAsc = !plannerSortAsc;
    } else {
        plannerSortField = field;
        plannerSortAsc = true;
    }
    plannerPage = 1;
    drawPlannerBoard();
};

window.drawPlannerBoard = function() {
    const tableBody = document.getElementById('planner-table-body');
    if (!tableBody) return;

    let filtered = db.contentPlanner.filter(isTaskForCurrentUser);
    
    // Search filter (live matching including date, PIC, concept, title)
    if (plannerSearch.trim()) {
        const query = plannerSearch.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const dateStr = item.jadwal || item.tanggal_posting || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            const pic = item['assign To'] || item.assignTo || item.assignedTo || item.pic || '';
            return (
                (item.judul && item.judul.toLowerCase().includes(query)) ||
                (item.konsep && item.konsep.toLowerCase().includes(query)) ||
                (item.jenis_konten && item.jenis_konten.toLowerCase().includes(query)) ||
                (item.media_post && item.media_post.toLowerCase().includes(query)) ||
                (item.status && item.status.toLowerCase().includes(query)) ||
                (pic && pic.toLowerCase().includes(query)) ||
                (dateStr && String(dateStr).toLowerCase().includes(query)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(query)) ||
                (dateInput && dateInput.toLowerCase().includes(query))
            );
        });
    }
    
    // Month filter (YYYY-MM)
    if (plannerMonthFilter) {
        filtered = filtered.filter(item => {
            const d = formatDateInput(item.jadwal || item.tanggal_posting);
            return d && d.startsWith(plannerMonthFilter);
        });
    }

    // Status filter
    if (plannerStatusFilter) {
        filtered = filtered.filter(item => item.status === plannerStatusFilter);
    }
    
    // PIC filter
    if (plannerPicFilter) {
        filtered = filtered.filter(item => (item['assign To'] || item.assignTo || item.assignedTo || item.pic) === plannerPicFilter);
    }

    // Sorting: Item yang sudah selesai (Posted/Done) ditaruh di bawah,
    // yang terdekat/akan dilaksanakan diposisikan paling atas
    filtered.sort((a, b) => {
        const isDoneA = (a.status === 'Posted' || a.status === 'Done' || Number(a.progres) >= 100) ? 1 : 0;
        const isDoneB = (b.status === 'Posted' || b.status === 'Done' || Number(b.progres) >= 100) ? 1 : 0;

        // Jika status selesai berbeda: yang belum selesai selalu di atas (0 duluan, 1 di bawah)
        if (isDoneA !== isDoneB) {
            return isDoneA - isDoneB;
        }

        // Jika user menyortir kolom khusus (selain jadwal), ikuti pilihan sort user
        if (plannerSortField !== 'jadwal') {
            let valA = a[plannerSortField] || '';
            let valB = b[plannerSortField] || '';
            
            if (plannerSortField === 'assignedTo' || plannerSortField === 'assignTo') {
                valA = a['assign To'] || a.assignTo || a.assignedTo || a.pic || '';
                valB = b['assign To'] || b.assignTo || b.assignedTo || b.pic || '';
            } else if (plannerSortField === 'media_post') {
                valA = String(a.media_post || a.media || '').toLowerCase();
                valB = String(b.media_post || b.media || '').toLowerCase();
            } else if (plannerSortField === 'jenis_konten') {
                valA = String(a.jenis_konten || a.postType || a.jenis || '').toLowerCase();
                valB = String(b.jenis_konten || b.postType || b.jenis || '').toLowerCase();
            } else if (plannerSortField === 'jam_posting') {
                valA = String(a.jam_posting || '09:00').replace('.', ':');
                valB = String(b.jam_posting || '09:00').replace('.', ':');
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }

            if (valA < valB) return plannerSortAsc ? -1 : 1;
            if (valA > valB) return plannerSortAsc ? 1 : -1;
            return 0;
        }

        // Default / Sort Tanggal: Jadwal terdekat dan jam posting terdekat paling atas
        const dateAStr = `${formatDateInput(a.jadwal || a.tanggal_posting || '9999-12-31')}T${String(a.jam_posting || '09:00').replace('.', ':')}:00`;
        const dateBStr = `${formatDateInput(b.jadwal || b.tanggal_posting || '9999-12-31')}T${String(b.jam_posting || '09:00').replace('.', ':')}:00`;
        const dateA = new Date(dateAStr).getTime();
        const dateB = new Date(dateBStr).getTime();

        if (dateA !== dateB) {
            return plannerSortAsc ? dateA - dateB : dateB - dateA;
        }
        return 0;
    });

    // Update sort icons
    const sortFields = ['judul', 'jenis_konten', 'media_post', 'assignedTo', 'jadwal', 'jam_posting'];
    sortFields.forEach(f => {
        const iconEl = document.getElementById(`sort-icon-${f}`);
        if (iconEl) {
            if (plannerSortField === f) {
                iconEl.innerHTML = plannerSortAsc ? '<i class="fa-solid fa-sort-up text-indigo-500"></i>' : '<i class="fa-solid fa-sort-down text-indigo-500"></i>';
            } else {
                iconEl.innerHTML = '<i class="fa-solid fa-sort"></i>';
            }
        }
    });

    const isKepala = currentUser.role === 'kepala';

    const emptyHtml = `
        <tr><td colspan="${isKepala ? 7 : 8}" class="py-0">
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-list-check"></i></div>
                <p class="empty-state-title">Data Rencana Konten Kosong</p>
                <p class="empty-state-desc">Coba ubah kata kunci pencarian atau filter yang aktif.</p>
            </div>
        </td></tr>`;

    const emptyMobileHtml = `
        <div class="empty-state">
            <div class="empty-state-icon"><i class="fa-solid fa-list-check"></i></div>
            <p class="empty-state-title">Data Rencana Konten Kosong</p>
            <p class="empty-state-desc">Coba ubah kata kunci atau filter.</p>
        </div>`;

    if (filtered.length === 0) {
        tableBody.innerHTML = emptyHtml;
        const mobileBody = document.getElementById('planner-mobile-body');
        if (mobileBody) mobileBody.innerHTML = emptyMobileHtml;
        const pagEl = document.getElementById('planner-pagination');
        if (pagEl) pagEl.innerHTML = '';
        return;
    }

    // Pagination Calculation
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / plannerPageSize));
    if (plannerPage > totalPages) plannerPage = totalPages;
    if (plannerPage < 1) plannerPage = 1;

    const startIndex = (plannerPage - 1) * plannerPageSize;
    const endIndex = Math.min(startIndex + plannerPageSize, totalItems);
    const paginated = filtered.slice(startIndex, endIndex);

    tableBody.innerHTML = paginated.map((item, index) => {
        const picVal = item['assign To'] || item.assignTo || item.assignedTo || item.pic || '-';
        const initials = getPicInitials(picVal);
        const avatarBg = getAvatarBg(picVal);
        const jenisBadge = getJenisKontenBadge(item.jenis_konten || item.postType || item.jenis);
        const mediaBadge = getPlannerMediaIcon(item.media_post || item.media);
        const tanggalStr = formatDate(item.jadwal || item.tanggal_posting);
        const jamStr = item.jam_posting || '09:00';
        const isDone = (item.status === 'Posted' || item.status === 'Done' || Number(item.progres) >= 100);

        let actions = '';
        if (!isKepala) {
            actions = `
                <td class="py-3 px-4 text-center">
                    <div class="flex justify-center items-center gap-1.5">
                        <button onclick="openModalById('content', ${item.id})" title="Ubah data" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        ${isUserAdminOrKetua() ? `
                            <button onclick="deleteItem('content', ${item.id})" title="Hapus data" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                                <i class="fa-solid fa-trash text-[10px]"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
        }

        const rowBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 hover:bg-emerald-100/75 dark:hover:bg-emerald-900/40 border-l-4 border-l-emerald-500' 
            : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/40';

        return `
            <tr class="${rowBg} transition-colors">
                <td class="py-3.5 px-4 text-center font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}">${startIndex + index + 1}</td>
                <td class="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 min-w-[200px]">
                    <div class="flex items-center gap-2">
                        <span onclick="showDetailById('content', ${item.id})" class="hover:text-indigo-650 transition-colors cursor-pointer block" title="${escapeHtml(item.judul)}">${escapeHtml(item.judul)}</span>
                        ${isDone ? '<span class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[8px]"></i> Selesai</span>' : ''}
                    </div>
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                    ${jenisBadge}
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                    ${mediaBadge}
                </td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border border-slate-200 shadow-xs ${avatarBg}" title="${escapeHtml(picVal)}">${initials}</div>
                        <span class="font-bold text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">${escapeHtml(picVal)}</span>
                    </div>
                </td>
                <td class="py-3.5 px-4 font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-450'} whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${isDone ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}"><i class="fa-regular fa-calendar-check text-[10px]"></i> ${tanggalStr}</span>
                </td>
                <td class="py-3.5 px-4 text-center whitespace-nowrap">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md ${isDone ? 'bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} font-extrabold text-[11px]"><i class="fa-regular fa-clock text-[10px] ${isDone ? 'text-emerald-600' : 'text-indigo-500'}"></i> ${formatTime(jamStr)}</span>
                </td>
                ${actions}
            </tr>
        `;
    }).join('');

    // Populate mobile card view
    const mobileBody = document.getElementById('planner-mobile-body');
    if (mobileBody) {
        mobileBody.innerHTML = paginated.map((item, index) => {
            const picVal2 = item['assign To'] || item.assignTo || item.assignedTo || item.pic || '-';
            const initials2 = getPicInitials(picVal2);
            const avatarBg2 = getAvatarBg(picVal2);
            const jenisBadge2 = getJenisKontenBadge(item.jenis_konten || item.postType || item.jenis);
            const mediaBadge2 = getPlannerMediaIcon(item.media_post || item.media);
            const tanggalStr2 = formatDate(item.jadwal || item.tanggal_posting);
            const jamStr2 = item.jam_posting || '09:00';
            const isDone2 = (item.status === 'Posted' || item.status === 'Done' || Number(item.progres) >= 100);

            const mobileActions = !isKepala ? `
                <div class="flex items-center gap-2" onclick="event.stopPropagation()">
                    <button onclick="openModalById('content', ${item.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><i class="fa-solid fa-pen text-xs"></i></button>
                    ${isUserAdminOrKetua() ? `<button onclick="deleteItem('content', ${item.id})" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><i class="fa-solid fa-trash text-xs"></i></button>` : ''}
                </div>` : '';
            return `
                <div class="${isDone2 ? 'mobile-data-card cursor-pointer bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 border-l-4 border-l-emerald-500' : 'mobile-data-card cursor-pointer'}" onclick="showDetailById('content', ${item.id})">
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <p class="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-snug truncate">${escapeHtml(item.judul)}</p>
                            ${isDone2 ? '<span class="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.2 rounded shrink-0"><i class="fa-solid fa-check text-[7px]"></i> Selesai</span>' : ''}
                        </div>
                        <div class="shrink-0">${jenisBadge2}</div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 mb-3">
                        ${mediaBadge2}
                        <span class="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"><i class="fa-regular fa-clock text-indigo-500"></i> ${formatTime(jamStr2)}</span>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${avatarBg2}">${initials2}</div>
                            <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400">${escapeHtml(picVal2)}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-[10px] font-bold ${isDone2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}"><i class="fa-regular fa-calendar-check mr-1"></i>${tanggalStr2}</span>
                            ${mobileActions}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    renderPaginationControls({
        totalItems,
        currentPage: plannerPage,
        pageSize: plannerPageSize,
        onPageChangeFn: 'changePlannerPage',
        onPageSizeChangeFn: 'changePlannerPageSize',
        containerId: 'planner-pagination'
    });
}

// -------------------------------------------------------------
// 3. MODUL REKAP RUTIN VIEW
// -------------------------------------------------------------
let rutinSearch = '';
let rutinRubrikFilter = '';
let rutinStartDateFilter = '';
let rutinEndDateFilter = '';
let rutinDateFilter = '';
let rutinPage = 1;
let rutinPageSize = 20;

function renderRekapRutin(container) {
    const isKepala = currentUser.role === 'kepala';

    if (typeof window.syncCompletedContentToRekapRutin === 'function') {
        window.syncCompletedContentToRekapRutin(db, null, false);
    }

    const rubrics = [
        '#SE2026', '#DTSEN', '#haribesar/daerah/nasional/internasional', '#rilisbrs', '#infografisbrs', '#rilispublikasi',
        '#SElasaSEnsus', '#promosistatistik', '#rripontianak',
        '#zonaintegritas', '#SKD', '#ddakalbar', 'KLIK', 'Laporan'
    ];
    const rubrikSet = new Set(rubrics);
    (db.rekapRutin || []).forEach(r => {
        if (r && r.rubrikasi && !rubrikSet.has(r.rubrikasi)) {
            rubrikSet.add(r.rubrikasi);
        }
    });
    const allRubrics = Array.from(rubrikSet);

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Rekap Kegiatan Rutin</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Daftar rekapitulasi, monitoring sebaran tugas harian, dan rubrikasi berkala kehumasan.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportRutinReport('excel')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-255 shadow-xs">
                    <i class="fa-solid fa-file-excel"></i> Excel
                </button>
                ${!isKepala && isUserAdminOrKetua() ? `
                    <button onclick="openModal('rekap_rutin')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Tambah Kegiatan
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="bg-white/85 dark:bg-slate-800/85 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="rutin-search-input" oninput="rutinSearch = this.value; rutinPage = 1; drawRutinTable();" value="${rutinSearch || ''}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan, petugas, tanggal...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500 font-bold whitespace-nowrap"><i class="fa-solid fa-tags text-slate-400"></i> Rubrik:</span>
                <select id="rutin-rubrik-select" oninput="rutinRubrikFilter = this.value; rutinPage = 1; drawRutinTable();" onchange="rutinRubrikFilter = this.value; rutinPage = 1; drawRutinTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Rubrik</option>
                    ${allRubrics.map(r => `<option ${rutinRubrikFilter === r ? 'selected' : ''} value="${r}">${r}</option>`).join('')}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500 font-bold whitespace-nowrap"><i class="fa-regular fa-calendar-check text-slate-400"></i> Mulai:</span>
                <input type="date" id="rutin-start-date" oninput="rutinStartDateFilter = this.value; rutinPage = 1; drawRutinTable();" onchange="rutinStartDateFilter = this.value; rutinPage = 1; drawRutinTable();" value="${rutinStartDateFilter || ''}" class="w-full text-xs font-semibold py-1.5 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs" title="Tanggal Mulai">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500 font-bold whitespace-nowrap"><i class="fa-regular fa-calendar text-slate-400"></i> Selesai:</span>
                <input type="date" id="rutin-end-date" oninput="rutinEndDateFilter = this.value; rutinPage = 1; drawRutinTable();" onchange="rutinEndDateFilter = this.value; rutinPage = 1; drawRutinTable();" value="${rutinEndDateFilter || ''}" class="w-full text-xs font-semibold py-1.5 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs" title="Tanggal Selesai">
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetRutinFilters()" class="w-full btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <!-- Desktop Table -->
            <div class="desktop-table-view hidden md:block overflow-x-auto">
                <table class="w-full text-xs text-left text-slate-650 dark:text-slate-300">
                    <thead class="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40 uppercase border-b border-slate-200 dark:border-slate-700 font-black tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Tanggal</th>
                            <th class="px-6 py-4">Hari</th>
                            <th class="px-6 py-4">Rubrikasi</th>
                            <th class="px-6 py-4">Kegiatan</th>
                            <th class="px-6 py-4">Petugas</th>
                            <th class="px-6 py-4 text-center">Status</th>
                            ${!isKepala ? `<th class="px-6 py-4 text-center">Aksi</th>` : ''}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700" id="rutin-table-body">
                        <!-- Filled by drawRutinTable -->
                    </tbody>
                </table>
            </div>
            <!-- Mobile Card View -->
            <div class="mobile-table-view md:hidden p-4 space-y-3" id="rutin-mobile-body">
                <!-- Filled by drawRutinTable -->
            </div>
            <!-- PAGINATION -->
            <div id="rutin-pagination"></div>
        </div>
    `;
    drawRutinTable();
}

window.resetRutinFilters = function() {
    rutinSearch = '';
    rutinRubrikFilter = '';
    rutinStartDateFilter = '';
    rutinEndDateFilter = '';
    rutinDateFilter = '';
    rutinPage = 1;
    const sInput = document.getElementById('rutin-search-input');
    if (sInput) sInput.value = '';
    const rSelect = document.getElementById('rutin-rubrik-select');
    if (rSelect) rSelect.value = '';
    const startInput = document.getElementById('rutin-start-date');
    if (startInput) startInput.value = '';
    const endInput = document.getElementById('rutin-end-date');
    if (endInput) endInput.value = '';
    drawRutinTable();
};

window.changeRutinPage = function(p) {
    rutinPage = p;
    drawRutinTable();
};

window.changeRutinPageSize = function(s) {
    rutinPageSize = parseInt(s, 10) || 20;
    rutinPage = 1;
    drawRutinTable();
};

function drawRutinTable() {
    const body = document.getElementById('rutin-table-body');
    if (!body) return;

    let filtered = db.rekapRutin.filter(isTaskForCurrentUser);
    if (rutinSearch.trim()) {
        const q = rutinSearch.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const dateStr = item.tanggal || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            return (
                (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
                (item.petugas && item.petugas.toLowerCase().includes(q)) ||
                (item.rubrikasi && item.rubrikasi.toLowerCase().includes(q)) ||
                (item.hari && item.hari.toLowerCase().includes(q)) ||
                (item.keterangan && item.keterangan.toLowerCase().includes(q)) ||
                (item.status && item.status.toLowerCase().includes(q)) ||
                (dateStr && String(dateStr).toLowerCase().includes(q)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(q)) ||
                (dateInput && dateInput.toLowerCase().includes(q))
            );
        });
    }
    if (rutinRubrikFilter) {
        filtered = filtered.filter(item => {
            if (!item.rubrikasi) return false;
            if (item.rubrikasi === rutinRubrikFilter) return true;
            const rubriks = typeof window.parseRubrikasiArray === 'function'
                ? window.parseRubrikasiArray(item.rubrikasi)
                : String(item.rubrikasi).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            return rubriks.includes(rutinRubrikFilter);
        });
    }

    // Filter Periode Tanggal (Mulai & Selesai - mendukung rentang tanggal maupun satu tanggal saja)
    if (rutinStartDateFilter && rutinEndDateFilter) {
        const start = rutinStartDateFilter <= rutinEndDateFilter ? rutinStartDateFilter : rutinEndDateFilter;
        const end = rutinStartDateFilter <= rutinEndDateFilter ? rutinEndDateFilter : rutinStartDateFilter;
        filtered = filtered.filter(item => {
            const itemDate = formatDateInput(item.tanggal);
            return itemDate && itemDate >= start && itemDate <= end;
        });
    } else if (rutinStartDateFilter) {
        // Jika hanya tanggal mulai yang diisi, cocokkan tepat tanggal tersebut (tetap bisa satu tanggal saja)
        filtered = filtered.filter(item => {
            const itemDate = formatDateInput(item.tanggal);
            return itemDate === rutinStartDateFilter || (item.tanggal && String(item.tanggal).includes(rutinStartDateFilter));
        });
    } else if (rutinEndDateFilter) {
        // Jika hanya tanggal selesai yang diisi, cocokkan tepat tanggal tersebut (tetap bisa satu tanggal saja)
        filtered = filtered.filter(item => {
            const itemDate = formatDateInput(item.tanggal);
            return itemDate === rutinEndDateFilter || (item.tanggal && String(item.tanggal).includes(rutinEndDateFilter));
        });
    } else if (rutinDateFilter) {
        filtered = filtered.filter(item => {
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(item.tanggal) : '';
            return dateInput === rutinDateFilter || (item.tanggal && String(item.tanggal).includes(rutinDateFilter));
        });
    }

    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const isKepala = currentUser.role === 'kepala';

    if (filtered.length === 0) {
        const emptyHtml = `<tr><td colspan="${isKepala ? 6 : 7}" class="py-0"><div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-clipboard-list"></i></div><p class="empty-state-title">Tidak Ada Data Kegiatan Rutin</p><p class="empty-state-desc">Coba ubah filter atau kata kunci pencarian.</p></div></td></tr>`;
        body.innerHTML = emptyHtml;
        const mobileBody = document.getElementById('rutin-mobile-body');
        if (mobileBody) mobileBody.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-clipboard-list"></i></div><p class="empty-state-title">Tidak Ada Data</p><p class="empty-state-desc">Coba ubah filter atau kata kunci.</p></div>`;
        const pagEl = document.getElementById('rutin-pagination');
        if (pagEl) pagEl.innerHTML = '';
        return;
    }

    // Pagination Calculation
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / rutinPageSize));
    if (rutinPage > totalPages) rutinPage = totalPages;
    if (rutinPage < 1) rutinPage = 1;

    const startIndex = (rutinPage - 1) * rutinPageSize;
    const endIndex = Math.min(startIndex + rutinPageSize, totalItems);
    const paginated = filtered.slice(startIndex, endIndex);

    body.innerHTML = paginated.map(item => {
        let statusColor = item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300';

        let actionButtons = '';
        if (!isKepala) {
            actionButtons = `
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-1.5" onclick="event.stopPropagation()">
                        <button onclick="openModalById('rekap_rutin', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-455 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Ubah"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        ${isUserAdminOrKetua() ? `
                            <button onclick="deleteItem('rekap_rutin', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-455 hover:text-rose-605 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Hapus"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        ` : ''}
                    </div>
                </td>
            `;
        }

        const isDone = item.status === 'Selesai';
        const rowBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 hover:bg-emerald-100/75 dark:hover:bg-emerald-900/40 border-l-4 border-l-emerald-500' 
            : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/35';

        const rubrikList = (item.rubrikasi ? String(item.rubrikasi).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []);
        const rubrikPillsHtml = rubrikList.length > 0
            ? `<div class="flex flex-wrap gap-1 max-w-[220px]">${rubrikList.map(r => `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-705 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md font-bold text-[9.5px]">${escapeHtml(r)}</span>`).join('')}</div>`
            : `<span class="text-slate-400 font-bold text-[10px]">-</span>`;

        return `
            <tr class="${rowBg} transition-colors">
                <td class="px-6 py-4 font-bold whitespace-nowrap ${isDone ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}">${formatDate(item.tanggal)}</td>
                <td class="px-6 py-4 font-semibold text-slate-500 whitespace-nowrap">${escapeHtml(item.hari || '-')}</td>
                <td class="px-6 py-4">${rubrikPillsHtml}</td>
                <td class="px-6 py-4 font-extrabold text-slate-850 dark:text-slate-250 leading-snug">
                    <span>${escapeHtml(item.kegiatan)}</span>
                </td>
                <td class="px-6 py-4 font-bold text-indigo-650 dark:text-indigo-400 whitespace-nowrap">${escapeHtml(item.petugas || '-')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${escapeHtml(item.status || 'Ditugaskan')}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');

    // Mobile card view
    const mobileBody = document.getElementById('rutin-mobile-body');
    if (mobileBody) {
        mobileBody.innerHTML = paginated.map(item => {
            const statusCls = item.status === 'Selesai' ? 'badge badge-selesai' : 'badge badge-progress';
            const mobileActs = !isKepala ? `
                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                    <button onclick="openModalById('rekap_rutin', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    ${isUserAdminOrKetua() ? `<button onclick="deleteItem('rekap_rutin', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}
                </div>` : '';
            const mobRubrikList = (item.rubrikasi ? String(item.rubrikasi).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []);
            return `
                <div class="mobile-data-card">
                    <div class="flex items-start justify-between gap-2 mb-1.5">
                        <p class="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex-1 min-w-0 leading-snug">${escapeHtml(item.kegiatan)}</p>
                        <span class="${statusCls} shrink-0">${escapeHtml(item.status || 'Ditugaskan')}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[10px] text-slate-500 font-semibold">${formatDate(item.tanggal)} (${escapeHtml(item.hari || '-')})</p>
                            <div class="flex flex-wrap gap-1 mt-1">
                                ${mobRubrikList.map(r => `<span class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold">${escapeHtml(r)}</span>`).join('') || '<span class="text-slate-400 font-bold text-[9px]">-</span>'}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">${escapeHtml(item.petugas || '-')}</span>
                            ${mobileActs}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    renderPaginationControls({
        totalItems,
        currentPage: rutinPage,
        pageSize: rutinPageSize,
        onPageChangeFn: 'changeRutinPage',
        onPageSizeChangeFn: 'changeRutinPageSize',
        containerId: 'rutin-pagination'
    });

    window.exportRutinReport = function (type) {
        const headers = ["Tanggal", "Hari", "Rubrikasi", "Kegiatan", "Petugas", "Status"];
        const rows = filtered.map(item => [formatDate(item.tanggal), item.hari || '-', item.rubrikasi || '-', item.kegiatan, item.petugas || '-', item.status || 'Ditugaskan']);
        if (type === 'csv') downloadCSV(headers, rows, `Rekap_Rutin_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Rekap_Rutin_SIMHumas_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Rekap Kegiatan Rutin Kehumasan BPS Kalbar", headers, rows);
    };
}

// -------------------------------------------------------------
// 4. MODUL AD HOC 2026 VIEW
// -------------------------------------------------------------
let adHocSearch = '';
let adHocPage = 1;
let adHocPageSize = 20;

function renderAdHoc(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Kegiatan Ad Hoc</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Kelola monitoring penugasan dinamis (multi-person), beban kerja, dan tim satuan tugas khusus.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportAdHocReport('excel')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-255 shadow-xs">
                    <i class="fa-solid fa-file-excel"></i> Excel
                </button>
                ${!isKepala && isUserAdminOrKetua() ? `
                    <button onclick="openModal('ad_hoc')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Tambah Penugasan Ad Hoc
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-205 dark:border-slate-700 mb-6 shadow-xs">
            <div class="relative w-full">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="adhoc-search-input" oninput="adHocSearch = this.value; adHocPage = 1; drawAdHocTable();" value="${adHocSearch || ''}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan, petugas, tanggal...">
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <!-- Desktop Table -->
            <div class="desktop-table-view hidden md:block overflow-x-auto">
                <table class="w-full text-xs text-left text-slate-650 dark:text-slate-300">
                    <thead class="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40 uppercase border-b border-slate-200 dark:border-slate-700 font-black tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Tanggal</th>
                            <th class="px-6 py-4">Hari</th>
                            <th class="px-6 py-4">Nama Kegiatan</th>
                            <th class="px-6 py-4 text-center">Jml Petugas</th>
                            <th class="px-6 py-4">Nama Petugas</th>
                            <th class="px-6 py-4">Keterangan</th>
                            <th class="px-6 py-4 text-center">Status</th>
                            ${!isKepala ? `<th class="px-6 py-4 text-center">Aksi</th>` : ''}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700" id="adhoc-table-body">
                        <!-- Filled by drawAdHocTable -->
                    </tbody>
                </table>
            </div>
            <!-- Mobile Card View -->
            <div class="mobile-table-view md:hidden p-4 space-y-3" id="adhoc-mobile-body">
                <!-- Filled by drawAdHocTable -->
            </div>
            <!-- PAGINATION -->
            <div id="adhoc-pagination"></div>
        </div>
    `;
    drawAdHocTable();
}

window.changeAdHocPage = function(p) {
    adHocPage = p;
    drawAdHocTable();
};

window.changeAdHocPageSize = function(s) {
    adHocPageSize = parseInt(s, 10) || 20;
    adHocPage = 1;
    drawAdHocTable();
};

function drawAdHocTable() {
    const body = document.getElementById('adhoc-table-body');
    if (!body) return;

    let filtered = db.adHoc.filter(isTaskForCurrentUser);
    if (adHocSearch.trim()) {
        const q = adHocSearch.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const dateStr = item.tanggal || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            return (
                (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
                (item.petugas && item.petugas.toLowerCase().includes(q)) ||
                (item.hari && item.hari.toLowerCase().includes(q)) ||
                (item.keterangan && item.keterangan.toLowerCase().includes(q)) ||
                (item.status && item.status.toLowerCase().includes(q)) ||
                (dateStr && String(dateStr).toLowerCase().includes(q)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(q)) ||
                (dateInput && dateInput.toLowerCase().includes(q))
            );
        });
    }

    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const isKepala = currentUser.role === 'kepala';

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr><td colspan="${isKepala ? 7 : 8}" class="py-16 text-center text-slate-400 dark:text-slate-555"><i class="fa-solid fa-users-slash text-3xl mb-2 text-slate-350 dark:text-slate-750"></i><p class="text-xs font-bold">Tidak ada penugasan ad hoc ditemukan.</p></td></tr>
        `;
        const pagEl = document.getElementById('adhoc-pagination');
        if (pagEl) pagEl.innerHTML = '';
        return;
    }

    // Pagination Calculation
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / adHocPageSize));
    if (adHocPage > totalPages) adHocPage = totalPages;
    if (adHocPage < 1) adHocPage = 1;

    const startIndex = (adHocPage - 1) * adHocPageSize;
    const endIndex = Math.min(startIndex + adHocPageSize, totalItems);
    const paginated = filtered.slice(startIndex, endIndex);

    body.innerHTML = paginated.map(item => {
        const staffList = typeof window.parseAdHocPicArray === 'function'
            ? window.parseAdHocPicArray(item.petugas)
            : (item.petugas ? item.petugas.split(',').map(s=>s.trim()).filter(Boolean) : []);
        const staffBadges = staffList.map(st => `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900 rounded font-bold text-[9px]"><i class="fa-solid fa-user-check text-[8px] text-indigo-500"></i> ${escapeHtml(st.trim())}</span>`).join(' ');

        let statusColor = item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300';

        let actionButtons = '';
        if (!isKepala) {
            actionButtons = `
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-1.5" onclick="event.stopPropagation()">
                        <button onclick="openModalById('ad_hoc', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-450 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Ubah"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        ${isUserAdminOrKetua() ? `
                            <button onclick="deleteItem('ad_hoc', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-450 hover:text-rose-606 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Hapus"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        ` : ''}
                    </div>
                </td>
            `;
        }

        const isDone = item.status === 'Selesai';
        const rowBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 hover:bg-emerald-100/75 dark:hover:bg-emerald-900/40 border-l-4 border-l-emerald-500' 
            : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/35';

        return `
            <tr class="${rowBg} transition-colors">
                <td class="px-6 py-4 font-bold whitespace-nowrap ${isDone ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}">${formatDate(item.tanggal)}</td>
                <td class="px-6 py-4 font-semibold text-slate-500 whitespace-nowrap">${escapeHtml(item.hari || '-')}</td>
                <td class="px-6 py-4 font-extrabold text-slate-855 dark:text-slate-255 leading-snug">
                    <span>${escapeHtml(item.kegiatan)}</span>
                </td>
                <td class="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-100">${escapeHtml(item.jumlah_bertugas || staffList.length)} orang</td>
                <td class="px-6 py-4 whitespace-normal"><div class="flex flex-wrap gap-1.5">${staffBadges || '-'}</div></td>
                <td class="px-6 py-4 text-slate-500 max-w-xs truncate font-medium">${escapeHtml(item.keterangan || '-')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${escapeHtml(item.status || 'Ditugaskan')}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');

    // Mobile card view for Ad Hoc
    const mobileBody = document.getElementById('adhoc-mobile-body');
    if (mobileBody) {
        mobileBody.innerHTML = paginated.map(item => {
            const staffList2 = typeof window.parseAdHocPicArray === 'function'
                ? window.parseAdHocPicArray(item.petugas)
                : (item.petugas ? item.petugas.split(',').map(s=>s.trim()).filter(Boolean) : []);
            const statusCls = item.status === 'Selesai' ? 'badge badge-selesai' : 'badge badge-progress';
            const mobileActs = !isKepala ? `
                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                    <button onclick="openModalById('ad_hoc', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    ${isUserAdminOrKetua() ? `<button onclick="deleteItem('ad_hoc', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}
                </div>` : '';
            return `
                <div class="mobile-data-card">
                    <div class="flex items-start justify-between gap-2 mb-1.5">
                        <p class="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex-1 min-w-0 leading-snug">${escapeHtml(item.kegiatan)}</p>
                        <span class="${statusCls} shrink-0">${escapeHtml(item.status || 'Ditugaskan')}</span>
                    </div>
                    <p class="text-[10px] text-slate-500 font-semibold mb-2">${formatDate(item.tanggal)} (${escapeHtml(item.hari || '-')})</p>
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${staffList2.map(s => `<span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-bold">${escapeHtml(s.trim())}</span>`).join('')}
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-slate-500 font-medium truncate max-w-[60%]">${escapeHtml(item.keterangan || '-')}</span>
                        ${mobileActs}
                    </div>
                </div>`;
        }).join('');
    }

    renderPaginationControls({
        totalItems,
        currentPage: adHocPage,
        pageSize: adHocPageSize,
        onPageChangeFn: 'changeAdHocPage',
        onPageSizeChangeFn: 'changeAdHocPageSize',
        containerId: 'adhoc-pagination'
    });

    window.exportAdHocReport = function (type) {
        const headers = ["Tanggal", "Hari", "Nama Kegiatan", "Jumlah Bertugas", "Nama Petugas", "Keterangan", "Status"];
        const rows = filtered.map(item => [formatDate(item.tanggal), item.hari || '-', item.kegiatan, item.jumlah_bertugas || '-', item.petugas || '-', item.keterangan || '-', item.status || 'Ditugaskan']);
        if (type === 'csv') downloadCSV(headers, rows, `Rekap_AdHoc_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Rekap_AdHoc_SIMHumas_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Daftar Penugasan Kerja Ad Hoc BPS Kalbar", headers, rows);
    };
}

// // -------------------------------------------------------------
// 5. MODUL PROTOKOLER VIEW
// -------------------------------------------------------------
let protoSearch = '';
let protoLevelFilter = '';
let protoMonthFilter = '';
let protoPage = 1;
let protoPageSize = 20;

window.changeProtoPage = function(p) {
    protoPage = p;
    drawProtokolerTable();
};

window.changeProtoPageSize = function(s) {
    protoPageSize = parseInt(s, 10);
    protoPage = 1;
    drawProtokolerTable();
};

function renderProtokolerSeparate(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Keprotokolan Pimpinan</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Agenda pendampingan protokol pimpinan BPS Provinsi Kalbar pada acara internal maupun eksternal.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportProtokolerReport('excel')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-255 shadow-xs">
                    <i class="fa-solid fa-file-excel"></i> Excel
                </button>
                ${!isKepala && isUserAdminOrKetua() ? `
                    <button onclick="openModal('protokoler')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Tambah Agenda Protokol
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-455"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="proto-search-input" oninput="protoSearch = this.value; protoPage = 1; drawProtokolerTable();" value="${protoSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan, lokasi, petugas, tanggal...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="proto-month-select" oninput="protoMonthFilter = this.value; protoPage = 1; drawProtokolerTable();" onchange="protoMonthFilter = this.value; protoPage = 1; drawProtokolerTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Bulan</option>
                    ${(() => {
                        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        const monthMap = new Map();
                        (db.protokoler || []).forEach(p => {
                            const dFormatted = formatDateInput(p.tanggal);
                            if (dFormatted && dFormatted.length >= 7) {
                                const key = dFormatted.slice(0, 7);
                                const [y, m] = key.split('-');
                                const mIdx = parseInt(m, 10) - 1;
                                if (mIdx >= 0 && mIdx < 12) {
                                    monthMap.set(key, `${monthNames[mIdx]} ${y}`);
                                }
                            }
                        });
                        const sortedKeys = Array.from(monthMap.keys()).sort().reverse();
                        return sortedKeys.map(k => `<option ${protoMonthFilter === k ? 'selected' : ''} value="${k}">${monthMap.get(k)}</option>`).join('');
                    })()}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-450"></i> Level:</span>
                <select id="proto-level-select" oninput="protoLevelFilter = this.value; protoPage = 1; drawProtokolerTable();" onchange="protoLevelFilter = this.value; protoPage = 1; drawProtokolerTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Level</option>
                    <option ${protoLevelFilter === 'Super Formal' ? 'selected' : ''} value="Super Formal">Super Formal</option>
                    <option ${protoLevelFilter === 'Formal' ? 'selected' : ''} value="Formal">Formal</option>
                    <option ${protoLevelFilter === 'Semi Formal' ? 'selected' : ''} value="Semi Formal">Semi Formal</option>
                    <option ${protoLevelFilter === 'Non Formal' ? 'selected' : ''} value="Non Formal">Non Formal</option>
                    <option ${protoLevelFilter === 'Hiburan' ? 'selected' : ''} value="Hiburan">Hiburan</option>
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetProtoFilters()" class="w-full btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 animate-fade-in" id="protokoler-list-body">
            <!-- Populated dynamically -->
        </div>
        <div id="protokoler-pagination" class="mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"></div>
    `;
    drawProtokolerTable();
}

window.resetProtoFilters = function() {
    protoSearch = '';
    protoMonthFilter = '';
    protoLevelFilter = '';
    protoPage = 1;
    const sInput = document.getElementById('proto-search-input');
    if (sInput) sInput.value = '';
    const mSelect = document.getElementById('proto-month-select');
    if (mSelect) mSelect.value = '';
    const lSelect = document.getElementById('proto-level-select');
    if (lSelect) lSelect.value = '';
    drawProtokolerTable();
};

function drawProtokolerTable() {
    const list = document.getElementById('protokoler-list-body');
    if (!list) return;

    let filtered = db.protokoler.filter(isTaskForCurrentUser);
    if (protoSearch.trim()) {
        const q = protoSearch.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const dateStr = item.tanggal || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            return (
                (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
                (item.lokasi && item.lokasi.toLowerCase().includes(q)) ||
                (item.petugas && item.petugas.toLowerCase().includes(q)) ||
                (item.level && item.level.toLowerCase().includes(q)) ||
                (item.jenis && item.jenis.toLowerCase().includes(q)) ||
                (item.keterangan && item.keterangan.toLowerCase().includes(q)) ||
                (item.status && item.status.toLowerCase().includes(q)) ||
                (dateStr && String(dateStr).toLowerCase().includes(q)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(q)) ||
                (dateInput && dateInput.toLowerCase().includes(q))
            );
        });
    }
    if (protoMonthFilter) {
        filtered = filtered.filter(item => {
            const d = formatDateInput(item.tanggal);
            return d && d.startsWith(protoMonthFilter);
        });
    }
    if (protoLevelFilter) {
        filtered = filtered.filter(item => item.level === protoLevelFilter);
    }

    // Urutan: tugas selesai (status Selesai) di bawah, yang akan datang/terdekat paling atas
    filtered.sort((a, b) => {
        const isDoneA = (a.status === 'Selesai') ? 1 : 0;
        const isDoneB = (b.status === 'Selesai') ? 1 : 0;
        if (isDoneA !== isDoneB) return isDoneA - isDoneB;

        const dateA = new Date(a.tanggal || '9999-12-31').getTime();
        const dateB = new Date(b.tanggal || '9999-12-31').getTime();
        return dateA - dateB;
    });

    const paginationContainer = document.getElementById('protokoler-pagination');

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-555 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-crown text-3xl mb-2 text-slate-350 dark:text-slate-750"></i>
                <p class="text-xs font-bold">Belum ada agenda protokoler terdaftar.</p>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / protoPageSize));
    if (protoPage > totalPages) protoPage = totalPages;
    if (protoPage < 1) protoPage = 1;
    const startIndex = (protoPage - 1) * protoPageSize;
    const paginated = filtered.slice(startIndex, startIndex + protoPageSize);

    const isKepala = currentUser.role === 'kepala';

    list.innerHTML = paginated.map(item => {
        const isDone = item.status === 'Selesai';
        let statusColor = isDone ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300';

        let actionsHtml = '';
        if (!isKepala) {
            actionsHtml = `
                <div class="flex items-center gap-1.5 justify-end md:justify-center border-t dark:border-slate-800 md:border-none pt-3 md:pt-0 shrink-0 w-full md:w-auto" onclick="event.stopPropagation()">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${['Super Formal', 'Formal'].includes(item.level) ? 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900' : 'bg-amber-50 text-amber-750 dark:bg-amber-950 dark:text-amber-300 border border-amber-100 dark:border-amber-900'}">${item.level}</span>
                    <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-350">${item.jenis || 'Internal'}</span>
                    <button onclick="openModalById('protokoler', ${item.id})" title="Ubah" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    ${isUserAdminOrKetua() ? `
                        <button onclick="deleteItem('protokoler', ${item.id})" title="Hapus" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    ` : ''}
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="flex items-center gap-1.5 justify-end md:justify-center border-t dark:border-slate-800 md:border-none pt-3 md:pt-0 shrink-0 w-full md:w-auto">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${['Super Formal', 'Formal'].includes(item.level) ? 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900' : 'bg-amber-50 text-amber-750 dark:bg-amber-950 dark:text-amber-300 border border-amber-100 dark:border-amber-900'}">${item.level}</span>
                    <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-350">${item.jenis || 'Internal'}</span>
                </div>
            `;
        }

        const cardBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800 border-l-4 border-l-emerald-500 shadow-xs' 
            : 'bg-white dark:bg-slate-850 border-slate-205 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600 shadow-xs';

        return `
            <div class="${cardBg} p-5 rounded-2xl border hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4" onclick="showDetailById('protokoler', ${item.id})">
                <div class="flex items-start gap-4">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${isDone ? 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800' : (['Super Formal', 'Formal'].includes(item.level) ? 'bg-indigo-50 border-indigo-150 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900' : 'bg-amber-50 border-amber-150 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-indigo-900')}">
                        <i class="fa-solid fa-crown text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-extrabold text-slate-850 dark:text-slate-200 text-sm leading-snug hover:text-indigo-650 transition-colors">${item.kegiatan}</h4>
                        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i> ${formatDate(item.tanggal)}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-slate-400"></i> Lokasi: ${item.lokasi}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-clock text-slate-400"></i> Waktu: ${formatTime(item.jam_mulai)}</p>
                            <p class="flex items-center gap-1.5 ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-655 dark:text-indigo-400'}"><i class="fa-solid fa-users text-slate-400"></i> Petugas: ${item.petugas || 'Belum ditunjuk'}</p>
                        </div>
                    </div>
                </div>
                ${actionsHtml}
            </div>
        `;
    }).join('');

    renderPaginationControls({
        totalItems,
        currentPage: protoPage,
        pageSize: protoPageSize,
        onPageChangeFn: 'changeProtoPage',
        onPageSizeChangeFn: 'changeProtoPageSize',
        containerId: 'protokoler-pagination'
    });

    window.exportProtokolerReport = function (type) {
        const headers = ["Tanggal", "Bulan", "Nama Kegiatan", "Lokasi", "Jam Mulai", "Jenis", "Level", "Petugas", "Keterangan", "Status"];
        const rows = filtered.map(item => [formatDate(item.tanggal), item.bulan || '-', item.kegiatan, item.lokasi || '-', formatTime(item.jam_mulai), item.jenis || 'Internal', item.level || '-', item.petugas || '-', item.keterangan || '-', item.status || 'Ditugaskan']);
        if (type === 'csv') downloadCSV(headers, rows, `Agenda_Protokoler_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Agenda_Protokoler_SIMHumas_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Daftar Agenda Protokoler BPS Kalbar", headers, rows);
    };
}

// -------------------------------------------------------------
// 6. MODUL MC VIEW
// -------------------------------------------------------------
let mcSearch = '';
let mcLevelFilter = '';
let mcMonthFilter = '';
let mcPage = 1;
let mcPageSize = 20;

window.changeMcPage = function(p) {
    mcPage = p;
    drawMcTable();
};

window.changeMcPageSize = function(s) {
    mcPageSize = parseInt(s, 10);
    mcPage = 1;
    drawMcTable();
};

function renderMcSeparate(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Petugas Master of Ceremony (MC)</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Agenda penugasan dan monitoring petugas pembawa acara (MC) BPS Provinsi Kalimantan Barat.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportMcReport('excel')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-255 shadow-xs">
                    <i class="fa-solid fa-file-excel"></i> Excel
                </button>
                ${!isKepala && isUserAdminOrKetua() ? `
                    <button onclick="openModal('mc')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Tambah Penugasan MC
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-455"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="mc-search-input" oninput="mcSearch = this.value; mcPage = 1; drawMcTable();" value="${mcSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan, lokasi, MC, tanggal...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="mc-month-select" oninput="mcMonthFilter = this.value; mcPage = 1; drawMcTable();" onchange="mcMonthFilter = this.value; mcPage = 1; drawMcTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Bulan</option>
                    ${(() => {
                        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        const monthMap = new Map();
                        (db.mc || []).forEach(m => {
                            const dFormatted = formatDateInput(m.tanggal);
                            if (dFormatted && dFormatted.length >= 7) {
                                const key = dFormatted.slice(0, 7);
                                const [y, mon] = key.split('-');
                                const mIdx = parseInt(mon, 10) - 1;
                                if (mIdx >= 0 && mIdx < 12) {
                                    monthMap.set(key, `${monthNames[mIdx]} ${y}`);
                                }
                            }
                        });
                        const sortedKeys = Array.from(monthMap.keys()).sort().reverse();
                        return sortedKeys.map(k => `<option ${mcMonthFilter === k ? 'selected' : ''} value="${k}">${monthMap.get(k)}</option>`).join('');
                    })()}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter text-slate-450"></i> Level:</span>
                <select id="mc-level-select" oninput="mcLevelFilter = this.value; mcPage = 1; drawMcTable();" onchange="mcLevelFilter = this.value; mcPage = 1; drawMcTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Level</option>
                    <option ${mcLevelFilter === 'Super Formal' ? 'selected' : ''} value="Super Formal">Super Formal</option>
                    <option ${mcLevelFilter === 'Formal' ? 'selected' : ''} value="Formal">Formal</option>
                    <option ${mcLevelFilter === 'Semi Formal' ? 'selected' : ''} value="Semi Formal">Semi Formal</option>
                    <option ${mcLevelFilter === 'Non Formal' ? 'selected' : ''} value="Non Formal">Non Formal</option>
                    <option ${mcLevelFilter === 'Hiburan' ? 'selected' : ''} value="Hiburan">Hiburan</option>
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetMcFilters()" class="w-full btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 animate-fade-in" id="mc-list-body">
            <!-- Populated dynamically -->
        </div>
        <div id="mc-pagination" class="mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"></div>
    `;
    drawMcTable();
}

window.resetMcFilters = function() {
    mcSearch = '';
    mcMonthFilter = '';
    mcLevelFilter = '';
    mcPage = 1;
    const sInput = document.getElementById('mc-search-input');
    if (sInput) sInput.value = '';
    const mSelect = document.getElementById('mc-month-select');
    if (mSelect) mSelect.value = '';
    const lSelect = document.getElementById('mc-level-select');
    if (lSelect) lSelect.value = '';
    drawMcTable();
};

function drawMcTable() {
    const list = document.getElementById('mc-list-body');
    if (!list) return;

    let filtered = db.mc.filter(isTaskForCurrentUser);
    if (mcSearch.trim()) {
        const q = mcSearch.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const dateStr = item.tanggal || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            return (
                (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
                (item.lokasi && item.lokasi.toLowerCase().includes(q)) ||
                (item.petugas && item.petugas.toLowerCase().includes(q)) ||
                (item.level && item.level.toLowerCase().includes(q)) ||
                (item.jenis && item.jenis.toLowerCase().includes(q)) ||
                (item.keterangan && item.keterangan.toLowerCase().includes(q)) ||
                (item.status && item.status.toLowerCase().includes(q)) ||
                (dateStr && String(dateStr).toLowerCase().includes(q)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(q)) ||
                (dateInput && dateInput.toLowerCase().includes(q))
            );
        });
    }
    if (mcMonthFilter) {
        filtered = filtered.filter(item => {
            const d = formatDateInput(item.tanggal);
            return d && d.startsWith(mcMonthFilter);
        });
    }
    if (mcLevelFilter) {
        filtered = filtered.filter(item => item.level === mcLevelFilter);
    }

    // Urutan: tugas selesai (status Selesai) di bawah, yang akan datang/terdekat paling atas
    filtered.sort((a, b) => {
        const isDoneA = (a.status === 'Selesai') ? 1 : 0;
        const isDoneB = (b.status === 'Selesai') ? 1 : 0;
        if (isDoneA !== isDoneB) return isDoneA - isDoneB;

        const dateA = new Date(a.tanggal || '9999-12-31').getTime();
        const dateB = new Date(b.tanggal || '9999-12-31').getTime();
        return dateA - dateB;
    });

    const paginationContainer = document.getElementById('mc-pagination');

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-555 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-microphone text-3xl mb-2 text-slate-350 dark:text-slate-750"></i>
                <p class="text-xs font-bold">Belum ada agenda penugasan MC terdaftar.</p>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / mcPageSize));
    if (mcPage > totalPages) mcPage = totalPages;
    if (mcPage < 1) mcPage = 1;
    const startIndex = (mcPage - 1) * mcPageSize;
    const paginated = filtered.slice(startIndex, startIndex + mcPageSize);

    const isKepala = currentUser.role === 'kepala';

    list.innerHTML = paginated.map(item => {
        const isDone = item.status === 'Selesai';
        let statusColor = isDone ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300';

        let actionsHtml = '';
        if (!isKepala) {
            actionsHtml = `
                <div class="flex items-center gap-1.5 justify-end md:justify-center border-t dark:border-slate-800 md:border-none pt-3 md:pt-0 shrink-0 w-full md:w-auto" onclick="event.stopPropagation()">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${['Super Formal', 'Formal'].includes(item.level) ? 'bg-indigo-50 text-indigo-750 dark:bg-indigo-955 text-indigo-300 border border-indigo-100 dark:border-indigo-900' : 'bg-amber-50 text-amber-750 dark:bg-amber-955 text-amber-300 border border-amber-100 dark:border-amber-900'}">${item.level}</span>
                    <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-bold text-slate-605 dark:text-slate-350">${item.jenis || 'Internal'}</span>
                    <button onclick="openModalById('mc', ${item.id})" title="Ubah" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-655 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    ${isUserAdminOrKetua() ? `
                        <button onclick="deleteItem('mc', ${item.id})" title="Hapus" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    ` : ''}
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="flex items-center gap-1.5 justify-end md:justify-center border-t dark:border-slate-800 md:border-none pt-3 md:pt-0 shrink-0 w-full md:w-auto">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${['Super Formal', 'Formal'].includes(item.level) ? 'bg-indigo-50 text-indigo-750 dark:bg-indigo-955 text-indigo-300 border border-indigo-100 dark:border-indigo-900' : 'bg-amber-50 text-amber-750 dark:bg-amber-955 text-amber-300 border border-amber-100 dark:border-amber-900'}">${item.level}</span>
                    <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-350">${item.jenis || 'Internal'}</span>
                </div>
            `;
        }

        const cardBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800 border-l-4 border-l-emerald-500 shadow-xs' 
            : 'bg-white dark:bg-slate-850 border-slate-205 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600 shadow-xs';

        return `
            <div class="${cardBg} p-5 rounded-2xl border hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4" onclick="showDetailById('mc', ${item.id})">
                <div class="flex items-start gap-4">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${isDone ? 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800' : (['Super Formal', 'Formal'].includes(item.level) ? 'bg-indigo-50 border-indigo-150 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900' : 'bg-amber-50 border-amber-150 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-indigo-900')}">
                        <i class="fa-solid fa-microphone-lines text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-extrabold text-slate-855 dark:text-slate-200 text-sm leading-snug hover:text-indigo-650 transition-colors">${item.kegiatan}</h4>
                        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i> ${formatDate(item.tanggal)}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-slate-400"></i> Lokasi: ${item.lokasi}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-clock text-slate-400"></i> Waktu: ${formatTime(item.jam_mulai)}</p>
                            <p class="flex items-center gap-1.5 ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-655 dark:text-indigo-400'}"><i class="fa-solid fa-users text-slate-400"></i> Petugas MC: ${item.petugas || 'Belum ditunjuk'}</p>
                        </div>
                    </div>
                </div>
                ${actionsHtml}
            </div>
        `;
    }).join('');

    renderPaginationControls({
        totalItems,
        currentPage: mcPage,
        pageSize: mcPageSize,
        onPageChangeFn: 'changeMcPage',
        onPageSizeChangeFn: 'changeMcPageSize',
        containerId: 'mc-pagination'
    });

    window.exportMcReport = function (type) {
        const headers = ["Tanggal", "Bulan", "Nama Kegiatan", "Lokasi", "Jam Mulai", "Jenis", "Level", "Petugas MC", "Keterangan", "Status"];
        const rows = filtered.map(item => [formatDate(item.tanggal), item.bulan || '-', item.kegiatan, item.lokasi || '-', formatTime(item.jam_mulai), item.jenis || 'Internal', item.level || '-', item.petugas || '-', item.keterangan || '-', item.status || 'Ditugaskan']);
        if (type === 'csv') downloadCSV(headers, rows, `Penugasan_MC_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Penugasan_MC_SIMHumas_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Daftar Penugasan Petugas MC BPS Kalbar", headers, rows);
    };
}

// -------------------------------------------------------------
// 7. MODUL BERITA RESMI STATISTIK (BRS) RILIS VIEW
// -------------------------------------------------------------
let brsSearch = '';
let brsMonthFilter = '';
let brsStatusFilter = '';
let brsPage = 1;
let brsPageSize = 20;

window.changeBrsPage = function(p) {
    brsPage = p;
    drawBrsGrid();
};

window.changeBrsPageSize = function(s) {
    brsPageSize = parseInt(s, 10);
    brsPage = 1;
    drawBrsGrid();
};

function renderBrsRilis(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Modul BRS Rilis</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Kelola kegiatan BRS, infografis, dokumentasi YouTube/Zoom, dan kelengkapan highlight data.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportBrsReport('excel')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-255 shadow-xs">
                    <i class="fa-solid fa-file-excel"></i> Excel
                </button>
                ${!isKepala && isUserAdminOrKetua() ? `
                    <button onclick="openModal('brs_rilis')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Tambah Kegiatan BRS
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="brs-search-input" oninput="brsSearch = this.value; brsPage = 1; drawBrsGrid();" value="${brsSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari judul kegiatan BRS, PIC, tanggal...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="brs-month-select" oninput="brsMonthFilter = this.value; brsPage = 1; drawBrsGrid();" onchange="brsMonthFilter = this.value; brsPage = 1; drawBrsGrid();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Bulan</option>
                    ${(() => {
                        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        const monthMap = new Map();
                        (db.brsRilis || []).forEach(b => {
                            const dFormatted = formatDateInput(b.tanggal_rilis);
                            if (dFormatted && dFormatted.length >= 7) {
                                const key = dFormatted.slice(0, 7);
                                const [y, mon] = key.split('-');
                                const mIdx = parseInt(mon, 10) - 1;
                                if (mIdx >= 0 && mIdx < 12) {
                                    monthMap.set(key, `${monthNames[mIdx]} ${y}`);
                                }
                            }
                        });
                        const sortedKeys = Array.from(monthMap.keys()).sort().reverse();
                        return sortedKeys.map(k => `<option ${brsMonthFilter === k ? 'selected' : ''} value="${k}">${monthMap.get(k)}</option>`).join('');
                    })()}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-450"></i> Status:</span>
                <select id="brs-status-select" oninput="brsStatusFilter = this.value; brsPage = 1; drawBrsGrid();" onchange="brsStatusFilter = this.value; brsPage = 1; drawBrsGrid();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Status</option>
                    <option ${brsStatusFilter === 'Rilis' ? 'selected' : ''} value="Rilis">Selesai Rilis</option>
                    <option ${brsStatusFilter === 'Terjadwal' ? 'selected' : ''} value="Terjadwal">Terjadwal / Proses</option>
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetBrsFilters()" class="w-full btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" id="brs-grid-body">
            <!-- Populated dynamically -->
        </div>
        <div id="brs-pagination" class="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"></div>
    `;
    drawBrsGrid();
}

window.resetBrsFilters = function() {
    brsSearch = '';
    brsMonthFilter = '';
    brsStatusFilter = '';
    brsPage = 1;
    const sInput = document.getElementById('brs-search-input');
    if (sInput) sInput.value = '';
    const mSelect = document.getElementById('brs-month-select');
    if (mSelect) mSelect.value = '';
    const stSelect = document.getElementById('brs-status-select');
    if (stSelect) stSelect.value = '';
    drawBrsGrid();
};

function drawBrsGrid() {
    const grid = document.getElementById('brs-grid-body');
    if (!grid) return;

    let filtered = db.brsRilis.filter(isTaskForCurrentUser);
    if (brsSearch.trim()) {
        const q = brsSearch.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const dateStr = item.tanggal_rilis || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            return (
                (item.judul && item.judul.toLowerCase().includes(q)) ||
                (item.pic_poster_info && item.pic_poster_info.toLowerCase().includes(q)) ||
                (item.pic_doc_ruang && item.pic_doc_ruang.toLowerCase().includes(q)) ||
                (item.pic_doc_yt_zoom && item.pic_doc_yt_zoom.toLowerCase().includes(q)) ||
                (item.status && item.status.toLowerCase().includes(q)) ||
                (dateStr && String(dateStr).toLowerCase().includes(q)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(q)) ||
                (dateInput && dateInput.toLowerCase().includes(q))
            );
        });
    }
    if (brsMonthFilter) {
        filtered = filtered.filter(item => {
            const d = formatDateInput(item.tanggal_rilis);
            return d && d.startsWith(brsMonthFilter);
        });
    }
    if (brsStatusFilter) {
        if (brsStatusFilter === 'Rilis') {
            filtered = filtered.filter(item => item.status === 'Rilis' || item.status === 'Selesai' || item.highlight);
        } else {
            filtered = filtered.filter(item => item.status !== 'Rilis' && item.status !== 'Selesai' && !item.highlight);
        }
    }

    // Urutan: tugas selesai (status Rilis / Selesai) di bawah, yang akan datang/terdekat paling atas
    filtered.sort((a, b) => {
        const isDoneA = (a.status === 'Rilis' || a.status === 'Selesai' || a.highlight) ? 1 : 0;
        const isDoneB = (b.status === 'Rilis' || b.status === 'Selesai' || b.highlight) ? 1 : 0;
        if (isDoneA !== isDoneB) return isDoneA - isDoneB;

        const dateA = new Date(a.tanggal_rilis || '9999-12-31').getTime();
        const dateB = new Date(b.tanggal_rilis || '9999-12-31').getTime();
        return dateA - dateB;
    });

    const paginationContainer = document.getElementById('brs-pagination');

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-555 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-bullhorn text-4xl mb-2.5 text-slate-350 dark:text-slate-750"></i>
                <p class="text-xs font-bold">Arsip Berita Resmi Statistik (BRS) kosong.</p>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / brsPageSize));
    if (brsPage > totalPages) brsPage = totalPages;
    if (brsPage < 1) brsPage = 1;
    const startIndex = (brsPage - 1) * brsPageSize;
    const paginated = filtered.slice(startIndex, startIndex + brsPageSize);

    const isKepala = currentUser.role === 'kepala';

    grid.innerHTML = paginated.map(item => {
        const isDone = (item.status === 'Rilis' || item.status === 'Selesai' || item.highlight);

        let actionsPanel = '';
        if (!isKepala) {
            actionsPanel = `
                <div class="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px]">
                    <div class="flex items-center gap-1.5">
                        <button onclick="openModalById('brs_rilis', ${item.id})" title="Ubah" class="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        ${isUserAdminOrKetua() ? `
                            <button onclick="deleteItem('brs_rilis', ${item.id})" title="Hapus" class="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        ` : ''}
                    </div>
                    <button onclick="showDetailById('brs_rilis', ${item.id})" class="text-[9px] font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-650 dark:text-indigo-400'} hover:underline">Lihat Rincian →</button>
                </div>
            `;
        } else {
            actionsPanel = `
                <div class="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end text-[10px]">
                    <button onclick="showDetailById('brs_rilis', ${item.id})" class="text-[9px] font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-650 dark:text-indigo-400'} hover:underline">Lihat Rincian →</button>
                </div>
            `;
        }

        const cardBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800 border-l-4 border-l-emerald-500 shadow-xs' 
            : 'bg-white dark:bg-slate-850 border-slate-205 dark:border-slate-700 shadow-xs hover:shadow-md transition-all duration-300';

        return `
            <div class="${cardBg} rounded-2xl border p-5 flex flex-col justify-between group">
                <div>
                    <div class="flex justify-between items-start gap-2">
                        <span class="text-[9px] ${isDone ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-slate-450 dark:text-slate-500 font-extrabold'} uppercase tracking-widest"><i class="fa-solid fa-calendar mr-1"></i> ${formatDate(item.tanggal_rilis)}</span>
                        ${isDone ? '<span class="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[7px]"></i> Selesai Rilis</span>' : '<span class="inline-flex items-center gap-1 text-[8px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded shrink-0">Terjadwal</span>'}
                    </div>
                    <h4 class="font-extrabold text-slate-855 dark:text-slate-100 text-sm mt-3 leading-snug cursor-pointer hover:text-indigo-655 transition-colors" onclick="showDetailById('brs_rilis', ${item.id})">${item.judul}</h4>
                    
                    <div class="mt-4 space-y-2 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                        <div class="flex justify-between"><span>PIC Poster & Info:</span><strong class="text-slate-800 dark:text-slate-200">${item.pic_poster_info || '-'}</strong></div>
                        <div class="flex justify-between"><span>PIC Dokumentasi Ruang:</span><strong class="text-slate-800 dark:text-slate-200">${item.pic_doc_ruang || '-'}</strong></div>
                        <div class="flex justify-between"><span>PIC Dok. YT & Zoom:</span><strong class="text-slate-800 dark:text-slate-200">${item.pic_doc_yt_zoom || '-'}</strong></div>
                        <div class="flex justify-between items-center mt-2.5 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-750">
                            <span>Highlight Data:</span>
                            ${item.highlight ? `<a href="${item.highlight}" target="_blank" class="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 rounded font-bold text-[8px] uppercase tracking-wider"><i class="fa-solid fa-file-arrow-down mr-0.5"></i> Unduh</a>` : '<span class="text-slate-400">Belum ada</span>'}
                        </div>
                    </div>
                </div>
                ${actionsPanel}
            </div>
        `;
    }).join('');

    renderPaginationControls({
        totalItems,
        currentPage: brsPage,
        pageSize: brsPageSize,
        onPageChangeFn: 'changeBrsPage',
        onPageSizeChangeFn: 'changeBrsPageSize',
        containerId: 'brs-pagination'
    });

    window.exportBrsReport = function (type) {
        const headers = ["Tanggal Rilis", "Judul Kegiatan Rilis", "PIC Poster & Info", "PIC Dok Ruang", "PIC Dok YT Zoom", "Highlight"];
        const rows = filtered.map(item => [formatDate(item.tanggal_rilis), item.judul, item.pic_poster_info || '-', item.pic_doc_ruang || '-', item.pic_doc_yt_zoom || '-', item.highlight || '-']);
        if (type === 'csv') downloadCSV(headers, rows, `Arsip_BRS_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Arsip_BRS_SIMHumas_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Arsip Berita Resmi Statistik (BRS) BPS Kalbar", headers, rows);
    };
}

// -------------------------------------------------------------
// 8. MODUL UCAPAN HARI BESAR VIEW
// -------------------------------------------------------------
let hariBesarSearch = '';
let hariBesarMonthFilter = '';
let hariBesarPage = 1;
let hariBesarPageSize = 20;

window.changeHariBesarPage = function(p) {
    hariBesarPage = p;
    drawHariBesarTable();
};

window.changeHariBesarPageSize = function(s) {
    hariBesarPageSize = parseInt(s, 10);
    hariBesarPage = 1;
    drawHariBesarTable();
};

function renderHariBesar(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ucapan Hari Besar</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Daftar agenda ucapan hari besar nasional/keagamaan, kalender perayaan, serta PIC pembuat konten.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportHariBesarReport('excel')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-255 shadow-xs">
                    <i class="fa-solid fa-file-excel"></i> Excel
                </button>
                ${!isKepala && isUserAdminOrKetua() ? `
                    <button onclick="openModal('hari_besar')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Tambah Ucapan
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="haribesar-search-input" oninput="hariBesarSearch = this.value; hariBesarPage = 1; drawHariBesarTable();" value="${hariBesarSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari hari besar, PIC, tanggal...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="haribesar-month-select" oninput="hariBesarMonthFilter = this.value; hariBesarPage = 1; drawHariBesarTable();" onchange="hariBesarMonthFilter = this.value; hariBesarPage = 1; drawHariBesarTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Bulan</option>
                    ${(() => {
                        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        const monthMap = new Map();
                        (db.hariBesar || []).forEach(h => {
                            const dFormatted = formatDateInput(h.tanggal);
                            if (dFormatted && dFormatted.length >= 7) {
                                const key = dFormatted.slice(0, 7);
                                const [y, mon] = key.split('-');
                                const mIdx = parseInt(mon, 10) - 1;
                                if (mIdx >= 0 && mIdx < 12) {
                                    monthMap.set(key, `${monthNames[mIdx]} ${y}`);
                                }
                            }
                        });
                        const sortedKeys = Array.from(monthMap.keys()).sort().reverse();
                        return sortedKeys.map(k => `<option ${hariBesarMonthFilter === k ? 'selected' : ''} value="${k}">${monthMap.get(k)}</option>`).join('');
                    })()}
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetHariBesarFilters()" class="w-full btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <!-- Desktop Table -->
            <div class="desktop-table-view hidden md:block overflow-x-auto">
                <table class="w-full text-xs text-left text-slate-650 dark:text-slate-300">
                    <thead class="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40 uppercase border-b border-slate-200 dark:border-slate-700 font-black tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Tanggal</th>
                            <th class="px-6 py-4">Nama Hari Besar</th>
                            <th class="px-6 py-4">Pembuat Konten (PIC)</th>
                            <th class="px-6 py-4">Status Progress</th>
                            ${!isKepala ? `<th class="px-6 py-4 text-center">Aksi</th>` : ''}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700" id="haribesar-table-body">
                        <!-- Filled by drawHariBesarTable -->
                    </tbody>
                </table>
            </div>
            <!-- Mobile Card View -->
            <div class="mobile-table-view md:hidden p-4 space-y-3" id="haribesar-mobile-body">
                <!-- Filled by drawHariBesarTable -->
            </div>
            <div id="haribesar-pagination"></div>
        </div>
    `;
    drawHariBesarTable();
}

window.resetHariBesarFilters = function() {
    hariBesarSearch = '';
    hariBesarMonthFilter = '';
    hariBesarPage = 1;
    const sInput = document.getElementById('haribesar-search-input');
    if (sInput) sInput.value = '';
    const mSelect = document.getElementById('haribesar-month-select');
    if (mSelect) mSelect.value = '';
    drawHariBesarTable();
};

function drawHariBesarTable() {
    const body = document.getElementById('haribesar-table-body');
    if (!body) return;

    let filtered = db.hariBesar.filter(isTaskForCurrentUser);
    if (hariBesarSearch.trim()) {
        const q = hariBesarSearch.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const dateStr = item.tanggal || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            return (
                (item.hari_besar && item.hari_besar.toLowerCase().includes(q)) ||
                (item.pembuat_konten && item.pembuat_konten.toLowerCase().includes(q)) ||
                (item.keterangan && item.keterangan.toLowerCase().includes(q)) ||
                (item.status && item.status.toLowerCase().includes(q)) ||
                (dateStr && String(dateStr).toLowerCase().includes(q)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(q)) ||
                (dateInput && dateInput.toLowerCase().includes(q))
            );
        });
    }
    if (hariBesarMonthFilter) {
        filtered = filtered.filter(item => {
            const d = formatDateInput(item.tanggal);
            return d && d.startsWith(hariBesarMonthFilter);
        });
    }

    // Urutan: tugas selesai (status Selesai) di bawah, yang akan datang/terdekat paling atas
    filtered.sort((a, b) => {
        const isDoneA = (a.status === 'Selesai') ? 1 : 0;
        const isDoneB = (b.status === 'Selesai') ? 1 : 0;
        if (isDoneA !== isDoneB) return isDoneA - isDoneB;

        const dateA = new Date(a.tanggal || '9999-12-31').getTime();
        const dateB = new Date(b.tanggal || '9999-12-31').getTime();
        return dateA - dateB;
    });

    const isKepala = currentUser.role === 'kepala';
    const paginationContainer = document.getElementById('haribesar-pagination');

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr><td colspan="${isKepala ? 4 : 5}" class="py-16 text-center text-slate-400 dark:text-slate-550"><i class="fa-solid fa-heart-broken text-3xl mb-2 text-slate-350 dark:text-slate-750"></i><p class="text-xs font-bold">Tidak ada agenda ucapan hari besar.</p></td></tr>
        `;
        const mobileBody = document.getElementById('haribesar-mobile-body');
        if (mobileBody) mobileBody.innerHTML = '';
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / hariBesarPageSize));
    if (hariBesarPage > totalPages) hariBesarPage = totalPages;
    if (hariBesarPage < 1) hariBesarPage = 1;
    const startIndex = (hariBesarPage - 1) * hariBesarPageSize;
    const paginated = filtered.slice(startIndex, startIndex + hariBesarPageSize);

    body.innerHTML = paginated.map(item => {
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
        const isDone = item.status === 'Selesai';
        let statusColor = isDone ? 'bg-emerald-50 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-850 dark:bg-indigo-950/40 dark:text-indigo-300';

        let actionButtons = '';
        if (!isKepala) {
            actionButtons = `
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-1.5" onclick="event.stopPropagation()">
                        <button onclick="openModalById('hari_besar', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-455 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Ubah"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        ${isUserAdminOrKetua() ? `
                            <button onclick="deleteItem('hari_besar', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-455 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Hapus"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        ` : ''}
                    </div>
                </td>
            `;
        }

        const rowBg = isDone
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 hover:bg-emerald-100/75 dark:hover:bg-emerald-900/40 border-l-4 border-l-emerald-500'
            : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors';

        return `
            <tr class="${rowBg} transition-colors">
                <td class="px-6 py-4 font-bold whitespace-nowrap ${isDone ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}">${formatDate(item.tanggal)}</td>
                <td class="px-6 py-4 font-extrabold ${isDone ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-855 dark:text-slate-200'} leading-snug">
                    <span>${item.hari_besar}</span>
                </td>
                <td class="px-6 py-4 font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-655 dark:text-indigo-400'} whitespace-nowrap">${item.pembuat_konten || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');

    // Mobile card view for Hari Besar
    const mobileBody = document.getElementById('haribesar-mobile-body');
    if (mobileBody) {
        mobileBody.innerHTML = paginated.map(item => {
            const isDone = item.status === 'Selesai';
            const statusCls = isDone ? 'badge badge-selesai' : 'badge badge-progress';
            const mobileActs = !isKepala ? `
                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                    <button onclick="openModalById('hari_besar', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    ${isUserAdminOrKetua() ? `<button onclick="deleteItem('hari_besar', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}
                </div>` : '';

            const mobileCardCls = isDone
                ? 'mobile-data-card bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800 border-l-4 border-l-emerald-500 shadow-xs'
                : 'mobile-data-card';

            return `
                <div class="${mobileCardCls}">
                    <div class="flex items-start justify-between gap-2 mb-1.5">
                        <p class="font-extrabold text-xs ${isDone ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-100'} leading-snug flex-1 min-w-0">${item.hari_besar}</p>
                        <span class="${statusCls} shrink-0">${item.status || 'Ditugaskan'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[10px] ${isDone ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 font-semibold'}">${formatDate(item.tanggal)}</p>
                            <p class="text-[10px] font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-600 dark:text-indigo-400'} mt-1">PIC: ${item.pembuat_konten || '-'}</p>
                        </div>
                        ${mobileActs}
                    </div>
                </div>`;
        }).join('');
    }

    renderPaginationControls({
        totalItems,
        currentPage: hariBesarPage,
        pageSize: hariBesarPageSize,
        onPageChangeFn: 'changeHariBesarPage',
        onPageSizeChangeFn: 'changeHariBesarPageSize',
        containerId: 'haribesar-pagination'
    });

    window.exportHariBesarReport = function (type) {
        const headers = ["Tanggal", "Hari Besar", "Pembuat Konten (PIC)", "Status", "Data Pendukung"];
        const rows = filtered.map(item => [formatDate(item.tanggal), item.hari_besar, item.pembuat_konten || '-', item.status || 'Ditugaskan', item.data_pendukung || '-']);
        if (type === 'csv') downloadCSV(headers, rows, `Kalender_HariBesar_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Kalender_HariBesar_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Kalender & Penugasan Ucapan Hari Besar BPS Kalbar", headers, rows);
    };
}

// // -------------------------------------------------------------
// 9. MODUL REKAP KEGIATAN & REKAPITULASI TUGAS ANGGOTA TIM HUMAS (SLA)
// -------------------------------------------------------------

// Global state filter & view untuk modul SLA & Rekap Tugas
window.rekapKegiatanFilter = window.rekapKegiatanFilter || {
    member: 'all',
    kategori: 'all', // 'all', 'humas', 'protokoler'
    type: 'all',
    status: 'all', // 'all', 'selesai', 'belum', 'terlambat', 'mendekati'
    month: 'all',  // 'all' atau 0 - 11
    year: 2026,    // 2026, 2025, atau 'all'
    search: '',
    viewMode: 'rekap_rubrikasi', // 'rekap_rubrikasi' (Tabel Rekapitulasi Rubrikasi), 'per_member' (Accordion Per Anggota), 'matrix' (Tabel Seluruh Tugas)
    expandedMembers: {}     // DEFAULT TUTUP SEMUA: kosong = seluruh kartu anggota dalam kondisi tertutup!
};

/**
 * Pembersih gelar akademik & kurung keterangan agar nama personil konsisten
 */
function cleanAcademicDegrees(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .replace(/\b(S\.Tr\.Stat|S\.Tr|S\.Stat|S\.Si|S\.E|S\.Kom|S\.Sos|S\.T|S\.P|A\.Md|M\.Si|M\.M|M\.Stat|Dr|Drs|Dra)\b\.?/gi, '')
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Pemetaan alias personil Tim Humas BPS Kalbar untuk memastikan seluruh tugas teratribusi akurat
 */
const BPS_HUMAS_ALIASES = {
    'dara sna': 'dara septika',
    'desa ayu n': 'desa ayu natalia',
    'rizky fajariani': 'rizky fajriani',
    'anis fakhrunnisa': 'anis fakhurnnisa',
    'adji hasfiar': 'adji haspiar',
    'romulus arjuna nt': 'romulus arjuna',
    'azhari koordinator': 'azhari'
};

/**
 * Parser tanggal aman yang dinormalisasi ke zona waktu Asia/Jakarta (WIB, UTC+7).
 * Menangani serialisasi Google Sheets dimana waktu tengah malam WIB (UTC+7)
 * diserialisasi sebagai 17:00:00.000Z hari sebelumnya di UTC.
 */
function parseSafeDateWIB(dStr) {
    if (!dStr && dStr !== 0) return null;
    let d = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : null;
    if (!d || isNaN(d.getTime())) {
        d = new Date(dStr);
    }
    if (!d || isNaN(d.getTime())) return null;

    try {
        const wibStr = d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const wibDate = new Date(wibStr);
        if (!isNaN(wibDate.getTime())) return wibDate;
    } catch (_) {}
    return d;
}

/**
 * Format tanggal ke bahasa Indonesia dengan zona waktu WIB yang konsisten
 */
function formatDateWIB(dateVal) {
    if (!dateVal) return '-';
    const d = parseSafeDateWIB(dateVal);
    if (!d) return String(dateVal);
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Mencocokkan nama petugas dari tugas ke data personil Tim Humas yang canonical
 */
function resolveMemberFromPic(pic, teamList) {
    if (!pic || typeof pic !== 'string') return null;
    const cPic = cleanAcademicDegrees(pic);
    if (!cPic || cPic === '-' || cPic === 'null' || cPic === 'belum ditugaskan') return null;

    // 1. Cek alias eksplisit BPS Kalbar
    const aliasTarget = BPS_HUMAS_ALIASES[cPic];
    const searchTarget = aliasTarget || cPic;

    // 2. Exact match di teamList
    for (const m of teamList) {
        if (m.normKey === searchTarget || m.cleanName === searchTarget) return m;
    }

    // 3. Match dengan membuang inisial belakang (contoh: "jeberta tefilah m" -> "jeberta tefilah", "diah nadiva s" -> "diah nadiva")
    const words = cPic.split(' ');
    if (words.length > 2 && words[words.length - 1].length <= 3) {
        const withoutSuffix = words.slice(0, -1).join(' ');
        for (const m of teamList) {
            if (m.normKey === withoutSuffix || m.cleanName === withoutSuffix) return m;
        }
    }

    // 4. Match dengan 2 kata awal
    if (words.length >= 2) {
        const firstTwo = words.slice(0, 2).join(' ');
        for (const m of teamList) {
            if (m.normKey === firstTwo || m.cleanName === firstTwo) return m;
        }
    }

    // 5. Match token signifikan
    const picTokens = cPic.split(' ').filter(w => w.length >= 4);
    for (const m of teamList) {
        const mTokens = m.normKey.split(' ').filter(w => w.length >= 4);
        if (picTokens.length > 0 && mTokens.length > 0) {
            const hasCommon = picTokens.some(pt => mTokens.includes(pt));
            if (hasCommon) return m;
        }
    }

    return null;
}

/**
 * Mengambil seluruh personil Tim Humas secara EKSKLUSIF dari daftar nama yang tercantum
 * pada sheet team di database (db.team), serta mengelompokkannya ke dua kategori (Humas dan Protokoler)
 * berdasarkan nilai pada kolom C (Jabatan).
 */
function getAllTeamMembersList(allTasks = []) {
    const memberMap = new Map();

    const registerMember = (nama, jabatan = 'Anggota Tim Humas', bidang = 'Kehumasan', email = '', role = 'tim') => {
        if (!nama || typeof nama !== 'string') return;
        const trimmed = nama.trim();
        if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'belum ditugaskan' || trimmed.toLowerCase() === 'null') return;
        const normKey = cleanAcademicDegrees(trimmed);
        if (!normKey || normKey.length < 2) return;

        // Abaikan entitas non-personil
        if (['pimpinan', 'bps ri', 'bps kalbar', 'semua', 'umum', 'user bidang', 'admin'].includes(normKey)) return;

        if (!memberMap.has(normKey)) {
            const rawJabatan = jabatan || 'Staf Kehumasan';
            const jLower = String(rawJabatan).toLowerCase().trim();
            // Pengelompokan Pegawai berdasarkan nilai pada kolom C (Jabatan) di sheet team:
            // Jika jabatan mengandung kata 'protokol' maka 'Protokoler', selain itu 'Humas'
            const kategori = (jLower === 'protokoler' || jLower === 'protokol' || jLower.includes('protokol')) ? 'Protokoler' : 'Humas';

            memberMap.set(normKey, {
                rawName: trimmed,
                cleanName: normKey,
                normKey,
                jabatan: rawJabatan,
                bidang: bidang || 'Humas & IPDS',
                email: email || `${normKey.replace(/\s+/g, '.')}@bps.go.id`,
                role,
                kategori
            });
        }
    };

    // Bersumber secara EKSKLUSIF dari daftar nama pada sheet team (db.team)
    (db.team || []).forEach(m => {
        registerMember(m.nama, m.jabatan, m.bidang || m.seksi, m.email, m.role || 'tim');
    });

    // Urutkan alfabetis berdasarkan nama anggota
    return Array.from(memberMap.values()).sort((a, b) => a.rawName.localeCompare(b.rawName, 'id-ID'));
}

/**
 * Memeriksa apakah tugas ditugaskan ke personil tertentu
 */
function isTaskAssignedToMember(task, member) {
    if (!task || !member) return false;
    if (task.canonicalMember && task.canonicalMember.normKey === member.normKey) return true;

    const taskPicRaw = String(task.petugas || '').trim();
    if (!taskPicRaw || taskPicRaw === '-') return false;

    const matched = resolveMemberFromPic(taskPicRaw, [member]);
    if (matched) return true;

    const cleanPic = cleanAcademicDegrees(taskPicRaw);
    const cleanMember = cleanAcademicDegrees(member.rawName || member.normKey);

    if (!cleanPic || !cleanMember) return false;
    if (cleanPic === cleanMember) return true;
    if (cleanPic.includes(cleanMember) || cleanMember.includes(cleanPic)) return true;

    const memberTokens = cleanMember.split(' ').filter(t => t.length >= 3);
    for (const token of memberTokens) {
        if (cleanPic.includes(token)) return true;
    }

    return false;
}

/**
 * Mengumpulkan dan menstandardisasi SELURUH data tugas dari seluruh modul di SIM Humas BPS Kalbar
 */
function getAllIntegratedTasks() {
    const tasks = [];
    const todayWIB = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    todayWIB.setHours(0, 0, 0, 0);

    const safePush = (task) => {
        if (!task.judul && !task.uraian) return;

        const parsedTanggal = parseSafeDateWIB(task.tanggal);
        const parsedDeadline = parseSafeDateWIB(task.deadline);
        const primaryDate = parsedTanggal || parsedDeadline;
        const deadlineDate = parsedDeadline || parsedTanggal;

        let daysRemaining = 999;
        if (deadlineDate && !isNaN(deadlineDate.getTime())) {
            const tempDeadline = new Date(deadlineDate);
            tempDeadline.setHours(0, 0, 0, 0);
            daysRemaining = Math.round((tempDeadline - todayWIB) / (1000 * 60 * 60 * 24));
        }

        const sLower = String(task.status || '').toLowerCase().trim();
        const isDone = task.progress === 100 || ['selesai', 'done', 'posted', 'published', 'rilis', 'tayang', 'sudah'].includes(sLower);

        let slaStatus = 'Aman';
        let slaClass = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800';
        let isTerlambat = false;
        let isMendekati = false;

        if (isDone) {
            slaStatus = 'Selesai';
            slaClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        } else if (daysRemaining < 0) {
            slaStatus = 'Terlambat';
            isTerlambat = true;
            slaClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';
        } else if (daysRemaining <= 3) {
            slaStatus = 'Mendekati';
            isMendekati = true;
            slaClass = 'bg-amber-100 text-amber-800 dark:bg-amber-955 dark:text-amber-300 border-amber-200 dark:border-amber-800';
        }

        tasks.push({
            ...task,
            parsedDate: primaryDate,
            parsedDeadline: deadlineDate,
            daysRemaining,
            isDone,
            isTerlambat,
            isMendekati,
            slaStatus,
            slaClass
        });
    };

    // 1. Rekap Rutin
    (db.rekapRutin || []).forEach((item, idx) => {
        safePush({
            id: `rutin_${item.id || idx}`,
            source: 'rekap_rutin',
            jenis: 'Rutin',
            rubrikasi: item.rubrikasi || '#haribesar/daerah/nasional/internasional',
            judul: item.kegiatan || 'Kegiatan Rutin Kehumasan',
            petugas: item.petugas || '-',
            tanggal: item.tanggal,
            deadline: item.deadline || item.tanggal,
            status: item.status || 'Ditugaskan',
            progress: item.status === 'Selesai' ? 100 : (item.progress || 35),
            keterangan: item.output || item.rubrikasi || item.keterangan || '-'
        });
    });

    // 2. Ad Hoc 2026
    (db.adHoc || []).forEach((item, idx) => {
        const adHocLow = String(item.kegiatan || '').toLowerCase();
        const adHocRubrik = item.rubrikasi || (adHocLow.includes('se2026') ? '#SE2026' : (adHocLow.includes('dtsen') ? '#DTSEN' : 'Ad Hoc'));
        safePush({
            id: `adhoc_${item.id || idx}`,
            source: 'ad_hoc',
            jenis: 'Ad Hoc',
            rubrikasi: adHocRubrik,
            judul: item.kegiatan || 'Tugas Khusus Ad Hoc',
            petugas: item.petugas || '-',
            tanggal: item.tanggal,
            deadline: item.deadline || item.tanggal,
            status: item.status || 'Ditugaskan',
            progress: item.status === 'Selesai' ? 100 : (item.progress || 40),
            keterangan: item.output || item.keterangan || '-'
        });
    });

    // 3. Protokoler
    (db.protokoler || []).forEach((item, idx) => {
        safePush({
            id: `proto_${item.id || idx}`,
            source: 'protokoler',
            jenis: 'Protokoler',
            rubrikasi: item.rubrikasi || 'Protokoler',
            judul: item.kegiatan + (item.pejabat ? ` (${item.pejabat})` : ''),
            petugas: item.petugas || '-',
            tanggal: item.tanggal,
            deadline: item.tanggal,
            status: item.status || 'Ditugaskan',
            progress: item.status === 'Selesai' ? 100 : 50,
            keterangan: (item.tempat ? `Tempat: ${item.tempat} | ` : '') + (item.catatan || '-')
        });
    });

    // 4. MC (Master of Ceremony)
    (db.mc || []).forEach((item, idx) => {
        safePush({
            id: `mc_${item.id || idx}`,
            source: 'mc',
            jenis: 'MC',
            rubrikasi: item.rubrikasi || 'MC',
            judul: item.kegiatan || 'Pemandu Acara (MC)',
            petugas: item.petugas || '-',
            tanggal: item.tanggal,
            deadline: item.tanggal,
            status: item.status || 'Ditugaskan',
            progress: item.status === 'Selesai' ? 100 : 50,
            keterangan: (item.lokasi ? `Lokasi: ${item.lokasi} | ` : '') + (item.keterangan || '-')
        });
    });

    // 5. Content Planner (Mencegah double counting jika sudah disinkronisasi ke Rekap Rutin)
    (db.contentPlanner || []).forEach((item, idx) => {
        const isAlreadyInRutin = (db.rekapRutin || []).some(r => 
            (r.linked_source === 'content_planner' && Number(r.linked_id) === Number(item.id)) ||
            (r.content_planner_id && Number(r.content_planner_id) === Number(item.id))
        );
        if (isAlreadyInRutin) return;

        safePush({
            id: `planner_${item.id || idx}`,
            source: 'content_planner',
            jenis: 'Content Planner',
            rubrikasi: item.rubrikasi || (typeof inferRubrikFromContent === 'function' ? inferRubrikFromContent(item) : 'KLIK'),
            judul: item.judul || item.tema || 'Desain & Publikasi Konten Medsos',
            petugas: item['assign To'] || item.assignTo || item.assignedTo || item.pic || item.petugas || '-',
            tanggal: item.jadwal || item.tanggal_posting,
            deadline: item.jadwal || item.tanggal_posting,
            status: item.status || 'Draft',
            progress: item.progres !== undefined ? Number(item.progres) : (['Posted', 'Done'].includes(item.status) ? 100 : 25),
            keterangan: `${item.jenis_konten || item.postType || 'Carousel'} • ${item.media || item.media_post || 'Instagram'}`
        });
    });

    // 6. Assignment Tim
    (db.assignments || []).forEach((item, idx) => {
        const assignLow = String(item.tugas || '').toLowerCase();
        const assignRubrik = item.rubrikasi || (assignLow.includes('se2026') ? '#SE2026' : (assignLow.includes('dtsen') ? '#DTSEN' : 'Penugasan Tim'));
        safePush({
            id: `assign_${item.id || idx}`,
            source: 'assignments',
            jenis: 'Assignment',
            rubrikasi: assignRubrik,
            judul: item.tugas || 'Penugasan Khusus Anggota',
            petugas: item.assigned_to || item.petugas || '-',
            tanggal: item.tanggal || item.tanggal_penugasan || item.deadline,
            deadline: item.deadline || item.tanggal,
            status: item.status || 'Belum Mulai',
            progress: item.progres !== undefined ? Number(item.progres) : (item.status === 'Selesai' ? 100 : 0),
            keterangan: (item.prioritas ? `[${item.prioritas}] ` : '') + (item.deskripsi || '-')
        });
    });

    // 7. BRS Rilis (Pecah per sub-penugasan spesifik PIC)
    (db.brsRilis || []).forEach((item, idx) => {
        const tgl = item.tanggal_rilis || item.jadwal || item.tanggal;
        let emitted = false;

        if (item.pic_poster_info && item.pic_poster_info.trim() !== '-') {
            safePush({
                id: `brs_poster_${item.id || idx}`,
                source: 'brs_rilis',
                jenis: 'BRS Rilis',
                rubrikasi: item.rubrikasi || '#rilisbrs',
                judul: `BRS: ${item.judul || 'Rilis Berita Resmi Statistik'} (Desain Poster & Infografis)`,
                petugas: item.pic_poster_info,
                tanggal: tgl,
                deadline: tgl,
                status: item.status || 'Siap Rilis',
                progress: ['Selesai', 'Rilis', 'Sudah'].includes(item.status) ? 100 : 60,
                keterangan: 'Penyusunan infografis & visual rilis BRS'
            });
            emitted = true;
        }

        if (item.pic_doc_ruang && item.pic_doc_ruang.trim() !== '-') {
            safePush({
                id: `brs_doc_${item.id || idx}`,
                source: 'brs_rilis',
                jenis: 'BRS Rilis',
                rubrikasi: item.rubrikasi || '#rilisbrs',
                judul: `BRS: ${item.judul || 'Rilis Berita Resmi Statistik'} (Dokumentasi Ruangan)`,
                petugas: item.pic_doc_ruang,
                tanggal: tgl,
                deadline: tgl,
                status: item.status || 'Siap Rilis',
                progress: ['Selesai', 'Rilis', 'Sudah'].includes(item.status) ? 100 : 60,
                keterangan: 'Dokumentasi fotografi & liputan media ruang Vicon'
            });
            emitted = true;
        }

        if (item.pic_doc_yt_zoom && item.pic_doc_yt_zoom.trim() !== '-') {
            safePush({
                id: `brs_yt_${item.id || idx}`,
                source: 'brs_rilis',
                jenis: 'BRS Rilis',
                rubrikasi: item.rubrikasi || '#rilisbrs',
                judul: `BRS: ${item.judul || 'Rilis Berita Resmi Statistik'} (Streaming YouTube/Zoom)`,
                petugas: item.pic_doc_yt_zoom,
                tanggal: tgl,
                deadline: tgl,
                status: item.status || 'Siap Rilis',
                progress: ['Selesai', 'Rilis', 'Sudah'].includes(item.status) ? 100 : 60,
                keterangan: 'Broadcasting live streaming YouTube & kontrol ruang Zoom'
            });
            emitted = true;
        }

        if (!emitted) {
            safePush({
                id: `brs_${item.id || idx}`,
                source: 'brs_rilis',
                jenis: 'BRS Rilis',
                rubrikasi: item.rubrikasi || '#rilisbrs',
                judul: `BRS: ${item.judul || 'Rilis Berita Resmi Statistik'}`,
                petugas: item.petugas || item.pic || '-',
                tanggal: tgl,
                deadline: tgl,
                status: item.status || 'Siap Rilis',
                progress: ['Selesai', 'Rilis', 'Sudah'].includes(item.status) ? 100 : 50,
                keterangan: item.kategori || 'Rilis Resmi BPS Kalbar'
            });
        }
    });

    // 8. Hari Besar
    (db.hariBesar || []).forEach((item, idx) => {
        safePush({
            id: `hb_${item.id || idx}`,
            source: 'hari_besar',
            jenis: 'Hari Besar',
            rubrikasi: item.rubrikasi || '#haribesar/daerah/nasional/internasional',
            judul: item.kegiatan || item.peringatan || item.judul || 'Peringatan Hari Besar',
            petugas: item.pembuat_konten || item.pic || item.petugas || '-',
            tanggal: item.tanggal,
            deadline: item.tanggal,
            status: item.status || 'Draft',
            progress: ['Selesai', 'Tayang', 'Sudah'].includes(item.status) ? 100 : 40,
            keterangan: item.media || 'Instagram Story / Feed'
        });
    });

    // 9. Layanan Humas (Tickets)
    (db.tickets || []).forEach((item, idx) => {
        safePush({
            id: `ticket_${item.id || idx}`,
            source: 'tickets',
            jenis: 'Layanan Humas',
            rubrikasi: item.rubrikasi || 'Layanan Humas',
            judul: item.judul || item.layanan || 'Permohonan Layanan Kehumasan',
            petugas: item.pic || item.petugas || '-',
            tanggal: item.tanggal,
            deadline: item.deadline || item.tanggal,
            status: item.status || 'Pending',
            progress: item.status === 'Selesai' ? 100 : (item.status === 'Approved' ? 50 : 20),
            keterangan: item.pengaju ? `Pemohon: ${item.pengaju} (${item.bidang || 'Internal'})` : '-'
        });
    });

    // 10. Rekap Kegiatan bawaan (jika ada data)
    (db.rekapKegiatan || []).forEach((item, idx) => {
        safePush({
            id: `rekap_${item.id || idx}`,
            source: 'rekap_kegiatan',
            jenis: item.jenis || 'Kegiatan',
            rubrikasi: item.rubrikasi || item.jenis || 'Laporan',
            judul: item.kegiatan || item.judul || 'Kegiatan Humas',
            petugas: item.petugas || item.pic || '-',
            tanggal: item.tanggal,
            deadline: item.deadline || item.tanggal,
            status: item.status || 'Selesai',
            progress: item.status === 'Selesai' ? 100 : 50,
            keterangan: item.keterangan || '-'
        });
    });

    // Hubungkan seluruh tugas dengan personil canonical BPS Kalbar (Eksklusif sheet team)
    const allMembersList = getAllTeamMembersList(tasks);
    tasks.forEach(t => {
        t.canonicalMember = resolveMemberFromPic(t.petugas, allMembersList);
        t.petugasCanonicalName = t.canonicalMember ? t.canonicalMember.rawName : t.petugas;
    });

    return tasks;
}

/**
 * Filter list tugas terintegrasi berdasarkan konfigurasi filter aktif
 */
function filterIntegratedTasks(tasks, filter) {
    return tasks.filter(task => {
        // 1. Filter Tahun
        if (filter.year !== 'all') {
            const filterYr = Number(filter.year);
            const taskYr = task.parsedDate ? task.parsedDate.getFullYear() : (task.parsedDeadline ? task.parsedDeadline.getFullYear() : 2026);
            if (taskYr !== filterYr) return false;
        }

        // 2. Filter Bulan
        if (filter.month !== 'all') {
            const filterMo = Number(filter.month);
            const taskMo = task.parsedDate ? task.parsedDate.getMonth() : (task.parsedDeadline ? task.parsedDeadline.getMonth() : null);
            if (taskMo === null || taskMo !== filterMo) return false;
        }

        // 3. Filter Jenis Tugas
        if (filter.type !== 'all' && String(task.jenis || '').toLowerCase() !== String(filter.type).toLowerCase()) {
            return false;
        }

        // 4. Filter Status
        if (filter.status !== 'all') {
            if (filter.status === 'selesai' && !task.isDone) return false;
            if (filter.status === 'belum' && task.isDone) return false;
            if (filter.status === 'terlambat' && !task.isTerlambat) return false;
            if (filter.status === 'mendekati' && !task.isMendekati) return false;
        }

        // 5. Filter Nama Anggota
        if (filter.member !== 'all') {
            if (task.canonicalMember && task.canonicalMember.normKey === filter.member) {
                // matched canonical
            } else {
                const targetMember = { normKey: filter.member, rawName: filter.member };
                if (!isTaskAssignedToMember(task, targetMember)) return false;
            }
        }

        // 6. Pencarian Teks
        if (filter.search && filter.search.trim()) {
            const q = filter.search.toLowerCase().trim();
            const dateStr = task.tanggal || task.jadwal || task.deadline || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            const matchJudul = (task.judul || '').toLowerCase().includes(q);
            const matchPetugas = (task.petugas || '').toLowerCase().includes(q);
            const matchCanonical = (task.petugasCanonicalName || '').toLowerCase().includes(q) || (task.canonicalMember && (task.canonicalMember.normKey.includes(q) || task.canonicalMember.cleanName.includes(q)));
            const matchJenis = (task.jenis || '').toLowerCase().includes(q);
            const matchKet = (task.keterangan || '').toLowerCase().includes(q);
            const matchDate = (dateStr && String(dateStr).toLowerCase().includes(q)) ||
                              (dateFormatted && dateFormatted.toLowerCase().includes(q)) ||
                              (dateInput && dateInput.toLowerCase().includes(q));
            if (!matchJudul && !matchPetugas && !matchCanonical && !matchJenis && !matchKet && !matchDate) return false;
        }

        return true;
    });
}

/**
 * Daftar Rubrikasi Tugas Resmi yang tersedia pada sistem Tim Humas BPS Kalbar
 * Rubrikasi baru #SE2026 dan #DTSEN ditambahkan sebagai kategori tersendiri
 */
const REKAP_RUBRIKASI_LIST = [
    { key: '#SE2026', label: '#SE2026', shortLabel: '#SE2026', tagClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' },
    { key: '#DTSEN', label: '#DTSEN', shortLabel: '#DTSEN', tagClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-700' },
    { key: '#haribesar/daerah/nasional/internasional', label: '#haribesar/daerah/nasional/internasional', shortLabel: '#HariBesar', tagClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
    { key: '#rilisbrs', label: '#rilisbrs', shortLabel: '#RilisBRS', tagClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
    { key: '#infografisbrs', label: '#infografisbrs', shortLabel: '#InfografisBRS', tagClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700' },
    { key: '#rilispublikasi', label: '#rilispublikasi', shortLabel: '#RilisPublikasi', tagClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700' },
    { key: '#SElasaSEnsus', label: '#SElasaSEnsus', shortLabel: '#SElasaSEnsus', tagClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-700' },
    { key: '#promosistatistik', label: '#promosistatistik', shortLabel: '#PromosiStatistik', tagClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700' },
    { key: '#rripontianak', label: '#rripontianak', shortLabel: '#RRIPontianak', tagClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-700' },
    { key: '#zonaintegritas', label: '#zonaintegritas', shortLabel: '#ZonaIntegritas', tagClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600' },
    { key: '#SKD', label: '#SKD', shortLabel: '#SKD', tagClass: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-300 dark:border-pink-700' },
    { key: '#ddakalbar', label: '#ddakalbar', shortLabel: '#DDAKalbar', tagClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-300 dark:border-violet-700' },
    { key: 'KLIK', label: 'KLIK', shortLabel: 'KLIK', tagClass: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300 border-lime-300 dark:border-lime-700' },
    { key: 'Laporan', label: 'Laporan', shortLabel: 'Laporan', tagClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700' },
    { key: 'Protokoler', label: 'Protokoler', shortLabel: 'Protokoler', tagClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
    { key: 'MC', label: 'MC', shortLabel: 'MC', tagClass: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-700' },
    { key: 'Ad Hoc', label: 'Ad Hoc', shortLabel: 'Ad Hoc', tagClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600' },
    { key: 'Layanan Humas', label: 'Layanan Humas', shortLabel: 'Layanan Humas', tagClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' },
    { key: 'Lainnya', label: 'Lainnya', shortLabel: 'Lainnya', tagClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
];

/**
 * Mendapatkan seluruh kunci rubrikasi tugas dari sebuah task terintegrasi (Mendukung Multiple Select)
 * Mengembalikan array kunci resmi dari REKAP_RUBRIKASI_LIST
 */
function getTaskRubrikasiKeys(task) {
    if (!task) return ['Lainnya'];
    const matchedKeys = new Set();

    // 1. Cek nilai eksplisit properti task.rubrikasi (bisa dipisahkan koma atau titik-koma)
    const rawRubrik = task.rubrikasi;
    if (rawRubrik) {
        const parts = Array.isArray(rawRubrik)
            ? rawRubrik.map(s => String(s).trim()).filter(Boolean)
            : String(rawRubrik).split(/[,;]+/).map(s => s.trim()).filter(Boolean);

        parts.forEach(part => {
            const pLow = part.toLowerCase();
            // Cek apakah ada exact match pada REKAP_RUBRIKASI_LIST
            const exact = REKAP_RUBRIKASI_LIST.find(r => r.key.toLowerCase() === pLow);
            if (exact) {
                matchedKeys.add(exact.key);
                return;
            }
            if (pLow.includes('se2026') || pLow.includes('se 2026') || pLow.includes('sensus ekonomi 2026')) {
                matchedKeys.add('#SE2026');
            } else if (pLow.includes('dtsen') || pLow.includes('dts en')) {
                matchedKeys.add('#DTSEN');
            } else if (pLow.includes('haribesar') || pLow.includes('hari besar')) {
                matchedKeys.add('#haribesar/daerah/nasional/internasional');
            } else if (pLow.includes('infografisbrs') || pLow.includes('infografis brs')) {
                matchedKeys.add('#infografisbrs');
            } else if (pLow.includes('rilisbrs') || pLow.includes('rilis brs')) {
                matchedKeys.add('#rilisbrs');
            } else if (pLow.includes('rilispublikasi') || pLow.includes('rilis publikasi')) {
                matchedKeys.add('#rilispublikasi');
            } else if (pLow.includes('selasasensus')) {
                matchedKeys.add('#SElasaSEnsus');
            } else if (pLow.includes('promosistatistik')) {
                matchedKeys.add('#promosistatistik');
            } else if (pLow.includes('rripontianak') || pLow.includes('rri pontianak')) {
                matchedKeys.add('#rripontianak');
            } else if (pLow.includes('zonaintegritas') || pLow.includes('zona integritas')) {
                matchedKeys.add('#zonaintegritas');
            } else if (pLow.includes('skd')) {
                matchedKeys.add('#SKD');
            } else if (pLow.includes('ddakalbar') || pLow.includes('dda kalbar')) {
                matchedKeys.add('#ddakalbar');
            } else if (pLow.includes('klik')) {
                matchedKeys.add('KLIK');
            } else if (pLow.includes('laporan')) {
                matchedKeys.add('Laporan');
            } else if (pLow.includes('protokol')) {
                matchedKeys.add('Protokoler');
            } else if (pLow.includes('mc') || pLow.includes('master of ceremony')) {
                matchedKeys.add('MC');
            } else if (pLow.includes('ad hoc') || pLow.includes('adhoc')) {
                matchedKeys.add('Ad Hoc');
            } else if (pLow.includes('layanan')) {
                matchedKeys.add('Layanan Humas');
            } else {
                matchedKeys.add(part);
            }
        });
    }

    // 2. Cek apakah ada hashtag/kata kunci eksplisit #SE2026 atau #DTSEN di judul/keterangan
    const textAll = `${task.judul || ''} ${task.keterangan || ''}`.toLowerCase();
    if (textAll.includes('#se2026') || textAll.includes('se2026') || textAll.includes('se 2026') || textAll.includes('sensus ekonomi 2026')) {
        matchedKeys.add('#SE2026');
    }
    if (textAll.includes('#dtsen') || textAll.includes('dts en') || textAll.includes('#dts_en')) {
        matchedKeys.add('#DTSEN');
    }

    // 3. Fallback jika belum ada yang cocok: periksa jenis penugasan
    if (matchedKeys.size === 0) {
        const j = (task.jenis || '').trim();
        if (j === 'Protokoler') matchedKeys.add('Protokoler');
        else if (j === 'MC') matchedKeys.add('MC');
        else if (j === 'Ad Hoc') matchedKeys.add('Ad Hoc');
        else if (j === 'Layanan Humas') matchedKeys.add('Layanan Humas');
        else if (j === 'BRS Rilis') matchedKeys.add('#rilisbrs');
        else if (j === 'Hari Besar') matchedKeys.add('#haribesar/daerah/nasional/internasional');
    }

    // 4. Inferensi jika bersumber dari content planner
    if (matchedKeys.size === 0 && typeof inferRubrikFromContent === 'function') {
        const inf = inferRubrikFromContent(task.judul || '', task.keterangan || '');
        if (inf && inf !== 'Humas') {
            if (inf.includes('haribesar')) matchedKeys.add('#haribesar/daerah/nasional/internasional');
            else if (inf.includes('infografisbrs')) matchedKeys.add('#infografisbrs');
            else if (inf.includes('rilisbrs')) matchedKeys.add('#rilisbrs');
            else if (inf.includes('rilispublikasi')) matchedKeys.add('#rilispublikasi');
            else if (inf.includes('SElasaSEnsus')) matchedKeys.add('#SElasaSEnsus');
            else if (inf.includes('promosistatistik')) matchedKeys.add('#promosistatistik');
            else if (inf.includes('rripontianak')) matchedKeys.add('#rripontianak');
            else if (inf.includes('zonaintegritas')) matchedKeys.add('#zonaintegritas');
            else if (inf.includes('SKD')) matchedKeys.add('#SKD');
            else if (inf.includes('ddakalbar')) matchedKeys.add('#ddakalbar');
            else if (inf.includes('KLIK')) matchedKeys.add('KLIK');
            else if (inf.includes('Laporan')) matchedKeys.add('Laporan');
            else if (inf.includes('#SE2026')) matchedKeys.add('#SE2026');
            else if (inf.includes('#DTSEN')) matchedKeys.add('#DTSEN');
        }
    }

    const result = Array.from(matchedKeys);
    return result.length > 0 ? result : ['Lainnya'];
}

/**
 * Mendapatkan representasi string rubrikasi tugas (kompatibel ke belakang)
 */
function getTaskRubrikasiKey(task) {
    if (!task) return 'Lainnya';
    const keys = getTaskRubrikasiKeys(task);
    return keys.join(', ');
}

/**
 * Helper untuk merender kartu tugas rincian yang 100% responsif pada layar mobile & tablet
 * Tanpa perlu scroll horizontal atau teks terpotong
 */
function renderTaskMobileCardItem(task, tIdx, showPic = true) {
    return `
        <div class="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs space-y-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between">
            <!-- Baris 1: No, Badge Kategori, Status & SLA Status -->
            <div class="flex flex-wrap items-center justify-between gap-1.5">
                <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        #${tIdx + 1}
                    </span>
                    <span class="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        ${task.jenis}
                    </span>
                    <span class="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${task.isDone ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}">
                        <i class="fa-solid ${task.isDone ? 'fa-check' : 'fa-clock'} mr-1 text-[8px]"></i>${task.status}
                    </span>
                </div>
                <span class="px-2.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${task.slaClass} flex items-center gap-1 shrink-0">
                    <i class="fa-solid ${task.isDone ? 'fa-circle-check' : (task.isTerlambat ? 'fa-triangle-exclamation' : (task.isMendekati ? 'fa-bell' : 'fa-shield-halved'))} text-[8px]"></i>
                    <span>${task.slaStatus}</span>
                </span>
            </div>

            <!-- Baris 2: Judul / Uraian Tugas & Keterangan Lengkap (Tanpa Terpotong) -->
            <div class="space-y-1.5">
                <h4 class="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug break-words">
                    ${task.judul}
                </h4>
                ${task.keterangan && task.keterangan !== '-' ? `
                    <div class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed break-words bg-slate-50 dark:bg-slate-900/60 p-2 sm:p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex items-start gap-1.5">
                        <i class="fa-regular fa-note-sticky text-slate-400 text-[10px] mt-0.5 shrink-0"></i>
                        <span class="flex-1">${task.keterangan}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Baris 3: PIC, Tanggal Pelaksanaan & SLA / Tenggat (Responsive Grid, Rapi & Lengkap) -->
            <div class="pt-2 border-t border-slate-150 dark:border-slate-700/80 space-y-2">
                <!-- Baris PIC -->
                ${showPic ? `
                    <div class="flex items-center gap-2 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-150 dark:border-slate-700/60">
                        <div class="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                            <i class="fa-solid fa-user text-[9px]"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <span class="block text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400">PIC / Petugas</span>
                            <span class="font-bold text-xs text-slate-800 dark:text-slate-200 break-words leading-tight">
                                ${task.petugasCanonicalName || task.petugas}
                            </span>
                            ${task.petugas && task.petugasCanonicalName && task.petugas !== task.petugasCanonicalName ? `
                                <span class="text-[9.5px] text-slate-400 font-medium block">(${task.petugas})</span>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- 2 Kolom Jadwal: Tanggal Pelaksanaan & SLA / Tenggat -->
                <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="bg-slate-50/80 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-150 dark:border-slate-700/50">
                        <span class="block text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
                            <i class="fa-regular fa-calendar mr-1 text-[9px]"></i>Pelaksanaan
                        </span>
                        <span class="font-bold text-slate-800 dark:text-slate-200 break-words leading-tight block text-[11px]">
                            ${formatDateWIB(task.tanggal)}
                        </span>
                    </div>
                    <div class="p-2 rounded-lg border ${task.isTerlambat ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40' : (task.isMendekati ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40' : 'bg-slate-50/80 border-slate-150 dark:bg-slate-900/30 dark:border-slate-700/50')}">
                        <span class="block text-[8.5px] font-extrabold uppercase tracking-wider ${task.isTerlambat ? 'text-rose-500 font-black' : (task.isMendekati ? 'text-amber-500 font-black' : 'text-slate-400')} mb-0.5">
                            <i class="fa-regular fa-clock mr-1 text-[9px]"></i>SLA / Tenggat
                        </span>
                        <span class="font-bold ${task.isTerlambat ? 'text-rose-700 dark:text-rose-300' : (task.isMendekati ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200')} break-words leading-tight block text-[11px]">
                            ${formatDateWIB(task.deadline)}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Baris 4: Progres Pengerjaan -->
            <div class="pt-1">
                <div class="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>Progres Penyelesaian</span>
                    <span class="${task.isDone ? 'text-emerald-600 font-black' : 'text-slate-700 dark:text-slate-200'}">${task.progress}%</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div class="h-2 rounded-full ${task.isDone ? 'bg-emerald-500' : 'bg-indigo-600'} transition-all duration-300" style="width: ${task.progress}%"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle Dropdown Export di Mobile & Tablet (Touch Friendly)
 */
window.toggleRekapDropdown = function(type, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const target = document.getElementById(`rekap-dropdown-${type}`);
    const other = type === 'excel' ? document.getElementById('rekap-dropdown-pdf') : document.getElementById('rekap-dropdown-excel');
    if (other) other.classList.add('hidden');
    if (target) target.classList.toggle('hidden');
};

// Global click listener untuk menutup dropdown export jika tap di luar
if (!window._rekapDropdownListenerAttached) {
    window._rekapDropdownListenerAttached = true;
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#btn-rekap-excel-wrap') && !e.target.closest('#btn-rekap-pdf-wrap')) {
            const d1 = document.getElementById('rekap-dropdown-excel');
            const d2 = document.getElementById('rekap-dropdown-pdf');
            if (d1) d1.classList.add('hidden');
            if (d2) d2.classList.add('hidden');
        }
    });
}

/**
 * Mencari personil Tim Humas yang sesuai dengan akun pengguna yang sedang login
 */
function getLoggedInTeamMember(allMembers = [], user = currentUser) {
    if (!user) return null;
    const rawUserName = String(user.name || user.username || '').trim();
    const cleanUser = cleanAcademicDegrees(rawUserName);
    const uRole = user.role || 'tim';

    // 1. Direct match on normKey or cleanName
    let found = allMembers.find(m => m.normKey === cleanUser || m.cleanName === cleanUser);
    if (found) return found;

    // 2. Resolve via resolveMemberFromPic
    found = resolveMemberFromPic(user.name, allMembers) || resolveMemberFromPic(user.username, allMembers);
    if (found) return found;

    // 3. Username match
    if (user.username) {
        const uNameNorm = cleanAcademicDegrees(user.username);
        found = allMembers.find(m => m.normKey === uNameNorm || (m.email && m.email.toLowerCase().includes(user.username.toLowerCase())));
        if (found) return found;
    }

    // 4. Token overlap match (e.g. "Rina" in "Rina Marlina")
    const userTokens = cleanUser.split(' ').filter(w => w.length >= 3);
    if (userTokens.length > 0) {
        found = allMembers.find(m => {
            const mTokens = m.normKey.split(' ').filter(w => w.length >= 3);
            return userTokens.some(ut => mTokens.includes(ut));
        });
        if (found) return found;
    }

    // 5. Fallback: buat objek personil canonical untuk akun ini jika belum ada di direktori
    return {
        rawName: user.name || 'Anggota Tim Humas',
        cleanName: cleanUser || 'tim',
        normKey: cleanUser || 'tim',
        jabatan: user.jabatan || 'Staf Kehumasan',
        bidang: user.bidang || 'Humas & IPDS',
        email: user.email || `${(user.username || 'tim')}@bps.go.id`,
        role: uRole
    };
}

/**
 * Memeriksa apakah tugas teratribusi ke akun anggota tim yang sedang login
 */
function isTaskAssignedToLoggedInUser(task, user = currentUser, member = null) {
    if (!user) return false;
    if (isTaskForCurrentUser(task)) return true;
    if (member && isTaskAssignedToMember(task, member)) return true;
    if (task.canonicalMember && member && task.canonicalMember.normKey === member.normKey) return true;
    return false;
}

/**
 * Memeriksa apakah nama anggota tim cocok dengan kata kunci pencarian
 */
function isMemberMatchingSearch(member, query) {
    if (!member || !query) return false;
    const q = query.trim().toLowerCase();
    const qClean = cleanAcademicDegrees(q);
    const mRaw = (member.rawName || '').toLowerCase();
    const mClean = (member.cleanName || '').toLowerCase();
    const mNorm = (member.normKey || '').toLowerCase();

    if (mRaw.includes(q) || mClean.includes(q) || mNorm.includes(q)) return true;
    if (qClean && (mClean.includes(qClean) || mNorm.includes(qClean))) return true;

    // Cek alias BPS Humas Kalbar
    const alias = BPS_HUMAS_ALIASES[qClean];
    if (alias && (mClean.includes(alias) || mNorm.includes(alias))) return true;

    // Cek token kata (minimal 2 karakter)
    const qTokens = (qClean || q).split(' ').filter(w => w.length >= 2);
    if (qTokens.length > 0) {
        const mTokens = mNorm.split(' ').filter(w => w.length >= 2);
        if (qTokens.some(qt => mTokens.some(mt => mt.includes(qt)))) return true;
    }

    return false;
}

/**
 * Merender Tabel Rekapitulasi Tugas Berdasarkan Kategori Pegawai dan Rubrikasi
 * Sesuai ketentuan:
 * 1. Filter eksklusif dari sheet team
 * 2. Kelompok terpisah: Humas & Protokoler berdasarkan kolom C (Jabatan)
 * 3. Rubrikasi lengkap sistem dengan rubrikasi baru #SE2026 sebagai kategori tersendiri
 */
function renderRubrikasiCategorySection(catTitle, catIcon, badgeBg, members, allTasks, rubrikList) {
    if (!members || members.length === 0) {
        return `
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-6 text-center text-slate-400">
                <i class="fa-solid fa-users text-2xl mb-1 text-slate-300 dark:text-slate-600"></i>
                <p class="text-xs font-bold text-slate-600 dark:text-slate-400">Tidak ada pegawai ${catTitle} yang sesuai dengan kriteria filter.</p>
            </div>
        `;
    }

    // Hitung data per pegawai
    const rows = members.map((m, idx) => {
        const mTasks = allTasks.filter(t => isTaskAssignedToMember(t, m));
        const rubCounts = {};
        rubrikList.forEach(r => { rubCounts[r.key] = 0; });
        mTasks.forEach(t => {
            const keys = typeof getTaskRubrikasiKeys === 'function' ? getTaskRubrikasiKeys(t) : [getTaskRubrikasiKey(t)];
            keys.forEach(k => {
                rubCounts[k] = (rubCounts[k] || 0) + 1;
            });
        });
        const mTot = mTasks.length;
        const mDone = mTasks.filter(t => t.isDone).length;
        const mRate = mTot > 0 ? Math.round((mDone / mTot) * 100) : 0;
        return {
            idx: idx + 1,
            member: m,
            tasks: mTasks,
            rubCounts,
            total: mTot,
            done: mDone,
            rate: mRate
        };
    });

    // Total per kolom rubrikasi untuk kelompok ini
    const colTotals = {};
    rubrikList.forEach(r => {
        colTotals[r.key] = rows.reduce((acc, rData) => acc + (rData.rubCounts[r.key] || 0), 0);
    });
    const groupTotalTasks = rows.reduce((acc, rData) => acc + rData.total, 0);
    const groupTotalDone = rows.reduce((acc, rData) => acc + rData.done, 0);
    const groupRate = groupTotalTasks > 0 ? Math.round((groupTotalDone / groupTotalTasks) * 100) : 0;

    return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <!-- Header Kategori -->
            <div class="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${badgeBg} flex items-center justify-center shrink-0 shadow-xs">
                        <i class="fa-solid ${catIcon} text-base"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">${catTitle}</h3>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                ${members.length} Pegawai
                            </span>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Sumber Pegawai: Sheet <code>team</code> (Kolom C: Jabatan)
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div class="flex items-center gap-1.5 text-xs">
                        <span class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 text-[11px]">
                            Total Tugas: <strong class="text-indigo-600 dark:text-indigo-400">${groupTotalTasks}</strong>
                        </span>
                        <span class="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                            Selesai: <strong>${groupTotalDone} (${groupRate}%)</strong>
                        </span>
                    </div>
                </div>
            </div>

            <!-- TABEL REKAPITULASI RUBRIKASI TUGAS (DESKTOP & HORIZONTAL SCROLL) -->
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left text-xs whitespace-nowrap border-collapse">
                    <thead class="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        <tr>
                            <th class="py-3 px-3 text-center sticky left-0 bg-slate-100 dark:bg-slate-900 z-10 w-12 border-r border-slate-200 dark:border-slate-700">No</th>
                            <th class="py-3 px-4 sticky left-12 bg-slate-100 dark:bg-slate-900 z-10 min-w-[200px] border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Pegawai (Sheet Team)</th>
                            <th class="py-3 px-3 min-w-[150px]">Jabatan (Kolom C)</th>
                            ${rubrikList.map(r => `
                                <th class="py-3 px-2.5 text-center min-w-[90px] ${r.key === '#SE2026' ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-extrabold border-x border-emerald-200 dark:border-emerald-800' : (r.key === '#DTSEN' ? 'bg-teal-50/80 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-extrabold border-x border-teal-200 dark:border-teal-800' : '')}" title="${r.label}">
                                    <span class="truncate block max-w-[110px] mx-auto">${r.shortLabel}</span>
                                </th>
                            `).join('')}
                            <th class="py-3 px-3 text-center min-w-[85px] bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 font-extrabold">Total</th>
                            <th class="py-3 px-3 text-center min-w-[85px] bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-extrabold">Selesai</th>
                            <th class="py-3 px-3 text-center min-w-[85px] bg-sky-50/60 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 font-extrabold">Capaian</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-150 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                        ${rows.map(r => `
                            <tr class="hover:bg-indigo-50/40 dark:hover:bg-slate-700/40 transition-colors">
                                <td class="py-2.5 px-3 text-center font-bold text-slate-400 sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-10">${r.idx}</td>
                                <td class="py-2.5 px-4 font-bold text-slate-900 dark:text-white sticky left-12 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <div class="truncate max-w-[220px]" title="${r.member.rawName}">${r.member.rawName}</div>
                                    <div class="text-[10px] font-normal text-slate-400">${r.member.bidang || '-'}</div>
                                </td>
                                <td class="py-2.5 px-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                    <div class="truncate max-w-[160px]" title="${r.member.jabatan}">${r.member.jabatan || '-'}</div>
                                </td>
                                ${rubrikList.map(rub => {
                                    const val = r.rubCounts[rub.key] || 0;
                                    const isSE = rub.key === '#SE2026';
                                    const isDTSEN = rub.key === '#DTSEN';
                                    return `
                                        <td class="py-2.5 px-2.5 text-center text-xs ${isSE ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-x border-emerald-100 dark:border-emerald-900/50' : (isDTSEN ? 'bg-teal-50/30 dark:bg-teal-950/20 border-x border-teal-100 dark:border-teal-900/50' : '')}">
                                            ${val > 0 ? `
                                                <span class="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md text-[11px] font-black ${rub.tagClass} border shadow-2xs">
                                                    ${val}
                                                </span>
                                            ` : `
                                                <span class="text-slate-300 dark:text-slate-600 font-normal">-</span>
                                            `}
                                        </td>
                                    `;
                                }).join('')}
                                <td class="py-2.5 px-3 text-center font-black text-xs bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                                    ${r.total}
                                </td>
                                <td class="py-2.5 px-3 text-center font-black text-xs bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                                    ${r.done}
                                </td>
                                <td class="py-2.5 px-3 text-center font-black text-xs bg-sky-50/40 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300">
                                    ${r.rate}%
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600 font-black text-xs text-slate-800 dark:text-slate-100">
                        <tr>
                            <td class="py-3 px-3 text-center sticky left-0 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-10">∑</td>
                            <td class="py-3 px-4 uppercase tracking-wider sticky left-12 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                TOTAL ${catTitle.toUpperCase()}
                            </td>
                            <td class="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400 font-bold">${members.length} Pegawai</td>
                            ${rubrikList.map(rub => {
                                const tot = colTotals[rub.key] || 0;
                                const isSE = rub.key === '#SE2026';
                                const isDTSEN = rub.key === '#DTSEN';
                                return `
                                    <td class="py-3 px-2.5 text-center ${isSE ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-x border-emerald-300 dark:border-emerald-800' : (isDTSEN ? 'bg-teal-100/70 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 border-x border-teal-300 dark:border-teal-800' : '')}">
                                        ${tot > 0 ? `<span class="font-black text-xs ${isSE ? 'text-emerald-700 dark:text-emerald-300' : (isDTSEN ? 'text-teal-700 dark:text-teal-300' : 'text-slate-800 dark:text-slate-200')}">${tot}</span>` : '<span class="text-slate-400">-</span>'}
                                    </td>
                                `;
                            }).join('')}
                            <td class="py-3 px-3 text-center font-black text-xs bg-indigo-100/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200">${groupTotalTasks}</td>
                            <td class="py-3 px-3 text-center font-black text-xs bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200">${groupTotalDone}</td>
                            <td class="py-3 px-3 text-center font-black text-xs bg-sky-100/70 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200">${groupRate}%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- TAMPILAN MOBILE CARD RESPONSIVE UNTUK SMARTPHONE -->
            <div class="block xl:hidden p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 space-y-3">
                <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ringkasan Pegawai ${catTitle} (Mobile)</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${rows.map(r => {
                        const activeRubriks = rubrikList.filter(rub => (r.rubCounts[rub.key] || 0) > 0);
                        return `
                            <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="min-w-0">
                                        <h4 class="font-extrabold text-xs text-slate-900 dark:text-white truncate">${r.member.rawName}</h4>
                                        <p class="text-[10px] text-slate-500">${r.member.jabatan}</p>
                                    </div>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                        ${r.total} Tugas
                                    </span>
                                </div>
                                <div class="flex flex-wrap gap-1 pt-1 border-t border-slate-100 dark:border-slate-700/80">
                                    ${activeRubriks.length > 0 ? activeRubriks.map(rub => `
                                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${rub.tagClass} border flex items-center gap-1">
                                            <span>${rub.shortLabel}:</span>
                                            <strong class="font-black">${r.rubCounts[rub.key]}</strong>
                                        </span>
                                    `).join('') : `
                                        <span class="text-[10px] text-slate-400 italic">Belum ada tugas pada periode ini</span>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Tampilan Utama Modul SLA & Rekapitulasi Tugas (Responsive Mobile, Tab & Desktop)
 */
function renderRekapKegiatan(container) {
    if (!container) return;

    const allIntegratedTasks = getAllIntegratedTasks();
    const allMembers = getAllTeamMembersList(allIntegratedTasks);
    const filter = window.rekapKegiatanFilter;

    // Pastikan default filter valid
    if (!filter.kategori) filter.kategori = 'all';
    if (!filter.viewMode) filter.viewMode = 'rekap_rubrikasi';

    const isUserTim = currentUser && currentUser.role === 'tim';
    const loggedInMember = isUserTim ? getLoggedInTeamMember(allMembers, currentUser) : null;

    // 1. FILTER DATA PEGAWAI BERDASARKAN SHEET TEAM:
    // Pastikan seluruh data tugas dan nama pegawai bersumber secara eksklusif dari sheet team
    const validMemberNormKeys = new Set(allMembers.map(m => m.normKey));
    const teamScopedTasks = allIntegratedTasks.filter(t => t.canonicalMember && validMemberNormKeys.has(t.canonicalMember.normKey));

    // Scoping data: Pada role tim, hanya tampilkan data sesuai dengan akun anggota tim humas tersebut yang login
    const scopedTasks = isUserTim
        ? teamScopedTasks.filter(t => isTaskAssignedToLoggedInUser(t, currentUser, loggedInMember))
        : teamScopedTasks;

    const scopedMembers = isUserTim
        ? (loggedInMember ? [loggedInMember] : [])
        : allMembers;

    // 2. PENGELOMPOKAN PEGAWAI MENJADI DUA KATEGORI BERDASARKAN KOLOM C (JABATAN):
    // - Humas
    // - Protokoler
    const humasMembers = scopedMembers.filter(m => m.kategori !== 'Protokoler');
    const protokolerMembers = scopedMembers.filter(m => m.kategori === 'Protokoler');

    // Kunci filter member ke akun login untuk role tim
    if (isUserTim && loggedInMember) {
        filter.member = loggedInMember.normKey;
    }

    // Terapkan filter ke tugas
    let filteredTasks = filterIntegratedTasks(scopedTasks, filter);

    // Filter berdasarkan Kategori Pegawai jika dipilih
    if (filter.kategori && filter.kategori !== 'all') {
        filteredTasks = filteredTasks.filter(t => {
            const m = t.canonicalMember;
            return m && m.kategori === filter.kategori;
        });
    }

    // Hitung rekapitulasi statistik global (dari filteredTasks)
    const totalCount = filteredTasks.length;
    const selesaiCount = filteredTasks.filter(t => t.isDone).length;
    const belumCount = filteredTasks.filter(t => !t.isDone).length;
    const terlambatCount = filteredTasks.filter(t => t.isTerlambat).length;
    const mendekatiCount = filteredTasks.filter(t => t.isMendekati).length;
    const completionRate = totalCount > 0 ? Math.round((selesaiCount / totalCount) * 100) : 0;
    const slaRate = totalCount > 0 ? Math.round(((totalCount - terlambatCount) / totalCount) * 100) : 100;

    // Siapkan data per anggota (mengikuti filter jenis, status, bulan, tahun, search)
    const memberCardsData = scopedMembers.map(member => {
        const memberTasks = filteredTasks.filter(t => isTaskAssignedToMember(t, member));
        const mTotal = memberTasks.length;
        const mSelesai = memberTasks.filter(t => t.isDone).length;
        const mBelum = memberTasks.filter(t => !t.isDone).length;
        const mTerlambat = memberTasks.filter(t => t.isTerlambat).length;
        const mMendekati = memberTasks.filter(t => t.isMendekati).length;
        const mRate = mTotal > 0 ? Math.round((mSelesai / mTotal) * 100) : 0;

        return {
            member,
            tasks: memberTasks,
            total: mTotal,
            selesai: mSelesai,
            belum: mBelum,
            terlambat: mTerlambat,
            mendekati: mMendekati,
            rate: mRate
        };
    });

    // Jika filter personil dipilih, tampilkan hanya kartu anggota yang dipilih
    // Jika 'all', filter kategori jika ada
    let displayedMemberCards = filter.member === 'all'
        ? (filter.kategori === 'all' ? memberCardsData : memberCardsData.filter(mc => mc.member.kategori === filter.kategori))
        : memberCardsData.filter(m => m.member.normKey === filter.member);

    // PENCARIAN PADA TAMPILAN PER ANGGOTA:
    // Jika disearch nama tertentu maka HANYA memunculkan folder nama personil tersebut saja
    const searchQ = (filter.search || '').trim().toLowerCase();
    if (searchQ) {
        const matchingMembersByName = scopedMembers.filter(m => isMemberMatchingSearch(m, searchQ));
        if (matchingMembersByName.length > 0) {
            // Pencarian nama anggota: HANYA tampilkan folder nama tersebut saja
            displayedMemberCards = displayedMemberCards.filter(mc => isMemberMatchingSearch(mc.member, searchQ));
        } else {
            // Pencarian kata kunci tugas/kegiatan: tampilkan hanya folder anggota yang memiliki tugas terkait
            displayedMemberCards = displayedMemberCards.filter(mc => mc.tasks.length > 0);
        }
    }

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const taskTypesList = [
        'Rutin', 'Ad Hoc', 'Protokoler', 'MC', 'Content Planner',
        'Assignment', 'BRS Rilis', 'Hari Besar', 'Layanan Humas'
    ];

    container.innerHTML = `
        <div class="space-y-4 sm:space-y-6 pb-12 animate-fade-in" id="rekap-kegiatan-root">
            <!-- Header Page (Responsive Mobile, Tab & Desktop) -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div>
                    <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            <i class="fa-solid fa-chart-line mr-1"></i> Rekapitulasi & SLA Terpadu
                        </span>
                        <span class="text-xs text-slate-400 hidden sm:inline">·</span>
                        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            ${filter.month === 'all' ? (filter.year === 'all' ? 'Semua Periode' : `Tahun ${filter.year}`) : `${monthNames[filter.month]} ${filter.year === 'all' ? '' : filter.year}`}
                        </span>
                    </div>
                    <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">SLA & Rekap Tugas Anggota Tim Humas</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        Sistem rekapitulasi seluruh tugas dan kegiatan anggota Tim Humas BPS Provinsi Kalimantan Barat dari seluruh modul kerja terintegrasi, dilengkapi pemantauan SLA, filter multi-dimensi, dan ekspor dokumen laporan kinerja resmi.
                    </p>
                </div>

                <!-- Export & Action Buttons (Responsive Touch & Grid Mobile) -->
                <div class="grid grid-cols-3 sm:flex items-center gap-2 w-full lg:w-auto shrink-0">
                    <!-- Dropdown Export Excel -->
                    <div class="relative group" id="btn-rekap-excel-wrap">
                        <button type="button" onclick="toggleRekapDropdown('excel', event)" class="btn-primary !bg-emerald-600 hover:!bg-emerald-700 w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold py-2.5 px-2.5 sm:px-3.5 rounded-xl shadow-xs transition-all cursor-pointer">
                            <i class="fa-solid fa-file-excel text-xs sm:text-sm"></i>
                            <span class="truncate">Excel</span>
                            <i class="fa-solid fa-chevron-down text-[9px] opacity-75"></i>
                        </button>
                        <div id="rekap-dropdown-excel" class="absolute left-0 sm:right-0 sm:left-auto mt-1 w-60 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 hidden group-hover:block z-30 animate-fade-in">
                            <button onclick="exportRekapToExcel('current'); toggleRekapDropdown('excel')" class="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                <i class="fa-regular fa-file-lines text-emerald-600"></i> Laporan Sesuai Filter Aktif
                            </button>
                            <button onclick="exportRekapToExcel('annual'); toggleRekapDropdown('excel')" class="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/60">
                                <i class="fa-solid fa-calendar-check text-emerald-600"></i> Laporan Tahunan Berjalan (2026)
                            </button>
                        </div>
                    </div>

                    <!-- Dropdown Export PDF -->
                    <div class="relative group" id="btn-rekap-pdf-wrap">
                        <button type="button" onclick="toggleRekapDropdown('pdf', event)" class="btn-primary !bg-rose-600 hover:!bg-rose-700 w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold py-2.5 px-2.5 sm:px-3.5 rounded-xl shadow-xs transition-all cursor-pointer">
                            <i class="fa-solid fa-file-pdf text-xs sm:text-sm"></i>
                            <span class="truncate">PDF</span>
                            <i class="fa-solid fa-chevron-down text-[9px] opacity-75"></i>
                        </button>
                        <div id="rekap-dropdown-pdf" class="absolute left-0 sm:right-0 sm:left-auto mt-1 w-60 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 hidden group-hover:block z-30 animate-fade-in">
                            <button onclick="exportRekapToPDF('current'); toggleRekapDropdown('pdf')" class="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                <i class="fa-regular fa-file-lines text-rose-600"></i> Unduh PDF Filter Aktif
                            </button>
                            <button onclick="exportRekapToPDF('annual'); toggleRekapDropdown('pdf')" class="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/60">
                                <i class="fa-solid fa-calendar-check text-rose-600"></i> Unduh PDF Tahunan (2026)
                            </button>
                        </div>
                    </div>

                    <!-- Print Button -->
                    <button onclick="printRekapReport()" type="button" class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold py-2.5 px-2.5 sm:px-3.5 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer" title="Cetak Format Laporan">
                        <i class="fa-solid fa-print"></i>
                        <span class="inline">Cetak</span>
                    </button>
                </div>
            </div>

            <!-- Panel Filter Komprehensif (Responsive 2-Col Mobile & 6-Col Desktop) -->
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 sm:space-y-4">
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2.5">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-sliders text-indigo-600 dark:text-indigo-400 text-sm"></i>
                        <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Filter Rekapitulasi Tugas</h3>
                        <span class="text-[11px] font-bold text-slate-400">(${filteredTasks.length} tugas)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="resetRekapFilter()" type="button" class="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer">
                            <i class="fa-solid fa-rotate-left text-xs"></i> Reset Filter
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 ${isUserTim ? 'xl:grid-cols-6' : 'xl:grid-cols-7'} gap-2.5 sm:gap-3">
                    ${!isUserTim ? `
                        <!-- 1. Filter Kategori Pegawai (Humas / Protokoler berdasarkan Kolom C Jabatan) -->
                        <div class="col-span-2 sm:col-span-1 md:col-span-1 xl:col-span-1">
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Kategori Pegawai</label>
                            <select onchange="updateRekapFilter('kategori', this.value)" class="w-full text-xs font-semibold py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                                <option value="all" ${filter.kategori === 'all' ? 'selected' : ''}>Semua Kategori (${allMembers.length})</option>
                                <option value="Humas" ${filter.kategori === 'Humas' ? 'selected' : ''}>Kelompok Humas (${humasMembers.length})</option>
                                <option value="Protokoler" ${filter.kategori === 'Protokoler' ? 'selected' : ''}>Kelompok Protokoler (${protokolerMembers.length})</option>
                            </select>
                        </div>

                        <!-- 2. Filter Anggota (Eksklusif Sheet Team) -->
                        <div class="col-span-2 sm:col-span-1 md:col-span-1 xl:col-span-1">
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Nama Anggota</label>
                            <select onchange="updateRekapFilter('member', this.value)" class="w-full text-xs font-semibold py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                                <option value="all" ${filter.member === 'all' ? 'selected' : ''}>Semua Anggota (${allMembers.length})</option>
                                <optgroup label="-- Kelompok Humas (${humasMembers.length}) --">
                                    ${humasMembers.map(m => `
                                        <option value="${m.normKey}" ${filter.member === m.normKey ? 'selected' : ''}>${m.rawName} (${m.jabatan || 'Humas'})</option>
                                    `).join('')}
                                </optgroup>
                                <optgroup label="-- Kelompok Protokoler (${protokolerMembers.length}) --">
                                    ${protokolerMembers.map(m => `
                                        <option value="${m.normKey}" ${filter.member === m.normKey ? 'selected' : ''}>${m.rawName} (${m.jabatan || 'Protokoler'})</option>
                                    `).join('')}
                                </optgroup>
                            </select>
                        </div>
                    ` : ''}

                    <!-- 2. Filter Jenis Tugas (Full-width di Mobile) -->
                    <div class="col-span-2 sm:col-span-1 md:col-span-1 xl:col-span-1">
                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Jenis Tugas</label>
                        <select onchange="updateRekapFilter('type', this.value)" class="w-full text-xs font-semibold py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                            <option value="all" ${filter.type === 'all' ? 'selected' : ''}>Semua Jenis Tugas</option>
                            ${taskTypesList.map(t => `
                                <option value="${t}" ${filter.type === t ? 'selected' : ''}>${t}</option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- 3. Filter Status Penyelesaian / SLA (Full-width di Mobile) -->
                    <div class="col-span-2 sm:col-span-1 md:col-span-1 xl:col-span-1">
                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Status / SLA</label>
                        <select onchange="updateRekapFilter('status', this.value)" class="w-full text-xs font-semibold py-2 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                            <option value="all" ${filter.status === 'all' ? 'selected' : ''}>Semua Status</option>
                            <option value="selesai" ${filter.status === 'selesai' ? 'selected' : ''}>Selesai</option>
                            <option value="belum" ${filter.status === 'belum' ? 'selected' : ''}>Belum Selesai</option>
                            <option value="terlambat" ${filter.status === 'terlambat' ? 'selected' : ''}>Terlambat Overdue (SLA)</option>
                            <option value="mendekati" ${filter.status === 'mendekati' ? 'selected' : ''}>Mendekati H-3</option>
                        </select>
                    </div>

                    <!-- 4. Filter Bulan (Kolom Kiri 50% di Mobile) -->
                    <div class="col-span-1 sm:col-span-1 md:col-span-1 xl:col-span-1">
                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Bulan</label>
                        <select onchange="updateRekapFilter('month', this.value)" class="w-full text-xs font-semibold py-2 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                            <option value="all" ${filter.month === 'all' ? 'selected' : ''}>Semua Bulan</option>
                            ${monthNames.map((m, idx) => `
                                <option value="${idx}" ${String(filter.month) === String(idx) ? 'selected' : ''}>${m}</option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- 5. Filter Tahun (Kolom Kanan 50% di Mobile) -->
                    <div class="col-span-1 sm:col-span-1 md:col-span-1 xl:col-span-1">
                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Tahun</label>
                        <select onchange="updateRekapFilter('year', this.value)" class="w-full text-xs font-semibold py-2 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                            <option value="2026" ${String(filter.year) === '2026' ? 'selected' : ''}>2026 (Berjalan)</option>
                            <option value="2025" ${String(filter.year) === '2025' ? 'selected' : ''}>2025</option>
                            <option value="all" ${String(filter.year) === 'all' ? 'selected' : ''}>Semua Tahun</option>
                        </select>
                    </div>

                    <!-- 6. Pencarian Cepat (Full-width di Mobile) -->
                    <div class="col-span-2 sm:col-span-1 md:col-span-1 xl:col-span-1">
                        <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Pencarian</label>
                        <div class="relative">
                            <input type="text" id="rekap-search-input" oninput="handleRekapSearchInput(this.value)" value="${filter.search || ''}" placeholder="Cari kegiatan / PIC..." class="w-full text-xs font-medium py-2 pl-7 pr-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                            <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-[10px]"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rekapitulasi Statistik Ringkas (KPI Cards - Responsive Grid Mobile & Tab) -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                <!-- Total Tugas -->
                <div class="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Total Tugas</span>
                        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 text-xs shrink-0">
                            <i class="fa-solid fa-clipboard-list text-[11px]"></i>
                        </div>
                    </div>
                    <div class="mt-1.5 sm:mt-2">
                        <p class="text-xl sm:text-2xl font-black text-slate-850 dark:text-white">${totalCount}</p>
                        <p class="text-[9.5px] sm:text-[10px] font-semibold text-slate-400 mt-0.5">Seluruh Modul</p>
                    </div>
                </div>

                <!-- Selesai -->
                <div class="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Tugas Selesai</span>
                        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 text-xs shrink-0">
                            <i class="fa-solid fa-circle-check text-[11px]"></i>
                        </div>
                    </div>
                    <div class="mt-1.5 sm:mt-2">
                        <p class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">${selesaiCount}</p>
                        <p class="text-[9.5px] sm:text-[10px] font-bold text-emerald-600/80 mt-0.5">${completionRate}% Capaian</p>
                    </div>
                </div>

                <!-- Belum Selesai -->
                <div class="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Belum Selesai</span>
                        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs shrink-0">
                            <i class="fa-solid fa-spinner text-[11px]"></i>
                        </div>
                    </div>
                    <div class="mt-1.5 sm:mt-2">
                        <p class="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">${belumCount}</p>
                        <p class="text-[9.5px] sm:text-[10px] font-semibold text-slate-400 mt-0.5">Dalam Proses</p>
                    </div>
                </div>

                <!-- Terlambat (Overdue SLA) -->
                <div class="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Terlambat SLA</span>
                        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600 text-xs shrink-0">
                            <i class="fa-solid fa-clock-rotate-left text-[11px]"></i>
                        </div>
                    </div>
                    <div class="mt-1.5 sm:mt-2">
                        <p class="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">${terlambatCount}</p>
                        <p class="text-[9.5px] sm:text-[10px] font-bold text-rose-500 mt-0.5">${terlambatCount > 0 ? 'Perlu Tindak Lanjut' : 'Nol Keterlambatan'}</p>
                    </div>
                </div>

                <!-- Mendekati Tenggat (H-3) -->
                <div class="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Mendekati H-3</span>
                        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 dark:bg-amber-955 flex items-center justify-center text-amber-600 text-xs shrink-0">
                            <i class="fa-solid fa-bell text-[11px]"></i>
                        </div>
                    </div>
                    <div class="mt-1.5 sm:mt-2">
                        <p class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">${mendekatiCount}</p>
                        <p class="text-[9.5px] sm:text-[10px] font-semibold text-amber-600/80 mt-0.5">Tenggat Dekat</p>
                    </div>
                </div>

                <!-- Kepatuhan SLA -->
                <div class="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">Kepatuhan SLA</span>
                        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 text-[11px] font-black shrink-0">
                            %
                        </div>
                    </div>
                    <div class="mt-1.5 sm:mt-2">
                        <p class="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">${slaRate}%</p>
                        <p class="text-[9.5px] sm:text-[10px] font-semibold text-slate-400 mt-0.5">Tepat Waktu</p>
                    </div>
                </div>
            </div>

            <!-- Switcher Mode Tampilan: Rekap Rubrikasi vs Per Anggota vs Seluruh Tugas (Segmented Control Responsive) -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div class="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-x-auto">
                    <button onclick="switchRekapViewMode('rekap_rubrikasi')" class="px-2.5 sm:px-3 py-2 rounded-lg text-[10.5px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${filter.viewMode === 'rekap_rubrikasi' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}">
                        <i class="fa-solid fa-table-cells-large text-[11px]"></i>
                        <span class="truncate">Rekap Rubrikasi</span>
                    </button>
                    <button onclick="switchRekapViewMode('per_member')" class="px-2.5 sm:px-3 py-2 rounded-lg text-[10.5px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${filter.viewMode === 'per_member' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}">
                        <i class="fa-solid fa-users-viewfinder text-[11px]"></i>
                        <span class="truncate">Rincian Anggota (${displayedMemberCards.length})</span>
                    </button>
                    <button onclick="switchRekapViewMode('matrix')" class="px-2.5 sm:px-3 py-2 rounded-lg text-[10.5px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${filter.viewMode === 'matrix' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}">
                        <i class="fa-solid fa-table-list text-[11px]"></i>
                        <span class="truncate">Seluruh Tugas (${filteredTasks.length})</span>
                    </button>
                </div>

                <div class="grid grid-cols-2 sm:flex items-center justify-end gap-2 text-xs">
                    ${filter.viewMode === 'per_member' ? `
                        <button onclick="toggleAllMemberAccordions(true)" class="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
                            <i class="fa-solid fa-angles-down text-[10px]"></i> Buka Semua
                        </button>
                        <button onclick="toggleAllMemberAccordions(false)" class="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
                            <i class="fa-solid fa-angles-up text-[10px]"></i> Tutup Semua
                        </button>
                    ` : `
                        <div class="col-span-2 text-center sm:text-right text-[11px] font-bold text-slate-400 py-1">Total ${filteredTasks.length} tugas ditemukan</div>
                    `}
                </div>
            </div>

            <!-- Konten Utama: Sesuai Mode Tampilan -->
            ${filter.viewMode === 'rekap_rubrikasi' ? `
                <!-- TABEL REKAPITULASI TUGAS BERDASARKAN KATEGORI & RUBRIKASI -->
                <div class="space-y-6">
                    <!-- Tab Filter Kategori Cepat (Pill Switcher) -->
                    <div class="flex items-center gap-2 overflow-x-auto pb-1">
                        <span class="text-xs font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0">Kategori:</span>
                        <button onclick="updateRekapFilter('kategori', 'all')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${filter.kategori === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}">
                            Semua Kategori (${allMembers.length})
                        </button>
                        <button onclick="updateRekapFilter('kategori', 'Humas')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${filter.kategori === 'Humas' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}">
                            <i class="fa-solid fa-bullhorn mr-1 text-[11px]"></i> Kelompok Humas (${humasMembers.length})
                        </button>
                        <button onclick="updateRekapFilter('kategori', 'Protokoler')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${filter.kategori === 'Protokoler' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}">
                            <i class="fa-solid fa-user-tie mr-1 text-[11px]"></i> Kelompok Protokoler (${protokolerMembers.length})
                        </button>
                    </div>

                    ${(filter.kategori === 'all' || filter.kategori === 'Humas') ? `
                        <!-- BAGIAN 1: REKAPITULASI KELOMPOK HUMAS -->
                        ${renderRubrikasiCategorySection(
                            'Kelompok Humas',
                            'fa-bullhorn',
                            'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
                            humasMembers,
                            filteredTasks,
                            REKAP_RUBRIKASI_LIST
                        )}
                    ` : ''}

                    ${(filter.kategori === 'all' || filter.kategori === 'Protokoler') ? `
                        <!-- BAGIAN 2: REKAPITULASI KELOMPOK PROTOKOLER -->
                        ${renderRubrikasiCategorySection(
                            'Kelompok Protokoler',
                            'fa-user-tie',
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                            protokolerMembers,
                            filteredTasks,
                            REKAP_RUBRIKASI_LIST
                        )}
                    ` : ''}
                </div>
            ` : filter.viewMode === 'per_member' ? `
                <!-- DAFTAR ANGGOTA TIM BESERTA RINCIAN TUGAS MASING-MASING -->
                <div class="space-y-3 sm:space-y-4">
                    ${displayedMemberCards.length === 0 ? `
                        <div class="bg-white dark:bg-slate-800 p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-700 text-slate-400">
                            <i class="fa-solid fa-user-slash text-2xl sm:text-3xl mb-2 text-slate-300 dark:text-slate-600"></i>
                            <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada anggota yang sesuai dengan kriteria filter</p>
                            <p class="text-xs text-slate-400 mt-1">Coba sesuaikan filter nama, jenis tugas, atau periode bulan/tahun.</p>
                        </div>
                    ` : displayedMemberCards.map((mc, mIdx) => {
                        const m = mc.member;
                        // DEFAULT TUTUP SEMUA: hanya buka jika eksplisit bernilai true
                        const isExpanded = !!filter.expandedMembers[m.normKey];
                        const initials = m.rawName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

                        return `
                            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden transition-all" id="member-card-${m.normKey}">
                                <!-- Header Card Anggota (Mobile, Tab & Desktop Responsive) -->
                                <div class="p-3.5 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/80">
                                    <!-- Identitas Personil -->
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-sm">
                                            ${initials}
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-1.5 flex-wrap">
                                                <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white break-words">${m.rawName}</h3>
                                                <span class="px-1.5 py-0.5 rounded text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider shrink-0 ${m.role === 'koordinator' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">
                                                    ${m.role === 'koordinator' ? 'Koordinator' : (m.role === 'admin' ? 'Admin' : 'Tim')}
                                                </span>
                                            </div>
                                            <p class="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                                                ${m.jabatan} <span class="text-slate-350 dark:text-slate-600">·</span> <span class="text-slate-400">${m.bidang}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Indikator Kinerja & Tombol Accordion (Mobile Wrap & Easy Tap) -->
                                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-2.5 sm:gap-3 w-full md:w-auto">
                                        <!-- Ringkasan Mikro Status -->
                                        <div class="grid grid-cols-3 sm:flex items-center gap-1.5">
                                            <span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[9.5px] sm:text-[10px] font-extrabold text-slate-700 dark:text-slate-200 text-center" title="Total Tugas">
                                                ${mc.total} Tugas
                                            </span>
                                            <span class="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 rounded-lg text-[9.5px] sm:text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 text-center" title="Selesai">
                                                <i class="fa-solid fa-check text-[8px] mr-0.5"></i> ${mc.selesai}
                                            </span>
                                            <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9.5px] sm:text-[10px] font-extrabold text-slate-600 dark:text-slate-300 text-center" title="Belum Selesai">
                                                <i class="fa-regular fa-clock text-[8px] mr-0.5"></i> ${mc.belum}
                                            </span>
                                            ${mc.terlambat > 0 ? `
                                                <span class="col-span-3 sm:col-auto px-2 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-[9.5px] sm:text-[10px] font-extrabold text-rose-600 dark:text-rose-300 text-center animate-pulse" title="Terlambat SLA">
                                                    <i class="fa-solid fa-triangle-exclamation text-[8px] mr-0.5"></i> ${mc.terlambat} Terlambat
                                                </span>
                                            ` : ''}
                                        </div>

                                        <!-- Tombol Accordion -->
                                        <button onclick="toggleMemberAccordion('${m.normKey}')" id="btn-toggle-${m.normKey}" class="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-all shadow-2xs shrink-0 cursor-pointer">
                                            <span id="btn-text-${m.normKey}">${isExpanded ? 'Tutup Rincian' : `Buka Rincian (${mc.total})`}</span>
                                            <i id="btn-icon-${m.normKey}" class="fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Rincian Tugas Anggota (Accordion Content - DEFAULT TUTUP SEMUA) -->
                                <div class="${isExpanded ? 'block' : 'hidden'} transition-all" id="member-tasks-table-${m.normKey}">
                                    ${mc.tasks.length === 0 ? `
                                        <div class="p-6 sm:p-8 text-center text-slate-400">
                                            <i class="fa-solid fa-calendar-check text-2xl mb-1 text-slate-300 dark:text-slate-600"></i>
                                            <p class="text-xs font-bold text-slate-600 dark:text-slate-400">Tidak ada tugas aktif untuk ${m.rawName} pada filter periode ini.</p>
                                        </div>
                                    ` : `
                                        <!-- TAMPILAN MOBILE & TAB: KARTU VERTIKAL RESPONSIVE (100% BEBAS SCROLL HORIZONTAL / TERPOTONG) -->
                                        <div class="block xl:hidden p-3 sm:p-4 bg-slate-50/40 dark:bg-slate-900/20">
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                ${mc.tasks.map((task, tIdx) => renderTaskMobileCardItem(task, tIdx, true)).join('')}
                                            </div>
                                        </div>

                                        <!-- TAMPILAN DESKTOP WIDESCREEN (TABLE LENGKAP UNTUK LAYAR BESAR) -->
                                        <div class="overflow-x-auto hidden xl:block">
                                            <table class="w-full text-left text-xs">
                                                <thead class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    <tr>
                                                        <th class="py-2.5 px-3 w-12 text-center">No</th>
                                                        <th class="py-2.5 px-3 w-28">Jenis Tugas</th>
                                                        <th class="py-2.5 px-4 min-w-[220px]">Uraian Tugas & Kegiatan</th>
                                                        <th class="py-2.5 px-3 w-36">PIC Tertera</th>
                                                        <th class="py-2.5 px-3 w-32">Tgl Pelaksanaan</th>
                                                        <th class="py-2.5 px-3 w-32">SLA / Tenggat</th>
                                                        <th class="py-2.5 px-3 w-28 text-center">Status</th>
                                                        <th class="py-2.5 px-3 w-28 text-center">SLA</th>
                                                        <th class="py-2.5 px-3 w-24 text-center">Progres</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                                                    ${mc.tasks.map((task, tIdx) => `
                                                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                                                            <td class="py-3 px-3 text-center font-bold text-slate-400">${tIdx + 1}</td>
                                                            <td class="py-3 px-3">
                                                                <span class="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                                    ${task.jenis}
                                                                </span>
                                                            </td>
                                                            <td class="py-3 px-4">
                                                                <p class="font-extrabold text-xs text-slate-900 dark:text-white leading-snug break-words">${task.judul}</p>
                                                                ${task.keterangan && task.keterangan !== '-' ? `
                                                                    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 break-words">${task.keterangan}</p>
                                                                ` : ''}
                                                            </td>
                                                            <td class="py-3 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 break-words">${task.petugas}</td>
                                                            <td class="py-3 px-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                                                ${formatDateWIB(task.tanggal)}
                                                            </td>
                                                            <td class="py-3 px-3 text-[11px] font-bold ${task.isTerlambat ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}">
                                                                ${formatDateWIB(task.deadline)}
                                                            </td>
                                                            <td class="py-3 px-3 text-center">
                                                                <span class="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${task.isDone ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">
                                                                    ${task.status}
                                                                </span>
                                                            </td>
                                                            <td class="py-3 px-3 text-center">
                                                                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${task.slaClass}">
                                                                    ${task.slaStatus}
                                                                </span>
                                                            </td>
                                                            <td class="py-3 px-3 text-center">
                                                                <div class="flex items-center justify-center gap-1.5">
                                                                    <div class="w-10 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                                        <div class="h-1.5 rounded-full ${task.isDone ? 'bg-emerald-600' : 'bg-indigo-600'}" style="width: ${task.progress}%"></div>
                                                                    </div>
                                                                    <span class="text-[10px] font-black text-slate-600 dark:text-slate-300">${task.progress}%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <!-- TABEL MATRIKS SELURUH TUGAS (MASTER GRID - RESPONSIVE MOBILE & DESKTOP) -->
                <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
                    <div class="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-list-check text-indigo-600 dark:text-indigo-400 text-sm"></i>
                            <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Daftar Lengkap Seluruh Tugas (${filteredTasks.length} Data)</h3>
                        </div>
                    </div>

                    ${filteredTasks.length === 0 ? `
                        <div class="p-12 sm:p-16 text-center text-slate-400">
                            <i class="fa-solid fa-folder-open text-2xl sm:text-3xl mb-2 text-slate-300 dark:text-slate-600"></i>
                            <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada data tugas yang sesuai dengan filter.</p>
                            <p class="text-xs text-slate-400 mt-1">Silakan sesuaikan pilihan dropdown filter di atas.</p>
                        </div>
                    ` : `
                        <!-- TAMPILAN MOBILE & TAB: LIST KARTU SELURUH TUGAS (100% RESPONSIVE TANPA GESER KANAN) -->
                        <div class="block xl:hidden p-3 sm:p-4 bg-slate-50/30 dark:bg-slate-900/20">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                ${filteredTasks.map((task, idx) => renderTaskMobileCardItem(task, idx, true)).join('')}
                            </div>
                        </div>

                        <!-- TAMPILAN DESKTOP WIDESCREEN: MASTER GRID TABLE -->
                        <div class="overflow-x-auto hidden xl:block">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th class="py-3 px-3 w-12 text-center">No</th>
                                        <th class="py-3 px-3 w-40">Nama Anggota / PIC</th>
                                        <th class="py-3 px-3 w-28">Jenis</th>
                                        <th class="py-3 px-4 min-w-[220px]">Uraian Tugas & Kegiatan</th>
                                        <th class="py-3 px-3 w-32">Tgl Pelaksanaan</th>
                                        <th class="py-3 px-3 w-32">SLA / Tenggat</th>
                                        <th class="py-3 px-3 w-28 text-center">Status</th>
                                        <th class="py-3 px-3 w-28 text-center">SLA</th>
                                        <th class="py-3 px-3 w-24 text-center">Progres</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                                    ${filteredTasks.map((task, idx) => `
                                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                                            <td class="py-3 px-3 text-center font-bold text-slate-400">${idx + 1}</td>
                                            <td class="py-3 px-3 font-extrabold text-xs text-slate-900 dark:text-white break-words">${task.petugasCanonicalName || task.petugas}</td>
                                            <td class="py-3 px-3">
                                                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                    ${task.jenis}
                                                </span>
                                            </td>
                                            <td class="py-3 px-4">
                                                <p class="font-bold text-xs text-slate-900 dark:text-white leading-snug break-words">${task.judul}</p>
                                                ${task.keterangan && task.keterangan !== '-' ? `
                                                    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 break-words">${task.keterangan}</p>
                                                ` : ''}
                                            </td>
                                            <td class="py-3 px-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">${formatDateWIB(task.tanggal)}</td>
                                            <td class="py-3 px-3 text-[11px] font-bold ${task.isTerlambat ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}">${formatDateWIB(task.deadline)}</td>
                                            <td class="py-3 px-3 text-center">
                                                <span class="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${task.isDone ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">
                                                    ${task.status}
                                                </span>
                                            </td>
                                            <td class="py-3 px-3 text-center">
                                                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${task.slaClass}">
                                                    ${task.slaStatus}
                                                </span>
                                            </td>
                                            <td class="py-3 px-3 text-center">
                                                <div class="flex items-center justify-center gap-1">
                                                    <div class="w-10 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                        <div class="h-1.5 rounded-full ${task.isDone ? 'bg-emerald-600' : 'bg-indigo-600'}" style="width: ${task.progress}%"></div>
                                                    </div>
                                                    <span class="text-[10px] font-bold text-slate-500">${task.progress}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            `}
        </div>
    `;
}

/**
 * Handle input pencarian cepat tanpa kehilangan fokus atau stutter
 */
let rekapSearchDebounceTimer = null;
window.handleRekapSearchInput = function(val) {
    if (!window.rekapKegiatanFilter) return;
    window.rekapKegiatanFilter.search = val;

    clearTimeout(rekapSearchDebounceTimer);
    rekapSearchDebounceTimer = setTimeout(() => {
        const inputEl = document.getElementById('rekap-search-input');
        const pos = inputEl ? inputEl.selectionStart : 0;

        const container = document.getElementById('app-content') || document.getElementById('content') || document.querySelector('main');
        if (container) renderRekapKegiatan(container);

        const restoredInput = document.getElementById('rekap-search-input');
        if (restoredInput) {
            restoredInput.focus();
            try {
                restoredInput.setSelectionRange(pos, pos);
            } catch (_) {}
        }
    }, 200);
};

/**
 * Update filter state dan re-render secara aman
 */
window.updateRekapFilter = function(key, val) {
    if (!window.rekapKegiatanFilter) return;
    window.rekapKegiatanFilter[key] = val;

    const container = document.getElementById('app-content') || document.getElementById('content') || document.querySelector('main');
    if (container) {
        renderRekapKegiatan(container);
    }
};

/**
 * Reset seluruh filter kembali ke kondisi awal (DEFAULT TUTUP SEMUA)
 */
window.resetRekapFilter = function() {
    const isUserTim = currentUser && currentUser.role === 'tim';
    let defaultMember = 'all';
    if (isUserTim) {
        const allTasks = getAllIntegratedTasks();
        const allM = getAllTeamMembersList(allTasks);
        const lm = getLoggedInTeamMember(allM, currentUser);
        if (lm) defaultMember = lm.normKey;
    }
    window.rekapKegiatanFilter = {
        member: defaultMember,
        kategori: 'all',
        type: 'all',
        status: 'all',
        month: 'all',
        year: 2026,
        search: '',
        viewMode: 'rekap_rubrikasi',
        expandedMembers: {} // Kembali ke Default Tutup Semua
    };
    const container = document.getElementById('app-content') || document.getElementById('content') || document.querySelector('main');
    if (container) renderRekapKegiatan(container);
    if (typeof showToast === 'function') showToast('Filter rekapitulasi berhasil direset', 'info');
};

/**
 * Ganti mode tampilan (rekap_rubrikasi, per_member, atau matrix)
 */
window.switchRekapViewMode = function(mode) {
    if (!window.rekapKegiatanFilter) return;
    window.rekapKegiatanFilter.viewMode = mode;
    const container = document.getElementById('app-content') || document.getElementById('content') || document.querySelector('main');
    if (container) renderRekapKegiatan(container);
};

/**
 * Toggle accordion kartu anggota (Smooth DOM toggle tanpa re-render keseluruhan)
 */
window.toggleMemberAccordion = function(normKey) {
    if (!window.rekapKegiatanFilter) return;
    const cur = !!window.rekapKegiatanFilter.expandedMembers[normKey];
    window.rekapKegiatanFilter.expandedMembers[normKey] = !cur;

    const tableEl = document.getElementById(`member-tasks-table-${normKey}`);
    const textEl = document.getElementById(`btn-text-${normKey}`);
    const iconEl = document.getElementById(`btn-icon-${normKey}`);

    if (tableEl) {
        if (!cur) {
            tableEl.classList.remove('hidden');
        } else {
            tableEl.classList.add('hidden');
        }
    }

    if (textEl) {
        if (!cur) {
            textEl.textContent = 'Tutup Rincian';
        } else {
            // Ambil total count jika ada
            const totalText = textEl.textContent.match(/\d+/);
            textEl.textContent = totalText ? `Buka Rincian (${totalText[0]})` : 'Buka Rincian';
        }
    }

    if (iconEl) {
        if (!cur) {
            iconEl.classList.remove('fa-chevron-down');
            iconEl.classList.add('fa-chevron-up');
        } else {
            iconEl.classList.remove('fa-chevron-up');
            iconEl.classList.add('fa-chevron-down');
        }
    }
};

/**
 * Buka atau tutup seluruh accordion anggota sekaligus
 */
window.toggleAllMemberAccordions = function(open) {
    if (!window.rekapKegiatanFilter) return;
    const allIntegratedTasks = getAllIntegratedTasks();
    const allMembers = getAllTeamMembersList(allIntegratedTasks);
    allMembers.forEach(m => {
        window.rekapKegiatanFilter.expandedMembers[m.normKey] = open;
    });
    const container = document.getElementById('app-content') || document.getElementById('content') || document.querySelector('main');
    if (container) renderRekapKegiatan(container);
};

/**
 * Ekspor Rekapitulasi Tugas ke File Excel (.xlsx) dengan 2 Sheet Lengkap & Rapi:
 * Sheet 1: Rekapitulasi Tugas Berdasarkan Kategori (Humas & Protokoler) & Rubrikasi
 * Sheet 2: Detail Rincian Seluruh Tugas Terintegrasi
 */
window.exportRekapToExcel = function(scope = 'current') {
    if (typeof XLSX === 'undefined') {
        if (typeof showToast === 'function') showToast('Library XLSX belum dimuat. Mohon tunggu sejenak.', 'error');
        return;
    }

    const allIntegratedTasks = getAllIntegratedTasks();
    const allMembers = getAllTeamMembersList(allIntegratedTasks);
    const filter = window.rekapKegiatanFilter || { month: 'all', year: 2026, member: 'all', kategori: 'all', type: 'all', status: 'all', search: '' };

    const isUserTim = currentUser && currentUser.role === 'tim';
    const loggedInMember = isUserTim ? getLoggedInTeamMember(allMembers, currentUser) : null;

    // Filter eksklusif dari sheet team
    const validMemberNormKeys = new Set(allMembers.map(m => m.normKey));
    const teamScopedTasks = allIntegratedTasks.filter(t => t.canonicalMember && validMemberNormKeys.has(t.canonicalMember.normKey));

    const scopedTasks = isUserTim
        ? teamScopedTasks.filter(t => isTaskAssignedToLoggedInUser(t, currentUser, loggedInMember))
        : teamScopedTasks;
    const scopedMembers = isUserTim
        ? (loggedInMember ? [loggedInMember] : [])
        : allMembers;

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    let tasksToExport = scopedTasks;
    let periodeLabel = '';

    if (scope === 'annual') {
        tasksToExport = scopedTasks.filter(t => {
            const yr = t.parsedDate ? t.parsedDate.getFullYear() : (t.parsedDeadline ? t.parsedDeadline.getFullYear() : 2026);
            return yr === 2026;
        });
        periodeLabel = 'Tahun 2026 (Tahunan Berjalan)';
    } else {
        tasksToExport = filterIntegratedTasks(scopedTasks, filter);
        if (filter.kategori && filter.kategori !== 'all') {
            tasksToExport = tasksToExport.filter(t => t.canonicalMember && t.canonicalMember.kategori === filter.kategori);
        }
        const mLabel = filter.month === 'all' ? 'Semua Bulan' : monthNames[filter.month];
        const yLabel = filter.year === 'all' ? 'Semua Tahun' : filter.year;
        periodeLabel = `${mLabel} ${yLabel}`;
    }

    const totalTasks = tasksToExport.length;
    const totalSelesai = tasksToExport.filter(t => t.isDone).length;
    const totalBelum = tasksToExport.filter(t => !t.isDone).length;
    const totalTerlambat = tasksToExport.filter(t => t.isTerlambat).length;
    const compRate = totalTasks > 0 ? Math.round((totalSelesai / totalTasks) * 100) : 0;
    const slaRate = totalTasks > 0 ? Math.round(((totalTasks - totalTerlambat) / totalTasks) * 100) : 100;
    const nowWIB = typeof getNowWIB === 'function' ? getNowWIB() : new Date();

    // Pisahkan kelompok Humas dan Protokoler
    const humasMembers = scopedMembers.filter(m => m.kategori !== 'Protokoler');
    const protokolerMembers = scopedMembers.filter(m => m.kategori === 'Protokoler');

    // -------------------------------------------------------------
    // SHEET 1: REKAPITULASI TUGAS BERDASARKAN KATEGORI & RUBRIKASI
    // -------------------------------------------------------------
    const summaryAOA = [
        ['BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT'],
        ['TIM HUBUNGAN MASYARAKAT (HUMAS) & PROTOKOLER'],
        ['LAPORAN REKAPITULASI TUGAS BERDASARKAN KATEGORI & RUBRIKASI'],
        [''],
        ['Periode Laporan', periodeLabel],
        ['Waktu Ekspor', `${nowWIB.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ${nowWIB.toLocaleTimeString('id-ID')} WIB`],
        ['Filter Aktif', `Kategori: ${filter.kategori || 'Semua'} | Anggota: ${isUserTim && loggedInMember ? loggedInMember.rawName : (filter.member === 'all' ? 'Semua' : filter.member)} | Jenis: ${filter.type} | Status: ${filter.status}`],
        [''],
        ['RINGKASAN METRIK KINERJA EKSEKUTIF'],
        ['Total Seluruh Tugas', totalTasks],
        ['Tugas Selesai', `${totalSelesai} (${compRate}%)`],
        ['Tugas Belum Selesai', totalBelum],
        ['Tugas Terlambat (Overdue SLA)', totalTerlambat],
        ['Tingkat Kepatuhan SLA', `${slaRate}%`],
        ['']
    ];

    // Header tabel rubrikasi
    const rubrikHeader = [
        'No',
        'Nama Pegawai (Sheet Team)',
        'Jabatan (Kolom C)',
        'Bidang / Seksi',
        ...REKAP_RUBRIKASI_LIST.map(r => r.shortLabel),
        'Total Tugas',
        'Selesai',
        'Belum',
        'Terlambat',
        'Capaian (%)'
    ];

    // Helper untuk menyusun baris tabel rekapitulasi kategori
    const buildCategoryTableAOA = (sectionTitle, membersList) => {
        summaryAOA.push([sectionTitle]);
        summaryAOA.push(rubrikHeader);

        const colTotals = {};
        REKAP_RUBRIKASI_LIST.forEach(r => { colTotals[r.key] = 0; });
        let catTotTasks = 0, catTotDone = 0, catTotBelum = 0, catTotTerlambat = 0;

        membersList.forEach((m, idx) => {
            const mTasks = tasksToExport.filter(t => isTaskAssignedToMember(t, m));
            const rubCounts = {};
            REKAP_RUBRIKASI_LIST.forEach(r => { rubCounts[r.key] = 0; });
            mTasks.forEach(t => {
                const keys = typeof getTaskRubrikasiKeys === 'function' ? getTaskRubrikasiKeys(t) : [getTaskRubrikasiKey(t)];
                keys.forEach(k => {
                    rubCounts[k] = (rubCounts[k] || 0) + 1;
                });
            });

            const mTot = mTasks.length;
            const mSel = mTasks.filter(t => t.isDone).length;
            const mBel = mTasks.filter(t => !t.isDone).length;
            const mTer = mTasks.filter(t => t.isTerlambat).length;
            const mRate = mTot > 0 ? Math.round((mSel / mTot) * 100) : 0;

            catTotTasks += mTot;
            catTotDone += mSel;
            catTotBelum += mBel;
            catTotTerlambat += mTer;

            REKAP_RUBRIKASI_LIST.forEach(r => {
                colTotals[r.key] += (rubCounts[r.key] || 0);
            });

            const row = [
                idx + 1,
                m.rawName,
                m.jabatan,
                m.bidang,
                ...REKAP_RUBRIKASI_LIST.map(r => rubCounts[r.key] || 0),
                mTot,
                mSel,
                mBel,
                mTer,
                `${mRate}%`
            ];
            summaryAOA.push(row);
        });

        // Baris Total Kategori
        const catRate = catTotTasks > 0 ? Math.round((catTotDone / catTotTasks) * 100) : 0;
        summaryAOA.push([
            '',
            `TOTAL ${sectionTitle.toUpperCase()}`,
            '',
            `${membersList.length} Pegawai`,
            ...REKAP_RUBRIKASI_LIST.map(r => colTotals[r.key]),
            catTotTasks,
            catTotDone,
            catTotBelum,
            catTotTerlambat,
            `${catRate}%`
        ]);
        summaryAOA.push(['']);
    };

    // 1. Rekapitulasi Kelompok Humas
    if (filter.kategori === 'all' || filter.kategori === 'Humas') {
        buildCategoryTableAOA('KELOMPOK HUMAS', humasMembers);
    }

    // 2. Rekapitulasi Kelompok Protokoler
    if (filter.kategori === 'all' || filter.kategori === 'Protokoler') {
        buildCategoryTableAOA('KELOMPOK PROTOKOLER', protokolerMembers);
    }

    // 3. Baris Total Keseluruhan
    summaryAOA.push([
        '',
        'TOTAL KESELURUHAN SELURUH KATEGORI',
        '',
        `${scopedMembers.length} Pegawai`,
        ...REKAP_RUBRIKASI_LIST.map(r => {
            return tasksToExport.filter(t => {
                const keys = typeof getTaskRubrikasiKeys === 'function' ? getTaskRubrikasiKeys(t) : [getTaskRubrikasiKey(t)];
                return keys.includes(r.key);
            }).length;
        }),
        totalTasks,
        totalSelesai,
        totalBelum,
        totalTerlambat,
        `${compRate}%`
    ]);

    // -------------------------------------------------------------
    // SHEET 2: RINCIAN SELURUH TUGAS TERINTEGRASI
    // -------------------------------------------------------------
    const detailAOA = [
        ['DAFTAR RINCIAN PENUGASAN & KEGIATAN ANGGOTA TIM HUMAS BPS KALBAR'],
        ['Periode: ' + periodeLabel],
        [''],
        [
            'No',
            'Nama Anggota / PIC',
            'Kategori Pegawai',
            'Jenis Tugas',
            'Rubrikasi Tugas',
            'Uraian Tugas & Kegiatan',
            'Tanggal Pelaksanaan',
            'SLA / Tenggat Waktu',
            'Status Penyelesaian',
            'Indikator SLA',
            'Progres (%)',
            'Keterangan / Lokasi / Output'
        ]
    ];

    tasksToExport.forEach((t, idx) => {
        detailAOA.push([
            idx + 1,
            t.petugasCanonicalName || t.petugas,
            (t.canonicalMember && t.canonicalMember.kategori) || 'Humas',
            t.jenis,
            getTaskRubrikasiKey(t),
            t.judul,
            formatDateWIB(t.tanggal),
            formatDateWIB(t.deadline),
            t.status,
            t.slaStatus,
            `${t.progress}%`,
            t.keterangan || '-'
        ]);
    });

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAOA);
    wsSummary['!cols'] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 26 },
        { wch: 20 },
        ...REKAP_RUBRIKASI_LIST.map(() => ({ wch: 14 })),
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 }
    ];

    const wsDetail = XLSX.utils.aoa_to_sheet(detailAOA);
    wsDetail['!cols'] = [
        { wch: 6 },
        { wch: 26 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 48 },
        { wch: 20 },
        { wch: 20 },
        { wch: 16 },
        { wch: 14 },
        { wch: 12 },
        { wch: 36 }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Kinerja Tim');
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Rincian Seluruh Tugas');

    const cleanPeriodeName = periodeLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Laporan_Kinerja_Rekap_Tugas_Humas_BPS_Kalbar_${cleanPeriodeName}.xlsx`;

    XLSX.writeFile(wb, fileName);
    if (typeof showToast === 'function') showToast(`Laporan Excel berhasil diunduh (${fileName})`, 'success');
};

/**
 * Ekspor Rekapitulasi Tugas ke Dokumen PDF Resmi Landscape Berformat BPS Kalbar
 */
window.exportRekapToPDF = function(scope = 'current') {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        if (typeof showToast === 'function') showToast('Library jsPDF belum tersedia. Membuka mode cetak alternatif...', 'info');
        window.printRekapReport();
        return;
    }

    const { jsPDF } = window.jspdf;
    // Format Landscape A4 (842 x 595 pt) agar tabel tidak terpotong dan profesional
    const doc = new jsPDF('l', 'pt', 'a4');

    const allIntegratedTasks = getAllIntegratedTasks();
    const allMembers = getAllTeamMembersList(allIntegratedTasks);
    const filter = window.rekapKegiatanFilter || { month: 'all', year: 2026, member: 'all', type: 'all', status: 'all', search: '' };

    const isUserTim = currentUser && currentUser.role === 'tim';
    const loggedInMember = isUserTim ? getLoggedInTeamMember(allMembers, currentUser) : null;
    const scopedTasks = isUserTim
        ? allIntegratedTasks.filter(t => isTaskAssignedToLoggedInUser(t, currentUser, loggedInMember))
        : allIntegratedTasks;
    const scopedMembers = isUserTim
        ? (loggedInMember ? [loggedInMember] : [])
        : allMembers;

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    let tasksToExport = scopedTasks;
    let periodeLabel = '';

    if (scope === 'annual') {
        tasksToExport = scopedTasks.filter(t => {
            const yr = t.parsedDate ? t.parsedDate.getFullYear() : (t.parsedDeadline ? t.parsedDeadline.getFullYear() : 2026);
            return yr === 2026;
        });
        periodeLabel = 'Tahun 2026 (Tahunan Berjalan)';
    } else {
        tasksToExport = filterIntegratedTasks(scopedTasks, filter);
        const mLabel = filter.month === 'all' ? 'Semua Bulan' : monthNames[filter.month];
        const yLabel = filter.year === 'all' ? 'Semua Tahun' : filter.year;
        periodeLabel = `${mLabel} ${yLabel}`;
    }

    const totalTasks = tasksToExport.length;
    const totalSelesai = tasksToExport.filter(t => t.isDone).length;
    const totalBelum = tasksToExport.filter(t => !t.isDone).length;
    const totalTerlambat = tasksToExport.filter(t => t.isTerlambat).length;
    const compRate = totalTasks > 0 ? Math.round((totalSelesai / totalTasks) * 100) : 0;
    const slaRate = totalTasks > 0 ? Math.round(((totalTasks - totalTerlambat) / totalTasks) * 100) : 100;
    const nowWIB = typeof getNowWIB === 'function' ? getNowWIB() : new Date();

    const pageWidth = doc.internal.pageSize.getWidth(); // 841.89
    const pageCenter = pageWidth / 2;

    // 1. KOP SURAT RESMI BPS KALBAR
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT', pageCenter, 42, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('TIM HUBUNGAN MASYARAKAT (HUMAS)', pageCenter, 56, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Jl. Sutan Syahrir No. 24/42, Pontianak 78116 | Telp: (0561) 732053 | Email: bps6100@bps.go.id', pageCenter, 68, { align: 'center' });

    // Garis ganda Kop
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(1.5);
    doc.line(40, 75, pageWidth - 40, 75);
    doc.setLineWidth(0.5);
    doc.line(40, 78, pageWidth - 40, 78);

    // 2. JUDUL DOKUMEN LAPORAN
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN REKAPITULASI TUGAS & KINERJA ANGGOTA TIM HUMAS', pageCenter, 100, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Periode Laporan: ${periodeLabel}   |   Dicetak: ${nowWIB.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ${nowWIB.toLocaleTimeString('id-ID')} WIB`, pageCenter, 114, { align: 'center' });

    // 3. KOTAK METRIK EKSEKUTIF (5 KARTU MEMANJANG)
    const boxY = 126;
    const boxHeight = 40;
    const marginX = 40;
    const totalBoxWidth = pageWidth - (marginX * 2); // 761.89
    const singleCardW = totalBoxWidth / 5;

    const cardsData = [
        { label: 'TOTAL TUGAS', val: `${totalTasks}`, color: [30, 41, 59] },
        { label: 'TUGAS SELESAI', val: `${totalSelesai} (${compRate}%)`, color: [16, 185, 129] },
        { label: 'BELUM SELESAI', val: `${totalBelum}`, color: [100, 116, 139] },
        { label: 'TERLAMBAT (SLA)', val: `${totalTerlambat}`, color: totalTerlambat > 0 ? [225, 29, 72] : [100, 116, 139] },
        { label: 'KEPATUHAN SLA', val: `${slaRate}%`, color: [79, 70, 229] }
    ];

    cardsData.forEach((c, idx) => {
        const cX = marginX + (idx * singleCardW);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cX + 2, boxY, singleCardW - 4, boxHeight, 4, 4, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(c.label, cX + ((singleCardW - 4) / 2), boxY + 14, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(c.color[0], c.color[1], c.color[2]);
        doc.text(c.val, cX + ((singleCardW - 4) / 2), boxY + 30, { align: 'center' });
    });

    // 4. BAGIAN I: TABEL REKAPITULASI KINERJA PER ANGGOTA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('I. Rekapitulasi Beban Kerja & Capaian Kinerja Per Anggota Tim Humas', 40, 184);

    const memberTableData = scopedMembers.map((m, idx) => {
        const mTasks = tasksToExport.filter(t => isTaskAssignedToMember(t, m));
        const mTot = mTasks.length;
        const mSel = mTasks.filter(t => t.isDone).length;
        const mBel = mTasks.filter(t => !t.isDone).length;
        const mTer = mTasks.filter(t => t.isTerlambat).length;
        const mRate = mTot > 0 ? Math.round((mSel / mTot) * 100) : 0;
        return [
            idx + 1,
            m.rawName,
            m.jabatan,
            m.bidang,
            mTot,
            mSel,
            mBel,
            mTer,
            `${mRate}%`
        ];
    });

    // Tambah baris total
    memberTableData.push([
        '',
        'TOTAL KESELURUHAN',
        '',
        '',
        totalTasks,
        totalSelesai,
        totalBelum,
        totalTerlambat,
        `${compRate}%`
    ]);

    doc.autoTable({
        startY: 194,
        margin: { left: 40, right: 40 },
        head: [['No', 'Nama Anggota Tim', 'Jabatan / Posisi', 'Bidang / Seksi', 'Total', 'Selesai', 'Belum', 'Terlambat', 'Capaian (%)']],
        body: memberTableData,
        theme: 'striped',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 26 },
            1: { cellWidth: 155, fontStyle: 'bold' },
            2: { cellWidth: 175 },
            3: { cellWidth: 145 },
            4: { halign: 'center', cellWidth: 50 },
            5: { halign: 'center', cellWidth: 50 },
            6: { halign: 'center', cellWidth: 50 },
            7: { halign: 'center', cellWidth: 55 },
            8: { halign: 'center', cellWidth: 55, fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            if (data.row.index === memberTableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
            }
        }
    });

    // 5. BAGIAN II: RINCIAN TUGAS TERPILIH PER ANGGOTA
    let currentY = doc.lastAutoTable.finalY + 22;

    if (currentY > 480) {
        doc.addPage();
        currentY = 45;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('II. Rincian Seluruh Penugasan & Kegiatan Anggota Tim', 40, currentY);

    const taskTableData = tasksToExport.map((t, idx) => [
        idx + 1,
        t.petugasCanonicalName || t.petugas,
        t.jenis,
        t.judul,
        formatDateWIB(t.tanggal),
        formatDateWIB(t.deadline),
        t.status,
        t.slaStatus,
        `${t.progress}%`
    ]);

    doc.autoTable({
        startY: currentY + 10,
        margin: { left: 40, right: 40 },
        head: [['No', 'Anggota / PIC', 'Jenis', 'Uraian Tugas & Kegiatan', 'Tanggal', 'SLA / Tenggat', 'Status', 'SLA', 'Progres']],
        body: taskTableData,
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 7,
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 24 },
            1: { cellWidth: 100, fontStyle: 'bold' },
            2: { cellWidth: 70 },
            3: { cellWidth: 260 },
            4: { halign: 'center', cellWidth: 65 },
            5: { halign: 'center', cellWidth: 65 },
            6: { halign: 'center', cellWidth: 65 },
            7: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
            8: { halign: 'center', cellWidth: 48, fontStyle: 'bold' }
        }
    });

    // 6. LEMBAR PENGESAHAN
    let signY = doc.lastAutoTable.finalY + 25;
    if (signY > 460) {
        doc.addPage();
        signY = 45;
    }

    const tglSign = nowWIB.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const signX = pageWidth - 240;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Pontianak, ${tglSign}`, signX, signY);
    doc.text('Mengetahui,', signX, signY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text('Koordinator Tim Humas', signX, signY + 24);
    doc.text('BPS Provinsi Kalimantan Barat', signX, signY + 36);

    doc.setFont('helvetica', 'bold');
    doc.text('Dara Septika Natalia Anggraeni, SST, M.Sos.', signX, signY + 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('NIP. 198909112012112001', signX, signY + 97);

    // 7. FOOTER NOMOR HALAMAN RESMI
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Halaman ${i} dari ${pageCount} — Dokumen Resmi Sistem Informasi Manajemen Kehumasan BPS Provinsi Kalimantan Barat`,
            pageCenter,
            575,
            { align: 'center' }
        );
    }

    const cleanPeriodeName = periodeLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Laporan_Kinerja_Rekap_Tugas_Humas_BPS_Kalbar_${cleanPeriodeName}.pdf`;

    doc.save(fileName);
    if (typeof showToast === 'function') showToast(`Laporan PDF berhasil diunduh (${fileName})`, 'success');
};

/**
 * Cetak Laporan Langsung (Print Preview)
 */
window.printRekapReport = function() {
    window.print();
};

// -------------------------------------------------------------
// 10. INTEGRATED CALENDAR VIEW
// -------------------------------------------------------------
let calendarFilter = 'all';

// Helper: Tentukan kategori progres pengerjaan (belum: merah, proses: kuning, selesai: hijau)
function getCalendarProgressCategory(status, type, item) {
    if (!status && type === 'brs_rilis') {
        return 'proses';
    }
    const s = String(status || '').trim().toLowerCase();
    
    // Status Selesai / Terbit / Tayang / Siap
    if (
        s === 'selesai' || 
        s === 'done' || 
        s === 'posted' || 
        s === 'tayang' || 
        s === 'published' || 
        s === 'rilis' || 
        s === 'sudah' || 
        s === 'completed'
    ) {
        return 'selesai';
    }
    
    // Status Belum / Draft / Ditugaskan / Pending
    if (
        !s || 
        s === 'belum' || 
        s === 'belum mulai' || 
        s === 'draft' || 
        s === 'ditugaskan' || 
        s === 'pending' || 
        s === 'todo' || 
        s === 'to do' || 
        s === 'open'
    ) {
        return 'belum';
    }
    
    // Status Proses / Sedang Dikerjakan / Revisi / In Progress / On Progress
    return 'proses';
}

// Helper: Ambil styling warna badge berdasarkan progres
function getCalendarProgressStyle(progressCat) {
    if (progressCat === 'selesai') {
        return {
            color: 'bg-emerald-600',
            bgLight: 'bg-emerald-50 dark:bg-emerald-950/60',
            border: 'border-emerald-300 dark:border-emerald-800',
            text: 'text-emerald-700 dark:text-emerald-300',
            badgeBg: 'bg-emerald-500',
            label: 'Selesai'
        };
    }
    if (progressCat === 'proses') {
        return {
            color: 'bg-amber-500',
            bgLight: 'bg-amber-50 dark:bg-amber-950/60',
            border: 'border-amber-300 dark:border-amber-800',
            text: 'text-amber-700 dark:text-amber-300',
            badgeBg: 'bg-amber-500',
            label: 'Proses'
        };
    }
    // belum (merah)
    return {
        color: 'bg-rose-600',
        bgLight: 'bg-rose-50 dark:bg-rose-950/60',
        border: 'border-rose-300 dark:border-rose-800',
        text: 'text-rose-700 dark:text-rose-300',
        badgeBg: 'bg-rose-600',
        label: 'Belum'
    };
}

// Helper: Ambil nama petugas/PIC utama dari kegiatan
function getCalendarEventPic(item, type) {
    if (!item) return '-';
    if (type === 'rekap_rutin' || type === 'ad_hoc' || type === 'protokoler' || type === 'mc') {
        return item.petugas || '-';
    }
    if (type === 'brs_rilis') {
        return item.pic_poster_info || item.pic_doc_ruang || item.pic_doc_yt_zoom || item.petugas || '-';
    }
    if (type === 'hari_besar') {
        return item.pembuat_konten || item.pic || '-';
    }
    if (type === 'content') {
        return item['assign To'] || item.assignTo || item.assignedTo || item.pic || item.petugas || '-';
    }
    if (type === 'assignment') {
        return item.assigned_to || item.petugas || '-';
    }
    return item.petugas || item.pic || '-';
}

function renderIntegratedCalendar(container) {
    if (!window.calendarCurrentDate) {
        window.calendarCurrentDate = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    }
    if (!window.calendarMode) {
        window.calendarMode = 'month';
    }

    const isTim = currentUser && currentUser.role === 'tim';
    if (isTim) {
        calendarFilter = 'my';
    }

    const rawEvents = [];
    db.rekapRutin.forEach(e => {
        // Cegah duplikasi di kalender jika item ini berasal dari sinkronisasi Content Planner dan ada di contentPlanner
        const isFromPlanner = (e.linked_source === 'content_planner' || e.content_planner_id) ||
            ((e.hubungkan_content_planner || e.kegiatan) && (db.contentPlanner || []).some(cp =>
                (e.linked_id && String(cp.id) === String(e.linked_id)) ||
                (e.content_planner_id && String(cp.id) === String(e.content_planner_id)) ||
                (cp.judul && e.kegiatan && cp.judul.trim().toLowerCase() === e.kegiatan.trim().toLowerCase() && formatDateInput(cp.jadwal) === formatDateInput(e.tanggal))
            ));
        if (isFromPlanner) return;

        const cat = getCalendarProgressCategory(e.status, 'rekap_rutin', e);
        const style = getCalendarProgressStyle(cat);
        const pic = getCalendarEventPic(e, 'rekap_rutin');
        rawEvents.push({ 
            title: `[Rutin] ${e.kegiatan}`, 
            taskTitle: e.kegiatan,
            categoryLabel: 'Rutin',
            pic,
            date: formatDateInput(e.tanggal), 
            color: style.color, 
            progressCat: cat,
            progressLabel: style.label,
            type: 'rekap_rutin', 
            item: e 
        });
    });
    db.adHoc.forEach(e => {
        const cat = getCalendarProgressCategory(e.status, 'ad_hoc', e);
        const style = getCalendarProgressStyle(cat);
        const pic = getCalendarEventPic(e, 'ad_hoc');
        rawEvents.push({ 
            title: `[AdHoc] ${e.kegiatan}`, 
            taskTitle: e.kegiatan,
            categoryLabel: 'Ad Hoc',
            pic,
            date: formatDateInput(e.tanggal), 
            color: style.color, 
            progressCat: cat,
            progressLabel: style.label,
            type: 'ad_hoc', 
            item: e 
        });
    });
    db.protokoler.forEach(e => {
        const cat = getCalendarProgressCategory(e.status, 'protokoler', e);
        const style = getCalendarProgressStyle(cat);
        const pic = getCalendarEventPic(e, 'protokoler');
        rawEvents.push({ 
            title: `[Proto] ${e.kegiatan}`, 
            taskTitle: e.kegiatan,
            categoryLabel: 'Protokoler',
            pic,
            date: formatDateInput(e.tanggal), 
            color: style.color, 
            progressCat: cat,
            progressLabel: style.label,
            type: 'protokoler', 
            item: e 
        });
    });
    db.mc.forEach(e => {
        const cat = getCalendarProgressCategory(e.status, 'mc', e);
        const style = getCalendarProgressStyle(cat);
        const pic = getCalendarEventPic(e, 'mc');
        rawEvents.push({ 
            title: `[MC] ${e.kegiatan}`, 
            taskTitle: e.kegiatan,
            categoryLabel: 'MC',
            pic,
            date: formatDateInput(e.tanggal), 
            color: style.color, 
            progressCat: cat,
            progressLabel: style.label,
            type: 'mc', 
            item: e 
        });
    });
    db.brsRilis.forEach(e => {
        const cat = getCalendarProgressCategory(e.status, 'brs_rilis', e);
        const style = getCalendarProgressStyle(cat);
        const pic = getCalendarEventPic(e, 'brs_rilis');
        rawEvents.push({ 
            title: `[BRS] ${e.judul}`, 
            taskTitle: e.judul,
            categoryLabel: 'BRS Rilis',
            pic,
            date: formatDateInput(e.tanggal_rilis), 
            color: style.color, 
            progressCat: cat,
            progressLabel: style.label,
            type: 'brs_rilis', 
            item: e 
        });
    });
    db.hariBesar.forEach(e => {
        const cat = getCalendarProgressCategory(e.status, 'hari_besar', e);
        const style = getCalendarProgressStyle(cat);
        const pic = getCalendarEventPic(e, 'hari_besar');
        rawEvents.push({ 
            title: `[HariBesar] ${e.hari_besar}`, 
            taskTitle: e.hari_besar,
            categoryLabel: 'Hari Besar',
            pic,
            date: formatDateInput(e.tanggal), 
            color: style.color, 
            progressCat: cat,
            progressLabel: style.label,
            type: 'hari_besar', 
            item: e 
        });
    });
    db.contentPlanner.forEach(e => {
        // Cegah duplikasi jika berasal dari tautan rekap_rutin yang sudah terdaftar
        const isFromRutin = (e.linked_source === 'rekap_rutin') &&
            (db.rekapRutin || []).some(r =>
                (e.linked_id && String(r.id) === String(e.linked_id)) ||
                (r.kegiatan && e.judul && r.kegiatan.trim().toLowerCase() === e.judul.trim().toLowerCase() && formatDateInput(r.tanggal) === formatDateInput(e.jadwal))
            );
        if (isFromRutin) return;

        const cat = getCalendarProgressCategory(e.status, 'content', e);
        const style = getCalendarProgressStyle(cat);
        const pic = getCalendarEventPic(e, 'content');
        rawEvents.push({ 
            title: `[Konten] ${e.judul}`, 
            taskTitle: e.judul,
            categoryLabel: 'Konten',
            pic,
            date: formatDateInput(e.jadwal), 
            color: style.color, 
            progressCat: cat,
            progressLabel: style.label,
            type: 'content', 
            item: e 
        });
    });
    db.assignments.forEach(e => {
        const cat = getCalendarProgressCategory(e.status, 'assignment', e);
        const style = getCalendarProgressStyle(cat);
        const pic = getCalendarEventPic(e, 'assignment');
        rawEvents.push({ 
            title: `[Tugas] ${e.tugas}`, 
            taskTitle: e.tugas,
            categoryLabel: 'Tugas',
            pic,
            date: formatDateInput(e.deadline), 
            color: style.color, 
            progressCat: cat,
            progressLabel: style.label,
            type: 'assignment', 
            item: e 
        });
    });

    const events = [];
    const seenCalendarKeys = new Set();
    rawEvents.forEach(e => {
        const isMine = isTaskForCurrentUser(e.item) || (typeof isTaskAssignedToLoggedInUser === 'function' && isTaskAssignedToLoggedInUser(e.item, currentUser));
        if ((isTim || calendarFilter === 'my') && !isMine) return;

        // Deduplikasi event kalender agar satu kegiatan per hari untuk petugas yang sama tetap tampil tunggal (tidak ganda)
        const dStr = formatDateInput(e.date);
        const normTitle = (e.taskTitle || '').toLowerCase().replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
        const normPic = (e.pic || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
        const dedupKey = `${dStr}|${normTitle}|${normPic}`;
        if (seenCalendarKeys.has(dedupKey)) {
            return;
        }
        seenCalendarKeys.add(dedupKey);

        const isHighlighted = (calendarFilter === 'highlight' && isMine);

        events.push({
            ...e,
            isHighlighted,
            isMine
        });
    });

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    let headerTitle = '';
    let daysHtml = [];

    // Helper untuk membuat pill event dengan highlight NAMA PETUGAS -> PENUGASAN & warna sesuai status
    const buildEventPillHtml = (e) => {
        const fullTooltip = `[${e.progressLabel.toUpperCase()}] PIC: ${e.pic} | ${e.categoryLabel}: ${e.taskTitle}`;
        const picDisplay = (e.pic && e.pic !== '-') ? e.pic : 'PIC (-)';
        return `
            <div class="text-[8.5px] leading-tight font-medium ${e.color} text-white px-1.5 py-1 rounded-md truncate mt-1 shadow-xs cursor-pointer hover:brightness-110 transition-all ${e.isHighlighted ? 'ring-2 ring-amber-300 dark:ring-amber-400' : ''}" title="${fullTooltip}">
                ${e.isHighlighted ? '⭐ ' : ''}<strong class="font-black underline decoration-white/40 uppercase tracking-tight">${picDisplay}</strong>: <span class="opacity-95">${e.taskTitle}</span>
            </div>
        `;
    };

    if (window.calendarMode === 'month') {
        const currentMonth = window.calendarCurrentDate.getMonth();
        const currentYear = window.calendarCurrentDate.getFullYear();
        // getDay(): 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
        // Ubah ke format Senin = 0, Selasa = 1, ..., Minggu = 6
        const rawFirstDay = new Date(currentYear, currentMonth, 1).getDay();
        const firstDay = rawFirstDay === 0 ? 6 : rawFirstDay - 1;
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        headerTitle = `${monthNames[currentMonth]} ${currentYear}`;

        for (let i = 0; i < firstDay; i++) {
            daysHtml.push(`<div class="h-28 border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 p-1"></div>`);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date && e.date.includes(dateStr));
            dayEvents.sort((a, b) => {
                const doneA = a.progressCat === 'selesai' ? 1 : 0;
                const doneB = b.progressCat === 'selesai' ? 1 : 0;
                return doneA - doneB;
            });
            const eventsListHtml = dayEvents.map(e => buildEventPillHtml(e)).join('');

            const todayWIBStr = formatDateInput(typeof getNowWIB === 'function' ? getNowWIB() : new Date());
            const isToday = dateStr === todayWIBStr;

            daysHtml.push(`
                <div onclick="showCalendarDayEvents('${dateStr}')" class="h-28 border border-slate-100 dark:border-slate-800 p-2 bg-white dark:bg-slate-850 flex flex-col justify-between overflow-y-auto cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-slate-800/80 hover:border-indigo-200 dark:hover:border-slate-700 transition-all ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-black ${isToday ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-350'}">${d}</span>
                        ${dayEvents.length > 0 ? `<span class="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${dayEvents.length}</span>` : ''}
                    </div>
                    <div class="flex-1 overflow-y-auto mt-1 space-y-0.5">${eventsListHtml}</div>
                </div>
            `);
        }
    } else {
        // Mode Mingguan: Senin s/d Minggu (misal: 12 - 18 Oktober 2026)
        const curr = new Date(window.calendarCurrentDate);
        const dayOfWeek = curr.getDay(); // 0: Min, 1: Sen, 2: Sel, ... 6: Sab
        // Hitung jarak mundur ke hari Senin (Senin = 1, Minggu = 0 -> mundur 6 hari)
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        const startOfWeek = new Date(curr);
        startOfWeek.setDate(curr.getDate() + diffToMonday);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (startOfWeek.getFullYear() === endOfWeek.getFullYear()) {
            if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                headerTitle = `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
            } else {
                headerTitle = `${startOfWeek.getDate()} ${monthNames[startOfWeek.getMonth()]} - ${endOfWeek.getDate()} ${monthNames[endOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
            }
        } else {
            headerTitle = `${startOfWeek.getDate()} ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()} - ${endOfWeek.getDate()} ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
        }

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);

            const dateStrFixed = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date && e.date.includes(dateStrFixed));
            dayEvents.sort((a, b) => {
                const doneA = a.progressCat === 'selesai' ? 1 : 0;
                const doneB = b.progressCat === 'selesai' ? 1 : 0;
                return doneA - doneB;
            });
            const eventsListHtml = dayEvents.map(e => buildEventPillHtml(e)).join('');

            const todayWIBStr2 = formatDateInput(typeof getNowWIB === 'function' ? getNowWIB() : new Date());
            const isToday = dateStrFixed === todayWIBStr2;

            daysHtml.push(`
                <div onclick="showCalendarDayEvents('${dateStrFixed}')" class="h-64 border border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-850 flex flex-col justify-between overflow-y-auto cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-slate-800/80 hover:border-indigo-200 dark:hover:border-slate-700 transition-all ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-black ${isToday ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-350'}">${d.getDate()}</span>
                        <div class="flex items-center gap-1.5">
                            ${dayEvents.length > 0 ? `<span class="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${dayEvents.length}</span>` : ''}
                            <span class="text-[9px] font-bold text-slate-400">${monthNames[d.getMonth()].slice(0, 3)}</span>
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto mt-2 space-y-0.5">${eventsListHtml}</div>
                </div>
            `);
        }
    }

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <i class="fa-regular fa-calendar-days text-indigo-650 dark:text-indigo-400"></i>
                    Kalender Kegiatan Terintegrasi
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${isTim ? 'Jadwal agenda kegiatan dan penugasan harian khusus untuk akun Anda.' : 'Sorot nama petugas dan jadwal agenda harian BPS Kalbar berdasarkan progres pengerjaan.'}</p>
            </div>
            
            <!-- Calendar Filter Dropdown for My Tasks/Highlighting - Dihide untuk role tim -->
            ${!isTim ? `
            <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-2 rounded-2xl shadow-xs">
                <span class="text-[10px] text-slate-550 dark:text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-eye text-indigo-500"></i> Tampilan:</span>
                <select id="calendar-filter-select" onchange="handleCalendarFilterChange(this.value)" class="text-xs font-bold py-1 px-2.5 bg-slate-55 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="all" ${calendarFilter === 'all' ? 'selected' : ''}>Semua Agenda Tim</option>
                    <option value="my" ${calendarFilter === 'my' ? 'selected' : ''}>Hanya Agenda Saya</option>
                    <option value="highlight" ${calendarFilter === 'highlight' ? 'selected' : ''}>Sorot Agenda Saya (⭐)</option>
                </select>
            </div>
            ` : ''}
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs">
            <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
                <div class="flex items-center gap-3">
                    <button onclick="prevCalendar()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-150 dark:border-slate-700 text-slate-605 dark:text-slate-200 transition-all shadow-xs" title="Sebelumnya"><i class="fa-solid fa-chevron-left text-xs"></i></button>
                    <h3 class="font-black text-slate-800 dark:text-white text-base uppercase tracking-wider min-w-[180px] text-center sm:text-left">${headerTitle}</h3>
                    <button onclick="nextCalendar()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-150 dark:border-slate-700 text-slate-605 dark:text-slate-200 transition-all shadow-xs" title="Berikutnya"><i class="fa-solid fa-chevron-right text-xs"></i></button>
                    <button onclick="todayCalendar()" class="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all ml-1" title="Kembali ke hari ini">Hari Ini</button>
                </div>

                <div class="flex items-center flex-wrap justify-between sm:justify-end gap-2.5">
                    ${(currentUser && (currentUser.role === 'admin' || currentUser.role === 'koordinator')) ? `
                        <button onclick="openCalendarReminderModal()" class="btn-primary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 font-bold uppercase tracking-wider shadow-xs hover:shadow-md transition-all" title="Rekapan pengingat penugasan untuk dibagikan ke tim">
                            <i class="fa-solid fa-bell"></i>
                            <span>Rekapan Reminder</span>
                        </button>
                    ` : ''}
                    <div class="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-750 shrink-0">
                        <button onclick="changeCalendarMode('month')" class="px-4 py-1.5 rounded-lg transition-all ${window.calendarMode === 'month' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-655 dark:text-white' : 'text-slate-550 dark:text-slate-400'}">Bulanan</button>
                        <button onclick="changeCalendarMode('week')" class="px-4 py-1.5 rounded-lg transition-all ${window.calendarMode === 'week' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-655 dark:text-white' : 'text-slate-555 dark:text-slate-400'}">Mingguan</button>
                    </div>
                </div>
            </div>

            <!-- Legend Warna Berdasarkan Progres Pengerjaan -->
            <div class="text-[10px] font-extrabold uppercase tracking-wider flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-6 border-b border-slate-100 dark:border-slate-750 pb-4">
                <div class="flex flex-wrap items-center gap-2 sm:gap-4">
                    <span class="text-slate-400 dark:text-slate-500 font-bold normal-case text-xs">Indikator Progres:</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold">
                        <span class="w-2.5 h-2.5 bg-rose-600 rounded-full mr-1.5 shadow-xs shrink-0"></span> Belum Selesai
                    </span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 font-bold">
                        <span class="w-2.5 h-2.5 bg-amber-500 rounded-full mr-1.5 shadow-xs shrink-0"></span> Sedang Proses
                    </span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-bold">
                        <span class="w-2.5 h-2.5 bg-emerald-600 rounded-full mr-1.5 shadow-xs shrink-0"></span> Selesai
                    </span>
                </div>
                <div class="text-[10px] text-slate-400 font-semibold normal-case">
                    Format: <span class="font-black text-slate-600 dark:text-slate-300 uppercase">[NAMA PETUGAS]</span>: Penugasan Kegiatan
                </div>
            </div>

            <!-- Calendar grid: wrapped in overflow container for mobile -->
            <div class="overflow-x-auto -mx-1">
                <div class="min-w-[460px] sm:min-w-full">
                    <div class="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 text-center text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 py-3 rounded-t-2xl shrink-0">
                        <div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div><div>Min</div>
                    </div>

                    <div class="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-b-2xl overflow-hidden shadow-xs border-r border-l border-b border-slate-200 dark:border-slate-700">
                        ${daysHtml.join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.handleCalendarFilterChange = function(val) {
    calendarFilter = val;
    router(currentState);
};

window.prevCalendar = function () {
    if (window.calendarMode === 'month') {
        window.calendarCurrentDate.setMonth(window.calendarCurrentDate.getMonth() - 1);
    } else {
        window.calendarCurrentDate.setDate(window.calendarCurrentDate.getDate() - 7);
    }
    router(currentState);
};

window.nextCalendar = function () {
    if (window.calendarMode === 'month') {
        window.calendarCurrentDate.setMonth(window.calendarCurrentDate.getMonth() + 1);
    } else {
        window.calendarCurrentDate.setDate(window.calendarCurrentDate.getDate() + 7);
    }
    router(currentState);
};

window.todayCalendar = function () {
    window.calendarCurrentDate = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    router(currentState);
};

window.changeCalendarMode = function (mode) {
    window.calendarMode = mode;
    router(currentState);
};

window.showCalendarDayEvents = function (dateStr) {
    const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const dayEvents = [];

    const pushDayEvent = (type, label, title, pic, status, item) => {
        const cat = getCalendarProgressCategory(status, type, item);
        const style = getCalendarProgressStyle(cat);
        dayEvents.push({
            type,
            label,
            title,
            pic: (pic && pic !== '-') ? pic : 'Belum Ditugaskan',
            status: status || style.label,
            progressCat: cat,
            progressLabel: style.label,
            color: style.color,
            bgLight: style.bgLight,
            border: style.border,
            textColor: style.text,
            badgeBg: style.badgeBg,
            item
        });
    };

    db.rekapRutin.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            // Cegah duplikasi di kalender jika item ini berasal dari sinkronisasi Content Planner dan ada di contentPlanner
            const isFromPlanner = (e.linked_source === 'content_planner' || e.content_planner_id) ||
                ((e.hubungkan_content_planner || e.kegiatan) && (db.contentPlanner || []).some(cp =>
                    (e.linked_id && String(cp.id) === String(e.linked_id)) ||
                    (e.content_planner_id && String(cp.id) === String(e.content_planner_id)) ||
                    (cp.judul && e.kegiatan && cp.judul.trim().toLowerCase() === e.kegiatan.trim().toLowerCase() && formatDateInput(cp.jadwal).includes(dateStr))
                ));
            if (!isFromPlanner) {
                pushDayEvent('rekap_rutin', 'Rutin', e.kegiatan, e.petugas, e.status, e);
            }
        }
    });

    db.adHoc.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            pushDayEvent('ad_hoc', 'Ad Hoc', e.kegiatan, e.petugas, e.status, e);
        }
    });

    db.protokoler.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            pushDayEvent('protokoler', 'Protokoler', e.kegiatan, e.petugas, e.status, e);
        }
    });

    db.mc.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            pushDayEvent('mc', 'MC', e.kegiatan, e.petugas, e.status, e);
        }
    });

    db.brsRilis.forEach(e => {
        if (e.tanggal_rilis && formatDateInput(e.tanggal_rilis).includes(dateStr)) {
            const pic = e.pic_poster_info || e.pic_doc_ruang || e.pic_doc_yt_zoom || e.petugas || '-';
            pushDayEvent('brs_rilis', 'BRS Rilis', e.judul, pic, e.status || 'Rilis', e);
        }
    });

    db.hariBesar.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            pushDayEvent('hari_besar', 'Hari Besar', e.hari_besar, e.pembuat_konten || e.pic, e.status, e);
        }
    });

    db.contentPlanner.forEach(e => {
        if (e.jadwal && formatDateInput(e.jadwal).includes(dateStr)) {
            const isFromRutin = (e.linked_source === 'rekap_rutin') &&
                (db.rekapRutin || []).some(r =>
                    (e.linked_id && String(r.id) === String(e.linked_id)) ||
                    (r.kegiatan && e.judul && r.kegiatan.trim().toLowerCase() === e.judul.trim().toLowerCase() && formatDateInput(r.tanggal).includes(dateStr))
                );
            if (!isFromRutin) {
                const pic = e['assign To'] || e.assignTo || e.assignedTo || e.pic || e.petugas || '-';
                pushDayEvent('content', 'Konten', e.judul, pic, e.status, e);
            }
        }
    });

    db.assignments.forEach(e => {
        if (e.deadline && formatDateInput(e.deadline).includes(dateStr)) {
            pushDayEvent('assignment', 'Tugas', e.tugas, e.assigned_to || e.petugas, e.status, e);
        }
    });

    // Apply calendar filtering on day details modal too!
    let filteredDayEvents = dayEvents;
    const isTim = currentUser && currentUser.role === 'tim';
    if (isTim || calendarFilter === 'my') {
        filteredDayEvents = dayEvents.filter(ev => isTaskForCurrentUser(ev.item) || (typeof isTaskAssignedToLoggedInUser === 'function' && isTaskAssignedToLoggedInUser(ev.item, currentUser)));
    }

    // Deduplikasi detail agenda harian agar satu kegiatan tidak tampil berulang
    const seenDayKeys = new Set();
    filteredDayEvents = filteredDayEvents.filter(ev => {
        const normTitle = (ev.title || '').toLowerCase().replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
        const normPic = (ev.pic || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
        const k = `${normTitle}|${normPic}`;
        if (seenDayKeys.has(k)) return false;
        seenDayKeys.add(k);
        return true;
    });

    // Urutkan detail harian: yang selesai di bawah, yang proses/belum selesai di atas
    filteredDayEvents.sort((a, b) => {
        const doneA = a.progressCat === 'selesai' ? 1 : 0;
        const doneB = b.progressCat === 'selesai' ? 1 : 0;
        return doneA - doneB;
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'calendar-day-modal';

    let listContent = '';
    if (filteredDayEvents.length === 0) {
        listContent = `
            <div class="py-12 text-center text-slate-400 dark:text-slate-500">
                <i class="fa-regular fa-calendar-minus text-4xl mb-3 opacity-60"></i>
                <p class="text-xs font-bold">Tidak ada agenda atau penugasan kegiatan.</p>
            </div>
        `;
    } else {
        listContent = `
            <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
                ${filteredDayEvents.map(ev => {
                    const isMine = isTaskForCurrentUser(ev.item);
                    const isHighlighted = calendarFilter === 'highlight' && isMine;
                    return `
                        <div class="p-3.5 bg-white dark:bg-slate-900 border ${isHighlighted ? 'ring-2 ring-amber-400 border-amber-400 dark:border-amber-500 shadow-md' : 'border-slate-200 dark:border-slate-750'} rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer flex flex-col justify-between" onclick="closeCalendarDayModal(); showDetailFromCalendar('${ev.type}', ${ev.item.id})">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-1.5">
                                    <span class="px-2 py-0.5 ${ev.badgeBg} text-white font-black text-[8.5px] rounded uppercase tracking-wider shadow-xs flex items-center gap-1">
                                        <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                        ${ev.progressLabel}
                                    </span>
                                    <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-[8.5px] rounded uppercase tracking-wider">${ev.label}</span>
                                    ${isHighlighted ? '<span class="text-xs">⭐</span>' : ''}
                                </div>
                                <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">${ev.status || '-'}</span>
                            </div>

                            <!-- Sorotan Utama: Nama yang ditugaskan (PIC) -->
                            <div class="mb-1.5 p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 flex items-center justify-between">
                                <div class="flex items-center gap-2 min-w-0">
                                    <div class="w-6 h-6 rounded-full ${ev.badgeBg} text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs">
                                        ${getPicInitials(ev.pic)}
                                    </div>
                                    <div class="min-w-0">
                                        <div class="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Petugas Ditugaskan:</div>
                                        <div class="text-xs font-black text-slate-900 dark:text-white truncate">${ev.pic}</div>
                                    </div>
                                </div>
                                ${isMine ? `<span class="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded shrink-0">Milik Anda</span>` : ''}
                            </div>

                            <!-- Penugasan Kegiatan -->
                            <div class="mt-1">
                                <div class="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">Penugasan:</div>
                                <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">${ev.title}</h4>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content p-6 max-w-md border border-slate-100 dark:border-slate-750 shadow-2xl">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Agenda Harian</h3>
                    <h4 class="text-xs font-black text-slate-900 dark:text-white mt-1">${formattedDate}</h4>
                </div>
                <button onclick="closeCalendarDayModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            ${listContent}
            <div class="mt-6 flex justify-end">
                <button onclick="closeCalendarDayModal()" class="btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider">Tutup</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.closeCalendarDayModal = function () {
    const modal = document.getElementById('calendar-day-modal');
    if (modal) modal.remove();
};

window.showDetailFromCalendar = function (type, id) {
    if (typeof showDetailById === 'function') {
        showDetailById(type, id);
    } else {
        showToast('Gagal memuat modul rincian.', 'error');
    }
};

// -------------------------------------------------------------
// FITUR REKAPAN REMINDER PENUGASAN (BULANAN / MINGGUAN)
// -------------------------------------------------------------
window.openCalendarReminderModal = function (scopeOverride) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'koordinator')) {
        showToast('Fitur rekapan reminder hanya dapat diakses oleh Ketua Tim Humas dan Administrator.', 'warning');
        return;
    }

    if (scopeOverride) {
        window.calendarReminderScope = scopeOverride;
    }
    const activeScope = window.calendarReminderScope || 'month';

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const curr = new Date(window.calendarCurrentDate || new Date());
    const yr = curr.getFullYear();
    const mo = curr.getMonth();

    // 1. Rentang Sebulan Penuh
    const monthStartD = new Date(yr, mo, 1, 0, 0, 0, 0);
    const monthEndD = new Date(yr, mo + 1, 0, 23, 59, 59, 999);
    const monthRangeLabel = `Bulan ${monthNames[mo]} ${yr}`;

    // 2. Rentang Mingguan
    const dayOfWeek = curr.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStartD = new Date(curr);
    weekStartD.setDate(curr.getDate() + diffToMonday);
    weekStartD.setHours(0, 0, 0, 0);

    const weekEndD = new Date(weekStartD);
    weekEndD.setDate(weekStartD.getDate() + 6);
    weekEndD.setHours(23, 59, 59, 999);

    let weekRangeLabel = '';
    let weekRangeShortLabel = '';
    if (weekStartD.getFullYear() === weekEndD.getFullYear()) {
        if (weekStartD.getMonth() === weekEndD.getMonth()) {
            weekRangeLabel = `Minggu Ini (${weekStartD.getDate()} - ${weekEndD.getDate()} ${monthNames[weekStartD.getMonth()]} ${weekStartD.getFullYear()})`;
            weekRangeShortLabel = `${weekStartD.getDate()} - ${weekEndD.getDate()} ${monthNames[weekStartD.getMonth()].slice(0, 3)}`;
        } else {
            weekRangeLabel = `Minggu Ini (${weekStartD.getDate()} ${monthNames[weekStartD.getMonth()]} - ${weekEndD.getDate()} ${monthNames[weekEndD.getMonth()]} ${weekStartD.getFullYear()})`;
            weekRangeShortLabel = `${weekStartD.getDate()} ${monthNames[weekStartD.getMonth()].slice(0, 3)} - ${weekEndD.getDate()} ${monthNames[weekEndD.getMonth()].slice(0, 3)}`;
        }
    } else {
        weekRangeLabel = `Minggu Ini (${weekStartD.getDate()} ${monthNames[weekStartD.getMonth()]} ${weekStartD.getFullYear()} - ${weekEndD.getDate()} ${monthNames[weekEndD.getMonth()]} ${weekEndD.getFullYear()})`;
        weekRangeShortLabel = `${weekStartD.getDate()} ${monthNames[weekStartD.getMonth()].slice(0, 3)} '${String(weekStartD.getFullYear()).slice(2)} - ${weekEndD.getDate()} ${monthNames[weekEndD.getMonth()].slice(0, 3)} '${String(weekEndD.getFullYear()).slice(2)}`;
    }

    let startD, endD, rangeLabel;
    if (activeScope === 'week') {
        startD = weekStartD;
        endD = weekEndD;
        rangeLabel = weekRangeLabel;
    } else {
        startD = monthStartD;
        endD = monthEndD;
        rangeLabel = monthRangeLabel;
    }

    // Kumpulkan seluruh agenda terintegrasi
    const items = [];

    const checkDateInRange = (dateVal) => {
        if (!dateVal) return false;
        const d = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dateVal) : new Date(dateVal);
        if (!d || isNaN(d.getTime())) return false;
        return d >= startD && d <= endD;
    };

    db.rekapRutin.forEach(e => {
        const rawDate = e.tanggal || e.jadwal;
        if (checkDateInRange(rawDate)) {
            // Cegah duplikasi jika berasal dari Content Planner
            const isFromPlanner = (e.linked_source === 'content_planner' || e.content_planner_id) ||
                ((e.hubungkan_content_planner || e.kegiatan) && (db.contentPlanner || []).some(cp =>
                    (e.linked_id && String(cp.id) === String(e.linked_id)) ||
                    (e.content_planner_id && String(cp.id) === String(e.content_planner_id)) ||
                    (cp.judul && e.kegiatan && cp.judul.trim().toLowerCase() === e.kegiatan.trim().toLowerCase())
                ));
            if (!isFromPlanner) {
                items.push({
                    date: formatDateInput(rawDate),
                    type: 'Rutin',
                    title: e.kegiatan,
                    pic: e.petugas || 'Belum Ditugaskan',
                    status: e.status || 'Ditugaskan',
                    detail: e.rubrikasi || ''
                });
            }
        }
    });

    db.adHoc.forEach(e => {
        const rawDate = e.tanggal || e.jadwal;
        if (checkDateInRange(rawDate)) {
            items.push({
                date: formatDateInput(rawDate),
                type: 'Ad Hoc',
                title: e.kegiatan,
                pic: e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Ditugaskan',
                detail: e.keterangan || ''
            });
        }
    });

    db.protokoler.forEach(e => {
        const rawDate = e.tanggal || e.jadwal;
        if (checkDateInRange(rawDate)) {
            items.push({
                date: formatDateInput(rawDate),
                type: 'Protokoler',
                title: e.kegiatan,
                pic: e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Ditugaskan',
                detail: `${e.lokasi || '-'} (${e.jam_mulai ? formatTime(e.jam_mulai) : '-'})`
            });
        }
    });

    db.mc.forEach(e => {
        const rawDate = e.tanggal || e.jadwal;
        if (checkDateInRange(rawDate)) {
            items.push({
                date: formatDateInput(rawDate),
                type: 'MC',
                title: e.kegiatan,
                pic: e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Ditugaskan',
                detail: `${e.lokasi || '-'} (${e.jam_mulai ? formatTime(e.jam_mulai) : '-'})`
            });
        }
    });

    db.brsRilis.forEach(e => {
        const rawDate = e.tanggal_rilis || e.tanggal || e.jadwal;
        if (checkDateInRange(rawDate)) {
            const pic = e.pic_poster_info || e.pic_doc_ruang || e.pic_doc_yt_zoom || e.petugas || 'Belum Ditugaskan';
            items.push({
                date: formatDateInput(rawDate),
                type: 'BRS Rilis',
                title: e.judul,
                pic,
                status: e.status || 'Rilis',
                detail: e.highlight || ''
            });
        }
    });

    db.hariBesar.forEach(e => {
        const rawDate = e.tanggal || e.jadwal;
        if (checkDateInRange(rawDate)) {
            items.push({
                date: formatDateInput(rawDate),
                type: 'Hari Besar',
                title: e.hari_besar,
                pic: e.pembuat_konten || e.pic || 'Belum Ditugaskan',
                status: e.status || 'Draft',
                detail: e.jenis_media || 'Instagram'
            });
        }
    });

    db.contentPlanner.forEach(e => {
        const rawDate = e.jadwal || e.tanggal_posting || e.tanggal;
        if (checkDateInRange(rawDate)) {
            const isFromRutin = (e.linked_source === 'rekap_rutin') &&
                (db.rekapRutin || []).some(r =>
                    (e.linked_id && String(r.id) === String(e.linked_id)) ||
                    (r.kegiatan && e.judul && r.kegiatan.trim().toLowerCase() === e.judul.trim().toLowerCase())
                );
            if (!isFromRutin) {
                const pic = e['assign To'] || e.assignTo || e.assignedTo || e.pic || e.petugas || 'Belum Ditugaskan';
                items.push({
                    date: formatDateInput(rawDate),
                    type: 'Konten',
                    title: e.judul,
                    pic,
                    status: e.status || 'Draft',
                    detail: `${e.media_post || e.media || 'Instagram'} - ${formatTime(e.jam_posting || '09:00')}`
                });
            }
        }
    });

    db.assignments.forEach(e => {
        const rawDate = e.deadline || e.tanggal_penugasan || e.tanggal;
        if (checkDateInRange(rawDate)) {
            items.push({
                date: formatDateInput(rawDate),
                type: 'Tugas',
                title: e.tugas,
                pic: e.assigned_to || e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Belum Mulai',
                detail: `Prioritas: ${e.prioritas || 'Sedang'}`
            });
        }
    });

    // Deduplikasi items reminder agar setiap agenda tercatat tepat satu kali
    const seenReminderKeys = new Set();
    const uniqueItems = [];
    items.forEach(it => {
        const normTitle = (it.title || '').toLowerCase().replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
        const normPic = (it.pic || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
        const k = `${it.date}|${normTitle}|${normPic}`;
        if (seenReminderKeys.has(k)) return;
        seenReminderKeys.add(k);
        uniqueItems.push(it);
    });
    items.length = 0;
    items.push(...uniqueItems);

    // Helper deteksi status selesai
    const isCompletedStatus = (statusStr) => {
        const s = String(statusStr || '').toLowerCase().trim();
        return s === 'selesai' || s === 'done' || s === 'posted' || s === 'rilis' || s === 'published' || s === 'sudah' || s === 'completed';
    };

    // Urutkan item: Yang belum selesai ditaruh di atas (berdasarkan tanggal terdekat),
    // Yang sudah selesai ditaruh di bagian bawah
    items.sort((a, b) => {
        const doneA = isCompletedStatus(a.status) ? 1 : 0;
        const doneB = isCompletedStatus(b.status) ? 1 : 0;
        if (doneA !== doneB) {
            return doneA - doneB; // 0 (belum selesai) duluan di atas, 1 (selesai) di bawah
        }
        return a.date > b.date ? 1 : (a.date < b.date ? -1 : 0);
    });

    // Susun format teks rapi siap salin (cocok untuk WhatsApp / Telegram / Catatan)
    let reminderText = `🔔 *PENGINGAT PENUGASAN HUMAS BPS PROVINSI KALBAR*\n`;
    reminderText += `📅 Periode: *${rangeLabel}*\n`;
    reminderText += `📊 Total Agenda: ${items.length} penugasan\n`;
    reminderText += `--------------------------------------------------\n\n`;

    if (items.length === 0) {
        reminderText += `(Tidak ada penugasan atau agenda yang terjadwal pada periode ini)\n\n`;
    } else {
        const upcomingItems = items.filter(it => !isCompletedStatus(it.status));
        const completedItems = items.filter(it => isCompletedStatus(it.status));

        // 1. BAGIAN AGENDA YANG AKAN DILAKSANAKAN / DALAM PROSES (WAKTU TERDEKAT)
        if (upcomingItems.length > 0) {
            reminderText += `📌 *AGENDA AKAN DILAKSANAKAN / PROSES (${upcomingItems.length})*:\n\n`;
            const groupedUpcoming = {};
            upcomingItems.forEach(it => {
                if (!groupedUpcoming[it.date]) groupedUpcoming[it.date] = [];
                groupedUpcoming[it.date].push(it);
            });

            Object.keys(groupedUpcoming).sort().forEach(dStr => {
                const dObj = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : new Date(dStr);
                const hari = dayNames[dObj.getDay()];
                const tglFormatted = `${dObj.getDate()} ${monthNames[dObj.getMonth()]} ${dObj.getFullYear()}`;
                reminderText += `🗓️ *${hari}, ${tglFormatted}*:\n`;

                groupedUpcoming[dStr].forEach((it, idx) => {
                    reminderText += `  ${idx + 1}. [${it.type}] *${it.pic}*\n`;
                    reminderText += `     ↳ Kegiatan: ${it.title}\n`;
                    if (it.detail) reminderText += `     ↳ Info: ${it.detail}\n`;
                    reminderText += `     ↳ Status: ⏳ ${it.status}\n`;
                });
                reminderText += `\n`;
            });
        }

        // 2. BAGIAN AGENDA YANG SUDAH SELESAI (DILETAKKAN DI BAWAH)
        if (completedItems.length > 0) {
            reminderText += `✅ *AGENDA SELESAI / RILIS (${completedItems.length})*:\n\n`;
            const groupedCompleted = {};
            completedItems.forEach(it => {
                if (!groupedCompleted[it.date]) groupedCompleted[it.date] = [];
                groupedCompleted[it.date].push(it);
            });

            Object.keys(groupedCompleted).sort().forEach(dStr => {
                const dObj = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : new Date(dStr);
                const hari = dayNames[dObj.getDay()];
                const tglFormatted = `${dObj.getDate()} ${monthNames[dObj.getMonth()]} ${dObj.getFullYear()}`;
                reminderText += `🗓️ *${hari}, ${tglFormatted}*:\n`;

                groupedCompleted[dStr].forEach((it, idx) => {
                    reminderText += `  ${idx + 1}. [${it.type}] *${it.pic}*\n`;
                    reminderText += `     ↳ Kegiatan: ${it.title}\n`;
                    if (it.detail) reminderText += `     ↳ Info: ${it.detail}\n`;
                    reminderText += `     ↳ Status: ✅ ${it.status}\n`;
                });
                reminderText += `\n`;
            });
        }
    }

    reminderText += `--------------------------------------------------\n`;
    reminderText += `💡 _Mohon rekan-rekan tim memastikan kesiapan dan progres penugasan masing-masing. Terima kasih & semangat!_`;

    document.getElementById('calendar-reminder-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'calendar-reminder-modal';
    modal.innerHTML = `
        <div class="modal-content p-6 max-w-xl border border-slate-100 dark:border-slate-750 shadow-2xl relative">
            <button onclick="document.getElementById('calendar-reminder-modal')?.remove()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-all">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-lg">
                    <i class="fa-solid fa-bell"></i>
                </div>
                <div>
                    <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Rekapan Reminder Penugasan</h3>
                    <p class="text-[10px] text-slate-500 font-semibold">${rangeLabel} &bull; Siap Salin ke Grup Tim</p>
                </div>
            </div>

            <!-- Switch Mode Cakupan: Sebulan Penuh vs Minggu Ini -->
            <div class="flex items-center gap-1.5 mb-3 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-750">
                <button type="button" onclick="openCalendarReminderModal('month')" class="flex-1 py-1.5 px-3 rounded-lg text-center transition-all ${activeScope === 'month' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                    <i class="fa-solid fa-calendar-days mr-1.5"></i>Sebulan Penuh (${monthNames[mo]} ${yr})
                </button>
                <button type="button" onclick="openCalendarReminderModal('week')" class="flex-1 py-1.5 px-3 rounded-lg text-center transition-all ${activeScope === 'week' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                    <i class="fa-solid fa-calendar-week mr-1.5"></i>Minggu Ini (${weekRangeShortLabel})
                </button>
            </div>

            <div class="mb-3 flex items-center justify-between text-xs">
                <span class="text-[11px] font-bold text-slate-500">Format Pesan WhatsApp / Pengingat Tim:</span>
                <span class="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-[10px]">
                    ${items.length} Agenda Ditemukan
                </span>
            </div>

            <textarea id="calendar-reminder-textarea" readonly rows="12" class="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y select-all">${reminderText}</textarea>

            <div class="flex flex-col sm:flex-row gap-2.5 mt-5">
                <button type="button" onclick="copyCalendarReminderText()" id="btn-copy-reminder" class="flex-1 btn-primary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm">
                    <i class="fa-solid fa-copy"></i>
                    <span>Salin Teks Rekapan</span>
                </button>
                <button type="button" onclick="document.getElementById('calendar-reminder-modal')?.remove()" class="btn-secondary px-5 py-2.5 text-xs font-bold uppercase tracking-wider">
                    Tutup
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.copyCalendarReminderText = function () {
    const textarea = document.getElementById('calendar-reminder-textarea');
    if (!textarea) return;
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        showToast('Rekapan reminder penugasan berhasil disalin ke clipboard!', 'success');
        const btn = document.getElementById('btn-copy-reminder');
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Tersalin!</span>`;
            btn.classList.add('bg-emerald-600');
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = `<i class="fa-solid fa-copy"></i> <span>Salin Teks Rekapan</span>`;
                    btn.classList.remove('bg-emerald-600');
                }
            }, 2500);
        }
    }).catch(() => {
        document.execCommand('copy');
        showToast('Rekapan berhasil disalin!', 'success');
    });
};

// -------------------------------------------------------------
// 11. AUDIT TRAIL VIEW (DELETED)
// -------------------------------------------------------------

// -------------------------------------------------------------
// 12. CONFIGURATION & DATABASE BACKUP/RESTORE VIEW
// -------------------------------------------------------------
function renderSettingsPage(container) {
    container.innerHTML = `
        <div class="mb-8 animate-fade-in">
            <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Master & Database Settings</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Konfigurasi data master, kelola daftar pengguna sistem, serta backup & restore database.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <div>
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5"><i class="fa-solid fa-database text-indigo-500"></i> Backup & Restore</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">Cadangkan seluruh database cache lokal beserta pengaturan sistem ke file JSON. Anda juga dapat mengimpor file backup untuk memulihkan data sistem.</p>
                </div>
                <div class="space-y-4">
                    <button onclick="triggerDatabaseBackup()" class="w-full btn-primary py-2.5 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2">
                        <i class="fa-solid fa-download"></i> Backup Database (JSON)
                    </button>
                    <div class="border border-dashed border-slate-300 dark:border-slate-650 p-4 rounded-xl text-center">
                        <p class="text-[10px] font-bold text-slate-450 uppercase mb-3">Impor Data Restore</p>
                        <input type="file" id="db-restore-file" onchange="triggerDatabaseRestore(event)" class="hidden">
                        <label for="db-restore-file" class="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5">
                            <i class="fa-solid fa-upload"></i> Pilih File Cadangan
                        </label>
                    </div>
                </div>
            </div>

            <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <div>
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5"><i class="fa-solid fa-sliders text-indigo-500"></i> Data Master Konfigurasi</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Daftar Bidang / Seksi</p>
                            <div class="space-y-2 max-h-48 overflow-y-auto pr-1" id="master-bidang-list">
                                <!-- populated dynamically -->
                            </div>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Daftar Rubrikasi</p>
                            <div class="space-y-2 max-h-48 overflow-y-auto pr-1" id="master-rubrik-list">
                                <!-- populated dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                    <button onclick="openAddMasterModal()" class="btn-primary py-2 px-4 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-plus mr-1"></i> Tambah Master Data</button>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-205 dark:border-slate-700 p-6 mt-6 shadow-xs">
            <div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 class="font-bold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-1.5"><i class="fa-solid fa-user-gear text-indigo-500"></i> Kelola Pengguna & Hak Akses (RBAC)</h3>
                <button onclick="openModal('user_manager')" class="btn-primary py-2 px-4 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><i class="fa-solid fa-user-plus text-xs"></i> Tambah User</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left text-slate-655 dark:text-slate-300">
                    <thead class="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40 uppercase border-b border-slate-200 dark:border-slate-700 font-black tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Nama Lengkap</th>
                            <th class="px-6 py-4">Username</th>
                            <th class="px-6 py-4">Hak Akses Role</th>
                            <th class="px-6 py-4">Bidang/Seksi</th>
                            <th class="px-6 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                        ${db.users.map(u => {
        const uJson = JSON.stringify(u).replace(/"/g, '&quot;');
        return `
                                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                                    <td class="px-6 py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">${u.nama}</td>
                                    <td class="px-6 py-3 font-semibold text-slate-500 whitespace-nowrap">${u.username}</td>
                                    <td class="px-6 py-3 whitespace-nowrap"><span class="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-955 text-indigo-750 dark:text-indigo-300 border border-indigo-150 dark:border-indigo-900 rounded font-bold text-[9px] uppercase tracking-wide">${getRoleLabel(u.role)}</span></td>
                                    <td class="px-6 py-3 font-medium text-slate-500 whitespace-nowrap">${u.bidang || '-'}</td>
                                    <td class="px-6 py-3 whitespace-nowrap text-center">
                                        <div class="flex items-center justify-center gap-1">
                                            <button onclick="openModalById('user_manager', ${u.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                                            <button onclick="deleteItem('users', ${u.id})" ${u.username === 'admin' ? 'disabled' : ''} class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    drawMasterDataLists();
}

function drawMasterDataLists() {
    const bList = document.getElementById('master-bidang-list');
    const rList = document.getElementById('master-rubrik-list');
    if (!bList || !rList) return;

    const bidang = db.masterData.filter(m => m.kategori === 'Bidang');
    const rubrik = db.masterData.filter(m => m.kategori === 'Rubrikasi');

    bList.innerHTML = bidang.map(b => `
        <div class="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <span class="font-bold text-xs text-slate-750 dark:text-slate-350">${b.nama}</span>
            <button onclick="deleteItem('masterData', ${b.id})" class="text-slate-400 hover:text-rose-605 transition-colors"><i class="fa-solid fa-times-circle text-xs"></i></button>
        </div>
    `).join('');

    rList.innerHTML = rubrik.map(r => `
        <div class="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <span class="font-bold text-xs text-slate-750 dark:text-slate-350">${r.nama}</span>
            <button onclick="deleteItem('masterData', ${r.id})" class="text-slate-400 hover:text-rose-605 transition-colors"><i class="fa-solid fa-times-circle text-xs"></i></button>
        </div>
    `).join('');
}

// -------------------------------------------------------------
// PRESERVED VIEWS (TEAM, TICKETS, ASSETS, MONITORING)
// -------------------------------------------------------------
let teamSearch = '';
function renderTeam(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Direktori Tim Humas</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Daftar anggota tim struktural, jabatan, pembagian seksi kehumasan, dan kontak.</p>
            </div>
            ${!isKepala && isUserAdminOrKetua() ? `
                <button onclick="openModal('team')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-plus text-xs"></i> Tambah Anggota Tim
                </button>
            ` : ''}
        </div>

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full sm:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="team-search-input" oninput="handleTeamSearch(this.value)" value="${teamSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 dark:text-white transition-all" placeholder="Cari nama atau jabatan...">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" id="team-grid">
            <!-- Filled dynamically -->
        </div>
    `;

    drawTeamGrid();
}

function handleTeamSearch(val) {
    teamSearch = val;
    drawTeamGrid();
}

function drawTeamGrid() {
    const grid = document.getElementById('team-grid');
    if (!grid) return;

    let filtered = db.team;
    if (teamSearch.trim()) {
        const query = teamSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.nama && item.nama.toLowerCase().includes(query)) ||
            (item.jabatan && item.jabatan.toLowerCase().includes(query))
        );
    }

    const isKepala = currentUser.role === 'kepala';

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white dark:bg-slate-800 p-16 text-center text-slate-400 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-user-large-slash text-3xl mb-2 text-slate-350 dark:text-slate-750"></i>
                <p class="text-xs font-bold">Anggota tim tidak ditemukan.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(member => {
        const taskCount = db.contentPlanner.filter(c => (c['assign To'] === member.nama || c.assignTo === member.nama || c.assignedTo === member.nama || c.pic === member.nama)).length;
        const initials = getPicInitials(member.nama);
        const avatarBg = getAvatarBg(member.nama);
        const itemJson = JSON.stringify(member).replace(/"/g, '&quot;');

        let actionButtons = '';
        if (!isKepala && isUserAdminOrKetua()) {
            actionButtons = `
                <div class="flex items-center" onclick="event.stopPropagation()">
                    <button onclick="openModalById('team', ${member.id})" title="Edit Profil" class="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><i class="fa-solid fa-pen-to-square text-[10px]"></i></button>
                    <button onclick="deleteItem('team', ${member.id})" title="Hapus Profil" class="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-slate-850 rounded-2xl shadow-sm border border-slate-205 dark:border-slate-700 overflow-hidden hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 flex flex-col group">
                <div class="h-20 bg-gradient-to-r from-indigo-750 to-slate-900 dark:from-indigo-950 dark:to-slate-800 relative cursor-pointer" onclick="showDetailById('team', ${member.id})" title="Lihat Profil ${member.nama}">
                    <div class="absolute -bottom-6 left-5 w-14 h-14 rounded-2xl border-4 border-white dark:border-slate-855 shadow-md flex items-center justify-center text-sm font-black tracking-wider transition-transform duration-300 group-hover:scale-105 ${avatarBg}">
                        ${initials}
                    </div>
                </div>
                <div class="pt-8 pb-4 px-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="font-extrabold text-slate-800 dark:text-slate-100 text-sm hover:text-indigo-655 dark:hover:text-indigo-400 cursor-pointer transition-colors inline-block" onclick="showDetailById('team', ${member.id})" title="Lihat Profil ${member.nama}">${member.nama}</h3>
                        <p class="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 tracking-wider mt-0.5">${member.jabatan}</p>
                        <span class="inline-block mt-3 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-150 dark:border-slate-600 text-[9px] rounded-full uppercase font-bold tracking-wider">${member.bidang}</span>
                        <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">${member.tugas || 'Belum ada rincian tugas.'}</p>
                    </div>
                    <div class="flex items-center justify-between pt-3 mt-4 border-t border-slate-100 dark:border-slate-700">
                        <div class="flex items-center gap-3">
                            <div>
                                <p class="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Tugas Konten</p>
                                <p class="text-base font-black text-indigo-650 dark:text-indigo-400 mt-0.5">${taskCount}</p>
                            </div>
                            <button onclick="showDetailById('team', ${member.id})" class="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 mt-2.5" title="Lihat Rincian Kontak">
                                Rincian <i class="fa-solid fa-arrow-right text-[8px]"></i>
                            </button>
                        </div>
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

let ticketSearch = '';
let ticketMonthFilter = '';
let ticketStatusFilter = '';
let ticketTypeFilter = '';
let ticketPage = 1;
let ticketPageSize = 20;

window.changeTicketPage = function(p) {
    ticketPage = p;
    drawTicketsGrid();
};

window.changeTicketPageSize = function(s) {
    ticketPageSize = parseInt(s, 10);
    ticketPage = 1;
    drawTicketsGrid();
};

function renderTickets(container) {
    const isInternal = currentUser.role === 'pemohon';
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Permintaan Layanan Humas</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Sistem antrean permohonan publikasi infografis rilis, pembuatan video reels edukasi, dan dokumentasi acara.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                ${!isInternal ? `
                    <button onclick="exportTicketsReport('excel')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-255 shadow-xs">
                        <i class="fa-solid fa-file-excel"></i> Excel
                    </button>
                ` : ''}
                ${isInternal ? `
                    <button onclick="openTicketModal()" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Buat Pengajuan Layanan
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-205 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-405"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="ticket-search-input" oninput="handleTicketSearch(this.value)" value="${ticketSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 dark:text-white transition-all" placeholder="Cari judul, pengaju, detail, tanggal...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="ticket-month-select" oninput="handleTicketMonthFilter(this.value)" onchange="handleTicketMonthFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Bulan</option>
                    ${(() => {
                        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        const monthMap = new Map();
                        (db.tickets || []).forEach(t => {
                            const dFormatted = formatDateInput(t.deadline);
                            if (dFormatted && dFormatted.length >= 7) {
                                const key = dFormatted.slice(0, 7);
                                const [y, mon] = key.split('-');
                                const mIdx = parseInt(mon, 10) - 1;
                                if (mIdx >= 0 && mIdx < 12) {
                                    monthMap.set(key, `${monthNames[mIdx]} ${y}`);
                                }
                            }
                        });
                        const sortedKeys = Array.from(monthMap.keys()).sort().reverse();
                        return sortedKeys.map(k => `<option ${ticketMonthFilter === k ? 'selected' : ''} value="${k}">${monthMap.get(k)}</option>`).join('');
                    })()}
                </select>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-circle-notch mr-0.5 text-slate-450"></i> Status:</span>
                <select id="ticket-status-select" oninput="handleTicketStatusFilter(this.value)" onchange="handleTicketStatusFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Status</option>
                    <option ${ticketStatusFilter === 'Pending' ? 'selected' : ''} value="Pending">Pending</option>
                    <option ${ticketStatusFilter === 'Approved' ? 'selected' : ''} value="Approved">Disetujui</option>
                    <option ${ticketStatusFilter === 'Rejected' ? 'selected' : ''} value="Rejected">Ditolak</option>
                </select>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-0.5 text-slate-450"></i> Layanan:</span>
                <select id="ticket-type-select" oninput="handleTicketTypeFilter(this.value)" onchange="handleTicketTypeFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Layanan</option>
                    <option ${ticketTypeFilter === 'Infografis' ? 'selected' : ''} value="Infografis">Infografis / Poster</option>
                    <option ${ticketTypeFilter === 'Pembuatan Video' ? 'selected' : ''} value="Pembuatan Video">Pembuatan Video</option>
                    <option ${ticketTypeFilter === 'Peliputan' ? 'selected' : ''} value="Peliputan">Peliputan / Dokumentasi</option>
                    <option ${ticketTypeFilter === 'Desain Publikasi' ? 'selected' : ''} value="Desain Publikasi">Desain Publikasi</option>
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetTicketFilters()" class="w-full btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in" id="tickets-grid">
            <!-- Filled dynamically -->
        </div>
        <div id="tickets-pagination" class="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-205 dark:border-slate-700 overflow-hidden shadow-xs"></div>
    `;

    drawTicketsGrid();
}

window.handleTicketSearch = function(val) {
    ticketSearch = val;
    ticketPage = 1;
    drawTicketsGrid();
};

window.handleTicketMonthFilter = function(val) {
    ticketMonthFilter = val;
    ticketPage = 1;
    drawTicketsGrid();
};

window.handleTicketStatusFilter = function(val) {
    ticketStatusFilter = val;
    ticketPage = 1;
    drawTicketsGrid();
};

window.handleTicketTypeFilter = function(val) {
    ticketTypeFilter = val;
    ticketPage = 1;
    drawTicketsGrid();
};

window.resetTicketFilters = function() {
    ticketSearch = '';
    ticketMonthFilter = '';
    ticketStatusFilter = '';
    ticketTypeFilter = '';
    ticketPage = 1;
    const sInput = document.getElementById('ticket-search-input');
    if (sInput) sInput.value = '';
    const mSelect = document.getElementById('ticket-month-select');
    if (mSelect) mSelect.value = '';
    const stSelect = document.getElementById('ticket-status-select');
    if (stSelect) stSelect.value = '';
    const tpSelect = document.getElementById('ticket-type-select');
    if (tpSelect) tpSelect.value = '';
    drawTicketsGrid();
};

function drawTicketsGrid() {
    const grid = document.getElementById('tickets-grid');
    if (!grid) return;

    const isInternal = currentUser.role === 'pemohon';
    const isKepala = currentUser.role === 'kepala';

    let filtered = db.tickets;
    if (isInternal) {
        filtered = filtered.filter(t => t.pengaju.toLowerCase().includes(currentUser.name.toLowerCase()) || t.pengaju.toLowerCase().includes(currentUser.username.toLowerCase()));
    }
    if (currentUser.role === 'tim') {
        const timName = currentUser.name.toLowerCase();
        filtered = filtered.filter(t => (t.pic || '').toLowerCase().includes(timName) || (t.pic || '').toLowerCase().includes('staf'));
    }

    if (ticketSearch.trim()) {
        const query = ticketSearch.toLowerCase().trim();
        filtered = filtered.filter(item => {
            const dateStr = item.deadline || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            return (
                (item.judul && item.judul.toLowerCase().includes(query)) ||
                (item.pengaju && item.pengaju.toLowerCase().includes(query)) ||
                (item.detail && item.detail.toLowerCase().includes(query)) ||
                (item.pic && item.pic.toLowerCase().includes(query)) ||
                (item.jenis && item.jenis.toLowerCase().includes(query)) ||
                (item.bidang && item.bidang.toLowerCase().includes(query)) ||
                (item.status && item.status.toLowerCase().includes(query)) ||
                (dateStr && String(dateStr).toLowerCase().includes(query)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(query)) ||
                (dateInput && dateInput.toLowerCase().includes(query))
            );
        });
    }
    if (ticketMonthFilter) {
        filtered = filtered.filter(item => {
            const d = formatDateInput(item.deadline);
            return d && d.startsWith(ticketMonthFilter);
        });
    }
    if (ticketStatusFilter) {
        filtered = filtered.filter(item => item.status === ticketStatusFilter);
    }
    if (ticketTypeFilter) {
        filtered = filtered.filter(item => item.jenis === ticketTypeFilter);
    }

    // Urutan: tiket/tugas yang sudah selesai (Approved / Selesai / Rejected) diletakkan di bawah,
    // yang masih pending/akan diproses dengan batas waktu (deadline) terdekat berada di paling atas
    filtered.sort((a, b) => {
        const isDoneA = (a.status === 'Approved' || a.status === 'Selesai' || a.status === 'Rejected') ? 1 : 0;
        const isDoneB = (b.status === 'Approved' || b.status === 'Selesai' || b.status === 'Rejected') ? 1 : 0;
        if (isDoneA !== isDoneB) return isDoneA - isDoneB;

        const dateA = new Date(a.deadline || '9999-12-31').getTime();
        const dateB = new Date(b.deadline || '9999-12-31').getTime();
        return dateA - dateB;
    });

    const paginationContainer = document.getElementById('tickets-pagination');

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-555 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-ticket-simple text-4xl mb-2.5 text-slate-300 dark:text-slate-700"></i>
                <p class="text-xs font-bold">Tidak ada pengajuan tiket ditemukan.</p>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ticketPageSize));
    if (ticketPage > totalPages) ticketPage = totalPages;
    if (ticketPage < 1) ticketPage = 1;
    const startIndex = (ticketPage - 1) * ticketPageSize;
    const paginated = filtered.slice(startIndex, startIndex + ticketPageSize);

    grid.innerHTML = paginated.map(t => {
        const isDone = (t.status === 'Approved' || t.status === 'Selesai');
        let statusBadge = '';
        if (t.status === 'Pending') {
            statusBadge = `<span class="px-2.5 py-0.5 bg-amber-50 text-amber-750 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs"><span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>Pending</span>`;
        } else if (isDone) {
            statusBadge = `<span class="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs"><i class="fa-solid fa-check text-[9px]"></i>${t.status === 'Selesai' ? 'Selesai' : 'Disetujui'}</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs"><i class="fa-solid fa-times text-[9px]"></i>Ditolak</span>`;
        }

        let actions = '';
        if (isUserAdminOrKetua() && t.status === 'Pending' && !isKepala) {
            actions = `
                <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2 justify-end">
                    <button onclick="approveTicket(${t.id})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                        <i class="fa-solid fa-user-plus"></i> Setujui
                    </button>
                    <button onclick="rejectTicket(${t.id})" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 border border-rose-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                        <i class="fa-solid fa-ban"></i> Tolak
                    </button>
                </div>
            `;
        } else if (t.pic) {
            actions = `
                <div class="mt-4 pt-3 border-t ${isDone ? 'border-emerald-200/60 dark:border-emerald-800/60' : 'border-slate-100 dark:border-slate-700'} flex items-center gap-2 text-[10px] text-slate-500">
                    <div class="w-5.5 h-5.5 rounded-full ${getAvatarBg(t.pic)} flex items-center justify-center font-bold text-[8px] shadow-xs">${getPicInitials(t.pic)}</div>
                    <span>PIC: <strong class="${isDone ? 'text-emerald-900 dark:text-emerald-200 font-extrabold' : 'text-slate-800 dark:text-slate-200 font-bold'}">${t.pic}</strong></span>
                </div>
            `;
        } else if (t.status === 'Rejected') {
            actions = `
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] text-rose-650 font-bold flex items-center gap-1">
                    <i class="fa-solid fa-triangle-exclamation"></i> Pengajuan ditolak.
                </div>
            `;
        }

        const cardBg = isDone
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800 border-l-4 border-l-emerald-500 shadow-xs'
            : 'bg-white dark:bg-slate-850 border-slate-205 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300';

        return `
            <div class="${cardBg} p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between group">
                <div>
                    <div class="flex justify-between items-start gap-3">
                        <span class="px-2.5 py-0.5 ${isDone ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-650 dark:text-slate-300 border-slate-150 dark:border-slate-650'} border rounded-full text-[9px] uppercase font-bold tracking-wider">${t.jenis}</span>
                        ${statusBadge}
                    </div>
                    <h4 class="font-extrabold ${isDone ? 'text-emerald-950 dark:text-emerald-100' : 'text-slate-850 dark:text-slate-100'} text-sm leading-snug mt-3">${t.judul}</h4>
                    <p class="text-[10px] ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'} mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5"><i class="fa-regular fa-building text-slate-400"></i> ${t.pengaju} (${t.bidang})</p>
                    <p class="text-xs ${isDone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-655 dark:text-slate-350'} mt-2.5 leading-relaxed whitespace-pre-line">${t.detail}</p>
                </div>
                <div>
                    <div class="mt-4 pt-3 border-t ${isDone ? 'border-emerald-200/60 dark:border-emerald-800/60' : 'border-slate-100 dark:border-slate-700'} flex justify-between items-center text-[10px]">
                        <span class="${isDone ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'} flex items-center gap-1"><i class="fa-regular fa-calendar-xmark"></i> Batas: ${formatDate(t.deadline)}</span>
                        ${isUserAdminOrKetua() && !isKepala ? `
                            <button onclick="deleteItem('tickets', ${t.id})" title="Hapus Pengajuan" class="text-slate-400 hover:text-rose-600 transition-colors"><i class="fa-solid fa-trash text-xs"></i></button>
                        ` : ''}
                    </div>
                    ${actions}
                </div>
            </div>
        `;
    }).join('');

    renderPaginationControls({
        totalItems,
        currentPage: ticketPage,
        pageSize: ticketPageSize,
        onPageChangeFn: 'changeTicketPage',
        onPageSizeChangeFn: 'changeTicketPageSize',
        containerId: 'tickets-pagination'
    });

    window.exportTicketsReport = function (type) {
        const headers = ["Pengaju", "Seksi/Bidang", "Layanan", "Judul Pengajuan", "Batas Waktu", "Status", "PIC Ditunjuk"];
        const rows = filtered.map(item => [
            item.pengaju || '-',
            item.bidang || '-',
            item.jenis || '-',
            item.judul || '-',
            formatDate(item.deadline),
            item.status || '-',
            item.pic || '-'
        ]);

        if (type === 'csv') downloadCSV(headers, rows, `Tiket_Layanan_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Tiket_Layanan_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Daftar Pengajuan Layanan Humas Kalbar", headers, rows);
    };
}


// -------------------------------------------------------------
// 11. MODUL MEDIA MONITORING BPS KALBAR
// -------------------------------------------------------------
const MONITORING_MEDIA_TARGET = [
    'Antaranews',
    'Citra Khatulistiwa',
    'Cyber TV',
    'Fakta Kalbar',
    'Hi! Pontianak',
    'IDN Times',
    'Inside Pontianak',
    'Kapuas Post',
    'Klik Wartaku',
    'Matra Bisnis',
    'Media Kalbar News',
    'Pontianak Informasi',
    'Pontianak Post',
    'Prokal',
    'Republika Times',
    'RRI',
    'Sonora',
    'Tribun Pontianak'
];

/**
 * Mengembalikan daftar media secara dinamis:
 * Menggabungkan media target standar dengan seluruh media massa unik yang menampilkan berita BPS Kalbar
 */
function getAllMonitoringMediaList(articles = (typeof db !== 'undefined' && db.monitoring) || []) {
    const articleMedia = (articles || []).map(a => (a.media || a.sumber || '').trim()).filter(m => m && m !== 'Media Lainnya');
    const combinedSet = new Set([...MONITORING_MEDIA_TARGET, ...articleMedia]);
    return Array.from(combinedSet).sort((a, b) => {
        const aTarget = MONITORING_MEDIA_TARGET.indexOf(a);
        const bTarget = MONITORING_MEDIA_TARGET.indexOf(b);
        if (aTarget !== -1 && bTarget !== -1) return aTarget - bTarget;
        if (aTarget !== -1) return -1;
        if (bTarget !== -1) return 1;
        return a.localeCompare(b);
    });
}

const MONITORING_TOPIK_LIST = [
    "Inflasi",
    "Perdagangan",
    "Kemiskinan",
    "Indikator Strategis",
    "Ketenagakerjaan",
    "Luas Panen dan Produksi Padi",
    "Pertumbuhan Ekonomi",
    "Sektoral",
    "Ekspor Impor",
    "Indeks Pembangunan Manusia",
    "Kependudukan",
    "Rekrutmen CPNS",
    "Sensus Ekonomi 2026",
    "Transportasi",
    "Wisatawan Mancanegara",
    "Wisatawan Nusantara",
    "Ketimpangan Gender",
    "Nilai Tukar Petani",
    "Opini Publik Pegawai",
    "Indeks Demokrasi",
    "Indeks Kebahagiaan"
];

function normalizeMonitoringTopic(topik) {
    if (!topik) return 'Sektoral';
    const t = String(topik).trim();
    if (t === 'Rilis BRS' || t === 'Sensus Ekonomi 2026' || t === 'SE2026' || t === 'Sensus Ekonomi' || t === 'Sensus Ekonomi 2026 (SE2026)') {
        return 'Sensus Ekonomi 2026';
    }
    return t;
}

const ALL_MONITORING_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

let monitoringYear = 2026;
let monitoringStartMonth = 1; // 1 = Januari
let monitoringEndMonth = 10; // Dapat disesuaikan sampai rentang bulan manapun (1..12)

function getActiveMonitoringMonths() {
    return ALL_MONITORING_MONTHS.slice(monitoringStartMonth - 1, monitoringEndMonth);
}

function getMonitoringPeriodLabel() {
    const sName = ALL_MONITORING_MONTHS[monitoringStartMonth - 1] || 'Januari';
    const eName = ALL_MONITORING_MONTHS[monitoringEndMonth - 1] || 'Desember';
    return `${sName} s/d ${eName} ${monitoringYear}`;
}

const DRIVE_FOLDER_ID = '1NxW8FdEHG3fTOdSj7zd0EUnaCj81klHs';
const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}?usp=sharing`;

let monitoringActiveTab = 'media'; // 'media' | 'topik' | 'lampiran' | 'sentimen'
let monitoringSearch = '';
let monitoringMediaFilter = '';
let monitoringTopicFilter = '';
let monitoringMonthFilter = '';
let monitoringSentimentFilter = '';
let monitoringPage = 1;
const monitoringLimit = 10;
let isScrapingInProgress = false;

function renderMonitoring(container) {
    const isKepala = currentUser && currentUser.role === 'kepala';
    const canManageMonitoring = !!(currentUser && (currentUser.role === 'admin' || currentUser.role === 'koordinator'));

    // Synchronize authoritative monitoring data from server in background
    if (typeof syncMonitoringDataFromServer === 'function') {
        syncMonitoringDataFromServer().then((articles) => {
            if (articles && articles.length > 0) {
                updateMonitoringKpiCards();
                drawMonitoringCurrentView();
            }
        });
    }

    container.innerHTML = `
        <!-- HEADER & ACTIONS -->
        <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 animate-fade-in">
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                        <i class="fa-solid fa-newspaper mr-1"></i> BPS Kalbar ${monitoringYear}
                    </span>
                    <span class="text-[10px] text-slate-400 font-bold">&bull; Google News RSS & Drive Sync</span>
                </div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Media Monitoring Berita Massa</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Pemantauan otomatis pemberitaan BPS Provinsi Kalimantan Barat, rekapitulasi data per media & topik dengan rentang periode dinamis, serta sinkronisasi berkas laporan ke Google Drive resmi.
                </p>
            </div>
            <div class="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                ${canManageMonitoring ? `
                    <!-- RUN / UPDATE DATA BUTTON -->
                    <button onclick="runMonitoringScraper()" id="btn-run-scraper" class="btn-primary py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-xl transition-all border border-indigo-500/40">
                        <i class="fa-solid fa-arrows-rotate text-sm"></i>
                        <span>Run / Update Data Baru</span>
                    </button>
                    <!-- DOWNLOAD EXCEL -->
                    <button onclick="downloadMonitoringExcel()" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700">
                        <i class="fa-solid fa-file-excel text-emerald-600 text-sm"></i>
                        <span>Download Excel</span>
                    </button>
                    <!-- SYNC GOOGLE DRIVE -->
                    <button onclick="syncMonitoringToDriveUI()" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700" title="Sinkronkan laporan ke Google Drive">
                        <i class="fa-brands fa-google-drive text-amber-500 text-sm"></i>
                        <span>Sinkron ke Drive</span>
                    </button>
                    <!-- OPEN IN GOOGLE DRIVE -->
                    <a href="${DRIVE_FOLDER_URL}" target="_blank" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                        <i class="fa-solid fa-arrow-up-right-from-square text-indigo-500 text-xs"></i>
                        <span>Buka di Google Drive</span>
                    </a>
                ` : ''}
                ${!isKepala && isUserAdminOrKetua() ? `
                    <button onclick="openAddMonitoringModal()" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200" title="Tambah kliping manual">
                        <i class="fa-solid fa-plus text-xs"></i>
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- PERIODE BULAN PENYESUAIAN (CUSTOM RANGE TOOLBAR) -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap items-center gap-3">
                <span class="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <i class="fa-solid fa-calendar-range text-indigo-600 dark:text-indigo-400"></i> Penyesuaian Periode:
                </span>
                <div class="flex items-center gap-2 flex-wrap">
                    <select id="monitoring-year-select" onchange="changeMonitoringPeriod()" class="text-xs font-bold py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500">
                        <option value="2025" ${monitoringYear === 2025 ? 'selected' : ''}>Tahun 2025</option>
                        <option value="2026" ${monitoringYear === 2026 ? 'selected' : ''}>Tahun 2026</option>
                        <option value="2027" ${monitoringYear === 2027 ? 'selected' : ''}>Tahun 2027</option>
                    </select>
                    <span class="text-xs text-slate-400 font-bold">Bulan:</span>
                    <select id="monitoring-start-month-select" onchange="changeMonitoringPeriod()" class="text-xs font-bold py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500">
                        ${ALL_MONITORING_MONTHS.map((m, idx) => `<option value="${idx + 1}" ${monitoringStartMonth === idx + 1 ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                    <span class="text-xs text-slate-400 font-bold">s/d</span>
                    <select id="monitoring-end-month-select" onchange="changeMonitoringPeriod()" class="text-xs font-bold py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500">
                        ${ALL_MONITORING_MONTHS.map((m, idx) => `<option value="${idx + 1}" ${monitoringEndMonth === idx + 1 ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </div>
                <span class="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                    <i class="fa-solid fa-clock-rotate-left mr-1"></i> ${getMonitoringPeriodLabel()} (${getActiveMonitoringMonths().length} Bulan)
                </span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] text-slate-400 font-bold">Pilihan Cepat:</span>
                <button onclick="setQuickMonitoringPeriod(1, 10)" class="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all ${monitoringStartMonth === 1 && monitoringEndMonth === 10 ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-black' : ''}">
                    Jan - Okt
                </button>
                <button onclick="setQuickMonitoringPeriod(1, 12)" class="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all ${monitoringStartMonth === 1 && monitoringEndMonth === 12 ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-black' : ''}">
                    1 Tahun Penuh (Jan - Des)
                </button>
                <button onclick="setQuickMonitoringPeriod(1, Math.min(12, new Date().getMonth() + 1))" class="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all">
                    Bulan Berjalan
                </button>
            </div>
        </div>

        <!-- KPI SUMMARY CARDS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 font-sans" id="monitoring-kpi-cards">
            <!-- Populated dynamically -->
        </div>

        <!-- TAB NAVIGATION -->
        <div class="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 shadow-xs flex flex-wrap items-center gap-2">
            <button onclick="setMonitoringTab('media')" id="tab-btn-media" class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${monitoringActiveTab === 'media' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'}">
                <i class="fa-solid fa-tv text-xs"></i> Rekapitulasi Berdasarkan Media
            </button>
            <button onclick="setMonitoringTab('topik')" id="tab-btn-topik" class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${monitoringActiveTab === 'topik' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'}">
                <i class="fa-solid fa-tags text-xs"></i> Rekapitulasi Berdasarkan Topik
            </button>
            <button onclick="setMonitoringTab('lampiran')" id="tab-btn-lampiran" class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${monitoringActiveTab === 'lampiran' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'}">
                <i class="fa-solid fa-list-check text-xs"></i> Tabel Lampiran Riwayat Berita
            </button>
            <button onclick="setMonitoringTab('sentimen')" id="tab-btn-sentimen" class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${monitoringActiveTab === 'sentimen' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'}">
                <i class="fa-solid fa-chart-pie text-xs"></i> Sentimen & Proporsi
            </button>
        </div>

        <!-- MAIN CONTENT CONTAINER -->
        <div id="monitoring-tab-content" class="animate-fade-in">
            <!-- Filled dynamically -->
        </div>

        <!-- PROGRESS & SYNC MODAL CONTAINER -->
        <div id="monitoring-modal-container"></div>
    `;

    updateMonitoringKpiCards();
    drawMonitoringCurrentView();
}

window.changeMonitoringPeriod = function () {
    const yEl = document.getElementById('monitoring-year-select');
    const sEl = document.getElementById('monitoring-start-month-select');
    const eEl = document.getElementById('monitoring-end-month-select');
    if (yEl) monitoringYear = parseInt(yEl.value, 10) || 2026;
    if (sEl) monitoringStartMonth = Math.max(1, Math.min(12, parseInt(sEl.value, 10) || 1));
    if (eEl) monitoringEndMonth = Math.max(1, Math.min(12, parseInt(eEl.value, 10) || 10));

    if (monitoringStartMonth > monitoringEndMonth) {
        monitoringEndMonth = monitoringStartMonth;
        if (eEl) eEl.value = monitoringEndMonth;
    }

    monitoringMonthFilter = ''; // Reset specific month filter in lampiran
    monitoringPage = 1;

    updateMonitoringKpiCards();
    drawMonitoringCurrentView();
};

window.setQuickMonitoringPeriod = function (startM, endM) {
    monitoringStartMonth = startM;
    monitoringEndMonth = endM;
    const sEl = document.getElementById('monitoring-start-month-select');
    const eEl = document.getElementById('monitoring-end-month-select');
    if (sEl) sEl.value = startM;
    if (eEl) eEl.value = endM;
    changeMonitoringPeriod();
};

window.setMonitoringTab = function (tab) {
    monitoringActiveTab = tab;
    ['media', 'topik', 'lampiran', 'sentimen'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = 'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 bg-indigo-600 text-white shadow-sm';
            } else {
                btn.className = 'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60';
            }
        }
    });
    drawMonitoringCurrentView();
};

function updateMonitoringKpiCards() {
    const container = document.getElementById('monitoring-kpi-cards');
    if (!container) return;

    const allArticles = db.monitoring || [];
    
    // Filter articles within current year and active month range
    const activeArticles = allArticles.filter(a => {
        const d = new Date(a.tanggal || a.tanggal_rilis || `${monitoringYear}-01-01`);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return y === monitoringYear && m >= monitoringStartMonth && m <= monitoringEndMonth;
    });

    const periodTotal = activeArticles.length;
    const totalDatabaseCount = allArticles.length;

    // Unique media in active range
    const uniqueMedia = new Set(activeArticles.map(a => a.media).filter(Boolean));

    // Top topic in active range
    const topicCounts = {};
    activeArticles.forEach(a => {
        const t = normalizeMonitoringTopic(a.topik);
        topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
    let topTopicName = 'Sektoral';
    let topTopicMax = 0;
    Object.entries(topicCounts).forEach(([name, c]) => {
        if (c > topTopicMax) {
            topTopicMax = c;
            topTopicName = name;
        }
    });

    const posCount = activeArticles.filter(m => m.sentimen === 'Positif').length;
    const posPercent = periodTotal > 0 ? Math.round((posCount / periodTotal) * 100) : 0;

    container.innerHTML = `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
                <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Berita Periode</p>
                <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">${periodTotal} <span class="text-xs text-slate-400 font-bold">/ ${totalDatabaseCount} Total</span></p>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5"><i class="fa-solid fa-rss mr-1"></i>${ALL_MONITORING_MONTHS[monitoringStartMonth - 1].slice(0, 3)} - ${ALL_MONITORING_MONTHS[monitoringEndMonth - 1].slice(0, 3)} ${monitoringYear}</p>
            </div>
            <div class="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900 rounded-2xl flex items-center justify-center text-indigo-600 text-lg shadow-xs">
                <i class="fa-solid fa-newspaper"></i>
            </div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
                <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Media Terpantau</p>
                <p class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">${uniqueMedia.size} <span class="text-xs text-slate-400 font-bold">Media Massa</span></p>
                <p class="text-[10px] text-slate-500 font-semibold mt-0.5">Media aktif pada periode ini</p>
            </div>
            <div class="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-900 rounded-2xl flex items-center justify-center text-emerald-600 text-lg shadow-xs">
                <i class="fa-solid fa-bullhorn"></i>
            </div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
                <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Topik Terbanyak</p>
                <p class="text-base font-black text-slate-900 dark:text-white mt-1 truncate max-w-[130px]" title="${topTopicName}">${topTopicName}</p>
                <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">${topTopicMax} Berita Periode</p>
            </div>
            <div class="w-11 h-11 bg-amber-50 dark:bg-amber-950/70 border border-amber-100 dark:border-amber-900 rounded-2xl flex items-center justify-center text-amber-600 text-lg shadow-xs">
                <i class="fa-solid fa-chart-pie"></i>
            </div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
                <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Google Drive Sync</p>
                <p class="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <i class="fa-solid fa-circle-check text-xs"></i> Siap Tersinkron
                </p>
            </div>
            <div class="w-11 h-11 bg-amber-50 dark:bg-amber-950/70 border border-amber-100 dark:border-amber-900 rounded-2xl flex items-center justify-center text-amber-500 text-xl shadow-xs">
                <i class="fa-brands fa-google-drive"></i>
            </div>
        </div>
    `;
}

function drawMonitoringCurrentView() {
    const content = document.getElementById('monitoring-tab-content');
    if (!content) return;

    if (monitoringActiveTab === 'media') {
        drawMonitoringMediaTable(content);
    } else if (monitoringActiveTab === 'topik') {
        drawMonitoringTopikTable(content);
    } else if (monitoringActiveTab === 'lampiran') {
        drawMonitoringLampiranTable(content);
    } else if (monitoringActiveTab === 'sentimen') {
        drawMonitoringSentimenView(content);
    }
}

// -------------------------------------------------------------
// TAB 1: REKAPITULASI BERDASARKAN MEDIA
// -------------------------------------------------------------
function drawMonitoringMediaTable(content) {
    const articles = db.monitoring || [];
    const allMediaList = getAllMonitoringMediaList(articles);
    const activeMonths = getActiveMonitoringMonths();
    const numMonthCols = activeMonths.length;

    // Matrix counts: [media][monthIndex 0..11]
    const mediaMatrix = {};
    allMediaList.forEach(m => {
        mediaMatrix[m] = Array(12).fill(0);
    });

    articles.forEach(art => {
        const d = new Date(art.tanggal || art.tanggal_rilis || `${monitoringYear}-01-01`);
        const itemYear = d.getFullYear();
        if (itemYear === monitoringYear) {
            const mIdx = d.getMonth(); // 0..11
            if (mIdx >= 0 && mIdx < 12) {
                let rawMed = (art.media || art.sumber || '').trim();
                if (!rawMed || rawMed === 'Media Lainnya') rawMed = 'Media Online';
                const med = rawMed;
                if (!mediaMatrix[med]) {
                    mediaMatrix[med] = Array(12).fill(0);
                    if (!allMediaList.includes(med)) allMediaList.push(med);
                }
                mediaMatrix[med][mIdx]++;
            }
        }
    });

    const monthTotals = Array(numMonthCols).fill(0);
    let grandTotal = 0;

    const rowsHtml = allMediaList.map((media, idx) => {
        const counts = mediaMatrix[media];
        let kumulatif = 0;
        const rowMonthCounts = [];
        for (let i = monitoringStartMonth - 1; i < monitoringEndMonth; i++) {
            const c = counts[i] || 0;
            rowMonthCounts.push(c);
            kumulatif += c;
            monthTotals[i - (monitoringStartMonth - 1)] += c;
        }
        grandTotal += kumulatif;

        const colsHtml = rowMonthCounts.map(c =>
            `<td class="px-3 py-3 text-center text-xs ${c > 0 ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-350 dark:text-slate-600'}">${c > 0 ? c : '-'}</td>`
        ).join('');

        const isZebra = idx % 2 === 1;
        return `
            <tr class="${isZebra ? 'bg-slate-50/60 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-800'} hover:bg-indigo-50/50 dark:hover:bg-slate-700/40 transition-colors">
                <td class="px-4 py-3 text-center font-bold text-xs text-slate-400 dark:text-slate-500">${idx + 1}</td>
                <td class="px-5 py-3 font-extrabold text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    <span class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full ${kumulatif > 0 ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}"></span>
                        ${media}
                    </span>
                </td>
                ${colsHtml}
                <td class="px-4 py-3 text-center font-black text-xs ${kumulatif > 0 ? 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-400'}">${kumulatif}</td>
            </tr>
        `;
    }).join('');

    const footerColsHtml = monthTotals.map(tot =>
        `<td class="px-3 py-3.5 text-center font-black text-xs text-indigo-900 dark:text-indigo-200">${tot}</td>`
    ).join('');

    content.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div class="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900/60 dark:to-slate-800">
                <div>
                    <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <i class="fa-solid fa-newspaper text-indigo-600"></i> Rekapitulasi Berita Berdasarkan Media Massa
                    </h3>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pemantauan dinamis ${allMediaList.length} media massa pemberitaan BPS Kalimantan Barat periode ${getMonitoringPeriodLabel()}</p>
                </div>
                <button onclick="downloadMonitoringExcel()" class="btn-secondary text-[11px] font-bold uppercase py-2 px-3 flex items-center gap-1.5 shadow-xs bg-white dark:bg-slate-800">
                    <i class="fa-solid fa-download text-emerald-600"></i> Unduh Format BPS (.xlsx)
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-[#1F4E79] text-white text-[10px] uppercase font-black tracking-wider">
                            <th class="px-4 py-3.5 text-center w-12 border-r border-[#2d6396]">No.</th>
                            <th class="px-5 py-3.5 min-w-[200px] border-r border-[#2d6396]">Media</th>
                            ${activeMonths.map(m => `<th class="px-3 py-3.5 text-center border-r border-[#2d6396]">${m.slice(0, 3)}</th>`).join('')}
                            <th class="px-4 py-3.5 text-center min-w-[110px] bg-[#163a5c]">Total Kumulatif</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr class="bg-[#D9E1F2] dark:bg-indigo-950/80 border-t-2 border-[#1F4E79]">
                            <td class="px-4 py-3.5 text-center font-black text-xs text-indigo-900 dark:text-indigo-200"></td>
                            <td class="px-5 py-3.5 font-black text-xs text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">TOTAL</td>
                            ${footerColsHtml}
                            <td class="px-4 py-3.5 text-center font-black text-sm text-indigo-950 dark:text-white bg-[#c6d4ec] dark:bg-indigo-900">${grandTotal}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// TAB 2: REKAPITULASI BERDASARKAN TOPIK BERITA
// -------------------------------------------------------------
function drawMonitoringTopikTable(content) {
    const articles = db.monitoring || [];
    const activeMonths = getActiveMonitoringMonths();
    const numMonthCols = activeMonths.length;

    const topicMatrix = {};
    MONITORING_TOPIK_LIST.forEach(t => {
        topicMatrix[t] = Array(12).fill(0);
    });

    articles.forEach(art => {
        const d = new Date(art.tanggal || art.tanggal_rilis || `${monitoringYear}-01-01`);
        const itemYear = d.getFullYear();
        if (itemYear === monitoringYear) {
            const mIdx = d.getMonth();
            if (mIdx >= 0 && mIdx < 12) {
                const normTop = normalizeMonitoringTopic(art.topik);
                const top = MONITORING_TOPIK_LIST.includes(normTop) ? normTop : 'Sektoral';
                if (!topicMatrix[top]) topicMatrix[top] = Array(12).fill(0);
                topicMatrix[top][mIdx]++;
            }
        }
    });

    const monthTotals = Array(numMonthCols).fill(0);
    let grandTotal = 0;

    const rowsHtml = MONITORING_TOPIK_LIST.map((topik, idx) => {
        const counts = topicMatrix[topik];
        let kumulatif = 0;
        const rowMonthCounts = [];
        for (let i = monitoringStartMonth - 1; i < monitoringEndMonth; i++) {
            const c = counts[i] || 0;
            rowMonthCounts.push(c);
            kumulatif += c;
            monthTotals[i - (monitoringStartMonth - 1)] += c;
        }
        grandTotal += kumulatif;

        const colsHtml = rowMonthCounts.map(c =>
            `<td class="px-3 py-3 text-center text-xs ${c > 0 ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-350 dark:text-slate-600'}">${c > 0 ? c : '-'}</td>`
        ).join('');

        const isZebra = idx % 2 === 1;
        return `
            <tr class="${isZebra ? 'bg-slate-50/60 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-800'} hover:bg-indigo-50/50 dark:hover:bg-slate-700/40 transition-colors">
                <td class="px-4 py-3 text-center font-bold text-xs text-slate-400 dark:text-slate-500">${idx + 1}</td>
                <td class="px-5 py-3 font-extrabold text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    <span class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full ${kumulatif > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}"></span>
                        ${topik}
                    </span>
                </td>
                ${colsHtml}
                <td class="px-4 py-3 text-center font-black text-xs ${kumulatif > 0 ? 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'text-slate-400'}">${kumulatif}</td>
            </tr>
        `;
    }).join('');

    const footerColsHtml = monthTotals.map(tot =>
        `<td class="px-3 py-3.5 text-center font-black text-xs text-indigo-900 dark:text-indigo-200">${tot}</td>`
    ).join('');

    content.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div class="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-slate-50 to-emerald-50/30 dark:from-slate-900/60 dark:to-slate-800">
                <div>
                    <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <i class="fa-solid fa-tags text-emerald-600"></i> Rekapitulasi Berita Berdasarkan Topik Berita
                    </h3>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pemetaan 21 Kamus Topik Berita Strategis BPS Kalimantan Barat periode ${getMonitoringPeriodLabel()}</p>
                </div>
                <button onclick="downloadMonitoringExcel()" class="btn-secondary text-[11px] font-bold uppercase py-2 px-3 flex items-center gap-1.5 shadow-xs bg-white dark:bg-slate-800">
                    <i class="fa-solid fa-download text-emerald-600"></i> Unduh Format BPS (.xlsx)
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-[#1F4E79] text-white text-[10px] uppercase font-black tracking-wider">
                            <th class="px-4 py-3.5 text-center w-12 border-r border-[#2d6396]">No.</th>
                            <th class="px-5 py-3.5 min-w-[220px] border-r border-[#2d6396]">Topik Berita</th>
                            ${activeMonths.map(m => `<th class="px-3 py-3.5 text-center border-r border-[#2d6396]">${m.slice(0, 3)}</th>`).join('')}
                            <th class="px-4 py-3.5 text-center min-w-[110px] bg-[#163a5c]">Total Kumulatif</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr class="bg-[#D9E1F2] dark:bg-indigo-950/80 border-t-2 border-[#1F4E79]">
                            <td class="px-4 py-3.5 text-center font-black text-xs text-indigo-900 dark:text-indigo-200"></td>
                            <td class="px-5 py-3.5 font-black text-xs text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">TOTAL</td>
                            ${footerColsHtml}
                            <td class="px-4 py-3.5 text-center font-black text-sm text-indigo-950 dark:text-white bg-[#c6d4ec] dark:bg-indigo-900">${grandTotal}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// TAB 3: TABEL LAMPIRAN RIWAYAT BERITA
// -------------------------------------------------------------
function escapeMonitoringHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function drawMonitoringLampiranTable(content) {
    if (!content) content = document.getElementById('monitoring-tab-content');
    if (!content) return;
    const isKepala = currentUser && currentUser.role === 'kepala';

    // Check if the lampiran wrapper already exists in the container
    const wrapper = content.querySelector('#monitoring-lampiran-wrapper');
    if (!wrapper) {
        content.innerHTML = `
        <div id="monitoring-lampiran-wrapper" class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <!-- TOOLBAR FILTERS -->
            <div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                    <input type="text" id="monitoring-search-input" oninput="handleMonitoringSearchInput(this.value)" onkeydown="if(event.key === 'Escape'){ clearMonitoringSearch(); }" value="${escapeMonitoringHtml(monitoringSearch)}" placeholder="Cari judul, media, atau topik..." class="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors">
                    <button id="monitoring-search-clear" onclick="clearMonitoringSearch()" class="${monitoringSearch ? '' : 'hidden '}absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="Hapus pencarian">
                        <i class="fa-solid fa-circle-xmark text-xs"></i>
                    </button>
                </div>
                <div>
                    <select id="monitoring-media-select" onchange="monitoringMediaFilter = this.value; monitoringPage = 1; updateMonitoringLampiranTableData();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none">
                        <option value="">Semua Media (${getAllMonitoringMediaList(db.monitoring || []).length})</option>
                        ${getAllMonitoringMediaList(db.monitoring || []).map(m => `<option ${monitoringMediaFilter === m ? 'selected' : ''} value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <select id="monitoring-topic-select" onchange="monitoringTopicFilter = this.value; monitoringPage = 1; updateMonitoringLampiranTableData();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none">
                        <option value="">Semua Topik</option>
                        ${MONITORING_TOPIK_LIST.map(t => `<option ${monitoringTopicFilter === t ? 'selected' : ''} value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <select id="monitoring-month-select" onchange="monitoringMonthFilter = this.value; monitoringPage = 1; updateMonitoringLampiranTableData();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none">
                        <option value="">Semua Bulan (${ALL_MONITORING_MONTHS[monitoringStartMonth - 1].slice(0, 3)} - ${ALL_MONITORING_MONTHS[monitoringEndMonth - 1].slice(0, 3)})</option>
                        ${getActiveMonitoringMonths().map((m, offsetIdx) => {
                            const mNum = monitoringStartMonth + offsetIdx;
                            const val = `${monitoringYear}-${String(mNum).padStart(2, '0')}`;
                            return `<option ${monitoringMonthFilter === val ? 'selected' : ''} value="${val}">${m} ${monitoringYear}</option>`;
                        }).join('')}
                    </select>
                </div>
                <div>
                    <button onclick="resetMonitoringFilters()" class="w-full btn-secondary text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors">
                        <i class="fa-solid fa-rotate-left"></i> Reset Filter
                    </button>
                </div>
            </div>

            <!-- TABLE -->
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 text-[9px] uppercase font-black tracking-wider border-b border-slate-200 dark:border-slate-700">
                            <th class="px-4 py-3.5 text-center w-12">No.</th>
                            <th class="px-5 py-3.5 min-w-[280px]">Judul Berita</th>
                            <th class="px-4 py-3.5 min-w-[150px]">Media</th>
                            <th class="px-4 py-3.5 min-w-[170px]">Topik</th>
                            <th class="px-4 py-3.5 text-center whitespace-nowrap min-w-[110px]">Tanggal Rilis</th>
                            <th class="px-4 py-3.5 text-center min-w-[120px]">Link Artikel</th>
                            ${!isKepala ? `<th class="px-4 py-3.5 text-center w-20">Aksi</th>` : ''}
                        </tr>
                    </thead>
                    <tbody id="monitoring-lampiran-tbody" class="divide-y divide-slate-100 dark:divide-slate-700/60">
                        <!-- Populated dynamically -->
                    </tbody>
                </table>
            </div>

            <!-- PAGINATION -->
            <div id="monitoring-lampiran-pagination" class="p-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-2">
                <!-- Populated dynamically -->
            </div>
        </div>
        `;
    } else {
        // Wrapper already in DOM, ensure the month options match the current period
        const mSelect = document.getElementById('monitoring-month-select');
        if (mSelect) {
            const currentVal = monitoringMonthFilter;
            mSelect.innerHTML = `
                <option value="">Semua Bulan (${ALL_MONITORING_MONTHS[monitoringStartMonth - 1].slice(0, 3)} - ${ALL_MONITORING_MONTHS[monitoringEndMonth - 1].slice(0, 3)})</option>
                ${getActiveMonitoringMonths().map((m, offsetIdx) => {
                    const mNum = monitoringStartMonth + offsetIdx;
                    const val = `${monitoringYear}-${String(mNum).padStart(2, '0')}`;
                    return `<option ${currentVal === val ? 'selected' : ''} value="${val}">${m} ${monitoringYear}</option>`;
                }).join('')}
            `;
            mSelect.value = currentVal;
        }
    }

    updateMonitoringLampiranTableData();
}

function updateMonitoringLampiranTableData() {
    const tbody = document.getElementById('monitoring-lampiran-tbody');
    const paginationContainer = document.getElementById('monitoring-lampiran-pagination');
    if (!tbody || !paginationContainer) return;

    const isKepala = currentUser && currentUser.role === 'kepala';

    // 1. Filter base articles by active year and active month range
    let filtered = (db.monitoring || []).filter(item => {
        const d = new Date(item.tanggal || item.tanggal_rilis || `${monitoringYear}-01-01`);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return y === monitoringYear && m >= monitoringStartMonth && m <= monitoringEndMonth;
    });

    // 2. Multi-keyword search across title, media, topic, excerpt, and URL
    if (monitoringSearch && monitoringSearch.trim()) {
        const queryTerms = monitoringSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
        filtered = filtered.filter(item => {
            const cleanSummary = (item.ringkasan || '').replace(/&nbsp;/g, ' ');
            const searchableText = [
                item.judul || '',
                item.media || item.sumber || '',
                normalizeMonitoringTopic(item.topik) || '',
                cleanSummary,
                item.url || '',
                item.sentimen || '',
                formatDate(item.tanggal || item.tanggal_rilis) || ''
            ].join(' ').toLowerCase();

            return queryTerms.every(term => searchableText.includes(term));
        });
    }

    // 3. Media filter
    if (monitoringMediaFilter) {
        filtered = filtered.filter(item => item.media === monitoringMediaFilter);
    }

    // 4. Topic filter
    if (monitoringTopicFilter) {
        filtered = filtered.filter(item => normalizeMonitoringTopic(item.topik) === monitoringTopicFilter);
    }

    // 5. Month filter
    if (monitoringMonthFilter) {
        filtered = filtered.filter(item => {
            const d = formatDateInput(item.tanggal || item.tanggal_rilis);
            return d && d.startsWith(monitoringMonthFilter);
        });
    }

    // 6. Sort: newest date first
    filtered.sort((a, b) => new Date(b.tanggal || b.tanggal_rilis || 0) - new Date(a.tanggal || a.tanggal_rilis || 0));

    // 7. Update clear button visibility
    const clearBtn = document.getElementById('monitoring-search-clear');
    if (clearBtn) {
        if (monitoringSearch && monitoringSearch.trim()) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }

    // 8. Pagination calculations
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / monitoringLimit) || 1;
    if (monitoringPage > totalPages) monitoringPage = totalPages;
    if (monitoringPage < 1) monitoringPage = 1;
    const offset = (monitoringPage - 1) * monitoringLimit;
    const paginatedItems = filtered.slice(offset, offset + monitoringLimit);

    // 9. Render table body
    if (paginatedItems.length === 0) {
        const isSearching = !!(monitoringSearch && monitoringSearch.trim());
        const hasFilters = isSearching || !!monitoringMediaFilter || !!monitoringTopicFilter || !!monitoringMonthFilter;

        tbody.innerHTML = `
            <tr>
                <td colspan="${isKepala ? 6 : 7}" class="py-16 text-center text-slate-400">
                    <i class="fa-solid ${isSearching ? 'fa-magnifying-glass' : 'fa-newspaper'} text-3xl mb-2 text-slate-300 dark:text-slate-600"></i>
                    <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
                        ${isSearching 
                            ? `Tidak ada artikel berita yang cocok dengan kata kunci "${escapeMonitoringHtml(monitoringSearch)}"` 
                            : `Tidak ada riwayat artikel ditemukan pada periode ${getMonitoringPeriodLabel()}.`}
                    </p>
                    ${hasFilters ? `
                        <p class="text-[11px] text-slate-400 mt-1">Coba gunakan kata kunci lain atau reset filter pencarian.</p>
                        <button onclick="resetMonitoringFilters()" class="mt-3 px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                            <i class="fa-solid fa-rotate-left text-[10px]"></i> Reset Filter
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginatedItems.map((item, idx) => {
            const globalIdx = offset + idx + 1;
            const cleanSummary = (item.ringkasan || '').replace(/&nbsp;/g, ' ').trim();
            const topicName = normalizeMonitoringTopic(item.topik);
            return `
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors">
                    <td class="px-4 py-3.5 text-center font-bold text-xs text-slate-400 dark:text-slate-500">${globalIdx}</td>
                    <td class="px-5 py-3.5">
                        <div class="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">${item.judul || '-'}</div>
                        ${cleanSummary && cleanSummary !== item.judul ? `<p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">${cleanSummary}</p>` : ''}
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <i class="fa-solid fa-newspaper text-[9px]"></i> ${item.media || '-'}
                        </span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            topicName.includes('Sensus Ekonomi')
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }">
                            <i class="fa-solid fa-tag text-[9px]"></i> ${topicName}
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-center font-bold text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        ${formatDate(item.tanggal || item.tanggal_rilis)}
                    </td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                        ${item.url ? `
                            <a href="${item.url}" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold transition-all shadow-2xs">
                                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i> Buka Artikel
                            </a>
                        ` : '<span class="text-slate-400 text-[10px]">-</span>'}
                    </td>
                    ${!isKepala ? `
                        <td class="px-4 py-3.5 text-center whitespace-nowrap">
                            <div class="flex items-center justify-center gap-1">
                                <button onclick="openEditMonitoringModal(${item.id})" title="Ubah" class="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><i class="fa-solid fa-pen text-[10px]"></i></button>
                                ${isUserAdminOrKetua() ? `
                                    <button onclick="deleteItem('monitoring', ${item.id})" title="Hapus" class="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 transition-colors"><i class="fa-solid fa-trash text-[10px]"></i></button>
                                ` : ''}
                            </div>
                        </td>
                    ` : ''}
                </tr>
            `;
        }).join('');
    }

    // 10. Render pagination
    paginationContainer.innerHTML = `
        <span class="text-[11px] font-semibold text-slate-500">
            Menampilkan ${totalCount === 0 ? 0 : offset + 1} - ${Math.min(offset + monitoringLimit, totalCount)} dari ${totalCount} artikel berita pada periode terpilih
            ${monitoringSearch ? `<span class="text-indigo-600 dark:text-indigo-400 font-bold ml-1">(Filter: "${escapeMonitoringHtml(monitoringSearch)}")</span>` : ''}
        </span>
        <div class="flex items-center gap-1.5">
            <button onclick="changeMonitoringPageLampiran(${monitoringPage - 1})" ${monitoringPage <= 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed">
                <i class="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <span class="px-3 text-xs font-bold text-slate-700 dark:text-slate-200">${monitoringPage} / ${totalPages}</span>
            <button onclick="changeMonitoringPageLampiran(${monitoringPage + 1})" ${monitoringPage >= totalPages ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed">
                <i class="fa-solid fa-chevron-right text-xs"></i>
            </button>
        </div>
    `;
}

window.handleMonitoringSearchInput = function (val) {
    monitoringSearch = val;
    monitoringPage = 1;
    updateMonitoringLampiranTableData();
};

window.clearMonitoringSearch = function () {
    monitoringSearch = '';
    monitoringPage = 1;
    const input = document.getElementById('monitoring-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    updateMonitoringLampiranTableData();
};

window.changeMonitoringPageLampiran = function (p) {
    monitoringPage = p;
    updateMonitoringLampiranTableData();
};

window.resetMonitoringFilters = function () {
    monitoringSearch = '';
    monitoringMediaFilter = '';
    monitoringTopicFilter = '';
    monitoringMonthFilter = '';
    monitoringPage = 1;

    const sInput = document.getElementById('monitoring-search-input');
    if (sInput) sInput.value = '';
    const mSelect = document.getElementById('monitoring-media-select');
    if (mSelect) mSelect.value = '';
    const tSelect = document.getElementById('monitoring-topic-select');
    if (tSelect) tSelect.value = '';
    const moSelect = document.getElementById('monitoring-month-select');
    if (moSelect) moSelect.value = '';

    updateMonitoringLampiranTableData();
};

// -------------------------------------------------------------
// TAB 4: SENTIMEN & PROPORSI
// -------------------------------------------------------------
function drawMonitoringSentimenView(content) {
    const allArticles = db.monitoring || [];
    const articles = allArticles.filter(item => {
        const d = new Date(item.tanggal || item.tanggal_rilis || `${monitoringYear}-01-01`);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return y === monitoringYear && m >= monitoringStartMonth && m <= monitoringEndMonth;
    });

    const totalCount = articles.length;
    const posCount = articles.filter(m => m.sentimen === 'Positif').length;
    const netCount = articles.filter(m => m.sentimen === 'Netral').length;
    const negCount = articles.filter(m => m.sentimen === 'Negatif').length;

    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                        <i class="fa-solid fa-chart-line text-indigo-600"></i> Analisis Pemberitaan & Citra Media
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        Pemberitaan media massa seputar data strategis BPS Kalimantan Barat periode ${getMonitoringPeriodLabel()} didominasi oleh pemberitaan bernada positif dan netral yang membangun kepercayaan publik.
                    </p>
                    <div class="grid grid-cols-3 gap-4 text-center">
                        <div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-2xl">
                            <i class="fa-regular fa-face-smile text-emerald-600 text-2xl mb-1"></i>
                            <p class="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">${posCount}</p>
                            <p class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mt-0.5">Positif (${totalCount ? Math.round((posCount / totalCount) * 100) : 0}%)</p>
                        </div>
                        <div class="p-4 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-2xl">
                            <i class="fa-regular fa-face-meh text-slate-500 text-2xl mb-1"></i>
                            <p class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">${netCount}</p>
                            <p class="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">Netral (${totalCount ? Math.round((netCount / totalCount) * 100) : 0}%)</p>
                        </div>
                        <div class="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 rounded-2xl">
                            <i class="fa-regular fa-face-frown text-rose-600 text-2xl mb-1"></i>
                            <p class="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">${negCount}</p>
                            <p class="text-[10px] font-bold text-rose-800 uppercase tracking-wider mt-0.5">Negatif (${totalCount ? Math.round((negCount / totalCount) * 100) : 0}%)</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-chart-pie text-indigo-600"></i> Proporsi Sentimen
                </h3>
                <div class="w-44 h-44 relative mx-auto flex items-center justify-center">
                    <canvas id="mediaSentimentChart" class="w-full h-full"></canvas>
                </div>
                <div class="mt-6 flex flex-col gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Positif</span><strong>${posCount} (${totalCount ? Math.round((posCount / totalCount) * 100) : 0}%)</strong></div>
                    <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-slate-400 rounded-full"></span> Netral</span><strong>${netCount} (${totalCount ? Math.round((netCount / totalCount) * 100) : 0}%)</strong></div>
                    <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Negatif</span><strong>${negCount} (${totalCount ? Math.round((negCount / totalCount) * 100) : 0}%)</strong></div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('mediaSentimentChart')?.getContext('2d');
        if (ctx) {
            if (window.sentimentChartInstance) {
                window.sentimentChartInstance.destroy();
            }
            window.sentimentChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Positif', 'Netral', 'Negatif'],
                    datasets: [{
                        data: [posCount, netCount, negCount],
                        backgroundColor: ['#10b981', '#94a3b8', '#ef4444'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    cutout: '72%'
                }
            });
        }
    }, 50);
}

// -------------------------------------------------------------
// INTERACTIVE RUN SCRAPER PIPELINE MODAL & ACTION
// -------------------------------------------------------------
window.runMonitoringScraper = async function () {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'koordinator')) {
        showToast('Fitur ini hanya dapat diakses oleh Admin dan Koordinator.', 'error');
        return;
    }
    if (isScrapingInProgress) return;
    isScrapingInProgress = true;

    const modalContainer = document.getElementById('monitoring-modal-container') || document.body;
    modalContainer.innerHTML = `
        <div id="scraper-progress-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
                <div class="flex items-center gap-3.5 mb-5">
                    <div class="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl flex items-center justify-center text-xl shadow-md">
                        <i class="fa-solid fa-arrows-rotate animate-spin" id="scraper-icon"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-base text-slate-900 dark:text-white" id="scraper-title">Pipeline Media Monitoring Berjalan...</h3>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Mengambil data Google News RSS & memproses periode ${getMonitoringPeriodLabel()}</p>
                    </div>
                </div>

                <!-- PROGRESS BAR -->
                <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-5">
                    <div id="scraper-progress-bar" class="bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 h-full transition-all duration-500 rounded-full" style="width: 20%;"></div>
                </div>

                <!-- STEPS LOG -->
                <div class="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium mb-6" id="scraper-steps">
                    <div class="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-bold" id="step-1">
                        <i class="fa-solid fa-circle-notch animate-spin text-xs"></i> 1. Mengambil artikel RSS Google News BPS Kalbar ${monitoringYear}...
                    </div>
                    <div class="flex items-center gap-2.5 text-slate-400" id="step-2">
                        <i class="fa-regular fa-circle text-xs"></i> 2. Deteksi 18 Media Target & 21 Kamus Topik Berita...
                    </div>
                    <div class="flex items-center gap-2.5 text-slate-400" id="step-3">
                        <i class="fa-regular fa-circle text-xs"></i> 3. Filter anti-duplikasi & perbarui database...
                    </div>
                    <div class="flex items-center gap-2.5 text-slate-400" id="step-4">
                        <i class="fa-regular fa-circle text-xs"></i> 4. Menyusun format laporan Excel (.xlsx) periode ${getMonitoringPeriodLabel()}...
                    </div>
                    <div class="flex items-center gap-2.5 text-slate-400" id="step-5">
                        <i class="fa-regular fa-circle text-xs"></i> 5. Sinkronisasi berkas ke Google Drive BPS Kalbar...
                    </div>
                </div>

                <div id="scraper-result-actions" class="hidden flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <!-- Populated on completion -->
                </div>
            </div>
        </div>
    `;

    const setStepDone = (stepId, text) => {
        const el = document.getElementById(stepId);
        if (el) {
            el.className = 'flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold';
            el.innerHTML = `<i class="fa-solid fa-circle-check text-xs"></i> ${text}`;
        }
    };

    const setStepActive = (stepId, text) => {
        const el = document.getElementById(stepId);
        if (el) {
            el.className = 'flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-bold';
            el.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin text-xs"></i> ${text}`;
        }
    };

    const setBar = (pct) => {
        const bar = document.getElementById('scraper-progress-bar');
        if (bar) bar.style.width = `${pct}%`;
    };

    try {
        setBar(35);
        setStepDone('step-1', `1. Artikel RSS Google News BPS Kalbar ${monitoringYear} berhasil ditarik`);
        setStepActive('step-2', '2. Menganalisis 18 Media Target & 21 Kamus Topik...');

        // Ensure Google Drive token so it automatically updates Google Drive without needing a separate sync step!
        let driveToken = window.driveSync ? (window.driveSync.getCachedToken() || null) : null;
        if (!driveToken && window.driveSync && typeof window.driveSync.ensureToken === 'function') {
            try {
                driveToken = await window.driveSync.ensureToken();
            } catch (authErr) {
                console.warn('[Scraper] Auto token check deferred to server cached credentials:', authErr);
            }
        }

        const headers = { 'Content-Type': 'application/json' };
        if (driveToken) {
            headers['Authorization'] = `Bearer ${driveToken}`;
        }

        const resp = await fetch('/api/monitoring/run-scraper', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                year: monitoringYear,
                startMonth: monitoringStartMonth,
                endMonth: monitoringEndMonth
            })
        });

        let data = null;
        let responseText = '';
        try {
            responseText = await resp.text();
            data = responseText ? JSON.parse(responseText) : null;
        } catch (parseErr) {
            console.error('[Scraper Response Parse Error]:', parseErr, responseText);
        }

        if (!resp.ok) {
            const serverMsg = (data && data.error) || (responseText ? responseText.slice(0, 120) : null);
            throw new Error(serverMsg || `Koneksi ke server gagal (HTTP ${resp.status})`);
        }

        if (!data || !data.success) {
            throw new Error((data && data.error) || 'Scraping gagal dilakukan.');
        }

        setBar(70);
        setStepDone('step-2', '2. Klasifikasi media dan topik berhasil');
        setStepDone('step-3', `3. Filter duplikasi selesai & database diperbarui (${data.totalCount || 0} artikel)`);
        setStepActive('step-4', `4. Format Excel (.xlsx) BPS ${getMonitoringPeriodLabel()} selesai disusun...`);

        setBar(90);
        setStepDone('step-4', `4. File Laporan Excel (${data.fileName}) berhasil dibuat`);

        if (data.driveSync && data.driveSync.success) {
            setStepDone('step-5', `5. Berkas (${data.fileName}) berhasil otomatis diunggah & diperbarui di Google Drive BPS Kalbar!`);
        } else {
            setStepDone('step-5', '5. Data web & berkas laporan telah otomatis diperbarui');
        }

        setBar(100);

        // Update local database with authoritative full articles from server
        if (data.articles && Array.isArray(data.articles)) {
            db.monitoring = data.articles.map(a => ({
                ...a,
                topik: normalizeMonitoringTopic(a.topik)
            }));
            saveLocalFallback('monitoring');
        } else if (data.newArticles && data.newArticles.length > 0) {
            const existingUrls = new Set((db.monitoring || []).map(m => m.url));
            data.newArticles.forEach(a => {
                if (!existingUrls.has(a.url)) {
                    db.monitoring.unshift({
                        ...a,
                        topik: normalizeMonitoringTopic(a.topik)
                    });
                    existingUrls.add(a.url);
                }
            });
            saveLocalFallback('monitoring');
        }

        // Show result
        const titleEl = document.getElementById('scraper-title');
        const iconEl = document.getElementById('scraper-icon');
        if (titleEl) titleEl.innerText = 'Pembaruan Data & Google Drive Selesai!';
        if (iconEl) {
            iconEl.className = 'fa-solid fa-circle-check text-emerald-400';
            iconEl.parentElement.className = 'w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-md';
        }

        const actionsEl = document.getElementById('scraper-result-actions');
        if (actionsEl) {
            actionsEl.className = 'flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800';
            actionsEl.innerHTML = `
                <button onclick="downloadMonitoringExcel(); closeScraperModal();" class="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm">
                    <i class="fa-solid fa-download"></i> Download Excel (.xlsx)
                </button>
                <a href="${DRIVE_FOLDER_URL}" target="_blank" onclick="closeScraperModal();" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <i class="fa-brands fa-google-drive text-amber-500"></i> Buka di Google Drive
                </a>
                <button onclick="closeScraperModal()" class="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all">
                    Tutup
                </button>
            `;
        }

        updateMonitoringKpiCards();
        drawMonitoringCurrentView();
        showToast(`Berhasil! Data web dan Google Drive telah otomatis terupdate (${db.monitoring.length} artikel tersimpan).`);
    } catch (err) {
        console.error('[Scraper Error]:', err);
        const titleEl = document.getElementById('scraper-title');
        if (titleEl) titleEl.innerText = 'Terjadi Kendala Pembaruan Data';
        const actionsEl = document.getElementById('scraper-result-actions');
        if (actionsEl) {
            actionsEl.className = 'flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800';
            actionsEl.innerHTML = `
                <p class="text-xs text-rose-600 dark:text-rose-400 font-semibold flex-1">${err.message}</p>
                <button onclick="closeScraperModal()" class="py-2 px-4 bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase rounded-xl">Tutup</button>
            `;
        }
        showToast(`Gagal memperbarui berita: ${err.message}`, 'error');
    } finally {
        isScrapingInProgress = false;
    }
};

window.closeScraperModal = function () {
    const m = document.getElementById('scraper-progress-modal');
    if (m) m.remove();
};

window.downloadMonitoringExcel = function () {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'koordinator')) {
        showToast('Fitur ini hanya dapat diakses oleh Admin dan Koordinator.', 'error');
        return;
    }
    showToast(`Sedang menyiapkan file Excel BPS Kalbar (${getMonitoringPeriodLabel()})...`);
    window.location.href = `/api/monitoring/export-excel?year=${monitoringYear}&startMonth=${monitoringStartMonth}&endMonth=${monitoringEndMonth}`;
};

window.syncMonitoringToDriveUI = async function () {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'koordinator')) {
        showToast('Fitur ini hanya dapat diakses oleh Admin dan Koordinator.', 'error');
        return;
    }
    if (!window.driveSync) {
        showToast('Modul Google Drive belum siap.', 'error');
        return;
    }

    try {
        showToast('Menghubungkan ke Google Drive...');
        const token = await window.driveSync.signInAndGetToken();
        showToast(`Sedang mengunggah dan memperbarui berkas periode ${getMonitoringPeriodLabel()} di Google Drive...`);
        const res = await window.driveSync.syncReportToDrive(token, monitoringYear, monitoringStartMonth, monitoringEndMonth);

        showToast('File laporan berhasil diperbarui di Google Drive!');
        showConfirmModal(
            `Laporan <strong>${res.fileName}</strong> telah berhasil disinkronkan ke folder Google Drive BPS Kalbar.<br><br>Apakah Anda ingin membuka file di Google Drive sekarang?`,
            () => {
                if (res.webViewLink) window.open(res.webViewLink, '_blank');
                else window.open(DRIVE_FOLDER_URL, '_blank');
            },
            {
                title: 'Sinkronisasi Google Drive Berhasil',
                confirmText: 'Buka di Google Drive',
                cancelText: 'Selesai',
                type: 'info',
                icon: 'fa-cloud-arrow-up'
            }
        );
    } catch (e) {
        console.error('[Drive Sync UI]:', e);
        if (window.driveSync && typeof window.driveSync.clearToken === 'function') {
            window.driveSync.clearToken();
        }
        if (e.message && (e.message.includes('auth/unauthorized-domain') || e.code === 'auth/unauthorized-domain')) {
            if (window.driveSync && typeof window.driveSync.showUnauthorizedDomainModal === 'function') {
                window.driveSync.showUnauthorizedDomainModal();
            } else {
                showToast('Sinkronisasi Drive gagal: Domain belum diotorisasi di Firebase (auth/unauthorized-domain).', 'error');
            }
        } else if (e.message && (e.message.includes('401') || e.message.includes('UNAUTHENTICATED') || e.message.includes('invalid authentication credentials'))) {
            showToast('Sesi otorisasi Google telah kedaluwarsa. Silakan klik tombol Sinkronisasi sekali lagi untuk login akun Google.', 'error');
        } else {
            showToast(`Sinkronisasi Drive gagal: ${e.message}`, 'error');
        }
    }
};

window.exportMonitoringReport = function (type) {
    if (type === 'excel') {
        downloadMonitoringExcel();
    } else {
        const headers = ["No", "Judul Berita", "Media", "Topik", "Tanggal Rilis", "Link Artikel"];
        const rows = (db.monitoring || []).map((item, idx) => [
            idx + 1,
            item.judul || '-',
            item.media || '-',
            normalizeMonitoringTopic(item.topik) || '-',
            formatDate(item.tanggal || item.tanggal_rilis),
            item.url || '-'
        ]);
        if (type === 'csv') downloadCSV(headers, rows, `Media_Monitoring_BPS_Kalbar_2026_${new Date().toISOString().split('T')[0]}.csv`);
        else openPrintReportWindow("Kliping Media Monitoring BPS Kalbar 2026", headers, rows);
    }
};

// -------------------------------------------------------------
// 12. ASSIGNMENT VIEW
// -------------------------------------------------------------
let assignmentSearch = '';
let assignmentMonthFilter = '';
let assignmentPriorityFilter = '';
let assignmentStatusFilter = '';
let assignmentSortField = 'deadline';
let assignmentSortAsc = true;

function renderAssignmentPage(container) {
    const isKepala = currentUser.role === 'kepala';
    const isTim = currentUser.role === 'tim';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <i class="fa-solid fa-clipboard-list text-indigo-650 dark:text-indigo-400"></i>
                    Penugasan Tugas (Assignment)
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${currentUser && currentUser.role === 'tim' ? 'Daftar seluruh tugas, kegiatan, dan peran kehumasan yang ditugaskan kepada Anda.' : 'Daftar seluruh tugas, kegiatan, dan peran kehumasan anggota tim BPS Kalbar.'}</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="triggerAssignmentH1Reminders(true)" id="btn-h1-reminder-check" class="btn-secondary flex items-center gap-2 py-2 px-3.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all cursor-pointer" title="Cek pengingat tugas mendekati tenggat waktu (H-1)">
                    <i class="fa-solid fa-bell text-amber-500 animate-bounce"></i>
                    <span>Pengingat H-1</span>
                    <span id="h1-badge-count" class="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white hidden">0</span>
                </button>
                ${isUserAdminOrKetua() ? `
                    <button onclick="openModal('assignment')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Tambah Tugas
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- H-1 REMINDER ALERT CONTAINER -->
        <div id="assignment-h1-alert-container"></div>

        <!-- KPI SUMMARY CARDS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="assignment-kpi-container">
            <!-- Dynamically populated in drawAssignmentTable() -->
        </div>

        <!-- FILTERS -->
        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="assignment-search-input" oninput="handleAssignmentSearch(this.value)" value="${assignmentSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none placeholder-slate-450 dark:text-white text-slate-750 transition-all" placeholder="Cari tugas, deskripsi, PIC, tanggal...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-400"></i> Bulan:</span>
                <select id="assignment-month-select" oninput="handleAssignmentMonthFilter(this.value)" onchange="handleAssignmentMonthFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Bulan</option>
                    ${(() => {
                        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        const monthMap = new Map();
                        const allTasksForMonth = [
                            ...(db.assignments || []),
                            ...(db.contentPlanner || []),
                            ...(db.rekapRutin || []),
                            ...(db.adHoc || []),
                            ...(db.protokoler || []),
                            ...(db.mc || []),
                            ...(db.brsRilis || []),
                            ...(db.hariBesar || [])
                        ];
                        allTasksForMonth.forEach(item => {
                            const dStr = item.deadline || item.tanggal || item.tanggal_penugasan || item.jadwal || item.tanggal_rilis;
                            const dFormatted = formatDateInput(dStr);
                            if (dFormatted && dFormatted.length >= 7) {
                                const key = dFormatted.slice(0, 7);
                                const [y, m] = key.split('-');
                                const mIdx = parseInt(m, 10) - 1;
                                if (mIdx >= 0 && mIdx < 12) {
                                    monthMap.set(key, `${monthNames[mIdx]} ${y}`);
                                }
                            }
                        });
                        const sortedKeys = Array.from(monthMap.keys()).sort().reverse();
                        return sortedKeys.map(k => `<option ${assignmentMonthFilter === k ? 'selected' : ''} value="${k}">${monthMap.get(k)}</option>`).join('');
                    })()}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-400"></i> Status:</span>
                <select id="assignment-status-select" oninput="handleAssignmentStatusFilter(this.value)" onchange="handleAssignmentStatusFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Status</option>
                    <option ${assignmentStatusFilter === 'Belum Mulai' ? 'selected' : ''} value="Belum Mulai">Belum Mulai</option>
                    <option ${assignmentStatusFilter === 'Sedang Dikerjakan' ? 'selected' : ''} value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                    <option ${assignmentStatusFilter === 'Selesai' ? 'selected' : ''} value="Selesai">Selesai</option>
                    <option ${assignmentStatusFilter === 'Revisi' ? 'selected' : ''} value="Revisi">Revisi</option>
                    <option ${assignmentStatusFilter === 'Draft' ? 'selected' : ''} value="Draft">Draft</option>
                    <option ${assignmentStatusFilter === 'In Progress' ? 'selected' : ''} value="In Progress">In Progress</option>
                    <option ${assignmentStatusFilter === 'Done' ? 'selected' : ''} value="Done">Done</option>
                    <option ${assignmentStatusFilter === 'Posted' ? 'selected' : ''} value="Posted">Posted</option>
                    <option ${assignmentStatusFilter === 'Ditugaskan' ? 'selected' : ''} value="Ditugaskan">Ditugaskan</option>
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-triangle-exclamation mr-1 text-slate-400"></i> Prioritas:</span>
                <select id="assignment-priority-select" oninput="handleAssignmentPriorityFilter(this.value)" onchange="handleAssignmentPriorityFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Prioritas</option>
                    <option ${assignmentPriorityFilter === 'Tinggi' ? 'selected' : ''} value="Tinggi">Tinggi</option>
                    <option ${assignmentPriorityFilter === 'Sedang' ? 'selected' : ''} value="Sedang">Sedang</option>
                    <option ${assignmentPriorityFilter === 'Rendah' ? 'selected' : ''} value="Rendah">Rendah</option>
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetAssignmentFilters()" class="w-full btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <!-- TABLE VIEW -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <!-- Desktop Table -->
            <div class="desktop-table-view hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 select-none">
                            <th class="py-3.5 px-4 w-12 text-center">No</th>
                            <th onclick="handleAssignmentSort('tugas')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 min-w-[150px]">
                                Nama Tugas <span id="sort-icon-tugas" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th class="py-3.5 px-4 min-w-[200px]">Deskripsi Detail / Modul</th>
                            <th onclick="handleAssignmentSort('prioritas')" class="py-3.5 px-4 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center">
                                Prioritas <span id="sort-icon-prioritas" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handleAssignmentSort('status')" class="py-3.5 px-4 w-32 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center">
                                Status <span id="sort-icon-status-asgn" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handleAssignmentSort('tanggal_penugasan')" class="py-3.5 px-4 w-32 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                Ditugaskan <span id="sort-icon-tanggal_penugasan" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handleAssignmentSort('deadline')" class="py-3.5 px-4 w-32 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                Deadline <span id="sort-icon-deadline" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handleAssignmentSort('progres')" class="py-3.5 px-4 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center">
                                Progres <span id="sort-icon-progres-asgn" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handleAssignmentSort('assigned_to')" class="py-3.5 px-4 w-36 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                PIC <span id="sort-icon-assigned_to" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th class="py-3.5 px-4 w-24 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="assignment-table-body" class="text-xs divide-y divide-slate-100 dark:divide-slate-800">
                        <!-- Dynamically populated -->
                    </tbody>
                </table>
            </div>
            <!-- Mobile Card View -->
            <div class="mobile-table-view md:hidden p-4 space-y-3" id="assignment-mobile-body">
                <!-- Dynamically populated -->
            </div>
        </div>
    `;

    drawAssignmentTable();

    // Otomatis jalankan sistem pengingat H-1 dan notifikasi toast saat membuka menu Assignment
    setTimeout(() => {
        if (typeof window.triggerAssignmentH1Reminders === 'function') {
            window.triggerAssignmentH1Reminders(false);
        }
    }, 200);
}

window.drawAssignmentTable = function() {
    const tableBody = document.getElementById('assignment-table-body');
    const kpiContainer = document.getElementById('assignment-kpi-container');
    if (!tableBody) return;

    // 1. Gather all tasks from different tables assigned to current logged-in user
    let aggregated = [
        ...db.assignments.filter(isTaskForCurrentUser).map(item => ({
            id: `asgn-${item.id}`,
            originalType: 'assignment',
            originalId: item.id,
            tugas: item.tugas,
            deskripsi: item.deskripsi || '-',
            prioritas: item.prioritas || 'Sedang',
            status: item.status || 'Belum Mulai',
            tanggal_penugasan: item.tanggal_penugasan,
            deadline: item.deadline,
            progres: item.progres || 0,
            lampiran: item.lampiran || '',
            assigned_to: item.assigned_to || '-'
        })),
        ...db.contentPlanner.filter(isTaskForCurrentUser).map(item => ({
            id: `planner-${item.id}`,
            originalType: 'content',
            originalId: item.id,
            tugas: `[Rencana Konten] ${item.judul}`,
            deskripsi: item.konsep || '-',
            prioritas: 'Sedang',
            status: item.status || 'Draft',
            tanggal_penugasan: item.jadwal,
            deadline: item.jadwal,
            progres: item.progres || 0,
            lampiran: item.lampiran || '',
            assigned_to: item['assign To'] || item.assignTo || item.assignedTo || item.pic || '-'
        })),
        ...db.rekapRutin.filter(isTaskForCurrentUser).map(item => ({
            id: `rutin-${item.id}`,
            originalType: 'rekap_rutin',
            originalId: item.id,
            tugas: `[Rutin] ${item.kegiatan}`,
            deskripsi: item.rubrikasi || '-',
            prioritas: 'Sedang',
            status: item.status || 'Ditugaskan',
            tanggal_penugasan: item.tanggal,
            deadline: item.tanggal,
            progres: item.status === 'Selesai' ? 100 : 0,
            lampiran: '',
            assigned_to: item.petugas || '-'
        })),
        ...db.adHoc.filter(isTaskForCurrentUser).map(item => ({
            id: `adhoc-${item.id}`,
            originalType: 'ad_hoc',
            originalId: item.id,
            tugas: `[AdHoc] ${item.kegiatan}`,
            deskripsi: item.keterangan || '-',
            prioritas: 'Sedang',
            status: item.status || 'Ditugaskan',
            tanggal_penugasan: item.tanggal,
            deadline: item.tanggal,
            progres: item.status === 'Selesai' ? 100 : 0,
            lampiran: '',
            assigned_to: item.petugas || '-'
        })),
        ...db.protokoler.filter(isTaskForCurrentUser).map(item => ({
            id: `protokoler-${item.id}`,
            originalType: 'protokoler',
            originalId: item.id,
            tugas: `[Protokoler] ${item.kegiatan}`,
            deskripsi: `Lokasi: ${item.lokasi || '-'}. ${item.keterangan || ''}`,
            prioritas: item.level === 'VVIP' || item.level === 'VIP' ? 'Tinggi' : 'Sedang',
            status: item.status || 'Ditugaskan',
            tanggal_penugasan: item.tanggal,
            deadline: item.tanggal,
            progres: item.status === 'Selesai' ? 100 : 0,
            lampiran: '',
            assigned_to: item.petugas || '-'
        })),
        ...db.mc.filter(isTaskForCurrentUser).map(item => ({
            id: `mc-${item.id}`,
            originalType: 'mc',
            originalId: item.id,
            tugas: `[MC] ${item.kegiatan}`,
            deskripsi: `Lokasi: ${item.lokasi || '-'}. ${item.keterangan || ''}`,
            prioritas: item.level === 'VIP' ? 'Tinggi' : 'Sedang',
            status: item.status || 'Ditugaskan',
            tanggal_penugasan: item.tanggal,
            deadline: item.tanggal,
            progres: item.status === 'Selesai' ? 100 : 0,
            lampiran: '',
            assigned_to: item.petugas || '-'
        })),
        ...db.brsRilis.filter(isTaskForCurrentUser).map(item => ({
            id: `brs-${item.id}`,
            originalType: 'brs_rilis',
            originalId: item.id,
            tugas: `[BRS] ${item.judul}`,
            deskripsi: `Poster: ${item.pic_poster_info || '-'}. Dok: ${item.pic_doc_ruang || '-'}. Zoom/YT: ${item.pic_doc_yt_zoom || '-'}`,
            prioritas: 'Tinggi',
            status: 'Rilis',
            tanggal_penugasan: item.tanggal_rilis,
            deadline: item.tanggal_rilis,
            progres: 100,
            lampiran: item.highlight || '',
            assigned_to: `${item.pic_poster_info || ''} ${item.pic_doc_ruang || ''} ${item.pic_doc_yt_zoom || ''}`.trim() || '-'
        })),
        ...db.hariBesar.filter(isTaskForCurrentUser).map(item => ({
            id: `hb-${item.id}`,
            originalType: 'hari_besar',
            originalId: item.id,
            tugas: `[HariBesar] ${item.hari_besar}`,
            deskripsi: `Ucapan Hari Besar`,
            prioritas: 'Sedang',
            status: item.status || 'Draft',
            tanggal_penugasan: item.tanggal,
            deadline: item.tanggal,
            progres: item.status === 'Posted' ? 100 : 0,
            lampiran: item.data_pendukung || '',
            assigned_to: item.pembuat_konten || '-'
        }))
    ];

    // 2. Count statistics for KPI cards (using the aggregated list)
    const totalCount = aggregated.length;
    const pendingCount = aggregated.filter(item => ['Belum Mulai', 'Draft', 'Ditugaskan'].includes(item.status)).length;
    const progressCount = aggregated.filter(item => ['Sedang Dikerjakan', 'In Progress', 'Revisi'].includes(item.status)).length;
    const completedCount = aggregated.filter(item => ['Selesai', 'Done', 'Posted', 'Rilis'].includes(item.status)).length;

    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Tugas</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${totalCount}</p>
                </div>
                <div class="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-655 dark:text-indigo-400 font-bold text-lg"><i class="fa-solid fa-clipboard-list"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Belum Mulai</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${pendingCount}</p>
                </div>
                <div class="w-11 h-11 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-455 font-bold text-lg"><i class="fa-regular fa-circle-play"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sedang Dikerjakan</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${progressCount}</p>
                </div>
                <div class="w-11 h-11 bg-blue-50 dark:bg-blue-955/40 rounded-xl flex items-center justify-center text-blue-655 dark:text-blue-400 font-bold text-lg"><i class="fa-solid fa-arrows-spin animate-spin-slow"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selesai</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${completedCount}</p>
                </div>
                <div class="w-11 h-11 bg-emerald-50 dark:bg-emerald-955/40 rounded-xl flex items-center justify-center text-emerald-655 dark:text-emerald-400 font-bold text-lg"><i class="fa-regular fa-circle-check"></i></div>
            </div>
        `;
    }

    // 3. Search filter
    if (assignmentSearch.trim()) {
        const query = assignmentSearch.toLowerCase().trim();
        aggregated = aggregated.filter(item => {
            const dateStr = item.deadline || item.tanggal || item.tanggal_penugasan || '';
            const dateFormatted = typeof formatDate === 'function' ? formatDate(dateStr) : '';
            const dateInput = typeof formatDateInput === 'function' ? formatDateInput(dateStr) : '';
            return (
                (item.tugas && item.tugas.toLowerCase().includes(query)) ||
                (item.deskripsi && item.deskripsi.toLowerCase().includes(query)) ||
                (item.assigned_to && item.assigned_to.toLowerCase().includes(query)) ||
                (item.petugas && item.petugas.toLowerCase().includes(query)) ||
                (item.status && item.status.toLowerCase().includes(query)) ||
                (item.prioritas && item.prioritas.toLowerCase().includes(query)) ||
                (dateStr && String(dateStr).toLowerCase().includes(query)) ||
                (dateFormatted && dateFormatted.toLowerCase().includes(query)) ||
                (dateInput && dateInput.toLowerCase().includes(query))
            );
        });
    }

    // 4. Month filter
    if (assignmentMonthFilter) {
        aggregated = aggregated.filter(item => {
            const d = formatDateInput(item.deadline || item.tanggal_penugasan);
            return d && d.startsWith(assignmentMonthFilter);
        });
    }

    // 5. Status filter
    if (assignmentStatusFilter) {
        aggregated = aggregated.filter(item => item.status === assignmentStatusFilter);
    }

    // 6. Priority filter
    if (assignmentPriorityFilter) {
        aggregated = aggregated.filter(item => item.prioritas === assignmentPriorityFilter);
    }

    // 6b. H-1 Filter (Tenggat Waktu Besok)
    if (window.assignmentH1Only) {
        const nowWIB = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
        const todayMid = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), nowWIB.getDate()).getTime();
        aggregated = aggregated.filter(item => {
            const isDone = (['Selesai', 'Done', 'Posted', 'Rilis'].includes(item.status) || Number(item.progres) >= 100);
            if (isDone) return false;
            const dStr = item.deadline || item.tanggal_penugasan;
            if (!dStr && dStr !== 0) return false;
            const parsed = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : new Date(dStr);
            if (!parsed || isNaN(parsed.getTime())) return false;
            const dMid = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
            const diffDays = Math.round((dMid - todayMid) / (1000 * 60 * 60 * 24));
            return diffDays === 1;
        });
    }

    // 7. Sorting: Tugas yang sudah selesai ditaruh di bawah, yang terdekat / mendesak di atas
    aggregated.sort((a, b) => {
        const isDoneA = (['Selesai', 'Done', 'Posted', 'Rilis'].includes(a.status) || Number(a.progres) >= 100) ? 1 : 0;
        const isDoneB = (['Selesai', 'Done', 'Posted', 'Rilis'].includes(b.status) || Number(b.progres) >= 100) ? 1 : 0;

        // Jika status selesai berbeda: yang belum selesai selalu di atas (0 duluan, 1 di bawah)
        if (isDoneA !== isDoneB) {
            return isDoneA - isDoneB;
        }

        if (assignmentSortField !== 'deadline') {
            let valA = a[assignmentSortField] || '';
            let valB = b[assignmentSortField] || '';

            if (assignmentSortField === 'progres') {
                valA = Number(valA);
                valB = Number(valB);
            } else if (assignmentSortField === 'tanggal_penugasan') {
                valA = new Date(valA || '1970-01-01');
                valB = new Date(valB || '1970-01-01');
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }

            if (valA < valB) return assignmentSortAsc ? -1 : 1;
            if (valA > valB) return assignmentSortAsc ? 1 : -1;
            return 0;
        }

        // Default sort deadline: batas waktu terdekat paling atas
        const dateAStr = a.deadline || a.tanggal_penugasan || '9999-12-31';
        const dateBStr = b.deadline || b.tanggal_penugasan || '9999-12-31';
        const dateA = new Date(dateAStr).getTime();
        const dateB = new Date(dateBStr).getTime();

        if (dateA !== dateB) {
            return assignmentSortAsc ? dateA - dateB : dateB - dateA;
        }
        return 0;
    });

    // 8. Update sort icons
    const sortFields = ['tugas', 'prioritas', 'status', 'tanggal_penugasan', 'deadline', 'progres', 'assigned_to'];
    sortFields.forEach(f => {
        const idName = f === 'status' ? 'sort-icon-status-asgn' : (f === 'progres' ? 'sort-icon-progres-asgn' : `sort-icon-${f}`);
        const iconEl = document.getElementById(idName);
        if (iconEl) {
            if (assignmentSortField === f) {
                iconEl.innerHTML = assignmentSortAsc ? '<i class="fa-solid fa-sort-up text-indigo-500"></i>' : '<i class="fa-solid fa-sort-down text-indigo-500"></i>';
            } else {
                iconEl.innerHTML = '<i class="fa-solid fa-sort"></i>';
            }
        }
    });

    const isKepala = currentUser.role === 'kepala';

    if (aggregated.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-350 dark:text-slate-600"></i>
                        <p class="text-xs font-bold uppercase tracking-wider">Data Penugasan Kosong</p>
                        <p class="text-[10px] mt-0.5">Belum ada tugas atau peran yang ditugaskan kepada Anda</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = aggregated.map((item, index) => {
        const initials = getPicInitials(item.assigned_to);
        const avatarBg = getAvatarBg(item.assigned_to);
        const isDone = (['Selesai', 'Done', 'Posted', 'Rilis'].includes(item.status) || Number(item.progres) >= 100);

        // Status Badge Style
        let statusBadge = '';
        switch (item.status) {
            case 'Belum Mulai':
            case 'Draft':
                statusBadge = `<span class="px-2.5 py-1 bg-slate-105 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-655">${item.status}</span>`;
                break;
            case 'Sedang Dikerjakan':
            case 'In Progress':
            case 'Ditugaskan':
                statusBadge = `<span class="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-955/40 dark:text-blue-300 rounded-full text-[10px] font-bold border border-blue-105 dark:border-blue-900/65">${item.status}</span>`;
                break;
            case 'Selesai':
            case 'Done':
            case 'Posted':
            case 'Rilis':
                statusBadge = `<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-955/40 dark:text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-105 dark:border-emerald-900/65">${item.status}</span>`;
                break;
            case 'Revisi':
                statusBadge = '<span class="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-955/40 dark:text-rose-300 rounded-full text-[10px] font-bold border border-rose-105 dark:border-rose-900/65">Revisi</span>';
                break;
            default:
                statusBadge = `<span class="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-bold">${item.status || '-'}</span>`;
        }

        // Priority Badge Style
        let priorityBadge = '';
        switch (item.prioritas) {
            case 'Tinggi':
                priorityBadge = '<span class="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-955 dark:text-rose-300 border border-rose-100 dark:border-rose-900 rounded text-[9px] font-extrabold uppercase">Tinggi</span>';
                break;
            case 'Sedang':
                priorityBadge = '<span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-955 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 rounded text-[9px] font-extrabold uppercase">Sedang</span>';
                break;
            case 'Rendah':
                priorityBadge = '<span class="px-2 py-0.5 bg-slate-50 text-slate-655 dark:bg-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-655 rounded text-[9px] font-bold uppercase">Rendah</span>';
                break;
            default:
                priorityBadge = `<span class="px-2 py-0.5 bg-slate-50 text-slate-655 rounded text-[9px] font-bold">${item.prioritas || '-'}</span>`;
        }

        const actions = `
            <td class="py-3 px-4 text-center">
                <div class="flex justify-center items-center gap-1.5">
                    ${!isKepala ? `
                        <button onclick="openModalById('${item.originalType}', ${item.originalId})" title="Ubah status & progres" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                    ` : ''}
                    ${isUserAdminOrKetua() && item.originalType === 'assignment' ? `
                        <button onclick="deleteItem('assignment', ${item.originalId})" title="Hapus tugas" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <i class="fa-solid fa-trash text-[10px]"></i>
                        </button>
                    ` : ''}
                    <button onclick="showDetailById('${item.originalType}', ${item.originalId})" title="Lihat rincian" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                        <i class="fa-solid fa-eye text-[10px]"></i>
                    </button>
                </div>
            </td>
        `;

        const rowBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 hover:bg-emerald-100/75 dark:hover:bg-emerald-900/40 border-l-4 border-l-emerald-500' 
            : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/40';

        return `
            <tr class="${rowBg} transition-colors">
                <td class="py-3.5 px-4 text-center font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}">${index + 1}</td>
                <td class="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 min-w-[150px] max-w-[250px]">
                    <span onclick="showDetailById('${item.originalType}', ${item.originalId})" class="hover:text-indigo-655 dark:hover:text-indigo-400 transition-colors cursor-pointer block truncate" title="${item.tugas}">${item.tugas}</span>
                </td>
                <td class="py-3.5 px-4 text-slate-550 dark:text-slate-405 min-w-[200px] max-w-[300px]">
                    <p class="line-clamp-2 leading-relaxed" title="${item.deskripsi || ''}">${item.deskripsi || '-'}</p>
                </td>
                <td class="py-3.5 px-4 text-center">${priorityBadge}</td>
                <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                <td class="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    ${formatDate(item.tanggal_penugasan)}
                </td>
                <td class="py-3.5 px-4 font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-655 dark:text-rose-400'} whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${isDone ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}"><i class="fa-regular fa-calendar-check text-[10px]"></i> ${formatDate(item.deadline)}</span>
                </td>
                <td class="py-3.5 px-4 text-center">
                    <div class="flex flex-col items-center justify-center gap-1 min-w-[80px]">
                        <span class="font-bold text-[10px] ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-455'}">${item.progres || 0}%</span>
                        <div class="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                            <div class="${isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-650'} h-1 rounded-full" style="width: ${item.progres || 0}%"></div>
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border border-slate-200 dark:border-slate-700 shadow-xs ${avatarBg}" title="${item.assigned_to}">${initials}</div>
                        <span class="font-bold text-[10px] text-slate-655 dark:text-slate-400 truncate max-w-[80px]">${item.assigned_to || '-'}</span>
                    </div>
                </td>
                ${actions}
            </tr>
        `;
    }).join('');

    // Mobile card view for Assignment
    const mobileBody = document.getElementById('assignment-mobile-body');
    if (mobileBody) {
        if (aggregated.length === 0) {
            mobileBody.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-folder-open"></i></div><p class="empty-state-title">Tidak Ada Tugas</p><p class="empty-state-desc">Belum ada tugas yang ditugaskan kepada Anda.</p></div>`;
        } else {
            mobileBody.innerHTML = aggregated.map((item, index) => {
                const initials2 = getPicInitials(item.assigned_to);
                const avatarBg2 = getAvatarBg(item.assigned_to);
                const isDone2 = (['Selesai', 'Done', 'Posted', 'Rilis'].includes(item.status) || Number(item.progres) >= 100);
                let statusCls = 'badge badge-neutral';
                if (['Sedang Dikerjakan','In Progress','Ditugaskan'].includes(item.status)) statusCls = 'badge badge-progress';
                else if (isDone2) statusCls = 'badge badge-selesai';
                else if (item.status === 'Revisi') statusCls = 'badge badge-terlambat';
                return `
                    <div class="${isDone2 ? 'mobile-data-card cursor-pointer bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 border-l-4 border-l-emerald-500' : 'mobile-data-card cursor-pointer'}" onclick="showDetailById('${item.originalType}', ${item.originalId})">
                        <div class="flex items-start justify-between gap-2 mb-2">
                            <p class="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-snug truncate flex-1 min-w-0">${item.tugas}</p>
                            <span class="${statusCls} shrink-0">${item.status || '-'}</span>
                        </div>
                        <p class="text-[10px] text-slate-500 mb-2 line-clamp-2">${item.deskripsi || '-'}</p>
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${avatarBg2}">${initials2}</div>
                                <span class="text-[10px] font-semibold text-slate-500">${item.assigned_to || '-'}</span>
                            </div>
                            <span class="text-[9px] font-bold ${isDone2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}"><i class="fa-regular fa-calendar-check mr-1"></i>${formatDate(item.deadline)}</span>
                        </div>
                        <div class="mt-2.5">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-[9px] text-slate-400 font-semibold">Progres</span>
                                <span class="text-[9px] font-bold ${isDone2 ? 'text-emerald-600' : 'text-indigo-600'}">${item.progres || 0}%</span>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                <div class="${isDone2 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'} h-1.5 rounded-full" style="width:${item.progres || 0}%"></div>
                            </div>
                        </div>
                    </div>`;
            }).join('');
        }
    }
};

window.handleAssignmentSearch = function(val) {
    assignmentSearch = val;
    drawAssignmentTable();
};

window.handleAssignmentMonthFilter = function(val) {
    assignmentMonthFilter = val;
    drawAssignmentTable();
};

window.handleAssignmentStatusFilter = function(val) {
    assignmentStatusFilter = val;
    drawAssignmentTable();
};

window.handleAssignmentPriorityFilter = function(val) {
    assignmentPriorityFilter = val;
    drawAssignmentTable();
};

window.resetAssignmentFilters = function() {
    window.assignmentH1Only = false;
    assignmentSearch = '';
    assignmentMonthFilter = '';
    assignmentStatusFilter = '';
    assignmentPriorityFilter = '';
    const searchInput = document.getElementById('assignment-search-input');
    if (searchInput) searchInput.value = '';
    const monthSelect = document.getElementById('assignment-month-select');
    if (monthSelect) monthSelect.value = '';
    const statusSelect = document.getElementById('assignment-status-select');
    if (statusSelect) statusSelect.value = '';
    const prioritySelect = document.getElementById('assignment-priority-select');
    if (prioritySelect) prioritySelect.value = '';
    drawAssignmentTable();
};

window.handleAssignmentSort = function(field) {
    if (assignmentSortField === field) {
        assignmentSortAsc = !assignmentSortAsc;
    } else {
        assignmentSortField = field;
        assignmentSortAsc = true;
    }
    drawAssignmentTable();
};

/**
 * Sistem Pengingat Otomatis Tugas Mendekati Tenggat Waktu (H-1) pada menu Assignment
 * @param {boolean} isManual - apakah dipicu oleh tombol Pengingat H-1 atau otomatis saat membuka Assignment
 */
window.triggerAssignmentH1Reminders = function(isManual = false) {
    const alertContainer = document.getElementById('assignment-h1-alert-container');
    const badgeEl = document.getElementById('h1-badge-count');

    const nowWIB = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    const todayMidnight = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), nowWIB.getDate()).getTime();

    const isCompleted = (item) => {
        if (!item) return true;
        if (Number(item.progres || 0) >= 100) return true;
        const st = String(item.status || '').toLowerCase().trim();
        return ['selesai', 'done', 'posted', 'rilis', 'sukses', 'published', 'tercapai'].includes(st);
    };

    const rawSources = [
        ...(db.assignments || []).map(i => ({ ...i, originalType: 'assignment', tugas: i.tugas, deadline: i.deadline || i.tanggal_penugasan, assigned_to: i.assigned_to || '-' })),
        ...(db.contentPlanner || []).map(i => ({ ...i, originalType: 'content', tugas: `[Konten] ${i.judul}`, deadline: i.jadwal || i.tanggal_posting, assigned_to: i['assign To'] || i.assignTo || i.assignedTo || i.pic || '-' })),
        ...(db.rekapRutin || []).map(i => ({ ...i, originalType: 'rekap_rutin', tugas: `[Rutin] ${i.kegiatan}`, deadline: i.tanggal, assigned_to: i.petugas || '-' })),
        ...(db.adHoc || []).map(i => ({ ...i, originalType: 'ad_hoc', tugas: `[AdHoc] ${i.kegiatan}`, deadline: i.tanggal, assigned_to: i.petugas || '-' })),
        ...(db.protokoler || []).map(i => ({ ...i, originalType: 'protokoler', tugas: `[Protokol] ${i.kegiatan}`, deadline: i.tanggal, assigned_to: i.petugas || '-' })),
        ...(db.mc || []).map(i => ({ ...i, originalType: 'mc', tugas: `[MC] ${i.kegiatan}`, deadline: i.tanggal, assigned_to: i.petugas || '-' })),
        ...(db.brsRilis || []).map(i => ({ ...i, originalType: 'brs_rilis', tugas: `[BRS] ${i.judul}`, deadline: i.tanggal_rilis, assigned_to: i.pic_poster_info || 'Tim Humas' })),
        ...(db.hariBesar || []).map(i => ({ ...i, originalType: 'hari_besar', tugas: `[HariBesar] ${i.hari_besar}`, deadline: i.tanggal, assigned_to: i.pembuat_konten || '-' })),
        ...(db.tickets || []).filter(t => t.status === 'Approved').map(i => ({ ...i, originalType: 'ticket', tugas: `[Layanan] ${i.judul}`, deadline: i.deadline, assigned_to: i.pic || '-' }))
    ];

    const accessibleTasks = rawSources.filter(isTaskForCurrentUser);

    const upcomingTasks = [];
    accessibleTasks.forEach(task => {
        if (isCompleted(task)) return;
        const dStr = task.deadline;
        if (!dStr && dStr !== 0) return;
        const parsed = typeof parseIndonesianDate === 'function' ? parseIndonesianDate(dStr) : new Date(dStr);
        if (!parsed || isNaN(parsed.getTime())) return;

        const targetMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
        const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

        upcomingTasks.push({
            ...task,
            parsedDate: parsed,
            diffDays
        });
    });

    const h1Tasks = upcomingTasks.filter(t => t.diffDays === 1);
    const todayTasks = upcomingTasks.filter(t => t.diffDays === 0);

    // Update Badge Count di header Assignment
    if (badgeEl) {
        if (h1Tasks.length > 0) {
            badgeEl.textContent = h1Tasks.length;
            badgeEl.className = 'px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white animate-pulse';
            badgeEl.classList.remove('hidden');
        } else if (todayTasks.length > 0) {
            badgeEl.textContent = todayTasks.length;
            badgeEl.className = 'px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white';
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }
    }

    // Render alert banner pada container jika ada tugas H-1 (atau hari H)
    if (alertContainer) {
        if (h1Tasks.length > 0) {
            const tomorrowDate = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), nowWIB.getDate() + 1);
            const tomorrowStr = typeof formatDate === 'function' ? formatDate(tomorrowDate) : tomorrowDate.toLocaleDateString('id-ID');

            alertContainer.innerHTML = `
                <div class="mb-6 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/80 shadow-xs animate-fade-in">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 pb-3 border-b border-amber-200/80 dark:border-amber-800/60">
                        <div class="flex items-center gap-3">
                            <span class="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base shadow-sm shrink-0 animate-bounce">
                                <i class="fa-solid fa-bell"></i>
                            </span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h4 class="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                                        Peringatan Tenggat Waktu Mendekati (H-1)
                                    </h4>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-white shadow-xs">
                                        ${h1Tasks.length} Tugas Besok
                                    </span>
                                </div>
                                <p class="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                                    Tugas berikut memiliki tenggat waktu pada hari esok (<strong>${tomorrowStr}</strong>). Pastikan koordinasi dan pelaksanaan tugas segera dituntaskan.
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <button onclick="window.filterAssignmentByH1()" class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer">
                                <i class="fa-solid fa-filter text-[10px]"></i> Tampilkan Hanya H-1
                            </button>
                            <button onclick="window.dismissH1Banner()" class="w-7 h-7 rounded-lg text-amber-700 hover:text-amber-950 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 flex items-center justify-center transition-all cursor-pointer" title="Tutup pemberitahuan">
                                <i class="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        ${h1Tasks.map(t => {
                            const initials = typeof getPicInitials === 'function' ? getPicInitials(t.assigned_to) : '?';
                            const avatarBg = typeof getAvatarBg === 'function' ? getAvatarBg(t.assigned_to) : 'bg-slate-200';
                            return `
                                <div class="p-3 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-amber-200/90 dark:border-amber-800/70 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all">
                                    <div>
                                        <div class="flex items-start justify-between gap-1 mb-1.5">
                                            <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                                                H-1 (Besok)
                                            </span>
                                            <span class="text-[9px] font-bold text-slate-400 uppercase">${t.originalType.replace('_', ' ')}</span>
                                        </div>
                                        <p class="text-xs font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-amber-600 dark:hover:text-amber-400" onclick="showDetailById('${t.originalType}', ${t.id || t.originalId})">
                                            ${t.tugas}
                                        </p>
                                    </div>
                                    <div class="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                        <div class="flex items-center gap-1.5 min-w-0">
                                            <div class="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${avatarBg}">${initials}</div>
                                            <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[90px]">${t.assigned_to}</span>
                                        </div>
                                        <div class="flex items-center gap-1 shrink-0">
                                            ${t.originalType === 'assignment' || t.originalType === 'content' ? `
                                                <button onclick="openModalById('${t.originalType}', ${t.id || t.originalId})" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-all" title="Perbarui progres">
                                                    Update
                                                </button>
                                            ` : ''}
                                            <button onclick="showDetailById('${t.originalType}', ${t.id || t.originalId})" class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all" title="Lihat rincian tugas">
                                                Rincian
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } else if (todayTasks.length > 0 && isManual) {
            alertContainer.innerHTML = `
                <div class="mb-6 p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-300/80 dark:border-rose-700/80 shadow-xs animate-fade-in flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center text-sm shadow-xs shrink-0 animate-pulse">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </span>
                        <div>
                            <h4 class="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-200">
                                Perhatian: Ada ${todayTasks.length} Tugas Batas Waktu Hari Ini (Hari-H)
                            </h4>
                            <p class="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                                Tidak ada tugas berstatus H-1 (besok), namun terdapat tugas yang tenggat waktunya hari ini.
                            </p>
                        </div>
                    </div>
                    <button onclick="window.dismissH1Banner()" class="text-rose-700 hover:text-rose-950 p-1">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            `;
        } else if (isManual) {
            alertContainer.innerHTML = `
                <div class="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300/70 dark:border-emerald-700/70 shadow-xs animate-fade-in flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0">
                            <i class="fa-solid fa-circle-check"></i>
                        </span>
                        <p class="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            Semua tugas tim aman! Tidak ada tugas yang mendekati tenggat waktu (H-1).
                        </p>
                    </div>
                    <button onclick="window.dismissH1Banner()" class="text-emerald-700 hover:text-emerald-950 p-1">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            `;
        } else {
            alertContainer.innerHTML = '';
        }
    }

    // Tampilkan Notifikasi Toast Otomatis
    if (h1Tasks.length > 0) {
        if (h1Tasks.length === 1) {
            const firstTask = h1Tasks[0];
            const dFormatted = typeof formatDate === 'function' ? formatDate(firstTask.deadline) : firstTask.deadline;
            if (typeof showToast === 'function') {
                showToast(
                    `⚠️ <strong>Pengingat H-1:</strong> Tugas "${firstTask.tugas}" mendekati tenggat waktu besok (${dFormatted})! PIC: <strong>${firstTask.assigned_to}</strong>.`,
                    'warning',
                    7000,
                    () => {
                        if (typeof showDetailById === 'function') {
                            showDetailById(firstTask.originalType, firstTask.id || firstTask.originalId);
                        }
                    }
                );
            }
        } else {
            if (typeof showToast === 'function') {
                showToast(
                    `⚠️ <strong>Pengingat H-1:</strong> Terdapat <strong>${h1Tasks.length} tugas</strong> mendekati tenggat waktu besok! Segera cek dan selesaikan.`,
                    'warning',
                    7000,
                    () => {
                        document.getElementById('assignment-h1-alert-container')?.scrollIntoView({ behavior: 'smooth' });
                    }
                );
            }
        }
    } else if (todayTasks.length > 0 && isManual) {
        if (typeof showToast === 'function') {
            showToast(`🚨 <strong>Perhatian:</strong> Terdapat ${todayTasks.length} tugas dengan tenggat waktu hari ini!`, 'warning', 6000);
        }
    } else if (isManual) {
        if (typeof showToast === 'function') {
            showToast('✅ Semua tugas tim aman! Tidak ada tugas yang mendekati tenggat waktu (H-1).', 'success', 3500);
        }
    }
};

window.dismissH1Banner = function() {
    const alertContainer = document.getElementById('assignment-h1-alert-container');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
};

window.filterAssignmentByH1 = function() {
    window.assignmentH1Only = true;
    if (typeof drawAssignmentTable === 'function') {
        drawAssignmentTable();
    }
    if (typeof showToast === 'function') {
        showToast('Menampilkan daftar tugas dengan tenggat waktu H-1 (Besok)', 'info', 3000);
    }
};

// =============================================================
// 15. PUSAT DOKUMEN & REPOSITORY HUMAS VIEW
// =============================================================
let repoSearch = '';
let repoCategoryFilter = '';
let repoStatusFilter = '';
let repoSortField = 'tanggal';
let repoSortAsc = false;
let repoViewMode = 'grid';
let repoPage = 1;
const repoLimit = 9;
let repoActiveFolder = null; // null = Tampilan Awal (Folder Kategori)
window.repoActiveFolder = null;

// Normalisasi kategori agar kontak media, humas, dan protokoler bersatu ke 'Kontak Partner'
function normalizeRepoCategory(cat) {
    if (!cat) return 'Dokumen lainnya';
    const cLower = String(cat).toLowerCase().trim();
    if (
        cat === 'Kontak Partner' ||
        cat === 'Daftar Kontak Media/Wartawan' ||
        cat === 'Daftar Kontak Humas Instansi' ||
        cat === 'Daftar Kontak Protokoler Instansi' ||
        cLower.includes('kontak media') ||
        cLower.includes('kontak humas') ||
        cLower.includes('kontak protokol') ||
        cLower.includes('wartawan') ||
        cLower.includes('kontak partner')
    ) {
        return 'Kontak Partner';
    }
    if (cLower.includes('pedoman') || cLower.includes('juknis') || cLower.includes('sop')) return 'Pedoman';
    if (cLower.includes('template') || cLower.includes('desain')) return 'Template';
    if (cLower.includes('surat masuk')) return 'Surat Masuk Humas';
    if (cLower.includes('surat keluar')) return 'Surat Keluar Humas';
    return cat;
}

const REPO_FOLDER_DEFINITIONS = [
    {
        id: 'Pedoman',
        name: 'Pedoman & Juknis',
        subtitle: 'SOP, Juknis & Tata Kelola Kehumasan',
        icon: 'fa-book-bookmark',
        color: 'indigo',
        bgBox: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/80',
        badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
        desc: 'Panduan tata kelola penyebarluasan rilis data, SOP protokol pimpinan, dan standar infografis resmi.'
    },
    {
        id: 'Template',
        name: 'Template Desain',
        subtitle: 'Aset Canva, Adobe, Feed & Banner',
        icon: 'fa-cubes',
        color: 'violet',
        bgBox: 'bg-violet-50 dark:bg-violet-955/50 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/80',
        badge: 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700',
        desc: 'Kit template grafis resmi identitas visual BPS Kalbar untuk feed Instagram, carousel, dan banner website.'
    },
    {
        id: 'Surat Masuk Humas',
        name: 'Surat Masuk Humas',
        subtitle: 'Arsip Surat Masuk & Undangan',
        icon: 'fa-inbox',
        color: 'amber',
        bgBox: 'bg-amber-50 dark:bg-amber-955/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80',
        badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
        desc: 'Registri surat masuk, permohonan peliputan, permohonan narasumber, audiensi pimpinan, dan koordinasi mitra.'
    },
    {
        id: 'Surat Keluar Humas',
        name: 'Surat Keluar Humas',
        subtitle: 'Arsip Surat Keluar & Siaran Pers',
        icon: 'fa-paper-plane',
        color: 'sky',
        bgBox: 'bg-sky-50 dark:bg-sky-955/50 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/80',
        badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700',
        desc: 'Registri surat dinas kehumasan, undangan pers, siaran rilis statistik resmi, dan nota dinas tindak lanjut.'
    },
    {
        id: 'Kontak Partner',
        name: 'Kontak Partner',
        subtitle: 'Media / Wartawan, Humas & Protokoler',
        icon: 'fa-address-book',
        color: 'teal',
        bgBox: 'bg-teal-50 dark:bg-teal-955/50 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/80',
        badge: 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
        desc: 'Direktori terpadu kontak media partner/wartawan, kontak humas instansi pemerintah/lembaga, dan protokoler instansi mitra.'
    },
    {
        id: 'Dokumen lainnya',
        name: 'Dokumen Lainnya',
        subtitle: 'Arsip & Berkas Referensi Tambahan',
        icon: 'fa-folder-closed',
        color: 'slate',
        bgBox: 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        badge: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
        desc: 'Katalog arsip pendukung, dokumentasi kegiatan, referensi kehumasan umum, dan dokumen tambahan lainnya.'
    }
];

function getCategoryColor(rawCat) {
    const cat = normalizeRepoCategory(rawCat);
    switch (cat) {
        case 'Pedoman':
            return {
                bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
                icon: 'fa-book-open text-indigo-500',
                label: 'Pedoman & Juknis'
            };
        case 'Template':
            return {
                bg: 'bg-violet-50 dark:bg-violet-955/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
                icon: 'fa-cubes text-violet-500',
                label: 'Template Desain'
            };
        case 'Surat Masuk Humas':
            return {
                bg: 'bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                icon: 'fa-envelope-open-text text-amber-500',
                label: 'Surat Masuk'
            };
        case 'Surat Keluar Humas':
            return {
                bg: 'bg-sky-50 dark:bg-sky-955/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
                icon: 'fa-paper-plane text-sky-500',
                label: 'Surat Keluar'
            };
        case 'Kontak Partner':
            return {
                bg: 'bg-teal-50 dark:bg-teal-955/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
                icon: 'fa-address-book text-teal-500',
                label: 'Kontak Partner'
            };
        default:
            return {
                bg: 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
                icon: 'fa-folder text-slate-500',
                label: cat || 'Dokumen Lainnya'
            };
    }
}

function renderRepository(container) {
    const isKepala = currentUser && currentUser.role === 'kepala';
    const canManage = !isKepala && (isUserAdminOrKetua() || (currentUser && currentUser.role === 'tim'));

    container.innerHTML = `
        <div class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                        <i class="fa-solid fa-folder-tree mr-1"></i> Cloud Repository
                    </span>
                    <span class="text-[10px] text-slate-400 font-bold">&bull; BPS Kalbar</span>
                </div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pusat Dokumen & Repository</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Katalog arsip terpusat pedoman kehumasan, format template desain, registri surat resmi, dan daftar kontak partner BPS Provinsi Kalimantan Barat.
                </p>
            </div>
            <div class="flex items-center gap-2.5 self-stretch md:self-auto shrink-0">
                ${canManage ? `
                    <button onclick="openModal('repository')" class="btn-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm">
                        <i class="fa-solid fa-cloud-arrow-up"></i> Tambah Dokumen
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- KPI Statistic Cards -->
        <div id="repo-kpi-container" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"></div>

        <!-- Toolbar & Filter Controls -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs mb-6">
            <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                    <div class="relative flex-1 min-w-[200px]">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none text-xs">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </span>
                        <input type="text" id="repo-search-input" oninput="handleRepoSearch(this.value)" value="${repoSearch}" placeholder="Cari nama dokumen, deskripsi, atau PIC..." class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium transition-all">
                    </div>
                    <div class="flex items-center gap-2">
                        <select id="repo-category-select" onchange="handleRepoCategoryFilter(this.value)" class="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:border-indigo-500">
                            <option value="">Semua Folder / Kategori</option>
                            <option value="Pedoman" ${repoCategoryFilter === 'Pedoman' ? 'selected' : ''}>Pedoman & Juknis</option>
                            <option value="Template" ${repoCategoryFilter === 'Template' ? 'selected' : ''}>Template Desain</option>
                            <option value="Surat Masuk Humas" ${repoCategoryFilter === 'Surat Masuk Humas' ? 'selected' : ''}>Surat Masuk</option>
                            <option value="Surat Keluar Humas" ${repoCategoryFilter === 'Surat Keluar Humas' ? 'selected' : ''}>Surat Keluar</option>
                            <option value="Kontak Partner" ${repoCategoryFilter === 'Kontak Partner' ? 'selected' : ''}>Kontak Partner</option>
                            <option value="Dokumen lainnya" ${repoCategoryFilter === 'Dokumen lainnya' ? 'selected' : ''}>Dokumen Lainnya</option>
                        </select>
                        <select id="repo-status-select" onchange="handleRepoStatusFilter(this.value)" class="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:border-indigo-500">
                            <option value="">Semua Status</option>
                            <option value="Aktif" ${repoStatusFilter === 'Aktif' ? 'selected' : ''}>Aktif / Berlaku</option>
                            <option value="Diarsipkan" ${repoStatusFilter === 'Diarsipkan' ? 'selected' : ''}>Diarsipkan</option>
                        </select>
                        <button onclick="resetRepoFilters()" title="Reset Filter" class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shrink-0">
                            <i class="fa-solid fa-rotate-left text-xs"></i>
                        </button>
                    </div>
                </div>

                <!-- View Mode Switch -->
                <div class="flex items-center gap-1 self-end lg:self-auto bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shrink-0">
                    <button onclick="openRepoFolder(null)" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${repoActiveFolder === null && !repoSearch ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}">
                        <i class="fa-solid fa-folder-tree"></i> Folder
                    </button>
                    <button onclick="setRepoViewMode('grid')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${repoViewMode === 'grid' && (repoActiveFolder !== null || repoSearch) ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}">
                        <i class="fa-solid fa-grid-2"></i> Grid
                    </button>
                    <button onclick="setRepoViewMode('table')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${repoViewMode === 'table' && (repoActiveFolder !== null || repoSearch) ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}">
                        <i class="fa-solid fa-list-ul"></i> Tabel
                    </button>
                </div>
            </div>
        </div>

        <!-- Document Content Area -->
        <div id="repo-content-area" class="min-h-[300px]"></div>

        <!-- Pagination -->
        <div id="repo-pagination" class="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800"></div>
    `;

    drawRepositoryContent();
}

function drawRepositoryContent() {
    const kpiContainer = document.getElementById('repo-kpi-container');
    const contentArea = document.getElementById('repo-content-area');
    const pagination = document.getElementById('repo-pagination');
    if (!contentArea) return;

    let rawItems = (db.repository && Array.isArray(db.repository)) ? [...db.repository] : [];
    
    // Normalisasi setiap kategori dokumen
    let items = rawItems.map(item => ({
        ...item,
        kategori: normalizeRepoCategory(item.kategori)
    }));

    const isKepala = currentUser && currentUser.role === 'kepala';
    const canManage = !isKepala && (isUserAdminOrKetua() || (currentUser && currentUser.role === 'tim'));

    // Hitung statistik dokumen
    const totalDocs = items.length;
    const pedomanCount = items.filter(i => i.kategori === 'Pedoman').length;
    const templateCount = items.filter(i => i.kategori === 'Template').length;
    const kontakPartnerCount = items.filter(i => i.kategori === 'Kontak Partner').length;

    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div onclick="openRepoFolder(null)" class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in cursor-pointer hover:border-amber-400 transition-all">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Dokumen</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${totalDocs}</p>
                </div>
                <div class="w-11 h-11 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg"><i class="fa-solid fa-folder-open"></i></div>
            </div>
            <div onclick="openRepoFolder('Pedoman')" class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in cursor-pointer hover:border-indigo-400 transition-all">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pedoman & Juknis</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${pedomanCount}</p>
                </div>
                <div class="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-bold text-lg"><i class="fa-solid fa-book-bookmark"></i></div>
            </div>
            <div onclick="openRepoFolder('Template')" class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in cursor-pointer hover:border-violet-400 transition-all">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Template Desain</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${templateCount}</p>
                </div>
                <div class="w-11 h-11 bg-violet-50 dark:bg-violet-955/40 rounded-xl flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-lg"><i class="fa-solid fa-cubes"></i></div>
            </div>
            <div onclick="openRepoFolder('Kontak Partner')" class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in cursor-pointer hover:border-teal-400 transition-all">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kontak Partner</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${kontakPartnerCount}</p>
                </div>
                <div class="w-11 h-11 bg-teal-50 dark:bg-teal-955/40 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-lg"><i class="fa-solid fa-address-book"></i></div>
            </div>
        `;
    }

    // TAMPILAN AWAL: FOLDER KATEGORI
    // Jika tidak ada folder yang sedang dibuka dan pengguna tidak sedang melakukan pencarian bebas atau filter spesifik
    if (repoActiveFolder === null && !repoSearch.trim() && !repoCategoryFilter && !repoStatusFilter) {
        if (pagination) pagination.innerHTML = '';
        
        // Buat daftar kategori folder (termasuk folder dinamis jika ada kategori di luar standar)
        const folderDefs = [...REPO_FOLDER_DEFINITIONS];
        const knownIds = new Set(folderDefs.map(f => f.id));
        items.forEach(it => {
            const cat = it.kategori || 'Dokumen lainnya';
            if (!knownIds.has(cat)) {
                knownIds.add(cat);
                folderDefs.push({
                    id: cat,
                    name: cat,
                    subtitle: 'Kategori Dokumen',
                    icon: 'fa-folder-closed',
                    color: 'slate',
                    bgBox: 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                    badge: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
                    desc: `Kumpulan berkas dan arsip kehumasan dalam kategori ${cat}.`
                });
            }
        });

        contentArea.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <!-- Banner Pengantar Folder -->
                <div class="bg-gradient-to-r from-indigo-50 via-white to-amber-50/40 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/80 p-5 sm:p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                            <i class="fa-solid fa-folder-tree"></i>
                        </div>
                        <div>
                            <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Direktori Folder Kategori</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                Klik salah satu folder untuk menelusuri arsip berkas, atau gunakan tombol Tambah Dokumen untuk menyimpan berkas langsung ke dalam kategori yang dipilih.
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                        <span class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-xs">
                            <i class="fa-solid fa-folders mr-1 text-indigo-500"></i> ${folderDefs.length} Folder
                        </span>
                    </div>
                </div>

                <!-- Grid Kartu Folder Kategori -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    ${folderDefs.map(f => {
                        const count = items.filter(it => it.kategori === f.id).length;
                        return `
                            <div onclick="openRepoFolder('${f.id}')" class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-205 dark:border-slate-705 p-6 shadow-xs hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-100/50 dark:from-slate-700/20 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-300"></div>
                                <div>
                                    <div class="flex items-start justify-between mb-4">
                                        <div class="w-13 h-13 rounded-2xl ${f.bgBox} border flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-xs">
                                            <i class="fa-solid fa-folder-closed group-hover:hidden"></i>
                                            <i class="fa-solid fa-folder-open hidden group-hover:inline-block"></i>
                                        </div>
                                        <span class="px-3 py-1 rounded-full text-xs font-extrabold ${f.badge} border shadow-xs">
                                            ${count} Dokumen
                                        </span>
                                    </div>
                                    <h4 class="text-base font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        ${f.name}
                                    </h4>
                                    <p class="text-[11px] font-bold text-indigo-500/80 dark:text-indigo-400/80 mt-0.5">
                                        ${f.subtitle}
                                    </p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                                        ${f.desc}
                                    </p>
                                </div>
                                <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                                    <span class="flex items-center gap-1.5"><i class="fa-regular fa-folder-open text-xs"></i> Buka Folder</span>
                                    <i class="fa-solid fa-arrow-right text-[11px]"></i>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        return;
    }

    // TAMPILAN DALAM FOLDER ATAU PENCARIAN
    // Terapkan filter folder aktif
    if (repoActiveFolder) {
        items = items.filter(i => i.kategori === repoActiveFolder);
    } else if (repoCategoryFilter) {
        items = items.filter(i => i.kategori === repoCategoryFilter);
    }

    // Terapkan Filter Pencarian
    if (repoSearch.trim()) {
        const q = repoSearch.toLowerCase().trim();
        items = items.filter(i =>
            (i.nama_dokumen && i.nama_dokumen.toLowerCase().includes(q)) ||
            (i.deskripsi && i.deskripsi.toLowerCase().includes(q)) ||
            (i.pic && i.pic.toLowerCase().includes(q)) ||
            (i.versi && i.versi.toLowerCase().includes(q)) ||
            (i.kategori && i.kategori.toLowerCase().includes(q))
        );
    }

    // Terapkan Filter Status
    if (repoStatusFilter) {
        items = items.filter(i => (i.status || 'Aktif') === repoStatusFilter);
    }

    // Sorting
    items.sort((a, b) => {
        let valA = a[repoSortField] || '';
        let valB = b[repoSortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return repoSortAsc ? -1 : 1;
        if (valA > valB) return repoSortAsc ? 1 : -1;
        return 0;
    });

    const totalFiltered = items.length;
    const totalPages = Math.ceil(totalFiltered / repoLimit) || 1;
    if (repoPage > totalPages) repoPage = totalPages;
    const offset = (repoPage - 1) * repoLimit;
    const pagedItems = items.slice(offset, offset + repoLimit);

    // Ambil info nama folder aktif untuk breadcrumb
    const currentFolderDef = REPO_FOLDER_DEFINITIONS.find(f => f.id === repoActiveFolder);
    const folderTitle = currentFolderDef ? currentFolderDef.name : (repoActiveFolder || (repoCategoryFilter ? repoCategoryFilter : 'Semua Dokumen'));

    const folderHeaderHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in shadow-xs">
            <div class="flex items-center gap-3">
                <button onclick="openRepoFolder(null)" class="btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-xs shrink-0">
                    <i class="fa-solid fa-arrow-left"></i> Semua Folder
                </button>
                <div class="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
                <div class="flex items-center gap-2 text-xs">
                    <span class="text-slate-400 hidden sm:inline">Pusat Dokumen</span>
                    <span class="text-slate-400 hidden sm:inline">/</span>
                    <span class="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                        <i class="fa-solid fa-folder-open text-amber-500"></i> ${folderTitle}
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        ${totalFiltered} Dokumen
                    </span>
                </div>
            </div>
            <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
                ${canManage ? `
                    <button onclick="openModal('repository')" class="btn-primary px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                        <i class="fa-solid fa-cloud-arrow-up"></i> Tambah ke Folder Ini
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    if (pagedItems.length === 0) {
        contentArea.innerHTML = `
            ${folderHeaderHTML}
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center animate-fade-in shadow-xs">
                <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center text-2xl mb-4">
                    <i class="fa-solid fa-folder-open"></i>
                </div>
                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200">Belum ada dokumen dalam folder ini</h3>
                <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Gunakan tombol Tambah Dokumen untuk mengunggah berkas baru ke dalam folder ${folderTitle}.</p>
                <div class="flex items-center justify-center gap-2 mt-5">
                    <button onclick="openRepoFolder(null)" class="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                        <i class="fa-solid fa-arrow-left"></i> Kembali ke Folder
                    </button>
                    ${canManage ? `
                        <button onclick="openModal('repository')" class="btn-primary py-2 px-4 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                            <i class="fa-solid fa-plus"></i> Tambah Dokumen
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    if (repoViewMode === 'grid') {
        contentArea.innerHTML = `
            ${folderHeaderHTML}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                ${pagedItems.map(item => {
                    const catMeta = getCategoryColor(item.kategori);
                    const isArchived = item.status === 'Diarsipkan';
                    const safeLink = item.link_cloud || '#';
                    return `
                        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-205 dark:border-slate-705 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                            <div>
                                <div class="flex items-start justify-between gap-2 mb-3">
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${catMeta.bg}">
                                        <i class="fa-solid ${catMeta.icon}"></i> ${item.kategori || 'Umum'}
                                    </span>
                                    <div class="flex items-center gap-1.5">
                                        <span class="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            ${item.versi || 'v1.0'}
                                        </span>
                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${isArchived ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}">
                                            ${item.status || 'Aktif'}
                                        </span>
                                    </div>
                                </div>

                                <h3 onclick="showDetailById('repository', ${item.id})" class="font-extrabold text-sm text-slate-800 dark:text-white leading-snug cursor-pointer group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2" title="${item.nama_dokumen}">
                                    ${item.nama_dokumen}
                                </h3>

                                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                                    ${item.deskripsi || 'Tidak ada uraian ringkas.'}
                                </p>
                            </div>

                            <div class="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700/80">
                                <div class="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-3 font-medium">
                                    <span class="truncate max-w-[130px]"><i class="fa-regular fa-user mr-1 text-slate-400"></i> ${item.pic || '-'}</span>
                                    <span><i class="fa-regular fa-calendar mr-1 text-slate-400"></i> ${formatDate(item.tanggal)}</span>
                                </div>

                                <div class="flex items-center justify-between gap-1.5">
                                    <div class="flex items-center gap-1">
                                        <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-955/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-650 dark:text-indigo-300 font-bold text-xs transition-all">
                                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Buka Berkas
                                        </a>
                                        <button onclick="copyRepoLink('${encodeURIComponent(safeLink)}')" title="Salin Tautan" class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-all">
                                            <i class="fa-regular fa-copy"></i>
                                        </button>
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <button onclick="showDetailById('repository', ${item.id})" title="Rincian" class="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center text-xs transition-all">
                                            <i class="fa-solid fa-circle-info"></i>
                                        </button>
                                        ${canManage ? `
                                            <button onclick="openModalById('repository', ${item.id})" title="Edit" class="w-8 h-8 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-400 hover:text-indigo-600 flex items-center justify-center text-xs transition-all">
                                                <i class="fa-solid fa-pen"></i>
                                            </button>
                                            <button onclick="deleteItem('repository', ${item.id})" title="Hapus" class="w-8 h-8 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 flex items-center justify-center text-xs transition-all">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        contentArea.innerHTML = `
            ${folderHeaderHTML}
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-205 dark:border-slate-705 overflow-hidden shadow-xs animate-fade-in">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-bold text-slate-450 tracking-wider">
                                <th class="py-3.5 px-4 text-center w-12">No</th>
                                <th class="py-3.5 px-4 cursor-pointer hover:text-indigo-600" onclick="handleRepoSort('nama_dokumen')">
                                    Nama Dokumen / Berkas <i class="fa-solid fa-sort ml-1"></i>
                                </th>
                                <th class="py-3.5 px-4 cursor-pointer hover:text-indigo-600" onclick="handleRepoSort('kategori')">
                                    Kategori <i class="fa-solid fa-sort ml-1"></i>
                                </th>
                                <th class="py-3.5 px-4 text-center">Versi</th>
                                <th class="py-3.5 px-4">PIC</th>
                                <th class="py-3.5 px-4 cursor-pointer hover:text-indigo-600" onclick="handleRepoSort('tanggal')">
                                    Tanggal <i class="fa-solid fa-sort ml-1"></i>
                                </th>
                                <th class="py-3.5 px-4 text-center">Status</th>
                                <th class="py-3.5 px-4 text-center">Akses & Tautan</th>
                                <th class="py-3.5 px-4 text-center w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                            ${pagedItems.map((item, idx) => {
                                const catMeta = getCategoryColor(item.kategori);
                                const isArchived = item.status === 'Diarsipkan';
                                const safeLink = item.link_cloud || '#';
                                return `
                                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                                        <td class="py-3.5 px-4 text-center font-bold text-slate-400">${offset + idx + 1}</td>
                                        <td class="py-3.5 px-4 min-w-[220px]">
                                            <span onclick="showDetailById('repository', ${item.id})" class="font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-600 cursor-pointer block leading-snug">
                                                ${item.nama_dokumen}
                                            </span>
                                            <p class="text-[10px] text-slate-400 truncate max-w-sm mt-0.5">${item.deskripsi || '-'}</p>
                                        </td>
                                        <td class="py-3.5 px-4 whitespace-nowrap">
                                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.bg}">
                                                <i class="fa-solid ${catMeta.icon} text-[9px]"></i> ${item.kategori || 'Umum'}
                                            </span>
                                        </td>
                                        <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                ${item.versi || 'v1.0'}
                                            </span>
                                        </td>
                                        <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">${item.pic || '-'}</td>
                                        <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">${formatDate(item.tanggal)}</td>
                                        <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${isArchived ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}">
                                                ${item.status || 'Aktif'}
                                            </span>
                                        </td>
                                        <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                            <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-955 text-indigo-650 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-[11px] transition-all">
                                                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i> Buka
                                            </a>
                                        </td>
                                        <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                            <div class="flex items-center justify-center gap-1">
                                                <button onclick="showDetailById('repository', ${item.id})" title="Rincian" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                                                    <i class="fa-solid fa-circle-info text-[11px]"></i>
                                                </button>
                                                ${canManage ? `
                                                    <button onclick="openModalById('repository', ${item.id})" title="Edit" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all">
                                                        <i class="fa-solid fa-pen text-[10px]"></i>
                                                    </button>
                                                    <button onclick="deleteItem('repository', ${item.id})" title="Hapus" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-all">
                                                        <i class="fa-solid fa-trash text-[10px]"></i>
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    if (pagination) {
        pagination.innerHTML = `
            <span class="text-[10px] font-semibold text-slate-450">
                Menampilkan ${offset + 1} - ${Math.min(offset + repoLimit, totalFiltered)} dari ${totalFiltered} dokumen
            </span>
            <div class="flex items-center gap-1.5">
                <button onclick="changeRepoPage(${repoPage - 1})" ${repoPage <= 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-550 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                </button>
                <span class="px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">${repoPage} / ${totalPages}</span>
                <button onclick="changeRepoPage(${repoPage + 1})" ${repoPage >= totalPages ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-550 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all">
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            </div>
        `;
    }
}

window.openRepoFolder = function(folderId) {
    repoActiveFolder = folderId;
    window.repoActiveFolder = folderId;
    repoCategoryFilter = folderId || '';
    repoPage = 1;
    const catSelect = document.getElementById('repo-category-select');
    if (catSelect) catSelect.value = folderId || '';
    drawRepositoryContent();
};

window.handleRepoSearch = function(val) {
    repoSearch = val;
    repoPage = 1;
    drawRepositoryContent();
};

window.handleRepoCategoryFilter = function(val) {
    repoCategoryFilter = val;
    repoActiveFolder = val || null;
    window.repoActiveFolder = val || null;
    repoPage = 1;
    drawRepositoryContent();
};

window.handleRepoStatusFilter = function(val) {
    repoStatusFilter = val;
    repoPage = 1;
    drawRepositoryContent();
};

window.resetRepoFilters = function() {
    repoSearch = '';
    repoCategoryFilter = '';
    repoStatusFilter = '';
    repoActiveFolder = null;
    window.repoActiveFolder = null;
    repoPage = 1;
    const sInput = document.getElementById('repo-search-input');
    if (sInput) sInput.value = '';
    const catSelect = document.getElementById('repo-category-select');
    if (catSelect) catSelect.value = '';
    const statSelect = document.getElementById('repo-status-select');
    if (statSelect) statSelect.value = '';
    drawRepositoryContent();
};

window.setRepoViewMode = function(mode) {
    repoViewMode = mode;
    // Jika sedang di root tampilan folder, membuka mode grid/tabel tetap membuka folder aktif atau semua
    if (repoActiveFolder === null && !repoSearch) {
        repoActiveFolder = 'Pedoman'; // atau buka folder pertama
        window.repoActiveFolder = 'Pedoman';
    }
    drawRepositoryContent();
};

window.handleRepoSort = function(field) {
    if (repoSortField === field) {
        repoSortAsc = !repoSortAsc;
    } else {
        repoSortField = field;
        repoSortAsc = true;
    }
    drawRepositoryContent();
};

window.changeRepoPage = function(page) {
    repoPage = page;
    drawRepositoryContent();
};

window.copyRepoLink = function(encodedLink) {
    const link = decodeURIComponent(encodedLink);
    if (!link || link === '#') {
        showToast('Tautan tidak valid.', 'error');
        return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showToast('Tautan Google Drive berhasil disalin ke clipboard!');
        }).catch(() => {
            prompt('Salin tautan dokumen berikut:', link);
        });
    } else {
        prompt('Salin tautan dokumen berikut:', link);
    }
};


