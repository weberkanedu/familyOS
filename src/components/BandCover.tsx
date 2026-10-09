/**
 * Üst bant kapak görseli — "seyahat günlüğü" editoryal kompozisyonu:
 *   Üst yarı: gerçekçi (sinematik) fotoğraf
 *   Alt yarı : aynı sahnenin suluboya illüstrasyonu
 *   Altta    : fildişi kâğıt alanı, el yazısı altyazı ve ince çizgi
 *
 * Kullanıcı isterse hazır kompozisyonlu görseli de yükleyebilir (art = düz fotoğraf).
 */
export function BandCover({
  src,
  caption = '',
  artwork = true,
  className,
}: {
  src: string
  caption?: string
  /** true: foto + suluboya kompozisyonu, false: sadece fotoğraf */
  artwork?: boolean
  className?: string
}) {
  if (!artwork) {
    return (
      <div className={className}>
        <img src={src} alt="Kapak" className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="relative w-full h-full overflow-hidden bg-[#f6efe0]">
        {/* Üst: fotoğraf (sinematik grade) */}
        <div className="absolute inset-x-0 top-0 h-[54%] overflow-hidden">
          <img
            src={src}
            alt="Kapak"
            className="w-full h-full object-cover"
            style={{ filter: 'contrast(1.04) saturate(0.92) brightness(1.02)' }}
          />
          {/* sinematik alt koyuluk */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/10" />
        </div>

        {/* Geçiş: yırtık kâğıt kenarı */}
        <div
          className="absolute inset-x-0"
          style={{
            top: '52%',
            height: '10%',
            backgroundImage: 'url(#deckle)',
          }}
        >
          <svg width="0" height="0" aria-hidden="true">
            <defs>
              <pattern id="deckle" width="120" height="24" patternUnits="userSpaceOnUse">
                <path d="M0 24 L0 9 L15 6 L30 10 L45 4 L60 8 L75 5 L90 9 L105 6 L120 10 L120 24 Z" fill="#f6efe0" />
              </pattern>
            </defs>
          </svg>
        </div>

        {/* Alt: aynı sahnenin suluboya illüstrasyonu */}
        <div className="absolute inset-x-0 bottom-[18%] top-[50%] overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-[220%] overflow-hidden">
            <img
              src={src}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover watercolor-img"
              style={{
                filter: 'url(#watercolor) saturate(0.72) contrast(0.96) brightness(1.06)',
                maskImage: 'radial-gradient(120% 130% at 50% 20%, #000 52%, transparent 92%)',
                WebkitMaskImage: 'radial-gradient(120% 130% at 50% 20%, #000 52%, transparent 92%)',
              }}
            />
          </div>
        </div>

        {/* Alt: fildişi kâğıt + altyazı + ince çizgi */}
        <div className="absolute inset-x-0 bottom-0 h-[20%] flex flex-col items-center justify-center gap-1 bg-[#f6efe0]">
          {caption ? (
            <>
              <span className="font-hand text-[15px] leading-none text-[#5b4a35] px-3 truncate max-w-full">{caption}</span>
              <span className="block w-10 h-px bg-[#8b7a5f]/70" />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
