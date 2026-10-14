/**
 * PWA (Progressive Web App) Manager for SIM Humas BPS Kalbar
 * Handles:
 * - Service Worker Registration & Updates
 * - In-App Install Prompt UI for Android, Chromium, Desktop & iOS
 * - Online / Offline Detection and Notifications
 * - Standalone Mode Detection
 */

let deferredInstallPrompt = null;
let isPWAInstalled = false;
let isIOSDevice = false;

// Standalone mode detection (already running as installed app)
function checkIsStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
}

// iOS Safari detection
function checkIsIOS() {
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) && !window.MSStream;
}

// Initialize PWA features
function initPWA() {
    isPWAInstalled = checkIsStandalone();
    isIOSDevice = checkIsIOS();

    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('[PWA] Service Worker terdaftar dengan scope:', registration.scope);

                    // Check for updates
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New version available
                                    if (typeof showToast === 'function') {
                                        showToast('Versi baru SIM Humas tersedia. Memperbarui cache...', 'info');
                                    }
                                }
                            };
                        }
                    };
                })
                .catch((error) => {
                    console.warn('[PWA] Gagal mendaftarkan Service Worker:', error);
                });
        });
    }

    // 2. Capture 'beforeinstallprompt' event for Android / Chromium / Desktop
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default mini-infobar
        e.preventDefault();
        deferredInstallPrompt = e;
        console.log('[PWA] beforeinstallprompt ditangkap');
        updatePWAInstallUI();
    });

    // 3. App Installed event
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Aplikasi berhasil diinstal!');
        isPWAInstalled = true;
        deferredInstallPrompt = null;
        updatePWAInstallUI();
        if (typeof showToast === 'function') {
            showToast('Selamat! SIM Humas BPS Kalbar berhasil terpasang di perangkat Anda 🎉', 'success');
        }
    });

    // 4. Online / Offline listeners
    window.addEventListener('online', handleNetworkOnline);
    window.addEventListener('offline', handleNetworkOffline);

    // Initial check of network
    if (!navigator.onLine) {
        handleNetworkOffline();
    }

    // Update UI initial state
    updatePWAInstallUI();
}

/**
 * Update visibility of install buttons across UI
 */
function updatePWAInstallUI() {
    const isStandalone = checkIsStandalone() || isPWAInstalled;

    // Elements
    const headerBtn = document.getElementById('pwa-install-header-btn');
    const mobileSidebarBtn = document.getElementById('pwa-install-mobile-sidebar-btn');
    const desktopSidebarBtn = document.getElementById('pwa-install-desktop-sidebar-btn');
    const loginInstallBtn = document.getElementById('pwa-install-login-btn');

    if (isStandalone) {
        // Already installed and running as standalone app
        if (headerBtn) headerBtn.classList.add('hidden');
        if (mobileSidebarBtn) mobileSidebarBtn.classList.add('hidden');
        if (desktopSidebarBtn) desktopSidebarBtn.classList.add('hidden');
        if (loginInstallBtn) loginInstallBtn.classList.add('hidden');
        return;
    }

    // If installable via prompt OR is iOS device, reveal the install buttons!
    const shouldShow = !!deferredInstallPrompt || isIOSDevice || true;

    if (shouldShow) {
        if (headerBtn) headerBtn.classList.remove('hidden');
        if (mobileSidebarBtn) mobileSidebarBtn.classList.remove('hidden');
        if (desktopSidebarBtn) desktopSidebarBtn.classList.remove('hidden');
        if (loginInstallBtn) loginInstallBtn.classList.remove('hidden');
    }
}

/**
 * Trigger install when user clicks "Instal Aplikasi" button
 */
async function triggerPWAInstall() {
    if (checkIsStandalone()) {
        if (typeof showToast === 'function') {
            showToast('Aplikasi sudah terpasang dan sedang berjalan dalam mode mandiri (App).', 'info');
        }
        return;
    }

    // Flow A: Native prompt available (Android Chrome, Edge, Desktop Chrome)
    if (deferredInstallPrompt) {
        try {
            deferredInstallPrompt.prompt();
            const choiceResult = await deferredInstallPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] Pengguna menyetujui instalasi PWA');
                isPWAInstalled = true;
                deferredInstallPrompt = null;
                updatePWAInstallUI();
                if (typeof showToast === 'function') {
                    showToast('Menginstal SIM Humas BPS Kalbar...', 'success');
                }
            } else {
                console.log('[PWA] Pengguna membatalkan prompt instalasi');
            }
        } catch (err) {
            console.error('[PWA] Kesalahan saat prompt instalasi:', err);
        }
        return;
    }

    // Flow B: iOS Safari (WebKit does not support beforeinstallprompt)
    if (checkIsIOS()) {
        showIOSInstallModal();
        return;
    }

    // Flow C: Desktop or Android browser where prompt hasn't fired yet or was already dismissed
    showGenericInstallModal();
}

/**
 * Show iOS Safari Add to Home Screen Instructions Modal
 */
function showIOSInstallModal() {
    const modal = document.getElementById('pwa-ios-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeIOSInstallModal() {
    const modal = document.getElementById('pwa-ios-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Show Generic Instructions Modal for desktop/Android browsers
 */
function showGenericInstallModal() {
    const modal = document.getElementById('pwa-generic-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeGenericInstallModal() {
    const modal = document.getElementById('pwa-generic-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Network Connectivity Handlers
 */
function handleNetworkOffline() {
    const banner = document.getElementById('offline-banner');
    if (banner) {
        banner.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
        showToast('Anda sedang offline. Data SIM Humas tetap dapat diakses dari cache.', 'warning');
    }
}

function handleNetworkOnline() {
    const banner = document.getElementById('offline-banner');
    if (banner) {
        banner.classList.add('hidden');
    }
    if (typeof showToast === 'function') {
        showToast('Koneksi internet kembali aktif. Menyinkronkan data...', 'success');
    }
    // Re-sync with server if available
    if (typeof fetchDataFromSheets === 'function') {
        fetchDataFromSheets(true);
    }
}

// Expose globally
window.triggerPWAInstall = triggerPWAInstall;
window.showIOSInstallModal = showIOSInstallModal;
window.closeIOSInstallModal = closeIOSInstallModal;
window.closeGenericInstallModal = closeGenericInstallModal;
window.updatePWAInstallUI = updatePWAInstallUI;

// Initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    initPWA();
});
