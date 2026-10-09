/** Hava koşuluna göre görsel stil (renk gradyanı, ikon çeşidi, yön etiketi) */

export type Cond = 'clear' | 'partly' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog'

export function condOf(code: number): Cond {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 95) return 'storm'
  if (code >= 71 && code <= 86) return 'snow'
  if (code >= 51) return 'rain'
  return 'partly'
}

export interface CondStyle {
  bg: string
  /** Metin rengi: light = beyaz, dark = koyu */
  text: 'light' | 'dark'
}

export function styleFor(code: number, isDay = true): CondStyle {
  const cond = condOf(code)
  switch (cond) {
    case 'clear':
      return isDay
        ? { bg: 'linear-gradient(115deg,#8ec5ff 0%,#ffd97d 62%,#ffb84d 100%)', text: 'light' }
        : { bg: 'linear-gradient(115deg,#1e3a8a 0%,#4338ca 60%,#312e81 100%)', text: 'light' }
    case 'partly':
      return isDay
        ? { bg: 'linear-gradient(115deg,#a8d8ff 0%,#ffe6a8 70%,#ffd0a1 100%)', text: 'dark' }
        : { bg: 'linear-gradient(115deg,#2b3f77 0%,#4b5b95 70%,#6b5f86 100%)', text: 'light' }
    case 'cloudy':
      return { bg: 'linear-gradient(115deg,#cbd8e8 0%,#9fb2c7 70%,#8296ad 100%)', text: 'dark' }
    case 'rain':
      return { bg: 'linear-gradient(115deg,#8fd0f7 0%,#4b9fe0 65%,#2f6fb5 100%)', text: 'light' }
    case 'snow':
      return { bg: 'linear-gradient(115deg,#e8f4ff 0%,#bcd8ee 70%,#93b6d1 100%)', text: 'dark' }
    case 'storm':
      return { bg: 'linear-gradient(115deg,#5b6b85 0%,#33415c 60%,#1b2436 100%)', text: 'light' }
    case 'fog':
    default:
      return { bg: 'linear-gradient(115deg,#e6ecf3 0%,#c3cedb 70%,#a6b4c4 100%)', text: 'dark' }
  }
}

/** Tam ekran sahne arka planı (WeatherScene ile uyumlu, daha yumuşak) */
export function sceneFor(code: number, isDay = true): string {
  const cond = condOf(code)
  switch (cond) {
    case 'clear':
      return isDay
        ? 'linear-gradient(165deg,#38bdf8 0%,#60a5fa 45%,#a5b4fc 100%)'
        : 'linear-gradient(165deg,#0b1226 0%,#1c2748 50%,#312e81 100%)'
    case 'partly':
      return isDay
        ? 'linear-gradient(165deg,#5cbdf5 0%,#7aa7ef 55%,#b7b8ef 100%)'
        : 'linear-gradient(165deg,#141c30 0%,#27324f 60%,#3c3f6b 100%)'
    case 'cloudy':
      return isDay
        ? 'linear-gradient(165deg,#93b7d4 0%,#a9bdd2 60%,#c3cbd8 100%)'
        : 'linear-gradient(165deg,#1a2436 0%,#2a364d 60%,#3b4759 100%)'
    case 'rain':
      return 'linear-gradient(165deg,#3f6f96 0%,#37607f 55%,#15304f 100%)'
    case 'snow':
      return 'linear-gradient(165deg,#8fa6bd 0%,#b9c9de 55%,#e6edf5 100%)'
    case 'storm':
      return 'linear-gradient(165deg,#141c2e 0%,#2b3550 45%,#080d18 100%)'
    case 'fog':
    default:
      return 'linear-gradient(165deg,#c2ccd8 0%,#dee5ee 60%,#f1f5f9 100%)'
  }
}

const DIRS = [
  'Kuzey', 'Kuzeydoğu', 'Doğu', 'Güneydoğu',
  'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı',
]

export function dirLabel(deg: number | undefined): string {
  if (deg === undefined || isNaN(deg)) return '—'
  return DIRS[Math.round(deg / 45) % 8]
}
