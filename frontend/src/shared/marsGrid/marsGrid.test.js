import test, { after, before, describe } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  EXPECTED_GRID,
  MarsGridRangeError,
  PIPELINE_BASELINE,
  cellToLonLat,
  gridBounds,
  lonLatToCell,
  lonLatToWorld,
  openMarsGridFromDirectory,
  validateMarsGrid,
  worldToLonLat,
} from './index.js'

const DATA_DIR = fileURLToPath(new URL('../../modes/map/nasa-data/output/', import.meta.url))
const QUALITY_REPORT_PATH = fileURLToPath(new URL('../../modes/map/nasa-data/output/geology_quality_report.json', import.meta.url))
const HAS_DATA = existsSync(DATA_DIR)
const SKIP = HAS_DATA
  ? false
  : `Mars grid data not found in ${DATA_DIR}. Set MARS_GRID_DATA_DIR or copy the pipeline output there.`

describe('MarsGrid shared loader', { skip: SKIP }, () => {
  let grid
  let qualityReport

  before(async () => {
    grid = await openMarsGridFromDirectory(DATA_DIR)
    qualityReport = JSON.parse(await readFile(QUALITY_REPORT_PATH, 'utf8'))
  })

  after(async () => {
    await grid?.close()
  })

  test('reports the authoritative grid metadata', () => {
    assert.equal(grid.width, 4456)
    assert.equal(grid.height, 5067)
    assert.equal(grid.totalCells, 22578552)
    assert.equal(grid.resolution.x, 20)
    assert.equal(grid.resolution.y, -20)
    assert.equal(grid.crs.citation, 'Jezero_Crater_Projection')
    assert.equal(grid.crs.standardParallelDegrees, 18.4663)
    assert.equal(grid.crs.semiMajorAxisMetres, 3396190)
    const bounds = grid.boundsArray
    const expectedBounds = [4329000, 1042080, 4418120, 1143420]
    bounds.forEach((value, index) => {
      assert.ok(Math.abs(value - expectedBounds[index]) < 1e-6, `bound ${index}: ${value}`)
    })
    assert.equal(grid.getLegendClasses().length, 14)
  })

  test('every layer is pixel-aligned with elevation_m.tif', () => {
    const reference = grid.layers.elevation
    for (const layer of Object.values(grid.layers)) {
      assert.equal(layer.width, reference.width, layer.file)
      assert.equal(layer.height, reference.height, layer.file)
      assert.equal(layer.resolution.x, reference.resolution.x, layer.file)
      assert.equal(layer.resolution.y, reference.resolution.y, layer.file)
      assert.equal(layer.origin.x, reference.origin.x, layer.file)
      assert.equal(layer.origin.y, reference.origin.y, layer.file)
      assert.equal(layer.crs.citation, reference.crs.citation, layer.file)
    }
    assert.equal(grid.layers.elevation.dtype, 'float32')
    assert.equal(grid.layers.slope.dtype, 'float32')
    assert.equal(grid.layers.roughness.dtype, 'float32')
    assert.equal(grid.layers.movementCost.dtype, 'float32')
    assert.equal(grid.layers.validMask.dtype, 'uint8')
    assert.equal(grid.layers.navigationValid.dtype, 'uint8')
    assert.equal(grid.layers.geologyId.dtype, 'int16')
    assert.equal(grid.layers.geologyCoverage.dtype, 'uint8')
  })

  test('world, pixel, cell and lon/lat conversions round trip', () => {
    const bounds = gridBounds()
    assert.deepEqual(bounds, grid.gridBounds)
    const northWest = worldToLonLat(bounds.west, bounds.north)
    const southEast = worldToLonLat(bounds.east, bounds.south)
    assert.ok(Math.abs(northWest.lon - 76.997437) < 1e-5)
    assert.ok(Math.abs(northWest.lat - 19.290187) < 1e-5)
    assert.ok(Math.abs(southEast.lon - 78.582563) < 1e-5)
    assert.ok(Math.abs(southEast.lat - 17.58052) < 1e-5)

    const landing = { lon: 77.45088572, lat: 18.44462715 }
    const cell = lonLatToCell(landing.lon, landing.lat)
    assert.deepEqual([cell.row, cell.col], [2506, 1274])
    const roundTrip = cellToLonLat(cell.row, cell.col)
    assert.ok(Math.abs(roundTrip.lon - landing.lon) < 3e-4)
    assert.ok(Math.abs(roundTrip.lat - landing.lat) < 3e-4)

    const world = lonLatToWorld(landing.lon, landing.lat)
    const back = worldToLonLat(world.x, world.y)
    assert.ok(Math.abs(back.lon - landing.lon) < 1e-12)
    assert.ok(Math.abs(back.lat - landing.lat) < 1e-12)

    for (const [row, col] of [[0, 0], [2348, 1141], [5066, 4455]]) {
      const centre = grid.cellCenter(row, col)
      assert.deepEqual(grid.pixelToWorld(col + 0.5, row + 0.5), centre)
      assert.ok(grid.containsWorld(centre.x, centre.y))
    }
  })

  test('class 0 is valid mapped geology, not NoData', async () => {
    const cell = await grid.readCell(2348, 1141)
    assert.equal(cell.values.geologyId, 0)
    assert.equal(cell.values.geologyCoverage, 1)
    assert.equal(cell.values.validMask, 1)
    assert.equal(cell.values.navigationValid, 1)
    assert.equal(cell.flags.geologyMapped, true)
    assert.equal(grid.isNoData('geologyId', 0), false)
    assert.ok(Math.abs(cell.values.elevation - (-2440.9055)) < 1e-3)
    assert.ok(Number.isFinite(cell.values.slope))
    assert.ok(Number.isFinite(cell.values.roughness))
    assert.equal(cell.geology?.name, 'Jezero fan 2 unit')
    assert.equal(cell.geology?.symbol, 'NHjf2')
  })

  test('ORIG_FID=112 sample is class 5 Nili Planum 2 unit', async () => {
    const cell = await grid.readCell(4445, 721)
    assert.equal(cell.values.geologyId, 5)
    assert.equal(cell.values.geologyCoverage, 1)
    assert.equal(cell.geology?.name, 'Nili Planum 2 unit')
    assert.equal(cell.geology?.symbol, 'Nnp2')
    assert.equal(cell.geology?.conflictStatus, 'RESOLVED_BY_PROJECT_DECISION')
    assert.match(cell.geology?.resolutionNote ?? '', /ORIG_FID=112/)
    assert.match(cell.geology?.conflictedOrigFids ?? '', /112/)
  })

  test('valid DEM, navigable mask and geology coverage stay distinct', async () => {
    const validUnmapped = await grid.readCell(3000, 3000)
    assert.equal(validUnmapped.values.validMask, 1)
    assert.equal(validUnmapped.values.navigationValid, 1)
    assert.equal(validUnmapped.values.geologyId, -1)
    assert.equal(validUnmapped.values.geologyCoverage, 0)
    assert.equal(validUnmapped.flags.geologyMapped, false)
    assert.equal(validUnmapped.geology, null)

    const validNotNavigable = await grid.readCell(1, 0)
    assert.equal(validNotNavigable.values.validMask, 1)
    assert.equal(validNotNavigable.values.navigationValid, 0)
    assert.equal(validNotNavigable.values.geologyCoverage, 0)
    assert.equal(validNotNavigable.flags.demValid, true)
    assert.equal(validNotNavigable.flags.navigable, false)
  })

  test('invalid DEM cells preserve NaN and zero masks', async () => {
    const cell = await grid.readCell(0, 0)
    assert.ok(Number.isNaN(cell.values.elevation))
    assert.ok(Number.isNaN(cell.values.slope))
    assert.ok(Number.isNaN(cell.values.roughness))
    assert.ok(Number.isNaN(cell.values.movementCost))
    assert.equal(cell.values.validMask, 0)
    assert.equal(cell.values.navigationValid, 0)
    assert.equal(cell.values.geologyId, -1)
    assert.equal(cell.values.geologyCoverage, 0)
    assert.equal(cell.flags.hasElevation, false)
    assert.equal(grid.isNoData('elevation', cell.values.elevation), true)
    assert.equal(grid.isNoData('geologyId', -1), true)
    assert.equal(grid.isNoData('geologyCoverage', 0), false)
  })

  test('windows are row-major, clipped at edges, and reject fully outside ranges', async () => {
    const window = await grid.readWindow('geologyId', { row: 2348, col: 1141, width: 2, height: 2 })
    assert.equal(window.width, 2)
    assert.equal(window.height, 2)
    assert.equal(window.values.length, 4)
    assert.equal(window.values[0], 0)
    assert.equal(window.values[1], 0)
    assert.equal(window.values[2], 0)
    assert.equal(window.values[3], 0)

    const clipped = await grid.readWindow('validMask', { row: 5066, col: 4455, width: 20, height: 20 })
    assert.equal(clipped.row, 5066)
    assert.equal(clipped.col, 4455)
    assert.equal(clipped.width, 1)
    assert.equal(clipped.height, 1)

    await assert.rejects(
      grid.readWindow('validMask', { row: 6000, col: 0, width: 2, height: 2 }),
      MarsGridRangeError,
    )
    await assert.rejects(
      grid.readWindow('validMask', { row: 0, col: 5000, width: 2, height: 2 }),
      MarsGridRangeError,
    )
  })

  test('cell and coordinate queries reject or flag out-of-grid positions', async () => {
    assert.equal(grid.containsCell(0, 0), true)
    assert.equal(grid.containsCell(-1, 0), false)
    assert.equal(grid.containsCell(0, 5067), false)
    assert.equal(grid.containsCell(5067, 0), false)

    await assert.rejects(grid.readCell(-1, 0), MarsGridRangeError)
    await assert.rejects(grid.readCell(0, 4456), MarsGridRangeError)

    const outsideCell = await grid.queryCell(-1, 0)
    assert.equal(outsideCell.inGrid, false)
    assert.equal(outsideCell.values, null)

    const outsideLonLat = await grid.queryLonLat(0, 0)
    assert.equal(outsideLonLat.inGrid, false)
    assert.equal(outsideLonLat.values, null)

    const inside = await grid.queryLonLat(77.40350116127826, 18.49777469668048)
    assert.equal(inside.inGrid, true)
    assert.equal(inside.row, 2348)
    assert.equal(inside.col, 1141)
    assert.equal(inside.values.geologyId, 0)
  })

  test('legend joins class IDs to names, symbols and conflict decisions', () => {
    const classes = grid.getLegendClasses()
    assert.equal(classes.length, 14)
    assert.deepEqual(classes.map(entry => entry.classId).sort((a, b) => a - b), Array.from({ length: 14 }, (_, index) => index))
    assert.equal(classes.find(entry => entry.classId === 0)?.name, 'Jezero fan 2 unit')
    assert.equal(classes.find(entry => entry.classId === 5)?.symbol, 'Nnp2')
    assert.equal(classes.find(entry => entry.classId === 5)?.conflictStatus, 'RESOLVED_BY_PROJECT_DECISION')
    assert.match(classes.find(entry => entry.classId === 5)?.conflictedOrigFids ?? '', /112/)
    assert.equal(classes.reduce((total, entry) => total + entry.pixelCount, 0), PIPELINE_BASELINE.mappedGeologyCells)
    assert.equal(grid.getLegendEntry(-1), null)
    assert.equal(grid.getLegendEntry(99), null)
  })

  test('metadata, legend and report sample cells validate', { timeout: 120000 }, async () => {
    const result = await validateMarsGrid(grid, { qualityReport })
    assert.equal(result.ok, true, JSON.stringify(result.checks.filter(check => !check.ok), null, 2))
    assert.equal(result.summary.layerCount, 8)
    assert.equal(result.summary.legendClasses, 14)
  })

  test('deep scan reproduces every pipeline cell count', { timeout: 300000 }, async () => {
    const result = await validateMarsGrid(grid, { qualityReport, deep: true })
    assert.equal(result.ok, true, JSON.stringify(result.checks.filter(check => !check.ok), null, 2))
    assert.equal(result.summary.validDemCells, PIPELINE_BASELINE.validDemCells)
    assert.equal(result.summary.navigableDemCells, PIPELINE_BASELINE.navigableDemCells)
    assert.equal(result.summary.mappedGeologyCells, PIPELINE_BASELINE.mappedGeologyCells)
    assert.equal(result.summary.classZeroCells, PIPELINE_BASELINE.geologyClassCounts[0])
    assert.equal(result.summary.totalCells, EXPECTED_GRID.totalCells)
    assert.deepEqual(result.summary.geologyClassCounts, PIPELINE_BASELINE.geologyClassCounts)
  })
})

test('MarsGrid reports actionable errors when data is missing', { skip: HAS_DATA }, async () => {
  await assert.rejects(openMarsGridFromDirectory(DATA_DIR), /Mars grid data directory not found/)
})
