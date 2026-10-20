import { CalendarHeartIcon, CaretLeftIcon, CaretRightIcon, TelevisionSimpleIcon, YoutubeLogoIcon } from '@phosphor-icons/react'
import { useMemo, type ReactNode } from 'react'
import { TV, openTvApp, tvApps } from '../../lib/tv'
import { NAV } from '../nav'
import { Avatar, cx } from '../ui'
import type { SyncStatus } from '../../sync/useFamilySync'
import { syncLabel } from '../../sync/useFamilySync'
import { useClock, useIdle } from '../../lib/hooks'
import { fmtDayName, fmtMonth, dayOfYear, pad } from '../../lib/time'
import { HOME } from '../../lib/location'
import { themeById } from '../../lib/themes'
import { saveSettings } from '../../state/actions'
import { WeatherWidget, type WeatherWidgetProps } from '../WeatherWidget'
import { FamilyClover } from '../FamilyClover'
import type { DB, SavedLocation } from '../../types'
import type { TabKey } from '../../state/store'
import { IdleScreen, MessageFlash } from '../IdleScreen'
import type { Message } from '../../types'
import { NextUp } from '../NextUp'
import { useTextZoom } from '../../lib/display'

const SYNC_TONE: Record<SyncStatus, string> = {
  live: 'bg-emerald-500',
  connecting: 'bg-amber-400 animate-pulse',
  reconnecting: 'bg-amber-400 animate-pulse',
  local: 'bg-sky-400',
  unauthorized: 'bg-rose-500',
}

