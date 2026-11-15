import test, { after, before, describe } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ROUTE_OBJECTIVES,
  astar,
  cellToIndex,
  createMarsGridField,
  dijkstra,
  planRouteOnField,
} from '../index.js'
import { openMarsGridFromDirectory } from '../../marsGrid/index.js'
import { createTestField } from './testField.js'

function compareAlgorithms(rows, start, goal, { costs, objective = ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST } = {}) {
  const field = createTestField({ rows, costs })
  const startIndex = cellToIndex(field, start.row, start.col)
  const goalIndex = cellToIndex(field, goal.row, goal.col)
  const a = astar(field, { startIndex, goalIndex, objective, minimumCost: 1 })
  const d = dijkstra(field, { startIndex, goalIndex, objective })
  assert.equal(a.found, d.found)
  if (a.found) {
    assert.ok(
      Math.abs(a.cost - d.cost) <= 1e-9 * Math.max(1, Math.abs(a.cost)),
      `A* cost ${a.cost} != Dijkstra cost ${d.cost}`,
    )
    assert.equal(d.path[0], startIndex)
    assert.equal(d.path.at(-1), goalIndex)
  }
  return { field, a, d }
}

const CASES = [
  {
    name: 'open grid',
    rows: ['.....', '.....', '.....', '.....', '.....'],
    start: { row: 0, col: 0 },
    goal: { row: 4, col: 4 },
  },
  {
    name: 'obstacle wall',
    rows: ['.....', '..#..', '..#..', '..#..', '.....'],
    start: { row: 0, col: 0 },
    goal: { row: 4, col: 4 },
  },
  {
    name: 'narrow passage',
    rows: ['.....', '.#.#.', '.#.#.', '.#.#.', '.....'],
    start: { row: 0, col: 0 },
    goal: { row: 4, col: 4 },
  },
  {
    name: 'multiple possible routes',
    rows: ['.....', '.....', '..#..', '.....', '.....'],
    start: { row: 0, col: 0 },
    goal: { row: 4, col: 4 },
  },
  {
    name: 'high-cost terrain',
    rows: ['.....', '.....', '.....', '.....', '.....'],
    costs: [
      [1, 1, 1, 1, 1],
      [1, 4, 4, 4, 1],
      [1, 4, 9, 4, 1],
      [1, 4, 4, 4, 1],
      [1, 1, 1, 1, 1],
    ],
    start: { row: 0, col: 0 },
    goal: { row: 4, col: 4 },
  },
]

describe('Dijkstra reference comparisons', () => {
  for (const testCase of CASES) {
    test(`agrees with A* on optimal cost: ${testCase.name}`, () => {
      compareAlgorithms(testCase.rows, testCase.start, testCase.goal, {
        costs: testCase.costs,
        objective: ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST,
      })
      compareAlgorithms(testCase.rows, testCase.start, testCase.goal, {
        costs: testCase.costs,
        objective: ROUTE_OBJECTIVES.SHORTEST_DISTANCE,
      })
    })
  }

  test('both algorithms reject the same unreachable destination', () => {
    const field = createTestField({ rows: ['...', '###', '...'] })
    const startIndex = cellToIndex(field, 0, 0)
    const goalIndex = cellToIndex(field, 2, 2)
    const a = astar(field, { startIndex, goalIndex })
    const d = dijkstra(field, { startIndex, goalIndex })
    assert.equal(a.found, false)
    assert.equal(d.found, false)
    assert.equal(a.reason, 'unreachable')
    assert.equal(d.reason, 'unreachable')
  })

  test('both algorithms prevent diagonal corner-cutting', () => {
    const field = createTestField({ rows: ['.#', '#.'] })
    const startIndex = cellToIndex(field, 0, 0)
    const goalIndex = cellToIndex(field, 1, 1)
    assert.equal(astar(field, { startIndex, goalIndex }).found, false)
    assert.equal(dijkstra(field, { startIndex, goalIndex }).found, false)
  })
})

const DATA_DIR = fileURLToPath(new URL('../../../modes/map/nasa-data/output/', import.meta.url))
const HAS_DATA = existsSync(DATA_DIR)
const SKIP = HAS_DATA ? false : `Mars grid data not found in ${DATA_DIR}.`

describe('A* and Dijkstra on a real Jezero window', { skip: SKIP }, () => {
  let grid
  before(async () => {
    grid = await openMarsGridFromDirectory(DATA_DIR)
  })
  after(async () => {
    await grid?.close()
  })

  test('return the same optimal cost on real terrain', async () => {
    const start = { row: 2506, col: 1274 }
    const goal = { row: 2506, col: 1374 }
    const field = await createMarsGridField(grid, { start, goal, padding: 12 })
    const startIndex = cellToIndex(field, start.row, start.col)
    const goalIndex = cellToIndex(field, goal.row, goal.col)
    const a = astar(field, { startIndex, goalIndex, minimumCost: 1 })
    const d = dijkstra(field, { startIndex, goalIndex })
    assert.equal(a.found, true)
    assert.equal(d.found, true)
    assert.ok(Math.abs(a.cost - d.cost) <= 1e-7 * Math.max(1, Math.abs(a.cost)))

    const result = planRouteOnField(field, { start, goal })
    assert.equal(result.ok, true)
    assert.equal(result.validation.ok, true)
    assert.ok(result.geology.units.length > 0)
  })
})
