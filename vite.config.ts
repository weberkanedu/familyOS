import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    // Evdeki tabletler Chrome 95+ (Android 5/6'da son sürüm) → modern ES modülleri yeterli.
    // Ayrı ES5 kopyası üretilmez (daha küçük derleme, satır içi script yok → sıkı CSP);
    // eksik yeni API'ler kullanılıyorsa otomatik polyfill eklenir.
    legacy({
      renderLegacyChunks: false,
      modernPolyfills: true,
      modernTargets: ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14'],
    }),
  ],
  server: {
    host: true, // LAN üzerinden tabletten erişim için
    port: 5173,
    // npm run dev:sync çalışıyorsa senkron aynı adresten (/sync) erişilebilir
    proxy: {
      '/sync': { target: 'ws://127.0.0.1:8787', ws: true },
      '/push': { target: 'http://127.0.0.1:8787' },
    },
  },
  build: {
    target: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  },
})
