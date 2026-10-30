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
    loginLayout.className = "min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 font-sans p-4 sm:p-6 lg:p-8 relative overflow-hidden";
    
    // Ambient glowing orbs
    loginLayout.innerHTML = `
        <div class="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" style="animation-delay: 2s"></div>
        <div class="absolute top-1/3 right-1/3 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style="animation-delay: 3.5s"></div>

        <div class="w-full max-w-4xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl text-white relative z-10 overflow-hidden grid grid-cols-1 md:grid-cols-12 transition-all duration-300">
            
            <!-- Left Column: Animasi Lucu Kehumasan & Maskot "Si Humas" -->
            <div class="md:col-span-5 bg-gradient-to-b from-indigo-950/70 via-slate-900/90 to-indigo-900/50 p-4 sm:p-6 md:p-8 flex flex-col justify-between items-center text-center border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden">
                <!-- Floating decorative press elements -->
                <div class="absolute top-4 left-4 floating-prop-1 opacity-80" title="Kamera Liputan">
                    <svg width="40" height="32" viewBox="0 0 44 36" fill="none" class="drop-shadow-md">
                        <rect x="4" y="8" width="36" height="24" rx="6" fill="#1e293b" stroke="#6366f1" stroke-width="1.5"/>
                        <circle cx="22" cy="20" r="8" fill="#0f172a" stroke="#818cf8" stroke-width="2"/>
                        <circle cx="20" cy="18" r="2.5" fill="#38bdf8"/>
                        <rect x="14" y="4" width="8" height="5" rx="2" fill="#475569"/>
                        <!-- Flash sparkle -->
                        <polygon points="18,1 20,-5 22,1 28,3 22,5 20,11 18,5 12,3" fill="#fbbf24" class="cameraFlash"/>
                    </svg>
                </div>

                <div class="absolute top-6 right-5 floating-prop-2 opacity-85" title="Siaran Pers">
                    <svg width="34" height="40" viewBox="0 0 34 40" fill="none" class="drop-shadow-md">
                        <path d="M 4 4 L 24 4 L 30 10 L 30 36 L 4 36 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
                        <path d="M 24 4 L 24 10 L 30 10 Z" fill="#e2e8f0"/>
                        <rect x="8" y="9" width="12" height="3" rx="1.5" fill="#ef4444"/>
                        <rect x="8" y="16" width="18" height="2" rx="1" fill="#64748b"/>
                        <rect x="8" y="21" width="18" height="2" rx="1" fill="#94a3b8"/>
                        <rect x="8" y="26" width="14" height="2" rx="1" fill="#cbd5e1"/>
                    </svg>
                </div>

                <div class="absolute bottom-6 left-6 floating-prop-3 opacity-75 hidden sm:block" title="Megafon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" class="drop-shadow-md">
                        <path d="M6 13 L12 9 L22 6 L22 22 L12 19 L6 15 Z" fill="#4f46e5"/>
                        <ellipse cx="22" cy="14" rx="2" ry="8" fill="#818cf8"/>
                        <path d="M10 18 L12 25 L9 25 L7 18 Z" fill="#312e81"/>
                        <path d="M25 11 A 5 5 0 0 1 25 17" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" class="animate-pulse"/>
                    </svg>
                </div>

                <!-- Speech Bubble Dinamis Maskot -->
                <div class="w-full max-w-[260px] speech-bubble-anim mb-2 z-10">
                    <div class="bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 text-[11px] font-bold px-3.5 py-2 rounded-2xl shadow-lg border border-indigo-200/50 dark:border-indigo-900/50 relative">
                        <span id="mascot-speech-text">Halo! Selamat datang di SIM Humas BPS Kalbar! 🎙️</span>
                        <div class="w-2.5 h-2.5 bg-white/95 dark:bg-slate-800/95 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b border-indigo-200/50 dark:border-indigo-900/50"></div>
                    </div>
                </div>

                <!-- Stage Maskot SVG Interaktif "Si Humas" -->
                <div id="login-mascot-wrap" class="mascot-container relative my-1 z-10 cursor-pointer select-none" onclick="triggerMascotCheer()">
                    <!-- Glow halo -->
                    <div class="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>

                    <svg viewBox="0 0 200 190" fill="none" class="relative z-10 drop-shadow-xl w-36 h-32 sm:w-44 sm:h-40 md:w-48 md:h-44 object-contain mx-auto">
                        <!-- Shadow / Base -->
                        <ellipse cx="100" cy="180" rx="60" ry="8" fill="rgba(0,0,0,0.35)"/>

                        <!-- Badan Maskot & Rompi Humas (BPS Blue) -->
                        <g id="mascot-body">
                            <!-- Kaos dalam -->
                            <rect x="68" y="115" width="64" height="60" rx="24" fill="#3b82f6"/>
                            <!-- Rompi Pers / Humas -->
                            <path d="M 68 126 L 88 175 L 112 175 L 132 126 Z" fill="#1e1b4b" stroke="#312e81" stroke-width="1.5"/>
                            
                            <!-- Tali Lanyard Kuning & ID Card PERS BPS -->
                            <path d="M 86 120 Q 100 148 100 156 Q 100 148 114 120" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                            <!-- Kartu ID Pers -->
                            <rect x="91" y="152" width="18" height="23" rx="2.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
                            <rect x="91" y="152" width="18" height="5" rx="1" fill="#2563eb"/>
                            <text x="100" y="156" font-size="3.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">PERS</text>
                            <circle cx="100" cy="162" r="2.5" fill="#94a3b8"/>
                            <rect x="94" y="167" width="12" height="1.5" rx="0.5" fill="#cbd5e1"/>
                            <rect x="95" y="170" width="10" height="1.2" rx="0.5" fill="#cbd5e1"/>
                        </g>

                        <!-- Kepala Maskot yang Lucu & Ramah -->
                        <g id="mascot-head">
                            <!-- Kepala bulat menggemaskan -->
                            <circle cx="100" cy="80" r="44" fill="#fde68a" stroke="#f59e0b" stroke-width="2"/>
                            
                            <!-- Rambut & Poni Humas -->
                            <path d="M 66 65 C 66 38, 134 38, 134 65 C 124 55, 112 53, 100 56 C 88 53, 76 55, 66 65 Z" fill="#1e1b4b"/>
                            <!-- Poni kecil lucu -->
                            <path d="M 92 56 Q 100 68 108 56 Z" fill="#1e1b4b"/>

                            <!-- Headset Reporter / Kehumasan -->
                            <path d="M 59 78 A 42 42 0 0 1 141 78" stroke="#0f172a" stroke-width="4" fill="none" stroke-linecap="round"/>
                            <!-- Earpad kiri & kanan -->
                            <rect x="54" y="70" width="8" height="18" rx="4" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
                            <rect x="138" y="70" width="8" height="18" rx="4" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
                            <!-- Mic boom dari headset ke mulut -->
                            <path d="M 140 82 Q 130 102 114 98" stroke="#334155" stroke-width="2" fill="none" stroke-linecap="round"/>
                            <circle cx="113" cy="98" r="3" fill="#0f172a"/>

                            <!-- Alis Ceria -->
                            <path d="M 77 68 Q 85 64 92 68" stroke="#78350f" stroke-width="2" stroke-linecap="round" fill="none"/>
                            <path d="M 108 68 Q 115 64 123 68" stroke="#78350f" stroke-width="2" stroke-linecap="round" fill="none"/>

                            <!-- Mata Kiri -->
                            <ellipse cx="85" cy="78" rx="8" ry="11" fill="#ffffff" stroke="#78350f" stroke-width="1"/>
                            <g class="mascot-eye-pupil" id="pupil-left">
                                <ellipse cx="86" cy="78" rx="5.5" ry="8" fill="#1e1b4b"/>
                                <circle cx="88" cy="74" r="2.2" fill="#ffffff"/>
                                <circle cx="84" cy="81" r="1.1" fill="#ffffff"/>
                            </g>
                            <!-- Kelopak Mata Kiri (Blink) -->
                            <g class="mascot-eye-lid">
                                <path d="M 77 70 Q 85 67 93 70" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round"/>
                            </g>

                            <!-- Mata Kanan -->
                            <ellipse cx="115" cy="78" rx="8" ry="11" fill="#ffffff" stroke="#78350f" stroke-width="1"/>
                            <g class="mascot-eye-pupil mascot-eye-pupil-right" id="pupil-right">
                                <ellipse cx="114" cy="78" rx="5.5" ry="8" fill="#1e1b4b"/>
                                <circle cx="116" cy="74" r="2.2" fill="#ffffff"/>
                                <circle cx="112" cy="81" r="1.1" fill="#ffffff"/>
                            </g>
                            <!-- Kelopak Mata Kanan (Blink) -->
                            <g class="mascot-eye-lid">
                                <path d="M 107 70 Q 115 67 123 70" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round"/>
                            </g>

                            <!-- Pipi Merah Merona (Blush) -->
                            <ellipse cx="74" cy="87" rx="6" ry="3.5" fill="#fb7185" opacity="0.65"/>
                            <ellipse cx="126" cy="87" rx="6" ry="3.5" fill="#fb7185" opacity="0.65"/>

                            <!-- Hidung & Senyum Manis -->
                            <path d="M 99 82 Q 100 84 101 82" stroke="#b45309" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                            <path d="M 94 92 Q 100 101 106 92" stroke="#78350f" stroke-width="2.5" fill="#f43f5e" stroke-linecap="round"/>
                        </g>

                        <!-- Tangan Kiri (Interaktif Tutup Mata / Peekaboo) -->
                        <g class="mascot-hand mascot-hand-left" id="mascot-hand-left">
                            <path d="M 64 124 C 54 130, 48 145, 59 152 C 67 156, 75 146, 72 134 Z" fill="#fde68a" stroke="#f59e0b" stroke-width="1.5"/>
                            <!-- Jari-jari kecil -->
                            <circle cx="56" cy="144" r="3" fill="#fde68a"/>
                            <circle cx="59" cy="149" r="3" fill="#fde68a"/>
                        </g>

                        <!-- Tangan Kanan Memegang Mikrofon Berita (Interaktif) -->
                        <g class="mascot-hand mascot-hand-right" id="mascot-hand-right">
                            <!-- Gagang Mic -->
                            <rect x="136" y="132" width="7" height="26" rx="3" fill="#334155"/>
                            <!-- Kubus Logo BPS / Humas -->
                            <rect x="131" y="120" width="17" height="14" rx="2.5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1"/>
                            <text x="139.5" y="130" font-size="5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">BPS</text>
                            <!-- Kepala Mic / Busa Grille -->
                            <ellipse cx="139.5" cy="113" rx="8" ry="9" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
                            
                            <!-- Gelombang Suara (Soundwaves) Pulsa -->
                            <path d="M 150 106 A 11 11 0 0 1 150 120" stroke="#38bdf8" stroke-width="1.8" fill="none" stroke-linecap="round" class="animate-pulse"/>
                            <path d="M 155 101 A 17 17 0 0 1 155 125" stroke="#818cf8" stroke-width="1.8" fill="none" stroke-linecap="round" class="animate-pulse" style="animation-delay: 0.3s"/>

                            <!-- Paws / Jari Melingkari Mic -->
                            <ellipse cx="138" cy="142" rx="6" ry="6" fill="#fde68a" stroke="#f59e0b" stroke-width="1.2"/>
                        </g>
                    </svg>
                </div>

                <div class="mt-2 text-center z-10">
                    <p class="text-[11px] font-black tracking-wide text-indigo-200">Halo, Sobat Humas!</p>
                    <p class="text-[9px] text-slate-400 mt-0.5 leading-relaxed">Portal Resmi Kehumasan & Keprotokolan<br>BPS Provinsi Kalimantan Barat</p>
                </div>
            </div>

            <!-- Right Column: Form Login Modern, Clean & Database-Bound -->
            <div class="md:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                <div class="mb-6">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider mb-2">
                        <i class="fa-solid fa-shield-halved text-indigo-400"></i> Autentikasi Pengguna
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                        Masuk ke SIM Humas
                    </h2>
                </div>

                <form onsubmit="handleLogin(event)" class="space-y-4">
                    <div>
                        <label for="login-username" class="block text-[10px] font-extrabold text-indigo-200 mb-1.5 uppercase tracking-wider">
                            Username
                        </label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                                <i class="fa-regular fa-user text-xs"></i>
                            </span>
                            <input type="text" id="login-username" autocomplete="username" 
                                class="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 placeholder-slate-500 transition-all font-medium" 
                                placeholder="Contoh: azday" required>
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-1.5">
                            <label for="login-password" class="block text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider">
                                Password
                            </label>
                        </div>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                                <i class="fa-solid fa-lock text-xs"></i>
                            </span>
                            <input type="password" id="login-password" autocomplete="current-password" 
                                class="w-full pl-10 pr-10 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 placeholder-slate-500 transition-all font-medium" 
                                placeholder="••••••••" required>
                            <button type="button" onclick="toggleLoginPassword()" title="Tampilkan / Sembunyikan sandi" 
                                class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors">
                                <i id="login-pwd-toggle-icon" class="fa-regular fa-eye text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" id="login-submit-btn" 
                        class="w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 cursor-pointer">
                        <i class="fa-solid fa-arrow-right-to-bracket text-xs"></i> Masuk ke Sistem
                    </button>
                </form>

                <!-- PWA Mobile Install Banner on Login Screen -->
                <div id="pwa-install-login-container" class="mt-4 pt-3 border-t border-slate-800/80">
                    <button type="button" id="pwa-install-login-btn" onclick="triggerPWAInstall()"
                        class="w-full bg-slate-800/80 hover:bg-slate-700 border border-indigo-500/30 hover:border-indigo-400 text-indigo-200 hover:text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs group">
                        <i class="fa-solid fa-mobile-screen-button text-indigo-400 group-hover:scale-110 transition-transform"></i>
                        <span>Instal di Layar Utama HP (Android / iOS)</span>
                    </button>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-800/90 flex items-center justify-center text-center">
                    <span class="text-[9px] text-indigo-300 font-semibold">
                        BPS Provinsi Kalimantan Barat &copy; 2026
                    </span>
                </div>
            </div>

        </div>
    `;

    // Pasang Event Listeners Interaktif Maskot
    bindMascotInteractions();

    // Perbarui tombol PWA di login
    if (typeof updatePWAInstallUI === 'function') {
        updatePWAInstallUI();
    }
}

