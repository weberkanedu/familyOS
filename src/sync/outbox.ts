import { useSyncExternalStore } from 'react'
import type { Op } from './protocol'

/**
 * Giden kutusu: sunucuya ulaşmamış (ack gelmemiş) değişiklikler.
 *
 * İnternet yokken yapılan değişiklikler burada bekler; bağlantı gelince sunucunun
 * anlık görüntüsünün üzerine yeniden uygulanır ve gönderilir. Sunucu aynı op'yi
 * iki kez uygulamaz, bu yüzden tekrar göndermek güvenlidir.
 *
 * Her işlemde localStorage'dan okunur (aynı cihazdaki sekmeler birbirinin
 * kaydını ezmesin). Depolama doluysa bellekteki kopya kullanılır.
 */
const KEY = 'familyos:outbox:v1'
const MAX = 2000

let memory: Op[] = []
let cachedRaw: string | null = null
let cachedList: Op[] = []
const listeners = new Set<() => void>()

function load(): Op[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === cachedRaw) return cachedList
    cachedRaw = raw
    cachedList = raw ? (JSON.parse(raw) as Op[]) : []
    if (!Array.isArray(cachedList)) cachedList = []
    return cachedList
  } catch {
    return memory
  }
}

function save(list: Op[]) {
  memory = list
  try {
    const raw = JSON.stringify(list)
    localStorage.setItem(KEY, raw)
    cachedRaw = raw
    cachedList = list
  } catch {
    /* depolama dolu: bellekte tutulur */
  }
  for (const l of Array.from(listeners)) l()
}

export function outboxAdd(op: Op) {
  const list = [...load(), op]
  save(list.length > MAX ? list.slice(-MAX) : list)
}

export function outboxAck(id: string) {
  const list = load()
  const next = list.filter((o) => o.id !== id)
  if (next.length !== list.length) save(next)
}

export function outboxList(): Op[] {
  return load()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) fn()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

export function useOutboxCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => load().length,
    () => 0,
  )
}
