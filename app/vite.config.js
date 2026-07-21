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
      injectRegister: 'auto',
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
