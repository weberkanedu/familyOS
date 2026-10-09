import { useEffect, useMemo, useState } from 'react'
import { BookOpenIcon, PlusIcon, TrashIcon, CheckIcon, PencilSimpleIcon, BowlFoodIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Btn, Card, Chip, Field, Input, Modal, Segmented, Select, cx } from '../components/ui'
import { deleteLesson, deleteNutrition, saveLesson, saveNutrition } from '../state/actions'
import type { DB, Member, SchoolLesson } from '../types'
import { todayWeekday } from '../lib/time'

const DAYS = [
  { n: 1, label: 'Pazartesi', short: 'Pzt' },
  { n: 2, label: 'Salı', short: 'Sal' },
  { n: 3, label: 'Çarşamba', short: 'Çar' },
  { n: 4, label: 'Perşembe', short: 'Per' },
  { n: 5, label: 'Cuma', short: 'Cum' },
  { n: 6, label: 'Cumartesi', short: 'Cmt' },
  { n: 7, label: 'Pazar', short: 'Paz' },
]

function ChildPicker({
  members,
  value,
  onChange,
}: {
  members: Member[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {members.map((m) => {
        const on = m.id === value
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cx(
              'shrink-0 h-11 px-4 rounded-xl font-bold text-sm touch-manipulation border-2 transition-colors flex items-center gap-2',
              on ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 bg-white',
            )}
            style={on ? { backgroundColor: m.color } : undefined}
          >
            {m.photo ? (
              <img src={m.photo} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <span className="text-base">{m.emoji}</span>
            )}
            {m.name}
          </button>
        )
      })}
    </div>
  )
}

function useKids(db: DB): Member[] {
  return useMemo(() => {
    const kids = db.members.filter((m) => m.role === 'child')
    return kids.length ? kids : db.members
  }, [db.members])
}

/* ================================================================
 *  BESLENME PROGRAMI — haftalık (çocuk × gün × 5 öğün)
 * ================================================================ */
