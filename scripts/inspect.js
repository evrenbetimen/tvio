/** Yerleşim tanılama: ana sayfa satırlarının hesaplanmış stillerini yazdırır. */
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

  const out = await win.webContents.executeJavaScript(`(() => {
    const pick = (sel) => {
      const n = document.querySelector(sel);
      if (!n) return null;
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return {
        sel, display: cs.display, flexDirection: cs.flexDirection, gridTemplate: cs.gridTemplateColumns,
        width: Math.round(r.width), left: Math.round(r.left), top: Math.round(r.top),
        marginTop: cs.marginTop, marginBottom: cs.marginBottom,
      };
    };
    return [
      pick('#homeRows'), pick('#homeRows .row'), pick('#homeRows .row__head'),
      pick('#homeRows .row__head h2'), pick('#homeRows .row__more'), pick('#homeRows .row__scroll'),
      pick('#homeRows .row__scroll .card'), pick('#homeCats'), pick('.chips'),
    ];
  })()`);
  console.log(JSON.stringify(out, null, 2));
  app.exit(0);
});

setTimeout(() => app.exit(2), 90000);
