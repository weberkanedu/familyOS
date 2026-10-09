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

/* Yaprak yolundan gerçek sınır kutusu (Bezier kontrol noktaları taranarak) */
const LEAF_PATH =
  'M50 52 C 36 51, 16 46, 12 33 C 8 19, 18 8, 31 10 C 40 11, 46 17, 50 26 C 54 17, 60 11, 69 10 C 82 8, 92 19, 88 33 C 84 46, 64 51, 50 52 Z'

function leafBBox(d) {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number)
  const xs = []
  const ys = []
  for (let i = 0; i < nums.length - 1; i += 2) {
    xs.push(nums[i])
    ys.push(nums[i + 1])
  }
  // kontrol noktaları eğriyi tam sarmaz; %3 pay bırak
  const pad = 3
  return {
    x: Math.min(...xs) + pad,
    y: Math.min(...ys) + pad,
    r: Math.max(...xs) - pad,
    b: Math.max(...ys) - pad,
  }
}

const box = leafBBox(LEAF_PATH)
const images = [...svg.matchAll(/<image[^>]*>/g)].map((m) => m[0])

let fail = false
console.log(`yaprak kutusu: x ${box.x}..${box.r}  y ${box.y}..${box.b}`)
console.log(`<image> sayisi: ${images.length}`)

for (const [i, tag] of images.entries()) {
  const attr = (n) => {
    const m = tag.match(new RegExp(`${n}="([^"]+)"`))
    return m ? Number(m[1]) : NaN
  }
  const x = attr('x')
  const y = attr('y')
  const right = x + attr('width')
  const bottom = y + attr('height')
  /* Görsel yapraktan küçükse yaprağın bir kısmı boş kalır (kötü) */
  const covers = x <= box.x && y <= box.y && right >= box.r && bottom >= box.b
  /* Dışarı taşarsa clipPath olmadan yoncayı bozar; klipsiz de güvenli kalsın */
  const overflow = Math.max(0, right - box.r) + Math.max(0, bottom - box.b) + Math.max(0, box.x - x) + Math.max(0, box.y - y)
  /* React, clipPath özniteliğini "clip-path" olarak basar */
  const clipped = new RegExp(`clip-path="url\\(#cl-[^"]*-${i}\\)"`).test(svg)
  const ok = covers && clipped
  if (!ok) fail = true
  console.log(
    `  #${i}: ${x},${y} -> ${right},${bottom} | yapragi kapsiyor=${covers ? 'evet' : 'HAYIR'} | clipPath=${clipped ? 'var' : 'YOK'} | tasma=${overflow.toFixed(0)} ${ok ? 'OK' : 'HATA'}`,
  )
}

/* Her yaprak kendi id'sini kullanmalı: id'ler çakışırsa fotoğraflar karışır */
const ids = [...svg.matchAll(/id="(cl-[^"]+)"/g)].map((m) => m[1])
const refs = [...svg.matchAll(/clip-path="url\(#(cl-[^"]+)\)/g)].map((m) => m[1])
const uniqueIds = new Set(ids).size === ids.length
const allRefsExist = refs.every((r) => ids.includes(r))
if (!uniqueIds || !allRefsExist) fail = true
console.log(`id sayisi=${ids.length} benzersiz=${uniqueIds ? 'evet' : 'HAYIR (cakisma!)'} | clipPath referanslari=${refs.length} hepsi tanimli=${allRefsExist ? 'evet' : 'HAYIR'}`)

const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]
const svgH = svg.match(/height="([^"]+)"/)?.[1]
const overflow = /overflow-visible/.test(svg)
console.log(`viewBox=${viewBox} height=${svgH} overflowVisible=${overflow}`)

/* Aynı bileşen ikinci kez render edildiğinde id'ler DEĞİŞMEMELİ.
   Math.random() kullanılsaydı her render'da farklı id üretilir,
   tarayıcı eski maskeyi kullanır ve fotoğraflar yanlış yaprakta kalır. */
const svg2 = renderToStaticMarkup(React.createElement(FamilyClover, { members, size: 62 }))
const ids2 = [...svg2.matchAll(/id="(cl-[^"]+)"/g)].map((m) => m[1])
const stable = ids2.join(',') === ids.join(',')
if (!stable) fail = true
console.log(`id kararliligi (2. render): ${stable ? 'kararli (OK)' : 'DEGISTI - HATA'}`)

/* Aynı React ağacında iki yonca: id'ler benzersiz olmalı.
   (Ayrı renderToStaticMarkup çağrıları AYRI tree'dir; her biri sayacı
   sıfırlar, bu yüzden tek tree içinde sarmalayarak test ediyoruz.) */
const pair = renderToStaticMarkup(
  React.createElement(
    'div',
    null,
    React.createElement(FamilyClover, { members, size: 62 }),
    React.createElement(FamilyClover, { members, size: 62 }),
  ),
)
const pairIds = [...pair.matchAll(/id="(cl-[^"]+)"/g)].map((m) => m[1])
const pairOverlap = pairIds.filter((x, i) => pairIds.indexOf(x) !== i)
if (pairOverlap.length) {
  fail = true
  console.log(`HATA: ayni agacta id cakismasi -> ${[...new Set(pairOverlap)].join(', ')}`)
} else {
  console.log(`ayni agacta iki yonca: ${pairIds.length} id, cakisma yok (OK)`)
}

/* Uygulamada aynı anda kaç yonca mount oluyor? (KioskLayout tek yerde kullanıyor) */
const usages = (await import('node:fs')).readFileSync('src/components/layouts/KioskLayout.tsx', 'utf8')
const cloverUses = (usages.match(/<FamilyClover/g) || []).length
console.log(`KioskLayout icinde <FamilyClover> kullanimi: ${cloverUses}`)

const ok = images.length === 4 && !fail
console.log(ok ? '\nSONUC: OK — 4 fotograf da yaprak icinde' : '\nSONUC: HATA')
process.exit(ok ? 0 : 1)