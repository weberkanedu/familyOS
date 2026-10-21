/**
 * Günün ayeti / hadisi — TV ana ekranının sol üstündeki iki satır.
 *
 * Kaynaklar (ücretsiz, açık API'ler):
 *  - Ayet:  seçilmiş, tek başına anlamlı ayetler (CURATED_AYAT); metin api.alquran.cloud'dan
 *           Diyanet İşleri meali (tr.diyanet). Rastgele ayet bağlamından kopunca yanlış anlaşılabiliyordu
 *           (ör. "İşte bu adamı yakıcı bir ateşe yaslayacağım." — Müddessir 26).
 *  - Hadis: seçilmiş kısa sahih hadisler (src/lib/hadisList.ts) — açık API başlıkları çoğu zaman
 *           bağlamından kopuk parçalar olduğu için kullanılmıyor
 *
 * Tarayıcı bu adreslere doğrudan gidemez (CSP connect-src), stick'i de yormasın:
 * sunucu kısa (tek satıra sığan) içeriklerden bir havuz toplar, diske yazar ve her istekte
 * havuzdan rastgele birer tane verir. API'ler çökse bile son havuzla çalışmaya devam eder.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomHadis } from '../src/lib/hadisList'

export type SpiritualItem = { text: string; ref: string }
type Pool = { ayet: SpiritualItem[]; refs?: string[] }

/** sure:ayet — kısa, tek başına anlamlı, sık okunan ayetler */
const CURATED_AYAT = [
  '94:5', '94:6', '13:28', '2:153', '112:1', '3:139', '93:5', '93:3', '94:8', '55:13', '87:14', '91:9', '23:1',
  '99:7', '99:8', '33:41', '11:115', '2:152', '20:114', '57:4', '50:16', '29:69', '2:195', '49:10', '39:10',
  '65:3', '64:11', '3:134', '17:81', '2:286', '8:46', '96:1', '73:8', '108:1', '110:3', '2:45', '40:60', '16:128',
]
const MAX_LEN = 96 // TV'de 14px ile tek satıra sığan uzunluk (kaynak hariç)
const POOL_MAX = 80

/* Türkçe sure adları (Diyanet yazımı) */
const SURAH_TR = [
  'Fâtiha', 'Bakara', 'Âl-i İmrân', 'Nisâ', 'Mâide', 'En’âm', 'A’râf', 'Enfâl', 'Tevbe', 'Yûnus', 'Hûd', 'Yûsuf', 'Ra’d',
  'İbrâhîm', 'Hicr', 'Nahl', 'İsrâ', 'Kehf', 'Meryem', 'Tâhâ', 'Enbiyâ', 'Hac', 'Mü’minûn', 'Nûr', 'Furkān', 'Şuarâ', 'Neml',
  'Kasas', 'Ankebût', 'Rûm', 'Lokmân', 'Secde', 'Ahzâb', 'Sebe’', 'Fâtır', 'Yâsîn', 'Sâffât', 'Sâd', 'Zümer', 'Mü’min',
  'Fussilet', 'Şûrâ', 'Zuhruf', 'Duhân', 'Câsiye', 'Ahkāf', 'Muhammed', 'Fetih', 'Hucurât', 'Kāf', 'Zâriyât', 'Tûr', 'Necm',
  'Kamer', 'Rahmân', 'Vâkıa', 'Hadîd', 'Mücâdele', 'Haşr', 'Mümtehine', 'Saf', 'Cuma', 'Münâfikūn', 'Teğâbün', 'Talâk',
  'Tahrîm', 'Mülk', 'Kalem', 'Hâkka', 'Meâric', 'Nûh', 'Cin', 'Müzzemmil', 'Müddessir', 'Kıyâme', 'İnsân', 'Mürselât',
  'Nebe’', 'Nâziât', 'Abese', 'Tekvîr', 'İnfitâr', 'Mutaffifîn', 'İnşikāk', 'Bürûc', 'Târık', 'A’lâ', 'Gāşiye', 'Fecr',
  'Beled', 'Şems', 'Leyl', 'Duhâ', 'İnşirâh', 'Tîn', 'Alak', 'Kadir', 'Beyyine', 'Zilzâl', 'Âdiyât', 'Kāria', 'Tekâsür',
  'Asr', 'Hümeze', 'Fîl', 'Kureyş', 'Mâûn', 'Kevser', 'Kâfirûn', 'Nasr', 'Tebbet', 'İhlâs', 'Felak', 'Nâs',
]

