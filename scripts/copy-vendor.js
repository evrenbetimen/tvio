/**
 * hls.js dosyasını node_modules içinden src/vendor altına kopyalar.
 * Böylece uygulama tamamen yerel (offline) çalışır.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const candidates = [
  path.join(root, 'node_modules', 'hls.js', 'dist', 'hls.min.js'),
  path.join(root, 'node_modules', 'hls.js', 'dist', 'hls.js'),
];

const dest = path.join(root, 'src', 'vendor', 'hls.min.js');

try {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const source = candidates.find((p) => fs.existsSync(p));
  if (!source) {
    console.warn('[tvio] hls.js bulunamadı, önce "npm install" çalıştırın.');
    process.exit(0);
  }
  fs.copyFileSync(source, dest);
  console.log('[tvio] vendor hazır:', path.relative(root, dest));
} catch (err) {
  console.warn('[tvio] vendor kopyalanamadı:', err.message);
}
