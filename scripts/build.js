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

console.log('[sim-humas] All core scripts and templates validated successfully.');
console.log('[sim-humas] Production build ready.');
process.exit(0);
