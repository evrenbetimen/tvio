'use strict';

/**
 * Test yardımcıları: electron'u taklit ederek src/services.js'i ve tarayıcı
 * betiği src/js/data.js'i düz Node.js içinde yükler.
 */

const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// services.js electron'u hem yüklenirken hem de çağrı anında (cacheDir) ister;
// bu yüzden kanca süreç boyunca açık kalır ve en son oluşturulan sahteyi döner.
let electronMock = null;
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron' && electronMock) return electronMock;
  return origLoad.call(this, request, parent, isMain);
};

/** Geçici userData klasörüyle sahte electron modülü üzerinden services.js yükler. */
function loadServices() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'tvio-test-'));
  electronMock = {
    app: { getPath: () => userData, getVersion: () => '0.0.0-test' },
    ipcMain: { handle() {} },
    dialog: {},
    shell: {},
    session: {},
  };

  const servicesPath = require.resolve(path.join(ROOT, 'src', 'services.js'));
  delete require.cache[servicesPath];
  return { services: require(servicesPath), userData };
}

/** src/js/data.js'i sahte bir window içinde çalıştırıp window.TVIO'yu döner. */
function loadTvio() {
  const code = fs.readFileSync(path.join(ROOT, 'src', 'js', 'data.js'), 'utf8');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'data.js' });
  return ctx.window.TVIO;
}

module.exports = { loadServices, loadTvio, ROOT };
