import { PlusIcon, TrashIcon, CheckIcon, EraserIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn, Card, Chip, Empty, Input, Select, cx, Avatar } from '../components/ui'
import { addShopping, clearDoneShopping, deleteShopping, toggleShopping } from '../state/actions'
import { uiBus } from '../state/uiBus'
import { SHOP_CATEGORIES } from '../types'
import type { DB, ShopCategory } from '../types'

/** Alışveriş listesi — telefonda ekle, duvar ekranında anında gör. */
export function Shopping({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const [text, setText] = useState('')
  const [qty, setQty] = useState('')
  const [cat, setCat] = useState<ShopCategory>('Market')
  const [byId, setById] = useState<string>(db.members[0]?.id ?? '')
  const [showDone, setShowDone] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const off = uiBus.subscribe((e) => {
      if (e === 'add:shopping') inputRef.current?.focus()
    })
    return off
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const memberOf = useMemo(() => new Map(db.members.map((m) => [m.id, m])), [db.members])

  const groups = useMemo(() => {
    const pending = db.shopping.filter((s) => !s.done)
    const done = db.shopping.filter((s) => s.done)
    const map = new Map<string, typeof pending>()
    for (const s of pending) {
      const arr = map.get(s.category) ?? []
      arr.push(s)
      map.set(s.category, arr)
    }
    return { pendingGroups: Array.from(map.entries()), done }
  }, [db.shopping])

  const add = () => {
    const t = text.trim()
    if (!t) {
      inputRef.current?.focus()
      setToast('Önce ürün adı yazın')
      return
    }
    addShopping(t, cat, byId || db.members[0]?.id || '', qty)
    setText('')
    setQty('')
    setToast(`"${t}" eklendi ✓`)
    inputRef.current?.focus()
  }

  const pendingCount = db.shopping.filter((s) => !s.done).length

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 top-4 z-50 rounded-xl bg-ink-900 px-4 py-2.5 text-white text-sm font-bold animate-pop shadow-kiosk">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={cx('font-extrabold text-slate-800', kiosk ? 'text-3xl' : 'text-2xl')}>Alışveriş Listesi</h1>
          <p className="text-slate-500 font-medium">
            {pendingCount} ürün bekliyor · listedeki herkes anında görür
          </p>
        </div>
        <div className="flex items-center gap-2">
          {groups.done.length > 0 && (
            <Btn variant="soft" onClick={() => setShowDone((v) => !v)}>
              <CheckIcon className="w-4 h-4" /> Alınanlar ({groups.done.length})
            </Btn>
          )}
          {groups.done.length > 0 && (
            <Btn variant="ghost" onClick={() => confirm('Alınanlar temizlensin mi?') && clearDoneShopping()}>
              <EraserIcon className="w-4 h-4" /> Temizle
            </Btn>
          )}
        </div>
      </div>

      {/* Hızlı ekleme — tek satır: [ürün adı] [Ekle] */}
      <Card className="p-3">
        <div className="flex gap-2 items-stretch">
          <Input
            ref={inputRef}
            value={text}
            placeholder="Ne lazım? (örn. Süt)"
            enterKeyHint="done"
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            className="flex-1"
          />
          <Btn onClick={add} size="lg" className="shrink-0 px-5" aria-label="Listeye ekle">
            <PlusIcon className="w-6 h-6" />
            <span>Ekle</span>
          </Btn>
        </div>

        {/* Kategori + miktar + ekleyen */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SHOP_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cx(
                'h-10 px-3 rounded-xl text-sm font-bold touch-manipulation transition-colors border-2',
                cat === c ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500 bg-white',
              )}
            >
              {c}
            </button>
          ))}
          <Input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Miktar"
            className="h-10 w-28"
            inputMode="text"
          />
          <Select value={byId} onChange={(e) => setById(e.target.value)} className="h-10 w-auto">
            {db.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {m.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {pendingCount === 0 ? (
        <Card>
          <Empty
            icon="🛒"
            text="Liste boş. Yukarıya ürün adını yazıp Ekle'ye basın — evdeki ekrana düşer."
            action={<Btn onClick={() => inputRef.current?.focus()}>Ürün ekle</Btn>}
          />
        </Card>
      ) : (
        <div className={cx('grid gap-4', kiosk ? 'grid-cols-3' : 'grid-cols-1')}>
          {groups.pendingGroups.map(([category, items]) => (
            <Card key={category} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-extrabold text-slate-800">{category}</h2>
                <Chip tone="brand">{items.length}</Chip>
              </div>
              <ul className="space-y-2">
                {items.map((s) => (
                  <li key={s.id} className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleShopping(s.id)}
                      aria-label="Alındı"
                      className="w-9 h-9 rounded-xl border-2 border-slate-300 grid place-items-center text-transparent hover:border-emerald-400 hover:text-emerald-400 touch-manipulation shrink-0"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <span className={cx('flex-1 font-semibold text-slate-700 truncate', kiosk && 'text-lg')}>
                      {s.text}
                      {s.qty && <span className="text-slate-400 font-medium"> · {s.qty}</span>}
                    </span>
                    <Avatar member={memberOf.get(s.addedById)} size="sm" />
                    <button
                      type="button"
                      onClick={() => deleteShopping(s.id)}
                      className="w-9 h-9 grid place-items-center rounded-lg text-slate-300 hover:text-rose-500 touch-manipulation"
                      aria-label="Sil"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {showDone && groups.done.length > 0 && (
        <Card className="p-4">
          <h2 className="font-extrabold text-slate-400 mb-3">Alınanlar</h2>
          <ul className="space-y-2">
            {groups.done.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 opacity-70">
                <button
                  type="button"
                  onClick={() => toggleShopping(s.id)}
                  className="w-9 h-9 rounded-xl bg-emerald-500 text-white grid place-items-center touch-manipulation shrink-0"
                  aria-label="Geri al"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                </button>
                <span className="flex-1 font-semibold text-slate-500 line-through truncate">{s.text}</span>
                <button
                  type="button"
                  onClick={() => deleteShopping(s.id)}
                  className="w-9 h-9 grid place-items-center rounded-lg text-slate-300 hover:text-rose-500 touch-manipulation"
                  aria-label="Sil"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
