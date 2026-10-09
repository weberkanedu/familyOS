/**
 * Open-Meteo entegrasyonu (API anahtarı gerektirmez).
 * Doküman: https://open-meteo.com/en/docs
 */

export interface WeatherNow {
  temp: number
  feelsLike: number
  precipProb: number
  weatherCode: number
  wind: number
  humidity?: number
  isDay: boolean
  /** Rüzgâr yönü (derece) */
  windDir?: number
  /** Hava basıncı (hPa) */
  pressure?: number
}

export interface WeatherDay {
  date: string
  min: number
  max: number
  weatherCode: number
  precipProb: number
  /** "06:42" */
  sunrise?: string
  sunset?: string
}

export interface WeatherData {
  now: WeatherNow
  days: WeatherDay[]
  fetchedAt: number
  placeLabel?: string
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export interface GeoPlace {
  name: string
  admin1?: string
  country?: string
  latitude: number
  longitude: number
}

export async function fetchWeather(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: '7',
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,relative_humidity_2m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
  })
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const data = await res.json()

  const now: WeatherNow = {
    temp: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    precipProb: data.daily?.precipitation_probability_max?.[0] ?? Math.round((data.current.precipitation ?? 0) * 100),
    weatherCode: data.current.weather_code,
    wind: Math.round(data.current.wind_speed_10m),
    humidity: data.current.relative_humidity_2m,
    isDay: data.current.is_day === 1,
    windDir: data.current.wind_direction_10m,
    pressure: data.current.surface_pressure,
  }

  const hhmm = (v?: string) => (v ? v.slice(11, 16) : undefined)

  const days: WeatherDay[] = (data.daily?.time ?? []).map((date: string, i: number) => ({
    date,
    min: Math.round(data.daily.temperature_2m_min[i]),
    max: Math.round(data.daily.temperature_2m_max[i]),
    weatherCode: data.daily.weather_code[i],
    precipProb: data.daily.precipitation_probability_max?.[i] ?? 0,
    sunrise: hhmm(data.daily.sunrise?.[i]),
    sunset: hhmm(data.daily.sunset?.[i]),
  }))

  return { now, days, fetchedAt: Date.now() }
}

/** Konum arama (Open-Meteo geocoding, anahtarsız) */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  if (!query.trim()) return []
  const params = new URLSearchParams({ name: query, count: '8', language: 'tr', format: 'json' })
  const res = await fetch(`${GEO_URL}?${params.toString()}`, { signal })
  if (!res.ok) throw new Error(`Geo HTTP ${res.status}`)
  const data = await res.json()
  return (data.results ?? []).map((r: any) => ({
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

/** WMO hava durumu kodları → (TR) açıklama */
export function wmoLabel(code: number): string {
  const map: Record<number, string> = {
    0: 'Açık', 1: 'Az bulutlu', 2: 'Parçalı bulutlu', 3: 'Çok bulutlu',
    45: 'Sisli', 48: 'Kırağılı sis',
    51: 'Hafif çisenti', 53: 'Çisenti', 55: 'Yoğun çisenti',
    56: 'Donan çisenti', 57: 'Yoğun donan çisenti',
    61: 'Hafif yağmur', 63: 'Yağmurlu', 65: 'Şiddetli yağmur',
    66: 'Donan yağmur', 67: 'Şiddetli donan yağmur',
    71: 'Hafif kar', 73: 'Kar yağışlı', 75: 'Yoğun kar', 77: 'Kar taneleri',
    80: 'Hafif sağanak', 81: 'Sağanak', 82: 'Şiddetli sağanak',
    85: 'Kar sağanağı', 86: 'Yoğun kar sağanağı',
    95: 'Gök gürültülü fırtına', 96: 'Dolulu fırtına', 99: 'Şiddetli dolulu fırtına',
  }
  return map[code] ?? 'Bulutlu'
}

export function wmoGroup(code: number): 'clear' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog' {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2 || code === 3) return 'cloud'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloud'
}
