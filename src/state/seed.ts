import type { DB, Member, QuizQuestion, Word, Meal, ShoppingItem, Chore, Message, NutritionEntry, SchoolLesson } from '../types'
import { NUTRITION_SLOTS } from '../types'
import { emptyDB, defaultSettings } from './reducer'
import { addDays, dateKey, startOfWeek } from '../lib/time'
import { uid } from '../lib/id'

const now = Date.now()

function member(id: string, name: string, color: string, emoji: string, role: Member['role'], order: number): Member {
  return { id, name, color, emoji, role, order, updatedAt: now }
}

const MEMBERS: Member[] = [
  member('m_ana', 'Ayşe', '#f97362', '👩🏽', 'parent', 0),
  member('m_baba', 'Mehmet', '#4f6ef7', '👨🏽', 'parent', 1),
  member('m_kiz', 'Elif', '#22c55e', '🧒🏻', 'child', 2),
  member('m_ogl', 'Ali', '#f59e0b', '👦🏻', 'child', 3),
]

const WORDS: Word[] = [
  { id: 'w1', term: 'Serendipity', meaning: 'Aranmayan güzel bir şeyi tesadüfen bulma', example: 'Kitapçıda rastladığım kitap gerçek bir serendipity idi.', deck: 'İngilizce', state: 'new', ease: 2.5, intervalMin: 0, reps: 0, lapses: 0, dueAt: now, updatedAt: now },
  { id: 'w2', term: 'Empati', meaning: 'Başkasının duygularını anlayabilme yeteneği', deck: 'Terapi', state: 'new', ease: 2.5, intervalMin: 0, reps: 0, lapses: 0, dueAt: now, updatedAt: now },
  { id: 'w3', term: ' photosynthesis', meaning: 'Fotosentez - bitkilerin ışıkla besin üretmesi', example: 'Güneş enerjisi fotosentez için gereklidir.', deck: 'Biyoloji', state: 'review', ease: 2.5, intervalMin: 1440, reps: 3, lapses: 0, dueAt: now - 3600_000, updatedAt: now - 3600_000 },
  { id: 'w4', term: 'Compassion', meaning: 'Merhamet, şefkat', deck: 'İngilizce', state: 'learning', ease: 2.4, intervalMin: 60, reps: 2, lapses: 0, dueAt: now - 600_000, updatedAt: now - 600_000 },
]

const QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    text: 'Türkiye’nin başkenti neresidir?',
    options: ['İstanbul', 'Ankara', 'İzmir', 'Bursa'],
    correct: 1,
    category: 'Genel Kültür',
    updatedAt: now,
  },
  {
    id: 'q2',
    text: '2 + 2 × 2 kaç eder?',
    options: ['6', '8', '4', '10'],
    correct: 0,
    explanation: 'Önce çarpma: 2×2=4, sonra 2+4=6',
    category: 'Matematik',
    updatedAt: now,
  },
  {
    id: 'q3',
    text: 'Güneş sisteminin en büyük gezegeni hangisidir?',
    options: ['Satürn', 'Dünya', 'Jüpiter', 'Mars'],
    correct: 2,
    category: 'Bilim',
    updatedAt: now,
  },
  {
    id: 'q4',
    text: '“Elma” hangi renktir?',
    options: ['Mavi', 'Kırmızı', 'Siyah', 'Mor'],
    correct: 1,
    category: 'Kolay',
    updatedAt: now,
  },
]

