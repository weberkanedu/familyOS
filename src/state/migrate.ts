import { getDB, dispatch } from './store'
import { defaultSettings } from './reducer'
import { HOME } from '../lib/location'

/**
 * Şema/ayar göçleri (veri kaybı olmadan).
 * Eski cihazlarda kalan kayıtları yeni sürüme taşır.
 */
export function migrate(): void {
  const db = getDB()
  const s = db.settings

  /* Beslenme: eski kayıtlar (date / slot) serbest menüye (weekday + time) çevrilir */
  const legacyNutrition = (db.nutrition ?? []).filter(
    (n: any) => n && (typeof n.date === 'string' || n.slot != null),
  )
  if (legacyNutrition.length) {
    const SLOT_LABEL: Record<string, string> = {
      sabah: 'Kahvaltı',
      ara1: 'Ara öğün',
      ogle: 'Öğle',
      ara2: 'İkindi',
      aksam: 'Akşam',
    }
    const SLOT_TIME: Record<string, string> = {
      sabah: '07:30',
      ara1: '10:00',
      ogle: '12:30',
      ara2: '15:30',
      aksam: '18:30',
    }
    const converted = legacyNutrition.map((n: any) => ({
      id: n.id,
      memberId: n.memberId,
      weekday:
        n.weekday ??
        (typeof n.date === 'string'
          ? (() => {
              const [y, m, d] = n.date.split('-').map(Number)
              const dt = new Date(y, (m || 1) - 1, d || 1)
              return ((dt.getDay() + 6) % 7) + 1
            })()
          : 1),
      time: n.time || SLOT_TIME[n.slot] || '12:00',
      title: n.title && !SLOT_LABEL[n.slot] ? n.title : `${SLOT_LABEL[n.slot] ?? ''}: ${n.title ?? ''}`.trim(),
      note: n.note,
      updatedAt: Date.now(),
    }))
    dispatch({ entity: 'nutrition', action: 'replaceAll', items: converted })
  }

  // Sabit ev konumu: Ankara 06070
  const wrongCity = !s.city || s.city === 'İstanbul' || !s.lat || Math.abs(s.lat - HOME.lat) > 0.01
  // Aile adı
  const wrongName = !s.familyName || s.familyName === 'Ailem'
  // Kayıtlı konumlar yoksa ev konumunu ekle
  const noLocations = !s.savedLocations || !s.savedLocations.length
  const noBrand = !s.brandName

  if (wrongCity || wrongName || !s.soundMode || noLocations || noBrand) {
    const locations =
      s.savedLocations && s.savedLocations.length
        ? s.savedLocations
        : [{ label: HOME.city, lat: HOME.lat, lon: HOME.lon, home: true }]

    dispatch({
      entity: 'settings',
      action: 'upsert',
      items: [
        {
          ...s,
          ...defaultSettings(),
          ...s,
          familyName: wrongName ? 'İÇİL Ailesi' : s.familyName,
          brandName: s.brandName || 'İÇİL Ailesi',
          city: wrongCity ? HOME.city : s.city,
          lat: wrongCity ? HOME.lat : s.lat,
          lon: wrongCity ? HOME.lon : s.lon,
          soundMode: s.soundMode ?? (s.soundEnabled ? 'wall' : 'off'),
          savedLocations: locations,
          updatedAt: Date.now(),
        },
      ],
    })
  }
}
