/** PNG içindeki pikselleri okur: yakalamanın canlı olup olmadığını doğrular.
 *  npx electron scripts/pixel.js <png> [x,y ...]
 */
const { nativeImage, app } = require('electron');

const file = process.argv[2];
const pts = process.argv.slice(3).map((s) => s.split(',').map(Number));

const img = nativeImage.createFromPath(file);
if (img.isEmpty()) {
  console.error('resim okunamadı:', file);
  app.exit(1);
}

const { width, height } = img.getSize();
const b = img.toBitmap();
const at = (x, y) => {
  const i = (y * width + x) * 4;
  return { bgra: [b[i], b[i + 1], b[i + 2], b[i + 3]] };
};

// kırmızı marker (#ff0055) sayımı
let red = 0;
for (let i = 0; i < b.length; i += 4) {
  const r = b[i + 2], g = b[i + 1], bl = b[i];
  if (r > 220 && g < 60 && bl > 60 && bl < 160) red++;
}

console.log(JSON.stringify({
  file, width, height,
  redPixels: red,
  redPct: +((red / (width * height)) * 100).toFixed(3),
  samples: pts.map(([x, y]) => ({ xy: [x, y], ...at(Math.min(x, width - 1), Math.min(y, height - 1)) })),
}, null, 2));
app.exit(0);
