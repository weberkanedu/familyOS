import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    // Eski Android tabletler (düşük Chrome/WebView sürümleri) için ES5 çıktısı + polyfill
    legacy({
      // Eski Android tablet / Chrome sürümleri için hedefler
      targets: ['android >= 5', 'chrome >= 60', 'ios >= 10', 'safari >= 11', 'firefox >= 60', 'edge >= 15'],
      renderLegacyChunks: true,
    }),
  ],
  server: {
    host: true, // LAN üzerinden tabletten erişim için
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
})
