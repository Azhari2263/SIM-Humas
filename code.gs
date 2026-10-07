function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ambil atau buat lembar data secara dinamis (Self-Healing Schema Terintegrasi)
  const data = {
    contentPlanner: getSheetData(sheet, 'content_planner', ["id", "judul", "konsep", "jenis", "postType", "progres", "jadwal", "status", "assignTo", "media_post", "jam_posting", "tanggal_posting", "jenis_konten"]),
    brsSchedule: getSheetData(sheet, 'brs_schedule', ["id", "judul", "tanggal", "pic_poster", "pic_info", "pic_doc", "pic_high"]),
    protocol: getSheetData(sheet, 'protocol', ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"]),
    team: getSheetData(sheet, 'team', ["id", "nama", "jabatan", "bidang", "tugas", "kontak"]),
    tickets: getSheetData(sheet, 'tickets', ["id", "pengaju", "bidang", "jenis", "judul", "deadline", "detail", "status", "pic"]),
    assets: getSheetData(sheet, 'assets', ["id", "nama", "kategori", "jumlah", "kondisi", "lokasi"]),
    monitoring: getSheetData(sheet, 'monitoring', ["id", "media", "judul", "tanggal", "sentimen", "ringkasan", "url"]),
    users: getSheetData(sheet, 'users', ["id", "username", "password", "nama", "role", "bidang"]),
    rekapRutin: getSheetData(sheet, 'rekap_rutin', ["id", "tanggal", "hari", "rubrikasi", "kegiatan", "petugas", "status"]),
    adHoc: getSheetData(sheet, 'ad_hoc_2026', ["id", "tanggal", "hari", "kegiatan", "jumlah_bertugas", "petugas", "keterangan", "status"]),
    protokoler: getSheetData(sheet, 'protokoler', ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"]),
    mc: getSheetData(sheet, 'mc', ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"]),
    brsRilis: getSheetData(sheet, 'brs_rilis', ["id", "tanggal_rilis", "judul", "pic_poster_info", "pic_doc_ruang", "pic_doc_yt_zoom", "highlight"]),
    hariBesar: getSheetData(sheet, 'hari_besar', ["id", "tanggal", "hari_besar", "data_pendukung", "pembuat_konten", "status"]),
    rekapKegiatan: getSheetData(sheet, 'rekap_kegiatan', ["id", "deadline", "kegiatan", "jenis_kegiatan", "petugas", "progress", "status"]),
    notifications: getSheetData(sheet, 'notifications', ["id", "user_role", "title", "message", "timestamp", "is_read"]),
    auditTrail: getSheetData(sheet, 'audit_trail', ["id", "user", "action", "details", "timestamp"]),
    masterData: getSheetData(sheet, 'master_data', ["id", "kategori", "kode", "nilai", "keterangan"]),
    assignments: getSheetData(sheet, 'assignments', ["id", "petugas", "kegiatan", "peran", "tanggal", "status"]),
    repository: getSheetData(sheet, 'repository', ["id", "nama_dokumen", "kategori", "deskripsi", "tanggal", "pic", "link_cloud", "versi", "status"])
  };
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "No data received"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "Invalid JSON: " + err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Normalisasi nama sheet (mendukung camelCase maupun snake_case)
  const normalizedSheetName = resolveSheetName(data.sheet);
  const headers = getHeadersForSheet(normalizedSheetName);
  
  if (!headers) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "Invalid sheet name: " + data.sheet}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Ambil atau buat sheet secara dinamis
  const ws = getOrCreateSheet(sheet, normalizedSheetName, headers);
  const rows = ws.getDataRange().getValues();
  const currentHeaders = rows[0];
  
  // Cari index kolom 'id'
  const idIndex = currentHeaders.indexOf('id');
  if (idIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "Column 'id' not found in sheet: " + normalizedSheetName}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Normalisasi & Sinkronisasi Content Planner
  if (normalizedSheetName === 'content_planner' && data.item) {
    // PIC tersimpan pada kolom assignTo / assign To (Kolom I)
    const pic = data.item['assign To'] || data.item.assignTo || data.item.assignedTo || data.item.pic || "";
    data.item['assign To'] = pic;
    data.item.assignTo = pic;
    data.item.assignedTo = pic;
    data.item.pic = pic;

    // Media post (mendukung multi media)
    const media = data.item.media_post || data.item.media || "Instagram";
    data.item.media_post = media;
    data.item.media = media;

    // Jenis konten & Post Type
    const jenis = data.item.jenis_konten || data.item.postType || data.item.jenis || "Carousel";
    data.item.jenis_konten = jenis;
    data.item.postType = jenis;

    // Jadwal / Tanggal posting
    const tgl = data.item.tanggal_posting || data.item.jadwal || "";
    data.item.tanggal_posting = tgl;
    data.item.jadwal = tgl;

    // Jam posting
    data.item.jam_posting = data.item.jam_posting || "09:00";

    // Aturan Progres Otomatis Content Planner
    if (data.item.status === 'Posted') {
      data.item.progres = 100;
    } else if (data.item.status === 'Done' && (!data.item.progres || Number(data.item.progres) === 0)) {
      data.item.progres = 90;
    }

    // Pastikan kolom baru (media_post, jam_posting, tanggal_posting, jenis_konten, link_konten) ditambahkan jika belum ada
    const importantCols = ["media_post", "jam_posting", "tanggal_posting", "jenis_konten", "link_konten"];
    importantCols.forEach(col => {
      if (currentHeaders.indexOf(col) === -1) {
        const nextCol = currentHeaders.length + 1;
        ws.getRange(1, nextCol).setValue(col);
        currentHeaders.push(col);
      }
    });
  }

  function getCellValue(item, header) {
    if (!item) return "";
    let val = item[header];
    if (val !== undefined && val !== null && val !== "") return val;
    const h = String(header).trim().toLowerCase();
    if (h === 'assignto' || h === 'assign to' || h === 'assignedto' || h === 'pic') {
      return item['assign To'] || item.assignTo || item.assignedTo || item.pic || "";
    }
    if (h === 'media_post' || h === 'media' || h === 'mediapost') {
      return item.media_post || item.media || "";
    }
    if (h === 'jenis_konten' || h === 'posttype' || h === 'jenis') {
      return item.jenis_konten || item.postType || item.jenis || "";
    }
    if (h === 'tanggal_posting' || h === 'jadwal') {
      return item.tanggal_posting || item.jadwal || "";
    }
    if (h === 'jam_posting') {
      return item.jam_posting || "09:00";
    }
    if (h === 'link_konten' || h === 'link' || h === 'tautan' || h === 'link_cloud' || h === 'tautan_cloud' || h === 'cloud_storage') {
      return item.tautan_cloud || item.link_cloud || item.link_konten || item.link || item.cloud_storage || "";
    }
    if (h === 'kategori') {
      return item.kategori || "";
    }
    if (h === 'jenis_media') {
      return item.jenis_media || item.media || "";
    }
    if (h === 'tautan_konten') {
      return item.tautan_konten || "";
    }
    if (h === 'data_pendukung') {
      return item.data_pendukung || item.link_cloud || "";
    }
    if (h === 'tautan_dokumentasi') {
      return item.tautan_dokumentasi || "";
    }
    if (h === 'keterangan') {
      return item.keterangan || "";
    }
    if (h === 'topik') {
      return item.topik || "";
    }
    if (h === 'jenis_berita') {
      return item.jenis_berita || "";
    }
    if (h === 'narasumber') {
      return item.narasumber || "";
    }
    if (h === 'hubungkan_content_planner') {
      return item.hubungkan_content_planner ? "Ya" : "Tidak";
    }
    if (h === 'hubungkan_kalender') {
      return item.hubungkan_kalender !== false ? "Ya" : "Tidak";
    }
    return val !== undefined && val !== null ? val : "";
  }

  if (data.action === 'add') {
    if (!data.item) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: "No item data to add"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Auto-generate ID jika belum ada
    if (!data.item.id) {
      data.item.id = new Date().getTime();
    }
    
    // Petakan data objek sesuai dengan susunan header kolom
    const rowData = currentHeaders.map(header => getCellValue(data.item, header));
    ws.appendRow(rowData);
    return ContentService.createTextOutput(JSON.stringify({success: true, item: data.item}))
      .setMimeType(ContentService.MimeType.JSON);
    
  } else if (data.action === 'update') {
    if (!data.item || data.item.id === undefined) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: "Item ID required for update"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const idToUpdate = String(data.item.id);
    let updated = false;
    
    // Cari baris yang cocok berdasarkan ID
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][idIndex]) === idToUpdate) {
        const rowIndex = i + 1;
        const rowData = currentHeaders.map(header => {
          const val = getCellValue(data.item, header);
          return val !== undefined && val !== null ? val : rows[i][currentHeaders.indexOf(header)];
        });
        ws.getRange(rowIndex, 1, 1, currentHeaders.length).setValues([rowData]);
        updated = true;
        break;
      }
    }
    if (!updated) {
      // Jika baris tidak ditemukan, tambahkan sebagai baris baru
      const rowData = currentHeaders.map(header => getCellValue(data.item, header));
      ws.appendRow(rowData);
    }
    return ContentService.createTextOutput(JSON.stringify({success: true, item: data.item}))
      .setMimeType(ContentService.MimeType.JSON);
    
  } else if (data.action === 'delete') {
    if (!data.item || data.item.id === undefined) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: "Item ID required for delete"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const idToDelete = String(data.item.id);
    let deleted = false;
    
    // Cari dan hapus baris dari bawah ke atas agar tidak mengganggu indeks baris berikutnya
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][idIndex]) === idToDelete) {
        ws.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({success: true, deleted: deleted}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: false, error: "Unknown action: " + data.action}))
    .setMimeType(ContentService.MimeType.JSON);
}

