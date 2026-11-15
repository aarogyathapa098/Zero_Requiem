// Runtime configuration for the shared Mars grid loader.
//
// Browser builds read the rasters over HTTP. The Vite dev server exposes them
// at `/mars-grid/` (see `frontend/marsGridServer.js`), and production builds
// copy the eight GeoTIFFs plus the legend into `dist/mars-grid/`.
//
// Node scripts and tests read the same files from disk. Override either side
// with:
//   VITE_MARS_GRID_BASE_URL=/mars-grid   (browser)
//   MARS_GRID_DATA_DIR=C:\path\to\output (Node)

import {
  GRID_LAYERS,
  LAYER_ORDER,
  LEGEND_FILE,
  QUALITY_REPORT_FILE,
} from './constants.js'

export const DEFAULT_GRID_BASE_URL = '/mars-grid'
export const DEFAULT_DATA_DIR_URL = new URL('../../modes/map/nasa-data/output/', import.meta.url)

/** Files required for a complete grid session. */
export const REQUIRED_GRID_FILES = Object.freeze([
  ...LAYER_ORDER.map(layerId => GRID_LAYERS[layerId].file),
  LEGEND_FILE,
])

/** Files offered by the dev/preview middleware and copied into builds. */
export const SERVED_GRID_FILES = Object.freeze([
  ...REQUIRED_GRID_FILES,
  QUALITY_REPORT_FILE,
])

/** Resolve the HTTP base URL used for remote grid reads. */
export function resolveGridBaseUrl(explicit) {
  const configured = explicit
    ?? import.meta.env?.VITE_MARS_GRID_BASE_URL
    ?? DEFAULT_GRID_BASE_URL
  return String(configured).replace(/\/+$/, '')
}

/** Build an absolute-or-root-relative URL for one grid file. */
export function gridFileUrl(file, baseUrl = resolveGridBaseUrl()) {
  return `${String(baseUrl).replace(/\/+$/, '')}/${encodeURIComponent(file)}`
}

/**
 * Resolve the directory that contains the eight rasters and legend on disk.
 * Only valid in Node. Throws a clear error if the directory does not exist.
 */
export async function resolveMarsGridDataDir(explicit) {
  const [{ resolve }, { fileURLToPath }, { stat }] = await Promise.all([
    import('node:path'),
    import('node:url'),
    import('node:fs/promises'),
  ])
  const configured = explicit
    ?? (typeof process !== 'undefined' ? process.env.MARS_GRID_DATA_DIR : undefined)
  const directory = configured
    ? resolve(String(configured))
    : fileURLToPath(DEFAULT_DATA_DIR_URL).replace(/[\\/]+$/, '')
  try {
    const info = await stat(directory)
    if (!info.isDirectory()) throw new Error('not a directory')
  } catch {
    throw new Error(
      `Mars grid data directory not found: "${directory}".\n`
      + 'Expected the eight GeoTIFFs and geology_legend.csv in that folder.\n'
      + 'Set MARS_GRID_DATA_DIR to the pipeline output folder, or copy the files there.\n'
      + 'The nasa-data folder is gitignored (see docs/MARS_GRID.md).',
    )
  }
  return directory
}

/** Human-readable message when one or more required grid files are absent. */
export function missingGridFilesMessage(directory, missingFiles) {
  return [
    `Mars grid data is incomplete in "${directory}".`,
    `Missing ${missingFiles.length === 1 ? 'file' : 'files'}: ${missingFiles.join(', ')}`,
    'Copy the eight GeoTIFFs and geology_legend.csv from the SOLBOUND pipeline output.',
    'Set MARS_GRID_DATA_DIR to override the folder (see docs/MARS_GRID.md).',
  ].join('\n')
}
