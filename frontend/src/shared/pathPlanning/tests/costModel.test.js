import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROUTE_OBJECTIVES,
  ROUTE_STATUS,
  astar,
  cellToIndex,
  createHeuristic,
  edgeCost,
  isCellNavigable,
  octileDistance,
  planRouteOnField,
  stepGeometry,
} from '../index.js'
import { createTestField } from './testField.js'

describe('cost model', () => {
  test('keeps shortest-distance and lowest-traversal-cost routes distinct', () => {
    const rows = ['.....', '.....', '.....', '.....', '.....']
    const costs = [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 5, 5, 5, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const field = createTestField({ rows, costs })
    const start = { row: 2, col: 0 }
    const goal = { row: 2, col: 4 }

    const shortest = planRouteOnField(field, {
      start,
      goal,
      objective: ROUTE_OBJECTIVES.SHORTEST_DISTANCE,
    })
    const cheapest = planRouteOnField(field, {
      start,
      goal,
      objective: ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST,
    })

    assert.equal(shortest.ok, true)
    assert.equal(cheapest.ok, true)
    assert.ok(Math.abs(shortest.distanceMetres - 80) < 1e-6)
    assert.ok(Math.abs(shortest.traversalCost - 320) < 1e-6)
    assert.ok(cheapest.distanceMetres > shortest.distanceMetres)
    assert.ok(cheapest.traversalCost < shortest.traversalCost)
    assert.ok(cheapest.traversalCost < 120)
  })

  test('applies C(a,b) = d(a,b) * (M(a) + M(b)) / 2', () => {
    const field = createTestField({ rows: ['..'], costs: [[2, 4]] })
    const geometry = stepGeometry(field, 0, 1)
    assert.ok(Math.abs(geometry.distance - 20) < 1e-9)
    assert.ok(Math.abs(
      edgeCost(field, 0, 1, geometry, ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST) - 60,
    ) < 1e-6)
    assert.ok(Math.abs(
      edgeCost(field, 0, 1, geometry, ROUTE_OBJECTIVES.SHORTEST_DISTANCE) - 20,
    ) < 1e-9)
  })

  test('octile and heuristic values never overestimate a uniform-cost route', () => {
    const field = createTestField({ rows: ['.....', '.....', '.....', '.....', '.....'], costs: 2 })
    const startIndex = cellToIndex(field, 0, 0)
    const goalIndex = cellToIndex(field, 4, 4)
    const heuristic = createHeuristic(field, goalIndex, ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST, 2)
    const startHeuristic = heuristic(startIndex)
    assert.ok(Math.abs(startHeuristic - 4 * 20 * Math.SQRT2 * 2) < 1e-6)
    assert.equal(heuristic(goalIndex), 0)
    assert.ok(Math.abs(octileDistance(field, 0, 0, 4, 4) - 4 * 20 * Math.SQRT2) < 1e-6)

    const result = astar(field, { startIndex, goalIndex, minimumCost: 2 })
    assert.equal(result.found, true)
    assert.ok(startHeuristic <= result.cost + 1e-9)
  })

  test('never treats a missing movement cost as zero', () => {
    const field = createTestField({ rows: ['..'], costs: [[1, Number.NaN]] })
    assert.equal(isCellNavigable(field, 0), true)
    assert.equal(isCellNavigable(field, 1), false)
    const result = planRouteOnField(field, {
      start: { row: 0, col: 0 },
      goal: { row: 0, col: 1 },
    })
    assert.equal(result.status, ROUTE_STATUS.INVALID_GOAL)
    assert.match(result.message, /no usable movement cost/)
  })
})
