/**
 * Yonca yerleşim denetimi — her koşulda:
 *   1) her üye tam 1 yaprak alıyor mu
 *   2) yapraklar birbirine biniyor mu (kütle çakışması)
 *   3) her fotoğraf kendi yaprağının maskesiyle kırpılmış mı
 *   4) clipPath id'leri kararlı ve benzersiz mi
 *   node scripts/clover-check.mjs
 */
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'

globalThis.window = undefined

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
const { FamilyClover } = await vite.ssrLoadModule('/src/components/FamilyClover.tsx')

const mk = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    name: ['Ayşe', 'Mehmet', 'Elif', 'Ali', 'Zeynep', 'Can'][i],
    color: ['#f97362', '#4f6ef7', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6'][i],
    emoji: '👤',
    role: i < 2 ? 'parent' : 'child',
    order: i,
    photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    updatedAt: 0,
  }))

/* SVG yolunu örnekleyip merkeze göre açısal genişliği hesaplar (derece) */
function samplePath(d, steps = 24) {
  const t = d.match(/[MC]|-?\d+(?:\.\d+)?/g)
  const pts = []
  let i = 0
  let cur = [0, 0]
  while (i < t.length) {
    const cmd = t[i]
    if (cmd === 'M') {
      cur = [Number(t[i + 1]), Number(t[i + 2])]
      i += 3
    } else {
      const p0 = cur
      const p1 = [Number(t[i + 1]), Number(t[i + 2])]
      const p2 = [Number(t[i + 3]), Number(t[i + 4])]
      const p3 = [Number(t[i + 5]), Number(t[i + 6])]
      for (let s = 1; s <= steps; s++) {
        const u = s / steps
        const v = 1 - u
        pts.push([
          v ** 3 * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u ** 3 * p3[0],
          v ** 3 * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u ** 3 * p3[1],
        ])
      }
      cur = p3
      i += 7
    }
  }
  return pts
}

/**
 * Açısal genişlik: en büyük boşluk açısını bulup 360°'den çıkarır.
 * (min/max kullanmak 0° sınırında taşar; dairesel yaklaşım gerekir.)
 */
function leafAngularSpan(d) {
  const CX = 50
  const CY = 50
  const angles = samplePath(d)
    .map(([x, y]) => [x - CX, y - CY])
    .filter(([dx, dy]) => Math.hypot(dx, dy) > 2)
    .map(([dx, dy]) => {
      let a = (Math.atan2(dx, -dy) * 180) / Math.PI
      return a < 0 ? a + 360 : a
    })
    .sort((a, b) => a - b)

  let maxGap = 0
  for (let i = 0; i < angles.length; i++) {
    const next = i === angles.length - 1 ? angles[0] + 360 : angles[i + 1]
    maxGap = Math.max(maxGap, next - angles[i])
  }
  return 360 - maxGap
}

const src = readFileSync('src/components/FamilyClover.tsx', 'utf8')
const LEAF = src.match(/const LEAF =\s*'([^']+)'/)?.[1]
const step = LEAF ? 360 / LEAF.split('C').length : 0
const span = LEAF ? leafAngularSpan(LEAF) : 0

let fail = false
console.log(`yaprak acisal genisligi: ${span.toFixed(1)}°`)

for (const n of [1, 2, 3, 4]) {
  const members = mk(n)
  const svg = renderToStaticMarkup(React.createElement(FamilyClover, { members, size: 62 }))

  /* Her yaprak bir rotate() grubu içindedir; clipPath tanımları sayılmaz */
  const leaves = (svg.match(/transform="rotate\([-\d.]+ 50 50\)"/g) || []).length
  const images = (svg.match(/<image/g) || []).length
  const masks = (svg.match(/<clipPath/g) || []).length
  const refs = (svg.match(/clip-path="url\(#(cl-[^"]+)\)"/g) || []).length
  const rotations = [...svg.matchAll(/transform="rotate\(([-\d.]+) 50 50\)"/g)].map((m) => Number(m[1]))

  /* Yaprak başına düşen açı aralığı (komşu yapraklar arası) */
  const perLeaf = 360 / n
  /* Yaprak kendi yarı genişliğinden fazlasını kaplarsa komşuya biner */
  const overlaps = span > perLeaf + 0.5

  const ok = leaves === n && images === n && masks === n && refs === n && !overlaps
  if (!ok) fail = true

  console.log(
    `${n} kisi -> yaprak=${leaves} foto=${images} maske=${masks} ref=${refs} ` +
      `acilar=[${rotations.join(', ')}] yaprakBasina=${perLeaf}° ` +
      `${ok ? 'OK' : 'HATA'}${overlaps ? ' (yapraklar biniyor!)' : ''}`,
  )
}

/* 5+ kişide +N rozeti */
const svg5 = renderToStaticMarkup(React.createElement(FamilyClover, { members: mk(6), size: 62 }))
const badge = svg5.match(/>\+(\d+)</)?.[1]
const ok5 = badge === '2'
if (!ok5) fail = true
console.log(`6 kisi -> "+${badge}" rozeti ${ok5 ? 'OK' : 'HATA (beklenen +2)'}`)

/* id kararlılığı: iki render aynı id'leri vermeli */
const a = renderToStaticMarkup(React.createElement(FamilyClover, { members: mk(4), size: 62 }))
const b = renderToStaticMarkup(React.createElement(FamilyClover, { members: mk(4), size: 62 }))
const ia = [...a.matchAll(/id="(cl-[^"]+)"/g)].map((m) => m[1])
const ib = [...b.matchAll(/id="(cl-[^"]+)"/g)].map((m) => m[1])
const stable = ia.join() === ib.join()
if (!stable) fail = true
console.log(`id kararliligi: ${stable ? 'kararli (OK)' : 'DEGISTI - HATA'}`)

/* aynı ağaçta iki yonca: çakışma olmamalı */
const pair = renderToStaticMarkup(
  React.createElement(
    'div',
    null,
    React.createElement(FamilyClover, { members: mk(4), size: 62 }),
    React.createElement(FamilyClover, { members: mk(4), size: 62 }),
  ),
)
const pid = [...pair.matchAll(/id="(cl-[^"]+)"/g)].map((m) => m[1])
const dup = pid.filter((x, i) => pid.indexOf(x) !== i)
if (dup.length) fail = true
console.log(`ayni agacta iki yonca: ${pid.length} id, cakisma ${dup.length ? 'VAR - HATA' : 'yok (OK)'}`)

console.log(fail ? '\nSONUC: HATA' : '\nSONUC: OK — her kisi icin tam bir yaprak, binme yok')
process.exit(fail ? 1 : 0)