import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // 'auto' inyectaba su propio <script src="/registerSW.js"> en index.html, duplicando el
      // registro manual de main.jsx — y ninguno de los dos recargaba la página cuando activaba
      // una versión nueva del service worker (ver main.jsx). false = un solo registro, con
      // control real de actualización.
      injectRegister: false,
      manifest: false, // manifest.webmanifest is hand-written in /public (needs fields SW injection doesn't cover well)
      devOptions: { enabled: true, type: 'module' },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}']
      }
    })
  ],
  server: {
    port: 5173
  }
})
