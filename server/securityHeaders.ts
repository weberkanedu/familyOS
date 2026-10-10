/**
 * Güvenlik başlıkları — Node sunucusu ve Cloudflare Worker ortak kullanır.
 * Uygulamanın dışarıya bağlandığı tek adresler: Open-Meteo (hava) ve TheMealDB (tarif).
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.themealdb.com",
  "font-src 'self'",
  "connect-src 'self' ws: wss: https://api.open-meteo.com https://geocoding-api.open-meteo.com https://www.themealdb.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
}
