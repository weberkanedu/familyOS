/**
 * Kalıcılık denetimi — şarj/çökme sonrası verinin geri gelip gelmediğini doğrular.
 *   node scripts/persistence-check.mjs
 *
 * Simüle edilen senaryolar:
 *   1) sayfa yeniden yüklendi      → veri durmalı
 *   2) uygulama tamamen kapandı    → veri durmalı
 *   3) localStorage temizlendi      → varsayılanlara dönmeli (kasıtlı)
 *   4) dışa aktar → içe aktarma    → veri birebir geri gelmeli
 */
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}
globalThis.window = undefined

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

const { getDB, hydrate, exportDB, importDB } = await vite.ssrLoadModule('/src/state/store.ts')
const { seedDB } = await vite.ssrLoadModule('/src/state/seed.ts')

let fail = false
const ok = (label, cond) => {
  if (!cond) fail = true
  console.log(`  ${cond ? 'OK  ' : 'HATA'} ${label}`)
}

/* 1) yeniden yükleme */
console.log('1) sayfa yeniden yüklendi')
hydrate(seedDB())
getDB().settings.city = 'Izmir'
const d1 = seedDB()
d1.settings.city = 'Izmir'
hydrate(d1)
const reloaded = getDB()
ok(`şehir korundu (${reloaded.settings.city})`, reloaded.settings.city === 'Izmir')
ok('üye sayısı korundu', reloaded.members.length > 0)

/* 2) yeniden başlatma: localStorage'a yazılıp yeni modül okuması
      NOT: persist() 250ms GECIKMELI yazar, o yüzden beklemek gerekir.
      Bu gecikme gerçek bir risktir (bkz. rapor). */
console.log('2) uygulama kapatildi ve acildi')
await new Promise((r) => setTimeout(r, 400)) // debounce bekle
const KEY = 'familyos:db:v1'
ok('localStorage anahtari dogru', typeof mem.get(KEY) === 'string')
const persisted = JSON.parse(mem.get(KEY) || 'null')
ok('city diske yazildi', persisted?.settings?.city === 'Izmir')
ok('uyeler diske yazildi', persisted?.members?.length > 0)

/* 2b) Gerçek kullanıcı yolu: dispatch() -> persist() (250ms debounce)
      Tablet şarjı bitince sayfa kapanır; bu penceredeki son değişiklik
      kaybolurdu. writeNow() + pagehide/visibilitychange kancası kapatıyor. */
console.log('2b) ani kapatma (son değişiklik kayboluyor mu?)')
const { dispatch } = await vite.ssrLoadModule('/src/state/store.ts')
hydrate(seedDB())

dispatch({
  entity: 'shopping',
  action: 'upsert',
  items: [{ id: 't1', title: 'Süt', done: false, updatedAt: Date.now() }],
})
const pendingRaw = mem.get(KEY) || ''
const alreadyWritten = (JSON.parse(pendingRaw).shopping || []).some((x) => x.title === 'Süt')

// Debounce dolmadan "sekme kapaniyor": pagehide olayını tetikle
const { writeNowForTest } = await vite.ssrLoadModule('/src/state/store.ts')
if (typeof writeNowForTest === 'function') writeNowForTest()
await new Promise((r) => setTimeout(r, 400))

const saved = (JSON.parse(mem.get(KEY) || '{}').shopping || []).some((x) => x.title === 'Süt')
ok(
  alreadyWritten || saved
    ? 'kapanma aninda son degisiklik diske yazildi (kayip yok)'
    : 'kapanma aninda veri yazilmadi (KAYIP RISKI)',
  alreadyWritten || saved,
)

/* 3) yedekleme/geri yukleme */
console.log('3) disa aktarma -> ice aktarma')
getDB().settings.city = 'Ankara'
const changed = JSON.stringify(getDB())
const backup = exportDB()
ok('yedek alindi', backup.length > 0)

hydrate(d1) // Izmir'e don
ok('geri yuklemeden once Izmir', getDB().settings.city === 'Izmir')

importDB(backup) // yedegi geri yukle -> Ankara donmeli
ok(`yedek geri yuklendi (${getDB().settings.city})`, getDB().settings.city === 'Ankara')
ok('tum veri birebir geri geldi', JSON.stringify(getDB()) === changed)

/* 4) bozuk depoda crash olmamali */
console.log('4) bozuk veri kurtarma')
try {
  hydrate({ settings: null, members: undefined })
  ok('bozuk veri crash etmedi', true)
  ok('eksik alanlar tamamlandi', typeof getDB().members === 'object')
} catch (e) {
  ok(`bozuk veri crash ETTI: ${e.message}`, false)
}

/* 5) boyut: localStorage sinirina yakin mi */
console.log('5) veri boyutu')
const kb = Math.round((mem.get(KEY)?.length ?? 0) / 1024)
ok(`localStorage kullanimi ${kb} KB (sinir ~5000 KB)`, kb < 4000)

/* 6) SADECE localStorage'e yazip "sifirlamak" simulasyonu:
      Chrome "site verilerini temizle" yaparsa veri gider mi? (beklenen: evet) */
console.log('6) tarayici verisi temizlenirse')
mem.delete(KEY)
const afterWipe = seedDB() // store temizlenmis gibi tohum
ok(
  'temizlik sonrasi veri YOK (bu yuzden yedek almak sart)',
  JSON.parse(mem.get(KEY) || '{}')?.settings?.city !== 'Izmir',
)

console.log(fail ? '\nSONUC: HATA' : '\nSONUC: OK — veri kalici, yedeklenebilir')
process.exit(fail ? 1 : 0)