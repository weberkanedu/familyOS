import { useMemo } from 'react'
import { ClockIcon } from '@phosphor-icons/react'
import type { DB, EventItem } from '../types'
import { useClock } from '../lib/hooks'
import { fmtTime } from '../lib/time'
import { cx } from './ui'

const AHEAD_MS = 3 * 60 * 60_000 // 3 saat içindekiler
const DEFAULT_LEN_MS = 60 * 60_000 // bitiş yoksa 1 saat sayılır

function untilText(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min <= 1) return 'birazdan'
  if (min < 60) return `${min} dk sonra`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} sa ${m} dk sonra` : `${h} saat sonra`
}

/** Şu an süren ya da 3 saat içinde başlayacak ilk etkinlik. */
export function pickNext(events: EventItem[], now: number): { ev: EventItem; live: boolean; startMs: number } | null {
  let best: { ev: EventItem; live: boolean; startMs: number } | null = null
  for (const ev of events) {
    if (ev.allDay) continue
    const start = new Date(ev.start).getTime()
    if (isNaN(start)) continue
    const end = ev.end ? new Date(ev.end).getTime() : start + DEFAULT_LEN_MS
    const live = start <= now && now < end
    if (!live && (start < now || start - now > AHEAD_MS)) continue
    if (!best || (live && !best.live) || (live === best.live && start < best.startMs)) best = { ev, live, startMs: start }
  }
  return best
}

/** "Şimdi / Sıradaki" şeridi — duvardan bir bakışta görülsün. */
export function NextUp({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const now = useClock(30_000)
  const next = useMemo(() => pickNext(db.events, now.getTime()), [db.events, now])
  if (!next) return null
  const people = next.ev.memberIds.map((id) => db.members.find((m) => m.id === id)).filter(Boolean)
  const color = people[0]?.color ?? 'rgb(var(--brand-500))'

  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-2xl text-white shadow-lg anim-rise overflow-hidden',
        kiosk ? 'px-5 py-3 mb-5' : 'px-4 py-3',
      )}
      style={{ background: `linear-gradient(110deg, ${color}, rgba(15,23,42,0.85))` }}
      role="status"
    >
      <ClockIcon weight="duotone" className={kiosk ? 'w-8 h-8 shrink-0' : 'w-6 h-6 shrink-0'} />
      <div className="min-w-0 flex-1">
        <div className={cx('font-bold uppercase tracking-wide text-white/80', kiosk ? 'text-xs' : 'text-[11px]')}>
          {next.live ? 'Şimdi' : untilText(next.startMs - now.getTime())}
        </div>
        <div className={cx('font-extrabold truncate', kiosk ? 'text-xl' : 'text-base')}>
          {fmtTime(new Date(next.ev.start))} · {next.ev.title}
          {next.ev.location && <span className="font-semibold text-white/80"> · {next.ev.location}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {people.slice(0, 4).map((m) => (
          <span key={m!.id} className={cx('font-bold', kiosk ? 'text-base' : 'text-sm')} title={m!.name}>
            {m!.emoji}
            {kiosk && <span className="ml-1 mr-2">{m!.name}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
