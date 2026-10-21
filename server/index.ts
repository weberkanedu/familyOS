/**
 * Aile Panosu sunucusu — Docker / Dokploy için tek parça.
 *
 *  - Statik uygulama (dist/) + güvenlik başlıkları + gzip + önbellek ayarları
 *  - /sync           → WebSocket gerçek zamanlı senkron (aile kodu ile)
 *  - /push/*         → Web Push (VAPID anahtarları yoksa otomatik üretilir)
 *  - /health         → sağlık kontrolü
 *  - /api/spiritual  → TV için rastgele kısa ayet + hadis (havuz, DATA_DIR/spiritual.json)
 *  - DATA_DIR        → kalıcı veri (state.json) + günlük yedekler (backups/, 14 gün)
 *
 * Ortam değişkenleri:
 *   FAMILY_CODE  (zorunlu)  telefon/tablette bir kez girilen aile kodu
 *   PORT=3000, DATA_DIR=./data, DIST_DIR=../dist
 *   ALLOWED_ORIGINS  başka alan adından bağlanılacaksa (virgülle)
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT  (opsiyonel)
 *
 * Geliştirme: npm run dev:sync  (FAMILY_CODE=1234, yalnızca senkron)
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import { WebSocketServer, type WebSocket } from 'ws'
import webpush from 'web-push'
import { CLOSE_AUTH, MAX_MESSAGE_BYTES, safeEqual, sanitizeOp } from '../src/sync/protocol'
import type { ClientMsg, Op, ServerMsg } from '../src/sync/protocol'
import { AuthLimiter, RoomState } from '../src/sync/room'
import { SECURITY_HEADERS } from './securityHeaders'
import { createSpiritual } from './spiritual'

const PORT = Number(process.env.PORT || 3000)
const DATA_DIR = resolve(process.env.DATA_DIR || './data')
const DIST_DIR = resolve(process.env.DIST_DIR || join(__dirname, '..', 'dist'))
const FAMILY_CODE = (process.env.FAMILY_CODE || '').trim()
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const STATE_FILE = join(DATA_DIR, 'state.json')
const PUSH_FILE = join(DATA_DIR, 'push-subs.json')
const VAPID_FILE = join(DATA_DIR, 'vapid.json')
const SPIRITUAL_FILE = join(DATA_DIR, 'spiritual.json')
const BACKUP_DIR = join(DATA_DIR, 'backups')
const BACKUP_KEEP = 14
const PERSIST_DELAY_MS = 300

mkdirSync(BACKUP_DIR, { recursive: true })

/* ------------------------------------------------------------------ */
/* Kalıcı veri                                                         */
/* ------------------------------------------------------------------ */
function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return null
  }
}

/** Yarım yazılmış dosya kalmasın: önce geçici dosyaya yaz, sonra yer değiştir. */
function writeJsonAtomic(file: string, data: unknown) {
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(data))
  renameSync(tmp, file)
}

const room = new RoomState(readJson(STATE_FILE))
console.log(`↳ Veri: ${STATE_FILE} (rev ${room.rev})`)

let persistTimer: ReturnType<typeof setTimeout> | null = null
function persistNow() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = null
  try {
    writeJsonAtomic(STATE_FILE, room.toJSON())
  } catch (e) {
    console.error('Kayıt hatası:', (e as Error).message)
  }
}
function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(persistNow, PERSIST_DELAY_MS)
}

/** Günde bir yedek: backups/state-YYYY-MM-DD.json, son 14 gün saklanır. */
function dailyBackup() {
  try {
    const day = new Date().toISOString().slice(0, 10)
    const file = join(BACKUP_DIR, `state-${day}.json`)
    if (!existsSync(file) && room.rev > 0) {
      writeJsonAtomic(file, room.toJSON())
      console.log(`↳ Yedek alındı: ${file}`)
    }
    const old = readdirSync(BACKUP_DIR)
      .filter((f) => /^state-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .slice(0, -BACKUP_KEEP)
    for (const f of old) unlinkSync(join(BACKUP_DIR, f))
  } catch (e) {
    console.error('Yedek hatası:', (e as Error).message)
  }
}
dailyBackup()
setInterval(dailyBackup, 60 * 60_000).unref()

/* ------------------------------------------------------------------ */
/* Web Push                                                            */
/* ------------------------------------------------------------------ */
type PushSub = { endpoint: string; keys?: Record<string, string> }
const pushSubs = new Map<string, PushSub>(Object.entries(readJson<Record<string, PushSub>>(PUSH_FILE) ?? {}))
const savePushSubs = () => writeJsonAtomic(PUSH_FILE, Object.fromEntries(pushSubs))

const vapid = (() => {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
  }
  const saved = readJson<{ publicKey: string; privateKey: string }>(VAPID_FILE)
  if (saved?.publicKey && saved.privateKey) return saved
  const keys = webpush.generateVAPIDKeys()
  writeJsonAtomic(VAPID_FILE, keys)
  console.log('↳ Web Push anahtarları üretildi')
  return keys
})()
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:aile@example.com', vapid.publicKey, vapid.privateKey)

