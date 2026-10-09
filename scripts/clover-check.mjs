/**
 * Yoncada fotoğraf yerleşimini denetler: her <image> koordinatı
 * yaprak yolunun içinde mi, yoksa dışarıda mı?
 *   node scripts/clover-check.mjs
 */
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

globalThis.window = undefined

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

/* 1x1 PNG'ler (kırmızı, yeşil, mavi, sarı) — fotoğraf yerine geçer */
const png = (r, g, b) =>
  `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`

const { FamilyClover } = await vite.ssrLoadModule('/src/components/FamilyClover.tsx')

const members = ['Ayşe', 'Mehmet', 'Elif', 'Ali'].map((name, i) => ({
  id: `m${i}`,
  name,
  color: ['#f97362', '#4f6ef7', '#22c55e', '#f59e0b'][i],
  emoji: '👤',
  role: i < 2 ? 'parent' : 'child',
  order: i,
  photo: png(0, 0, 0),
  updatedAt: 0,
}))

const svg = renderToStaticMarkup(
  React.createElement(FamilyClover, { members, size: 62 }),
)

const LEAF_BOX = { x: 8, y: 6, w: 84, h: 47 }
const images = [...svg.matchAll(/<image[^>]*>/g)].map((m) => m[0])

let fail = false
console.log(`<image> sayisi: ${images.length}`)

for (const [i, tag] of images.entries()) {
  const attr = (n) => {
    const m = tag.match(new RegExp(`${n}="([^"]+)"`))
    return m ? Number(m[1]) : NaN
  }
  const x = attr('x')
  const y = attr('y')
  const w = attr('width')
  const h = attr('height')
  const right = x + w
  const bottom = y + h
  const ok =
    Number.isFinite(x) &&
    x >= LEAF_BOX.x &&
    y >= LEAF_BOX.y &&
    right <= LEAF_BOX.x + LEAF_BOX.w &&
    bottom <= LEAF_BOX.y + LEAF_BOX.h
  if (!ok) fail = true
  console.log(
    `  #${i}: x=${x} y=${y} w=${w} h=${h} -> sag=${right} alt=${bottom}  ${ok ? 'OK' : 'YAPRAG DISINDA'}`,
  )
}

const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]
const svgH = svg.match(/height="([^"]+)"/)?.[1]
const overflow = /overflow-visible/.test(svg)
console.log(`viewBox=${viewBox} height=${svgH} overflowVisible=${overflow}`)

const ok = images.length === 4 && !fail
console.log(ok ? '\nSONUC: OK — 4 fotograf da yaprak icinde' : '\nSONUC: HATA')
process.exit(ok ? 0 : 1)