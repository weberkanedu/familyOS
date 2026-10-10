import { useSyncExternalStore } from 'react'
import type { DB, EntityKey } from '../types'
import { ENTITY_KEYS } from '../types'
import { emptyDB, normalizeDB, reduceOp } from './reducer'
import type { Op } from '../sync/protocol'
import { clientId } from '../lib/id'

const STORAGE_KEY = 'familyos:db:v1'
const SAVE_DELAY = 250

let state: DB = load()
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

/* Depolama sağlığı: localStorage dolduysa arayüz uyarı gösterir */
let storageFailed = false
const healthListeners = new Set<() => void>()

function setStorageFailed(v: boolean) {
  if (storageFailed === v) return
  storageFailed = v
  for (const l of Array.from(healthListeners)) l()
}

/** false → bu cihazda son değişiklikler kaydedilemedi (depolama dolu). */
export function useStorageOk(): boolean {
  return !useSyncExternalStore(
    (fn) => {
      healthListeners.add(fn)
      return () => healthListeners.delete(fn)
    },
    () => storageFailed,
    () => false,
  )
}

function load(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeDB(JSON.parse(raw))
  } catch {
    /* bozuk kayıt */
  }
  return emptyDB()
}

function persist() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    writeNow()
  }, SAVE_DELAY)
}

/**
 * Gecikmesiz anlık yazma.
 *
 * Tabletin şarjı bitince ya da sekme çökünce, debounce (250 ms) penceresi
 * içindeki son değişiklik kaybolurdu. Sekme kapanırken / sayfa gizlenirken
 * ve şarj bittikten sonra (bkz. boot hook) anında diske yazıyoruz.
 */
function writeNow() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setStorageFailed(false)
  } catch {
    // Kota dolu: sessizce geçme, arayüz kullanıcıyı uyarsın
    setStorageFailed(true)
  }
}

/* Sekme kapanırken, arka plana alınınca ve şarj kesilince anında yaz. */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const flush = () => {
    if (saveTimer) writeNow()
  }
  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

function notify() {
  for (const l of Array.from(listeners)) l()
}

export function getDB(): DB {
  return state
}

export function subscribeDB(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useDB(): DB {
  return useSyncExternalStore(subscribeDB, getDB, getDB)
}

/** İstemcide yeni bir op üretir: yerelde uygula, kaydet, yay. */
export function dispatch(partial: Omit<Op, 'id' | 'origin' | 'ts'>): Op {
  const op: Op = {
    ...partial,
    id: `${clientId()}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    origin: clientId(),
    ts: Date.now(),
  }
  applyOp(op)
  try {
    localStorage.removeItem(SEED_ONLY_KEY) // kullanıcı bir şey değiştirdi → artık örnek veri değil
  } catch {
    /* yoksay */
  }
  syncEmitter.emit(op)
  return op
}

/* İlk açılış örnek verisi: sunucuya yüklenmesin diye işaretlenir */
const SEED_ONLY_KEY = 'familyos:seed-only'

export function markSeedOnly(): void {
  try {
    localStorage.setItem(SEED_ONLY_KEY, '1')
  } catch {
    /* yoksay */
  }
}

/** Bu cihazda örnek veri dışında gerçek aile verisi var mı? */
export function hasLocalUserData(): boolean {
  try {
    if (localStorage.getItem(SEED_ONLY_KEY) === '1') return false
  } catch {
    /* yoksay */
  }
  return state.members.length > 0
}

/** Op'yi uygula ve kaydet (yerel ya da uzak) — yeniden yayılmaz. */
export function applyOp(op: Op): void {
  state = reduceOp(state, op)
  notify()
  persist()
}

/** Test yardımcısı: bekleyen yazmayı hemen diske yazar. */
export function writeNowForTest(): void {
  writeNow()
}

/** Uzak snapshot (soğuk başlatma) — yalnızca bu cihazı günceller. */
export function hydrate(db: DB): void {
  state = normalizeDB(db)
  notify()
  persist()
}

/** Bu cihazdaki kopyayı sıfırlar (sunucudaki aile verisine dokunmaz). */
export function resetDB(): void {
  hydrate(emptyDB())
}

export function exportDB(): string {
  return JSON.stringify(state, null, 2)
}

/**
 * Yedeği geri yükler ve TÜM cihazlara yayar (op olarak gönderilir),
 * böylece duvar ekranı ve telefonlar da yedekteki duruma döner.
 */
export function importDB(json: string): void {
  uploadAll(normalizeDB(JSON.parse(json)))
}

/** Verilen DB'yi op olarak tüm cihazlara/sunucuya gönderir. */
export function uploadAll(db: DB): void {
  for (const key of ENTITY_KEYS) {
    if (key === 'settings') {
      dispatch({ entity: 'settings', action: 'upsert', items: [{ ...db.settings, updatedAt: Date.now() }] })
    } else {
      dispatch({ entity: key, action: 'replaceAll', items: db[key] as any[] })
    }
  }
}

/** UI sekmeleri (senkron DEĞİL — cihaz yerel). */
export type TabKey =
  | 'home' | 'calendar' | 'chores' | 'shopping' | 'meals' | 'learn' | 'chat' | 'settings'

/** Basit pub/sub: senkron hook'u buraya abone olur. */
type OpListener = (op: Op) => void
const opListeners = new Set<OpListener>()

export const syncEmitter = {
  subscribe(fn: OpListener): () => void {
    opListeners.add(fn)
    return () => opListeners.delete(fn)
  },
  emit(op: Op) {
    for (const fn of Array.from(opListeners)) fn(op)
  },
}

/**
 * Cihaz içi çoklu sekme köprüsü (BroadcastChannel).
 * clientId cihaz başına aynıdır (localStorage), bu yüzden sekmeleri ayırmak için
 * ayrı bir sekme kimliği kullanılır.
 */
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('familyos:local') : null
const TAB_ID = Math.random().toString(36).slice(2)

export function localBroadcast(op: Op) {
  try {
    channel?.postMessage({ tab: TAB_ID, op })
  } catch {
    /* yoksay */
  }
}

export function onLocalBroadcast(fn: (op: Op) => void): () => void {
  if (!channel) return () => undefined
  const handler = (e: MessageEvent) => {
    const msg = e.data as { tab?: string; op?: Op } | null
    if (msg?.op && msg.tab !== TAB_ID) fn(msg.op)
  }
  channel.addEventListener('message', handler)
  return () => channel.removeEventListener('message', handler)
}

export function entityList<K extends EntityKey>(db: DB, key: K): DB[K] {
  return db[key]
}
