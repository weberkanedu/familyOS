/**
 * TV modu (Android TV launcher'ı içindeki WebView).
 *
 * Yerel uygulama `window.FamilyOS` köprüsünü sayfa betiklerinden önce ekler; varsa TV moduyuz.
 * Masaüstünde denemek için: ?tv=1 (kalıcı), kapatmak için ?tv=0.
 *
 * TV modunda:
 *  - <html class="tv">: blur / filtre / animasyon / geçişler kapanır (index.css)
 *  - görünüm 1280 px'e sabitlenir → kiosk düzeni
 *  - D-pad ile yön bulma (en yakın odaklanabilir öğe) + odak halkası
 *  - Geri tuşu: açık pencereyi kapatır, yoksa ana sayfaya döner (launcher kapanmaz)
 */

type NativeBridge = {
  openApp(nameOrPkg: string): boolean
  isInstalled(nameOrPkg: string): boolean
  listApps(): string
  nativeVersion(): string
}

const TV_KEY = 'familyos:tv'

function bridge(): NativeBridge | null {
  if (typeof window === 'undefined') return null
  return ((window as unknown as { FamilyOS?: NativeBridge }).FamilyOS ?? null)
}

function detect(): boolean {
  if (typeof window === 'undefined') return false
  if (bridge()) return true
  try {
    const q = new URLSearchParams(window.location.search).get('tv')
    if (q === '1') localStorage.setItem(TV_KEY, '1')
    if (q === '0') localStorage.removeItem(TV_KEY)
    return localStorage.getItem(TV_KEY) === '1'
  } catch {
    return false
  }
}

export const TV = detect()

/* ---------- Uygulamalar ---------- */
export type TvApp = { id: 'tivimate' | 'youtube' | 'android-settings'; label: string }
const APPS: TvApp[] = [
  { id: 'tivimate', label: 'TiviMate' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'android-settings', label: 'TV ayarları' },
]

/** Bu cihazda kurulu olan uygulama kısayolları (köprü yoksa boş). */
export function tvApps(): TvApp[] {
  const b = bridge()
  if (!b) return []
  return APPS.filter((a) => {
    try {
      return b.isInstalled(a.id)
    } catch {
      return false
    }
  })
}

export function openTvApp(id: string): boolean {
  try {
    return bridge()?.openApp(id) ?? false
  } catch {
    return false
  }
}

/* ---------- Kurulum (render'dan önce) ---------- */
export function setupTV() {
  if (!TV) return
  const html = document.documentElement
  html.classList.add('tv')
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=1280')
  window.addEventListener('keydown', onKey)
  if (import.meta.env.PROD) watchForUpdates()
}

/**
 * Yeni dağıtımı kendiliğinden al: TV sayfası günlerce açık kalır, yeniden yüklenmezse eski
 * derleme çalışmaya devam ederdi. 10 dk'da bir (ve başka uygulamadan dönünce) index.html'deki
 * ana betik adına bakılır; değiştiyse ve son 1 dk tuşa basılmadıysa sayfa yenilenir.
 */
function watchForUpdates() {
  const current = document.querySelector<HTMLScriptElement>('script[src*="/assets/index-"]')?.src
  if (!current) return
  let lastKey = Date.now()
  let pending = false
  window.addEventListener('keydown', () => (lastKey = Date.now()), true)
  const check = async () => {
    if (!pending) {
      try {
        const html = await (await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' })).text()
        const m = /src="([^"]*\/assets\/index-[^"]+\.js)"/.exec(html)
        pending = !!m && new URL(m[1], location.href).href !== current
      } catch {
        return // çevrimdışı: sonra yine bakılır
      }
    }
    if (pending && Date.now() - lastKey > 60_000) location.reload()
  }
  setInterval(check, 10 * 60_000)
  window.addEventListener('familyos:resume', () => void check())
}

/**
 * Geri / Home tuşu: üstteki katmanı kapatmayı dener.
 * true → bir şey kapatıldı (sayfa değiştirme).
 */
export function closeTopLayer(): boolean {
  const active = document.activeElement as HTMLElement | null
  const typing = !!active && isTextField(active)
  const layer = !!document.querySelector('[role="dialog"]')
  // Escape: Modal'ları kapatır, ekran koruyucuyu da uyandırır (useIdle keydown dinler)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  if (typing) active!.blur()
  return layer || typing
}

/* ---------- D-pad yön bulma ---------- */
type Dir = 'left' | 'right' | 'up' | 'down'
const DIRS: Record<string, Dir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="switch"]',
  '[role="tab"]',
  'summary',
].join(',')

