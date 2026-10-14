// Google Drive Integration & Auth Handler for SIM Humas BPS Kalbar
(function () {
    let cachedAccessToken = localStorage.getItem('bps_google_drive_access_token') || null;
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

    async function initFirebase() {
        if (firebaseAuthInstance) return firebaseAuthInstance;
        try {
            const resp = await fetch('/firebase-applet-config.json');
            if (!resp.ok) return null;
            const config = await resp.json();

            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            const { getAuth, GoogleAuthProvider, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

            const app = initializeApp(config);
            firebaseAuthInstance = getAuth(app);
            googleAuthProviderInstance = new GoogleAuthProvider();
            SCOPES.forEach(scope => googleAuthProviderInstance.addScope(scope));

            onAuthStateChanged(firebaseAuthInstance, (user) => {
                if (!user && !isSigningIn) {
                    // Do not wipe cachedAccessToken abruptly to allow seamless automated pipeline runs
                    driveUser = null;
                } else if (user) {
                    driveUser = user;
                }
            });

            return firebaseAuthInstance;
        } catch (e) {
            console.warn('[Drive Auth] Firebase init error:', e);
            return null;
        }
    }

    async function requestGoogleDriveToken() {
        if (cachedAccessToken) return cachedAccessToken;

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
                throw new Error('Gagal mendapatkan Access Token Google Drive.');
            }

            cachedAccessToken = credential.accessToken;
            localStorage.setItem('bps_google_drive_access_token', cachedAccessToken);
            driveUser = result.user;
            return cachedAccessToken;
        } finally {
            isSigningIn = false;
        }
    }

    window.driveSync = {
        getFolderUrl: () => DRIVE_FOLDER_URL,
        getFolderId: () => DRIVE_FOLDER_ID,
        getCachedToken: () => cachedAccessToken || localStorage.getItem('bps_google_drive_access_token'),
        getUser: () => driveUser,

        signInAndGetToken: async () => {
            return await requestGoogleDriveToken();
        },

        ensureToken: async () => {
            const token = cachedAccessToken || localStorage.getItem('bps_google_drive_access_token');
            if (token) return token;
            return await requestGoogleDriveToken();
        },

        syncReportToDrive: async (tokenOverride, year, startMonth, endMonth) => {
            let token = tokenOverride || cachedAccessToken;
            if (!token) {
                token = await requestGoogleDriveToken();
            }

            const response = await fetch('/api/monitoring/sync-drive', {
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

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Sinkronisasi ke Google Drive gagal.');
            }

            return data;
        }
    };
})();
