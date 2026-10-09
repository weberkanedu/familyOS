/**
 * Yemek Öneri Motoru
 *
 * 1) Ev içi kütüphane: aileye uygun, mevsime göre sıralanan Türk yemekleri
 *    (malzeme + kısa tarif adımları, çevrimdışı da çalışır).
 * 2) İnternet: TheMealDB (ücretsiz, anahtarsız, CORS açık) üzerinden gerçek
 *    fotoğraf ve tam tarif metni çekilir.
 *
 * Öneri sıralaması hava durumuna göre de esneklik gösterir:
 * soğukta sıcak/çorba, sıcakta hafif/salata öne çıkar.
 */
import type { MealSlot } from '../types'

export interface Dish {
  id: string
  title: string
  kind: MealSlot
  /** TheMealDB arama anahtarı (fotoğraf + tam tarif) */
  en: string
  tags: string[]
  ingredients: string[]
  steps: string[]
  /** Tercih edilen aylar (1-12). Boşsa yıl boyu. */
  months?: number[]
  /** Hafif/soğuk şartlarda iyi mi? */
  light?: boolean
  /** Soğuk havada iyi mi? */
  warm?: boolean
}

export interface OnlineRecipe {
  id: string
  title: string
  image: string
  instructions: string
  area?: string
  category?: string
  source: string
}

const API = 'https://www.themealdb.com/api/json/v1/1'

const mk = (
  kind: MealSlot,
  title: string,
  en: string,
  tags: string[],
  ingredients: string[],
  steps: string[],
  extra: { months?: number[]; light?: boolean; warm?: boolean } = {},
): Dish => ({
  id: `${kind}_${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`,
  title,
  kind,
  en,
  tags,
  ingredients,
  steps,
  ...extra,
})

