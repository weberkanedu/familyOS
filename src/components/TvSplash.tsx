import { useEffect, useState } from 'react'

const KEY = 'familyos:splash'
const DURATION_MS = 3000

/**
 * TV açılışı: ~3 sn Besmele. Yalnızca uygulama ilk açıldığında (WebView oturumu başına bir kez);
 * senkron/yenileme kaynaklı sayfa yeniden yüklemelerinde tekrar etmez.
 * Animasyonlar kısa ve tek seferlik; html.tv'deki genel animasyon kapatmasını .tv-splash ile aşar.
 */
export function TvSplash() {
  const [show, setShow] = useState(() => {
    try {
      if (sessionStorage.getItem(KEY)) return false
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* depolama yoksa yine de bir kez göster */
    }
    return true
  })

  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setShow(false), DURATION_MS)
    return () => clearTimeout(t)
  }, [show])

  if (!show) return null
  return (
    <div className="tv-splash fixed inset-0 z-[100] grid place-items-center bg-[#17110f] pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(246,197,138,0.16),transparent_60%)]" />
      <div className="relative flex flex-col items-center">
        <div
          dir="rtl"
          lang="ar"
          className="tv-splash-script text-[84px] leading-[1.6] text-[#f6c58a]"
          style={{ fontFamily: "'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', serif" }}
        >
          بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </div>
        <div className="tv-splash-line mt-2 h-px w-[420px] bg-gradient-to-r from-transparent via-[#f6c58a]/70 to-transparent" />
        <div className="tv-splash-sub mt-5 text-[24px] font-semibold tracking-[0.18em] text-[#f3e9df]/80">Bismillâhirrahmânirrahîm</div>
      </div>
    </div>
  )
}
