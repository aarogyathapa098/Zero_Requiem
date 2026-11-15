import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROUTE_OBJECTIVES,
  ROUTE_STATUS,
  cellToIndex,
  planRouteOnField,
} from '../index.js'
import { createTestField } from './testField.js'

const DIAGONAL = 20 * Math.SQRT2

function plan(rows, start, goal, options = {}) {
  const field = createTestField({ rows, ...options.field })
  return { field, result: planRouteOnField(field, { start, goal, ...options.route }) }
}

describe('A* route planning', () => {
  test('finds a path between valid endpoints on an open grid', () => {
    const { result } = plan(
      ['.....', '.....', '.....', '.....', '.....'],
      { row: 0, col: 0 },
      { row: 4, col: 4 },
    )
    assert.equal(result.ok, true)
    assert.equal(result.status, ROUTE_STATUS.SUCCESS)
    assert.equal(result.path.length, 5)
    assert.deepEqual([result.path[0].row, result.path[0].col], [0, 0])
    assert.deepEqual([result.path.at(-1).row, result.path.at(-1).col], [4, 4])
    assert.ok(Math.abs(result.distanceMetres - 4 * DIAGONAL) < 1e-6)
    assert.ok(Math.abs(result.traversalCost - 4 * DIAGONAL) < 1e-6)
    assert.equal(result.metrics.directionChanges, 0)
    assert.equal(result.validation.ok, true)
  })

  test('navigates around obstacles without entering blocked cells', () => {
    const rows = [
      '.....',
      '..#..',
      '..#..',
      '..#..',
      '.....',
    ]
    const { result } = plan(rows, { row: 0, col: 0 }, { row: 4, col: 4 })
    assert.equal(result.ok, true)
    for (const cell of result.path) {
      assert.notEqual(rows[cell.row][cell.col], '#', `blocked cell in path: ${cell.row},${cell.col}`)
    }
    assert.ok(result.distanceMetres > 4 * DIAGONAL)
  })

  test('prevents diagonal corner-cutting through blocked orthogonal cells', () => {
    const { result } = plan(
      ['.#', '#.'],
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    )
    assert.equal(result.ok, false)
    assert.equal(result.status, ROUTE_STATUS.UNREACHABLE)

    const detour = plan(
      ['...', '.#.', '...'],
      { row: 0, col: 0 },
      { row: 2, col: 2 },
    )
    assert.equal(detour.result.ok, true)
    assert.ok(!detour.result.path.some(cell => cell.row === 1 && cell.col === 1))
    assert.ok(detour.result.distanceMetres > 2 * DIAGONAL)
  })

  test('reports unreachable destinations', () => {
    const { result } = plan(
      ['...', '###', '...'],
      { row: 0, col: 0 },
      { row: 2, col: 2 },
    )
    assert.equal(result.ok, false)
    assert.equal(result.status, ROUTE_STATUS.UNREACHABLE)
    assert.match(result.message, /No navigable route/)
  })

  test('validates start and destination cells explicitly', () => {
    const blockedStart = plan(
      ['.#.', '...', '...'],
      { row: 0, col: 1 },
      { row: 2, col: 2 },
    )
    assert.equal(blockedStart.result.status, ROUTE_STATUS.INVALID_START)
    assert.match(blockedStart.result.message, /not navigable/)

    const blockedGoal = plan(
      ['...', '...', '.#.'],
      { row: 0, col: 0 },
      { row: 2, col: 1 },
    )
    assert.equal(blockedGoal.result.status, ROUTE_STATUS.INVALID_GOAL)

    const outside = plan(
      ['...', '...', '...'],
      { row: -1, col: 0 },
      { row: 2, col: 2 },
    )
    assert.equal(outside.result.status, ROUTE_STATUS.INVALID_START)
    assert.match(outside.result.message, /outside the search window/)

    const missingCost = plan(
      ['...', '...', '...'],
      { row: 0, col: 0 },
      { row: 2, col: 2 },
      { field: { costs: (row, col) => (row === 0 && col === 0 ? Number.NaN : 1) } },
    )
    assert.equal(missingCost.result.status, ROUTE_STATUS.INVALID_START)
    assert.match(missingCost.result.message, /no usable movement cost/)

    const sameCell = plan(
      ['...', '...', '...'],
      { row: 1, col: 1 },
      { row: 1, col: 1 },
    )
    assert.equal(sameCell.result.status, ROUTE_STATUS.INVALID_GOAL)
    assert.match(sameCell.result.message, /same cell/)
  })

  test('honours an explicit expansion limit', () => {
    const { field } = plan(['.....', '.....', '.....', '.....', '.....'], { row: 0, col: 0 }, { row: 4, col: 4 })
    const result = planRouteOnField(field, {
      start: { row: 0, col: 0 },
      goal: { row: 4, col: 4 },
      maxExpansions: 1,
    })
    assert.equal(result.status, ROUTE_STATUS.SEARCH_LIMIT)
    assert.equal(result.ok, false)
  })

  test('honours cancellation requests', () => {
    const { field } = plan(['.....', '.....', '.....', '.....', '.....'], { row: 0, col: 0 }, { row: 4, col: 4 })
    const result = planRouteOnField(field, {
      start: { row: 0, col: 0 },
      goal: { row: 4, col: 4 },
      shouldCancel: () => true,
      cancelInterval: 1,
    })
    assert.equal(result.status, ROUTE_STATUS.CANCELLED)
  })

  test('exposes both objectives through the same field', () => {
    const field = createTestField({ rows: ['...', '...', '...'] })
    const start = { row: 0, col: 0 }
    const goal = { row: 2, col: 2 }
    const cost = planRouteOnField(field, { start, goal, objective: ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST })
    const distance = planRouteOnField(field, { start, goal, objective: ROUTE_OBJECTIVES.SHORTEST_DISTANCE })
    assert.equal(cost.ok, true)
    assert.equal(distance.ok, true)
    assert.ok(Math.abs(cost.distanceMetres - distance.distanceMetres) < 1e-6)
    assert.equal(cellToIndex(field, 0, 0), 0)
  })
})
