import { useSyncExternalStore } from 'react'

/**
 * Senkron ayarları (cihaza özel, aileyle PAYLAŞILMAZ).
 *
 * Sunucu adresi:
 *  - VITE_SYNC_URL=off      → yalnızca bu cihaz (yerel mod)
 *  - VITE_SYNC_URL=wss://…  → verilen adres
 *  - boş + üretim derlemesi → uygulamanın kendi adresi (/sync) — Docker ve Cloudflare'de hazır
 *  - boş + npm run dev      → yerel mod
 *
 * Aile kodu: sunucudaki FAMILY_CODE ile aynı olmalı. Tablet kurulumunu kolaylaştırmak için
 * adres çubuğundan bir kez verilebilir: https://pano.ornek.com/?kod=1234 (sonra adresten silinir).
 */
const RAW_URL = ((import.meta.env.VITE_SYNC_URL as string | undefined) ?? '').trim()
const CODE_KEY = 'familyos:code'
const OWNER_KEY = 'familyos:owner'
export const CODE_EVENT = 'familyos:code-changed'
export const OWNER_EVENT = 'familyos:owner-changed'

export function resolveSyncUrl(): string | null {
  if (RAW_URL === 'off') return null
  if (RAW_URL) return RAW_URL
  if (!import.meta.env.PROD || typeof location === 'undefined') return null
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/sync`
}

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* yoksay */
  }
}

/** Adres çubuğunda ?kod= / ?code= varsa kaydet ve adresten temizle. */
function takeCodeFromUrl() {
  if (typeof location === 'undefined' || typeof history === 'undefined') return
  const params = new URLSearchParams(location.search)
  const code = params.get('kod') ?? params.get('code')
  if (!code) return
  write(CODE_KEY, code.trim())
  params.delete('kod')
  params.delete('code')
  const qs = params.toString()
  history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`)
}
takeCodeFromUrl()

export function getFamilyCode(): string {
  return read(CODE_KEY)
}

export function setFamilyCode(code: string) {
  write(CODE_KEY, code.trim())
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CODE_EVENT))
}

/** Bu cihazı kim kullanıyor? (telefonlarda "benim görevlerim" için) */
export function getDeviceOwner(): string {
  return read(OWNER_KEY)
}

export function setDeviceOwner(memberId: string) {
  write(OWNER_KEY, memberId)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OWNER_EVENT))
}

/** Cihaz sahibini okur; Ayarlar'dan değişince bileşen güncellenir. */
export function useDeviceOwner(): string {
  return useSyncExternalStore(
    (fn) => {
      window.addEventListener(OWNER_EVENT, fn)
      return () => window.removeEventListener(OWNER_EVENT, fn)
    },
    getDeviceOwner,
    () => '',
  )
}
