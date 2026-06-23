const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbzqG9cQMjnpv-bOyifs4kfdpPYdEB5A5a7lw64Yod7GtfFKN4kcwN3BhYyeTQ90n4p7/exec';

// Global database state
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

// Mock Data Generators for Fallbacks
function getInitialTickets() {
    return [
        { id: 1, pengaju: "Seksi Statistik Sosial", bidang: "Sosial", jenis: "Infografis", judul: "Infografis Profil Kemiskinan Kalbar 2026", deadline: "2026-06-25", detail: "Membuat infografis ringkas untuk disebarkan ke instagram berdasarkan data rilis kemiskinan terbaru.", status: "Pending", pic: "" },
        { id: 2, pengaju: "Seksi Neraca Wilayah", bidang: "Neraca", jenis: "Pembuatan Video", judul: "Video Edukasi PDRB Kalbar", deadline: "2026-06-29", detail: "Video penjelasan animasi singkat mengenai PDRB Kalbar tahun 2025 untuk masyarakat umum.", status: "Approved", pic: "Rian" },
        { id: 3, pengaju: "Seksi Statistik Distribusi", bidang: "Distribusi", jenis: "Peliputan", judul: "Dokumentasi FKP Regsosek Singkawang", deadline: "2026-06-21", detail: "Melakukan peliputan foto/video kegiatan forum konsultasi publik di Singkawang.", status: "Approved", pic: "Azhari" }
    ];
}

