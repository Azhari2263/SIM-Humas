const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzqG9cQMjnpv-bOyifs4kfdpPYdEB5A5a7lw64Yod7GtfFKN4kcwN3BhYyeTQ90n4p7/exec';

// Global database state (Real-Time Data from Google Sheets)
let db = {
    contentPlanner: [],
    brsSchedule: [],
    protocol: [],
    team: [],
    tickets: [],
    assets: [],
    monitoring: []
};

let isLoading = false;
let isError = false;
let errorMessage = '';

// Fetch data from Google Sheets API
async function fetchDataFromSheets() {
    if (isLoading) return;
    isLoading = true;
    isError = false;
    errorMessage = '';

    // Render loading state in the active view if applicable
    updateLoadingStateUI(true);

    try {
        const response = await fetch(GOOGLE_SHEETS_API_URL);
        if (!response.ok) throw new Error('Gagal mengambil data dari server database (HTTP ' + response.status + ')');

        const data = await response.json();
        
        // Map database collections
        db.contentPlanner = data.contentPlanner || [];
        db.brsSchedule = data.brsSchedule || [];
        db.protocol = data.protocol || [];
        db.team = data.team || [];
        db.tickets = data.tickets || [];
        db.assets = data.assets || [];
        db.monitoring = data.monitoring || [];

        // Check if lists need sorting or parsing
        // Parse numeric/date properties safely if needed
        db.contentPlanner.forEach(item => {
            if (item.id) item.id = Number(item.id);
            if (item.progres) item.progres = Number(item.progres);
        });
        db.brsSchedule.forEach(item => {
            if (item.id) item.id = Number(item.id);
        });
        db.protocol.forEach(item => {
            if (item.id) item.id = Number(item.id);
        });
        db.team.forEach(item => {
            if (item.id) item.id = Number(item.id);
        });
        db.tickets.forEach(item => {
            if (item.id) item.id = Number(item.id);
        });
        db.assets.forEach(item => {
            if (item.id) item.id = Number(item.id);
        });
        db.monitoring.forEach(item => {
            if (item.id) item.id = Number(item.id);
        });

        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const lastSyncEl = document.getElementById('last-sync-date');
        if (lastSyncEl) lastSyncEl.textContent = dateStr;
        
        const mobileSyncEl = document.getElementById('mobile-last-sync-date');
        if (mobileSyncEl) mobileSyncEl.textContent = dateStr;

        showToast('Data berhasil disinkronkan dari Google Sheets!');
        router(currentState);

    } catch (error) {
        console.error('Error fetching data:', error);
        isError = true;
        errorMessage = error.message;
        showToast('Gagal sinkron data: ' + error.message, 'error');
        router(currentState); // Render view which will show error state
    } finally {
        isLoading = false;
        updateLoadingStateUI(false);
    }
}

// Send local changes back to the GAS backend
async function sendDataToServer(action, sheetName, item) {
    try {
        const payload = {
            action: action,
            sheet: sheetName,
            item: item
        };

        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Respon jaringan bermasalah (HTTP ' + response.status + ')');
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Gagal menyimpan perubahan ke server.');

        showToast('Perubahan berhasil disimpan ke database!');
        await fetchDataFromSheets();

    } catch (error) {
        console.error('Sync Error:', error);
        showToast('Gagal menyimpan ke Google Sheets: ' + error.message, 'error');
    }
}

async function syncData() {
    await fetchDataFromSheets();
}

// Update loading skeleton UI on demand
function updateLoadingStateUI(loading) {
    const contentDiv = document.getElementById('app-content');
    if (!contentDiv) return;
    
    if (loading && db.contentPlanner.length === 0 && db.brsSchedule.length === 0) {
        contentDiv.innerHTML = `
            <div class="flex flex-col justify-center items-center h-96 animate-pulse">
                <div class="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-650 animate-spin mb-4"></div>
                <p class="text-sm font-semibold text-slate-500">Menghubungkan ke database Google Sheets...</p>
                <p class="text-xs text-slate-400 mt-1">Mengunduh data riil dan menyinkronkan komponen</p>
            </div>
        `;
    }
}
