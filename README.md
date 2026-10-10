# 🏠 Aile Panosu — Akıllı Aile Takvimi ve Ev Panosu

Duvara asılan tablet (**Kiosk modu**) + aile bireylerinin telefonları (**PWA**) için
gerçek zamanlı senkronize çalışan, modüler ve hafif aile işletim sistemi.

| Modül | Kapsam |
| --- | --- |
| 📅 **Aile Takvimi** | Gün / Hafta / Ay görünümü, kişi atamalı, ortak etkinlikler, renk kodlu |
| 🧹 **Görevler** | Kişiye atama, günlük/haftalık/aylık yinelenen rutinler, ilerleme çubuğu |
| 🛒 **Alışveriş** | Kategori bazlı (Market/Manav/Kasap…), telefonda ekle → duvarda anında |
| 🍲 **Yemek Planı** | Haftalık 7×3 plan + **"Ne Pişirsem?" öneri motoru** (kahvaltı/öğle/akşam, mevsim + hava durumuna göre, internetten gerçek tarif ve fotoğraf) |
| 🍎 **Beslenme Programı** | Çocuk × gün için **serbest menü** (istediğiniz kadar satır, saat + içerik), haftalık |
| 📚 **Ders Programı** | Çocuk bazlı haftalık ders/salon saatleri, yatay 7 sütun, popup |
| 🎨 **Görünüm** | 6 renk teması, gizlenebilir sol menü, suluboya seyahat-art kapak görseli (foto + illüstrasyon + el yazısı altyazı) |
| 🎓 **Öğrenme** | Quiz (JSON içe aktarma) + **Anki tarzı aralıklı tekrar** (SM-2, Zor/Orta/Kolay) |
| 🌤 **Hava Durumu** | Open-Meteo, **sabit ev adresi: Ankara 06070** (anahtarsız), 3 günlük tahmin |
| 💬 **Mesajlaşma** | Telefondan duvara anlık not, ses + titreşim + ekran uyandırma overlay'i |
| 📲 **PWA** | Service worker, internetsiz açılış, Web Push, çevrimdışı değişiklik kuyruğu |
| ⭐ **Yıldızlar** | Tamamlanan görev başına yıldız, aile yıldız tablosu, telefonda "Benim" görevlerim |
| 📥 **İçe aktarma** | Google/Apple takvimi (.ics), JSON yedek (tüm cihazlara yayılır), sunucuda günlük otomatik yedek |
| 🖥 **Kiosk** | Büyük tipografi, dokunmatik, idle'da **kelime kartları** (15 sn rotasyon) |

---

## 1. Teknoloji Yığını

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + Lucide icons
- **Cihaz desteği:** Chrome 87+ (Android 5/6 tabletlerde güncel Chrome yeterli); eksik API'ler için otomatik polyfill
- **State:** İkili kayıt (`localStorage`) + op (operation) tabanlı senkron — son yazan kazanır
- **Realtime:** WebSocket (`/sync`) — **Node sunucusu (Docker)** *veya* Cloudflare Worker + Durable Object,
  *veya* yalnızca bu cihaz (localStorage + BroadcastChannel). Aile kodu ile korunur.
- **Deploy:** Docker (Dokploy, Portainer, herhangi bir host) veya Cloudflare

---

## 1-B. Kurulum (Dokploy + Android tablet)

Tek Docker imajı: uygulama + gerçek zamanlı senkron + kalıcı veri + günlük yedek.

### Adım 1 — Dokploy'da uygulama

| Alan | Değer |
|------|-------|
| Build Type | Dockerfile |
| Port (container) | **`3000`** |
| Environment | `FAMILY_CODE=<ailenize özel gizli bir kod>` |
| Volume / Mount | Volume → mount path **`/data`** (veriler ve yedekler burada; yoksa her güncellemede veri sıfırlanır) |

