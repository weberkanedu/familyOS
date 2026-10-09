import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { wmoLabel } from '../lib/openMeteo'
import type { WeatherData } from '../lib/openMeteo'
import { styleFor, dirLabel } from '../lib/weatherStyle'
import { fmtDayName, fmtShort, parseKey, todayKey } from '../lib/time'
import { cx } from './ui'
import { WeatherScene } from './WeatherScene'
import { WeatherArt } from './WeatherArt'

const DAY_COUNT = 5
const SWIPE_PX = 40

/** Tailwind'in üretebilmesi için sabit sınıflar */
const COLS: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' }

export interface WeatherWidgetProps {
  data: WeatherData | null
  city: string
  loading?: boolean
  error?: string | null
  kiosk?: boolean
  /** Kompakt: üst bant için tek satır haplar */
  compact?: boolean
  locations?: { label: string; lat: number; lon: number; home?: boolean }[]
  locationIndex?: number
  onLocationChange?: (index: number) => void
  onRetry?: () => void
}

function useSwipe(count: number, index: number, onChange: (i: number) => void) {
  const startX = useRef<number | null>(null)
  return {
    onPointerDown: (e: React.PointerEvent) => {
      startX.current = e.clientX
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (startX.current === null) return
      const dx = e.clientX - startX.current
      startX.current = null
      if (Math.abs(dx) < SWIPE_PX || count < 2) return
      const next = dx < 0 ? index + 1 : index - 1
      if (next >= 0 && next < count) onChange(next)
    },
    onPointerCancel: () => {
      startX.current = null
    },
  }
}

/**
 * Hava widget'ı
 * - compact: üst bant — koşul renkli "bugün" hapı + 5 günlük haplar
 * - normal : tam genişlik — Seattle tarzı detaylı bugün kartı + gün hapları
 */
