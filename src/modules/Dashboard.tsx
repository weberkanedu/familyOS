import { MapPinIcon, PlusIcon, CaretRightIcon, BowlFoodIcon, ChalkboardTeacherIcon, CalendarBlankIcon, BroomIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { Card, SectionTitle, Btn, Avatar, Chip, ColorDot, Empty, cx, Reveal, GlassCard } from '../components/ui'
import { WeatherWidget, type WeatherWidgetProps } from '../components/WeatherWidget'
import { HOME } from '../lib/location'
import { dateKey, fmtTime, todayKey, relativeTime, fmtDayName, parseKey } from '../lib/time'
import { isChoreDueToday, isChoreDoneToday, toggleChore } from '../state/actions'
import type { DB } from '../types'
import { MEAL_SLOTS } from '../types'
import type { TabKey } from '../state/store'
import { getDeviceOwner, useDeviceOwner } from '../sync/config'
import { useClock } from '../lib/hooks'
import { greetingFor, seasonEmoji, specialDaysFor } from '../lib/specialDays'
import { Confetti, SpecialDayBanner } from '../components/Celebrate'
import { NextUp } from '../components/NextUp'

function eventStartKey(e: { start: string; allDay: boolean }): string {
  return e.allDay ? e.start.slice(0, 10) : dateKey(new Date(e.start))
}

/** Modül seviyesinde (inline tanım her render'da yeniden mount yapar). */
function StatChip({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-white/60 backdrop-blur border border-white/70 px-3 py-2 shadow-sm">
      <span className={cx('w-7 h-7 rounded-lg grid place-items-center', tone)}>{icon}</span>
      <span className="text-base font-extrabold text-slate-800 tabular-nums">{value}</span>
      <span className="text-xs font-bold text-slate-400">{label}</span>
    </span>
  )
}

/** Ana ekran: hava + günün özeti (kiosk ve mobil ortak). */
export function Dashboard({
  db,
  weather,
  kiosk,
  onTab,
  onProgram,
}: {
  db: DB
  weather: WeatherWidgetProps
  kiosk: boolean
  onTab: (t: TabKey) => void
  onProgram: (k: 'nutrition' | 'lessons', kidId?: string) => void
}) {
  const today = todayKey()
  const memberOf = useMemo(() => new Map(db.members.map((m) => [m.id, m])), [db.members])

  const todaysEvents = useMemo(
    () =>
      db.events
        .filter((e) => eventStartKey(e) === today)
        .sort((a, b) => (a.allDay === b.allDay ? new Date(a.start).getTime() - new Date(b.start).getTime() : a.allDay ? -1 : 1)),
    [db.events, today],
  )

  const owner = useDeviceOwner()
  // Telefonda önce bu cihazın sahibinin görevleri
  const dueChores = useMemo(() => {
    const list = db.chores.filter((c) => isChoreDueToday(c, today))
    if (kiosk || !owner) return list
    const rank = (c: (typeof list)[number]) => (c.assigneeId === owner ? 0 : !c.assigneeId ? 1 : 2)
    return [...list].sort((a, b) => rank(a) - rank(b))
  }, [db.chores, today, kiosk, owner])
  const ownerName = !kiosk && owner ? db.members.find((m) => m.id === owner)?.name : undefined
  const doneCount = dueChores.filter((c) => isChoreDoneToday(c, today)).length

  const pendingShopping = db.shopping.filter((s) => !s.done)
  const meals = db.meals.filter((m) => m.date === today)
  const recentMsgs = db.messages.slice(-3).reverse()


  const clock = useClock(60_000)
  const greeting = greetingFor(clock)
  const celebrate = db.settings.celebrations !== false
  const specials = useMemo(
    () => (celebrate ? specialDaysFor(clock, db.members) : []),
    [celebrate, db.members, today],
  )

  const SPAN: Record<number, string> = { 3: 'col-span-3', 4: 'col-span-4', 6: 'col-span-6', 12: 'col-span-12' }
  // Telefonda tek sütun; görevler en üstte (order ile)
  const grid = kiosk ? 'grid grid-cols-12 gap-5 items-stretch' : 'flex flex-col gap-4'
  const span = (n: number) => (kiosk ? cx(SPAN[n] ?? '', 'h-full') : 'h-full')

  return (
    <div className="space-y-5">
      {specials.some((d) => d.confetti) && <Confetti />}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className={cx('font-display tracking-tight text-slate-900', kiosk ? 'text-[42px] leading-tight' : 'text-2xl')}>
            {greeting}
            {celebrate && <span className={cx('ml-2 align-middle', kiosk ? 'text-3xl' : 'text-xl')}>{seasonEmoji(clock)}</span>}
          </h1>
          <div className={cx('font-bold text-slate-500 -mt-0.5', kiosk ? 'text-lg' : 'text-sm')}>
            {ownerName ? `${ownerName}, işte bugünün` : db.settings.familyName}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatChip
              icon={<CalendarBlankIcon className="w-4 h-4 text-violet-600" weight="duotone" />}
              value={todaysEvents.length}
              label="etkinlik"
              tone="bg-violet-100/80"
            />
            <StatChip
              icon={<BroomIcon className="w-4 h-4 text-amber-600" weight="duotone" />}
              value={dueChores.length - doneCount}
              label="bekleyen görev"
              tone="bg-amber-100/80"
            />
            <StatChip
              icon={<CheckCircleIcon className="w-4 h-4 text-emerald-600" weight="duotone" />}
              value={doneCount}
              label={`/ ${dueChores.length} tamamlandı`}
              tone="bg-emerald-100/80"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Özgün ikonlu kısayollar (metinsiz) */}
          <button
            type="button"
            onClick={() => onProgram('nutrition')}
            title="Beslenme Programı"
            aria-label="Beslenme Programı"
            className={cx(
              'grid place-items-center rounded-2xl bg-rose-500/90 text-white shadow-lg touch-manipulation hover:scale-105 active:scale-95 transition-transform',
              kiosk ? 'w-14 h-14' : 'w-12 h-12',
            )}
          >
            <BowlFoodIcon weight="duotone" className={kiosk ? 'w-8 h-8' : 'w-7 h-7'} />
          </button>
          <button
            type="button"
            onClick={() => onProgram('lessons')}
            title="Ders Programı"
            aria-label="Ders Programı"
            className={cx(
              'grid place-items-center rounded-2xl bg-brand-600/90 text-white shadow-lg touch-manipulation hover:scale-105 active:scale-95 transition-transform',
              kiosk ? 'w-14 h-14' : 'w-12 h-12',
            )}
          >
            <ChalkboardTeacherIcon weight="duotone" className={kiosk ? 'w-8 h-8' : 'w-7 h-7'} />
          </button>
          <Btn onClick={() => onTab('calendar')} size={kiosk ? 'lg' : 'md'}>
            <PlusIcon className="w-5 h-5" /> Yeni etkinlik
          </Btn>
        </div>
      </div>

      <SpecialDayBanner days={specials} members={db.members} kiosk={kiosk} />

      {/* Telefonda: sıradaki etkinlik + küçük hava şeridi (kiosk'ta üst bantta) */}
      {!kiosk && <NextUp db={db} kiosk={false} />}
      {!kiosk && (
        <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
          <WeatherWidget {...weather} compact />
        </div>
      )}

      <div className={grid}>
        {/* Günün akışı */}
        <div className={span(4)}>
          <Reveal delay={70} className="h-full">
          <GlassCard className="p-5 h-full hover-lift">
            <SectionTitle
              title="Bugün"
              action={
                <button onClick={() => onTab('calendar')} className="text-sm font-semibold text-brand-600 flex items-center">
                  Takvim <CaretRightIcon className="w-4 h-4" />
                </button>
              }
            />
            {todaysEvents.length === 0 ? (
              <Empty icon="📅" text="Bugün için etkinlik yok." />
            ) : (
              <ul className="space-y-2.5">
                {todaysEvents.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3"
                    style={{ borderLeft: `5px solid ${memberOf.get(e.memberIds[0] ?? '')?.color ?? '#94a3b8'}` }}
                  >
                    <div className="text-center shrink-0 w-16">
                      <div className="text-xs font-bold text-slate-400 uppercase">
                        {e.allDay ? 'Tüm gün' : fmtTime(new Date(e.start))}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cx('font-bold text-slate-800 truncate', kiosk && 'text-lg')}>{e.title}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {e.location && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <MapPinIcon className="w-3.5 h-3.5" /> {e.location}
                          </span>
                        )}
                        {e.memberIds.map((id) => {
                          const m = memberOf.get(id)
                          return m ? (
                            <span key={id} className="text-sm" title={m.name}>
                              {m.emoji}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                    <div className="flex -space-x-1.5 shrink-0">
                      {e.memberIds.slice(0, 4).map((id) => (
                        <Avatar key={id} member={memberOf.get(id)} size="sm" className="ring-2 ring-white" />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
          </Reveal>
        </div>

        {/* Görevler */}
        <div className={cx(span(4), !kiosk && 'order-first')}>
          <Reveal delay={140} className="h-full">
          <GlassCard className="p-5 h-full hover-lift">
            <SectionTitle
              title={`${ownerName ? 'Görevlerim' : 'Görevler'} ${doneCount}/${dueChores.length}`}
              action={
                <button onClick={() => onTab('chores')} className="text-sm font-semibold text-brand-600 flex items-center">
                  Tümü <CaretRightIcon className="w-4 h-4" />
                </button>
              }
            />
            {dueChores.length === 0 ? (
              <Empty icon="🧹" text="Bugün bekleyen görev yok." />
            ) : (
              <ul className="space-y-2">
                {dueChores.map((c) => {
                  const done = isChoreDoneToday(c, today)
                  const m = memberOf.get(c.assigneeId ?? '')
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggleChore(c, getDeviceOwner() || undefined)}
                        className={cx(
                          'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors touch-manipulation',
                          done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:bg-slate-50',
                        )}
                        style={{ borderLeft: `5px solid ${m?.color ?? '#cbd5e1'}` }}
                      >
                        <span
                          className={cx(
                            'w-7 h-7 rounded-lg grid place-items-center border-2 shrink-0 text-sm font-bold',
                            done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent',
                          )}
                        >
                          ✓
                        </span>
                        <span className={cx('flex-1 font-semibold truncate', kiosk && 'text-lg', done && 'line-through text-slate-400')}>
                          {c.title}
                        </span>
                        <Chip tone={c.repeat === 'none' ? 'slate' : 'amber'}>
                          {c.repeat === 'daily' ? 'Günlük' : c.repeat === 'weekly' ? 'Haftalık' : c.repeat === 'monthly' ? 'Aylık' : 'Tek'}
                        </Chip>
                        <Avatar member={m} size="sm" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </GlassCard>
          </Reveal>
        </div>

        {/* Alışveriş */}
        <div className={span(4)}>
          <Reveal delay={210} className="h-full">
            <GlassCard className="p-5 h-full hover-lift">
              <SectionTitle
                title={`Alışveriş (${pendingShopping.length})`}
                action={
                  <button onClick={() => onTab('shopping')} className="text-sm font-bold text-brand-600 flex items-center">
                    Liste <CaretRightIcon className="w-4 h-4" />
                  </button>
                }
              />
              {pendingShopping.length === 0 ? (
                <Empty icon="🛒" text="Liste boş." compact />
              ) : (
                <ul className="space-y-2">
                  {pendingShopping.slice(0, kiosk ? 5 : 4).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-xl bg-white/45 border border-white/60 px-3 py-2.5">
                      <ColorDot color={memberOf.get(s.addedById)?.color ?? '#94a3b8'} />
                      <span className="flex-1 font-bold truncate">{s.text}</span>
                      <Chip>{s.category}</Chip>
                      <Avatar member={memberOf.get(s.addedById)} size="sm" />
                    </li>
                  ))}
                  {pendingShopping.length > (kiosk ? 5 : 4) && (
                    <li className="text-center text-xs text-slate-400 font-bold">
                      +{pendingShopping.length - (kiosk ? 5 : 4)} ürün daha
                    </li>
                  )}
                </ul>
              )}
            </GlassCard>
          </Reveal>
        </div>

        {/* Yemek */}
        <div className={span(6)}>
          <Reveal delay={280} className="h-full">
            <GlassCard className="p-5 h-full hover-lift">
              <SectionTitle
                title="Bugün Ne Pişirsek?"
                action={
                  <button onClick={() => onTab('meals')} className="text-sm font-bold text-brand-600 flex items-center">
                    Plan <CaretRightIcon className="w-4 h-4" />
                  </button>
                }
              />
              <div className="grid grid-cols-3 gap-2">
                {MEAL_SLOTS.map((s) => {
                  const meal = meals.find((m) => m.slot === s.key)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => onTab('meals')}
                      className="rounded-xl bg-white/45 border border-white/60 p-3 text-left hover-lift touch-manipulation"
                    >
                      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{s.label}</div>
                      <div className={cx('font-extrabold text-slate-800 truncate mt-0.5', kiosk && 'text-lg')}>
                        {meal?.title ?? <span className="text-slate-300">—</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </GlassCard>
          </Reveal>
        </div>

        {/* Mesajlar */}
        <div className={span(6)}>
          <Reveal delay={350} className="h-full">
            <GlassCard className="p-5 h-full hover-lift">
              <SectionTitle
                title="Aile Panosu"
                action={
                  <button onClick={() => onTab('chat')} className="text-sm font-bold text-brand-600 flex items-center">
                    Mesajlar <CaretRightIcon className="w-4 h-4" />
                  </button>
                }
              />
              {recentMsgs.length === 0 ? (
                <Empty icon="💬" text="Henüz mesaj yok." compact />
              ) : (
                <ul className="space-y-2.5">
                  {recentMsgs.map((msg) => {
                    const m = memberOf.get(msg.fromId)
                    return (
                      <li key={msg.id} className="flex items-start gap-3">
                        <Avatar member={m} size="sm" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-slate-400">
                            {m?.name ?? '?'} · {relativeTime(msg.at)}
                          </div>
                          <div className={cx('text-slate-700 font-semibold break-words', kiosk && 'text-lg')}>{msg.text}</div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
