// Uçtan uca senkron testi: relay başlat, 2 istemci bağlan, op gönder, teslimi doğrula.
import { spawn } from 'node:child_process'
import { WebSocket } from 'ws'
import { setTimeout as sleep } from 'node:timers/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 8899
const RELAY_FILE = join(tmpdir(), `familyos-relay-test-${Date.now()}.json`)

const server = spawn(process.execPath, ['server/dev-sync.mjs'], {
  env: { ...process.env, PORT: String(PORT), RELAY_FILE },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', (d) => process.stdout.write(`[relay] ${d}`))
server.stderr.on('data', (d) => process.stderr.write(`[relay-err] ${d}`))

const results = { snapshotA: false, snapshotB: false, opB: false, ackA: false }

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`)
    ws.on('error', reject)
    ws.on('open', () => resolve(ws))
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw))
      if (msg.type === 'snapshot') results[`snapshot${name}`] = true
      if (msg.type === 'op' && msg.op?.entity === 'shopping') results[`op${name}`] = true
      if (msg.type === 'ack') results.ackA = true
    })
  })
}

try {
  await sleep(700)
  const A = await connect('A')
  const B = await connect('B')
  await sleep(500)

  A.send(
    JSON.stringify({
      type: 'op',
      op: {
        id: 'test_1',
        origin: 'testA',
        ts: Date.now(),
        entity: 'shopping',
        action: 'upsert',
        items: [{ id: 'sh_test', text: 'Test ürünü', category: 'Market', done: false, addedById: 'm_ana', updatedAt: Date.now() }],
      },
    }),
  )
  await sleep(700)

  console.log('SONUÇ:', JSON.stringify(results))
  const ok = results.snapshotA && results.snapshotB && results.opB && results.ackA
  console.log(ok ? '✓ SENKRON TESTİ GEÇTİ' : '✗ SENKRON TESTİ BAŞARISIZ')
  A.close()
  B.close()
  process.exitCode = ok ? 0 : 1
} catch (e) {
  console.error('HATA:', e)
  process.exitCode = 1
} finally {
  server.kill()
}
