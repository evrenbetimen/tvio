/**
 * tvio duman testi — uygulamayı yükler, konsol hatalarını toplar ve
 * ana görünümlerin ekran görüntülerini kaydeder.
 *   npx electron scripts/smoke.js
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const services = require('../src/services');

const OUT = path.join(app.getPath('temp'), 'tvio-smoke');
fs.mkdirSync(OUT, { recursive: true });
// her çalıştırmada temiz profil: localStorage/önbellek bağımsız olsun
app.setPath('userData', path.join(OUT, 'profile-' + Date.now()));

const problems = [];
const logs = [];

function fmtMessage(...args) {
  if (args.length > 1 && typeof args[1] === 'object' && args[1] !== null && 'message' in args[1]) {
    const d = args[1];
    return { level: d.level, message: d.message, line: d.lineNumber, source: d.sourceId };
  }
  return { level: args[1], message: args[2], line: args[3], source: args[4] };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(fn, timeout, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      if (await fn()) return true;
    } catch (e) {}
    await wait(400);
  }
  problems.push('zaman aşımı: ' + label);
  return false;
}

app.whenReady().then(async () => {
  services.registerWebRequest();
  services.registerIpc({ getWindow: () => win });

  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    show: true,
    backgroundColor: '#05070d',
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  win.webContents.on('console-message', (...args) => {
    const m = fmtMessage(...args);
    const line = `[renderer:${m.level}] ${m.message} (${m.source}:${m.line})`;
    logs.push(line);
    const isWarning =
      /Electron Security Warning/i.test(m.message) || m.level === 1 || m.level === 2;
    if (/Uncaught|TypeError|ReferenceError|SyntaxError|ERR_|No handler registered/i.test(m.message)) {
      problems.push(line);
    } else if (isWarning) {
      logs.push('  (uyarı/yok sayıldı)');
    }
  });

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    problems.push('sayfa yüklenemedi: ' + code + ' ' + desc);
  });

  win.webContents.on('render-process-gone', (_e, details) => {
    problems.push('render süreci öldü: ' + JSON.stringify(details));
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  await waitUntil(
    () => win.webContents.executeJavaScript('window.App ? App.state.channels.length : 0').then((n) => n > 100),
    45000,
    'kanal listesi'
  );

  await wait(1500);
  await win.webContents.executeJavaScript(
    "document.getElementById('boot').classList.add('is-done'); 'ok'"
  );
  await wait(800);

  function pixelAt(img, x, y) {
    const b = img.toBitmap(); // BGRA
    const w = img.getSize().width;
    const i = ((y * w) + x) * 4;
    return [b[i + 2], b[i + 1], b[i], b[i + 3]]; // RGBA
  }

  const shot = async (name) => {
    const img = await win.webContents.capturePage();
    const file = path.join(OUT, Date.now() + '-' + name + '.png');
    fs.writeFileSync(file, img.toPNG());
    console.log('[shot]', file);
    if (name === '1-home') {
      // başlık vurgu çubuğu ve ilk kart konumu — yerleşimin doğru olduğunu doğrular
      const px = [[282, 585], [300, 640], [700, 580]].map(([x, y]) => pixelAt(img, x, y));
      console.log('[pixels]', JSON.stringify(px));
      const [bar, card, empty] = px;
      const ok = bar[2] > 150 && card[0] > 20 && empty[0] < 14;
      console.log('[layout-check]', ok ? 'yerleşim doğru' : 'ŞÜPHELİ YERLEŞİM');
      if (!ok) problems.push('ana sayfa yerleşimi şüpheli: ' + JSON.stringify(px));
    }
  };

  const info = await win.webContents.executeJavaScript(`(() => ({
    channels: App.state.channels.length,
    categories: App.state.catOrder.length,
    countries: Object.keys(App.state.countryCounts).length,
    heroTitle: (document.querySelector('.hero__title')||{}).textContent,
    railCats: document.querySelectorAll('#catList .cat').length,
    homeRows: document.querySelectorAll('#homeRows .row').length,
    cardsHome: document.querySelectorAll('#homeRows .card').length,
    chips: document.querySelectorAll('#homeCats .chip').length,
    icons: document.querySelectorAll('[data-ico-done]').length,
    tr: App.state.channels.filter(c => c.cc === 'tr').length,
  }))()`);
  console.log('[info]', JSON.stringify(info, null, 2));

  const layout = await win.webContents.executeJavaScript(`(() => {
    const row = document.querySelector('#homeRows .row');
    if (!row) return { row: null };
    const head = row.querySelector('.row__head');
    const sc = row.querySelector('.row__scroll');
    const cs = getComputedStyle(row);
    const r = row.getBoundingClientRect();
    return {
      rowDisplay: cs.display, rowW: Math.round(r.width), rowLeft: Math.round(r.left),
      headTop: Math.round(head.getBoundingClientRect().top),
      headW: Math.round(head.getBoundingClientRect().width),
      scrollTop: Math.round(sc.getBoundingClientRect().top),
      clock: document.getElementById('clockTime').textContent,
      innerW: window.innerWidth, innerH: window.innerHeight,
      dpr: window.devicePixelRatio,
    };
  })()`);
  console.log('[layout]', JSON.stringify(layout), '| main clock:', new Date().toLocaleTimeString('tr-TR'));

  await shot('1-home');

  const iconCheck = await win.webContents.executeJavaScript(`(() => {
    const bad = [];
    document.querySelectorAll('.ico').forEach(n => {
      const r = n.getBoundingClientRect();
      if (r.width > 44 || r.height > 44) bad.push('span.' + (n.className||'') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    document.querySelectorAll('svg').forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.width > 64 || r.height > 64) bad.push('svg ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' parent=' + s.parentElement.className);
    });
    return bad.slice(0, 12);
  })()`);
  console.log('[icons] dev ikon:', JSON.stringify(iconCheck));
  if (iconCheck.length) problems.push('dev ikonlar: ' + iconCheck.join(' | '));

  // favori ekleme
  const fav = await win.webContents.executeJavaScript(`(async () => {
    const before = App.state.favSet.size;
    const ch = App.state.channels.find(c => c.cc === 'tr');
    App.state.channels[ch.__i] && document.querySelector('[data-nav="library"]').click();
    await new Promise(r => setTimeout(r, 300));
    const btn = document.querySelector('#grid .card [data-fav]');
    btn.click();
    await new Promise(r => setTimeout(r, 300));
    return { before, after: App.state.favSet.size,
             count: document.getElementById('countFav').textContent };
  })()`);
  console.log('[fav]', JSON.stringify(fav));
  if (!(fav.after > fav.before)) problems.push('favori ekleme çalışmıyor');
  await shot('2-fav');

  await win.webContents.executeJavaScript("document.querySelector('[data-nav=\"library\"]').click(); 'ok'");
  await wait(1400);
  const lib = await win.webContents.executeJavaScript(`(() => ({
    title: document.getElementById('libTitle').textContent,
    meta: document.getElementById('libMeta').textContent,
    cards: document.querySelectorAll('#grid .card').length,
    empty: document.getElementById('gridEmpty').hidden,
    countries: document.getElementById('selCountry').options.length,
  }))()`);
  console.log('[library]', JSON.stringify(lib, null, 2));
  await shot('2-library');

  // arama
  await win.webContents.executeJavaScript(`(() => {
    const s = document.getElementById('search');
    s.value = 'trt';
    s.dispatchEvent(new Event('input'));
    return 'ok';
  })()`);
  await wait(900);
  const search = await win.webContents.executeJavaScript(`(() => ({
    title: document.getElementById('libTitle').textContent,
    meta: document.getElementById('libMeta').textContent,
    cards: document.querySelectorAll('#grid .card').length,
  }))()`);
  console.log('[search]', JSON.stringify(search, null, 2));
  await shot('2b-search');

  await win.webContents.executeJavaScript("document.querySelector('[data-nav=\"settings\"]').click(); 'ok'");
  await wait(900);
  await shot('3-settings');

  const play = await win.webContents.executeJavaScript(`(async () => {
    const ch = App.state.channels.find(c => /\\.m3u8/i.test(c.url) && c.cc === 'tr');
    if (!ch) return { ok:false, why:'tr hls kanal yok' };
    App.playIndex(ch.__i);
    await new Promise(r => setTimeout(r, 9000));
    const v = document.getElementById('video');
    return { ok:true, name:ch.name, url:ch.url, mode:Player.mode,
             paused:v.paused, readyState:v.readyState,
             err:(v.error||{}).message || null,
             buffered: v.buffered.length ? v.buffered.end(v.buffered.length-1) : 0 };
  })()`);
  console.log('[play]', JSON.stringify(play, null, 2));
  await shot('4-player');

  // küçük (mini) mod + kapatma
  await win.webContents.executeJavaScript("Player.minimize(); 'ok'");
  await wait(900);
  const mini = await win.webContents.executeJavaScript(`(() => ({
    mode: Player.mode,
    stageClass: document.getElementById('stage').className,
    videoPlaying: !document.getElementById('video').paused,
  }))()`);
  console.log('[mini]', JSON.stringify(mini));
  if (mini.mode !== 'mini') problems.push('mini mod çalışmıyor');
  await shot('5-mini');

  console.log('\n=== SONUÇ ===');
  console.log('kanal:', info.channels, '| kategori:', info.categories, '| ülke:', info.countries, '| tr:', info.tr);
  if (problems.length) {
    console.log('SORUNLAR (' + problems.length + '):');
    problems.slice(0, 30).forEach((p) => console.log(' -', p));
  } else {
    console.log('Hata yok.');
  }
  fs.writeFileSync(path.join(OUT, 'console.log'), logs.join('\n'));
  app.exit(problems.length ? 1 : 0);
});

setTimeout(() => {
  console.error('genel zaman aşımı');
  app.exit(2);
}, 180000);
