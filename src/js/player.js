/* ==========================================================================
   tvio — oynatıcı çekirdeği (hls.js + <video> + sahne yönetimi)
   ========================================================================== */

(function (global) {
  'use strict';

  const { esc, icon, cleanName, catInfo, countryCode, COUNTRIES, flag } = global.TVIO;

  const $ = (id) => document.getElementById(id);

  const el = {
    body: document.body,
    stage: $('stage'),
    video: $('video'),
    stLogo: $('stLogo'), stName: $('stName'), stMeta: $('stMeta'), stLive: $('stLive'),
    stCenter: $('stCenter'), stSpinner: $('stSpinner'), stError: $('stError'),
    stErrorMsg: $('stErrorMsg'), stBigPlay: $('stBigPlay'),
    stPlay: $('stPlay'), stPrev: $('stPrev'), stNextCh: $('stNextCh'),
    stMute: $('stMute'), stVolume: $('stVolume'), stState: $('stState'),
    stFull: $('stFull'), stPip: $('stPip'), stClose: $('stClose'), stMini: $('stMini'),
    stFav: $('stFav'), stBuffer: $('stBuffer'), stNextInfo: $('stNextInfo'),
    stRetry: $('stRetry'), stNext: $('stNext'),
    spLogo: $('spLogo'), spName: $('spName'), spTags: $('spTags'), spDesc: $('spDesc'),
    spList: $('spList'), spCount: $('spCount'), spFav: $('spFav'), spOpen: $('spOpen'), spCopy: $('spCopy'),
    spWrap: $('spListWrap'),
    panel: $('stagePanel'),
    npName: $('npName'), npMeta: $('npMeta'), npLogo: $('npLogo'), npLive: $('npLive'),
    volume: $('volume'), btnMute: $('btnMute'),
  };

  let hls = null;
  let current = null;
  let list = [];
  let mode = 'hidden';
  let networkRetry = 0;
  let mediaRetry = 0;
  let autoSkipCount = 0;
  let fatalTimer = null;
  let errorCard = false;

  const settings = {
    autoNext: false,
    buffer: 12,
    rememberVolume: true,
    volume: 0.8,
    muted: false,
  };

  const hooks = {
    onChannel: null,   // (channel) => void
    onMode: null,      // (mode) => void
    onFavorite: null,  // (channel) => void
    onStatus: null,    // (text) => void
    isFavorite: null,  // (channel) => bool
  };

  /* --------------------------------------------------------------- yardımcı */

  function setIcon(node, name) {
    if (node) node.innerHTML = icon(name);
  }

  function status(text) {
    if (hooks.onStatus) hooks.onStatus(text);
  }

  function showSpinner(on) {
    el.stSpinner.hidden = !on;
    if (on) hideError();
  }

  function hideError() {
    errorCard = false;
    el.stError.hidden = true;
  }

  function showError(msg) {
    errorCard = true;
    el.stErrorMsg.textContent = msg || 'Kaynak şu anda yanıt vermiyor olabilir.';
    el.stError.hidden = false;
    showSpinner(false);
    setIcon(el.stPlay, 'play');
    status('Yayın açılamadı');
    if (settings.autoNext && autoSkipCount < 3) {
      autoSkipCount++;
      clearTimeout(fatalTimer);
      fatalTimer = setTimeout(() => {
        if (errorCard) {
          toast('warn', 'Kanal açılamadı, sonrakine geçiliyor…');
          step(1, { autoSkip: true });
        }
      }, 3200);
    }
  }

  function toast(kind, text) {
    global.App && global.App.toast && global.App.toast(kind, text);
  }

  /* ----------------------------------------------------------------- sahne */

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    el.stage.className = 'stage stage--' + next;
    el.body.className = el.body.className.replace(/\bmode-\w+\b/g, '').trim() + ' mode-' + (next === 'theater' ? 'theater' : next === 'mini' ? 'mini' : 'browse');
    if (hooks.onMode) hooks.onMode(next);
  }

  function theater() {
    if (!current) return;
    setMode('theater');
    renderSideList();
  }

  function minimize() {
    if (!current) return;
    exitFullscreen();
    setMode('mini');
  }

  function close() {
    exitFullscreen();
    clearTimeout(fatalTimer);
    destroyHls();
    try { el.video.pause(); } catch {}
    el.video.removeAttribute('src');
    try { el.video.load(); } catch {}
    current = null;
    errorCard = false;
    setMode('hidden');
    hideError();
    showSpinner(false);
    el.npName.textContent = 'Kanal seçilmedi';
    el.npMeta.textContent = 'Bir kanala tıklayın';
    el.npLogo.innerHTML = icon('tv');
    el.npLive.hidden = true;
    status('Oynatıcı kapatıldı');
    if (global.App && global.App.renderGrid) global.App.renderGrid();
  }

  /* --------------------------------------------------------------- oynatma */

  function destroyHls() {
    if (hls) {
      try { hls.destroy(); } catch {}
      hls = null;
    }
  }

  function canNative(url) {
    return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|$)/i.test(url);
  }

  function looksHls(url) {
    return /m3u8?(\?|$)|\/hls\/|format=m3u8|\.php(\?|$)/i.test(url);
  }

  function attach(url) {
    destroyHls();
    networkRetry = 0;
    mediaRetry = 0;
    hideError();
    showSpinner(true);

    const useNativeOnly = canNative(url);
    const hlsReady = typeof global.Hls !== 'undefined' && global.Hls.isSupported();

    if (!useNativeOnly && hlsReady) {
      hls = new global.Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 45,
        maxBufferLength: settings.buffer,
        maxMaxBufferLength: Math.max(settings.buffer * 2, 30),
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 20000,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 4,
        debug: false,
      });

      hls.loadSource(url);
      hls.attachMedia(el.video);

      hls.on(global.Hls.Events.MANIFEST_PARSED, () => {
        showSpinner(false);
        play();
      });
      hls.on(global.Hls.Events.LEVEL_SWITCHED, () => showSpinner(false));
      hls.on(global.Hls.Events.FRAG_BUFFERED, () => showSpinner(false));
      hls.on(global.Hls.Events.ERROR, (_e, data) => onHlsError(data, url));

      // HLS başarısız olursa doğrudan tarayıcı oynatmayı dene
      if (!looksHls(url)) {
        hls.on(global.Hls.Events.ERROR, (_e, data) => {
          if (data && data.fatal && data.type === global.Hls.ErrorTypes.MEDIA_ERROR && mediaRetry > 1) {
            nativeFallback(url);
          }
        });
      }
    } else {
      nativeFallback(url);
    }
  }

  function nativeFallback(url) {
    destroyHls();
    el.video.src = url;
    el.video.play().catch(() => {
      el.stBigPlay.hidden = false;
      showSpinner(false);
    });
  }

  function onHlsError(data, url) {
    if (!data || !data.fatal) return;
    const t = data.type;
    const detail = (data.details || '').toLowerCase();

    if (t === global.Hls.ErrorTypes.NETWORK_ERROR) {
      if (networkRetry < 2) {
        networkRetry++;
        status('Ağ hatası, yeniden deneniyor… (' + networkRetry + ')');
        // manifest hiç yüklenemediyse startLoad() bir şey yapmaz; kaynağı baştan yükle.
        // Bu arada kanal değiştiyse eski örneğe dokunma.
        const inst = hls;
        setTimeout(() => {
          if (!inst || inst !== hls) return;
          if (detail.includes('manifest')) inst.loadSource(url);
          else inst.startLoad();
        }, 700 * networkRetry);
        return;
      }
      if (detail.includes('manifest')) {
        // HLS manifest değilse doğrudan kaynak dene
        if (!looksHls(url)) return nativeFallback(url);
        return showError('Yayın adresi yanıt vermiyor (zaman aşımı).');
      }
      return showError('Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.');
    }

    if (t === global.Hls.ErrorTypes.MEDIA_ERROR) {
      if (mediaRetry < 2) {
        mediaRetry++;
        status('Akış onarılıyor…');
        hls && hls.recoverMediaError();
        return;
      }
      if (!looksHls(url)) return nativeFallback(url);
      return showError('Ses/video çözümlenemedi. Yayın biçimi desteklenmiyor olabilir.');
    }

    if (!looksHls(url)) return nativeFallback(url);
    showError('Yayın açılamadı: ' + (data.details || 'bilinmeyen hata'));
  }

  function play() {
    const p = el.video.play();
    if (p && p.catch) {
      p.catch(() => {
        el.stBigPlay.hidden = false;
        showSpinner(false);
      });
    }
  }

  function toggle() {
    if (!current) return;
    if (el.video.paused) play();
    else el.video.pause();
  }

  /* --------------------------------------------------------------- kanal */

  function load(ch, opts) {
    opts = opts || {};
    if (!ch || !ch.url) return;

    current = ch;
    // otomatik geçişlerde sayaç sıfırlanmaz; yoksa 3 deneme sınırı hiç devreye girmez
    if (!opts.autoSkip) autoSkipCount = 0;
    clearTimeout(fatalTimer);

    const info = catInfo(ch.group);
    const cc = countryCode(ch.tvgId);
    const quality = ch.quality || '';

    // UI
    el.stName.textContent = ch.name;
    el.stMeta.textContent = [info.tr, COUNTRIES[cc] || (cc ? cc.toUpperCase() : ''), quality, ch.note]
      .filter(Boolean).join(' · ');
    el.stLogo.innerHTML = ch.logo ? `<img src="${esc(ch.logo)}" alt="" onerror="this.remove()">` : icon('tv');
    el.npName.textContent = ch.name;
    el.npMeta.textContent = info.tr + (quality ? ' · ' + quality : '');
    el.npLogo.innerHTML = ch.logo ? `<img src="${esc(ch.logo)}" alt="" onerror="this.remove()">` : icon('tv');
    el.npLive.hidden = false;
    el.stLive.hidden = false;

    el.spName.textContent = ch.name;
    el.spLogo.innerHTML = ch.logo ? `<img src="${esc(ch.logo)}" alt="" onerror="this.remove()">` : icon('tv');
    el.spTags.innerHTML =
      `<span class="tag acc">${esc(info.tr)}</span>` +
      (cc && COUNTRIES[cc] ? `<span class="tag">${flag(cc)} ${esc(COUNTRIES[cc])}</span>` : '') +
      (quality ? `<span class="tag">${esc(quality)}</span>` : '') +
      info.all.slice(1).map((t) => `<span class="tag">${esc(t)}</span>`).join('');
    el.spDesc.textContent = ch.note
      ? 'Not: ' + ch.note + '. Yayın sağlayıcısına göre kalite ve kararlılık değişebilir.'
      : 'Canlı yayın · ' + info.all.join(', ');

    updateFavButtons();
    updateNextInfo();

    // User-Agent başlığı (bazı kaynaklar özel UA ister)
    if (global.tvio && global.tvio.setStreamHeaders) {
      global.tvio.setStreamHeaders(ch.url, ch.ua || '').catch(() => {});
    }

    if (opts.theater !== false) {
      // Açık kullanıcı eylemi (kart/buton) her zaman tam sahneyi açar
      if (mode !== 'theater') setMode('theater');
    } else if (mode === 'hidden') setMode('mini');

    status('Yayın açılıyor…');
    el.stBigPlay.hidden = true;
    attach(ch.url);
    renderSideList();

    const i = indexOf(ch);
    if (i >= 0) {
      list = list.length ? list : [];
    }
    if (hooks.onChannel) hooks.onChannel(ch);
    if (global.App && global.App.renderGrid) global.App.renderGrid();
  }

  function indexOf(ch) {
    if (!ch) return -1;
    return list.findIndex((c) => c.url === ch.url && c.name === ch.name);
  }

  function setList(arr) {
    list = Array.isArray(arr) ? arr.slice() : [];
    updateNextInfo();
    renderSideList();
  }

  function next() { step(1); }
  function prev() { step(-1); }

  function step(dir, opts) {
    if (!list.length) return;
    let i = indexOf(current);
    if (i < 0) i = dir > 0 ? -1 : 0;
    const ni = (i + dir + list.length) % list.length;
    // mevcut modu koru: teatre girildiyse teatre, miniyse mini kalır
    load(list[ni], Object.assign({ theater: mode === 'theater' }, opts));
  }

  function updateNextInfo() {
    const i = indexOf(current);
    const nx = i >= 0 && list.length ? list[(i + 1) % list.length] : null;
    const b = el.stNextInfo.querySelector('b');
    if (b) b.textContent = nx ? nx.name : '—';
  }

  /* Aynı kategoriden liste: ilk sayfa render edilir, kalanı kaydırınca yüklenir */
  const SIDE_PAGE = 60;
  let sideAll = [];
  let sideShown = 0;

  function sideRow(c) {
    const info = catInfo(current ? current.group : '');
    const playing = current && c.url === current.url && c.name === current.name;
    return `<button class="spitem ${playing ? 'is-playing' : ''}" data-url="${esc(c.url)}" data-name="${esc(c.name)}">
          <span class="spitem__logo">${c.logo ? `<img src="${esc(c.logo)}" alt="" loading="lazy" onerror="this.outerHTML='?'">` : esc(global.TVIO.initials(c.name))}</span>
          <span class="spitem__t"><b>${esc(c.name)}</b><small>${esc(c.quality || info.tr)}</small></span>
        </button>`;
  }

  function paintSide(n) {
    if (sideShown >= sideAll.length) return;
    const end = Math.min(sideAll.length, sideShown + n);
    const html = sideAll.slice(sideShown, end).map(sideRow).join('');
    if (sideShown === 0) el.spList.innerHTML = html;
    else el.spList.insertAdjacentHTML('beforeend', html);
    sideShown = end;
  }

  function renderSideList() {
    if (!current) return;
    const info = catInfo(current.group);
    sideAll = list.filter((c) => catInfo(c.group).key === info.key);
    sideShown = 0;
    el.spCount.textContent = String(sideAll.length);

    // oynatılan kanal ilk sayfada değilse, ona kadar basıyoruz
    const idx = sideAll.findIndex((c) => c.url === current.url && c.name === current.name);
    const need = idx >= 0 ? Math.min(sideAll.length, idx + 1) : SIDE_PAGE;
    paintSide(Math.max(SIDE_PAGE, need));

    // görünür olmayan "çalan" satır varsa oraya kaydır
    const active = el.spList.querySelector('.spitem.is-playing');
    if (active && idx >= SIDE_PAGE) {
      const wrap = el.spWrap;
      const top = active.offsetTop - wrap.clientHeight / 2;
      wrap.scrollTop = Math.max(0, top);
    }
  }

  function initSideScroll() {
    const wrap = el.spWrap;
    if (!wrap) return;
    let ticking = false;
    wrap.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (wrap.scrollTop + wrap.clientHeight > wrap.scrollHeight - 400) paintSide(SIDE_PAGE);
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------- favoriler */

  function updateFavButtons() {
    const on = current && hooks.isFavorite ? hooks.isFavorite(current) : false;
    el.stFav.classList.toggle('is-on', on);
    el.stFav.title = on ? 'Favorilerden çıkar' : 'Favorilere ekle';
    el.spFav.innerHTML = icon('star') + (on ? 'Favorilerden çıkar' : 'Favorilere ekle');
  }

  function toggleFavorite() {
    if (!current) return;
    if (hooks.onFavorite) hooks.onFavorite(current);
    updateFavButtons();
  }

  /* --------------------------------------------------------------- ses */

  function setVolume(v, remember) {
    const val = Math.min(1, Math.max(0, v));
    el.video.volume = val;
    if (remember !== false) settings.volume = val;
    el.volume.value = Math.round(val * 100);
    el.stVolume.value = Math.round(val * 100);
    updateMuteIcons();
  }

  function toggleMute() {
    el.video.muted = !el.video.muted;
    updateMuteIcons();
  }

  function updateMuteIcons() {
    const muted = el.video.muted || el.video.volume === 0;
    setIcon(el.stMute, muted ? 'volumeX' : 'volume');
    setIcon(el.btnMute, muted ? 'volumeX' : 'volume');
    el.btnMute.classList.toggle('is-on', muted);
  }

  function changeVolume(delta) {
    setVolume((el.video.muted ? 0 : el.video.volume) + delta);
    if (el.video.muted && delta > 0) el.video.muted = false;
    updateMuteIcons();
  }

  /* ------------------------------------------------------------ tam ekran */

  /** Sahne tam ekrandaysa çıkar; küçült/kapat öncesi çağrılır. */
  function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) return exitFullscreen();
    if (!current) return;
    // mini oynatıcı tam ekrana küçük kutu olarak taşınmasın
    if (mode !== 'theater') theater();
    if (el.stage.requestFullscreen) el.stage.requestFullscreen().catch(() => {});
  }

  /** Tam ekran düğmesinin ikonu ve ipucu yalnızca sahnenin tam ekranını yansıtır. */
  function syncFullscreenButton() {
    const on = document.fullscreenElement === el.stage;
    setIcon(el.stFull, on ? 'minimize' : 'maximize');
    el.stFull.title = on ? 'Tam ekrandan çık' : 'Tam ekran';
  }

  async function togglePip() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (el.video.requestPictureInPicture) await el.video.requestPictureInPicture();
    } catch {
      toast('warn', 'Resim içinde resim kullanılamıyor');
    }
  }

  function reload() {
    if (!current) return;
    status('Yayın yeniden yükleniyor…');
    attach(current.url);
    toast('ok', 'Yayın yeniden yükleniyor');
  }

  /* --------------------------------------------------------- mini sürüklenme */

  function initDrag() {
    let dragging = false;
    let sx = 0, sy = 0, br = 0, bb = 0;
    const base = { r: 26, b: 76 };

    el.stage.addEventListener('pointerdown', (e) => {
      if (mode !== 'mini') return;
      if (e.target.closest('button, input, .stage__bottom')) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      const cs = getComputedStyle(el.stage);
      br = parseInt(cs.getPropertyValue('--mini-r')) || base.r;
      bb = parseInt(cs.getPropertyValue('--mini-b')) || base.b;
      el.stage.setPointerCapture(e.pointerId);
    });

    el.stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const r = Math.max(8, Math.min(window.innerWidth - el.stage.offsetWidth - 8, br + (sx - e.clientX)));
      const b = Math.max(8, Math.min(window.innerHeight - el.stage.offsetHeight - 8, bb + (sy - e.clientY)));
      el.stage.style.setProperty('--mini-r', r + 'px');
      el.stage.style.setProperty('--mini-b', b + 'px');
    });

    const stop = () => { dragging = false; };
    el.stage.addEventListener('pointerup', stop);
    el.stage.addEventListener('pointercancel', stop);
    el.stage.addEventListener('dblclick', (e) => {
      if (mode === 'mini' && !e.target.closest('button')) theater();
    });
  }

  /* --------------------------------------------------------------- olaylar */

  function initEvents() {
    el.video.addEventListener('waiting', () => { if (!errorCard) showSpinner(true); });
    el.video.addEventListener('stalled', () => { if (!errorCard) showSpinner(true); });
    el.video.addEventListener('playing', () => {
      showSpinner(false);
      hideError();
      autoSkipCount = 0;
      setIcon(el.stPlay, 'pause');
      el.stBigPlay.hidden = true;
      el.stState.textContent = 'CANLI';
      status(current ? 'Oynatılıyor · ' + current.name : 'Oynatılıyor');
    });
    el.video.addEventListener('pause', () => {
      setIcon(el.stPlay, 'play');
      if (current && !errorCard) {
        el.stBigPlay.hidden = false;
        status('Duraklatıldı');
      }
    });
    el.video.addEventListener('error', () => {
      if (hls) return; // hls.js hataları kendi yolundan gelir
      const err = el.video.error;
      const map = {
        1: 'Yayın yüklenemedi (iptal edildi).',
        2: 'Ağ hatası oluştu. Kaynak erişilemiyor olabilir.',
        3: 'Ses/video çözümlenemedi. Yayın biçimi desteklenmiyor.',
        4: 'Bu yayın biçimi tarayıcı tarafından desteklenmiyor.',
      };
      showError(map[err && err.code] || 'Yayın açılamadı.');
    });
    el.video.addEventListener('volumechange', () => {
      el.volume.value = Math.round(el.video.volume * 100);
      el.stVolume.value = Math.round(el.video.volume * 100);
      updateMuteIcons();
      if (global.App) global.App.saveVolume(el.video.volume, el.video.muted);
    });
    el.video.addEventListener('timeupdate', updateBuffer);

    el.stPlay.addEventListener('click', toggle);
    el.stBigPlay.addEventListener('click', () => { play(); el.stBigPlay.hidden = true; });
    el.stPrev.addEventListener('click', prev);
    el.stNextCh.addEventListener('click', next);
    el.stMute.addEventListener('click', toggleMute);
    el.btnMute.addEventListener('click', toggleMute);
    el.stFull.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    el.stPip.addEventListener('click', togglePip);
    el.stClose.addEventListener('click', close);
    el.stMini.addEventListener('click', minimize);
    el.stFav.addEventListener('click', toggleFavorite);
    el.spFav.addEventListener('click', toggleFavorite);
    el.stRetry.addEventListener('click', () => { autoSkipCount = 0; reload(); });
    el.stNext.addEventListener('click', () => { autoSkipCount = 0; next(); });
    el.stVolume.addEventListener('input', (e) => setVolume(e.target.value / 100));
    el.volume.addEventListener('input', (e) => setVolume(e.target.value / 100));

    el.spOpen.addEventListener('click', () => {
      if (current) global.tvio.openExternal(current.url);
    });
    el.spCopy.addEventListener('click', async () => {
      if (!current) return;
      try {
        await navigator.clipboard.writeText(current.url);
        toast('ok', 'Bağlantı panoya kopyalandı');
      } catch {
        toast('err', 'Kopyalanamadı');
      }
    });

    el.spList.addEventListener('click', (e) => {
      const btn = e.target.closest('.spitem');
      if (!btn) return;
      const ch = list.find((c) => c.url === btn.dataset.url && c.name === btn.dataset.name);
      if (ch) load(ch, { theater: mode === 'theater' });
    });

    el.stage.addEventListener('click', (e) => {
      if (mode !== 'mini') return;
      if (e.target.closest('button, input')) return;
      theater();
    });

    initDrag();
    initSideScroll();
  }

  function updateBuffer() {
    let pct = 0;
    const v = el.video;
    try {
      if (v.seekable && v.seekable.length) {
        const s = v.seekable.start(v.seekable.length - 1);
        const e = v.seekable.end(v.seekable.length - 1);
        pct = e > s ? ((v.currentTime - s) / (e - s)) * 100 : 100;
      } else if (v.buffered && v.buffered.length) {
        const e = v.buffered.end(v.buffered.length - 1);
        pct = v.duration ? (e / v.duration) * 100 : 100;
      }
    } catch {}
    el.stBuffer.style.width = Math.max(2, Math.min(100, pct)) + '%';
  }

  /* ----------------------------------------------------------- dışa açık */

  global.Player = {
    settings, hooks,
    load, close, theater, minimize, toggle, play, next, prev, reload,
    setList, setVolume, toggleMute, changeVolume, toggleFullscreen, togglePip,
    updateFavButtons, renderSideList, toast,
    get current() { return current; },
    get mode() { return mode; },
    init() {
      setIcon(el.stPlay, 'play');
      setIcon(el.stMute, 'volume');
      setVolume(settings.volume, false);
      if (settings.rememberVolume) el.video.muted = !!settings.muted;
      updateMuteIcons();
      initEvents();
      setMode('hidden');
      el.body.classList.remove('mode-theater', 'mode-mini');
    },
  };
})(window);
