import {
  CalendarBlankIcon,
  CaretLeftIcon,
  ChatCircleIcon,
  CheckSquareIcon,
  ForkKnifeIcon,
  GearIcon,
  GraduationCapIcon,
  PlayIcon,
  ShoppingCartIcon,
  TelevisionSimpleIcon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx } from '../ui'
import { WeatherIcon } from '../WeatherIcon'
import { MessageFlash } from '../IdleScreen'
import { useClock } from '../../lib/hooks'
import { dateKey, fmtDayName, fmtMonth, fmtTime, pad, todayKey, relativeTime } from '../../lib/time'
import { greetingFor } from '../../lib/specialDays'
import { wmoLabel, type WeatherData } from '../../lib/openMeteo'
import { openTvApp, tvApps } from '../../lib/tv'
import { isChoreDoneToday, isChoreDueToday } from '../../state/actions'
import { syncLabel, type SyncStatus } from '../../sync/useFamilySync'
import { MEAL_SLOTS, type DB, type Message } from '../../types'
import type { TabKey } from '../../state/store'

/**
 * TV ana ekranı (Apple TV / Matinee çizgisi): koyu zemin, üstte saat-hava hapı,
 * ortada odaklanılan kutunun "vitrini", altta iki sıra kutu. Kutuya OK → uygulama ya da sayfa.
 * Sayfalar sade bir çerçevede açılır; Geri → ana ekran.
 */

type SectionKey = Exclude<TabKey, 'home'>
type FocusKey = 'tivimate' | 'youtube' | SectionKey

const SECTIONS: { key: SectionKey; label: string; icon: typeof GearIcon; tint: string }[] = [
  { key: 'calendar', label: 'Takvim', icon: CalendarBlankIcon, tint: '#8b5cf6' },
  { key: 'chores', label: 'Görevler', icon: CheckSquareIcon, tint: '#f59e0b' },
  { key: 'shopping', label: 'Alışveriş', icon: ShoppingCartIcon, tint: '#10b981' },
  { key: 'meals', label: 'Yemekler', icon: ForkKnifeIcon, tint: '#f43f5e' },
  { key: 'learn', label: 'Öğrenme', icon: GraduationCapIcon, tint: '#0ea5e9' },
  { key: 'chat', label: 'Mesajlar', icon: ChatCircleIcon, tint: '#6366f1' },
  { key: 'settings', label: 'Ayarlar', icon: GearIcon, tint: '#64748b' },
]

const SYNC_DOT: Record<SyncStatus, string> = {
  live: 'bg-emerald-400',
  connecting: 'bg-amber-400',
  reconnecting: 'bg-amber-400',
  local: 'bg-sky-400',
  unauthorized: 'bg-rose-500',
}

export function TvLayout({
  db,
  tab,
  onTab,
  status,
  weather,
  city,
  flash,
  onFlashDismiss,
  children,
}: {
  db: DB
  tab: TabKey
  onTab: (t: TabKey) => void
  status: SyncStatus
  weather: WeatherData | null
  city: string
  flash: Message | null
  onFlashDismiss: () => void
  children: ReactNode
}) {
  const now = useClock(1000) // TV'de dakikaya hizalı (hooks.ts)
  const section = SECTIONS.find((s) => s.key === tab)

  return (
    <div className="tv-root relative h-screen overflow-hidden text-white flex flex-col">
      <header className="shrink-0 flex items-center justify-between gap-6 px-16 pt-9 pb-4">
        <div className="flex items-center gap-4">
          {section && (
            <button
              type="button"
              onClick={() => onTab('home')}
              className="tv-pill h-12 pl-3 pr-5 flex items-center gap-2 text-[17px] font-bold"
            >
              <CaretLeftIcon className="w-5 h-5" weight="bold" /> Ana ekran
            </button>
          )}
          <StatusPill now={now} weather={weather} city={city} />
        </div>
        <div className="flex items-center gap-3">
          {section && <div className="text-[28px] font-display tracking-wide mr-2">{section.label}</div>}
          <div className="tv-pill h-12 px-5 flex items-center gap-2.5 text-[16px] font-semibold text-white/80">
            <span className={cx('w-2.5 h-2.5 rounded-full', SYNC_DOT[status])} title={syncLabel(status)} />
            {greetingFor(now)}, {db.settings.familyName || 'Ailem'}
          </div>
        </div>
      </header>

      {section ? (
        // Sayfa: mevcut modül, sade koyu çerçevede (html.night teması)
        <main key={tab} className="flex-1 overflow-y-auto px-16 pb-10 pt-2">
          {children}
        </main>
      ) : (
        <>
          <TvHome db={db} now={now} weather={weather} onTab={onTab} />
          {/* Ana ekranda da senkron uyarıları / aile kodu penceresi */}
          <div className="absolute left-16 right-16 bottom-4">{children}</div>
        </>
      )}

      {flash && <MessageFlash message={flash} member={db.members.find((m) => m.id === flash.fromId)} onDismiss={onFlashDismiss} />}
    </div>
  )
}

