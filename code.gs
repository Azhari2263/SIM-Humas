function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ambil atau buat lembar data secara dinamis (Self-Healing Schema)
  const data = {
    contentPlanner: getSheetData(sheet, 'content_planner', ["id", "judul", "konsep", "jenis", "postType", "progres", "jadwal", "status", "assignedTo"]),
    brsSchedule: getSheetData(sheet, 'brs_schedule', ["id", "judul", "tanggal", "pic_poster", "pic_info", "pic_doc", "pic_high"]),
    team: getSheetData(sheet, 'team', ["id", "nama", "jabatan", "bidang", "tugas", "kontak"]),
    tickets: getSheetData(sheet, 'tickets', ["id", "pengaju", "bidang", "jenis", "judul", "deadline", "detail", "status", "pic"]),
    monitoring: getSheetData(sheet, 'monitoring', ["id", "media", "judul", "tanggal", "sentimen", "ringkasan", "url"]),
    users: getSheetData(sheet, 'users', ["id", "username", "password", "nama", "role", "bidang"]),
    rekapRutin: getSheetData(sheet, 'rekap_rutin', ["id", "tanggal", "hari", "rubrikasi", "kegiatan", "petugas", "status"]),
    adHoc: getSheetData(sheet, 'ad_hoc_2026', ["id", "tanggal", "hari", "kegiatan", "jumlah_bertugas", "petugas", "keterangan", "status"]),
    protokoler: getSheetData(sheet, 'protokoler', ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"]),
    mc: getSheetData(sheet, 'mc', ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"]),
    brsRilis: getSheetData(sheet, 'brs_rilis', ["id", "tanggal_rilis", "judul", "pic_poster_info", "pic_doc_ruang", "pic_doc_yt_zoom", "highlight"]),
    hariBesar: getSheetData(sheet, 'hari_besar', ["id", "tanggal", "hari_besar", "data_pendukung", "pembuat_konten", "status"]),
    rekapKegiatan: getSheetData(sheet, 'rekap_kegiatan', ["id", "deadline", "kegiatan", "jenis_kegiatan", "petugas", "progress", "status"]),
    notifications: getSheetData(sheet, 'notifications', ["id", "user_role", "title", "message", "timestamp", "is_read"])
  };
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!e.postData.contents) return ContentService.createTextOutput(JSON.stringify({success: false, error: "No data"}));
  
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Tentukan headers berdasarkan nama sheet
  const headers = getHeadersForSheet(data.sheet);
  if (!headers) return ContentService.createTextOutput(JSON.stringify({success: false, error: "Invalid sheet name"}));
  
  // Ambil atau buat sheet secara dinamis
  const ws = getOrCreateSheet(sheet, data.sheet, headers);
  const rows = ws.getDataRange().getValues();
  const currentHeaders = rows[0];
  
  // Cari index kolom 'id'
  const idIndex = currentHeaders.indexOf('id');
  if (idIndex === -1) return ContentService.createTextOutput(JSON.stringify({success: false, error: "Column 'id' not found"}));

  if (data.action === 'add') {
    // Petakan data objek sesuai dengan susunan header kolom
    const rowData = currentHeaders.map(header => {
      const val = data.item[header];
      return val !== undefined ? val : "";
    });
    ws.appendRow(rowData);
    
  } else if (data.action === 'update') {
    const idToUpdate = data.item.id;
    let updated = false;
    
    // Cari baris yang cocok berdasarkan ID
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] == idToUpdate) {
        const rowIndex = i + 1;
        const rowData = currentHeaders.map(header => {
          const val = data.item[header];
          return val !== undefined ? val : rows[i][currentHeaders.indexOf(header)];
        });
        ws.getRange(rowIndex, 1, 1, currentHeaders.length).setValues([rowData]);
        updated = true;
        break;
      }
    }
    if (!updated) return ContentService.createTextOutput(JSON.stringify({success: false, error: "Item ID not found for update"}));
    
  } else if (data.action === 'delete') {
    const idToDelete = data.item.id;
    let deleted = false;
    
    // Cari dan hapus baris dari bawah ke atas agar tidak mengganggu indeks baris berikutnya
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][idIndex] == idToDelete) {
        ws.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }
    if (!deleted) return ContentService.createTextOutput(JSON.stringify({success: false, error: "Item ID not found for delete"}));
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}

// Mengambil data sheet atau membuatnya jika belum ada
function getSheetData(sheet, sheetName, defaultHeaders) {
  const ws = getOrCreateSheet(sheet, sheetName, defaultHeaders);
  let rows = ws.getDataRange().getValues();
  let headers = rows[0];
  
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
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

// Menyediakan daftar header default untuk setiap tabel
function getHeadersForSheet(name) {
  const schemas = {
    'content_planner': ["id", "judul", "konsep", "jenis", "postType", "progres", "jadwal", "status", "assignedTo"],
    'brs_schedule': ["id", "judul", "tanggal", "pic_poster", "pic_info", "pic_doc", "pic_high"],
    'team': ["id", "nama", "jabatan", "bidang", "tugas", "kontak"],
    'tickets': ["id", "pengaju", "bidang", "jenis", "judul", "deadline", "detail", "status", "pic"],
    'monitoring': ["id", "media", "judul", "tanggal", "sentimen", "ringkasan", "url"],
    'users': ["id", "username", "password", "nama", "role", "bidang"],
    'rekap_rutin': ["id", "tanggal", "hari", "rubrikasi", "kegiatan", "petugas", "status"],
    'ad_hoc_2026': ["id", "tanggal", "hari", "kegiatan", "jumlah_bertugas", "petugas", "keterangan", "status"],
    'protokoler': ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
    'mc': ["id", "tanggal", "bulan", "kegiatan", "lokasi", "jam_mulai", "jenis", "level", "petugas", "keterangan", "status"],
    'brs_rilis': ["id", "tanggal_rilis", "judul", "pic_poster_info", "pic_doc_ruang", "pic_doc_yt_zoom", "highlight"],
    'hari_besar': ["id", "tanggal", "hari_besar", "data_pendukung", "pembuat_konten", "status"],
    'rekap_kegiatan': ["id", "deadline", "kegiatan", "jenis_kegiatan", "petugas", "progress", "status"],
    'notifications': ["id", "user_role", "title", "message", "timestamp", "is_read"]
  };
  return schemas[name] || null;
}