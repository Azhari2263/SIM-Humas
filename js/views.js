// Views rendering engine for SIM Humas & Protokol BPS Kalbar

// Helper: Check if logged-in user is Admin or Ketua Tim Humas
function isUserAdminOrKetua() {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'koordinator');
}

// Helper: Check if task belongs to current user (Tim Humas scopes)
function isTaskForCurrentUser(item) {
    if (!currentUser) return false;
    if (currentUser.role !== 'tim') return true; // Admins, Kepala, etc. see all

    const userName = (currentUser.username || '').toLowerCase();
    const displayName = (currentUser.name || '').toLowerCase();

    // Check all possible PIC/petugas columns in item
    const picFields = [
        item.petugas,
        item.assignedTo,
        item.pic,
        item.pembuat_konten,
        item.pic_poster_info,
        item.pic_doc_ruang,
        item.pic_doc_yt_zoom,
        item.assigned_to
    ].filter(Boolean).map(v => String(v).toLowerCase()).join(' ');

    if (!picFields.trim()) return false;

    return picFields.includes(userName) ||
        picFields.includes(displayName) ||
        picFields.includes('staf humas');
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
        </head>
        <body>
            <table border="1">
                <thead>
                    <tr style="background-color: #f1f5f9; font-weight: bold;">
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            ${row.map(val => `<td>${val}</td>`).join('')}
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
            <p>Dicetak otomatis dari SIM Humas BPS Kalbar - Tanggal: ${new Date().toLocaleString('id-ID')}</p>
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

// -------------------------------------------------------------
// 1. INTEGRATED DASHBOARD VIEW
// -------------------------------------------------------------
function renderDashboard(container) {
    const userRole = currentUser.role;

    if (userRole === 'pemohon') {
        renderPemohonDashboard(container);
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getMonthFilter = (dStr) => {
        if (!dStr) return false;
        const d = new Date(dStr);
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

    const totalRutin = rutinSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalAdHoc = adHocSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalProto = protoSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalMc = mcSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalBrs = brsSrc.filter(item => getMonthFilter(item.tanggal_rilis)).length;
    const totalHariBesar = hbSrc.filter(item => getMonthFilter(item.tanggal)).length;

    const totalKegiatanBulanIni = totalRutin + totalAdHoc + totalProto + totalMc + totalBrs + totalHariBesar;

    let selesaiCount = 0;
    let progressCount = 0;

    const evalStatus = (status) => {
        if (!status) return;
        const st = status.toLowerCase();
        if (st === 'selesai' || st === 'done' || st === 'posted') selesaiCount++;
        else if (st === 'ditugaskan' || st === 'on progress' || st === 'in progress' || st === 'revisi' || st === 'draft') progressCount++;
    };

    rutinSrc.forEach(i => evalStatus(i.status));
    adHocSrc.forEach(i => evalStatus(i.status));
    protoSrc.forEach(i => evalStatus(i.status));
    mcSrc.forEach(i => evalStatus(i.status));
    hbSrc.forEach(i => evalStatus(i.status));
    plannerSrc.forEach(i => evalStatus(i.status));

    const totalPegawaiAktif = db.team.length;

    const memberTasks = db.team.map(member => {
        const rTasks = db.rekapRutin.filter(r => r.petugas && r.petugas.includes(member.nama)).length;
        const aTasks = db.adHoc.filter(a => a.petugas && a.petugas.includes(member.nama)).length;
        const pTasks = db.protokoler.filter(p => p.petugas && p.petugas.includes(member.nama)).length;
        const mTasks = db.mc.filter(m => m.petugas && m.petugas.includes(member.nama)).length;
        const cTasks = db.contentPlanner.filter(c => c.assignedTo === member.nama).length;

        return {
            name: member.nama.split(' ')[0],
            rTasks,
            aTasks,
            pTasks,
            mTasks,
            cTasks,
            total: rTasks + aTasks + pTasks + mTasks + cTasks
        };
    });

    const labels = memberTasks.map(m => m.name);
    const rutinData = memberTasks.map(m => m.rTasks);
    const adhocData = memberTasks.map(m => m.aTasks);
    const protoData = memberTasks.map(m => m.pTasks + m.mTasks);
    const plannerData = memberTasks.map(m => m.cTasks);

    const upcomingDeadlines = [...plannerSrc, ...db.tickets.filter(t => t.status === 'Approved').filter(isTaskForCurrentUser)]
        .map(item => ({
            judul: item.judul,
            tanggal: item.jadwal || item.deadline,
            sumber: item.jadwal ? 'Konten' : 'Layanan',
            pic: item.assignedTo || item.pic || '-'
        }))
        .filter(item => item.tanggal && new Date(item.tanggal) >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
        .slice(0, 4);

    const overdueTasks = [...plannerSrc, ...rutinSrc, ...adHocSrc]
        .map(item => ({
            judul: item.judul || item.kegiatan,
            tanggal: item.jadwal || item.tanggal,
            status: item.status,
            pic: item.assignedTo || item.petugas || '-'
        }))
        .filter(item => item.tanggal && new Date(item.tanggal) < new Date().setHours(0, 0, 0, 0) && !['Selesai', 'Done', 'Posted'].includes(item.status))
        .slice(0, 4);

    const todayStr = formatDateInput(new Date());
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

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-center text-indigo-650 dark:text-indigo-400 shrink-0"><i class="fa-solid fa-calendar-check text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kegiatan Baru</p><p class="text-2xl font-black text-slate-800 dark:text-white mt-0.5">${totalKegiatanBulanIni}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-center text-emerald-650 dark:text-emerald-400 shrink-0"><i class="fa-solid fa-circle-check text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Selesai</p><p class="text-2xl font-black text-slate-800 dark:text-white mt-0.5">${selesaiCount}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-xl flex items-center justify-center text-blue-650 dark:text-blue-400 shrink-0"><i class="fa-solid fa-spinner fa-spin text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aktif Ditugaskan</p><p class="text-2xl font-black text-slate-800 dark:text-white mt-0.5">${progressCount}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-12 h-12 bg-violet-50 dark:bg-violet-950 border border-violet-100 dark:border-violet-900 rounded-xl flex items-center justify-center text-violet-650 dark:text-violet-400 shrink-0"><i class="fa-solid fa-users text-xl"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pegawai Aktif</p><p class="text-2xl font-black text-slate-800 dark:text-white mt-0.5">${totalPegawaiAktif}</p></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col justify-between">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Distribusi Beban Kerja Tim</h3>
                    <div class="text-[9px] font-bold text-slate-450 uppercase tracking-wider flex gap-2">
                        <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-indigo-500 rounded-lg mr-1"></span> Rutin</span>
                        <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-emerald-500 rounded-lg mr-1"></span> Ad Hoc</span>
                        <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-violet-500 rounded-lg mr-1"></span> Protokol</span>
                        <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-sky-500 rounded-lg mr-1"></span> Konten</span>
                    </div>
                </div>
                <div class="relative w-full h-[250px] flex items-center justify-center">
                    <canvas id="stackedTasksChart" class="w-full h-full"></canvas>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col justify-between">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Proporsi Rubrikasi Tugas</h3>
                <div class="w-40 h-40 relative mx-auto flex items-center justify-center">
                    <canvas id="bidangContributionChart" class="w-full h-full"></canvas>
                </div>
                <div class="mt-4 flex flex-col gap-2 w-full text-[10px] text-slate-655 dark:text-slate-400 font-bold uppercase tracking-wider" id="bidang-breakdown">
                    <!-- populated below -->
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-gradient-to-br from-indigo-500/10 to-indigo-650/10 border border-indigo-150 dark:border-indigo-950 p-5 rounded-2xl">
                <div class="flex justify-between items-start">
                    <h4 class="text-[10px] font-black text-indigo-750 dark:text-indigo-400 uppercase tracking-widest">Master of Ceremony</h4>
                    <span class="px-2 py-0.5 bg-indigo-500 text-white rounded text-[8px] font-black uppercase tracking-wider">${totalMc} Tugas</span>
                </div>
                <p class="text-xl font-extrabold text-slate-800 dark:text-white mt-3">${totalMc} <span class="text-xs font-semibold text-slate-455">agenda</span></p>
            </div>
            <div class="bg-gradient-to-br from-violet-500/10 to-violet-650/10 border border-violet-150 dark:border-violet-950 p-5 rounded-2xl">
                <div class="flex justify-between items-start">
                    <h4 class="text-[10px] font-black text-violet-750 dark:text-violet-400 uppercase tracking-widest">Keprotokolan</h4>
                    <span class="px-2 py-0.5 bg-violet-500 text-white rounded text-[8px] font-black uppercase tracking-wider">${totalProto} Tugas</span>
                </div>
                <p class="text-xl font-extrabold text-slate-800 dark:text-white mt-3">${totalProto} <span class="text-xs font-semibold text-slate-455">agenda</span></p>
            </div>
            <div class="bg-gradient-to-br from-emerald-500/10 to-emerald-650/10 border border-emerald-150 dark:border-emerald-950 p-5 rounded-2xl">
                <div class="flex justify-between items-start">
                    <h4 class="text-[10px] font-black text-emerald-750 dark:text-emerald-400 uppercase tracking-widest">Rilis BRS</h4>
                    <span class="px-2 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-wider">${totalBrs} Dokumen</span>
                </div>
                <p class="text-xl font-extrabold text-slate-800 dark:text-white mt-3">${totalBrs} <span class="text-xs font-semibold text-slate-455">dirilis</span></p>
            </div>
            <div class="bg-gradient-to-br from-rose-500/10 to-rose-650/10 border border-rose-150 dark:border-rose-950 p-5 rounded-2xl">
                <div class="flex justify-between items-start">
                    <h4 class="text-[10px] font-black text-rose-750 dark:text-rose-455 uppercase tracking-widest">Hari Besar</h4>
                    <span class="px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-wider">${totalHariBesar} Konten</span>
                </div>
                <p class="text-xl font-extrabold text-slate-800 dark:text-white mt-3">${totalHariBesar} <span class="text-xs font-semibold text-slate-455">ucapan</span></p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5"><i class="fa-solid fa-bell-concierge text-indigo-500"></i> Agenda Hari Ini</h3>
                <div class="space-y-3 flex-1 overflow-y-auto max-h-[220px] pr-1">
                    ${todayActivities.length > 0 ? todayActivities.map(act => `
                        <div class="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                            <div class="flex justify-between items-center text-[8px] font-extrabold uppercase tracking-widest text-slate-400">
                                <span>${act.tipe}</span>
                                <span class="text-indigo-650 dark:text-indigo-400">${act.jam}</span>
                            </div>
                            <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">${act.judul}</h4>
                            <p class="text-[9px] text-slate-500 mt-1 font-semibold">Petugas: ${act.pic || '-'}</p>
                        </div>
                    `).join('') : `
                        <div class="text-center py-12 text-slate-400">
                            <i class="fa-solid fa-mug-hot text-2xl mb-1 text-slate-350"></i>
                            <p class="text-[10px] font-bold">Tidak ada agenda hari ini.</p>
                        </div>
                    `}
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5"><i class="fa-regular fa-clock text-amber-500"></i> Batas Waktu Terdekat</h3>
                <div class="space-y-3 flex-1 overflow-y-auto max-h-[220px] pr-1">
                    ${upcomingDeadlines.length > 0 ? upcomingDeadlines.map(dl => `
                        <div class="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-900/55 rounded-xl flex items-center justify-between">
                            <div>
                                <span class="text-[8px] font-extrabold uppercase tracking-widest text-amber-600">${dl.sumber}</span>
                                <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-1">${dl.judul}</h4>
                                <p class="text-[9px] text-slate-500 mt-0.5">PIC: ${dl.pic}</p>
                            </div>
                            <span class="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase whitespace-nowrap bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">${formatDate(dl.tanggal)}</span>
                        </div>
                    `).join('') : `
                        <div class="text-center py-12 text-slate-400">
                            <i class="fa-solid fa-folder-open text-2xl mb-1 text-slate-350"></i>
                            <p class="text-[10px] font-bold">Tidak ada tugas terdekat.</p>
                        </div>
                    `}
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation text-rose-500"></i> Tugas Terlambat (Overdue)</h3>
                <div class="space-y-3 flex-1 overflow-y-auto max-h-[220px] pr-1">
                    ${overdueTasks.length > 0 ? overdueTasks.map(ov => `
                        <div class="p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-900/55 rounded-xl flex items-center justify-between">
                            <div>
                                <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">${ov.judul}</h4>
                                <p class="text-[9px] text-slate-500 mt-1 font-semibold">PIC: ${ov.pic} • Status: <span class="text-rose-600 font-bold">${ov.status || 'Ditugaskan'}</span></p>
                            </div>
                            <span class="text-[9px] font-bold text-rose-700 dark:text-rose-350 uppercase whitespace-nowrap bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">${formatDate(ov.tanggal)}</span>
                        </div>
                    `).join('') : `
                        <div class="text-center py-12 text-slate-400">
                            <i class="fa-solid fa-circle-check text-2xl mb-1 text-emerald-500"></i>
                            <p class="text-[10px] font-bold text-emerald-655">Semua tugas tepat waktu.</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const ctxStack = document.getElementById('stackedTasksChart')?.getContext('2d');
        if (ctxStack) {
            if (window.chartInstance) window.chartInstance.destroy();
            window.chartInstance = new Chart(ctxStack, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Rutin', data: rutinData, backgroundColor: '#6366f1', borderRadius: 4 },
                        { label: 'Ad Hoc', data: adhocData, backgroundColor: '#10b981', borderRadius: 4 },
                        { label: 'Protokol & MC', data: protoData, backgroundColor: '#8b5cf6', borderRadius: 4 },
                        { label: 'Planner', data: plannerData, backgroundColor: '#0ea5e9', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 10 }
                    },
                    scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', font: { size: 9, weight: 'bold' } } },
                        y: { stacked: true, grid: { color: 'rgba(226, 232, 240, 0.2)' }, beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8', font: { size: 9 } } }
                    }
                }
            });
        }

        const rubrikCounts = {};
        db.rekapRutin.filter(isTaskForCurrentUser).forEach(item => {
            const b = item.rubrikasi || 'Umum';
            rubrikCounts[b] = (rubrikCounts[b] || 0) + 1;
        });

        const rLabels = Object.keys(rubrikCounts);
        const rData = Object.values(rubrikCounts);
        const defaultColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7', '#3b82f6', '#10b981'];

        const ctxBidang = document.getElementById('bidangContributionChart')?.getContext('2d');
        if (ctxBidang) {
            if (window.sentimentChartInstance) window.sentimentChartInstance.destroy();
            window.sentimentChartInstance = new Chart(ctxBidang, {
                type: 'doughnut',
                data: {
                    labels: rLabels.length > 0 ? rLabels : ['Umum'],
                    datasets: [{
                        data: rData.length > 0 ? rData : [1],
                        backgroundColor: defaultColors.slice(0, Math.max(1, rLabels.length)),
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 8 }
                    },
                    cutout: '70%'
                }
            });

            const breakdownEl = document.getElementById('bidang-breakdown');
            if (breakdownEl) {
                breakdownEl.innerHTML = (rLabels.length > 0 ? rLabels : ['Umum']).slice(0, 4).map((l, idx) => {
                    const c = defaultColors[idx % defaultColors.length];
                    const v = rData[idx] || 0;
                    return `<div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background-color: ${c}"></span> ${l}</span><strong>${v}</strong></div>`;
                }).join('');
            }
        }
    }, 100);
}

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
let plannerSortField = 'jadwal';
let plannerSortAsc = true;

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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="planner-search-input" oninput="handlePlannerSearch(this.value)" value="${plannerSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none placeholder-slate-450 dark:text-white text-slate-750 transition-all" placeholder="Cari judul atau konsep...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-400"></i> Status:</span>
                <select id="planner-status-select" onchange="handlePlannerStatusFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Status</option>
                    <option ${plannerStatusFilter === 'Draft' ? 'selected' : ''} value="Draft">Draft</option>
                    <option ${plannerStatusFilter === 'In Progress' ? 'selected' : ''} value="In Progress">In Progress</option>
                    <option ${plannerStatusFilter === 'Done' ? 'selected' : ''} value="Done">Done</option>
                    <option ${plannerStatusFilter === 'Posted' ? 'selected' : ''} value="Posted">Posted</option>
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-user-tag mr-1 text-slate-405"></i> PIC:</span>
                <select id="planner-pic-select" onchange="handlePlannerPicFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua PIC</option>
                    ${db.team.map(m => `<option ${plannerPicFilter === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetPlannerFilters()" class="w-full sm:w-auto btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 select-none">
                            <th class="py-3.5 px-4 w-12 text-center">No</th>
                            <th onclick="handlePlannerSort('judul')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                Judul Konten <span id="sort-icon-judul" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th class="py-3.5 px-4">Konsep / Visual</th>
                            <th class="py-3.5 px-4 w-32">Jenis & Tipe</th>
                            <th onclick="handlePlannerSort('progres')" class="py-3.5 px-4 w-32 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center">
                                Progres <span id="sort-icon-progres" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handlePlannerSort('jadwal')" class="py-3.5 px-4 w-36 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                Jadwal Post <span id="sort-icon-jadwal" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handlePlannerSort('status')" class="py-3.5 px-4 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center">
                                Status <span id="sort-icon-status" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th onclick="handlePlannerSort('assignedTo')" class="py-3.5 px-4 w-36 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                PIC <span id="sort-icon-assignedTo" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            ${!isKepala ? `<th class="py-3.5 px-4 w-24 text-center">Aksi</th>` : ''}
                        </tr>
                    </thead>
                    <tbody id="planner-table-body" class="text-xs divide-y divide-slate-100 dark:divide-slate-800">
                        <!-- Table rows populated dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    drawPlannerBoard();
}

window.handlePlannerSearch = function(val) {
    plannerSearch = val;
    drawPlannerBoard();
};

window.handlePlannerPicFilter = function(val) {
    plannerPicFilter = val;
    drawPlannerBoard();
};

window.handlePlannerStatusFilter = function(val) {
    plannerStatusFilter = val;
    drawPlannerBoard();
};

window.resetPlannerFilters = function() {
    plannerSearch = '';
    plannerPicFilter = '';
    plannerStatusFilter = '';
    const searchInput = document.getElementById('planner-search-input');
    if (searchInput) searchInput.value = '';
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
    drawPlannerBoard();
};

window.drawPlannerBoard = function() {
    const tableBody = document.getElementById('planner-table-body');
    if (!tableBody) return;

    let filtered = db.contentPlanner.filter(isTaskForCurrentUser);
    
    // Search filter
    if (plannerSearch.trim()) {
        const query = plannerSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.judul && item.judul.toLowerCase().includes(query)) ||
            (item.konsep && item.konsep.toLowerCase().includes(query))
        );
    }
    
    // Status filter
    if (plannerStatusFilter) {
        filtered = filtered.filter(item => item.status === plannerStatusFilter);
    }
    
    // PIC filter
    if (plannerPicFilter) {
        filtered = filtered.filter(item => item.assignedTo === plannerPicFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
        let valA = a[plannerSortField] || '';
        let valB = b[plannerSortField] || '';
        
        if (plannerSortField === 'progres') {
            valA = Number(valA);
            valB = Number(valB);
        } else if (plannerSortField === 'jadwal') {
            valA = new Date(valA || '1970-01-01');
            valB = new Date(valB || '1970-01-01');
        } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }

        if (valA < valB) return plannerSortAsc ? -1 : 1;
        if (valA > valB) return plannerSortAsc ? 1 : -1;
        return 0;
    });

    // Update sort icons
    const sortFields = ['judul', 'progres', 'jadwal', 'status', 'assignedTo'];
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
    const postTypeIcons = {
        'Carousel': '<span class="inline-flex items-center gap-1 text-indigo-650 dark:text-indigo-400 font-medium"><i class="fa-solid fa-images"></i> Carousel</span>',
        'Reels': '<span class="inline-flex items-center gap-1 text-rose-500 font-medium"><i class="fa-solid fa-clapperboard"></i> Reels</span>',
        'Single Image': '<span class="inline-flex items-center gap-1 text-emerald-500 font-medium"><i class="fa-regular fa-image"></i> Image</span>',
        'Video': '<span class="inline-flex items-center gap-1 text-violet-500 font-medium"><i class="fa-solid fa-video"></i> Video</span>'
    };

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${isKepala ? 8 : 9}" class="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-350 dark:text-slate-600"></i>
                        <p class="text-xs font-bold uppercase tracking-wider">Data Rencana Konten Kosong</p>
                        <p class="text-[10px] mt-0.5">Cobalah mengubah kata kunci pencarian atau filter</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map((item, index) => {
        const initials = getPicInitials(item.assignedTo);
        const avatarBg = getAvatarBg(item.assignedTo);

        // Status Badge Style
        let statusBadge = '';
        switch (item.status) {
            case 'Draft':
                statusBadge = '<span class="px-2.5 py-1 bg-slate-105 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-600">Draft</span>';
                break;
            case 'In Progress':
                statusBadge = '<span class="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-full text-[10px] font-bold border border-blue-105 dark:border-blue-900/65">In Progress</span>';
                break;
            case 'Done':
                statusBadge = '<span class="px-2.5 py-1 bg-violet-50 text-violet-700 dark:bg-violet-955/40 dark:text-violet-300 rounded-full text-[10px] font-bold border border-violet-105 dark:border-violet-900/65">Done</span>';
                break;
            case 'Posted':
                statusBadge = '<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-955/40 dark:text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-105 dark:border-emerald-900/65">Posted</span>';
                break;
            default:
                statusBadge = `<span class="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-bold">${item.status}</span>`;
        }

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

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                <td class="py-3.5 px-4 text-center font-bold text-slate-400">${index + 1}</td>
                <td class="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 min-w-[180px] max-w-[280px]">
                    <span onclick="showDetailById('content', ${item.id})" class="hover:text-indigo-650 transition-colors cursor-pointer block truncate" title="${item.judul}">${item.judul}</span>
                </td>
                <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 min-w-[200px]">
                    <p class="line-clamp-2 leading-relaxed" title="${item.konsep || ''}">${item.konsep || '-'}</p>
                </td>
                <td class="py-3.5 px-4 font-semibold text-[10px]">
                    <div class="flex flex-col gap-1">
                        <span class="px-2 py-0.5 w-max rounded text-[9px] font-extrabold uppercase ${item.jenis === 'Hard Selling' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-100 dark:border-rose-900' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900'}">${item.jenis}</span>
                        <span>${postTypeIcons[item.postType] || item.postType || '-'}</span>
                    </div>
                </td>
                <td class="py-3.5 px-4 text-center">
                    <div class="flex flex-col items-center justify-center gap-1 min-w-[80px]">
                        <span class="font-bold text-[10px] text-slate-600 dark:text-slate-450">${item.progres}%</span>
                        <div class="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                            <div class="bg-gradient-to-r from-indigo-500 to-violet-650 h-1 rounded-full" style="width: ${item.progres}%"></div>
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4 font-bold text-rose-600 dark:text-rose-450 whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300"><i class="fa-regular fa-calendar-check text-[10px]"></i> ${formatDate(item.jadwal)}</span>
                </td>
                <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border border-slate-200 shadow-xs ${avatarBg}" title="${item.assignedTo}">${initials}</div>
                        <span class="font-bold text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[80px]">${item.assignedTo || '-'}</span>
                    </div>
                </td>
                ${actions}
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// 3. MODUL REKAP RUTIN VIEW
// -------------------------------------------------------------
let rutinSearch = '';
let rutinRubrikFilter = '';
let rutinDateFilter = '';

function renderRekapRutin(container) {
    const isKepala = currentUser.role === 'kepala';
    const rubrics = [
        '#haribesar', '#rilisbrs', '#infografisbrs', '#rilispublikasi',
        '#SElasaSEnsus', '#promosistatistik', '#rripontianak',
        '#zonaintegritas', '#SKD', '#ddakalbar', 'KLIK', 'Laporan'
    ];

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

        <div class="bg-white/85 dark:bg-slate-800/85 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" oninput="rutinSearch = this.value; drawRutinTable();" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan/petugas...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500 font-bold whitespace-nowrap"><i class="fa-solid fa-tags text-slate-400"></i> Rubrik:</span>
                <select onchange="rutinRubrikFilter = this.value; drawRutinTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none">
                    <option value="">Semua Rubrik</option>
                    ${rubrics.map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500 font-bold whitespace-nowrap"><i class="fa-regular fa-calendar-check text-slate-400"></i> Periode:</span>
                <input type="date" onchange="rutinDateFilter = this.value; drawRutinTable();" class="w-full text-xs font-semibold py-1.5 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none">
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
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
        </div>
    `;
    drawRutinTable();
}

function drawRutinTable() {
    const body = document.getElementById('rutin-table-body');
    if (!body) return;

    let filtered = db.rekapRutin.filter(isTaskForCurrentUser);
    if (rutinSearch.trim()) {
        const q = rutinSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
            (item.petugas && item.petugas.toLowerCase().includes(q))
        );
    }
    if (rutinRubrikFilter) {
        filtered = filtered.filter(item => item.rubrikasi === rutinRubrikFilter);
    }
    if (rutinDateFilter) {
        filtered = filtered.filter(item => item.tanggal && item.tanggal.includes(rutinDateFilter));
    }

    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const isKepala = currentUser.role === 'kepala';

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr><td colspan="${isKepala ? 6 : 7}" class="py-16 text-center text-slate-400 dark:text-slate-550"><i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-350 dark:text-slate-750"></i><p class="text-xs font-bold">Tidak ada kegiatan rutin ditemukan.</p></td></tr>
        `;
        return;
    }

    body.innerHTML = filtered.map(item => {
        let statusColor = item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300';

        let actionButtons = '';
        if (!isKepala) {
            actionButtons = `
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-1.5" onclick="event.stopPropagation()">
                        <button onclick="openModalById('rekap_rutin', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-450 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Ubah"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        ${isUserAdminOrKetua() ? `
                            <button onclick="deleteItem('rekap_rutin', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-450 hover:text-rose-605 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Hapus"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        ` : ''}
                    </div>
                </td>
            `;
        }

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                <td class="px-6 py-4 font-bold whitespace-nowrap text-slate-800 dark:text-slate-200">${formatDate(item.tanggal)}</td>
                <td class="px-6 py-4 font-semibold text-slate-500 whitespace-nowrap">${item.hari || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-705 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md font-bold uppercase text-[9px]">${item.rubrikasi || '-'}</span></td>
                <td class="px-6 py-4 font-extrabold text-slate-850 dark:text-slate-250 leading-snug">${item.kegiatan}</td>
                <td class="px-6 py-4 font-bold text-indigo-650 dark:text-indigo-400 whitespace-nowrap">${item.petugas || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');

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

function renderAdHoc(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Kegiatan Ad Hoc 2026</h2>
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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-205 dark:border-slate-700 mb-6 flex justify-between items-center shadow-xs">
            <div class="relative w-full max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" oninput="adHocSearch = this.value; drawAdHocTable();" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan atau petugas...">
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left text-slate-650 dark:text-slate-300">
                    <thead class="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40 uppercase border-b border-slate-200 dark:border-slate-700 font-black tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Tanggal</th>
                            <th class="px-6 py-4">Hari</th>
                            <th class="px-6 py-4">Nama Kegiatan</th>
                            <th class="px-6 py-4 text-center">Jumlah Petugas</th>
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
        </div>
    `;
    drawAdHocTable();
}

