import React from 'react'
import { createPortal } from 'react-dom'
import type { Member } from '../types'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/* ---------------- Button ---------------- */
type Variant = 'primary' | 'soft' | 'ghost' | 'danger' | 'success' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-600 shadow-sm',
  soft: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-100',
  danger: 'bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-600',
  success: 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-600',
  dark: 'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-800',
}
const SIZES: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm gap-1.5',
  md: 'h-12 px-4 text-[15px] gap-2',
  lg: 'h-14 px-6 text-lg gap-2.5',
}

export function Btn(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size },
) {
  const { variant = 'primary', size = 'md', className, ...rest } = props
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors select-none touch-manipulation',
        'disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    />
  )
}

/* ---------------- Card ---------------- */
export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cx('rounded-2xl bg-white border border-slate-200/80 shadow-card', className)}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  title,
  action,
  className,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-center justify-between gap-3 mb-3', className)}>
      <h2 className="font-display text-lg font-normal tracking-wide text-slate-800">{title}</h2>
      {action}
    </div>
  )
}

/* ---------------- Glassmorphism kart ---------------- */
export function GlassCard({
  className,
  children,
  strong = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return (
    <div
      {...rest}
      className={cx(
        'rounded-2xl border shadow-[0_14px_40px_-24px_rgba(30,41,59,0.55)]',
        strong
          ? 'border-white/70 bg-white/50 backdrop-blur-2xl'
          : 'border-white/70 bg-white/55 backdrop-blur-2xl hover:bg-white/65',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ---------------- Form ---------------- */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

const INPUT =
  'w-full h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-[15px] text-slate-800 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 touch-manipulation'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} {...props} className={cx(INPUT, props.className)} />
  },
)

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(INPUT, 'h-auto py-2.5 min-h-[84px] resize-y leading-relaxed', props.className)}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(INPUT, 'appearance-none pr-8', props.className)} />
}

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  size?: Size
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg font-semibold transition-colors touch-manipulation px-3',
            size === 'lg' ? 'h-11 text-[15px]' : 'h-9 text-sm',
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Avatar / Chip ---------------- */
export function Avatar({
  member,
  size = 'md',
  className,
}: {
  member?: Member | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const s =
    size === 'sm' ? 'w-7 h-7 text-sm' : size === 'md' ? 'w-9 h-9 text-base' : size === 'lg' ? 'w-12 h-12 text-xl' : 'w-16 h-16 text-3xl'
  if (!member) {
    return <div className={cx(s, 'rounded-full bg-slate-200 grid place-items-center', className)}>?</div>
  }
  return (
    <div
      title={member.name}
      style={{ backgroundColor: member.color }}
      className={cx(s, 'rounded-full grid place-items-center shadow-sm select-none shrink-0 overflow-hidden', className)}
    >
      {member.photo ? (
        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span style={{ filter: 'saturate(1.1)' }}>{member.emoji}</span>
      )}
    </div>
  )
}

export function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ backgroundColor: color, width: size, height: size }}
    />
  )
}

export function Chip({
  children,
  tone = 'slate',
  className,
}: {
  children: React.ReactNode
  tone?: 'slate' | 'brand' | 'green' | 'amber' | 'rose'
  className?: string
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  sheet = true,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  sheet?: boolean
  /** Geniş pencere (haftalık programlar) */
  wide?: boolean
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const content = (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative bg-white/85 backdrop-blur-2xl w-full max-h-[92vh] overflow-y-auto animate-pop',
          'rounded-t-3xl sm:rounded-3xl shadow-kiosk',
          wide ? 'sm:max-w-4xl' : 'sm:max-w-lg',
        )}
      >
        <div className="sticky top-0 bg-white/90 backdrop-blur px-5 pt-5 pb-3 border-b border-white/60 z-10">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-xl text-slate-900">{title}</h3>
            <Btn variant="ghost" size="sm" onClick={onClose} aria-label="Kapat">
              ✕
            </Btn>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
        {footer && <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-white/60 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )

  // Portal: üstteki blur/transform kapsayıcılar fixed konumlandırmayı bozuyor
  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

/* ---------------- Empty ---------------- */
export function Empty({
  icon,
  text,
  action,
  compact = false,
}: {
  icon?: React.ReactNode
  text: string
  action?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center text-center gap-2 px-4',
        compact ? 'py-5' : 'py-10',
      )}
    >
      <div className={compact ? 'text-2xl opacity-50' : 'text-4xl opacity-60'}>{icon ?? '📭'}</div>
      <p className="text-slate-400 text-sm max-w-xs font-medium">{text}</p>
      {action}
    </div>
  )
}

/* ---------------- Üye seçim çipleri ---------------- */
export function MemberPicker({
  members,
  selected,
  onChange,
}: {
  members: Member[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const on = selected.includes(m.id)
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className={cx(
              'inline-flex items-center gap-2 h-11 px-3 rounded-xl border-2 font-semibold text-sm transition-all touch-manipulation',
              on ? 'border-transparent text-white shadow-sm' : 'border-slate-200 text-slate-600 bg-white',
            )}
            style={on ? { backgroundColor: m.color } : undefined}
          >
            <span>{m.emoji}</span>
            {m.name}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Reveal (animasyonlu giriş) ---------------- */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <div className={cx('anim-rise', className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative w-14 h-8 rounded-full transition-colors touch-manipulation shrink-0',
        checked ? 'bg-brand-500' : 'bg-slate-300',
      )}
    >
      <span
        className={cx(
          'absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-6',
        )}
      />
    </button>
  )
}
