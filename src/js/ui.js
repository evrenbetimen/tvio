/* ==========================================================================
   tvio — arayüz bileşenleri (kartlar, satırlar, bildirimler, modal)
   ========================================================================== */

(function (global) {
  'use strict';

  const T = global.TVIO;
  const { esc, icon, num, catInfo, countryCode, COUNTRIES, flag, initials, hashColor } = T;

  /* ------------------------------------------------------------- ikon doldur */
  function fillIcons(root) {
    (root || document).querySelectorAll('[data-ico]:not([data-ico-done])').forEach((n) => {
      n.innerHTML = T.svgOf(n.dataset.ico);
      n.dataset.icoDone = '1';
      n.classList.add('ico');
    });
  }

  /* ------------------------------------------------------------------- kart */
  function card(ch, idx) {
    const info = catInfo(ch.group);
    const cc = countryCode(ch.tvgId);
    const q = ch.quality || '';
    const qClass = q === '4K' || q === 'UHD' ? 'is-4k' : /1080|FHD|HD/i.test(q) ? 'is-hd' : '';
    const isFav = global.App.isFavorite(ch);

    const media = ch.logo
      ? `<img class="card__img" src="${esc(ch.logo)}" alt="" loading="lazy" onerror="this.replaceWith(ph('${esc(initials(ch.name))}','${esc(hashColor(ch.name))}'))">`
      : `<span class="card__ph" style="--c:${hashColor(ch.name)}">${esc(initials(ch.name))}</span>`;

    return `
      <article class="card ${global.Player.current && global.Player.current.name === ch.name && global.Player.current.url === ch.url ? 'is-playing' : ''}"
               data-i="${idx}" style="animation-delay:${Math.min(idx % 24, 24) * 18}ms" tabindex="0" role="button">
        <div class="card__media">
          ${q ? `<span class="card__q ${qClass}">${esc(q)}</span>` : ''}
          <button class="card__fav ${isFav ? 'is-on' : ''}" data-fav="${idx}" title="Favori">${icon('star')}</button>
          ${media}
          <div class="card__play"><span>${icon('play')}</span></div>
        </div>
        <div class="card__body">
          <div class="card__title">${esc(ch.name)}</div>
          <div class="card__meta">
            ${cc && COUNTRIES[cc] ? `<span class="card__flag">${flag(cc)}</span>` : ''}
            <span class="card__cat">${esc(info.tr)}</span>
            <span>·</span>
            <span>${esc(ch.note || COUNTRIES[cc] || 'Canlı yayın')}</span>
          </div>
        </div>
      </article>`;
  }

  /** onerror içinde kullanılmak üzere küresel yardımcı */
  global.ph = function (text, color) {
    const s = document.createElement('span');
    s.className = 'card__ph';
    s.style.setProperty('--c', color);
    s.textContent = text;
    return s;
  };

  function skeletons(n) {
    let out = '';
    for (let i = 0; i < n; i++) out += `<div class="sk"><div class="sk__m"></div><div class="sk__b"></div></div>`;
    return out;
  }

  /* ----------------------------------------------------------------- satır */
  function row(title, channels, opts) {
    opts = opts || {};
    if (!channels.length) return '';
    return `
      <section class="row">
        <div class="row__head">
          <h2>${esc(title)}</h2>
          ${opts.action ? `<button class="row__more" data-action="${opts.action}" data-arg="${esc(opts.arg || '')}">
            Tümünü gör ${icon('chevronRight')}</button>` : ''}
        </div>
        <div class="row__scroll">
          ${channels.map((c) => card(c, c.__i)).join('')}
        </div>
      </section>`;
  }

  /* ------------------------------------------------------------------ hero */
  function hero(data) {
    const art = data.logo
      ? `<img class="hero__art" src="${esc(data.logo)}" alt="" onerror="this.remove()">`
      : '';
    return `
      <div class="hero__eyebrow">${esc(data.eyebrow)}</div>
      <h1 class="hero__title">${esc(data.title)}</h1>
      <p class="hero__sub">${esc(data.sub)}</p>
      <div class="hero__acts">
        <button class="solid-btn" data-action="${data.primary.action}">${icon(data.primary.icon)}${esc(data.primary.label)}</button>
        <button class="ghost-btn" data-action="${data.secondary.action}">${icon(data.secondary.icon)}${esc(data.secondary.label)}</button>
      </div>
      <div class="hero__stats">
        ${data.stats
          .map((s) => `<div class="hero__stat"><b>${esc(s.v)}</b><span>${esc(s.k)}</span></div>`)
          .join('')}
      </div>
      ${art}`;
  }

  /* ---------------------------------------------------------------- bildirim */
  function toast(kind, message) {
    const wrap = document.getElementById('toasts');
    if (!wrap) return;
    const icoName = kind === 'err' ? 'alert' : kind === 'warn' ? 'info' : kind === 'ok' ? 'check' : 'zap';
    const node = document.createElement('div');
    node.className = 'toast ' + (kind || '');
    node.innerHTML = `${icon(icoName)}<span>${esc(message)}</span>`;
    wrap.appendChild(node);
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 340);
    }, 3400);
    while (wrap.children.length > 4) wrap.firstChild.remove();
  }

  /* ------------------------------------------------------------------ modal */
  const modal = {
    open(title, html) {
      const m = document.getElementById('modal');
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = html;
      m.hidden = false;
      fillIcons(m);
    },
    close() {
      document.getElementById('modal').hidden = true;
    },
  };

  /* ------------------------------------------------------------ kategori satırı */
  function catButton(key, count, activeKey) {
    const info = T.CATEGORIES[key] || T.FALLBACK;
    return `<button class="cat ${activeKey === key ? 'is-active' : ''}" data-cat="${esc(key)}" title="${esc(info.tr)}">
      <i class="cat__dot" style="--c:${info.c}"></i>
      <span>${esc(info.tr)}</span>
      <span class="cat__n">${num(count)}</span>
    </button>`;
  }

  function chip(key, count, activeKey) {
    const info = T.CATEGORIES[key] || T.FALLBACK;
    return `<button class="chip ${activeKey === key ? 'is-active' : ''}" data-cat="${esc(key)}">
      ${icon(info.ico)} ${esc(info.tr)} <b>${num(count)}</b>
    </button>`;
  }

  function emptyBox(title, text) {
    return `<div class="empty"><div class="empty__ico">${icon('search')}</div>
      <h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
  }

  global.UI = { fillIcons, card, skeletons, row, hero, toast, modal, catButton, chip, emptyBox };
})(window);
