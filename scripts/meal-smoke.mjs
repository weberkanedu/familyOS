/**
 * Yemek öneri motoru testi: kütüphane mantığı + TheMealDB erişimi.
 *   node scripts/meal-smoke.mjs
 */
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let ok = true
let code = 1
try {
  const ideas = await vite.ssrLoadModule('/src/lib/mealIdeas.ts')

  for (const kind of ['breakfast', 'lunch', 'dinner']) {
    const first = ideas.suggest(kind, [], 3)
    const second = ideas.suggest(kind, first.map((d) => d.title), 3)
    const fresh = second.filter((d) => !first.some((f) => f.id === d.id))
    const count = ideas.suggest(kind, [], 12).length
    const pass = first.length === 3 && fresh.length === 3 && count >= 10
    console.log(`${pass ? 'OK  ' : 'FAIL'} ${kind}: ${first.length} öneri, tekrar listesi taze=${fresh.length}, havuz=${count}`)
    if (!pass) ok = false
  }

  const cold = ideas.suggest('dinner', [], 5, -3)
  const warmTag = cold.some((d) => d.warm)
  console.log(`${warmTag ? 'OK  ' : 'FAIL'} soguk havada sicak yemek onceligi: ${cold.filter((d) => d.warm).length}/${cold.length}`)
  if (!warmTag) ok = false

  console.log('...\nTheMealDB erisimi deneniyor')
  const online = await ideas.fetchOnlineRecipes('dinner', 2)
  const pass = online.length > 0 && !!online[0].image
  console.log(`${pass ? 'OK  ' : 'FAIL'} internet tarifleri: ${online.map((r) => r.title).join(', ') || '(gelmedi)'}`)
  if (!pass) ok = false

  console.log(ok ? '\nYEMEK TESTI GECTI' : '\nYEMEK TESTI BASARISIZ')
  code = ok ? 0 : 1
} catch (e) {
  console.error('HATA:', e)
  code = 1
} finally {
  await vite.close()
  setTimeout(() => process.exit(code), 200)
}
