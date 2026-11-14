import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// @ts-expect-error - JS helper for dev proxying NASA Mars tiles
import { serveMarsTile } from './marsTileProxy.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mars-tile-proxy',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (!await serveMarsTile(request, response)) next()
        })
      },
    },
  ],
})
