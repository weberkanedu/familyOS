import { useSyncExternalStore } from 'react'
import type { DB, EntityKey } from '../types'
import { emptyDB, normalizeDB, reduceOp } from './reducer'
import type { Op } from '../sync/protocol'
import { clientId } from '../lib/id'

const STORAGE_KEY = 'familyos:db:v1'
const SAVE_DELAY = 250

let state: DB = load()
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* kota dolu */
    }
  }, SAVE_DELAY)
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
  persist()
  syncEmitter.emit(op)
  return op
}

/** Gelen (uzak) op'yi uygula — yeniden yayılmaz. */
export function applyOp(op: Op): void {
  state = reduceOp(state, op)
  notify()
}

/** Uzak snapshot (soğuk başlatma) — op geçmişinin özeti. */
export function hydrate(db: DB): void {
  state = normalizeDB(db)
  notify()
  persist()
}

export function resetDB(): void {
  hydrate(emptyDB())
}

export function exportDB(): string {
  return JSON.stringify(state, null, 2)
}

export function importDB(json: string): void {
  hydrate(JSON.parse(json))
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

/** Cihaz içi çoklu sekme köprüsü (BroadcastChannel). */
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('familyos:local') : null

export function localBroadcast(op: Op) {
  try {
    channel?.postMessage(op)
  } catch {
    /* yoksay */
  }
}

export function onLocalBroadcast(fn: (op: Op) => void): () => void {
  if (!channel) return () => undefined
  const handler = (e: MessageEvent) => {
    const op = e.data as Op
    if (op && op.origin !== clientId()) fn(op)
  }
  channel.addEventListener('message', handler)
  return () => channel.removeEventListener('message', handler)
}

export function entityList<K extends EntityKey>(db: DB, key: K): DB[K] {
  return db[key]
}
