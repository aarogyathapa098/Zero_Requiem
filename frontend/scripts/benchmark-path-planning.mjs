// Reproducible path-planning benchmark for the SOLBOUND Jezero grid.
//
// Run with: npm run benchmark:paths
//
// Synthetic fields isolate search speed. The real-grid section measures the
// bounded MarsGrid window read separately from the in-memory A* search, then
// compares A* and Dijkstra optimal costs on the same window.

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ROUTE_OBJECTIVES,
  astar,
  cellToIndex,
  createField,
  createMarsGridField,
  dijkstra,
  planRouteOnField,
} from '../src/shared/pathPlanning/index.js'
import { openMarsGridFromDirectory } from '../src/shared/marsGrid/index.js'

const DATA_DIR = fileURLToPath(new URL('../src/modes/map/nasa-data/output/', import.meta.url))
const clock = () => performance.now()
const milliseconds = value => `${value.toFixed(1)} ms`
const cost = value => Number.isFinite(value) ? value.toFixed(2) : '—'

function syntheticField(size) {
  const cells = size * size
  return createField({
    width: size,
    height: size,
    navigationValid: new Uint8Array(cells).fill(1),
    movementCost: new Float32Array(cells).fill(1),
  })
}

function benchmarkSynthetic() {
  console.log('\nSynthetic open field, corner-to-corner route')
  console.log('size       A* time    expanded   Dijkstra time   expanded   cost match')
  for (const size of [128, 256, 512, 1024]) {
    const field = syntheticField(size)
    const startIndex = 0
    const goalIndex = size * size - 1
    const aStart = clock()
    const found = astar(field, { startIndex, goalIndex, minimumCost: 1 })
    const aTime = clock() - aStart
    let referenceTime = null
    let reference = null
    if (size <= 512) {
      const dStart = clock()
      reference = dijkstra(field, { startIndex, goalIndex })
      referenceTime = clock() - dStart
    }
    const match = reference ? Math.abs(found.cost - reference.cost) < 1e-9 : null
    console.log(
      `${String(size).padEnd(5)}x${String(size).padEnd(5)}`
      + `${milliseconds(aTime).padStart(10)}  ${String(found.stats.expanded).padStart(9)}`
      + `${(referenceTime === null ? '—' : milliseconds(referenceTime)).padStart(15)}`
      + `  ${(reference ? reference.stats.expanded : '—').toString().padStart(9)}`
      + `  ${match === null ? '—' : match ? 'yes' : 'NO'}`,
    )
  }
}

async function benchmarkRealGrid() {
  if (!existsSync(DATA_DIR)) {
    console.log(`\nReal-grid benchmark skipped: no data directory at ${DATA_DIR}`)
    return
  }
  const grid = await openMarsGridFromDirectory(DATA_DIR)
  const cases = [
    { label: '100 cells, pad 12', start: { row: 2506, col: 1274 }, goal: { row: 2506, col: 1374 }, padding: 12 },
    { label: '300 cells, pad 32', start: { row: 2506, col: 1274 }, goal: { row: 2506, col: 1574 }, padding: 32 },
    { label: '500 cells, pad 64', start: { row: 2506, col: 1274 }, goal: { row: 2506, col: 1774 }, padding: 64 },
  ]

  console.log('\nReal Jezero windows (20 m cells)')
  console.log('case                 window       cells    read        A* search   expanded   distance   status')
  try {
    for (const testCase of cases) {
      const readStart = clock()
      const field = await createMarsGridField(grid, testCase)
      const readMs = clock() - readStart
      const searchStart = clock()
      const result = planRouteOnField(field, { start: testCase.start, goal: testCase.goal })
      const searchMs = clock() - searchStart
      console.log(
        `${testCase.label.padEnd(20)} `
        + `${`${field.width}x${field.height}`.padEnd(11)} `
        + `${String(field.cellCount).padStart(8)} `
        + `${milliseconds(readMs).padStart(9)} `
        + `${milliseconds(searchMs).padStart(10)} `
        + `${String(result.stats?.expanded ?? '—').padStart(10)} `
        + `${`${result.distanceKm?.toFixed(2) ?? '—'} km`.padStart(10)} `
        + result.status,
      )
    }

    const comparison = cases[0]
    const field = await createMarsGridField(grid, comparison)
    const startIndex = cellToIndex(field, comparison.start.row, comparison.start.col)
    const goalIndex = cellToIndex(field, comparison.goal.row, comparison.goal.col)
    for (const objective of [ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST, ROUTE_OBJECTIVES.SHORTEST_DISTANCE]) {
      const a = astar(field, { startIndex, goalIndex, objective, minimumCost: 1 })
      const d = dijkstra(field, { startIndex, goalIndex, objective })
      const agree = a.found && d.found && Math.abs(a.cost - d.cost) <= 1e-9 * Math.max(1, Math.abs(a.cost))
      console.log(
        `\nA*/Dijkstra ${objective}: A* ${cost(a.cost)}, Dijkstra ${cost(d.cost)}, `
        + `expanded ${a.stats.expanded}/${d.stats.expanded}, agree ${agree ? 'yes' : 'NO'}`,
      )
    }
  } finally {
    await grid.close()
  }
}

console.log('SOLBOUND path-planning benchmark')
benchmarkSynthetic()
await benchmarkRealGrid()
console.log('\nDone.')