export function WeatherWidget({
  data,
  city,
  loading,
  error,
  kiosk = false,
  compact = false,
  locations = [],
  locationIndex = 0,
  onLocationChange,
  onRetry,
}: WeatherWidgetProps) {
  const days = data?.days ?? []
  const today = days.find((d) => d.date === todayKey()) ?? days[0]
  const future = days.filter((d) => d.date !== todayKey()).slice(0, DAY_COUNT)
  const swipe = useSwipe(locations.length, locationIndex, (i) => onLocationChange?.(i))
  const now = data?.now
  const todayStyle = now ? styleFor(now.weatherCode, now.isDay) : styleFor(2, true)
  const lightText = todayStyle.text === 'light'
  const [picked, setPicked] = useState<{ day: WeatherData['days'][number] } | null>(null)

  /* Seçilen günün büyük kartı (boşluğa / kapat düğmesine tıklayınca kapanır) */
  const pickedStyle = picked ? styleFor(picked.day.weatherCode, true) : null
  const pickedText = pickedStyle?.text === 'light'

  /* ============ KOMPAKT: üst bant ============ */
  if (compact) {
    return (
      <>
        <div
          className="anim-rise flex items-stretch gap-2 select-none"
          onPointerDown={swipe.onPointerDown}
          onPointerUp={swipe.onPointerUp}
          onPointerCancel={swipe.onPointerCancel}
          title={locations.length > 1 ? 'Kaydırarak şehir değiştirin' : undefined}
        >
        {/* Bugün hapı */}
        <button
          type="button"
          onClick={() => today && setPicked({ day: today })}
          className="relative overflow-hidden rounded-2xl px-4 py-2 flex items-center gap-2.5 h-[92px] min-w-[236px] shadow-[0_12px_30px_-18px_rgba(15,23,42,0.6)] touch-manipulation hover:scale-[1.02] transition-transform"
          style={{ background: todayStyle.bg }}
          title="Bugünün detayı"
        >
          <div className="min-w-0 text-left">
            <div className={cx('flex items-center gap-1 text-[10px] font-bold truncate', lightText ? 'text-white/90' : 'text-slate-600')}>
              <PinIcon />
              <span className="max-w-[96px] truncate">{city}</span>
              {locations.length > 1 && <span className="opacity-75">{locationIndex + 1}/{locations.length}</span>}
            </div>
            <div className="flex items-end gap-1 mt-0.5">
              <span className={cx('text-[38px] font-extrabold leading-none tabular-nums tracking-tight drop-shadow-sm', lightText ? 'text-white' : 'text-slate-900')}>
                {now ? `${now.temp}°` : '—'}
              </span>
              {now && (
                <span className={cx('text-[12px] font-bold mb-1 tabular-nums', lightText ? 'text-white/85' : 'text-slate-500')}>
                  /{now.feelsLike}°
                </span>
              )}
            </div>
            <div className={cx('text-[11px] font-bold mt-0.5 truncate max-w-[120px]', lightText ? 'text-white/95' : 'text-slate-700')}>
              {now ? wmoLabel(now.weatherCode) : loading ? 'yükleniyor…' : error ? 'veri yok' : '—'}
            </div>
          </div>
          <WeatherArt code={now?.weatherCode ?? 2} isDay={now?.isDay ?? true} className="w-[92px] h-[72px] shrink-0 -mr-1" />
        </button>

        {/* 5 günlük haplar */}
        <div className="flex items-stretch gap-2">
          {future.length === 0
            ? Array.from({ length: DAY_COUNT }).map((_, i) => (
                <div key={i} className="w-[74px] h-[92px] rounded-2xl glass-soft grid place-items-center text-xs font-bold text-slate-400">
                  —
                </div>
              ))
            : future.map((d) => {
                const st = styleFor(d.weatherCode, true)
                const t = st.text === 'light'
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setPicked({ day: d })}
                    className="relative overflow-hidden rounded-2xl px-1.5 py-2 w-[74px] h-[92px] flex flex-col items-center shadow-[0_10px_26px_-18px_rgba(15,23,42,0.6)] touch-manipulation hover:scale-[1.03] transition-transform"
                    style={{ background: st.bg }}
                  >
                    <div className={cx('text-[10px] font-extrabold uppercase tracking-wide', t ? 'text-white/95' : 'text-slate-700')}>
                      {fmtDayName(parseKey(d.date), true)}
                    </div>
                    <div className={cx('text-[9px] font-bold tabular-nums', t ? 'text-white/75' : 'text-slate-500')}>
                      {fmtShort(d.date)}
                    </div>
                    <WeatherArt code={d.weatherCode} className="w-full flex-1 my-0.5" />
                    <div className={cx('text-[14px] font-extrabold tabular-nums leading-none', t ? 'text-white drop-shadow-sm' : 'text-slate-900')}>
                      {d.max}°
                    </div>
                    <div className={cx('text-[10px] font-bold tabular-nums leading-none', t ? 'text-white/80' : 'text-slate-500')}>
                      {d.min}° · {d.precipProb}%
                    </div>
                  </button>
                )
              })}
        </div>
        </div>
        {picked && pickedStyle && (
          <DayDetail
            day={picked.day}
            city={city}
            bg={pickedStyle.bg}
            light={pickedText}
            onClose={() => setPicked(null)}
          />
        )}
      </>
    )
  }

  /* ============ TAM GENİŞLİK: detaylı bugün + günler ============ */
  return (
    <div className="anim-rise grid gap-3 lg:grid-cols-[minmax(320px,1.15fr)_1fr]">
      {/* ---- Bugün (Seattle tarzı) ---- */}
      <div className="relative overflow-hidden rounded-2xl text-white shadow-[0_16px_44px_-26px_rgba(15,23,42,0.6)] min-h-[300px]">
        {now ? <WeatherScene code={now.weatherCode} isDay={now.isDay} /> : <div className="absolute inset-0" style={{ background: todayStyle.bg }} />}

        {/* üst satır: konum + tarih */}
        <div className="relative z-10 flex items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-white/95">
              <PinIcon />
              <span className="truncate text-lg">{city}</span>
              {locations.length > 1 && <span className="text-xs opacity-80">{locationIndex + 1}/{locations.length}</span>}
            </div>
            <div className="mt-1 text-sm font-bold text-white/85 leading-tight">
              {today ? `${fmtDayName(parseKey(today.date))}, ${fmtShort(today.date)}` : ''}
            </div>
          </div>
          {error && (
            <button onClick={onRetry} className="text-xs font-bold underline bg-white/20 rounded-lg px-2 py-1">
              Tekrar dene
            </button>
          )}
        </div>

        {/* orta: büyük illüstrasyon */}
        <div className="relative z-10 flex justify-center -mt-2">
          <WeatherArt
            code={now?.weatherCode ?? 2}
            isDay={now?.isDay ?? true}
            className={cx('drop-shadow-[0_10px_26px_rgba(0,0,0,0.35)]', kiosk ? 'w-[260px] h-[170px]' : 'w-[210px] h-[138px]')}
          />
        </div>

        {/* alt: sıcaklık + hissedilen + durum */}
        <div className="relative z-10 px-5 pb-5 -mt-3">
          <div className="flex items-end gap-4">
            <div className="flex items-center gap-1.5">
              <ThermometerIcon />
              <span className="text-[54px] font-extrabold leading-none tabular-nums tracking-tight drop-shadow">
                {now ? `${now.temp}°` : '—'}
              </span>
            </div>
            {now && (
              <div className="pb-2">
                <div className="text-sm font-bold opacity-90">Hissedilen {now.feelsLike}°</div>
                <div className="text-sm font-bold opacity-75">Rüzgâr {now.wind} km/s</div>
              </div>
            )}
          </div>
          <div className="mt-1 text-lg font-bold opacity-95">
            {now ? wmoLabel(now.weatherCode) : loading ? 'Yükleniyor…' : error ? 'Hava durumu yok' : '—'}
          </div>
        </div>

        {/* sağ: detay listesi */}
        {now && today && (
          <ul className="relative z-10 absolute right-5 top-[86px] space-y-1.5 text-sm font-bold">
            {[
              { icon: <SunriseIcon />, text: `Gün doğumu ${today.sunrise ?? '—'}` },
              { icon: <SunsetIcon />, text: `Gün batımı ${today.sunset ?? '—'}` },
              { icon: <DropIcon />, text: `Yağış %${now.precipProb}` },
              { icon: <WindIcon />, text: `Rüzgâr ${now.wind} km/s` },
              { icon: <CompassIcon />, text: dirLabel(now.windDir) },
              { icon: <GaugeIcon />, text: now.pressure ? `${Math.round(now.pressure)} hPa` : '—' },
            ].map((r) => (
              <li key={r.text} className="flex items-center gap-2 text-white/95 drop-shadow-sm whitespace-nowrap">
                <span className="w-5 grid place-items-center opacity-90">{r.icon}</span>
                {r.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- Günler ---- */}
      <div className={cx('grid gap-3', `sm:grid-cols-${Math.min(DAY_COUNT, Math.max(2, future.length))}`)}>
        {future.length === 0
          ? Array.from({ length: DAY_COUNT }).map((_, i) => (
              <div key={i} className="rounded-2xl glass-soft p-4 grid place-items-center text-sm font-bold text-slate-400 min-h-[150px]">
                —
              </div>
            ))
          : future.map((d, i) => {
              const st = styleFor(d.weatherCode, true)
              const t = st.text === 'light'
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setPicked({ day: d })}
                  className="anim-rise relative overflow-hidden rounded-2xl p-3 flex flex-col items-center min-h-[150px] shadow-[0_12px_30px_-20px_rgba(15,23,42,0.6)] hover-lift cursor-pointer touch-manipulation"
                  style={{ background: st.bg, animationDelay: `${i * 90}ms` }}
                >
                  <div className={cx('text-xs font-extrabold uppercase tracking-wide', t ? 'text-white/95' : 'text-slate-700')}>
                    {fmtDayName(parseKey(d.date), true)}
                  </div>
                  <div className={cx('text-[10px] font-bold tabular-nums', t ? 'text-white/75' : 'text-slate-500')}>
                    {fmtShort(d.date)}
                  </div>
                  <WeatherArt code={d.weatherCode} className="w-full flex-1 my-1" />
                  <div className={cx('text-xl font-extrabold tabular-nums leading-none', t ? 'text-white drop-shadow-sm' : 'text-slate-900')}>
                    {d.max}°
                  </div>
                  <div className={cx('text-xs font-bold tabular-nums', t ? 'text-white/85' : 'text-slate-600')}>
                    {d.min}° · 💧{d.precipProb}%
                  </div>
                </button>
              )
            })}
      </div>

      {picked && pickedStyle && (
        <DayDetail day={picked.day} city={city} bg={pickedStyle.bg} light={pickedText} onClose={() => setPicked(null)} />
      )}
    </div>
  )
}

/** Tıklanan günün büyük kartı — boşluğa dokununca kapanır (portal ile) */
function DayDetail({
  day,
  city,
  bg,
  light,
  onClose,
}: {
  day: WeatherData['days'][number]
  city: string
  bg: string
  light: boolean
  onClose: () => void
}) {
  const content = (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm animate-fade-in" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-kiosk animate-pop my-auto"
        style={{ background: bg }}
      >
        <WeatherScene code={day.weatherCode} isDay />
        <div className="relative z-10 p-6 text-center">
          <div className={cx('flex items-center justify-between text-sm font-bold', light ? 'text-white/90' : 'text-slate-600')}>
            <span>{city}</span>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full grid place-items-center bg-black/15 hover:bg-black/25 text-lg font-bold"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          <div className={cx('mt-1 text-lg font-extrabold', light ? 'text-white' : 'text-slate-800')}>
            {fmtDayName(parseKey(day.date))}, {fmtShort(day.date)}
          </div>

          <WeatherArt code={day.weatherCode} className="w-[220px] h-[140px] mx-auto my-2" />

          <div className={cx('text-5xl font-extrabold tabular-nums drop-shadow-sm', light ? 'text-white' : 'text-slate-900')}>
            {day.max}°
          </div>
          <div className={cx('text-2xl font-bold tabular-nums', light ? 'text-white/85' : 'text-slate-600')}>
            {day.min}°
          </div>
          <div className={cx('mt-1 text-base font-bold', light ? 'text-white/95' : 'text-slate-700')}>
            {wmoLabel(day.weatherCode)}
          </div>

          <div className={cx('mt-4 pt-3 grid grid-cols-2 gap-2 text-sm font-bold border-t', light ? 'border-white/25 text-white/95' : 'border-black/10 text-slate-700')}>
            <div>💧 Yağış %{day.precipProb}</div>
            <div>🌅 Doğum {day.sunrise ?? '—'}</div>
            <div>🌇 Batım {day.sunset ?? '—'}</div>
            <div>🌡️ Gün içi {day.max - day.min}° fark</div>
          </div>
        </div>
      </div>
    </div>
  )
  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

/* ---------- inline SVG ikonlar ---------- */
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  )
}
function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2.7 6.6 9.3A7.5 7.5 0 1 0 17.4 9.3L12 2.7Z" />
    </svg>
  )
}
function WindIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M3 8h11a3 3 0 1 0-3-3H9a5 5 0 1 1 5 5H3Zm0 5h15a2 2 0 1 1-2 2h-1a4 4 0 1 0 4 4H3a4 4 0 1 1 0-8h15a1 1 0 1 0 0-2H3Zm0 6h6v3H3a1.5 1.5 0 0 1 0-3Z" />
    </svg>
  )
}
function SunriseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M4 18h16v2H4v-2Zm2-4h12v2H6v-2Zm1-3h10l-2.2-3.2a1 1 0 0 0-1.7 0L13 11H9Zm-2.6 8L12 24l7.6-5H4.4Z" />
    </svg>
  )
}
function SunsetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M4 18h16v2H4v-2Zm2-4h12v2H6v-2Zm1-3h10l-2.2 3.2a1 1 0 0 1-1.7 0L13 11H9Zm-2.6 8L12 4l7.6 15H4.4Z" />
    </svg>
  )
}
function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.5 6.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  )
}
function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-9 9 1 1 0 0 0 2 0 7 7 0 0 1 14 0 1 1 0 1 1 0 0 0 2 0 9 9 0 0 0-9-9Zm1 5a1 1 0 0 1 1 1v3.6l2.3 1.3a1 1 0 0 1-1 1.7l-3-1.7A1 1 0 0 1 12 13V9a1 1 0 0 1 1-1Z" />
    </svg>
  )
}
function ThermometerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true">
      <path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Zm-2-11a1 1 0 1 1 1 1v10.4l.6.4a2 2 0 1 1-2.2 3.3A2 2 0 0 1 9 16.6l.6-.4V5a2 2 0 0 1 2-2Zm0 15.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z" />
    </svg>
  )
}
