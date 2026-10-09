/**
 * Fotoğraf yükleme yardımcısı: JPEG'e çevirir.
 * maxSize = 0 ise hiç küçültme yapılmaz (ne yüklendiysen kabul edilir).
 */
export async function fileToDataUrl(file: File, maxSize = 0, quality = 0.92): Promise<string> {
  const dataUrl = await readFile(file)
  const img = await loadImage(dataUrl)

  const limit = maxSize > 0 ? maxSize : 6000 // tarayıcı sınırı ~6000px
  const scale = Math.min(1, limit / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  try {
    const out = canvas.toDataURL('image/jpeg', quality)
    // JPEG dönüşümü büyüttüyse (nadir) orijinali koru
    return out.length < dataUrl.length ? out : dataUrl
  } catch {
    return dataUrl
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('Dosya okunamadı'))
    fr.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Görsel açılamadı'))
    img.src = src
  })
}

/** Yaklaşık KB boyutu (arayüzde göstermek için) */
export function approxKb(dataUrl: string): number {
  return Math.round((dataUrl.length * 3) / 4 / 1024)
}
