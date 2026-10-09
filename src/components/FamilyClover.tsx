import type { Member } from '../types'
import { cx } from './ui'

/** Tombul yaprak yolu: kalp gibi, kenarları şişkin, uçta hafif girintili */
const LEAF =
  'M50 52 C 36 51, 16 46, 12 33 C 8 19, 18 8, 31 10 C 40 11, 46 17, 50 26 C 54 17, 60 11, 69 10 C 82 8, 92 19, 88 33 C 84 46, 64 51, 50 52 Z'

/**
 * Dört yapraklı tombul yonca. Her yaprak, üyenin profil fotoğrafıyla
 * neredeyse tamamen dolu (fotoğraf yaprağın içini doldurur), kenarda ince
 * beyaz çerçeve ve ortada damar görünür. Sap ortadan aşağı iner.
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
  const count = shown.length

  if (!count) {
    return (
      <div
        className={cx('rounded-full bg-white/10 grid place-items-center text-white/50 text-xl', className)}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    )
  }

  return (
    <svg
      viewBox="0 0 100 96"
      width={size}
      height={(size / 100) * 96}
      className={cx('shrink-0 overflow-visible', className)}
      aria-label="Aile yoncası"
    >
      <title>{members.map((m) => m.name).join(', ')}</title>

      <defs>
        {shown.map((m, i) => (
          <clipPath key={`c${uid}${i}`} id={`cl-${uid}-${i}`}>
            <path d={LEAF} />
          </clipPath>
        ))}
        <linearGradient id={`sg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5ee08a" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>

      {/* Sap: kısa ve ince, yoncanın altında fazla yer kaplamaz */}
      <path
        d="M50 52 C 50 62, 48 70, 46 78"
        stroke={`url(#sg${uid})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />

      {shown.map((m, i) => {
        const angle = count === 1 ? 0 : 45 + (360 / count) * i
        return (
          <g key={m.id} transform={`rotate(${angle} 50 50)`}>
            {/* Yaprak zemini (fotoğraf yoksa renk, varsa altlık) */}
            <path
              d={LEAF}
              fill={m.color}
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {m.photo ? (
              /* Fotoğraf yaprağın içini neredeyse tamamen doldurur */
              <image
                href={m.photo}
                x="10"
                y="8"
                width="80"
                height="45"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#cl-${uid}-${i})`}
              />
            ) : (
              <text
                x="50"
                y="38"
                textAnchor="middle"
                fontSize="22"
                fontWeight="800"
                fill="#ffffff"
                style={{ fontFamily: 'inherit', pointerEvents: 'none' }}
              >
                {(m.name || '?').trim().charAt(0).toLocaleUpperCase('tr')}
              </text>
            )}
            {/* Yaprak damarı: fotoğrafın üstünde ince orta çizgi */}
            <path d="M50 52 L50 12" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
          </g>
        )
      })}

      {/* Merkez düğüm */}
      <circle cx="50" cy="52" r="7" fill="#ffffff" opacity="0.94" />
      <circle cx="50" cy="52" r="3.4" fill="#22c55e" />

      {extra > 0 && (
        <g>
          <circle cx="84" cy="24" r="11" fill="#4f6ef7" stroke="#fff" strokeWidth="2.5" />
          <text x="84" y="28" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
            +{extra}
          </text>
        </g>
      )}
    </svg>
  )
}