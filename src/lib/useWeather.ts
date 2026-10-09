import { useEffect, useRef, useState } from 'react'
import { fetchWeather, type WeatherData } from './openMeteo'

const CACHE_KEY = 'familyos:weather:v1'
const TTL = 10 * 60_000

interface Cache extends WeatherData {
  lat: number
  lon: number
}

function readCache(lat: number, lon: number): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Cache
    if (c.lat !== lat || c.lon !== lon) return null
    if (Date.now() - c.fetchedAt > 6 * 3600_000) return null
    return c
  } catch {
    return null
  }
}

/** Hava durumu: önbellek + 10 dk'da bir yenileme. */
export function useWeather(lat: number, lon: number, enabled: boolean) {
  const [data, setData] = useState<WeatherData | null>(() => readCache(lat, lon))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const load = async (force = false) => {
    if (!enabled) return
    if (!force && data && Date.now() - data.fetchedAt < TTL) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWeather(lat, lon, ctrl.signal)
      setData(res)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...res, lat, lon }))
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message ?? 'Hava durumu alınamadı')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setData(readCache(lat, lon))
    void load(true)
    const id = setInterval(() => void load(), TTL)
    return () => {
      clearInterval(id)
      abortRef.current?.abort()
    }
  }, [lat, lon, enabled])

  return { data, loading, error, refresh: () => load(true) }
}
