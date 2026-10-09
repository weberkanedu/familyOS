import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { seedDB } from './state/seed'
import { getDB, hydrate } from './state/store'
import { migrate } from './state/migrate'

/* İlk açılış: boşsa tohum veriyle başlat (id'ler sabit → cihazlar arası çakışmaz) */
if (getDB().members.length === 0) {
  hydrate(seedDB())
}

/* Eski sürümden kalan verileri güncel şemaya taşı */
migrate()


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
