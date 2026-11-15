import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
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
    viteStaticCopy({ targets: [
      { src: 'node_modules/cesium/Build/Cesium/Workers', dest: 'cesiumStatic', rename: { stripBase: 4 } },
      { src: 'node_modules/cesium/Build/Cesium/ThirdParty', dest: 'cesiumStatic', rename: { stripBase: 4 } },
      { src: 'node_modules/cesium/Build/Cesium/Assets', dest: 'cesiumStatic', rename: { stripBase: 4 } },
      { src: 'node_modules/cesium/Build/Cesium/Widgets', dest: 'cesiumStatic', rename: { stripBase: 4 } },
    ] }),
  ],
  define: { CESIUM_BASE_URL: JSON.stringify('/cesiumStatic') },
})
