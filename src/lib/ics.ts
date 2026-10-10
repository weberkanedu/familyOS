import type { EventItem } from '../types'

/**
 * Basit .ics (iCalendar) okuyucu — Google Takvim / Apple / Outlook dışa aktarımları için.
 *
 * Google Takvim: Ayarlar → İçe ve dışa aktar → Dışa aktar (zip içindeki .ics dosyası).
 * - Yalnızca 30 gün öncesinden itibaren etkinlikler alınır (eski geçmiş şişirmesin)
 * - Yinelenen etkinliklerin (RRULE) yalnızca ilk tarihi alınır
 * - Aynı dosya tekrar yüklenirse kopya oluşmaz (UID'den sabit kimlik)
 */
const MAX_EVENTS = 1000
const PAST_DAYS = 30

export interface IcsResult {
  events: EventItem[]
  skippedOld: number
  recurring: number
}

function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim()
}

/** 20261010 · 20261010T090000 · 20261010T090000Z → { allDay, value } */
function parseDate(value: string, params: string): { allDay: boolean; iso: string } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim())
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (!h || /VALUE=DATE(?!-)/i.test(params)) return { allDay: true, iso: `${y}-${mo}-${d}` }
  const date = z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)))
    : new Date(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)) // TZID'li / yüzen saat: cihaz saati kabul edilir
  return { allDay: false, iso: date.toISOString() }
}

/** UID → kısa, sabit kimlik (FNV-1a) */
function stableId(uid: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `ics_${(h >>> 0).toString(36)}_${uid.length.toString(36)}`
}

export function parseIcs(text: string, now = Date.now()): IcsResult {
  const lines = unfold(text)
  const cutoff = now - PAST_DAYS * 86_400_000
  const events: EventItem[] = []
  let skippedOld = 0
  let recurring = 0
  let cur: Record<string, { params: string; value: string }> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {}
      continue
    }
    if (line === 'END:VEVENT') {
      const ev = cur
      cur = null
      if (!ev?.DTSTART || !ev.SUMMARY) continue
      const start = parseDate(ev.DTSTART.value, ev.DTSTART.params)
      if (!start) continue
      const end = ev.DTEND ? parseDate(ev.DTEND.value, ev.DTEND.params) : null
      const endTs = new Date(end?.iso ?? start.iso).getTime()
      if (ev.RRULE) recurring++
      else if (endTs < cutoff) {
        skippedOld++
        continue
      }
      if (ev.STATUS?.value === 'CANCELLED') continue
      const uid = ev.UID?.value || `${ev.SUMMARY.value}|${ev.DTSTART.value}`
      events.push({
        id: stableId(uid),
        title: unescape(ev.SUMMARY.value).slice(0, 200) || 'Etkinlik',
        start: start.iso,
        end: !start.allDay && end && !end.allDay ? end.iso : undefined,
        allDay: start.allDay,
        memberIds: [],
        location: ev.LOCATION ? unescape(ev.LOCATION.value).slice(0, 200) || undefined : undefined,
        notes: ev.DESCRIPTION ? unescape(ev.DESCRIPTION.value).slice(0, 1000) || undefined : undefined,
        updatedAt: now,
      })
      if (events.length >= MAX_EVENTS) break
      continue
    }
    if (!cur) continue
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const head = line.slice(0, colon)
    const semi = head.indexOf(';')
    const name = (semi < 0 ? head : head.slice(0, semi)).toUpperCase()
    if (!cur[name]) cur[name] = { params: semi < 0 ? '' : head.slice(semi + 1), value: line.slice(colon + 1) }
  }

  return { events, skippedOld, recurring }
}
