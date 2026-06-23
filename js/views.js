// Views rendering module for SIM HUMAS BPS Kalbar

// Helper for PIC avatar
function getPicInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();
}

// Helper to get random soft background color for initials
function getAvatarBg(name) {
    if (!name) return 'bg-slate-200 text-slate-700';
    const colors = [
        'bg-blue-100 text-blue-800 border-blue-200',
        'bg-green-100 text-green-800 border-green-200',
        'bg-purple-100 text-purple-800 border-purple-200',
        'bg-amber-100 text-amber-800 border-amber-200',
        'bg-rose-100 text-rose-800 border-rose-200',
        'bg-indigo-100 text-indigo-800 border-indigo-200',
        'bg-cyan-100 text-cyan-800 border-cyan-200'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
        sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
}

// 1. Dashboard View
function renderDashboard(container) {
    const isInternal = currentUser.role === 'internal';

    if (isInternal) {
        // Internal User Dashboard
        const totalTickets = db.tickets.length;
        const pendingTickets = db.tickets.filter(t => t.status === 'Pending').length;
        const approvedTickets = db.tickets.filter(t => t.status === 'Approved').length;
        const totalAssets = db.assets.length;

        container.innerHTML = `
            <div class="mb-8 animate-fade-in">
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Layanan Humas Internal</h2>
                <p class="text-slate-500 mt-1">Selamat datang kembali, <span class="font-semibold text-stats-600">${currentUser.name}</span>. Kelola pengajuan layanan Anda di sini.</p>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 mb-8">
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                    <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0"><i class="fa-solid fa-ticket text-xl"></i></div>
                    <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Permintaan Saya</p><p class="text-2xl font-bold text-slate-800 mt-0.5">${totalTickets}</p></div>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                    <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0"><i class="fa-regular fa-clock text-xl"></i></div>
                    <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Menunggu Review</p><p class="text-2xl font-bold text-slate-800 mt-0.5">${pendingTickets}</p></div>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                    <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0"><i class="fa-solid fa-circle-check text-xl"></i></div>
                    <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disetujui / Aktif</p><p class="text-2xl font-bold text-slate-800 mt-0.5">${approvedTickets}</p></div>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                    <div class="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0"><i class="fa-solid fa-folder-open text-xl"></i></div>
                    <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aset Digital</p><p class="text-2xl font-bold text-slate-800 mt-0.5">${totalAssets}</p></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <!-- Left Panel: Ticket List -->
                <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 class="font-bold text-lg text-slate-800 mb-5 flex justify-between items-center">
                        <span>Permintaan Layanan Terakhir Anda</span>
                        <button onclick="router('tickets')" class="text-xs font-semibold text-stats-600 hover:text-stats-800 hover:underline">Semua Permintaan →</button>
                    </h3>
                    <div class="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                        ${db.tickets.slice(0, 5).map(item => `
                            <div class="flex items-center justify-between border-b border-slate-100 pb-3.5 last:border-none last:pb-0 hover:bg-slate-50/50 p-2 rounded-lg transition-all">
                                <div>
                                    <p class="font-semibold text-sm text-slate-700">${item.judul}</p>
                                    <p class="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                        <span class="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold uppercase tracking-wider">${item.jenis}</span>
                                        <span>•</span>
                                        <span>Deadline: ${formatDate(item.deadline)}</span>
                                    </p>
                                </div>
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    item.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                                    item.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                                    'bg-rose-100 text-rose-700'
                                }">${
                                    item.status === 'Approved' ? 'Disetujui' : 
                                    item.status === 'Pending' ? 'Pending' : 'Ditolak'
                                }</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Right Panel: BRS Schedule -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 class="font-bold text-lg text-slate-800 mb-5">Jadwal Rilis BRS Terdekat</h3>
                    <div class="space-y-4">
                        ${db.brsSchedule.slice(0, 3).map(item => `
                            <div class="p-4 bg-slate-50/70 border border-slate-100 rounded-xl hover:shadow-sm transition-all duration-200">
                                <p class="font-semibold text-xs text-slate-700">${item.judul}</p>
                                <p class="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                                    <i class="fa-regular fa-calendar text-xs"></i>${formatDate(item.tanggal)}
                                </p>
                            </div>
                        `).join('')}
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

    // Calculate member tasks for Stacked Bar Chart
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
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Dashboard Overview</h2>
                <p class="text-slate-500 mt-1">Ringkasan aktivitas Tim Humas & Protokoler BPS Provinsi Kalimantan Barat</p>
            </div>
            ${activeTickets > 0 ? `
                <div onclick="router('tickets')" class="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 cursor-pointer shadow-sm animate-pulse transition-all">
                    <i class="fa-solid fa-circle-exclamation text-amber-600 text-base"></i>
                    <span>Ada <strong>${activeTickets}</strong> Permintaan Layanan menunggu persetujuan Anda!</span>
                </div>
            ` : ''}
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 mb-8">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0"><i class="fa-solid fa-newspaper text-xl"></i></div>
                <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Konten</p><p class="text-2xl font-bold text-slate-800 mt-0.5">${totalContent}</p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0"><i class="fa-solid fa-check-circle text-xl"></i></div>
                <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Konten Posted</p><p class="text-2xl font-bold text-slate-800 mt-0.5">${postedContent}</p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                <div class="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0"><i class="fa-solid fa-user-tie text-xl"></i></div>
                <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agenda Protokol</p><p class="text-2xl font-bold text-slate-800 mt-0.5">${upcomingProtocol}</p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0"><i class="fa-solid fa-ticket text-xl"></i></div>
                <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiket Layanan</p><p class="text-2xl font-bold text-slate-800 mt-0.5">${db.tickets.length}</p></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg text-slate-800">Distribusi Tugas Anggota Tim</h3>
                    <div class="text-[10px] text-slate-500 flex gap-2">
                        <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-blue-500 rounded-full mr-1"></span> Konten</span>
                        <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-green-500 rounded-full mr-1"></span> Rilis</span>
                        <span class="inline-flex items-center"><span class="w-2.5 h-2.5 bg-purple-500 rounded-full mr-1"></span> Protokol</span>
                    </div>
                </div>
                <div class="relative w-full h-[260px] flex items-center justify-center">
                    <canvas id="stackedTasksChart" class="w-full h-full"></canvas>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-5 flex justify-between items-center">
                    <span>Progress Konten Terbaru</span>
                    <button onclick="router('planner')" class="text-xs font-semibold text-stats-600 hover:text-stats-800 hover:underline">Semua Konten →</button>
                </h3>
                <div class="space-y-4 max-h-[260px] overflow-y-auto pr-1">
                    ${db.contentPlanner.slice(0, 4).map(item => `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 last:border-none last:pb-0 hover:bg-slate-50/50 p-1 rounded transition-all">
                            <div class="flex-1 mr-4 mb-2 sm:mb-0">
                                <p class="font-semibold text-sm text-slate-700">${item.judul}</p>
                                <p class="text-[11px] text-slate-400 mt-1">${item.postType} • Jadwal: ${formatDate(item.jadwal)} • PIC: <span class="font-medium text-slate-600">${item.assignedTo?.split(' ')[0] || '-'}</span></p>
                                <div class="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                                    <div class="bg-stats-500 h-1.5 rounded-full" style="width: ${item.progres}%"></div>
                                </div>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-center shrink-0 ${
                                item.status === 'Posted' ? 'bg-green-100 text-green-700' : 
                                item.status === 'Done' ? 'bg-blue-100 text-blue-700' : 
                                'bg-amber-100 text-amber-700'
                            }">${item.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4">Jadwal Rilis Terdekat</h3>
                <div class="space-y-3">
                    ${db.brsSchedule.slice(0, 3).map(item => `
                        <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl hover:shadow-sm transition-all duration-200">
                            <div>
                                <p class="font-semibold text-xs text-slate-700">${item.judul}</p>
                                <p class="text-[10px] text-slate-400 mt-1.5"><i class="fa-regular fa-calendar mr-1"></i>${formatDate(item.tanggal)}</p>
                            </div>
                            <span class="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg font-semibold shadow-xs">Poster: ${item.pic_poster?.split(' ')[0] || '-'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4">Kegiatan Protokol Mendatang</h3>
                <div class="space-y-3">
                    ${db.protocol.slice(0, 3).map(item => `
                        <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl hover:shadow-sm transition-all duration-200">
                            <div>
                                <p class="font-semibold text-xs text-slate-700">${item.kegiatan}</p>
                                <p class="text-[10px] text-slate-400 mt-1.5"><i class="fa-solid fa-location-dot mr-1"></i>${item.lokasi}</p>
                            </div>
                            <span class="text-[10px] px-2 py-1 rounded-lg font-semibold ${item.level === 'Formal' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}">${item.level}</span>
                        </div>
                    `).join('')}
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
                            backgroundColor: '#0ea5e9',
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
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            padding: 10,
                            titleFont: { size: 12, weight: 'bold' },
                            bodyFont: { size: 11 },
                            callbacks: {
                                label: function (context) {
                                    return `${context.dataset.label}: ${context.raw} tugas`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            grid: { display: false },
                            ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b' }
                        },
                        y: {
                            stacked: true,
                            grid: { color: '#f1f5f9' },
                            beginAtZero: true,
                            ticks: { 
                                stepSize: 1, 
                                font: { size: 10, family: 'Inter' }, 
                                color: '#94a3b8' 
                            }
                        }
                    }
                }
            });
        }
    }, 50);
}