/* ============================ KAHVALTI ============================ */
const BREAKFAST: Dish[] = [
  mk('breakfast', 'Menemen', 'menemen omelette', ['hızlı', 'proteinli'], ['2 yumurta', '1 domates', '1 biber', 'bir tutar tereyağı', 'tuz'], ['Yumurtaları çat ve çırp.', 'Domates ve biberi küçük doğrayıp tavada pişir.', 'Yumurtayı ekleyip 3-4 dakika karıştırarak pişir.'], { months: [1, 2, 3, 10, 11, 12] }),
  mk('breakfast', 'Karışık omlet', 'omelette', ['proteinli'], ['3 yumurta', 'beyaz peynir', 'domates', 'maydanoz'], ['Yumurtayı çırp, tuz karıştır.', 'Tavadaki yağda 2 dakika pişir, peynir ve yeşillik ekle.'], { months: [1, 2, 3, 4, 10, 11, 12] }),
  mk('breakfast', 'Simit & peynir', 'bread', ['ekonomik'], ['2 simit', 'beyaz peynir', 'tereyağı', 'çay'], ['Simitleri ısıt.', 'Peyniri yağla birlikte simit arasına yerleştir.'], { months: [1, 2, 3, 11, 12] }),
  mk('breakfast', 'Yulaf, süt ve muz', 'porridge', ['sağlıklı', 'hızlı'], ['1 su bardağı yulaf', '1.5 su bardağı süt', '1 muz', 'bal veya ceviz'], ['Yulafı sütle pişir.', 'Üzerine dilimlenmiş muz ve bal ekle.'], { light: true, months: [4, 5, 6, 7, 8, 9] }),
  mk('breakfast', 'Pankek', 'pancakes', ['çocuk sever'], ['2 yumurta', '1 su bardağı un', '1 su bardağı süt', '1 tatlı kaşığı bal', 'çaydan kaşığı kabartma tozu'], ['Hamuru karıştır.', 'Açtadır iki tarafını da kızart.'], { light: true, months: [4, 5, 6, 9, 10, 11] }),
  mk('breakfast', 'Çılbart', 'turkish breakfast eggs', ['geleneksel', 'proteinli'], ['3 yumurta', 'yoğurt', 'tereyağı', 'pul biber'], ['Yumurtayı suda 8-10 dakika kaynat, soy.', 'Yoğurt üzerine tereyağı ve pul biber ekle.'], { warm: true, months: [1, 2, 3, 10, 11, 12] }),
  mk('breakfast', 'Börek', 'stuffed pastry', ['geleneksel'], ['yufka', 'beyaz peynir', 'patlıcan', 'yumurta'], ['Harcayı hazırla, yufkaya sar.', 'Tefsi veya fırında 25 dakika pişir.'], { months: [1, 2, 3, 10, 11, 12] }),
  mk('breakfast', 'Kahvaltı tabağı', 'breakfast platter', ['çeşitli'], ['peynir', 'zeytin', 'domates', 'kuru üzüm', 'yumurta', 'ekmek'], ['Tabağa tüm malzemeleri yerleştir, ekmeği ısıt.'], { months: [1, 2, 3, 4, 10, 11, 12] }),
  mk('breakfast', 'Sütlü yulaf & fıst', 'oatmeal', ['sağlıklı'], ['yulaf', 'süt', 'fıst ezmesi', 'badem'], ['Yulafı sütle 5 dakika pişir.', 'Üzerine fıst ve badem serp.'], { light: true }),
  mk('breakfast', 'Meyve tabaklı yoğurt', 'fruit salad', ['hafif', 'sağlıklı'], ['2 su bardağı yoğurt', 'çilek', 'muz', 'kivi', 'granola'], ['Yoğurdu kaselere koy, meyveleri üste diz ve granola serp.'], { light: true, months: [5, 6, 7, 8, 9] }),
  mk('breakfast', 'Beyaz peynirli tost', 'cheese toast', ['hızlı'], ['2 dilim ekmek', 'beyaz peynir', 'tereyağı'], ['Ekmeği tereyağıyla yağla, peyniri koy ve tavada kızart.'], { months: [1, 2, 3, 11, 12] }),
  mk('breakfast', 'Çıvırlama', 'turkish omelet sucuk', ['geleneksel', 'proteinli'], ['yumurta', 'sucuk', 'biber', 'domates'], ['Sucuğu tavada kızart.', 'Üzerine çırpılmış yumurta dök.'], { months: [1, 2, 3, 10, 11, 12] }),
  mk('breakfast', 'Şahane (ballı kaymak)', 'clotted cream', ['tatlı', 'geleneksel'], ['kaymak', 'bal', 'börek yada ekmek'], ['Kaymağı bal ile servis et.'], { months: [1, 2, 3, 4, 11, 12] }),
  mk('breakfast', 'Tarhana çorbası', 'tomato soup', ['sıcak', 'vitaminli'], ['1 su bardağı tarhana', '1 bardak su', 'tuz', 'soğan yağı'], ['Tarhanayı ısıt, su ekle ve kısık ateşte 10 dakika kaynat.'], { warm: true, months: [10, 11, 12, 1, 2, 3] }),
  mk('breakfast', 'Maden suyu ile kızarmış ekmek', 'french toast', ['tatlı'], ['3 dilim ekmek', '2 yumurta', '1 su bardağı süt', 'şeker'], ['Ekmeği yumurta-süt karışımına batır, tavada kızart.'], { light: true, months: [4, 5, 9, 10] }),
]

