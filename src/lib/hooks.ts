import { useEffect, useRef, useState } from 'react'

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

export function useClock(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
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
