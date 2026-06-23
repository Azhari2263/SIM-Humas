// Authentication and Role-Based Access Control (RBAC) System
let currentUser = JSON.parse(localStorage.getItem('sim_humas_user')) || null;

function checkAuth() {
    if (!currentUser) {
        document.getElementById('app-layout').classList.add('hidden');
        document.getElementById('login-layout').classList.remove('hidden');
        renderLoginScreen();
    } else {
        document.getElementById('login-layout').classList.add('hidden');
        document.getElementById('app-layout').classList.remove('hidden');
        updateUserProfileUI();
        fetchDataFromSheets();
    }
}

function renderLoginScreen() {
    const loginLayout = document.getElementById('login-layout');
    loginLayout.className = "min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 font-sans p-4 relative overflow-hidden";
    
    // Floating background blur elements
    loginLayout.innerHTML = `
        <div class="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s"></div>

        <div class="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl text-white relative z-10 transform transition-all duration-300 hover:scale-[1.01]">
            <div class="text-center mb-6">
                <div class="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-indigo-500/20 transform rotate-3 hover:rotate-12 transition-transform duration-300">
                    <i class="fa-solid fa-chart-pie"></i>
                </div>
                <h2 class="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-white">SIM HUMAS</h2>
                <p class="text-[10px] text-indigo-300 font-bold tracking-widest uppercase mt-1">Sistem Protokoler & Humas Terintegrasi</p>
                <p class="text-[8px] text-slate-450 uppercase tracking-widest mt-0.5">BPS Provinsi Kalimantan Barat</p>
            </div>
            
            <form onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-[10px] font-bold text-indigo-250 mb-1.5 uppercase tracking-wider">Nama Pengguna</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                            <i class="fa-regular fa-user"></i>
                        </span>
                        <input type="text" id="login-username" class="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-slate-500 transition-all font-medium" placeholder="Username (admin / kepala / koordinator / tim / pemohon)..." value="admin" required>
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-indigo-250 mb-1.5 uppercase tracking-wider">Kata Sandi</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                            <i class="fa-solid fa-lock"></i>
                        </span>
                        <input type="password" id="login-password" class="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-slate-500 transition-all font-medium" placeholder="••••••••" value="password" required>
                    </div>
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-indigo-650 hover:from-indigo-400 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-500/10 hover:shadow-indigo-550/30 transform active:scale-[0.98]">
                    Masuk ke Sistem
                </button>
            </form>
            
            <div class="mt-6 border-t border-slate-800/60 pt-4">
                <p class="text-center text-[9px] text-indigo-250 mb-3 font-bold tracking-wider uppercase">Pilih Peran Demo untuk Uji Coba:</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="quickLogin('admin')" class="py-1.5 px-2 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl font-bold transition-all text-white text-[9px] flex flex-col items-center justify-center gap-0.5">
                        <i class="fa-solid fa-user-shield text-indigo-400 text-sm"></i> Super Admin
                    </button>
                    <button onclick="quickLogin('kepala')" class="py-1.5 px-2 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl font-bold transition-all text-white text-[9px] flex flex-col items-center justify-center gap-0.5">
                        <i class="fa-solid fa-user-tie text-indigo-400 text-sm"></i> Kepala BPS
                    </button>
                    <button onclick="quickLogin('koordinator')" class="py-1.5 px-2 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl font-bold transition-all text-white text-[9px] flex flex-col items-center justify-center gap-0.5">
                        <i class="fa-solid fa-people-roof text-indigo-400 text-sm"></i> Koordinator
                    </button>
                    <button onclick="quickLogin('tim')" class="py-1.5 px-2 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl font-bold transition-all text-white text-[9px] flex flex-col items-center justify-center gap-0.5">
                        <i class="fa-solid fa-users text-indigo-400 text-sm"></i> Tim Humas
                    </button>
                    <button onclick="quickLogin('pemohon')" class="col-span-2 py-1.5 px-2 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl font-bold transition-all text-white text-[9px] flex flex-row items-center justify-center gap-2">
                        <i class="fa-solid fa-file-invoice text-indigo-400 text-sm"></i> Pegawai / Pemohon Layanan
                    </button>
                </div>
            </div>
        </div>
    `;
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    let role = 'tim';
    let name = 'Staf Humas';
    
    const lowerUsername = username.toLowerCase();
    if (lowerUsername === 'admin') { 
        role = 'admin'; 
        name = 'Super Admin'; 
    } else if (lowerUsername === 'kepala') { 
        role = 'kepala'; 
        name = 'Kepala BPS Kalbar'; 
    } else if (lowerUsername === 'koordinator' || lowerUsername === 'azhari') { 
        role = 'koordinator'; 
        name = 'Azhari (Koordinator)'; 
    } else if (lowerUsername === 'tim' || lowerUsername === 'rian' || lowerUsername === 'siska' || lowerUsername === 'dian') { 
        role = 'tim'; 
        name = lowerUsername.charAt(0).toUpperCase() + lowerUsername.slice(1); 
    } else { 
        role = 'pemohon'; 
        name = username.charAt(0).toUpperCase() + username.slice(1); 
    }

    currentUser = { username, role, name };
    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    showToast('Selamat datang, ' + name + '!');
    
    // Log user log in to audit trail
    if (window.logActivity) {
        logActivity('Login', `User ${name} masuk sebagai ${getRoleLabel(role)}.`);
    }

    checkAuth();
}

