import {CaretLeftIcon, CaretRightIcon, PlusIcon, TrashIcon} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import {
  Btn, Card, Chip, Empty, Field, Input, MemberPicker, Modal, Segmented, TextArea, Select, cx, Avatar,
} from '../components/ui'
import {
  addDays, dateKey, fmtDate, fmtDayName, fmtTime, monthMatrix, parseKey, startOfWeek, todayKey, weekDays, toLocalInput, fromLocalInput,
} from '../lib/time'
import { deleteEvent, saveEvent } from '../state/actions'
import { uiBus } from '../state/uiBus'
import type { DB, EventItem } from '../types'

type View = 'day' | 'week' | 'month'

function startKey(e: EventItem): string {
  return e.allDay ? e.start.slice(0, 10) : dateKey(new Date(e.start))
}

interface Draft {
  id?: string
  title: string
  allDay: boolean
  startLocal: string
  endLocal: string
  memberIds: string[]
  location: string
  notes: string
}

function draftFrom(e?: EventItem | null): Draft {
  if (!e) {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() + 1)
    return {
      title: '',
      allDay: false,
      startLocal: toLocalInput(d.toISOString()),
      endLocal: '',
      memberIds: [],
      location: '',
      notes: '',
    }
  }
  return {
    id: e.id,
    title: e.title,
    allDay: e.allDay,
    startLocal: e.allDay ? `${e.start.slice(0, 10)}T09:00` : toLocalInput(e.start),
    endLocal: e.end ? toLocalInput(e.end) : '',
    memberIds: e.memberIds ?? [],
    location: e.location ?? '',
    notes: e.notes ?? '',
  }
}

