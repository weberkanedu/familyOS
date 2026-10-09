/** Ana ekran tema seçenekleri (renk şeması) */

export interface ThemeDef {
  id: string
  label: string
  /** Önizleme için 3 renk */
  swatch: [string, string, string]
  /** CSS RGB değerleri (Tailwind marka rengi + mesh arka plan) */
  css: Record<string, string>
}

export const THEMES: ThemeDef[] = [
  {
    id: 'classic',
    label: 'Klasik Mavi',
    swatch: ['#4f6ef7', '#93c5fd', '#fecdd3'],
    css: {
      '--brand-50': '238 244 255',
      '--brand-100': '219 230 255',
      '--brand-400': '109 141 255',
      '--brand-500': '79 110 247',
      '--brand-600': '59 86 224',
      '--bg-base': '#e9eeff',
      '--mesh-1': 'rgba(147, 197, 253, 0.85)',
      '--mesh-2': 'rgba(253, 205, 211, 0.8)',
      '--mesh-3': 'rgba(196, 181, 253, 0.75)',
      '--mesh-4': 'rgba(167, 243, 208, 0.65)',
    },
  },
  {
    id: 'ocean',
    label: 'Okyanus',
    swatch: ['#0ea5e9', '#5eead4', '#1e3a8a'],
    css: {
      '--brand-50': '236 254 255',
      '--brand-100': '207 250 254',
      '--brand-400': '38 198 218',
      '--brand-500': '14 165 233',
      '--brand-600': '2 132 199',
      '--bg-base': '#e6f7fb',
      '--mesh-1': 'rgba(125, 211, 252, 0.85)',
      '--mesh-2': 'rgba(94, 234, 212, 0.75)',
      '--mesh-3': 'rgba(59, 130, 246, 0.7)',
      '--mesh-4': 'rgba(186, 230, 253, 0.8)',
    },
  },
  {
    id: 'sunset',
    label: 'Gün Batımı',
    swatch: ['#f97316', '#fb7185', '#fcd34d'],
    css: {
      '--brand-50': '255 247 237',
      '--brand-100': '254 226 205',
      '--brand-400': '251 146 60',
      '--brand-500': '249 115 22',
      '--brand-600': '234 88 12',
      '--bg-base': '#fff4ec',
      '--mesh-1': 'rgba(253, 186, 116, 0.85)',
      '--mesh-2': 'rgba(251, 113, 133, 0.7)',
      '--mesh-3': 'rgba(252, 211, 77, 0.7)',
      '--mesh-4': 'rgba(254, 215, 170, 0.8)',
    },
  },
  {
    id: 'forest',
    label: 'Orman',
    swatch: ['#16a34a', '#84cc16', '#a7f3d0'],
    css: {
      '--brand-50': '240 253 244',
      '--brand-100': '220 252 231',
      '--brand-400': '74 222 128',
      '--brand-500': '22 163 74',
      '--brand-600': '21 128 61',
      '--bg-base': '#eefaf1',
      '--mesh-1': 'rgba(134, 239, 172, 0.8)',
      '--mesh-2': 'rgba(190, 242, 100, 0.65)',
      '--mesh-3': 'rgba(167, 243, 208, 0.85)',
      '--mesh-4': 'rgba(253, 224, 71, 0.5)',
    },
  },
  {
    id: 'grape',
    label: 'Üzüm',
    swatch: ['#9333ea', '#c084fc', '#f0abfc'],
    css: {
      '--brand-50': '250 245 255',
      '--brand-100': '243 232 255',
      '--brand-400': '192 132 252',
      '--brand-500': '147 51 234',
      '--brand-600': '126 34 206',
      '--bg-base': '#f7f0ff',
      '--mesh-1': 'rgba(216 180 254, 0.8)',
      '--mesh-2': 'rgba(240 171 252, 0.7)',
      '--mesh-3': 'rgba(199 210 254, 0.8)',
      '--mesh-4': 'rgba(251 207 232, 0.7)',
    },
  },
  {
    id: 'graphite',
    label: 'Grafit',
    swatch: ['#475569', '#94a3b8', '#cbd5e1'],
    css: {
      '--brand-50': '241 245 249',
      '--brand-100': '226 232 240',
      '--brand-400': '148 163 184',
      '--brand-500': '71 85 105',
      '--brand-600': '51 65 85',
      '--bg-base': '#eef1f5',
      '--mesh-1': 'rgba(203 213 225, 0.9)',
      '--mesh-2': 'rgba(226 232 240, 0.9)',
      '--mesh-3': 'rgba(214 219 228, 0.85)',
      '--mesh-4': 'rgba(241 245 249, 0.95)',
    },
  },
]

export const DEFAULT_THEME = 'classic'

export function themeById(id?: string | null): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
