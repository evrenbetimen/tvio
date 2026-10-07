/* ==========================================================================
   tvio — uygulama katmanı (durum, yükleme, gezinme, ayarlar, kısayollar)
   ========================================================================== */

(function (global) {
  'use strict';

  const T = global.TVIO;
  const UI = global.UI;
  const { esc, icon, num, norm, catKey, countryCode, COUNTRIES, FALLBACK } = T;
  const $ = (id) => document.getElementById(id);

  const DEFAULT_URL = 'https://iptv-org.github.io/iptv/index.m3u';
  const CMD = global.tvio && global.tvio.platform === 'darwin' ? '⌘' : 'Ctrl';
  const LS = {
    settings: 'tvio:settings:v1',
    fav: 'tvio:fav:v1',
    recent: 'tvio:recent:v1',
  };

  const settings = Object.assign(
    {
      url: DEFAULT_URL,
      sourceName: '',
      resume: true,
      autoNext: true,
      rememberVolume: true,
      volume: 0.8,
      muted: false,
      buffer: 12,
      accent: 'cyan',
      glass: true,
      motion: true,
    },
    readJSON(LS.settings, {})
  );

  const state = {
    channels: [],
    filtered: [],
    byKey: new Map(),
    favSet: new Set(),
    recentKeys: [],
    catCounts: {},
    catOrder: [],
    countryCounts: {},
    q: '',
    cat: '',
    country: '',
    quality: '',
    sort: 'az',
    libMode: 'all',
    view: 'home',
    searching: false,
    searchBefore: 'home',
    visible: 60,
    meta: { at: 0, cached: false, stale: false, source: DEFAULT_URL },
    loading: false,
  };

  const els = {
    boot: $('boot'), bootBar: $('bootBar'), bootMsg: $('bootMsg'),
    grid: $('grid'), gridEmpty: $('gridEmpty'), gridFoot: $('gridFoot'), btnMore: $('btnMore'),
    libTitle: $('libTitle'), libMeta: $('libMeta'),
    homeRows: $('homeRows'), homeCats: $('homeCats'), hero: $('hero'),
    catList: $('catList'), countAll: $('countAll'), countFav: $('countFav'), countRecent: $('countRecent'),
    crumbNow: $('crumbNow'), statusMsg: $('statusMsg'), statusDot: $('statusDot'), statusText: $('statusText'),
    totalMeta: $('totalMeta'), search: $('search'), searchClear: $('searchClear'),
    selCountry: $('selCountry'), selQuality: $('selQuality'), selSort: $('selSort'),
    content: $('content'), viewHome: $('view-home'), viewLib: $('view-library'), viewSet: $('view-settings'),
    clockTime: $('clockTime'), clockDate: $('clockDate'),
    winCtl: $('winCtl'),
  };

  /* ======================================================== depolama yardımcı */

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function saveSettings() {
    writeJSON(LS.settings, settings);
  }

  function keyOf(ch) {
    return ch.name + '||' + ch.url;
  }

  /* ============================================================ yükleme akışı */

  function boot(pct, msg) {
    els.bootBar.style.width = pct + '%';
    if (msg) els.bootMsg.textContent = msg;
  }

  function bootDone() {
    boot(100, 'Hazır');
    setTimeout(function () { els.boot.classList.add('is-done'); }, 340);
  }

  async function loadPlaylist(opts) {
    opts = opts || {};
    if (state.loading) return;
    state.loading = true;
    setStatus('load', 'Liste getiriliyor…');

    if (opts.silent !== true) {
      boot(8, 'Yayın listesi indiriliyor…');
      els.grid.innerHTML = UI.skeletons(12);
    } else {
      toast('info', 'Liste yenileniyor…');
      $('btnRefresh').classList.add('spin');
    }

    try {
      const res = await global.tvio.fetchPlaylist(settings.url);
      if (!res.ok) throw new Error(res.error || 'Liste alınamadı');

      boot(48, 'Kanallar ayrıştırılıyor…');
      const raw = await global.tvio.parsePlaylist(res.text);

      boot(74, 'Kategoriler hazırlanıyor…');
      enrich(raw);

      state.meta = {
        at: res.at || Date.now(),
        cached: !!res.cached,
        stale: !!res.stale,
        source: res.source || settings.url,
      };

      buildIndexes();
      renderAll();

      if (res.stale) setStatus('warn', 'Önbellek kullanılıyor');
      else setStatus('ok', 'Güncel');

      if (opts.silent === true) toast('ok', num(state.channels.length) + ' kanal yüklendi');
      else boot(96, 'Arayüz hazırlanıyor…');

      if (opts.silent !== true) {
        bootDone();
        maybeResume();
      }
    } catch (err) {
      console.error('[tvio]', err);
      setStatus('err', 'Liste alınamadı');
      if (opts.silent === true) {
        toast('err', 'Liste yenileşemedi: ' + err.message);
      } else {
        bootDone();
        renderAll();
        renderHome(true);
        toast('err', 'Liste yüklenemedi: ' + err.message);
      }
    } finally {
      state.loading = false;
      $('btnRefresh').classList.remove('spin');
    }
  }

  function enrich(raw) {
    const channels = new Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      const clean = T.cleanName(ch.name);
      ch.name = clean.name;
      ch.quality = clean.quality;
      ch.note = clean.note;
      ch.cc = countryCode(ch.tvgId);
      ch.__i = i;
      ch.key = keyOf(ch);
      ch._search = norm(
        [ch.name, ch.group, ch.tvgName || '', COUNTRIES[ch.cc] || '', ch.quality, ch.note].join(' ')
      );
      channels[i] = ch;
    }
    state.channels = channels;
  }

  function buildIndexes() {
    state.byKey = new Map();
    state.catCounts = {};
    state.countryCounts = {};

    for (const ch of state.channels) {
      state.byKey.set(ch.key, ch);
      const k = catKey(ch.group);
      state.catCounts[k] = (state.catCounts[k] || 0) + 1;
      if (ch.cc) state.countryCounts[ch.cc] = (state.countryCounts[ch.cc] || 0) + 1;
    }

    state.catOrder = Object.keys(state.catCounts).sort(function (a, b) {
      return state.catCounts[b] - state.catCounts[a];
    });

    state.favSet = new Set(readJSON(LS.fav, []).filter(function (k) { return state.byKey.has(k); }));
    state.recentKeys = readJSON(LS.recent, [])
      .filter(function (k) { return state.byKey.has(k); })
      .slice(0, 30);

    buildCountrySelect();
  }

  function buildCountrySelect() {
    const sel = els.selCountry;
    const entries = Object.keys(state.countryCounts)
      .filter(function (cc) { return !!COUNTRIES[cc]; })
      .map(function (cc) { return [cc, state.countryCounts[cc]]; })
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 90);

    sel.innerHTML =
      '<option value="">Tüm ülkeler</option>' +
      entries
        .map(function (e) {
          return '<option value="' + e[0] + '">' + T.flag(e[0]) + ' ' + esc(COUNTRIES[e[0]]) + ' (' + num(e[1]) + ')</option>';
        })
        .join('');
    sel.value = state.country;
  }

  /* ================================================================ filtrele */

  function matchQuality(ch, want) {
    const q = norm(ch.quality || '');
    switch (want) {
      case '4K': return /4k|uhd/.test(q);
      case '1080p': return /1080|fhd/.test(q);
      case 'HD': return q === 'hd' || /720/.test(q);
      case 'SD': return q === 'sd' || /576|480|360/.test(q);
      default: return true;
    }
  }

  function favChannels() {
    const out = [];
    const keys = readJSON(LS.fav, []);
    for (let i = 0; i < keys.length; i++) {
      const ch = state.byKey.get(keys[i]);
      if (ch) out.push(ch);
    }
    return out;
  }

  function recentChannels() {
    const out = [];
    for (let i = 0; i < state.recentKeys.length; i++) {
      const ch = state.byKey.get(state.recentKeys[i]);
      if (ch) out.push(ch);
    }
    return out;
  }

  function computeFiltered() {
    let arr =
      state.libMode === 'favorites' ? favChannels()
        : state.libMode === 'recent' ? recentChannels()
          : state.channels;

    if (state.cat) arr = arr.filter(function (c) { return catKey(c.group) === state.cat; });
    if (state.country) arr = arr.filter(function (c) { return c.cc === state.country; });
    if (state.quality) arr = arr.filter(function (c) { return matchQuality(c, state.quality); });
    if (state.q) arr = arr.filter(function (c) { return c._search.indexOf(state.q) >= 0; });

    const s = state.sort;
    if (s === 'az') arr = arr.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'tr'); });
    else if (s === 'za') arr = arr.slice().sort(function (a, b) { return b.name.localeCompare(a.name, 'tr'); });
    else if (s === 'cat') {
      arr = arr.slice().sort(function (a, b) {
        return catKey(a.group).localeCompare(catKey(b.group)) || a.name.localeCompare(b.name, 'tr');
      });
    } else if (s === 'country') {
      arr = arr.slice().sort(function (a, b) {
        return (a.cc || 'zz').localeCompare(b.cc || 'zz') || a.name.localeCompare(b.name, 'tr');
      });
    }

    state.filtered = arr;
    return arr;
  }

  /* ================================================================= render */

  function renderAll() {
    els.countAll.textContent = num(state.channels.length);
    els.countFav.textContent = num(state.favSet.size);
    els.countRecent.textContent = num(state.recentKeys.length);
    els.totalMeta.textContent = num(state.channels.length) + ' kanal';
    renderCats();
    renderHome();
    if (state.view === 'library') renderLibrary();
    updateAbout();
  }

  function renderCats() {
    els.catList.innerHTML = state.catOrder
      .map(function (k) { return UI.catButton(k, state.catCounts[k], state.cat); })
      .join('');
    els.homeCats.innerHTML = state.catOrder
      .slice(0, 14)
      .map(function (k) { return UI.chip(k, state.catCounts[k], state.cat); })
      .join('');
  }

  function pick(arr, n) {
    const out = [];
    const copy = arr.slice();
    for (let i = 0; i < n && copy.length; i++) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  }

  function renderHome(forceError) {
    const total = state.channels.length;
    let countries = 0;
    Object.keys(state.countryCounts).forEach(function (cc) { if (COUNTRIES[cc]) countries++; });

    if (forceError || !total) {
      els.hero.innerHTML = UI.hero({
        eyebrow: 'BAĞLANTI HATASI',
        title: 'Yayın listesi alınamadı',
        sub: 'İnternet bağlantınızı kontrol edin veya farklı bir M3U adresi deneyin. Daha önce indirilmiş bir liste varsa otomatik olarak kullanılacaktır.',
        primary: { label: 'Tekrar dene', action: 'reload', icon: 'refresh' },
        secondary: { label: 'Ayarlar', action: 'settings', icon: 'sliders' },
        stats: [
          { v: num(total), k: 'Kanal' },
          { v: String(state.catOrder.length), k: 'Kategori' },
          { v: String(countries), k: 'Ülke' },
        ],
      });
      els.homeRows.innerHTML = '';
      return;
    }

    const recent = recentChannels();
    const favs = favChannels();
    const tr = state.channels.filter(function (c) { return c.cc === 'tr'; });
    const resume = recent[0];

    els.hero.innerHTML = UI.hero(
      resume
        ? {
            eyebrow: 'KALDIĞIN YERDEN DEVAM ET',
            title: resume.name,
            sub: 'Son izlediğin kanal hazır. Tek dokunuşla yayını kaldığın yerden sürdürebilir, rastgele bir kanalla da keşfe çıkabilirsin.',
            primary: { label: 'Devam et', action: 'resume', icon: 'play' },
            secondary: { label: 'Rastgele kanal', action: 'random', icon: 'shuffle' },
            logo: resume.logo,
            stats: [
              { v: num(total), k: 'Kanal' },
              { v: String(state.catOrder.length), k: 'Kategori' },
              { v: String(countries), k: 'Ülke' },
              { v: num(state.favSet.size), k: 'Favori' },
            ],
          }
        : {
            eyebrow: 'HOŞ GELDİNİZ',
            title: 'Binlerce kanal, tek dokunuşla.',
            sub: 'tvio, iptv-org açık yayın listesini modern ve hızlı bir yayın deneyimine dönüştürür. Kategorilere göz atın, arayın, favorilerinizi oluşturun.',
            primary: { label: 'Rastgele kanal', action: 'random', icon: 'shuffle' },
            secondary: { label: 'Tüm kanallar', action: 'all', icon: 'grid' },
            stats: [
              { v: num(total), k: 'Kanal' },
              { v: String(state.catOrder.length), k: 'Kategori' },
              { v: String(countries), k: 'Ülke' },
              { v: state.meta.stale ? 'Önbellek' : 'Canlı', k: 'Kaynak' },
            ],
          }
    );

    const topCats = state.catOrder.filter(function (k) { return k !== 'Undefined'; }).slice(0, 3);
    const rows = [];

    if (recent.length) rows.push(UI.row('Son İzlenenler', recent.slice(0, 14), { action: 'view', arg: 'recent' }));
    if (favs.length) rows.push(UI.row('Favorilerin', favs.slice(0, 14), { action: 'view', arg: 'favorites' }));
    if (tr.length) rows.push(UI.row('Türkiye’den kanallar', tr.slice(0, 14), { action: 'country', arg: 'tr' }));

    topCats.forEach(function (k) {
      const info = T.CATEGORIES[k] || FALLBACK;
      const list = state.channels.filter(function (c) { return catKey(c.group) === k; }).slice(0, 14);
      rows.push(UI.row(info.tr + ' kanalları', list, { action: 'cat', arg: k }));
    });

    rows.push(UI.row('Rastgele keşfet', pick(state.channels, 14), {}));

    els.homeRows.innerHTML = rows.join('');
  }

  function libTitle() {
    if (state.searching && state.q) return 'Arama sonuçları';
    if (state.libMode === 'favorites') return 'Favoriler';
    if (state.libMode === 'recent') return 'Son İzlenenler';
    if (state.cat) return (T.CATEGORIES[state.cat] || FALLBACK).tr + ' kanalları';
    return 'Tüm Kanallar';
  }

  function renderLibrary() {
    const arr = computeFiltered();
    els.libTitle.textContent = libTitle();

    const parts = [num(arr.length) + ' kanal'];
    if (state.country && COUNTRIES[state.country]) parts.push(T.flag(state.country) + ' ' + COUNTRIES[state.country]);
    if (state.quality) parts.push(state.quality);
    if (state.q) parts.push('“' + state.q + '” için arama');
    if (state.meta.at) {
      parts.push(
        'Güncelleme: ' +
          new Date(state.meta.at).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          })
      );
    }
    els.libMeta.textContent = parts.join(' · ');

    state.visible = Math.max(60, Math.min(state.visible, arr.length || 60));
    paintGrid();

    els.gridEmpty.hidden = arr.length > 0;
    els.grid.hidden = arr.length === 0;
    UI.fillIcons(els.gridEmpty);
  }

  function paintGrid() {
    const arr = state.filtered;
    const slice = arr.slice(0, state.visible);
    els.grid.innerHTML = slice
      .map(function (c) { return UI.card(c, c.__i); })
      .join('');
    const rest = arr.length - slice.length;
    els.gridFoot.hidden = rest <= 0;
    if (rest > 0) els.btnMore.textContent = 'Daha fazla kanal göster (' + num(rest) + ')';
  }

  function renderGrid() {
    if (state.view !== 'library') return;
    const keep = state.visible;
    computeFiltered();
    state.visible = keep;
    paintGrid();
  }

  /* ================================================================ gezinme */

  function go(view, opts) {
    opts = opts || {};

    if (view === 'favorites' || view === 'recent' || view === 'library') {
      if (view !== 'library') state.libMode = view;
      else if (opts.mode) state.libMode = opts.mode;
      if (opts.cat !== undefined) state.cat = opts.cat;
      if (opts.country !== undefined) state.country = opts.country;
      state.visible = 60;
      state.view = 'library';
    } else {
      state.view = view;
    }

    document.body.dataset.view = state.view;
    [els.viewHome, els.viewLib, els.viewSet].forEach(function (v) { v.classList.remove('is-active'); });
    if (state.view === 'home') els.viewHome.classList.add('is-active');
    if (state.view === 'library') els.viewLib.classList.add('is-active');
    if (state.view === 'settings') els.viewSet.classList.add('is-active');

    document.querySelectorAll('#mainNav .nav__item').forEach(function (b) {
      const target = b.dataset.nav;
      const active =
        (state.view === 'home' && target === 'home') ||
        (state.view === 'settings' && target === 'settings') ||
        (state.view === 'library' &&
          ((target === 'library' && state.libMode === 'all' && !state.searching) ||
            (target === 'favorites' && state.libMode === 'favorites') ||
            (target === 'recent' && state.libMode === 'recent')));
      b.classList.toggle('is-active', active);
    });

    els.crumbNow.textContent = state.view === 'settings' ? 'Ayarlar' : libTitle();
    if (state.view === 'library') {
      renderCats(); // yan raydaki etkin kategori vurgusu güncel kalsın
      renderLibrary();
    }
    if (state.view === 'home') renderHome();
    els.content.scrollTop = 0;
  }

  /* ============================================================== oynatıcı */

  function playIndex(i, opts) {
    const ch = state.channels[i];
    if (!ch) return;
    global.Player.load(ch, opts);
    syncPlayingList();
  }

  function syncPlayingList() {
    const source = state.view === 'library' && state.filtered.length ? state.filtered : state.channels;
    global.Player.setList(source);
  }

  function randomChannel() {
    if (!state.channels.length) return;
    const pool = state.filtered.length && state.view === 'library' ? state.filtered : state.channels;
    const ch = pool[Math.floor(Math.random() * pool.length)];
    global.Player.load(ch);
    syncPlayingList();
    toast('ok', 'Rastgele: ' + ch.name);
  }

  function maybeResume() {
    if (!settings.resume) return;
    const rec = recentChannels()[0];
    if (!rec) return;
    global.Player.load(rec, { theater: false });
    syncPlayingList();
    toast('info', 'Kaldığın yerden: ' + rec.name);
  }

  /* ============================================================== favoriler */

  function isFavorite(ch) {
    return !!ch && state.favSet.has(ch.key);
  }

  function toggleFavorite(ch) {
    if (!ch) return;
    const list = readJSON(LS.fav, []);
    const idx = list.indexOf(ch.key);
    if (idx >= 0) {
      list.splice(idx, 1);
      state.favSet.delete(ch.key);
      toast('info', 'Favorilerden çıkarıldı');
    } else {
      list.unshift(ch.key);
      state.favSet.add(ch.key);
      toast('ok', 'Favorilere eklendi');
    }
    writeJSON(LS.fav, list.slice(0, 500));
    els.countFav.textContent = num(state.favSet.size);
    if (state.view === 'library' && state.libMode === 'favorites') renderLibrary();
    else if (state.view === 'home') renderHome();
    refreshFavButtons();
  }

  function refreshFavButtons() {
    document.querySelectorAll('[data-fav]').forEach(function (b) {
      const ch = state.channels[+b.dataset.fav];
      b.classList.toggle('is-on', isFavorite(ch));
    });
    global.Player.updateFavButtons();
  }

  function pushRecent(ch) {
    if (!ch) return;
    const list = state.recentKeys.filter(function (k) { return k !== ch.key; });
    list.unshift(ch.key);
    state.recentKeys = list.slice(0, 30);
    writeJSON(LS.recent, state.recentKeys);
    els.countRecent.textContent = num(state.recentKeys.length);
  }

  /* ================================================================== ayarlar */

  function applySettings() {
    document.body.dataset.accent = settings.accent || 'cyan';
    document.body.classList.toggle('no-blur', !settings.glass);
    document.body.classList.toggle('no-motion', !settings.motion);

    $('setUrl').value = settings.url;
    $('setResume').checked = !!settings.resume;
    $('setAutoNext').checked = !!settings.autoNext;
    $('setRememberVolume').checked = !!settings.rememberVolume;
    $('setGlass').checked = !!settings.glass;
    $('setMotion').checked = !!settings.motion;
    $('setBuffer').value = settings.buffer;
    $('bufferVal').textContent = settings.buffer + ' sn';
    $('setSourceHint').textContent = settings.sourceName || 'iptv-org açık listesi';
    document.querySelectorAll('.swatch').forEach(function (s) {
      s.classList.toggle('is-active', s.dataset.accent === settings.accent);
    });

    Object.assign(global.Player.settings, {
      autoNext: settings.autoNext,
      buffer: settings.buffer,
      rememberVolume: settings.rememberVolume,
      volume: settings.volume,
      muted: settings.muted,
    });

    $('volume').value = Math.round(settings.volume * 100);
    $('stVolume').value = Math.round(settings.volume * 100);
  }

  function saveVolume(v, muted) {
    if (!settings.rememberVolume) return;
    settings.volume = v;
    settings.muted = muted;
    saveSettings();
  }

  function updateAbout() {
    const box = $('aboutBox');
    if (!box || box.dataset.ready) return;
    global.tvio.getAppInfo().then(function (info) {
      box.dataset.ready = '1';
      box.innerHTML =
        '<b>tvio</b> sürüm <b>' + esc(info.version) + '</b><br>' +
        'Electron ' + esc(info.electron) + ' · Chromium ' + esc(info.chrome) + ' · Node ' + esc(info.node) + '<br>' +
        'Platform: <b>' + esc(info.platform) + '</b><br>' +
        'Kaynak: <a href="#" data-ext="' + esc(info.defaultPlaylist) + '">' + esc(info.defaultPlaylist) + '</a><br>' +
        'Veri klasörü: <span style="font-size:11.5px;color:var(--txt-3)">' + esc(info.userData) + '</span><br>' +
        '<span style="font-size:11.5px">Kanal verileri <a href="#" data-ext="https://github.com/iptv-org/iptv">iptv-org/iptv</a> projesinden alınır (CC0).</span>';
    });
  }

  /* ============================================================== bildirim */

  function toast(kind, msg) {
    UI.toast(kind, msg);
  }

  function setStatus(kind, text) {
    els.statusDot.className = 'dot' + (kind === 'ok' ? '' : ' ' + kind);
    els.statusText.textContent = text;
    if (text) els.statusMsg.textContent = text;
  }

  /* =============================================================== olaylar */

  function initNav() {
    document.addEventListener('click', function (e) {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const target = nav.dataset.nav;
        clearSearch();
        if (target === 'home' || target === 'settings') go(target);
        else if (target === 'library') go('library', { mode: 'all', cat: '', country: '' });
        else go(target);
        return;
      }

      const cat = e.target.closest('[data-cat]');
      if (cat) {
        clearSearch();
        go('library', { mode: 'all', cat: cat.dataset.cat });
        return;
      }

      const win = e.target.closest('[data-win]');
      if (win) {
        global.tvio.windowAction(win.dataset.win);
        return;
      }

      const ext = e.target.closest('[data-ext]');
      if (ext) {
        e.preventDefault();
        global.tvio.openExternal(ext.dataset.ext);
        return;
      }

      const action = e.target.closest('[data-action]');
      if (action) {
        handleAction(action.dataset.action, action.dataset.arg);
        return;
      }

      const favBtn = e.target.closest('[data-fav]');
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(state.channels[+favBtn.dataset.fav]);
        return;
      }

      const cardEl = e.target.closest('.card');
      if (cardEl && cardEl.dataset.i) {
        playIndex(+cardEl.dataset.i);
        return;
      }

      if (e.target.closest('[data-close]')) UI.modal.close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      const cardEl = e.target.closest ? e.target.closest('.card') : null;
      if (cardEl) {
        e.preventDefault();
        playIndex(+cardEl.dataset.i);
      }
    });
  }

  function clearSearch() {
    els.search.value = '';
    els.searchClear.hidden = true;
    state.q = '';
    state.searching = false;
  }

  function handleAction(action, arg) {
    switch (action) {
      case 'resume': {
        const rec = recentChannels()[0];
        if (rec) {
          global.Player.load(rec);
          syncPlayingList();
        }
        break;
      }
      case 'random': randomChannel(); break;
      case 'all': go('library', { mode: 'all', cat: '' }); break;
      case 'settings': go('settings'); break;
      case 'reload': loadPlaylist({ silent: false }); break;
      case 'cat': go('library', { mode: 'all', cat: arg }); break;
      case 'country': go('library', { mode: 'all', cat: '', country: arg }); break;
      case 'view': go(arg); break;
    }
  }

  function initSearch() {
    const run = T.debounce(function () {
      const v = els.search.value.trim();
      const next = norm(v);
      if (next && !state.searching) state.searchBefore = state.view === 'library' ? 'home' : state.view;
      state.q = next;
      state.searching = !!next;
      els.searchClear.hidden = !v;
      if (next) {
        state.visible = 60;
        if (state.view !== 'library') go('library', { mode: 'all', cat: '' });
        else {
          renderLibrary();
          els.crumbNow.textContent = 'Arama: ' + v;
        }
      } else {
        go(state.searchBefore || 'home');
      }
    }, 220);

    els.search.addEventListener('input', run);
    els.searchClear.addEventListener('click', function () {
      els.search.value = '';
      run();
      els.search.focus();
    });
  }

  function initFilters() {
    els.selCountry.addEventListener('change', function () {
      state.country = els.selCountry.value;
      state.visible = 60;
      renderLibrary();
    });
    els.selQuality.addEventListener('change', function () {
      state.quality = els.selQuality.value;
      state.visible = 60;
      renderLibrary();
    });
    els.selSort.addEventListener('change', function () {
      state.sort = els.selSort.value;
      state.visible = 60;
      renderLibrary();
    });

    const reset = function () {
      state.country = '';
      state.quality = '';
      state.cat = '';
      clearSearch();
      els.selCountry.value = '';
      els.selQuality.value = '';
      renderCats();
      renderLibrary();
      els.crumbNow.textContent = libTitle();
    };

    $('btnResetFilters').addEventListener('click', reset);
    $('btnEmptyReset').addEventListener('click', reset);
    $('btnAllCats').addEventListener('click', function () {
      state.cat = '';
      clearSearch();
      go('library', { mode: 'all', cat: '' });
      renderCats();
    });
    els.btnMore.addEventListener('click', function () {
      state.visible += 90;
      paintGrid();
    });
  }

  function initInfiniteScroll() {
    let ticking = false;
    els.content.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (state.view !== 'library') return;
        const el = els.content;
        if (el.scrollTop + el.clientHeight > el.scrollHeight - 600) {
          const rest = state.filtered.length - state.visible;
          if (rest > 0) {
            state.visible += 60;
            paintGrid();
          }
        }
      });
    });
  }

  function initSettingsPanel() {
    const bind = function (id, key, type) {
      const node = $(id);
      node.addEventListener('change', function () {
        settings[key] = type === 'bool' ? node.checked : type === 'num' ? +node.value : node.value;
        saveSettings();
        applySettings();
        toast('ok', 'Ayar kaydedildi');
      });
    };

    bind('setResume', 'resume', 'bool');
    bind('setAutoNext', 'autoNext', 'bool');
    bind('setRememberVolume', 'rememberVolume', 'bool');
    bind('setGlass', 'glass', 'bool');
    bind('setMotion', 'motion', 'bool');

    const buf = $('setBuffer');
    buf.addEventListener('input', function () {
      $('bufferVal').textContent = buf.value + ' sn';
    });
    buf.addEventListener('change', function () {
      settings.buffer = +buf.value;
      global.Player.settings.buffer = settings.buffer;
      saveSettings();
      toast('ok', 'Tampon ' + buf.value + ' sn olarak ayarlandı');
    });

    $('setSaveUrl').addEventListener('click', function () {
      const v = $('setUrl').value.trim();
      if (!/^https?:\/\//i.test(v)) return toast('err', 'Geçerli bir http(s) adresi girin');
      settings.url = v;
      settings.sourceName = '';
      saveSettings();
      $('setSourceHint').textContent = 'Özel liste';
      toast('ok', 'Liste adresi kaydedildi');
      loadPlaylist({ silent: false });
    });

    $('setReload').addEventListener('click', function () {
      loadPlaylist({ silent: true });
    });

    $('setLocal').addEventListener('click', async function () {
      const res = await global.tvio.openLocalPlaylist();
      if (res.canceled) return;
      if (!res.ok) return toast('err', 'Dosya okunamadı');
      const raw = await global.tvio.parsePlaylist(res.text);
      if (!raw.length) return toast('err', 'Dosyada kanal bulunamadı');
      enrich(raw);
      buildIndexes();
      settings.sourceName = res.name;
      saveSettings();
      $('setSourceHint').textContent = res.name;
      state.meta = { at: Date.now(), cached: false, stale: false, source: res.name };
      renderAll();
      toast('ok', res.name + ' yüklendi · ' + num(raw.length) + ' kanal');
      go('library', { mode: 'all', cat: '' });
    });

    $('setClearCache').addEventListener('click', async function () {
      await global.tvio.clearCache();
      $('setCacheHint').textContent = 'Temizlendi';
      toast('ok', 'Önbellek temizlendi');
    });

    $('accents').addEventListener('click', function (e) {
      const s = e.target.closest('.swatch');
      if (!s) return;
      settings.accent = s.dataset.accent;
      saveSettings();
      applySettings();
    });
  }

  function initTopbar() {
    $('btnRefresh').addEventListener('click', function () {
      loadPlaylist({ silent: true });
    });

    $('btnShortcuts').addEventListener('click', function () {
      UI.modal.open(
        'Klavye kısayolları',
        '<div class="keys">' +
          '<div><kbd>Space</kbd><span>Oynat / Duraklat</span></div>' +
          '<div><kbd>F</kbd><span>Tam ekran</span></div>' +
          '<div><kbd>M</kbd><span>Sesi kapat / aç</span></div>' +
          '<div><kbd>↑</kbd><kbd>↓</kbd><span>Önceki / Sonraki kanal</span></div>' +
          '<div><kbd>←</kbd><kbd>→</kbd><span>Ses seviyesi</span></div>' +
          '<div><kbd>Esc</kbd><span>Oynatıcıyı küçült</span></div>' +
          '<div><kbd>' + CMD + 'K</kbd><span>Kanal aramasına odaklan</span></div>' +
          '<div><kbd>R</kbd><span>Yayını yeniden yükle</span></div>' +
          '</div>'
      );
    });

    $('modal').addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) UI.modal.close();
    });

    $('npBtn').addEventListener('click', function () {
      if (global.Player.current) global.Player.theater();
      else toast('info', 'Önce bir kanal seçin');
    });
  }

  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'select' || tag === 'textarea';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        els.search.focus();
        els.search.select();
        return;
      }

      if (e.key === 'Escape') {
        if (!$('modal').hidden) return UI.modal.close();
        if (typing) {
          els.search.blur();
          return;
        }
        if (global.Player.mode === 'theater') global.Player.minimize();
        return;
      }

      if (typing) return;

      const p = global.Player;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          p.current ? p.toggle() : randomChannel();
          break;
        case 'f': case 'F': p.toggleFullscreen(); break;
        case 'm': case 'M': p.toggleMute(); break;
        case 'r': case 'R': p.reload(); break;
        case 'ArrowUp':
          e.preventDefault();
          p.current ? p.prev() : playFirst();
          break;
        case 'ArrowDown':
          e.preventDefault();
          p.current ? p.next() : playFirst();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          p.changeVolume(-0.05);
          break;
        case 'ArrowRight':
          e.preventDefault();
          p.changeVolume(0.05);
          break;
      }
    });
  }

  function playFirst() {
    const pool = state.view === 'library' && state.filtered.length ? state.filtered : state.channels;
    if (!pool.length) return;
    global.Player.load(pool[0]);
    syncPlayingList();
  }

  function initClock() {
    const tick = function () {
      const d = new Date();
      els.clockTime.textContent = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      els.clockDate.textContent = d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
    };
    tick();
    setInterval(tick, 10000);
  }

  function initWindowControls() {
    if (global.tvio.platform !== 'darwin') els.winCtl.hidden = false;
    global.tvio.onFullscreen(function (isFs) {
      $('stFull').innerHTML = icon(isFs ? 'minimize' : 'maximize');
    });
  }

  /* ================================================================== başlangıç */

  async function start() {
    UI.fillIcons(document);
    if (CMD !== '⌘') {
      document.querySelectorAll('kbd').forEach(function (k) {
        if (k.textContent.indexOf('⌘') >= 0) k.textContent = 'Ctrl K';
      });
    }
    applySettings();
    initNav();
    initSearch();
    initFilters();
    initInfiniteScroll();
    initSettingsPanel();
    initTopbar();
    initKeyboard();
    initClock();
    initWindowControls();

    global.Player.hooks.onChannel = function (ch) {
      pushRecent(ch);
      if (state.view === 'home') renderHome();
      els.crumbNow.textContent = libTitle();
    };
    global.Player.hooks.onFavorite = function (ch) { toggleFavorite(ch); };
    global.Player.hooks.isFavorite = function (ch) { return isFavorite(ch); };
    global.Player.hooks.onStatus = function (text) {
      if (text) els.statusMsg.textContent = text;
    };
    global.Player.hooks.onMode = function () {};
    global.Player.init();

    els.grid.innerHTML = UI.skeletons(12);
    updateAbout();
    await loadPlaylist({ silent: false });
  }

  /* ------------------------------------------------------------ dışa açık */
  global.App = {
    toast: toast,
    renderGrid: renderGrid,
    isFavorite: isFavorite,
    saveVolume: saveVolume,
    saveSettings: saveSettings,
    state: state,
    settings: settings,
    loadPlaylist: loadPlaylist,
    go: go,
    playIndex: playIndex,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
