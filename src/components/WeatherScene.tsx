/**
 * Animasyonlu hava durumu sahnesi (saf CSS, hafif).
 * Kod grubuna göre gökyüzü gradyanı + güneş/ay + bulut + yağmur/kar/fırtına/sis geçişleri.
 */
import { wmoGroup } from '../lib/openMeteo'
import { cx } from './ui'
import { TV } from '../lib/tv'

function rand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Gece yıldızları (sadece koyu sahnelerde) */
function Stars() {
  return (
    <>
      {Array.from({ length: 26 }).map((_, i) => {
        const left = rand(i, 11) * 100
        const top = rand(i, 12) * 88
        const size = 1.6 + rand(i, 13) * 2.6
        const dur = 2.4 + rand(i, 14) * 3.4
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              opacity: 0.35 + rand(i, 15) * 0.5,
              boxShadow: '0 0 6px rgba(255,255,255,0.8)',
              animation: `fs-twinkle ${dur}s ease-in-out ${-rand(i, 16) * dur}s infinite`,
            }}
          />
        )
      })}
    </>
  )
}

/** Yağmur damlaları (iki katman → derinlik hissi) */
function Drops({ count = 30, fast = false }: { count?: number; fast?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const left = rand(i, 1) * 100
        const delay = -rand(i, 2) * 2
        const dur = (fast ? 0.42 : 0.75) + rand(i, 3) * (fast ? 0.25 : 0.45)
        const op = 0.4 + rand(i, 4) * 0.5
        const h = fast ? 34 : 26
        return (
          <span
            key={i}
            className="absolute top-0 rounded-full"
            style={{
              left: `${left}%`,
              width: fast ? 3 : 2,
              height: h,
              opacity: op,
              background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%)',
              filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))',
              animation: `fs-rain ${dur}s linear ${delay}s infinite`,
            }}
          />
        )
      })}
    </>
  )
}

/** Kar taneleri */
function Flakes({ count = 26 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const left = rand(i, 5) * 100
        const delay = -rand(i, 6) * 8
        const dur = 3.5 + rand(i, 7) * 4
        const size = 4 + rand(i, 8) * 6
        return (
          <span
            key={i}
            className="absolute top-0 rounded-full bg-white"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              opacity: 0.65 + rand(i, 9) * 0.35,
              boxShadow: '0 0 6px rgba(255,255,255,0.8)',
              animation: `fs-snow ${dur}s linear ${delay}s infinite`,
            }}
          />
        )
      })}
    </>
  )
}

/** Sürüklenen bulut katmanları (arkada + önde hız farkı) */
function Clouds({ count = 3, dark = false }: { count?: number; dark?: boolean }) {
  return (
    <>
      {/* arka katman: yavaş, soluk */}
      {Array.from({ length: count }).map((_, i) => {
        const top = 6 + rand(i, 30) * 40
        const size = 110 + rand(i, 31) * 130
        const dur = 34 + rand(i, 32) * 22
        return (
          <span
            key={`b${i}`}
            className={cx('absolute rounded-full', dark ? 'bg-slate-700/40' : 'bg-white/25')}
            style={{
              top: `${top}%`,
              width: size,
              height: size * 0.36,
              filter: 'blur(6px)',
              animation: `fs-drift ${dur}s linear ${-rand(i, 33) * 30}s infinite`,
            }}
          />
        )
      })}
      {/* ön katman: hızlı, belirgin */}
      {Array.from({ length: count }).map((_, i) => {
        const top = 18 + rand(i, 34) * 52
        const size = 80 + rand(i, 35) * 120
        const dur = 13 + rand(i, 36) * 11
        const rev = i % 2 === 1
        return (
          <span
            key={`f${i}`}
            className={cx('absolute rounded-full', dark ? 'bg-slate-800/55' : 'bg-white/55')}
            style={{
              top: `${top}%`,
              width: size,
              height: size * 0.42,
              filter: 'blur(1px)',
              boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.25)' : '0 6px 20px rgba(255,255,255,0.35)',
              animation: `${rev ? 'fs-drift-rev' : 'fs-drift'} ${dur}s linear ${-rand(i, 37) * 20}s infinite`,
            }}
          />
        )
      })}
    </>
  )
}

