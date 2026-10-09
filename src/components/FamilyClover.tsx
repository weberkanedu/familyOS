import type { Member } from '../types'
import { cx } from './ui'

/**
 * Aile yoncası: 1-4 kişiyi yonca (4 yaprak) düzeninde gösterir.
 * Sol menünün altında, "Senkronize" yazısının üstünde kullanılır.
 */
const SPOTS = [
  { x: 27, y: 27 }, // sol üst
  { x: 73, y: 27 }, // sağ üst
  { x: 27, y: 73 }, // sol alt
  { x: 73, y: 73 }, // sağ alt
]

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
  const petal = size * 0.52
  const face = size * 0.4

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

  return (
    <div className={cx('relative shrink-0', className)} style={{ width: size, height: size }} title={members.map((m) => m.name).join(', ')}>
      {/* yapraklar */}
      {shown.map((m, i) => (
        <span
          key={`p${m.id}`}
          className="absolute rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur"
          style={{
            left: `${SPOTS[i].x}%`,
            top: `${SPOTS[i].y}%`,
            width: petal,
            height: petal,
            transform: 'translate(-50%,-50%)',
          }}
        />
      ))}
      {/* yüzler */}
      {shown.map((m, i) => (
        <span
          key={m.id}
          className="absolute rounded-full overflow-hidden ring-2 ring-white shadow-md grid place-items-center font-extrabold text-white"
          style={{
            left: `${SPOTS[i].x}%`,
            top: `${SPOTS[i].y}%`,
            width: face,
            height: face,
            transform: 'translate(-50%,-50%)',
            backgroundColor: m.color,
            fontSize: face * 0.5,
          }}
        >
          {m.photo ? (
            <img src={m.photo} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            (m.name || '?').trim().charAt(0).toLocaleUpperCase('tr')
          )}
        </span>
      ))}
      {/* merkez */}
      {shown.length === 3 && (
        <span
          className="absolute rounded-full bg-white/30"
          style={{
            left: '50%',
            top: '50%',
            width: petal * 0.7,
            height: petal * 0.7,
            transform: 'translate(-50%,-50%)',
          }}
        />
      )}
      {extra > 0 && (
        <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-extrabold grid place-items-center ring-2 ring-ink-950">
          +{extra}
        </span>
      )}
    </div>
  )
}
