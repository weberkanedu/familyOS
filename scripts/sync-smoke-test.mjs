// Uçtan uca sunucu testi (server-dist/index.cjs):
// aile kodu, snapshot, op yayını, tekrar gönderimde çift uygulanmama, geçersiz op,
// yabancı origin reddi, yeniden başlatınca verinin korunması, statik dosya + güvenlik başlıkları.
import { spawn } from 'node:child_process'
import { WebSocket } from 'ws'
import { setTimeout as sleep } from 'node:timers/promises'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 8899
const CODE = 'test-kodu-123'
const root = mkdtempSync(join(tmpdir(), 'familyos-test-'))
const DATA_DIR = join(root, 'data')
const DIST_DIR = join(root, 'dist')
mkdirSync(join(DIST_DIR, 'assets'), { recursive: true })
writeFileSync(join(DIST_DIR, 'index.html'), '<!doctype html><title>t</title>' + 'x'.repeat(2000))
writeFileSync(join(DIST_DIR, 'assets', 'app-abc.js'), 'console.log(1)')

let server
async function startServer() {
  server = spawn(process.execPath, ['server-dist/index.cjs'], {
    env: { ...process.env, PORT: String(PORT), FAMILY_CODE: CODE, DATA_DIR, DIST_DIR },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout.on('data', (d) => process.stdout.write(`[sunucu] ${d}`))
  server.stderr.on('data', (d) => process.stderr.write(`[sunucu-hata] ${d}`))
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) return
    } catch {}
    await sleep(100)
  }
  throw new Error('sunucu açılmadı')
}
async function stopServer() {
  const done = new Promise((r) => server.once('exit', r))
  server.kill('SIGTERM')
  await done
}

/** Bağlan, hello gönder; gelen mesajları biriktir. */
function client(code, headers) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/sync`, { headers })
    const inbox = []
    ws.inbox = inbox
    ws.closeCode = null
    ws.on('message', (raw) => inbox.push(JSON.parse(String(raw))))
    ws.on('close', (c) => (ws.closeCode = c))
    ws.on('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)))
    ws.on('error', reject)
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'hello', client: 'c', code }))
      resolve(ws)
    })
  })
}

const op = (id, text) => ({
  id,
  origin: 'testA',
  ts: Date.now(),
  entity: 'shopping',
  action: 'upsert',
  items: [{ id: `sh_${id}`, text, category: 'Market', done: false, addedById: 'm', updatedAt: Date.now() }],
})

const results = {}
const check = (name, ok) => (results[name] = !!ok)

try {
  await startServer()

  // 1) Yanlış kod → hata + 4001 ile kapanış, snapshot yok
  const bad = await client('yanlis')
  await sleep(300)
  check('yanlisKodReddedildi', bad.inbox.some((m) => m.type === 'error' && m.code === 'auth') && bad.closeCode === 4001)
  check('yanlisKoddaVeriYok', !bad.inbox.some((m) => m.type === 'snapshot'))

  // 2) Yabancı site (origin) reddedilir
  try {
    await client(CODE, { Origin: 'https://kotu-site.example' })
    check('yabanciOriginReddedildi', false)
  } catch (e) {
    check('yabanciOriginReddedildi', String(e.message).includes('403'))
  }

  // 3) Doğru kod → snapshot, op yayını, ack
  const A = await client(CODE)
  const B = await client(CODE)
  await sleep(300)
  check('snapshotA', A.inbox.some((m) => m.type === 'snapshot'))
  A.send(JSON.stringify({ type: 'op', op: op('o1', 'Ekmek') }))
  await sleep(300)
  check('opB', B.inbox.some((m) => m.type === 'op' && m.op.id === 'o1'))
  check('ackA', A.inbox.some((m) => m.type === 'ack' && m.id === 'o1'))

  // 4) Aynı op tekrar (bağlantı kopup yeniden gönderildi) → bir kez uygulanır, yine ack gelir
  const revBefore = (await (await fetch(`http://127.0.0.1:${PORT}/health`)).json()).rev
  A.send(JSON.stringify({ type: 'op', op: op('o1', 'Ekmek') }))
  await sleep(300)
  const revAfter = (await (await fetch(`http://127.0.0.1:${PORT}/health`)).json()).rev
  check('tekrarCiftUygulanmadi', revBefore === revAfter && A.inbox.filter((m) => m.type === 'ack' && m.id === 'o1').length === 2)

  // 5) Geçersiz op → reddedilir ama ack verilir (istemci kuyruğu tıkanmaz)
  A.send(JSON.stringify({ type: 'op', op: { id: 'kotu', entity: 'yok', action: 'upsert', items: [] } }))
  await sleep(300)
  check('gecersizOpReddedildi', A.inbox.some((m) => m.type === 'error' && m.code === 'bad-op') && A.inbox.some((m) => m.type === 'ack' && m.id === 'kotu'))

  // 6) Statik dosya + güvenlik başlıkları + önbellek
  const page = await fetch(`http://127.0.0.1:${PORT}/takvim`, { headers: { 'accept-encoding': 'gzip' } })
  check('spaYonlendirme', page.status === 200 && (await page.text()).includes('<title>t</title>'))
  check('cspBasligi', (page.headers.get('content-security-policy') ?? '').includes("frame-ancestors 'none'"))
  const asset = await fetch(`http://127.0.0.1:${PORT}/assets/app-abc.js`)
  check('assetOnbellek', (asset.headers.get('cache-control') ?? '').includes('immutable'))
  const missing = await fetch(`http://127.0.0.1:${PORT}/assets/yok.js`)
  check('eksikDosya404', missing.status === 404)
  const traversal = await fetch(`http://127.0.0.1:${PORT}/..%2f..%2fpackage.json`)
  check('dizinDisinaCikilamaz', !(await traversal.text()).includes('"name"'))

  // 7) Push ucu kodsuz çalışmaz
  const push = await fetch(`http://127.0.0.1:${PORT}/push/subscribe`, { method: 'POST', body: '{}' })
  check('pushKodIster', push.status === 401)

  A.close()
  B.close()

  // 8) Sunucu yeniden başlayınca veri korunur
  await stopServer()
  await startServer()
  const C = await client(CODE)
  await sleep(300)
  const snap = C.inbox.find((m) => m.type === 'snapshot')
  check('yenidenBaslatmadaVeriKorundu', snap?.db.shopping.some((s) => s.id === 'sh_o1'))
  C.close()
} catch (e) {
  console.error(e)
} finally {
  await stopServer().catch(() => {})
  rmSync(root, { recursive: true, force: true })
}

console.log('SONUÇ:', results)
const failed = Object.entries(results).filter(([, v]) => !v)
if (failed.length === 0 && Object.keys(results).length >= 15) {
  console.log('✓ SUNUCU TESTİ GEÇTİ')
  process.exit(0)
}
console.error('✗ SUNUCU TESTİ BAŞARISIZ:', failed.map(([k]) => k).join(', ') || 'eksik adım')
process.exit(1)
