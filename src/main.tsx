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

/* Suluboya filtresi — bir kez, uygulama kökünde tanımlanır (portal içinde de çalışır) */
const watercolorSvg = document.createElement('div')
watercolorSvg.setAttribute('aria-hidden', 'true')
watercolorSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
watercolorSvg.innerHTML = `
<svg width="0" height="0" focusable="false" aria-hidden="true" style="position:absolute">
  <defs>
    <filter id="watercolor" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.014 0.022" numOctaves="4" seed="11" result="grain" />
      <feDisplacementMap in="SourceGraphic" in2="grain" scale="26" xChannelSelector="R" yChannelSelector="G" result="warp" />
      <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="3" result="paper" />
      <feColorMatrix in="paper" type="saturate" values="0" result="paperGray" />
      <feBlend in="warp" in2="paperGray" mode="multiply" result="textured" />
      <feDisplacementMap in="textured" in2="grain" scale="7" xChannelSelector="R" yChannelSelector="G" result="soft" />
      <feGaussianBlur in="soft" stdDeviation="0.5" />
    </filter>
  </defs>
</svg>`
document.body.appendChild(watercolorSvg)

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