// 2. Content Planner (Kanban Board) View
function renderPlanner(container) {
    const statuses = ['Draft', 'In Progress', 'Done', 'Posted'];
    const statusBg = {
        'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
        'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
        'Done': 'bg-purple-50 text-purple-700 border-purple-200',
        'Posted': 'bg-green-50 text-green-700 border-green-200'
    };
    
    const postTypeIcons = {
        'Carousel': '<i class="fa-solid fa-images text-stats-500"></i>',
        'Reels': '<i class="fa-solid fa-clapperboard text-rose-500"></i>',
        'Single Image': '<i class="fa-regular fa-image text-blue-500"></i>',
        'Video': '<i class="fa-solid fa-video text-violet-500"></i>'
    };

    // Construct Columns
    let kanbanColumnsHtml = statuses.map(status => {
        const cards = db.contentPlanner.filter(c => c.status === status);
        
        let cardsHtml = cards.map(item => {
            const avatarBg = getAvatarBg(item.assignedTo);
            const initials = getPicInitials(item.assignedTo);
            const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
            
            // Build navigation controls for quick state moving
            let nextIndex = statuses.indexOf(status) + 1;
            let prevIndex = statuses.indexOf(status) - 1;
            
            let moveButtons = `
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg p-1">
                    ${prevIndex >= 0 ? `
                        <button onclick="moveKanbanTask(${item.id}, '${statuses[prevIndex]}')" title="Pindahkan ke ${statuses[prevIndex]}" class="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 transition-colors">
                            <i class="fa-solid fa-chevron-left text-[10px]"></i>
                        </button>
                    ` : '<div class="w-6"></div>'}
                    
                    <span class="text-[10px] font-bold text-slate-400 uppercase select-none">Pindahkan</span>
                    
                    ${nextIndex < statuses.length ? `
                        <button onclick="moveKanbanTask(${item.id}, '${statuses[nextIndex]}')" title="Pindahkan ke ${statuses[nextIndex]}" class="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 transition-colors">
                            <i class="fa-solid fa-chevron-right text-[10px]"></i>
                        </button>
                    ` : '<div class="w-6"></div>'}
                </div>
            `;

            return `
                <div class="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 group relative">
                    <div class="flex justify-between items-start mb-2 gap-2">
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${item.jenis === 'Hard Selling' ? 'bg-rose-50 text-rose-700' : 'bg-stats-50 text-stats-700'}">${item.jenis}</span>
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs" title="${item.postType}">${postTypeIcons[item.postType] || ''}</span>
                        </div>
                    </div>

                    <h4 onclick="showDetail('content', ${itemJson})" class="font-bold text-slate-800 text-sm hover:text-stats-600 transition-colors cursor-pointer line-clamp-2" title="${item.judul}">${item.judul}</h4>
                    <p class="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed" title="${item.konsep}">${item.konsep || 'Tidak ada konsep tambahan.'}</p>
                    
                    <!-- Progress Bar -->
                    <div class="mt-4">
                        <div class="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                            <span>Progres</span>
                            <span class="font-bold text-slate-600">${item.progres}%</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1.5">
                            <div class="bg-gradient-to-r from-stats-400 to-stats-600 h-1.5 rounded-full" style="width: ${item.progres}%"></div>
                        </div>
                    </div>

                    <!-- Footer Info -->
                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                            <div class="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shadow-xs ${avatarBg}" title="${item.assignedTo}">${initials}</div>
                            <span class="text-[10px] text-slate-500 font-medium">${item.assignedTo?.split(' ')[0] || 'Unassigned'}</span>
                        </div>
                        <span class="text-[10px] text-red-500 font-semibold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-md"><i class="fa-regular fa-clock"></i> ${formatDate(item.jadwal)}</span>
                    </div>

                    <!-- Actions Panel (Edit/Delete & Move) -->
                    <div class="mt-3.5 pt-3 border-t border-slate-100/70 flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1">
                            <button onclick="openModal('content', ${itemJson})" title="Edit tugas" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-stats-600 hover:bg-slate-50 transition-all">
                                <i class="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                            <button onclick="deleteItem('content', ${item.id})" title="Hapus tugas" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-all">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                        ${moveButtons}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="flex-1 min-w-[270px] bg-slate-50/80 rounded-2xl p-4 border border-slate-200/50 flex flex-col max-h-[700px]">
                <div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full ${
                            status === 'Draft' ? 'bg-slate-400' :
                            status === 'In Progress' ? 'bg-blue-500' :
                            status === 'Done' ? 'bg-purple-500' : 'bg-green-500'
                        }"></span>
                        <h3 class="font-bold text-slate-700 text-sm tracking-wide uppercase">${status}</h3>
                    </div>
                    <span class="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-500 shadow-xs">${cards.length}</span>
                </div>
                
                <div class="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                    ${cardsHtml.length > 0 ? cardsHtml : `
                        <div class="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/40">
                            <i class="fa-solid fa-folder-open text-2xl mb-1 text-slate-300"></i>
                            <p class="text-[11px] font-medium">Kosong</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Content Planner</h2>
                <p class="text-slate-500 mt-1">Gunakan papan Kanban interaktif untuk merencanakan dan melacak produksi konten kreatif.</p>
            </div>
            <button onclick="openModal('content')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-sm">
                <i class="fa-solid fa-plus text-xs"></i> Tambah Rencana Konten
            </button>
        </div>

        <div class="flex gap-5 overflow-x-auto pb-4 select-none pr-1">
            ${kanbanColumnsHtml}
        </div>
    `;
    
    // Quick Status moving handler
    window.moveKanbanTask = function(taskId, newStatus) {
        const item = db.contentPlanner.find(c => c.id === taskId);
        if (!item) return;
        
        // Optimistic UI updates
        item.status = newStatus;
        if (newStatus === 'Posted') item.progres = 100;
        else if (newStatus === 'Draft' && item.progres === 100) item.progres = 30;
        else if (newStatus === 'Done') item.progres = 100;
        
        showToast(`Tugas dipindahkan ke status: ${newStatus}`);
        router('planner');
        
        // Async update to server
        sendDataToServer('update', 'content_planner', item);
    };
}

// 3. Jadwal Rilis (BRS) View
function renderSchedule(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Jadwal Rilis BRS</h2>
                <p class="text-slate-500 mt-1">Monitoring agenda rilis Berita Resmi Statistik (BRS) dan PIC penanggung jawab media sosial.</p>
            </div>
            <button onclick="openModal('schedule')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-sm">
                <i class="fa-solid fa-plus text-xs"></i> Tambah Jadwal BRS
            </button>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left text-slate-600">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-50/70 border-b border-slate-200 font-bold tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Tanggal Rilis</th>
                            <th class="px-6 py-4">Judul Rilis Statistik</th>
                            <th class="px-6 py-4 hidden sm:table-cell">PIC Poster</th>
                            <th class="px-6 py-4 hidden md:table-cell">PIC Infografis / Info</th>
                            <th class="px-6 py-4 hidden lg:table-cell">PIC Dokumentasi</th>
                            <th class="px-6 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${db.brsSchedule.map(item => {
                            const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
                            return `
                                <tr class="hover:bg-slate-50/70 transition-colors cursor-pointer group" onclick="showDetail('schedule', ${itemJson})">
                                    <td class="px-6 py-4 font-bold text-slate-800 whitespace-nowrap"><i class="fa-regular fa-calendar text-slate-400 mr-2"></i>${formatDate(item.tanggal)}</td>
                                    <td class="px-6 py-4"><div class="font-semibold text-slate-700 max-w-sm truncate" title="${item.judul}">${item.judul}</div></td>
                                    <td class="px-6 py-4 hidden sm:table-cell whitespace-nowrap"><span class="px-2 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-semibold">${item.pic_poster?.split(' ')[0] || '-'}</span></td>
                                    <td class="px-6 py-4 hidden md:table-cell whitespace-nowrap"><span class="px-2 py-1 bg-green-50 border border-green-100 text-green-700 rounded-lg text-xs font-semibold">${item.pic_info?.split(' ')[0] || '-'}</span></td>
                                    <td class="px-6 py-4 hidden lg:table-cell whitespace-nowrap"><span class="px-2 py-1 bg-purple-50 border border-purple-100 text-purple-700 rounded-lg text-xs font-semibold">${item.pic_doc?.split(' ')[0] || '-'}</span></td>
                                    <td class="px-6 py-4 text-center whitespace-nowrap" onclick="event.stopPropagation()">
                                        <div class="flex items-center justify-center gap-1.5">
                                            <button onclick="openModal('schedule', ${itemJson})" title="Edit Jadwal" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-stats-600 hover:bg-slate-100 transition-all"><i class="fa-solid fa-pen-to-square"></i></button>
                                            <button onclick="deleteItem('schedule', ${item.id})" title="Hapus Jadwal" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all"><i class="fa-solid fa-trash"></i></button>
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

// 4. Protokol & MC View
function renderProtocol(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Agenda Protokoler & MC</h2>
                <p class="text-slate-500 mt-1">Kelola permohonan pendampingan protokol pimpinan, susunan acara, dan penugasan MC.</p>
            </div>
            <button onclick="openModal('protocol')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-sm">
                <i class="fa-solid fa-plus text-xs"></i> Tambah Protokol Baru
            </button>
        </div>

        <div class="grid grid-cols-1 gap-5 animate-fade-in">
            ${db.protocol.map(item => {
                const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
                return `
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between gap-4" onclick="showDetail('protocol', ${itemJson})">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                item.level === 'Formal' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }">
                                <i class="fa-solid ${item.level === 'Formal' ? 'fa-user-tie' : 'fa-microphone-lines'} text-xl"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-base leading-snug hover:text-stats-600 transition-colors">${item.kegiatan}</h4>
                                <div class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
                                    <p class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i> ${formatDate(item.tanggal)}</p>
                                    <p class="flex items-center gap-1.5"><i class="fa-solid fa-user-clock text-slate-400"></i> Pimpinan: ${item.pimpinan}</p>
                                    <p class="flex items-center gap-1.5"><i class="fa-solid fa-map-pin text-slate-400"></i> Lokasi: ${item.lokasi}</p>
                                    <p class="flex items-center gap-1.5 col-span-full"><i class="fa-solid fa-users text-slate-400"></i> Petugas: <span class="font-semibold text-slate-700">${item.petugas || 'Belum ditugaskan'}</span></p>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 justify-end md:justify-center border-t border-slate-100 md:border-none pt-3 md:pt-0 shrink-0" onclick="event.stopPropagation()">
                            <span class="px-3 py-1 rounded-full text-xs font-bold ${item.level === 'Formal' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">${item.level}</span>
                            <button onclick="openModal('protocol', ${itemJson})" title="Edit Agenda" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-stats-600 hover:bg-slate-100 transition-all"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button onclick="deleteItem('protocol', ${item.id})" title="Hapus Agenda" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// 5. Direktori Tim View
function renderTeam(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Direktori Tim Humas</h2>
                <p class="text-slate-500 mt-1">Daftar anggota tim, jabatan struktural, uraian tugas kehumasan, serta kontak darurat.</p>
            </div>
            <button onclick="openModal('team')" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-sm">
                <i class="fa-solid fa-plus text-xs"></i> Tambah Anggota Tim
            </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            ${db.team.map(member => {
                const taskCount = db.contentPlanner.filter(c => c.assignedTo === member.nama).length;
                const initials = getPicInitials(member.nama);
                const avatarBg = getAvatarBg(member.nama);
                const itemJson = JSON.stringify(member).replace(/"/g, '&quot;');
                
                return `
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group" onclick="showDetail('team', ${itemJson})">
                        <div class="h-24 bg-gradient-to-r from-stats-700 to-stats-900 relative">
                            <!-- User Initials Avatar -->
                            <div class="absolute -bottom-8 left-5 w-16 h-16 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-lg font-black tracking-wider transition-transform duration-300 group-hover:scale-105 ${avatarBg}">
                                ${initials}
                            </div>
                        </div>
                        <div class="pt-10 pb-5 px-5 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 class="font-bold text-slate-800 text-lg group-hover:text-stats-600 transition-colors">${member.nama}</h3>
                                <p class="text-xs font-semibold text-stats-600 mt-0.5">${member.jabatan}</p>
                                <span class="inline-block mt-3 px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] rounded-full uppercase font-bold tracking-wider">${member.bidang}</span>
                                <p class="text-xs text-slate-500 mt-3.5 line-clamp-2 leading-relaxed">${member.tugas || 'Belum ada rincian uraian tugas.'}</p>
                            </div>
                            <div class="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
                                <div>
                                    <p class="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Tugas Konten</p>
                                    <p class="text-lg font-extrabold text-stats-600 mt-0.5">${taskCount}</p>
                                </div>
                                <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                                    <button onclick="openModal('team', ${itemJson})" title="Edit Profil" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-stats-600 hover:bg-slate-50 transition-all"><i class="fa-solid fa-pen-to-square"></i></button>
                                    <button onclick="deleteItem('team', ${member.id})" title="Hapus Profil" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-all"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// 6. Permintaan Layanan (Ticketing) View
function renderTickets(container) {
    const isInternal = currentUser.role === 'internal';
    const isAdminOrKetua = currentUser.role === 'admin' || currentUser.role === 'ketua';

    let filteredTickets = db.tickets;
    if (isInternal) {
        // Filter by current username OR generic Seksi keyword to simulate department scope
        filteredTickets = db.tickets.filter(t => t.pengaju.toLowerCase().includes(currentUser.name.toLowerCase()) || t.pengaju.includes("Seksi"));
    }

    let ticketCards = filteredTickets.map(t => {
        let statusBadge = '';
        if (t.status === 'Pending') {
            statusBadge = `<span class="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold flex items-center gap-1"><i class="fa-regular fa-clock"></i> Pending</span>`;
        } else if (t.status === 'Approved') {
            statusBadge = `<span class="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold flex items-center gap-1"><i class="fa-solid fa-check"></i> Disetujui</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-bold flex items-center gap-1"><i class="fa-solid fa-times"></i> Ditolak</span>`;
        }

        let actions = '';
        if (isAdminOrKetua && t.status === 'Pending') {
            actions = `
                <div class="mt-5 pt-3 border-t border-slate-100 flex gap-2 justify-end">
                    <button onclick="approveTicket(${t.id})" class="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1">
                        <i class="fa-solid fa-check"></i> Setujui & Tugaskan
                    </button>
                    <button onclick="rejectTicket(${t.id})" class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1">
                        <i class="fa-solid fa-times"></i> Tolak
                    </button>
                </div>
            `;
        } else if (t.status === 'Approved' && t.pic) {
            actions = `
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                    <div class="w-6 h-6 rounded-full ${getAvatarBg(t.pic)} flex items-center justify-center font-bold text-[9px]">${getPicInitials(t.pic)}</div>
                    <span>Ditugaskan ke PIC: <strong class="text-slate-700 font-semibold">${t.pic}</strong></span>
                </div>
            `;
        }

        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start gap-3">
                        <span class="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] uppercase font-bold tracking-wider">${t.jenis}</span>
                        ${statusBadge}
                    </div>
                    <h4 class="font-bold text-slate-800 text-base mt-3 leading-snug">${t.judul}</h4>
                    <p class="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5"><i class="fa-regular fa-building text-slate-400"></i> Pengaju: ${t.pengaju} (${t.bidang})</p>
                    <p class="text-xs text-slate-600 mt-2.5 leading-relaxed">${t.detail}</p>
                </div>
                <div>
                    <p class="text-xs text-red-500 mt-4 font-semibold flex items-center gap-1"><i class="fa-regular fa-calendar-xmark"></i> Batas Waktu: ${formatDate(t.deadline)}</p>
                    ${actions}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Permintaan Layanan Humas</h2>
                <p class="text-slate-500 mt-1">Sistem antrean permintaan publikasi data, infografis rilis, peliputan acara, dan video edukasi.</p>
            </div>
            ${isInternal ? `
                <button onclick="openTicketModal()" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-sm">
                    <i class="fa-solid fa-plus text-xs"></i> Buat Pengajuan Layanan
                </button>
            ` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in font-sans">
            ${ticketCards.length > 0 ? ticketCards : `
                <div class="col-span-full bg-white p-12 text-center text-slate-400 rounded-2xl border border-dashed border-slate-300">
                    <i class="fa-solid fa-ticket text-5xl mb-3 text-slate-300"></i>
                    <p class="text-sm font-semibold">Belum ada pengajuan layanan humas.</p>
                    <p class="text-xs text-slate-400 mt-1">Gunakan tombol di pojok kanan atas untuk mengajukan layanan baru.</p>
                </div>
            `}
        </div>
    `;
}

// Global modal window actions for tickets
window.openTicketModal = function () {
    currentModalType = 'ticket_request';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'dynamic-modal';
    modal.innerHTML = `
        <div class="modal-content p-6">
            <div class="flex justify-between items-center mb-5 border-b pb-3">
                <h3 class="text-xl font-bold text-slate-850">Buat Permintaan Layanan Humas</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="saveTicketRequest(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Permintaan / Nama Kegiatan</label>
                    <input type="text" id="req-title" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 focus:ring-1 focus:ring-stats-550/50 transition-all" placeholder="Contoh: Pembuatan Infografis Angka Kemiskinan Kalbar 2026" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jenis Layanan</label>
                    <select id="req-type" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                        <option value="Infografis">Infografis / Rilis Poster</option>
                        <option value="Pembuatan Video">Pembuatan Video Edukasi/Reels</option>
                        <option value="Peliputan">Peliputan / Dokumentasi Acara</option>
                        <option value="Desain Publikasi">Desain Buku / Laporan Publikasi</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Batas Waktu (Deadline)</label>
                    <input type="date" id="req-deadline" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Detail Rincian Deskripsi & Permintaan Khusus</label>
                    <textarea id="req-detail" rows="3.5" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="Tuliskan spesifikasi teknis, data pendukung, ukuran gambar, atau permohonan khusus lainnya..." required></textarea>
                </div>
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button type="submit" class="btn-primary flex-1 py-2.5"><i class="fa-solid fa-paper-plane mr-2"></i> Kirim Permintaan</button>
                    <button type="button" onclick="closeModal()" class="btn-secondary flex-1 py-2.5">Batal</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveTicketRequest = function (event) {
    event.preventDefault();
    const newTicket = {
        id: Date.now(),
        pengaju: currentUser.name || "Seksi Sosial",
        bidang: "Statistik",
        jenis: document.getElementById('req-type').value,
        judul: document.getElementById('req-title').value,
        deadline: document.getElementById('req-deadline').value,
        detail: document.getElementById('req-detail').value,
        status: "Pending",
        pic: ""
    };
    db.tickets.push(newTicket);
    showToast("Permintaan layanan berhasil dikirim!");
    closeModal();
    router('tickets');
};

window.approveTicket = function (id) {
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'assign-pic-modal';
    modal.innerHTML = `
        <div class="modal-content p-6">
            <div class="flex justify-between items-center mb-5 border-b pb-3">
                <h3 class="text-lg font-bold text-slate-800">Setujui & Tugaskan PIC</h3>
                <button onclick="this.closest('.modal').remove()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="confirmApproveTicket(event, ${id})" class="space-y-4">
                <div>
                    <p class="text-xs text-slate-500 mb-3.5 leading-relaxed">Pilih anggota tim humas yang bertugas menyelesaikan permintaan layanan ini. Papan Content Planner akan otomatis membuat kartu tugas baru.</p>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Petugas (PIC)</label>
                    <select id="assign-pic-select" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                        ${db.team.map(m => `<option value="${m.nama}">${m.nama} (${m.jabatan})</option>`).join('')}
                    </select>
                </div>
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button type="submit" class="btn-primary flex-1 py-2.5"><i class="fa-solid fa-check mr-2"></i> Konfirmasi</button>
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn-secondary flex-1 py-2.5">Batal</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

window.confirmApproveTicket = function (event, ticketId) {
    event.preventDefault();
    const ticket = db.tickets.find(t => t.id === ticketId);
    const picName = document.getElementById('assign-pic-select').value;

    if (ticket) {
        ticket.status = 'Approved';
        ticket.pic = picName;

        // Automatically spawn a content planner task connected to this ticket!
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
        showToast(`Tiket disetujui! Tugas baru dibuat di Content Planner untuk ${picName}.`);
        
        // Save back content planner task asynchronously
        sendDataToServer('add', 'content_planner', newContent);
    }

    document.getElementById('assign-pic-modal').remove();
    router('tickets');
};

window.rejectTicket = function (id) {
    if (confirm("Apakah Anda yakin ingin menolak permintaan ini?")) {
        const ticket = db.tickets.find(t => t.id === id);
        if (ticket) {
            ticket.status = 'Rejected';
            showToast("Permintaan ditolak.", "error");
            router('tickets');
        }
    }
};

// 7. Digital Asset Management (DAM) View
function renderAssets(container) {
    const categories = ['Semua', 'Template', 'Logo', 'Foto', 'Dokumen'];
    let activeCategory = 'Semua';

    function drawAssets() {
        let filteredAssets = db.assets;
        if (activeCategory !== 'Semua') {
            filteredAssets = db.assets.filter(a => a.kategori === activeCategory);
        }

        let assetCards = filteredAssets.map(a => `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group">
                <div class="h-32 bg-slate-100 relative overflow-hidden shrink-0">
                    <img src="${a.preview}" alt="${a.nama}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <span class="absolute top-2 left-2 px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white rounded-full text-[9px] font-bold uppercase tracking-wider">${a.kategori}</span>
                </div>
                <div class="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <h4 class="font-bold text-slate-800 text-sm truncate" title="${a.nama}">${a.nama}</h4>
                        <p class="text-[10px] text-slate-400 mt-1">Ukuran: ${a.ukuran} • Oleh: ${a.pengunggah}</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px]">
                        <span class="text-slate-400 font-medium"><i class="fa-regular fa-calendar mr-1"></i>${formatDate(a.tanggal)}</span>
                        <a href="#" onclick="event.preventDefault(); showToast('Mempersiapkan pengunduhan berkas: ${a.nama}')" class="text-stats-600 hover:text-stats-800 font-semibold flex items-center gap-1 uppercase tracking-wider text-[9px] bg-stats-50 px-2 py-0.5 rounded border border-stats-100">
                            <i class="fa-solid fa-download"></i> Unduh
                        </a>
                    </div>
                </div>
            </div>
        `).join('');

        container.querySelector('#assets-grid').innerHTML = assetCards.length > 0 ? assetCards : `
            <div class="col-span-full bg-white p-12 text-center text-slate-450 rounded-2xl border border-dashed border-slate-300">
                <i class="fa-solid fa-folder-open text-5xl mb-3 text-slate-350"></i>
                <p class="text-sm font-semibold">Belum ada aset digital dalam kategori ini.</p>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Bank Desain & Dokumentasi</h2>
                <p class="text-slate-500 mt-1">Penyimpanan berkas aset visual, logo resmi BPS, template feeds, dan dokumentasi visual Humas.</p>
            </div>
            <button onclick="openAssetUploadModal()" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-sm">
                <i class="fa-solid fa-upload text-xs"></i> Unggah Aset Visual
            </button>
        </div>

        <!-- Category Filters -->
        <div class="flex flex-wrap gap-2.5 mb-8 animate-fade-in" id="assets-filter-bar">
            ${categories.map(c => `
                <button onclick="filterAssets('${c}', this)" class="asset-filter-btn px-4.5 py-1.5 rounded-full text-xs font-semibold border ${
                    c === 'Semua' ? 'bg-stats-600 text-white border-stats-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                } transition-all">${c}</button>
            `).join('')}
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in" id="assets-grid">
            <!-- Asset cards will be drawn dynamically -->
        </div>
    `;

    window.filterAssets = function (cat, btn) {
        activeCategory = cat;
        document.querySelectorAll('.asset-filter-btn').forEach(b => {
            b.className = 'asset-filter-btn px-4.5 py-1.5 rounded-full text-xs font-semibold border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-all';
        });
        btn.className = 'asset-filter-btn px-4.5 py-1.5 rounded-full text-xs font-semibold border bg-stats-600 text-white border-stats-600 shadow-sm transition-all';
        drawAssets();
    };

    window.openAssetUploadModal = function () {
        currentModalType = 'asset_upload';
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'dynamic-modal';
        modal.innerHTML = `
            <div class="modal-content p-6">
                <div class="flex justify-between items-center mb-5 border-b pb-3">
                    <h3 class="text-xl font-bold text-slate-800">Unggah Aset Baru</h3>
                    <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
                </div>
                <form onsubmit="saveAssetUpload(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Aset / Judul Berkas</label>
                        <input type="text" id="asset-name" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="Contoh: Logo Hari Statistik Nasional 2026.png" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Aset</label>
                        <select id="asset-cat" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                            <option value="Template">Template Desain</option>
                            <option value="Logo">Logo & Brand Kit</option>
                            <option value="Foto">Foto Dokumentasi</option>
                            <option value="Dokumen">Dokumen (Press Release / PDF)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unggah Berkas</label>
                        <input type="file" id="asset-file" class="w-full border border-dashed border-slate-300 p-6 rounded-xl bg-slate-50 cursor-pointer text-sm focus:outline-none hover:bg-slate-100 transition-all" required>
                    </div>
                    <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                        <button type="submit" class="btn-primary flex-1 py-2.5"><i class="fa-solid fa-upload mr-2"></i> Unggah</button>
                        <button type="button" onclick="closeModal()" class="btn-secondary flex-1 py-2.5">Batal</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.saveAssetUpload = function (event) {
        event.preventDefault();
        const fileInput = document.getElementById('asset-file');
        const fileName = document.getElementById('asset-name').value;
        const fileCat = document.getElementById('asset-cat').value;

        let fileSize = "1.8 MB";
        if (fileInput.files && fileInput.files[0]) {
            const bytes = fileInput.files[0].size;
            fileSize = (bytes / (1024 * 1024)).toFixed(1) + " MB";
        }

        const newAsset = {
            id: Date.now(),
            nama: fileName,
            kategori: fileCat,
            ukuran: fileSize,
            pengunggah: currentUser.name || "Staf Humas",
            tanggal: new Date().toISOString().split('T')[0],
            preview: fileCat === 'Foto' ? 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150' : 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=150'
        };

        db.assets.push(newAsset);
        showToast("Aset digital berhasil diunggah!");
        closeModal();
        drawAssets();
    };

    drawAssets();
}

// 8. Media Monitoring & Sentiment Analysis View
function renderMonitoring(container) {
    const posCount = db.monitoring.filter(m => m.sentimen === 'Positif').length;
    const netCount = db.monitoring.filter(m => m.sentimen === 'Netral').length;
    const negCount = db.monitoring.filter(m => m.sentimen === 'Negatif').length;
    const totalCount = db.monitoring.length;
    const positiveRate = totalCount > 0 ? Math.round((posCount / totalCount) * 100) : 0;

    let newsRows = db.monitoring.map(m => {
        let badge = '';
        if (m.sentimen === 'Positif') {
            badge = `<span class="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold flex items-center justify-center gap-1.5 w-24"><i class="fa-solid fa-face-smile text-[11px]"></i>Positif</span>`;
        } else if (m.sentimen === 'Negatif') {
            badge = `<span class="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs font-bold flex items-center justify-center gap-1.5 w-24"><i class="fa-solid fa-face-frown text-[11px]"></i>Negatif</span>`;
        } else {
            badge = `<span class="px-2.5 py-0.5 bg-slate-50 text-slate-650 border border-slate-200 rounded text-xs font-bold flex items-center justify-center gap-1.5 w-24"><i class="fa-solid fa-face-meh text-[11px]"></i>Netral</span>`;
        }

        return `
            <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-800">${m.media}</td>
                <td class="px-6 py-4">
                    <div class="font-semibold text-slate-700 leading-snug">${m.judul}</div>
                    <div class="text-xs text-slate-450 mt-1">${m.ringkasan}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">${formatDate(m.tanggal)}</td>
                <td class="px-6 py-4 whitespace-nowrap">${badge}</td>
                <td class="px-6 py-4 text-center whitespace-nowrap text-xs font-bold">
                    <a href="${m.url}" target="_blank" class="text-stats-600 hover:text-stats-800 flex items-center justify-center gap-1 uppercase tracking-wider text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Kunjungi
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Media Monitoring</h2>
                <p class="text-slate-500 mt-1">Pantau pemberitaan rilis data BPS Provinsi Kalimantan Barat di berbagai media online lokal.</p>
            </div>
            <button onclick="openAddMonitoringModal()" class="btn-primary flex items-center gap-2 shadow-md py-2.5 px-5 text-sm">
                <i class="fa-solid fa-plus text-xs"></i> Tambah Kliping Berita
            </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 mb-8 animate-fade-in font-sans">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Berita</p><p class="text-2xl font-black text-slate-800 mt-1">${totalCount}</p></div>
                <div class="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl"><i class="fa-solid fa-newspaper"></i></div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sentimen Positif</p><p class="text-2xl font-black text-green-650 mt-1">${posCount}</p></div>
                <div class="w-12 h-12 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-green-600 text-xl"><i class="fa-regular fa-face-smile"></i></div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sentimen Negatif</p><p class="text-2xl font-black text-rose-650 mt-1">${negCount}</p></div>
                <div class="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-650 text-xl"><i class="fa-regular fa-face-frown"></i></div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Indeks Sentimen</p><p class="text-2xl font-black text-stats-600 mt-1">${positiveRate}%</p></div>
                <div class="w-12 h-12 bg-stats-50 border border-stats-100 rounded-xl flex items-center justify-center text-stats-600 text-xl"><i class="fa-solid fa-percent"></i></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left text-slate-650">
                        <thead class="text-xs text-slate-700 uppercase bg-slate-50/70 border-b border-slate-200 font-bold tracking-wider">
                            <tr>
                                <th class="px-6 py-4">Portal Media</th>
                                <th class="px-6 py-4">Kliping Berita & Ringkasan</th>
                                <th class="px-6 py-4">Tanggal</th>
                                <th class="px-6 py-4">Sentimen</th>
                                <th class="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${newsRows.length > 0 ? newsRows : `
                                <tr>
                                    <td colspan="5" class="py-12 text-center text-slate-400">
                                        <i class="fa-solid fa-face-meh text-3xl mb-1 text-slate-350"></i>
                                        <p class="text-xs font-medium">Belum ada kliping berita.</p>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-between min-h-[300px]">
                <h3 class="font-bold text-slate-800 text-base mb-4 w-full border-b pb-2">Analisis Sentimen Media</h3>
                <div class="w-44 h-44 relative flex items-center justify-center">
                    <canvas id="mediaSentimentChart" class="w-full h-full"></canvas>
                </div>
                <div class="mt-6 flex flex-col gap-2 w-full text-xs text-slate-600">
                    <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-green-500 rounded-full"></span> Positif</span><strong>${posCount} (${totalCount ? Math.round((posCount / totalCount) * 100) : 0}%)</strong></div>
                    <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-slate-400 rounded-full"></span> Netral</span><strong>${netCount} (${totalCount ? Math.round((netCount / totalCount) * 100) : 0}%)</strong></div>
                    <div class="flex justify-between items-center"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Negatif</span><strong>${negCount} (${totalCount ? Math.round((negCount / totalCount) * 100) : 0}%)</strong></div>
                </div>
            </div>
        </div>
    `;

    // Initialize Doughnut Chart
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
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            padding: 8,
                            bodyFont: { size: 11, family: 'Inter' }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    }, 50);
}

// Global modal window actions for media monitoring
window.openAddMonitoringModal = function () {
    currentModalType = 'add_monitoring';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'dynamic-modal';
    modal.innerHTML = `
        <div class="modal-content p-6">
            <div class="flex justify-between items-center mb-5 border-b pb-3">
                <h3 class="text-xl font-bold text-slate-800">Tambah Kliping Berita</h3>
                <button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-all"><i class="fa-solid fa-times text-lg"></i></button>
            </div>
            <form onsubmit="saveMonitoringItem(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Portal Media</label>
                    <input type="text" id="mon-media" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="Contoh: Tribun Pontianak" required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Utama Berita</label>
                    <input type="text" id="mon-title" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="Masukkan headline berita..." required>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sentimen Pemberitaan</label>
                    <select id="mon-sentiment" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all">
                        <option value="Positif">Positif</option>
                        <option value="Netral">Netral</option>
                        <option value="Negatif">Negatif</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kliping Ringkasan Berita</label>
                    <textarea id="mon-summary" rows="3" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="Tuliskan intisari kutipan berita secara ringkas..." required></textarea>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tautan URL Berita Resmi</label>
                    <input type="url" id="mon-url" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-stats-550 transition-all" placeholder="https://pontianak.tribunnews.com/..." required>
                </div>
                <div class="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button type="submit" class="btn-primary flex-1 py-2.5"><i class="fa-solid fa-save mr-2"></i> Simpan Kliping</button>
                    <button type="button" onclick="closeModal()" class="btn-secondary flex-1 py-2.5">Batal</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveMonitoringItem = function (event) {
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
    db.monitoring.push(newMon);
    showToast("Kliping berita berhasil ditambahkan!");
    closeModal();
    router('monitoring');
};
