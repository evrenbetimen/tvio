/**
 * Windows için build/icon.ico üretir (PNG-ICO, sips ile boyutlandırma).
 *   npm run ico
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const src = path.join(buildDir, 'icon-1024.png');
const out = path.join(buildDir, 'icon.ico');
const tmp = path.join(buildDir, '.ico-tmp');

if (!fs.existsSync(src)) {
  console.error('[ico] önce "npm run icon" ile icon-1024.png üretin.');
  process.exit(1);
}

const sizes = [16, 24, 32, 48, 64, 128, 256];
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

// PNG'leri hazırla
const images = sizes.map((s) => {
  const f = path.join(tmp, `${s}.png`);
  execSync(`sips -z ${s} ${s} "${src}" --out "${f}" >/dev/null`);
  return { size: s, data: fs.readFileSync(f) };
});

// ICO kabuğu: ICONDIR + ICONDIRENTRY* + PNG verileri
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = icon
header.writeUInt16LE(images.length, 4);

let offset = 6 + images.length * 16;
const entries = [];
for (const img of images) {
  const e = Buffer.alloc(16);
  e.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width
  e.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height
  e.writeUInt8(0, 2);  // palette
  e.writeUInt8(0, 3);  // reserved
  e.writeUInt16LE(1, 4);  // planes
  e.writeUInt16LE(32, 6); // bpp
  e.writeUInt32LE(img.data.length, 8);
  e.writeUInt32LE(offset, 12);
  entries.push(e);
  offset += img.data.length;
}

fs.writeFileSync(out, Buffer.concat([header, ...entries, ...images.map((i) => i.data)]));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`[ico] ${path.relative(root, out)} üretildi (${sizes.join(', ')} px)`);
