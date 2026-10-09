import { useId } from 'react'
import type { Member } from '../types'
import { cx } from './ui'

/**
 * Yaprak yolu.
 *
 * Ölçü kuralı: merkez (50,50) etrafında en fazla ~76° açı kaplamalı.
 * 4 kişi → 90°'lik dilimler, 3 kişi → 120°, 2 kişi → 180°: hepsi
 * sığdığı için yapraklar asla üst üste binmez, her kişi tam bir yaprak alır.
 * (Ölçüm: scripts/clover-check.mjs)
 *
 * Şekil: merkeze bakan tombul uç + iki yanda yumuşak lob + dışta hafif girinti.
 */
const LEAF =
  'M50 50 C 46.6 45.2, 38 42.4, 38 32.5 C 38 24, 44.4 19.4, 48.6 22.4 C 49 22.8, 49.2 23.3, 49.4 23.9 C 49.6 23.3, 49.8 22.8, 50.2 22.4 C 54.4 19.4, 60.8 24, 60.8 32.5 C 60.8 42.4, 52.2 45.2, 50 50 Z'

const LEAF_BOX = { x: 36, y: 21, w: 26, h: 30 }

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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
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

  /* 1 kişi → düz yukarı, 2 → çapraz, 3 → 120°, 4 → 90° (klasik yonca) */
  const start = count === 1 ? 0 : count === 2 ? 45 : 0
  const step = 360 / count

  return (
    <svg
      viewBox="0 0 100 76"
      width={size}
      height={(size / 100) * 76}
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

      {/* Sap: merkezden kısa ve ince aşağı */}
      <path
        d="M50 50 C 50 57, 48.6 61, 47 66"
        stroke={`url(#sg${uid})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {shown.map((m, i) => {
        const angle = start + step * i
        return (
          <g key={m.id} transform={`rotate(${angle} 50 50)`}>
            {/* Yaprak zemini */}
            <path
              d={LEAF}
              fill={m.color}
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {m.photo ? (
              /* Fotoğraf yalnızca kendi yaprağının maskesiyle kırpılır */
              <g clipPath={`url(#cl-${uid}-${i})`}>
                <image
                  href={m.photo}
                  x={LEAF_BOX.x}
                  y={LEAF_BOX.y}
                  width={LEAF_BOX.w}
                  height={LEAF_BOX.h}
                  preserveAspectRatio="xMidYMid slice"
                />
              </g>
            ) : (
              <text
                x="50"
                y="41"
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                fill="#ffffff"
                style={{ fontFamily: 'inherit', pointerEvents: 'none' }}
              >
                {(m.name || '?').trim().charAt(0).toLocaleUpperCase('tr')}
              </text>
            )}
            {/* Orta damar */}
            <path d="M50 50 L50 24" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        )
      })}

      {/* Merkez dugum (yoncanin tam merkezi) */}
      <circle cx="50" cy="50" r="3.6" fill="#ffffff" opacity="0.94" />
      <circle cx="50" cy="50" r="1.8" fill="#22c55e" />

      {extra > 0 && (
        <g>
          <circle cx="84" cy="16" r="10" fill="#4f6ef7" stroke="#fff" strokeWidth="2.2" />
          <text x="84" y="20" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff">
            +{extra}
          </text>
        </g>
      )}
    </svg>
  )
}
