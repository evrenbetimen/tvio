'use strict';

/**
 * tvio - ana süreç (main process)
 * Pencere yönetimi, menü ve pencere durumu. Servisler src/services.js içinde.
 */

const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const services = require('./services');

const isMac = process.platform === 'darwin';

let win = null;
let windowState = null;

/* -------------------------------------------------------------------------- */
/*  Pencere                                                                    */
/* -------------------------------------------------------------------------- */

function createWindow() {
  const boundsFile = path.join(app.getPath('userData'), 'window.json');
  windowState = services.readJson(boundsFile, null);

  const opts = {
    width: (windowState && windowState.width) || 1480,
    height: (windowState && windowState.height) || 920,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#05070d',
    title: 'tvio',
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac
      ? {}
      : { titleBarOverlay: { color: '#05070d', symbolColor: '#dfe6f5', height: 46 } }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // IPTV kaynakları CORS başlığı göndermediği için same-origin kapatılır.
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  };

  if (windowState && windowState.x != null && windowState.y != null) {
    opts.x = windowState.x;
    opts.y = windowState.y;
  }

  win = new BrowserWindow(opts);

  win.once('ready-to-show', function () { win.show(); });
  win.on('close', saveWindowState);
  win.on('enter-full-screen', function () { win.webContents.send('win:fullscreen', true); });
  win.on('leave-full-screen', function () { win.webContents.send('win:fullscreen', false); });

  win.webContents.setWindowOpenHandler(function (payload) {
    if (/^https?:/i.test(payload.url)) require('electron').shell.openExternal(payload.url);
    return { action: 'deny' };
  });

  win.webContents.on('did-fail-load', function (_e, code, desc) {
    console.error('[tvio] yükleme hatası', code, desc);
  });

  win.webContents.on('did-finish-load', function () {
    console.log('[tvio] arayüz yüklendi');
  });

  // kendi kendine kapanma (test için): TVIO_EXIT_AFTER=15000 npm start
  if (process.env.TVIO_EXIT_AFTER) {
    const ms = parseInt(process.env.TVIO_EXIT_AFTER, 10) || 8000;
    setTimeout(function () {
      console.log('[tvio] test süresi doldu, kapanıyor');
      app.quit();
    }, ms);
  }

  win.loadFile(path.join(__dirname, 'index.html'));
}

function saveWindowState() {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds();
  services.writeJson(path.join(app.getPath('userData'), 'window.json'), {
    x: b.x, y: b.y, width: b.width, height: b.height,
  });
}

/* -------------------------------------------------------------------------- */
/*  Menü                                                                       */
/* -------------------------------------------------------------------------- */

function createMenu() {
  const tpl = isMac
    ? [
        { label: 'tvio', submenu: [
          { role: 'about', label: 'tvio Hakkında' },
          { type: 'separator' },
          { role: 'hide', label: "tvio'yu Gizle" },
          { role: 'hideOthers', label: 'Diğerlerini Gizle' },
          { role: 'unhide', label: 'Tümünü Göster' },
          { type: 'separator' },
          { role: 'quit', label: 'Çıkış' },
        ] },
        { label: 'Düzen', submenu: [
          { role: 'undo', label: 'Geri Al' },
          { role: 'redo', label: 'Yinele' },
          { type: 'separator' },
          { role: 'cut', label: 'Kes' },
          { role: 'copy', label: 'Kopyala' },
          { role: 'paste', label: 'Yapıştır' },
          { role: 'selectAll', label: 'Tümünü Seç' },
        ] },
        { label: 'Görünüm', submenu: [
          { role: 'reload', label: 'Yeniden Yükle' },
          { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Gerçek Boyut' },
          { role: 'zoomIn', label: 'Yakınlaştır' },
          { role: 'zoomOut', label: 'Uzaklaştır' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Tam Ekran' },
        ] },
        { label: 'Pencere', submenu: [
          { role: 'minimize', label: 'Simge Durumuna Küçült' },
          { role: 'zoom', label: 'Büyüt' },
          { role: 'close', label: 'Pencereyi Kapat' },
        ] },
      ]
    : [
        { label: 'Dosya', submenu: [{ role: 'quit', label: 'Çıkış' }] },
        { label: 'Görünüm', submenu: [
          { role: 'reload', label: 'Yeniden Yükle' },
          { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Tam Ekran' },
        ] },
      ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

/* -------------------------------------------------------------------------- */
/*  Yaşam döngüsü                                                              */
/* -------------------------------------------------------------------------- */

app.whenReady().then(function () {
  services.registerWebRequest();
  services.registerIpc({ getWindow: function () { return win; } });
  createMenu();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (!isMac) app.quit();
});

app.on('will-quit', function () {
  globalShortcut.unregisterAll();
});
