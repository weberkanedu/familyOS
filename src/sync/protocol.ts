import type { DB, EntityKey } from '../types'

/**
 * Senkron protokolü (istemci ↔ worker ↔ yerel relay ortak).
 * Tüm değişiklikler "op" (operation) birimidir; son yazan kazanır (LWW).
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
  | { type: 'hello'; client: string; since?: number }
  | { type: 'op'; op: Op }
  | { type: 'ping' }

export type ServerMsg =
  | { type: 'snapshot'; db: DB; rev: number }
  | { type: 'op'; op: Op }
  | { type: 'ack'; id: string; rev: number }
  | { type: 'pong' }
  | { type: 'error'; message: string }

export function isOp(v: unknown): v is Op {
  const o = v as Op
  return !!o && typeof o.id === 'string' && typeof o.entity === 'string' && Array.isArray(o.items)
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
