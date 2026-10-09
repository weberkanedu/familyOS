import { CaretLeftIcon, CaretRightIcon, ShuffleIcon, TrashIcon, MagicWandIcon, CheckIcon, BookOpenIcon, GlobeIcon, CircleNotchIcon, SparkleIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Btn, Card, Chip, Empty, Field, Input, Modal, TextArea, cx } from '../components/ui'
import { addDays, dateKey, fmtDayName, fmtShort, parseKey, startOfWeek, todayKey, weekDays } from '../lib/time'
import { saveMeal } from '../state/actions'
import { MEAL_SLOTS } from '../types'
import type { DB, MealSlot } from '../types'
import { SLOT_LABEL, fetchOnlineRecipes, fetchRecipeDetail, suggest, type Dish, type OnlineRecipe } from '../lib/mealIdeas'

interface Draft {
  date: string
  slot: MealSlot
  title: string
  note: string
}

/* ============================================================
 *  ÖNERİ MOTORU — kahvaltı / öğle / akşam için teklifler
 * ============================================================ */
function SuggestPanel({
  db,
  date,
  onPick,
}: {
  db: DB
  date: string
  onPick: (slot: MealSlot, title: string) => void
}) {
  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner']
  const usedTitles = useMemo(() => db.meals.map((m) => m.title.toLocaleLowerCase('tr')), [db.meals])
  const [batch, setBatch] = useState(0)
  const [picks, setPicks] = useState<Record<string, Dish[]>>({})
  const [online, setOnline] = useState<Partial<Record<MealSlot, OnlineRecipe[]>>>({})
  const [loadingOnline, setLoadingOnline] = useState<MealSlot | null>(null)
  const [detail, setDetail] = useState<{ title: string; dish?: Dish; online?: OnlineRecipe } | null>(null)

  // Mevcut öğünleri filtrelemek için sadece son 10 gündeki yemekler
  const recent = useMemo(() => {
    const week = dateKey(addDays(date, -10))
    return db.meals.filter((m) => m.date >= week).map((m) => m.title.toLocaleLowerCase('tr'))
  }, [db.meals, date])

  useEffect(() => {
    const next: Record<string, Dish[]> = {}
    for (const s of slots) {
      const already = [...(picks[s]?.map((d) => d.title.toLocaleLowerCase('tr')) ?? []), ...recent]
      next[s] = suggest(s, already, 3)
    }
    setPicks(next)
    setOnline({})
    setDetail(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, date])

  const reroll = (slot: MealSlot) => {
    const already = [
      ...(picks[slot]?.map((d) => d.title.toLocaleLowerCase('tr')) ?? []),
      ...recent,
      ...(picks[slot] ? [] : []),
    ]
    setPicks({ ...picks, [slot]: suggest(slot, already, 3) })
  }

  const loadOnline = async (slot: MealSlot) => {
    setLoadingOnline(slot)
    try {
      const list = await fetchOnlineRecipes(slot, 3)
      setOnline((o) => ({ ...o, [slot]: list }))
    } finally {
      setLoadingOnline(null)
    }
  }

  const openDishRecipe = async (dish: Dish) => {
    setDetail({ title: dish.title, dish })
    const onlineRecipe = await fetchRecipeDetail(dish)
    setDetail((d) => (d && d.title === dish.title ? { ...d, online: onlineRecipe ?? undefined } : d))
  }

  return (
    <div className="space-y-4">
      {slots.map((slot) => (
        <div key={slot}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 grid place-items-center">
                <SparkleIcon className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-slate-800">{SLOT_LABEL[slot]} önerileri</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Btn variant="ghost" size="sm" onClick={() => loadOnline(slot)} disabled={loadingOnline === slot}>
                {loadingOnline === slot ? <CircleNotchIcon className="w-4 h-4 animate-spin" /> : <GlobeIcon className="w-4 h-4" />}
                <span className="hidden sm:inline">İnternetten</span>
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => reroll(slot)}>
                <ShuffleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Başka öner</span>
              </Btn>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {(picks[slot] ?? []).map((dish) => (
              <Card key={dish.id} className="p-3 flex flex-col gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-[15px] leading-tight">{dish.title}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {dish.tags.map((t) => (
                      <Chip key={t} tone="slate">{t}</Chip>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-auto">
                  <button
                    type="button"
                    onClick={() => openDishRecipe(dish)}
                    className="h-9 px-2.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 touch-manipulation inline-flex items-center gap-1"
                  >
                    <BookOpenIcon className="w-3.5 h-3.5" /> Tarif
                  </button>
                  <button
                    type="button"
                    onClick={() => onPick(slot, dish.title)}
                    className="h-9 px-2.5 rounded-lg bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 touch-manipulation inline-flex items-center gap-1 flex-1 justify-center"
                  >
                    <CheckIcon className="w-3.5 h-3.5" /> Seç
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {online[slot] && online[slot]!.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-3 mt-2">
              {online[slot]!.map((r) => (
                <Card key={r.id} className="p-2 flex gap-2 items-center">
                  <img src={r.image} alt={r.title} className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-700 truncate">{r.title}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{r.area ?? r.category}</div>
                    <button
                      type="button"
                      onClick={() => setDetail({ title: r.title, online: r })}
                      className="mt-1 text-[11px] font-bold text-brand-600 touch-manipulation"
                    >
                      Tarifi gör
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPick(slot, r.title)}
                    className="shrink-0 h-8 px-2 rounded-lg bg-brand-500 text-white text-[11px] font-bold touch-manipulation"
                  >
                    Seç
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Tarif detayı */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.title ?? ''}
        footer={
          detail && (
            <Btn className="w-full" onClick={() => {
              onPick(
                detail.dish?.kind ?? 'dinner',
                detail.title,
              )
              setDetail(null)
            }}>
              <CheckIcon className="w-5 h-5" /> Bu yemeği seç
            </Btn>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            {detail.online?.image && (
              <img src={detail.online.image} alt={detail.title} className="w-full rounded-2xl object-cover" />
            )}
            {detail.dish && (
              <>
                <div>
                  <div className="text-sm font-semibold text-slate-600 mb-1.5">Malzemeler</div>
                  <ul className="grid grid-cols-2 gap-1.5">
                    {detail.dish.ingredients.map((i) => (
                      <li key={i} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5 text-sm text-slate-700">
                        • {i}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-600 mb-1.5">Nasıl yapılır</div>
                  <ol className="space-y-1.5 list-decimal pl-5 text-sm text-slate-700 space-y-1">
                    {detail.dish.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              </>
            )}
            {detail.online && (
              <div>
                <div className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <GlobeIcon className="w-4 h-4" /> İnternet tarifi ({detail.online.source})
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed max-h-52 overflow-y-auto">
                  {detail.online.instructions}
                </p>
              </div>
            )}
            {!detail.online && detail.dish && (
              <p className="text-xs text-slate-400">İnternet tarifi bulunamadı; yukarıdaki ev tarifi yeterli.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

/** Haftalık yemek planı + öneri paneli. */
export function Meals({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const today = todayKey()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [draft, setDraft] = useState<Draft | null>(null)
  const [suggestDate, setSuggestDate] = useState<string | null>(null)

  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const cells = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of db.meals) map.set(`${m.date}|${m.slot}`, m.title)
    return map
  }, [db.meals])

  const pool = useMemo(() => Array.from(new Set(db.meals.map((m) => m.title))), [db.meals])
  const [activeDay, setActiveDay] = useState(today)

  const open = (date: string, slot: MealSlot) => {
    setDraft({ date, slot, title: cells.get(`${date}|${slot}`) ?? '', note: '' })
  }

  const save = () => {
    if (!draft) return
    saveMeal(draft.date, draft.slot, draft.title)
    setDraft(null)
  }

  const pickSuggestion = (slot: MealSlot, title: string) => {
    const date = suggestDate ?? today
    saveMeal(date, slot, title)
    setSuggestDate(null)
  }

  const randomize = (date: string) => {
    if (!pool.length) return
    const title = pool[Math.floor(Math.random() * pool.length)]
    saveMeal(date, 'dinner', title)
  }

  const isWeek = kiosk
  const shownDays = isWeek ? days : days.filter((d) => dateKey(d) === activeDay)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={cx('font-extrabold text-slate-800', kiosk ? 'text-3xl' : 'text-2xl')}>Haftalık Yemek Planı</h1>
          <p className="text-slate-500 font-medium">
            {fmtShort(days[0])} – {fmtShort(days[6])} · {pool.length} farklı tarif
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="soft" size="md" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Önceki hafta">
            <CaretLeftIcon className="w-5 h-5" />
          </Btn>
          <Btn variant="soft" onClick={() => setWeekStart(startOfWeek(new Date()))}>Bu hafta</Btn>
          <Btn variant="soft" size="md" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Sonraki hafta">
            <CaretRightIcon className="w-5 h-5" />
          </Btn>
          <Btn onClick={() => setSuggestDate(suggestDate ?? today)}>
            <MagicWandIcon className="w-5 h-5" /> Ne Pişirsem?
          </Btn>
        </div>
      </div>

      {!isWeek && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {days.map((d) => {
            const key = dateKey(d)
            const active = key === activeDay
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDay(key)}
                className={cx(
                  'shrink-0 w-16 rounded-2xl border-2 py-2.5 text-center transition-colors touch-manipulation',
                  active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white',
                  key === today && !active && 'border-emerald-300',
                )}
              >
                <div className={cx('text-[11px] font-extrabold uppercase', active ? 'text-brand-600' : 'text-slate-400')}>
                  {fmtDayName(d, true)}
                </div>
                <div className={cx('text-lg font-extrabold', active ? 'text-brand-700' : 'text-slate-700')}>{d.getDate()}</div>
              </button>
            )
          })}
        </div>
      )}

      <div className={cx('grid gap-3', isWeek ? 'grid-cols-7' : 'grid-cols-1')}>
        {shownDays.map((d) => {
          const key = dateKey(d)
          return (
            <Card key={key} className={cx('p-3', key === today && 'ring-2 ring-brand-400')}>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <div>
                  <div className={cx('text-[11px] font-extrabold uppercase', key === today ? 'text-brand-600' : 'text-slate-400')}>
                    {key === today ? 'Bugün' : fmtDayName(d, true)}
                  </div>
                  <div className="text-lg font-extrabold text-slate-800 leading-tight">{d.getDate()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSuggestDate(key)}
                  className="w-9 h-9 grid place-items-center rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 touch-manipulation"
                  aria-label="Bu gün için öner"
                >
                  <ShuffleIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {MEAL_SLOTS.map((s) => {
                  const title = cells.get(`${key}|${s.key}`)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => open(key, s.key)}
                      className={cx(
                        'w-full rounded-xl border p-2.5 text-left transition-colors touch-manipulation min-h-[64px]',
                        title ? 'bg-slate-50 border-slate-200 hover:border-brand-300' : 'bg-white border-dashed border-slate-300 hover:border-brand-400',
                      )}
                    >
                      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{s.label}</div>
                      <div className={cx('font-bold truncate', title ? 'text-slate-800' : 'text-slate-300')}>
                        {title ?? 'Dokun ekle'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

      {pool.length === 0 && (
        <Card>
          <Empty icon="🍲" text="Henüz tarif yok. Ne Pişirsem? ile öneri alabilirsiniz." />
        </Card>
      )}

      {/* Öneri paneli */}
      <Modal
        open={suggestDate !== null}
        onClose={() => setSuggestDate(null)}
        title="Ne Pişirsek?"
        sheet={false}
        footer={
          <div className="flex items-center gap-2">
            <Btn variant="soft" onClick={() => setSuggestDate((d) => (d ? dateKey(addDays(d, -1)) : d))}>
              <CaretLeftIcon className="w-4 h-4" />
            </Btn>
            <div className="flex-1 text-center font-extrabold text-slate-800">
              {suggestDate
                ? suggestDate === today
                  ? 'Bugün'
                  : `${fmtDayName(parseKey(suggestDate))}, ${fmtShort(suggestDate)}`
                : ''}
            </div>
            <Btn variant="soft" onClick={() => setSuggestDate((d) => (d ? dateKey(addDays(d, 1)) : d))}>
              <CaretRightIcon className="w-4 h-4" />
            </Btn>
          </div>
        }
      >
        {suggestDate && (
          <SuggestPanel db={db} date={suggestDate} onPick={pickSuggestion} />
        )}
      </Modal>

      {/* Manuel düzenleme */}
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft ? `${MEAL_SLOTS.find((s) => s.key === draft.slot)?.label} · ${fmtShort(parseKey(draft.date))}` : ''}
        footer={
          <div className="flex gap-3">
            {draft && cells.get(`${draft.date}|${draft.slot}`) && (
              <Btn
                variant="danger"
                onClick={() => {
                  saveMeal(draft.date, draft.slot, '')
                  setDraft(null)
                }}
              >
                <TrashIcon className="w-5 h-5" /> Sil
              </Btn>
            )}
            <Btn className="flex-1" onClick={save}>
              Kaydet
            </Btn>
          </div>
        }
      >
        {draft && (
          <>
            <Field label="Ne yiyeceğiz?">
              <Input
                autoFocus
                value={draft.title}
                placeholder="Örn. Mercimek çorbası"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            {pool.length > 0 && (
              <div>
                <span className="block text-sm font-semibold text-slate-600 mb-1.5">Evdeki tarifler</span>
                <div className="flex flex-wrap gap-2">
                  {pool.slice(0, 8).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDraft({ ...draft, title: t })}
                      className="h-10 px-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-brand-50 hover:text-brand-600 touch-manipulation"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Field label="Not (isteğe bağlı)">
              <TextArea
                value={draft.note}
                placeholder="Malzeme notu, pişirme saati…"
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Chip tone="green">Plan tüm aileyle senkron</Chip>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
