// Shared loader and query API for the SOLBOUND Mars terrain & geology grid.
//
// The loader is deliberately read-only: it opens the eight GeoTIFFs produced by
// the protected pipeline, verifies that they share the elevation reference grid,
// parses the geology legend, and answers cell / window / coordinate queries.
// It never writes raster data and never changes the pipeline's classifications.

import { fromFile, fromUrl } from 'geotiff'
import {
  EXPECTED_GRID,
  GEOLOGY_UNMAPPED,
  GRID_LAYERS,
  LAYER_ORDER,
  LEGEND_FILE,
  REFERENCE_LAYER,
} from './constants.js'
import {
  cellCenterToWorld,
  containsCell as containsCellInGrid,
  containsLonLat as containsLonLatInGrid,
  containsWorld as containsWorldInGrid,
  gridBounds,
  gridBoundsArray,
  lonLatToWorld,
  pixelToWorld,
  worldToCell,
  worldToLonLat,
} from './coords.js'
import {
  gridFileUrl,
  missingGridFilesMessage,
  REQUIRED_GRID_FILES,
  resolveGridBaseUrl,
  resolveMarsGridDataDir,
} from './config.js'
import {
  MarsGridAlignmentError,
  MarsGridDataError,
  MarsGridError,
  MarsGridRangeError,
} from './errors.js'

const DEFAULT_BLOCK_SIZE = 32
const DEFAULT_BLOCK_CACHE_SIZE = 64
const TOLERANCE_METRES = 1e-3
const TOLERANCE_DEGREES = 1e-9

function describeSampleFormat(image) {
  const format = image.getSampleFormat(0)
  const bits = image.getBitsPerSample(0)
  if (format === 3) return bits === 64 ? 'float64' : bits === 32 ? 'float32' : `float${bits}`
  if (format === 2) return bits === 8 ? 'int8' : `int${bits}`
  if (format === 1) return bits === 8 ? 'uint8' : `uint${bits}`
  return `${format}:${bits}`
}

