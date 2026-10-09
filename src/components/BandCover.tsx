/**
 * Üst bant kapak görseli: yüklenen fotoğrafın tamamı **suluboya illüstrasyona**
 * dönüştürülerek, kenarları zeminin içinde yumuşakça eriyen şekilde gösterilir.
 * Çerçeve/kenarlık yok; fotoğrafın tamamı (object-contain) görünür.
 */
export function BandCover({ src, className }: { src: string; className?: string }) {
  return (
    <div className={className}>
      <img src={src} alt="Kapak" className="watercolor-cover w-full h-full object-contain" />
    </div>
  )
}