export function Calendar({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const [view, setView] = useState<View>(kiosk ? 'week' : 'month')
  const [cursor, setCursor] = useState(() => new Date())
  const [draft, setDraft] = useState<Draft | null>(null)
  const [dayFocus, setDayFocus] = useState(todayKey())

  useEffect(() => {
    const off = uiBus.subscribe((e) => {
      if (e === 'add:event') {
        setDayFocus(todayKey())
        setDraft(draftFrom(null))
      }
    })
    return off
  }, [])

  const byDay = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const e of db.events) {
      const k = startKey(e)
      const arr = map.get(k) ?? []
      arr.push(e)
      map.set(k, arr)
    }
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    return map
  }, [db.events])

  const eventsOn = (key: string) => byDay.get(key) ?? []
  const memberOf = new Map(db.members.map((m) => [m.id, m]))

  const step = (dir: number) => {
    if (view === 'day') setCursor((c) => addDays(c, dir))
    else if (view === 'week') setCursor((c) => addDays(c, dir * 7))
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1))
  }

  const label =
    view === 'day'
      ? fmtDate(cursor)
      : view === 'week'
        ? `${fmtDate(startOfWeek(cursor))} – ${fmtDate(addDays(startOfWeek(cursor), 6))}`
        : `${cursor.toLocaleDateString('tr-TR', { month: 'long' })} ${cursor.getFullYear()}`

  const openEvent = (e?: EventItem) => setDraft(draftFrom(e ?? null))
  const openDay = (key: string) => {
    setDayFocus(key)
    setCursor(parseKey(key))
    setView('day')
  }

  const save = () => {
    if (!draft || !draft.title.trim()) return
    const allDayStart = draft.startLocal.slice(0, 10)
    saveEvent({
      id: draft.id,
      title: draft.title.trim(),
      allDay: draft.allDay,
      start: draft.allDay ? allDayStart : fromLocalInput(draft.startLocal),
      end: draft.endLocal ? fromLocalInput(draft.endLocal) : undefined,
      memberIds: draft.memberIds,
      location: draft.location.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    })
    setDraft(null)
  }

  /** Düz fonksiyon çağrısı (JSX bileşeni olsaydı her render'da yeniden mount olurdu). */
  const eventPill = (e: EventItem, compact = false) => {
    const colors = e.memberIds.map((id) => memberOf.get(id)?.color).filter(Boolean)
    const bg = colors[0] ?? '#4f6ef7'
    return (
      <button
        key={e.id}
        type="button"
        onClick={(ev) => {
          ev.stopPropagation()
          openEvent(e)
        }}
        className={cx(
          'w-full text-left rounded-lg px-2 py-1 text-white font-semibold truncate transition-transform active:scale-[0.98] touch-manipulation',
          compact ? 'text-[11px] leading-tight' : 'text-sm py-1.5',
        )}
        style={{ backgroundColor: bg }}
        title={e.title}
      >
        {!e.allDay && <span className="opacity-80 mr-1">{fmtTime(new Date(e.start))}</span>}
        {e.title}
      </button>
    )
  }

  /* ---------- Aylık görünüm ---------- */
  const MonthGrid = () => {
    const cells = monthMatrix(cursor.getFullYear(), cursor.getMonth())
    const today = todayKey()
    return (
      <div>
        <div className="grid grid-cols-7 mb-2">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
            <div key={d} className="text-center text-xs font-extrabold uppercase text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d) => {
            const key = dateKey(d)
            const inMonth = d.getMonth() === cursor.getMonth()
            const evs = eventsOn(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => openDay(key)}
                className={cx(
                  'min-h-[92px] rounded-xl border p-1.5 text-left transition-colors touch-manipulation',
                  inMonth ? 'bg-white border-slate-200 hover:border-brand-300' : 'bg-slate-50 border-slate-100 opacity-60',
                  key === today && 'ring-2 ring-brand-500',
                )}
              >
                <div
                  className={cx(
                    'text-sm font-bold mb-1 w-7 h-7 grid place-items-center rounded-full',
                    key === today ? 'bg-brand-500 text-white' : 'text-slate-600',
                  )}
                >
                  {d.getDate()}
                </div>
                <div className="space-y-1">
                  {evs.slice(0, 2).map((e) => eventPill(e, true))}
                  {evs.length > 2 && <div className="text-[10px] font-bold text-slate-400 pl-1">+{evs.length - 2}</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /* ---------- Haftalık görünüm ---------- */
  const WeekGrid = () => {
    const days = weekDays(cursor)
    const today = todayKey()
    return (
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="grid grid-cols-7 gap-2 min-w-[720px]">
          {days.map((d) => {
            const key = dateKey(d)
            const evs = eventsOn(key)
            return (
              <div
                key={key}
                className={cx(
                  'rounded-2xl border bg-white p-2 min-h-[320px]',
                  key === today ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200',
                )}
              >
                <button
                  type="button"
                  onClick={() => openDay(key)}
                  className="w-full text-center mb-2 pb-2 border-b border-slate-100 touch-manipulation"
                >
                  <div className={cx('text-[11px] font-extrabold uppercase', key === today ? 'text-brand-600' : 'text-slate-400')}>
                    {fmtDayName(d, true)}
                  </div>
                  <div className={cx('text-2xl font-extrabold', key === today ? 'text-brand-600' : 'text-slate-800')}>
                    {d.getDate()}
                  </div>
                </button>
                <div className="space-y-1.5">
                  {evs.map((e) => eventPill(e))}
                  <button
                    type="button"
                    onClick={() => {
                      setDayFocus(key)
                      setDraft({ ...draftFrom(null), startLocal: `${key}T09:00` })
                    }}
                    className="w-full h-9 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm font-bold hover:border-brand-400 hover:text-brand-500 touch-manipulation"
                  >
                    <PlusIcon className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ---------- Günlük görünüm ---------- */
  const DayList = () => {
    const key = dateKey(cursor)
    const evs = eventsOn(key)
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-extrabold uppercase text-slate-400">{fmtDayName(cursor)}</div>
            <div className="text-xl font-extrabold text-slate-800">{fmtDate(cursor)}</div>
          </div>
          <Btn size="sm" onClick={() => setDraft({ ...draftFrom(null), startLocal: `${key}T09:00` })}>
            <PlusIcon className="w-4 h-4" /> Etkinlik
          </Btn>
        </div>
        {evs.length === 0 ? (
          <Empty icon="🗓️" text="Bu gün için etkinlik yok." />
        ) : (
          <ul className="space-y-2">
            {evs.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => openEvent(e)}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 touch-manipulation"
                >
                  <div className="text-sm font-extrabold text-slate-500 w-16 shrink-0 tabular-nums">
                    {e.allDay ? 'Tüm gün' : fmtTime(new Date(e.start))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">{e.title}</div>
                    {e.location && <div className="text-xs text-slate-400 font-medium">{e.location}</div>}
                  </div>
                  <div className="flex -space-x-1.5">
                    {e.memberIds.map((id) => (
                      <Avatar key={id} member={memberOf.get(id)} size="sm" className="ring-2 ring-white" />
                    ))}
                  </div>
                  <Chip tone="brand">{e.memberIds.length > 1 ? 'Ortak' : 'Tekil'}</Chip>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Btn variant="soft" size="md" onClick={() => step(-1)} aria-label="Önceki">
            <CaretLeftIcon className="w-5 h-5" />
          </Btn>
          <Btn variant="soft" onClick={() => setCursor(new Date())}>Bugün</Btn>
          <Btn variant="soft" size="md" onClick={() => step(1)} aria-label="Sonraki">
            <CaretRightIcon className="w-5 h-5" />
          </Btn>
          <h1 className={cx('font-extrabold text-slate-800 ml-2', kiosk ? 'text-3xl' : 'text-xl')}>{label}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Gün' },
              { value: 'week', label: 'Hafta' },
              { value: 'month', label: 'Ay' },
            ]}
          />
          <Btn onClick={() => setDraft(draftFrom(null))} size={kiosk ? 'lg' : 'md'}>
            <PlusIcon className="w-5 h-5" /> Ekle
          </Btn>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        {db.members.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
            {m.emoji} {m.name}
          </span>
        ))}
      </div>

      {view === 'month' ? <MonthGrid /> : view === 'week' ? <WeekGrid /> : <DayList />}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Etkinliği düzenle' : 'Yeni etkinlik'}
        footer={
          <div className="flex items-center gap-3">
            {draft?.id && (
              <Btn
                variant="danger"
                onClick={() => {
                  if (draft.id && confirm('Etkinlik silinsin mi?')) {
                    deleteEvent(draft.id)
                    setDraft(null)
                  }
                }}
              >
                <TrashIcon className="w-5 h-5" /> Sil
              </Btn>
            )}
            <Btn className="flex-1" onClick={save} disabled={!draft?.title.trim()}>
              Kaydet
            </Btn>
          </div>
        }
      >
        {draft && (
          <>
            <Field label="Başlık">
              <Input
                autoFocus
                value={draft.title}
                placeholder="Örn. Diş hekimi"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-600">Tüm gün</span>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, allDay: !draft.allDay })}
                className={cx(
                  'h-10 w-14 rounded-full transition-colors relative touch-manipulation',
                  draft.allDay ? 'bg-brand-500' : 'bg-slate-300',
                )}
              >
                <span className={cx('absolute top-1 left-1 w-8 h-8 rounded-full bg-white transition-transform', draft.allDay && 'translate-x-4')} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={draft.allDay ? 'Tarih' : 'Başlangıç'}>
                <Input
                  type={draft.allDay ? 'date' : 'datetime-local'}
                  value={draft.allDay ? draft.startLocal.slice(0, 10) : draft.startLocal}
                  onChange={(e) =>
                    setDraft({ ...draft, startLocal: draft.allDay ? `${e.target.value}T09:00` : e.target.value })
                  }
                />
              </Field>
              {!draft.allDay && (
                <Field label="Bitiş">
                  <Input
                    type="datetime-local"
                    value={draft.endLocal}
                    onChange={(e) => setDraft({ ...draft, endLocal: e.target.value })}
                  />
                </Field>
              )}
            </div>
            <Field label="Konum">
              <Input
                value={draft.location}
                placeholder="Örn. Klinik"
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </Field>
            <div>
              <span className="block text-sm font-semibold text-slate-600 mb-1.5">Kimler? (ortak etkinlik için çoklu)</span>
              <MemberPicker
                members={db.members}
                selected={draft.memberIds}
                onChange={(ids) => setDraft({ ...draft, memberIds: ids })}
              />
            </div>
            <Field label="Not">
              <TextArea
                value={draft.notes}
                placeholder="İsteğe bağlı not…"
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>
          </>
        )}
      </Modal>
    </div>
  )
}
