/** Kayıt (CRUD) testi: aynı kaydın üstüne yazılmadığını doğrular. */
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let ok = true
let code = 1
try {
  const mem = new Map()
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  }
  globalThis.window = undefined

  const store = await vite.ssrLoadModule('/src/state/store.ts')
  const { seedDB } = await vite.ssrLoadModule('/src/state/seed.ts')
  const a = await vite.ssrLoadModule('/src/state/actions.ts')
  const { migrate } = await vite.ssrLoadModule('/src/state/migrate.ts')

  store.hydrate(seedDB())
  migrate()
  const { getDB } = store

  const check = (name, cond, extra = '') => {
    console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? ' -> ' + extra : ''}`)
    if (!cond) ok = false
  }

  /* ---- Ders: 3 ayrı ders eklenmeli ---- */
  const before = getDB().lessons.length
  a.saveLesson({ memberId: 'm_kiz', day: 1, start: '09:00', end: '09:40', subject: 'Matematik', room: 'A Blok' })
  a.saveLesson({ memberId: 'm_kiz', day: 1, start: '10:00', end: '10:40', subject: 'Fizik', room: 'B Blok' })
  a.saveLesson({ memberId: 'm_kiz', day: 2, start: '11:00', end: '11:40', subject: 'Kimya', room: 'C Blok' })
  const after = getDB().lessons.length
  const uniqIds = new Set(getDB().lessons.map((l) => l.id)).size
  check('3 ders eklendi', after === before + 3, `${before} -> ${after}`)
  check('idler benzersiz', uniqIds === after, `${uniqIds}/${after}`)
  check('dersler listelendi', getDB().lessons.filter((l) => l.memberId === 'm_kiz' && l.day === 1).length >= 2)

  /* ---- Ders güncelleme (id ile) üstüne yazmalı ---- */
  const target = getDB().lessons.find((l) => l.subject === 'Fizik')
  a.saveLesson({ id: target.id, memberId: 'm_kiz', day: 1, start: '10:00', end: '10:40', subject: 'Fizik II', room: 'B Blok' })
  const renamed = getDB().lessons.find((l) => l.id === target.id)
  check('ders güncellendi (yeni kayıt yok)', renamed?.subject === 'Fizik II' && getDB().lessons.length === after, renamed?.subject)

  /* ---- Silme ---- */
  a.deleteLesson(target.id)
  check('ders silindi', getDB().lessons.length === after - 1)

  /* ---- Beslenme (serbest menü): ekleme artırır, id ile güncelleme yerinde ---- */
  const nBefore = getDB().nutrition.filter((n) => n.memberId === 'm_kiz' && n.weekday === 1).length
  const added = a.saveNutrition({ memberId: 'm_kiz', weekday: 1, time: '16:00', title: 'İkindi: meyve' })
  const nAfter = getDB().nutrition.filter((n) => n.memberId === 'm_kiz' && n.weekday === 1).length
  check('beslenme satiri eklendi', nAfter === nBefore + 1 && !!added?.id, `${nBefore} -> ${nAfter}`)
  check('beslenme icerigi', getDB().nutrition.some((n) => n.memberId === 'm_kiz' && n.weekday === 1 && n.title === 'İkindi: meyve'))

  a.saveNutrition({ id: added.id, memberId: 'm_kiz', weekday: 1, time: '16:30', title: 'İkindi: meyve ve ceviz' })
  const nFinal = getDB().nutrition.filter((n) => n.memberId === 'm_kiz' && n.weekday === 1).length
  check('beslenme guncellemesi yerinde', nFinal === nAfter && getDB().nutrition.find((n) => n.id === added.id)?.title === 'İkindi: meyve ve ceviz')

  a.deleteNutrition(added.id)
  check('beslenme silindi', getDB().nutrition.filter((n) => n.memberId === 'm_kiz' && n.weekday === 1).length === nBefore)

  /* ---- Quiz sorusu ekleme (id: '') ---- */
  const qBefore = getDB().quiz.length
  a.saveQuestion({ id: '', text: 'Test sorusu', options: ['A', 'B'], correct: 1 })
  a.saveQuestion({ id: '', text: 'Başka soru', options: ['C', 'D'], correct: 0 })
  check('iki ayrı soru eklendi', getDB().quiz.length === qBefore + 2, `${qBefore} -> ${getDB().quiz.length}`)

  /* ---- Etkinlik ekleme ---- */
  const eBefore = getDB().events.length
  a.saveEvent({ id: '', title: 'Yeni etkinlik', start: new Date().toISOString(), allDay: false, memberIds: [] })
  a.saveEvent({ id: '', title: 'Başka etkinlik', start: new Date().toISOString(), allDay: false, memberIds: [] })
  check('iki ayrı etkinlik eklendi', getDB().events.length === eBefore + 2)

  console.log(ok ? '\nKAYIT TESTI GECTI' : '\nKAYIT TESTI BASARISIZ')
  code = ok ? 0 : 1
} catch (e) {
  console.error('HATA:', e)
  code = 1
} finally {
  await vite.close()
  setTimeout(() => process.exit(code), 200)
}