async function pushMessage(op: Op) {
  const message = op.items[0]
  if (!message || !pushSubs.size) return
  const author = room.db.members.find((m) => m.id === message.fromId)
  const payload = JSON.stringify({
    title: `${room.db.settings.brandName || 'Aile Panosu'} · ${author?.name ?? 'Aile'}`,
    body: String(message.text ?? '').slice(0, 140),
    url: '/?tab=chat',
  })
  let changed = false
  await Promise.allSettled(
    [...pushSubs.values()].map(async (sub) => {
      try {
        await webpush.sendNotification(sub as webpush.PushSubscription, payload, { TTL: 3600 })
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          pushSubs.delete(sub.endpoint)
          changed = true
        }
      }
    }),
  )
  if (changed) savePushSubs()
}

/* ------------------------------------------------------------------ */
/* HTTP: statik dosyalar + push uçları                                 */
/* ------------------------------------------------------------------ */
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg', '.txt'])
const gzCache = new Map<string, { key: string; buf: Buffer }>()

const limiter = new AuthLimiter()

function clientIp(req: IncomingMessage): string {
  const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
  return fwd || req.socket.remoteAddress || '?'
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage, limit = 16 * 1024): Promise<string> {
  return new Promise((ok, fail) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) {
        fail(new Error('too-large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', fail)
  })
}

/** Push uçları da aile kodu ister (x-family-code başlığı). */
function checkCode(req: IncomingMessage, res: ServerResponse): boolean {
  const ip = clientIp(req)
  if (!FAMILY_CODE) {
    sendJson(res, 503, { error: 'not-configured' })
    return false
  }
  if (limiter.blocked(ip)) {
    sendJson(res, 429, { error: 'rate-limit' })
    return false
  }
  if (!safeEqual(String(req.headers['x-family-code'] ?? ''), FAMILY_CODE)) {
    limiter.fail(ip)
    sendJson(res, 401, { error: 'auth' })
    return false
  }
  limiter.success(ip)
  return true
}

