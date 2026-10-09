import type {
  Chore, EventItem, Meal, Member, Message, QuizQuestion, Settings, ShoppingItem, Word, ID, MealSlot, Repeat, ShopCategory,
  NutritionEntry, SchoolLesson,
} from '../types'
import { dispatch, getDB } from './store'
import { uid } from '../lib/id'
import { todayKey, DAY_MS } from '../lib/time'
import { scheduleAfter, Rating } from '../lib/anki'
import { HOME } from '../lib/location'

const now = () => Date.now()

/* ---------- Üyeler ---------- */
export function saveMember(m: Partial<Member> & { id?: ID }): Member {
  const db = getDB()
  const existing = db.members.find((x) => x.id === m.id)
  const item: Member = {
    ...m,
    ...existing,
    ...m,
    id: m.id || existing?.id || uid('m_'),
    name: m.name?.trim() || existing?.name || 'Yeni Üye',
    color: m.color ?? existing?.color ?? '#4f6ef7',
    emoji: m.emoji ?? existing?.emoji ?? '🙂',
    role: m.role ?? existing?.role ?? 'parent',
    order: m.order ?? existing?.order ?? db.members.length,
    updatedAt: now(),
  } as Member
  dispatch({ entity: 'members', action: 'upsert', items: [item] })
  return item
}

export function deleteMember(id: ID) {
  dispatch({ entity: 'members', action: 'delete', items: [{ id }] })
}

/* ---------- Etkinlikler ---------- */
export function saveEvent(e: Partial<EventItem> & { title: string; start: string }): EventItem {
  const item: EventItem = {
    ...e,
    id: e.id || uid('ev_'),
    allDay: e.allDay ?? false,
    memberIds: e.memberIds ?? [],
    updatedAt: now(),
  } as EventItem
  dispatch({ entity: 'events', action: 'upsert', items: [item] })
  return item
}

export function deleteEvent(id: ID) {
  dispatch({ entity: 'events', action: 'delete', items: [{ id }] })
}

/* ---------- Görevler ---------- */
export function saveChore(c: Partial<Chore> & { title: string }): Chore {
  const item: Chore = {
    ...c,
    id: c.id || uid('ch_'),
    repeat: c.repeat ?? 'none',
    startDate: c.startDate ?? todayKey(),
    updatedAt: now(),
  } as Chore
  dispatch({ entity: 'chores', action: 'upsert', items: [item] })
  return item
}

export function deleteChore(id: ID) {
  dispatch({ entity: 'chores', action: 'delete', items: [{ id }] })
}

export function isChoreDueToday(c: Chore, day = todayKey()): boolean {
  const d = new Date(day)
  const start = new Date(c.startDate)
  if (d.getTime() < start.getTime() - DAY_MS) return false
  switch (c.repeat) {
    case 'daily':
      return true
    case 'weekly':
      return d.getDay() === start.getDay()
    case 'monthly':
      return d.getDate() === start.getDate()
    default:
      return c.dueDate ? c.dueDate >= day : true
  }
}

export function isChoreDoneToday(c: Chore, day = todayKey()): boolean {
  return c.doneOn === day
}

export function toggleChore(c: Chore) {
  const day = todayKey()
  const done = isChoreDoneToday(c) ? undefined : day
  dispatch({
    entity: 'chores',
    action: 'upsert',
    items: [{ ...c, doneOn: done, updatedAt: now() }],
  })
}

/* ---------- Alışveriş ---------- */
export function addShopping(text: string, category: ShopCategory, addedById: ID, qty?: string): ShoppingItem {
  const item: ShoppingItem = {
    id: uid('sh_'),
    text: text.trim(),
    category,
    qty: qty?.trim() || undefined,
    done: false,
    addedById,
    updatedAt: now(),
  }
  dispatch({ entity: 'shopping', action: 'upsert', items: [item] })
  return item
}

export function toggleShopping(id: ID) {
  const item = getDB().shopping.find((s) => s.id === id)
  if (!item) return
  dispatch({ entity: 'shopping', action: 'upsert', items: [{ ...item, done: !item.done, updatedAt: now() }] })
}

