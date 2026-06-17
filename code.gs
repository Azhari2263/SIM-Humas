function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const data = {
    contentPlanner: getSheetData(sheet, 'content_planner'),
    brsSchedule: getSheetData(sheet, 'brs_schedule'),
    protocol: getSheetData(sheet, 'protocol'),
    team: getSheetData(sheet, 'team')
  };
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Pastikan ada data yang dikirim
  if (!e.postData.contents) return ContentService.createTextOutput(JSON.stringify({success: false, error: "No data"}));
  
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const ws = sheet.getSheetByName(data.sheet);
  
  if (!ws) return ContentService.createTextOutput(JSON.stringify({success: false, error: "Sheet not found"}));

  // Ambil header untuk memastikan urutan kolom sesuai
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const rows = ws.getDataRange().getValues();
  
  // Cari index kolom 'id'
  const idIndex = headers.indexOf('id');

  if(data.action === 'add') {
    // Mapping data object sesuai urutan header kolom agar tidak salah tempat
    const rowData = headers.map(header => data.item[header]);
    ws.appendRow(rowData);
    
  } else if (data.action === 'update') {
    const idToUpdate = data.item.id;
    
    // Loop mencari baris dengan ID yang cocok
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] == idToUpdate) {
        // Update baris tersebut (i + 1 karena array mulai dari 0, spreadsheet mulai dari 1)
        const rowIndex = i + 1;
        const rowData = headers.map(header => data.item[header]);
        ws.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
        break;
      }
    }
    
  } else if (data.action === 'delete') {
    const idToDelete = data.item.id;
    
    // Loop mencari baris dengan ID yang cocok
    // Loop dari bawah ke atas (reverse) agar penghapusan tidak merusak index baris selanjutnya
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][idIndex] == idToDelete) {
        // Hapus baris (i + 1)
        ws.deleteRow(i + 1);
        break;
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheet, sheetName) {
  const ws = sheet.getSheetByName(sheetName);
  const rows = ws.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });
}