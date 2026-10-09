/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b1020',
          900: '#111731',
          800: '#1a2140',
          700: '#262e55',
        },
        // Marka rengi tema ile değişir (RGB değişkenleri — opacity çalışır)
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
        },
      },
      fontFamily: {
        // Gövde: Montserrat
        sans: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Başlıklar / ana ekran: Righteous
        display: ['Righteous', 'Montserrat', 'system-ui', 'sans-serif'],
        // Zarif el yazısı (kartpostal altyazısı)
        hand: ['Caveat', 'Segoe Script', 'Brush Script MT', 'cursive'],
      },
      boxShadow: {
        card: '0 6px 24px -12px rgba(15, 23, 42, 0.35)',
        kiosk: '0 18px 60px -30px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'pop': { '0%': { transform: 'scale(0.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgba(79,110,247,0.45)' }, '100%': { boxShadow: '0 0 0 18px rgba(79,110,247,0)' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out both',
        'pop': 'pop .18s ease-out both',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
}
