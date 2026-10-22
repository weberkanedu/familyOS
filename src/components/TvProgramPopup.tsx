import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { BowlFoodIcon, ChalkboardTeacherIcon, XIcon } from '@phosphor-icons/react'
import { cx } from './ui'
import type { DB } from '../types'

/**
 * TV: çocuğun haftalık ders / beslenme programı — yalnızca okuma, kanepeden okunur büyüklükte.
 * (Telefon/tablettteki ProgramPopups düzenleme içindir; TV'de form yerine tablo.)
 * Geri tuşu → closeTopLayer Escape gönderir → kapanır.
 */
const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

export type TvProgramKind = 'lessons' | 'nutrition'

export function TvProgramPopup({
  db,
  kind,
  kidId,
  now,
  onClose,
}: {
  db: DB
  kind: TvProgramKind
  kidId: string
  now: Date
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const kid = db.members.find((m) => m.id === kidId)
  const today = ((now.getDay() + 6) % 7) + 1 // 1 = Pazartesi

  // Pencereyi açan düğme (ilk çizimde, odak henüz kaymadan): kapanınca odak ona döner.
  // Yoksa odak boşta kalıyor, sonraki tuş en baştaki TiviMate'e gidip OK ile onu açıyordu.
  const opener = useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null)

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      const el = opener.current as HTMLElement | null
      if (el && document.contains(el)) el.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Icon = kind === 'lessons' ? ChalkboardTeacherIcon : BowlFoodIcon
  const title = kind === 'lessons' ? 'Ders Programı' : 'Beslenme Programı'

  return (
    <div role="dialog" aria-modal="true" aria-label={`${kid?.name ?? ''} ${title}`} className="tv-program fixed inset-0 z-[80] flex flex-col px-16 py-12 text-[#f3e9df]">
      <header className="flex items-center justify-between gap-6 mb-7">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-2xl grid place-items-center bg-[#f6c58a]/15">
            <Icon weight="fill" className="w-7 h-7 text-[#f6c58a]" />
          </span>
          <div>
            <div className="text-[30px] font-semibold leading-tight">
              {kid?.name ?? 'Çocuk'} · {title}
            </div>
            <div className="text-[15px] text-white/50">Haftalık · bugün {DAYS[today]}</div>
          </div>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} className="tv-pill h-12 px-5 flex items-center gap-2 text-[16px] font-semibold">
          <XIcon className="w-5 h-5" weight="bold" /> Kapat
          <span className="ml-1 text-white/45 font-normal">· Geri</span>
        </button>
      </header>
      {kind === 'lessons' ? <LessonsGrid db={db} kidId={kidId} today={today} now={now} /> : <NutritionGrid db={db} kidId={kidId} today={today} />}
    </div>
  )
}

