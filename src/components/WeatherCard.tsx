import { wmoLabel } from '../lib/openMeteo'
import type { WeatherData } from '../lib/openMeteo'
import { fmtDayName, fmtShort, parseKey, todayKey } from '../lib/time'
import { cx } from './ui'
import { WeatherScene } from './WeatherScene'
import { WeatherIcon } from './WeatherIcon'

export { WeatherIcon }

export function WeatherGlyph({ code, night = false, className }: { code: number; night?: boolean; className?: string }) {
  return <WeatherIcon code={code} isDay={!night} className={className} />
}

/** Kiosk/mobil için animasyonlu hava kartı (sabah tek bakışta). */
export function WeatherCard({
  data,
  city,
  loading,
  error,
  kiosk = false,
  onRetry,
}: {
  data: WeatherData | null
  city: string
  loading?: boolean
  error?: string | null
  kiosk?: boolean
  onRetry?: () => void
}) {
  if (!data) {
    return (
      <div className="relative overflow-hidden rounded-2xl text-white p-5 shadow-card h-full min-h-[180px] flex items-center">
        <WeatherScene code={2} isDay />
        <div className="relative z-10 flex items-center justify-between w-full">
          <div>
            <div className="text-sm opacity-80">{city}</div>
            <div className={cx('font-extrabold', kiosk ? 'text-3xl' : 'text-2xl')}>
              {loading ? 'Yükleniyor…' : error ? 'Hava durumu yok' : '—'}
            </div>
            {error && (
              <button onClick={onRetry} className="mt-2 text-xs underline opacity-90">
                Tekrar dene
              </button>
            )}
          </div>
          <WeatherIcon code={2} className={cx(kiosk ? 'w-24 h-24' : 'w-16 h-16')} />
        </div>
      </div>
    )
  }

  const { now, days } = data
  const rest = days.filter((d) => d.date !== todayKey()).slice(0, 3)
  const weekMin = rest.length ? Math.min(...rest.map((x) => x.min)) : now.temp
  const weekMax = rest.length ? Math.max(...rest.map((x) => x.max)) : now.temp
  const span = Math.max(1, weekMax - weekMin)

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white p-5 shadow-card h-full flex flex-col"
      key={`${now.weatherCode}-${now.isDay}`}
    >
      <WeatherScene code={now.weatherCode} isDay={now.isDay} />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold opacity-85 truncate flex items-center gap-1.5">
              <MapPinIcon />
              {city}
            </div>
            <div className={cx('font-extrabold tracking-tight leading-none mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]', kiosk ? 'text-[68px]' : 'text-5xl')}>
              {now.temp}°
            </div>
            <div className={cx('font-semibold opacity-95', kiosk ? 'text-2xl mt-2' : 'text-base mt-1')}>
              {wmoLabel(now.weatherCode)}
            </div>
            <div className={cx('opacity-85', kiosk ? 'text-lg mt-1' : 'text-sm mt-0.5')}>
              Hissedilen {now.feelsLike}° · Yağış %{now.precipProb} · Rüzgâr {now.wind} km/s
            </div>
          </div>
          <WeatherIcon
            code={now.weatherCode}
            isDay={now.isDay}
            className={cx('shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]', kiosk ? 'w-36 h-36' : 'w-24 h-24')}
          />
        </div>

        <div className={cx('grid grid-cols-3 gap-2 mt-4', kiosk && 'mt-auto pt-6 gap-3')}>
          {rest.map((d, i) => {
            const left = ((d.min - weekMin) / span) * 100
            const width = Math.max(14, ((d.max - d.min) / span) * 100)
            return (
              <div
                key={d.date}
                className="anim-rise group flex flex-col items-center rounded-2xl bg-white/15 backdrop-blur px-2 pt-2 pb-2.5 text-center hover-lift"
                style={{ animationDelay: `${i * 140}ms`, minHeight: kiosk ? 148 : 132 }}
              >
                <div className={cx('font-extrabold uppercase tracking-wide', kiosk ? 'text-base' : 'text-xs opacity-90')}>
                  {fmtDayName(parseKey(d.date), true)}
                </div>
                <div className={cx('font-bold opacity-85 tabular-nums', kiosk ? 'text-sm mt-0.5' : 'text-[11px]')}>
                  {fmtShort(d.date)}
                </div>
                <div className="my-1 anim-bob" style={{ animationDelay: `${i * 400}ms`, width: kiosk ? 48 : 38, height: kiosk ? 48 : 38 }}>
                  <WeatherIcon code={d.weatherCode} className="w-full h-full" />
                </div>
                <div className={cx('font-bold tabular-nums', kiosk ? 'text-lg' : 'text-sm')}>
                  {d.max}° <span className="opacity-70 font-medium">{d.min}°</span>
                </div>
                <div className="relative w-full h-1.5 rounded-full bg-white/25 mt-1.5 overflow-hidden">
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      left: `${left}%`,
                      width: `${Math.min(width, 100 - left)}%`,
                      background: 'linear-gradient(90deg,#67e8f9,#fde68a,#fb923c)',
                      transformOrigin: 'left',
                      animation: `fs-grow 900ms cubic-bezier(.22,1,.36,1) ${300 + i * 140}ms both`,
                    }}
                  />
                </div>
                <div className={cx('opacity-90 mt-1', kiosk ? 'text-sm' : 'text-[10px]')}>Yağış %{d.precipProb}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  )
}
