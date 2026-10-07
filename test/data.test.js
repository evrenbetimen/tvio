'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTvio } = require('./helpers');

const T = loadTvio();
// vm bağlamındaki nesneler farklı prototiplere sahip; karşılaştırma için düz JSON'a çevir
const plain = (v) => JSON.parse(JSON.stringify(v));

test('cleanName: kalite ve köşeli parantez notları ayrılır', () => {
  assert.deepEqual(plain(T.cleanName('Kanal D (1080p) [Not 24/7]')), {
    name: 'Kanal D', quality: '1080p', note: 'Not 24/7',
  });
  assert.deepEqual(plain(T.cleanName('Show TV HD [Geo-blocked] [Not 24/7]')), {
    name: 'Show TV', quality: 'HD', note: 'Geo-blocked · Not 24/7',
  });
  assert.equal(T.cleanName('beIN SPORTS 4K').quality, '4K');
});

test('cleanName: addaki "HD" kelimesi sondaki etiketle karıştırılmaz', () => {
  assert.deepEqual(plain(T.cleanName('HD Life')), { name: 'HD Life', quality: '', note: '' });
});

test('cleanName: boş ad için varsayılan döner', () => {
  assert.equal(T.cleanName('').name, 'İsimsiz Kanal');
  assert.equal(T.cleanName('(720p)').name, 'İsimsiz Kanal');
});

test('norm: Türkçe karakterler ve büyük harfler sadeleşir', () => {
  assert.equal(T.norm('İSTANBUL Işık Çağ'), 'istanbul isik cag');
  assert.equal(T.norm('ŞÖĞÜ'), 'sogu');
  assert.equal(T.norm('  TRT-1 / HD '), 'trt 1 hd');
  assert.equal(T.norm(null), '');
});

test('countryCode: tvg-id içinden ülke kodu', () => {
  assert.equal(T.countryCode('TRT1.tr@HD'), 'tr');
  assert.equal(T.countryCode('00sReplay.US@SD'), 'us');
  assert.equal(T.countryCode(''), '');
});

test('catKey / catInfo: bilinmeyen gruplar Undefined olur', () => {
  assert.equal(T.catKey('News;Sports'), 'News');
  assert.equal(T.catKey('Bilinmeyen'), 'Undefined');
  assert.equal(T.catKey(''), 'Undefined');
  const info = T.catInfo('Sports;Kids');
  assert.equal(info.key, 'Sports');
  assert.equal(info.tr, 'Spor');
  assert.deepEqual(plain(info.all), ['Spor', 'Çocuk']);
});

test('esc: HTML özel karakterleri kaçırılır', () => {
  assert.equal(T.esc(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  assert.equal(T.esc(null), '');
});

test('initials: yalnızca harf/rakam döner (onerror içinde güvenle kullanılır)', () => {
  assert.equal(T.initials('TRT Haber'), 'TH');
  assert.equal(T.initials('ntv'), 'NT');
  assert.equal(T.initials(`a'); alert(1); ('`), 'AA');
  assert.equal(T.initials('---'), '?');
});

test('flag: iki harfli kod bayrak emojisine dönüşür', () => {
  assert.equal(T.flag('tr'), '🇹🇷');
  assert.equal(T.flag(''), '');
  assert.equal(T.flag('usa'), '');
});
