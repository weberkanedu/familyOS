export type ID = string

export type Role = 'parent' | 'child'

export interface Member {
  id: ID
  name: string
  color: string
  emoji: string
  role: Role
  order: number
  /** Kişi fotoğrafı (data URL) — varsa emoji yerine kullanılır */
  photo?: string
  /** Doğum günü (YYYY-MM-DD) — o gün ekranda kutlama */
  birthday?: string
  updatedAt: number
}

export interface EventItem {
  id: ID
  title: string
  start: string // ISO datetime ya da YYYY-MM-DD (allDay)
  end?: string
  allDay: boolean
  memberIds: ID[]
  location?: string
  notes?: string
  updatedAt: number
}

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Chore {
  id: ID
  title: string
  assigneeId?: ID
  repeat: Repeat
  startDate: string // YYYY-MM-DD
  dueDate?: string // repeat=none için son tarih
  doneOn?: string // en son tamamlandığı gün (YYYY-MM-DD)
  /** doneOn gününde kim tamamladı (yıldız geri alınırken gerekli) */
  doneBy?: ID
  /** Üye başına toplam yıldız (her tamamlama +1) */
  stars?: Record<ID, number>
  updatedAt: number
}

export type ShopCategory = 'Market' | 'Manav' | 'Kasap' | 'Bakkal' | 'Ecza' | 'Diğer'

export const SHOP_CATEGORIES: ShopCategory[] = ['Market', 'Manav', 'Kasap', 'Bakkal', 'Ecza', 'Diğer']

export interface ShoppingItem {
  id: ID
  text: string
  category: ShopCategory
  qty?: string
  done: boolean
  addedById: ID
  updatedAt: number
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı' },
  { key: 'lunch', label: 'Öğle' },
  { key: 'dinner', label: 'Akşam' },
]

export interface Meal {
  id: ID
  date: string // YYYY-MM-DD
  slot: MealSlot
  title: string
  note?: string
  updatedAt: number
}

export type WordState = 'new' | 'learning' | 'review'

export interface Word {
  id: ID
  term: string
  meaning: string
  example?: string
  deck: string
  state: WordState
  ease: number // SM-2 zorluk çarpanı (1.3 - 3.0)
  intervalMin: number // dakika cinsinden tekrar aralığı
  reps: number
  lapses: number
  dueAt: number // epoch ms
  lastReviewedAt?: number
  updatedAt: number
}

export interface QuizQuestion {
  id: ID
  text: string
  options: string[]
  correct: number
  explanation?: string
  category?: string
  updatedAt: number
}

export interface QuizResult {
  id: ID
  questionId: ID
  correct: boolean
  at: number
  updatedAt: number
}

export type MessageTarget = 'wall' | ID

export interface Message {
  id: ID
  fromId: ID
  to: MessageTarget
  text: string
  at: number
  updatedAt: number
}

/* ---------- Çocuk beslenme programı ---------- */
export type NutritionSlot = 'sabah' | 'ara1' | 'ogle' | 'ara2' | 'aksam'

export const NUTRITION_SLOTS: { key: NutritionSlot; label: string; time: string; icon: string }[] = [
  { key: 'sabah', label: 'Kahvaltı', time: '07:30', icon: '🥣' },
  { key: 'ara1', label: 'Ara Öğün', time: '10:00', icon: '🍎' },
  { key: 'ogle', label: 'Öğle Yemeği', time: '12:30', icon: '🍛' },
  { key: 'ara2', label: 'İkindi', time: '15:30', icon: '🥛' },
  { key: 'aksam', label: 'Akşam Yemeği', time: '18:30', icon: '🍲' },
]

export interface NutritionEntry {
  id: ID
  memberId: ID
  /** 1 = Pazartesi ... 7 = Pazar (haftalık program) */
  weekday: number
  time: string // HH:MM
  title: string
  note?: string
  updatedAt: number
}

/* ---------- Ders programı ---------- */
export interface SchoolLesson {
  id: ID
  memberId: ID
  day: number // 1 = Pazartesi ... 7 = Pazar
  start: string // HH:MM
  end: string // HH:MM
  subject: string
  room?: string
  updatedAt: number
}

export type AppMode = 'auto' | 'kiosk' | 'mobile'

export type NightMode = 'auto' | 'off' | 'always'

/** Bildirim sesi tercihi */
export type SoundMode = 'off' | 'all' | 'wall'

export interface SavedLocation {
  label: string
  lat: number
  lon: number
  /** true = ev konumu (silinemez) */
  home?: boolean
}

export interface Settings {
  id: 'main'
  familyName: string
  /** Sol üstte görünen marka/aile adı (ayarlardan değiştirilebilir) */
  brandName?: string
  /** Renk teması (bkz. lib/themes.ts) */
  theme?: string
  /** Sol menü daraltılmış mı? */
  navCollapsed?: boolean
  mode: AppMode
  idleMinutes: number
  city: string
  lat: number
  lon: number
  weatherEnabled: boolean
  soundEnabled: boolean
  soundMode?: SoundMode
  /** Kayıtlı lokasyonlar (ilk kayıt ev konumu) */
  savedLocations?: SavedLocation[]
  /** Sol üstteki aile fotoğrafı (data URL) */
  familyPhoto?: string
  /** Gece modu: auto = saat aralığında koyu tema */
  nightMode?: NightMode
  /** Gece modunun başladığı / bittiği saat (0-23) */
  nightFrom?: number
  nightTo?: number
  /** Doğum günü / bayram süslemeleri */
  celebrations?: boolean
  updatedAt: number
}

export type EntityKey =
  | 'members'
  | 'events'
  | 'chores'
  | 'shopping'
  | 'meals'
  | 'words'
  | 'quiz'
  | 'quizResults'
  | 'messages'
  | 'nutrition'
  | 'lessons'
  | 'settings'

export const ENTITY_KEYS: EntityKey[] = [
  'members',
  'events',
  'chores',
  'shopping',
  'meals',
  'words',
  'quiz',
  'quizResults',
  'messages',
  'nutrition',
  'lessons',
  'settings',
]

export interface DB {
  members: Member[]
  events: EventItem[]
  chores: Chore[]
  shopping: ShoppingItem[]
  meals: Meal[]
  words: Word[]
  quiz: QuizQuestion[]
  quizResults: QuizResult[]
  messages: Message[]
  nutrition: NutritionEntry[]
  lessons: SchoolLesson[]
  settings: Settings
}
