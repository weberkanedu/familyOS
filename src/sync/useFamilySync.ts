import { useEffect, useRef, useState } from 'react'
import type { ErrorCode, Op, ServerMsg, ClientMsg } from './protocol'
import { CLOSE_AUTH, parseMessage } from './protocol'
import {
  applyOp, exportDB, getDB, hasLocalUserData, hydrate, localBroadcast, onLocalBroadcast, syncEmitter, uploadAll,
} from '../state/store'
import { migrate } from '../state/migrate'
import { clientId } from '../lib/id'
import { CODE_EVENT, getFamilyCode, resolveSyncUrl } from './config'
import { outboxAck, outboxAdd, outboxList, useOutboxCount } from './outbox'

export type SyncStatus = 'local' | 'connecting' | 'live' | 'reconnecting' | 'unauthorized'

const SYNC_URL = resolveSyncUrl()
const HEARTBEAT_MS = 20_000
const SYNCED_KEY = 'familyos:synced'
export const PRESYNC_KEY = 'familyos:presync-backup'

/** Bu cihaz bu sunucuyla daha önce eşleşti mi? */
function wasSynced(): boolean {
  try {
    return localStorage.getItem(SYNCED_KEY) === SYNC_URL
  } catch {
    return true
  }
}

function markSynced() {
  try {
    localStorage.setItem(SYNCED_KEY, SYNC_URL ?? '')
  } catch {
    /* yoksay */
  }
}

/**
 * İlk eşleşmede sunucuda zaten aile verisi varsa bu cihazın kendi verisi onunla
 * değiştirilir. Kaybolmasın diye bir kopyası saklanır (Ayarlar → Veri'den indirilebilir).
 */
function keepPreSyncBackup() {
  try {
    localStorage.setItem(PRESYNC_KEY, exportDB())
  } catch {
    /* depolama dolu */
  }
}

/**
 * useFamilySync — telefon ↔ duvar ekranı gerçek zamanlı senkronizasyonu.
 *
 * Katmanlar:
 *  1) WebSocket (aynı adres /sync ya da VITE_SYNC_URL) → cihazlar arası, 1-2 sn gecikme
 *  2) BroadcastChannel → aynı cihazdaki çoklu sekmeler
 *  3) localStorage → kalıcılık / çevrimdışı
 *  4) Giden kutusu → bağlantı yokken yapılan değişiklikler, bağlantı gelince gönderilir
 */
export function useFamilySync(): {
  status: SyncStatus
  url: string | null
  received: number
  pending: number
  authError: ErrorCode | null
} {
  const [status, setStatus] = useState<SyncStatus>(SYNC_URL ? 'connecting' : 'local')
  const [authError, setAuthError] = useState<ErrorCode | null>(null)
  const [received, setReceived] = useState(0)
  const pending = useOutboxCount()
  const wsRef = useRef<WebSocket | null>(null)
  const authedRef = useRef(false)
  const retryRef = useRef(0)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closedRef = useRef(false)

  useEffect(() => {
    closedRef.current = false

    // --- 2) Aynı cihazdaki sekmeler arası köprü ---
    const offLocal = onLocalBroadcast((op) => {
      applyOp(op)
      setReceived((n) => n + 1)
    })

    const send = (msg: ClientMsg) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    }

    // --- Uygulama içi op'leri dışarı taşı ---
    const offApp = syncEmitter.subscribe((op: Op) => {
      localBroadcast(op)
      if (!SYNC_URL) return
      outboxAdd(op) // ack gelene kadar saklanır
      if (authedRef.current) send({ type: 'op', op })
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
    let authBlocked = false

    const stopHeartbeat = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }

    const connect = () => {
      if (closedRef.current || authBlocked) return
      authedRef.current = false
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
        ws.send(JSON.stringify({ type: 'hello', client: clientId(), code: getFamilyCode() } satisfies ClientMsg))
        stopHeartbeat()
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' } satisfies ClientMsg))
        }, HEARTBEAT_MS)
      }

      ws.onmessage = (ev) => {
        if (wsRef.current !== ws) return
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

      ws.onclose = (ev) => {
        if (wsRef.current !== ws) return // yerine yenisi açılmış eski bağlantı
        stopHeartbeat()
        authedRef.current = false
        wsRef.current = null
        if (closedRef.current) return
        if (ev.code === CLOSE_AUTH || authBlocked) {
          authBlocked = true
          setStatus('unauthorized')
          return
        }
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
        case 'snapshot': {
          authedRef.current = true
          retryRef.current = 0
          setAuthError(null)
          setStatus('live')
          const queued = outboxList()
          if (msg.rev === 0 && hasLocalUserData()) {
            // Sunucu boş (ilk kurulum): bu cihazdaki aile verisini silme, sunucuya yükle
            for (const op of queued) send({ type: 'op', op })
            uploadAll(getDB())
          } else {
            if (!wasSynced() && hasLocalUserData()) keepPreSyncBackup()
            // Sunucunun güncel hali + henüz gönderilmemiş yerel değişiklikler
            hydrate(msg.db)
            for (const op of queued) applyOp(op)
            for (const op of queued) send({ type: 'op', op })
          }
          markSynced()
          migrate() // uzak snapshot eski şemada olabilir → göç uygula
          setReceived((n) => n + 1)
          break
        }
        case 'op':
          if (msg.op?.origin === clientId()) return // kendi op'imiz yankılanmasın
          applyOp(msg.op)
          setReceived((n) => n + 1)
          break
        case 'ack':
          outboxAck(msg.id)
          break
        case 'error':
          if (msg.code === 'auth' || msg.code === 'not-configured' || msg.code === 'rate-limit') {
            authBlocked = true
            setAuthError(msg.code)
            setStatus('unauthorized')
          }
          break
        case 'pong':
          break
      }
    }

    const reconnectNow = () => {
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return
      if (retryTimer) clearTimeout(retryTimer)
      retryRef.current = 0
      connect()
    }

    // Aile kodu değişti → yeniden dene
    const onCode = () => {
      authBlocked = false
      setAuthError(null)
      stopHeartbeat()
      const old = wsRef.current
      wsRef.current = null
      try {
        old?.close()
      } catch {
        /* yoksay */
      }
      reconnectNow()
    }

    window.addEventListener('online', reconnectNow)
    document.addEventListener('visibilitychange', reconnectNow)
    window.addEventListener(CODE_EVENT, onCode)
    connect()

    return () => {
      closedRef.current = true
      stopHeartbeat()
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('online', reconnectNow)
      document.removeEventListener('visibilitychange', reconnectNow)
      window.removeEventListener(CODE_EVENT, onCode)
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

  return { status, url: SYNC_URL, received, pending, authError }
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
    case 'unauthorized':
      return 'Aile kodu gerekli'
    default:
      return 'Yerel mod'
  }
}
