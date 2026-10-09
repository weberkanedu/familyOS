export const DAY_MS = 86_400_000

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const GUNLER_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Yerel tarih anahtarı: YYYY-MM-DD */
export function dateKey(d: Date | number = new Date()): string {
  const dt = typeof d === 'number' ? new Date(d) : d
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(d: Date | string, n: number): Date {
  const base = typeof d === 'string' ? parseKey(d) : new Date(d)
  base.setDate(base.getDate() + n)
  return base
}

export function startOfWeek(d: Date | string): Date {
  const base = typeof d === 'string' ? parseKey(d) : new Date(d)
  const diff = (base.getDay() + 6) % 7 // hafta pazartesi başlar
  base.setDate(base.getDate() - diff)
  base.setHours(0, 0, 0, 0)
  return base
}

export function monthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = startOfWeek(first)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i))
  return cells
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  const ka = typeof a === 'string' ? a : dateKey(a)
  const kb = typeof b === 'string' ? b : dateKey(b)
  return ka === kb
}

export function fmtDate(d: Date | string): string {
  const dt = typeof d === 'string' ? parseKey(d) : d
  return `${dt.getDate()} ${AYLAR[dt.getMonth()]} ${dt.getFullYear()}`
}

export function fmtShort(d: Date | string): string {
  const dt = typeof d === 'string' ? parseKey(d) : d
  return `${dt.getDate()} ${AYLAR_KISA[dt.getMonth()]}`
}

export function fmtDayName(d: Date | string, short = false): string {
  const dt = typeof d === 'string' ? parseKey(d) : d
  return short ? GUNLER_KISA[dt.getDay()] : GUNLER[dt.getDay()]
}

/** "9 Ekim 2026" */
export function fmtMonthYear(d: Date | string = new Date()): string {
  const dt = typeof d === 'string' ? parseKey(d) : d
  return `${dt.getDate()} ${AYLAR[dt.getMonth()]} ${dt.getFullYear()}`
}

/** Ay kısaltması: "Eki" */
export function fmtMonthShort(d: Date | string = new Date()): string {
  const dt = typeof d === 'string' ? parseKey(d) : d
  return AYLAR_KISA[dt.getMonth()]
}

/** Ay adı: "Ekim" */
export function fmtMonth(d: Date | string = new Date()): string {
  const dt = typeof d === 'string' ? parseKey(d) : d
  return AYLAR[dt.getMonth()]
}

/** Yılın kaçıncı günü (1-366) */
export function dayOfYear(d: Date | string = new Date()): number {
  const dt = typeof d === 'string' ? parseKey(d) : new Date(d)
  const start = new Date(dt.getFullYear(), 0, 0)
  return Math.floor((dt.getTime() - start.getTime()) / DAY_MS)
}

/** Yılın kaçıncı haftası (1-53) */
export function weekOfYear(d: Date | string = new Date()): number {
  return Math.ceil(dayOfYear(d) / 7)
}

export function fmtTime(d: Date | number): string {
  const dt = typeof d === 'number' ? new Date(d) : d
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

/** ISO datetime yerel saat string'i (input[type=datetime-local] için) */
export function toLocalInput(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 16)
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(v: string): string {
  if (!v) return ''
  return new Date(v).toISOString()
}

export function relativeTime(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min} dk önce`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} sa önce`
  const day = Math.floor(h / 24)
  if (day < 7) return `${day} gün önce`
  return fmtShort(new Date(ts))
}

export function weekDays(from: Date = new Date()): Date[] {
  const start = startOfWeek(from)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Haftanın günü: 1 = Pazartesi ... 7 = Pazar */
export function todayWeekday(d: Date = new Date()): number {
  return ((d.getDay() + 6) % 7) + 1
}
