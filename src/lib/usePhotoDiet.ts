import { useEffect, useRef } from 'react'
import type { DB } from '../types'
import { PHOTO_SIZES, shrinkDataUrl } from './image'
import { saveMember, saveSettings } from '../state/actions'

/** Bu boyutun üstündeki kayıtlı fotoğraflar küçültülür (data URL uzunluğu, ~KB×1.37) */
const FAMILY_LIMIT = 450_000
const MEMBER_LIMIT = 160_000

/**
 * Eski sürümde yüklenen büyük fotoğrafları bir kez küçültür.
 * Küçültülen fotoğraf op olarak yayıldığı için tüm cihazlar ve sunucu da rahatlar.
 */
export function usePhotoDiet(db: DB) {
  const busy = useRef(false)
  const familyPhoto = db.settings.familyPhoto
  const members = db.members

  useEffect(() => {
    if (busy.current || typeof document === 'undefined') return
    const bigFamily = familyPhoto && familyPhoto.length > FAMILY_LIMIT ? familyPhoto : null
    const bigMembers = members.filter((m) => m.photo && m.photo.length > MEMBER_LIMIT)
    if (!bigFamily && !bigMembers.length) return
    busy.current = true
    void (async () => {
      try {
        if (bigFamily) {
          const small = await shrinkDataUrl(bigFamily, PHOTO_SIZES.family.maxSize, PHOTO_SIZES.family.quality)
          if (small.length < bigFamily.length * 0.8) saveSettings({ familyPhoto: small })
        }
        for (const m of bigMembers) {
          const small = await shrinkDataUrl(m.photo!, PHOTO_SIZES.member.maxSize, PHOTO_SIZES.member.quality)
          if (small.length < m.photo!.length * 0.8) saveMember({ id: m.id, photo: small })
        }
      } catch {
        /* görsel açılamadı: olduğu gibi kalsın */
      } finally {
        busy.current = false
      }
    })()
  }, [familyPhoto, members])
}