// Mengambil data sheet atau membuatnya jika belum ada
function getSheetData(sheet, sheetName, defaultHeaders) {
  const ws = getOrCreateSheet(sheet, sheetName, defaultHeaders);
  let rows = ws.getDataRange().getValues();
  if (!rows || rows.length === 0) return [];
  
  let headers = rows[0];
  
  // Jika sheet users baru dan kosong, tambahkan akun default BPS
  if (sheetName === 'users' && rows.length <= 1) {
    const defaultUsers = [
      [1, "admin", "password", "Super Admin", "admin", "IPDS"],
      [2, "koordinator", "password", "Azhari (Koordinator)", "koordinator", "Humas"],
      [3, "kepala", "password", "Kepala BPS Kalbar", "kepala", "Pimpinan"],
      [4, "tim", "password", "Staf Humas", "tim", "Humas"],
      [5, "pemohon", "password", "User Bidang", "pemohon", "Sosial"],
      [6, "kabkot", "password", "BPS Kab. Kubu Raya", "kabkot", "BPS Kab/Kota"]
    ];
    defaultUsers.forEach(u => ws.appendRow(u));
    rows = ws.getDataRange().getValues();
  }
  
    return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, idx) => {
      let val = row[idx];
      // Format Tanggal jika berupa objek Date agar rapi (YYYY-MM-DD)
      if (val instanceof Date) {
        try {
          val = Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
        } catch(e) {}
      }
      obj[header] = val !== undefined && val !== null ? val : "";
    });

    // Normalisasi Content Planner saat data dibaca
    if (sheetName === 'content_planner' || sheetName === 'contentPlanner') {
      const picVal = obj['assign To'] || obj.assignTo || obj.assignedTo || obj.pic || "";
      obj['assign To'] = picVal;
      obj.assignTo = picVal;
      obj.assignedTo = picVal;
      obj.pic = picVal;

      const mediaVal = obj.media_post || obj.media || "Instagram";
      obj.media_post = mediaVal;
      obj.media = mediaVal;

      const jenisVal = obj.jenis_konten || obj.postType || obj.jenis || "Carousel";
      obj.jenis_konten = jenisVal;
      obj.postType = jenisVal;

      const tglVal = obj.tanggal_posting || obj.jadwal || "";
      obj.tanggal_posting = tglVal;
      obj.jadwal = tglVal;

      obj.jam_posting = obj.jam_posting || "09:00";

      if (obj.status === 'Posted') {
        obj.progres = 100;
      } else if (obj.status === 'Done' && (!obj.progres || Number(obj.progres) === 0)) {
        obj.progres = 90;
      }
    }

    return obj;
  });
}

