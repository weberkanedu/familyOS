import { useEffect, useSyncExternalStore } from 'react'
import type { Settings } from '../types'
import { useClock } from './hooks'

/* ---------- Yazı boyutu (cihaza özel: duvar tableti büyük, telefon normal) ---------- */
export type TextScale = 'normal' | 'large' | 'xlarge'
export const TEXT_SCALES: { value: TextScale; label: string; zoom: number }[] = [
  { value: 'normal', label: 'Normal', zoom: 1 },
  { value: 'large', label: 'Büyük', zoom: 1.12 },
  { value: 'xlarge', label: 'Çok büyük', zoom: 1.25 },
]
const SCALE_KEY = 'familyos:text-scale'
const SCALE_EVENT = 'familyos:text-scale-changed'

export function getTextScale(): TextScale {
  try {
    const v = localStorage.getItem(SCALE_KEY)
    return v === 'large' || v === 'xlarge' ? v : 'normal'
  } catch {
    return 'normal'
  }
}

export function setTextScale(v: TextScale) {
  try {
    localStorage.setItem(SCALE_KEY, v)
  } catch {
    /* yoksay */
  }
  window.dispatchEvent(new Event(SCALE_EVENT))
}

/** İçerik alanına uygulanacak yakınlaştırma (CSS zoom). */
export function useTextZoom(): number {
  const scale = useSyncExternalStore(
    (fn) => {
      window.addEventListener(SCALE_EVENT, fn)
      return () => window.removeEventListener(SCALE_EVENT, fn)
    },
    getTextScale,
    () => 'normal' as TextScale,
  )
  return TEXT_SCALES.find((s) => s.value === scale)?.zoom ?? 1
}

/* ---------- Gece modu ---------- */
export function isNightTime(s: Pick<Settings, 'nightMode' | 'nightFrom' | 'nightTo'>, now: Date): boolean {
  const mode = s.nightMode ?? 'auto'
  if (mode === 'off') return false
  if (mode === 'always') return true
  const from = s.nightFrom ?? 22
  const to = s.nightTo ?? 7
  const h = now.getHours()
  return from > to ? h >= from || h < to : h >= from && h < to
}

/** Gece saatlerinde <html> üzerine .night sınıfı ekler (koyu, loş tema). */
export function useNightMode(s: Settings): boolean {
  const now = useClock(30_000)
  const night = isNightTime(s, now)
  useEffect(() => {
    document.documentElement.classList.toggle('night', night)
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', night ? '#0b1020' : '#e9eeff')
  }, [night])
  return night
}
