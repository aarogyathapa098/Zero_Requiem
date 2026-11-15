import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Connect, Plugin } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
// @ts-expect-error - JS helper for dev proxying NASA Mars tiles
import { serveMarsTile } from './marsTileProxy.js'
// @ts-expect-error - JS helper for the local SOLBOUND Mars grid
import { serveMarsGrid } from './marsGridServer.js'

const gridDataDirectory = fileURLToPath(new URL('./src/modes/map/nasa-data/output/', import.meta.url))
const hasGridData = existsSync(gridDataDirectory)

const gridMiddleware = (): Connect.NextHandleFunction => (request, response, next) => {
  serveMarsGrid(request, response)
    .then((served: boolean) => { if (!served) next() })
    .catch((error: Error) => {
      if (!response.headersSent) {
        response.statusCode = 500
        response.end(`Mars grid server error: ${error.message}`)
      }
    })
}

const marsGridPlugin: Plugin = {
  name: 'mars-grid-server',
  configureServer(server) {
    server.middlewares.use(gridMiddleware())
  },
  configurePreviewServer(server) {
    server.middlewares.use(gridMiddleware())
  },
}

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
    marsGridPlugin,
    viteStaticCopy({ targets: [
      { src: 'node_modules/cesium/Build/Cesium/Workers', dest: 'cesiumStatic', rename: { stripBase: 4 } },
      { src: 'node_modules/cesium/Build/Cesium/ThirdParty', dest: 'cesiumStatic', rename: { stripBase: 4 } },
      { src: 'node_modules/cesium/Build/Cesium/Assets', dest: 'cesiumStatic', rename: { stripBase: 4 } },
      { src: 'node_modules/cesium/Build/Cesium/Widgets', dest: 'cesiumStatic', rename: { stripBase: 4 } },
      // The raster folder is gitignored and optional for clean clones. When the
      // pipeline output is present, copy the eight GeoTIFFs and legend for
      // static hosting. The dev/preview middleware streams them instead.
      ...(hasGridData ? [
        { src: 'src/modes/map/nasa-data/output/*.tif', dest: 'mars-grid', rename: { stripBase: 5 } },
        { src: 'src/modes/map/nasa-data/output/geology_legend.csv', dest: 'mars-grid', rename: { stripBase: 5 } },
        { src: 'src/modes/map/nasa-data/output/geology_quality_report.json', dest: 'mars-grid', rename: { stripBase: 5 } },
      ] : []),
    ] }),
  ],
  define: { CESIUM_BASE_URL: JSON.stringify('/cesiumStatic') },
})
