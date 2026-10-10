/** Web Push: abone ol + izin durumu. Sunucu tarafı server/index.ts (Docker) ve worker/src/index.ts içinde. */
import { getFamilyCode } from '../sync/config'

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function permissionState(): Promise<NotificationPermission | 'unsupported'> {
  if (!pushSupported() || typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/** Genel anahtar: önce sunucudan (Docker sunucusu kendisi üretir), yoksa derleme ayarından. */
async function publicKey(): Promise<string> {
  try {
    const res = await fetch('/push/key')
    if (res.ok) {
      const { publicKey } = (await res.json()) as { publicKey?: string }
      if (publicKey) return publicKey
    }
  } catch {
    /* sunucu yok */
  }
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''
}

const authHeaders = () => ({ 'content-type': 'application/json', 'x-family-code': getFamilyCode() })

export async function enablePush(): Promise<boolean> {
  const key = await publicKey()
  if (!pushSupported() || !key) throw new Error('Bu cihaz ya da sunucu bildirimleri desteklemiyor')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Bildirim izni verilmedi')

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
  })

  const res = await fetch('/push/subscribe', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(sub),
  })
  if (res.status === 401) throw new Error('Aile kodu yanlış — Ayarlar → Senkron bölümünden düzeltin')
  if (!res.ok) throw new Error(`Abonelik kaydedilemedi (${res.status})`)
  return true
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await fetch('/push/unsubscribe', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => undefined)
    await sub.unsubscribe()
  }
}
