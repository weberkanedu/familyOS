import { PaperPlaneRightIcon, TelevisionSimpleIcon, UserIcon, TrashIcon, SmileyIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn, Card, Empty, Input, cx, Avatar, Segmented, Chip } from '../components/ui'
import { deleteMessage, sendMessage } from '../state/actions'
import { relativeTime, pad, todayKey, dateKey } from '../lib/time'
import { uiBus } from '../state/uiBus'
import type { DB, Message } from '../types'

const EMOJIS = ['👍', '❤️', '🎉', '🙏', '😂', '🛒', '🏠', '⏰', '🍕', '📚']

/** Modül seviyesinde tanımlanmalı (yoksa her mesajda yeniden mount = zıplama). */
function DaySep({ at }: { at: number }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-bold text-slate-400">
        {dateKey(at) === todayKey() ? 'Bugün' : new Date(at).toLocaleDateString('tr-TR')}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

/** Aile içi anlık mesajlaşma + duvar ekranına not. */
export function Chat({ db, kiosk }: { db: DB; kiosk: boolean }) {
  const [text, setText] = useState('')
  const [fromId, setFromId] = useState(db.members[0]?.id ?? '')
  const [target, setTarget] = useState<'wall' | string>('wall')
  const [showEmoji, setShowEmoji] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const off = uiBus.subscribe((e) => {
      if (e === 'add:message') inputRef.current?.focus()
    })
    return off
  }, [])

  const memberOf = useMemo(() => new Map(db.members.map((m) => [m.id, m])), [db.members])

  const visible = useMemo(
    () =>
      db.messages
        .filter((m) => m.to === 'wall' || m.to === fromId || m.fromId === fromId)
        .slice(-120),
    [db.messages, fromId],
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [visible.length])

  const send = () => {
    const m = sendMessage(fromId || db.members[0]?.id || '', target === 'wall' ? 'wall' : target, text)
    if (m) {
      setText('')
      setShowEmoji(false)
    }
  }

  let lastDay = ''

  return (
    <div className={cx('flex flex-col', kiosk ? 'h-[calc(100vh-11rem)]' : 'h-[calc(100vh-13rem)]')}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h1 className={cx('font-extrabold text-slate-800', kiosk ? 'text-3xl' : 'text-2xl')}>Aile Mesajları</h1>
          <p className="text-slate-500 font-medium">Telefondan yaz → duvar ekranında anında belirir</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
            aria-label="Gönderen"
          >
            {db.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {m.name}
              </option>
            ))}
          </select>
          <Segmented
            value={target as 'wall' | string}
            onChange={(v) => setTarget(v)}
            options={[
              { value: 'wall', label: '📺 Duvar' },
              ...db.members.filter((m) => m.id !== fromId).map((m) => ({ value: m.id, label: `${m.emoji} ${m.name}` })),
            ]}
          />
        </div>
      </div>

      {/* Mesaj akışı */}
      <Card className="flex-1 overflow-y-auto p-4 min-h-0">
        {visible.length === 0 ? (
          <Empty icon="💬" text="Henüz mesaj yok. İlk mesajı sen yaz!" />
        ) : (
          <div className="space-y-3">
            {visible.map((msg: Message) => {
              const day = dateKey(msg.at)
              const sep = day !== lastDay ? <DaySep at={msg.at} /> : null
              lastDay = day
              const mine = msg.fromId === fromId
              const author = memberOf.get(msg.fromId)
              const toLabel = msg.to === 'wall' ? 'Duvar ekranı' : memberOf.get(msg.to)?.name ?? ''
              return (
                <div key={msg.id}>
                  {sep}
                  <div className={cx('flex items-end gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
                    <Avatar member={author} size="sm" />
                    <div
                      className={cx(
                        'max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm group',
                        mine ? 'bg-brand-500 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md',
                      )}
                    >
                      {!mine && <div className="text-[11px] font-extrabold opacity-70 mb-0.5">{author?.name ?? '?'}</div>}
                      <div className={cx('break-words', kiosk ? 'text-lg' : 'text-[15px]')}>{msg.text}</div>
                      <div className={cx('flex items-center gap-2 mt-1 text-[10px] font-semibold', mine ? 'text-white/70' : 'text-slate-400')}>
                        <span>
                          {pad(new Date(msg.at).getHours())}:{pad(new Date(msg.at).getMinutes())}
                        </span>
                        {msg.to !== 'wall' && <span>→ {toLabel}</span>}
                        <span className="opacity-70">{relativeTime(msg.at)}</span>
                        <button
                          type="button"
                          onClick={() => confirm('Mesaj silinsin mi?') && deleteMessage(msg.id)}
                          className={cx('opacity-0 group-hover:opacity-100 transition-opacity', mine ? 'text-white/80' : 'text-slate-400')}
                          aria-label="Sil"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        )}
      </Card>

      {/* Emoji hızlı seçim */}
      {showEmoji && (
        <div className="flex gap-2 overflow-x-auto py-2 animate-fade-in">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setText((t) => t + e)}
              className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-xl touch-manipulation shrink-0"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Yazma alanı */}
      <div className="flex items-center gap-2 pt-3">
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="w-12 h-12 rounded-xl bg-white border border-slate-200 grid place-items-center text-slate-500 touch-manipulation shrink-0"
          aria-label="Emoji"
        >
          <SmileyIcon className="w-5 h-5" />
        </button>
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
          placeholder={target === 'wall' ? 'Duvar ekranına mesaj yaz…' : 'Mesaj yaz…'}
          enterKeyHint="send"
          className="flex-1"
        />
        <Btn size="lg" onClick={send} disabled={!text.trim()} className="shrink-0">
          <PaperPlaneRightIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Gönder</span>
        </Btn>
      </div>

      <div className="flex items-center gap-3 pt-2 text-xs text-slate-400 font-semibold">
        <span className="inline-flex items-center gap-1">
          <TelevisionSimpleIcon className="w-3.5 h-3.5" /> Duvar ekranı: <Chip tone="brand">{db.messages.filter((m) => m.to === 'wall').length} not</Chip>
        </span>
        <span className="inline-flex items-center gap-1">
          <UserIcon className="w-3.5 h-3.5" /> Gönderen: {memberOf.get(fromId)?.name ?? '-'}
        </span>
      </div>
    </div>
  )
}