export function deleteShopping(id: ID) {
  dispatch({ entity: 'shopping', action: 'delete', items: [{ id }] })
}

export function clearDoneShopping() {
  const done = getDB().shopping.filter((s) => s.done)
  if (!done.length) return
  dispatch({ entity: 'shopping', action: 'delete', items: done.map((d) => ({ id: d.id })) })
}

/* ---------- Yemekler ---------- */
export function saveMeal(date: string, slot: MealSlot, title: string): Meal | null {
  const db = getDB()
  const existing = db.meals.find((m) => m.date === date && m.slot === slot)
  if (!title.trim()) {
    if (existing) dispatch({ entity: 'meals', action: 'delete', items: [{ id: existing.id }] })
    return null
  }
  const item: Meal = {
    id: existing?.id || uid('ml_'),
    date,
    slot,
    title: title.trim(),
    updatedAt: now(),
  }
  dispatch({ entity: 'meals', action: 'upsert', items: [item] })
  return item
}

/* ---------- Kelimeler ---------- */
export function addWord(w: { term: string; meaning: string; deck: string; example?: string }): Word {
  const item: Word = {
    id: uid('w_'),
    term: w.term.trim(),
    meaning: w.meaning.trim(),
    example: w.example?.trim() || undefined,
    deck: w.deck.trim() || 'Genel',
    state: 'new',
    ease: 2.5,
    intervalMin: 0,
    reps: 0,
    lapses: 0,
    dueAt: now(),
    updatedAt: now(),
  }
  dispatch({ entity: 'words', action: 'upsert', items: [item] })
  return item
}

export function reviewWord(word: Word, rating: Rating): Word {
  const updated = scheduleAfter(word, rating)
  dispatch({ entity: 'words', action: 'upsert', items: [updated] })
  return updated
}

export function deleteWord(id: ID) {
  dispatch({ entity: 'words', action: 'delete', items: [{ id }] })
}

export function importWords(list: { term: string; meaning: string; deck?: string; example?: string }[], deck = 'İçe Aktarılan'): number {
  const items: Word[] = list
    .filter((w) => w?.term && w?.meaning)
    .map((w) => ({
      id: uid('w_'),
      term: String(w.term).trim(),
      meaning: String(w.meaning).trim(),
      example: w.example ? String(w.example) : undefined,
      deck: w.deck || deck,
      state: 'new',
      ease: 2.5,
      intervalMin: 0,
      reps: 0,
      lapses: 0,
      dueAt: now(),
      updatedAt: now(),
    }))
  if (items.length) dispatch({ entity: 'words', action: 'upsert', items })
  return items.length
}

/* ---------- Quiz ---------- */
export function saveQuestion(q: Partial<QuizQuestion> & { text: string; options: string[]; correct: number }): QuizQuestion {
  const item: QuizQuestion = {
    ...q,
    id: q.id || uid('q_'),
    category: q.category || 'Genel',
    updatedAt: now(),
  } as QuizQuestion
  dispatch({ entity: 'quiz', action: 'upsert', items: [item] })
  return item
}

export function deleteQuestion(id: ID) {
  dispatch({ entity: 'quiz', action: 'delete', items: [{ id }] })
}

export function saveQuizResult(questionId: ID, correct: boolean) {
  dispatch({
    entity: 'quizResults',
    action: 'upsert',
    items: [{ id: uid('qr_'), questionId, correct, at: now(), updatedAt: now() }],
  })
}

export function importQuiz(questions: Partial<QuizQuestion>[], category = 'İçe Aktarılan'): number {
  const items: QuizQuestion[] = questions
    .filter((q) => q && q.text && Array.isArray(q.options) && q.options.length >= 2)
    .map((q) => ({
      id: q.id || uid('q_'),
      text: String(q.text),
      options: q.options!.map(String),
      correct: Math.min(Number(q.correct ?? 0), q.options!.length - 1),
      explanation: q.explanation,
      category: q.category || category,
      updatedAt: now(),
    }))
  if (items.length) dispatch({ entity: 'quiz', action: 'upsert', items })
  return items.length
}

/* ---------- Mesajlar ---------- */
const localMessageIds = new Set<string>()

