import {
  BowlFoodIcon,
  ChalkboardTeacherIcon,
  BasketIcon,
  BookOpenIcon,
  QuotesIcon,
  SlidersHorizontalIcon,
  BookOpenTextIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  ChatsCircleIcon,
  CookingPotIcon,
  GearSixIcon,
  ListChecksIcon,
  PlayIcon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx } from '../ui'
import { WeatherIcon } from '../WeatherIcon'
import { IdleScreen, MessageFlash } from '../IdleScreen'
import { TvProgramPopup, type TvProgramKind } from '../TvProgramPopup'
import { useClock, useIdle } from '../../lib/hooks'
import { dateKey, fmtDayName, fmtMonth, fmtTime, pad, todayKey, relativeTime } from '../../lib/time'
import { greetingFor } from '../../lib/specialDays'
import { wmoLabel, type WeatherData } from '../../lib/openMeteo'
import { HOME } from '../../lib/location'
import { themeById } from '../../lib/themes'
import { nextPrayer, prayerTimes, PRAYER_LABELS, PRAYER_ORDER, type PrayerKey } from '../../lib/prayer'
import { openTvApp, tvApps, type TvApp } from '../../lib/tv'
import { useSpiritual } from '../../lib/spiritual'
import { isChoreDoneToday, isChoreDueToday } from '../../state/actions'
import { syncLabel, type SyncStatus } from '../../sync/useFamilySync'
import { MEAL_SLOTS, type DB, type Member, type Message } from '../../types'
import type { TabKey } from '../../state/store'

/**
 * TV ana ekranı (Apple TV / Matinee çizgisi): koyu zemin, üstte saat-hava ve namaz vakitleri,
 * ortada vitrin (solda başlık, sağda odaklanılan bölümün detay paneli), altta iki sıra kutu.
 * Kutuya OK → uygulama ya da sayfa. Sayfalar sade bir çerçevede açılır; Geri → ana ekran.
 */

type SectionKey = Exclude<TabKey, 'home'>

/** Bölümler: alttaki satırda tek renk glif + ad (gösterge çubuğu üslubu). */
const SECTIONS: { key: SectionKey; label: string; icon: typeof GearSixIcon }[] = [
  { key: 'calendar', label: 'Takvim', icon: CalendarDotsIcon },
  { key: 'chores', label: 'Görevler', icon: ListChecksIcon },
  { key: 'shopping', label: 'Alışveriş', icon: BasketIcon },
  { key: 'meals', label: 'Yemekler', icon: CookingPotIcon },
  { key: 'learn', label: 'Öğrenme', icon: BookOpenTextIcon },
  { key: 'chat', label: 'Mesajlar', icon: ChatsCircleIcon },
  // familyOS'un kendi ayarları (Android ayarları dişliyle uygulamalarda)
  { key: 'settings', label: 'Ayarlar', icon: SlidersHorizontalIcon },
]

const APP_CAPTION: Record<TvApp['id'], string> = {
  tivimate: 'Canlı TV',
  youtube: 'Reklamsız video',
  'android-settings': 'Android TV ayarları',
}

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
  // Ana ekranda odaklanılan bölüm (null: uygulamalar / özet). Özet görünürken saat-hava sağda büyük durur.
  const [homeFocus, setHomeFocus] = useState<SectionKey | null>(null)
  // Çocuk programı penceresi (alttaki iki küçük ikon)
  const [program, setProgram] = useState<{ kind: TvProgramKind; kidId: string } | null>(null)
  const showStatus = !!section || homeFocus !== null

  // Ekran koruyucu: 5 dk tuşa basılmazsa kelime ekranı (stick uyumaz: MainActivity ekranı açık tutar)
  const { idle, wake } = useIdle(TV_IDLE_MIN)
  useEffect(() => {
    if (!idle) return
    // Uyandıran ilk tuş yalnızca uyandırsın (OK arkadaki uygulamayı açmasın, ok tuşu odağı kaydırmasın)
    const swallow = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return // Geri/Home: useIdle zaten uyandırır
      e.preventDefault()
      e.stopImmediatePropagation()
      wake()
    }
    window.addEventListener('keydown', swallow, true)
    return () => window.removeEventListener('keydown', swallow, true)
  }, [idle, wake])

  return (
    <div className="tv-root relative h-screen overflow-hidden text-white flex flex-col">
      <TvBackdrop familyPhoto={db.settings.familyPhoto} day={dateKey(now)} />
      <header className="relative shrink-0 h-[100px] flex items-center justify-between gap-6 px-16 pt-5">
        <div className="flex items-center gap-4 min-w-0">
          {section && (
            <button
              type="button"
              onClick={() => onTab('home')}
              className="tv-pill h-12 pl-3 pr-5 flex items-center gap-2 text-[17px] font-bold shrink-0"
            >
              <CaretLeftIcon className="w-5 h-5" weight="bold" /> Ana ekran
            </button>
          )}
          {showStatus ? <StatusPill now={now} weather={weather} city={city} status={status} /> : <SpiritualLines />}
          {section && <div className="text-[26px] font-display tracking-wide ml-2 truncate">{section.label}</div>}
        </div>
        <PrayerTimes now={now} lat={db.settings.lat ?? HOME.lat} lon={db.settings.lon ?? HOME.lon} />
      </header>

      {section ? (
        // Sayfa: mevcut modül, sade koyu çerçevede (html.night teması)
        <main key={tab} className="relative flex-1 overflow-y-auto px-16 pb-10 pt-2">
          {children}
        </main>
      ) : (
        <>
          <TvHome
            db={db}
            now={now}
            weather={weather}
            status={status}
            onTab={onTab}
            focus={homeFocus}
            setFocus={setHomeFocus}
            onProgram={(kind, kidId) => setProgram({ kind, kidId })}
          />
          {/* Ana ekranda da senkron uyarıları / aile kodu penceresi */}
          <div className="absolute left-16 right-16 bottom-4">{children}</div>
        </>
      )}

      {flash && <MessageFlash message={flash} member={db.members.find((m) => m.id === flash.fromId)} onDismiss={onFlashDismiss} />}
      {program && <TvProgramPopup db={db} kind={program.kind} kidId={program.kidId} now={now} onClose={() => setProgram(null)} />}
      {idle && (
        <IdleScreen
          db={db}
          weather={weather}
          city={city}
          onWake={wake}
          rotateMs={10_000}
          revealMs={5_000}
          hint="Devam etmek için kumandada bir tuşa basın"
        />
      )}
    </div>
  )
}

