'use strict';

/**
 * tvio — ana süreç servisleri: playlist indirme/önbellek, ayrıştırma, IPC.
 * Hem main.js hem de test betikleri tarafından kullanılır.
 */

const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DEFAULT_PLAYLIST = 'https://iptv-org.github.io/iptv/index.m3u';

/* -------------------------------------------------------------------------- */
/*  Depolama                                                                   */
/* -------------------------------------------------------------------------- */

function cacheDir() {
  const { app } = require('electron');
  const dir = path.join(app.getPath('userData'), 'cache');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[tvio] yazılamadı:', err.message);
  }
}

/* --------------------------------------------------------------- playlist */

async function fetchPlaylist(url) {
  const file = path.join(cacheDir(), 'playlist.m3u');
  const metaFile = path.join(cacheDir(), 'playlist.meta.json');
  const meta = readJson(metaFile, null);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(60000),
      headers: { 'User-Agent': 'tvio/1.0 (+electron)' },
    });
    if (!res.ok) throw new Error('Sunucu ' + res.status + ' döndü');
    const text = await res.text();
    if (!/#EXTM3U/i.test(text)) throw new Error('Geçersiz M3U listesi');

    fs.writeFileSync(file, text);
    writeJson(metaFile, { url: url, at: Date.now(), bytes: Buffer.byteLength(text) });

    return { ok: true, text: text, cached: false, stale: false, at: Date.now(), source: url };
  } catch (err) {
    // önbellek yalnızca aynı adresten indirildiyse kullanılır; başka bir listeyi
    // yeni adresin içeriğiymiş gibi göstermeyelim
    if (fs.existsSync(file) && meta && meta.url === url) {
      return {
        ok: true,
        text: fs.readFileSync(file, 'utf8'),
        cached: true,
        stale: true,
        error: err.message,
        at: meta ? meta.at : 0,
        source: url,
      };
    }
    return { ok: false, error: err.message || 'Liste alınamadı', source: url };
  }
}

/**
 * #EXTINF satırında öznitelikleri kanal adından ayıran virgülün konumu:
 * tırnak dışındaki ilk virgül. Böylece "Fox 5, New York" gibi adlar bölünmez,
 * tvg-name="A, B" gibi tırnaklı değerlerdeki virgüller de atlanır.
 */
function nameSeparator(line) {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line.charAt(i);
    if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) return i;
  }
  return -1;
}

/** #EXTM3U metnini kanal nesnelerine dönüştürür. */
function parseM3U(text) {
  const lines = String(text || '').split(/\r?\n/);
  const channels = [];
  let info = null;
  let pendingUA = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.indexOf('#EXTINF') === 0) {
      const comma = nameSeparator(line);
      const attrs = line.slice(0, comma >= 0 ? comma : line.length);
      const name = comma >= 0 ? line.slice(comma + 1).trim() : 'İsimsiz Kanal';

      const get = function (key) {
        const m = attrs.match(new RegExp(key + '="([^"]*)"', 'i'));
        return m ? m[1] : '';
      };

      info = {
        name: name,
        logo: get('tvg-logo'),
        group: get('group-title') || 'Undefined',
        tvgId: get('tvg-id'),
        tvgName: get('tvg-name'),
        ua: get('http-user-agent'),
      };
      continue;
    }

    if (line.indexOf('#EXTVLCOPT') === 0) {
      const m = line.match(/http-user-agent=(.*)$/i);
      if (m) pendingUA = m[1].trim();
      continue;
    }

    if (line.charAt(0) === '#') continue;

    if (info && /^https?:\/\//i.test(line)) {
      channels.push({
        id: channels.length,
        name: info.name,
        logo: info.logo,
        group: info.group,
        tvgId: info.tvgId,
        ua: info.ua || pendingUA || '',
        url: line,
      });
      info = null;
      pendingUA = '';
    }
  }

  return channels;
}

/* -------------------------------------------------------------------------- */
/*  HTTP başlıkları (User-Agent yönlendirme)                                   */
/* -------------------------------------------------------------------------- */

const streamUA = { prefix: '', ua: '' };

function registerWebRequest() {
  const { session } = require('electron');
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['http://*/*', 'https://*/*'] },
    function (details, callback) {
      const headers = details.requestHeaders;
      if (streamUA.ua && streamUA.prefix && details.url.indexOf(streamUA.prefix) === 0) {
        headers['User-Agent'] = streamUA.ua;
        headers['X-Requested-With'] = 'XMLHttpRequest';
      }
      callback({ requestHeaders: headers });
    }
  );
}

/* -------------------------------------------------------------------------- */
/*  IPC                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * @param {object} opts
 * @param {() => import('electron').BrowserWindow|null} opts.getWindow
 */
function registerIpc(opts) {
  opts = opts || {};
  const getWindow = opts.getWindow || function () { return null; };

  ipcMain.handle('playlist:fetch', function (_e, url) {
    return fetchPlaylist(String(url || DEFAULT_PLAYLIST));
  });

  ipcMain.handle('playlist:parse', function (_e, text) {
    return parseM3U(String(text || ''));
  });

  ipcMain.handle('playlist:openLocal', async function () {
    const win = getWindow();
    const res = await dialog.showOpenDialog(win || undefined, {
      title: 'M3U listesi seçin',
      filters: [{ name: 'M3U listeleri', extensions: ['m3u', 'm3u8', 'txt'] }],
      properties: ['openFile'],
    });
    if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
    const file = res.filePaths[0];
    try {
      return { ok: true, text: fs.readFileSync(file, 'utf8'), name: path.basename(file) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('player:headers', function (_e, payload) {
    const url = payload && payload.url;
    const ua = payload && payload.ua;
    try {
      streamUA.prefix = url ? new URL(url).origin : '';
      streamUA.ua = ua || '';
    } catch (e) {
      streamUA.prefix = '';
      streamUA.ua = '';
    }
    return true;
  });

  ipcMain.handle('win:action', function (_e, action) {
    const win = getWindow();
    if (!win) return false;
    switch (action) {
      case 'minimize': win.minimize(); break;
      case 'maximize': win.isMaximized() ? win.unmaximize() : win.maximize(); break;
      case 'close': win.close(); break;
      case 'fullscreen': win.setFullScreen(!win.isFullScreen()); break;
      case 'isFullScreen': return win.isFullScreen();
      default: return false;
    }
    return true;
  });

  ipcMain.handle('app:openExternal', function (_e, url) {
    if (/^https?:/i.test(String(url))) shell.openExternal(url);
    return true;
  });

  ipcMain.handle('app:info', function () {
    const { app } = require('electron');
    return {
      version: app.getVersion(),
      platform: process.platform,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      defaultPlaylist: DEFAULT_PLAYLIST,
      userData: app.getPath('userData'),
    };
  });

  ipcMain.handle('app:clearCache', function () {
    const dir = cacheDir();
    ['playlist.m3u', 'playlist.meta.json'].forEach(function (f) {
      try { fs.unlinkSync(path.join(dir, f)); } catch (e) {}
    });
    return true;
  });
}

module.exports = {
  DEFAULT_PLAYLIST,
  fetchPlaylist,
  parseM3U,
  registerIpc,
  registerWebRequest,
  cacheDir,
  readJson,
  writeJson,
};
