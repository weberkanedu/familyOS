/**
 * Render duman testi: App'i SSR ile render edip çökmediğini doğrular.
 *   node scripts/render-smoke.mjs
 */
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import React from 'react'

/* Tarayıcı bağımlılıklarını taklit et */
const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}
globalThis.window = undefined

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

let exitCode = 1
try {
  const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
  const { hydrate, getDB } = await vite.ssrLoadModule('/src/state/store.ts')
  const { seedDB } = await vite.ssrLoadModule('/src/state/seed.ts')
  hydrate(seedDB())

  const html = renderToString(React.createElement(App))
  const checks = [
    ['Marka adi', html.includes('\u0130\u00C7\u0130L Ailesi')],
    ['Beslenme kisayolu', html.includes('Beslenme')],
    ['Ders programi kisayolu', html.includes('Ders Program')],
    ['Uye avatarlari', html.includes('\u{1F469}\u{1F3FD}') || html.includes('emoji')],
    ['Hava karti', html.includes('Ankara 06070') && html.includes('<svg')],
    ['Alt navigasyon', html.includes('Takvim')],
    ['Tohum mesaj', html.includes('misafir geliyor')],
    ['Gorevler', html.includes('\u00C7\u00F6p\u00FC')],
    ['Market listesi', html.includes('Al\u0131\u015Fveri\u015F')],
  ]
  let ok = true
  for (const [name, pass] of checks) {
    console.log(`${pass ? 'OK ' : 'FAIL'} ${name}`)
    if (!pass) ok = false
  }
  console.log(`DB uye sayisi: ${getDB().members.length}`)
  console.log(ok ? 'RENDER TESTI GECTI' : 'RENDER TESTI BASARISIZ')
  exitCode = ok ? 0 : 1
} catch (e) {
  console.error('RENDER HATASI:', e)
  exitCode = 1
} finally {
  await vite.close()
  process.exit(exitCode)
}
