/** Teatre yan paneli tanılama: panel/liste geometrisi + sonsuz kaydırma davranışı. */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const services = require('../src/services');

app.whenReady().then(async () => {
  services.registerWebRequest();
  services.registerIpc({ getWindow: () => null });

  const win = new BrowserWindow({
    width: 1480, height: 920, show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false, webSecurity: false,
    },
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  for (let i = 0; i < 60; i++) {
    const n = await win.webContents.executeJavaScript('window.App ? App.state.channels.length : 0');
    if (n > 100) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // Bir kanalı teatre modunda aç (yayın çekmeye gerek yok, sadece panel açılsın)
  await win.webContents.executeJavaScript(`
    (() => {
      const ch = App.state.channels.find(c => c.group && c.group.toUpperCase().includes('NEWS'))
              || App.state.channels[0];
      App.playIndex(App.state.channels.indexOf(ch));
      Player.setList(App.state.channels);
      return ch.name + ' | ' + ch.group;
    })()
  `).then((s) => console.log('[kanal]', s));

  await new Promise((r) => setTimeout(r, 1200));
  await win.webContents.executeJavaScript('window.Player.theater(); document.body.className')
    .then((s) => console.log('[mod]', s));

  await new Promise((r) => setTimeout(r, 800));

  const geo = await win.webContents.executeJavaScript(`(() => {
    const r = (sel) => {
      const n = document.querySelector(sel);
      if (!n) return { sel, yok: true };
      const b = n.getBoundingClientRect();
      const cs = getComputedStyle(n);
      return {
        sel,
        l: Math.round(b.left), t: Math.round(b.top),
        w: Math.round(b.width), h: Math.round(b.height),
        r: Math.round(b.right), bot: Math.round(b.bottom),
        pad: cs.padding, ovf: cs.overflowY, disp: cs.display, flex: cs.flex,
        scrollH: n.scrollHeight, clientH: n.clientHeight,
        scrollW: n.scrollWidth, clientW: n.clientWidth,
      };
    };
    const panel = document.querySelector('.stage__panel');
    const list = document.querySelector('.sp__list');
    const items = document.querySelectorAll('.spitem');
    return {
      ekran: { w: innerWidth, h: innerHeight },
      stage: r('#stage'),
      video: r('.stage__video'),
      panel: r('.stage__panel'),
      spList: r('.sp__list'),
      spInner: r('#spList'),
      spLabel: r('.sp__label'),
      sonItem: items.length ? (() => {
        const n = items[items.length - 1];
        const b = n.getBoundingClientRect();
        const lb = list.getBoundingClientRect();
        return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width),
                 sagBosluk: Math.round(lb.right - b.right) };
      })() : null,
      itemSayisi: items.length,
      panelScroll: panel ? { scrollH: panel.scrollHeight, clientH: panel.clientHeight } : null,
      listScroll: list ? { scrollH: list.scrollHeight, clientH: list.clientHeight } : null,
      bodyMode: document.body.className,
    };
  })()`);
  console.log('[geometri]', JSON.stringify(geo, null, 2));

  // Liste kaydırılıp daha fazla kanal yükleniyor mu?
  const scrollTest = await win.webContents.executeJavaScript(`(async () => {
    const list = document.querySelector('.sp__list');
    const before = document.querySelectorAll('.spitem').length;
    if (!list) return { hata: 'sp__list yok' };
    list.scrollTop = list.scrollHeight;
    await new Promise(r => setTimeout(r, 600));
    const after = document.querySelectorAll('.spitem').length;
    list.scrollTop = list.scrollHeight;
    await new Promise(r => setTimeout(r, 600));
    const after2 = document.querySelectorAll('.spitem').length;
    return {
      once: before, sonra: after, sonra2: after2,
      scrollH: list.scrollHeight, clientH: list.clientHeight,
      sayac: (document.getElementById('spCount')||{}).textContent,
      listeBitti: list.scrollTop + list.clientHeight >= list.scrollHeight - 2,
    };
  })()`);
  console.log('[kaydırma]', JSON.stringify(scrollTest, null, 2));

  // Panel sağ kenara dayalı mı?
  const edge = await win.webContents.executeJavaScript(`(() => {
    const p = document.querySelector('.stage__panel').getBoundingClientRect();
    const i = document.querySelector('.spitem');
    const l = document.querySelector('.sp__list').getBoundingClientRect();
    const ir = i ? i.getBoundingClientRect() : null;
    return {
      ekranGenisligi: innerWidth,
      panelSag: Math.round(p.right),
      panelGenislik: Math.round(p.width),
      listSag: Math.round(l.right),
      listSol: Math.round(l.left),
      itemSag: ir ? Math.round(ir.right) : null,
      itemSol: ir ? Math.round(ir.left) : null,
      panelSagdaKenarBosluk: Math.round(innerWidth - p.right),
    };
  })()`);
  console.log('[kenar]', JSON.stringify(edge, null, 2));

  // ekran görüntüsü: panelin sağ kenara dayandığını piksel ile doğrula
  const png = path.join('/tmp', 'tvio-panel.png');
  const shot = await win.webContents.capturePage();
  require('fs').writeFileSync(png, shot.toPNG());
  console.log('[shot]', png);

  app.exit(0);
});

setTimeout(() => app.exit(2), 120000);
