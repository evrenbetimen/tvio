<div align="center">

# tvio

**Modern, hızlı ve tamamen Türkçe masaüstü IPTV oynatıcı**

[![test](https://github.com/evrenbetimen/tvio/actions/workflows/test.yml/badge.svg)](https://github.com/evrenbetimen/tvio/actions/workflows/test.yml)
[![release](https://img.shields.io/github/v/release/evrenbetimen/tvio?label=s%C3%BCr%C3%BCm)](https://github.com/evrenbetimen/tvio/releases/latest)
![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-0b1224)
![lisans](https://img.shields.io/badge/lisans-MIT-22d3ee)

[İndir](#indir) · [Özellikler](#özellikler) · [Kaynaktan çalıştır](#kaynaktan-çalıştır) · [Geliştirme](#geliştirme) · [Sürüm yayınlama](#sürüm-yayınlama)

</div>

---

tvio, [iptv-org](https://github.com/iptv-org/iptv) açık yayın listesini (11.000+ kanal, 100+ ülke)
ya da kendi M3U listenizi sinematik bir arayüzle izlemenizi sağlar. Electron ve
[hls.js](https://github.com/video-dev/hls.js) üzerine kuruludur; hls.js uygulamanın içinde gelir,
internet yalnızca liste ve yayınlar için gerekir.

## İndir

En güncel kurulum dosyaları **[Releases](https://github.com/evrenbetimen/tvio/releases/latest)** sayfasındadır.

| Platform | Dosya | Not |
| --- | --- | --- |
| macOS (Apple Silicon) | `tvio-<sürüm>-arm64.dmg` | M1/M2/M3/M4 |
| macOS (Intel) | `tvio-<sürüm>-x64.dmg` | x64 |
| Windows 10/11 | `tvio-setup-<sürüm>.exe` | NSIS kurulum sihirbazı, Türkçe |
| Linux | `tvio-<sürüm>-x86_64.AppImage` | `chmod +x` ile çalıştırılabilir yapın |

> **İmza hakkında:** Paketler Apple/Microsoft geliştirici sertifikasıyla imzalı değildir.
> **macOS** paketi ad-hoc imzalıdır: ilk açılışta uygulamaya sağ tıklayıp *Aç* deyin ya da
> *Sistem Ayarları → Gizlilik ve Güvenlik → Yine de Aç* ile izin verin.
> Yine de “hasarlı” uyarısı görürseniz (1.1.0 ve öncesi) Terminal'de
> `xattr -cr /Applications/tvio.app` çalıştırın.
> **Windows**'ta SmartScreen uyarısında *Ek bilgi → Yine de çalıştır* seçeneğini kullanın.

## Özellikler

**Kütüphane ve keşif**
- Açılışta iptv-org listesi otomatik yüklenir; liste önbelleğe alınır, bağlantı yoksa son indirilen liste kullanılır.
- Kategori (Haber, Spor, Film, Dizi, Çocuk, Müzik, Belgesel…), ülke ve kalite (4K / 1080p / HD / SD) filtreleri.
- A–Z, Z–A, kategori ve ülkeye göre sıralama; sonsuz kaydırma.
- Türkçe karakter duyarsız arama: “cagri”, “Çağrı”yı bulur (`⌘K` / `Ctrl+K`).
- Favoriler ve Son İzlenenler kalıcıdır; açılışta kaldığınız kanaldan devam edebilirsiniz.

**Oynatıcı**
- HLS (hls.js) ve doğrudan MP4/WebM oynatma; canlı tampon göstergesi.
- Sinema (theater) görünümü, sürüklenebilir mini oynatıcı, tam ekran, resim içinde resim.
- Yan panelde kanal bilgisi ve aynı kategoriden kanal listesi.
- Akıllı hata yönetimi: ağ ve medya hatalarında otomatik yeniden deneme. İsterseniz açılmayan kanalda
  sıradakine geçer (art arda en fazla 3 kanal).
- Kanala özel User-Agent desteği (`http-user-agent` ve `#EXTVLCOPT`).

**Kişiselleştirme**
- Özel M3U adresi veya yerel `.m3u` / `.m3u8` dosyası.
- 5 vurgu rengi (camgöbeği, mor, limon, kehribar, gül), cam (blur) efekti, animasyonları kapatma.
- Ayarlanabilir canlı tampon (6–60 sn), ses seviyesi ve sessiz durumunu hatırlama.

### Klavye kısayolları

| Tuş | İşlev |
| --- | --- |
| `Space` | Oynat / Duraklat (kanal yoksa rastgele kanal açar) |
| `F` | Tam ekran |
| `M` | Sesi kapat / aç |
| `↑` / `↓` | Önceki / Sonraki kanal |
| `←` / `→` | Ses seviyesi |
| `R` | Yayını yeniden yükle |
| `Esc` | Oynatıcıyı küçült (açık bir pencere varsa onu kapatır) |
| `⌘K` / `Ctrl+K` | Aramaya odaklan |

## Kaynaktan çalıştır

Gereksinim: **Node.js 18+** (CI'da Node 22 kullanılır).

```bash
git clone https://github.com/evrenbetimen/tvio.git
cd tvio
npm install      # hls.js otomatik olarak src/vendor altına kopyalanır
npm start
```

## Geliştirme

### Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm start` | Uygulamayı başlatır |
| `npm run test:unit` | Birim testleri: M3U ayrıştırma, önbellek, yardımcılar (Electron gerektirmez) |
| `npm test` | Duman testi: listeyi yükler, filtre, favori, arama ve oynatmayı dener, ekran görüntüsü alır (internet gerekir) |
| `npm run inspect` | Yerleşim ve tanılama çıktısı |
| `npm run panelcheck` | Sinema yan paneli: geometri ve sonsuz kaydırma doğrulaması |
| `npm run vendor` | hls.js dosyasını yeniden kopyalar |
| `npm run icon` | Uygulama ikonunu üretir (`build/icon-1024.png`, macOS'ta `.icns`); sürüm iş akışı için `assets/icon-1024.png` olarak kopyalayın |
| `npm run ico` | Windows ikonu üretir (`build/icon.ico`, macOS gerektirir) |
| `npm run dist:mac` | macOS paketleri (`.dmg` + `.zip`, x64 + arm64) |
| `npm run dist:win` | Windows kurulum paketi (NSIS x64) |
| `npm run dist` | Her iki platform için paketler |

### Testler

- **Birim testleri** (`test/`) Node'un yerleşik `node:test` modülüyle yazılmıştır; ek bağımlılık yoktur.
  `electron` modülü taklit edilir ve tarayıcı tarafındaki `data.js` bir `vm` bağlamında çalıştırılır.
- **Duman testi** (`scripts/smoke.js`) gerçek Electron penceresi açar; ekran görüntüleri sistemin geçici
  klasöründe `tvio-smoke/` altına yazılır.
- Her push ve PR'da GitHub Actions birim testlerini çalıştırır ([`test.yml`](.github/workflows/test.yml)).

### Mimari

```
src/
├── main.js          # ana süreç: pencere, menü, pencere durumu
├── services.js      # playlist indirme/önbellek, M3U ayrıştırma, IPC, User-Agent yönlendirme
├── preload.js       # contextBridge ile renderer'a açılan dar API (window.tvio)
├── index.html       # tek sayfa arayüz
├── styles.css       # tema, cam yüzeyler, animasyonlar
├── vendor/hls.min.js
└── js/
    ├── data.js      # ikonlar, kategori/ülke sözlükleri, yardımcılar (norm, cleanName…)
    ├── ui.js        # kart, satır, hero, bildirim ve modal bileşenleri
    ├── player.js    # hls.js sarmalayıcı, hata kurtarma, sinema/mini sahne yönetimi
    └── app.js       # durum, yükleme akışı, gezinme, filtreler, ayarlar, kısayollar
test/                # birim testleri (node:test)
scripts/             # duman testi, tanılama, ikon ve vendor betikleri
```

Veriler kullanıcı veri klasöründe tutulur: liste önbelleği `cache/playlist.m3u`, pencere konumu
`window.json`; ayarlar, favoriler ve son izlenenler `localStorage`'dadır. Ayarlar ekranından önbellek
temizlenebilir.

## Sürüm yayınlama

Sürümler GitHub Actions ile otomatik paketlenir ([`release.yml`](.github/workflows/release.yml)):

1. `package.json` içindeki `version` alanını artırın ve [`CHANGELOG.md`](CHANGELOG.md)'ye aynı sürüm
   için bir başlık ekleyin (`## [1.2.0] - YYYY-AA-GG`).
2. Değişikliği `main`'e birleştirin.
3. *Actions → release → Run workflow* ile iş akışını başlatın (ya da `v1.2.0` etiketi gönderin).

İş akışı macOS'ta `assets/icon-1024.png` dosyasından `.icns` ve `.ico` ikonlarını türetir, macOS / Windows / Linux paketlerini ayrı makinelerde derler,
`v<sürüm>` etiketiyle bir GitHub sürümü oluşturur ve sürüm notlarını CHANGELOG'dan alır.

İmzalı dağıtım için `electron-builder.yml` içinde `mac.identity` / `mac.notarize` ve
`win.certificateFile` ayarlarını kendi sertifikalarınızla etkinleştirin.

## Güvenlik notları

- IPTV sunucuları çoğunlukla CORS başlığı göndermediği için pencere `webSecurity: false` ile açılır.
  Buna karşılık `contextIsolation` açıktır, `nodeIntegration` kapalıdır ve renderer'a yalnızca dar bir
  API açılır; listeden gelen tüm metinler HTML'e yazılmadan önce kaçırılır.
- Harici bağlantılar yalnızca `http(s)` ise sistem tarayıcısında açılır.

## Sorun giderme

| Belirti | Çözüm |
| --- | --- |
| “Yayın listesi alınamadı” | İnternet bağlantınızı kontrol edin. Aynı adres daha önce indirildiyse önbellekten açılır. |
| Kanal açılmıyor | Pek çok açık yayın coğrafi olarak kısıtlıdır veya geçici olarak kapalıdır. `R` ile yeniden deneyin ya da `↓` ile sıradaki kanala geçin. |
| macOS “hasarlı” veya “açılamıyor” uyarısı | Uygulamayı *Applications*'a taşıdıktan sonra Terminal'de `xattr -cr /Applications/tvio.app` çalıştırın, ardından sağ tıklayıp *Aç* deyin. |

## Lisans ve veri

Kod [MIT](package.json) lisanslıdır. Kanal listesi [iptv-org/iptv](https://github.com/iptv-org/iptv)
projesinden alınır (CC0). tvio herhangi bir yayın barındırmaz; yayın hakları ilgili yayıncılara aittir.
