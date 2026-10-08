# Değişiklik günlüğü

Bu dosyadaki her `## [sürüm]` bölümü, aynı sürümün GitHub sürüm notları olarak kullanılır.

## [1.1.0] - 2026-10-08

### Düzeltildi
- Yayını kapalı (404) bir kanal açılınca oynatıcı sürekli “yükleniyor”da kalıyordu; artık iki denemeden
  sonra hata kartı gösteriliyor ve ayar açıksa sıradaki kanala geçiliyor.
- “Sonraki kanala geç” otomatik geçişi art arda en fazla 3 kanalla sınırlandı (sınır daha önce hiç devreye girmiyordu).
- Yayın başlamadan durum çubuğunda “Oynatılıyor” yazması düzeltildi.
- “Fox 5, New York” gibi virgül içeren kanal adları artık bölünmüyor.
- Özel liste adresine ulaşılamadığında başka bir listenin önbelleği yeni listeymiş gibi gösterilmiyor.
- Kategoriye tıklayınca yan raydaki etkin kategori vurgusu güncelleniyor.
- “Sesi hatırla” açıkken sessiz durumu yeniden açılışta korunuyor.

### Eklendi
- 22 birim testi (`npm run test:unit`) ve her PR'da çalışan GitHub Actions test iş akışı.
- macOS, Windows ve Linux paketlerini derleyip GitHub sürümü yayınlayan iş akışı.
- Baştan yazılmış README: indirme, geliştirme, test ve sürüm yayınlama rehberi.

## [1.0.0] - 2026-10-07

- İlk sürüm.