function StatusPill({ now, weather, city }: { now: Date; weather: WeatherData | null; city: string }) {
  return (
    <div className="tv-pill h-12 px-5 flex items-center gap-4 text-[16px] font-semibold text-white/80">
      <span className="text-[22px] font-extrabold text-white tabular-nums">
        {pad(now.getHours())}:{pad(now.getMinutes())}
      </span>
      <span>
        {fmtDayName(now, true)} {now.getDate()} {fmtMonth(now)}
      </span>
      {weather && (
        <>
          <span className="w-px h-5 bg-white/15" />
          <span className="flex items-center gap-2">
            <WeatherIcon code={weather.now.weatherCode} isDay={weather.now.isDay} className="w-7 h-7" />
            {weather.now.temp}° · {city}
          </span>
        </>
      )}
    </div>
  )
}

/* ---------------- Ana ekran ---------------- */

type Hero = {
  eyebrow: string
  title: string
  sub?: string
  lines?: { left: string; text: string; right?: string }[]
  card: ReactNode
}

function TvHome({
  db,
  now,
  weather,
  onTab,
}: {
  db: DB
  now: Date
  weather: WeatherData | null
  onTab: (t: TabKey) => void
}) {
  const apps = useMemo(tvApps, [])
  const [focus, setFocus] = useState<FocusKey | null>(null)
  const firstRef = useRef<HTMLButtonElement>(null)

  // Açılışta ve TiviMate/YouTube'dan dönünce odak ilk kutuda (kumanda hemen çalışsın)
  useEffect(() => {
    const f = () => {
      if (!document.querySelector('[role="dialog"]')) firstRef.current?.focus({ preventScroll: true })
    }
    f()
    window.addEventListener('familyos:home', f)
    return () => window.removeEventListener('familyos:home', f)
  }, [])

  const summary = useSummary(db, now)
  const hero = heroFor(focus, summary, weather, now)
  const badges: Partial<Record<SectionKey, number>> = {
    calendar: summary.events.length,
    chores: summary.choresLeft.length,
    shopping: summary.shopping.length,
  }

  return (
    <div className="flex-1 flex flex-col px-16 pb-8 min-h-0">
      {/* Vitrin */}
      <section className="flex-1 min-h-0 flex items-center justify-between gap-10">
        <div className="min-w-0 flex-1 max-w-[640px]">
          <div className="text-[14px] font-bold uppercase tracking-[0.18em] text-white/45">{hero.eyebrow}</div>
          <h1 className="mt-2 text-[60px] leading-[1.05] font-extrabold tracking-tight line-clamp-2 break-words">{hero.title}</h1>
          {hero.sub && <div className="mt-3 text-[21px] font-semibold text-white/70 line-clamp-1">{hero.sub}</div>}
          {hero.lines && hero.lines.length > 0 && (
            <ul className="mt-5 space-y-2">
              {hero.lines.slice(0, 4).map((l, i) => (
                <li key={i} className="flex items-center gap-4 text-[18px]">
                  <span className="w-16 shrink-0 font-bold tabular-nums text-white/50">{l.left}</span>
                  <span className="flex-1 min-w-0 truncate font-semibold text-white/85">{l.text}</span>
                  {l.right && <span className="shrink-0">{l.right}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="shrink-0 w-[380px] h-[214px] rounded-[28px] overflow-hidden">{hero.card}</div>
      </section>

      {/* Uygulamalar */}
      {apps.length > 0 && (
        <Row label="Uygulamalar">
          {apps.map((a, i) => (
            <button
              key={a.id}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              className="tv-tile w-[232px] h-[108px]"
              onFocus={() => setFocus(a.id)}
              onClick={() => openTvApp(a.id)}
              aria-label={a.label}
            >
              <AppArt id={a.id} />
            </button>
          ))}
        </Row>
      )}

      {/* Pano */}
      <Row label="Pano">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon
          const badge = badges[s.key]
          return (
            <button
              key={s.key}
              ref={apps.length === 0 && i === 0 ? firstRef : undefined}
              type="button"
              className="tv-tile tv-tile-soft w-[148px] h-[96px] flex flex-col items-start justify-between p-3.5 text-left"
              onFocus={() => setFocus(s.key)}
              onClick={() => onTab(s.key)}
            >
              <div className="w-full flex items-start justify-between">
                <Icon weight="fill" className="w-8 h-8" style={{ color: s.tint }} />
                {!!badge && (
                  <span className="min-w-7 h-7 px-2 rounded-full bg-white/15 grid place-items-center text-[14px] font-extrabold tabular-nums">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[16px] font-bold">{s.label}</span>
            </button>
          )
        })}
      </Row>

      <div className="mt-3 flex justify-end gap-5 text-[13px] font-semibold text-white/40">
        <span>
          <Key>◀ ▶</Key> gez
        </span>
        <span>
          <Key>OK</Key> aç
        </span>
        <span>
          <Key>Geri</Key> ana ekran
        </span>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2.5 text-[15px] font-bold text-white/50">{label}</div>
      <div className="flex gap-3.5">{children}</div>
    </div>
  )
}

function Key({ children }: { children: ReactNode }) {
  return <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded-md border border-white/20 text-white/60">{children}</span>
}

function AppArt({ id, big = false }: { id: 'tivimate' | 'youtube'; big?: boolean }) {
  if (id === 'youtube') {
    return (
      <div className="w-full h-full grid place-items-center" style={{ background: '#fff' }} data-keep-light>
        <div className="flex items-center gap-2.5">
          <span className={cx('rounded-xl bg-[#ff0033] grid place-items-center', big ? 'w-20 h-14' : 'w-11 h-8')}>
            <PlayIcon weight="fill" className={cx('text-white', big ? 'w-8 h-8' : 'w-5 h-5')} />
          </span>
          <span className={cx('font-extrabold tracking-tight text-[#0f0f0f]', big ? 'text-[44px]' : 'text-[26px]')}>YouTube</span>
        </div>
      </div>
    )
  }
  return (
    <div className="w-full h-full grid place-items-center" style={{ background: '#fff' }} data-keep-light>
      <span className={cx('font-extrabold tracking-tight', big ? 'text-[56px]' : 'text-[34px]')}>
        <span className="text-[#1e88e5]">tivi</span>
        <span className="text-[#0d3c61]">mate</span>
      </span>
    </div>
  )
}

function SectionArt({ k, value, caption }: { k: SectionKey; value?: string | number; caption?: string }) {
  const s = SECTIONS.find((x) => x.key === k)!
  const Icon = s.icon
  return (
    <div className="w-full h-full p-7 flex flex-col justify-between" style={{ background: `${s.tint}33` }}>
      <Icon weight="fill" className="w-14 h-14" style={{ color: s.tint }} />
      <div className="flex items-end justify-between gap-4">
        {value !== undefined && <span className="text-[64px] leading-none font-extrabold tabular-nums">{value}</span>}
        {caption && <span className="text-[18px] font-bold text-white/70 text-right">{caption}</span>}
      </div>
    </div>
  )
}

/* ---------------- Veri ---------------- */

function useSummary(db: DB, now: Date) {
  const today = todayKey()
  const minute = Math.floor(now.getTime() / 60_000)
  return useMemo(() => {
    const member = new Map(db.members.map((m) => [m.id, m]))
    const emojis = (ids: (string | undefined)[]) => ids.map((id) => (id ? member.get(id)?.emoji : '')).join('')
    const events = db.events
      .filter((e) => (e.allDay ? e.start.slice(0, 10) : dateKey(new Date(e.start))) === today)
      .sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1))
    const t = now.getTime()
    const upcoming = events.filter((e) => e.allDay || new Date(e.end ?? e.start).getTime() >= t - 15 * 60_000)
    const due = db.chores.filter((c) => isChoreDueToday(c, today))
    const choresLeft = due.filter((c) => !isChoreDoneToday(c, today))
    return {
      events,
      upcoming,
      dueCount: due.length,
      choresLeft,
      shopping: db.shopping.filter((s) => !s.done),
      meals: MEAL_SLOTS.map((s) => ({ label: s.label, title: db.meals.find((m) => m.date === today && m.slot === s.key)?.title })),
      word: [...db.words].sort((a, b) => a.dueAt - b.dueAt)[0],
      lastMsg: db.messages[db.messages.length - 1],
      member,
      emojis,
    }
    // dakikada bir yeniden hesaplanır
  }, [db, today, minute])
}

function heroFor(focus: FocusKey | null, s: ReturnType<typeof useSummary>, weather: WeatherData | null, now: Date): Hero {
  const evLines = (list: typeof s.events) =>
    list.map((e) => ({ left: e.allDay ? 'Gün' : fmtTime(new Date(e.start)), text: e.title, right: s.emojis(e.memberIds) }))

  switch (focus) {
    case 'tivimate':
      return { eyebrow: 'Uygulama', title: 'TiviMate', sub: 'Canlı TV · OK ile aç', card: <AppArt id="tivimate" big /> }
    case 'youtube':
      return { eyebrow: 'Uygulama', title: 'YouTube', sub: 'Reklamsız · OK ile aç', card: <AppArt id="youtube" big /> }
    case 'calendar': {
      const next = s.upcoming[0]
      return {
        eyebrow: 'Takvim · Bugün',
        title: next ? next.title : 'Bugün boş',
        sub: next ? [next.allDay ? 'Tüm gün' : fmtTime(new Date(next.start)), next.location, s.emojis(next.memberIds)].filter(Boolean).join(' · ') : 'Takvimde bugün için etkinlik yok',
        lines: evLines(s.upcoming.slice(1)),
        card: <SectionArt k="calendar" value={s.events.length} caption="etkinlik" />,
      }
    }
    case 'chores':
      return {
        eyebrow: 'Görevler · Bugün',
        title: s.choresLeft.length ? `${s.choresLeft.length} görev kaldı` : s.dueCount ? 'Hepsi tamam 🎉' : 'Bugün görev yok',
        lines: s.choresLeft.map((c) => ({ left: '•', text: c.title, right: s.emojis([c.assigneeId]) })),
        card: <SectionArt k="chores" value={`${s.dueCount - s.choresLeft.length}/${s.dueCount}`} caption="tamamlandı" />,
      }
    case 'shopping':
      return {
        eyebrow: 'Alışveriş listesi',
        title: s.shopping.length ? `${s.shopping.length} ürün` : 'Liste boş',
        lines: s.shopping.map((i) => ({ left: '•', text: i.qty ? `${i.text} (${i.qty})` : i.text, right: i.category })),
        card: <SectionArt k="shopping" value={s.shopping.length} caption="alınacak" />,
      }
    case 'meals': {
      const dinner = s.meals.find((m) => m.label === 'Akşam')?.title
      return {
        eyebrow: 'Yemekler · Bugün',
        title: dinner ?? 'Menü girilmedi',
        sub: dinner ? 'Akşam yemeği' : undefined,
        lines: s.meals.filter((m) => m.title).map((m) => ({ left: m.label, text: m.title! })),
        card: <SectionArt k="meals" />,
      }
    }
    case 'learn':
      return {
        eyebrow: s.word ? `Öğrenme · ${s.word.deck}` : 'Öğrenme',
        title: s.word?.term ?? 'Kelime yok',
        sub: s.word?.meaning,
        card: <SectionArt k="learn" />,
      }
    case 'chat': {
      const m = s.lastMsg
      const from = m ? s.member.get(m.fromId) : undefined
      return {
        eyebrow: 'Mesajlar',
        title: m ? m.text : 'Henüz mesaj yok',
        sub: m ? `${from?.emoji ?? ''} ${from?.name ?? ''} · ${relativeTime(m.at)}` : undefined,
        card: <SectionArt k="chat" />,
      }
    }
    case 'settings':
      return { eyebrow: 'Ayarlar', title: 'Ayarlar', sub: 'Tema, konum, ekran, aile', card: <SectionArt k="settings" /> }
    default: {
      // Odak yok: selam + sıradaki etkinlik, sağda hava
      const next = s.upcoming[0]
      return {
        eyebrow: next ? 'Sıradaki' : greetingFor(now),
        title: next ? next.title : 'Bugün sakin',
        sub: next ? (next.allDay ? 'Tüm gün' : fmtTime(new Date(next.start))) : undefined,
        lines: evLines(s.upcoming.slice(1)),
        card: <WeatherArtCard weather={weather} />,
      }
    }
  }
}

function WeatherArtCard({ weather }: { weather: WeatherData | null }) {
  if (!weather) return <div className="w-full h-full bg-white/5" />
  const d = weather.days[0]
  return (
    <div className="w-full h-full p-7 flex items-center justify-between bg-gradient-to-br from-sky-500/30 to-indigo-500/20">
      <div>
        <div className="text-[72px] leading-none font-extrabold tabular-nums">{weather.now.temp}°</div>
        <div className="mt-2 text-[18px] font-bold text-white/75">{wmoLabel(weather.now.weatherCode)}</div>
        {d && <div className="text-[16px] font-semibold text-white/55">↑{d.max}° ↓{d.min}°</div>}
      </div>
      <WeatherIcon code={weather.now.weatherCode} isDay={weather.now.isDay} className="w-28 h-28" />
    </div>
  )
}
