import {PlusIcon, TrashIcon, UploadSimpleIcon, ArrowClockwiseIcon, EyeIcon} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn, Card, Chip, Empty, Field, Input, Modal, TextArea, cx, SectionTitle, Segmented } from '../components/ui'
import { addWord, deleteWord, importWords, reviewWord } from '../state/actions'
import { buildQueue, fmtInterval, RATING_LABELS, stats, type Rating } from '../lib/anki'
import { uiBus } from '../state/uiBus'
import { Quiz } from './Quiz'
import { TV } from '../lib/tv'
import type { DB, Word } from '../types'

interface Draft {
  term: string
  meaning: string
  example: string
  deck: string
}

const emptyDraft = (): Draft => ({ term: '', meaning: '', example: '', deck: 'Genel' })

/** Modül seviyesinde (inline tanım her render'da yeniden mount yapar). */
function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cx('rounded-2xl p-4 text-white', tone)}>
      <div className="text-3xl font-extrabold leading-none">{value}</div>
      <div className="text-xs font-bold opacity-90 mt-1">{label}</div>
    </div>
  )
}

/** Aralıklı tekrar (Anki mantığı) kelime öğrenme. */
export function Words({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const [mode, setMode] = useState<'review' | 'list'>('review')
  const [deck, setDeck] = useState('Tümü')
  const [revealed, setRevealed] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const now = Date.now()

  useEffect(() => {
    const off = uiBus.subscribe((e) => {
      if (e === 'add:word') setDraft(emptyDraft())
    })
    return off
  }, [])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3500)
    return () => clearTimeout(t)
  }, [msg])

  const decks = useMemo(() => ['Tümü', ...Array.from(new Set(db.words.map((w) => w.deck)))], [db.words])
  const scoped = useMemo(() => (deck === 'Tümü' ? db.words : db.words.filter((w) => w.deck === deck)), [db.words, deck])
  const queue = useMemo(() => buildQueue(scoped, now), [scoped, Math.floor(now / 1000)])
  const st = useMemo(() => stats(scoped, now), [scoped, Math.floor(now / 30000)])
  const current = queue[0]

  // TV (kumanda): kart gelince odak "Cevabı göster"de, anlam açılınca "İyi"de —
  // art arda OK ile ilerlenir (önceden odak üstteki "Kelime Tekrarı" sekmesine düşüyordu)
  useEffect(() => {
    if (!TV || mode !== 'review' || !current) return
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(revealed ? '[data-tv-rate="good"]' : '[data-tv-reveal]')
      el?.focus({ preventScroll: true })
    }, 30)
    return () => clearTimeout(t)
  }, [mode, current?.id, revealed])

  const rate = (r: Rating) => {
    if (!current) return
    reviewWord(current, r)
    setRevealed(false)
  }

  const saveW = () => {
    if (!draft || !draft.term.trim() || !draft.meaning.trim()) return
    addWord(draft)
    setDraft(emptyDraft())
  }

  const importJson = (text: string) => {
    try {
      const parsed = JSON.parse(text)
      const list = Array.isArray(parsed) ? parsed : parsed.words
      const n = importWords(list ?? [])
      setMsg(n ? `${n} kelime içe aktarıldı` : 'Geçerli kelime bulunamadı')
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

  return (
    <div className="space-y-4">
      {msg && <div className="rounded-xl bg-ink-900 text-white px-4 py-3 text-sm font-semibold animate-fade-in">{msg}</div>}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={cx('font-extrabold text-slate-800', kiosk ? 'text-3xl' : 'text-2xl')}>Kelime Öğrenme</h1>
          <p className="text-slate-500 font-medium">Aralıklı tekrar (SM-2) ile unutmadan öğren</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
          <Btn variant="soft" onClick={() => fileRef.current?.click()}>
            <UploadSimpleIcon className="w-4 h-4" /> JSON
          </Btn>
          <Btn variant="soft" onClick={() => setJsonOpen(true)}>Yapıştır</Btn>
          <Btn onClick={() => setDraft(emptyDraft())}>
            <PlusIcon className="w-5 h-5" /> Kelime ekle
          </Btn>
        </div>
      </div>

      <div className={cx('grid gap-3', kiosk ? 'grid-cols-4' : 'grid-cols-2')}>
        <StatCard label="Bugün tekrar" value={st.due} tone="bg-gradient-to-br from-brand-500 to-brand-600" />
        <StatCard label="Öğrenilen" value={st.learned} tone="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatCard label="Öğreniliyor" value={st.learning} tone="bg-gradient-to-br from-amber-400 to-amber-500" />
        <StatCard label="Toplam" value={st.total} tone="bg-gradient-to-br from-slate-600 to-slate-700" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'review', label: `Tekrar (${queue.length})` },
            { value: 'list', label: 'Liste' },
          ]}
        />
        {decks.length > 2 && (
          <select
            value={deck}
            onChange={(e) => setDeck(e.target.value)}
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
          >
            {decks.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {mode === 'review' ? (
        current ? (
          <Card className={cx('p-6 mx-auto text-center', kiosk ? 'max-w-2xl' : 'max-w-lg')}>
            <div className="flex items-center justify-between mb-4">
              <Chip tone="brand">{current.deck}</Chip>
              <Chip tone="slate">
                {queue.length} kart kaldı · aralık {fmtInterval(current.intervalMin)}
              </Chip>
            </div>

            <div className={cx('font-extrabold text-slate-900 break-words', kiosk ? 'text-5xl py-10' : 'text-3xl py-8')}>
              {current.term}
            </div>

            {!revealed ? (
              <Btn size="lg" className="w-full" data-tv-reveal onClick={() => setRevealed(true)}>
                <EyeIcon className="w-5 h-5" /> Cevabı göster
              </Btn>
            ) : (
              <div className="animate-fade-in space-y-5">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                  <div className={cx('font-bold text-slate-800 break-words', kiosk ? 'text-3xl' : 'text-xl')}>{current.meaning}</div>
                  {current.example && (
                    <div className="text-slate-500 italic mt-2 text-sm">“{current.example}”</div>
                  )}
                </div>

                <div className={cx('grid gap-3', kiosk ? 'grid-cols-3' : 'grid-cols-1')}>
                  {(['hard', 'good', 'easy'] as Rating[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      data-tv-rate={r}
                      onClick={() => rate(r)}
                      className={cx(
                        'rounded-2xl border-2 p-4 font-extrabold transition-all touch-manipulation active:scale-[0.98]',
                        r === 'hard' && 'border-rose-300 bg-rose-50 text-rose-600 hover:border-rose-400',
                        r === 'good' && 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400',
                        r === 'easy' && 'border-emerald-300 bg-emerald-50 text-emerald-600 hover:border-emerald-400',
                        kiosk && 'p-5 text-xl',
                      )}
                    >
                      {RATING_LABELS[r]}
                      <div className="text-xs font-semibold opacity-70 mt-0.5">
                        {r === 'hard' ? 'kısa sonra' : r === 'good' ? 'yakında' : 'uzun sonra'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <Empty
              icon="🎉"
              text={st.total === 0 ? 'Henüz kelime yok. Ekleyin veya JSON içe aktarın.' : 'Bugün tekrar edilecek kelime kalmadı. Yarın görüşürüz!'}
              action={
                st.total > 0 ? (
                  <Btn variant="soft" onClick={() => setMode('list')}>
                    <ArrowClockwiseIcon className="w-4 h-4" /> Listeyi gör
                  </Btn>
                ) : (
                  <Btn onClick={() => setDraft(emptyDraft())}>Kelime ekle</Btn>
                )
              }
            />
          </Card>
        )
      ) : (
        <div className="space-y-4">
          <SectionTitle title={`Tüm kelimeler (${scoped.length})`} />
          {scoped.length === 0 ? (
            <Card>
              <Empty icon="📚" text="Liste boş." action={<Btn onClick={() => setDraft(emptyDraft())}>Kelime ekle</Btn>} />
            </Card>
          ) : (
            <div className={cx('grid gap-3', kiosk ? 'grid-cols-3' : 'grid-cols-1')}>
              {[...scoped]
                .sort((a, b) => a.dueAt - b.dueAt)
                .map((w) => (
                  <Card key={w.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={cx('font-extrabold text-slate-800 truncate', kiosk && 'text-lg')}>{w.term}</div>
                        <div className="text-slate-600 font-medium truncate">{w.meaning}</div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Chip tone="brand">{w.deck}</Chip>
                          <Chip tone={w.state === 'review' ? 'green' : w.state === 'learning' ? 'amber' : 'slate'}>
                            {w.state === 'review' ? 'Öğrenildi' : w.state === 'learning' ? 'Öğreniliyor' : 'Yeni'}
                          </Chip>
                          <Chip tone={w.dueAt <= Date.now() ? 'rose' : 'slate'}>
                            {w.dueAt <= Date.now() ? 'Şimdi tekrar' : fmtInterval((w.dueAt - Date.now()) / 60000)}
                          </Chip>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => confirm('Kelime silinsin mi?') && deleteWord(w.id)}
                        className="w-10 h-10 grid place-items-center rounded-xl text-slate-300 hover:text-rose-500 touch-manipulation shrink-0"
                        aria-label="Sil"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title="Yeni kelime"
        footer={
          <Btn className="w-full" onClick={saveW} disabled={!draft?.term.trim() || !draft?.meaning.trim()}>
            Kaydet
          </Btn>
        }
      >
        {draft && (
          <>
            <Field label="Kelime">
              <Input autoFocus value={draft.term} onChange={(e) => setDraft({ ...draft, term: e.target.value })} placeholder="Örn. Serendipity" />
            </Field>
            <Field label="Anlamı">
              <TextArea value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} placeholder="Ne anlama geliyor?" />
            </Field>
            <Field label="Örnek cümle">
              <Input value={draft.example} onChange={(e) => setDraft({ ...draft, example: e.target.value })} placeholder="İsteğe bağlı" />
            </Field>
            <Field label="Deste">
              <Input value={draft.deck} onChange={(e) => setDraft({ ...draft, deck: e.target.value })} placeholder="İngilizce, Matematik…" />
            </Field>
          </>
        )}
      </Modal>

      <Modal
        open={jsonOpen}
        onClose={() => setJsonOpen(false)}
        title="JSON içe aktar"
        footer={<Btn className="w-full" onClick={() => importJson(jsonText)}>İçe aktar</Btn>}
      >
        <p className="text-sm text-slate-500 font-medium">
          Beklenen biçim: <code className="bg-slate-100 px-1 rounded">[{'{"term":"...","meaning":"..."}'}]</code>
        </p>
        <TextArea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='[{"term":"Apple","meaning":"Elma","deck":"İngilizce"}]'
          className="min-h-[180px] font-mono text-xs"
        />
      </Modal>
    </div>
  )
}

export function Learn({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const [tab, setTab] = useState<'quiz' | 'words'>('words')
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented
          value={tab}
          onChange={setTab}
          size={kiosk ? 'lg' : 'md'}
          options={[
            { value: 'words', label: 'Kelime Tekrarı' },
            { value: 'quiz', label: 'Quiz' },
          ]}
        />
      </div>
      {tab === 'quiz' ? <Quiz db={db} kiosk={kiosk} /> : <Words db={db} kiosk={kiosk} />}
    </div>
  )
}
