#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('[sim-humas] Starting production build verification...');

const requiredFiles = [
  'server.js',
  'api/index.js',
  'index.html',
  'manifest.json',
  'js/app.js',
  'js/views.js',
  'js/db.js',
  'js/auth.js',
  'js/driveSync.js',
  'js/pwa.js',
  'sw.js',
  'scripts/monitoringEngine.js'
];

let hasErrors = false;

// 1. Verify existence of critical files
for (const file of requiredFiles) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[sim-humas BUILD ERROR] Missing critical file: ${file}`);
    hasErrors = true;
  }
}

// 2. Syntax validation for JS files
const jsFilesToLint = [
  'server.js',
  'api/index.js',
  'api/sheets.js',
  'api/auth/login.js',
  'api/monitoring/sync-drive.js',
  'api/monitoring/run-scraper.js',
  'api/monitoring/data.js',
  'api/monitoring/export-excel.js',
  'scripts/monitoringEngine.js',
  'js/app.js',
  'js/auth.js',
  'js/db.js',
  'js/views.js',
  'js/driveSync.js',
  'js/pwa.js',
  'sw.js'
];

for (const jsFile of jsFilesToLint) {
  try {
    execSync(`node --check ${path.join(rootDir, jsFile)}`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`[sim-humas BUILD ERROR] Syntax check failed for ${jsFile}:`, err.message);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('[sim-humas] Production build failed due to validation errors.');
  process.exit(1);
}

// 3. Ensure static asset directory has monitoring.json and monitoringData.js for CDN and direct browser delivery
const publicDataDir = path.join(rootDir, 'public', 'data');
const publicJsDir = path.join(rootDir, 'public', 'js');
if (!fs.existsSync(publicDataDir)) {
  try { fs.mkdirSync(publicDataDir, { recursive: true }); } catch (_) {}
}
if (!fs.existsSync(publicJsDir)) {
  try { fs.mkdirSync(publicJsDir, { recursive: true }); } catch (_) {}
}

const srcMonitoring = path.join(rootDir, 'data', 'monitoring.json');
const destMonitoring = path.join(publicDataDir, 'monitoring.json');
const jsMonitoringFile = path.join(rootDir, 'js', 'monitoringData.js');
const publicJsMonitoringFile = path.join(publicJsDir, 'monitoringData.js');

if (fs.existsSync(srcMonitoring)) {
  try {
    const rawData = fs.readFileSync(srcMonitoring, 'utf8');
    fs.copyFileSync(srcMonitoring, destMonitoring);
    const jsContent = '// Auto-generated bundled monitoring dataset for instant offline & zero-latency loading\nwindow.INITIAL_MONITORING_DATA = ' + rawData.trim() + ';\n';
    fs.writeFileSync(jsMonitoringFile, jsContent, 'utf8');
    fs.writeFileSync(publicJsMonitoringFile, jsContent, 'utf8');
    console.log('[sim-humas] Synchronized static JSON and bundled js/monitoringData.js for zero-latency client delivery.');
  } catch (copyErr) {
    console.warn('[sim-humas BUILD WARNING] Could not copy monitoring files:', copyErr.message);
  }
}

// Ensure firebase-applet-config.json is mirrored into public/ for static hosting
const srcFirebaseConfig = path.join(rootDir, 'firebase-applet-config.json');
const destFirebaseConfig = path.join(rootDir, 'public', 'firebase-applet-config.json');
if (fs.existsSync(srcFirebaseConfig)) {
  try {
    fs.copyFileSync(srcFirebaseConfig, destFirebaseConfig);
    console.log('[sim-humas] Mirrored firebase-applet-config.json to public directory.');
  } catch (_) {}
}

console.log('[sim-humas] All core scripts and templates validated successfully.');
console.log('[sim-humas] Production build ready.');
process.exit(0);
