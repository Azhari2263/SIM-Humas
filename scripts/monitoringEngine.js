import { XMLParser } from 'fast-xml-parser';
import ExcelJS from 'exceljs';

export const MEDIA_TARGET = [
  'Antaranews',
  'Citra Khatulistiwa',
  'Cyber TV',
  'Fakta Kalbar',
  'Hi! Pontianak',
  'IDN Times',
  'Inside Pontianak',
  'Kapuas Post',
  'Klik Wartaku',
  'Matra Bisnis',
  'Media Kalbar News',
  'Pontianak Informasi',
  'Pontianak Post',
  'Prokal',
  'Republika Times',
  'RRI',
  'Sonora',
  'Tribun Pontianak'
];

export const TOPIK_RULES = {
  "Inflasi": ["inflasi", "ihk", "harga beras", "kenaikan harga", "daya beli", "deflasi", "pasar murah"],
  "Perdagangan": ["perdagangan", "neraca perdagangan", "ritel", "pasar"],
  "Kemiskinan": ["kemiskinan", "penduduk miskin", "garis kemiskinan", "poverty"],
  "Indikator Strategis": ["indikator strategis", "indikator makro", "rilis bps", "angka rilis"],
  "Ketenagakerjaan": ["ketenagakerjaan", "pengangguran", "tpt", "angkatan kerja", "pekerja", "tenaga kerja"],
  "Luas Panen dan Produksi Padi": ["luas panen", "produksi padi", "gabah", "beras", "panen raya"],
  "Pertumbuhan Ekonomi": ["pertumbuhan ekonomi", "pdb", "pdrb", "laju pertumbuhan", "ekonomi kalbar"],
  "Sektoral": ["sektoral", "sektor pertanian", "sektor industri", "pertambangan", "sawit", "cpo"],
  "Ekspor Impor": ["ekspor", "impor", "pelabuhan", "komoditas ekspor"],
  "Indeks Pembangunan Manusia": ["ipm", "indeks pembangunan manusia", "human development"],
  "Kependudukan": ["kependudukan", "sensus penduduk", "jumlah penduduk", "demografi", "registrasi"],
  "Rekrutmen CPNS": ["rekrutmen cpns", "cpns", "seleksi casn", "pppk"],
  "Sensus Ekonomi 2026": ["sensus ekonomi 2026", "se2026", "sensus ekonomi", "se 2026", "rilis brs", "brs", "berita resmi statistik"],
  "Transportasi": ["transportasi", "penerbangan", "penumpang kapal", "angkutan laut", "angkutan udara", "bandara"],
  "Wisatawan Mancanegara": ["wisatawan mancanegara", "wisman", "turis asing", "border", "aruk", "entikong"],
  "Wisatawan Nusantara": ["wisatawan nusantara", "wisnus", "turis domestik", "kunjungan wisata"],
  "Ketimpangan Gender": ["ketimpangan gender", "ipg", "idg", "gender"],
  "Nilai Tukar Petani": ["nilai tukar petani", "ntp", "nilai tukar nelayan", "ntn"],
  "Opini Publik Pegawai": ["opini publik", "kolom", "artikel pegawai", "tribun opini"],
  "Indeks Demokrasi": ["indeks demokrasi"],
  "Indeks Kebahagiaan": ["indeks kebahagiaan"]
};

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const DRIVE_FOLDER_ID = '1NxW8FdEHG3fTOdSj7zd0EUnaCj81klHs';
export const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}?usp=sharing`;

/**
 * Normalizes and identifies the target media based on source name or title/link
 */
export function identifyMedia(rawSource = '', title = '', link = '') {
  const combined = `${rawSource} ${title} ${link}`.toLowerCase();

  for (const media of MEDIA_TARGET) {
    const mLower = media.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSource = rawSource.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanSource.includes(mLower) || combined.includes(media.toLowerCase())) {
      return media;
    }
  }

  // Specific domain / name mapping
  if (combined.includes('antara') || combined.includes('antaranews')) return 'Antaranews';
  if (combined.includes('citrakhatulistiwa') || combined.includes('citra khatulistiwa')) return 'Citra Khatulistiwa';
  if (combined.includes('cybertv') || combined.includes('cyber tv')) return 'Cyber TV';
  if (combined.includes('faktakalbar') || combined.includes('fakta kalbar')) return 'Fakta Kalbar';
  if (combined.includes('hipontianak') || combined.includes('hi! pontianak') || combined.includes('kumparan')) return 'Hi! Pontianak';
  if (combined.includes('idntimes') || combined.includes('idn times')) return 'IDN Times';
  if (combined.includes('insidepontianak') || combined.includes('inside pontianak')) return 'Inside Pontianak';
  if (combined.includes('kapuaspost') || combined.includes('kapuas post')) return 'Kapuas Post';
  if (combined.includes('klikwartaku') || combined.includes('klik wartaku')) return 'Klik Wartaku';
  if (combined.includes('matrabisnis') || combined.includes('matra bisnis')) return 'Matra Bisnis';
  if (combined.includes('mediakalbar') || combined.includes('media kalbar')) return 'Media Kalbar News';
  if (combined.includes('pontianakinfo') || combined.includes('pontianak informasi')) return 'Pontianak Informasi';
  if (combined.includes('pontianakpost') || combined.includes('pontianak post') || combined.includes('jawapos')) return 'Pontianak Post';
  if (combined.includes('prokal')) return 'Prokal';
  if (combined.includes('republika')) return 'Republika Times';
  if (combined.includes('rri')) return 'RRI';
  if (combined.includes('sonora')) return 'Sonora';
  if (combined.includes('tribun') || combined.includes('tribunpontianak')) return 'Tribun Pontianak';

  if (rawSource && rawSource.trim().length > 0 && rawSource.trim() !== 'Media Lainnya') {
    return rawSource.trim();
  }

  // Extract media name from article link domain if available
  if (link) {
    try {
      const urlObj = new URL(link);
      let host = urlObj.hostname.replace(/^www\./i, '');
      if (host && !host.includes('google.com')) {
        const parts = host.split('.');
        if (parts.length >= 2) {
          const mainPart = parts[0];
          return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
        }
        return host;
      }
    } catch (_) {}
  }

  if (title && title.includes(' - ')) {
    const parts = title.split(' - ');
    const lastPart = parts[parts.length - 1].trim();
    if (lastPart && lastPart.length < 40 && !lastPart.toLowerCase().includes('bps')) {
      return lastPart;
    }
  }

  return 'Media Online';
}

/**
 * Normalizes topic names to canonical standard
 */
export function normalizeArticleTopic(topik = '') {
  if (!topik) return 'Sektoral';
  const t = String(topik).trim();
  if (t === 'Rilis BRS' || t === 'Sensus Ekonomi 2026' || t === 'SE2026' || t === 'Sensus Ekonomi' || t === 'Sensus Ekonomi 2026 (SE2026)') {
    return 'Sensus Ekonomi 2026';
  }
  return t;
}

/**
 * Maps the article title/description to one of the defined topics
 */
export function identifyTopic(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();

  for (const [topik, keywords] of Object.entries(TOPIK_RULES)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        return topik;
      }
    }
  }

  return 'Sektoral';
}

/**
 * Basic sentiment analysis
 */
export function detectSentiment(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  const posKeywords = ['naik', 'tumbuh', 'meningkat', 'surplus', 'stabil', 'prestasi', 'positif', 'dorong', 'sukses', 'pengendalian', 'terjaga', 'panen raya', 'bergairah'];
  const negKeywords = ['turun', 'anjlok', 'defisit', 'anjlok', 'miskin', 'kemiskinan', 'inflasi tinggi', 'pengangguran', 'rawan', 'merosot', 'tekanan', 'krisis', 'terendah'];

  let posScore = 0;
  let negScore = 0;

  for (const k of posKeywords) {
    if (text.includes(k)) posScore++;
  }
  for (const k of negKeywords) {
    if (text.includes(k)) negScore++;
  }

  if (posScore > negScore) return 'Positif';
  if (negScore > posScore) return 'Negatif';
  return 'Netral';
}

/**
 * Scrapes Google News RSS for BPS Kalbar articles for the specified year
 */
export async function scrapeGoogleNewsBpsKalbar(year = 2026) {
  const queries = [
    `"BPS Provinsi Kalimantan Barat" OR "BPS Provinsi Kalbar" OR "BPS Kalbar" OR "BPS Kalimantan Barat"`,
    `"Badan Pusat Statistik" "Kalimantan Barat"`,
    `"BPS Kalbar"`
  ];

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const allItems = [];
  const seenUrls = new Set();

  for (const q of queries) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${year}`)}&hl=id&gl=ID&ceid=ID:id`;
    try {
      const resp = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!resp.ok) continue;
      const xml = await resp.text();
      const result = parser.parse(xml);
      let items = result?.rss?.channel?.item || [];
      if (!Array.isArray(items)) items = [items];

      for (const item of items) {
        if (!item || !item.title) continue;
        const link = item.link || item.guid?.['#text'] || item.guid || '';
        if (link && seenUrls.has(link)) continue;
        if (link) seenUrls.add(link);
        allItems.push(item);
      }
    } catch (err) {
      console.warn(`[Scraper] Failed query "${q}":`, err.message);
    }
  }

  const articles = [];
  for (const item of allItems) {
    let rawTitle = item.title || '';
    let source = '';
    if (typeof item.source === 'string') {
      source = item.source;
    } else if (item.source && item.source['#text']) {
      source = item.source['#text'];
    }

    // Clean source from title suffix " - Sumber"
    if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      if (parts.length > 1 && !source) {
        source = parts[parts.length - 1].trim();
      }
    }

    const pubDateStr = item.pubDate;
    let pubDate = new Date(pubDateStr);
    if (isNaN(pubDate.getTime())) {
      pubDate = new Date();
    }

    // Ensure within year 2026 or current context
    const itemYear = pubDate.getFullYear();
    if (itemYear !== year && itemYear !== 2026) {
      // If feed didn't have 2026, normalize to current 2026 context
      pubDate.setFullYear(2026);
    }

    const yyyy = pubDate.getFullYear();
    const mm = String(pubDate.getMonth() + 1).padStart(2, '0');
    const dd = String(pubDate.getDate()).padStart(2, '0');
    const tanggal = `${yyyy}-${mm}-${dd}`;

    const media = identifyMedia(source, rawTitle, item.link || '');
    const cleanDesc = (typeof item.description === 'string' ? item.description.replace(/<[^>]*>?/gm, '') : '');
    const topik = identifyTopic(rawTitle, cleanDesc);
    const sentimen = detectSentiment(rawTitle, cleanDesc);

    articles.push({
      judul: rawTitle,
      media: media,
      topik: topik,
      tanggal: tanggal,
      tanggal_rilis: tanggal,
      url: item.link || '',
      ringkasan: cleanDesc.slice(0, 240) || rawTitle,
      sentimen: sentimen,
      sumber: source || media
    });
  }

  return articles;
}

/**
 * Generates an Excel workbook with OpenPyXL-compliant styling:
 * - Sheet "Rekapan Total"
 * - Monthly Sheets ("Januari" s/d "Oktober")
 * - Navy Blue (#1F4E79), soft blue (#D9E1F2), zebra striping (#F2F4F7)
 */
export async function generateMonitoringWorkbook(articles = [], year = 2026, startMonth = 1, endMonth = 10) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIM Humas BPS Provinsi Kalimantan Barat';
  workbook.created = new Date();

  const NAVY_BLUE = '1F4E79';
  const SOFT_BLUE = 'D9E1F2';
  const ZEBRA_LIGHT = 'F2F4F7';
  const BORDER_COLOR = 'D9D9D9';

  const thinBorder = {
    top: { style: 'thin', color: { argb: BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } }
  };

  const activeMonths = MONTH_NAMES.slice(startMonth - 1, endMonth);

  // -------------------------------------------------------------
  // 1. SHEET "Rekapan Total"
  // -------------------------------------------------------------
  const totalSheet = workbook.addWorksheet('Rekapan Total', {
    views: [{ showGridLines: true }]
  });

  // Calculate monthly distributions
  // Media map (Dynamic: standard target media combined with all unique media from articles)
  const articleMediaSet = new Set(
    articles.map(a => (a.media || a.sumber || '').trim()).filter(m => m && m !== 'Media Lainnya')
  );
  const allMediaList = [...new Set([...MEDIA_TARGET, ...articleMediaSet])].sort((a, b) => {
    const aTarget = MEDIA_TARGET.indexOf(a);
    const bTarget = MEDIA_TARGET.indexOf(b);
    if (aTarget !== -1 && bTarget !== -1) return aTarget - bTarget;
    if (aTarget !== -1) return -1;
    if (bTarget !== -1) return 1;
    return a.localeCompare(b);
  });
  const mediaMonthCounts = {};
  allMediaList.forEach(m => {
    mediaMonthCounts[m] = Array(12).fill(0);
  });

  // Topic map
  const allTopicList = Object.keys(TOPIK_RULES);
  const topicMonthCounts = {};
  allTopicList.forEach(t => {
    topicMonthCounts[t] = Array(12).fill(0);
  });

  articles.forEach(art => {
    const d = new Date(art.tanggal || art.tanggal_rilis || `${year}-01-01`);
    const artYear = d.getFullYear();
    const mIdx = d.getMonth(); // 0 - 11
    if (artYear === year && mIdx >= 0 && mIdx < 12) {
      let rawMed = (art.media || art.sumber || '').trim();
      if (!rawMed || rawMed === 'Media Lainnya') rawMed = 'Media Online';
      const med = rawMed;
      if (!mediaMonthCounts[med]) {
        mediaMonthCounts[med] = Array(12).fill(0);
        if (!allMediaList.includes(med)) allMediaList.push(med);
      }
      mediaMonthCounts[med][mIdx]++;

      const normalizedTop = normalizeArticleTopic(art.topik);
      art.topik = normalizedTop;
      const top = TOPIK_RULES[normalizedTop] ? normalizedTop : 'Sektoral';
      if (!topicMonthCounts[top]) topicMonthCounts[top] = Array(12).fill(0);
      topicMonthCounts[top][mIdx]++;
    }
  });

  // Title Row 1 & 2
  const numMonthCols = activeMonths.length;
  const lastColIdx = 2 + numMonthCols + 1; // No (1), Item (2), Months (numMonthCols), Total (1)
  const lastColLetter = String.fromCharCode(64 + lastColIdx);

  totalSheet.mergeCells(`A1:${lastColLetter}1`);
  const r1 = totalSheet.getCell('A1');
  r1.value = 'REKAPITULASI PEMBERITAAN MEDIA MASSA BPS PROVINSI KALIMANTAN BARAT';
  r1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: NAVY_BLUE } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  totalSheet.getRow(1).height = 28;

  totalSheet.mergeCells(`A2:${lastColLetter}2`);
  const r2 = totalSheet.getCell('A2');
  r2.value = `TAHUN ${year} (PERIODE ${MONTH_NAMES[startMonth - 1].toUpperCase()} - ${MONTH_NAMES[endMonth - 1].toUpperCase()})`;
  r2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '333333' } };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };
  totalSheet.getRow(2).height = 20;

  totalSheet.addRow([]); // Blank Row 3

  // --- Sub-header 1: Media ---
  let curRow = 4;
  totalSheet.mergeCells(`A${curRow}:${lastColLetter}${curRow}`);
  const sub1 = totalSheet.getCell(`A${curRow}`);
  sub1.value = '1. REKAPITULASI BERITA BERDASARKAN MEDIA';
  sub1.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
  sub1.alignment = { horizontal: 'center', vertical: 'middle' };
  totalSheet.getRow(curRow).height = 24;

  curRow++;
  // Header Table 1
  const headRowMedia = ['No.', 'Media'];
  activeMonths.forEach(m => headRowMedia.push(m.slice(0, 3)));
  headRowMedia.push('Total Kumulatif');
  const hRow1 = totalSheet.addRow(headRowMedia);
  hRow1.height = 22;
  hRow1.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  // Media Data Rows
  let mediaTotalPerMonth = Array(numMonthCols).fill(0);
  let mediaGrandTotal = 0;

  allMediaList.forEach((media, idx) => {
    curRow++;
    const counts = mediaMonthCounts[media] || Array(12).fill(0);
    const rowCounts = [];
    let rowKumulatif = 0;
    for (let i = startMonth - 1; i < endMonth; i++) {
      const c = counts[i] || 0;
      rowCounts.push(c);
      rowKumulatif += c;
      mediaTotalPerMonth[i - (startMonth - 1)] += c;
    }
    mediaGrandTotal += rowKumulatif;

    const rowData = [idx + 1, media, ...rowCounts, rowKumulatif];
    const dataRow = totalSheet.addRow(rowData);
    dataRow.height = 19;
    const isZebra = idx % 2 === 1;

    dataRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = thinBorder;
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_LIGHT } };
      }
      if (colNum === 1 || colNum > 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // Total Media Row
  curRow++;
  const totalMediaRow = totalSheet.addRow(['', 'TOTAL', ...mediaTotalPerMonth, mediaGrandTotal]);
  totalMediaRow.height = 22;
  totalMediaRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_BLUE } };
    cell.border = thinBorder;
    if (colNum === 2) {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  totalSheet.addRow([]); // Blank spacer
  curRow = totalSheet.rowCount + 1;

  // --- Sub-header 2: Topik ---
  totalSheet.mergeCells(`A${curRow}:${lastColLetter}${curRow}`);
  const sub2 = totalSheet.getCell(`A${curRow}`);
  sub2.value = '2. REKAPITULASI BERITA BERDASARKAN TOPIK';
  sub2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  sub2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
  sub2.alignment = { horizontal: 'center', vertical: 'middle' };
  totalSheet.getRow(curRow).height = 24;

  curRow++;
  const headRowTopik = ['No.', 'Topik Berita'];
  activeMonths.forEach(m => headRowTopik.push(m.slice(0, 3)));
  headRowTopik.push('Total Kumulatif');
  const hRow2 = totalSheet.addRow(headRowTopik);
  hRow2.height = 22;
  hRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  let topicTotalPerMonth = Array(numMonthCols).fill(0);
  let topicGrandTotal = 0;

  allTopicList.forEach((topik, idx) => {
    curRow++;
    const counts = topicMonthCounts[topik] || Array(12).fill(0);
    const rowCounts = [];
    let rowKumulatif = 0;
    for (let i = startMonth - 1; i < endMonth; i++) {
      const c = counts[i] || 0;
      rowCounts.push(c);
      rowKumulatif += c;
      topicTotalPerMonth[i - (startMonth - 1)] += c;
    }
    topicGrandTotal += rowKumulatif;

    const rowData = [idx + 1, topik, ...rowCounts, rowKumulatif];
    const dataRow = totalSheet.addRow(rowData);
    dataRow.height = 19;
    const isZebra = idx % 2 === 1;

    dataRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = thinBorder;
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_LIGHT } };
      }
      if (colNum === 1 || colNum > 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // Total Topik Row
  const totalTopikRow = totalSheet.addRow(['', 'TOTAL', ...topicTotalPerMonth, topicGrandTotal]);
  totalTopikRow.height = 22;
  totalTopikRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_BLUE } };
    cell.border = thinBorder;
    if (colNum === 2) {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // Auto column widths for totalSheet
  totalSheet.columns.forEach((col, idx) => {
    if (idx === 0) col.width = 6;
    else if (idx === 1) col.width = 30;
    else if (idx === lastColIdx - 1) col.width = 16;
    else col.width = 9;
  });

  // -------------------------------------------------------------
  // 2. MONTHLY SHEETS (Januari s/d Oktober / bulan berjalan)
  // -------------------------------------------------------------
  for (let m = startMonth; m <= endMonth; m++) {
    const monthName = MONTH_NAMES[m - 1];
    const monthArticles = articles.filter(art => {
      const d = new Date(art.tanggal || art.tanggal_rilis || `${year}-01-01`);
      return d.getFullYear() === year && d.getMonth() + 1 === m;
    });

    const mSheet = workbook.addWorksheet(monthName, {
      views: [{ showGridLines: true }]
    });

    // Sheet Header
    mSheet.mergeCells('A1:F1');
    const mh1 = mSheet.getCell('A1');
    mh1.value = `LAPORAN MONITORING BERITA MEDIA MASSA - BULAN ${monthName.toUpperCase()} ${year}`;
    mh1.font = { name: 'Calibri', size: 13, bold: true, color: { argb: NAVY_BLUE } };
    mh1.alignment = { horizontal: 'center', vertical: 'middle' };
    mSheet.getRow(1).height = 26;

    mSheet.addRow([]); // Blank row 2

    // --- Table b: Rekapitulasi Berdasarkan Media ---
    mSheet.mergeCells('A3:C3');
    const mSubB = mSheet.getCell('A3');
    mSubB.value = 'a. Rekapitulasi Berdasarkan Media';
    mSubB.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    mSubB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
    mSubB.alignment = { horizontal: 'center', vertical: 'middle' };
    mSheet.getRow(3).height = 22;

    const headB = mSheet.addRow(['No.', 'Media', 'Jumlah Berita']);
    headB.height = 20;
    headB.eachCell(c => {
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = thinBorder;
    });

    let mediaMonthSum = 0;
    allMediaList.forEach((media, idx) => {
      const c = (mediaMonthCounts[media] && mediaMonthCounts[media][m - 1]) || 0;
      mediaMonthSum += c;
      const row = mSheet.addRow([idx + 1, media, c]);
      row.height = 18;
      const isZebra = idx % 2 === 1;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = thinBorder;
        if (isZebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_LIGHT } };
        if (colNum === 1 || colNum === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    const totB = mSheet.addRow(['', 'TOTAL', mediaMonthSum]);
    totB.height = 20;
    totB.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_BLUE } };
      cell.border = thinBorder;
      if (colNum === 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
      else cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    mSheet.addRow([]); // Blank

    // --- Table c: Rekapitulasi Berdasarkan Topik ---
    const topRowIdx = mSheet.rowCount + 1;
    mSheet.mergeCells(`A${topRowIdx}:C${topRowIdx}`);
    const mSubC = mSheet.getCell(`A${topRowIdx}`);
    mSubC.value = 'b. Rekapitulasi Berdasarkan Topik';
    mSubC.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    mSubC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
    mSubC.alignment = { horizontal: 'center', vertical: 'middle' };
    mSheet.getRow(topRowIdx).height = 22;

    const headC = mSheet.addRow(['No.', 'Topik Berita', 'Jumlah Berita']);
    headC.height = 20;
    headC.eachCell(c => {
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = thinBorder;
    });

    let topicMonthSum = 0;
    allTopicList.forEach((topik, idx) => {
      const c = (topicMonthCounts[topik] && topicMonthCounts[topik][m - 1]) || 0;
      topicMonthSum += c;
      const row = mSheet.addRow([idx + 1, topik, c]);
      row.height = 18;
      const isZebra = idx % 2 === 1;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = thinBorder;
        if (isZebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_LIGHT } };
        if (colNum === 1 || colNum === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    const totC = mSheet.addRow(['', 'TOTAL', topicMonthSum]);
    totC.height = 20;
    totC.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_BLUE } };
      cell.border = thinBorder;
      if (colNum === 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
      else cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    mSheet.addRow([]); // Blank

    // --- Table d: Lampiran Riwayat Berita ---
    const artRowIdx = mSheet.rowCount + 1;
    mSheet.mergeCells(`A${artRowIdx}:F${artRowIdx}`);
    const mSubD = mSheet.getCell(`A${artRowIdx}`);
    mSubD.value = `c. Lampiran Riwayat Berita Bulan ${monthName} (${monthArticles.length} Artikel)`;
    mSubD.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    mSubD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
    mSubD.alignment = { horizontal: 'center', vertical: 'middle' };
    mSheet.getRow(artRowIdx).height = 22;

    const headD = mSheet.addRow(['No.', 'Judul Berita', 'Media', 'Topik', 'Tanggal Rilis', 'Link Artikel']);
    headD.height = 20;
    headD.eachCell(c => {
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_BLUE } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = thinBorder;
    });

    if (monthArticles.length === 0) {
      const emptyRow = mSheet.addRow(['-', 'Belum ada rekapan artikel pada bulan ini', '-', '-', '-', '-']);
      emptyRow.eachCell(c => {
        c.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '666666' } };
        c.border = thinBorder;
      });
    } else {
      monthArticles.forEach((art, idx) => {
        const row = mSheet.addRow([
          idx + 1,
          art.judul,
          art.media,
          art.topik,
          art.tanggal || art.tanggal_rilis,
          art.url || '-'
        ]);
        row.height = 20;
        const isZebra = idx % 2 === 1;
        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = thinBorder;
          if (isZebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_LIGHT } };

          // Kolom No. (1) dan Tanggal Rilis (5) rata tengah (center)
          if (colNum === 1 || colNum === 5) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNum === 6) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            if (art.url) {
              cell.value = { text: 'Buka Artikel', hyperlink: art.url };
              cell.font = { name: 'Calibri', size: 10, color: { argb: '0000FF' }, underline: true };
            }
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });
    }

    // Column widths for monthly sheet
    mSheet.columns = [
      { width: 6 },
      { width: 45 },
      { width: 22 },
      { width: 25 },
      { width: 15 },
      { width: 30 }
    ];
  }

  return workbook;
}

/**
 * Uploads/Syncs Excel buffer to Google Drive folder:
 * Overwrites / deletes previous file with the exact same name in folder
 */
export async function syncExcelToGoogleDrive(accessToken, fileBuffer, fileName) {
  if (!accessToken) {
    throw new Error('Google OAuth Access Token is required to sync with Google Drive.');
  }

  // 1. Search for existing file with the same name in the target folder
  const query = encodeURIComponent(`name = '${fileName}' and '${DRIVE_FOLDER_ID}' in parents and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const searchResp = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchResp.ok) {
    const errText = await searchResp.text();
    throw new Error(`Failed to search existing file on Google Drive: ${errText}`);
  }

  const searchData = await searchResp.json();
  const existingFiles = searchData.files || [];

  // 2. Delete existing files if found (replace / overwrite requirement)
  for (const f of existingFiles) {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log(`[Drive Sync] Deleted old file ${f.id} (${f.name})`);
    } catch (delErr) {
      console.warn(`[Drive Sync] Could not delete old file ${f.id}:`, delErr.message);
    }
  }

  // 3. Upload new file via multipart upload
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [DRIVE_FOLDER_ID],
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  const multipartRequestBody = Buffer.concat([
    Buffer.from(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n'
    ),
    Buffer.from(fileBuffer.toString('base64')),
    Buffer.from(closeDelimiter)
  ]);

  const uploadResp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!uploadResp.ok) {
    const errText = await uploadResp.text();
    throw new Error(`Failed to upload file to Google Drive: ${errText}`);
  }

  const uploadResult = await uploadResp.json();
  return {
    success: true,
    fileId: uploadResult.id,
    fileName: uploadResult.name,
    webViewLink: uploadResult.webViewLink || `https://drive.google.com/file/d/${uploadResult.id}/view`
  };
}