function meals(): Meal[] {
  const base = startOfWeek(new Date())
  const plan: [number, Meal['slot'], string][] = [
    [0, 'breakfast', 'Menemen'], [0, 'lunch', 'Mercimek çorbası'], [0, 'dinner', 'Köfte & pilav'],
    [1, 'breakfast', 'Simit & peynir'], [1, 'lunch', 'Makarna'], [1, 'dinner', 'Tavuk sote'],
    [2, 'breakfast', 'Börek'], [2, 'lunch', 'Şorba & sandviç'], [2, 'dinner', 'Balık & salata'],
    [3, 'breakfast', 'Yulaf'], [3, 'lunch', 'Kuru fasulye'], [3, 'dinner', 'Pizza'],
    [4, 'breakfast', 'Pancake'], [4, 'lunch', 'Çoban salata'], [4, 'dinner', 'Mantı'],
    [5, 'breakfast', 'Kahvaltı tabağı'], [5, 'lunch', 'Ev lahmacun'], [5, 'dinner', 'Sebze yemeği'],
    [6, 'breakfast', 'Waffle'], [6, 'lunch', 'Sandviç'], [6, 'dinner', 'Çorba & poğaça'],
  ]
  return plan.map(([day, slot, title], i) => ({
    id: `meal_seed_${i}`,
    date: dateKey(addDays(base, day)),
    slot,
    title,
    updatedAt: now,
  }))
}

const SHOPPING: ShoppingItem[] = [
  { id: 's1', text: 'Süt', category: 'Market', qty: '2 L', done: false, addedById: 'm_ana', updatedAt: now },
  { id: 's2', text: 'Domates', category: 'Manav', qty: '1 kg', done: false, addedById: 'm_baba', updatedAt: now },
  { id: 's3', text: 'Ekmek', category: 'Fırın' as any, qty: '2', done: true, addedById: 'm_kiz', updatedAt: now },
  { id: 's4', text: 'Şampuan', category: 'Ecza', done: false, addedById: 'm_ana', updatedAt: now },
]

const CHORES: Chore[] = [
  { id: 'c1', title: 'Çöpü çıkar', assigneeId: 'm_baba', repeat: 'daily', startDate: dateKey(), updatedAt: now },
  { id: 'c2', title: 'Odaları topla', assigneeId: 'm_kiz', repeat: 'daily', startDate: dateKey(), updatedAt: now },
  { id: 'c3', title: 'Çamaşır as', assigneeId: 'm_ana', repeat: 'weekly', startDate: dateKey(), updatedAt: now },
  { id: 'c4', title: 'Halıları süpür', assigneeId: 'm_ogl', repeat: 'weekly', startDate: dateKey(), updatedAt: now },
  { id: 'c5', title: 'Banyoları temizle', assigneeId: 'm_baba', repeat: 'monthly', startDate: dateKey(), updatedAt: now },
]

const MESSAGES: Message[] = [
  { id: 'msg1', fromId: 'm_ana', to: 'wall', text: 'Akşam 18:30’da misafir geliyor 🏠', at: now - 7200_000, updatedAt: now - 7200_000 },
  { id: 'msg2', fromId: 'm_kiz', to: 'wall', text: 'Matematik ödevimi bitirdim!', at: now - 3600_000, updatedAt: now - 3600_000 },
]

/* ---------- Örnek beslenme programı (haftalık, serbest menü) ---------- */
const NUTRITION_SEED: [string, string, string, string][] = [
  ['m_kiz', 'kiz', '07:30', 'Kahvaltı: yulaf, süt ve muz'],
  ['m_kiz', 'kiz', '10:00', 'Ara öğün: yoğurt ve badem'],
  ['m_kiz', 'kiz', '12:30', 'Öğle: pilav, tavuk ve yeşillik'],
  ['m_kiz', 'kiz', '15:30', 'İkindi: elma ve ceviz'],
  ['m_kiz', 'kiz', '18:30', 'Akşam: mercimek çorbası ve ekmek'],
  ['m_ogl', 'ogl', '07:30', 'Kahvaltı: yumurta, peynir ve domates'],
  ['m_ogl', 'ogl', '10:15', 'Ara öğün: meyve tabağı'],
  ['m_ogl', 'ogl', '12:30', 'Öğle: makarna ve köfte'],
  ['m_ogl', 'ogl', '15:45', 'İkindi: süt ve bisküvi'],
  ['m_ogl', 'ogl', '18:30', 'Akşam: sebze yemeği ve ayran'],
]