// Membantu mengambil atau membuat sheet dengan header default
function getOrCreateSheet(sheet, name, headers) {
  let ws = sheet.getSheetByName(name);
  if (!ws) {
    ws = sheet.insertSheet(name);
    ws.appendRow(headers);
  } else {
    // Jika sheet sudah ada tetapi kosong tanpa baris sama sekali
    if (ws.getLastRow() === 0) {
      ws.appendRow(headers);
    } else {
      // Jika baris pertama (header) kosong
      const firstRow = ws.getRange(1, 1, 1, headers.length).getValues()[0];
      const isEmpty = firstRow.every(val => val === "" || val === null || val === undefined);
      if (isEmpty) {
        ws.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
  }
  return ws;
}

// Menyelesaikan alias nama sheet
function resolveSheetName(name) {
  const map = {
    'contentPlanner': 'content_planner',
    'brsSchedule': 'brs_schedule',
    'rekapRutin': 'rekap_rutin',
    'adHoc': 'ad_hoc_2026',
    'brsRilis': 'brs_rilis',
    'hariBesar': 'hari_besar',
    'rekapKegiatan': 'rekap_kegiatan',
    'auditTrail': 'audit_trail',
    'masterData': 'master_data',
    'assignments': 'assignments',
    'repository': 'repository'
  };
  return map[name] || name;
}

// Menyediakan daftar header default untuk setiap tabel
function getHeadersForSheet(name) {
  const schemas = {
    'content_planner': ["id", "judul", "konsep", "jenis", "postType", "progres", "jadwal", "status", "assignTo", "media_post", "jam_posting", "tanggal_posting", "jenis_konten", "link_konten"],
    'contentPlanner': ["id", "judul", "konsep", "jenis", "postType", "progres", "jadwal", "status", "assignTo", "media_post", "jam_posting", "tanggal_posting", "jenis_konten", "link_konten"],
    'brs_schedule': ["id", "judul", "tanggal", "pic_poster", "pic_info", "pic_doc", "pic_high"],
    'brsSchedule': ["id", "judul", "tanggal", "pic_poster", "pic_info", "pic_doc", "pic_high"],
    'protocol': ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
    'team': ["id", "nama", "jabatan", "bidang", "tugas", "kontak"],
    'tickets': ["id", "pengaju", "bidang", "jenis", "judul", "tanggal_kegiatan", "waktu", "lokasi", "deadline", "detail", "lampiran", "status", "pic"],
    'assets': ["id", "nama", "kategori", "jumlah", "kondisi", "lokasi"],
    'monitoring': ["id", "tanggal", "media", "judul", "topik", "jenis_berita", "url", "narasumber", "pic", "sentimen", "ringkasan", "keterangan"],
    'users': ["id", "username", "password", "nama", "role", "bidang"],
    'rekap_rutin': ["id", "tanggal", "hari", "rubrikasi", "kegiatan", "petugas", "status", "tautan_dokumentasi", "tautan_konten", "keterangan", "hubungkan_content_planner", "hubungkan_kalender"],
    'rekapRutin': ["id", "tanggal", "hari", "rubrikasi", "kegiatan", "petugas", "status", "tautan_dokumentasi", "tautan_konten", "keterangan", "hubungkan_content_planner", "hubungkan_kalender"],
    'ad_hoc_2026': ["id", "tanggal", "hari", "kegiatan", "jumlah_bertugas", "petugas", "keterangan", "status", "tautan_dokumentasi", "hubungkan_content_planner", "hubungkan_kalender"],
    'adHoc': ["id", "tanggal", "hari", "kegiatan", "jumlah_bertugas", "petugas", "keterangan", "status", "tautan_dokumentasi", "hubungkan_content_planner", "hubungkan_kalender"],
    'protokoler': ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
    'mc': ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
    'brs_rilis': ["id", "tanggal_rilis", "judul", "pic_poster_info", "pic_doc_ruang", "pic_doc_yt_zoom", "highlight"],
    'brsRilis': ["id", "tanggal_rilis", "judul", "pic_poster_info", "pic_doc_ruang", "pic_doc_yt_zoom", "highlight"],
    'hari_besar': ["id", "tanggal", "hari_besar", "kategori", "jenis_media", "pembuat_konten", "status", "tautan_konten", "data_pendukung", "keterangan", "hubungkan_content_planner"],
    'hariBesar': ["id", "tanggal", "hari_besar", "kategori", "jenis_media", "pembuat_konten", "status", "tautan_konten", "data_pendukung", "keterangan", "hubungkan_content_planner"],
    'rekap_kegiatan': ["id", "deadline", "kegiatan", "jenis_kegiatan", "petugas", "progress", "status"],
    'rekapKegiatan': ["id", "deadline", "kegiatan", "jenis_kegiatan", "petugas", "progress", "status"],
    'notifications': ["id", "user_role", "title", "message", "timestamp", "is_read"],
    'audit_trail': ["id", "user", "action", "details", "timestamp"],
    'auditTrail': ["id", "user", "action", "details", "timestamp"],
    'master_data': ["id", "kategori", "kode", "nilai", "keterangan"],
    'masterData': ["id", "kategori", "kode", "nilai", "keterangan"],
    'assignments': ["id", "petugas", "kegiatan", "peran", "tanggal", "status"],
    'repository': ["id", "nama_dokumen", "kategori", "deskripsi", "tanggal", "pic", "link_cloud", "versi", "status"]
  };
  return schemas[name] || null;
}
