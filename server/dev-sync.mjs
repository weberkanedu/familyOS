/**
 * Yerel/LAN senkron relay sunucusu — Cloudflare'sız test için.
 *
 *   npm run dev:sync
 *   .env içinde: VITE_SYNC_URL=ws://<bilgisayar-ip>:8787
 *
 * Aynı protokolü kullanır (hello/op/ping → snapshot/op/ack/pong).
 * Veriler dosyada saklanır: ./familyos-relay.json
 */
import { WebSocketServer } from 'ws'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const PORT = Number(process.env.PORT || 8787)
const FILE = process.env.RELAY_FILE
  ? process.env.RELAY_FILE
  : new URL('./familyos-relay.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const MAX_OPS = 400

const ENTITY_KEYS = new Set([
  'members', 'events', 'chores', 'shopping', 'meals', 'words', 'quiz', 'quizResults', 'messages',
  'nutrition', 'lessons', 'settings',
])

const DEFAULT_SETTINGS = {
  id: 'main', familyName: 'İÇİL Ailesi', mode: 'auto', idleMinutes: 3, city: 'Ankara 06070',
  lat: 39.9208, lon: 32.8541, weatherEnabled: true, soundEnabled: true, soundMode: 'wall',
  savedLocations: [{ label: 'Ankara 06070', lat: 39.9208, lon: 32.8541, home: true }],
  updatedAt: Date.now(),
}

function emptyDB() {
  return {
    members: [], events: [], chores: [], shopping: [], meals: [], words: [],
    quiz: [], quizResults: [], messages: [], nutrition: [], lessons: [], settings: DEFAULT_SETTINGS,
  }
}

let state = { db: emptyDB(), ops: [], rev: 0 }

if (existsSync(FILE)) {
  try {
    state = JSON.parse(readFileSync(FILE, 'utf8'))
    if (!state.db) state = { db: emptyDB(), ops: [], rev: 0 }
    console.log(`↳ Kayıtlı durum yüklendi (rev ${state.rev})`)
  } catch (e) {
    console.warn('Kayıt okunamadı, sıfırdan başlanıyor:', e.message)
  }
}

let saveTimer = null
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      writeFileSync(FILE, JSON.stringify(state))
    } catch (e) {
      console.error('Kayıt hatası:', e.message)
    }
  }, 400)
}

function reduce(db, op) {
  if (op.action === 'replaceAll') return { ...db, [op.entity]: op.items }
  const current = db[op.entity]

  /* Tekil entity (settings): nesne olarak birleştir */
  if (!Array.isArray(current)) {
    if (op.action === 'delete') return db
    const patch = op.items
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
    if (!patch) return db
    if ((current.updatedAt ?? 0) > (patch.updatedAt ?? 0)) return db
    return { ...db, [op.entity]: { ...current, ...patch } }
  }

  const list = current
  if (op.action === 'delete') {
    const ids = new Set(op.items.map((i) => i?.id))
    return { ...db, [op.entity]: list.filter((i) => !ids.has(i.id)) }
  }
  const incoming = new Map()
  for (const item of op.items) {
    if (!item || typeof item.id !== 'string') continue
    const prev = incoming.get(item.id)
    if (!prev || (item.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) incoming.set(item.id, item)
  }
  const out = []
  const seen = new Set()
  for (const item of list) {
    const inc = incoming.get(item.id)
    if (inc) {
      seen.add(item.id)
      out.push((inc.updatedAt ?? 0) >= (item.updatedAt ?? 0) ? inc : item)
    } else out.push(item)
  }
  for (const [id, item] of incoming) if (!seen.has(id)) out.push(item)
  return { ...db, [op.entity]: out }
}

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' })
console.log(`FamilyOS relay hazır → ws://0.0.0.0:${PORT}`)
console.log('VITE_SYNC_URL değerine bu adresi yazın (LAN IP ile).')

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg))
}

function broadcast(msg, except) {
  for (const client of wss.clients) {
    if (client === except || client.readyState !== 1) continue
    client.send(JSON.stringify(msg))
  }
}

wss.on('connection', (ws) => {
  send(ws, { type: 'snapshot', db: state.db, rev: state.rev })

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }

    if (msg.type === 'ping') return send(ws, { type: 'pong' })
    if (msg.type === 'hello') return send(ws, { type: 'snapshot', db: state.db, rev: state.rev })

    if (msg.type === 'op' && msg.op && ENTITY_KEYS.has(msg.op.entity)) {
      const op = { ...msg.op, ts: Date.now() }
      state.db = reduce(state.db, op)
      state.ops.push(op)
      if (state.ops.length > MAX_OPS) state.ops = state.ops.slice(-MAX_OPS)
      state.rev += 1
      broadcast({ type: 'op', op }, ws)
      send(ws, { type: 'ack', id: op.id, rev: state.rev })
      persist()
      const who = state.db.members.find((m) => m.id === op.items?.[0]?.fromId)
      console.log(`op ${op.entity}/${op.action} rev=${state.rev}${who ? ` (${who.name})` : ''}`)
    }
  })

  ws.on('close', () => {})
})

process.on('SIGINT', () => {
  clearTimeout(saveTimer)
  try {
    writeFileSync(FILE, JSON.stringify(state))
  } catch {}
  console.log('\nKaydedildi, kapanıyor.')
  process.exit(0)
})
