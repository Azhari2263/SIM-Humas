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
        item.assignTo,
        item['assign To'],
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

// -------------------------------------------------------------
// 1. INTEGRATED DASHBOARD VIEW
// -------------------------------------------------------------
function renderDashboard(container) {
    if (!currentUser) return;
    const userRole = currentUser.role;

    if (userRole === 'pemohon') {
        renderPemohonDashboard(container);
        return;
    }

    const now = typeof getNowWIB === 'function' ? getNowWIB() : new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getMonthFilter = (dStr) => {
        if (!dStr) return false;
        // Gunakan parseIndonesianDate() untuk menghindari UTC timezone shift
        // new Date('2026-06-24') = UTC midnight → bisa jadi tanggal 23 di timezone WIB
        const d = parseIndonesianDate(dStr);
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

    const totalRutin = rutinSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalAdHoc = adHocSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalProto = protoSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalMc = mcSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalBrs = brsSrc.filter(item => getMonthFilter(item.tanggal_rilis)).length;
    const totalHariBesar = hbSrc.filter(item => getMonthFilter(item.tanggal)).length;
    const totalAssignments = assignmentSrc.filter(item => getMonthFilter(item.deadline)).length;

    const totalKegiatanBulanIni = totalRutin + totalAdHoc + totalProto + totalMc + totalBrs + totalHariBesar + totalAssignments;

    let selesaiCount = 0;
    let progressCount = 0;

    const evalStatus = (status) => {
        if (!status) return;
        const st = status.toLowerCase();
        if (st === 'selesai' || st === 'done' || st === 'posted') selesaiCount++;
        else if (st === 'ditugaskan' || st === 'on progress' || st === 'in progress' || st === 'revisi' || st === 'draft' || st === 'belum mulai' || st === 'sedang dikerjakan') progressCount++;
    };

    rutinSrc.forEach(i => evalStatus(i.status));
    adHocSrc.forEach(i => evalStatus(i.status));
    protoSrc.forEach(i => evalStatus(i.status));
    mcSrc.forEach(i => evalStatus(i.status));
    hbSrc.forEach(i => evalStatus(i.status));
    plannerSrc.forEach(i => evalStatus(i.status));
    assignmentSrc.forEach(i => evalStatus(i.status));

    const totalPegawaiAktif = db.team.length;

    const memberTasks = db.team.map(member => {
        const rTasks = db.rekapRutin.filter(r => r.petugas && r.petugas.includes(member.nama)).length;
        const aTasks = db.adHoc.filter(a => a.petugas && a.petugas.includes(member.nama)).length;
        const pTasks = db.protokoler.filter(p => p.petugas && p.petugas.includes(member.nama)).length;
        const mTasks = db.mc.filter(m => m.petugas && m.petugas.includes(member.nama)).length;
        const cTasks = db.contentPlanner.filter(c => (c['assign To'] === member.nama || c.assignTo === member.nama || c.assignedTo === member.nama || c.pic === member.nama)).length;
        const asTasks = db.assignments.filter(as => as.assigned_to === member.nama).length;

        return {
            name: member.nama.split(' ')[0],
            rTasks,
            aTasks,
            pTasks,
            mTasks,
            cTasks,
            asTasks,
            total: rTasks + aTasks + pTasks + mTasks + cTasks + asTasks
        };
    });

    const labels = memberTasks.map(m => m.name);
    const rutinData = memberTasks.map(m => m.rTasks);
    const adhocData = memberTasks.map(m => m.aTasks);
    const protoData = memberTasks.map(m => m.pTasks + m.mTasks);
    const plannerData = memberTasks.map(m => m.cTasks + m.asTasks);

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

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col justify-between">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Distribusi Beban Kerja Tim</h3>
                    <div class="text-[9px] font-bold text-slate-450 uppercase tracking-wider flex flex-wrap gap-1.5 sm:gap-2">
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
let plannerMonthFilter = '';
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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="planner-search-input" oninput="handlePlannerSearch(this.value)" value="${plannerSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none placeholder-slate-450 dark:text-white text-slate-750 transition-all" placeholder="Cari judul atau konsep...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-400"></i> Bulan:</span>
                <select id="planner-month-select" onchange="handlePlannerMonthFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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

window.handlePlannerMonthFilter = function(val) {
    plannerMonthFilter = val;
    drawPlannerBoard();
};

window.resetPlannerFilters = function() {
    plannerSearch = '';
    plannerPicFilter = '';
    plannerStatusFilter = '';
    plannerMonthFilter = '';
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
        return;
    }

    tableBody.innerHTML = filtered.map((item, index) => {
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
                <td class="py-3.5 px-4 text-center font-bold ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}">${index + 1}</td>
                <td class="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 min-w-[200px]">
                    <div class="flex items-center gap-2">
                        <span onclick="showDetailById('content', ${item.id})" class="hover:text-indigo-650 transition-colors cursor-pointer block" title="${item.judul}">${item.judul}</span>
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
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border border-slate-200 shadow-xs ${avatarBg}" title="${picVal}">${initials}</div>
                        <span class="font-bold text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">${picVal}</span>
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
        mobileBody.innerHTML = filtered.map((item, index) => {
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
                            <p class="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-snug truncate">${item.judul}</p>
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
                            <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400">${picVal2}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-[10px] font-bold ${isDone2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}"><i class="fa-regular fa-calendar-check mr-1"></i>${tanggalStr2}</span>
                            ${mobileActions}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }
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
        const emptyHtml = `<tr><td colspan="${isKepala ? 6 : 7}" class="py-0"><div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-clipboard-list"></i></div><p class="empty-state-title">Tidak Ada Data Kegiatan Rutin</p><p class="empty-state-desc">Coba ubah filter atau kata kunci pencarian.</p></div></td></tr>`;
        body.innerHTML = emptyHtml;
        const mobileBody = document.getElementById('rutin-mobile-body');
        if (mobileBody) mobileBody.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-clipboard-list"></i></div><p class="empty-state-title">Tidak Ada Data</p><p class="empty-state-desc">Coba ubah filter atau kata kunci.</p></div>`;
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

        const isDone = item.status === 'Selesai';
        const rowBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 hover:bg-emerald-100/75 dark:hover:bg-emerald-900/40 border-l-4 border-l-emerald-500' 
            : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/35';

        return `
            <tr class="${rowBg} transition-colors">
                <td class="px-6 py-4 font-bold whitespace-nowrap ${isDone ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}">${formatDate(item.tanggal)}</td>
                <td class="px-6 py-4 font-semibold text-slate-500 whitespace-nowrap">${item.hari || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-705 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md font-bold uppercase text-[9px]">${item.rubrikasi || '-'}</span></td>
                <td class="px-6 py-4 font-extrabold text-slate-850 dark:text-slate-250 leading-snug">
                    <div class="flex items-center gap-2">
                        <span>${item.kegiatan}</span>
                        ${isDone ? '<span class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[8px]"></i> Selesai</span>' : ''}
                    </div>
                </td>
                <td class="px-6 py-4 font-bold text-indigo-650 dark:text-indigo-400 whitespace-nowrap">${item.petugas || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');

    // Mobile card view
    const mobileBody = document.getElementById('rutin-mobile-body');
    if (mobileBody) {
        mobileBody.innerHTML = filtered.map(item => {
            const statusCls = item.status === 'Selesai' ? 'badge badge-selesai' : 'badge badge-progress';
            const mobileActs = !isKepala ? `
                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                    <button onclick="openModalById('rekap_rutin', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    ${isUserAdminOrKetua() ? `<button onclick="deleteItem('rekap_rutin', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}
                </div>` : '';
            return `
                <div class="mobile-data-card">
                    <div class="flex items-start justify-between gap-2 mb-1.5">
                        <p class="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex-1 min-w-0 leading-snug">${item.kegiatan}</p>
                        <span class="${statusCls} shrink-0">${item.status || 'Ditugaskan'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[10px] text-slate-500 font-semibold">${formatDate(item.tanggal)} (${item.hari || '-'})</p>
                            <span class="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold uppercase">${item.rubrikasi || '-'}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">${item.petugas || '-'}</span>
                            ${mobileActs}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

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

        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-205 dark:border-slate-700 mb-6 shadow-xs">
            <div class="relative w-full">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" oninput="adHocSearch = this.value; drawAdHocTable();" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan atau petugas...">
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

        const isDone = item.status === 'Selesai';
        const rowBg = isDone 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/35 hover:bg-emerald-100/75 dark:hover:bg-emerald-900/40 border-l-4 border-l-emerald-500' 
            : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/35';

        return `
            <tr class="${rowBg} transition-colors">
                <td class="px-6 py-4 font-bold whitespace-nowrap ${isDone ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}">${formatDate(item.tanggal)}</td>
                <td class="px-6 py-4 font-semibold text-slate-500 whitespace-nowrap">${item.hari || '-'}</td>
                <td class="px-6 py-4 font-extrabold text-slate-855 dark:text-slate-255 leading-snug">
                    <div class="flex items-center gap-2">
                        <span>${item.kegiatan}</span>
                        ${isDone ? '<span class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[8px]"></i> Selesai</span>' : ''}
                    </div>
                </td>
                <td class="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-100">${item.jumlah_bertugas || staffList.length} orang</td>
                <td class="px-6 py-4 whitespace-normal"><div class="flex flex-wrap gap-1.5">${staffBadges || '-'}</div></td>
                <td class="px-6 py-4 text-slate-500 max-w-xs truncate font-medium">${item.keterangan || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${statusColor}">${item.status || 'Ditugaskan'}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');

    // Mobile card view for Ad Hoc
    const mobileBody = document.getElementById('adhoc-mobile-body');
    if (mobileBody) {
        mobileBody.innerHTML = filtered.map(item => {
            const staffList2 = item.petugas ? item.petugas.split(',') : [];
            const statusCls = item.status === 'Selesai' ? 'badge badge-selesai' : 'badge badge-progress';
            const mobileActs = !isKepala ? `
                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                    <button onclick="openModalById('ad_hoc', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    ${isUserAdminOrKetua() ? `<button onclick="deleteItem('ad_hoc', ${item.id})" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}
                </div>` : '';
            return `
                <div class="mobile-data-card">
                    <div class="flex items-start justify-between gap-2 mb-1.5">
                        <p class="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex-1 min-w-0 leading-snug">${item.kegiatan}</p>
                        <span class="${statusCls} shrink-0">${item.status || 'Ditugaskan'}</span>
                    </div>
                    <p class="text-[10px] text-slate-500 font-semibold mb-2">${formatDate(item.tanggal)} (${item.hari || '-'})</p>
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${staffList2.map(s => `<span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-bold">${s.trim()}</span>`).join('')}
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-slate-500 font-medium truncate max-w-[60%]">${item.keterangan || '-'}</span>
                        ${mobileActs}
                    </div>
                </div>`;
        }).join('');
    }

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
                <input type="text" id="proto-search-input" oninput="protoSearch = this.value; drawProtokolerTable();" value="${protoSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan atau lokasi...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="proto-month-select" onchange="protoMonthFilter = this.value; drawProtokolerTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
                <select id="proto-level-select" onchange="protoLevelFilter = this.value; drawProtokolerTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
    `;
    drawProtokolerTable();
}

window.resetProtoFilters = function() {
    protoSearch = '';
    protoMonthFilter = '';
    protoLevelFilter = '';
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
        const q = protoSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
            (item.lokasi && item.lokasi.toLowerCase().includes(q))
        );
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
                        <div class="flex items-center gap-2">
                            <h4 class="font-extrabold text-slate-850 dark:text-slate-200 text-sm leading-snug hover:text-indigo-650 transition-colors">${item.kegiatan}</h4>
                            ${isDone ? '<span class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[8px]"></i> Selesai</span>' : ''}
                        </div>
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
                <input type="text" id="mc-search-input" oninput="mcSearch = this.value; drawMcTable();" value="${mcSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari kegiatan atau lokasi...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="mc-month-select" onchange="mcMonthFilter = this.value; drawMcTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
                <select id="mc-level-select" onchange="mcLevelFilter = this.value; drawMcTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
    `;
    drawMcTable();
}

window.resetMcFilters = function() {
    mcSearch = '';
    mcMonthFilter = '';
    mcLevelFilter = '';
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
        const q = mcSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.kegiatan && item.kegiatan.toLowerCase().includes(q)) ||
            (item.lokasi && item.lokasi.toLowerCase().includes(q))
        );
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
                        <div class="flex items-center gap-2">
                            <h4 class="font-extrabold text-slate-855 dark:text-slate-200 text-sm leading-snug hover:text-indigo-650 transition-colors">${item.kegiatan}</h4>
                            ${isDone ? '<span class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[8px]"></i> Selesai</span>' : ''}
                        </div>
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
                <input type="text" id="brs-search-input" oninput="brsSearch = this.value; drawBrsGrid();" value="${brsSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari judul kegiatan BRS...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="brs-month-select" onchange="brsMonthFilter = this.value; drawBrsGrid();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
                <select id="brs-status-select" onchange="brsStatusFilter = this.value; drawBrsGrid();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
    `;
    drawBrsGrid();
}

window.resetBrsFilters = function() {
    brsSearch = '';
    brsMonthFilter = '';
    brsStatusFilter = '';
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
        const q = brsSearch.toLowerCase();
        filtered = filtered.filter(item => item.judul && item.judul.toLowerCase().includes(q));
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
                <input type="text" id="haribesar-search-input" oninput="hariBesarSearch = this.value; drawHariBesarTable();" value="${hariBesarSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none" placeholder="Cari hari besar...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="haribesar-month-select" onchange="hariBesarMonthFilter = this.value; drawHariBesarTable();" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
        </div>
    `;
    drawHariBesarTable();
}

window.resetHariBesarFilters = function() {
    hariBesarSearch = '';
    hariBesarMonthFilter = '';
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
        const q = hariBesarSearch.toLowerCase();
        filtered = filtered.filter(item => item.hari_besar && item.hari_besar.toLowerCase().includes(q));
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

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr><td colspan="${isKepala ? 4 : 5}" class="py-16 text-center text-slate-400 dark:text-slate-550"><i class="fa-solid fa-heart-broken text-3xl mb-2 text-slate-350 dark:text-slate-750"></i><p class="text-xs font-bold">Tidak ada agenda ucapan hari besar.</p></td></tr>
        `;
        return;
    }

    body.innerHTML = filtered.map(item => {
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
                    <div class="flex items-center gap-2">
                        <span>${item.hari_besar}</span>
                        ${isDone ? '<span class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[8px]"></i> Selesai</span>' : ''}
                    </div>
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
        mobileBody.innerHTML = filtered.map(item => {
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
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <p class="font-extrabold text-xs ${isDone ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-100'} leading-snug">${item.hari_besar}</p>
                            ${isDone ? '<span class="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[7px]"></i> Selesai</span>' : ''}
                        </div>
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
            petugas: item['assign To'] || item.assignTo || item.assignedTo || item.pic || '-',
            tanggal: item.jadwal,
            progress: item.progres || 0,
            status: item.status || 'Draft'
        });
    });

    db.assignments.filter(isTaskForCurrentUser).forEach(item => {
        allTasks.push({
            judul: item.tugas,
            jenis: 'Assignment',
            petugas: item.assigned_to || '-',
            tanggal: item.deadline,
            progress: item.progres || 0,
            status: item.status || 'Belum Mulai'
        });
    });

    let totalSlaAman = 0;
    let totalSlaMendekati = 0;
    let totalSlaTerlambat = 0;

    allTasks.forEach(task => {
        // Gunakan parseIndonesianDate untuk menghindari UTC timezone shift
        const deadlineDate = parseIndonesianDate(task.tanggal);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysRemaining = deadlineDate && !isNaN(deadlineDate.getTime())
            ? Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
            : 999; // Jika tanggal tidak valid, anggap aman

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

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex items-center gap-3">
                <div class="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-50 dark:bg-indigo-955 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0 font-extrabold text-xs sm:text-sm">${completionRate}%</div>
                <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Selesai</p><p class="text-lg sm:text-xl font-black text-slate-850 dark:text-white mt-0.5">${completedTasks}/${allTasks.length}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex items-center gap-3">
                <div class="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-50 dark:bg-emerald-955 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0"><i class="fa-solid fa-circle-check text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">SLA Aman</p><p class="text-lg sm:text-xl font-black text-slate-850 dark:text-white mt-0.5">${totalSlaAman}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex items-center gap-3">
                <div class="w-10 h-10 sm:w-11 sm:h-11 bg-amber-50 dark:bg-amber-955 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0"><i class="fa-solid fa-bell text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mendekati</p><p class="text-lg sm:text-xl font-black text-slate-855 dark:text-white mt-0.5">${totalSlaMendekati}</p></div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-205 dark:border-slate-700 shadow-xs flex items-center gap-3">
                <div class="w-10 h-10 sm:w-11 sm:h-11 bg-rose-50 dark:bg-rose-955 border border-rose-100 rounded-xl flex items-center justify-center text-rose-650 shrink-0"><i class="fa-solid fa-clock-rotate-left text-lg"></i></div>
                <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Terlambat</p><p class="text-lg sm:text-xl font-black text-slate-855 dark:text-white mt-0.5">${totalSlaTerlambat}</p></div>
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

    const rawEvents = [];
    db.rekapRutin.forEach(e => {
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
    rawEvents.forEach(e => {
        const isMine = isTaskForCurrentUser(e.item);
        if (calendarFilter === 'my' && !isMine) return;

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
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Sorot nama petugas dan jadwal agenda harian BPS Kalbar berdasarkan progres pengerjaan.</p>
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
            pushDayEvent('rekap_rutin', 'Rutin', e.kegiatan, e.petugas, e.status, e);
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
            const pic = e['assign To'] || e.assignTo || e.assignedTo || e.pic || e.petugas || '-';
            pushDayEvent('content', 'Konten', e.judul, pic, e.status, e);
        }
    });

    db.assignments.forEach(e => {
        if (e.deadline && formatDateInput(e.deadline).includes(dateStr)) {
            pushDayEvent('assignment', 'Tugas', e.tugas, e.assigned_to || e.petugas, e.status, e);
        }
    });

    // Apply calendar filtering on day details modal too!
    let filteredDayEvents = dayEvents;
    if (calendarFilter === 'my') {
        filteredDayEvents = dayEvents.filter(ev => isTaskForCurrentUser(ev.item));
    }

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
window.openCalendarReminderModal = function () {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'koordinator')) {
        showToast('Fitur rekapan reminder hanya dapat diakses oleh Ketua Tim Humas dan Administrator.', 'warning');
        return;
    }

    const isWeek = window.calendarMode === 'week';
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const curr = new Date(window.calendarCurrentDate || new Date());
    let rangeLabel = '';
    let startD, endD;

    if (isWeek) {
        const dayOfWeek = curr.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startD = new Date(curr);
        startD.setDate(curr.getDate() + diffToMonday);
        startD.setHours(0, 0, 0, 0);

        endD = new Date(startD);
        endD.setDate(startD.getDate() + 6);
        endD.setHours(23, 59, 59, 999);

        if (startD.getMonth() === endD.getMonth() && startD.getFullYear() === endD.getFullYear()) {
            rangeLabel = `Minggu Ini (${startD.getDate()} - ${endD.getDate()} ${monthNames[startD.getMonth()]} ${startD.getFullYear()})`;
        } else {
            rangeLabel = `Minggu Ini (${startD.getDate()} ${monthNames[startD.getMonth()]} - ${endD.getDate()} ${monthNames[endOfWeek.getMonth()]} ${endD.getFullYear()})`;
        }
    } else {
        const yr = curr.getFullYear();
        const mo = curr.getMonth();
        startD = new Date(yr, mo, 1, 0, 0, 0, 0);
        endD = new Date(yr, mo + 1, 0, 23, 59, 59, 999);
        rangeLabel = `Bulan ${monthNames[mo]} ${yr}`;
    }

    // Kumpulkan seluruh agenda terintegrasi
    const items = [];

    const checkDateInRange = (dateVal) => {
        if (!dateVal) return false;
        const d = new Date(dateVal);
        return d >= startD && d <= endD;
    };

    db.rekapRutin.forEach(e => {
        if (checkDateInRange(e.tanggal)) {
            items.push({
                date: formatDateInput(e.tanggal),
                type: 'Rutin',
                title: e.kegiatan,
                pic: e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Ditugaskan',
                detail: e.rubrikasi || ''
            });
        }
    });

    db.adHoc.forEach(e => {
        if (checkDateInRange(e.tanggal)) {
            items.push({
                date: formatDateInput(e.tanggal),
                type: 'Ad Hoc',
                title: e.kegiatan,
                pic: e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Ditugaskan',
                detail: e.keterangan || ''
            });
        }
    });

    db.protokoler.forEach(e => {
        if (checkDateInRange(e.tanggal)) {
            items.push({
                date: formatDateInput(e.tanggal),
                type: 'Protokoler',
                title: e.kegiatan,
                pic: e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Ditugaskan',
                detail: `${e.lokasi || '-'} (${e.jam_mulai ? formatTime(e.jam_mulai) : '-'})`
            });
        }
    });

    db.mc.forEach(e => {
        if (checkDateInRange(e.tanggal)) {
            items.push({
                date: formatDateInput(e.tanggal),
                type: 'MC',
                title: e.kegiatan,
                pic: e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Ditugaskan',
                detail: `${e.lokasi || '-'} (${e.jam_mulai ? formatTime(e.jam_mulai) : '-'})`
            });
        }
    });

    db.brsRilis.forEach(e => {
        if (checkDateInRange(e.tanggal_rilis)) {
            const pic = e.pic_poster_info || e.pic_doc_ruang || e.pic_doc_yt_zoom || e.petugas || 'Belum Ditugaskan';
            items.push({
                date: formatDateInput(e.tanggal_rilis),
                type: 'BRS Rilis',
                title: e.judul,
                pic,
                status: e.status || 'Rilis',
                detail: e.highlight || ''
            });
        }
    });

    db.hariBesar.forEach(e => {
        if (checkDateInRange(e.tanggal)) {
            items.push({
                date: formatDateInput(e.tanggal),
                type: 'Hari Besar',
                title: e.hari_besar,
                pic: e.pembuat_konten || e.pic || 'Belum Ditugaskan',
                status: e.status || 'Draft',
                detail: e.jenis_media || 'Instagram'
            });
        }
    });

    db.contentPlanner.forEach(e => {
        if (checkDateInRange(e.jadwal)) {
            const pic = e['assign To'] || e.assignTo || e.assignedTo || e.pic || e.petugas || 'Belum Ditugaskan';
            items.push({
                date: formatDateInput(e.jadwal),
                type: 'Konten',
                title: e.judul,
                pic,
                status: e.status || 'Draft',
                detail: `${e.media_post || e.media || 'Instagram'} - ${formatTime(e.jam_posting || '09:00')}`
            });
        }
    });

    db.assignments.forEach(e => {
        if (checkDateInRange(e.deadline)) {
            items.push({
                date: formatDateInput(e.deadline),
                type: 'Tugas',
                title: e.tugas,
                pic: e.assigned_to || e.petugas || 'Belum Ditugaskan',
                status: e.status || 'Belum Mulai',
                detail: `Prioritas: ${e.prioritas || 'Sedang'}`
            });
        }
    });

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

            Object.keys(groupedUpcoming).forEach(dStr => {
                const dObj = new Date(dStr);
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

            Object.keys(groupedCompleted).forEach(dStr => {
                const dObj = new Date(dStr);
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
                <input type="text" id="ticket-search-input" oninput="handleTicketSearch(this.value)" value="${ticketSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 dark:text-white transition-all" placeholder="Cari judul, pengaju, detail...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-450"></i> Bulan:</span>
                <select id="ticket-month-select" onchange="handleTicketMonthFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
                <select id="ticket-status-select" onchange="handleTicketStatusFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
                    <option value="">Semua Status</option>
                    <option ${ticketStatusFilter === 'Pending' ? 'selected' : ''} value="Pending">Pending</option>
                    <option ${ticketStatusFilter === 'Approved' ? 'selected' : ''} value="Approved">Disetujui</option>
                    <option ${ticketStatusFilter === 'Rejected' ? 'selected' : ''} value="Rejected">Ditolak</option>
                </select>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-0.5 text-slate-450"></i> Layanan:</span>
                <select id="ticket-type-select" onchange="handleTicketTypeFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
    `;

    drawTicketsGrid();
}

window.handleTicketSearch = function(val) {
    ticketSearch = val;
    drawTicketsGrid();
};

window.handleTicketMonthFilter = function(val) {
    ticketMonthFilter = val;
    drawTicketsGrid();
};

window.handleTicketStatusFilter = function(val) {
    ticketStatusFilter = val;
    drawTicketsGrid();
};

window.handleTicketTypeFilter = function(val) {
    ticketTypeFilter = val;
    drawTicketsGrid();
};

window.resetTicketFilters = function() {
    ticketSearch = '';
    ticketMonthFilter = '';
    ticketStatusFilter = '';
    ticketTypeFilter = '';
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
        const query = ticketSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.judul && item.judul.toLowerCase().includes(query)) ||
            (item.pengaju && item.pengaju.toLowerCase().includes(query)) ||
            (item.detail && item.detail.toLowerCase().includes(query))
        );
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

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white dark:bg-slate-800 p-16 text-center text-slate-400 dark:text-slate-550 rounded-2xl border border-dashed border-slate-250 dark:border-slate-700">
                <i class="fa-solid fa-ticket-simple text-4xl mb-2.5 text-slate-300 dark:text-slate-700"></i>
                <p class="text-xs font-bold">Tidak ada pengajuan tiket ditemukan.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(t => {
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
                    <div class="flex items-center gap-2 mt-3">
                        <h4 class="font-extrabold ${isDone ? 'text-emerald-950 dark:text-emerald-100' : 'text-slate-850 dark:text-slate-100'} text-sm leading-snug">${t.judul}</h4>
                        ${isDone ? '<span class="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[7px]"></i> Selesai</span>' : ''}
                    </div>
                    <p class="text-[10px] ${isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'} mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5"><i class="fa-regular fa-building text-slate-400"></i> ${t.pengaju} (${t.bidang})</p>
                    <p class="text-xs ${isDone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-650 dark:text-slate-350'} mt-2.5 leading-relaxed whitespace-pre-line">${t.detail}</p>
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
    const isKepala = currentUser.role === 'kepala';

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
                <p class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">${uniqueMedia.size} <span class="text-xs text-slate-400 font-bold">/ 18 Target</span></p>
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
    const allMediaList = [...MONITORING_MEDIA_TARGET, 'Media Lainnya'];
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
                const med = MONITORING_MEDIA_TARGET.includes(art.media) ? art.media : 'Media Lainnya';
                if (!mediaMatrix[med]) mediaMatrix[med] = Array(12).fill(0);
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
                        <i class="fa-solid fa-newspaper text-indigo-600"></i> Rekapitulasi Berita Berdasarkan Media Target
                    </h3>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pemantauan 18 Media Target BPS Kalimantan Barat periode ${getMonitoringPeriodLabel()}</p>
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
function drawMonitoringLampiranTable(content) {
    const isKepala = currentUser.role === 'kepala';
    
    // Filter base articles by active year and active month range
    let filtered = (db.monitoring || []).filter(item => {
        const d = new Date(item.tanggal || item.tanggal_rilis || `${monitoringYear}-01-01`);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return y === monitoringYear && m >= monitoringStartMonth && m <= monitoringEndMonth;
    });

    if (monitoringSearch.trim()) {
        const q = monitoringSearch.toLowerCase();
        filtered = filtered.filter(item =>
            (item.judul && item.judul.toLowerCase().includes(q)) ||
            (item.media && item.media.toLowerCase().includes(q)) ||
            (normalizeMonitoringTopic(item.topik).toLowerCase().includes(q)) ||
            (item.ringkasan && item.ringkasan.toLowerCase().includes(q))
        );
    }

    if (monitoringMediaFilter) {
        filtered = filtered.filter(item => item.media === monitoringMediaFilter);
    }

    if (monitoringTopicFilter) {
        filtered = filtered.filter(item => normalizeMonitoringTopic(item.topik) === monitoringTopicFilter);
    }

    if (monitoringMonthFilter) {
        filtered = filtered.filter(item => {
            const d = formatDateInput(item.tanggal || item.tanggal_rilis);
            return d && d.startsWith(monitoringMonthFilter);
        });
    }

    // Sort: newest date first
    filtered.sort((a, b) => new Date(b.tanggal || b.tanggal_rilis || 0) - new Date(a.tanggal || a.tanggal_rilis || 0));

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / monitoringLimit) || 1;
    if (monitoringPage > totalPages) monitoringPage = totalPages;
    const offset = (monitoringPage - 1) * monitoringLimit;
    const paginatedItems = filtered.slice(offset, offset + monitoringLimit);

    content.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <!-- TOOLBAR FILTERS -->
            <div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                    <input type="text" id="monitoring-search-input" oninput="monitoringSearch = this.value; monitoringPage = 1; drawMonitoringLampiranTable(document.getElementById('monitoring-tab-content'));" value="${monitoringSearch}" placeholder="Cari judul atau kutipan..." class="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                    <select id="monitoring-media-select" onchange="monitoringMediaFilter = this.value; monitoringPage = 1; drawMonitoringLampiranTable(document.getElementById('monitoring-tab-content'));" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none">
                        <option value="">Semua Media</option>
                        ${MONITORING_MEDIA_TARGET.map(m => `<option ${monitoringMediaFilter === m ? 'selected' : ''} value="${m}">${m}</option>`).join('')}
                        <option ${monitoringMediaFilter === 'Media Lainnya' ? 'selected' : ''} value="Media Lainnya">Media Lainnya</option>
                    </select>
                </div>
                <div>
                    <select id="monitoring-topic-select" onchange="monitoringTopicFilter = this.value; monitoringPage = 1; drawMonitoringLampiranTable(document.getElementById('monitoring-tab-content'));" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none">
                        <option value="">Semua Topik</option>
                        ${MONITORING_TOPIK_LIST.map(t => `<option ${monitoringTopicFilter === t ? 'selected' : ''} value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <select id="monitoring-month-select" onchange="monitoringMonthFilter = this.value; monitoringPage = 1; drawMonitoringLampiranTable(document.getElementById('monitoring-tab-content'));" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none">
                        <option value="">Semua Bulan (${ALL_MONITORING_MONTHS[monitoringStartMonth - 1].slice(0, 3)} - ${ALL_MONITORING_MONTHS[monitoringEndMonth - 1].slice(0, 3)})</option>
                        ${getActiveMonitoringMonths().map((m, offsetIdx) => {
                            const mNum = monitoringStartMonth + offsetIdx;
                            const val = `${monitoringYear}-${String(mNum).padStart(2, '0')}`;
                            return `<option ${monitoringMonthFilter === val ? 'selected' : ''} value="${val}">${m} ${monitoringYear}</option>`;
                        }).join('')}
                    </select>
                </div>
                <div>
                    <button onclick="resetMonitoringFilters()" class="w-full btn-secondary text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider bg-white dark:bg-slate-800">
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
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
                        ${paginatedItems.length === 0 ? `
                            <tr>
                                <td colspan="${isKepala ? 6 : 7}" class="py-16 text-center text-slate-400">
                                    <i class="fa-solid fa-newspaper text-3xl mb-2 text-slate-300 dark:text-slate-600"></i>
                                    <p class="text-xs font-bold">Tidak ada riwayat artikel ditemukan pada periode ${getMonitoringPeriodLabel()}.</p>
                                </td>
                            </tr>
                        ` : paginatedItems.map((item, idx) => {
                            const globalIdx = offset + idx + 1;
                            return `
                                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors">
                                    <td class="px-4 py-3.5 text-center font-bold text-xs text-slate-400 dark:text-slate-500">${globalIdx}</td>
                                    <td class="px-5 py-3.5">
                                        <div class="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">${item.judul}</div>
                                        ${item.ringkasan && item.ringkasan !== item.judul ? `<p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">${item.ringkasan}</p>` : ''}
                                    </td>
                                    <td class="px-4 py-3.5 whitespace-nowrap">
                                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                            <i class="fa-solid fa-newspaper text-[9px]"></i> ${item.media || '-'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3.5 whitespace-nowrap">
                                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            normalizeMonitoringTopic(item.topik).includes('Sensus Ekonomi')
                                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        }">
                                            <i class="fa-solid fa-tag text-[9px]"></i> ${normalizeMonitoringTopic(item.topik)}
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
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- PAGINATION -->
            <div class="p-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span class="text-[11px] font-semibold text-slate-500">
                    Menampilkan ${totalCount === 0 ? 0 : offset + 1} - ${Math.min(offset + monitoringLimit, totalCount)} dari ${totalCount} artikel berita pada periode terpilih
                </span>
                <div class="flex items-center gap-1.5">
                    <button onclick="changeMonitoringPageLampiran(${monitoringPage - 1})" ${monitoringPage <= 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-all">
                        <i class="fa-solid fa-chevron-left text-xs"></i>
                    </button>
                    <span class="px-3 text-xs font-bold text-slate-700 dark:text-slate-200">${monitoringPage} / ${totalPages}</span>
                    <button onclick="changeMonitoringPageLampiran(${monitoringPage + 1})" ${monitoringPage >= totalPages ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-all">
                        <i class="fa-solid fa-chevron-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.changeMonitoringPageLampiran = function (p) {
    monitoringPage = p;
    drawMonitoringLampiranTable(document.getElementById('monitoring-tab-content'));
};

window.resetMonitoringFilters = function () {
    monitoringSearch = '';
    monitoringMediaFilter = '';
    monitoringTopicFilter = '';
    monitoringMonthFilter = '';
    monitoringPage = 1;
    drawMonitoringLampiranTable(document.getElementById('monitoring-tab-content'));
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

        setBar(70);
        setStepDone('step-2', '2. Klasifikasi media dan topik berhasil');
        setStepDone('step-3', '3. Filter duplikasi selesai & database diperbarui');
        setStepActive('step-4', `4. Format Excel (.xlsx) BPS ${getMonitoringPeriodLabel()} selesai disusun...`);

        const data = await resp.json();
        if (!data.success) {
            throw new Error(data.error || 'Scraping gagal dilakukan.');
        }

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
    showToast(`Sedang menyiapkan file Excel BPS Kalbar (${getMonitoringPeriodLabel()})...`);
    window.location.href = `/api/monitoring/export-excel?year=${monitoringYear}&startMonth=${monitoringStartMonth}&endMonth=${monitoringEndMonth}`;
};

window.syncMonitoringToDriveUI = async function () {
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
        showToast(`Sinkronisasi Drive gagal: ${e.message}`, 'error');
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
            ${isUserAdminOrKetua() ? `
                <button onclick="openModal('assignment')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-plus text-xs"></i> Tambah Tugas
                </button>
            ` : ''}
        </div>

        <!-- KPI SUMMARY CARDS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="assignment-kpi-container">
            <!-- Dynamically populated in drawAssignmentTable() -->
        </div>

        <!-- FILTERS -->
        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-xs">
            <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-xs"></i></span>
                <input type="text" id="assignment-search-input" oninput="handleAssignmentSearch(this.value)" value="${assignmentSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none placeholder-slate-450 dark:text-white text-slate-750 transition-all" placeholder="Cari nama tugas atau deskripsi...">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-calendar mr-1 text-slate-400"></i> Bulan:</span>
                <select id="assignment-month-select" onchange="handleAssignmentMonthFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
                <select id="assignment-status-select" onchange="handleAssignmentStatusFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
                <select id="assignment-priority-select" onchange="handleAssignmentPriorityFilter(this.value)" class="w-full text-xs font-bold py-2 px-3 bg-white dark:bg-slate-750 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-655 dark:text-slate-200 focus:outline-none shadow-xs">
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
        const query = assignmentSearch.toLowerCase();
        aggregated = aggregated.filter(item =>
            (item.tugas && item.tugas.toLowerCase().includes(query)) ||
            (item.deskripsi && item.deskripsi.toLowerCase().includes(query))
        );
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
                    <div class="flex items-center gap-2">
                        <span onclick="showDetailById('${item.originalType}', ${item.originalId})" class="hover:text-indigo-655 dark:hover:text-indigo-400 transition-colors cursor-pointer block truncate" title="${item.tugas}">${item.tugas}</span>
                        ${isDone ? '<span class="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0"><i class="fa-solid fa-check text-[8px]"></i> Selesai</span>' : ''}
                    </div>
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
                            <div class="flex items-center gap-2 flex-1 min-w-0">
                                <p class="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-snug truncate">${item.tugas}</p>
                                ${isDone2 ? '<span class="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.2 rounded shrink-0"><i class="fa-solid fa-check text-[7px]"></i> Selesai</span>' : ''}
                            </div>
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

function getCategoryColor(cat) {
    switch (cat) {
        case 'Pedoman':
            return {
                bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
                icon: 'fa-book-open text-indigo-500'
            };
        case 'Template':
            return {
                bg: 'bg-violet-50 dark:bg-violet-955/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
                icon: 'fa-cubes text-violet-500'
            };
        case 'Surat Masuk Humas':
        case 'Surat Keluar Humas':
            return {
                bg: 'bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                icon: 'fa-envelope-open-text text-amber-500'
            };
        case 'Daftar Kontak Media/Wartawan':
        case 'Daftar Kontak Humas Instansi':
        case 'Daftar Kontak Protokoler Instansi':
            return {
                bg: 'bg-teal-50 dark:bg-teal-955/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
                icon: 'fa-address-book text-teal-500'
            };
        default:
            return {
                bg: 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
                icon: 'fa-file-lines text-slate-500'
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
                    Katalog arsip terpusat pedoman kehumasan, format template desain, registri surat resmi, dan daftar kontak stakeholder BPS Provinsi Kalimantan Barat.
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
                            <option value="">Semua Kategori</option>
                            <option value="Pedoman" ${repoCategoryFilter === 'Pedoman' ? 'selected' : ''}>Pedoman & Juknis</option>
                            <option value="Template" ${repoCategoryFilter === 'Template' ? 'selected' : ''}>Template Desain</option>
                            <option value="Surat Masuk Humas" ${repoCategoryFilter === 'Surat Masuk Humas' ? 'selected' : ''}>Surat Masuk</option>
                            <option value="Surat Keluar Humas" ${repoCategoryFilter === 'Surat Keluar Humas' ? 'selected' : ''}>Surat Keluar</option>
                            <option value="Daftar Kontak Media/Wartawan" ${repoCategoryFilter === 'Daftar Kontak Media/Wartawan' ? 'selected' : ''}>Kontak Media / Wartawan</option>
                            <option value="Daftar Kontak Humas Instansi" ${repoCategoryFilter === 'Daftar Kontak Humas Instansi' ? 'selected' : ''}>Kontak Humas Instansi</option>
                            <option value="Daftar Kontak Protokoler Instansi" ${repoCategoryFilter === 'Daftar Kontak Protokoler Instansi' ? 'selected' : ''}>Kontak Protokoler Instansi</option>
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
                    <button onclick="setRepoViewMode('grid')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${repoViewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}">
                        <i class="fa-solid fa-grid-2"></i> Grid
                    </button>
                    <button onclick="setRepoViewMode('table')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${repoViewMode === 'table' ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}">
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

    let items = (db.repository && Array.isArray(db.repository)) ? [...db.repository] : [];
    const isKepala = currentUser && currentUser.role === 'kepala';
    const canManage = !isKepala && (isUserAdminOrKetua() || (currentUser && currentUser.role === 'tim'));

    // Count statistics
    const totalDocs = items.length;
    const pedomanCount = items.filter(i => i.kategori === 'Pedoman').length;
    const templateCount = items.filter(i => i.kategori === 'Template').length;
    const kontakCount = items.filter(i => String(i.kategori || '').includes('Kontak')).length;

    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Dokumen</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${totalDocs}</p>
                </div>
                <div class="w-11 h-11 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg"><i class="fa-solid fa-folder-open"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pedoman & Juknis</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${pedomanCount}</p>
                </div>
                <div class="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-bold text-lg"><i class="fa-solid fa-book-bookmark"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Template Desain</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${templateCount}</p>
                </div>
                <div class="w-11 h-11 bg-violet-50 dark:bg-violet-955/40 rounded-xl flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-lg"><i class="fa-solid fa-cubes"></i></div>
            </div>
            <div class="kpi-card flex justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-205 dark:border-slate-705 shadow-xs animate-fade-in">
                <div>
                    <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daftar Kontak</h4>
                    <p class="text-2xl font-black text-slate-800 dark:text-white mt-1.5">${kontakCount}</p>
                </div>
                <div class="w-11 h-11 bg-teal-50 dark:bg-teal-955/40 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-lg"><i class="fa-solid fa-address-book"></i></div>
            </div>
        `;
    }

    // Apply Filter Search
    if (repoSearch.trim()) {
        const q = repoSearch.toLowerCase().trim();
        items = items.filter(i =>
            (i.nama_dokumen && i.nama_dokumen.toLowerCase().includes(q)) ||
            (i.deskripsi && i.deskripsi.toLowerCase().includes(q)) ||
            (i.pic && i.pic.toLowerCase().includes(q)) ||
            (i.versi && i.versi.toLowerCase().includes(q))
        );
    }

    // Apply Category Filter
    if (repoCategoryFilter) {
        items = items.filter(i => i.kategori === repoCategoryFilter);
    }

    // Apply Status Filter
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

    if (pagedItems.length === 0) {
        contentArea.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center animate-fade-in shadow-xs">
                <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center text-2xl mb-4">
                    <i class="fa-solid fa-folder-open"></i>
                </div>
                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200">Tidak ada dokumen ditemukan</h3>
                <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Tidak ada berkas yang sesuai dengan kata kunci pencarian atau filter kategori yang aktif.</p>
                <button onclick="resetRepoFilters()" class="mt-4 btn-secondary py-1.5 px-4 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                    <i class="fa-solid fa-rotate-left"></i> Reset Filter
                </button>
            </div>
        `;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    if (repoViewMode === 'grid') {
        contentArea.innerHTML = `
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

window.handleRepoSearch = function(val) {
    repoSearch = val;
    repoPage = 1;
    drawRepositoryContent();
};

window.handleRepoCategoryFilter = function(val) {
    repoCategoryFilter = val;
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


