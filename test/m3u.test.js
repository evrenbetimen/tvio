'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadServices } = require('./helpers');

const { services } = loadServices();
const { parseM3U } = services;

test('temel #EXTINF öznitelikleri okunur', () => {
  const [ch] = parseM3U(
    '#EXTM3U\n' +
      '#EXTINF:-1 tvg-id="TRT1.tr@HD" tvg-name="TRT 1" tvg-logo="https://x/logo.png" group-title="General",TRT 1 (1080p)\n' +
      'https://example.com/trt1.m3u8\n'
  );
  assert.equal(ch.id, 0);
  assert.equal(ch.name, 'TRT 1 (1080p)');
  assert.equal(ch.tvgId, 'TRT1.tr@HD');
  assert.equal(ch.logo, 'https://x/logo.png');
  assert.equal(ch.group, 'General');
  assert.equal(ch.url, 'https://example.com/trt1.m3u8');
  assert.equal(ch.ua, '');
});

test('virgül içeren kanal adı bölünmez', () => {
  const [ch] = parseM3U('#EXTINF:-1 group-title="News",Fox 5, New York\nhttp://x/a.m3u8\n');
  assert.equal(ch.name, 'Fox 5, New York');
});

test('tırnaklı öznitelikteki virgül adı bozmaz', () => {
  const [ch] = parseM3U('#EXTINF:-1 tvg-name="A, B" group-title="News",Plain\nhttp://x/b.m3u8\n');
  assert.equal(ch.name, 'Plain');
  assert.equal(ch.group, 'News');
});

test('virgülsüz #EXTINF için varsayılan ad kullanılır', () => {
  const [ch] = parseM3U('#EXTINF:-1 group-title="News"\nhttp://x/a.m3u8\n');
  assert.equal(ch.name, 'İsimsiz Kanal');
  assert.equal(ch.group, 'News');
});

test('group-title yoksa Undefined atanır', () => {
  const [ch] = parseM3U('#EXTINF:-1,Kanal\nhttp://x/a.m3u8\n');
  assert.equal(ch.group, 'Undefined');
});

test('User-Agent: http-user-agent özniteliği ve #EXTVLCOPT', () => {
  const list = parseM3U(
    '#EXTINF:-1 http-user-agent="Attr/1",A\nhttp://x/a\n' +
      '#EXTINF:-1,B\n#EXTVLCOPT:http-user-agent=Vlc/2\nhttp://x/b\n' +
      '#EXTINF:-1,C\nhttp://x/c\n'
  );
  assert.deepEqual(list.map((c) => c.ua), ['Attr/1', 'Vlc/2', '']);
});

test('CRLF satır sonları, boş satırlar ve yorumlar desteklenir', () => {
  const list = parseM3U('#EXTM3U\r\n\r\n#EXTINF:-1,A\r\n# yorum\r\nhttp://x/a\r\n');
  assert.equal(list.length, 1);
  assert.equal(list[0].url, 'http://x/a');
});

test('http(s) olmayan ve adressiz girdiler atlanır, id ardışık kalır', () => {
  const list = parseM3U(
    '#EXTINF:-1,Rtmp\nrtmp://x/a\n' +
      '#EXTINF:-1,Adressiz\n' +
      '#EXTINF:-1,Geçerli\nhttps://x/ok\n' +
      'http://x/sahipsiz\n'
  );
  assert.deepEqual(list.map((c) => [c.id, c.name]), [[0, 'Geçerli']]);
});

test('boş veya geçersiz girdi boş liste döner', () => {
  assert.deepEqual(parseM3U(''), []);
  assert.deepEqual(parseM3U(null), []);
  assert.deepEqual(parseM3U(undefined), []);
});
