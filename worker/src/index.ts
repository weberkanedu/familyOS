/**
 * FamilyOS realtime sunucusu — Cloudflare Worker + Durable Object
 * (Docker/Dokploy karşılığı: server/index.ts — aynı protokol ve kurallar)
 *
 * - /sync            → WebSocket (aile kodu → snapshot + op yayını)
 * - /push/key        → Web Push genel anahtarı
 * - /push/subscribe  → Web Push aboneliği (D1, aile kodu ister)
 * - /push/unsubscribe
 * - statik dosyalar  → Workers Static Assets (dist) + güvenlik başlıkları
 *
 * Gizli değerler: npx wrangler secret put FAMILY_CODE (zorunlu), VAPID_* (opsiyonel)
 * Veri Durable Object'in kendi depolamasında (varlık başına ayrı anahtar) tutulur;
 * eski sürümün D1 family_state kaydı ilk açılışta bir kez içe alınır.
 */
import { DurableObject } from 'cloudflare:workers'
import type { EntityKey } from '../../src/types'
import { ENTITY_KEYS } from '../../src/types'
import type { ClientMsg, Op, ServerMsg } from '../../src/sync/protocol'
import { CLOSE_AUTH, MAX_MESSAGE_BYTES, safeEqual, sanitizeOp } from '../../src/sync/protocol'
import { AuthLimiter, RoomState } from '../../src/sync/room'
import { SECURITY_HEADERS } from '../../server/securityHeaders'

interface Env {
  ASSETS: Fetcher
  DB: D1Database
  ROOM: DurableObjectNamespace
  FAMILY_CODE?: string
  ALLOWED_ORIGINS?: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  VAPID_SUBJECT?: string
}

type Attachment = { authed: boolean; ip: string }

const limiter = new AuthLimiter()

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim())
  if (allowed.includes(origin)) return true
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export class FamilyRoom extends DurableObject<Env> {
  private room: RoomState | null = null

  private async load(): Promise<RoomState> {
    if (this.room) return this.room
    const stored = await this.ctx.storage.get<{ rev: number; recentIds: string[] }>('meta')
    if (stored) {
      const entries = await this.ctx.storage.get<unknown>(ENTITY_KEYS.map((k) => `e:${k}`))
      const db: Record<string, unknown> = {}
      for (const k of ENTITY_KEYS) db[k] = entries.get(`e:${k}`)
      this.room = new RoomState({ db, rev: stored.rev, recentIds: stored.recentIds })
    } else {
      // Eski sürüm: tüm veri D1'de tek JSON satırındaydı → bir kez taşı
      let legacy: { db?: unknown; rev?: number } | null = null
      try {
        const row = await this.env.DB.prepare('SELECT data FROM family_state WHERE key = ?').bind('main').first()
        if (row && typeof row.data === 'string') legacy = JSON.parse(row.data)
      } catch {
        /* tablo yok ya da bozuk kayıt */
      }
      this.room = new RoomState(legacy)
      await this.saveAll()
    }
    return this.room
  }

  private async saveAll() {
    const room = this.room!
    const entries: Record<string, unknown> = { meta: { rev: room.rev, recentIds: room.recentIds } }
    for (const k of ENTITY_KEYS) entries[`e:${k}`] = room.db[k]
    await this.ctx.storage.put(entries)
  }

  /** Yalnızca değişen varlığı yaz (her değer ayrı anahtar → boyut sınırına takılmaz). */
  private async saveEntity(entity: EntityKey) {
    const room = this.room!
    await this.ctx.storage.put({
      meta: { rev: room.rev, recentIds: room.recentIds },
      [`e:${entity}`]: room.db[entity],
    })
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      /* kapalı olabilir */
    }
  }

  private broadcast(msg: ServerMsg, except?: WebSocket) {
    const text = JSON.stringify(msg)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue
      const att = ws.deserializeAttachment() as Attachment | null
      if (!att?.authed) continue
      try {
        ws.send(text)
      } catch {
        /* kapalı olabilir */
      }
    }
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('FamilyOS sync: WebSocket bekleniyor', { status: 426 })
    }
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ authed: false, ip: request.headers.get('CF-Connecting-IP') ?? '?' } satisfies Attachment)
    return new Response(null, { status: 101, webSocket: client })
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
    if (text.length > MAX_MESSAGE_BYTES) return ws.close(1009, 'too-large')
    let msg: ClientMsg
    try {
      msg = JSON.parse(text)
    } catch {
      return
    }
    const att = (ws.deserializeAttachment() as Attachment | null) ?? { authed: false, ip: '?' }

    if (msg.type === 'ping') return this.send(ws, { type: 'pong' })

    if (msg.type === 'hello') {
      const code = (this.env.FAMILY_CODE ?? '').trim()
      if (!code) {
        this.send(ws, { type: 'error', code: 'not-configured', message: 'FAMILY_CODE tanımlı değil' })
        return ws.close(CLOSE_AUTH, 'not-configured')
      }
      if (limiter.blocked(att.ip)) {
        this.send(ws, { type: 'error', code: 'rate-limit', message: 'Çok fazla hatalı deneme' })
        return ws.close(CLOSE_AUTH, 'rate-limit')
      }
      if (!safeEqual(String(msg.code ?? ''), code)) {
        limiter.fail(att.ip)
        this.send(ws, { type: 'error', code: 'auth', message: 'Aile kodu yanlış' })
        return ws.close(CLOSE_AUTH, 'auth')
      }
      limiter.success(att.ip)
      ws.serializeAttachment({ ...att, authed: true } satisfies Attachment)
      const room = await this.load()
      return this.send(ws, { type: 'snapshot', db: room.db, rev: room.rev })
    }

    if (msg.type === 'op' && att.authed) {
      const room = await this.load()
      const id = typeof (msg.op as any)?.id === 'string' ? (msg.op as any).id : null
      const op = sanitizeOp(msg.op)
      if (!op) {
        if (id) this.send(ws, { type: 'ack', id, rev: room.rev })
        return this.send(ws, { type: 'error', code: 'bad-op', message: 'Geçersiz değişiklik reddedildi' })
      }
      if (room.apply(op)) {
        await this.saveEntity(op.entity)
        this.broadcast({ type: 'op', op }, ws)
        if (op.entity === 'messages' && op.action === 'upsert') {
          this.ctx.waitUntil(this.pushMessages(op).catch(() => undefined))
        }
      }
      this.send(ws, { type: 'ack', id: op.id, rev: room.rev })
    }
  }

  override async webSocketClose(ws: WebSocket) {
    try {
      ws.close()
    } catch {
      /* yoksay */
    }
  }

  /* ---------- Web Push ---------- */
  private async pushMessages(op: Op) {
    const env = this.env
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return
    const { default: webpush } = await import('web-push')
    webpush.setVapidDetails(env.VAPID_SUBJECT ?? 'mailto:aile@example.com', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

    const subs = await env.DB.prepare('SELECT subscription FROM push_subs').all()
    const message = op.items[0]
    if (!message) return
    const room = await this.load()
    const author = room.db.members.find((m) => m.id === message.fromId)
    const payload = JSON.stringify({
      title: `${room.db.settings.brandName || 'Aile Panosu'} · ${author?.name ?? 'Aile'}`,
      body: String(message.text ?? '').slice(0, 140),
      url: '/?tab=chat',
    })

    const stale: string[] = []
    await Promise.allSettled(
      (subs.results ?? []).map(async (row) => {
        try {
          await webpush.sendNotification(JSON.parse(row.subscription as string), payload, { TTL: 3600 })
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(row.subscription as string)
        }
      }),
    )
    for (const s of stale) {
      await env.DB.prepare('DELETE FROM push_subs WHERE subscription = ?').bind(s).run()
    }
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...SECURITY_HEADERS, 'Cache-Control': 'no-store' } })
}

