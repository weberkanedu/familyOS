import type { DB } from '../types'
import { emptyDB, normalizeDB, reduceOp } from '../state/reducer'
import type { Op } from './protocol'

const RECENT_IDS = 1000

/**
 * Sunucu tarafı aile odası durumu (Node sunucusu ve Cloudflare Worker ortak).
 * Aynı op iki kez gelirse (bağlantı koptuktan sonra istemci yeniden gönderir)
 * ikinci kez uygulanmaz — bu sayede istemci gönderilmemiş op'lerini güvenle tekrar yollar.
 */
export class RoomState {
  db: DB
  rev: number
  recentIds: string[]
  private seen: Set<string>

  constructor(saved?: { db?: unknown; rev?: number; recentIds?: string[] } | null) {
    this.db = saved?.db ? normalizeDB(saved.db) : emptyDB()
    this.rev = typeof saved?.rev === 'number' ? saved.rev : 0
    this.recentIds = Array.isArray(saved?.recentIds) ? saved.recentIds.slice(-RECENT_IDS) : []
    this.seen = new Set(this.recentIds)
  }

  /** op'yi uygular. Daha önce görüldüyse false döner (yalnızca ack gönderilmeli). */
  apply(op: Op): boolean {
    if (this.seen.has(op.id)) return false
    this.db = reduceOp(this.db, op)
    this.rev += 1
    this.recentIds.push(op.id)
    this.seen.add(op.id)
    if (this.recentIds.length > RECENT_IDS) {
      const drop = this.recentIds.splice(0, this.recentIds.length - RECENT_IDS)
      for (const id of drop) this.seen.delete(id)
    }
    return true
  }

  toJSON() {
    return { db: this.db, rev: this.rev, recentIds: this.recentIds }
  }
}

/**
 * Hatalı aile kodu denemelerini IP başına sınırlar (kaba kuvvet tahminine karşı).
 * 10 dakikada 10 hatalı deneme → 10 dakika bekleme.
 */
export class AuthLimiter {
  private hits = new Map<string, { count: number; until: number }>()
  constructor(
    private max = 10,
    private windowMs = 10 * 60_000,
  ) {}

  blocked(key: string, now = Date.now()): boolean {
    const h = this.hits.get(key)
    if (!h) return false
    if (now > h.until) {
      this.hits.delete(key)
      return false
    }
    return h.count >= this.max
  }

  fail(key: string, now = Date.now()): void {
    const h = this.hits.get(key)
    if (!h || now > h.until) this.hits.set(key, { count: 1, until: now + this.windowMs })
    else h.count += 1
    if (this.hits.size > 10_000) this.hits.clear()
  }

  success(key: string): void {
    this.hits.delete(key)
  }
}
