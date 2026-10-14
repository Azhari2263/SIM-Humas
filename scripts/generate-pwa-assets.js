import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Mascot "Si Humas" inner SVG vector definition
 */
const mascotInnerSVG = `
    <!-- Base Glow / Drop Shadow for Mascot -->
    <ellipse cx="100" cy="176" rx="56" ry="8" fill="rgba(15,23,42,0.45)"/>

    <!-- Badan Maskot & Rompi Humas (BPS Blue) -->
    <g id="mascot-body">
        <!-- Kaos dalam biru BPS -->
        <rect x="68" y="115" width="64" height="60" rx="24" fill="#3b82f6"/>
        <!-- Rompi Pers / Humas Navy Gelap -->
        <path d="M 68 126 L 88 175 L 112 175 L 132 126 Z" fill="#1e1b4b" stroke="#312e81" stroke-width="1.8"/>
        
        <!-- Tali Lanyard Kuning & ID Card PERS BPS -->
        <path d="M 86 120 Q 100 148 100 156 Q 100 148 114 120" stroke="#f59e0b" stroke-width="3" fill="none" stroke-linecap="round"/>
        <!-- Kartu ID Pers -->
        <rect x="91" y="152" width="18" height="23" rx="2.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2"/>
        <rect x="91" y="152" width="18" height="5.5" rx="1" fill="#2563eb"/>
        <text x="100" y="156.5" font-size="3.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">PERS</text>
        <circle cx="100" cy="162" r="2.5" fill="#94a3b8"/>
        <rect x="94" y="167" width="12" height="1.5" rx="0.5" fill="#cbd5e1"/>
        <rect x="95" y="170" width="10" height="1.2" rx="0.5" fill="#cbd5e1"/>
    </g>

    <!-- Kepala Maskot yang Lucu & Ramah -->
    <g id="mascot-head">
        <!-- Kepala bulat ceria -->
        <circle cx="100" cy="80" r="44" fill="#fde68a" stroke="#f59e0b" stroke-width="2.5"/>
        
        <!-- Rambut & Poni Humas -->
        <path d="M 66 65 C 66 38, 134 38, 134 65 C 124 55, 112 53, 100 56 C 88 53, 76 55, 66 65 Z" fill="#1e1b4b"/>
        <!-- Poni kecil lucu -->
        <path d="M 92 56 Q 100 68 108 56 Z" fill="#1e1b4b"/>

        <!-- Headset Reporter / Kehumasan -->
        <path d="M 59 78 A 42 42 0 0 1 141 78" stroke="#0f172a" stroke-width="5" fill="none" stroke-linecap="round"/>
        <!-- Earpad kiri & kanan -->
        <rect x="54" y="70" width="8" height="18" rx="4" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
        <rect x="138" y="70" width="8" height="18" rx="4" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
        <!-- Mic boom dari headset ke mulut -->
        <path d="M 140 82 Q 130 102 114 98" stroke="#334155" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="113" cy="98" r="3.5" fill="#0f172a"/>

        <!-- Alis Ceria -->
        <path d="M 77 67 Q 85 63 92 67" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 108 67 Q 115 63 123 67" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>

        <!-- Mata Kiri -->
        <ellipse cx="85" cy="78" rx="8" ry="11" fill="#ffffff" stroke="#78350f" stroke-width="1.5"/>
        <g id="pupil-left">
            <ellipse cx="86" cy="78" rx="5.5" ry="8" fill="#1e1b4b"/>
            <circle cx="88" cy="74" r="2.2" fill="#ffffff"/>
            <circle cx="84" cy="81" r="1.1" fill="#ffffff"/>
        </g>
        <path d="M 77 70 Q 85 67 93 70" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round"/>

        <!-- Mata Kanan -->
        <ellipse cx="115" cy="78" rx="8" ry="11" fill="#ffffff" stroke="#78350f" stroke-width="1.5"/>
        <g id="pupil-right">
            <ellipse cx="114" cy="78" rx="5.5" ry="8" fill="#1e1b4b"/>
            <circle cx="116" cy="74" r="2.2" fill="#ffffff"/>
            <circle cx="112" cy="81" r="1.1" fill="#ffffff"/>
        </g>
        <path d="M 107 70 Q 115 67 123 70" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round"/>

        <!-- Pipi Merah Merona (Blush) -->
        <ellipse cx="74" cy="87" rx="6.5" ry="4" fill="#fb7185" opacity="0.8"/>
        <ellipse cx="126" cy="87" rx="6.5" ry="4" fill="#fb7185" opacity="0.8"/>

        <!-- Hidung & Senyum Manis -->
        <path d="M 99 82 Q 100 84 101 82" stroke="#b45309" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M 93 92 Q 100 102 107 92" stroke="#78350f" stroke-width="3" fill="#f43f5e" stroke-linecap="round"/>
    </g>

    <!-- Tangan Kiri Mengayun / Melambai -->
    <g id="mascot-hand-left">
        <path d="M 64 124 C 52 130, 46 146, 58 153 C 67 157, 75 146, 72 134 Z" fill="#fde68a" stroke="#f59e0b" stroke-width="2"/>
        <circle cx="55" cy="144" r="3.2" fill="#fde68a"/>
        <circle cx="58" cy="150" r="3.2" fill="#fde68a"/>
    </g>

    <!-- Tangan Kanan Memegang Mikrofon Berita BPS -->
    <g id="mascot-hand-right">
        <!-- Gagang Mic -->
        <rect x="136" y="132" width="7" height="26" rx="3.5" fill="#334155"/>
        <!-- Kubus Logo BPS / Humas -->
        <rect x="130" y="119" width="19" height="15" rx="3" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.2"/>
        <text x="139.5" y="130" font-size="5.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">BPS</text>
        <!-- Kepala Mic / Busa Grille -->
        <ellipse cx="139.5" cy="112" rx="8.5" ry="9.5" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
        
        <!-- Gelombang Suara (Soundwaves) -->
        <path d="M 152 105 A 12 12 0 0 1 152 121" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 158 100 A 18 18 0 0 1 158 126" stroke="#818cf8" stroke-width="2.5" fill="none" stroke-linecap="round"/>

        <!-- Jari Melingkari Mic -->
        <circle cx="132" cy="136" r="3.8" fill="#fde68a" stroke="#f59e0b" stroke-width="1.2"/>
        <circle cx="133" cy="142" r="3.5" fill="#fde68a" stroke="#f59e0b" stroke-width="1.2"/>
        <circle cx="134" cy="148" r="3.3" fill="#fde68a" stroke="#f59e0b" stroke-width="1.2"/>
    </g>
`;

