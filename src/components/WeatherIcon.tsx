import { cx } from './ui'
import { wmoGroup } from '../lib/openMeteo'

/**
 * Animasyonlu SVG hava ikonları (emoji yerine — daha şık ve tutarlı).
 * Tümü saf SVG + CSS animasyon; dış kaynak/animasyon dosyası gerektirmez.
 */
export function WeatherIcon({
  code,
  isDay = true,
  className,
}: {
  code: number
  isDay?: boolean
  className?: string
}) {
  const group = wmoGroup(code)
  const night = !isDay
  const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  const Sun = ({ small = false }: { small?: boolean }) => (
    <g>
      <circle cx="32" cy="32" r={small ? 9 : 11} fill="#fde68a" stroke="#fbbf24" strokeWidth="2" />
      {/* SMIL ile dönüş (transform-origin kaynaklı titreme olmaz) */}
      <g stroke="#fcd34d" strokeWidth="3" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 32 32"
          to="360 32 32"
          dur="22s"
          repeatCount="indefinite"
        />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r1 = small ? 12 : 15
          const r2 = small ? 17 : 21
          const rad = (deg * Math.PI) / 180
          return (
            <line
              key={deg}
              x1={32 + r1 * Math.cos(rad)}
              y1={32 + r1 * Math.sin(rad)}
              x2={32 + r2 * Math.cos(rad)}
              y2={32 + r2 * Math.sin(rad)}
            />
          )
        })}
      </g>
    </g>
  )

  const Moon = () => (
    <g>
      <path
        d="M40 14a18 18 0 1 0 10 26A15 15 0 0 1 40 14Z"
        fill="#e2e8f0"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <g fill="#f8fafc" style={{ animation: 'fs-twinkle 2.4s ease-in-out infinite', transformOrigin: '20px 20px' }}>
        <circle cx="18" cy="18" r="1.8" />
        <circle cx="14" cy="30" r="1.4" />
        <circle cx="24" cy="10" r="1.3" />
      </g>
    </g>
  )

  const Cloud = ({ dx = 0, dy = 0, opacity = 1, scale = 1 }: { dx?: number; dy?: number; opacity?: number; scale?: number }) => (
    <g transform={`translate(${dx} ${dy}) scale(${scale})`} opacity={opacity}>
      <path
        d="M18 44h26a9 9 0 0 0 1-18 13 13 0 0 0-24-3 10 10 0 0 0-3 21Z"
        fill="#ffffff"
        stroke="#dbe3ee"
        strokeWidth="2"
      />
    </g>
  )

  const RainLines = () => (
    <g stroke="#93c5fd" strokeWidth="3.4" strokeLinecap="round">
      {[22, 32, 42].map((x, i) => (
        <line
          key={x}
          x1={x}
          y1={46}
          x2={x - 3}
          y2={58}
          style={{ animation: `fs-drop ${0.9 + i * 0.15}s linear ${i * 0.22}s infinite` }}
        />
      ))}
    </g>
  )

  const SnowDots = () => (
    <g fill="#e0f2fe">
      {[22, 32, 42].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={52 + (i % 2) * 6}
          r="2.6"
          style={{ animation: `fs-dropy ${1.1 + i * 0.2}s ease-in-out ${i * 0.3}s infinite` }}
        />
      ))}
    </g>
  )

  const Bolt = () => (
    <path
      d="M33 45l-7 9h5l-2 9 9-12h-5l3-6Z"
      fill="#fcd34d"
      stroke="#f59e0b"
      strokeWidth="1.6"
      style={{ animation: 'fs-flash-sm 2.6s ease-in-out infinite' }}
    />
  )

  const FogLines = () => (
    <g stroke="#cbd5e1" strokeWidth="3.4" strokeLinecap="round">
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1={18 - i * 2}
          y1={44 + i * 6}
          x2={48 + i * 2}
          y2={44 + i * 6}
          style={{ animation: `fs-slide ${2 + i * 0.5}s ease-in-out ${i * 0.4}s infinite alternate` }}
        />
      ))}
    </g>
  )

  return (
    <svg viewBox="0 0 64 64" className={cx('leading-none', className)} aria-hidden="true">
      {(group === 'clear' || group === 'cloud') && (
        <g style={{ animation: 'fs-bob 4s ease-in-out infinite' }}>
          {night ? <Moon /> : <Sun small={group === 'cloud'} />}
          {group === 'cloud' && <Cloud dy={10} scale={0.95} />}
        </g>
      )}

      {group === 'rain' && (
        <g>
          <g style={{ animation: 'fs-drift-small 5s ease-in-out infinite alternate' }}>
            <Cloud />
          </g>
          <RainLines />
        </g>
      )}

      {group === 'storm' && (
        <g>
          <Cloud />
          <Bolt />
          <RainLines />
        </g>
      )}

      {group === 'snow' && (
        <g>
          <Cloud />
          <SnowDots />
        </g>
      )}

      {group === 'fog' && (
        <g>
          <Cloud opacity={0.75} dy={-4} />
          <FogLines />
        </g>
      )}
    </svg>
  )
}

/** Küçük yer tutucu (boş durum) */
export function WeatherIconGhost({ className }: { className?: string }) {
  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg viewBox="0 0 64 64" className={cx('opacity-40', className)} aria-hidden="true">
      <g {...strokeProps}>
        <circle cx="32" cy="32" r="11" />
        <path d="M18 46h26a9 9 0 0 0 1-18 13 13 0 0 0-24-3 10 10 0 0 0-3 21Z" />
      </g>
    </svg>
  )
}