export function NutritionPopup({
  db,
  open,
  onClose,
  initialKidId,
}: {
  db: DB
  open: boolean
  onClose: () => void
  initialKidId?: string | null
}) {
  const kids = useKids(db)
  const [kidId, setKidId] = useState(initialKidId || kids[0]?.id || '')
  const [weekday, setWeekday] = useState(todayWeekday())
  // Yeni satır ve düzenleme ayrı durumlarda tutulur (yazarken satır kaybolmasın)
  const [draft, setDraft] = useState({ time: '09:00', title: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ time: '', title: '' })

  useEffect(() => {
    if (!open) return
    if (initialKidId && kids.some((k) => k.id === initialKidId)) setKidId(initialKidId)
    else if (!kids.find((k) => k.id === kidId)) setKidId(kids[0]?.id ?? '')
  }, [open, kids, kidId, initialKidId])

  const entries = useMemo(
    () =>
      db.nutrition
        .filter((n) => n.memberId === kidId && n.weekday === weekday)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [db.nutrition, kidId, weekday],
  )

  const kid = db.members.find((m) => m.id === kidId)
  const today = todayWeekday()

  const addNew = () => {
    if (!draft.title.trim()) return
    saveNutrition({ memberId: kidId, weekday, time: draft.time, title: draft.title })
    setDraft({ time: draft.time, title: '' })
  }

  const saveEdit = (id: string) => {
    if (!editDraft.title.trim()) return
    saveNutrition({ id, memberId: kidId, weekday, time: editDraft.time, title: editDraft.title })
    setEditingId(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Beslenme Programı · haftalık" sheet={false} wide>
      <ChildPicker members={kids} value={kidId} onChange={setKidId} />

      {/* Haftanın günleri (bugün varsayılan açılır) */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {DAYS.map((d) => {
          const on = d.n === weekday
          return (
            <button
              key={d.n}
              type="button"
              onClick={() => {
                setWeekday(d.n)
                setEditingId(null)
              }}
              className={cx(
                'shrink-0 w-[56px] rounded-xl border-2 py-2 text-center touch-manipulation transition-colors',
                on ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white',
                d.n === today && !on && 'border-emerald-300',
              )}
            >
              <div className={cx('text-xs font-extrabold', on ? 'text-rose-600' : 'text-slate-500')}>{d.short}</div>
              <div className={cx('text-[9px] font-bold', on ? 'text-rose-400' : 'text-slate-300')}>
                {d.n === today ? 'BUGÜN' : `${d.n}. gün`}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BowlFoodIcon className="w-5 h-5 text-rose-500" />
          <span className="font-extrabold text-slate-800">{kid ? `${kid.name}` : '—'}</span>
        </div>
        <span className="text-xs font-bold text-slate-400">
          {DAYS.find((d) => d.n === weekday)?.label}
          {weekday === today ? ' · bugün' : ''}
        </span>
      </div>

      {/* Serbest menü: istediğiniz kadar satır (sabah, öğle, ikindi...) */}
      <div className="space-y-2">
        {entries.map((n) => (
          <Card key={n.id} className="p-2.5 bg-rose-50/50 border-rose-100">
            {editingId === n.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={editDraft.time}
                    onChange={(e) => setEditDraft((d) => ({ ...d, time: e.target.value }))}
                    className="h-10 w-28"
                  />
                  <Input
                    autoFocus
                    value={editDraft.title}
                    placeholder="Örn. Sabah: yulaf, süt ve muz"
                    onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(n.id)}
                  />
                </div>
                <div className="flex gap-2">
                  <Btn variant="soft" size="sm" className="flex-1" onClick={() => setEditingId(null)}>
                    Vazgeç
                  </Btn>
                  <Btn size="sm" className="flex-1" onClick={() => saveEdit(n.id)} disabled={!editDraft.title.trim()}>
                    <CheckIcon className="w-4 h-4" /> Kaydet
                  </Btn>
                  <Btn
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      deleteNutrition(n.id)
                      setEditingId(null)
                    }}
                    aria-label="Sil"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Btn>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm font-extrabold text-rose-500 tabular-nums w-12 shrink-0">{n.time}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(n.id)
                    setEditDraft({ time: n.time, title: n.title })
                  }}
                  className="flex-1 text-left font-bold text-slate-800 truncate touch-manipulation"
                >
                  {n.title}
                </button>
                <PencilSimpleIcon className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            )}
          </Card>
        ))}

        {/* Yeni satır ekleme formu (her zaman görünür) */}
        {editingId === null && (
          <Card className="p-2.5 border-dashed">
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
                className="h-11 w-28 shrink-0"
              />
              <Input
                value={draft.title}
                placeholder="Yiyecek/ içecek girin (örn. İkindi: meyve)"
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addNew()}
                className="flex-1"
              />
              <Btn size="lg" onClick={addNew} disabled={!draft.title.trim()} className="shrink-0 px-4">
                <PlusIcon className="w-5 h-5" />
              </Btn>
            </div>
          </Card>
        )}

        {entries.length === 0 && (
          <p className="text-xs text-slate-400 font-medium text-center py-2">
            Bu gün için henüz bir şey yok. Yukarıdan saat ve yiyecek girip + ile ekleyin.
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400 font-medium">
        Program haftalıktır: bir gün için yazdığınız öğünler o haftanın aynı günü için geçerlidir.
      </p>
    </Modal>
  )
}

/* ================================================================
 *  DERS PROGRAMI — haftalık, yatay 7 sütun
 * ================================================================ */
export function LessonsPopup({
  db,
  open,
  onClose,
  initialKidId,
}: {
  db: DB
  open: boolean
  onClose: () => void
  initialKidId?: string | null
}) {
  const kids = useKids(db)
  const [kidId, setKidId] = useState(initialKidId || kids[0]?.id || '')
  const [form, setForm] = useState<Omit<SchoolLesson, 'memberId' | 'updatedAt'> | null>(null)

  useEffect(() => {
    if (!open) return
    if (initialKidId && kids.some((k) => k.id === initialKidId)) setKidId(initialKidId)
    else if (!kids.find((k) => k.id === kidId)) setKidId(kids[0]?.id ?? '')
  }, [open, kids, kidId, initialKidId])

  const lessons = useMemo(
    () => db.lessons.filter((l) => l.memberId === kidId).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)),
    [db.lessons, kidId],
  )

  const today = todayWeekday()
  const kid = db.members.find((m) => m.id === kidId)

  const save = () => {
    if (!form) return
    saveLesson({ ...form, memberId: kidId })
    setForm(null)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ders Programı · haftalık"
      sheet={false}
      wide
      footer={
        form ? (
          <div className="flex gap-2">
            <Btn variant="soft" className="flex-1" onClick={() => setForm(null)}>
              Vazgeç
            </Btn>
            <Btn className="flex-1" onClick={save} disabled={!form.subject.trim()}>
              Kaydet
            </Btn>
          </div>
        ) : (
          <Btn
            className="w-full"
            onClick={() => setForm({ id: '', day: today, start: '09:00', end: '09:40', subject: '', room: '' })}
          >
            <PlusIcon className="w-5 h-5" /> Ders ekle
          </Btn>
        )
      }
    >
      <ChildPicker members={kids} value={kidId} onChange={setKidId} />

      {form && (
        <Card className="p-3 border-brand-200 bg-brand-50/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gün">
              <Select value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
                {DAYS.map((d) => (
                  <option key={d.n} value={d.n}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ders">
              <Input
                autoFocus
                value={form.subject}
                placeholder="Örn. Matematik"
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Başlangıç">
              <Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="Bitiş">
              <Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </Field>
            <Field label="Salon">
              <Input value={form.room} placeholder="A Blok" onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </Field>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <BookOpenIcon className="w-5 h-5 text-brand-600" />
        <span className="font-extrabold text-slate-800">{kid ? kid.name : '—'}</span>
        <Chip tone="slate">{lessons.length} ders</Chip>
        <span className="ml-auto text-xs font-bold text-slate-400">← yatay kaydır →</span>
      </div>

      {/* Yatay hafta şeridi */}
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        <div className="grid grid-cols-7 gap-2.5 min-w-[820px]">
          {DAYS.map((d) => {
            const dayLessons = lessons.filter((l) => l.day === d.n)
            const isToday = d.n === today
            return (
              <div
                key={d.n}
                className={cx(
                  'rounded-2xl border-2 flex flex-col min-h-[260px]',
                  isToday ? 'border-brand-500 bg-brand-50/60' : 'border-slate-200 bg-white',
                )}
              >
                <div
                  className={cx(
                    'rounded-t-xl px-2 py-2 text-center',
                    isToday ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-500',
                  )}
                >
                  <div className="text-sm font-extrabold">{d.short}</div>
                  <div className="text-[10px] font-bold opacity-80">{isToday ? 'BUGÜN' : `${d.n}. gün`}</div>
                </div>

                <div className="flex-1 space-y-2 p-2">
                  {dayLessons.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setForm({ ...l })}
                      className="w-full rounded-xl bg-white/85 border border-slate-200 hover:border-brand-400 p-2 text-left touch-manipulation transition-colors"
                    >
                      <div className="text-[11px] font-extrabold text-brand-600 tabular-nums">
                        {l.start}–{l.end}
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 leading-snug break-words">
                        {l.subject}
                      </div>
                      {l.room && <div className="text-[10px] font-bold text-slate-400 truncate">{l.room}</div>}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm({ id: '', day: d.n, start: '09:00', end: '09:40', subject: '', room: '' })}
                    className="w-full h-10 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-brand-500 hover:border-brand-400 text-sm font-bold touch-manipulation"
                  >
                    + ekle
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {lessons.length > 0 && (
        <p className="text-xs text-slate-400 font-medium">
          Bir derse dokunarak düzenleyebilir, “+ ekle” ile yeni ders ekleyebilirsiniz. Boş bir güne
          <CaretLeftIcon className="w-3 h-3 inline mx-0.5" />
          <CaretRightIcon className="w-3 h-3 inline" />
          oklarıyla gün atlanır.
        </p>
      )}
    </Modal>
  )
}

/** Ana ekrandaki iki kısayolun açtığı popup çifti */
export function ProgramPopups({
  db,
  which,
  kidId,
  onClose,
}: {
  db: DB
  which: 'nutrition' | 'lessons' | null
  kidId?: string | null
  onClose: () => void
}) {
  return (
    <>
      <NutritionPopup db={db} open={which === 'nutrition'} onClose={onClose} initialKidId={kidId} />
      <LessonsPopup db={db} open={which === 'lessons'} onClose={onClose} initialKidId={kidId} />
    </>
  )
}

export { Segmented }