function LessonsGrid({ db, kidId, today, now }: { db: DB; kidId: string; today: number; now: Date }) {
  const { days, slots, cell } = useMemo(() => {
    const ls = db.lessons.filter((l) => l.memberId === kidId)
    const days = [...new Set(ls.map((l) => l.day))].sort((a, b) => a - b)
    const slots = [...new Map(ls.map((l) => [l.start, { start: l.start, end: l.end }])).values()].sort((a, b) => a.start.localeCompare(b.start))
    const cell = new Map(ls.map((l) => [`${l.day}|${l.start}`, l]))
    return { days, slots, cell }
  }, [db.lessons, kidId])

  if (!slots.length) return <Empty>Henüz ders programı girilmemiş.</Empty>
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div
      className="flex-1 min-h-0 grid gap-1.5"
      style={{ gridTemplateColumns: `112px repeat(${days.length}, minmax(0, 1fr))`, gridTemplateRows: `40px repeat(${slots.length}, minmax(0, 1fr))` }}
    >
      <div />
      {days.map((d) => (
        <div key={d} className={cx('grid place-items-center rounded-xl text-[17px] font-semibold', d === today ? 'bg-[#f6c58a] text-[#2a1a10]' : 'bg-white/[0.06] text-white/80')}>
          {DAYS[d]}
        </div>
      ))}
      {slots.map((s, i) => (
        <Row key={s.start}>
          <div className="rounded-xl bg-white/[0.04] flex flex-col items-center justify-center leading-tight">
            <span className="text-[15px] font-semibold text-white/80">{i + 1}. Ders</span>
            <span className="text-[13px] tabular-nums text-white/45">
              {s.start}–{s.end}
            </span>
          </div>
          {days.map((d) => {
            const l = cell.get(`${d}|${s.start}`)
            const isNow = d === today && hm >= s.start && hm < s.end
            return (
              <div
                key={d}
                className={cx(
                  'rounded-xl px-3 flex flex-col items-center justify-center text-center leading-tight',
                  d === today ? 'bg-white/[0.10]' : 'bg-white/[0.05]',
                )}
                style={isNow ? { outline: '3px solid #f6c58a', outlineOffset: -3 } : undefined}
              >
                {l ? (
                  <>
                    {/* Uzun ad ("Kültür ve Medeniyetimize Yön Verenler") kesilmesin: küçük yazı, 3 satır */}
                    <span className={cx('font-semibold', l.subject.length > 30 ? 'text-[14px] line-clamp-3' : 'text-[16px] line-clamp-2')}>{l.subject}</span>
                    {l.room && <span className="mt-0.5 text-[12.5px] text-white/50 truncate max-w-full">{l.room}</span>}
                  </>
                ) : (
                  <span className="text-white/20">—</span>
                )}
              </div>
            )
          })}
        </Row>
      ))}
    </div>
  )
}

/** Grid satırı: çocukları doğrudan ızgaraya yerleştirir (sarmalayıcı kutu oluşturmaz) */
function Row({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function NutritionGrid({ db, kidId, today }: { db: DB; kidId: string; today: number }) {
  const { days, byDay, sharedNote } = useMemo(() => {
    const items = db.nutrition.filter((n) => n.memberId === kidId).sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time))
    const notes = [...new Set(items.map((n) => n.note).filter(Boolean))] as string[]
    // Her güne yazılmış aynı not (ör. içecek kuralı) bir kez altta gösterilir
    const sharedNote = notes.length === 1 && items.filter((n) => n.note).length > 1 ? notes[0] : null
    const byDay = new Map<number, typeof items>()
    for (const n of items) byDay.set(n.weekday, [...(byDay.get(n.weekday) ?? []), n])
    return { days: [...byDay.keys()].sort((a, b) => a - b), byDay, sharedNote }
  }, [db.nutrition, kidId])

  if (!days.length) return <Empty>Henüz beslenme programı girilmemiş.</Empty>

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5">
      <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d) => {
          const list = byDay.get(d)!
          // Gün içindeki öğünlerin saati aynıysa başlıkta bir kez, farklıysa her öğünün yanında
          const oneTime = list.every((n) => n.time === list[0].time)
          return (
          <div key={d} className={cx('rounded-2xl p-5 flex flex-col gap-4', d === today ? 'bg-white/[0.11]' : 'bg-white/[0.05]')} style={d === today ? { outline: '3px solid #f6c58a', outlineOffset: -3 } : undefined}>
            <div className="flex items-baseline justify-between">
              <span className={cx('text-[19px] font-semibold', d === today && 'text-[#f6c58a]')}>{DAYS[d]}</span>
              {oneTime && <span className="text-[13px] tabular-nums text-white/45">{list[0].time}</span>}
            </div>
            <ul className="flex flex-col gap-3">
              {list.map((n) => (
                <li key={n.id} className="text-[17px] leading-snug">
                  {!oneTime && <span className="mr-2 text-[14px] tabular-nums text-[#f6c58a]/80">{n.time}</span>}
                  {n.title}
                  {n.note && n.note !== sharedNote && <div className="mt-1 text-[13px] text-white/50">{n.note}</div>}
                </li>
              ))}
            </ul>
          </div>
          )
        })}
      </div>
      {sharedNote && (
        <p className="text-[16px] text-white/70">
          <span className="text-[#f6c58a] font-semibold">Her gün · </span>
          {sharedNote}
        </p>
      )}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="flex-1 grid place-items-center text-[20px] text-white/50">{children}</div>
}
