import { useEffect, useMemo, useState } from 'react'
import { WeatherIcon } from './WeatherCard'
import type { WeatherData } from '../lib/openMeteo'
import { FALLBACK_WORDS, HOME } from '../lib/location'
import { useClock } from '../lib/hooks'
import { cx } from './ui'
import { fmtDate, pad } from '../lib/time'
import type { Message, Member, Word } from '../types'

const ROTATE_MS = 15000
const REVEAL_MS = 5000

/**
 * Kiosk boşta kalma ekranı: saat + hava + **öğrenme kelimeleri** (15 sn'de bir değişir).
 * Kullanıcı kelimeyi önce kendisi okur, 5 sn sonra anlamı açılır.
 */
export function IdleScreen({
  weather,
  city,
  messages,
  members,
  words,
  onWake,
}: {
  weather: WeatherData | null
  city: string
  messages: Message[]
  members: Member[]
  words: Word[]
  onWake: () => void
}) {
  const now = useClock(1000)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  /* Önce tekrar gerekenler, sonra öğrenilenler */
  const list = useMemo(() => {
    const sorted = [...words].sort((a, b) => a.dueAt - b.dueAt)
    return sorted.length ? sorted : FALLBACK_WORDS
  }, [words])

  useEffect(() => {
    if (list.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length)
      setRevealed(false)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [list.length])

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), REVEAL_MS)
    return () => clearTimeout(t)
  }, [index])

  const card = list[index % Math.max(1, list.length)] as Word | { term: string; meaning: string }
  const deck = 'deck' in card ? card.deck : 'Kelime'
  const recent = messages.slice(-2).reverse()

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink-950 text-white flex flex-col items-center justify-center gap-6 cursor-pointer select-none animate-fade-in px-6"
      onClick={onWake}
      onTouchStart={onWake}
      role="button"
      aria-label="Ekranı uyandır"
    >
      <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_30%_20%,#4f6ef7,transparent_60%)]" />

      {/* Üst şerit: saat + hava */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between gap-4 text-white/70">
        <div className="flex items-center gap-3">
          {weather && (
            <>
              <WeatherIcon code={weather.now.weatherCode} isDay={weather.now.isDay} className="w-12 h-12" />
              <div className="leading-tight">
                <div className="text-3xl font-extrabold text-white">{weather.now.temp}°</div>
                <div className="text-sm font-semibold">{city}</div>
              </div>
            </>
          )}
        </div>
        <div className="text-right leading-tight">
          <div className="text-4xl sm:text-5xl font-extrabold tabular-nums text-white">
            {pad(now.getHours())}:{pad(now.getMinutes())}
          </div>
          <div className="text-sm sm:text-base font-semibold">{fmtDate(now)}</div>
        </div>
      </div>

      {/* Kelime kartı */}
      <div className="relative w-full max-w-3xl text-center">
        <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white/40">
          {deck} · {revealed ? 'Anlamı' : 'Kelime'}
        </div>
        <div className="text-[10vw] sm:text-7xl leading-tight font-extrabold tracking-tight break-words">
          {card.term}
        </div>
        <div
          className="mt-6 min-h-[3rem] text-2xl sm:text-4xl font-semibold transition-opacity duration-500"
          style={{ opacity: revealed ? 1 : 0 }}
        >
          {revealed ? card.meaning : '· · ·'}
        </div>

        {/* İlerleme noktaları */}
        {list.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-1.5">
            {list.slice(0, 12).map((_, i) => (
              <span
                key={i}
                className={cx(
                  'h-1.5 rounded-full transition-all',
                  i === (index % Math.min(12, list.length)) ? 'w-6 bg-white/80' : 'w-1.5 bg-white/25',
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Alt: son mesajlar + uyandırma ipucu */}
      <div className="relative absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 px-6">
        {recent.length > 0 && (
          <div className="w-full max-w-2xl space-y-1.5">
            {recent.map((m) => {
              const author = members.find((x) => x.id === m.fromId)
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5">
                  <span className="text-base">{author?.emoji ?? '👤'}</span>
                  <span className="text-sm opacity-70 truncate">
                    <b className="opacity-90">{author?.name ?? '?'}:</b> {m.text}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div className="text-xs opacity-50 animate-pulse">Uyandırmak için dokun · kelimeler 15 sn'de bir değişir</div>
      </div>
    </div>
  )
}

/** Yeni mesaj geldiğinde akan kısa bildirim katmanı. */
export function MessageFlash({ message, member, onDismiss }: { message: Message; member?: Member; onDismiss: () => void }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 top-6 z-[70] w-[min(92vw,640px)] animate-pop cursor-pointer"
      onClick={onDismiss}
    >
      <div className="flex items-center gap-4 rounded-2xl bg-white shadow-kiosk border border-slate-200 px-5 py-4">
        <div
          className="w-12 h-12 rounded-full grid place-items-center text-2xl shrink-0"
          style={{ backgroundColor: member?.color ?? '#4f6ef7' }}
        >
          {member?.emoji ?? '💬'}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-500">
            {member?.name ?? 'Birisi'} · duvar ekranına
          </div>
          <div className="text-lg font-semibold text-slate-900 truncate">{message.text}</div>
        </div>
      </div>
    </div>
  )
}
