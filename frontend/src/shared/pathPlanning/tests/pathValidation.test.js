import test, { after, before, describe } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ROUTE_OBJECTIVES,
  ROUTE_STATUS,
  astar,
  cellToIndex,
  computePathMetrics,
  createMarsGridField,
  pathToLonLat,
  planRoute,
  planRouteOnField,
  validatePath,
} from '../index.js'
import { lonLatToCell, openMarsGridFromDirectory } from '../../marsGrid/index.js'
import { createTestField } from './testField.js'

describe('path validation and metrics', () => {
  test('accepts a valid reconstructed route', () => {
    const field = createTestField({ rows: ['...', '...', '...'] })
    const startIndex = cellToIndex(field, 0, 0)
    const goalIndex = cellToIndex(field, 2, 2)
    const search = astar(field, { startIndex, goalIndex, minimumCost: 1 })
    const metrics = computePathMetrics(field, search.path)
    const validation = validatePath(field, {
      path: search.path,
      startIndex,
      goalIndex,
      objective: ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST,
      expectedCost: search.cost,
      expectedDistance: metrics.distanceMetres,
    })
    assert.equal(validation.ok, true, JSON.stringify(validation.issues))
  })

  test('reports illegal transitions, corner cutting and blocked cells', () => {
    const open = createTestField({ rows: ['...', '...', '...'] })
    const illegal = validatePath(open, {
      path: [0, 8],
      startIndex: 0,
      goalIndex: 8,
    })
    assert.equal(illegal.ok, false)
    assert.ok(illegal.issues.some(item => item.code === 'illegal-transition'))

    const corner = createTestField({ rows: ['.#', '#.'] })
    const cut = validatePath(corner, {
      path: [0, 3],
      startIndex: 0,
      goalIndex: 3,
    })
    assert.ok(cut.issues.some(item => item.code === 'corner-cutting'))

    const blocked = createTestField({ rows: ['...', '.#.', '...'] })
    const throughWall = validatePath(blocked, {
      path: [0, 4],
      startIndex: 0,
      goalIndex: 4,
    })
    assert.ok(throughWall.issues.some(item => item.code === 'cell-not-navigable'))
  })

  test('reports endpoint and cost mismatches', () => {
    const field = createTestField({ rows: ['...'] })
    const startMismatch = validatePath(field, { path: [1, 2], startIndex: 0, goalIndex: 2 })
    assert.ok(startMismatch.issues.some(item => item.code === 'start-mismatch'))

    const goalMismatch = validatePath(field, { path: [0, 1], startIndex: 0, goalIndex: 2 })
    assert.ok(goalMismatch.issues.some(item => item.code === 'goal-mismatch'))

    const costMismatch = validatePath(field, {
      path: [0, 1, 2],
      startIndex: 0,
      goalIndex: 2,
      expectedCost: 1,
    })
    assert.ok(costMismatch.issues.some(item => item.code === 'cost-mismatch'))

    const distanceMismatch = validatePath(field, {
      path: [0, 1, 2],
      startIndex: 0,
      goalIndex: 2,
      expectedDistance: 999,
    })
    assert.ok(distanceMismatch.issues.some(item => item.code === 'distance-mismatch'))
  })

  test('derives distance, cost, elevation, slope, roughness and geology metrics', () => {
    const legend = new Map([[0, { classId: 0, name: 'Jezero fan 2 unit', symbol: 'NHjf2' }]])
    const field = createTestField({
      rows: ['...'],
      elevations: [[0, 10, 30]],
      slopes: [[1, 2, 3]],
      roughness: [[0.1, 0.2, 0.3]],
      geology: [[0, 0, -1]],
      geologyLegend: legend,
    })
    const metrics = computePathMetrics(field, [0, 1, 2])
    assert.ok(Math.abs(metrics.distanceMetres - 40) < 1e-6)
    assert.ok(Math.abs(metrics.distanceKm - 0.04) < 1e-9)
    assert.ok(Math.abs(metrics.traversalCost - 40) < 1e-6)
    assert.equal(metrics.cellCount, 3)
    assert.equal(metrics.directionChanges, 0)
    assert.equal(metrics.startElevation, 0)
    assert.equal(metrics.endElevation, 30)
    assert.equal(metrics.elevationGain, 30)
    assert.equal(metrics.elevationLoss, 0)
    assert.equal(metrics.elevationComplete, true)
    assert.equal(metrics.maxSlope, 3)
    assert.equal(metrics.averageSlope, 2)
    assert.ok(Math.abs(metrics.maxRoughness - 0.3) < 1e-6)
    assert.ok(Math.abs(metrics.averageRoughness - 0.2) < 1e-6)
    assert.equal(metrics.geology.mappedCells, 2)
    assert.equal(metrics.geology.unmappedCells, 1)
    assert.equal(metrics.geology.units.find(unit => unit.classId === 0)?.symbol, 'NHjf2')
    assert.equal(metrics.geology.units.find(unit => unit.classId === -1)?.mapped, false)
  })

  test('counts direction changes between consecutive steps', () => {
    const field = createTestField({ rows: ['...', '...'] })
    const metrics = computePathMetrics(field, [0, 1, 4, 5])
    assert.equal(metrics.directionChanges, 2)
  })

  test('converts path cells to map lon/lat and back to the same cells', () => {
    const field = createTestField({
      rows: ['..'],
      rowOffset: 2506,
      colOffset: 1274,
    })
    const points = pathToLonLat(field, [0, 1])
    assert.deepEqual([points[0].row, points[0].col], [2506, 1274])
    assert.deepEqual([points[1].row, points[1].col], [2506, 1275])
    for (const point of points) {
      assert.ok(Number.isFinite(point.lon))
      assert.ok(Number.isFinite(point.lat))
      assert.ok(Number.isFinite(point.world.x))
      const back = lonLatToCell(point.lon, point.lat)
      assert.deepEqual([back.row, back.col], [point.row, point.col])
    }
  })

  test('exposes map-ready path points on a calculated route', () => {
    const field = createTestField({ rows: ['...', '...', '...'] })
    const result = planRouteOnField(field, {
      start: { row: 0, col: 0 },
      goal: { row: 2, col: 2 },
    })
    assert.equal(result.ok, true)
    assert.ok(result.path.every(point => Number.isFinite(point.lon) && Number.isFinite(point.lat)))
    assert.equal(result.path[0].row, result.start.row)
    assert.equal(result.path.at(-1).col, result.goal.col)
  })
})