/**
 * Standard Icon SVG (512x512) with Squircle Base & Mascot
 */
export function generateIconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="60%" stop-color="#3730a3" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <radialGradient id="haloGrad" cx="50%" cy="38%" r="48%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#4f46e5" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.45"/>
    </filter>
  </defs>
  
  <!-- Rounded Base Squircle -->
  <rect x="32" y="32" width="448" height="448" rx="116" fill="url(#bgGrad)" filter="url(#shadow)" />
  
  <!-- Soft Halo behind Mascot -->
  <circle cx="256" cy="245" r="180" fill="url(#haloGrad)" />

  <!-- Accent Dashed Ring -->
  <circle cx="256" cy="256" r="196" fill="none" stroke="#a5b4fc" stroke-width="3" stroke-dasharray="8 8" opacity="0.45"/>
  
  <!-- Maskot "Si Humas" BPS Kalbar -->
  <g transform="translate(256, 262) scale(2.55) translate(-104, -108)">
    ${mascotInnerSVG}
  </g>
</svg>`;
}

/**
 * Maskable Icon SVG (512x512) - Full Bleed Canvas, Mascot scaled in 80% safe zone
 */
export function generateMaskableIconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="maskBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#3730a3" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <radialGradient id="maskHaloGrad" cx="50%" cy="40%" r="45%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#4f46e5" stop-opacity="0" />
    </radialGradient>
  </defs>
  
  <!-- Full-bleed background for adaptive launcher masking -->
  <rect x="0" y="0" width="512" height="512" fill="url(#maskBgGrad)" />
  
  <!-- Soft Halo inside safe zone -->
  <circle cx="256" cy="248" r="160" fill="url(#maskHaloGrad)" />
  <circle cx="256" cy="256" r="185" fill="none" stroke="#a5b4fc" stroke-width="3" stroke-dasharray="8 8" opacity="0.35"/>
  
  <!-- Maskot "Si Humas" centered inside safe circle (diameter < 409px) -->
  <g transform="translate(256, 258) scale(2.25) translate(-104, -108)">
    ${mascotInnerSVG}
  </g>
</svg>`;
}

async function run() {
  console.log('Generating PWA Icons for SIM Humas BPS Kalbar (Mascot Si Humas)...');

  const standardSVG = generateIconSVG();
  const maskableSVG = generateMaskableIconSVG();

  // 1. Save icon.svg
  fs.writeFileSync(path.join(rootDir, 'icon.svg'), standardSVG);
  console.log('✓ Created icon.svg');

  // 2. Generate pwa-512x512.png
  await sharp(Buffer.from(standardSVG))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(rootDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  // 3. Generate pwa-192x192.png
  await sharp(Buffer.from(standardSVG))
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(rootDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // 4. Generate apple-touch-icon.png (180x180)
  await sharp(Buffer.from(standardSVG))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(path.join(rootDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 5. Generate pwa-maskable-512x512.png
  await sharp(Buffer.from(maskableSVG))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(rootDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png');

  console.log('🎉 All PWA assets generated successfully!');
}

run().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