function quickLogin(role) {
    let username = 'tim';
    let name = 'Staf Humas';
    if (role === 'admin') { 
        username = 'admin'; 
        name = 'Super Admin'; 
    } else if (role === 'kepala') { 
        username = 'kepala'; 
        name = 'Kepala BPS Kalbar'; 
    } else if (role === 'koordinator') { 
        username = 'koordinator'; 
        name = 'Azhari (Koordinator)'; 
    } else if (role === 'pemohon') { 
        username = 'pemohon'; 
        name = 'User Bidang'; 
    }

    currentUser = { username, role, name };
    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    showToast('Masuk sebagai ' + getRoleLabel(role));
    
    // Log user login to audit trail
    setTimeout(() => {
        if (typeof logActivity === 'function') {
            logActivity('Login', `User ${name} masuk lewat demo login sebagai ${getRoleLabel(role)}.`);
        }
    }, 100);

    checkAuth();
}

function handleLogout() {
    if (currentUser) {
        if (typeof logActivity === 'function') {
            logActivity('Logout', `User ${currentUser.name} keluar dari sistem.`);
        }
    }
    currentUser = null;
    localStorage.removeItem('sim_humas_user');
    if (window.chartInstance) {
        window.chartInstance.destroy();
        window.chartInstance = null;
    }
    if (window.sentimentChartInstance) {
        window.sentimentChartInstance.destroy();
        window.sentimentChartInstance = null;
    }
    showToast('Anda telah keluar dari sistem.');
    checkAuth();
}

function simulateRole(role) {
    if (!currentUser) return;
    currentUser.role = role;
    if (role === 'admin') currentUser.name = 'Super Admin';
    else if (role === 'kepala') currentUser.name = 'Kepala BPS Kalbar';
    else if (role === 'koordinator') currentUser.name = 'Azhari (Koordinator)';
    else if (role === 'tim') currentUser.name = 'Staf Humas';
    else if (role === 'pemohon') currentUser.name = 'User Bidang';

    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    updateUserProfileUI();
    showToast('Peran disimulasikan ke: ' + getRoleLabel(role));
    
    if (typeof logActivity === 'function') {
        logActivity('Simulasi Role', `Mengubah peran aktif menjadi ${getRoleLabel(role)}.`);
    }

    router(currentState);
}

function updateUserProfileUI() {
    if (!currentUser) return;

    // Display Name & Role
    const fields = [
        { id: 'desktop-username-display', text: currentUser.name },
        { id: 'desktop-role-display', text: getRoleLabel(currentUser.role) },
        { id: 'desktop-avatar', text: currentUser.name.charAt(0) },
        { id: 'mobile-username-display', text: currentUser.name },
        { id: 'mobile-role-display', text: getRoleLabel(currentUser.role) },
        { id: 'mobile-avatar', text: currentUser.name.charAt(0) }
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) {
            el.textContent = f.text;
        }
    });

    // Update sidebar buttons visibility based on role
    updateSidebarVisibility();
}

function getRoleLabel(role) {
    switch (role) {
        case 'admin': return 'Administrator Sistem';
        case 'kepala': return 'Kepala BPS';
        case 'koordinator': return 'Ketua Tim Humas';
        case 'tim': return 'Tim Humas';
        case 'pemohon': return 'Pegawai/Pemohon';
        default: return role;
    }
}

function updateSidebarVisibility() {
    if (!currentUser) return;
    const userRole = currentUser.role;

    const buttons = document.querySelectorAll('[data-roles]');
    buttons.forEach(btn => {
        const allowedRoles = btn.getAttribute('data-roles').split(',');
        if (allowedRoles.includes(userRole)) {
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
        }
    });
}