const DATA_DIR = fileURLToPath(new URL('../../../modes/map/nasa-data/output/', import.meta.url))
const HAS_DATA = existsSync(DATA_DIR)
const SKIP = HAS_DATA ? false : `Mars grid data not found in ${DATA_DIR}.`

describe('real Jezero window integration', { skip: SKIP }, () => {
  let grid
  before(async () => {
    grid = await openMarsGridFromDirectory(DATA_DIR)
  })
  after(async () => {
    await grid?.close()
  })

  test('plans, validates and converts a real short traverse', async () => {
    const start = { row: 2506, col: 1274 }
    const goal = { row: 2506, col: 1374 }
    const field = await createMarsGridField(grid, { start, goal, padding: 12 })
    assert.ok(field.readMs >= 0)
    assert.ok(field.searchWindow.width > 100)
    assert.ok(field.searchWindow.height > 20)

    for (const objective of [ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST, ROUTE_OBJECTIVES.SHORTEST_DISTANCE]) {
      const result = planRouteOnField(field, { start, goal, objective })
      assert.equal(result.ok, true, `${objective}: ${result.message}`)
      assert.equal(result.validation.ok, true, JSON.stringify(result.validation?.issues))
      assert.equal(result.objective, objective)
      assert.equal(result.path[0].row, start.row)
      assert.equal(result.path[0].col, start.col)
      assert.equal(result.path.at(-1).row, goal.row)
      assert.equal(result.path.at(-1).col, goal.col)
      assert.ok(result.distanceMetres > 0)
      assert.ok(result.distanceKm > 0)
      assert.ok(Number.isFinite(result.traversalCost))
      assert.ok(result.metrics.cellCount === result.path.length)
      assert.ok(result.metrics.geology.units.length > 0)
      assert.ok(Number.isFinite(result.stats.expanded))
      assert.ok(Number.isFinite(result.stats.elapsedMs))
      assert.ok(Number.isFinite(result.stats.windowReadMs))
      assert.deepEqual(result.searchWindow, {
        row: field.searchWindow.row,
        col: field.searchWindow.col,
        width: field.searchWindow.width,
        height: field.searchWindow.height,
        cells: field.searchWindow.width * field.searchWindow.height,
        padding: field.searchWindow.padding,
      })
    }
  })

  test('reports an oversized search window instead of attempting a full-grid read', async () => {
    const result = await planRoute(grid, {
      start: { row: 0, col: 0 },
      goal: { row: 5000, col: 4000 },
      padding: 0,
      maxCells: 1000,
    })
    assert.equal(result.ok, false)
    assert.equal(result.status, ROUTE_STATUS.WINDOW_TOO_LARGE)
    assert.match(result.message, /exceeds/)
  })
})
