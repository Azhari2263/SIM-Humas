// Authentication and Role-Based Access Control (RBAC) System
let currentUser = JSON.parse(localStorage.getItem('sim_humas_user')) || null;

function checkAuth() {
    if (!currentUser) {
        document.getElementById('app-layout').classList.add('hidden');
        document.getElementById('login-layout').classList.remove('hidden');
        renderLoginScreen();
        // Fetch database (including users) in the background so that they can log in
        if (typeof fetchDataFromSheets === 'function') {
            fetchDataFromSheets(true);
        }
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
                        <input type="text" id="login-username" class="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-slate-500 transition-all font-medium" placeholder="Masukkan username Anda..." required>
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-indigo-250 mb-1.5 uppercase tracking-wider">Kata Sandi</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                            <i class="fa-solid fa-lock"></i>
                        </span>
                        <input type="password" id="login-password" class="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-slate-500 transition-all font-medium" placeholder="••••••••" required>
                    </div>
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-indigo-650 hover:from-indigo-400 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-500/10 hover:shadow-indigo-550/30 transform active:scale-[0.98]">
                    Masuk ke Sistem
                </button>
            </form>
        </div>
    `;
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showToast('Username dan password harus diisi!', 'error');
        return;
    }
    
    const lowerUsername = username.toLowerCase();
    const user = db.users.find(u => u.username && u.username.toLowerCase() === lowerUsername);
    
    if (!user) {
        showToast('Username tidak terdaftar!', 'error');
        return;
    }
    
    const expectedPassword = user.password || 'password';
    if (password !== expectedPassword) {
        showToast('Kata sandi salah!', 'error');
        return;
    }
    
    currentUser = { 
        username: user.username, 
        role: String(user.role || '').toLowerCase().trim(), 
        name: user.nama,
        bidang: user.bidang || '' 
    };
    
    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    showToast('Selamat datang, ' + user.nama + '!');
    
    if (window.logActivity) {
        logActivity('Login', `User ${user.nama} masuk sebagai ${getRoleLabel(user.role)}.`);
    }

    checkAuth();
    if (typeof startRealtimePolling === 'function') {
        startRealtimePolling();
    }
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

    currentUser = { username, role: String(role).toLowerCase().trim(), name };
    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    showToast('Masuk sebagai ' + getRoleLabel(role));
    
    // Log user login to audit trail
    setTimeout(() => {
        if (typeof logActivity === 'function') {
            logActivity('Login', `User ${name} masuk lewat demo login sebagai ${getRoleLabel(role)}.`);
        }
    }, 100);

    checkAuth();
    if (typeof startRealtimePolling === 'function') {
        startRealtimePolling();
    }
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
    if (typeof stopRealtimePolling === 'function') {
        stopRealtimePolling();
    }
    checkAuth();
}

function simulateRole(role) {
    if (!currentUser) return;
    currentUser.role = String(role).toLowerCase().trim();
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

    if (typeof stopRealtimePolling === 'function') {
        stopRealtimePolling();
    }
    if (typeof startRealtimePolling === 'function') {
        startRealtimePolling();
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