function checkCode(request: Request, env: Env): Response | null {
  const code = (env.FAMILY_CODE ?? '').trim()
  const ip = request.headers.get('CF-Connecting-IP') ?? '?'
  if (!code) return json({ error: 'not-configured' }, 503)
  if (limiter.blocked(ip)) return json({ error: 'rate-limit' }, 429)
  if (!safeEqual(request.headers.get('x-family-code') ?? '', code)) {
    limiter.fail(ip)
    return json({ error: 'auth' }, 401)
  }
  limiter.success(ip)
  return null
}

/** Statik yanıtlara güvenlik ve önbellek başlıkları ekle. */
async function withHeaders(res: Response, path: string): Promise<Response> {
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v)
  if (path.startsWith('/assets/')) out.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  else if (path === '/sw.js' || path === '/manifest.webmanifest' || !path.includes('.')) out.headers.set('Cache-Control', 'no-cache')
  return out
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/sync') {
      if (!originAllowed(request, env)) return new Response('Forbidden', { status: 403 })
      const id = env.ROOM.idFromName('family')
      return env.ROOM.get(id).fetch(request)
    }

    if (path === '/push/key' && request.method === 'GET') {
      return json({ publicKey: env.VAPID_PUBLIC_KEY ?? '' })
    }

    if ((path === '/push/subscribe' || path === '/push/unsubscribe') && request.method === 'POST') {
      const denied = checkCode(request, env)
      if (denied) return denied
      let body: { endpoint?: string } | null = null
      try {
        const text = await request.text()
        if (text.length > 16 * 1024) return json({ error: 'too-large' }, 413)
        body = JSON.parse(text)
      } catch {
        return json({ error: 'body' }, 400)
      }
      const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
      if (!/^https:\/\//.test(endpoint)) return json({ error: 'endpoint gerekli' }, 400)
      if (path === '/push/subscribe') {
        await env.DB.prepare(
          `INSERT INTO push_subs (endpoint, subscription, created_at) VALUES (?, ?, ?)
           ON CONFLICT(endpoint) DO UPDATE SET subscription = excluded.subscription`,
        ).bind(endpoint, JSON.stringify(body), Date.now()).run()
      } else {
        await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(endpoint).run()
      }
      return json({ ok: true })
    }

    if (path === '/health') return json({ ok: true, ts: Date.now() })

    // Statik uygulama (Workers Static Assets); _headers dosyası dışarı verilmez
    if (path === '/_headers') return new Response('Bulunamadı', { status: 404 })
    return withHeaders(await env.ASSETS.fetch(request), path)
  },
} satisfies ExportedHandler<Env>