/** Bu cihazda üretilen mesajlar (kendi mesajımızda ses çalmamak için). */
export function isLocalMessage(id: ID): boolean {
  return localMessageIds.has(id)
}

export function sendMessage(fromId: ID, to: Message['to'], text: string): Message | null {
  const t = text.trim()
  if (!t) return null
  const item: Message = { id: uid('msg_'), fromId, to, text: t, at: now(), updatedAt: now() }
  localMessageIds.add(item.id)
  dispatch({ entity: 'messages', action: 'upsert', items: [item] })
  return item
}

export function deleteMessage(id: ID) {
  dispatch({ entity: 'messages', action: 'delete', items: [{ id }] })
}

/* ---------- Çocuk beslenme programı (haftalık, serbest menü) ---------- */
export function saveNutrition(input: {
  id?: ID
  memberId: ID
  weekday: number
  time: string
  title: string
  note?: string
}): NutritionEntry | null {
  const title = input.title.trim()
  if (!title) return null
  const item: NutritionEntry = {
    id: input.id || uid('nu_'),
    memberId: input.memberId,
    weekday: input.weekday,
    time: input.time || '12:00',
    title,
    note: input.note,
    updatedAt: now(),
  }
  dispatch({ entity: 'nutrition', action: 'upsert', items: [item] })
  return item
}

export function deleteNutrition(id: ID) {
  dispatch({ entity: 'nutrition', action: 'delete', items: [{ id }] })
}

/* ---------- Ders programı ---------- */
export function saveLesson(input: {
  id?: ID
  memberId: ID
  day: number
  start: string
  end: string
  subject: string
  room?: string
}): SchoolLesson | null {
  const subject = input.subject.trim()
  if (!subject) return null
  const item: SchoolLesson = {
    id: input.id || uid('ls_'),
    memberId: input.memberId,
    day: input.day,
    start: input.start,
    end: input.end,
    subject,
    room: input.room?.trim() || undefined,
    updatedAt: now(),
  }
  dispatch({ entity: 'lessons', action: 'upsert', items: [item] })
  return item
}

export function deleteLesson(id: ID) {
  dispatch({ entity: 'lessons', action: 'delete', items: [{ id }] })
}

/* ---------- Konumlar ---------- */
export function addLocation(label: string, lat: number, lon: number): void {
  const s = getDB().settings
  const list = s.savedLocations?.length ? [...s.savedLocations] : [{ label: HOME.city, lat: HOME.lat, lon: HOME.lon, home: true }]
  const clean = label.trim()
  if (list.some((l) => Math.abs(l.lat - lat) < 0.01 && Math.abs(l.lon - lon) < 0.01)) {
    // Zaten kayıtlıysa sadece aktifleştir
    saveSettings({ city: clean || list[0].label, lat, lon })
    return
  }
  list.push({ label: clean, lat, lon })
  saveSettings({ savedLocations: list, city: clean, lat, lon })
}

export function selectLocation(index: number): void {
  const list = getDB().settings.savedLocations ?? []
  const loc = list[index]
  if (!loc) return
  saveSettings({ city: loc.label, lat: loc.lat, lon: loc.lon })
}

export function removeLocation(index: number): void {
  const s = getDB().settings
  const list = s.savedLocations ?? []
  const target = list[index]
  if (!target || target.home) return // ev konumu silinemez
  const next = list.filter((_, i) => i !== index)
  const isActive = Math.abs((s.lat ?? HOME.lat) - target.lat) < 0.01 && Math.abs((s.lon ?? HOME.lon) - target.lon) < 0.01
  if (isActive) {
    const home = next[0] ?? { label: HOME.city, lat: HOME.lat, lon: HOME.lon, home: true }
    saveSettings({ savedLocations: next, city: home.label, lat: home.lat, lon: home.lon })
  } else {
    saveSettings({ savedLocations: next })
  }
}

/* ---------- Ayarlar ---------- */
export function saveSettings(patch: Partial<Settings>) {
  const current = getDB().settings
  dispatch({ entity: 'settings', action: 'upsert', items: [{ ...current, ...patch, updatedAt: now() }] })
}
