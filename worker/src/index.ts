/**
 * FamilyOS realtime sunucusu — Cloudflare Worker + Durable Object
 *
 * - /sync            → WebSocket (snapshot + op yayını, 1-2 sn gecikme)
 * - /push/subscribe  → Web Push aboneliği (D1)
 * - /push/unsubscribe
 * - statik dosyalar  → Workers Static Assets (dist)
 *
 * İstemci protokolü: src/sync/protocol.ts
 */
import { DurableObject } from 'cloudflare:workers'
import type { DB, EntityKey } from '../../src/types'
import { ENTITY_KEYS } from '../../src/types'
import type { ClientMsg, Op, ServerMsg } from '../../src/sync/protocol'

interface Env {
  ASSETS: Fetcher
  DB: D1Database
  ROOM: DurableObjectNamespace
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  VAPID_SUBJECT?: string
}

const MAX_OPS = 400
const PERSIST_DEBOUNCE_MS = 1500

function emptyDB(): DB {
  return {
    members: [],
    events: [],
    chores: [],
    shopping: [],
    meals: [],
    words: [],
    quiz: [],
    quizResults: [],
    messages: [],
    nutrition: [],
    lessons: [],
    settings: {
      id: 'main',
      familyName: 'Aile Panosu',
      mode: 'auto',
      idleMinutes: 3,
      city: 'Ankara 06070',
      lat: 39.9208,
      lon: 32.8541,
      weatherEnabled: true,
      soundEnabled: true,
      soundMode: 'wall',
      savedLocations: [{ label: 'Ankara 06070', lat: 39.9208, lon: 32.8541, home: true }],
      updatedAt: Date.now(),
    },
  }
}

type Row = { id: string; updatedAt?: number }

