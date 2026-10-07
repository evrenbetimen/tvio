/**
 * tvio uygulama ikonunu üretir (macOS .icns + genel .png).
 *   npm run icon
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'build');
const sizes = [16, 32, 64, 128, 256, 512, 1024];

const HTML = (s) => `
<html><body style="margin:0;background:transparent">
<svg width="${s}" height="${s}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#7c5cff"/>
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1224"/><stop offset="100%" stop-color="#05070d"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="230" fill="url(#bg)"/>
  <rect x="118" y="212" width="788" height="560" rx="120" fill="none" stroke="url(#g)" stroke-width="62"/>
  <path d="M432 372v240l232-120z" fill="url(#g)"/>
  <path d="M360 862h304" stroke="url(#g)" stroke-width="62" stroke-linecap="round"/>
</svg>
</body></html>`;

app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'icon.html');
  fs.writeFileSync(file, HTML(1024));

  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { sandbox: true },
  });

  await win.loadFile(file);
  await new Promise((r) => setTimeout(r, 500));

  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, 'icon-1024.png'), img.toPNG());
  console.log('[icon] icon-1024.png üretildi');

  if (process.platform === 'darwin') {
    try {
      const setDir = path.join(outDir, 'tvio.iconset');
      fs.rmSync(setDir, { recursive: true, force: true });
      fs.mkdirSync(setDir, { recursive: true });
      const src = path.join(outDir, 'icon-1024.png');
      const pairs = [[16, 1], [32, 1], [32, 2], [64, 1], [128, 1], [128, 2], [256, 1], [256, 2], [512, 1], [512, 2]];
      for (const [size, scale] of pairs) {
        const name = `icon_${size}x${size}${scale > 1 ? '@2x' : ''}.png`;
        execSync(`sips -z ${size * scale} ${size * scale} "${src}" --out "${path.join(setDir, name)}"`);
      }
      execSync(`iconutil -c icns "${setDir}" -o "${path.join(outDir, 'tvio.icns')}"`);
      console.log('[icon] tvio.icns üretildi');
    } catch (err) {
      console.warn('[icon] icns üretilemedi:', err.message);
    }
  }

  app.quit();
});
