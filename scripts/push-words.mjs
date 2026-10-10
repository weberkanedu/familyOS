// Kelime destesini canlı sunucuya gönderir (tüm cihazlarda Öğrenme + ekran koruyucuda görünür).
//
//   FAMILY_CODE=... node scripts/push-words.mjs content/kelimeler-6-sinif.json [wss://pano.erkanicil.me/sync]
//
// Kimlikler kelimeden türetilir: aynı dosya tekrar gönderilirse kopya oluşmaz,
// yalnızca anlamı güncellenir (öğrenme ilerlemesi sıfırlanmaz, sunucudaki kayıt korunur).
import { readFileSync } from 'node:fs'
import { WebSocket } from 'ws'

const [file, url = 'wss://pano.erkanicil.me/sync'] = process.argv.slice(2)
const code = process.env.FAMILY_CODE
if (!file || !code) {
  console.error('Kullanım: FAMILY_CODE=... node scripts/push-words.mjs <deste.json> [sync-adresi]')
  process.exit(1)
}

const deck = JSON.parse(readFileSync(file, 'utf8'))
const slug = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')
const prefix = `w_${slug(deck.deck)}_`

const ws = new WebSocket(url)
ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', client: 'push-words', code })))
ws.on('message', (raw) => {
  const msg = JSON.parse(String(raw))
  if (msg.type === 'error') {
    console.error('Sunucu:', msg.message)
    process.exit(1)
  }
  if (msg.type === 'snapshot') {
    const existing = new Map(msg.db.words.map((w) => [w.id, w]))
    const now = Date.now()
    const items = deck.words.map((w, i) => {
      const id = prefix + slug(w.term)
      const prev = existing.get(id)
      return prev
        ? { ...prev, term: w.term, meaning: w.meaning, deck: deck.deck, updatedAt: now }
        : {
            id,
            term: w.term,
            meaning: w.meaning,
            deck: deck.deck,
            state: 'new',
            ease: 2.5,
            intervalMin: 0,
            reps: 0,
            lapses: 0,
            dueAt: now + i, // listedeki sırayla gösterilsin
            updatedAt: now,
          }
    })
    const added = items.filter((w) => !existing.has(w.id)).length
    const op = { id: `push-words_${now}`, origin: 'push-words', ts: now, entity: 'words', action: 'upsert', items }
    ws.send(JSON.stringify({ type: 'op', op }))
    console.log(`${items.length} kelime gönderildi (${added} yeni, ${items.length - added} güncellendi) → ${deck.deck}`)
  }
  if (msg.type === 'ack') {
    console.log('✓ Sunucu kaydetti (rev ' + msg.rev + ')')
    ws.close()
    process.exit(0)
  }
})
ws.on('error', (e) => {
  console.error('Bağlantı hatası:', e.message)
  process.exit(1)
})