/**
 * Interaksi Animasi Maskot saat Form Aktif (Tutup Mata, Peekaboo, dll.)
 */
function bindMascotInteractions() {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const mascotWrap = document.getElementById('login-mascot-wrap');
    const speechText = document.getElementById('mascot-speech-text');

    if (!mascotWrap || !speechText) return;

    if (usernameInput) {
        usernameInput.addEventListener('focus', () => {
            mascotWrap.classList.remove('covering-eyes', 'peeking');
            mascotWrap.classList.add('looking-down');
            speechText.textContent = "Ketik nama pengguna akun resmimu ya! ✍️";
        });
        usernameInput.addEventListener('blur', () => {
            mascotWrap.classList.remove('looking-down');
            speechText.textContent = "Halo! Selamat datang di SIM Humas BPS Kalbar! 🎙️";
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('focus', () => {
            mascotWrap.classList.remove('looking-down');
            if (passwordInput.type === 'password') {
                mascotWrap.classList.add('covering-eyes');
                mascotWrap.classList.remove('peeking');
                speechText.textContent = "Ssst... ini rahasia, aku tutup mata ya! 🙈";
            } else {
                mascotWrap.classList.add('peeking');
                mascotWrap.classList.remove('covering-eyes');
                speechText.textContent = "Eh, aku ngintip dikit ya! 👁️";
            }
        });

        passwordInput.addEventListener('blur', () => {
            mascotWrap.classList.remove('covering-eyes', 'peeking');
            speechText.textContent = "Siap melayani informasi publik! 🎙️";
        });
    }
}

window.triggerMascotCheer = function() {
    const speechText = document.getElementById('mascot-speech-text');
    const mascotWrap = document.getElementById('login-mascot-wrap');
    if (speechText) {
        const cheerMessages = [
            "Humas BPS Kalbar: Terpercaya & Melayani! 🎙️",
            "Semangat mencatat Indonesia! 📊",
            "Yuk masuk untuk kelola rilis dan publikasi! ✨",
            "Kamera siap, data siap, humas siap! 📸",
            "Semua agenda terorganisir rapi di SIM Humas! 📅"
        ];
        const randomMsg = cheerMessages[Math.floor(Math.random() * cheerMessages.length)];
        speechText.textContent = randomMsg;
    }
    if (mascotWrap) {
        mascotWrap.classList.add('animate-bounce');
        setTimeout(() => mascotWrap.classList.remove('animate-bounce'), 1000);
    }
};

window.toggleLoginPassword = function() {
    const pwdInput = document.getElementById('login-password');
    const toggleIcon = document.getElementById('login-pwd-toggle-icon');
    const mascotWrap = document.getElementById('login-mascot-wrap');
    const speechText = document.getElementById('mascot-speech-text');

    if (!pwdInput) return;

    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        if (toggleIcon) {
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        }
        if (mascotWrap) {
            mascotWrap.classList.remove('covering-eyes');
            mascotWrap.classList.add('peeking');
        }
        if (speechText) {
            speechText.textContent = "Eh, sandinya kelihatan! Aku ngintip dikit ya 👁️";
        }
    } else {
        pwdInput.type = 'password';
        if (toggleIcon) {
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
        if (mascotWrap) {
            mascotWrap.classList.remove('peeking');
            mascotWrap.classList.add('covering-eyes');
        }
        if (speechText) {
            speechText.textContent = "Mata ditutup lagi! Rahasia terjaga 🙈";
        }
    }
};

async function handleLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    const username = (usernameInput ? usernameInput.value : '').trim();
    const password = (passwordInput ? passwordInput.value : '');
    
    if (!username || !password) {
        showToast('Nama pengguna dan kata sandi wajib diisi!', 'error');
        return;
    }

    let authenticatedUser = null;
    let serverAttempted = false;

    // 1. Prioritize secure server-side authentication
    try {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        serverAttempted = true;
        const data = await resp.json().catch(() => null);

        if (resp.ok && data && data.success && data.user) {
            authenticatedUser = data.user;
        } else if (resp.status === 401 || (data && data.success === false)) {
            showToast((data && data.error) || 'Nama pengguna atau kata sandi tidak sesuai!', 'error');
            return;
        }
    } catch (netErr) {
        console.warn('[Auth] Server login endpoint unavailable (network/offline):', netErr.message);
    }

    // 2. Offline fallback for PWA when network is completely offline
    if (!authenticatedUser && !serverAttempted) {
        if (!db.users || !Array.isArray(db.users) || db.users.length === 0) {
            if (typeof loadLocalFallbacks === 'function') {
                loadLocalFallbacks();
            }
        }
        const userList = (db.users && Array.isArray(db.users)) ? db.users : [];
        const lowerUsername = username.toLowerCase();
        const user = userList.find(u => u.username && u.username.toLowerCase().trim() === lowerUsername);
        
        if (!user) {
            showToast(`Nama pengguna "${username}" tidak terdaftar!`, 'error');
            return;
        }
        
        const expectedPassword = String(user.password !== undefined && user.password !== null && user.password !== '' ? user.password : 'password');
        if (String(password) !== expectedPassword) {
            showToast('Kata sandi tidak sesuai! Silakan periksa kembali.', 'error');
            return;
        }

        authenticatedUser = {
            username: user.username,
            role: String(user.role || '').toLowerCase().trim(),
            name: user.nama || user.username,
            bidang: user.bidang || ''
        };
    }

    if (!authenticatedUser) {
        showToast('Gagal memverifikasi akun pengguna. Silakan periksa kembali jaringan atau kredensial Anda.', 'error');
        return;
    }

    currentUser = { 
        username: authenticatedUser.username, 
        role: String(authenticatedUser.role || '').toLowerCase().trim(), 
        name: authenticatedUser.name || authenticatedUser.nama || authenticatedUser.username,
        bidang: authenticatedUser.bidang || '' 
    };
    
    localStorage.setItem('sim_humas_user', JSON.stringify(currentUser));
    showToast('Selamat datang, ' + (currentUser.name || currentUser.username) + '!');
    
    if (window.logActivity) {
        logActivity('Login', `User ${currentUser.name} masuk sebagai ${getRoleLabel(currentUser.role)}.`);
    }

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
        case 'kabkot': return 'BPS Kabupaten/Kota';
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