/** 5 dk; yalnızca yerel önizlemede ?bosta=0.2 ile kısaltılabilir (canlıda etkisiz) */
const TV_IDLE_MIN = (() => {
  if (typeof window === 'undefined' || window.location.hostname !== 'localhost') return 5
  const v = Number(new URLSearchParams(window.location.search).get('bosta'))
  return v > 0 ? v : 5
})()

function StatusPill({ now, weather, city, status }: { now: Date; weather: WeatherData | null; city: string; status: SyncStatus }) {
  return (
    <div className="tv-pill h-12 px-5 flex items-center gap-4 text-[16px] font-semibold text-white/80 shrink-0">
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
      <span className={cx('w-2 h-2 rounded-full', SYNC_DOT[status])} title={syncLabel(status)} />
    </div>
  )
}

/** Sol üst: günün ayeti ve hadisi — namaz vakitleri hizasında iki satır, başlarında küçük ikon. */
function SpiritualLines() {
  const sp = useSpiritual()
  if (!sp) return <div className="h-12" aria-hidden />
  const rows = [
    { key: 'ayet', Icon: BookOpenIcon, label: 'Günün ayeti', text: sp.ayet.text, ref: sp.ayet.ref },
    { key: 'hadis', Icon: QuotesIcon, label: 'Günün hadisi', text: `“${sp.hadis.text.replace(/\.$/, '')}”`, ref: sp.hadis.ref },
  ]
  return (
    <div className="min-w-0 max-w-[640px] flex flex-col gap-2 leading-tight">
      {rows.map(({ key, Icon, label, text, ref }) => (
        <p key={key} className="min-w-0 flex items-center gap-2.5 text-[14px]" aria-label={`${label}: ${text} (${ref})`}>
          <span className="w-[22px] h-[22px] shrink-0 grid place-items-center rounded-full bg-[#f6c58a]/15">
            <Icon weight="fill" className="w-[13px] h-[13px] text-[#f6c58a]" />
          </span>
          <span className="truncate text-white/80">{text}</span>
          <span className="shrink-0 text-[12px] text-white/40">{ref}</span>
        </p>
      ))}
    </div>
  )
}

