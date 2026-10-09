/**
 * Üst bant kapak görseli.
 * - `filter` açıkken: görsel SVG su boya filtresiyle illüstrasyona dönüştürülür,
 *   kenarları zeminin içinde yumuşakça erir (çerçeve yok).
 * - `filter` kapalıyken: görsel olduğu gibi gösterilir (yapay zekâda hazır
 *   suluboya üretildiyse bu mod tercih edilir).
 */
export function BandCover({
  src,
  className,
  filter = true,
}: {
  src: string
  className?: string
  filter?: boolean
}) {
  return (
    <div className={className}>
      <img
        src={src}
        alt="Kapak"
        className={filter ? 'watercolor-cover w-full h-full object-contain' : 'w-full h-full object-contain'}
      />
    </div>
  )
}