/* ============================= ÖĞLE ============================= */
const LUNCH: Dish[] = [
  mk('lunch', 'Mercimek çorbası', 'lentil soup', ['çorba', 'sıcak'], ['1 su bardağı kırmızı mercimek', '1 soğan', '1 havuç', '1 patates', 'nane', 'zeytinyağı'], ['Sebzeleri doğra, yağda sotele.', 'Mercimeği ekle, 10 bardak suyla 30 dakika pişir.', 'Nane ve limon ile servis et.'], { warm: true, months: [10, 11, 12, 1, 2, 3, 4] }),
  mk('lunch', 'Çoban salata', 'shepherd pie', ['doyurucu'], ['kıyma', 'patates', 'domates', 'biber', 'soğan'], ['Kıymayı ve soğanı pişir, biber ve domates ekle.', 'Üzerine patates rendesi ile fırında 20 dakika.'], { warm: true, months: [9, 10, 11, 12, 1, 2, 3] }),
  mk('lunch', 'Fırın tavuk & sebze', 'roast chicken', ['doyurucu', 'proteinli'], ['4 tavuk budu', 'patates', 'havuç', 'soğan', 'zeytinyağı'], ['Tümünü tavaya diz, yağ ve baharat ekle.', '200 derecede 45 dakika pişir.'], { warm: true }),
  mk('lunch', 'Kuru fasulye & pilav', 'bean soup', ['proteinli', 'ucuz'], ['2 su bardağı kuru fasulye', '1 bardağı pirinç', 'soğan', 'domates'], ['Fasulyeyi ıslatıp pişir.', 'Pilavı soğanlı yağda pişir, fasulyeyi ekle.'], { warm: true, months: [1, 2, 3, 10, 11, 12] }),
  mk('lunch', 'Makarna (salçalı)', 'spaghetti bolognese', ['çocuk sever'], ['400 g makarna', '2 yemek kaşığı domates salçası', 'kıyma', 'soğan', 'sarımsak'], ['Kıyma ve soğanı sotele, salça ekle.', 'Makarna haşla, sosla karıştır.'], { months: [1, 2, 3, 4, 9, 10, 11, 12] }),
  mk('lunch', 'Pilav üstü tavuk şiş', 'chicken shish', ['proteinli'], ['2 tavuk göğsü', '1.5 su bardağı pirinç', ' biber', 'domates', 'zeytinyağı'], ['Pilavı pişir.', 'Tavuğu ve biberi şişte pişir, pilavın üzerine diz.'], { warm: true }),
  mk('lunch', 'Yoğurtlu köfte & pilav', 'meatballs', ['geleneksel'], ['500 g kıyma', '1 yumurta', '1 soğan', 'pirinç pilavı', 'yoğurt'], ['Kıymayı yumurta ve rendelenmiş soğanla yoğur, köfte yap.', 'Tavada kızart, pilav ve yoğurtla servis et.'], { warm: true }),
  mk('lunch', 'Lahmacun', 'lahmacun', ['uzun ömürlü'], ['2 yufka', 'kıyma', 'domates', 'biber', 'soğan'], ['Kıymalı harç yap, yufkaya sar.', '250 derecede 10 dakika pişir.'], { months: [1, 2, 3, 10, 11, 12] }),
  mk('lunch', 'Mantı', 'dumplings', ['geleneksel', 'paylaşmalık'], ['mantı hamuru', 'kıymalı iç', 'sarımsaklı yoğurt', 'tereyağı'], ['Hamuru aç, içi doldur, fırında pişir.', 'Yoğurt ve tereyağı sosu dök.'], { warm: true, months: [11, 12, 1, 2] }),
  mk('lunch', 'Sebze çorbası', 'vegetable soup', ['hafif', 'vitaminli'], ['kabak', 'havuç', 'patates', 'domates', 'nane'], ['Sebzeleri doğrayıp suyla 25 dakika pişir.', 'Nane ekleyi servis et.'], { warm: true, light: true }),
  mk('lunch', 'Ton balıklı sandviç', 'tuna sandwich', ['hızlı', 'hafif'], ['1 kutu ton balığı', '2 ekmek', 'marul', 'mısır', 'mayonez'], ['Balığı mayonezle karıştır.', 'Ekme arasına malzemeleri diz.'], { light: true }),
  mk('lunch', 'Çoban köfte (sade)', 'meatloaf', ['çocuk sever'], ['kıyma', 'yumurta', 'pirinç pilavı', 'domates sosu'], ['Kıymalı köfteleri şekillendir, tavada kızart.', 'Üzerine domates sosu dök, fırında 15 dakika.'], { warm: true }),
  mk('lunch', 'Beyaz fasulye salata', 'bean salad', ['sağlıklı', 'hafif'], ['2 su bardağı beyaz fasulye', '1 kase mısır', 'salatalık', 'domates', 'zeytinyağı', 'limon'], ['Fasulyeyi haşla ve soğut.', 'Tüm malzemeleri karıştırıp zeytinyağı-limona gez.'], { light: true, months: [5, 6, 7, 8, 9] }),
  mk('lunch', 'Kısır', 'bulgur salad', ['pratik'], ['2 su bardağı kısır bulguru', '2 domates', 'biber', 'maydanoz', 'zeytinyağı'], ['Bulguru haşla ve soğut.', 'Sebzelerle karıştır, yağlı sos gez.'], { light: true, months: [5, 6, 7, 8, 9] }),
  mk('lunch', 'İmam bayıldı', 'stuffed eggplant', ['geleneksel'], ['3 patlıcan', '2 domates', 'soğan', 'zeytinyağı', 'sarımsak'], ['Patlıcanları kızart veya fırında pişir.', 'İçine domateslu sos doldur, 15 dakika fırında.'], { warm: true, months: [6, 7, 8, 9] }),
  mk('lunch', 'Krokan (tavuk kızartma)', 'fried chicken', ['çocuk sever'], ['4 tavuk budu', 'un', 'yumurta', 'baharat'], ['Tavuğu un-yumurta karışımına bulayıp yağda kızart.'], { months: [1, 2, 3, 11, 12] }),
  mk('lunch', 'Sebze aşure (kış)', 'lentil stew', ['sıcak', 'bol'], ['kabak', 'patates', 'havuç', 'nohut', 'domates'], ['Sebzeleri doğra, nohutla birlikte pişir.'], { warm: true, months: [11, 12, 1, 2, 3] }),
]

