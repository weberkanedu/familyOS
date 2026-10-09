/**
 * FamilyOS ikon üretici — harici bağımlılık yok (saf Node + zlib).
 * Kullanım: node scripts/generate-icons.mjs
 * Çıktı: public/icons/icon-192.png, icon-512.png, maskable-512.png
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

/* ---------- CRC32 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

/* ---------- Şekil yardımcıları (0..1 normalize koordinat) ---------- */
function insideRoundRect(u, v, x0, y0, x1, y1, r) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false
  const rx = Math.min(r, (x1 - x0) / 2)
  const ry = Math.min(r, (y1 - y0) / 2)
  const cx = Math.max(x0 + rx, Math.min(x1 - rx, u))
  const cy = Math.max(y0 + ry, Math.min(y1 - ry, v))
  const dx = (u - cx) / rx
  const dy = (v - cy) / ry
  return dx * dx + dy * dy <= 1
}

function mix(a, b, t) {
  return a.map((x, i) => Math.round(x + (b[i] - x) * t))
}

const BG_TOP = [79, 110, 247] // #4f6ef7
const BG_BOTTOM = [11, 16, 32] // #0b1020
const WHITE = [255, 255, 255]
const INK = [26, 33, 64]

/** maskable=true ise arka plan tamamen dolu (safe zone %20). */
function renderIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const SS = 3 // supersampling
  const pad = maskable ? 0 : 0.06

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size
          const v = (py + (sy + 0.5) / SS) / size
          const col = sample(u, v, maskable, pad)
          r += col[0]
          g += col[1]
          b += col[2]
          a += col[3]
        }
      }
      const n = SS * SS
      const idx = (py * size + px) * 4
      rgba[idx] = Math.round(r / n)
      rgba[idx + 1] = Math.round(g / n)
      rgba[idx + 2] = Math.round(b / n)
      rgba[idx + 3] = Math.round(a / n)
    }
  }
  return encodePNG(size, size, rgba)
}

function sample(u, v, maskable, pad) {
  // Köşe yarıçapı
  const R = maskable ? 0.0 : 0.22
  const inShape = maskable
    ? true
    : insideRoundRect(u, v, pad, pad, 1 - pad, 1 - pad, R * (1 - 2 * pad))

  if (!inShape) return [0, 0, 0, 0]

  // Arka plan degrade
  const t = Math.min(1, Math.max(0, (u + v) / 2))
  let col = mix(BG_TOP, BG_BOTTOM, t)

  // Takvim gövdesi
  const bx0 = 0.17
  const bx1 = 0.83
  const by0 = 0.25
  const by1 = 0.87
  const body = insideRoundRect(u, v, bx0, by0, bx1, by1, 0.07)
  if (body) col = WHITE

  // Başlık bandı
  const head = insideRoundRect(u, v, bx0, by0, bx1, by0 + 0.13, 0.07)
  if (head) col = [64, 92, 230]

  // Askı çubukları
  const ringL = insideRoundRect(u, v, 0.3, 0.15, 0.37, 0.33, 0.035)
  const ringR = insideRoundRect(u, v, 0.63, 0.15, 0.7, 0.33, 0.035)
  if ((ringL || ringR) && !head) col = WHITE

  // Gün ızgarası (6 nokta)
  const cols = 3
  const rows = 2
  const gx0 = 0.27
  const gx1 = 0.73
  const gy0 = 0.47
  const gy1 = 0.76
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const cx = gx0 + ((gx1 - gx0) / (cols - 1)) * i
      const cy = gy0 + ((gy1 - gy0) / (rows - 1)) * j
      const dot = insideRoundRect(u, v, cx - 0.055, cy - 0.055, cx + 0.055, cy + 0.055, 0.02)
      if (dot && body && !head) col = i === 0 && j === 0 ? [249, 115, 98] : [79, 110, 247]
    }
  }

  // Ayraç çizgisi
  if (body && !head && Math.abs(v - 0.415) < 0.012 && u > 0.24 && u < 0.76) col = INK

  return [col[0], col[1], col[2], 255]
}

const jobs = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['maskable-512.png', 512, { maskable: true }],
]

for (const [name, size, opts] of jobs) {
  const buf = renderIcon(size, opts)
  writeFileSync(join(OUT, name), buf)
  console.log(`✓ ${name} (${size}x${size}, ${buf.length} bayt)`)
}
