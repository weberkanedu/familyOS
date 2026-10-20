/**
 * Namaz vakitleri — cihazda hesaplanır (internet gerekmez).
 * PrayTimes.org algoritması + Diyanet parametreleri:
 *   İmsak 18°, Yatsı 17°, İkindi gölge katsayısı 1,
 *   temkinler: Güneş −7, Öğle +5, İkindi +4, Akşam +7 dk.
 * Diyanet takvimiyle genelde ±1–2 dk uyumludur.
 */

export type PrayerKey = 'imsak' | 'gunes' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi'

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  imsak: 'İmsak',
  gunes: 'Güneş',
  ogle: 'Öğle',
  ikindi: 'İkindi',
  aksam: 'Akşam',
  yatsi: 'Yatsı',
}

export const PRAYER_ORDER: PrayerKey[] = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi']

const ADJUST_MIN: Record<PrayerKey, number> = { imsak: 0, gunes: -7, ogle: 5, ikindi: 4, aksam: 7, yatsi: 0 }

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const sin = (d: number) => Math.sin(rad(d))
const cos = (d: number) => Math.cos(rad(d))
const tan = (d: number) => Math.tan(rad(d))
const asin = (x: number) => deg(Math.asin(x))
const acos = (x: number) => deg(Math.acos(Math.max(-1, Math.min(1, x))))
const atan2 = (y: number, x: number) => deg(Math.atan2(y, x))
const acot = (x: number) => deg(Math.atan(1 / x))
const fix = (a: number, b: number) => {
  const r = a - b * Math.floor(a / b)
  return r < 0 ? r + b : r
}

function julian(y: number, m: number, d: number): number {
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

function sunPosition(jd: number): { decl: number; eqt: number } {
  const D = jd - 2451545.0
  const g = fix(357.529 + 0.98560028 * D, 360)
  const q = fix(280.459 + 0.98564736 * D, 360)
  const L = fix(q + 1.915 * sin(g) + 0.02 * sin(2 * g), 360)
  const e = 23.439 - 0.00000036 * D
  const RA = fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24)
  return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - RA }
}

/** Verilen gün (yerel takvim günü) için vakitler, Date olarak. */
export function prayerTimes(date: Date, lat: number, lon: number): Record<PrayerKey, Date> {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const jd = julian(y, m, d) - lon / (15 * 24)

  const midDay = (t: number) => fix(12 - sunPosition(jd + t).eqt, 24)
  const angleTime = (angle: number, t: number, ccw: boolean) => {
    const { decl } = sunPosition(jd + t)
    const T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15
    return midDay(t) + (ccw ? -T : T)
  }
  const asrTime = (factor: number, t: number) => {
    const { decl } = sunPosition(jd + t)
    return angleTime(-acot(factor + tan(Math.abs(lat - decl))), t, false)
  }

  // Yerel güneş saati (iki tur yaklaşık değerle)
  let h = { imsak: 5, gunes: 6, ogle: 12, ikindi: 13, aksam: 18, yatsi: 18 }
  for (let i = 0; i < 2; i++) {
    const t = (x: number) => x / 24
    h = {
      imsak: angleTime(18, t(h.imsak), true),
      gunes: angleTime(0.833, t(h.gunes), true),
      ogle: midDay(t(h.ogle)),
      ikindi: asrTime(1, t(h.ikindi)),
      aksam: angleTime(0.833, t(h.aksam), false),
      yatsi: angleTime(17, t(h.yatsi), false),
    }
  }

  const base = Date.UTC(y, m - 1, d)
  const out = {} as Record<PrayerKey, Date>
  for (const k of PRAYER_ORDER) {
    const utcHours = h[k] - lon / 15
    const ms = base + utcHours * 3_600_000 + ADJUST_MIN[k] * 60_000
    out[k] = new Date(Math.round(ms / 60_000) * 60_000)
  }
  return out
}

/** Sıradaki vakit (Yatsı geçtiyse yarının İmsak'ı). */
export function nextPrayer(now: Date, lat: number, lon: number): { key: PrayerKey; at: Date; today: Record<PrayerKey, Date> } {
  const today = prayerTimes(now, lat, lon)
  for (const k of PRAYER_ORDER) if (today[k].getTime() > now.getTime()) return { key: k, at: today[k], today }
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12)
  return { key: 'imsak', at: prayerTimes(tomorrow, lat, lon).imsak, today }
}