export function WeatherScene({ code, isDay = true }: { code: number; isDay?: boolean }) {
  const group = wmoGroup(code)
  const rain = group === 'rain' || group === 'storm'
  const snow = group === 'snow'

  const sky = (() => {
    switch (group) {
      case 'clear':
        return isDay
          ? 'linear-gradient(160deg,#22a5f5 0%,#4f8ef7 45%,#8fb3ff 100%)'
          : 'linear-gradient(160deg,#0b1226 0%,#1c2748 50%,#312e81 100%)'
      case 'cloud':
        return isDay
          ? 'linear-gradient(160deg,#8ed2f7 0%,#a8c9f0 50%,#cbd8e6 100%)'
          : 'linear-gradient(160deg,#101728 0%,#1e2a40 55%,#303d55 100%)'
      case 'rain':
        return 'linear-gradient(160deg,#33526f 0%,#2d5170 55%,#122940 100%)'
      case 'storm':
        return 'linear-gradient(160deg,#0f1522 0%,#212a41 45%,#060a13 100%)'
      case 'snow':
        return 'linear-gradient(160deg,#7e93ad 0%,#b9c9de 55%,#e6edf5 100%)'
      case 'fog':
        return isDay
          ? 'linear-gradient(160deg,#d2dae4 0%,#e6ecf3 60%,#f5f8fb 100%)'
          : 'linear-gradient(160deg,#252d3c 0%,#333c4e 60%,#454f63 100%)'
      default:
        return 'linear-gradient(160deg,#4f8ef7 0%,#818cf8 100%)'
    }
  })()

  // TV: yüzlerce animasyonlu parçacık yerine yalnızca gökyüzü rengi
  if (TV) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: sky }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/12 to-transparent" />
      </div>
    )
  }

  return (
    <div className={cx('absolute inset-0 overflow-hidden pointer-events-none', 'fs-scene')} style={{ background: sky }}>
      {/* Güneş (gündüz: ışınlı) / Ay (gece: ışınsız, sadece yumuşak hale + yıldızlar) */}
      {(group === 'clear' || group === 'cloud') &&
        (isDay ? (
          <>
            <div
              className="absolute rounded-full"
              style={{
                top: '-16%',
                right: '-8%',
                width: 260,
                height: 260,
                background:
                  'conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(253,230,138,0.32) 18deg, rgba(255,255,255,0) 40deg, rgba(253,230,138,0.28) 78deg, rgba(255,255,255,0) 100deg, rgba(255,255,255,0) 180deg, rgba(253,230,138,0.26) 200deg, rgba(255,255,255,0) 222deg, rgba(253,230,138,0.3) 260deg, rgba(255,255,255,0) 285deg)',
                willChange: 'transform',
                animation: 'fs-rays 40s linear infinite',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: '-14%',
                right: '-6%',
                width: 190,
                height: 190,
                background: 'radial-gradient(circle, #fffbeb 0%, #fde68a 40%, rgba(253,230,138,0) 70%)',
                animation: 'fs-sun-pulse 5s ease-in-out infinite',
              }}
            />
          </>
        ) : (
          <>
            {/* Ay: kırpılan disk + yumuşak hale (ışın yok) */}
            <div
              className="absolute rounded-full"
              style={{
                top: '-10%',
                right: '-4%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(248,250,252,0.55) 0%, rgba(203,213,225,0.22) 48%, rgba(148,163,184,0) 72%)',
                animation: 'fs-sun-pulse 7s ease-in-out infinite',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: '-9%',
                right: '-3%',
                width: 54,
                height: 54,
                background: '#f8fafc',
                boxShadow: 'inset -14px -8px 0 -2px rgba(148,163,184,0.55), 0 0 24px rgba(226,232,240,0.45)',
                animation: 'fs-moon-glow 7s ease-in-out infinite',
              }}
            />
            {/* Yıldızlar (yalnızca gece) */}
            <Stars />
          </>
        ))}

      {/* Bulutlar */}
      {(group === 'cloud' || group === 'rain' || group === 'storm' || group === 'snow') && (
        <Clouds count={group === 'cloud' ? 3 : 4} dark={group === 'storm' || !isDay} />
      )}

      {/* Yağmur / Kar */}
      {rain && (
        <>
          <Drops count={group === 'storm' ? 26 : 18} />
          <Drops count={group === 'storm' ? 18 : 12} fast />
        </>
      )}
      {snow && <Flakes />}

      {/* Şimşek */}
      {group === 'storm' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 60%)',
            animation: 'fs-flash 5.5s ease-in-out infinite',
            opacity: 0,
          }}
        />
      )}

      {/* Sis */}
      {group === 'fog' && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="absolute left-[-20%] w-[140%] h-20 bg-white/55 blur-xl rounded-full"
              style={{ top: `${24 + i * 16}%`, animation: `fs-fog ${6 + i * 2}s ease-in-out ${i * 0.8}s infinite` }}
            />
          ))}
        </>
      )}

      {/* Gece yıldızları */}
      {!isDay && group !== 'storm' && group !== 'rain' && (
        <>
          {Array.from({ length: 20 }).map((_, i) => {
            const left = rand(i, 21) * 100
            const top = rand(i, 22) * 70
            return (
              <span
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-white"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  boxShadow: '0 0 6px rgba(255,255,255,0.9)',
                  animation: `fs-twinkle ${1.4 + rand(i, 23) * 2.4}s ease-in-out ${rand(i, 24) * 3}s infinite`,
                }}
              />
            )
          })}
        </>
      )}

      {/* Yumuşak ışık süpürmesi (canlılık) */}
      <div
        className="absolute inset-y-0 w-1/2"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 100%)',
          animation: 'fs-sweep 9s ease-in-out infinite',
        }}
      />

      {/* Alt koyuluk (metin okunurluğu) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/12 to-transparent" />
    </div>
  )
}
