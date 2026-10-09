import { useEffect, useMemo, useRef, useState } from 'react'
import { useDB, type TabKey } from './state/store'
import { useFamilySync, syncLabel } from './sync/useFamilySync'
import { useWeather } from './lib/useWeather'
import { useMediaQuery } from './lib/hooks'
import { KioskLayout } from './components/layouts/KioskLayout'
import { MobileLayout } from './components/layouts/MobileLayout'
import { Dashboard } from './modules/Dashboard'
import { Calendar } from './modules/Calendar'
import { Chores } from './modules/Chores'
import { Shopping } from './modules/Shopping'
import { Meals } from './modules/Meals'
import { Learn } from './modules/Words'
import { Chat } from './modules/Chat'
import { Settings } from './modules/Settings'
import { isLocalMessage, selectLocation } from './state/actions'
import { beep, vibrate } from './lib/sound'
import { uiBus } from './state/uiBus'
import { ProgramPopups } from './modules/Programs'
import type { WeatherWidgetProps } from './components/WeatherWidget'
import { HOME } from './lib/location'
import type { Message } from './types'

const TAB_KEYS: TabKey[] = ['home', 'calendar', 'chores', 'shopping', 'meals', 'learn', 'chat', 'settings']

function initialTab(): TabKey {
  if (typeof window === 'undefined') return 'home'
  const t = new URLSearchParams(window.location.search).get('tab')
  return (TAB_KEYS as string[]).includes(t ?? '') ? (t as TabKey) : 'home'
}

export default function App() {
  const db = useDB()
  const { status, url } = useFamilySync()
  const [tab, setTab] = useState<TabKey>(initialTab)
  const [flash, setFlash] = useState<Message | null>(null)
  const [program, setProgram] = useState<{ kind: 'nutrition' | 'lessons'; kidId?: string | null } | null>(null)
  const wide = useMediaQuery('(min-width: 1024px)')

  const kiosk = db.settings.mode === 'kiosk' || (db.settings.mode === 'auto' && wide)
  const weather = useWeather(db.settings.lat ?? HOME.lat, db.settings.lon ?? HOME.lon, db.settings.weatherEnabled)

  /* Tema: <html> üzerine yazılır (portal içindeki pencereler de temayı alsın) */
  const themeId = db.settings.theme ?? 'classic'
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId)
  }, [themeId])

  /* Kayıtlı konumlar: aktif olanı bul (kaydırarak değiştirmek için) */
  const locations = db.settings.savedLocations?.length
    ? db.settings.savedLocations
    : [{ label: HOME.city, lat: HOME.lat, lon: HOME.lon, home: true }]
  const locationIndex = Math.max(
    0,
    locations.findIndex(
      (l) => Math.abs(l.lat - (db.settings.lat ?? HOME.lat)) < 0.01 && Math.abs(l.lon - (db.settings.lon ?? HOME.lon)) < 0.01,
    ),
  )
  const weatherProps: WeatherWidgetProps = {
    data: weather.data,
    city: db.settings.city || HOME.city,
    loading: weather.loading,
    error: weather.error,
    kiosk,
    locations,
    locationIndex,
    onLocationChange: (i: number) => selectLocation(i),
    onRetry: weather.refresh,
  }

  /* FAB / hızlı kısayollardan gelen program popup'ları */
  useEffect(() => {
    const off = uiBus.subscribe((e) => {
      if (e === 'open:nutrition') setProgram({ kind: 'nutrition' })
      if (e === 'open:lessons') setProgram({ kind: 'lessons' })
    })
    return off
  }, [])

  /* Yeni mesaj → ses + vibrate + ekran overlay (kiosk uyanır) */
  const lastIdRef = useRef<string | null>(db.messages[db.messages.length - 1]?.id ?? null)
  const soundMode = db.settings.soundMode ?? (db.settings.soundEnabled ? 'all' : 'off')
  useEffect(() => {
    const last = db.messages[db.messages.length - 1]
    if (!last || last.id === lastIdRef.current) return
    const isFirstLoad = lastIdRef.current === null
    lastIdRef.current = last.id
    if (isFirstLoad || isLocalMessage(last.id)) return

    // 'wall' = sadece duvar ekranı çalar, telefonlar sessiz kalır
    const shouldPlay = soundMode === 'all' || (soundMode === 'wall' && kiosk)
    if (shouldPlay) {
      beep('msg')
      vibrate([120, 60, 120])
    }
    setFlash(last)
    const t = setTimeout(() => setFlash((f) => (f && f.id === last.id ? null : f)), 6000)
    return () => clearTimeout(t)
  }, [db.messages, soundMode, kiosk])

  /* Sekme değişince üste dön (mobil) */
  useEffect(() => {
    if (!kiosk) window.scrollTo({ top: 0 })
  }, [tab, kiosk])

  const content = useMemo(() => {
    switch (tab) {
      case 'calendar':
        return <Calendar db={db} kiosk={kiosk} />
      case 'chores':
        return <Chores db={db} kiosk={kiosk} />
      case 'shopping':
        return <Shopping db={db} kiosk={kiosk} />
      case 'meals':
        return <Meals db={db} kiosk={kiosk} />
      case 'learn':
        return <Learn db={db} kiosk={kiosk} />
      case 'chat':
        return <Chat db={db} kiosk={kiosk} />
      case 'settings':
        return <Settings db={db} kiosk={kiosk} sync={{ status: syncLabel(status), url }} />
      default:
        return (
          <Dashboard
            db={db}
            weather={weatherProps}
            kiosk={kiosk}
            onTab={setTab}
            onProgram={(kind, kidId) => setProgram({ kind, kidId })}
          />
        )
    }
  }, [tab, db, kiosk, weather.data, weather.loading, weather.error, status, url, locations, locationIndex])

  const popups = (
    <ProgramPopups db={db} which={program?.kind ?? null} kidId={program?.kidId} onClose={() => setProgram(null)} />
  )

  if (kiosk) {
    return (
      <KioskLayout
        db={db}
        tab={tab}
        onTab={setTab}
        status={status}
        weather={weatherProps}
        flash={flash}
        onFlashDismiss={() => setFlash(null)}
      >
        {content}
        {popups}
      </KioskLayout>
    )
  }

  return (
    <MobileLayout db={db} tab={tab} onTab={setTab} status={status} flash={flash} onFlashDismiss={() => setFlash(null)}>
      {content}
      {popups}
    </MobileLayout>
  )
}
