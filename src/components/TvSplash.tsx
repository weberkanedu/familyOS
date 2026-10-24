import { useEffect, useState, type CSSProperties } from 'react'

const KEY = 'familyos:splash'
const DURATION_MS = 3000
/** Uyanışta TV'nin görüntüyü getirmesi (HDMI el sıkışması) birkaç sn sürüyor; animasyon ancak sonra başlar */
const WAKE_DELAY_MS = 4500

/**
 * TV açılışı: ~3 sn Besmele. Uygulama ilk açıldığında (WebView oturumu başına bir kez) ve TV
 * kumandayla kapatılıp açıldığında ("familyos:wake", MainActivity); senkron/güncelleme kaynaklı
 * sayfa yeniden yüklemelerinde ve başka uygulamadan dönüşte tekrar etmez.
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

  // Her uyanışta yeni anahtar → öğeler yeniden kurulur, CSS animasyonları baştan oynar
  const [run, setRun] = useState(0)
  useEffect(() => {
    const wake = () => {
      setRun((n) => n + 1)
      setShow(true)
    }
    window.addEventListener('familyos:wake', wake)
    return () => window.removeEventListener('familyos:wake', wake)
  }, [])

  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setShow(false), DURATION_MS + (run ? WAKE_DELAY_MS : 0))
    return () => clearTimeout(t)
  }, [show, run])

  if (!show) return null
  return (
    <div
      key={run}
      className="tv-splash fixed inset-0 z-[100] grid place-items-center bg-[#17110f] pointer-events-none"
      style={{ '--splash-delay': `${run ? WAKE_DELAY_MS : 0}ms` } as CSSProperties}
      aria-hidden
    >
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
