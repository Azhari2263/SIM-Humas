// Google Drive Integration & Auth Handler for SIM Humas BPS Kalbar
(function () {
    let cachedAccessToken = null;
    let driveUser = null;
    let cachedConfig = null;
    const DRIVE_FOLDER_ID = '1NxW8FdEHG3fTOdSj7zd0EUnaCj81klHs';
    const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}?usp=sharing`;

    const SCOPES = [
        'https://www.googleapis.com/auth/drive.file'
    ];
    window.SCOPES = SCOPES;

    let firebaseAuthInstance = null;
    let googleAuthProviderInstance = null;
    let isSigningIn = false;

    // Bersihkan token lama dari localStorage agar tidak menyimpan token kedaluwarsa
    try {
        localStorage.removeItem('bps_google_drive_access_token');
    } catch (_) {}

    async function initFirebase() {
        if (firebaseAuthInstance && cachedConfig) return { auth: firebaseAuthInstance, config: cachedConfig };
        try {
            const resp = await fetch('/firebase-applet-config.json');
            if (!resp.ok) return null;
            const config = await resp.json();
            cachedConfig = config;

            const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            const { getAuth, GoogleAuthProvider, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

            const app = getApps().length > 0 ? getApp() : initializeApp(config);
            firebaseAuthInstance = getAuth(app);
            googleAuthProviderInstance = new GoogleAuthProvider();
            googleAuthProviderInstance.setCustomParameters({
                prompt: 'select_account'
            });
            SCOPES.forEach(scope => googleAuthProviderInstance.addScope(scope));

            onAuthStateChanged(firebaseAuthInstance, (user) => {
                driveUser = user;
                if (!user) {
                    cachedAccessToken = null;
                }
            });

            return { auth: firebaseAuthInstance, config: cachedConfig };
        } catch (e) {
            console.warn('[Drive Auth] Firebase init error:', e);
            return null;
        }
    }

    // Google Identity Services (GIS) token client fallback for custom deployment domains
    function requestGoogleTokenViaGIS(clientId, scopes) {
        return new Promise((resolve, reject) => {
            const loadGISScript = () => {
                if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                    return Promise.resolve();
                }
                return new Promise((res, rej) => {
                    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
                    if (existing) {
                        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                            res();
                        } else {
                            existing.addEventListener('load', () => res());
                            existing.addEventListener('error', rej);
                        }
                        return;
                    }
                    const s = document.createElement('script');
                    s.src = 'https://accounts.google.com/gsi/client';
                    s.async = true;
                    s.defer = true;
                    s.onload = () => res();
                    s.onerror = (err) => rej(new Error('Gagal memuat Google Identity Services script: ' + err));
                    document.head.appendChild(s);
                });
            };

            loadGISScript().then(() => {
                try {
                    const tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: clientId,
                        scope: scopes.join(' '),
                        callback: (tokenResponse) => {
                            if (tokenResponse && tokenResponse.access_token) {
                                resolve(tokenResponse.access_token);
                            } else if (tokenResponse && tokenResponse.error) {
                                reject(new Error(tokenResponse.error_description || tokenResponse.error));
                            } else {
                                reject(new Error('Gagal mendapatkan token Google Drive via GIS.'));
                            }
                        },
                        error_callback: (error) => {
                            reject(error);
                        }
                    });
                    tokenClient.requestAccessToken({ prompt: 'select_account' });
                } catch (initErr) {
                    reject(initErr);
                }
            }).catch(reject);
        });
    }

    function showUnauthorizedDomainModal() {
        const currentDomain = window.location.hostname || 'sim-humas.vercel.app';
        const projectId = (cachedConfig && cachedConfig.projectId) ? cachedConfig.projectId : 'gen-lang-client-0666390077';
        const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

        let modalEl = document.getElementById('unauthorized-domain-modal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'unauthorized-domain-modal';
            document.body.appendChild(modalEl);
        }

        modalEl.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in';
        modalEl.innerHTML = `
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 relative">
                <button onclick="document.getElementById('unauthorized-domain-modal').classList.add('hidden')" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center">
                    <i class="fa-solid fa-times"></i>
                </button>
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-xl shrink-0">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div>
                        <h3 class="font-extrabold text-base leading-tight">Otorisasi Domain Firebase & Drive</h3>
                        <p class="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">auth/unauthorized-domain</p>
                    </div>
                </div>

                <div class="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl mb-4 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    Domain deployment Anda (<strong class="font-bold underline">${currentDomain}</strong>) belum didaftarkan di daftar <strong>Authorized Domains</strong> Firebase Authentication pada project <strong>${projectId}</strong>.
                </div>

                <div class="space-y-3 text-xs mb-5">
                    <div class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                <i class="fa-solid fa-globe text-indigo-500"></i> Domain yang perlu ditambahkan:
                            </span>
                            <button id="btn-copy-domain" onclick="navigator.clipboard.writeText('${currentDomain}').then(() => { this.innerText = 'Tersalin!'; setTimeout(() => this.innerText = 'Salin', 2000); })" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-650 dark:text-indigo-300 font-bold rounded-lg text-[10px] transition-all">
                                Salin
                            </button>
                        </div>
                        <code class="block font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-bold select-all">
                            ${currentDomain}
                        </code>
                    </div>

                    <div class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span class="font-bold text-slate-800 dark:text-white block mb-2">
                            <i class="fa-solid fa-list-check text-emerald-500 mr-1"></i> Cara Menambahkan (Hanya 1 Menit):
                        </span>
                        <ol class="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            <li>Klik tombol <strong>"Buka Firebase Console"</strong> di bawah.</li>
                            <li>Pada tab <strong>Settings</strong>, temukan bagian <strong>Authorized domains</strong> (Domain yang diizinkan).</li>
                            <li>Klik <strong>Add domain</strong> (Tambahkan domain), lalu tempelkan: <strong class="text-indigo-600 dark:text-indigo-400 font-mono">${currentDomain}</strong>.</li>
                            <li>Klik <strong>Save</strong> (Simpan), lalu kembali ke sini dan klik tombol <strong>"Coba Sinkronkan Lagi"</strong>.</li>
                        </ol>
                    </div>

                    <div class="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label class="font-bold text-slate-800 dark:text-white block mb-1">
                            <i class="fa-solid fa-key text-amber-500 mr-1"></i> Opsi Langsung: Masukkan Access Token Google Drive Manual
                        </label>
                        <p class="text-[10px] text-slate-500 dark:text-slate-400 mb-2">Jika ingin langsung sinkronisasi tanpa membuka Firebase Console:</p>
                        <div class="flex gap-2">
                            <input type="text" id="manual-drive-token-input" placeholder="Tempel Access Token OAuth (ya29....)" class="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono">
                            <button onclick="window.driveSync.applyManualToken()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all whitespace-nowrap">
                                Terapkan & Sinkron
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col sm:flex-row gap-2.5">
                    <a href="${firebaseSettingsUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs text-center transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Firebase Console
                    </a>
                    <button onclick="window.driveSync.retryAfterDomainAuth()" class="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-rotate"></i> Coba Sinkronkan Lagi
                    </button>
                    <button onclick="document.getElementById('unauthorized-domain-modal').classList.add('hidden')" class="py-2.5 px-3 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-bold rounded-xl text-xs transition-all">
                        Tutup
                    </button>
                </div>
            </div>
        `;
    }

    async function requestGoogleDriveToken(forcePopup = false) {
        if (!forcePopup && cachedAccessToken) return cachedAccessToken;

        const initResult = await initFirebase();
        if (!initResult || !initResult.auth) {
            throw new Error('Konfigurasi Google Drive OAuth belum siap.');
        }

        const auth = initResult.auth;
        const config = initResult.config;

        try {
            isSigningIn = true;
            const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
            const result = await signInWithPopup(auth, googleAuthProviderInstance);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (!credential?.accessToken) {
                throw new Error('Gagal mendapatkan Access Token Google Drive dari akun Google.');
            }

            cachedAccessToken = credential.accessToken;
            driveUser = result.user;
            return cachedAccessToken;
        } catch (err) {
            cachedAccessToken = null;
            if (err.code === 'auth/popup-closed-by-user') {
                throw new Error('Jendela login Google ditutup sebelum otorisasi selesai. Silakan coba kembali.');
            }
            if (err.code === 'auth/popup-blocked') {
                throw new Error('Jendela popup Google diblokir browser. Mohon izinkan popup untuk situs ini.');
            }

            // Jika domain deployment belum diotorisasi di Firebase Authentication
            if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('auth/unauthorized-domain'))) {
                console.warn('[Drive Auth] auth/unauthorized-domain terdeteksi pada domain:', window.location.hostname);

                // Coba fallback ke Google Identity Services (GIS)
                if (config && config.oAuthClientId) {
                    try {
                        console.info('[Drive Auth] Mencoba autentikasi fallback via Google Identity Services (GIS)...');
                        const gisToken = await requestGoogleTokenViaGIS(config.oAuthClientId, SCOPES);
                        if (gisToken) {
                            cachedAccessToken = gisToken;
                            console.info('[Drive Auth] Berhasil memperoleh Access Token Google Drive via GIS.');
                            return cachedAccessToken;
                        }
                    } catch (gisErr) {
                        console.warn('[Drive Auth] GIS fallback tidak berhasil:', gisErr.message);
                    }
                }

                // Tampilkan panduan modal perbaikan domain resmi Firebase
                showUnauthorizedDomainModal();
                throw new Error(`Domain ${window.location.hostname || 'sim-humas.vercel.app'} belum diotorisasi di Firebase Console (auth/unauthorized-domain). Silakan tambahkan domain di Firebase Settings.`);
            }

            throw err;
        } finally {
            isSigningIn = false;
        }
    }

    window.driveSync = {
        getFolderUrl: () => DRIVE_FOLDER_URL,
        getFolderId: () => DRIVE_FOLDER_ID,
        getCachedToken: () => cachedAccessToken,
        getUser: () => driveUser,
        clearToken: () => {
            cachedAccessToken = null;
            try { localStorage.removeItem('bps_google_drive_access_token'); } catch (_) {}
        },
        setTokenManual: (token) => {
            if (token && typeof token === 'string' && token.trim()) {
                cachedAccessToken = token.trim();
                return true;
            }
            return false;
        },
        showUnauthorizedDomainModal: () => {
            showUnauthorizedDomainModal();
        },
        applyManualToken: () => {
            const input = document.getElementById('manual-drive-token-input');
            const token = input ? input.value.trim() : '';
            if (!token) {
                if (typeof showToast === 'function') showToast('Silakan masukkan token terlebih dahulu.', 'error');
                return;
            }
            cachedAccessToken = token;
            const modalEl = document.getElementById('unauthorized-domain-modal');
            if (modalEl) modalEl.classList.add('hidden');
            if (typeof showToast === 'function') showToast('Token Google Drive diterapkan! Memulai sinkronisasi...', 'success');
            if (typeof window.syncMonitoringToDriveUI === 'function') {
                window.syncMonitoringToDriveUI();
            }
        },
        retryAfterDomainAuth: () => {
            const modalEl = document.getElementById('unauthorized-domain-modal');
            if (modalEl) modalEl.classList.add('hidden');
            if (typeof window.syncMonitoringToDriveUI === 'function') {
                window.syncMonitoringToDriveUI();
            }
        },

        signInAndGetToken: async (force = false) => {
            return await requestGoogleDriveToken(force);
        },

        ensureToken: async () => {
            if (cachedAccessToken) return cachedAccessToken;
            return await requestGoogleDriveToken(true);
        },

        syncReportToDrive: async (tokenOverride, year, startMonth, endMonth) => {
            let token = tokenOverride || cachedAccessToken;
            if (!token) {
                token = await requestGoogleDriveToken(true);
            }

            let response = await fetch('/api/monitoring/sync-drive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    year: year || 2026,
                    startMonth: startMonth || 1,
                    endMonth: endMonth || 10
                })
            });

            // Jika token kedaluwarsa (HTTP 401 UNAUTHENTICATED), bersihkan cache dan minta popup segar
            if (response.status === 401) {
                console.warn('[Drive Sync] Token expired (401). Requesting fresh Google login...');
                cachedAccessToken = null;
                try { localStorage.removeItem('bps_google_drive_access_token'); } catch (_) {}

                token = await requestGoogleDriveToken(true);
                response = await fetch('/api/monitoring/sync-drive', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        year: year || 2026,
                        startMonth: startMonth || 1,
                        endMonth: endMonth || 10
                    })
                });
            }

            let data = null;
            let responseText = '';
            try {
                responseText = await response.text();
                data = responseText ? JSON.parse(responseText) : null;
            } catch (parseErr) {
                console.error('[Drive Sync Parse Error]:', parseErr, responseText);
            }

            if (!response.ok) {
                const serverMsg = (data && data.error) || (responseText ? responseText.slice(0, 150) : null);
                throw new Error(serverMsg || `Sinkronisasi gagal (HTTP ${response.status})`);
            }

            if (!data || !data.success) {
                if (data && (data.isAuthError || (data.error && data.error.includes('401')))) {
                    cachedAccessToken = null;
                    try { localStorage.removeItem('bps_google_drive_access_token'); } catch (_) {}
                }
                throw new Error((data && data.error) || 'Sinkronisasi ke Google Drive gagal.');
            }

            return data;
        }
    };
})();
