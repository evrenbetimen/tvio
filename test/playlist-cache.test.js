'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadServices } = require('./helpers');

const M3U = '#EXTM3U\n#EXTINF:-1,A\nhttp://x/a\n';
const A = 'https://a.example/list.m3u';
const B = 'https://b.example/list.m3u';

function withFetch(impl, fn) {
  const orig = global.fetch;
  global.fetch = impl;
  return Promise.resolve(fn()).finally(() => { global.fetch = orig; });
}

const ok = (text) => async () => ({ ok: true, status: 200, text: async () => text });
const down = async () => { throw new Error('ağ yok'); };

test('başarılı indirme önbelleğe yazılır', async () => {
  const { services } = loadServices();
  const res = await withFetch(ok(M3U), () => services.fetchPlaylist(A));
  assert.equal(res.ok, true);
  assert.equal(res.cached, false);
  assert.equal(res.text, M3U);
});

test('HTTP hatası ve geçersiz içerik reddedilir', async () => {
  const { services } = loadServices();
  const r1 = await withFetch(async () => ({ ok: false, status: 404 }), () => services.fetchPlaylist(A));
  assert.equal(r1.ok, false);
  assert.match(r1.error, /404/);
  const r2 = await withFetch(ok('<html>'), () => services.fetchPlaylist(A));
  assert.equal(r2.ok, false);
  assert.match(r2.error, /Geçersiz M3U/);
});

test('aynı adres erişilemezse eski önbellek "stale" olarak döner', async () => {
  const { services } = loadServices();
  await withFetch(ok(M3U), () => services.fetchPlaylist(A));
  const res = await withFetch(down, () => services.fetchPlaylist(A));
  assert.equal(res.ok, true);
  assert.equal(res.cached, true);
  assert.equal(res.stale, true);
  assert.equal(res.text, M3U);
});

test('farklı adresin önbelleği yeni adresin içeriği gibi sunulmaz', async () => {
  const { services } = loadServices();
  await withFetch(ok(M3U), () => services.fetchPlaylist(A));
  const res = await withFetch(down, () => services.fetchPlaylist(B));
  assert.equal(res.ok, false);
  assert.equal(res.source, B);
});
