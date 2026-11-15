// Dev/preview middleware that exposes the SOLBOUND Mars grid at /mars-grid/.
//
// geotiff.js reads only the byte ranges it needs, so this handler implements
// HTTP Range requests. The eight GeoTIFFs are large (up to ~80 MB each); files
// are streamed from disk rather than buffered. Only the known grid deliverables
// are served, and all paths are resolved inside the configured data directory.

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import {
  LEGEND_FILE,
  QUALITY_REPORT_FILE,
  GRID_LAYERS,
  LAYER_ORDER,
} from './src/shared/marsGrid/constants.js'
import { resolveMarsGridDataDir } from './src/shared/marsGrid/config.js'

const CONTENT_TYPES = Object.freeze({
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
})

const GRID_FILES = new Set([
  ...LAYER_ORDER.map(layerId => GRID_LAYERS[layerId].file),
  LEGEND_FILE,
  QUALITY_REPORT_FILE,
])

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  response.end(body)
}

function parseRange(header, size) {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === '' && match[2] === '')) return { unsatisfiable: true }
  let start
  let end
  if (match[1] === '') {
    const suffixLength = Number(match[2])
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return { unsatisfiable: true }
    start = Math.max(0, size - suffixLength)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] === '' ? size - 1 : Number(match[2])
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return { unsatisfiable: true }
  }
  return { start, end: Math.min(end, size - 1) }
}

/**
 * Serve one /mars-grid/ request.
 * @returns {Promise<boolean>} true when the request was handled.
 */
export async function serveMarsGrid(request, response) {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  } catch {
    return false
  }
  if (pathname !== '/mars-grid' && !pathname.startsWith('/mars-grid/')) return false

  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Method not allowed')
    return true
  }

  if (pathname === '/mars-grid' || pathname === '/mars-grid/') {
    sendJson(response, 200, {
      baseUrl: '/mars-grid/',
      files: [...GRID_FILES],
      note: 'Read-only SOLBOUND Mars grid. Supports HTTP Range requests for GeoTIFF reads.',
    })
    return true
  }

  const file = pathname.slice('/mars-grid/'.length)
  if (!file || file.includes('/') || file.includes('\\') || !GRID_FILES.has(file)) {
    sendJson(response, 404, {
      error: 'Unknown Mars grid file.',
      file,
      available: [...GRID_FILES],
    })
    return true
  }

  let dataDir
  try {
    dataDir = await resolveMarsGridDataDir()
  } catch (error) {
    sendJson(response, 404, {
      error: 'Mars grid data is not available on this machine.',
      detail: error.message,
      hint: 'Set MARS_GRID_DATA_DIR to the pipeline output directory.',
    })
    return true
  }

  const absolute = resolve(dataDir, file)
  if (!absolute.startsWith(resolve(dataDir) + sep)) {
    sendJson(response, 403, { error: 'Refusing to serve a file outside the grid directory.' })
    return true
  }

  let info
  try {
    info = await stat(absolute)
  } catch {
    sendJson(response, 404, {
      error: 'Mars grid file is missing.',
      file,
      directory: dataDir,
      hint: 'Restore the file or set MARS_GRID_DATA_DIR.',
    })
    return true
  }
  if (!info.isFile()) {
    sendJson(response, 404, { error: 'Mars grid path is not a file.', file })
    return true
  }

  const headers = {
    'Content-Type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  }
  const range = parseRange(request.headers.range, info.size)
  if (range?.unsatisfiable) {
    response.writeHead(416, {
      ...headers,
      'Content-Range': `bytes */${info.size}`,
      'Content-Length': 0,
    })
    response.end()
    return true
  }

  if (range) {
    const length = range.end - range.start + 1
    response.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${range.start}-${range.end}/${info.size}`,
      'Content-Length': length,
    })
    if (request.method === 'HEAD') {
      response.end()
    } else {
      createReadStream(absolute, { start: range.start, end: range.end }).pipe(response)
    }
    return true
  }

  response.writeHead(200, { ...headers, 'Content-Length': info.size })
  if (request.method === 'HEAD') {
    response.end()
  } else {
    createReadStream(absolute).pipe(response)
  }
  return true
}