/* ============================ AKŞAM ============================ */
const DINNER: Dish[] = [
  mk('dinner', 'İnegol köfte', 'meatballs', ['klasik', 'çocuk sever'], ['750 g kıyma', '1 soğan', '2 yumurta', 'pirinç pilavı', 'domates sosu'], ['Kıymayı soğan ve yumurta ile yoğur.', 'Köfteleri kızart veya fırında pişir, sos ve pilavla servis et.'], { warm: true }),
  mk('dinner', 'Kuzu sote (soya soslu)', 'lamb stew', ['gururlu', 'doyurucu'], ['1 kg kuzu incik', '1 soğan', '2 havuç', 'salça', 'soya sosu', ' biberiye'], ['Etleri kızart, sebzeleri ekle ve kavruluk suda 1 saat pişir.'], { warm: true, months: [1, 2, 3, 10, 11, 12] }),
  mk('dinner', 'Tavuk sote & pilav', 'chicken stew', ['günlük', 'pratik'], ['600 g tavuk', '2 biber', 'soğan', 'domates', 'pilav'], ['Tavuğu ve biberi sotele, domates ekle ve kısa pişir.', 'Pilavla servis et.'], { warm: true }),
  mk('dinner', 'Köfte & pilav', 'meatballs', ['klasik'], ['600 g kıyma', 'pilav', 'domates sosu', 'sarımsaklı yoğurt'], ['Köfteleri pişir, pilav ve sosla servis et.'], { warm: true }),
  mk('dinner', 'Balık (levrek) & ızgara sebze', 'grilled fish', ['sağlıklı', 'hafif'], ['2 levrek', 'zeytinyağı', 'limon', 'patates', 'kabak', 'domates'], ['Balığı marine et, ızgarada pişir.', 'Sebzeleri de ızgarada kızart.'], { light: true, months: [4, 5, 6, 9, 10] }),
  mk('dinner', 'Kari güvercin/tavuk', 'chicken curry', ['baharatlı'], ['600 g tavuk', '2 soğan', 'sarımsak', 'kayısı pulu', 'soslu', 'süt'], ['Tavuğu kızart, baharatları ekle, süt ile pişir.', 'Pilavla servis et.'], { warm: true, months: [9, 10, 11, 12, 1, 2] }),
  mk('dinner', 'Tavuk şiş', 'chicken shish', ['klasik'], ['600 g tavuk göğsü', '2 biber', '2 soğan', 'pilav', 'cacık'], ['Tavuğu doğra ve şişle, ızgarada pişir.', 'Pilav ve cacıkla servis et.'], { warm: true, months: [4, 5, 6, 9, 10] }),
  mk('dinner', 'Sebze sote & makarna', 'vegetable pasta', ['vejetaryen', 'hafif'], ['kabak', 'patlıcan', 'biber', 'domates', 'makarna'], ['Sebzeleri sotele, sosla makarna ile karıştır.'], { light: true, months: [5, 6, 7, 8, 9] }),
  mk('dinner', 'Kısır & yoğurt', 'bulgur', ['pratik'], ['kısır bulguru', 'yoğurt', 'domates', 'biber'], ['Bulguru pişir, yoğurtla servis et.'], { light: true, months: [5, 6, 7, 8, 9] }),
  mk('dinner', 'Fırın tavuş (bütün)', 'whole roast chicken', ['pazartesi', 'doyurucu'], ['1 tavuk', '3 patates', '3 havuç', 'soğan', 'sarımsak'], ['Tüm malzemeleri fırın tepsisine diz.', '200 derecede 50 dakika pişir.'], { warm: true, months: [10, 11, 12, 1] }),
  mk('dinner', 'Kadıköy köftesi', 'turkish meatballs', ['klasik'], ['800 g kıyma', 'pirinç pilavı', 'domates sosu', 'sarımsaklı yoğurt'], ['Köfteleri kısa pişir, sos ile fırında 10 dakika.'], { warm: true }),
  mk('dinner', 'Etli yahudi çorbası & kızartma', 'chicken soup', ['sıcak', 'klasik'], ['tavuk suyu', 'havuç', 'patates', 'un', 'tavuk'], ['Etleri ve sebzeleri pişir, un ile kıvamlaştır.'], { warm: true, months: [1, 2, 3, 11, 12] }),
  mk('dinner', 'Perde Pilavı', 'chicken pie rice', ['görkemli'], ['tavuk', 'pirinç', 'yufka', 'sos', 'sarımsaklı yoğurt'], ['Pilavı hazırla, tavukla doldurup fırında pişir.'], { warm: true, months: [11, 12, 1, 2] }),
  mk('dinner', 'Patatesli köfte & turşu', 'meatballs potato', ['pratik', 'ekonomik'], ['kıyma', 'patates', 'turşu', 'pilav'], ['Köfteleri pişir, haşlanmış patates ve turşuyla servis et.'], { warm: true }),
  mk('dinner', 'Ispanaklı tavuk (fırın)', 'spinach chicken', ['sağlıklı'], ['tavuk göğsü', 'ıspanak', 'süzme yoğurt', 'sarımsak'], ['Tavuğu fırında pişir, ıspanaklı yoğurt sosu dök.'], { light: true, months: [3, 4, 5, 9, 10] }),
  mk('dinner', 'Kındıra & yoğurtlu sos', 'lamb pasta', ['modern', 'çocuk sever'], ['kındıra', 'yoğurt', 'sarımsak', 'kabak', 'sarımsaklı yoğurt'], ['Makarnayı pişir, yoğurtlu sosla karıştır.'], { months: [1, 2, 3, 4, 9, 10, 11, 12] }),
  mk('dinner', 'Domatesli pasta soslu baked pasta', 'baked pasta', ['rahat', 'paylaşmalık'], ['penne', 'domates sosu', 'mozzarella', 'fesleğen'], ['Makarnayı haşla, sosla fırın tepsisine koy, üzerini peynirle pişir.'], { months: [11, 12, 1, 2, 3] }),
  mk('dinner', 'Izgara köfte & közlenmiş biber', 'grilled meatballs', ['yaz', 'hafif'], ['kıyma', 'biber', 'domates', 'sumak'], ['Köfteleri ızgarada pişir.', 'Biber ve domatesi közle, pilavla servis et.'], { light: true, months: [5, 6, 7, 8, 9] }),
  mk('dinner', 'Sebze çorbası & ekmek', 'vegetable soup', ['hafif', 'sıcak'], ['kabak', 'domates', 'patates', 'nane', 'ekmek'], ['Sebzeleri pişir, nane ekle ve sıcak ekmekle servis et.'], { warm: true, light: true, months: [10, 11, 12, 1, 2] }),
  mk('dinner', 'Tavuk kanatlı (fırın)', 'chicken wings', ['paylaşmalık'], ['12 tavuk kanat', 'BBQ sosu', 'sarımsak', 'patates'], ['Kanatları marine et, fırında 25 dakika.', 'Patates kızartması ile servis et.'], { months: [1, 2, 3, 4, 5, 10, 11, 12] }),
  mk('dinner', 'Çoban tatlısı (helva)', 'turkish dessert', ['tatlı sonrası'], ['un', 'tereyağı', 'peynir', 'şerbet'], ['Hamuru yap, fırında pişir, şerbet dök.'], { months: [11, 12, 1, 2] }),
]

