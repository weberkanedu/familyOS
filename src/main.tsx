import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { seedDB } from './state/seed'
import { getDB, hydrate, markSeedOnly } from './state/store'
import { migrate } from './state/migrate'
import { resolveSyncUrl } from './sync/config'
import { setupTV } from './lib/tv'

/* TV launcher'ı içindeysek: hafif görünüm + D-pad (ilk çizimden önce) */
setupTV()

/* İlk açılış: boşsa tohum veriyle başlat (id'ler sabit → cihazlar arası çakışmaz) */
if (getDB().members.length === 0) {
  hydrate(seedDB())
  markSeedOnly()
}

/* Eski sürümden kalan verileri güncel şemaya taşı.
 * Senkron açıksa göç, sunucu verisi geldikten sonra yapılır (useFamilySync) —
 * aksi halde bu cihazın varsayılan ayarları ailenin ayarlarının üstüne yazılırdı. */
if (!resolveSyncUrl()) migrate()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

/* PWA: service worker (üretimde) */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW kayıt hatası sessiz geçilir */
    })
  })
}
