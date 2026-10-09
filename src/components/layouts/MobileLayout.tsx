import { PlusIcon, CalendarPlusIcon, ChatCircleIcon, ShoppingCartIcon, CheckSquareIcon, BowlFoodIcon, BookOpenIcon, XIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { NAV } from '../nav'
import { Avatar, cx } from '../ui'
import type { SyncStatus } from '../../sync/useFamilySync'
import { syncLabel } from '../../sync/useFamilySync'
import { useClock } from '../../lib/hooks'
import { fmtDayName, fmtMonthShort, pad } from '../../lib/time'
import type { DB, Message } from '../../types'
import type { TabKey } from '../../state/store'
import { uiBus } from '../../state/uiBus'
import { MessageFlash } from '../IdleScreen'
import { themeById } from '../../lib/themes'

const SYNC_TONE: Record<SyncStatus, string> = {
  live: 'bg-emerald-500',
  connecting: 'bg-amber-400 animate-pulse',
  reconnecting: 'bg-amber-400 animate-pulse',
  local: 'bg-sky-400',
}

/** Mobil PWA modu: alt navigasyon, tek elle kullanım, hızlı ekleme (FAB). */
export function MobileLayout({
  db,
  tab,
  onTab,
  status,
  flash,
  onFlashDismiss,
  children,
}: {
  db: DB
  tab: TabKey
  onTab: (t: TabKey) => void
  status: SyncStatus
  flash: Message | null
  onFlashDismiss: () => void
  children: ReactNode
}) {
  const now = useClock(15_000)
  const [fabOpen, setFabOpen] = useState(false)
  const bottom = NAV.filter((n) => n.inBottomBar)
  const current = NAV.find((n) => n.key === tab)

  const actions = [
    { icon: ShoppingCartIcon, label: 'Alışverişe ekle', ev: 'add:shopping' as const, tone: 'bg-emerald-500' },
    { icon: ChatCircleIcon, label: 'Mesaj gönder', ev: 'add:message' as const, tone: 'bg-brand-500' },
    { icon: CalendarPlusIcon, label: 'Etkinlik ekle', ev: 'add:event' as const, tone: 'bg-violet-500' },
    { icon: CheckSquareIcon, label: 'Görev ekle', ev: 'add:chore' as const, tone: 'bg-amber-500' },
    { icon: BowlFoodIcon, label: 'Beslenme programı', ev: 'open:nutrition' as const, tone: 'bg-rose-500' },
    { icon: BookOpenIcon, label: 'Ders programı', ev: 'open:lessons' as const, tone: 'bg-ink-800' },
  ]

  return (
    <div className="min-h-screen flex flex-col mesh-bg text-slate-900" data-theme={themeById(db.settings.theme).id}>
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/60 h-14 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-display text-[17px] tracking-tight text-brand-700">{db.settings.brandName || 'İÇİL Ailesi'}</span>
          <span className="text-slate-300 font-bold">·</span>
          <span className="font-semibold text-slate-600 truncate">{current?.label ?? 'Ana Sayfa'}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right leading-tight">
            <div className="tabular-nums font-bold text-slate-700 text-[15px]">
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
            <div className="text-[10px] font-bold text-slate-400 tabular-nums">
              {now.getDate()} {fmtMonthShort(now)} {fmtDayName(now, true)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTab('settings')}
            className="flex items-center gap-1.5 rounded-full bg-slate-100 pl-1.5 pr-2.5 py-1 touch-manipulation"
            aria-label={syncLabel(status)}
          >
            <span className={cx('w-2.5 h-2.5 rounded-full', SYNC_TONE[status])} />
            <Avatar member={db.members[0]} size="sm" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-4 pb-32">{children}</main>

      {/* Hızlı ekleme */}
      {fabOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div className="absolute bottom-28 right-4 space-y-2.5 animate-pop" onClick={(e) => e.stopPropagation()}>
            {actions.map((a) => (
              <button
                key={a.ev}
                type="button"
                onClick={() => {
                  uiBus.emit(a.ev)
                  setFabOpen(false)
                }}
                className="flex items-center gap-3 w-full justify-end group touch-manipulation"
              >
                <span className="rounded-xl bg-white shadow-card px-3 py-2 text-sm font-semibold text-slate-700">
                  {a.label}
                </span>
                <span className={cx('h-14 w-14 rounded-full grid place-items-center text-white shadow-lg', a.tone)}>
                  <a.icon className="w-6 h-6" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setFabOpen((v) => !v)}
        aria-label="Hızlı ekleme"
        className={cx(
          'fixed right-4 bottom-24 z-50 w-14 h-14 rounded-full grid place-items-center text-white shadow-lg touch-manipulation transition-transform',
          fabOpen ? 'bg-slate-700 rotate-45' : 'bg-brand-500 active:scale-95',
        )}
      >
        {fabOpen ? <XIcon className="w-7 h-7" /> : <PlusIcon className="w-7 h-7" />}
      </button>

      {/* Alt navigasyon */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/70 backdrop-blur-xl border-t border-white/60 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 max-w-3xl mx-auto">
          {bottom.map((n) => {
            const active = tab === n.key
            const Icon = n.icon
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => onTab(n.key)}
                className={cx(
                  'flex flex-col items-center justify-center gap-0.5 h-16 touch-manipulation transition-colors',
                  active ? 'text-brand-600' : 'text-slate-400',
                )}
              >
                <Icon weight={active ? 'duotone' : 'regular'} className="w-6 h-6" />
                <span className="text-[11px] font-bold">{n.short}</span>
                <span className={cx('h-1 w-5 rounded-full', active ? 'bg-brand-500' : 'bg-transparent')} />
              </button>
            )
          })}
        </div>
      </nav>

      {flash && (
        <MessageFlash message={flash} member={db.members.find((m) => m.id === flash.fromId)} onDismiss={onFlashDismiss} />
      )}
    </div>
  )
}
