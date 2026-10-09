import { condOf } from '../lib/weatherStyle'

/**
 * Büyük, animasyonlu hava illüstrasyonu (ekteki referanslardaki kompozisyon):
 * güneş/ay + katmanlı bulutlar + yağış/kar/şimşek/sis.
 */
export function WeatherArt({
  code,
  isDay = true,
  className,
}: {
  code: number
  isDay?: boolean
  className?: string
}) {
  const cond = condOf(code)
  const dark = !isDay || cond === 'storm' || cond === 'rain'

  const Sun = () => (
    <g>
      <circle cx="118" cy="46" r="24" fill="#fde68a" stroke="#fbbf24" strokeWidth="2" />
      {/* SMIL: transform-origin sorunu olmadan merkez etrafında döner */}
      <g stroke="#fcd34d" strokeWidth="4" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 118 46"
          to="360 118 46"
          dur="26s"
          repeatCount="indefinite"
        />
        {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg) => {
          const rad = (deg * Math.PI) / 180
          return (
            <line
              key={deg}
              x1={118 + 30 * Math.cos(rad)}
              y1={46 + 30 * Math.sin(rad)}
              x2={118 + 40 * Math.cos(rad)}
              y2={46 + 40 * Math.sin(rad)}
            />
          )
        })}
      </g>
    </g>
  )

  const Moon = () => (
    <g>
      <path d="M132 20a30 30 0 1 0 17 44A25 25 0 0 1 132 20Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
      <g fill="#f8fafc" style={{ transformOrigin: '70px 30px', animation: 'fs-twinkle 2.2s ease-in-out infinite' }}>
        <circle cx="70" cy="28" r="3" />
        <circle cx="58" cy="44" r="2.2" />
        <circle cx="84" cy="16" r="2" />
      </g>
    </g>
  )

  const Cloud = ({
    x = 0,
    y = 0,
    s = 1,
    o = 1,
  }: {
    x?: number
    y?: number
    s?: number
    o?: number
  }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <ellipse cx="86" cy="66" rx="54" ry="30" fill={dark ? '#cbd5e1' : '#ffffff'} />
      <ellipse cx="52" cy="74" rx="30" ry="20" fill={dark ? '#cbd5e1' : '#ffffff'} />
      <ellipse cx="120" cy="76" rx="32" ry="19" fill={dark ? '#dbe4ee' : '#ffffff'} />
      <ellipse cx="86" cy="52" rx="30" ry="20" fill={dark ? '#e2e8f0' : '#ffffff'} />
    </g>
  )

  return (
    <svg viewBox="0 0 200 130" className={className} aria-hidden="true">
      {(cond === 'clear' || cond === 'partly') && (isDay ? <Sun /> : <Moon />)}
      {cond === 'clear' && !isDay && (
        <g fill="#f8fafc" style={{ animation: 'fs-twinkle 3s ease-in-out infinite' }}>
          <circle cx="40" cy="70" r="2.4" />
          <circle cx="60" cy="96" r="2" />
        </g>
      )}

      {cond === 'partly' && (
        <g style={{ animation: 'fs-drift-small 6s ease-in-out infinite alternate' }}>
          <Cloud x={cond === 'partly' ? -6 : 0} y={cond === 'partly' ? 18 : 10} s={1.15} />
        </g>
      )}
      {cond === 'cloudy' && (
        <>
          <Cloud x={-14} y={16} s={0.95} o={0.75} />
          <Cloud x={16} y={28} s={1.05} />
        </>
      )}
      {(cond === 'rain' || cond === 'snow' || cond === 'storm') && <Cloud x={4} y={6} s={1.1} />}
      {cond === 'fog' && <Cloud x={0} y={-4} s={1.05} o={0.8} />}

      {/* yağmur */}
      {cond === 'rain' && (
        <g stroke="#bae6fd" strokeWidth="5" strokeLinecap="round">
          {[52, 76, 100, 124, 146].map((x, i) => (
            <line key={x} x1={x} y1={100} x2={x - 6} y2={120} style={{ animation: `fs-drop ${0.85 + (i % 3) * 0.15}s linear ${i * 0.16}s infinite` }} />
          ))}
        </g>
      )}
      {cond === 'storm' && (
        <>
          <g stroke="#bae6fd" strokeWidth="5" strokeLinecap="round">
            {[56, 126, 148].map((x, i) => (
              <line key={x} x1={x} y1={102} x2={x - 6} y2={120} style={{ animation: `fs-drop ${0.8}s linear ${i * 0.2}s infinite` }} />
            ))}
          </g>
          <path d="M104 96l-14 20h9l-4 16 18-24h-9l6-12Z" fill="#fde047" stroke="#f59e0b" strokeWidth="2" style={{ animation: 'fs-flash-sm 2.2s ease-in-out infinite' }} />
        </>
      )}
      {/* kar */}
      {cond === 'snow' && (
        <g fill="#f0f9ff">
          {[50, 72, 96, 120, 144].map((x, i) => (
            <circle key={x} cx={x} cy={106 + (i % 2) * 10} r="5" style={{ animation: `fs-dropy ${1 + i * 0.18}s ease-in-out ${i * 0.25}s infinite` }} />
          ))}
        </g>
      )}
      {/* sis */}
      {cond === 'fog' && (
        <g stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round">
          {[0, 1, 2].map((i) => (
            <line key={i} x1={40 + i * 6} y1={100 + i * 10} x2={160 - i * 6} y2={100 + i * 10} style={{ animation: `fs-slide ${2 + i * 0.4}s ease-in-out ${i * 0.4}s infinite alternate` }} />
          ))}
        </g>
      )}
    </svg>
  )
}
