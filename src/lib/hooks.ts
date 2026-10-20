import { useEffect, useRef, useState } from 'react'
import { TV } from './tv'

/** Dokunmatik kiosk için boşta kalma (ekran koruyucu) algılama. */
export function useIdle(timeoutMin: number): { idle: boolean; wake: () => void } {
  const [idle, setIdle] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutMs = Math.max(0.1, timeoutMin) * 60_000

  const reset = () => {
    setIdle(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (timeoutMs <= 0) return
    timerRef.current = setTimeout(() => setIdle(true), timeoutMs)
  }

  useEffect(() => {
    reset()
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    const handler = () => reset()
    for (const e of events) window.addEventListener(e, handler, { passive: true } as any)
    return () => {
      for (const e of events) window.removeEventListener(e, handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeoutMs])

  return { idle, wake: reset }
}

/** Yalnızca yerel önizleme: http://localhost…/?saat=17:12 → saat o ana kaydırılır (canlıda etkisiz). */
const CLOCK_OFFSET = (() => {
  if (typeof window === 'undefined' || window.location.hostname !== 'localhost') return 0
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(new URLSearchParams(window.location.search).get('saat') ?? '')
  if (!m) return 0
  const target = new Date()
  target.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return target.getTime() - Date.now()
})()
const clockNow = () => new Date(Date.now() + CLOCK_OFFSET)

export function useClock(intervalMs = 1000): Date {
  const [now, setNow] = useState(clockNow)
  useEffect(() => {
    if (TV && intervalMs < 60_000) {
      // TV'de saniye gösterilmez: dakika başına hizalı, dakikada bir çizim (CPU dostu)
      let id: ReturnType<typeof setInterval> | undefined
      let t: ReturnType<typeof setTimeout> | undefined
      const align = () => {
        setNow(clockNow())
        clearTimeout(t)
        clearInterval(id)
        t = setTimeout(() => {
          setNow(clockNow())
          id = setInterval(() => setNow(clockNow()), 60_000)
        }, 60_000 - (Date.now() % 60_000) + 50)
      }
      align()
      // TiviMate/YouTube'dan dönünce zamanlayıcılar duraklatılmıştı: hemen güncelle, yeniden hizala
      window.addEventListener('familyos:resume', align)
      return () => {
        window.removeEventListener('familyos:resume', align)
        clearTimeout(t)
        clearInterval(id)
      }
    }
    const id = setInterval(() => setNow(clockNow()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(query)
    const handler = () => setMatch(mq.matches)
    handler()
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler)
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler)
    }
  }, [query])
  return match
}