function reduce(db: DB, op: Op): DB {
  if (op.action === 'replaceAll') return { ...db, [op.entity]: op.items } as DB
  const current = db[op.entity] as unknown

  /* Tekil entity (settings): nesne olarak birleştir */
  if (!Array.isArray(current)) {
    if (op.action === 'delete') return db
    const patch = op.items
      .filter(Boolean)
      .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
    if (!patch) return db
    const base = (current ?? {}) as Record<string, unknown>
    if ((base.updatedAt ?? 0) > (patch.updatedAt ?? 0)) return db
    return { ...db, [op.entity]: { ...base, ...patch } } as DB
  }

  const list = current as Row[]
  let next: Row[]
  if (op.action === 'delete') {
    const ids = new Set(op.items.map((i) => i?.id))
    next = list.filter((i) => !ids.has(i.id))
  } else {
    const incoming = new Map<string, Row>()
    for (const item of op.items) {
      if (!item || typeof item.id !== 'string') continue
      const prev = incoming.get(item.id)
      if (!prev || (item.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) incoming.set(item.id, item)
    }
    const out: Row[] = []
    const seen = new Set<string>()
    for (const item of list) {
      const inc = incoming.get(item.id)
      if (inc) {
        seen.add(item.id)
        out.push((inc.updatedAt ?? 0) >= (item.updatedAt ?? 0) ? inc : item)
      } else out.push(item)
    }
    for (const [id, item] of incoming) if (!seen.has(id)) out.push(item)
    next = out
  }
  return { ...db, [op.entity]: next } as DB
}

export class FamilyRoom extends DurableObject {
  private db: DB = emptyDB()
  private rev = 0
  private ops: Op[] = []
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private loaded = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  private async ensureLoaded() {
    if (this.loaded) return
    const row = await (this.env as Env).DB.prepare('SELECT data FROM family_state WHERE key = ?').bind('main').first()
    if (row && typeof row.data === 'string') {
      try {
        const parsed = JSON.parse(row.data) as { db: DB; ops: Op[]; rev: number }
        this.db = parsed.db ?? emptyDB()
        this.ops = Array.isArray(parsed.ops) ? parsed.ops : []
        this.rev = parsed.rev ?? 0
      } catch {
        /* bozuk kayıt → sıfırdan başla */
      }
    }
    this.loaded = true
  }

  private schedulePersist() {
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      void this.persist()
    }, PERSIST_DEBOUNCE_MS)
  }

  private async persist() {
    const payload = JSON.stringify({ db: this.db, ops: this.ops.slice(-MAX_OPS), rev: this.rev })
    await (this.env as Env)
      .DB.prepare(
        `INSERT INTO family_state (key, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      )
      .bind('main', payload, Date.now())
      .run()
  }

  private broadcast(msg: ServerMsg, except?: WebSocket) {
    const text = JSON.stringify(msg)
    const sessions = this.ctx.getWebSockets()
    for (const ws of sessions) {
      if (ws === except) continue
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
    await this.ensureLoaded()

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server)
    server.send(JSON.stringify({ type: 'snapshot', db: this.db, rev: this.rev } satisfies ServerMsg))
    return new Response(null, { status: 101, webSocket: client })
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    await this.ensureLoaded()
    let msg: ClientMsg
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw))
    } catch {
      return
    }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' } satisfies ServerMsg))
      return
    }

    if (msg.type === 'hello') {
      ws.send(JSON.stringify({ type: 'snapshot', db: this.db, rev: this.rev } satisfies ServerMsg))
      return
    }

    if (msg.type === 'op' && msg.op && typeof msg.op.entity === 'string') {
      if (!ENTITY_KEYS.includes(msg.op.entity as EntityKey)) return
      const op: Op = { ...msg.op, ts: Date.now() }
      this.db = reduce(this.db, op)
      this.ops.push(op)
      if (this.ops.length > MAX_OPS) this.ops = this.ops.slice(-MAX_OPS)
      this.rev += 1
      this.broadcast({ type: 'op', op }, ws) // üreten cihaza yankılama
      ws.send(JSON.stringify({ type: 'ack', id: op.id, rev: this.rev } satisfies ServerMsg))
      this.schedulePersist()
      if (op.entity === 'messages' && op.action === 'upsert') {
        void this.pushMessages(op).catch(() => undefined)
      }
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
    const env = this.env as Env
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return
    const { default: webpush } = await import('web-push')
    webpush.setVapidDetails(
      env.VAPID_SUBJECT ?? 'mailto:family@example.com',
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    )

    const subs = await env.DB.prepare('SELECT subscription FROM push_subs').all()
    const message = op.items[0]
    if (!message) return

    const author = this.db.members.find((m) => m.id === message.fromId)
    const payload = JSON.stringify({
      title: `FamilyOS · ${author?.name ?? 'Aile'}`,
      body: String(message.text ?? '').slice(0, 140),
      url: '/',
    })

    const stale: string[] = []
    for (const row of subs.results ?? []) {
      try {
        await webpush.sendNotification(JSON.parse(row.subscription as string), payload)
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(row.subscription as string)
      }
    }
    for (const s of stale) {
      await env.DB.prepare('DELETE FROM push_subs WHERE subscription = ?').bind(s).run()
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/sync') {
      const id = env.ROOM.idFromName('family')
      return env.ROOM.get(id).fetch(request)
    }

    if (url.pathname === '/push/subscribe' && request.method === 'POST') {
      const sub = (await request.json()) as { endpoint?: string }
      if (!sub?.endpoint) return Response.json({ error: 'endpoint gerekli' }, { status: 400 })
      await env.DB.prepare(
        `INSERT INTO push_subs (endpoint, subscription, created_at) VALUES (?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET subscription = excluded.subscription`,
      ).bind(sub.endpoint, JSON.stringify(sub), Date.now()).run()
      return Response.json({ ok: true })
    }

    if (url.pathname === '/push/unsubscribe' && request.method === 'POST') {
      const { endpoint } = (await request.json()) as { endpoint?: string }
      if (endpoint) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(endpoint).run()
      return Response.json({ ok: true })
    }

    if (url.pathname === '/health') {
      return Response.json({ ok: true, ts: Date.now() })
    }

    // Statik uygulama (Workers Static Assets)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
