import { useEffect, useMemo, useState } from 'react'
import type { Member } from '../types'
import { cx } from './ui'
import type { SpecialDay } from '../lib/specialDays'

const COLORS = ['#f97362', '#4f6ef7', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#facc15']

/** Kısa süreli konfeti yağmuru (saf CSS, ~6 sn sonra kendini kaldırır). */
export function Confetti({ count = 36, play = true }: { count?: number; play?: boolean }) {
  const [on, setOn] = useState(play)
  useEffect(() => {
    if (!play) return
    setOn(true)
    const t = setTimeout(() => setOn(false), 7000)
    return () => clearTimeout(t)
  }, [play])

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        color: COLORS[i % COLORS.length],
        delay: `${((i * 37) % 30) / 10}s`,
        dur: `${3.5 + ((i * 13) % 20) / 10}s`,
        dx: `${((i * 53) % 120) - 60}px`,
        round: i % 3 === 0,
      })),
    [count],
  )
  if (!on) return null
  return (
    <div aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: p.left,
              background: p.color,
              borderRadius: p.round ? '999px' : undefined,
              '--delay': p.delay,
              '--dur': p.dur,
              '--dx': p.dx,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** Özel gün şeridi (doğum günü, bayram). */
export function SpecialDayBanner({ days, members, kiosk }: { days: SpecialDay[]; members: Member[]; kiosk: boolean }) {
  if (!days.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((d) => {
        const m = members.find((x) => x.id === d.memberId)
        return (
          <div
            key={d.title}
            className={cx(
              'inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 font-extrabold text-white shadow-lg anim-rise',
              kiosk ? 'text-lg' : 'text-base',
            )}
            style={{
              background: m
                ? `linear-gradient(120deg, ${m.color}, #f59e0b)`
                : 'linear-gradient(120deg, rgb(var(--brand-500)), #ec4899)',
            }}
          >
            <span className={kiosk ? 'text-2xl' : 'text-xl'}>{d.emoji}</span>
            {d.title}
          </div>
        )
      })}
    </div>
  )
}