async function handlePush(req: IncomingMessage, res: ServerResponse, path: string) {
  if (path === '/push/key' && req.method === 'GET') return sendJson(res, 200, { publicKey: vapid.publicKey })
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method' })
  if (!checkCode(req, res)) return
  let body: any
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    return sendJson(res, 400, { error: 'body' })
  }
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
  if (!/^https:\/\//.test(endpoint)) return sendJson(res, 400, { error: 'endpoint gerekli' })
  if (path === '/push/subscribe') {
    if (pushSubs.size >= 200 && !pushSubs.has(endpoint)) return sendJson(res, 400, { error: 'çok fazla abonelik' })
    pushSubs.set(endpoint, { endpoint, keys: body.keys })
  } else {
    pushSubs.delete(endpoint)
  }
  savePushSubs()
  return sendJson(res, 200, { ok: true })
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, path: string) {
  let rel: string
  try {
    rel = normalize(decodeURIComponent(path)).replace(/^([/\\])+/, '')
  } catch {
    res.writeHead(400).end()
    return
  }
  // Gizli dosyalar ve Cloudflare'e özel _headers servis edilmez
  if (rel.split(/[/\\]/).some((p) => p.startsWith('.') || p === '_headers')) rel = ''
  let file = join(DIST_DIR, rel)
  if (!file.startsWith(DIST_DIR + sep) && file !== DIST_DIR) {
    res.writeHead(403).end()
    return
  }

  let st = existsSync(file) ? statSync(file) : null
  if (!st || !st.isFile()) {
    // Uzantısız yol → SPA (index.html); uzantılı ama yok → 404
    if (extname(rel)) {
      res.writeHead(404, SECURITY_HEADERS).end('Bulunamadı')
      return
    }
    file = join(DIST_DIR, 'index.html')
    st = existsSync(file) ? statSync(file) : null
    if (!st) {
      res.writeHead(503, SECURITY_HEADERS).end('Uygulama derlenmemiş (dist/ yok)')
      return
    }
  }

  const ext = extname(file).toLowerCase()
  const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`
  const relPath = file.slice(DIST_DIR.length).replace(/\\/g, '/')
  const cache = relPath.startsWith('/assets/')
    ? 'public, max-age=31536000, immutable'
    : ['.html', '.webmanifest'].includes(ext) || relPath === '/sw.js'
      ? 'no-cache'
      : 'public, max-age=86400'

  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': cache,
    ETag: etag,
    Vary: 'Accept-Encoding',
  }
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers).end()
    return
  }

  let body: Buffer = await readFile(file)
  if (COMPRESSIBLE.has(ext) && body.length > 1024 && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
    const hit = gzCache.get(file)
    if (hit && hit.key === etag) body = hit.buf
    else {
      const buf = gzipSync(body, { level: 9 })
      gzCache.set(file, { key: etag, buf })
      body = buf
    }
    headers['Content-Encoding'] = 'gzip'
  }
  headers['Content-Length'] = String(body.length)
  res.writeHead(200, headers)
  res.end(req.method === 'HEAD' ? undefined : body)
}

const spiritual = createSpiritual(SPIRITUAL_FILE)

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://x')
    const path = url.pathname
    if (path === '/health') return sendJson(res, 200, { ok: true, rev: room.rev, clients: wss.clients.size })
    if (path.startsWith('/push/')) return await handlePush(req, res, path)
    if (path === '/api/spiritual') return sendJson(res, 200, await spiritual.random())
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'method' })
    return await serveStatic(req, res, path)
  } catch (e) {
    console.error('İstek hatası:', (e as Error).message)
    if (!res.headersSent) res.writeHead(500)
    res.end()
  }
})

/* ------------------------------------------------------------------ */
/* WebSocket senkron                                                   */
/* ------------------------------------------------------------------ */
type Client = WebSocket & { authed?: boolean; alive?: boolean }
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES })

/** Başka sitelerin sayfaları ziyaretçinin tarayıcısı üzerinden bağlanamasın. */
function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (!origin) return true // tarayıcı dışı istemci (test, uygulama) — aile kodu yine gerekir
  if (ALLOWED_ORIGINS.includes(origin)) return true
  try {
    const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
    return new URL(origin).host === host
  } catch {
    return false
  }
}

server.on('upgrade', (req, socket, head) => {
  const path = new URL(req.url ?? '/', 'http://x').pathname
  if (path !== '/sync' || !originAllowed(req)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
    socket.destroy()
    return
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
})

function send(ws: WebSocket, msg: ServerMsg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg))
}

function broadcast(msg: ServerMsg, except: WebSocket) {
  const text = JSON.stringify(msg)
  for (const c of wss.clients as Set<Client>) {
    if (c !== except && c.authed && c.readyState === 1) c.send(text)
  }
}

wss.on('connection', (ws: Client, req: IncomingMessage) => {
  const ip = clientIp(req)
  ws.alive = true
  ws.on('pong', () => (ws.alive = true))
  // Kimlik doğrulamadan bekleyen bağlantı açık kalmasın
  const authTimer = setTimeout(() => !ws.authed && ws.close(CLOSE_AUTH, 'auth-timeout'), 10_000)

  ws.on('message', (raw) => {
    let msg: ClientMsg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }

    if (msg.type === 'ping') return send(ws, { type: 'pong' })

    if (msg.type === 'hello') {
      if (!FAMILY_CODE) {
        send(ws, { type: 'error', code: 'not-configured', message: 'Sunucuda FAMILY_CODE tanımlı değil' })
        return ws.close(CLOSE_AUTH, 'not-configured')
      }
      if (limiter.blocked(ip)) {
        send(ws, { type: 'error', code: 'rate-limit', message: 'Çok fazla hatalı deneme, 10 dk sonra tekrar deneyin' })
        return ws.close(CLOSE_AUTH, 'rate-limit')
      }
      if (!safeEqual(String(msg.code ?? ''), FAMILY_CODE)) {
        limiter.fail(ip)
        send(ws, { type: 'error', code: 'auth', message: 'Aile kodu yanlış' })
        return ws.close(CLOSE_AUTH, 'auth')
      }
      limiter.success(ip)
      ws.authed = true
      clearTimeout(authTimer)
      return send(ws, { type: 'snapshot', db: room.db, rev: room.rev })
    }

    if (msg.type === 'op' && ws.authed) {
      const id = typeof (msg.op as any)?.id === 'string' ? (msg.op as any).id : null
      const op = sanitizeOp(msg.op)
      if (!op) {
        // Geçersiz op'yi yine de onayla ki istemci sonsuza dek tekrar göndermesin
        if (id) send(ws, { type: 'ack', id, rev: room.rev })
        return send(ws, { type: 'error', code: 'bad-op', message: 'Geçersiz değişiklik reddedildi' })
      }
      if (room.apply(op)) {
        broadcast({ type: 'op', op }, ws)
        schedulePersist()
        if (op.entity === 'messages' && op.action === 'upsert') void pushMessage(op)
      }
      send(ws, { type: 'ack', id: op.id, rev: room.rev })
    }
  })

  ws.on('close', () => clearTimeout(authTimer))
  ws.on('error', () => undefined)
})

// Ölü bağlantıları temizle (tablet Wi-Fi'dan düştüyse)
setInterval(() => {
  for (const c of wss.clients as Set<Client>) {
    if (!c.alive) {
      c.terminate()
      continue
    }
    c.alive = false
    c.ping()
  }
}, 30_000).unref()

/* ------------------------------------------------------------------ */
server.listen(PORT, () => {
  spiritual.warmUp()
  console.log(`Aile Panosu hazır → http://0.0.0.0:${PORT}`)
  if (!FAMILY_CODE) console.warn('⚠ FAMILY_CODE tanımlı değil — senkron kapalı. Ortam değişkeni olarak ekleyin.')
  else if (FAMILY_CODE.length < 6) console.warn('⚠ FAMILY_CODE kısa — en az 6 karakter önerilir.')
  if (!existsSync(join(DIST_DIR, 'index.html'))) console.warn(`⚠ ${DIST_DIR} içinde uygulama yok (yalnızca senkron çalışıyor)`)
})

function shutdown() {
  persistNow()
  console.log('Kaydedildi, kapanıyor.')
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
