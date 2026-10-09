import { useEffect, useRef, useState } from 'react'
import type { Op, ServerMsg, ClientMsg } from './protocol'
import { parseMessage } from './protocol'
import { applyOp, hydrate, syncEmitter, onLocalBroadcast, localBroadcast } from '../state/store'
import { migrate } from '../state/migrate'
import { clientId } from '../lib/id'

export type SyncStatus = 'local' | 'connecting' | 'live' | 'reconnecting'

const SYNC_URL: string | undefined = (import.meta.env.VITE_SYNC_URL as string | undefined) || undefined
const HEARTBEAT_MS = 20_000

/**
 * useFamilySync — telefon ↔ duvar ekranı gerçek zamanlı senkronizasyonu.
 *
 * Katmanlar:
 *  1) WebSocket (VITE_SYNC_URL)  → cihazlar arası, 1-2 sn gecikme
 *  2) BroadcastChannel           → aynı cihazdaki çoklu sekmeler
 *  3) localStorage               → kalıcılık / çevrimdışı
 *
 * Dönüş: { status, sentCount, receivedCount, resync }
 */
export function useFamilySync(): {
  status: SyncStatus
  url: string | null
  received: number
  resync: () => void
} {
  const [status, setStatus] = useState<SyncStatus>(SYNC_URL ? 'connecting' : 'local')
  const [received, setReceived] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closedRef = useRef(false)
  const [, force] = useState(0)

  useEffect(() => {
    closedRef.current = false

    // --- 2) Aynı cihazdaki sekmeler arası köprü ---
    const offLocal = onLocalBroadcast((op) => {
      applyOp(op)
      setReceived((n) => n + 1)
    })

    // --- Uygulama içi op'leri dışarı taşı ---
    const offApp = syncEmitter.subscribe((op: Op) => {
      localBroadcast(op)
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        const msg: ClientMsg = { type: 'op', op }
        ws.send(JSON.stringify(msg))
      }
    })

    if (!SYNC_URL) {
      setStatus('local')
      return () => {
        offApp()
        offLocal()
      }
    }

    // --- 1) WebSocket ---
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const stopHeartbeat = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }

    const connect = () => {
      if (closedRef.current) return
      setStatus(retryRef.current > 0 ? 'reconnecting' : 'connecting')
      let ws: WebSocket
      try {
        ws = new WebSocket(SYNC_URL)
      } catch {
        scheduleRetry()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
        setStatus('live')
        const hello: ClientMsg = { type: 'hello', client: clientId() }
        ws.send(JSON.stringify(hello))
        stopHeartbeat()
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' } satisfies ClientMsg))
        }, HEARTBEAT_MS)
      }

      ws.onmessage = (ev) => {
        const msg = parseMessage(String(ev.data))
        if (!msg) return
        handleMessage(msg)
      }

      ws.onerror = () => {
        try {
          ws.close()
        } catch {
          /* yoksay */
        }
      }

      ws.onclose = () => {
        stopHeartbeat()
        wsRef.current = null
        if (closedRef.current) return
        scheduleRetry()
      }
    }

    const scheduleRetry = () => {
      setStatus('reconnecting')
      retryRef.current += 1
      const delay = Math.min(15_000, 1000 * Math.min(retryRef.current, 8))
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = setTimeout(connect, delay)
    }

    const handleMessage = (msg: ServerMsg) => {
      switch (msg.type) {
        case 'snapshot':
          hydrate(msg.db)
          migrate() // uzak snapshot eski şemada olabilir → göç uygula
          setReceived((n) => n + 1)
          break
        case 'op':
          if (msg.op?.origin === clientId()) return // kendi op'imiz yankılenmesin
          applyOp(msg.op)
          setReceived((n) => n + 1)
          break
        case 'pong':
          break
        case 'ack':
        case 'error':
          break
      }
    }

    const onOnline = () => {
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return
      retryRef.current = 0
      connect()
    }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onOnline)
    connect()

    return () => {
      closedRef.current = true
      stopHeartbeat()
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onOnline)
      try {
        wsRef.current?.close()
      } catch {
        /* yoksay */
      }
      wsRef.current = null
      offApp()
      offLocal()
    }
  }, [])

  return {
    status,
    url: SYNC_URL ?? null,
    received,
    resync: () => force((n) => n + 1),
  }
}

/** Send/sync durumunu global olarak okumak isteyen bileşenler için. */
export function syncLabel(s: SyncStatus): string {
  switch (s) {
    case 'live':
      return 'Senkronize'
    case 'connecting':
      return 'Bağlanıyor…'
    case 'reconnecting':
      return 'Yeniden bağlanıyor…'
    default:
      return 'Yerel mod'
  }
}
