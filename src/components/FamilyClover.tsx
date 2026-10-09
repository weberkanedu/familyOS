import type { Member } from '../types'
import { cx } from './ui'

/**
 * Gerçek yonca yaprağı: her üye bir yaprağın içinde (foto veya baş harf).
 * 1 kişi → tek yaprak, 2 → karşılıklı, 3 → üç yaprak, 4 → dört yaprak (klasik yonca).
 */
export function FamilyClover({
  members,
  size = 54,
  className,
}: {
  members: Member[]
  size?: number
  className?: string
}) {
  const shown = members.slice(0, 4)
  const extra = members.length - shown.length
  const uid = Math.random().toString(36).slice(2, 8)

  if (!shown.length) {
    return (
      <div
        className={cx('rounded-full bg-white/10 grid place-items-center text-white/50 text-xl', className)}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    )
  }

  // Yaprak sayısına göre başlangıç açısı (tek yaprak yukarıda dursun)
  const startAngle = shown.length === 1 ? 0 : shown.length === 2 ? 45 : 0

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cx('shrink-0 overflow-visible', className)}
      aria-label="Aile"
    >
      <title>{members.map((m) => m.name).join(', ')}</title>
      <defs>
        {shown.map((m, i) => (
          <clipPath key={`c${uid}${i}`} id={`leaf-${uid}-${i}`}>
            <path d="M50 56 C 34 46, 32 26, 50 12 C 68 26, 66 46, 50 56 Z" />
          </clipPath>
        ))}
        {/* Sap */}
        <linearGradient id={`stem-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>

      {/* sap */}
      <path
        d="M50 58 C 50 74, 46 82, 42 92"
        stroke={`url(#stem-${uid})`}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {shown.map((m, i) => {
        const angle = startAngle + (360 / shown.length) * i
        return (
          <g key={m.id} transform={`rotate(${angle} 50 52)`}>
            {/* yaprak gövdesi */}
            <path
              d="M50 56 C 34 46, 32 26, 50 12 C 68 26, 66 46, 50 56 Z"
              fill={m.color}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2.5"
            />
            {/* orta damar */}
            <path d="M50 54 L50 16" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" />
            {m.photo ? (
              <image
                href={m.photo}
                x="36"
                y="18"
                width="28"
                height="34"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#leaf-${uid}-${i})`}
              />
            ) : (
              <text
                x="50"
                y="44"
                textAnchor="middle"
                fontSize="17"
                fontWeight="800"
                fill="#ffffff"
                style={{ fontFamily: 'inherit' }}
              >
                {(m.name || '?').trim().charAt(0).toLocaleUpperCase('tr')}
              </text>
            )}
          </g>
        )
      })}

      {/* merkez */}
      <circle cx="50" cy="55" r="5" fill="rgba(255,255,255,0.9)" />
      <circle cx="50" cy="55" r="2.4" fill="#22c55e" />

      {extra > 0 && (
        <g>
          <circle cx="88" cy="16" r="10" fill="#4f6ef7" stroke="#fff" strokeWidth="2.5" />
          <text x="88" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
            +{extra}
          </text>
        </g>
      )}
    </svg>
  )
}