async function getJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json', 'User-Agent': 'familyOS/1.0' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return (await r.json()) as T
  } finally {
    clearTimeout(t)
  }
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

async function fetchAyet(ref: string): Promise<SpiritualItem | null> {
  const j = await getJson<{ data: { text: string; numberInSurah: number; surah: { number: number } } }>(
    `https://api.alquran.cloud/v1/ayah/${ref}/tr.diyanet`,
  )
  const text = clean(j.data.text)
  if (!text || text.length > MAX_LEN) return null // uzun meal tek satıra sığmaz
  return { text, ref: `${SURAH_TR[j.data.surah.number - 1] ?? 'Sure ' + j.data.surah.number}, ${j.data.numberInSurah}` }
}

export function createSpiritual(file: string) {
  let pool: Pool = { ayet: [] }
  try {
    if (existsSync(file)) pool = { ayet: [], ...JSON.parse(readFileSync(file, 'utf8')) }
    if (!pool.refs) pool = { ayet: [] } // eski biçim (rastgele ayetler): at, seçilmiş listeden yeniden doldur
  } catch {
    /* bozuk dosya: boş havuzla başla */
  }
  let filling: Promise<void> | null = null

  const uniq = (items: SpiritualItem[]) => [...new Map(items.map((i) => [i.text, i])).values()].slice(-POOL_MAX)

  function save() {
    try {
      writeFileSync(file, JSON.stringify(pool))
    } catch (e) {
      console.warn('Ayet/hadis havuzu kaydedilemedi:', (e as Error).message)
    }
  }

  async function fill() {
    // Seçilmiş ayetlerin Diyanet meallerini 6'şar paralel çek (bir kez; diske yazılır)
    const have = new Set(pool.refs ?? [])
    const todo = CURATED_AYAT.filter((r) => !have.has(r))
    const found: SpiritualItem[] = []
    for (let i = 0; i < todo.length; i += 6) {
      const batch = todo.slice(i, i + 6)
      const got = await Promise.allSettled(batch.map(fetchAyet))
      got.forEach((g, k) => {
        if (g.status === 'fulfilled') {
          have.add(batch[k]) // çok uzun olanı da "denendi" say, tekrar istemesin
          if (g.value) found.push(g.value)
        }
      })
    }
    pool = { ayet: uniq([...pool.ayet, ...found]), refs: [...have] }
    if (found.length || todo.length) save()
  }

  function ensure(): Promise<void> {
    if (!filling && (pool.refs?.length ?? 0) < CURATED_AYAT.length) {
      filling = fill()
        .catch((e) => console.warn('Ayet/hadis alınamadı:', (e as Error).message))
        .finally(() => {
          filling = null
        })
    }
    return filling ?? Promise.resolve()
  }

  const pick = <T>(a: T[]) => (a.length ? a[Math.floor(Math.random() * a.length)] : null)

  return {
    /** Havuzdan rastgele bir ayet + listeden bir hadis; ayet havuzu boşsa bir kez doldurmayı bekler. */
    async random(): Promise<{ ayet: SpiritualItem | null; hadis: SpiritualItem | null }> {
      if (!pool.ayet.length) await ensure()
      else void ensure() // azaldıysa arka planda tamamla
      return { ayet: pick(pool.ayet), hadis: randomHadis() }
    },
    warmUp: () => void ensure(),
  }
}
