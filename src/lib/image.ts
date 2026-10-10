/**
 * Fotoğraf yükleme yardımcısı: küçültüp JPEG'e çevirir.
 *
 * Fotoğraflar veriyle birlikte saklanır ve tüm cihazlara gönderilir; tarayıcı
 * depolaması ~5 MB olduğu için büyük bir fotoğraf tüm kaydı durdurabilir.
 * Bu yüzden ekranda göründüğü boyuta göre küçültülür (bkz. PHOTO_SIZES).
 */
export const PHOTO_SIZES = {
  /** Aile fotoğrafı (yonca/kapak) — tablette en fazla ~600 px görünür, 2x keskinlik */
  family: { maxSize: 1280, quality: 0.85 },
  /** Kişi fotoğrafı (avatar / yonca yaprağı) */
  member: { maxSize: 512, quality: 0.85 },
} as const

export async function fileToDataUrl(file: File, maxSize: number, quality = 0.85): Promise<string> {
  const dataUrl = await readFile(file)
  const img = await loadImage(dataUrl)

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Görsel işlenemedi')
  // Saydam PNG'ler JPEG'de siyah olmasın
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  const out = canvas.toDataURL('image/jpeg', quality)
  // Küçük ve zaten sıkıştırılmış bir dosya JPEG'de büyüdüyse orijinali koru
  return scale === 1 && dataUrl.length < out.length && dataUrl.startsWith('data:image/jpeg') ? dataUrl : out
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

/** Kayıtlı (data URL) bir fotoğrafı küçültür — eski sürümde boyut sınırı yoktu. */
export async function shrinkDataUrl(dataUrl: string, maxSize: number, quality = 0.85): Promise<string> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  const out = canvas.toDataURL('image/jpeg', quality)
  return out.length < dataUrl.length ? out : dataUrl
}
