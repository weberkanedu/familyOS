import { useEffect, useMemo, useState } from 'react'
import { WeatherIcon } from './WeatherCard'
import type { WeatherData } from '../lib/openMeteo'
import { wmoLabel } from '../lib/openMeteo'
import { FALLBACK_WORDS } from '../lib/location'
import { useClock } from '../lib/hooks'
import { cx } from './ui'
import { dateKey, fmtDayName, fmtDate, fmtTime, pad, todayKey } from '../lib/time'
import { isChoreDoneToday, isChoreDueToday } from '../state/actions'
import { greetingFor, specialDaysFor } from '../lib/specialDays'
import { Confetti } from './Celebrate'
import type { DB, Message, Member, Word } from '../types'

const ROTATE_MS = 15000
const REVEAL_MS = 5000

/**
 * Kiosk boşta kalma ekranı — "dijital fotoğraf çerçevesi":
 *  - arka planda aile fotoğrafı (gece daha loş)
 *  - büyük saat + selam, sağ üstte hava
 *  - sol altta günün özeti (özel gün, kalan etkinlikler, görevler, son mesajlar)
 *  - sağ altta öğrenme kelimesi (15 sn'de bir değişir, anlamı 5 sn sonra açılır)
 */
export function IdleScreen({
  db,
  weather,
  city,
  onWake,
}: {
  db: DB
  weather: WeatherData | null
  city: string
  onWake: () => void
}) {
  const now = useClock(1000)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const night = typeof document !== 'undefined' && document.documentElement.classList.contains('night')
  const photo = db.settings.familyPhoto
  const today = todayKey()

  /* Önce tekrar gerekenler, sonra öğrenilenler */
  const list = useMemo(() => {
    const sorted = [...db.words].sort((a, b) => a.dueAt - b.dueAt)
    return sorted.length ? sorted : FALLBACK_WORDS
  }, [db.words])

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

  /* Günün özeti */
  const specials = useMemo(
    () => (db.settings.celebrations !== false ? specialDaysFor(new Date(), db.members) : []),
    // gün değişince yeniden hesaplanır
    [db.settings.celebrations, db.members, today],
  )
  const upcoming = useMemo(
    () =>
      db.events
        .filter((e) => (e.allDay ? e.start.slice(0, 10) === today : dateKey(new Date(e.start)) === today))
        .filter((e) => e.allDay || new Date(e.end ?? e.start).getTime() >= now.getTime() - 30 * 60_000)
        .sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1))
        .slice(0, 3),
    // dakikada bir yeterli
    [db.events, today, now.getMinutes()],
  )
  const due = db.chores.filter((c) => isChoreDueToday(c, today))
  const left = due.filter((c) => !isChoreDoneToday(c, today))
  const recent = db.messages.slice(-2).reverse()
  const memberOf = (id?: string) => db.members.find((m) => m.id === id)
  const todayW = weather?.days?.[0]

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink-950 text-white cursor-pointer select-none animate-fade-in overflow-hidden"
      onClick={onWake}
      onTouchStart={onWake}
      role="button"
      aria-label="Ekranı uyandır"
      data-keep-light
    >
      {/* Arka plan: aile fotoğrafı ya da yumuşak renk */}
      {photo ? (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: night ? 0.3 : 0.75 }}
        />
      ) : (
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_25%_15%,rgb(var(--brand-500)),transparent_55%),radial-gradient(circle_at_85%_90%,#ec4899,transparent_50%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/75" />
      {specials.some((d) => d.confetti) && <Confetti count={28} />}

      {/* Üst: saat + selam | hava */}
      <div className="absolute top-8 left-10 right-10 flex items-start justify-between gap-6">
        <div className="leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
          <div className="text-[min(16vw,150px)] font-extrabold tabular-nums tracking-tight">
            {pad(now.getHours())}:{pad(now.getMinutes())}
          </div>
          <div className="text-2xl font-bold text-white/85 mt-2">
            {fmtDayName(now)}, {fmtDate(now)} · {greetingFor(now)}
          </div>
        </div>
        {weather && (
          <div className="flex items-center gap-3 rounded-3xl bg-black/25 backdrop-blur-md px-5 py-4">
            <WeatherIcon code={weather.now.weatherCode} isDay={weather.now.isDay} className="w-16 h-16" />
            <div className="leading-tight">
              <div className="text-5xl font-extrabold tabular-nums">{weather.now.temp}°</div>
              <div className="text-sm font-bold text-white/80">
                {wmoLabel(weather.now.weatherCode)}
                {todayW && ` · ↑${todayW.max}° ↓${todayW.min}°`}
              </div>
              <div className="text-xs font-semibold text-white/60">{city}</div>
            </div>
          </div>
        )}
      </div>

      {/* Alt: günün özeti | kelime kartı */}
      <div className="absolute bottom-8 left-10 right-10 flex items-end justify-between gap-6">
        <div className="w-[min(46vw,520px)] space-y-2.5">
          {specials.map((d) => (
            <div key={d.title} className="rounded-2xl bg-gradient-to-r from-amber-400/90 to-pink-500/90 px-4 py-2.5 text-lg font-extrabold">
              {d.emoji} {d.title}
            </div>
          ))}
          {(upcoming.length > 0 || left.length > 0) && (
            <div className="rounded-3xl bg-black/30 backdrop-blur-md p-4 space-y-2">
              {upcoming.map((e) => {
                const m = memberOf(e.memberIds[0])
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: m?.color ?? '#94a3b8' }} />
                    <span className="text-lg font-extrabold tabular-nums w-16 shrink-0">
                      {e.allDay ? 'Gün' : fmtTime(new Date(e.start))}
                    </span>
                    <span className="text-lg font-bold truncate flex-1">{e.title}</span>
                    <span className="text-lg shrink-0">{e.memberIds.map((id) => memberOf(id)?.emoji).join('')}</span>
                  </div>
                )
              })}
              {left.length > 0 && (
                <div className="flex items-center gap-2 text-base font-bold text-white/85 pt-1">
                  🧹 {left.length} görev kaldı
                  <span className="ml-1">{Array.from(new Set(left.map((c) => memberOf(c.assigneeId)?.emoji).filter(Boolean))).join(' ')}</span>
                </div>
              )}
            </div>
          )}
          {recent.length > 0 && <RecentMessages messages={recent} members={db.members} />}
        </div>

        {/* Kelime kartı */}
        <div className="w-[min(40vw,440px)] rounded-3xl bg-black/30 backdrop-blur-md p-5 text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/50">
            {deck} · {revealed ? 'Anlamı' : 'Kelime'}
          </div>
          <div className="mt-2 text-4xl font-extrabold tracking-tight break-words">{card.term}</div>
          <div
            className="mt-2 min-h-[2rem] text-xl font-semibold text-white/90 transition-opacity duration-500"
            style={{ opacity: revealed ? 1 : 0.35 }}
          >
            {revealed ? card.meaning : '· · ·'}
          </div>
          {list.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {list.slice(0, 12).map((_, i) => (
                <span
                  key={i}
                  className={cx(
                    'h-1.5 rounded-full transition-all',
                    i === index % Math.min(12, list.length) ? 'w-6 bg-white/80' : 'w-1.5 bg-white/25',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-white/40">Uyandırmak için dokunun</div>
    </div>
  )
}

function RecentMessages({ messages, members }: { messages: Message[]; members: Member[] }) {
  return (
    <div className="space-y-1.5">
      {messages.map((m) => {
        const author = members.find((x) => x.id === m.fromId)
        return (
          <div key={m.id} className="flex items-center gap-2 rounded-xl bg-black/25 backdrop-blur-md px-3 py-2">
            <span className="text-lg">{author?.emoji ?? '👤'}</span>
            <span className="text-sm text-white/85 truncate">
              <b>{author?.name ?? '?'}:</b> {m.text}
            </span>
          </div>
        )
      })}
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
