import type { Member } from '../types'
import { cx } from './ui'

/**
 * Gerçek dört yapraklı yonca: kalp biçimli yapraklar, merkezde birleşir,
 * ortasından dört yaprak açılır ve tek bir sap aşağı iner.
 * Her yaprağın ortasında üyenin fotoğrafı (yoksa baş harf) yer alır.
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

  // Tek üye: yaprak yukarıda dursun ve sap aşağı insin
  const count = shown.length

  return (
    <svg
      viewBox="0 0 100 112"
      width={size}
      height={(size / 100) * 112}
      className={cx('shrink-0 overflow-visible', className)}
      aria-label="Aile yoncası"
    >
      <title>{members.map((m) => m.name).join(', ')}</title>

      <defs>
        {shown.map((m, i) => (
          <clipPath key={`leaf${uid}${i}`} id={`cl-${uid}-${i}`}>
            {/* Tek yaprak: merkezden (50,50) yukarı açılan kalp biçimli yaprak */}
            <path d="M50 50 C 34 42, 22 34, 22 24 C 22 14, 33 10, 41 18 C 45 22, 48 27, 50 32 C 52 27, 55 22, 59 18 C 67 10, 78 14, 78 24 C 78 34, 66 42, 50 50 Z" />
          </clipPath>
        ))}
        <linearGradient id={`stemg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5ee08a" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>

      {/* Sap: merkezden aşağı doğru kıvrılır */}
      <path
        d="M50 50 C 50 66, 47 78, 43 92 C 41 99, 40 104, 40 108"
        stroke={`url(#stemg${uid})`}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {shown.map((m, i) => {
        // 4 üye → 45° şekilde dört yöne; 2 üye → çapraz; 1 üye → yukarı
        const angle = count === 1 ? 0 : 45 + (360 / count) * i
        const photoLeaf = i
        return (
          <g key={m.id} transform={`rotate(${angle} 50 50)`}>
            <path
              d="M50 50 C 34 42, 22 34, 22 24 C 22 14, 33 10, 41 18 C 45 22, 48 27, 50 32 C 52 27, 55 22, 59 18 C 67 10, 78 14, 78 24 C 78 34, 66 42, 50 50 Z"
              fill={m.color}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Yaprak damarı: merkezden uca */}
            <path d="M50 50 L50 16" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round" />
            {m.photo ? (
              <image
                href={m.photo}
                x="26"
                y="12"
                width="48"
                height="38"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#cl-${uid}-${photoLeaf})`}
              />
            ) : (
              <text
                x="50"
                y="30"
                textAnchor="middle"
                fontSize="17"
                fontWeight="800"
                fill="#ffffff"
                style={{ fontFamily: 'inherit', pointerEvents: 'none' }}
              >
                {(m.name || '?').trim().charAt(0).toLocaleUpperCase('tr')}
              </text>
            )}
          </g>
        )
      })}

      {/* Merkez: dört yaprağın birleştiği nokta */}
      <circle cx="50" cy="50" r="6" fill="#ffffff" opacity="0.92" />
      <circle cx="50" cy="50" r="3" fill="#22c55e" />

      {extra > 0 && (
        <g>
          <circle cx="86" cy="22" r="11" fill="#4f6ef7" stroke="#fff" strokeWidth="2.5" />
          <text x="86" y="26" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
            +{extra}
          </text>
        </g>
      )}
    </svg>
  )
}