**Deploy**'a basın. Alan adı (Domains) ekleyin; Let's Encrypt sertifikası otomatik verilir.

### Adım 2 — Cihazları bağlayın

1. **Önce mevcut verinin durduğu tableti açın.** Sunucu boşsa tabletteki veriler sunucuya yüklenir (silinmez).
2. Her cihazda adresi bir kez şöyle açın: `https://aile-panosu.alanadiniz.com/?kod=<FAMILY_CODE>`
   (kod cihazda saklanır ve adresten silinir) — ya da açılan pencereye kodu yazın.
3. Telefonlarda: Ayarlar → *Bu cihaz kimin?* → kendinizi seçin (Görevler'de "Benim" filtresi + yıldızlar).

### Adım 3 — Tablette tam ekran

Chrome → ⋮ → **Ana ekrana ekle**, simgeden açın. Ekran zaman aşımını kapatın, şarjda bırakın.

### Veriler nerede?

Sunucuda `/data/state.json` (+ `/data/backups/` son 14 gün). Her cihaz bir kopyasını tutar, internetsiz de çalışır.
Ayarlar → Veri: yedek indir/geri yükle (geri yükleme tüm cihazlara yayılır), Google Takvim `.ics` içe aktarma.

## 2. Hızlı Başlangıç (geliştirme)

```bash
npm install
npm run dev:sync     # Terminal 1: senkron sunucusu (ws://localhost:8787, aile kodu: 1234)
VITE_SYNC_URL=ws://localhost:8787/sync npm run dev   # Terminal 2: arayüz (http://localhost:5173)
```

- `VITE_SYNC_URL` vermezseniz `npm run dev` **yalnızca bu cihaz** modunda çalışır.
- Üretim derlemesi (`npm run build`) senkronu otomatik olarak **aynı adresteki `/sync`** üzerinden yapar;
  ek ayar gerekmez. `npm start` derlenmiş uygulamayı + senkronu tek süreçte çalıştırır.

### Testler

```bash
npm run typecheck    # arayüz + Node sunucusu + Cloudflare worker
npm test             # render, sunucu uçtan uca (aile kodu, tekrar gönderim, kalıcılık, başlıklar), kayıt, yedek
```

### Cloudflare (alternatif)

```bash
npx wrangler login
npx wrangler d1 create familyos                 # çıkan database_id'yi wrangler.toml'a yaz
npm run cf:db:init                              # worker/schema.sql (push abonelikleri)
npx wrangler secret put FAMILY_CODE
npm run cf:deploy
```

## 3. Proje Klasör Yapısı

```
familyos/
├── index.html                     # PWA meta + manifest
├── package.json
├── vite.config.ts                 # legacy (eski Android) hedefleri
├── tailwind.config.js             # renkler, animasyonlar
├── wrangler.toml                  # Worker + D1 + DO + statik assets
├── .env.example                   # VITE_SYNC_URL (çoğu durumda boş)
│
├── public/
│   ├── manifest.webmanifest       # PWA manifest (kısayollar dahil)
│   ├── sw.js                      # Service worker: önbellek, offline, push
│   ├── offline.html               # Çevrimdışı ekranı
│   └── icons/                     # icon-192/512 + maskable (üretilmiş)
│
├── scripts/
│   ├── generate-icons.mjs         # saf Node ile PNG ikon üretici
│   ├── render-smoke.mjs           # SSR render duman testi
│   └── sync-smoke-test.mjs        # WebSocket uçtan uca senkron testi
│
├── server/
│   ├── index.ts                   # Docker sunucusu: statik + /sync + push + yedek
│   └── securityHeaders.ts         # CSP vb. (Docker + Cloudflare ortak)
│
├── worker/
│   ├── schema.sql                 # D1 şeması (aşağıda §4)
│   ├── tsconfig.json              # Workers tipleri
│   └── src/index.ts               # FamilyRoom (DO) + /sync WS + push + statik
│
└── src/
    ├── main.tsx                   # seed + SW kaydı
    ├── App.tsx                    # mod seçimi (kiosk/mobil) + sekme yönlendirme
    ├── types.ts                   # tüm veri tipleri (tek doğruluk kaynağı)
    ├── styles/index.css
    │
    ├── sync/
    │   ├── protocol.ts            # Op / ClientMsg / ServerMsg (worker ile ortak)
    │   └── useFamilySync.ts       # ★ realtime hook'u (WS + BroadcastChannel + reconnect)
    │
    ├── state/
    │   ├── store.ts               # useSyncExternalStore, dispatch/applyOp, yerel kayıt
    │   ├── reducer.ts             # op → DB indirgeme (LWW), normalize
    │   ├── actions.ts             # tüm yazma işlemleri (saveEvent, toggleChore, …)
    │   ├── seed.ts                # ilk açılış tohum verisi (id'ler sabit)
    │   └── uiBus.ts               # FAB → modül "hızlı ekle" sinyalleri
    │
    ├── lib/
    │   ├── anki.ts                # ★ sadeleştirilmiş SM-2 algoritması
    │   ├── openMeteo.ts           # ★ hava durumu + geocoding servisi
    │   ├── useWeather.ts          # önbellek + 10 dk otomatik yenileme
    │   ├── hooks.ts               # useIdle, useClock, useMediaQuery
    │   ├── time.ts / id.ts / sound.ts / push.ts
    │
    ├── components/
    │   ├── ui.tsx                 # Btn, Card, Modal, Input, Avatar, Toggle…
    │   ├── nav.ts                 # navigasyon tanımı
    │   ├── WeatherCard.tsx        # büyük ikonlu hava kartı
    │   ├── IdleScreen.tsx         # ★ kiosk ekran koruyucu + mesaj overlay'i
    │   └── layouts/
    │       ├── KioskLayout.tsx    # ★ duvar ekranı düzeni
    │       └── MobileLayout.tsx   # ★ PWA düzeni (bottom nav + FAB)
    │
    └── modules/
        ├── Dashboard.tsx  Calendar.tsx  Chores.tsx  Shopping.tsx
        ├── Meals.tsx      Words.tsx (Learn + Anki)   Quiz.tsx
        └── Chat.tsx       Settings.tsx
```

---

## 4. Veritabanı Şeması

Gerçek zamanlı katman **op-log** tabanlıdır: her değişiklik bir `op` üretilir,
sunucu tüm cihazlara yayar ve `family_state` içinde toplu halde saklar (soğuk
başlatmada tam `snapshot` gönderilir). Aşağıdaki ilişkisel tablolar
`worker/schema.sql` içinde **hazır** olarak bulunur (raporlama/ileriye dönük analiz için):

| Tablo | Kolonlar (tip) |
| --- | --- |
| `family_state` | `key TEXT PK, data TEXT, updated_at INTEGER` |
| `push_subs` | `endpoint TEXT PK, subscription TEXT, created_at INTEGER` |
| `op_log` | `id TEXT PK, entity TEXT, action TEXT, origin TEXT, ts INTEGER, payload TEXT` |
| `members` | `id TEXT PK, name TEXT, color TEXT, emoji TEXT, role TEXT('parent'\|'child'), sort_order INT, updated_at INT` |
| `events` | `id TEXT PK, title TEXT, start_at TEXT, end_at TEXT, all_day INT, location TEXT, notes TEXT, updated_at INT` |
| `event_members` | `event_id FK, member_id FK` (PK: ikisi) |
| `chores` | `id TEXT PK, title TEXT, assignee_id FK, repeat TEXT('none'\|'daily'\|'weekly'\|'monthly'), start_date TEXT, due_date TEXT, done_on TEXT, updated_at INT` |
| `shopping` | `id TEXT PK, text TEXT, category TEXT, qty TEXT, done INT, added_by_id FK, updated_at INT` |
| `meals` | `id TEXT PK, date TEXT, slot TEXT('breakfast'\|'lunch'\|'dinner'), title TEXT, note TEXT, updated_at INT` — UNIQUE(date, slot) |
| `words` | `id TEXT PK, term TEXT, meaning TEXT, example TEXT, deck TEXT, state TEXT('new'\|'learning'\|'review'), ease REAL, interval_min INT, reps INT, lapses INT, due_at INT, last_reviewed_at INT, updated_at INT` |
| `quiz_questions` | `id TEXT PK, text TEXT, options TEXT(JSON), correct INT, explanation TEXT, category TEXT, updated_at INT` |
| `quiz_results` | `id TEXT PK, question_id FK, correct INT, at INT, updated_at INT` |
| `messages` | `id TEXT PK, from_id TEXT, target TEXT('wall'\|member_id), text TEXT, at INT, updated_at INT` |
| `settings` | `id TEXT PK, family_name TEXT, mode TEXT, idle_minutes INT, city TEXT, lat REAL, lon REAL, weather_enabled INT, sound_enabled INT, updated_at INT` |

Uygulama tipi tanımını tek yerde tutar: **`src/types.ts`** (op akışı bu tipler üzerinden akar).

---

## 5. Kritik Parçalar

### 5.1 `useFamilySync` — realtime hook'u

```ts
const { status, url, received } = useFamilySync()
// status: 'live' | 'connecting' | 'reconnecting' | 'local'
```

- **WebSocket** → aynı adresteki `/sync` (aile kodu, 1-2 sn gecikme, otomatik yeniden bağlanma + heartbeat)
- **Giden kutusu** → bağlantı yokken yapılan değişiklikler saklanır, bağlantı gelince gönderilir
- **BroadcastChannel** → aynı cihazdaki sekmeler
- **localStorage** → kalıcılık / çevrimdışı
- Soğuk başlatmada sunucu tam `snapshot` gönderir; bundan sonra yalnızca `op` akar.
- Kendi ürettiğimiz op'ler `origin` alanı sayesinde yankılanmaz (çift uygulanmaz).

### 5.2 `src/lib/anki.ts` — aralıklı tekrar (sadeleştirilmiş SM-2)

| Puan | Davranış |
| --- | --- |
| **Zor** | ease −0.20, lapse (gün aşımıysa) → 10 dk öğrenme adımına düşer |
| **Orta** | ease −0.15, aralık ×1.2–1.6 |
| **Kolay** | ease +0.15, aralık ×ease (gün aşımıysa) |

- Aralık `intervalMin` (dakika) olarak saklanır, `dueAt` epoch ms.
- `>= 1440 dk` → durum `review` (öğrenildi); kısa aralıklar → `learning`.
- `buildQueue()` bugün tekrar gerekenleri öncelik sırasıyla verir.

### 5.3 `src/lib/openMeteo.ts` — hava durumu

Konum **sabit**: `src/lib/location.ts` → `HOME = Ankara 06070 (39.9208, 32.8541)`.
`api.open-meteo.com` (anahtarsız): anlık sıcaklık, hissedilen, yağış olasılığı, rüzgâr +
4 günlük tahmin. İstekler `useWeather` içinde 10 dk önbellekli; şehir arama/ayar yoktur.

### 5.4 Ekran koruyucu = kelime kartları

`src/components/IdleScreen.tsx`: boşta kalınca (Ayarlar → *Boşta kalma süresi*) ekran
**öğrenme kelimelerini** döndürür: kelime 15 sn görünür → 5 sn sonra anlamı açılır →
sonraki kelime. Üstte saat + Ankara havası, altta son mesajlar. Dokununca uyanır.

### 5.5 Beslenme & Ders Programı (popup)

`src/modules/Programs.tsx`: ana ekrandaki iki buton (veya mobil FAB) **modal popup** açar,
sayfa yer kaplamaz. Veriler `nutrition` ve `lessons` tablolarında, aileyle birlikte senkronize
olur. Kayıt şeması `worker/schema.sql` içinde yorum olarak hazırdır.

### 5.6 Yemek Öneri Motoru — `src/lib/mealIdeas.ts`

`Meals → Ne Pişirsem?` (veya bir güne ait 🔀 düğmesi) üç öğün için teklif paneli açar:

1. **Ev kütüphanesi**: 15 kahvaltı + 17 öğle + 24 akşam yemeği; her birinde malzeme,
   hazırlama adımları, etiketler (hızlı / çocuk sever / sıcak…) ve mevsim bilgisi.
2. **Sıralama**: hava durumuna göre — ≤8 °C'de sıcak/çorba öne çıkar, ≥26 °C'de hafif/salata.
   Son 10 günde pişirilenler elenir; **Başka öner** ile yeni grup gelir.
3. **İnternet**: `🌐 İnternetten` ile TheMealDB'den (ücretsiz, anahtarsız) gerçek fotoğraf +
   tam tarif metni çekilir; `Tarif` düğmesi internet tarifini de dener.
4. **Seç**: bir öneriye `Seç` denince ilgili öğüne (kahvaltı/öğle/akşam) ve seçili güne yazılır.

Test: `npm run test:meals` (kütüphane + soğuk hava önceliği + canlı API erişimi).

### 5.7 Animasyonlu hava durumu

`src/components/WeatherScene.tsx` — WMO kod grubuna göre gökyüzü gradyanı + güneş/ay,
sürüklenen bulutlar, yağmur damlaları, kar taneleri, şimşek çakması ve sis bantları;
durum değişince 700 ms yumuşak geçiş. Ana sayfa kartları `Reveal` ile kademeli belirir,
kartlarda hover yükselme, ilerleme çubuğunda parlama var. Tümü saf CSS (ağır paket yok).

### 5.8 Tema, menü ve kapak görseli

- **Temalar** (`src/lib/themes.ts`): 6 palet (Klasik/Okyanus/Gün Batımı/Orman/Üzüm/Grafit).
  Marka rengi Tailwind'de CSS değişkeni (`rgb(var(--brand-500) / <alpha-value>)`); tema
  `<html data-theme>` üzerine yazılır, bu yüzden portal içindeki pencereler de değişir ve
  **yenileme gerekmez**.
- **Sol menü**: kenarındaki ince şeritten tek tıkla gizlenir/görünür (daraltılmış hâlde
  yalnız ikonlar).
- **Kapak görseli** (`src/components/BandCover.tsx`): yüklenen fotoğrafın üst yarısı
  sinematik foto, alt yarısı SVG su boya filtresiyle (feTurbulence + feDisplacementMap)
  aynı sahnenin illüstrasyonu; aralarında yırtık kâğıt kenarı, altta fildişi kâğıt alanı,
  **Caveat** el yazısı altyazı ve ince çizgi. Ayarlar'da hazır yapay zekâ prompt'u
  kopyalanabilir.

### 5.4 Dashboard / Kiosk / Mobil layout

- `App` → `mode` (`auto`/`kiosk`/`mobile`) + ekran genişliğine göre layout seçer.
- **Kiosk:** sol büyük menü rayı, dev saat, üyeler, senkron rozeti, `idleMinutes`
  sonra ekran koruyucu (saat + hava + son mesajlar), dokununca uyanır.
- **Mobil:** alt navigasyon (5 sekme), başlıkta saat + senkron noktası, sağ altta
  **FAB** → hızlı ekleme (alışveriş / mesaj / etkinlik / görev).

---

## 6. Dağıtım Özeti

- **Docker / Dokploy** (önerilen): bkz. §1-B. `docker run -p 3000:3000 -e FAMILY_CODE=… -v ailepanosu-data:/data <imaj>`
- **Cloudflare**: bkz. §2 → *Cloudflare*. Web Push için ayrıca `npx wrangler secret put VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (genel anahtar istemciye `/push/key` ile verilir).
  Eski sürümün D1 `family_state` kaydı ilk açılışta Durable Object depolamasına taşınır.

## 7. Duvar/Tablet (Kiosk) Kurulumu — Eski Android

1. Tablette Chrome'u aç → FamilyOS adresine gid → **Ana ekrana ekle** (PWA).
2. Ayarlar → **Ekran & Kiosk** → *Duvar/Kiosk* modu + boşta kalma süresi.
3. Chrome'un kiosk tarzı tam ekranı için:
   - `chrome://flags → Immersive mode` (varsa) veya
   - **Fully Kiosk Browser** / **Screen On** gibi uygulamalarla açılışta otomatik başlat.
4. Ekran uyumasın: Ayarlar → Ekran → *Uyku: Asla* + şarjda bırakın.
5. Yeni mesaj gelince: **ses + titreşim + overlay**; ekran karartıldıysa
   `IdleScreen` mesajı gösterir (dokununca uyanır).

---

## 8. Ortam Değişkenleri

**Sunucu (Docker / Dokploy → Environment):**

| Anahtar | Açıklama |
| --- | --- |
| `FAMILY_CODE` | **Zorunlu.** Cihazlarda bir kez girilen aile kodu (en az 6 karakter önerilir). Kodu bilmeyen veriyi göremez/değiştiremez |
| `PORT` | Varsayılan `3000` |
| `DATA_DIR` | Varsayılan `/data` (Docker). `state.json` + `backups/` (günlük, 14 gün) + Web Push anahtarları |
| `ALLOWED_ORIGINS` | Uygulama başka bir alan adından senkrona bağlanacaksa (virgülle) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Opsiyonel — verilmezse sunucu kendisi üretir |

**Derleme (`.env`, çoğu durumda gerekmez):**

| Anahtar | Açıklama |
| --- | --- |
| `VITE_SYNC_URL` | Boş = uygulamanın kendi adresi (`/sync`). `off` = yalnızca bu cihaz. Ya da başka bir `wss://…/sync` |

---

## 9. PWA / Offline Davranışı

- `sw.js`: kurulumda uygulama dosyalarını önbelleğe alır → tablet internetsiz yeniden açılsa da çalışır.
  Navigasyonda **ağ → önbellek → offline.html**; derleme dosyalarında önbellek öncelik.
- `push` olayı → bildirim; `notificationclick` → Mesajlar sekmesini açar.
- İnternet/sunucu kesilirse değişiklikler **giden kutusunda** (`familyos:outbox:v1`) bekler; bağlantı gelince
  sunucunun güncel verisinin üzerine yeniden uygulanıp gönderilir. Sunucu aynı değişikliği iki kez uygulamaz.
- 15 sn'den uzun kopmalarda ekranda "N değişiklik bağlantı gelince gönderilecek" uyarısı görünür;
  cihaz hafızası dolarsa kırmızı uyarı çıkar.

## 10. Güvenlik

- Senkron ve bildirim uçları **aile kodu** ister; kod WebSocket'in ilk mesajında gönderilir (adreste/loglarda görünmez).
  IP başına 10 dk'da 10 hatalı denemeden sonra 10 dk bekletilir.
- Başka sitelerden gelen WebSocket bağlantıları (Origin) reddedilir.
- Sunucu gelen her değişikliği doğrular (bilinmeyen tablo, kimliksiz kayıt, aşırı büyük liste, gelecek tarihli damga).
- Sıkı CSP + `X-Frame-Options`, `nosniff`, `Referrer-Policy` (`server/securityHeaders.ts`, Docker ve Cloudflare ortak).
- Docker imajı root olmayan kullanıcıyla çalışır; sunucu tek dosyaya paketlidir (`node_modules` yok).