const NUTRITION: NutritionEntry[] = NUTRITION_SEED.map(([memberId, tag, time, title], i) => ({
  id: `nut_seed_${tag}_${i}`,
  memberId,
  weekday: 1, // Pazartesi ile başlayan haftalık plan
  time,
  title,
  updatedAt: now,
}))

/* ---------- Örnek ders programı (haftalık) ---------- */
const LESSON_SEED: [string, string, number, string, string, string][] = [
  ['m_kiz', 'kiz', 1, '08:30', '09:15', 'Matematik'],
  ['m_kiz', 'kiz', 1, '09:25', '10:10', 'Türkçe'],
  ['m_kiz', 'kiz', 1, '10:30', '11:15', 'Fen Bilimleri'],
  ['m_kiz', 'kiz', 2, '08:30', '09:15', 'İngilizce'],
  ['m_kiz', 'kiz', 2, '09:25', '10:10', 'Sosyal Bilgiler'],
  ['m_kiz', 'kiz', 2, '10:30', '11:15', 'Beden Eğitimi'],
  ['m_kiz', 'kiz', 3, '09:25', '10:10', 'Müzik'],
  ['m_kiz', 'kiz', 4, '08:30', '09:15', 'Matematik'],
  ['m_kiz', 'kiz', 5, '10:30', '11:15', 'Görsel Sanatlar'],
  ['m_ogl', 'ogl', 1, '08:45', '09:25', 'Türkçe'],
  ['m_ogl', 'ogl', 1, '09:35', '10:15', 'Matematik'],
  ['m_ogl', 'ogl', 2, '08:45', '09:25', 'Hayat Bilgisi'],
  ['m_ogl', 'ogl', 3, '10:00', '10:40', 'Beden Eğitimi'],
  ['m_ogl', 'ogl', 4, '09:35', '10:15', 'İngilizce'],
  ['m_ogl', 'ogl', 5, '08:45', '09:25', 'Resim'],
]

const LESSONS: SchoolLesson[] = LESSON_SEED.map(([memberId, tag, day, start, end, subject], i) => ({
  id: `les_seed_${tag}_${i}`,
  memberId,
  day,
  start,
  end,
  subject,
  room: day % 2 === 0 ? 'B Blok' : 'A Blok',
  updatedAt: now,
}))

/** İlk açılış tohum verisi — birden fazla cihaz aynı tohumu üretir (id'ler sabit). */
export function seedDB(): DB {
  const base = emptyDB()
  return {
    ...base,
    members: MEMBERS,
    events: [
      { id: 'ev1', title: 'Diş hekimi', start: new Date(addDays(new Date(), 0).setHours(16, 30, 0, 0)).toISOString(), allDay: false, memberIds: ['m_ogl'], location: 'Klinik', updatedAt: now },
      { id: 'ev2', title: 'Yüzme dersi', start: new Date(addDays(new Date(), 1).setHours(17, 0, 0, 0)).toISOString(), allDay: false, memberIds: ['m_kiz', 'm_ogl'], location: 'Kapalı havuz', updatedAt: now },
      { id: 'ev3', title: 'Dede ziyareti', start: dateKey(addDays(new Date(), 3)), allDay: true, memberIds: ['m_ana', 'm_baba', 'm_kiz', 'm_ogl'], updatedAt: now },
      { id: 'ev4', title: 'Elif’in doğum günü', start: dateKey(addDays(new Date(), 6)), allDay: true, memberIds: ['m_kiz'], updatedAt: now },
    ],
    chores: CHORES,
    shopping: SHOPPING,
    meals: meals(),
    words: WORDS,
    quiz: QUIZ,
    messages: MESSAGES,
    nutrition: NUTRITION,
    lessons: LESSONS,
    settings: defaultSettings(),
    quizResults: [],
  }
}