/** Namaz vakitleri: sade, çerçevesiz, vurgusuz bir satır (bakınca anlaşılır). */
function PrayerTimes({ now, lat, lon }: { now: Date; lat: number; lon: number }) {
  const day = dateKey(now)
  const times = useMemo(() => prayerTimes(now, lat, lon), [day, lat, lon])
  return (
    <div className="flex items-end gap-6 shrink-0 leading-none">
      {PRAYER_ORDER.map((k) => (
        <div key={k} className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-medium text-white/40">{PRAYER_LABELS[k]}</span>
          <span className="text-[17px] font-medium tabular-nums text-white/80">{fmtTime(times[k])}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Ana ekran ---------------- */

function TvHome({
  db,
  now,
  weather,
  status,
  onTab,
  focus,
  setFocus,
  onProgram,
}: {
  db: DB
  now: Date
  weather: WeatherData | null
  status: SyncStatus
  onTab: (t: TabKey) => void
  focus: SectionKey | null
  setFocus: (k: SectionKey | null) => void
  onProgram: (kind: TvProgramKind, kidId: string) => void
}) {
  const apps = useMemo(tvApps, [])
  const firstRef = useRef<HTMLButtonElement>(null)

  // Açılışta ve Home tuşunda odak ilk kutuda (kumanda hemen çalışsın)
  useEffect(() => {
    const f = () => {
      if (!document.querySelector('[role="dialog"]')) firstRef.current?.focus({ preventScroll: true })
    }
    f()
    window.addEventListener('familyos:home', f)
    return () => window.removeEventListener('familyos:home', f)
  }, [])

  const s = useSummary(db, now)
  // Program ikonları: beslenme → beslenme programı en dolu çocuk, ders → ders programı en dolu çocuk
  const programKids = useMemo(() => {
    const most = (list: { memberId: string }[]) => {
      const c = new Map<string, number>()
      for (const x of list) c.set(x.memberId, (c.get(x.memberId) ?? 0) + 1)
      return [...c].sort((a, b) => b[1] - a[1])[0]?.[0]
    }
    const name = (id?: string) => db.members.find((m) => m.id === id)?.name
    const nu = most(db.nutrition)
    const ls = most(db.lessons)
    return { nutrition: nu ? { id: nu, name: name(nu) } : null, lessons: ls ? { id: ls, name: name(ls) } : null }
  }, [db.nutrition, db.lessons, db.members])
  const badges: Partial<Record<SectionKey, number>> = {
    calendar: s.events.length,
    chores: s.choresLeft.length,
    shopping: s.shopping.length,
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0 px-16 pb-8">
      {/* Vitrin: uygulama seçiliyken / odak yokken günün özeti, bölüm seçiliyken detay */}
      <section className="flex-1 min-h-0 flex items-center gap-10">
        {focus ? <SectionHero k={focus} s={s} db={db} status={status} /> : (
          <DayHero s={s} now={now} weather={weather} lat={db.settings.lat ?? HOME.lat} lon={db.settings.lon ?? HOME.lon} />
        )}
      </section>

      {/* Uygulamalar: bölüm satırının üstünde */}
      {apps.length > 0 && (
        <div className="mt-4 flex gap-3.5" aria-label="Uygulamalar">
          {apps.map((a, i) => (
            <button
              key={a.id}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              title={a.label}
              aria-label={`${a.label} · ${APP_CAPTION[a.id]}`}
              className="tv-tile tv-app w-[62px] h-[62px]"
              style={{ overflow: 'visible' }}
              onFocus={() => setFocus(null)}
              onClick={() => openTvApp(a.id)}
            >
              <AppIcon id={a.id} />
            </button>
          ))}
          {/* TV ayarları ikonunun yanında, onun yarı boyutunda üst üste iki ikon: çocukların haftalık programları */}
          {(programKids.nutrition || programKids.lessons) && (
            <span className="flex flex-col justify-between h-[62px]">
              {programKids.nutrition && (
                <button
                  type="button"
                  title={`${programKids.nutrition.name} · Beslenme programı`}
                  aria-label={`${programKids.nutrition.name} beslenme programı`}
                  className="tv-tile tv-mini w-[29px] h-[29px] rounded-[9px] grid place-items-center"
                  style={{ background: 'linear-gradient(150deg, #fdba74, #ea580c)', overflow: 'visible', borderRadius: 9 }}
                  onFocus={() => setFocus(null)}
                  onClick={() => onProgram('nutrition', programKids.nutrition!.id)}
                >
                  <BowlFoodIcon weight="fill" className="w-[17px] h-[17px]" style={{ color: '#fff' }} />
                </button>
              )}
              {programKids.lessons && (
                <button
                  type="button"
                  title={`${programKids.lessons.name} · Ders programı`}
                  aria-label={`${programKids.lessons.name} ders programı`}
                  className="tv-tile tv-mini w-[29px] h-[29px] rounded-[9px] grid place-items-center"
                  style={{ background: 'linear-gradient(150deg, #93c5fd, #2563eb)', overflow: 'visible', borderRadius: 9 }}
                  onFocus={() => setFocus(null)}
                  onClick={() => onProgram('lessons', programKids.lessons!.id)}
                >
                  <ChalkboardTeacherIcon weight="fill" className="w-[17px] h-[17px]" style={{ color: '#fff' }} />
                </button>
              )}
            </span>
          )}
        </div>
      )}

      {/* En altta: bölümler yan yana — tek renk sade glif + ad + sayı; sağda tuş ipuçları */}
      <div className="mt-5 flex items-center justify-between gap-6">
        <nav className="flex items-center gap-2" aria-label="Pano">
          {SECTIONS.map((sec, i) => {
            const Icon = sec.icon
            const badge = badges[sec.key]
            return (
              <button
                key={sec.key}
                ref={apps.length === 0 && i === 0 ? firstRef : undefined}
                type="button"
                className="tv-glyph h-11 px-3.5 rounded-full flex items-center gap-2 whitespace-nowrap text-[17px] font-medium text-white/55"
                onFocus={() => setFocus(sec.key)}
                onClick={() => onTab(sec.key)}
              >
                <Icon weight="fill" className="w-[19px] h-[19px]" />
                <span className="tv-glyph-label">{sec.label}</span>
                {!!badge && <span className="tabular-nums text-white/40">{badge}</span>}
              </button>
            )
          })}
        </nav>
        <div className="flex gap-5 text-[13px] font-semibold text-white/35 shrink-0">
          <span>
            <Key>◀ ▶</Key> gez
          </span>
          <span>
            <Key>OK</Key> aç
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Arka plan: bulanık görsel. Blur ekranda hesaplanmaz (zayıf GPU'da kare başına pahalı):
 * görsel bir kez küçük tuvalde bulanıklaştırılır, sonra büyütülerek gösterilir.
 * Kaynak: /tv-bg/list.json (günlük döner) → yoksa aile fotoğrafı → yoksa düz zemin.
 */
function TvBackdrop({ familyPhoto, day }: { familyPhoto?: string; day: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      let list: string[] = []
      try {
        const r = await fetch('/tv-bg/list.json', { cache: 'no-cache' })
        if (r.ok) list = ((await r.json()) as string[]).map((f) => `/tv-bg/${f}`)
      } catch {
        /* yoksay */
      }
      if (!list.length && familyPhoto) list = [familyPhoto]
      if (!list.length) return
      const pick = list[Math.floor(Date.parse(day) / 86_400_000) % list.length]
      const blurred = await preBlur(pick).catch(() => null)
      if (alive) setSrc(blurred)
    })()
    return () => {
      alive = false
    }
  }, [familyPhoto, day])

  if (!src) return null
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.8 }} />
      {/* Okunurluk: sol ve alt koyulaşır */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#17110f]/80 via-[#17110f]/40 to-[#17110f]/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#17110f]/75 via-transparent to-[#17110f]/35" />
    </div>
  )
}

function preBlur(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = 320
      const h = 180
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      // object-cover kırpma
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth * scale
      const dh = img.naturalHeight * scale
      ctx.filter = 'blur(7px) saturate(1.15)'
      ctx.drawImage(img, (w - dw) / 2 - 12, (h - dh) / 2 - 12, dw + 24, dh + 24)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = url
  })
}

function Key({ children }: { children: ReactNode }) {
  return <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded-md border border-white/15 text-white/55">{children}</span>
}

/** Uygulama ikonları: bölüm ikonlarıyla aynı kare ölçüde. */
function AppIcon({ id }: { id: TvApp['id'] }) {
  if (id === 'youtube') {
    return (
      <span className="w-full h-full grid place-items-center rounded-[inherit]" style={{ background: '#fff' }} data-keep-light>
        <span className="w-[38px] h-[27px] rounded-[8px] grid place-items-center" style={{ background: '#ff0033' }}>
          <PlayIcon weight="fill" className="w-4 h-4" style={{ color: '#fff' }} />
        </span>
      </span>
    )
  }
  if (id === 'android-settings') {
    // Klasik ayarlar ikonu: gümüş zemin, koyu dişli
    return (
      <span className="w-full h-full grid place-items-center rounded-[inherit]" style={{ background: 'linear-gradient(160deg, #f1f2f4, #b9bec7)' }} data-keep-light>
        <GearSixIcon weight="fill" className="w-[38px] h-[38px]" style={{ color: '#3f4550' }} />
      </span>
    )
  }
  return (
    <span className="w-full h-full flex flex-col items-center justify-center rounded-[inherit] leading-[0.95] text-[16px] font-extrabold tracking-tight" style={{ background: '#fff' }} data-keep-light>
      <span style={{ color: '#1e88e5' }}>tivi</span>
      <span style={{ color: '#0d3c61' }}>mate</span>
    </span>
  )
}

/* ---------------- Vitrin ---------------- */

/** Sol: başlık bloğu; sağ: detay paneli. */
function Hero({ eyebrow, title, sub, panel }: { eyebrow: string; title: string; sub?: ReactNode; panel: ReactNode }) {
  return (
    <>
      <div className="w-[420px] shrink-0">
        <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/45">{eyebrow}</div>
        <h1 className="mt-2 text-[46px] leading-[1.08] font-extrabold tracking-tight line-clamp-2 break-words">{title}</h1>
        {sub && <div className="mt-3 text-[19px] font-semibold text-white/65 line-clamp-2">{sub}</div>}
      </div>
      {/* Çerçevesiz: bilgi doğrudan zemine yazılır */}
      <div className="flex-1 min-w-0 h-[300px] pl-10 border-l border-white/10 overflow-hidden" style={{ borderRadius: 0 }}>
        {panel}
      </div>
    </>
  )
}

/* ---------- Ana ekranın özeti: ev, o anki durumu cümleyle anlatır ---------- */

type Seg = { t: string; hl?: boolean }

const PRAYER_PHRASE: Record<PrayerKey, string> = {
  imsak: 'İmsak vaktine',
  gunes: 'Güneşin doğuşuna',
  ogle: 'Öğle ezanına',
  ikindi: 'İkindi ezanına',
  aksam: 'Akşam ezanına',
  yatsi: 'Yatsı ezanına',
}

/** Türkçe tamlayan eki: Ali → Ali'nin, Ayşe → Ayşe'nin, Mehmet → Mehmet'in, Elif → Elif'in */
function genitive(name: string): string {
  const vowels = 'aıoueiöü'
  const lower = name.toLocaleLowerCase('tr')
  const last = [...lower].reverse().find((c) => vowels.includes(c)) ?? 'e'
  const v = 'aı'.includes(last) ? 'ı' : 'ei'.includes(last) ? 'i' : 'ou'.includes(last) ? 'u' : 'ü'
  return `${name}’${vowels.includes(lower.slice(-1)) ? 'n' : ''}${v}n`
}

const lowerFirst = (t: string) => t.charAt(0).toLocaleLowerCase('tr') + t.slice(1)

function durationText(min: number): string {
  if (min < 60) return `${min} dakika`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} saat ${m} dakika` : `${h} saat`
}

/** TV selamı: günün saatine göre (öğle ve ikindi ayrı) */
function tvGreeting(now: Date): string {
  const h = now.getHours()
  if (h >= 22 || h < 5) return 'İyi geceler'
  if (h < 11) return 'Günaydın'
  if (h < 14) return now.getDay() === 5 ? 'Hayırlı cumalar' : 'İyi öğlenler'
  if (h < 18) return 'Tünaydın'
  return 'İyi akşamlar'
}

/** Saat + bulunma eki: 16:30’da, 17:00’de, 09:15’te (son okunan sayıya göre ünlü uyumu) */
function atTime(d: Date): string {
  const hh = d.getHours()
  const mm = d.getMinutes()
  const n = mm || hh
  const UNIT = ['da', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'] // sıfır bir iki üç dört beş altı yedi sekiz dokuz
  const TENS: Record<number, string> = { 0: 'da', 10: 'da', 20: 'de', 30: 'da', 40: 'ta', 50: 'de' } // on yirmi otuz kırk elli
  const suffix = n % 10 ? UNIT[n % 10] : TENS[n] ?? 'da'
  return `${pad(hh)}:${pad(mm)}’${suffix}`
}

/** Akşam ezanından sonra özet (namaz cümlesi hariç) yarına odaklanır */
function isEvening(now: Date, lat: number, lon: number): boolean {
  return now.getTime() >= prayerTimes(now, lat, lon).aksam.getTime()
}

function eventSentence(prefix: string, e: DB['events'][number], s: Summary): Seg[] {
  const owner = e.memberIds.length === 1 ? s.member.get(e.memberIds[0])?.name : undefined
  const what = owner && !/[’']/.test(e.title) ? `${genitive(owner)} ${lowerFirst(e.title)}` : e.title
  return [{ t: prefix }, { t: what, hl: true }, { t: e.allDay ? '.' : `, saat ${atTime(new Date(e.start))}.` }]
}

function daySentences(s: Summary, now: Date, lat: number, lon: number): Seg[][] {
  const out: Seg[][] = []
  const p = nextPrayer(now, lat, lon)
  const left = Math.max(1, Math.round((p.at.getTime() - now.getTime()) / 60_000))
  if (left <= 180) out.push([{ t: `${PRAYER_PHRASE[p.key]} ` }, { t: durationText(left), hl: true }, { t: ' var.' }])

  if (isEvening(now, lat, lon)) {
    // Akşam: yarının ilk etkinliği (+ kaç tane daha) ve yarının sofrası
    const first = s.tomorrow[0]
    if (first) {
      const segs = eventSentence('Yarın ', first, s)
      if (s.tomorrow.length > 1) segs.push({ t: ` Gün boyu ${s.tomorrow.length} etkinlik var.` })
      out.push(segs)
    }
    const tm = s.tomorrowMeals
    const meal = tm.find((m) => m.key === 'breakfast' && m.title) ?? tm.find((m) => m.key === 'dinner' && m.title)
    if (meal?.title) {
      out.push([{ t: meal.key === 'breakfast' ? 'Yarın kahvaltıda ' : 'Yarın akşam sofrada ' }, { t: lowerFirst(meal.title), hl: true }, { t: ' var.' }])
    }
    if (!first && !meal?.title) out.push([{ t: 'Yarın için plan yok. ' }, { t: 'İyi dinlenmeler.', hl: true }])
    return out.slice(0, 3)
  }

  const next = s.upcoming.find((e) => !e.allDay)
  if (next) out.push(eventSentence('Sıradaki: ', next, s))

  const dinner = s.meals.find((m) => m.key === 'dinner')?.title
  if (dinner) out.push([{ t: 'Bu akşam sofrada ' }, { t: lowerFirst(dinner), hl: true }, { t: ' var.' }])

  if (!out.length) out.push([{ t: 'Bugün ev sakin. ' }, { t: 'İyi dinlenmeler.', hl: true }])
  return out.slice(0, 3)
}

function dayFootnote(s: Summary, evening: boolean): string {
  const parts: string[] = []
  if (evening) {
    if (s.tomorrowChores.length) parts.push(`yarın ${s.tomorrowChores.length} görev var`)
  } else if (s.choresLeft.length) parts.push(`${s.choresLeft.length} görev bekliyor`)
  if (s.shopping.length) {
    const names = s.shopping.slice(0, 3).map((i) => lowerFirst(i.text))
    parts.push(`marketten ${names.join(', ')}${s.shopping.length > 3 ? ` ve ${s.shopping.length - 3} ürün daha` : ''} alınacak`)
  }
  return parts.join(' · ')
}

/** Son 24 saatin mesajları (en yeni önce), "Elif yazdı: “…”" biçiminde */
function recentMessages(s: Summary): string[] {
  return s.recentMsgs.map((m) => `${s.member.get(m.fromId)?.name ?? 'Biri'} yazdı: “${m.text}”`)
}

/**
 * Mesaj satırı: tek mesaj → sabit; birden çok → 6 sn'de bir sıradaki.
 * Akan bant (marquee) bu stick'te sürekli ~10 fps çizip işlemciyi meşgul ediyordu;
 * sırayla değişim yalnızca değişim anında tek kare çizer.
 */
function MessageTicker({ items }: { items: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    setI(0)
    if (items.length < 2) return
    const id = setInterval(() => setI((x) => (x + 1) % items.length), 6000)
    return () => clearInterval(id)
  }, [items.length])
  if (!items.length) return null
  return (
    <p className="mt-6 flex items-center gap-3 text-[18px] text-white/70 min-w-0">
      <ChatsCircleIcon weight="fill" className="w-5 h-5 shrink-0 text-[#f6c58a]" />
      <span className="truncate">{items[i % items.length]}</span>
      {items.length > 1 && (
        <span className="shrink-0 text-[14px] tabular-nums text-white/35">
          {(i % items.length) + 1}/{items.length}
        </span>
      )}
    </p>
  )
}

function DayHero({ s, now, weather, lat, lon }: { s: Summary; now: Date; weather: WeatherData | null; lat: number; lon: number }) {
  const lines = daySentences(s, now, lat, lon)
  const evening = isEvening(now, lat, lon)
  const foot = dayFootnote(s, evening)
  return (
    <>
      <div className="flex-1 min-w-0 max-w-[820px]">
        <div className="text-[15px] font-semibold tracking-[0.08em] text-[#f6c58a]/80">
          {tvGreeting(now)}
          {evening && <span className="text-white/45"> · yarının programı</span>}
        </div>
        <h1 className="mt-3 text-[40px] leading-[1.22] font-semibold tracking-[-0.01em]">
          {lines.map((segs, i) => (
            <span key={i}>
              {segs.map((g, j) => (
                <span key={j} style={g.hl ? { color: '#f6c58a' } : undefined}>
                  {g.t}
                </span>
              ))}{' '}
            </span>
          ))}
        </h1>
        {foot && <p className="mt-5 text-[18px] leading-relaxed font-normal text-white/55 line-clamp-2">{foot}</p>}
        <MessageTicker items={recentMessages(s)} />
      </div>
      <div className="shrink-0 w-[300px] flex flex-col items-end text-right">
        {/* Uygulamalar/özet görünürken saat ve tarih burada büyük durur (sol üstteki hap gizli) */}
        {/* Saat: ince ağırlık + büyük optik boyut; iki nokta soluk ve hafif yukarıda */}
        <div className="tv-clock text-[112px] leading-[0.9] tabular-nums">
          {pad(now.getHours())}
          <span className="tv-clock-colon">:</span>
          {pad(now.getMinutes())}
        </div>
        <div className="mt-2 text-[20px] text-white/70">
          {fmtDayName(now)}, {now.getDate()} {fmtMonth(now)}
        </div>
      {weather && (
        <div className="mt-8 flex flex-col items-end">
          <div className="flex items-center gap-3">
            <WeatherIcon code={weather.now.weatherCode} isDay={weather.now.isDay} className="w-12 h-12" />
            <span className="text-[44px] leading-none font-light tabular-nums">{weather.now.temp}°</span>
          </div>
          <div className="mt-1 text-[15px] text-white/60">
            {wmoLabel(weather.now.weatherCode)}
            {weather.days[0] && ` · ${weather.days[0].max}° / ${weather.days[0].min}°`}
          </div>
          <div className="mt-4 flex gap-5 text-[13px] text-white/50 tabular-nums">
            {weather.days.slice(1, 5).map((d) => (
              <span key={d.date} className="flex flex-col items-center gap-1">
                <span>{fmtDayName(d.date, true)}</span>
                <WeatherIcon code={d.weatherCode} className="w-7 h-7" />
                <span className="text-white/80">{d.max}°</span>
              </span>
            ))}
          </div>
        </div>
      )}
      </div>
    </>
  )
}

function SectionHero({ k, s, db, status }: { k: SectionKey; s: Summary; db: DB; status: SyncStatus }) {
  switch (k) {
    case 'calendar': {
      const next = s.upcoming[0]
      return (
        <Hero
          eyebrow="Takvim · Bugün"
          title={s.events.length ? `${s.events.length} etkinlik` : 'Bugün boş'}
          sub={next ? `Sıradaki ${next.allDay ? 'tüm gün' : fmtTime(new Date(next.start))} · ${next.title}` : s.tomorrow.length ? `Yarın ${s.tomorrow.length} etkinlik var` : undefined}
          panel={
            s.events.length ? (
              <ul className="space-y-2.5">
                {s.events.slice(0, 4).map((e) => {
                  const done = !e.allDay && new Date(e.end ?? e.start).getTime() < s.now
                  return (
                    <li key={e.id} className={cx('flex items-center gap-4', done && 'opacity-40')}>
                      <span className="w-14 shrink-0 text-[17px] font-extrabold tabular-nums text-white/70">
                        {e.allDay ? 'Gün' : fmtTime(new Date(e.start))}
                      </span>
                      <span className="w-1 h-10 rounded-full shrink-0" style={{ background: s.member.get(e.memberIds[0])?.color ?? '#64748b' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[18px] font-bold truncate">{e.title}</div>
                        {e.location && <div className="text-[13px] font-semibold text-white/45 truncate">{e.location}</div>}
                      </div>
                      <Avatars ids={e.memberIds} member={s.member} />
                    </li>
                  )
                })}
                {/* Yer kaldıysa yarın */}
                {s.events.length < 3 && s.tomorrow.length > 0 && (
                  <li className="pt-2">
                    <div className="text-[12px] font-bold uppercase tracking-wider text-violet-300/80">Yarın</div>
                    <ul className="mt-1.5 space-y-1">
                      {s.tomorrow.slice(0, 3 - s.events.length).map((e) => (
                        <li key={e.id} className="flex items-center gap-4 text-[16px] text-white/70">
                          <span className="w-14 shrink-0 font-bold tabular-nums">{e.allDay ? 'Gün' : fmtTime(new Date(e.start))}</span>
                          <span className="flex-1 min-w-0 truncate font-semibold">{e.title}</span>
                          <span className="shrink-0">{s.emojis(e.memberIds)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            ) : (
              <Muted>
                {s.tomorrow.length
                  ? `Yarın: ${s.tomorrow.map((e) => e.title).slice(0, 3).join(', ')}`
                  : 'Bugün ve yarın için etkinlik yok.'}
              </Muted>
            )
          }
        />
      )
    }
    case 'chores': {
      const done = s.dueCount - s.choresLeft.length
      const pct = s.dueCount ? Math.round((done / s.dueCount) * 100) : 0
      return (
        <Hero
          eyebrow="Görevler · Bugün"
          title={s.choresLeft.length ? `${s.choresLeft.length} görev kaldı` : s.dueCount ? 'Hepsi tamam 🎉' : 'Bugün görev yok'}
          sub={s.dueCount ? `${done}/${s.dueCount} tamamlandı` : undefined}
          panel={
            <div className="h-full flex flex-col">
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {s.choresLeft.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-md border-2 border-white/30 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-[17px] font-semibold">{c.title}</span>
                    <Avatars ids={[c.assigneeId]} member={s.member} />
                  </li>
                ))}
              </ul>
              {s.choresLeft.length > 8 && <div className="mt-auto text-[13px] text-white/45">+{s.choresLeft.length - 8} görev daha</div>}
            </div>
          }
        />
      )
    }
    case 'shopping': {
      const groups = new Map<string, typeof s.shopping>()
      for (const i of s.shopping) groups.set(i.category, [...(groups.get(i.category) ?? []), i])
      return (
        <Hero
          eyebrow="Alışveriş listesi"
          title={s.shopping.length ? `${s.shopping.length} ürün` : 'Liste boş'}
          sub={s.shopping.length ? [...groups.keys()].join(' · ') : 'Telefondan ekleyince burada görünür'}
          panel={
            s.shopping.length ? (
              <div className="grid grid-cols-3 gap-5">
                {[...groups].slice(0, 6).map(([cat, items]) => (
                  <div key={cat} className="min-w-0">
                    <div className="text-[12px] font-bold uppercase tracking-wider text-emerald-300/80">{cat}</div>
                    <ul className="mt-1.5 space-y-1">
                      {items.slice(0, 4).map((i) => (
                        <li key={i.id} className="text-[17px] font-semibold truncate">
                          {i.text}
                          {i.qty && <span className="text-white/45"> · {i.qty}</span>}
                        </li>
                      ))}
                      {items.length > 4 && <li className="text-[13px] text-white/45">+{items.length - 4}</li>}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <Muted>Alınacak bir şey yok.</Muted>
            )
          }
        />
      )
    }
    case 'meals': {
      const dinner = s.meals.find((m) => m.key === 'dinner')?.title
      return (
        <Hero
          eyebrow="Yemekler · Bugün"
          title={dinner ?? 'Menü girilmedi'}
          sub={dinner ? 'Akşam yemeği' : undefined}
          panel={
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-3 gap-3">
                {s.meals.map((m) => (
                  <div key={m.key} className="rounded-2xl bg-white/[0.05] p-4 min-h-[112px]">
                    <div className="text-[12px] font-bold uppercase tracking-wider text-rose-300/80">{m.label}</div>
                    <div className={cx('mt-2 text-[19px] font-bold line-clamp-2', !m.title && 'text-white/30')}>{m.title ?? '—'}</div>
                  </div>
                ))}
              </div>
              {s.tomorrowDinner && (
                <div className="mt-auto text-[15px] font-semibold text-white/55">
                  Yarın akşam: <span className="text-white/85">{s.tomorrowDinner}</span>
                </div>
              )}
            </div>
          }
        />
      )
    }
    case 'learn': {
      const w = s.word
      return (
        <Hero
          eyebrow={w ? `Öğrenme · ${w.deck}` : 'Öğrenme'}
          title={w ? 'Günün kelimesi' : 'Kelime yok'}
          sub={s.dueWords ? `${s.dueWords} kelime tekrar bekliyor` : `${db.words.length} kelime`}
          panel={
            w ? (
              <div className="h-full flex flex-col justify-center">
                <div className="text-[40px] leading-tight font-extrabold tracking-tight truncate">{w.term}</div>
                <div className="mt-2 text-[21px] font-semibold text-sky-200/90 line-clamp-2">{w.meaning}</div>
                {w.example && <div className="mt-3 text-[16px] italic text-white/50 line-clamp-2">“{w.example}”</div>}
              </div>
            ) : (
              <Muted>Öğrenme sekmesinden kelime ekleyebilirsiniz.</Muted>
            )
          }
        />
      )
    }
    case 'chat': {
      const last = s.lastMsgs[0]
      return (
        <Hero
          eyebrow="Mesajlar"
          title={last ? `${s.member.get(last.fromId)?.name ?? 'Birisi'} yazdı` : 'Henüz mesaj yok'}
          sub={last ? relativeTime(last.at) : 'Telefondan duvara not bırakın'}
          panel={
            s.lastMsgs.length ? (
              <ul className="space-y-3">
                {s.lastMsgs.map((m) => {
                  const from = s.member.get(m.fromId)
                  return (
                    <li key={m.id} className="flex items-start gap-3">
                      <Avatar m={from} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold text-white/50">
                          {from?.name ?? '?'} · {relativeTime(m.at)}
                        </div>
                        <div className="mt-0.5 inline-block max-w-full rounded-2xl rounded-tl-md bg-white/[0.08] px-4 py-2 text-[17px] font-semibold line-clamp-2">
                          {m.text}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Muted>Mesaj geldiğinde burada görünür.</Muted>
            )
          }
        />
      )
    }
    case 'settings':
      return (
        <Hero
          eyebrow="Ayarlar"
          title="Ayarlar"
          sub="Tema, konum, ekran ve aile üyeleri"
          panel={
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                ['Tema', themeById(db.settings.theme).label],
                ['Konum', db.settings.city || HOME.city],
                ['Senkron', syncLabel(status)],
                ['Aile', `${db.members.length} kişi`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-white/45">{k}</dt>
                  <dd className="mt-1 text-[19px] font-bold truncate">{v}</dd>
                </div>
              ))}
            </dl>
          }
        />
      )
  }
}

function Muted({ children }: { children: ReactNode }) {
  return <div className="h-full grid place-items-center text-center text-[18px] font-semibold text-white/45">{children}</div>
}

function Avatar({ m, size = 30 }: { m?: Member; size?: number }) {
  return (
    <span
      className="rounded-full grid place-items-center shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: m?.color ?? '#475569', fontSize: size * 0.55 }}
    >
      {m?.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : (m?.emoji ?? '?')}
    </span>
  )
}

function Avatars({ ids, member }: { ids: (string | undefined)[]; member: Map<string, Member> }) {
  const list = ids.filter((id): id is string => !!id && member.has(id))
  if (!list.length) return null
  return (
    <span className="flex -space-x-2 shrink-0">
      {list.slice(0, 3).map((id) => (
        <Avatar key={id} m={member.get(id)} />
      ))}
    </span>
  )
}

/* ---------------- Veri ---------------- */

type Summary = ReturnType<typeof useSummary>

function useSummary(db: DB, now: Date) {
  const today = todayKey()
  const minute = Math.floor(now.getTime() / 60_000)
  return useMemo(() => {
    const t = now.getTime()
    const tomorrowKey = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
    const member = new Map(db.members.map((m) => [m.id, m]))
    const emojis = (ids: (string | undefined)[]) => ids.map((id) => (id ? member.get(id)?.emoji : '')).join('')
    const dayOf = (e: DB['events'][number]) => (e.allDay ? e.start.slice(0, 10) : dateKey(new Date(e.start)))
    const byStart = (a: DB['events'][number], b: DB['events'][number]) =>
      a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1
    const events = db.events.filter((e) => dayOf(e) === today).sort(byStart)
    const due = db.chores.filter((c) => isChoreDueToday(c, today))
    return {
      now: t,
      member,
      emojis,
      events,
      upcoming: events.filter((e) => e.allDay || new Date(e.end ?? e.start).getTime() >= t - 15 * 60_000),
      tomorrow: db.events.filter((e) => dayOf(e) === tomorrowKey).sort(byStart),
      dueCount: due.length,
      choresLeft: due.filter((c) => !isChoreDoneToday(c, today)),
      shopping: db.shopping.filter((i) => !i.done),
      meals: MEAL_SLOTS.map((sl) => ({
        key: sl.key,
        label: sl.label,
        title: db.meals.find((m) => m.date === today && m.slot === sl.key)?.title,
      })),
      tomorrowDinner: db.meals.find((m) => m.date === tomorrowKey && m.slot === 'dinner')?.title,
      tomorrowMeals: MEAL_SLOTS.map((sl) => ({
        key: sl.key,
        label: sl.label,
        title: db.meals.find((m) => m.date === tomorrowKey && m.slot === sl.key)?.title,
      })),
      tomorrowChores: db.chores.filter((c) => isChoreDueToday(c, tomorrowKey)),
      word: [...db.words].sort((a, b) => a.dueAt - b.dueAt)[0],
      dueWords: db.words.filter((w) => w.dueAt <= t).length,
      lastMsgs: db.messages.slice(-3).reverse(),
      recentMsgs: db.messages.filter((m) => t - m.at < 24 * 3_600_000).slice(-5).reverse(),
    }
    // dakikada bir yeniden hesaplanır
  }, [db, today, minute])
}