function drawAdHocTable() {
    const body = document.getElementById('adhoc-table-body');
    if (!body) return;

    let filtered = db.adHoc.filter(isTaskForCurrentUser);
    if (adHocSearch.trim()) {
        const q = adHocSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
            (item.petugas && item.petugas.toLowerCase().includes(q))
        );
    }

    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const isKepala = currentUser.role === 'kepala';

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr><td colspan="${isKepala ? 7 : 8}" class="py-16 text-center text-slate-400 dark:text-slate-550"><i class="fa-solid fa-users-slash text-3xl mb-2 text-slate-350 dark:text-slate-750"></i><p class="text-xs font-bold">Tidak ada penugasan ad hoc ditemukan.</p></td></tr>
        `;
        return;
    }

    body.innerHTML = filtered.map(item => {
        const staffList = item.petugas ? item.petugas.split(',') : [];
        const staffBadges = staffList.map(st => `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900 rounded font-bold text-[9px]">${st.trim()}</span>`).join(' ');

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

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                <td class="px-6 py-4 font-bold whitespace-nowrap text-slate-800 dark:text-slate-200">${formatDate(item.tanggal)}</td>
                <td class="px-6 py-4 font-semibold text-slate-500 whitespace-nowrap">${item.hari || '-'}</td>
                <td class="px-6 py-4 font-extrabold text-slate-855 dark:text-slate-255 leading-snug">${item.kegiatan}</td>
                <td class="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-100">${item.jumlah_bertugas || staffList.length} orang</td>
                <td class="px-6 py-4 whitespace-normal"><div class="flex flex-wrap gap-1.5">${staffBadges || '-'}</div></td>
                <td class="px-6 py-4 text-slate-500 max-w-xs truncate font-medium">${item.keterangan || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');

    window.exportAdHocReport = function (type) {
        const headers = ["Tanggal", "Hari", "Nama Kegiatan", "Jumlah Bertugas", "Nama Petugas", "Keterangan", "Status"];
        const rows = filtered.map(item => [formatDate(item.tanggal), item.hari || '-', item.kegiatan, item.jumlah_bertugas || '-', item.petugas || '-', item.keterangan || '-', item.status || 'Ditugaskan']);
        if (type === 'csv') downloadCSV(headers, rows, `Rekap_AdHoc_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Rekap_AdHoc_SIMHumas_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Daftar Penugasan Kerja Ad Hoc BPS Kalbar", headers, rows);
    };
}

// -------------------------------------------------------------
// 5. MODUL PROTOKOLER VIEW
// -------------------------------------------------------------
let protoSearch = '';
let protoLevelFilter = '';

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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full sm:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-455"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" oninput="protoSearch = this.value; drawProtokolerTable();" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan atau lokasi...">
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <span class="text-xs text-slate-500 font-bold whitespace-nowrap"><i class="fa-solid fa-filter text-slate-450"></i> Level:</span>
                <select onchange="protoLevelFilter = this.value; drawProtokolerTable();" class="text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none min-w-[140px]">
                    <option value="">Semua Level</option>
                    <option value="Super Formal">Super Formal</option>
                    <option value="Formal">Formal</option>
                    <option value="Semi Formal">Semi Formal</option>
                    <option value="Non Formal">Non Formal</option>
                    <option value="Hiburan">Hiburan</option>
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 animate-fade-in" id="protokoler-list-body">
            <!-- Populated dynamically -->
        </div>
    `;
    drawProtokolerTable();
}

function drawProtokolerTable() {
    const list = document.getElementById('protokoler-list-body');
    if (!list) return;

    let filtered = db.protokoler.filter(isTaskForCurrentUser);
    if (protoSearch.trim()) {
        const q = protoSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
            (item.lokasi && item.lokasi.toLowerCase().includes(q))
        );
    }
    if (protoLevelFilter) {
        filtered = filtered.filter(item => item.level === protoLevelFilter);
    }

    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-555 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-crown text-3xl mb-2 text-slate-350 dark:text-slate-750"></i>
                <p class="text-xs font-bold">Belum ada agenda protokoler terdaftar.</p>
            </div>
        `;
        return;
    }

    const isKepala = currentUser.role === 'kepala';

    list.innerHTML = filtered.map(item => {
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
        let statusColor = item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300';

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

        return `
            <div class="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-205 dark:border-slate-700/80 hover:shadow-md hover:border-slate-350 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4" onclick="showDetailById('protokoler', ${item.id})">
                <div class="flex items-start gap-4">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${['Super Formal', 'Formal'].includes(item.level) ? 'bg-indigo-50 border-indigo-150 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900' : 'bg-amber-50 border-amber-150 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-indigo-900'
            }">
                        <i class="fa-solid fa-crown text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-extrabold text-slate-850 dark:text-slate-200 text-sm leading-snug hover:text-indigo-650 transition-colors">${item.kegiatan}</h4>
                        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i> ${formatDate(item.tanggal)}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-slate-400"></i> Lokasi: ${item.lokasi}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-clock text-slate-400"></i> Waktu: ${formatTime(item.jam_mulai)}</p>
                            <p class="flex items-center gap-1.5 text-indigo-655 dark:text-indigo-400"><i class="fa-solid fa-users text-slate-400"></i> Petugas: ${item.petugas || 'Belum ditunjuk'}</p>
                        </div>
                    </div>
                </div>
                ${actionsHtml}
            </div>
        `;
    }).join('');

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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full sm:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-455"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" oninput="mcSearch = this.value; drawMcTable();" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan atau lokasi...">
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <span class="text-xs text-slate-500 font-bold whitespace-nowrap"><i class="fa-solid fa-filter text-slate-450"></i> Level:</span>
                <select onchange="mcLevelFilter = this.value; drawMcTable();" class="text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none min-w-[140px]">
                    <option value="">Semua Level</option>
                    <option value="Super Formal">Super Formal</option>
                    <option value="Formal">Formal</option>
                    <option value="Semi Formal">Semi Formal</option>
                    <option value="Non Formal">Non Formal</option>
                    <option value="Hiburan">Hiburan</option>
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 animate-fade-in" id="mc-list-body">
            <!-- Populated dynamically -->
        </div>
    `;
    drawMcTable();
}

function drawMcTable() {
    const list = document.getElementById('mc-list-body');
    if (!list) return;

    let filtered = db.mc.filter(isTaskForCurrentUser);
    if (mcSearch.trim()) {
        const q = mcSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
            (item.lokasi && item.lokasi.toLowerCase().includes(q))
        );
    }
    if (mcLevelFilter) {
        filtered = filtered.filter(item => item.level === mcLevelFilter);
    }

    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-555 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-microphone text-3xl mb-2 text-slate-350 dark:text-slate-750"></i>
                <p class="text-xs font-bold">Belum ada agenda penugasan MC terdaftar.</p>
            </div>
        `;
        return;
    }

    const isKepala = currentUser.role === 'kepala';

    list.innerHTML = filtered.map(item => {
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
        let statusColor = item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300';

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

        return `
            <div class="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-205 dark:border-slate-700/80 hover:shadow-md hover:border-slate-350 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4" onclick="showDetailById('mc', ${item.id})">
                <div class="flex items-start gap-4">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${['Super Formal', 'Formal'].includes(item.level) ? 'bg-indigo-50 border-indigo-150 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900' : 'bg-amber-50 border-amber-150 text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-indigo-900'
            }">
                        <i class="fa-solid fa-microphone-lines text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-extrabold text-slate-850 dark:text-slate-200 text-sm leading-snug hover:text-indigo-650 transition-colors">${item.kegiatan}</h4>
                        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i> ${formatDate(item.tanggal)}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-slate-400"></i> Lokasi: ${item.lokasi}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-clock text-slate-400"></i> Waktu: ${formatTime(item.jam_mulai)}</p>
                            <p class="flex items-center gap-1.5 text-indigo-655 dark:text-indigo-400"><i class="fa-solid fa-users text-slate-400"></i> Petugas MC: ${item.petugas || 'Belum ditunjuk'}</p>
                        </div>
                    </div>
                </div>
                ${actionsHtml}
            </div>
        `;
    }).join('');

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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 flex justify-between items-center shadow-xs">
            <div class="relative w-full max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" oninput="brsSearch = this.value; drawBrsGrid();" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari judul kegiatan BRS...">
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" id="brs-grid-body">
            <!-- Populated dynamically -->
        </div>
    `;
    drawBrsGrid();
}

