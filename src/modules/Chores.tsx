import { PlusIcon, TrashIcon, SparkleIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Btn, Card, Chip, Empty, Field, Input, Modal, Segmented, Avatar, cx, Select } from '../components/ui'
import { isChoreDoneToday, isChoreDueToday, deleteChore, saveChore, toggleChore, starTotals } from '../state/actions'
import { useDeviceOwner } from '../sync/config'
import { todayKey, fmtDate } from '../lib/time'
import { uiBus } from '../state/uiBus'
import type { DB, Repeat } from '../types'

const REPEATS: { value: Repeat; label: string }[] = [
  { value: 'none', label: 'Tek seferlik' },
  { value: 'daily', label: 'Her gün' },
  { value: 'weekly', label: 'Her hafta' },
  { value: 'monthly', label: 'Her ay' },
]

interface Draft {
  id?: string
  title: string
  assigneeId: string
  repeat: Repeat
  startDate: string
  dueDate: string
}

const emptyDraft = (): Draft => ({
  title: '',
  assigneeId: '',
  repeat: 'daily',
  startDate: todayKey(),
  dueDate: '',
})

export function Chores({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const owner = useDeviceOwner()
  const [filter, setFilter] = useState<'today' | 'mine' | 'all'>(() => (owner ? 'mine' : 'today'))
  const [draft, setDraft] = useState<Draft | null>(null)
  const today = todayKey()

  useEffect(() => {
    const off = uiBus.subscribe((e) => {
      if (e === 'add:chore') setDraft(emptyDraft())
    })
    return off
  }, [])

  const memberOf = useMemo(() => new Map(db.members.map((m) => [m.id, m])), [db.members])
  const list = useMemo(() => {
    const arr =
      filter === 'all'
        ? db.chores
        : db.chores.filter((c) => isChoreDueToday(c, today) && (filter !== 'mine' || !c.assigneeId || c.assigneeId === owner))
    return [...arr].sort((a, b) => {
      const da = isChoreDoneToday(a, today) ? 1 : 0
      const db2 = isChoreDoneToday(b, today) ? 1 : 0
      return da - db2
    })
  }, [db.chores, filter, today, owner])

  const stars = useMemo(() => starTotals(db.chores), [db.chores])
  const due = db.chores.filter((c) => isChoreDueToday(c, today))
  const done = due.filter((c) => isChoreDoneToday(c, today)).length
  const pct = due.length ? Math.round((done / due.length) * 100) : 0

  const save = () => {
    if (!draft || !draft.title.trim()) return
    saveChore({
      id: draft.id,
      title: draft.title.trim(),
      assigneeId: draft.assigneeId || undefined,
      repeat: draft.repeat,
      startDate: draft.startDate,
      dueDate: draft.repeat === 'none' ? draft.dueDate || undefined : undefined,
    })
    setDraft(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={cx('font-extrabold text-slate-800', kiosk ? 'text-3xl' : 'text-2xl')}>Görevler</h1>
          <p className="text-slate-500 font-medium">
            Bugün {done}/{due.length} tamamlandı
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              ...(owner ? [{ value: 'mine' as const, label: 'Benim' }] : []),
              { value: 'today' as const, label: 'Bugün' },
              { value: 'all' as const, label: 'Tümü' },
            ]}
          />
          <Btn onClick={() => setDraft(emptyDraft())} size={kiosk ? 'lg' : 'md'}>
            <PlusIcon className="w-5 h-5" /> Görev ekle
          </Btn>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-extrabold text-brand-600 tabular-nums w-16">{pct}%</div>
          <div className="flex-1">
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs font-semibold text-slate-400 mt-1.5">
              {done === due.length && due.length > 0 ? 'Harika! Tüm görevler tamam 🎉' : 'Bugünün rutinleri'}
            </div>
          </div>
        </div>
        {stars.size > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100" aria-label="Yıldız tablosu">
            {[...db.members]
              .filter((m) => (stars.get(m.id) ?? 0) > 0)
              .sort((a, b) => (stars.get(b.id) ?? 0) - (stars.get(a.id) ?? 0))
              .map((m, i) => (
                <div
                  key={m.id}
                  className={cx(
                    'flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border',
                    i === 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200',
                  )}
                >
                  <Avatar member={m} size="sm" />
                  <span className={cx('font-bold text-slate-700', kiosk && 'text-lg')}>{m.name}</span>
                  <span className={cx('font-extrabold text-amber-500 tabular-nums', kiosk && 'text-lg')}>
                    ★ {stars.get(m.id)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>

      {list.length === 0 ? (
        <Card>
          <Empty icon="🧹" text="Görev yok. Yeni bir rutin ekleyin." action={<Btn onClick={() => setDraft(emptyDraft())}>Görev ekle</Btn>} />
        </Card>
      ) : (
        <div className={cx('grid gap-3', kiosk ? 'grid-cols-2' : 'grid-cols-1')}>
          {list.map((c) => {
            const doneToday = isChoreDoneToday(c, today)
            const m = memberOf.get(c.assigneeId ?? '')
            return (
              <Card key={c.id} className={cx('p-4 flex items-center gap-3 transition-colors', doneToday && 'bg-emerald-50/70 border-emerald-200')}>
                <button
                  type="button"
                  onClick={() => toggleChore(c, owner || undefined)}
                  aria-label="Tamamla"
                  className={cx(
                    'w-11 h-11 rounded-xl grid place-items-center text-lg font-bold border-2 shrink-0 touch-manipulation',
                    doneToday ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent',
                  )}
                >
                  ✓
                </button>
                <button type="button" onClick={() => setDraft({
                  id: c.id, title: c.title, assigneeId: c.assigneeId ?? '', repeat: c.repeat, startDate: c.startDate, dueDate: c.dueDate ?? '',
                })} className="flex-1 min-w-0 text-left touch-manipulation">
                  <div className={cx('font-bold text-slate-800 truncate', kiosk && 'text-lg', doneToday && 'line-through text-slate-400')}>
                    {c.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Chip tone={c.repeat === 'none' ? 'slate' : 'amber'}>
                      {REPEATS.find((r) => r.value === c.repeat)?.label}
                    </Chip>
                    {c.repeat === 'none' && c.dueDate && <span className="text-xs text-slate-400 font-semibold">Son: {fmtDate(c.dueDate)}</span>}
                    {c.repeat !== 'none' && <span className="text-xs text-slate-400 font-semibold">Başlangıç: {fmtDate(c.startDate)}</span>}
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <Avatar member={m} size={kiosk ? 'lg' : 'md'} />
                  <button
                    type="button"
                    onClick={() => confirm('Görev silinsin mi?') && deleteChore(c.id)}
                    className="w-10 h-10 grid place-items-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 touch-manipulation"
                    aria-label="Sil"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Görevi düzenle' : 'Yeni görev'}
        footer={
          <Btn className="w-full" onClick={save} disabled={!draft?.title.trim()}>
            Kaydet
          </Btn>
        }
      >
        {draft && (
          <>
            <Field label="Görev">
              <Input autoFocus value={draft.title} placeholder="Örn. Çöpü çıkar" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="Kime atanacak?">
              <Select value={draft.assigneeId} onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}>
                <option value="">Atanmamış</option>
                {db.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <span className="block text-sm font-semibold text-slate-600 mb-1.5">Tekrar</span>
              <div className="grid grid-cols-2 gap-2">
                {REPEATS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, repeat: r.value })}
                    className={cx(
                      'h-12 rounded-xl border-2 font-semibold text-sm touch-manipulation',
                      draft.repeat === r.value ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-600',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Başlangıç tarihi">
              <Input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </Field>
            {draft.repeat === 'none' && (
              <Field label="Son tarih (isteğe bağlı)">
                <Input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
              </Field>
            )}
            <p className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
              <SparkleIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              Yinelenen görev, ilgili günde otomatik olarak yeniden “yapılacak” listesine düşer; tamamlandığı gün işaretlenir.
            </p>
          </>
        )}
      </Modal>
    </div>
  )
}
