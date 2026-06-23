// Views rendering module for SIM HUMAS BPS Kalbar (Clean, Premium, and Responsive UI)

// Helpers
function getPicInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();
}

function getAvatarBg(name) {
    if (!name) return 'bg-slate-100 text-slate-650';
    const colors = [
        'bg-indigo-50 text-indigo-750 border-indigo-150',
        'bg-emerald-50 text-emerald-750 border-emerald-150',
        'bg-violet-50 text-violet-750 border-violet-150',
        'bg-sky-50 text-sky-750 border-sky-150',
        'bg-rose-50 text-rose-750 border-rose-150',
        'bg-amber-50 text-amber-750 border-amber-150',
        'bg-cyan-50 text-cyan-750 border-cyan-150'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
        sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
}

// Global Export Helper
function downloadCSV(headers, rows, filename) {
    let csv = '\ufeff' + headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(v => {
            const str = v === null || v === undefined ? '' : String(v);
            return '"' + str.replace(/"/g, '""') + '"';
        }).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Print Report Window Helper
function openPrintReportWindow(title, headers, rows) {
    const printWindow = window.open('', '_blank');
    let html = `
        <html>
        <head>
            <title>${title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                .header h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
                .header p { font-size: 12px; color: #64748b; margin: 5px 0 0 0; letter-spacing: 0.5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                th { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-weight: 600; color: #334155; text-transform: uppercase; }
                td { border: 1px solid #e2e8f0; padding: 10px; color: #475569; }
                tr:nth-child(even) { background-color: #fafafa; }
                .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${title}</h1>
                <p>SIM HUMAS BPS PROVINSI KALIMANTAN BARAT • LAPORAN KINERJA REAL-TIME</p>
                <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
            </div>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map(row => `<tr>${row.map(cell => `<td>${cell || '-'}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
            <div class="footer">
                Laporan ini dibuat otomatis secara langsung dari database Google Sheets SIM Humas BPS Provinsi Kalimantan Barat.
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
}

// -------------------------------------------------------------
// 1. Dashboard View
// -------------------------------------------------------------
function renderDashboard(container) {
    const isInternal = currentUser.role === 'internal';

    if (isInternal) {
        // Internal User Dashboard
        const myTickets = db.tickets.filter(t => t.pengaju.toLowerCase().includes(currentUser.name.toLowerCase()) || t.pengaju.includes("Seksi"));
        const totalTickets = myTickets.length;
        const pendingTickets = myTickets.filter(t => t.status === 'Pending').length;
        const approvedTickets = myTickets.filter(t => t.status === 'Approved').length;
        const totalAssets = db.assets.length;

        container.innerHTML = `
            <div class="mb-8 animate-fade-in">
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Portal Layanan Humas</h2>
                <p class="text-xs text-slate-500 mt-1">Selamat datang kembali, <span class="font-bold text-indigo-650">${currentUser.name}</span>. Kelola pengajuan desain, video, dan peliputan kegiatan Anda.</p>
            </div>

            <!-- Stats grid -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div class="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 flex items-center gap-4">
                    <div class="w-11 h-11 bg-indigo-50/80 border border-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0"><i class="fa-solid fa-ticket text-lg"></i></div>
                    <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pengajuan</p><p class="text-xl font-extrabold text-slate-800 mt-0.5">${totalTickets}</p></div>
                </div>
                <div class="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 flex items-center gap-4">
                    <div class="w-11 h-11 bg-amber-50/80 border border-amber-100/50 rounded-xl flex items-center justify-center text-amber-600 shrink-0"><i class="fa-solid fa-clock-rotate-left text-lg"></i></div>
                    <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Review</p><p class="text-xl font-extrabold text-slate-800 mt-0.5">${pendingTickets}</p></div>
                </div>
                <div class="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 flex items-center gap-4">
                    <div class="w-11 h-11 bg-emerald-50/80 border border-emerald-100/50 rounded-xl flex items-center justify-center text-emerald-650 shrink-0"><i class="fa-solid fa-circle-check text-lg"></i></div>
                    <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disetujui / PIC</p><p class="text-xl font-extrabold text-slate-800 mt-0.5">${approvedTickets}</p></div>
                </div>
                <div class="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 flex items-center gap-4">
                    <div class="w-11 h-11 bg-violet-50/80 border border-violet-100/50 rounded-xl flex items-center justify-center text-violet-600 shrink-0"><i class="fa-solid fa-folder-open text-lg"></i></div>
                    <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aset Bank Desain</p><p class="text-xl font-extrabold text-slate-800 mt-0.5">${totalAssets}</p></div>
                </div>
            </div>

            <!-- Lower Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Ticket List -->
                <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div class="flex justify-between items-center mb-5 border-b pb-3.5 border-slate-100">
                        <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2"><i class="fa-solid fa-ticket-simple text-indigo-650"></i> Riwayat Pengajuan Layanan</h3>
                        <button onclick="router('tickets')" class="text-xs font-semibold text-indigo-650 hover:text-indigo-800 hover:underline">Selengkapnya →</button>
                    </div>
                    <div class="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                        ${myTickets.length > 0 ? myTickets.slice(0, 5).map(item => `
                            <div class="flex items-center justify-between border-b border-slate-100 pb-3 last:border-none last:pb-0 hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                                <div>
                                    <p class="font-bold text-xs text-slate-800">${item.judul}</p>
                                    <p class="text-[10px] text-slate-450 mt-1 flex items-center gap-2">
                                        <span class="px-2 py-0.5 bg-slate-100 border border-slate-150 rounded text-[9px] font-bold text-slate-650 uppercase tracking-wider">${item.jenis}</span>
                                        <span>•</span>
                                        <span>Batas: ${formatDate(item.deadline)}</span>
                                    </p>
                                </div>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                                    item.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                                    'bg-rose-105 text-rose-800 border border-rose-200'
                                }">${item.status === 'Approved' ? 'Disetujui' : item.status === 'Pending' ? 'Menunggu' : 'Ditolak'}</span>
                            </div>
                        `).join('') : `
                            <div class="text-center py-12 text-slate-400">
                                <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-300"></i>
                                <p class="text-xs font-semibold">Belum ada pengajuan layanan.</p>
                                <button onclick="router('tickets')" class="mt-3 bg-indigo-50 border border-indigo-100 text-indigo-650 text-[10px] py-1.5 px-3 rounded-lg font-bold hover:bg-indigo-100/60 transition-all">BUAT PENGAJUAN BARU</button>
                            </div>
                        `}
                    </div>
                </div>

                <!-- BRS List -->
                <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <h3 class="font-bold text-slate-800 text-sm mb-5 border-b pb-3.5 border-slate-100 flex items-center gap-2"><i class="fa-regular fa-calendar-days text-indigo-650"></i> BRS Terdekat</h3>
                    <div class="space-y-4 flex-1">
                        ${db.brsSchedule.length > 0 ? db.brsSchedule.slice(0, 3).map(item => `
                            <div class="p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-xs hover:border-slate-200 transition-all">
                                <p class="font-bold text-xs text-slate-800 line-clamp-1">${item.judul}</p>
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
        return;
    }

    // Humas Team Dashboard (Admin, Ketua, Staf)
    const totalContent = db.contentPlanner.length;
    const postedContent = db.contentPlanner.filter(c => c.status === 'Posted').length;
    const upcomingProtocol = db.protocol.length;
    const activeTickets = db.tickets.filter(t => t.status === 'Pending').length;

    // Compile member tasks details
    const memberTaskDetails = db.team.map(member => {
        const contentTasks = db.contentPlanner.filter(c => c.assignedTo === member.nama).length;
        const scheduleTasks = db.brsSchedule.filter(s =>
            s.pic_poster === member.nama ||
            s.pic_info === member.nama ||
            s.pic_doc === member.nama ||
            s.pic_high === member.nama
        ).length;
        const protocolTasks = db.protocol.filter(p =>
            p.petugas && p.petugas.includes(member.nama.split(' ')[0])
        ).length;

        return {
            name: member.nama.split(' ')[0],
            fullName: member.nama,
            contentTasks,
            scheduleTasks,
            protocolTasks,
            total: contentTasks + scheduleTasks + protocolTasks
        };
    });

    const labels = memberTaskDetails.map(m => m.name);
    const contentData = memberTaskDetails.map(m => m.contentTasks);
    const scheduleData = memberTaskDetails.map(m => m.scheduleTasks);
    const protocolData = memberTaskDetails.map(m => m.protocolTasks);

    container.innerHTML = `
        <div class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Dashboard Overview</h2>
                <p class="text-xs text-slate-500 mt-1">Ringkasan aktivitas dan beban kerja Tim Humas & Protokoler BPS Provinsi Kalimantan Barat</p>
            </div>
            ${activeTickets > 0 ? `
                <div onclick="router('tickets')" class="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-850 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm animate-pulse transition-all">
                    <i class="fa-solid fa-circle-exclamation text-amber-600 text-base"></i>
                    <span>Ada <strong>${activeTickets}</strong> Permintaan Layanan menunggu persetujuan Anda!</span>
                </div>
            ` : ''}
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0"><i class="fa-solid fa-chart-line text-lg"></i></div>
                <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Konten</p><p class="text-2xl font-black text-slate-800 mt-0.5">${totalContent}</p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4">
                <div class="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-650 shrink-0"><i class="fa-solid fa-circle-check text-lg"></i></div>
                <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Konten Posted</p><p class="text-2xl font-black text-slate-800 mt-0.5">${postedContent}</p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4">
                <div class="w-12 h-12 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center text-violet-650 shrink-0"><i class="fa-solid fa-user-tie text-lg"></i></div>
                <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agenda Protokol</p><p class="text-2xl font-black text-slate-800 mt-0.5">${upcomingProtocol}</p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4">
                <div class="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-650 shrink-0"><i class="fa-solid fa-inbox text-lg"></i></div>
                <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiket Layanan</p><p class="text-2xl font-black text-slate-800 mt-0.5">${db.tickets.length}</p></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Left Chart -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="font-bold text-slate-800 text-sm">Distribusi Beban Kerja Tim</h3>
                    <div class="text-[9px] text-slate-500 flex gap-2 font-bold uppercase tracking-wider">
                        <span class="inline-flex items-center"><span class="w-2 h-2 bg-indigo-500 rounded-full mr-1"></span> Konten</span>
                        <span class="inline-flex items-center"><span class="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span> Rilis</span>
                        <span class="inline-flex items-center"><span class="w-2 h-2 bg-violet-500 rounded-full mr-1"></span> Protokol</span>
                    </div>
                </div>
                <div class="relative w-full h-[240px] flex items-center justify-center">
                    <canvas id="stackedTasksChart" class="w-full h-full"></canvas>
                </div>
            </div>
            
            <!-- Right Content Progress -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
                <div class="flex justify-between items-center mb-5 border-b pb-3.5 border-slate-100">
                    <h3 class="font-bold text-slate-800 text-sm">Progres Pengerjaan Konten Terbaru</h3>
                    <button onclick="router('planner')" class="text-xs font-semibold text-indigo-650 hover:text-indigo-800 hover:underline">Selengkapnya →</button>
                </div>
                <div class="space-y-4 flex-1 max-h-[240px] overflow-y-auto pr-1">
                    ${db.contentPlanner.length > 0 ? db.contentPlanner.slice(0, 4).map(item => `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 last:border-none last:pb-0 hover:bg-slate-50/50 p-1.5 rounded-xl transition-all">
                            <div class="flex-1 mr-4 mb-1 sm:mb-0">
                                <p class="font-bold text-xs text-slate-800">${item.judul}</p>
                                <p class="text-[10px] text-slate-450 mt-1 flex items-center gap-1.5 font-medium">
                                    <span>${item.postType}</span>
                                    <span>•</span>
                                    <span>Jadwal: ${formatDate(item.jadwal)}</span>
                                    <span>•</span>
                                    <span class="font-bold text-indigo-650">${item.assignedTo?.split(' ')[0] || '-'}</span>
                                </p>
                                <div class="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                                    <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${item.progres}%"></div>
                                </div>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-center shrink-0 ${
                                item.status === 'Posted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' : 
                                item.status === 'Done' ? 'bg-indigo-100 text-indigo-800 border border-indigo-250' : 
                                item.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-250' : 'bg-slate-100 text-slate-600'
                            }">${item.status}</span>
                        </div>
                    `).join('') : `
                        <div class="text-center py-12 text-slate-400">
                            <i class="fa-solid fa-clapperboard text-3xl mb-2 text-slate-350"></i>
                            <p class="text-xs font-medium">Belum ada konten direncanakan.</p>
                        </div>
                    `}
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- BRS Schedule Card -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
                <h3 class="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2"><i class="fa-solid fa-calendar-check text-indigo-650"></i> Jadwal Rilis BRS Terdekat</h3>
                <div class="space-y-3 flex-1">
                    ${db.brsSchedule.length > 0 ? db.brsSchedule.slice(0, 3).map(item => `
                        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-xs transition-all">
                            <div>
                                <p class="font-bold text-xs text-slate-800">${item.judul}</p>
                                <p class="text-[10px] text-slate-400 mt-1.5 font-semibold flex items-center gap-1"><i class="fa-regular fa-calendar"></i>${formatDate(item.tanggal)}</p>
                            </div>
                            <span class="text-[9px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg font-bold shadow-xs">Poster: ${item.pic_poster?.split(' ')[0] || '-'}</span>
                        </div>
                    `).join('') : `
                        <div class="text-center py-8 text-slate-400">
                            <p class="text-xs font-medium">Belum ada jadwal rilis terdaftar.</p>
                        </div>
                    `}
                </div>
            </div>
            
            <!-- Protocol Schedule Card -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
                <h3 class="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2"><i class="fa-solid fa-microphone-lines text-indigo-650"></i> Agenda Protokoler Mendatang</h3>
                <div class="space-y-3 flex-1">
                    ${db.protocol.length > 0 ? db.protocol.slice(0, 3).map(item => `
                        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-xs transition-all">
                            <div>
                                <p class="font-bold text-xs text-slate-800">${item.kegiatan}</p>
                                <p class="text-[10px] text-slate-400 mt-1.5 font-semibold flex items-center gap-1"><i class="fa-solid fa-map-pin"></i>${item.lokasi}</p>
                            </div>
                            <span class="text-[9px] px-2 py-1 rounded-lg font-bold ${item.level === 'Formal' ? 'bg-indigo-50 text-indigo-750 border border-indigo-100' : 'bg-amber-50 text-amber-750 border border-amber-100'}">${item.level}</span>
                        </div>
                    `).join('') : `
                        <div class="text-center py-8 text-slate-400">
                            <p class="text-xs font-medium">Belum ada agenda protokol mendatang.</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    // Initialize Stacked Bar Chart
    setTimeout(() => {
        const ctx = document.getElementById('stackedTasksChart')?.getContext('2d');
        if (ctx) {
            if (window.chartInstance) {
                window.chartInstance.destroy();
            }
            window.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Content Planner',
                            data: contentData,
                            backgroundColor: '#6366f1',
                            borderRadius: 6,
                            borderWidth: 0
                        },
                        {
                            label: 'Jadwal Rilis',
                            data: scheduleData,
                            backgroundColor: '#10b981',
                            borderRadius: 6,
                            borderWidth: 0
                        },
                        {
                            label: 'Protokol & MC',
                            data: protocolData,
                            backgroundColor: '#8b5cf6',
                            borderRadius: 6,
                            borderWidth: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            padding: 10,
                            titleFont: { size: 12, weight: 'bold', family: 'Inter' },
                            bodyFont: { size: 11, family: 'Inter' },
                            callbacks: {
                                label: function (context) {
                                    return ` ${context.dataset.label}: ${context.raw} tugas`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            grid: { display: false },
                            ticks: { font: { size: 10, family: 'Inter', weight: 'bold' }, color: '#64748b' }
                        },
                        y: {
                            stacked: true,
                            grid: { color: '#f1f5f9' },
                            beginAtZero: true,
                            ticks: { 
                                stepSize: 1, 
                                font: { size: 9, family: 'Inter' }, 
                                color: '#94a3b8' 
                            }
                        }
                    }
                }
            });
        }
    }, 50);
}

