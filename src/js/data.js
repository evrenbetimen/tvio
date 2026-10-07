/* ==========================================================================
   tvio — sabitler, ikonlar, kategori/ülke sözlükleri
   ========================================================================== */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ ikon */
  const stroke = (d, sw) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 1.9}" ` +
    `stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const solid = (d) => `<svg viewBox="0 0 24 24" fill="currentColor">${d}</svg>`;

  const ICONS = {
    home: stroke('<path d="M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H15V14H9v7.5H4.5A1.5 1.5 0 0 1 3 20z"/>'),
    grid: stroke('<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>'),
    star: stroke('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    clock: stroke('<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>'),
    sliders: stroke('<path d="M4 21v-6M4 11V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 15h5M9.5 8h5M17.5 16h5"/>'),
    search: stroke('<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.6-4.6"/>'),
    x: stroke('<path d="M18 6 6 18M6 6l12 12"/>', 2.1),
    minus: stroke('<path d="M6 12h12"/>', 2.4),
    square: stroke('<rect x="6" y="6" width="12" height="12" rx="1.5"/>', 2.2),
    refresh: stroke('<path d="M21 4v6h-6M3 20v-6h6"/><path d="M19.4 9A8 8 0 0 0 5.6 6.6L3 9M4.6 15a8 8 0 0 0 13.8 2.4L21 15"/>'),
    keyboard: stroke('<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>'),
    tv: stroke('<rect x="2.5" y="7.5" width="19" height="13" rx="3.5"/><path d="m7.5 2.5 4.5 5 4.5-5"/>'),
    play: solid('<path d="M7 4.6c0-.8.9-1.3 1.6-.9l11 6.9c.7.4.7 1.4 0 1.8l-11 6.9c-.7.4-1.6-.1-1.6-.9z"/>'),
    pause: solid('<rect x="6" y="4.5" width="4.2" height="15" rx="1.4"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4"/>'),
    alert: stroke('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2h.01"/>'),
    info: stroke('<circle cx="12" cy="12" r="9"/><path d="M12 16.5v-4.8M12 8.2h.01"/>'),
    check: stroke('<path d="m20 6.5-11 11-5-5"/>', 2.2),
    chevronUp: stroke('<path d="m6 14.5 6-6 6 6"/>', 2.2),
    chevronDown: stroke('<path d="m6 9.5 6 6 6-6"/>', 2.2),
    chevronRight: stroke('<path d="m9.5 6 6 6-6 6"/>', 2.2),
    volume: stroke('<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15.5 8.8a4.6 4.6 0 0 1 0 6.4M18.6 5.9a9 9 0 0 1 0 12.2"/>'),
    volumeX: stroke('<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
    pip: stroke('<rect x="2.5" y="4.5" width="19" height="15" rx="3.5"/><rect x="12" y="12" width="7.5" height="5.5" rx="1.6"/>'),
    maximize: stroke('<path d="M8 3.5H5.5A2 2 0 0 0 3.5 5.5V8M20.5 8V5.5a2 2 0 0 0-2-2H16M3.5 16v2.5a2 2 0 0 0 2 2H8M16 20.5h2.5a2 2 0 0 0 2-2V16"/>'),
    minimize: stroke('<path d="M8 3.5v2.5a2 2 0 0 1-2 2H3.5M20.5 8H18a2 2 0 0 1-2-2V3.5M3.5 16H6a2 2 0 0 1 2 2v2.5M16 20.5v-2.5a2 2 0 0 1 2-2h2.5"/>'),
    external: stroke('<path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M14.5 3H21v6.5M21 3l-9 9"/>'),
    copy: stroke('<rect x="9" y="9" width="12" height="12" rx="3"/><path d="M5 15H4.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5V5"/>'),
    folder: stroke('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
    globe: stroke('<circle cx="12" cy="12" r="9"/><path d="M3.2 9h17.6M3.2 15h17.6"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>'),
    heart: stroke('<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21.6l8.8-8.6a5.2 5.2 0 0 0 0-7.4z"/>'),
    zap: stroke('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    spark: stroke('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'),
    layers: stroke('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/>'),
    film: stroke('<rect x="2.5" y="3.5" width="19" height="17" rx="3"/><path d="M7.5 3.5v17M16.5 3.5v17M2.5 12h19M2.5 7.5h5M2.5 16.5h5M16.5 7.5h5M16.5 16.5h5"/>'),
    newspaper: stroke('<path d="M14.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9"/><path d="M14.5 3v6H20"/><path d="M8 13h7M8 17h5"/>'),
    trophy: stroke('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H5a2 2 0 0 0 0 4h2M17 6h2a2 2 0 0 1 0 4h-2M9 19h6M12 14v5"/>'),
    music: stroke('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    smile: stroke('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>'),
    book: stroke('<path d="M2.5 4.5h5.2A4.3 4.3 0 0 1 12 8.8v11.7a3.6 3.6 0 0 0-3.6-3.6H2.5z"/><path d="M21.5 4.5h-5.2A4.3 4.3 0 0 0 12 8.8v11.7a3.6 3.6 0 0 1 3.6-3.6h5.9z"/>'),
    monitor: stroke('<rect x="2.5" y="4" width="19" height="13" rx="3"/><path d="M8.5 21h7M12 17v4"/>'),
    bag: stroke('<path d="M4 8h16l-1.2 12.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z"/><path d="M8.5 8V6.2a3.5 3.5 0 0 1 7 0V8"/>'),
    briefcase: stroke('<rect x="2.5" y="7" width="19" height="13.5" rx="3"/><path d="M8.5 7V5.5A2.5 2.5 0 0 1 11 3h2a2.5 2.5 0 0 1 2.5 2.5V7M2.5 12.5h19"/>'),
    car: stroke('<path d="M4.5 16.5h15M5 16.5v2.2a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1V16.5M21.6 16.5v2.2a1 1 0 0 1-1 1h-.6a1 1 0 0 1-1-1V16.5"/><path d="M3 16.5v-4l2-5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5l2 5v4z"/><path d="M6.5 13h.01M17.5 13h.01"/>'),
    cloud: stroke('<path d="M7 18.5h10.5a3.5 3.5 0 0 0 .6-6.9 5.6 5.6 0 0 0-10.8-1.3A4.2 4.2 0 0 0 7 18.5z"/>'),
    compass: stroke('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
    flame: stroke('<path d="M12 2.5s5.5 4.4 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2 1-3.4 2-4.5.3 1.4 1.2 2.3 2.2 2.3 1.5 0 1.8-2.4 1.3-7.3z"/>'),
    flag: stroke('<path d="M4.5 21V4.5M4.5 5h11l-1.6 3.4L15.5 12h-11"/>'),
    folder2: stroke('<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17z"/>'),
    loader: stroke('<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>'),
    shuffle: stroke('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
    satellite: stroke('<path d="M4.5 9.5 9.5 4.5l4 4-5 5z"/><path d="m7 16-3 3M14 13l3-3 4 4-3 3z"/><path d="M14.5 6.5a6 6 0 0 1 3 5M17.5 3a10 10 0 0 1 3.5 5"/>'),
  };

  /* --------------------------------------------------------------- kategoriler */
  const CATEGORIES = {
    General: { tr: 'Genel', ico: 'tv', c: '#22d3ee' },
    Undefined: { tr: 'Diğer', ico: 'layers', c: '#8b93a7' },
    News: { tr: 'Haber', ico: 'newspaper', c: '#ff7a7a' },
    Entertainment: { tr: 'Eğlence', ico: 'spark', c: '#f472b6' },
    Religious: { tr: 'Din', ico: 'book', c: '#a78bfa' },
    Music: { tr: 'Müzik', ico: 'music', c: '#34d399' },
    Movies: { tr: 'Film', ico: 'film', c: '#fbbf24' },
    Sports: { tr: 'Spor', ico: 'trophy', c: '#4ade80' },
    Series: { tr: 'Dizi', ico: 'monitor', c: '#60a5fa' },
    Kids: { tr: 'Çocuk', ico: 'smile', c: '#f9a8d4' },
    Documentary: { tr: 'Belgesel', ico: 'compass', c: '#38bdf8' },
    Legislative: { tr: 'Meclis', ico: 'flag', c: '#94a3b8' },
    Education: { tr: 'Eğitim', ico: 'book', c: '#22d3ee' },
    Comedy: { tr: 'Komedi', ico: 'smile', c: '#fde047' },
    Culture: { tr: 'Kültür', ico: 'spark', c: '#c084fc' },
    Lifestyle: { tr: 'Yaşam', ico: 'heart', c: '#fb7185' },
    Shop: { tr: 'Alışveriş', ico: 'bag', c: '#f472b6' },
    Business: { tr: 'İş Dünyası', ico: 'briefcase', c: '#60a5fa' },
    Animation: { tr: 'Animasyon', ico: 'spark', c: '#f0abfc' },
    Classic: { tr: 'Klasik', ico: 'film', c: '#d4c5a9' },
    Outdoor: { tr: 'Doğa', ico: 'compass', c: '#4ade80' },
    Travel: { tr: 'Seyahat', ico: 'globe', c: '#38bdf8' },
    Family: { tr: 'Aile', ico: 'heart', c: '#fca5a5' },
    Cooking: { tr: 'Yemek', ico: 'flame', c: '#fb923c' },
    Auto: { tr: 'Otomobil', ico: 'car', c: '#94a3b8' },
    Weather: { tr: 'Hava', ico: 'cloud', c: '#7dd3fc' },
    Science: { tr: 'Bilim', ico: 'zap', c: '#818cf8' },
    Public: { tr: 'Kamu', ico: 'flag', c: '#94a3b8' },
    MusicVideos: { tr: 'Müzik Klipleri', ico: 'music', c: '#2dd4bf' },
    Radio: { tr: 'Radyo', ico: 'satellite', c: '#94a3b8' },
  };

  const FALLBACK = { tr: 'Diğer', ico: 'layers', c: '#8b93a7' };

  /* ------------------------------------------------------------------ ülkeler */
  const COUNTRIES = {
    tr: 'Türkiye', us: 'ABD', gb: 'Birleşik Krallık', de: 'Almanya', fr: 'Fransa',
    it: 'İtalya', es: 'İspanya', pt: 'Portekiz', nl: 'Hollanda', be: 'Belçika',
    ru: 'Rusya', ua: 'Ukrayna', by: 'Belarus', pl: 'Polonya', cz: 'Çekya',
    sk: 'Slovakya', si: 'Slovenya', hu: 'Macaristan', ro: 'Romanya', bg: 'Bulgaristan',
    gr: 'Yunanistan', cy: 'Kıbrıs', mt: 'Malta', rs: 'Sırbistan', ba: 'Bosna-Hersek',
    mk: 'Kuzey Makedonya', me: 'Karadağ', al: 'Arnavutluk', xk: 'Kosova', hr: 'Hırvatistan',
    se: 'İsveç', no: 'Norveç', dk: 'Danimarka', fi: 'Finlandiya', is: 'İzlanda',
    ie: 'İrlanda', lu: 'Lüksemburg', at: 'Avusturya', ch: 'İsviçre', lt: 'Litvanya',
    lv: 'Letonya', ee: 'Estonya', md: 'Moldova', kz: 'Kazakistan', uz: 'Özbekistan',
    az: 'Azerbaycan', ge: 'Gürcistan', am: 'Ermenistan', kg: 'Kırgızistan',
    il: 'İsrail', sa: 'Suudi Arabistan', ae: 'BAE', qa: 'Katar', kw: 'Kuveyt',
    bh: 'Bahreyn', om: 'Umman', iq: 'Irak', ir: 'İran', sy: 'Suriye', lb: 'Lübnan',
    jo: 'Ürdün', ye: 'Yemen', eg: 'Mısır', ma: 'Fas', tn: 'Tunus', dz: 'Cezayir',
    ly: 'Libya', sd: 'Sudan', ng: 'Nijerya', ke: 'Kenya', gh: 'Gana', et: 'Etiyopya',
    za: 'Güney Afrika', in: 'Hindistan', pk: 'Pakistan', bd: 'Bangladeş', lk: 'Sri Lanka',
    cn: 'Çin', jp: 'Japonya', kr: 'Güney Kore', tw: 'Tayvan', hk: 'Hong Kong',
    th: 'Tayland', vn: 'Vietnam', id: 'Endonezya', my: 'Malezya', ph: 'Filipinler',
    sg: 'Singapur', au: 'Avustralya', nz: 'Yeni Zelanda', mn: 'Moğolistan',
    br: 'Brezilya', ar: 'Arjantin', mx: 'Meksika', co: 'Kolombiya', cl: 'Şili',
    pe: 'Peru', ve: 'Venezuela', uy: 'Uruguay', bo: 'Bolivya', ec: 'Ekvador',
    ca: 'Kanada', kg2: '', tm: 'Türkmenistan', tj: 'Tacikistan', af: 'Afganistan',
  };

  /* ---------------------------------------------------------------- yardımcı */
  function flag(cc) {
    if (!cc || cc.length !== 2) return '';
    const up = cc.toUpperCase();
    try {
      return String.fromCodePoint(
        0x1f1e6 + up.charCodeAt(0) - 65,
        0x1f1e6 + up.charCodeAt(1) - 65
      );
    } catch {
      return '';
    }
  }

  /** Türkçe karakterleri sadeleştiren arama normalizasyonu */
  function norm(str) {
    return String(str || '')
      .toLocaleLowerCase('tr')
      .replace(/ı/g, 'i').replace(/İ/g, 'i')
      .replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o')
      .replace(/ç/g, 'c').replace(/â/g, 'a')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function num(n) {
    return new Intl.NumberFormat('tr-TR').format(n || 0);
  }

  /** "Kanal (1080p) [Not 24/7]" -> { name:"Kanal", quality:"1080p", flags:"Not 24/7" } */
  function cleanName(raw) {
    let name = String(raw || '').trim();
    let quality = '';
    let note = '';

    const qm = name.match(/\((\d{3,4}p)\)/i);
    if (qm) quality = qm[1];

    const tags = name.match(/\[([^\]]+)\]/g);
    if (tags) note = tags.map((t) => t.slice(1, -1)).join(' · ');

    name = name
      .replace(/\((\d{3,4}p)\)/gi, '')
      .replace(/\b(FHD|UHD|4K|HD|SD)\b(?=\s*\(|\s*$|\s*\[)/gi, (m) => {
        if (!quality && /^(FHD|UHD|4K|HD|SD)$/i.test(m)) quality = m.toUpperCase();
        return '';
      })
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s*[-–|]\s*$/, '')
      .trim();

    if (!quality && /\b4K\b|\bUHD\b/i.test(name)) quality = '4K';
    if (!quality && /\bFHD\b/i.test(name)) quality = '1080p';

    return { name: name || 'İsimsiz Kanal', quality, note };
  }

  /** tvg-id: "00sReplay.us@SD" -> "us" */
  function countryCode(tvgId) {
    const m = String(tvgId || '').match(/\.([a-z]{2,3})@/i);
    return m ? m[1].toLowerCase() : '';
  }

  function catKey(group) {
    const first = String(group || 'Undefined').split(';')[0].trim();
    return CATEGORIES[first] ? first : 'Undefined';
  }

  function catInfo(group) {
    const key = catKey(group);
    const all = String(group || '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((g) => (CATEGORIES[g] ? CATEGORIES[g].tr : g));
    return Object.assign({}, CATEGORIES[key], { key, all: all.length ? all : [CATEGORIES[key].tr] });
  }

  function initials(name) {
    const words = String(name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase('tr');
    return (words[0][0] + words[1][0]).toLocaleUpperCase('tr');
  }

  function svgOf(name) {
    return ICONS[name] || ICONS.layers;
  }

  /** Her zaman .ico sarmalayıcısıyla döner; ölçüler CSS tarafından verilir. */
  function icon(name, cls) {
    const inner = svgOf(name);
    return cls ? `<span class="ico ${cls}">${inner}</span>` : `<span class="ico">${inner}</span>`;
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function hashColor(str) {
    let h = 0;
    for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0;
    const palette = ['#22d3ee', '#a78bfa', '#a3e635', '#fbbf24', '#fb7185', '#3ddc97', '#60a5fa', '#f472b6'];
    return palette[Math.abs(h) % palette.length];
  }

  global.TVIO = {
    ICONS, CATEGORIES, FALLBACK, COUNTRIES,
    flag, norm, esc, num, cleanName, countryCode, catKey, catInfo, initials,
    icon, svgOf, debounce, hashColor, stroke, solid,
  };
})(window);
