# tvio

**2027 nesil, modern arayüzlü masaüstü IPTV oynatıcı.**
Electron + hls.js ile hazırlandı, arayüz tamamen Türkçedir.

Açılışta [iptv-org](https://github.com/iptv-org/iptv) açık yayın listesi
(`https://iptv-org.github.io/iptv/index.m3u`) otomatik yüklenir: **11.000+ kanal,
28+ kategori, 100+ ülke.**

---

## Kurulum

```bash
npm install
npm start
```

> Node.js 18+ gerekir. `npm install` sonrasında `hls.min.js` otomatik olarak
> `src/vendor` altına kopyalanır (uygulama tamamen çevrimdışı çalışır).

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm start` | Uygulamayı başlat |
| `npm test` | Duman testi (yükleme, filtre, favori, oynatma + ekran görüntüleri) |
| `npm run inspect` | Yerleşim/tanılama çıktısı |
| `npm run panelcheck` | Teatre yan paneli: geometri + sonsuz kaydırma doğrulaması |
| `npm run vendor` | hls.js dosyasını yeniden kopyala |
| `npm run icon` | Uygulama ikonu üretir (macOS `.icns` + 1024px `.png`) |
| `npm run ico` | Windows ikonu üretir (`build/icon.ico`) |
| `npm run dist:mac` | macOS kurulum paketi (`.dmg` + `.zip`, x64 + arm64) |
| `npm run dist:win` | Windows kurulum paketi (`tvio-setup-*.exe`, NSIS x64) |
| `npm run dist` | Her iki platform için birden paketle |

## Paketleme (distribüsyon)

```bash
npm run dist:mac    # → dist/tvio-1.0.0-arm64.dmg, dist/tvio-1.0.0-x64.dmg, .zip
npm run dist:win    # → dist/tvio-setup-1.0.0.exe
```

- Ayarlar `electron-builder.yml` dosyasındadır (imzasız/yerel dağıtım için).
- **macOS:** İmzalı & doğrulanmış dağıtım için `mac.identity` ve `mac.notarize`
  ayarlarını kendi Developer ID sertifikanızla etkinleştirin; imzasız
  `.dmg`'yi açmak için *Sistem Ayarları → Gizlilik & Güvenlik* üzerinden
  izin vermeniz ya da uygulamaya sağ tıklayıp *Aç* demeniz gerekir.
- **Windows:** `dist/tvio-setup-1.0.0.exe` NSIS kurulum sihirbazıdır
  (Türkçe, klasör seçilebilir, masaüstü kısayolu). Kod imzalama sertifikanız
  varsa `win.certificateFile` ekleyebilirsiniz.
- Linux için de `npx electron-builder --linux` ile AppImage üretilebilir.

## Özellikler

- **Kütüphane** — tüm kanallar, kategori/ülke/kalite filtreleri, A–Z sıralama,
  Türkçe karakter duyarlı arama (`⌘K`), sonsuz kaydırma
- **Kategoriler** — Haber, Spor, Film, Dizi, Çocuk, Müzik, Belgesel… (rayda sayaçlı)
- **Favoriler & Son İzlenenler** — kalıcı (localStorage), açılışta kaldığın yerden devam
- **Oynatıcı** — HLS (hls.js), canlı tampon göstergesi, ses/kanal kontrolleri,
  tam ekran, resim-içinde-resim, kanal bilgi paneli ve aynı kategoriden liste
- **Mini oynatıcı** — sürükleyip bırakılabilir, çift tıkla teatre açılır
- **Akıllı hata yönetimi** — ağ/medya hatalarında otomatik onarım ve ayarlardan
  açılan “sonraki kanala geç” davranışı
- **Özel M3U kaynağı** — adres veya yerel `.m3u` dosyası, sonuç önbelleklenir
- **Tema** — 5 vurgu rengi, cam (blur) efekti, animasyon açma/kapama
- **Klavye kısayolları**

| Tuş | İşlev |
| --- | --- |
| `Space` | Oynat / Duraklat |
| `F` | Tam ekran |
| `M` | Sesi kapat / aç |
| `↑` / `↓` | Önceki / Sonraki kanal |
| `←` / `→` | Ses seviyesi |
| `R` | Yayını yeniden yükle |
| `Esc` | Oynatıcıyı küçült |
| `⌘K` / `Ctrl+K` | Aramaya odaklan |

## Mimari

```
src/
├── main.js          # ana süreç: pencere, playlist indirme/önbellek, UA yönlendirme
├── preload.js       # contextBridge ile güvenli köprü (tvio API)
├── index.html       # tek sayfa arayüz
├── styles.css       # tema, cam yüzeyler, animasyonlar
├── vendor/hls.min.js
└── js/
    ├── data.js      # ikonlar, kategori/ülke sözlükleri, yardımcılar
    ├── player.js    # hls.js sarmalayıcı, sahne (theater/mini) yönetimi
    ├── ui.js        # kart/satır/hero/bildirim/modal bileşenleri
    └── app.js       # durum, yükleme, gezinme, filtreler, ayarlar, kısayollar
```

### Notlar

- IPTV kaynakları CORS başlığı göndermediği için pencere `webSecurity: false`
  ile açılır; isteklerde User-Agent, ana süreçten kanal origin'ine göre yönlendirilir.
- Kanal verileri [iptv-org/iptv](https://github.com/iptv-org/iptv) projesinden
  alınır (CC0). Kanal yayın hakları ilgili yayıncılara aittir.