function getInitialAssets() {
    return [
        { id: 1, nama: "Template Feed Instagram BPS Kalbar 2026.psd", kategori: "Template", ukuran: "45.2 MB", pengunggah: "Rian", tanggal: "2026-05-10", preview: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=150" },
        { id: 2, nama: "Logo BPS Vector AI & PNG.zip", kategori: "Logo", ukuran: "12.8 MB", pengunggah: "Rian", tanggal: "2026-05-11", preview: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150" },
        { id: 3, nama: "Foto Pelantikan Kepala BPS Kalbar.jpg", kategori: "Foto", ukuran: "8.4 MB", pengunggah: "Azhari", tanggal: "2026-06-15", preview: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150" },
        { id: 4, nama: "BPS Kalbar Press Kit 2026.pdf", kategori: "Dokumen", ukuran: "3.5 MB", pengunggah: "Siska", tanggal: "2026-06-02", preview: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=150" }
    ];
}

function getInitialMonitoring() {
    return [
        { id: 1, media: "Tribun Pontianak", judul: "BPS Kalbar Catat Inflasi Mei Sebesar 2,8% y-on-y", tanggal: "2026-06-02", sentimen: "Positif", ringkasan: "Kunjungan pers dan publikasi BRS Inflasi Mei di Pontianak dilaporkan secara lengkap dan akurat oleh Tribun Pontianak.", url: "https://pontianak.tribunnews.com" },
        { id: 2, media: "Pontianak Post", judul: "Kenaikan Harga Pangan Picu Inflasi Kalbar Mei 2026", tanggal: "2026-06-03", sentimen: "Netral", ringkasan: "Analisis mengenai kenaikan komoditas pangan utama Kalbar mengutip rilis data BPS Kalimantan Barat.", url: "https://pontianakpost.jawapos.com" },
        { id: 3, media: "Sintang News", judul: "Dampak Regsosek, Pengentasan Kemiskinan Kalbar Dinilai Tepat Sasaran", tanggal: "2026-06-10", sentimen: "Positif", ringkasan: "Dinas Sosial memuji validitas data Regsosek BPS Kalbar dalam penyaluran bantuan sosial.", url: "https://sintangnews.com" },
        { id: 4, media: "Kalbar Today", judul: "Akurasi Data Sensus BPS Kalbar Dipertanyakan Sejumlah Pihak", tanggal: "2026-06-14", sentimen: "Negatif", ringkasan: "Kritik dari akademisi perihal sampling metode pengumpulan data survei ketenagakerjaan di pelosok Kalbar.", url: "https://kalbartoday.com" }
    ];
}

// Populate database with default mockup data (demo mode)
function useDefaultData() {
    db.team = [
        { id: 1, nama: "Azhari", jabatan: "Pranata Humas Ahli Muda", bidang: "Humas & Protokol", tugas: "Mengoordinasikan seluruh publikasi media sosial, hubungan pers, dan protokol kegiatan pimpinan BPS Kalbar.", kontak: "081234567890" },
        { id: 2, nama: "Rian", jabatan: "Pranata Komputer", bidang: "Visual & Konten Creator", tugas: "Merancang desain infografis rilis BRS, template media sosial, dan mengelola bank desain publikasi.", kontak: "081298765432" },
        { id: 3, nama: "Siska", jabatan: "Staf Humas", bidang: "Writer & Editor", tugas: "Menulis press release BRS, caption media sosial, melakukan monitoring pemberitaan media, serta menyusun kliping berita.", kontak: "081345678901" },
        { id: 4, nama: "Dian", jabatan: "Staf Protokol", bidang: "Protokoler & MC", tugas: "Mengatur agenda pimpinan BPS Kalbar, bertindak sebagai MC pada acara formal, dan koordinasi keprotokolan.", kontak: "085234567812" }
    ];

    db.contentPlanner = [
        { id: 101, judul: "Infografis Inflasi Kalbar Mei 2026", konsep: "Visualisasi data inflasi gabungan kota di Kalbar dengan grafik yang estetik.", jenis: "Soft Selling", postType: "Carousel", progres: 85, jadwal: "2026-06-20", status: "In Progress", assignedTo: "Rian" },
        { id: 102, judul: "Video Reels Hari Lahir Pancasila", konsep: "Video kompilasi ucapan selamat dari pimpinan dan staf BPS Kalbar.", jenis: "Trend", postType: "Reels", progres: 100, jadwal: "2026-06-01", status: "Posted", assignedTo: "Rian" },
        { id: 103, judul: "Press Release Pertumbuhan Ekonomi Q1", konsep: "Rangkuman poin penting pertumbuhan ekonomi Kalimantan Barat Triwulan I.", jenis: "Hard Selling", postType: "Single Image", progres: 100, jadwal: "2026-06-05", status: "Posted", assignedTo: "Siska" },
        { id: 104, judul: "Edukasi Pojok Statistik Untan", konsep: "Penjelasan layanan Pojok Statistik di Universitas Tanjungpura.", jenis: "Informasi", postType: "Carousel", progres: 30, jadwal: "2026-06-25", status: "Draft", assignedTo: "Azhari" }
    ];

    db.brsSchedule = [
        { id: 201, judul: "BRS Inflasi & NTP Provinsi Kalbar", tanggal: "2026-07-01", pic_poster: "Rian", pic_info: "Siska", pic_doc: "Azhari", pic_high: "Dian" },
        { id: 202, judul: "BRS Ekspor-Impor & Pariwisata Kalbar", tanggal: "2026-07-03", pic_poster: "Rian", pic_info: "Siska", pic_doc: "Azhari", pic_high: "Dian" }
    ];

    db.protocol = [
        { id: 301, kegiatan: "Audiensi Kepala BPS Kalbar dengan Gubernur Kalbar", pimpinan: "Kepala BPS Prov. Kalbar", level: "Formal", lokasi: "Kantor Gubernur Kalimantan Barat", petugas: "Dian, Azhari", tanggal: "2026-06-18" },
        { id: 302, kegiatan: "Pelepasan Petugas Sakernas 2026", pimpinan: "Kepala BPS Prov. Kalbar", level: "Non-Formal", lokasi: "Aula BPS Kalbar", petugas: "Dian, Rian", tanggal: "2026-06-22" }
    ];

    db.tickets = getInitialTickets();
    db.assets = getInitialAssets();
    db.monitoring = getInitialMonitoring();

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    const lastSyncEl = document.getElementById('last-sync-date');
    if (lastSyncEl) lastSyncEl.textContent = dateStr + ' (Demo)';
    
    const mobileSyncEl = document.getElementById('mobile-last-sync-date');
    if (mobileSyncEl) mobileSyncEl.textContent = dateStr + ' (Demo)';

    router(currentState);
}

// Fetch data from Google Sheets API
async function fetchDataFromSheets() {
    if (isLoading) return;
    isLoading = true;

    try {
        const response = await fetch(GOOGLE_SHEETS_API_URL);
        if (!response.ok) throw new Error('Gagal mengambil data');

        const data = await response.json();

        db.contentPlanner = data.contentPlanner || [];
        db.brsSchedule = data.brsSchedule || [];
        db.protocol = data.protocol || [];
        db.team = data.team || [];
        
        if (!data.tickets) {
            db.tickets = db.tickets.length > 0 ? db.tickets : getInitialTickets();
            db.assets = db.assets.length > 0 ? db.assets : getInitialAssets();
            db.monitoring = db.monitoring.length > 0 ? db.monitoring : getInitialMonitoring();
        } else {
            db.tickets = data.tickets;
            db.assets = data.assets;
            db.monitoring = data.monitoring;
        }

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
        showToast('Gagal sinkron data: ' + error.message, 'error');
        useDefaultData();
    } finally {
        isLoading = false;
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

        const result = await response.json();
        if (!result.success) throw new Error('Gagal sync ke server');

        await fetchDataFromSheets();

    } catch (error) {
        console.error('Sync Error:', error);
        showToast('Gagal menyimpan ke Spreadsheet (Cek Console)', 'error');
    }
}

async function syncData() {
    await fetchDataFromSheets();
}
