import { useEffect, useState } from 'react'
import { randomHadis, type HadisItem } from './hadisList'

/** TV sol üst: bir ayet + bir hadis. Uygulama her açılışta bir kez sunucudan ister (/api/spiritual). */
export type Spiritual = { ayet: HadisItem; hadis: HadisItem }

/* Sunucuya ulaşılamazsa (çevrimdışı, yerel önizleme): kısa ayetler, Diyanet meali (api.alquran.cloud tr.diyanet metni) */
const AYET_FALLBACK: HadisItem[] = [
  { text: 'Gerçekten, güçlükle beraber bir kolaylık vardır.', ref: 'İnşirâh, 6' },
  { text: 'Kim zerre kadar iyilik yapmışsa onu görür.', ref: 'Zilzâl, 7' },
  { text: 'Ey inananlar! Allah’ı çok anın.', ref: 'Ahzâb, 41' },
  { text: 'Sabret, Allah iyi davrananların ecrini elbette zayi etmez.', ref: 'Hûd, 115' },
  { text: 'Kendini arıtan saadete ermiştir.', ref: 'Şems, 9' },
]

function fallback(): Spiritual {
  return { ayet: AYET_FALLBACK[Math.floor(Math.random() * AYET_FALLBACK.length)], hadis: randomHadis() }
}

let request: Promise<Spiritual> | null = null

/** Açılışta bir kez (modül ömrü boyunca) — her başlatmada yeni ayet/hadis. */
function load(): Promise<Spiritual> {
  if (!request) {
    request = (async () => {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 6000)
      try {
        const r = await fetch('/api/spiritual', { cache: 'no-store', signal: ctrl.signal })
        if (!r.ok) throw new Error(String(r.status))
        const j = (await r.json()) as Partial<Spiritual>
        const fb = fallback()
        return { ayet: j.ayet?.text ? j.ayet : fb.ayet, hadis: j.hadis?.text ? j.hadis : fb.hadis }
      } catch {
        return fallback()
      } finally {
        clearTimeout(t)
      }
    })()
  }
  return request
}

export function useSpiritual(): Spiritual | null {
  const [v, setV] = useState<Spiritual | null>(null)
  useEffect(() => {
    let alive = true
    void load().then((x) => alive && setV(x))
    return () => {
      alive = false
    }
  }, [])
  return v
}
