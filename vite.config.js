import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // use existing public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            // Cache city JSON data (stale-while-revalidate)
            urlPattern: /\/data\/cities\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'city-data',
              expiration: { maxEntries: 30, maxAgeSeconds: 86400 },
            },
          },
          {
            // Cache OpenStreetMap tiles
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 604800 },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
