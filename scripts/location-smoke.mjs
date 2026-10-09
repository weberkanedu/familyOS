/** Konum (şehir) seçim mantığı testi: addLocation / selectLocation / removeLocation */
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

  const { getDB } = await vite.ssrLoadModule('/src/state/store.ts')
  const { seedDB } = await vite.ssrLoadModule('/src/state/seed.ts')
  const actions = await vite.ssrLoadModule('/src/state/actions.ts')
  const { migrate } = await vite.ssrLoadModule('/src/state/migrate.ts')

  const store = await vite.ssrLoadModule('/src/state/store.ts')
  store.hydrate(seedDB())
  migrate()

  const check = (name, cond, extra = '') => {
    console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? ' -> ' + extra : ''}`)
    if (!cond) ok = false
  }

  const s0 = getDB().settings
  check('Ev konumu kayitli', !!s0.savedLocations?.length && !!s0.savedLocations[0].home, JSON.stringify(s0.savedLocations))
  check('Ev etkin konum', Math.abs(s0.lat - 39.9208) < 0.001 && s0.city === 'Ankara 06070', s0.city)

  actions.addLocation('Izmir, İzmir', 38.4237, 27.1428)
  const s1 = getDB().settings
  check('Yeni sehir eklendi', s1.savedLocations?.length === 2, JSON.stringify(s1.savedLocations.map((l) => l.label)))
  check('Yeni sehir etkin', Math.abs(s1.lat - 38.4237) < 0.001 && s1.city === 'Izmir, İzmir', `${s1.city} ${s1.lat}`)

  actions.selectLocation(0)
  const s2 = getDB().settings
  check('Eve donus', Math.abs(s2.lat - 39.9208) < 0.001 && s2.city === 'Ankara 06070', s2.city)

  actions.selectLocation(1)
  check('Sehirlere gecis', Math.abs(getDB().settings.lat - 38.4237) < 0.001, getDB().settings.city)

  actions.removeLocation(1)
  const s3 = getDB().settings
  check('Silince eve dondu', s3.savedLocations.length === 1 && Math.abs(s3.lat - 39.9208) < 0.001, JSON.stringify(s3.savedLocations))

  actions.removeLocation(0)
  check('Ev silinemez', getDB().settings.savedLocations.length === 1)

  console.log(ok ? '\nKONUM TESTI GECTI' : '\nKONUM TESTI BASARISIZ')
  code = ok ? 0 : 1
} catch (e) {
  console.error('HATA:', e)
  code = 1
} finally {
  await vite.close()
  setTimeout(() => process.exit(code), 200)
}
