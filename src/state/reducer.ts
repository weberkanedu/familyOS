import type { DB, EntityKey, Member, EventItem, Chore, ShoppingItem, Meal, Word, QuizQuestion, Message, Settings } from '../types'
import { ENTITY_KEYS } from '../types'

export function defaultSettings(): Settings {
  return {
    id: 'main',
    familyName: 'Ailem',
    brandName: 'Aile Panosu',
    theme: 'classic',
    navCollapsed: false,
    mode: 'auto',
    idleMinutes: 3,
    city: 'Ankara 06070',
    lat: 39.9208,
    lon: 32.8541,
    weatherEnabled: true,
    soundEnabled: true,
    soundMode: 'wall',
    savedLocations: [{ label: 'Ankara 06070', lat: 39.9208, lon: 32.8541, home: true }],
    updatedAt: Date.now(),
  }
}

export function emptyDB(): DB {
  return {
    members: [],
    events: [],
    chores: [],
    shopping: [],
    meals: [],
    words: [],
    quiz: [],
    quizResults: [],
    messages: [],
    nutrition: [],
    lessons: [],
    settings: defaultSettings(),
  }
}

type Row = { id: string; updatedAt?: number }

/** op'yi DB'ye uygular (immutable, yeni referans döner). */
export function reduceOp(db: DB, op: { entity: EntityKey; action: string; items: any[] }): DB {
  if (op.action === 'replaceAll') {
    return { ...db, [op.entity]: capList(op.entity, op.items) } as DB
  }

  const current = db[op.entity] as unknown

  /* Tekil (tek kayıtlı) entity'ler: settings gibi nesneler */
  if (!Array.isArray(current)) {
    if (op.action === 'delete') return db
    const patch = op.items.filter(Boolean).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
    if (!patch) return db
    const base = (current ?? {}) as Record<string, unknown>
    // Son yazan kazanır: daha eski bir güncelleme uygulanmaz
    if ((base.updatedAt ?? 0) > (patch.updatedAt ?? 0)) return db
    return { ...db, [op.entity]: { ...base, ...patch } } as DB
  }

  const list = current as Row[]
  let next: Row[]
  if (op.action === 'delete') {
    const ids = new Set(op.items.map((i) => i?.id))
    next = list.filter((i) => !ids.has(i.id))
  } else {
    const incoming = new Map<string, Row>()
    for (const item of op.items) {
      if (!item || typeof item.id !== 'string') continue
      const prev = incoming.get(item.id)
      if (!prev || (item.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) incoming.set(item.id, item)
    }
    const out: Row[] = []
    const seen = new Set<string>()
    for (const item of list) {
      const inc = incoming.get(item.id)
      if (inc) {
        seen.add(item.id)
        if ((inc.updatedAt ?? 0) >= (item.updatedAt ?? 0)) out.push(inc)
        else out.push(item)
      } else {
        out.push(item)
      }
    }
    for (const [id, item] of incoming) {
      if (!seen.has(id)) out.push(item)
    }
    next = capList(op.entity, out)
  }
  return { ...db, [op.entity]: next } as DB
}

/**
 * Sınırsız büyüyen listeler (mesajlar, quiz sonuçları) için üst sınır.
 * Her bağlantıda tüm veri gönderildiği ve tarayıcı depolaması ~5 MB olduğu için
 * en eski kayıtlar düşürülür. İstemci, Node sunucusu ve Worker aynı kuralı uygular.
 */
export const LIST_CAPS: Partial<Record<EntityKey, number>> = {
  messages: 200,
  quizResults: 2000,
}

function capList<T extends { updatedAt?: number; at?: number }>(entity: EntityKey, list: T[]): T[] {
  const cap = LIST_CAPS[entity]
  if (!cap || list.length <= cap) return list
  return [...list].sort((a, b) => (a.at ?? a.updatedAt ?? 0) - (b.at ?? b.updatedAt ?? 0)).slice(-cap)
}

export function normalizeDB(raw: unknown): DB {
  const base = emptyDB()
  if (!raw || typeof raw !== 'object') return base
  const input = raw as Partial<DB>
  const out = {} as DB
  for (const key of ENTITY_KEYS) {
    const v = (input as any)[key]
    if (key === 'settings') {
      out.settings = { ...base.settings, ...(v && typeof v === 'object' ? v : {}) }
    } else {
      out[key] = capList(key, Array.isArray(v) ? (v as any[]) : ((base as any)[key] ?? [])) as any
    }
  }
  return out
}

export type DBEntityOf<K extends EntityKey> = K extends 'members'
  ? Member[]
  : K extends 'events'
    ? EventItem[]
    : K extends 'chores'
      ? Chore[]
      : K extends 'shopping'
        ? ShoppingItem[]
        : K extends 'meals'
          ? Meal[]
          : K extends 'words'
            ? Word[]
            : K extends 'quiz'
              ? QuizQuestion[]
              : K extends 'messages'
                ? Message[]
                : any[]