function drawBrsGrid() {
    const grid = document.getElementById('brs-grid-body');
    if (!grid) return;

    let filtered = db.brsRilis.filter(isTaskForCurrentUser);
    if (brsSearch.trim()) {
        const q = brsSearch.toLowerCase();
        filtered = filtered.filter(item => item.judul && item.judul.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => new Date(b.tanggal_rilis) - new Date(a.tanggal_rilis));

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-555 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-bullhorn text-4xl mb-2.5 text-slate-350 dark:text-slate-750"></i>
                <p class="text-xs font-bold">Arsip Berita Resmi Statistik (BRS) kosong.</p>
            </div>
        `;
        return;
    }

    const isKepala = currentUser.role === 'kepala';

    grid.innerHTML = filtered.map(item => {
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

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
                    <button onclick="showDetailById('brs_rilis', ${item.id})" class="text-[9px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline">Lihat Rincian →</button>
                </div>
            `;
        } else {
            actionsPanel = `
                <div class="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end text-[10px]">
                    <button onclick="showDetailById('brs_rilis', ${item.id})" class="text-[9px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline">Lihat Rincian →</button>
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-slate-850 rounded-2xl border border-slate-205 dark:border-slate-700 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div>
                    <div class="flex justify-between items-start gap-2">
                        <span class="text-[9px] text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-widest"><i class="fa-solid fa-calendar mr-1"></i> ${formatDate(item.tanggal_rilis)}</span>
                    </div>
                    <h4 class="font-extrabold text-slate-855 dark:text-slate-100 text-sm mt-3 leading-snug cursor-pointer hover:text-indigo-655 transition-colors" onclick="showDetailById('brs_rilis', ${item.id})">${item.judul}</h4>
                    
                    <div class="mt-4 space-y-2 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                        <div class="flex justify-between"><span>PIC Poster & Info:</span><strong class="text-slate-800 dark:text-slate-200">${item.pic_poster_info || '-'}</strong></div>
                        <div class="flex justify-between"><span>PIC Dokumentasi Ruang:</span><strong class="text-slate-800 dark:text-slate-200">${item.pic_doc_ruang || '-'}</strong></div>
                        <div class="flex justify-between"><span>PIC Dok. YT & Zoom:</span><strong class="text-slate-800 dark:text-slate-200">${item.pic_doc_yt_zoom || '-'}</strong></div>
                        <div class="flex justify-between items-center mt-2.5 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-750">
                            <span>Highlight Data:</span>
                            ${item.highlight ? `<a href="${item.highlight}" target="_blank" class="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 rounded font-bold text-[8px] uppercase tracking-wider"><i class="fa-solid fa-file-arrow-down mr-0.5"></i> Unduh</a>` : '<span class="text-slate-400">Belum ada</span>'}
                        </div>
                    </div>
                </div>
                ${actionsPanel}
            </div>
        `;
    }).join('');

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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 flex justify-between items-center shadow-xs">
            <div class="relative w-full max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" oninput="hariBesarSearch = this.value; drawHariBesarTable();" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari hari besar...">
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
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
        </div>
    `;
    drawHariBesarTable();
}

function drawHariBesarTable() {
    const body = document.getElementById('haribesar-table-body');
    if (!body) return;

    let filtered = db.hariBesar.filter(isTaskForCurrentUser);
    if (hariBesarSearch.trim()) {
        const q = hariBesarSearch.toLowerCase();
        filtered = filtered.filter(item => item.hari_besar && item.hari_besar.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const isKepala = currentUser.role === 'kepala';

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr><td colspan="${isKepala ? 4 : 5}" class="py-16 text-center text-slate-400 dark:text-slate-550"><i class="fa-solid fa-heart-broken text-3xl mb-2 text-slate-350 dark:text-slate-750"></i><p class="text-xs font-bold">Tidak ada agenda ucapan hari besar.</p></td></tr>
        `;
        return;
    }

    body.innerHTML = filtered.map(item => {
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
        let statusColor = item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-850 dark:bg-indigo-950/40 dark:text-indigo-300';

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

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                <td class="px-6 py-4 font-bold whitespace-nowrap text-slate-800 dark:text-slate-200">${formatDate(item.tanggal)}</td>
                <td class="px-6 py-4 font-extrabold text-slate-855 dark:text-slate-200 leading-snug">${item.hari_besar}</td>
                <td class="px-6 py-4 font-bold text-indigo-655 dark:text-indigo-400 whitespace-nowrap">${item.pembuat_konten || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');

    window.exportHariBesarReport = function (type) {
        const headers = ["Tanggal", "Hari Besar", "Pembuat Konten (PIC)", "Status", "Data Pendukung"];
        const rows = filtered.map(item => [formatDate(item.tanggal), item.hari_besar, item.pembuat_konten || '-', item.status || 'Ditugaskan', item.data_pendukung || '-']);
        if (type === 'csv') downloadCSV(headers, rows, `Kalender_HariBesar_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Kalender_HariBesar_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Kalender & Penugasan Ucapan Hari Besar BPS Kalbar", headers, rows);
    };
}

// -------------------------------------------------------------
// 9. MODUL REKAP KEGIATAN & MONITORING SLA VIEW
// -------------------------------------------------------------
function renderRekapKegiatan(container) {
    const allTasks = [];

    db.rekapRutin.filter(isTaskForCurrentUser).forEach(item => {
        allTasks.push({
            judul: item.kegiatan,
            jenis: 'Rutin',
            petugas: item.petugas || '-',
            tanggal: item.tanggal,
            progress: item.status === 'Selesai' ? 100 : 30,
            status: item.status || 'Ditugaskan'
        });
    });

    db.adHoc.filter(isTaskForCurrentUser).forEach(item => {
        allTasks.push({
            judul: item.kegiatan,
            jenis: 'Ad Hoc',
            petugas: item.petugas || '-',
            tanggal: item.tanggal,
            progress: item.status === 'Selesai' ? 100 : 40,
            status: item.status || 'Ditugaskan'
        });
    });

    db.protokoler.filter(isTaskForCurrentUser).forEach(item => {
        allTasks.push({
            judul: item.kegiatan,
            jenis: 'Protokoler',
            petugas: item.petugas || '-',
            tanggal: item.tanggal,
            progress: item.status === 'Selesai' ? 100 : 50,
            status: item.status || 'Ditugaskan'
        });
    });

    db.mc.filter(isTaskForCurrentUser).forEach(item => {
        allTasks.push({
            judul: item.kegiatan,
            jenis: 'MC',
            petugas: item.petugas || '-',
            tanggal: item.tanggal,
            progress: item.status === 'Selesai' ? 100 : 50,
            status: item.status || 'Ditugaskan'
        });
    });

    db.contentPlanner.filter(isTaskForCurrentUser).forEach(item => {
        allTasks.push({
            judul: item.judul,
            jenis: 'Konten Planner',
            petugas: item.assignedTo || '-',
            tanggal: item.jadwal,
            progress: item.progres || 0,
            status: item.status || 'Draft'
        });
    });

    let totalSlaAman = 0;
    let totalSlaMendekati = 0;
    let totalSlaTerlambat = 0;

    allTasks.forEach(task => {
        const deadlineDate = new Date(task.tanggal);
        const today = new Date().setHours(0, 0, 0, 0);
        const daysRemaining = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

        if (task.progress === 100 || ['Selesai', 'Done', 'Posted'].includes(task.status)) {
            task.sla = 'Aman';
            task.slaClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-305 border-emerald-200 dark:border-emerald-900';
            totalSlaAman++;
        } else if (daysRemaining < 0) {
            task.sla = 'Terlambat';
            task.slaClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-305 border-rose-200 dark:border-rose-900';
            totalSlaTerlambat++;
        } else if (daysRemaining <= 3) {
            task.sla = 'Mendekati';
            task.slaClass = 'bg-amber-100 text-amber-800 dark:bg-amber-955 dark:text-amber-305 border-amber-200 dark:border-amber-900';
            totalSlaMendekati++;
        } else {
            task.sla = 'Aman';
            task.slaClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-305 border-emerald-200 dark:border-emerald-900';
            totalSlaAman++;
        }
    });

    const completedTasks = allTasks.filter(t => t.progress === 100 || t.status === 'Selesai').length;
    const completionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

    container.innerHTML = `
        <div class="mb-8 animate-fade-in">
            <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">SLA & Rekap Pekerjaan</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Pantau Service Level Agreement (SLA), persentase penyelesaian, dan daftar seluruh pekerjaan aktif.</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-11 h-11 bg-indigo-50 dark:bg-indigo-955 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0 font-extrabold text-sm">${completionRate}%</div>
                <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Persentase Selesai</p><p class="text-xl font-black text-slate-850 dark:text-white mt-0.5">${completedTasks} / ${allTasks.length}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-11 h-11 bg-emerald-50 dark:bg-emerald-955 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0"><i class="fa-solid fa-circle-check text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">SLA Aman</p><p class="text-xl font-black text-slate-850 dark:text-white mt-0.5">${totalSlaAman}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-11 h-11 bg-amber-50 dark:bg-amber-955 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0"><i class="fa-solid fa-bell text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mendekati Deadline</p><p class="text-xl font-black text-slate-855 dark:text-white mt-0.5">${totalSlaMendekati}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex items-center gap-4">
                <div class="w-11 h-11 bg-rose-50 dark:bg-rose-955 border border-rose-100 rounded-xl flex items-center justify-center text-rose-650 shrink-0"><i class="fa-solid fa-clock-rotate-left text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Terlambat</p><p class="text-xl font-black text-slate-855 dark:text-white mt-0.5">${totalSlaTerlambat}</p></div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs">
            <h3 class="font-bold text-slate-850 dark:text-slate-100 text-sm mb-4 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-1.5"><i class="fa-solid fa-list-check text-indigo-500"></i> Daftar Pekerjaan Aktif</h3>
            <div class="space-y-4">
                ${allTasks.map(task => `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3.5 last:border-none last:pb-0">
                        <div class="flex-1 mr-4 mb-2 sm:mb-0">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-600 rounded text-[8px] font-bold uppercase tracking-wider">${task.jenis}</span>
                                <h4 class="font-extrabold text-xs text-slate-855 dark:text-slate-200 leading-snug">${task.judul}</h4>
                            </div>
                            <p class="text-[10px] text-slate-500 mt-1">PIC: <strong class="text-slate-700 dark:text-slate-300 font-semibold">${task.petugas}</strong> • Batas: ${formatDate(task.tanggal)}</p>
                            <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-2">
                                <div class="bg-gradient-to-r from-indigo-500 to-indigo-650 h-1 rounded-full" style="width: ${task.progress}%"></div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="px-2 py-0.5 rounded text-[8px] border font-black uppercase tracking-wider ${task.slaClass}">${task.sla}</span>
                            <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-center shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-650 dark:text-slate-300">${task.status}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// 10. INTEGRATED CALENDAR VIEW
// -------------------------------------------------------------
let calendarFilter = 'all';

function renderIntegratedCalendar(container) {
    if (!window.calendarCurrentDate) {
        window.calendarCurrentDate = new Date();
    }
    if (!window.calendarMode) {
        window.calendarMode = 'month';
    }

    const rawEvents = [];
    db.rekapRutin.forEach(e => rawEvents.push({ title: `[Rutin] ${e.kegiatan}`, date: formatDateInput(e.tanggal), color: 'bg-indigo-500', type: 'rekap_rutin', item: e }));
    db.adHoc.forEach(e => rawEvents.push({ title: `[AdHoc] ${e.kegiatan}`, date: formatDateInput(e.tanggal), color: 'bg-emerald-500', type: 'ad_hoc', item: e }));
    db.protokoler.forEach(e => rawEvents.push({ title: `[Proto] ${e.kegiatan}`, date: formatDateInput(e.tanggal), color: 'bg-violet-500', type: 'protokoler', item: e }));
    db.mc.forEach(e => rawEvents.push({ title: `[MC] ${e.kegiatan}`, date: formatDateInput(e.tanggal), color: 'bg-sky-500', type: 'mc', item: e }));
    db.brsRilis.forEach(e => rawEvents.push({ title: `[BRS] ${e.judul}`, date: formatDateInput(e.tanggal_rilis), color: 'bg-rose-500', type: 'brs_rilis', item: e }));
    db.hariBesar.forEach(e => rawEvents.push({ title: `[HariBesar] ${e.hari_besar}`, date: formatDateInput(e.tanggal), color: 'bg-amber-500', type: 'hari_besar', item: e }));
    db.contentPlanner.forEach(e => rawEvents.push({ title: `[Konten] ${e.judul}`, date: formatDateInput(e.jadwal), color: 'bg-teal-600', type: 'content', item: e }));
    db.assignments.forEach(e => rawEvents.push({ title: `[Tugas] ${e.tugas}`, date: formatDateInput(e.deadline), color: 'bg-rose-600', type: 'assignment', item: e }));

    const events = [];
    rawEvents.forEach(e => {
        const isMine = isTaskForCurrentUser(e.item);
        if (calendarFilter === 'my' && !isMine) return;

        let displayTitle = e.title;
        let isHighlighted = false;
        if (calendarFilter === 'highlight' && isMine) {
            displayTitle = `⭐ ${e.title}`;
            isHighlighted = true;
        }

        events.push({
            ...e,
            displayTitle,
            isHighlighted
        });
    });

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    let headerTitle = '';
    let daysHtml = [];

    if (window.calendarMode === 'month') {
        const currentMonth = window.calendarCurrentDate.getMonth();
        const currentYear = window.calendarCurrentDate.getFullYear();
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        headerTitle = `${monthNames[currentMonth]} ${currentYear}`;

        for (let i = 0; i < firstDay; i++) {
            daysHtml.push(`<div class="h-28 border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 p-1"></div>`);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date && e.date.includes(dateStr));
            const eventsListHtml = dayEvents.map(e => `
                <div class="text-[8px] font-bold ${e.color} text-white px-1.5 py-0.5 rounded truncate mt-1 ${e.isHighlighted ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}" title="${e.title}">${e.displayTitle}</div>
            `).join('');

            const isToday = new Date(currentYear, currentMonth, d).toDateString() === new Date().toDateString();

            daysHtml.push(`
                <div onclick="showCalendarDayEvents('${dateStr}')" class="h-28 border border-slate-100 dark:border-slate-800 p-2 bg-white dark:bg-slate-850 flex flex-col justify-between overflow-y-auto cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-slate-800/80 hover:border-indigo-200 dark:hover:border-slate-700 transition-all ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}">
                    <span class="text-xs font-black ${isToday ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-350'}">${d}</span>
                    <div class="flex-1 overflow-y-auto mt-1">${eventsListHtml}</div>
                </div>
            `);
        }
    } else {
        const startOfWeek = new Date(window.calendarCurrentDate);
        const dayIndex = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - dayIndex);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (startOfWeek.getFullYear() === endOfWeek.getFullYear()) {
            if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                headerTitle = `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
            } else {
                headerTitle = `${startOfWeek.getDate()} ${monthNames[startOfWeek.getMonth()].slice(0, 3)} - ${endOfWeek.getDate()} ${monthNames[endOfWeek.getMonth()].slice(0, 3)} ${startOfWeek.getFullYear()}`;
            }
        } else {
            headerTitle = `${startOfWeek.getDate()} ${monthNames[startOfWeek.getMonth()].slice(0, 3)} ${startOfWeek.getFullYear()} - ${endOfWeek.getDate()} ${monthNames[endOfWeek.getMonth()].slice(0, 3)} ${endOfWeek.getFullYear()}`;
        }

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);

            const dateStrFixed = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date && e.date.includes(dateStrFixed));
            const eventsListHtml = dayEvents.map(e => `
                <div class="text-[8px] font-bold ${e.color} text-white px-1.5 py-0.5 rounded truncate mt-1 ${e.isHighlighted ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}" title="${e.title}">${e.displayTitle}</div>
            `).join('');

            const isToday = d.toDateString() === new Date().toDateString();

            daysHtml.push(`
                <div onclick="showCalendarDayEvents('${dateStrFixed}')" class="h-64 border border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-850 flex flex-col justify-between overflow-y-auto cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-slate-800/80 hover:border-indigo-200 dark:hover:border-slate-700 transition-all ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-black ${isToday ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-350'}">${d.getDate()}</span>
                        <span class="text-[9px] font-bold text-slate-400">${monthNames[d.getMonth()].slice(0, 3)}</span>
                    </div>
                    <div class="flex-1 overflow-y-auto mt-2">${eventsListHtml}</div>
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
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Jadwal agenda harian, rilis BRS, ucapan hari besar, kegiatan protokoler pimpinan Kalbar, rencana konten, dan assignment tugas.</p>
            </div>
            
            <!-- Calendar Filter Dropdown for My Tasks/Highlighting -->
            <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-2 rounded-2xl shadow-xs">
                <span class="text-[10px] text-slate-550 dark:text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-eye text-indigo-500"></i> Tampilan:</span>
                <select id="calendar-filter-select" onchange="handleCalendarFilterChange(this.value)" class="text-xs font-bold py-1 px-2.5 bg-slate-55 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="all" ${calendarFilter === 'all' ? 'selected' : ''}>Semua Agenda Tim</option>
                    <option value="my" ${calendarFilter === 'my' ? 'selected' : ''}>Hanya Agenda Saya</option>
                    <option value="highlight" ${calendarFilter === 'highlight' ? 'selected' : ''}>Sorot Agenda Saya (⭐)</option>
                </select>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs">
            <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
                <div class="flex items-center gap-3">
                    <button onclick="prevCalendar()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-150 dark:border-slate-700 text-slate-605 dark:text-slate-200 transition-all shadow-xs" title="Sebelumnya"><i class="fa-solid fa-chevron-left text-xs"></i></button>
                    <h3 class="font-black text-slate-800 dark:text-white text-base uppercase tracking-wider min-w-[180px] text-center sm:text-left">${headerTitle}</h3>
                    <button onclick="nextCalendar()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-150 dark:border-slate-700 text-slate-605 dark:text-slate-200 transition-all shadow-xs" title="Berikutnya"><i class="fa-solid fa-chevron-right text-xs"></i></button>
                    <button onclick="todayCalendar()" class="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all ml-1" title="Kembali ke hari ini">Hari Ini</button>
                </div>

                <div class="flex items-center justify-between sm:justify-end gap-4">
                    <div class="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-750 shrink-0">
                        <button onclick="changeCalendarMode('month')" class="px-4 py-1.5 rounded-lg transition-all ${window.calendarMode === 'month' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-655 dark:text-white' : 'text-slate-550 dark:text-slate-400'}">Bulanan</button>
                        <button onclick="changeCalendarMode('week')" class="px-4 py-1.5 rounded-lg transition-all ${window.calendarMode === 'week' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-655 dark:text-white' : 'text-slate-555 dark:text-slate-400'}">Mingguan</button>
                    </div>
                </div>
            </div>

            <div class="text-[9px] font-bold uppercase tracking-wider flex flex-wrap gap-x-4 gap-y-2 mb-6 border-b border-slate-100 dark:border-slate-750 pb-4">
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-indigo-500 rounded-md mr-1.5"></span> Rutin</span>
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-emerald-500 rounded-md mr-1.5"></span> Ad Hoc</span>
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-violet-500 rounded-md mr-1.5"></span> Protokol</span>
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-sky-500 rounded-md mr-1.5"></span> MC</span>
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-rose-500 rounded-md mr-1.5"></span> BRS</span>
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-amber-500 rounded-md mr-1.5"></span> Hari Besar</span>
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-teal-600 rounded-md mr-1.5"></span> Konten</span>
                <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-rose-600 rounded-md mr-1.5"></span> Tugas</span>
            </div>

            <div class="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 text-center text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 py-3 rounded-t-2xl shrink-0">
                <div>Minggu</div><div>Senin</div><div>Selasa</div><div>Rabu</div><div>Kamis</div><div>Jumat</div><div>Sabtu</div>
            </div>

            <div class="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-b-2xl overflow-hidden shadow-xs border-r border-l border-b border-slate-200 dark:border-slate-700">
                ${daysHtml.join('')}
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
    window.calendarCurrentDate = new Date();
    router(currentState);
};

window.changeCalendarMode = function (mode) {
    window.calendarMode = mode;
    router(currentState);
};

window.showCalendarDayEvents = function (dateStr) {
    const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const dayEvents = [];

    db.rekapRutin.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            dayEvents.push({ type: 'rekap_rutin', label: 'Rutin', title: e.kegiatan, pic: e.petugas || '-', status: e.status, item: e, color: 'bg-indigo-500' });
        }
    });

    db.adHoc.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            dayEvents.push({ type: 'ad_hoc', label: 'Ad Hoc', title: e.kegiatan, pic: e.petugas || '-', status: e.status, item: e, color: 'bg-emerald-500' });
        }
    });

    db.protokoler.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            dayEvents.push({ type: 'protokoler', label: 'Protokoler', title: e.kegiatan, pic: e.petugas || '-', status: e.status, item: e, color: 'bg-violet-500' });
        }
    });

    db.mc.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            dayEvents.push({ type: 'mc', label: 'MC', title: e.kegiatan, pic: e.petugas || '-', status: e.status, item: e, color: 'bg-sky-500' });
        }
    });

    db.brsRilis.forEach(e => {
        if (e.tanggal_rilis && formatDateInput(e.tanggal_rilis).includes(dateStr)) {
            dayEvents.push({ type: 'brs_rilis', label: 'BRS Rilis', title: e.judul, pic: e.pic_poster_info || '-', status: 'Rilis', item: e, color: 'bg-rose-505' });
        }
    });

    db.hariBesar.forEach(e => {
        if (e.tanggal && formatDateInput(e.tanggal).includes(dateStr)) {
            dayEvents.push({ type: 'hari_besar', label: 'Hari Besar', title: e.hari_besar, pic: e.pembuat_konten || '-', status: e.status, item: e, color: 'bg-amber-500' });
        }
    });

    db.contentPlanner.forEach(e => {
        if (e.jadwal && formatDateInput(e.jadwal).includes(dateStr)) {
            dayEvents.push({ type: 'content', label: 'Konten', title: e.judul, pic: e.assignedTo || '-', status: e.status, item: e, color: 'bg-teal-600' });
        }
    });

    db.assignments.forEach(e => {
        if (e.deadline && formatDateInput(e.deadline).includes(dateStr)) {
            dayEvents.push({ type: 'assignment', label: 'Tugas', title: e.tugas, pic: e.assigned_to || '-', status: e.status, item: e, color: 'bg-rose-600' });
        }
    });

    // Apply calendar filtering on day details modal too!
    let filteredDayEvents = dayEvents;
    if (calendarFilter === 'my') {
        filteredDayEvents = dayEvents.filter(ev => isTaskForCurrentUser(ev.item));
    }

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
                        <div class="p-3.5 bg-white dark:bg-slate-900 border ${isHighlighted ? 'border-amber-400 dark:border-amber-550 shadow-sm' : 'border-slate-200 dark:border-slate-750'} rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer flex flex-col justify-between" onclick="closeCalendarDayModal(); showDetailFromCalendar('${ev.type}', ${ev.item.id})">
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="px-2 py-0.5 ${ev.color} text-white font-black text-[8px] rounded uppercase tracking-wider">${ev.label} ${isHighlighted ? '⭐' : ''}</span>
                                <span class="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase">${ev.status || '-'}</span>
                            </div>
                            <h4 class="text-xs font-black text-slate-805 dark:text-white leading-relaxed line-clamp-2">${ev.title}</h4>
                            <div class="flex items-center justify-between mt-2">
                                <div class="flex items-center gap-1.5 text-[10px] text-slate-505 dark:text-slate-400 font-semibold">
                                    <i class="fa-regular fa-user text-xs"></i>
                                    <span>PIC: <strong class="text-slate-700 dark:text-slate-200 font-bold">${ev.pic}</strong></span>
                                </div>
                                ${isMine ? `<span class="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded">Milik Anda</span>` : ''}
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
        const taskCount = db.contentPlanner.filter(c => c.assignedTo === member.nama).length;
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
            <div class="bg-white dark:bg-slate-850 rounded-2xl shadow-sm border border-slate-205 dark:border-slate-700 overflow-hidden hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer flex flex-col group" onclick="showDetailById('team', ${member.id})">
                <div class="h-20 bg-gradient-to-r from-indigo-750 to-slate-900 dark:from-indigo-950 dark:to-slate-800 relative">
                    <div class="absolute -bottom-6 left-5 w-14 h-14 rounded-2xl border-4 border-white dark:border-slate-850 shadow-md flex items-center justify-center text-sm font-black tracking-wider transition-transform duration-300 group-hover:scale-105 ${avatarBg}">
                        ${initials}
                    </div>
                </div>
                <div class="pt-8 pb-4 px-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="font-extrabold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-655 transition-colors">${member.nama}</h3>
                        <p class="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 tracking-wider mt-0.5">${member.jabatan}</p>
                        <span class="inline-block mt-3 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-150 dark:border-slate-600 text-[9px] rounded-full uppercase font-bold tracking-wider">${member.bidang}</span>
                        <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">${member.tugas || 'Belum ada rincian tugas.'}</p>
                    </div>
                    <div class="flex items-center justify-between pt-3 mt-4 border-t border-slate-100 dark:border-slate-700">
                        <div>
                            <p class="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Tugas Konten</p>
                            <p class="text-base font-black text-indigo-650 dark:text-indigo-400 mt-0.5">${taskCount}</p>
                        </div>
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

let ticketSearch = '';
let ticketStatusFilter = '';
let ticketTypeFilter = '';

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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-205 dark:border-slate-700 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full md:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-405"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="ticket-search-input" oninput="handleTicketSearch(this.value)" value="${ticketSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 dark:text-white transition-all" placeholder="Cari judul, pengaju, detail...">
            </div>
            <div class="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-circle-notch mr-0.5 text-slate-450"></i> Status:</span>
                    <select id="ticket-status-select" onchange="handleTicketStatusFilter(this.value)" class="text-[10px] font-bold py-1.5 px-2 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-655 dark:text-slate-200 focus:outline-none min-w-[100px] shadow-xs">
                        <option value="">Semua</option>
                        <option ${ticketStatusFilter === 'Pending' ? 'selected' : ''} value="Pending">Pending</option>
                        <option ${ticketStatusFilter === 'Approved' ? 'selected' : ''} value="Approved">Disetujui</option>
                        <option ${ticketStatusFilter === 'Rejected' ? 'selected' : ''} value="Rejected">Ditolak</option>
                    </select>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-0.5 text-slate-450"></i> Layanan:</span>
                    <select id="ticket-type-select" onchange="handleTicketTypeFilter(this.value)" class="text-[10px] font-bold py-1.5 px-2 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-655 dark:text-slate-200 focus:outline-none min-w-[120px] shadow-xs">
                        <option value="">Semua Layanan</option>
                        <option ${ticketTypeFilter === 'Infografis' ? 'selected' : ''} value="Infografis">Infografis / Poster</option>
                        <option ${ticketTypeFilter === 'Pembuatan Video' ? 'selected' : ''} value="Pembuatan Video">Pembuatan Video</option>
                        <option ${ticketTypeFilter === 'Peliputan' ? 'selected' : ''} value="Peliputan">Peliputan / Dokumentasi</option>
                        <option ${ticketTypeFilter === 'Desain Publikasi' ? 'selected' : ''} value="Desain Publikasi">Desain Publikasi</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" id="tickets-grid">
            <!-- Filled dynamically -->
        </div>
    `;

    drawTicketsGrid();
}

function handleTicketSearch(val) {
    ticketSearch = val;
    drawTicketsGrid();
}

function handleTicketStatusFilter(val) {
    ticketStatusFilter = val;
    drawTicketsGrid();
}

function handleTicketTypeFilter(val) {
    ticketTypeFilter = val;
    drawTicketsGrid();
}

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
        const query = ticketSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.judul && item.judul.toLowerCase().includes(query)) ||
            (item.pengaju && item.pengaju.toLowerCase().includes(query)) ||
            (item.detail && item.detail.toLowerCase().includes(query))
        );
    }
    if (ticketStatusFilter) {
        filtered = filtered.filter(item => item.status === ticketStatusFilter);
    }
    if (ticketTypeFilter) {
        filtered = filtered.filter(item => item.jenis === ticketTypeFilter);
    }

    filtered.sort((a, b) => b.id - a.id);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-500 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-ticket-simple text-4xl mb-2.5 text-slate-300 dark:text-slate-700"></i>
                <p class="text-xs font-bold">Tidak ada pengajuan tiket ditemukan.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(t => {
        let statusBadge = '';
        if (t.status === 'Pending') {
            statusBadge = `<span class="px-2.5 py-0.5 bg-amber-50 text-amber-750 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs"><span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>Pending</span>`;
        } else if (t.status === 'Approved') {
            statusBadge = `<span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs"><i class="fa-solid fa-check text-[9px]"></i>Disetujui</span>`;
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
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-[10px] text-slate-500">
                    <div class="w-5.5 h-5.5 rounded-full ${getAvatarBg(t.pic)} flex items-center justify-center font-bold text-[8px] shadow-xs">${getPicInitials(t.pic)}</div>
                    <span>PIC: <strong class="text-slate-800 dark:text-slate-200 font-bold">${t.pic}</strong></span>
                </div>
            `;
        } else if (t.status === 'Rejected') {
            actions = `
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] text-rose-650 font-bold flex items-center gap-1">
                    <i class="fa-solid fa-triangle-exclamation"></i> Pengajuan ditolak.
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div>
                    <div class="flex justify-between items-start gap-3">
                        <span class="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-150 dark:border-slate-650 text-slate-650 dark:text-slate-300 rounded-full text-[9px] uppercase font-bold tracking-wider">${t.jenis}</span>
                        ${statusBadge}
                    </div>
                    <h4 class="font-extrabold text-slate-850 dark:text-slate-100 text-sm mt-3 leading-snug">${t.judul}</h4>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5"><i class="fa-regular fa-building text-slate-400"></i> ${t.pengaju} (${t.bidang})</p>
                    <p class="text-xs text-slate-650 dark:text-slate-350 mt-2.5 leading-relaxed whitespace-pre-line">${t.detail}</p>
                </div>
                <div>
                    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px]">
                        <span class="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1"><i class="fa-regular fa-calendar-xmark"></i> Batas: ${formatDate(t.deadline)}</span>
                        ${isUserAdminOrKetua() && !isKepala ? `
                            <button onclick="deleteItem('tickets', ${t.id})" title="Hapus Pengajuan" class="text-slate-400 hover:text-rose-600 transition-colors"><i class="fa-solid fa-trash text-xs"></i></button>
                        ` : ''}
                    </div>
                    ${actions}
                </div>
            </div>
        `;
    }).join('');

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


let monitoringSearch = '';
let monitoringSentimentFilter = '';
let monitoringPage = 1;
const monitoringLimit = 8;

function renderMonitoring(container) {
    const isKepala = currentUser.role === 'kepala';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Media Monitoring</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Pantau pemberitaan rilis data BPS Provinsi Kalimantan Barat di berbagai portal berita online lokal.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportMonitoringReport('excel')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-255 shadow-xs">
                    <i class="fa-solid fa-file-excel"></i> Excel
                </button>
                ${!isKepala && isUserAdminOrKetua() ? `
                    <button onclick="openAddMonitoringModal()" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Tambah Kliping Berita
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in font-sans" id="monitoring-stats-grid">
            <!-- Dynamically populated in drawMonitoringTable() -->
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                    <div class="bg-slate-50/50 dark:bg-slate-900/40 p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div class="relative w-full sm:max-w-xs">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                            <input type="text" id="monitoring-search-input" oninput="handleMonitoringSearch(this.value)" value="${monitoringSearch}" class="w-full pl-9 pr-4 py-2 bg-white border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none placeholder-slate-450 text-slate-700 dark:text-white transition-all" placeholder="Cari portal media atau headline...">
                        </div>
                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-0.5 text-slate-450"></i> Sentimen:</span>
                            <select id="monitoring-sentiment-select" onchange="handleMonitoringSentimentFilter(this.value)" class="text-[10px] font-bold py-1.5 px-2 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-650 dark:text-slate-200 focus:outline-none min-w-[100px] shadow-xs">
                                <option value="">Semua</option>
                                <option ${monitoringSentimentFilter === 'Positif' ? 'selected' : ''} value="Positif">Positif</option>
                                <option ${monitoringSentimentFilter === 'Netral' ? 'selected' : ''} value="Netral">Netral</option>
                                <option ${monitoringSentimentFilter === 'Negatif' ? 'selected' : ''} value="Negatif">Negatif</option>
                            </select>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-xs text-left text-slate-650 dark:text-slate-300">
                            <thead class="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40 uppercase border-b border-slate-200 dark:border-slate-700 font-bold tracking-wider">
                                <tr>
                                    <th class="px-6 py-4">Portal Media</th>
                                    <th class="px-6 py-4">Kliping Headline & Kutipan</th>
                                    <th class="px-6 py-4">Tanggal</th>
                                    <th class="px-6 py-4 text-center">Sentimen</th>
                                    <th class="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-700" id="monitoring-table-body">
                                <!-- Filled by drawMonitoringTable() -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between" id="monitoring-pagination">
                    <!-- Filled dynamically -->
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between min-h-[360px]" id="monitoring-chart-panel">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 border-b pb-2 border-slate-100 dark:border-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-chart-pie text-indigo-650 text-base"></i> Proporsi Sentimen</h3>
                <div class="w-36 h-36 relative mx-auto flex items-center justify-center">
                    <canvas id="mediaSentimentChart" class="w-full h-full"></canvas>
                </div>
                <div class="mt-6 flex flex-col gap-2 w-full text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider" id="sentiment-breakdown">
                    <!-- Filled dynamically -->
                </div>
            </div>
        </div>
    `;

    drawMonitoringTable();
}

function handleMonitoringSearch(val) {
    monitoringSearch = val;
    monitoringPage = 1;
    drawMonitoringTable();
}

function handleMonitoringSentimentFilter(val) {
    monitoringSentimentFilter = val;
    monitoringPage = 1;
    drawMonitoringTable();
}

function drawMonitoringTable() {
    const tableBody = document.getElementById('monitoring-table-body');
    const pagination = document.getElementById('monitoring-pagination');
    const statsGrid = document.getElementById('monitoring-stats-grid');
    const breakdown = document.getElementById('sentiment-breakdown');

    if (!tableBody || !pagination || !statsGrid || !breakdown) return;

    let filtered = db.monitoring;
    if (monitoringSearch.trim()) {
        const query = monitoringSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.media && item.media.toLowerCase().includes(query)) ||
            (item.judul && item.judul.toLowerCase().includes(query)) ||
            (item.ringkasan && item.ringkasan.toLowerCase().includes(query))
        );
    }
    if (monitoringSentimentFilter) {
        filtered = filtered.filter(item => item.sentimen === monitoringSentimentFilter);
    }

    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const totalCount = filtered.length;
    const posCount = filtered.filter(m => m.sentimen === 'Positif').length;
    const netCount = filtered.filter(m => m.sentimen === 'Netral').length;
    const negCount = filtered.filter(m => m.sentimen === 'Negatif').length;
    const positiveRate = totalCount > 0 ? Math.round((posCount / totalCount) * 100) : 0;

    statsGrid.innerHTML = `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Kliping</p><p class="text-xl font-black text-slate-800 dark:text-white mt-1">${totalCount}</p></div>
            <div class="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-center text-indigo-650 text-lg"><i class="fa-solid fa-newspaper"></i></div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sentimen Positif</p><p class="text-xl font-black text-emerald-650 mt-1">${posCount}</p></div>
            <div class="w-10 h-10 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-center text-emerald-600 text-lg"><i class="fa-regular fa-face-smile"></i></div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sentimen Negatif</p><p class="text-xl font-black text-rose-650 mt-1">${negCount}</p></div>
            <div class="w-10 h-10 bg-rose-50 dark:bg-rose-955 border border-rose-100 dark:border-rose-900 rounded-xl flex items-center justify-center text-rose-650 text-lg"><i class="fa-regular fa-face-frown"></i></div>
        </div>
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div><p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pemberitaan Positif</p><p class="text-xl font-black text-indigo-600 dark:text-white mt-1">${positiveRate}%</p></div>
            <div class="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-center text-indigo-600 text-lg"><i class="fa-solid fa-chart-line"></i></div>
        </div>
    `;

    breakdown.innerHTML = `
        <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Positif</span><strong>${posCount} (${totalCount ? Math.round((posCount / totalCount) * 100) : 0}%)</strong></div>
        <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-slate-450 rounded-full"></span> Netral</span><strong>${netCount} (${totalCount ? Math.round((netCount / totalCount) * 100) : 0}%)</strong></div>
        <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Negatif</span><strong>${negCount} (${totalCount ? Math.round((negCount / totalCount) * 100) : 0}%)</strong></div>
    `;

    const totalPages = Math.ceil(totalCount / monitoringLimit) || 1;
    if (monitoringPage > totalPages) monitoringPage = totalPages;
    const offset = (monitoringPage - 1) * monitoringLimit;
    const paginatedItems = filtered.slice(offset, offset + monitoringLimit);

    if (paginatedItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-16 text-center text-slate-400 dark:text-slate-550">
                    <i class="fa-solid fa-face-meh text-3xl mb-2 text-slate-350 dark:text-slate-750"></i>
                    <p class="text-xs font-bold">Kliping berita tidak ditemukan.</p>
                </td>
            </tr>
        `;
        pagination.innerHTML = '';
        return;
    }

    const isKepala = currentUser.role === 'kepala';

    tableBody.innerHTML = paginatedItems.map(m => {
        let badge = '';
        if (m.sentimen === 'Positif') {
            badge = `<span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded text-[9px] font-bold flex items-center justify-center gap-1 w-20 shadow-xs"><i class="fa-solid fa-smile-wink"></i>Positif</span>`;
        } else if (m.sentimen === 'Negatif') {
            badge = `<span class="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-250 rounded text-[9px] font-bold flex items-center justify-center gap-1 w-20 shadow-xs"><i class="fa-solid fa-frown-open"></i>Negatif</span>`;
        } else {
            badge = `<span class="px-2.5 py-0.5 bg-slate-50 text-slate-655 border border-slate-200 rounded text-[9px] font-bold flex items-center justify-center gap-1 w-20 shadow-xs"><i class="fa-solid fa-meh"></i>Netral</span>`;
        }

        let actionButton = '';
        if (!isKepala) {
            actionButton = `
                <td class="px-6 py-4 text-center whitespace-nowrap" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-center gap-1.5">
                        ${isUserAdminOrKetua() ? `
                            <button onclick="openEditMonitoringModal(${m.id})" title="Edit Kliping" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                            <button onclick="deleteItem('monitoring', ${m.id})" title="Hapus Kliping" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        ` : ''}
                        <a href="${m.url}" target="_blank" class="text-indigo-655 hover:text-indigo-850 flex items-center justify-center gap-1 uppercase tracking-wider text-[8px] bg-slate-50 dark:bg-slate-750 dark:text-indigo-300 hover:bg-indigo-50 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg font-bold transition-all">
                            <i class="fa-solid fa-external-link"></i> Buka
                        </a>
                    </div>
                </td>
            `;
        } else {
            actionButton = `
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <a href="${m.url}" target="_blank" class="text-indigo-650 hover:text-indigo-850 flex items-center justify-center gap-1 uppercase tracking-wider text-[8px] bg-slate-50 dark:bg-slate-750 dark:text-indigo-300 hover:bg-indigo-50 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg font-bold transition-all">
                        <i class="fa-solid fa-external-link"></i> Buka
                    </a>
                </td>
            `;
        }

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">${m.media}</td>
                <td class="px-6 py-4">
                    <div class="font-extrabold text-slate-800 dark:text-slate-200 leading-snug">${m.judul}</div>
                    <div class="text-[10px] text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">${m.ringkasan}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap font-medium text-slate-500">${formatDate(m.tanggal)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center flex justify-center items-center h-full pt-6">${badge}</td>
                ${actionButton}
            </tr>
        `;
    }).join('');

    pagination.innerHTML = `
        <span class="text-[10px] font-semibold text-slate-450">Menampilkan ${offset + 1} - ${Math.min(offset + monitoringLimit, totalCount)} dari ${totalCount} kliping</span>
        <div class="flex gap-2">
            <button onclick="changeMonitoringPage(${monitoringPage - 1})" ${monitoringPage === 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-550 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
            <button onclick="changeMonitoringPage(${monitoringPage + 1})" ${monitoringPage === totalPages ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-550 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
        </div>
    `;

    window.changeMonitoringPage = function (p) {
        if (p < 1 || p > totalPages) return;
        monitoringPage = p;
        drawMonitoringTable();
    };

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
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 8 }
                    },
                    cutout: '72%'
                }
            });
        }
    }, 50);

    window.exportMonitoringReport = function (type) {
        const headers = ["Portal Media", "Headline Kliping", "Kutipan Ringkasan", "Tanggal Kliping", "Indeks Sentimen", "Tautan URL"];
        const rows = filtered.map(item => [item.media || '-', item.judul || '-', item.ringkasan || '-', formatDate(item.tanggal), item.sentimen || '-', item.url || '-']);
        if (type === 'csv') downloadCSV(headers, rows, `Kliping_Berita_${new Date().toISOString().split('T')[0]}.csv`);
        else if (type === 'excel') downloadExcel(headers, rows, `Kliping_Berita_${new Date().toISOString().split('T')[0]}.xls`);
        else openPrintReportWindow("Kliping Media Monitoring BPS Kalbar", headers, rows);
    };
}

// -------------------------------------------------------------
// 12. ASSIGNMENT VIEW
// -------------------------------------------------------------
let assignmentSearch = '';
let assignmentPicFilter = '';
let assignmentPriorityFilter = '';
let assignmentStatusFilter = '';
let assignmentSortField = 'deadline';
let assignmentSortAsc = true;

function renderAssignmentPage(container) {
    const isKepala = currentUser.role === 'kepala';
    const isTim = currentUser.role === 'tim';

    // If role is 'tim', PIC filter is locked to their own name
    if (isTim) {
        assignmentPicFilter = currentUser.name;
    }

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <i class="fa-solid fa-clipboard-list text-indigo-650 dark:text-indigo-400"></i>
                    Penugasan Tugas (Assignment)
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Pantau, kelola, dan perbarui tugas tim Humas BPS Provinsi Kalimantan Barat.</p>
            </div>
            ${!isKepala && !isTim ? `
                <button onclick="openModal('assignment')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-plus text-xs"></i> Tambah Tugas Baru
                </button>
            ` : ''}
        </div>

        <!-- KPI SUMMARY CARDS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="assignment-kpi-container">
            <!-- Dynamically populated in drawAssignmentTable() -->
        </div>

        <!-- FILTERS -->
        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-5 gap-4 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="assignment-search-input" oninput="handleAssignmentSearch(this.value)" value="${assignmentSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none placeholder-slate-450 dark:text-white text-slate-750 transition-all" placeholder="Cari nama tugas atau deskripsi...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-400"></i> Status:</span>
                <select id="assignment-status-select" onchange="handleAssignmentStatusFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Status</option>
                    <option ${assignmentStatusFilter === 'Belum Mulai' ? 'selected' : ''} value="Belum Mulai">Belum Mulai</option>
                    <option ${assignmentStatusFilter === 'Sedang Dikerjakan' ? 'selected' : ''} value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                    <option ${assignmentStatusFilter === 'Selesai' ? 'selected' : ''} value="Selesai">Selesai</option>
                    <option ${assignmentStatusFilter === 'Revisi' ? 'selected' : ''} value="Revisi">Revisi</option>
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-triangle-exclamation mr-1 text-slate-400"></i> Prioritas:</span>
                <select id="assignment-priority-select" onchange="handleAssignmentPriorityFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Prioritas</option>
                    <option ${assignmentPriorityFilter === 'Tinggi' ? 'selected' : ''} value="Tinggi">Tinggi</option>
                    <option ${assignmentPriorityFilter === 'Sedang' ? 'selected' : ''} value="Sedang">Sedang</option>
                    <option ${assignmentPriorityFilter === 'Rendah' ? 'selected' : ''} value="Rendah">Rendah</option>
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-user mr-1 text-slate-400"></i> PIC:</span>
                <select id="assignment-pic-select" onchange="handleAssignmentPicFilter(this.value)" ${isTim ? 'disabled' : ''} class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs disabled:bg-slate-100 disabled:dark:bg-slate-805 disabled:cursor-not-allowed">
                    ${isTim ? `
                        <option value="${currentUser.name}">${currentUser.name}</option>
                    ` : `
                        <option value="">Semua PIC</option>
                        ${db.team.map(m => `<option ${assignmentPicFilter === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                    `}
                </select>
            </div>
            <div class="flex justify-end items-center">
                <button onclick="resetAssignmentFilters()" class="w-full sm:w-auto btn-secondary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
            </div>
        </div>

        <!-- TABLE VIEW -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 select-none">
                            <th class="py-3.5 px-4 w-12 text-center">No</th>
                            <th onclick="handleAssignmentSort('tugas')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 min-w-[150px]">
                                Nama Tugas <span id="sort-icon-tugas" class="ml-1 text-[8px] text-slate-400"><i class="fa-solid fa-sort"></i></span>
                            </th>
                            <th class="py-3.5 px-4 min-w-[200px]">Deskripsi Detail</th>
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
        </div>
    `;

    drawAssignmentTable();
}

window.drawAssignmentTable = function() {
    const tableBody = document.getElementById('assignment-table-body');
    const kpiContainer = document.getElementById('assignment-kpi-container');
    if (!tableBody) return;

    // 1. Get filtered list base (using isTaskForCurrentUser for RBAC scoping)
    let filtered = db.assignments.filter(isTaskForCurrentUser);

    // 2. Count statistics for KPI cards (using the RBAC-filtered list so a member sees stats only for their tasks, while coord/admin sees overall stats)
    const totalCount = filtered.length;
    const pendingCount = filtered.filter(item => item.status === 'Belum Mulai').length;
    const progressCount = filtered.filter(item => item.status === 'Sedang Dikerjakan').length;
    const completedCount = filtered.filter(item => item.status === 'Selesai').length;

    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Tugas</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${totalCount}</p>
                </div>
                <div class="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-655 dark:text-indigo-400 font-bold text-lg"><i class="fa-solid fa-clipboard-list"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Belum Mulai</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${pendingCount}</p>
                </div>
                <div class="w-11 h-11 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-455 font-bold text-lg"><i class="fa-regular fa-circle-play"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sedang Dikerjakan</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${progressCount}</p>
                </div>
                <div class="w-11 h-11 bg-blue-50 dark:bg-blue-955/40 rounded-xl flex items-center justify-center text-blue-655 dark:text-blue-400 font-bold text-lg"><i class="fa-solid fa-arrows-spin animate-spin-slow"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs animate-fade-in">
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
        const query = assignmentSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.tugas && item.tugas.toLowerCase().includes(query)) ||
            (item.deskripsi && item.deskripsi.toLowerCase().includes(query))
        );
    }

    // 4. Status filter
    if (assignmentStatusFilter) {
        filtered = filtered.filter(item => item.status === assignmentStatusFilter);
    }

    // 5. Priority filter
    if (assignmentPriorityFilter) {
        filtered = filtered.filter(item => item.prioritas === assignmentPriorityFilter);
    }

    // 6. PIC filter (if not already filtered by isTaskForCurrentUser)
    if (assignmentPicFilter && currentUser.role !== 'tim') {
        filtered = filtered.filter(item => item.assigned_to === assignmentPicFilter);
    }

    // 7. Sorting
    filtered.sort((a, b) => {
        let valA = a[assignmentSortField] || '';
        let valB = b[assignmentSortField] || '';

        if (assignmentSortField === 'progres') {
            valA = Number(valA);
            valB = Number(valB);
        } else if (assignmentSortField === 'deadline' || assignmentSortField === 'tanggal_penugasan') {
            valA = new Date(valA || '1970-01-01');
            valB = new Date(valB || '1970-01-01');
        } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }

        if (valA < valB) return assignmentSortAsc ? -1 : 1;
        if (valA > valB) return assignmentSortAsc ? 1 : -1;
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

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-350 dark:text-slate-600"></i>
                        <p class="text-xs font-bold uppercase tracking-wider">Data Penugasan Kosong</p>
                        <p class="text-[10px] mt-0.5">Cobalah mengubah kata kunci pencarian atau filter</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map((item, index) => {
        const initials = getPicInitials(item.assigned_to);
        const avatarBg = getAvatarBg(item.assigned_to);

        // Status Badge Style
        let statusBadge = '';
        switch (item.status) {
            case 'Belum Mulai':
                statusBadge = '<span class="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-655">Belum Mulai</span>';
                break;
            case 'Sedang Dikerjakan':
                statusBadge = '<span class="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-955/40 dark:text-blue-300 rounded-full text-[10px] font-bold border border-blue-105 dark:border-blue-900/65">Sedang Dikerjakan</span>';
                break;
            case 'Selesai':
                statusBadge = '<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-955/40 dark:text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-105 dark:border-emerald-900/65">Selesai</span>';
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
                priorityBadge = '<span class="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-100 dark:border-rose-900 rounded text-[9px] font-extrabold uppercase">Tinggi</span>';
                break;
            case 'Sedang':
                priorityBadge = '<span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 rounded text-[9px] font-extrabold uppercase">Sedang</span>';
                break;
            case 'Rendah':
                priorityBadge = '<span class="px-2 py-0.5 bg-slate-50 text-slate-655 dark:bg-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-655 rounded text-[9px] font-bold uppercase">Rendah</span>';
                break;
            default:
                priorityBadge = `<span class="px-2 py-0.5 bg-slate-50 text-slate-655 rounded text-[9px] font-bold">${item.prioritas || '-'}</span>`;
        }

        let actions = '';
        actions = `
            <td class="py-3 px-4 text-center">
                <div class="flex justify-center items-center gap-1.5">
                    ${!isKepala ? `
                        <button onclick="openModalById('assignment', ${item.id})" title="Ubah data" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                    ` : ''}
                    ${!isKepala && currentUser.role !== 'tim' ? `
                        <button onclick="deleteItem('assignment', ${item.id})" title="Hapus data" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <i class="fa-solid fa-trash text-[10px]"></i>
                        </button>
                    ` : ''}
                    ${isKepala ? `
                        <button onclick="showDetailById('assignment', ${item.id})" title="Lihat detail" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                            <i class="fa-solid fa-eye text-[10px]"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;

        const attachmentLink = item.lampiran ? `<a href="${item.lampiran}" target="_blank" class="inline-flex items-center gap-1 text-indigo-650 hover:underline"><i class="fa-solid fa-paperclip"></i> Tautan</a>` : '<span class="text-slate-400">-</span>';

        return `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                <td class="py-3.5 px-4 text-center font-bold text-slate-400">${index + 1}</td>
                <td class="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 min-w-[150px] max-w-[250px]">
                    <span onclick="showDetailById('assignment', ${item.id})" class="hover:text-indigo-655 dark:hover:text-indigo-400 transition-colors cursor-pointer block truncate" title="${item.tugas}">${item.tugas}</span>
                </td>
                <td class="py-3.5 px-4 text-slate-550 dark:text-slate-405 min-w-[200px] max-w-[300px]">
                    <p class="line-clamp-2 leading-relaxed" title="${item.deskripsi || ''}">${item.deskripsi || '-'}</p>
                </td>
                <td class="py-3.5 px-4 text-center">${priorityBadge}</td>
                <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                <td class="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    ${formatDate(item.tanggal_penugasan)}
                </td>
                <td class="py-3.5 px-4 font-bold text-rose-655 dark:text-rose-400 whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300"><i class="fa-regular fa-calendar-check text-[10px]"></i> ${formatDate(item.deadline)}</span>
                </td>
                <td class="py-3.5 px-4 text-center">
                    <div class="flex flex-col items-center justify-center gap-1 min-w-[80px]">
                        <span class="font-bold text-[10px] text-slate-600 dark:text-slate-455">${item.progres || 0}%</span>
                        <div class="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                            <div class="bg-gradient-to-r from-indigo-500 to-violet-650 h-1 rounded-full" style="width: ${item.progres || 0}%"></div>
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
};

window.handleAssignmentSearch = function(val) {
    assignmentSearch = val;
    drawAssignmentTable();
};

window.handleAssignmentPicFilter = function(val) {
    assignmentPicFilter = val;
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
    assignmentSearch = '';
    assignmentPicFilter = currentUser.role === 'tim' ? currentUser.name : '';
    assignmentStatusFilter = '';
    assignmentPriorityFilter = '';
    const searchInput = document.getElementById('assignment-search-input');
    if (searchInput) searchInput.value = '';
    const statusSelect = document.getElementById('assignment-status-select');
    if (statusSelect) statusSelect.value = '';
    const prioritySelect = document.getElementById('assignment-priority-select');
    if (prioritySelect) prioritySelect.value = '';
    const picSelect = document.getElementById('assignment-pic-select');
    if (picSelect) picSelect.value = assignmentPicFilter;
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