// -------------------------------------------------------------
// 2. Content Planner (Kanban Board) View
// -------------------------------------------------------------
let plannerSearch = '';
let plannerPicFilter = '';

function renderPlanner(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Content Planner</h2>
                <p class="text-xs text-slate-500 mt-1">Kelola papan Kanban interaktif untuk melacak pembuatan dan penayangan konten visual.</p>
            </div>
            <button onclick="openModal('content')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                <i class="fa-solid fa-plus text-xs"></i> Tambah Konten Baru
            </button>
        </div>

        <!-- Filter & Search Controls -->
        <div class="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full sm:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <i class="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input type="text" id="planner-search-input" oninput="handlePlannerSearch(this.value)" value="${plannerSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 transition-all" placeholder="Cari judul atau konsep...">
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-450"></i> Filter PIC:</span>
                <select id="planner-pic-select" onchange="handlePlannerPicFilter(this.value)" class="text-xs font-bold py-2 px-3 bg-white border border-slate-250 rounded-xl text-slate-650 focus:outline-none min-w-[140px] shadow-xs">
                    <option value="">Semua PIC</option>
                    ${db.team.map(m => `<option ${plannerPicFilter === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                </select>
            </div>
        </div>

        <!-- Kanban Columns Board -->
        <div class="flex gap-4 overflow-x-auto pb-4 select-none pr-1" id="kanban-columns">
            <!-- Will be drawn dynamically by drawPlannerBoard() -->
        </div>
    `;

    drawPlannerBoard();
}

function handlePlannerSearch(val) {
    plannerSearch = val;
    drawPlannerBoard();
}

function handlePlannerPicFilter(val) {
    plannerPicFilter = val;
    drawPlannerBoard();
}

function drawPlannerBoard() {
    const statuses = ['Draft', 'In Progress', 'Done', 'Posted'];
    const postTypeIcons = {
        'Carousel': '<i class="fa-solid fa-images text-indigo-500" title="Carousel"></i>',
        'Reels': '<i class="fa-solid fa-clapperboard text-rose-500" title="Reels"></i>',
        'Single Image': '<i class="fa-regular fa-image text-emerald-500" title="Single Image"></i>',
        'Video': '<i class="fa-solid fa-video text-violet-500" title="Video"></i>'
    };

    const board = document.getElementById('kanban-columns');
    if (!board) return;

    // Filter items first
    let filtered = db.contentPlanner;
    if (plannerSearch.trim()) {
        const query = plannerSearch.toLowerCase();
        filtered = filtered.filter(item => 
            (item.judul && item.judul.toLowerCase().includes(query)) ||
            (item.konsep && item.konsep.toLowerCase().includes(query))
        );
    }
    if (plannerPicFilter) {
        filtered = filtered.filter(item => item.assignedTo === plannerPicFilter);
    }

    board.innerHTML = statuses.map(status => {
        const cards = filtered.filter(c => c.status === status);
        
        const cardsHtml = cards.map(item => {
            const avatarBg = getAvatarBg(item.assignedTo);
            const initials = getPicInitials(item.assignedTo);
            const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
            
            let nextIndex = statuses.indexOf(status) + 1;
            let prevIndex = statuses.indexOf(status) - 1;
            
            let moveButtons = `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-150 rounded-lg p-0.5">
                    ${prevIndex >= 0 ? `
                        <button onclick="moveKanbanTask(${item.id}, '${statuses[prevIndex]}')" title="Pindahkan ke ${statuses[prevIndex]}" class="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 transition-colors">
                            <i class="fa-solid fa-chevron-left text-[9px]"></i>
                        </button>
                    ` : '<div class="w-5"></div>'}
                    
                    <span class="text-[9px] font-black text-slate-400 uppercase select-none px-1">Geser</span>
                    
                    ${nextIndex < statuses.length ? `
                        <button onclick="moveKanbanTask(${item.id}, '${statuses[nextIndex]}')" title="Pindahkan ke ${statuses[nextIndex]}" class="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 transition-colors">
                            <i class="fa-solid fa-chevron-right text-[9px]"></i>
                        </button>
                    ` : '<div class="w-5"></div>'}
                </div>
            `;

            return `
                <div class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group relative">
                    <div class="flex justify-between items-start mb-2 gap-2">
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${item.jenis === 'Hard Selling' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-indigo-50 text-indigo-750 border border-indigo-100'}">${item.jenis}</span>
                        <span class="text-xs">${postTypeIcons[item.postType] || ''}</span>
                    </div>

                    <h4 onclick="showDetail('content', ${itemJson})" class="font-bold text-slate-850 text-xs hover:text-indigo-650 transition-colors cursor-pointer line-clamp-2 leading-snug" title="${item.judul}">${item.judul}</h4>
                    <p class="text-[10px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed" title="${item.konsep}">${item.konsep || 'Tidak ada deskripsi konsep.'}</p>
                    
                    <!-- Progress Bar -->
                    <div class="mt-3.5">
                        <div class="flex justify-between items-center text-[9px] text-slate-450 mb-1">
                            <span>Pengerjaan</span>
                            <span class="font-bold text-slate-600">${item.progres}%</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1">
                            <div class="bg-gradient-to-r from-indigo-500 to-violet-650 h-1 rounded-full" style="width: ${item.progres}%"></div>
                        </div>
                    </div>

                    <!-- Footer Info -->
                    <div class="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                            <div class="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-[9px] font-bold shadow-xs ${avatarBg}" title="${item.assignedTo}">${initials}</div>
                            <span class="text-[9px] text-slate-500 font-semibold truncate max-w-[65px]">${item.assignedTo?.split(' ')[0] || 'PIC'}</span>
                        </div>
                        <span class="text-[9px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded-md"><i class="fa-regular fa-clock"></i> ${formatDate(item.jadwal)}</span>
                    </div>

                    <!-- Actions Panel -->
                    <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div class="flex items-center">
                            <button onclick="openModal('content', ${itemJson})" title="Edit tugas" class="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 transition-all">
                                <i class="fa-solid fa-pen text-[10px]"></i>
                            </button>
                            <button onclick="deleteItem('content', ${item.id})" title="Hapus tugas" class="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 transition-all">
                                <i class="fa-solid fa-trash text-[10px]"></i>
                            </button>
                        </div>
                        ${moveButtons}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="flex-1 min-w-[280px] max-w-[320px] bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col max-h-[660px]">
                <div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full ${
                            status === 'Draft' ? 'bg-slate-400' :
                            status === 'In Progress' ? 'bg-blue-500' :
                            status === 'Done' ? 'bg-violet-500' : 'bg-emerald-500'
                        }"></span>
                        <h3 class="font-black text-slate-700 text-xs tracking-wider uppercase">${status}</h3>
                    </div>
                    <span class="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-500 shadow-xs">${cards.length}</span>
                </div>
                
                <div class="space-y-3.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                    ${cardsHtml.length > 0 ? cardsHtml : `
                        <div class="py-16 text-center text-slate-400 border border-dashed border-slate-250 rounded-2xl bg-white/40">
                            <i class="fa-solid fa-folder-open text-2xl mb-1.5 text-slate-300"></i>
                            <p class="text-[10px] font-bold text-slate-400">Kosong</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    window.moveKanbanTask = async function(taskId, newStatus) {
        const item = db.contentPlanner.find(c => c.id === taskId);
        if (!item) return;
        
        item.status = newStatus;
        if (newStatus === 'Posted') item.progres = 100;
        else if (newStatus === 'Draft' && item.progres === 100) item.progres = 30;
        else if (newStatus === 'Done') item.progres = 100;
        
        showToast(`Tugas dipindahkan ke status: ${newStatus}`);
        drawPlannerBoard();
        
        await sendDataToServer('update', 'content_planner', item);
    };
}

// -------------------------------------------------------------
// 3. Jadwal Rilis (BRS) View
// -------------------------------------------------------------
let scheduleSearch = '';
let schedulePicFilter = '';
let schedulePage = 1;
const scheduleLimit = 8;

function renderSchedule(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Jadwal Rilis BRS</h2>
                <p class="text-xs text-slate-500 mt-1">Monitoring agenda rilis Berita Resmi Statistik (BRS) dan pembagian tugas publikasi.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportScheduleReport('print')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-250 shadow-xs">
                    <i class="fa-solid fa-print"></i> Cetak Laporan
                </button>
                <button onclick="exportScheduleReport('csv')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-250 shadow-xs">
                    <i class="fa-solid fa-download"></i> Ekspor CSV
                </button>
                <button onclick="openModal('schedule')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-plus text-xs"></i> Tambah Jadwal BRS
                </button>
            </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full sm:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <i class="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input type="text" id="schedule-search-input" oninput="handleScheduleSearch(this.value)" value="${scheduleSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 transition-all" placeholder="Cari judul rilis...">
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-450"></i> Filter PIC:</span>
                <select id="schedule-pic-select" onchange="handleSchedulePicFilter(this.value)" class="text-xs font-bold py-2 px-3 bg-white border border-slate-250 rounded-xl text-slate-650 focus:outline-none min-w-[140px] shadow-xs">
                    <option value="">Semua PIC</option>
                    ${db.team.map(m => `<option ${schedulePicFilter === m.nama ? 'selected' : ''} value="${m.nama}">${m.nama}</option>`).join('')}
                </select>
            </div>
        </div>

        <!-- Table view -->
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fade-in flex flex-col">
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left text-slate-600">
                    <thead class="text-[10px] text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200 font-bold tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Tanggal Rilis</th>
                            <th class="px-6 py-4">Judul Rilis Statistik</th>
                            <th class="px-6 py-4">PIC Poster</th>
                            <th class="px-6 py-4">PIC Infografis / Informasi</th>
                            <th class="px-6 py-4">PIC Dokumentasi</th>
                            <th class="px-6 py-4">PIC Reels & Highlight</th>
                            <th class="px-6 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100" id="schedule-table-body">
                        <!-- Filled by drawScheduleTable() -->
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination wrapper -->
            <div class="p-4 border-t border-slate-100 flex items-center justify-between" id="schedule-pagination">
                <!-- Filled dynamically -->
            </div>
        </div>
    `;

    drawScheduleTable();
}

function handleScheduleSearch(val) {
    scheduleSearch = val;
    schedulePage = 1;
    drawScheduleTable();
}

function handleSchedulePicFilter(val) {
    schedulePicFilter = val;
    schedulePage = 1;
    drawScheduleTable();
}

function drawScheduleTable() {
    const tableBody = document.getElementById('schedule-table-body');
    const pagination = document.getElementById('schedule-pagination');
    if (!tableBody || !pagination) return;

    // Filter
    let filtered = db.brsSchedule;
    if (scheduleSearch.trim()) {
        const query = scheduleSearch.toLowerCase();
        filtered = filtered.filter(item => item.judul && item.judul.toLowerCase().includes(query));
    }
    if (schedulePicFilter) {
        filtered = filtered.filter(item => 
            item.pic_poster === schedulePicFilter ||
            item.pic_info === schedulePicFilter ||
            item.pic_doc === schedulePicFilter ||
            item.pic_high === schedulePicFilter
        );
    }

    // Sort by date ascending (soonest first)
    filtered.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    // Paginate
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / scheduleLimit) || 1;
    if (schedulePage > totalPages) schedulePage = totalPages;
    const offset = (schedulePage - 1) * scheduleLimit;
    const paginatedItems = filtered.slice(offset, offset + scheduleLimit);

    if (paginatedItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-16 text-center text-slate-400">
                    <i class="fa-solid fa-calendar-xmark text-3xl mb-2 text-slate-300"></i>
                    <p class="text-xs font-bold">Tidak ada jadwal rilis yang cocok.</p>
                </td>
            </tr>
        `;
        pagination.innerHTML = '';
        return;
    }

    tableBody.innerHTML = paginatedItems.map(item => {
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
        return `
            <tr class="hover:bg-slate-50/50 transition-colors cursor-pointer group" onclick="showDetail('schedule', ${itemJson})">
                <td class="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                    <i class="fa-regular fa-calendar-check text-indigo-500 mr-2"></i>${formatDate(item.tanggal)}
                </td>
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800 max-w-sm truncate" title="${item.judul}">${item.judul}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${item.pic_poster ? 'bg-indigo-50 text-indigo-855 border border-indigo-150' : 'bg-slate-50 text-slate-400 border border-slate-100'}">${item.pic_poster?.split(' ')[0] || '-'}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${item.pic_info ? 'bg-emerald-50 text-emerald-855 border border-emerald-150' : 'bg-slate-50 text-slate-400 border border-slate-100'}">${item.pic_info?.split(' ')[0] || '-'}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${item.pic_doc ? 'bg-violet-50 text-violet-855 border border-violet-150' : 'bg-slate-50 text-slate-400 border border-slate-100'}">${item.pic_doc?.split(' ')[0] || '-'}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${item.pic_high ? 'bg-amber-50 text-amber-855 border border-amber-150' : 'bg-slate-50 text-slate-400 border border-slate-100'}">${item.pic_high?.split(' ')[0] || '-'}</span>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="openModal('schedule', ${itemJson})" title="Edit Jadwal" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-pen-to-square text-[10px]"></i></button>
                        <button onclick="deleteItem('schedule', ${item.id})" title="Hapus Jadwal" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Pagination HTML
    pagination.innerHTML = `
        <span class="text-[10px] font-semibold text-slate-450">Menampilkan ${offset + 1} - ${Math.min(offset + scheduleLimit, totalItems)} dari ${totalItems} baris</span>
        <div class="flex gap-2">
            <button onclick="changeSchedulePage(${schedulePage - 1})" ${schedulePage === 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-550 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
            <button onclick="changeSchedulePage(${schedulePage + 1})" ${schedulePage === totalPages ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-550 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
        </div>
    `;

    window.changeSchedulePage = function(p) {
        if (p < 1 || p > totalPages) return;
        schedulePage = p;
        drawScheduleTable();
    };

    window.exportScheduleReport = function(type) {
        const headers = ["Tanggal Rilis", "Judul Rilis", "Poster PIC", "Infografis PIC", "Dokumentasi PIC", "Highlight PIC"];
        const rows = filtered.map(item => [
            formatDate(item.tanggal),
            item.judul || '-',
            item.pic_poster || '-',
            item.pic_info || '-',
            item.pic_doc || '-',
            item.pic_high || '-'
        ]);

        if (type === 'csv') {
            downloadCSV(headers, rows, `Jadwal_Rilis_BRS_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        } else {
            openPrintReportWindow("Jadwal Rilis Berita Resmi Statistik (BRS)", headers, rows);
        }
    };
}

// -------------------------------------------------------------
// 4. Protokol & MC View
// -------------------------------------------------------------
let protocolSearch = '';
let protocolLevelFilter = '';

function renderProtocol(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Agenda Protokoler & MC</h2>
                <p class="text-xs text-slate-500 mt-1">Kelola permohonan pendampingan protokol pimpinan, susunan acara, dan penugasan MC.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportProtocolReport('print')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-250 shadow-xs">
                    <i class="fa-solid fa-print"></i> Cetak Laporan
                </button>
                <button onclick="exportProtocolReport('csv')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-250 shadow-xs">
                    <i class="fa-solid fa-download"></i> Ekspor CSV
                </button>
                <button onclick="openModal('protocol')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-plus text-xs"></i> Tambah Agenda Protokol
                </button>
            </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full sm:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <i class="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input type="text" id="protocol-search-input" oninput="handleProtocolSearch(this.value)" value="${protocolSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 transition-all" placeholder="Cari kegiatan atau lokasi...">
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-1 text-slate-450"></i> Level Acara:</span>
                <select id="protocol-level-select" onchange="handleProtocolLevelFilter(this.value)" class="text-xs font-bold py-2 px-3 bg-white border border-slate-250 rounded-xl text-slate-650 focus:outline-none min-w-[140px] shadow-xs">
                    <option value="">Semua Level</option>
                    <option ${protocolLevelFilter === 'Formal' ? 'selected' : ''} value="Formal">Formal</option>
                    <option ${protocolLevelFilter === 'Non-Formal' ? 'selected' : ''} value="Non-Formal">Non-Formal</option>
                </select>
            </div>
        </div>

        <!-- Card Grid -->
        <div class="grid grid-cols-1 gap-4 animate-fade-in" id="protocol-list">
            <!-- Filled dynamically -->
        </div>
    `;

    drawProtocolList();
}

function handleProtocolSearch(val) {
    protocolSearch = val;
    drawProtocolList();
}

function handleProtocolLevelFilter(val) {
    protocolLevelFilter = val;
    drawProtocolList();
}

function drawProtocolList() {
    const list = document.getElementById('protocol-list');
    if (!list) return;

    // Filter
    let filtered = db.protocol;
    if (protocolSearch.trim()) {
        const query = protocolSearch.toLowerCase();
        filtered = filtered.filter(item => 
            (item.kegiatan && item.kegiatan.toLowerCase().includes(query)) ||
            (item.lokasi && item.lokasi.toLowerCase().includes(query))
        );
    }
    if (protocolLevelFilter) {
        filtered = filtered.filter(item => item.level === protocolLevelFilter);
    }

    // Sort by date descending (latest first)
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="bg-white p-16 text-center text-slate-400 rounded-2xl border border-dashed border-slate-250">
                <i class="fa-solid fa-microphone-slash text-3xl mb-2 text-slate-350"></i>
                <p class="text-xs font-bold">Belum ada agenda protokol terdaftar.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(item => {
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-205 hover:shadow-md hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4" onclick="showDetail('protocol', ${itemJson})">
                <div class="flex items-start gap-4">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.level === 'Formal' ? 'bg-indigo-50 text-indigo-700 border-indigo-150 shadow-sm shadow-indigo-100/20' : 'bg-amber-50 text-amber-700 border-amber-150 shadow-sm shadow-amber-100/20'
                    }">
                        <i class="fa-solid ${item.level === 'Formal' ? 'fa-user-tie' : 'fa-microphone'} text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-extrabold text-slate-850 text-sm leading-snug hover:text-indigo-650 transition-colors">${item.kegiatan}</h4>
                        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <p class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i> ${formatDate(item.tanggal)}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-solid fa-user-tie text-slate-400"></i> Pimpinan: ${item.pimpinan}</p>
                            <p class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-slate-400"></i> Lokasi: ${item.lokasi}</p>
                            <p class="flex items-center gap-1.5 col-span-full md:col-span-1 text-indigo-650"><i class="fa-solid fa-users text-slate-400"></i> Petugas: ${item.petugas || 'Belum ditunjuk'}</p>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 justify-end md:justify-center border-t border-slate-100 md:border-none pt-3 md:pt-0 shrink-0 w-full md:w-auto" onclick="event.stopPropagation()">
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold ${item.level === 'Formal' ? 'bg-indigo-50 text-indigo-750 border border-indigo-100' : 'bg-amber-50 text-amber-750 border border-amber-100'}">${item.level}</span>
                    <button onclick="openModal('protocol', ${itemJson})" title="Edit Agenda" class="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-pen-to-square text-[10px]"></i></button>
                    <button onclick="deleteItem('protocol', ${item.id})" title="Hapus Agenda" class="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>
        `;
    }).join('');

    window.exportProtocolReport = function(type) {
        const headers = ["Tanggal Kegiatan", "Nama Agenda / Kegiatan", "Pendamping Pimpinan", "Level Protokol", "Lokasi Acara", "Petugas Humas / MC"];
        const rows = filtered.map(item => [
            formatDate(item.tanggal),
            item.kegiatan || '-',
            item.pimpinan || '-',
            item.level || '-',
            item.lokasi || '-',
            item.petugas || '-'
        ]);

        if (type === 'csv') {
            downloadCSV(headers, rows, `Agenda_Protokol_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        } else {
            openPrintReportWindow("Agenda Keprotokolan & MC BPS Kalbar", headers, rows);
        }
    };
}

// -------------------------------------------------------------
// 5. Direktori Tim View
// -------------------------------------------------------------
let teamSearch = '';

function renderTeam(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Direktori Tim Humas</h2>
                <p class="text-xs text-slate-500 mt-1">Daftar anggota tim struktural, jabatan, pembagian seksi kehumasan, dan kontak.</p>
            </div>
            <button onclick="openModal('team')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                <i class="fa-solid fa-plus text-xs"></i> Tambah Anggota Tim
            </button>
        </div>

        <!-- Filter & Search Controls -->
        <div class="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full sm:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <i class="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input type="text" id="team-search-input" oninput="handleTeamSearch(this.value)" value="${teamSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 transition-all" placeholder="Cari nama atau jabatan...">
            </div>
        </div>

        <!-- Team grid -->
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

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white p-16 text-center text-slate-400 rounded-2xl border border-dashed border-slate-250">
                <i class="fa-solid fa-user-large-slash text-3xl mb-2 text-slate-350"></i>
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
        
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-205 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-col group" onclick="showDetail('team', ${itemJson})">
                <div class="h-20 bg-gradient-to-r from-indigo-750 to-slate-900 relative">
                    <!-- Avatar with initials -->
                    <div class="absolute -bottom-6 left-5 w-14 h-14 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-sm font-black tracking-wider transition-transform duration-300 group-hover:scale-105 ${avatarBg}">
                        ${initials}
                    </div>
                </div>
                <div class="pt-8 pb-4 px-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="font-extrabold text-slate-800 text-sm group-hover:text-indigo-650 transition-colors">${member.nama}</h3>
                        <p class="text-[10px] font-bold text-indigo-650 uppercase tracking-wider mt-0.5">${member.jabatan}</p>
                        <span class="inline-block mt-3 px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-150 text-[9px] rounded-full uppercase font-bold tracking-wider">${member.bidang}</span>
                        <p class="text-[10px] text-slate-500 mt-3 line-clamp-2 leading-relaxed">${member.tugas || 'Belum ada rincian tugas khusus.'}</p>
                    </div>
                    <div class="flex items-center justify-between pt-3 mt-4 border-t border-slate-100">
                        <div>
                            <p class="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Tugas Konten</p>
                            <p class="text-base font-black text-indigo-650 mt-0.5">${taskCount}</p>
                        </div>
                        <div class="flex items-center" onclick="event.stopPropagation()">
                            <button onclick="openModal('team', ${itemJson})" title="Edit Profil" class="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-pen-to-square text-[10px]"></i></button>
                            <button onclick="deleteItem('team', ${member.id})" title="Hapus Profil" class="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// -------------------------------------------------------------
// 6. Permintaan Layanan (Ticketing) View
// -------------------------------------------------------------
let ticketSearch = '';
let ticketStatusFilter = '';
let ticketTypeFilter = '';

function renderTickets(container) {
    const isInternal = currentUser.role === 'internal';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Permintaan Layanan Humas</h2>
                <p class="text-xs text-slate-500 mt-1">Sistem antrean permohonan publikasi infografis rilis, pembuatan video reels edukasi, dan dokumentasi acara.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                ${!isInternal ? `
                    <button onclick="exportTicketsReport('print')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-250 shadow-xs">
                        <i class="fa-solid fa-print"></i> Cetak Laporan
                    </button>
                    <button onclick="exportTicketsReport('csv')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-250 shadow-xs">
                        <i class="fa-solid fa-download"></i> Ekspor CSV
                    </button>
                ` : ''}
                ${isInternal ? `
                    <button onclick="openTicketModal()" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-plus text-xs"></i> Buat Pengajuan Layanan
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full md:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <i class="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input type="text" id="ticket-search-input" oninput="handleTicketSearch(this.value)" value="${ticketSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 transition-all" placeholder="Cari judul, pengaju, detail...">
            </div>
            <div class="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-circle-notch mr-0.5 text-slate-450"></i> Status:</span>
                    <select id="ticket-status-select" onchange="handleTicketStatusFilter(this.value)" class="text-[10px] font-bold py-1.5 px-2 bg-white border border-slate-250 rounded-lg text-slate-650 focus:outline-none min-w-[100px] shadow-xs">
                        <option value="">Semua</option>
                        <option ${ticketStatusFilter === 'Pending' ? 'selected' : ''} value="Pending">Pending</option>
                        <option ${ticketStatusFilter === 'Approved' ? 'selected' : ''} value="Approved">Disetujui</option>
                        <option ${ticketStatusFilter === 'Rejected' ? 'selected' : ''} value="Rejected">Ditolak</option>
                    </select>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-0.5 text-slate-450"></i> Layanan:</span>
                    <select id="ticket-type-select" onchange="handleTicketTypeFilter(this.value)" class="text-[10px] font-bold py-1.5 px-2 bg-white border border-slate-250 rounded-lg text-slate-650 focus:outline-none min-w-[120px] shadow-xs">
                        <option value="">Semua Layanan</option>
                        <option ${ticketTypeFilter === 'Infografis' ? 'selected' : ''} value="Infografis">Infografis / Poster</option>
                        <option ${ticketTypeFilter === 'Pembuatan Video' ? 'selected' : ''} value="Pembuatan Video">Pembuatan Video</option>
                        <option ${ticketTypeFilter === 'Peliputan' ? 'selected' : ''} value="Peliputan">Peliputan / Dokumentasi</option>
                        <option ${ticketTypeFilter === 'Desain Publikasi' ? 'selected' : ''} value="Desain Publikasi">Desain Publikasi</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Grid Container -->
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

    const isInternal = currentUser.role === 'internal';
    const isAdminOrKetua = currentUser.role === 'admin' || currentUser.role === 'ketua';

    // Base scoping
    let filtered = db.tickets;
    if (isInternal) {
        filtered = filtered.filter(t => t.pengaju.toLowerCase().includes(currentUser.name.toLowerCase()) || t.pengaju.includes("Seksi"));
    }

    // Filters
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

    // Sort by id descending (latest first)
    filtered.sort((a, b) => b.id - a.id);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white p-16 text-center text-slate-400 rounded-2xl border border-dashed border-slate-250">
                <i class="fa-solid fa-ticket-simple text-4xl mb-2.5 text-slate-300"></i>
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
        if (isAdminOrKetua && t.status === 'Pending') {
            actions = `
                <div class="mt-5 pt-3 border-t border-slate-100 flex gap-2 justify-end">
                    <button onclick="approveTicket(${t.id})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                        <i class="fa-solid fa-user-plus"></i> Setujui & PIC
                    </button>
                    <button onclick="rejectTicket(${t.id})" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 border border-rose-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                        <i class="fa-solid fa-ban"></i> Tolak
                    </button>
                </div>
            `;
        } else if (t.status === 'Approved' && t.pic) {
            actions = `
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-500">
                    <div class="w-5.5 h-5.5 rounded-full ${getAvatarBg(t.pic)} flex items-center justify-center font-bold text-[8px] shadow-xs">${getPicInitials(t.pic)}</div>
                    <span>Ditugaskan ke: <strong class="text-slate-800 font-bold">${t.pic}</strong></span>
                </div>
            `;
        } else if (t.status === 'Rejected') {
            actions = `
                <div class="mt-4 pt-3 border-t border-slate-100 text-[10px] text-rose-650 font-bold flex items-center gap-1">
                    <i class="fa-solid fa-triangle-exclamation"></i> Pengajuan ditolak oleh pimpinan.
                </div>
            `;
        }

        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-205 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div>
                    <div class="flex justify-between items-start gap-3">
                        <span class="px-2.5 py-0.5 bg-slate-100 border border-slate-150 text-slate-650 rounded-full text-[9px] uppercase font-bold tracking-wider">${t.jenis}</span>
                        ${statusBadge}
                    </div>
                    <h4 class="font-extrabold text-slate-850 text-sm mt-3 leading-snug">${t.judul}</h4>
                    <p class="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider flex items-center gap-1.5"><i class="fa-regular fa-building text-slate-400"></i> ${t.pengaju} (${t.bidang})</p>
                    <p class="text-xs text-slate-600 mt-2.5 leading-relaxed whitespace-pre-line">${t.detail}</p>
                </div>
                <div>
                    <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px]">
                        <span class="text-rose-600 font-bold flex items-center gap-1"><i class="fa-regular fa-calendar-xmark"></i> Batas: ${formatDate(t.deadline)}</span>
                        ${isAdminOrKetua ? `
                            <button onclick="deleteItem('tickets', ${t.id})" title="Hapus Pengajuan" class="text-slate-400 hover:text-rose-600 transition-colors"><i class="fa-solid fa-trash text-xs"></i></button>
                        ` : ''}
                    </div>
                    ${actions}
                </div>
            </div>
        `;
    }).join('');

    window.exportTicketsReport = function(type) {
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

        if (type === 'csv') {
            downloadCSV(headers, rows, `Tiket_Layanan_Humas_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        } else {
            openPrintReportWindow("Daftar Pengajuan Layanan Humas Kalbar", headers, rows);
        }
    };
}

// -------------------------------------------------------------
// 7. Digital Asset Management (DAM) View
// -------------------------------------------------------------
let assetSearch = '';
let assetCatFilter = 'Semua';

function renderAssets(container) {
    const categories = ['Semua', 'Template', 'Logo', 'Foto', 'Dokumen'];

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Bank Desain & Dokumentasi</h2>
                <p class="text-xs text-slate-500 mt-1">Penyimpanan berkas aset visual resmi, logo brand kit BPS, template feeds, dan dokumentasi visual Humas.</p>
            </div>
            <button onclick="openAssetUploadModal()" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                <i class="fa-solid fa-upload text-xs"></i> Unggah Aset Visual
            </button>
        </div>

        <!-- Filter & Search Controls -->
        <div class="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
            <div class="relative w-full md:max-w-xs">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <i class="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input type="text" id="asset-search-input" oninput="handleAssetSearch(this.value)" value="${assetSearch}" class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium focus:bg-white focus:outline-none placeholder-slate-450 text-slate-700 transition-all" placeholder="Cari nama aset visual...">
            </div>
            <div class="flex flex-wrap gap-1.5" id="assets-filter-bar">
                ${categories.map(c => `
                    <button onclick="filterAssets('${c}', this)" class="asset-filter-btn px-4.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                        c === assetCatFilter ? 'bg-indigo-650 text-white border-indigo-650 shadow-sm shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    } transition-all">${c}</button>
                `).join('')}
            </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in" id="assets-grid">
            <!-- Drawn dynamically -->
        </div>
    `;

    drawAssetsGrid();
}

function handleAssetSearch(val) {
    assetSearch = val;
    drawAssetsGrid();
}

window.filterAssets = function (cat, btn) {
    assetCatFilter = cat;
    document.querySelectorAll('.asset-filter-btn').forEach(b => {
        b.className = 'asset-filter-btn px-4.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-all';
    });
    btn.className = 'asset-filter-btn px-4.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border bg-indigo-650 text-white border-indigo-650 shadow-sm shadow-indigo-100 transition-all';
    drawAssetsGrid();
};

function drawAssetsGrid() {
    const grid = document.getElementById('assets-grid');
    if (!grid) return;

    let filtered = db.assets;
    if (assetCatFilter !== 'Semua') {
        filtered = filtered.filter(a => a.kategori === assetCatFilter);
    }
    if (assetSearch.trim()) {
        const query = assetSearch.toLowerCase();
        filtered = filtered.filter(a => a.nama && a.nama.toLowerCase().includes(query));
    }

    // Sort latest first
    filtered.sort((a, b) => b.id - a.id);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white p-16 text-center text-slate-400 rounded-2xl border border-dashed border-slate-250">
                <i class="fa-solid fa-folder-open text-4xl mb-2.5 text-slate-350"></i>
                <p class="text-xs font-bold">Belum ada aset digital dalam kategori ini.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(a => `
        <div class="bg-white rounded-2xl border border-slate-205 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col group">
            <div class="h-32 bg-slate-100 relative overflow-hidden shrink-0 border-b border-slate-100">
                <img src="${a.preview}" alt="${a.nama}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                <span class="absolute top-2 left-2 px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white rounded-md text-[8px] font-bold uppercase tracking-widest">${a.kategori}</span>
            </div>
            <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <h4 class="font-bold text-slate-800 text-xs truncate leading-snug" title="${a.nama}">${a.nama}</h4>
                    <p class="text-[9px] text-slate-450 mt-1 font-semibold uppercase tracking-wider">Ukuran: ${a.ukuran} • Oleh: ${a.pengunggah}</p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[9px]">
                    <span class="text-slate-400 font-semibold uppercase tracking-wider"><i class="fa-regular fa-calendar mr-1"></i>${formatDate(a.tanggal)}</span>
                    <div class="flex items-center gap-1.5">
                        <button onclick="deleteItem('assets', ${a.id})" title="Hapus Berkas" class="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        <a href="${a.preview}" target="_blank" class="text-indigo-650 hover:text-indigo-850 font-bold flex items-center gap-1 uppercase tracking-wider text-[8px] bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-150 transition-all">
                            <i class="fa-solid fa-eye"></i> Lihat
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

window.openAssetUploadModal = function () {
    currentModalType = 'asset_upload';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'dynamic-modal';
    modal.innerHTML = `
        <div class="modal-content p-6 shadow-2xl border border-slate-100">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 class="text-lg font-black text-slate-900">Unggah Aset Visual</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="saveAssetUpload(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Aset / Judul Berkas <span class="text-rose-500">*</span></label>
                    <input type="text" id="asset-name" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Contoh: Logo Hari Statistik Nasional 2026.png" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Aset</label>
                    <select id="asset-cat" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                        <option value="Template">Template Desain</option>
                        <option value="Logo">Logo & Brand Kit</option>
                        <option value="Foto">Foto Dokumentasi</option>
                        <option value="Dokumen">Dokumen (Press Release / PDF)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Berkas <span class="text-rose-500">*</span></label>
                    <input type="file" id="asset-file" class="w-full border border-dashed border-slate-300 p-6 rounded-xl bg-slate-50 cursor-pointer text-xs focus:outline-none hover:bg-slate-100 transition-all" required>
                </div>
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button type="submit" class="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider"><i class="fa-solid fa-upload mr-1.5"></i> Unggah</button>
                    <button type="button" onclick="closeModal()" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider">Batal</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

// -------------------------------------------------------------
// 8. Media Monitoring & Sentiment Analysis View
// -------------------------------------------------------------
let monitoringSearch = '';
let monitoringSentimentFilter = '';
let monitoringPage = 1;
const monitoringLimit = 8;

function renderMonitoring(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-2xl font-black text-slate-900 tracking-tight">Media Monitoring</h2>
                <p class="text-xs text-slate-500 mt-1">Pantau pemberitaan rilis data BPS Provinsi Kalimantan Barat di berbagai portal berita online lokal.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportMonitoringReport('print')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-250 shadow-xs">
                    <i class="fa-solid fa-print"></i> Cetak Kliping
                </button>
                <button onclick="exportMonitoringReport('csv')" class="btn-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 bg-white border border-slate-250 shadow-xs">
                    <i class="fa-solid fa-download"></i> Ekspor CSV
                </button>
                <button onclick="openAddMonitoringModal()" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-xs font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-plus text-xs"></i> Tambah Kliping Berita
                </button>
            </div>
        </div>

        <!-- Metric overview -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in font-sans" id="monitoring-stats-grid">
            <!-- Dynamically populated in drawMonitoringTable() -->
        </div>

        <!-- Layout grid: table on left, chart on right -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <!-- Left panel -->
            <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                    <!-- Search & filter controls -->
                    <div class="bg-slate-50/50 p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div class="relative w-full sm:max-w-xs">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                <i class="fa-solid fa-magnifying-glass text-xs"></i>
                            </span>
                            <input type="text" id="monitoring-search-input" oninput="handleMonitoringSearch(this.value)" value="${monitoringSearch}" class="w-full pl-9 pr-4 py-2 bg-white border border-slate-250 rounded-xl text-xs font-medium focus:outline-none placeholder-slate-450 text-slate-700 transition-all" placeholder="Cari portal media atau headline...">
                        </div>
                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap"><i class="fa-solid fa-filter mr-0.5 text-slate-450"></i> Sentimen:</span>
                            <select id="monitoring-sentiment-select" onchange="handleMonitoringSentimentFilter(this.value)" class="text-[10px] font-bold py-1.5 px-2 bg-white border border-slate-250 rounded-lg text-slate-650 focus:outline-none min-w-[100px] shadow-xs">
                                <option value="">Semua</option>
                                <option ${monitoringSentimentFilter === 'Positif' ? 'selected' : ''} value="Positif">Positif</option>
                                <option ${monitoringSentimentFilter === 'Netral' ? 'selected' : ''} value="Netral">Netral</option>
                                <option ${monitoringSentimentFilter === 'Negatif' ? 'selected' : ''} value="Negatif">Negatif</option>
                            </select>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-xs text-left text-slate-650">
                            <thead class="text-[9px] text-slate-500 bg-slate-50/60 uppercase border-b border-slate-200 font-bold tracking-wider">
                                <tr>
                                    <th class="px-6 py-4">Portal Media</th>
                                    <th class="px-6 py-4">Kliping Headline & Kutipan</th>
                                    <th class="px-6 py-4">Tanggal</th>
                                    <th class="px-6 py-4 text-center">Sentimen</th>
                                    <th class="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100" id="monitoring-table-body">
                                <!-- Filled by drawMonitoringTable() -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Pagination footer -->
                <div class="p-4 border-t border-slate-100 flex items-center justify-between" id="monitoring-pagination">
                    <!-- Filled dynamically -->
                </div>
            </div>

            <!-- Right panel: Sentiment chart -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[360px]" id="monitoring-chart-panel">
                <h3 class="font-bold text-slate-800 text-sm mb-4 border-b pb-2 border-slate-100 flex items-center gap-1.5"><i class="fa-solid fa-chart-pie text-indigo-650 text-base"></i> Proporsi Sentimen</h3>
                <div class="w-36 h-36 relative mx-auto flex items-center justify-center">
                    <canvas id="mediaSentimentChart" class="w-full h-full"></canvas>
                </div>
                <div class="mt-6 flex flex-col gap-2 w-full text-[10px] text-slate-600 font-bold uppercase tracking-wider" id="sentiment-breakdown">
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

    // Filter
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

    // Sort by date descending (latest first)
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // Stats calculations
    const totalCount = filtered.length;
    const posCount = filtered.filter(m => m.sentimen === 'Positif').length;
    const netCount = filtered.filter(m => m.sentimen === 'Netral').length;
    const negCount = filtered.filter(m => m.sentimen === 'Negatif').length;
    const positiveRate = totalCount > 0 ? Math.round((posCount / totalCount) * 100) : 0;

    // Stats Grid HTML
    statsGrid.innerHTML = `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Kliping</p><p class="text-xl font-black text-slate-800 mt-1">${totalCount}</p></div>
            <div class="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 text-lg"><i class="fa-solid fa-newspaper"></i></div>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sentimen Positif</p><p class="text-xl font-black text-emerald-650 mt-1">${posCount}</p></div>
            <div class="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-lg"><i class="fa-regular fa-face-smile"></i></div>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sentimen Negatif</p><p class="text-xl font-black text-rose-650 mt-1">${negCount}</p></div>
            <div class="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-650 text-lg"><i class="fa-regular fa-face-frown"></i></div>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pemberitaan Positif</p><p class="text-xl font-black text-indigo-600 mt-1">${positiveRate}%</p></div>
            <div class="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-lg"><i class="fa-solid fa-chart-line"></i></div>
        </div>
    `;

    // Breakdown HTML
    breakdown.innerHTML = `
        <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Positif</span><strong>${posCount} (${totalCount ? Math.round((posCount / totalCount) * 100) : 0}%)</strong></div>
        <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-slate-400 rounded-full"></span> Netral</span><strong>${netCount} (${totalCount ? Math.round((netCount / totalCount) * 100) : 0}%)</strong></div>
        <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Negatif</span><strong>${negCount} (${totalCount ? Math.round((negCount / totalCount) * 100) : 0}%)</strong></div>
    `;

    // Paginate
    const totalPages = Math.ceil(totalCount / monitoringLimit) || 1;
    if (monitoringPage > totalPages) monitoringPage = totalPages;
    const offset = (monitoringPage - 1) * monitoringLimit;
    const paginatedItems = filtered.slice(offset, offset + monitoringLimit);

    if (paginatedItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-16 text-center text-slate-400">
                    <i class="fa-solid fa-face-meh text-3xl mb-2 text-slate-300"></i>
                    <p class="text-xs font-bold">Kliping berita tidak ditemukan.</p>
                </td>
            </tr>
        `;
        pagination.innerHTML = '';
        return;
    }

    tableBody.innerHTML = paginatedItems.map(m => {
        let badge = '';
        if (m.sentimen === 'Positif') {
            badge = `<span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded text-[9px] font-bold flex items-center justify-center gap-1 w-20 shadow-xs"><i class="fa-solid fa-smile-wink"></i>Positif</span>`;
        } else if (m.sentimen === 'Negatif') {
            badge = `<span class="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-250 rounded text-[9px] font-bold flex items-center justify-center gap-1 w-20 shadow-xs"><i class="fa-solid fa-frown-open"></i>Negatif</span>`;
        } else {
            badge = `<span class="px-2.5 py-0.5 bg-slate-50 text-slate-650 border border-slate-200 rounded text-[9px] font-bold flex items-center justify-center gap-1 w-20 shadow-xs"><i class="fa-solid fa-meh"></i>Netral</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">${m.media}</td>
                <td class="px-6 py-4">
                    <div class="font-extrabold text-slate-800 leading-snug">${m.judul}</div>
                    <div class="text-[10px] text-slate-500 mt-1 leading-relaxed">${m.ringkasan}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap font-medium text-slate-500">${formatDate(m.tanggal)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center flex justify-center items-center h-full pt-6">${badge}</td>
                <td class="px-6 py-4 text-center whitespace-nowrap" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="deleteItem('monitoring', ${m.id})" title="Hapus Kliping" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        <a href="${m.url}" target="_blank" class="text-indigo-650 hover:text-indigo-850 flex items-center justify-center gap-1 uppercase tracking-wider text-[8px] bg-slate-50 hover:bg-indigo-50 border border-slate-200 px-2 py-1 rounded-lg font-bold transition-all">
                            <i class="fa-solid fa-external-link"></i> Buka
                        </a>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Pagination HTML
    pagination.innerHTML = `
        <span class="text-[10px] font-semibold text-slate-450">Menampilkan ${offset + 1} - ${Math.min(offset + monitoringLimit, totalCount)} dari ${totalCount} kliping</span>
        <div class="flex gap-2">
            <button onclick="changeMonitoringPage(${monitoringPage - 1})" ${monitoringPage === 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-550 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
            <button onclick="changeMonitoringPage(${monitoringPage + 1})" ${monitoringPage === totalPages ? 'disabled' : ''} class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-550 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
        </div>
    `;

    window.changeMonitoringPage = function(p) {
        if (p < 1 || p > totalPages) return;
        monitoringPage = p;
        drawMonitoringTable();
    };

    // Re-initialize Doughnut Chart
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
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            padding: 8,
                            bodyFont: { size: 10, family: 'Inter' }
                        }
                    },
                    cutout: '72%'
                }
            });
        }
    }, 50);

    window.exportMonitoringReport = function(type) {
        const headers = ["Portal Media", "Headline Kliping", "Kutipan Ringkasan", "Tanggal Kliping", "Indeks Sentimen"];
        const rows = filtered.map(item => [
            item.media || '-',
            item.judul || '-',
            item.ringkasan || '-',
            formatDate(item.tanggal),
            item.sentimen || '-'
        ]);

        if (type === 'csv') {
            downloadCSV(headers, rows, `Kliping_Berita_Media_SIMHumas_${new Date().toISOString().split('T')[0]}.csv`);
        } else {
            openPrintReportWindow("Kliping Media Monitoring BPS Kalbar", headers, rows);
        }
    };
}

window.openAddMonitoringModal = function () {
    currentModalType = 'add_monitoring';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'dynamic-modal';
    modal.innerHTML = `
        <div class="modal-content p-6 shadow-2xl border border-slate-100">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 class="text-lg font-black text-slate-900">Tambah Kliping Berita</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="saveMonitoringItem(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Portal Media <span class="text-rose-500">*</span></label>
                    <input type="text" id="mon-media" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Contoh: Tribun Pontianak" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Headline Berita <span class="text-rose-500">*</span></label>
                    <input type="text" id="mon-title" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Masukkan judul headline berita resmi..." required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sentimen Pemberitaan</label>
                    <select id="mon-sentiment" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                        <option value="Positif">Positif</option>
                        <option value="Netral">Netral</option>
                        <option value="Negatif">Negatif</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kliping Ringkasan Berita <span class="text-rose-500">*</span></label>
                    <textarea id="mon-summary" rows="3" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-700" placeholder="Masukkan kutipan ringkas / rangkuman isi berita..." required></textarea>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan URL Berita Resmi <span class="text-rose-500">*</span></label>
                    <input type="url" id="mon-url" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="https://pontianak.tribunnews.com/..." required>
                </div>
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button type="submit" class="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider"><i class="fa-solid fa-save mr-1.5"></i> Simpan Kliping</button>
                    <button type="button" onclick="closeModal()" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider">Batal</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

// -------------------------------------------------------------
// 9. Additional Tickets Modal
// -------------------------------------------------------------
window.openTicketModal = function () {
    currentModalType = 'ticket_request';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'dynamic-modal';
    modal.innerHTML = `
        <div class="modal-content p-6 shadow-2xl border border-slate-100">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 class="text-lg font-black text-slate-900">Buat Permintaan Layanan Humas</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="saveTicketRequest(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Permintaan / Nama Kegiatan <span class="text-rose-500">*</span></label>
                    <input type="text" id="req-title" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all font-medium text-slate-800" placeholder="Contoh: Pembuatan Infografis Angka Kemiskinan Kalbar 2026" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenis Layanan</label>
                    <select id="req-type" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all">
                        <option value="Infografis">Infografis / Rilis Poster</option>
                        <option value="Pembuatan Video">Pembuatan Video Edukasi/Reels</option>
                        <option value="Peliputan">Peliputan / Dokumentasi Acara</option>
                        <option value="Desain Publikasi">Desain Buku / Laporan Publikasi</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Batas Waktu (Deadline) <span class="text-rose-500">*</span></label>
                    <input type="date" id="req-deadline" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-800" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rincian Deskripsi & Permintaan Khusus <span class="text-rose-500">*</span></label>
                    <textarea id="req-detail" rows="3.5" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 transition-all text-slate-700" placeholder="Tuliskan spesifikasi teknis, data pendukung, ukuran gambar, atau permohonan khusus lainnya..." required></textarea>
                </div>
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button type="submit" class="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider"><i class="fa-solid fa-paper-plane mr-1.5"></i> Kirim Permintaan</button>
                    <button type="button" onclick="closeModal()" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider">Batal</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

window.approveTicket = function (id) {
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'assign-pic-modal';
    modal.innerHTML = `
        <div class="modal-content p-6 shadow-2xl border border-slate-100">
            <div class="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 class="text-base font-black text-slate-850">Setujui & Tugaskan PIC</h3>
                <button onclick="this.closest('.modal').remove()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="confirmApproveTicket(event, ${id})" class="space-y-4">
                <div>
                    <p class="text-xs text-slate-500 mb-4 leading-relaxed">Pilih anggota tim humas yang ditugaskan untuk menyelesaikan permintaan layanan ini. Kartu pengerjaan baru akan otomatis ditambahkan ke papan Content Planner.</p>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Petugas (PIC) <span class="text-rose-500">*</span></label>
                    <select id="assign-pic-select" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-650 transition-all" required>
                        <option value="">Pilih Anggota...</option>
                        ${db.team.map(m => `<option value="${m.nama}">${m.nama} (${m.jabatan})</option>`).join('')}
                    </select>
                </div>
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button type="submit" class="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider"><i class="fa-solid fa-circle-check mr-1.5"></i> Konfirmasi</button>
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider">Batal</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};
