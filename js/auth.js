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
    // Set a beautiful animated gradient background for the login screen container if needed
    loginLayout.className = "min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-stats-950 font-sans p-4 relative overflow-hidden";
    
    // Add decorative floating background blur blobs
    loginLayout.innerHTML = `
        <div class="absolute top-1/4 left-1/4 w-72 h-72 bg-stats-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s"></div>

        <div class="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl text-white relative z-10 transform transition-all duration-300 hover:scale-[1.01]">
            <div class="text-center mb-8">
                <div class="w-16 h-16 bg-gradient-to-br from-stats-400 to-stats-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg shadow-stats-500/20 transform rotate-3 hover:rotate-12 transition-transform duration-300">
                    <i class="fa-solid fa-chart-pie"></i>
                </div>
                <h2 class="text-2xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-stats-200 to-white">SIM HUMAS</h2>
                <p class="text-xs text-stats-300 font-medium tracking-widest uppercase mt-1">BPS Provinsi Kalimantan Barat</p>
            </div>
            
            <form onsubmit="handleLogin(event)" class="space-y-5">
                <div>
                    <label class="block text-xs font-semibold text-stats-200 mb-1.5 uppercase tracking-wider">Nama Pengguna</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <i class="fa-regular fa-user"></i>
                        </span>
                        <input type="text" id="login-username" class="w-full pl-10 pr-4 py-2.5 bg-slate-850 border border-slate-700/60 rounded-lg text-sm text-white focus:outline-none focus:border-stats-500 focus:ring-1 focus:ring-stats-500/50 placeholder-slate-500 transition-all" placeholder="Contoh: azhari" value="azhari" required>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-stats-200 mb-1.5 uppercase tracking-wider">Kata Sandi</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <i class="fa-solid fa-lock"></i>
                        </span>
                        <input type="password" id="login-password" class="w-full pl-10 pr-4 py-2.5 bg-slate-850 border border-slate-700/60 rounded-lg text-sm text-white focus:outline-none focus:border-stats-500 focus:ring-1 focus:ring-stats-500/50 placeholder-slate-500 transition-all" placeholder="••••••••" value="password" required>
                    </div>
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-stats-500 to-stats-600 hover:from-stats-400 hover:to-stats-500 text-white font-bold py-2.5 rounded-lg text-sm transition-all duration-300 shadow-lg shadow-stats-500/10 hover:shadow-stats-550/30 transform active:scale-[0.98]">
                    Masuk ke Sistem
                </button>
            </form>
            
            <div class="mt-8 border-t border-slate-800 pt-6">
                <p class="text-center text-xs text-stats-300 mb-4 font-semibold tracking-wide uppercase">Uji Coba Peran Cepat (RBAC):</p>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="quickLogin('admin')" class="py-2.5 px-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-stats-550/40 rounded-xl font-medium transition-all text-white text-[11px] flex flex-col items-center justify-center gap-1">
                        <i class="fa-solid fa-user-shield text-base text-stats-400"></i> Admin / Staf IT
                    </button>
                    <button onclick="quickLogin('ketua')" class="py-2.5 px-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-stats-550/40 rounded-xl font-medium transition-all text-white text-[11px] flex flex-col items-center justify-center gap-1">
                        <i class="fa-solid fa-user-tie text-base text-stats-400"></i> Ketua Tim
                    </button>
                    <button onclick="quickLogin('staf')" class="py-2.5 px-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-stats-550/40 rounded-xl font-medium transition-all text-white text-[11px] flex flex-col items-center justify-center gap-1">
                        <i class="fa-solid fa-users text-base text-stats-400"></i> Staf Humas
                    </button>
                    <button onclick="quickLogin('internal')" class="py-2.5 px-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-stats-550/40 rounded-xl font-medium transition-all text-white text-[11px] flex flex-col items-center justify-center gap-1">
                        <i class="fa-solid fa-building-user text-base text-stats-400"></i> User Bidang
                    </button>
                </div>
            </div>
        </div>
    `;
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    let role = 'staf';
    let name = 'Staf Humas';
    
    const lowerUsername = username.toLowerCase();
    if (lowerUsername === 'admin') { 
        role = 'admin'; 
        name = 'Admin IT'; 
    } else if (lowerUsername === 'azhari' || lowerUsername === 'ketua') { 
        role = 'ketua'; 
        name = 'Azhari'; 
    } else if (lowerUsername === 'rian') { 
        role = 'staf'; 
        name = 'Rian'; 
    } else if (lowerUsername === 'siska') { 
        role = 'staf'; 
        name = 'Siska'; 
    } else if (lowerUsername === 'dian') { 
        role = 'staf'; 
        name = 'Dian'; 
    } else if (lowerUsername === 'internal' || lowerUsername === 'seksi') { 
        role = 'internal'; 
        name = 'Seksi Sosial'; 
    } else {
        role = 'internal';
        name = username;
    }

    currentUser = { username, role, name };
    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    showToast('Selamat datang, ' + name + '!');
    checkAuth();
}

function quickLogin(role) {
    let username = 'staf';
    let name = 'Staf Humas';
    if (role === 'admin') { 
        username = 'admin'; 
        name = 'Admin IT'; 
    } else if (role === 'ketua') { 
        username = 'azhari'; 
        name = 'Azhari'; 
    } else if (role === 'internal') { 
        username = 'seksi_sosial'; 
        name = 'Seksi Sosial'; 
    }

    currentUser = { username, role, name };
    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    showToast('Masuk sebagai ' + name);
    checkAuth();
}

function handleLogout() {
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
    if (role === 'admin') currentUser.name = 'Admin IT';
    else if (role === 'ketua') currentUser.name = 'Azhari';
    else if (role === 'staf') currentUser.name = 'Rian';
    else if (role === 'internal') currentUser.name = 'Seksi Sosial';

    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    updateUserProfileUI();
    showToast('Peran disimulasikan ke: ' + getRoleLabel(role));
    router(currentState);
}

function updateUserProfileUI() {
    if (!currentUser) return;

    // Sync values to select elements
    const selector = document.getElementById('desktop-role-simulator');
    if (selector) selector.value = currentUser.role;
    const mobileSelector = document.getElementById('mobile-role-simulator');
    if (mobileSelector) mobileSelector.value = currentUser.role;

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
        case 'admin': return 'Super Admin';
        case 'ketua': return 'Ketua Tim';
        case 'staf': return 'Staf Humas';
        case 'internal': return 'User Internal';
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
