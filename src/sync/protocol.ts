import type { DB, EntityKey } from '../types'
import { ENTITY_KEYS } from '../types'

/**
 * Senkron protokolü (istemci ↔ Node sunucusu ↔ Cloudflare Worker ortak).
 * Tüm değişiklikler "op" (operation) birimidir; son yazan kazanır (LWW).
 *
 * Akış: bağlan → hello{code} → (kod doğruysa) snapshot → op/ack.
 * Kod yanlışsa sunucu error{code:'auth'} gönderir ve bağlantıyı kapatır.
 */
export interface Op {
  id: string
  origin: string // op'yi üreten client id
  ts: number
  entity: EntityKey
  action: 'upsert' | 'delete' | 'replaceAll'
  items: any[] // upsert: tam kayıt listesi, delete: [{id}], replaceAll: tüm liste
}

export type ClientMsg =
  | { type: 'hello'; client: string; code: string; since?: number }
  | { type: 'op'; op: Op }
  | { type: 'ping' }

/** auth: aile kodu yanlış · not-configured: sunucuda FAMILY_CODE yok · rate-limit: çok fazla hatalı deneme */
export type ErrorCode = 'auth' | 'not-configured' | 'rate-limit' | 'bad-op'

export type ServerMsg =
  | { type: 'snapshot'; db: DB; rev: number }
  | { type: 'op'; op: Op }
  | { type: 'ack'; id: string; rev: number }
  | { type: 'pong' }
  | { type: 'error'; code?: ErrorCode; message: string }

/** WebSocket kapatma kodu: kimlik doğrulanamadı (4000-4999 uygulamaya ayrılmıştır) */
export const CLOSE_AUTH = 4001

export const MAX_MESSAGE_BYTES = 8 * 1024 * 1024
const MAX_ITEMS = 5000
const MAX_ID = 200
const ACTIONS = new Set(['upsert', 'delete', 'replaceAll'])

export function isOp(v: unknown): v is Op {
  const o = v as Op
  return !!o && typeof o.id === 'string' && typeof o.entity === 'string' && Array.isArray(o.items)
}

/**
 * Sunucuya gelen op'yi doğrular ve temizler; geçersizse null döner.
 * İstemciden gelen veriye güvenilmez: bilinmeyen entity/action, kimliksiz kayıt,
 * aşırı büyük liste reddedilir.
 */
export function sanitizeOp(raw: unknown, now = Date.now()): Op | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || !o.id || o.id.length > MAX_ID) return null
  if (typeof o.entity !== 'string' || !ENTITY_KEYS.includes(o.entity as EntityKey)) return null
  if (typeof o.action !== 'string' || !ACTIONS.has(o.action)) return null
  if (!Array.isArray(o.items) || o.items.length > MAX_ITEMS) return null

  const entity = o.entity as EntityKey
  const single = entity === 'settings'
  if (single && o.action !== 'upsert') return null

  const items: Record<string, unknown>[] = []
  for (const it of o.items) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) return null
    const rec = it as Record<string, unknown>
    if (single) {
      if (rec.id !== 'main') return null
    } else if (typeof rec.id !== 'string' || !rec.id || rec.id.length > MAX_ID) {
      return null
    }
    // Gelecekten gelen zaman damgası LWW'yi kilitlemesin
    if (typeof rec.updatedAt === 'number' && rec.updatedAt > now + 60_000) rec.updatedAt = now
    items.push(rec)
  }

  return {
    id: o.id,
    origin: typeof o.origin === 'string' ? o.origin.slice(0, MAX_ID) : '',
    ts: now,
    entity,
    action: o.action as Op['action'],
    items,
  }
}

/** Zamanlamaya dayalı tahmine karşı sabit süreli karşılaştırma. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

export function parseMessage(raw: string): ServerMsg | null {
  try {
    const v = JSON.parse(raw)
    if (v && typeof v.type === 'string') return v as ServerMsg
  } catch {
    /* bozuk mesaj */
  }
  return null
}