const NATIVE_CLICK = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'])

function isTextField(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return !['button', 'submit', 'checkbox', 'radio', 'range', 'color', 'file'].includes(el.type)
  return (el as HTMLElement).isContentEditable
}

/** Açık pencere varsa yön bulma onun içinde kalır. */
function scope(): ParentNode {
  const dialogs = document.querySelectorAll('[role="dialog"]')
  return dialogs.length ? dialogs[dialogs.length - 1] : document
}

function candidates(): HTMLElement[] {
  const out: HTMLElement[] = []
  scope()
    .querySelectorAll<HTMLElement>(FOCUSABLE)
    .forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return
      if (el.closest('[inert],[aria-hidden="true"]')) return
      if (getComputedStyle(el).visibility === 'hidden') return
      out.push(el)
    })
  return out
}

function score(from: DOMRect, to: DOMRect, dir: Dir): number {
  // Yön ekseninde mesafe (ileri olmalı) + dik eksende kayma (ağır ceza)
  let main: number
  let gap: number
  let off: number
  if (dir === 'left' || dir === 'right') {
    if (dir === 'right' ? to.left + to.width / 2 <= from.left + from.width / 2 + 1 : to.left + to.width / 2 >= from.left + from.width / 2 - 1) return Infinity
    main = dir === 'right' ? to.left - from.right : from.left - to.right
    gap = Math.max(0, to.top - from.bottom, from.top - to.bottom)
    off = Math.abs(to.top + to.height / 2 - (from.top + from.height / 2))
  } else {
    if (dir === 'down' ? to.top + to.height / 2 <= from.top + from.height / 2 + 1 : to.top + to.height / 2 >= from.top + from.height / 2 - 1) return Infinity
    main = dir === 'down' ? to.top - from.bottom : from.top - to.bottom
    gap = Math.max(0, to.left - from.right, from.left - to.right)
    off = Math.abs(to.left + to.width / 2 - (from.left + from.width / 2))
  }
  return Math.max(0, main) + gap * 4 + off * 0.2
}

function focusEl(el: HTMLElement) {
  if (el.tabIndex < 0) el.tabIndex = 0 // role="button" div'ler
  el.focus({ preventScroll: true })
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function scrollableParent(el: Element | null): HTMLElement | null {
  for (let n = el?.parentElement; n; n = n.parentElement) {
    const s = getComputedStyle(n)
    if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return n
  }
  return document.querySelector<HTMLElement>('main')
}

function onKey(e: KeyboardEvent) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
  const active = document.activeElement as HTMLElement | null
  const hasFocus = !!active && active !== document.body && document.contains(active)

  // OK tuşu: native olmayan tıklanabilirler (role="button" div) için
  if (e.key === 'Enter' && hasFocus && !NATIVE_CLICK.has(active!.tagName)) {
    e.preventDefault()
    active!.click()
    return
  }

  const dir = DIRS[e.key]
  if (!dir) return
  // Yazı alanında sağ/sol imleci oynatır; select'te yukarı/aşağı seçenek değiştirmez (WebView açılır liste kullanır)
  if (hasFocus && isTextField(active!) && (dir === 'left' || dir === 'right')) return
  if (hasFocus && active!.matches('input[type="range"]') && (dir === 'left' || dir === 'right')) return

  const list = candidates()
  if (!list.length) return
  e.preventDefault()

  if (!hasFocus || !list.includes(active!)) {
    const auto = list.find((el) => el.hasAttribute('data-tv-autofocus'))
    focusEl(auto ?? list.reduce((a, b) => (score0(b) < score0(a) ? b : a)))
    return
  }

  const from = active!.getBoundingClientRect()
  let best: HTMLElement | null = null
  let bestScore = Infinity
  for (const el of list) {
    if (el === active) continue
    const s = score(from, el.getBoundingClientRect(), dir)
    if (s < bestScore) {
      bestScore = s
      best = el
    }
  }
  if (best) {
    focusEl(best)
  } else if (dir === 'up' || dir === 'down') {
    // Bu yönde odaklanacak bir şey yok: içeriği kaydır (uzun listeler / metin)
    scrollableParent(active)?.scrollBy({ top: (dir === 'down' ? 1 : -1) * window.innerHeight * 0.5 })
  }
}

/** Odak yokken ilk öğe: içerik alanının sol üstü (sol ray değil). */
function score0(el: HTMLElement): number {
  const r = el.getBoundingClientRect()
  const inMain = !!el.closest('main')
  return (inMain ? 0 : 100000) + r.top * 2 + r.left
}
