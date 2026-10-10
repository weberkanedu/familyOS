import type { Member } from '../types'

/**
 * Özel günler: doğum günleri, resmi ve dini bayramlar, anneler/babalar günü.
 * Dini bayram tarihleri her yıl değişir → Diyanet takvimine göre RELIGIOUS listesine eklenmeli.
 */
export interface SpecialDay {
  title: string
  emoji: string
  /** Ekranda konfeti yağsın mı */
  confetti: boolean
  memberId?: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const md = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ymd = (d: Date) => `${d.getFullYear()}-${md(d)}`

const FIXED: Record<string, Omit<SpecialDay, 'memberId'>> = {
  '01-01': { title: 'Mutlu yıllar!', emoji: '🎉', confetti: true },
  '04-23': { title: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun!', emoji: '🎈', confetti: true },
  '05-19': { title: '19 Mayıs Gençlik ve Spor Bayramı kutlu olsun!', emoji: '🇹🇷', confetti: false },
  '08-30': { title: '30 Ağustos Zafer Bayramı kutlu olsun!', emoji: '🇹🇷', confetti: false },
  '10-29': { title: 'Cumhuriyet Bayramımız kutlu olsun!', emoji: '🇹🇷', confetti: true },
  '12-31': { title: 'Yeni yıla az kaldı!', emoji: '🎄', confetti: true },
}

/** Dini bayramlar (Diyanet). Yeni yıllar eklenmeli. */
const RELIGIOUS: { from: string; to: string; title: string; emoji: string }[] = [
  { from: '2026-03-20', to: '2026-03-22', title: 'Ramazan Bayramınız mübarek olsun!', emoji: '🌙' },
  { from: '2026-05-27', to: '2026-05-30', title: 'Kurban Bayramınız mübarek olsun!', emoji: '🕌' },
  { from: '2027-03-09', to: '2027-03-11', title: 'Ramazan Bayramınız mübarek olsun!', emoji: '🌙' },
  { from: '2027-05-16', to: '2027-05-19', title: 'Kurban Bayramınız mübarek olsun!', emoji: '🕌' },
]

/** Ayın n. pazarı (anneler günü: mayıs 2., babalar günü: haziran 3.) */
function nthSunday(year: number, month: number, n: number): string {
  const first = new Date(year, month - 1, 1)
  const day = 1 + ((7 - first.getDay()) % 7) + (n - 1) * 7
  return `${pad(month)}-${pad(day)}`
}

export function specialDaysFor(date: Date, members: Member[]): SpecialDay[] {
  const out: SpecialDay[] = []
  const today = md(date)
  const leapless = today === '02-28' && new Date(date.getFullYear(), 1, 29).getMonth() !== 1

  for (const m of members) {
    if (!m.birthday || !/^\d{4}-\d{2}-\d{2}$/.test(m.birthday)) continue
    const bd = m.birthday.slice(5)
    if (bd === today || (leapless && bd === '02-29')) {
      const age = date.getFullYear() - Number(m.birthday.slice(0, 4))
      out.push({
        title: age > 0 && age < 120 ? `İyi ki doğdun ${m.name}! ${age} yaşında` : `İyi ki doğdun ${m.name}!`,
        emoji: '🎂',
        confetti: true,
        memberId: m.id,
      })
    }
  }

  const fixed = FIXED[today]
  if (fixed) out.push({ ...fixed })
  const key = ymd(date)
  for (const r of RELIGIOUS) if (key >= r.from && key <= r.to) out.push({ title: r.title, emoji: r.emoji, confetti: false })
  if (today === nthSunday(date.getFullYear(), 5, 2)) out.push({ title: 'Anneler Günü kutlu olsun!', emoji: '💐', confetti: false })
  if (today === nthSunday(date.getFullYear(), 6, 3)) out.push({ title: 'Babalar Günü kutlu olsun!', emoji: '👔', confetti: false })
  return out
}

/** Mevsim süsü */
export function seasonEmoji(date: Date): string {
  const m = date.getMonth() + 1
  if (m === 12 || m <= 2) return '❄️'
  if (m <= 5) return '🌸'
  if (m <= 8) return '☀️'
  return '🍂'
}

/** Saate ve güne uygun selam */
export function greetingFor(date: Date): string {
  const h = date.getHours()
  const dow = date.getDay() // 0 pazar, 5 cuma, 6 cumartesi
  if (h >= 22 || h < 5) return 'İyi geceler'
  if (dow === 5 && h >= 5) return 'Cumanız mübarek olsun'
  if (h < 11) return 'Günaydın'
  if (h < 17) return dow === 6 || dow === 0 ? 'İyi hafta sonları' : 'İyi günler'
  return dow === 0 ? 'İyi haftalar' : 'İyi akşamlar'
}
