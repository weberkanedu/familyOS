import type { IconType } from 'react-icons'
import {
  WiCloudy,
  WiDayCloudy,
  WiDayCloudyHigh,
  WiDayFog,
  WiDayHaze,
  WiDayRain,
  WiDayRainMix,
  WiDayShowers,
  WiDaySleet,
  WiDaySnow,
  WiDaySunny,
  WiDaySunnyOvercast,
  WiDayThunderstorm,
  WiFog,
  WiHail,
  WiNightAltCloudy,
  WiNightAltPartlyCloudy,
  WiNightAltRain,
  WiNightAltRainMix,
  WiNightAltShowers,
  WiNightAltSleet,
  WiNightAltSnow,
  WiNightAltThunderstorm,
  WiNightClear,
  WiNightCloudy,
  WiNightCloudyHigh,
  WiNightFog,
  WiNightRain,
  WiNightRainMix,
  WiNightShowers,
  WiNightSleet,
  WiNightSnow,
  WiNightThunderstorm,
  WiRain,
  WiRainMix,
  WiShowers,
  WiSleet,
  WiSnow,
  WiSnowflakeCold,
  WiThunderstorm,
} from 'react-icons/wi'
import { condOf, styleFor } from '../lib/weatherStyle'

/**
 * Hava ikonu — Weather Icons (react-icons/wi) kütüphanesinden.
 * Her koşul için ayrı gündüz/gece ikonu var; kart paletine göre
 * okunaklılık otomatik ayarlanır (koyu kartta beyaz, açık kartta koyu).
 */
function pick(code: number, isDay: boolean): IconType {
  if (isDay) {
    if (code === 0) return WiDaySunny
    if (code === 1) return WiDaySunnyOvercast
    if (code === 2) return WiDayCloudy
    if (code === 3) return WiCloudy
    if (code === 45) return WiDayFog
    if (code === 48) return WiDayHaze
    if (code === 51 || code === 53 || code === 55) return WiDayRainMix
    if (code === 56 || code === 57 || code === 66 || code === 67 || code === 85 || code === 86) return WiDaySleet
    if (code === 61) return WiDayRain
    if (code === 63) return WiDayRainMix
    if (code === 65) return WiDayRain
    if (code === 71 || code === 73) return WiDaySnow
    if (code === 75 || code === 77) return WiSnowflakeCold
    if (code === 80 || code === 81) return WiDayShowers
    if (code === 82) return WiDayShowers
    if (code === 95 || code === 96 || code === 99) return WiDayThunderstorm
    return WiDayCloudyHigh
  }

  if (code === 0) return WiNightClear
  if (code === 1) return WiNightCloudyHigh
  if (code === 2) return WiNightAltPartlyCloudy
  if (code === 3) return WiCloudy
  if (code === 45) return WiNightFog
  if (code === 48) return WiNightFog
  if (code === 51 || code === 53 || code === 55) return WiNightAltRainMix
  if (code === 56 || code === 57 || code === 66 || code === 67 || code === 85 || code === 86) return WiNightAltSleet
  if (code === 61 || code === 63 || code === 65) return WiNightAltRain
  if (code === 71 || code === 73) return WiNightAltSnow
  if (code === 75 || code === 77) return WiSnowflakeCold
  if (code === 80 || code === 81 || code === 82) return WiNightAltShowers
  if (code === 95 || code === 96 || code === 99) return WiNightAltThunderstorm
  return WiNightAltCloudy
}

/** Koşul grubu için koyu mu açık mı (metin rengi paletten gelir) */
function isLightScene(code: number, isDay: boolean): boolean {
  return styleFor(code, isDay).text === 'light'
}

export function WeatherArt({
  code,
  isDay = true,
  className,
}: {
  code: number
  isDay?: boolean
  className?: string
}) {
  const Icon = pick(code, isDay)
  const light = isLightScene(code, isDay)
  // Koyu kartta saf beyaz, açık kartta derin slate-800 (okunaklılık için)
  const tone = light ? 'text-white' : 'text-slate-800'
  // Koyu kartta ikon arkasına hafif koyu hale: açık zeminde değil, koyu zeminde okunur
  const halo = light ? 'drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]' : 'drop-shadow-[0_6px_14px_rgba(255,255,255,0.55)]'

  return (
    <span className={`inline-flex items-center justify-center fs-icon-float ${tone} ${halo} ${className ?? ''}`}>
      {/* react-icons varsayılan 1em boyutundadır; kaplayıcıya uyması için 100% gerekir */}
      <Icon aria-hidden="true" focusable="false" className="w-full h-full" />
    </span>
  )
}

/** Küçük pill/rozet içinde kullanılan tek renkli ikon */
export function WeatherIcon({
  code,
  isDay = true,
  className,
}: {
  code: number
  isDay?: boolean
  className?: string
}) {
  const Icon = pick(code, isDay)
  return (
    <span className={`inline-flex items-center justify-center ${className ?? ''}`}>
      <Icon aria-hidden="true" focusable="false" className="w-full h-full" />
    </span>
  )
}

export { pick as weatherIconFor }