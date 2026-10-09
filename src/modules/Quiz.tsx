import { PlusIcon, TrashIcon, UploadSimpleIcon, PlayIcon, ArrowClockwiseIcon, XIcon, CheckIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn, Card, Chip, Empty, Field, Input, Modal, TextArea, cx, SectionTitle } from '../components/ui'
import { deleteQuestion, importQuiz, saveQuestion, saveQuizResult } from '../state/actions'
import type { DB, QuizQuestion } from '../types'

type Phase = 'menu' | 'running' | 'result'

interface Draft {
  id?: string
  text: string
  options: string[]
  correct: number
  explanation: string
  category: string
}

const emptyDraft = (): Draft => ({
  text: '',
  options: ['', '', '', ''],
  correct: 0,
  explanation: '',
  category: 'Genel',
})

/** Çocuklar için interaktif quiz modülü (JSON içe aktarma destekli). */
export function Quiz({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const [phase, setPhase] = useState<Phase>('menu')
  const [category, setCategory] = useState<string>('Tümü')
  const [count, setCount] = useState(5)
  const [queue, setQueue] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3500)
    return () => clearTimeout(t)
  }, [msg])

  const categories = useMemo(
    () => Array.from(new Set(db.quiz.map((q) => q.category).filter(Boolean))) as string[],
    [db.quiz],
  )
  const filtered = useMemo(
    () => (category === 'Tümü' ? db.quiz : db.quiz.filter((q) => q.category === category)),
    [db.quiz, category],
  )

  const results = useMemo(() => {
    const map = new Map<string, { ok: number; total: number }>()
    for (const r of db.quizResults) {
      const cur = map.get(r.questionId) ?? { ok: 0, total: 0 }
      cur.total += 1
      if (r.correct) cur.ok += 1
      map.set(r.questionId, cur)
    }
    return map
  }, [db.quizResults])

  const start = () => {
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, Math.max(1, count))
    if (!shuffled.length) return
    setQueue(shuffled)
    setIndex(0)
    setScore(0)
    setPicked(null)
    setPhase('running')
  }

  const answer = (i: number) => {
    if (picked !== null) return
    const q = queue[index]
    const ok = i === q.correct
    setPicked(i)
    if (ok) setScore((s) => s + 1)
    saveQuizResult(q.id, ok)
  }

  const next = () => {
    if (index + 1 >= queue.length) {
      setPhase('result')
      return
    }
    setIndex((i) => i + 1)
    setPicked(null)
  }

  const saveQ = () => {
    if (!draft || !draft.text.trim() || draft.options.filter((o) => o.trim()).length < 2) return
    saveQuestion({
      id: draft.id,
      text: draft.text.trim(),
      options: draft.options.map((o) => o.trim()).filter(Boolean),
      correct: Math.min(draft.correct, draft.options.filter((o) => o.trim()).length - 1),
      explanation: draft.explanation.trim() || undefined,
      category: draft.category.trim() || 'Genel',
    })
    setDraft(null)
  }

  const importJson = (text: string) => {
    try {
      const parsed = JSON.parse(text)
      const list = Array.isArray(parsed) ? parsed : parsed.questions
      const n = importQuiz(list ?? [])
      setMsg(n ? `${n} soru içe aktarıldı` : 'Geçerli soru bulunamadı')
      setJsonOpen(false)
      setJsonText('')
    } catch {
      setMsg('JSON okunamadı — biçimi kontrol edin')
    }
  }

  const onFile = async (f: File | null) => {
    if (!f) return
    importJson(await f.text())
  }

  const current = queue[index]

  return (
    <div className="space-y-4">
      {msg && (
        <div className="rounded-xl bg-ink-900 text-white px-4 py-3 text-sm font-semibold animate-fade-in">{msg}</div>
      )}

      {phase === 'menu' && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className={cx('font-extrabold text-slate-800', kiosk ? 'text-3xl' : 'text-2xl')}>Quiz</h1>
              <p className="text-slate-500 font-medium">{db.quiz.length} soru hazır</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              <Btn variant="soft" onClick={() => fileRef.current?.click()}>
                <UploadSimpleIcon className="w-4 h-4" /> JSON yükle
              </Btn>
              <Btn variant="soft" onClick={() => setJsonOpen(true)}>JSON yapıştır</Btn>
              <Btn onClick={() => setDraft(emptyDraft())}>
                <PlusIcon className="w-5 h-5" /> Soru ekle
              </Btn>
            </div>
          </div>

          <Card className="p-5">
            <SectionTitle title="Test başlat" />
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="block text-sm font-semibold text-slate-600 mb-1.5">Kategori</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-12 rounded-xl border border-slate-300 px-3 bg-white text-[15px]"
                >
                  <option>Tümü</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-slate-600 mb-1.5">Soru sayısı</span>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="h-12 rounded-xl border border-slate-300 px-3 bg-white text-[15px]"
                >
                  {[3, 5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Btn size="lg" onClick={start} disabled={!filtered.length}>
                <PlayIcon className="w-5 h-5" /> Başla
              </Btn>
            </div>
          </Card>

          {db.quiz.length === 0 ? (
            <Card>
              <Empty
                icon="❓"
                text="Henüz soru yok. Soru ekleyin veya hazır bir JSON dosyası yükleyin."
                action={<Btn onClick={() => setDraft(emptyDraft())}>Soru ekle</Btn>}
              />
            </Card>
          ) : (
            <div className={cx('grid gap-3', kiosk ? 'grid-cols-2' : 'grid-cols-1')}>
              {filtered.map((q) => {
                const st = results.get(q.id)
                return (
                  <Card key={q.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Chip tone="brand">{q.category ?? 'Genel'}</Chip>
                          {st && (
                            <Chip tone={st.ok / st.total >= 0.7 ? 'green' : 'amber'}>
                              {st.ok}/{st.total} doğru
                            </Chip>
                          )}
                        </div>
                        <div className={cx('font-bold text-slate-800', kiosk && 'text-lg')}>{q.text}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          Doğru: <b>{q.options[q.correct]}</b>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              id: q.id,
                              text: q.text,
                              options: [...q.options, ...Array(Math.max(0, 4 - q.options.length)).fill('')],
                              correct: q.correct,
                              explanation: q.explanation ?? '',
                              category: q.category ?? 'Genel',
                            })
                          }
                          className="h-10 px-3 rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 touch-manipulation"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => confirm('Soru silinsin mi?') && deleteQuestion(q.id)}
                          className="w-10 h-10 grid place-items-center rounded-xl text-slate-400 hover:text-rose-500 touch-manipulation"
                          aria-label="Sil"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {phase === 'running' && current && (
        <Card className={cx('p-6 mx-auto', kiosk ? 'max-w-3xl' : 'max-w-xl')}>
          <div className="flex items-center justify-between mb-4">
            <Chip tone="brand">
              Soru {index + 1} / {queue.length}
            </Chip>
            <Chip tone={picked === null ? 'slate' : picked === current.correct ? 'green' : 'rose'}>
              Skor {score}
            </Chip>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h2 className={cx('font-extrabold text-slate-900', kiosk ? 'text-3xl' : 'text-xl leading-snug')}>
              {current.text}
            </h2>
            <button type="button" onClick={() => setPhase('menu')} className="text-slate-400 hover:text-slate-600 touch-manipulation" aria-label="Çık">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <div className={cx('grid gap-3 mt-5', kiosk ? 'grid-cols-2' : 'grid-cols-1')}>
            {current.options.map((opt, i) => {
              const isCorrect = i === current.correct
              const chosen = picked === i
              const state =
                picked === null
                  ? 'idle'
                  : isCorrect
                    ? 'correct'
                    : chosen
                      ? 'wrong'
                      : 'dim'
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => answer(i)}
                  disabled={picked !== null}
                  className={cx(
                    'flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold transition-all touch-manipulation',
                    state === 'idle' && 'bg-white border-slate-200 hover:border-brand-400 active:scale-[0.99]',
                    state === 'correct' && 'bg-emerald-50 border-emerald-400 text-emerald-700',
                    state === 'wrong' && 'bg-rose-50 border-rose-400 text-rose-700',
                    state === 'dim' && 'bg-slate-50 border-slate-100 text-slate-400',
                    kiosk && 'text-lg p-5',
                  )}
                >
                  <span
                    className={cx(
                      'w-8 h-8 rounded-lg grid place-items-center text-sm font-extrabold shrink-0',
                      state === 'correct' ? 'bg-emerald-500 text-white' : state === 'wrong' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {state === 'correct' ? <CheckIcon className="w-5 h-5" /> : state === 'wrong' ? <XIcon className="w-5 h-5" /> : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              )
            })}
          </div>

          {picked !== null && (
            <div className="mt-5 space-y-4 animate-fade-in">
              {current.explanation && (
                <p className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-slate-600 font-medium">
                  💡 {current.explanation}
                </p>
              )}
              <Btn size="lg" className="w-full" onClick={next}>
                {index + 1 >= queue.length ? 'Sonucu gör' : 'Sonraki soru →'}
              </Btn>
            </div>
          )}
        </Card>
      )}

      {phase === 'result' && (
        <Card className={cx('p-8 mx-auto text-center', kiosk ? 'max-w-xl' : 'max-w-md')}>
          <div className="text-6xl mb-3">{score === queue.length ? '🏆' : score >= queue.length / 2 ? '👏' : '💪'}</div>
          <h2 className="text-3xl font-extrabold text-slate-900">
            {score} / {queue.length}
          </h2>
          <p className="text-slate-500 font-medium mt-2">
            {score === queue.length ? 'Mükemmel! Hepsini bildin.' : score >= queue.length / 2 ? 'İyi gidiyorsun!' : 'Tekrar dene, öğreniyorsun.'}
          </p>
          <div className="flex gap-3 mt-6">
            <Btn variant="soft" className="flex-1" onClick={() => setPhase('menu')}>
              Ana menü
            </Btn>
            <Btn className="flex-1" onClick={start}>
              <ArrowClockwiseIcon className="w-5 h-5" /> Tekrar oyna
            </Btn>
          </div>
        </Card>
      )}

      {/* Soru ekleme */}
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Soruyu düzenle' : 'Yeni soru'}
        footer={
          <Btn
            className="w-full"
            onClick={saveQ}
            disabled={!draft?.text.trim() || draft.options.filter((o) => o.trim()).length < 2}
          >
            Kaydet
          </Btn>
        }
      >
        {draft && (
          <>
            <Field label="Soru metni">
              <TextArea autoFocus value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="Örn. Türkiye’nin başkenti?" />
            </Field>
            <div>
              <span className="block text-sm font-semibold text-slate-600 mb-1.5">Şıklar (doğru olanı seçin)</span>
              <div className="space-y-2">
                {draft.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, correct: i })}
                      className={cx(
                        'w-11 h-11 rounded-xl border-2 grid place-items-center font-extrabold shrink-0 touch-manipulation',
                        draft.correct === i ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-500',
                      )}
                      aria-label={`Şık ${i + 1} doğru`}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input
                      value={o}
                      placeholder={`Şık ${i + 1}`}
                      onChange={(e) => {
                        const next = [...draft.options]
                        next[i] = e.target.value
                        setDraft({ ...draft, options: next })
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <Field label="Açıklama (isteğe bağlı)">
              <Input value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} placeholder="Neden bu cevap?" />
            </Field>
            <Field label="Kategori">
              <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Matematik, Bilim…" />
            </Field>
          </>
        )}
      </Modal>

      {/* JSON yapıştır */}
      <Modal open={jsonOpen} onClose={() => setJsonOpen(false)} title="JSON içe aktar" footer={
        <Btn className="w-full" onClick={() => importJson(jsonText)}>
          İçe aktar
        </Btn>
      }>
        <p className="text-sm text-slate-500 font-medium">
          Beklenen biçim: <code className="bg-slate-100 px-1 rounded">[{'{"text":"...","options":["a","b"],"correct":0}'}]</code>
        </p>
        <TextArea value={jsonText} onChange={(e) => setJsonText(e.target.value)} placeholder='[{"text":"Soru?","options":["A","B","C","D"],"correct":1,"category":"Genel"}]' className="min-h-[180px] font-mono text-xs" />
      </Modal>
    </div>
  )
}