/** Duvar/tablet Kiosk modu: geniş, büyük tipografi, dokunmatik dostu. */
export function KioskLayout({
  db,
  tab,
  onTab,
  status,
  weather,
  flash,
  onFlashDismiss,
  children,
}: {
  db: DB
  tab: TabKey
  onTab: (t: TabKey) => void
  status: SyncStatus
  weather: WeatherWidgetProps
  flash: Message | null
  onFlashDismiss: () => void
  children: ReactNode
}) {
  const now = useClock(1000)
  const { idle, wake } = useIdle(db.settings.idleMinutes)
  const collapsed = !!db.settings.navCollapsed
  const toggleNav = () => saveSettings({ navCollapsed: !collapsed })
  const theme = themeById(db.settings.theme)
  const zoom = useTextZoom()
  const apps = useMemo(tvApps, [])

  return (
    <div className="h-screen flex overflow-hidden kiosk-bg text-slate-900" data-theme={theme.id}>
      {/* Sol navigasyon rayı */}
      <aside
        className={cx(
          'relative shrink-0 bg-ink-950/90 backdrop-blur-xl text-white flex flex-col py-5 gap-1.5 border-r border-white/10 transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-32 xl:w-40',
        )}
      >

        {/* Marka alanı: aile fotoğrafı yalnızca menü açıkken görünür
            (menü kapalıyken sanki hiç yokmuş gibi) */}
        {!collapsed && db.settings.familyPhoto && (
          <div className="px-3 pb-3 mb-1 border-b border-white/10">
            <img
              src={db.settings.familyPhoto}
              alt={db.settings.brandName || 'Aile'}
              className="w-full h-24 object-cover object-center rounded-2xl ring-2 ring-brand-400/50 shadow-lg"
            />
          </div>
        )}
        {(!db.settings.familyPhoto || collapsed) && (
          <div className={cx('px-4 pb-4 mb-2 border-b border-white/10', collapsed && 'px-2')}>
            <div className={cx('flex items-center gap-2.5', collapsed && 'justify-center')}>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 grid place-items-center shrink-0 shadow-lg">
                <CalendarHeartIcon className="w-6 h-6 text-white" weight="duotone" />
              </div>
              {!collapsed && (
                <div className="leading-tight min-w-0">
                  {/* Uzun aile adları kesilmesin: iki satıra kadar */}
                  <div className="font-display text-[15px] leading-tight line-clamp-2 break-words">{db.settings.brandName || 'Aile Panosu'}</div>
                  <div className="text-[11px] text-white/60 truncate">{db.settings.city || HOME.city}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 flex flex-col gap-1.5 px-2 overflow-y-auto">
          {NAV.map((n) => {
            const active = tab === n.key
            const Icon = n.icon
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => onTab(n.key)}
                title={n.label}
                className={cx(
                  'rounded-2xl transition-colors touch-manipulation',
                  collapsed ? 'h-12 grid place-items-center' : 'flex flex-col items-center justify-center gap-1 py-3.5',
                  active ? 'bg-brand-500 text-white shadow-lg' : 'text-white/70 hover:bg-white/10',
                )}
              >
                <Icon weight={active ? 'duotone' : 'regular'} className="w-7 h-7" />
                {!collapsed && <span className="text-[13px] font-bold">{n.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Aile yoncası + menü oku + senkron durumu
            (ok: şeridin tam kenarında, yarısı içeride yarısı dışarıda taşacak şekilde) */}
        <div className="pt-3 mt-2 border-t border-white/10 flex flex-col items-center gap-2">
          <div className="relative w-full flex justify-center">
            {/* TV: yoncanın yerinde uygulama kısayolları (kaymayan alan → her sayfadan tek tuşla) */}
            {apps.length > 0 ? (
              <div className={cx('w-full px-2 grid gap-1.5', collapsed ? 'grid-cols-1' : 'grid-cols-2')}>
                {apps.map((a) => {
                  const Icon = a.id === 'youtube' ? YoutubeLogoIcon : TelevisionSimpleIcon
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => openTvApp(a.id)}
                      title={a.label}
                      aria-label={a.label}
                      className="h-14 rounded-2xl bg-white/10 hover:bg-white/15 flex flex-col items-center justify-center gap-0.5 text-white/85"
                    >
                      <Icon weight="fill" className={cx('w-7 h-7', a.id === 'youtube' ? 'text-rose-400' : 'text-sky-300')} />
                      {!collapsed && <span className="text-[10px] font-bold leading-none">{a.label}</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <FamilyClover members={db.members} size={collapsed ? 50 : 62} />
            )}
            <button
              type="button"
              onClick={toggleNav}
              className={cx(
                'absolute right-0 top-1/2 w-7 h-7 rounded-full grid place-items-center touch-manipulation',
                'translate-x-1/2 -translate-y-1/2',
                'bg-ink-950 text-white/90 hover:text-white hover:bg-ink-900',
                'ring-[3px] ring-white/90 shadow-md transition-transform hover:scale-110 active:scale-95',
              )}
              aria-label={collapsed ? 'Menüyü aç' : 'Menüyü gizle'}
              title={collapsed ? 'Menüyü aç' : 'Menüyü gizle'}
            >
              {collapsed ? (
                <CaretRightIcon className="w-3.5 h-3.5" weight="bold" />
              ) : (
                <CaretLeftIcon className="w-3.5 h-3.5" weight="bold" />
              )}
            </button>
          </div>
          {!collapsed && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-white/70">
              <span className={cx('w-2 h-2 rounded-full', SYNC_TONE[status])} />
              <span className="truncate">{syncLabel(status)}</span>
            </div>
          )}
        </div>
      </aside>

      {/* İçerik */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white/45 backdrop-blur-xl border-b border-white/60 px-6 py-4 flex items-center gap-6">
          {/* Tarih: solda gün/ay + haftanın günü, sağda yıl + yılın günü */}
          <div className="flex items-center gap-4 select-none shrink-0">
            <div>
              <div className="text-[32px] font-extrabold text-slate-900 leading-none tracking-tight whitespace-nowrap">
                {now.getDate()} {fmtMonth(now)}
              </div>
              <div className="text-[22px] font-extrabold text-brand-500 leading-none mt-1.5">
                {fmtDayName(now)}
              </div>
            </div>
            <div className="h-14 w-px bg-slate-300/60" />
            <div>
              {/* Yıl: temaya uygun düz renk (gradient yok) */}
              <div className="text-[32px] font-extrabold leading-none tracking-tight text-brand-400">
                {now.getFullYear()}
              </div>
              <div className="text-[12px] font-bold text-slate-400 leading-none mt-2 whitespace-nowrap">
                Yılın {dayOfYear(now)}. günü
              </div>
            </div>
          </div>

          {/* Hava: yatay widget (solda bugün, sağda 5 gün, kaydır: şehir değişir) */}
          <div className="flex-1 min-w-0 flex justify-end">
            <WeatherWidget {...weather} compact />
          </div>

          {/* Saat (sağ üst) */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="h-12 w-px bg-slate-300/60" />
            <div className="flex items-end leading-none">
              <span className="text-[42px] font-extrabold text-slate-900 tabular-nums tracking-tight">
                {pad(now.getHours())}:{pad(now.getMinutes())}
              </span>
              {!TV && (
                <span className="text-lg font-bold text-slate-400 tabular-nums mb-1 ml-0.5">
                  {pad(now.getSeconds())}
                </span>
              )}
            </div>
          </div>
        </header>

        <main key={tab} className="flex-1 overflow-y-auto p-6 xl:p-8">
          <div style={{ zoom }}>
            <NextUp db={db} kiosk />
            {children}
          </div>
        </main>
      </div>

      {flash && <MessageFlash message={flash} member={db.members.find((m) => m.id === flash.fromId)} onDismiss={onFlashDismiss} />}
      {idle && (
        <IdleScreen db={db} weather={weather.data} city={db.settings.city || HOME.city} onWake={wake} />
      )}
    </div>
  )
}
