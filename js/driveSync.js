// Google Drive Integration & Auth Handler for SIM Humas BPS Kalbar
(function () {
    let cachedAccessToken = null;
    let driveUser = null;
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
        if (firebaseAuthInstance) return firebaseAuthInstance;
        try {
            const resp = await fetch('/firebase-applet-config.json');
            if (!resp.ok) return null;
            const config = await resp.json();

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

            return firebaseAuthInstance;
        } catch (e) {
            console.warn('[Drive Auth] Firebase init error:', e);
            return null;
        }
    }

    async function requestGoogleDriveToken(forcePopup = false) {
        if (!forcePopup && cachedAccessToken) return cachedAccessToken;

        const auth = await initFirebase();
        if (!auth) {
            throw new Error('Konfigurasi Google Drive OAuth belum siap.');
        }

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

            const data = await response.json();
            if (!data.success) {
                if (data.isAuthError || (data.error && data.error.includes('401'))) {
                    cachedAccessToken = null;
                    try { localStorage.removeItem('bps_google_drive_access_token'); } catch (_) {}
                }
                throw new Error(data.error || 'Sinkronisasi ke Google Drive gagal.');
            }

            return data;
        }
    };
})();
