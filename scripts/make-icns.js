/**
 * build/icon-1024.png dosyasından macOS build/tvio.icns üretir (sips + iconutil).
 * Electron gerektirmez; CI'da ve yerelde kullanılabilir.
 *   node scripts/make-icns.js
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const buildDir = path.join(__dirname, '..', 'build');
const src = path.join(buildDir, 'icon-1024.png');
const setDir = path.join(buildDir, 'tvio.iconset');

if (process.platform !== 'darwin') {
  console.error('[icns] yalnızca macOS üzerinde çalışır (sips/iconutil).');
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error('[icns] build/icon-1024.png bulunamadı.');
  process.exit(1);
}

fs.rmSync(setDir, { recursive: true, force: true });
fs.mkdirSync(setDir, { recursive: true });
const pairs = [[16, 1], [16, 2], [32, 1], [32, 2], [128, 1], [128, 2], [256, 1], [256, 2], [512, 1], [512, 2]];
for (const [size, scale] of pairs) {
  const name = `icon_${size}x${size}${scale > 1 ? '@2x' : ''}.png`;
  execSync(`sips -z ${size * scale} ${size * scale} "${src}" --out "${path.join(setDir, name)}" >/dev/null`);
}
execSync(`iconutil -c icns "${setDir}" -o "${path.join(buildDir, 'tvio.icns')}"`);
fs.rmSync(setDir, { recursive: true, force: true });
console.log('[icns] build/tvio.icns üretildi');
