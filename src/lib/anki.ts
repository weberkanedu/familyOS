import type { Word } from '../types'

/**
 * Sadeleştirilmiş SM-2 (Anki mantığı).
 * - Kolay  : aralık büyük artar, kolaylık (ease) +0.15
 * - Orta   : aralık makul artar, ease -0.15
 * - Zor    : aralık kısalır (lapse), ease -0.20
 * Aralık dakika cinsinden tutulur; >= 1 gün olanlar "review" durumuna geçer.
 */

export type Rating = 'hard' | 'good' | 'easy'

export const RATING_LABELS: Record<Rating, string> = {
  hard: 'Zor',
  good: 'Orta',
  easy: 'Kolay',
}

export const MIN = 1
export const HOUR = 60
export const DAY = 1440
export const MAX_INTERVAL_MIN = 365 * DAY

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export interface ScheduleResult extends Word {
  ease: number
  intervalMin: number
  dueAt: number
  state: Word['state']
}

export function scheduleAfter(
  word: Word,
  rating: Rating,
  now: number = Date.now(),
): ScheduleResult {
  const first = word.state === 'new' || word.intervalMin <= 0
  let ease = clamp(word.ease || 2.5, 1.3, 3.0)
  let ivl = first ? 0 : word.intervalMin
  let reps = word.reps + 1
  let lapses = word.lapses

  if (first) {
    // İlk görümler: kısa öğrenme adımları
    ivl = rating === 'easy' ? 4 * HOUR : rating === 'good' ? 10 * MIN : 1 * MIN
    if (rating === 'hard') ease = Math.max(1.3, ease - 0.2)
  } else if (rating === 'easy') {
    ease = clamp(ease + 0.15, 1.3, 3.0)
    ivl = Math.round(ivl < DAY ? Math.max(ivl * 2, 4 * HOUR) : ivl * ease)
  } else if (rating === 'good') {
    ease = clamp(ease - 0.15, 1.3, 3.0)
    ivl = ivl < HOUR ? 10 * MIN : ivl < DAY ? Math.round(ivl * 1.6) : Math.round(ivl * Math.max(1.2, ease))
  } else {
    ease = clamp(ease - 0.2, 1.3, 3.0)
    if (ivl >= DAY) {
      lapses += 1
      reps = 1
      ivl = 10 * MIN // tekrar öğrenme adımı
    } else {
      ivl = 1 * MIN
    }
  }

  ivl = clamp(Math.round(ivl), 1, MAX_INTERVAL_MIN)
  const state: Word['state'] = ivl >= DAY ? 'review' : 'learning'

  return {
    ...word,
    ease: Number(ease.toFixed(2)),
    intervalMin: ivl,
    reps,
    lapses,
    state,
    lastReviewedAt: now,
    dueAt: now + ivl * 60_000,
    updatedAt: now,
  }
}

export type QueueItem = Word

/** Bugün tekrar edilmesi gereken kelimeler (önce zorlananlar, sonra eski). */
export function buildQueue(words: Word[], now: number = Date.now()): Word[] {
  return words
    .filter((w) => w.dueAt <= now)
    .sort((a, b) => {
      const stateRank = (w: Word) => (w.state === 'learning' ? 0 : w.state === 'review' ? 1 : 2)
      const r = stateRank(a) - stateRank(b)
      if (r !== 0) return r
      return a.dueAt - b.dueAt
    })
}

export function stats(words: Word[], now: number = Date.now()) {
  const due = words.filter((w) => w.dueAt <= now).length
  const learned = words.filter((w) => w.state === 'review').length
  const learning = words.filter((w) => w.state === 'learning').length
  const fresh = words.filter((w) => w.state === 'new').length
  return { total: words.length, due, learned, learning, fresh }
}

export function fmtInterval(min: number): string {
  if (min < 60) return `${min} dk`
  if (min < DAY) return `${Math.round(min / 60)} sa`
  const d = Math.round(min / DAY)
  if (d < 30) return `${d} gün`
  if (d < 365) return `${Math.round(d / 30)} ay`
  return `${(d / 365).toFixed(1)} yıl`
}