const LIBRARY: Record<MealSlot, Dish[]> = { breakfast: BREAKFAST, lunch: LUNCH, dinner: DINNER }

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle',
  dinner: 'Akşam',
}

function score(d: Dish, month: number, tempC: number | null): number {
  let s = Math.random() * 2 // küçük rastgelelik
  if (d.months?.includes(month)) s += 3
  if (tempC != null) {
    if (tempC <= 8 && d.warm) s += 3
    if (tempC <= 8 && d.light) s -= 1
    if (tempC >= 26 && d.light) s += 3
    if (tempC >= 26 && !d.light && !d.warm) s += 0.5
  }
  return s
}

/**
 * Belirli öğün için öneri listesi. Yakın zamanda pişirilenler elenir.
 */
export function suggest(
  kind: MealSlot,
  exclude: string[] = [],
  count = 3,
  tempC: number | null = null,
  month = new Date().getMonth() + 1,
): Dish[] {
  const banned = new Set(exclude.map((t) => t.toLocaleLowerCase('tr')))
  const pool = LIBRARY[kind].filter((d) => !banned.has(d.title.toLocaleLowerCase('tr')))
  const source = pool.length >= count ? pool : LIBRARY[kind]
  return [...source]
    .map((d) => ({ d, s: score(d, month, tempC) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((x) => x.d)
}

/* ========================== İNTERNET TARİFLERİ ========================== */

const KEYWORDS: Record<MealSlot, string[]> = {
  breakfast: ['omelette', 'pancakes', 'breakfast', 'eggs', 'fruit salad', 'porridge'],
  lunch: ['soup', 'salad', 'sandwich', 'pasta', 'vegetable'],
  dinner: ['chicken', 'beef', 'lamb', 'fish', 'curry', 'stew', 'roast'],
}

function mapMeal(m: any): OnlineRecipe {
  return {
    id: String(m.idMeal),
    title: String(m.strMeal),
    image: String(m.strMealThumb),
    instructions: String(m.strInstructions || '').trim(),
    area: m.strArea,
    category: m.strCategory,
    source: 'TheMealDB',
  }
}

async function getJSON(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Belirli yemeğin fotoğraf + tam tarifini çeker (bulunamazsa null). */
export async function fetchRecipeDetail(dish: Dish, signal?: AbortSignal): Promise<OnlineRecipe | null> {
  try {
    const data = await getJSON(`${API}/search.php?s=${encodeURIComponent(dish.en)}`, signal)
    const meals = data?.meals
    if (!Array.isArray(meals) || !meals.length) return null
    // Başlıkta ana kelime geçen sonucu tercih et
    const key = dish.en.split(' ')[0].toLowerCase()
    const best = meals.find((m: any) => String(m.strMeal).toLowerCase().includes(key)) ?? meals[0]
    return mapMeal(best)
  } catch {
    return null
  }
}

/** Öğün türüne göre internetten (fotoğraflı) tarif önerileri. */
export async function fetchOnlineRecipes(
  kind: MealSlot,
  count = 3,
  signal?: AbortSignal,
): Promise<OnlineRecipe[]> {
  const keywords = KEYWORDS[kind]
  const results: OnlineRecipe[] = []
  const seen = new Set<string>()

  for (let i = 0; i < keywords.length && results.length < count; i++) {
    try {
      const data = await getJSON(`${API}/search.php?s=${encodeURIComponent(keywords[i])}`, signal)
      for (const m of data?.meals ?? []) {
        const r = mapMeal(m)
        if (seen.has(r.title)) continue
        seen.add(r.title)
        results.push(r)
        if (results.length >= count) break
      }
    } catch {
      /* tek kelimeyi atla */
    }
  }
  return results
}
