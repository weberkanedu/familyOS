/* FamilyOS Service Worker - çevrimdışı fallback + önbellek + push */
const VERSION = 'familyos-v3' // değişince eski önbellekler silinir
const PRECACHE = `${VERSION}-precache`
const RUNTIME = `${VERSION}-runtime`
const OFFLINE_URL = '/offline.html'

const NAV_TIMEOUT_MS = 6000

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    )
  })
}

/** Çevrimdışı kabuk: önce her açılışta güncellenen RUNTIME kopyası (en son çalışan sürüm),
 *  sonra kurulumdaki kopya. caches.match() tüm önbellekleri oluşturma sırasıyla tarar ve
 *  kurulumdaki ESKİ index.html'i döndürürdü — gece TV'ye TV modundan önceki sürüm gelmişti. */
async function cachedShell() {
  const runtime = await caches.open(RUNTIME)
  return (
    (await runtime.match('/index.html')) ||
    (await caches.match('/index.html')) ||
    (await caches.match(OFFLINE_URL)) ||
    new Response('Çevrimdışı', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  )
}

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

/** index.html'in yüklediği derleme dosyalarını da önbelleğe al:
 *  tablet internetsiz yeniden açılsa bile uygulama başlayabilsin. */
async function precacheAppShell(cache) {
  await cache.addAll(PRECACHE_ASSETS).catch(() => undefined)
  try {
    const html = await (await fetch('/index.html', { cache: 'no-store' })).text()
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
    await cache.addAll(assets)
  } catch (e) {
    /* çevrimdışı kurulum: çalışma anında önbelleğe alınır */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then(precacheAppShell)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigasyon: ağa öncelik (en çok NAV_TIMEOUT_MS bekle), olmazsa önbellek, olmazsa offline sayfası.
  // Zaman aşımı: modem interneti kestiğinde istek hata vermeden asılı kalıyordu (TV'de siyah ekran).
  if (req.mode === 'navigate') {
    event.respondWith(
      withTimeout(fetch(req), NAV_TIMEOUT_MS)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(RUNTIME).then((c) => c.put('/index.html', copy)).catch(() => {})
          }
          return res
        })
        .catch(cachedShell),
    )
    return
  }

  // Statik varlıklar: önbellek öncelikli
  if (/\.(js|css|png|svg|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {})
            return res
          }),
      ),
    )
  }
})

/* Web Push */
self.addEventListener('push', (event) => {
  let payload = { title: 'FamilyOS', body: 'Yeni bir mesaj var', url: '/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (e) {
    if (event.data) payload.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
      vibrate: [120, 60, 120],
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