function parseDeclaredNoData(raw) {
  if (raw === undefined || raw === null) return null
  const text = String(raw).replace(/\0/g, '').trim()
  if (!text) return null
  if (/^nan$/i.test(text)) return Number.NaN
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

function sameNoData(left, right) {
  if (left === null || right === null) return left === right
  if (Number.isNaN(left) && Number.isNaN(right)) return true
  return Object.is(left, right)
}

function readLayerMetadata(image, spec) {
  const fileDirectory = image.getFileDirectory()
  const geoKeys = image.getGeoKeys() ?? {}
  const resolution = image.getResolution()
  const origin = image.getOrigin()
  const bounds = image.getBoundingBox()
  return {
    id: spec.id,
    file: spec.file,
    label: spec.label,
    units: spec.units,
    kind: spec.kind,
    width: image.getWidth(),
    height: image.getHeight(),
    dtype: describeSampleFormat(image),
    expectedDtype: spec.dtype,
    nodata: spec.nodata,
    declaredNoData: parseDeclaredNoData(fileDirectory.getValue?.('GDAL_NODATA')),
    samplesPerPixel: image.getSamplesPerPixel(),
    resolution: { x: resolution[0], y: resolution[1] },
    origin: { x: origin[0], y: origin[1] },
    transform: [resolution[0], 0, origin[0], 0, resolution[1], origin[1]],
    bounds: {
      west: bounds[0],
      south: bounds[1],
      east: bounds[2],
      north: bounds[3],
    },
    crs: {
      citation: geoKeys.GTCitationGeoKey ?? null,
      geographicCitation: geoKeys.GeogCitationGeoKey ?? null,
      standardParallelDegrees: geoKeys.ProjStdParallel1GeoKey ?? null,
      centralMeridianDegrees: geoKeys.ProjCenterLongGeoKey ?? null,
      semiMajorAxisMetres: geoKeys.GeogSemiMajorAxisGeoKey ?? null,
      semiMinorAxisMetres: geoKeys.GeogSemiMinorAxisGeoKey ?? null,
      projectedCSType: geoKeys.ProjectedCSTypeGeoKey ?? null,
      projectionCode: geoKeys.ProjCoordTransGeoKey ?? null,
    },
    geoKeys,
  }
}

function assertLayerMatchesExpected(metadata, spec) {
  const problems = []
  if (metadata.width !== EXPECTED_GRID.width) problems.push(`width ${metadata.width} != ${EXPECTED_GRID.width}`)
  if (metadata.height !== EXPECTED_GRID.height) problems.push(`height ${metadata.height} != ${EXPECTED_GRID.height}`)
  if (Math.abs(metadata.resolution.x - EXPECTED_GRID.resolution[0]) > TOLERANCE_METRES) {
    problems.push(`x resolution ${metadata.resolution.x} != ${EXPECTED_GRID.resolution[0]}`)
  }
  if (Math.abs(metadata.resolution.y - EXPECTED_GRID.resolution[1]) > TOLERANCE_METRES) {
    problems.push(`y resolution ${metadata.resolution.y} != ${EXPECTED_GRID.resolution[1]}`)
  }
  if (Math.abs(metadata.origin.x - EXPECTED_GRID.origin[0]) > TOLERANCE_METRES) {
    problems.push(`x origin ${metadata.origin.x} != ${EXPECTED_GRID.origin[0]}`)
  }
  if (Math.abs(metadata.origin.y - EXPECTED_GRID.origin[1]) > TOLERANCE_METRES) {
    problems.push(`y origin ${metadata.origin.y} != ${EXPECTED_GRID.origin[1]}`)
  }
  if (metadata.dtype !== spec.dtype) problems.push(`dtype ${metadata.dtype} != ${spec.dtype}`)
  if (metadata.crs.citation !== EXPECTED_GRID.crsCitation) {
    problems.push(`CRS citation "${metadata.crs.citation}" != "${EXPECTED_GRID.crsCitation}"`)
  }
  if (metadata.crs.standardParallelDegrees === null
    || Math.abs(metadata.crs.standardParallelDegrees - EXPECTED_GRID.standardParallelDegrees) > TOLERANCE_DEGREES) {
    problems.push(`standard parallel ${metadata.crs.standardParallelDegrees} != ${EXPECTED_GRID.standardParallelDegrees}`)
  }
  if (metadata.crs.semiMajorAxisMetres === null
    || Math.abs(metadata.crs.semiMajorAxisMetres - EXPECTED_GRID.marsRadiusMetres) > TOLERANCE_METRES) {
    problems.push(`semi-major axis ${metadata.crs.semiMajorAxisMetres} != ${EXPECTED_GRID.marsRadiusMetres}`)
  }
  if (metadata.samplesPerPixel !== 1) problems.push(`samples per pixel ${metadata.samplesPerPixel} != 1`)
  if (spec.nodata !== null && !sameNoData(metadata.declaredNoData, spec.nodata)) {
    problems.push(`declared NoData ${String(metadata.declaredNoData)} != ${String(spec.nodata)}`)
  }
  if (problems.length) {
    throw new MarsGridAlignmentError(
      `${spec.file} does not match the expected SOLBOUND grid: ${problems.join('; ')}.`,
    )
  }
}

function assertAligned(reference, metadata) {
  const problems = []
  if (metadata.width !== reference.width || metadata.height !== reference.height) {
    problems.push(`dimensions ${metadata.width}x${metadata.height} != ${reference.width}x${reference.height}`)
  }
  if (Math.abs(metadata.resolution.x - reference.resolution.x) > TOLERANCE_METRES) {
    problems.push(`x resolution ${metadata.resolution.x} != ${reference.resolution.x}`)
  }
  if (Math.abs(metadata.resolution.y - reference.resolution.y) > TOLERANCE_METRES) {
    problems.push(`y resolution ${metadata.resolution.y} != ${reference.resolution.y}`)
  }
  if (Math.abs(metadata.origin.x - reference.origin.x) > TOLERANCE_METRES) {
    problems.push(`x origin ${metadata.origin.x} != ${reference.origin.x}`)
  }
  if (Math.abs(metadata.origin.y - reference.origin.y) > TOLERANCE_METRES) {
    problems.push(`y origin ${metadata.origin.y} != ${reference.origin.y}`)
  }
  if (metadata.crs.citation !== reference.crs.citation) {
    problems.push(`CRS "${metadata.crs.citation}" != "${reference.crs.citation}"`)
  }
  if (metadata.crs.standardParallelDegrees !== reference.crs.standardParallelDegrees) {
    problems.push(`standard parallel ${metadata.crs.standardParallelDegrees} != ${reference.crs.standardParallelDegrees}`)
  }
  if (problems.length) {
    throw new MarsGridAlignmentError(
      `${metadata.file} is not pixel-aligned with ${reference.file}: ${problems.join('; ')}.`,
    )
  }
}

function normalizeLayerValues(layerId, values) {
  const spec = GRID_LAYERS[layerId]
  if (!spec.dtype.startsWith('float')) return values
  const output = values instanceof Float32Array ? values : new Float32Array(values)
  for (let index = 0; index < output.length; index++) {
    if (!Number.isFinite(output[index])) output[index] = Number.NaN
  }
  return output
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

function normalizeWindow(window, width, height, allowClamp = true) {
  if (!window || typeof window !== 'object') {
    throw new TypeError('A window must be an object like { row, col, width, height }.')
  }
  for (const key of ['row', 'col', 'width', 'height']) {
    if (!Number.isInteger(window[key])) throw new TypeError(`Window ${key} must be an integer.`)
  }
  if (window.width <= 0 || window.height <= 0) {
    throw new MarsGridRangeError('Window width and height must be greater than zero.')
  }
  if (!allowClamp && (window.col < 0 || window.row < 0
    || window.col + window.width > width || window.row + window.height > height)) {
    throw new MarsGridRangeError(
      `Window col=${window.col}, row=${window.row}, width=${window.width}, height=${window.height} `
      + `is outside the ${width}x${height} grid.`,
    )
  }
  if (window.col >= width || window.row >= height || window.col + window.width <= 0 || window.row + window.height <= 0) {
    throw new MarsGridRangeError(
      `Window col=${window.col}, row=${window.row}, width=${window.width}, height=${window.height} `
      + `does not intersect the ${width}x${height} grid.`,
    )
  }
  const col = clamp(window.col, 0, width - 1)
  const row = clamp(window.row, 0, height - 1)
  const right = clamp(window.col + window.width, col + 1, width)
  const bottom = clamp(window.row + window.height, row + 1, height)
  return { col, row, width: right - col, height: bottom - row }
}

/**
 * Parse RFC-4180-style CSV text. Quotes may contain commas and doubled quotes.
 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const source = String(text).replace(/^\uFEFF/, '')
  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index++
        } else {
          quoted = false
        }
      } else {
        field += character
      }
      continue
    }
    if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (character !== '\r') {
      field += character
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter(columns => columns.some(column => column.trim().length > 0))
}

/** Parse geology_legend.csv into stable, camel-cased entries. */
export function parseLegend(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new MarsGridDataError('geology_legend.csv does not contain a header and any class rows.')
  const header = rows[0].map(column => column.trim())
  return rows.slice(1).map((columns, rowIndex) => {
    const raw = Object.fromEntries(header.map((column, index) => [column, columns[index] ?? '']))
    const classId = Number(raw.class_id)
    if (!Number.isInteger(classId)) {
      throw new MarsGridDataError(`geology_legend.csv row ${rowIndex + 2} has an invalid class_id "${raw.class_id}".`)
    }
    return {
      classId,
      name: raw.preferred_name,
      symbol: raw.preferred_symbol,
      symbolNoSub: raw.preferred_symbol_noSub,
      colorId: raw.preferred_color_id === '' ? null : Number(raw.preferred_color_id),
      pixelCount: Number(raw.pixel_count),
      validDemPixelCount: Number(raw.pixel_count_valid_dem),
      navigablePixelCount: Number(raw.pixel_count_navigable),
      areaRasterM2: Number(raw.area_raster_m2),
      pctOfMappedGeology: Number(raw.pct_of_mapped_geology),
      pctOfValidDem: Number(raw.pct_of_valid_dem),
      conflictStatus: raw.conflict_status,
      conflictedOrigFids: raw.conflicted_ORIG_FIDs,
      resolutionNote: raw.resolution_note,
      sourceLayer: raw.source_layer,
      raw,
    }
  })
}

async function openTiffFile(file, { mode, dataDir, baseUrl }) {
  if (mode === 'filesystem') {
    const { join } = await import('node:path')
    return fromFile(join(dataDir, file))
  }
  const url = gridFileUrl(file, baseUrl)
  try {
    return await fromUrl(url)
  } catch (error) {
    throw new MarsGridDataError(
      `Could not open ${file} from ${url}. `
      + 'Check that the Vite /mars-grid/ middleware is running and the file exists.',
      { cause: error },
    )
  }
}

async function readLegendText({ mode, dataDir, baseUrl }) {
  if (mode === 'filesystem') {
    const [{ readFile }, { join }] = await Promise.all([
      import('node:fs/promises'),
      import('node:path'),
    ])
    return readFile(join(dataDir, LEGEND_FILE), 'utf8')
  }
  const url = gridFileUrl(LEGEND_FILE, baseUrl)
  const response = await fetch(url)
  if (!response.ok) {
    throw new MarsGridDataError(
      `Could not load ${LEGEND_FILE} from ${url} (HTTP ${response.status}). `
      + 'Check that the Vite /mars-grid/ middleware is running and the file exists.',
    )
  }
  return response.text()
}

async function assertRequiredFiles(dataDir) {
  const [{ access }, { constants }, { join }] = await Promise.all([
    import('node:fs/promises'),
    import('node:fs'),
    import('node:path'),
  ])
  const missing = []
  for (const file of REQUIRED_GRID_FILES) {
    try {
      await access(join(dataDir, file), constants.R_OK)
    } catch {
      missing.push(file)
    }
  }
  if (missing.length) throw new MarsGridDataError(missingGridFilesMessage(dataDir, missing))
}

async function closeTiffs(images) {
  await Promise.all(Object.values(images).map(async ({ tiff }) => {
    try {
      await tiff.close?.()
    } catch {
      // Closing is best-effort; a failed close must not hide a load error.
    }
  }))
}

export class MarsGrid {
  constructor({ images, layers, legend, mode, dataDir, baseUrl, options }) {
    this._images = images
    this._closed = false
    this._legend = legend
    this._legendByClass = new Map(legend.map(entry => [entry.classId, entry]))
    this._blockCache = new Map()
    this._blockSize = options.cellBlockSize ?? DEFAULT_BLOCK_SIZE
    this._blockCacheSize = options.cellBlockCacheSize ?? DEFAULT_BLOCK_CACHE_SIZE
    if (!Number.isInteger(this._blockSize) || this._blockSize <= 0) {
      throw new TypeError('cellBlockSize must be a positive integer.')
    }
    this.layers = layers
    this.legend = legend
    this.mode = mode
    this.dataDir = dataDir ?? null
    this.baseUrl = baseUrl ?? null
    this.width = layers[REFERENCE_LAYER].width
    this.height = layers[REFERENCE_LAYER].height
    this.transform = layers[REFERENCE_LAYER].transform
    this.resolution = layers[REFERENCE_LAYER].resolution
    this.bounds = layers[REFERENCE_LAYER].bounds
    this.crs = layers[REFERENCE_LAYER].crs
    this.totalCells = this.width * this.height
    this.gridBounds = gridBounds(this.transform, this.width, this.height)
    this.boundsArray = gridBoundsArray(this.transform, this.width, this.height)
    this.metadata = {
      width: this.width,
      height: this.height,
      totalCells: this.totalCells,
      resolution: this.resolution,
      transform: this.transform,
      bounds: this.bounds,
      crs: this.crs,
      layerOrder: LAYER_ORDER,
      layers: this.layers,
      legendFile: LEGEND_FILE,
      dataDir: this.dataDir,
      baseUrl: this.baseUrl,
      mode: this.mode,
    }
  }

  static async open(options = {}) {
    const mode = options.source
      ?? (options.dataDir ? 'filesystem'
        : (typeof window !== 'undefined' && typeof document !== 'undefined' ? 'url' : 'filesystem'))
    if (mode !== 'filesystem' && mode !== 'url') {
      throw new TypeError(`Unsupported Mars grid source "${mode}". Use "filesystem" or "url".`)
    }
    const dataDir = mode === 'filesystem' ? await resolveMarsGridDataDir(options.dataDir) : null
    const baseUrl = mode === 'url' ? resolveGridBaseUrl(options.baseUrl) : null
    if (mode === 'filesystem') await assertRequiredFiles(dataDir)

    const images = {}
    try {
      for (const layerId of LAYER_ORDER) {
        const spec = GRID_LAYERS[layerId]
        const tiff = await openTiffFile(spec.file, { mode, dataDir, baseUrl })
        let image
        try {
          image = await tiff.getImage()
        } catch (error) {
          await tiff.close?.()
          throw new MarsGridDataError(
            `Could not read the GeoTIFF directory of ${spec.file}.`,
            { cause: error },
          )
        }
        images[layerId] = { tiff, image, metadata: readLayerMetadata(image, spec) }
      }

      const strict = options.strict !== false
      const layers = Object.fromEntries(LAYER_ORDER.map(layerId => [layerId, images[layerId].metadata]))
      if (strict) {
        for (const layerId of LAYER_ORDER) {
          assertLayerMatchesExpected(layers[layerId], GRID_LAYERS[layerId])
        }
      }
      const reference = layers[REFERENCE_LAYER]
      for (const layerId of LAYER_ORDER) {
        if (layerId !== REFERENCE_LAYER) assertAligned(reference, layers[layerId])
      }

      let legendText
      try {
        legendText = await readLegendText({ mode, dataDir, baseUrl })
      } catch (error) {
        if (error instanceof MarsGridError) throw error
        throw new MarsGridDataError(
          `Could not read ${LEGEND_FILE}. Check that it exists beside the rasters.`,
          { cause: error },
        )
      }
      const legend = parseLegend(legendText)
      if (!legend.length) throw new MarsGridDataError(`${LEGEND_FILE} contains no geology classes.`)

      return new MarsGrid({ images, layers, legend, mode, dataDir, baseUrl, options })
    } catch (error) {
      await closeTiffs(images)
      throw error
    }
  }

  get isOpen() {
    return !this._closed
  }

  _assertOpen() {
    if (this._closed) throw new MarsGridError('This MarsGrid instance has been closed.')
  }

  getLayer(layerId) {
    this._assertOpen()
    const layer = this.layers[layerId]
    if (!layer) {
      throw new MarsGridError(`Unknown grid layer "${layerId}". Expected one of: ${LAYER_ORDER.join(', ')}.`)
    }
    return layer
  }

  isNoData(layerId, value) {
    const layer = this.getLayer(layerId)
    if (layer.nodata === null) return false
    if (typeof layer.nodata === 'number' && Number.isNaN(layer.nodata)) return !Number.isFinite(value)
    return Object.is(value, layer.nodata)
  }

  containsCell(row, col) {
    return containsCellInGrid(row, col, this.width, this.height)
  }

  containsWorld(x, y) {
    return containsWorldInGrid(x, y, this.transform, this.width, this.height)
  }

  containsLonLat(lon, lat) {
    return containsLonLatInGrid(lon, lat, {
      width: this.width,
      height: this.height,
      transform: this.transform,
    })
  }

  async readWindow(layerId, window, { clamp = true } = {}) {
    this._assertOpen()
    const layer = this.getLayer(layerId)
    const actual = normalizeWindow(window, this.width, this.height, clamp)
    const result = await this._images[layerId].image.readRasters({
      window: [actual.col, actual.row, actual.col + actual.width, actual.row + actual.height],
      samples: [0],
    })
    return {
      layerId,
      ...actual,
      dtype: layer.dtype,
      values: normalizeLayerValues(layerId, result[0]),
    }
  }

  async readFull(layerId) {
    return this.readWindow(layerId, { row: 0, col: 0, width: this.width, height: this.height })
  }

  async readWindowAll(window, options) {
    const results = await Promise.all(LAYER_ORDER.map(layerId => this.readWindow(layerId, window, options)))
    const first = results[0]
    return {
      col: first.col,
      row: first.row,
      width: first.width,
      height: first.height,
      values: Object.fromEntries(results.map(result => [result.layerId, result.values])),
    }
  }

  _buildCell(row, col, values) {
    const center = cellCenterToWorld(row, col, this.transform)
    const lonLat = worldToLonLat(center.x, center.y, {
      radius: this.crs.semiMajorAxisMetres ?? undefined,
      standardParallelDegrees: this.crs.standardParallelDegrees ?? undefined,
    })
    return {
      row,
      col,
      values,
      flags: {
        demValid: values.validMask === 1,
        navigable: values.navigationValid === 1,
        geologyMapped: values.geologyId !== GEOLOGY_UNMAPPED,
        geologyCovered: values.geologyCoverage === 1,
        hasElevation: Number.isFinite(values.elevation),
      },
      geology: values.geologyId === GEOLOGY_UNMAPPED ? null : this.getLegendEntry(values.geologyId),
      center,
      lonLat,
    }
  }

  async readCell(row, col) {
    this._assertOpen()
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      throw new TypeError('Cell row and column must be integers.')
    }
    if (!this.containsCell(row, col)) {
      throw new MarsGridRangeError(
        `Cell (row ${row}, col ${col}) is outside the ${this.height}x${this.width} grid; `
        + `valid rows are 0..${this.height - 1} and columns 0..${this.width - 1}.`,
      )
    }
    const window = await this.readWindowAll({ row, col, width: 1, height: 1 }, { clamp: false })
    const values = Object.fromEntries(LAYER_ORDER.map(layerId => [layerId, window.values[layerId][0]]))
    return this._buildCell(row, col, values)
  }

  async _getCellBlock(row, col) {
    const blockRow = Math.floor(row / this._blockSize)
    const blockCol = Math.floor(col / this._blockSize)
    const key = `${blockRow}:${blockCol}`
    const cached = this._blockCache.get(key)
    if (cached) {
      this._blockCache.delete(key)
      this._blockCache.set(key, cached)
      return cached
    }
    const startRow = blockRow * this._blockSize
    const startCol = blockCol * this._blockSize
    const window = await this.readWindowAll({
      row: startRow,
      col: startCol,
      width: Math.min(this._blockSize, this.width - startCol),
      height: Math.min(this._blockSize, this.height - startRow),
    })
    const block = window
    this._blockCache.set(key, block)
    if (this._blockCache.size > this._blockCacheSize) {
      this._blockCache.delete(this._blockCache.keys().next().value)
    }
    return block
  }

  /**
   * Return all eight layer values for a cell. Out-of-grid cells produce
   * `{ inGrid: false }` instead of throwing, which suits cursor readouts.
   */
  async queryCell(row, col) {
    this._assertOpen()
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      throw new TypeError('Cell row and column must be integers.')
    }
    const center = cellCenterToWorld(row, col, this.transform)
    const lonLat = worldToLonLat(center.x, center.y, {
      radius: this.crs.semiMajorAxisMetres ?? undefined,
      standardParallelDegrees: this.crs.standardParallelDegrees ?? undefined,
    })
    if (!this.containsCell(row, col)) {
      return { inGrid: false, row, col, values: null, flags: null, geology: null, center, lonLat }
    }
    const block = await this._getCellBlock(row, col)
    const index = (row - block.row) * block.width + (col - block.col)
    const values = Object.fromEntries(LAYER_ORDER.map(layerId => [layerId, block.values[layerId][index]]))
    return { inGrid: true, ...this._buildCell(row, col, values) }
  }

  /** Query the cell containing a projected world point. */
  async queryWorld(x, y) {
    const cell = worldToCell(x, y, this.transform)
    const result = await this.queryCell(cell.row, cell.col)
    return {
      ...result,
      world: { x, y },
      pixel: cell.pixel,
      inGrid: result.inGrid && this.containsWorld(x, y),
    }
  }

  /** Query the cell containing a planetocentric lon/lat point. */
  async queryLonLat(lon, lat) {
    const world = lonLatToWorld(lon, lat, {
      radius: this.crs.semiMajorAxisMetres ?? undefined,
      standardParallelDegrees: this.crs.standardParallelDegrees ?? undefined,
    })
    const result = await this.queryWorld(world.x, world.y)
    return { ...result, lon, lat }
  }

  getLegendEntry(classId) {
    return this._legendByClass.get(classId) ?? null
  }

  getLegendClasses() {
    return [...this._legend]
  }

  /** World position of a cell centre; handy for pathfinding debug overlays. */
  cellCenter(row, col) {
    return cellCenterToWorld(row, col, this.transform)
  }

  /** World position of a continuous pixel coordinate. */
  pixelToWorld(col, row) {
    return pixelToWorld(col, row, this.transform)
  }

  async close() {
    if (this._closed) return
    this._closed = true
    this._blockCache.clear()
    const images = this._images
    this._images = {}
    await closeTiffs(images)
  }
}

/** Open the shared Mars grid. Uses the filesystem in Node and URLs in browsers. */
export async function openMarsGrid(options = {}) {
  return MarsGrid.open(options)
}

/** Open the grid from an explicit Node directory (tests, CLI tools). */
export async function openMarsGridFromDirectory(dataDir, options = {}) {
  return MarsGrid.open({ ...options, source: 'filesystem', dataDir })
}

/** Open the grid from an explicit HTTP base URL (browser). */
export async function openMarsGridFromUrl(baseUrl, options = {}) {
  return MarsGrid.open({ ...options, source: 'url', baseUrl })
}
