// Shared graph search used by A* and Dijkstra.
//
// Both algorithms therefore use exactly the same neighbour set, traversability
// rule, diagonal corner-cutting rule, edge-cost function and reconstruction.

import { DEFAULT_CANCEL_CHECK_INTERVAL, NEIGHBOR_OFFSETS, ROUTE_OBJECTIVES } from '../constants.js'
import { createHeuristic } from '../core/costModel.js'
import { isCellNavigable, isUsableMovementCost } from '../core/field.js'
import { reconstructPath } from '../core/pathReconstruction.js'
import { CellPriorityQueue } from '../core/priorityQueue.js'

const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? () => performance.now()
  : () => Date.now()

export function runSearch(field, {
  startIndex,
  goalIndex,
  objective = ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST,
  algorithm = 'search',
  useHeuristic = false,
  minimumCost = 1,
  maxExpansions = 0,
  shouldCancel = null,
  cancelInterval = DEFAULT_CANCEL_CHECK_INTERVAL,
} = {}) {
  const started = now()
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= field.cellCount) {
    return { found: false, reason: 'invalid-start', path: null, cost: null, stats: { algorithm, elapsedMs: now() - started } }
  }
  if (!Number.isInteger(goalIndex) || goalIndex < 0 || goalIndex >= field.cellCount) {
    return { found: false, reason: 'invalid-goal', path: null, cost: null, stats: { algorithm, elapsedMs: now() - started } }
  }
  if (!isCellNavigable(field, startIndex)) {
    return { found: false, reason: 'invalid-start', path: null, cost: null, stats: { algorithm, elapsedMs: now() - started } }
  }
  if (!isCellNavigable(field, goalIndex)) {
    return { found: false, reason: 'invalid-goal', path: null, cost: null, stats: { algorithm, elapsedMs: now() - started } }
  }

  const { width, height, cellCount } = field
  const gScore = new Float64Array(cellCount).fill(Infinity)
  const parent = new Int32Array(cellCount).fill(-1)
  const closed = new Uint8Array(cellCount)
  const queue = new CellPriorityQueue(cellCount)
  const heuristic = useHeuristic
    ? createHeuristic(field, goalIndex, objective, minimumCost)
    : null

  gScore[startIndex] = 0
  queue.push(startIndex, heuristic ? heuristic(startIndex) : 0)
  let expanded = 0
  let discovered = 1
  let relaxed = 0
  let maxFrontier = 1
  let cancelled = false
  let limitReached = false
  let found = false

  while (queue.size > 0) {
    if (maxExpansions > 0 && expanded >= maxExpansions) {
      limitReached = true
      break
    }
    if (shouldCancel && expanded > 0 && expanded % cancelInterval === 0 && shouldCancel()) {
      cancelled = true
      break
    }

    const current = queue.pop()
    if (closed[current]) continue
    closed[current] = 1
    expanded++

    if (current === goalIndex) {
      found = true
      break
    }

    const row = (current / width) | 0
    const col = current - row * width
    const currentG = gScore[current]
    const currentCost = field.movementCost[current]
    if (!isUsableMovementCost(currentCost)) continue

    for (let directionIndex = 0; directionIndex < NEIGHBOR_OFFSETS.length; directionIndex++) {
      const direction = NEIGHBOR_OFFSETS[directionIndex]
      const nextRow = row + direction.dr
      const nextCol = col + direction.dc
      if (nextRow < 0 || nextRow >= height || nextCol < 0 || nextCol >= width) continue
      const nextIndex = nextRow * width + nextCol
      if (closed[nextIndex]) continue
      if (!isCellNavigable(field, nextIndex)) continue
      if (direction.diagonal) {
        if (!isCellNavigable(field, row * width + nextCol)) continue
        if (!isCellNavigable(field, nextRow * width + col)) continue
      }

      const distance = direction.diagonal
        ? field.diagonalDistance
        : direction.dr !== 0 ? field.verticalDistance : field.horizontalDistance
      let stepCost
      if (objective === ROUTE_OBJECTIVES.SHORTEST_DISTANCE) {
        stepCost = distance
      } else {
        const nextCost = field.movementCost[nextIndex]
        if (!isUsableMovementCost(nextCost)) continue
        stepCost = distance * (currentCost + nextCost) / 2
      }
      if (!Number.isFinite(stepCost) || stepCost < 0) continue

      const tentative = currentG + stepCost
      if (tentative >= gScore[nextIndex]) continue
      gScore[nextIndex] = tentative
      parent[nextIndex] = current
      const priority = heuristic ? tentative + heuristic(nextIndex) : tentative
      const wasPresent = queue.position[nextIndex] >= 0
      queue.push(nextIndex, priority)
      if (!wasPresent) discovered++
      relaxed++
      if (queue.size > maxFrontier) maxFrontier = queue.size
    }
  }

  const path = found ? reconstructPath(parent, startIndex, goalIndex) : null
  const reason = found ? null
    : cancelled ? 'cancelled'
      : limitReached ? 'search-limit'
        : 'unreachable'

  return {
    found: Boolean(found && path),
    reason,
    path,
    cost: found ? gScore[goalIndex] : null,
    stats: {
      algorithm,
      expanded,
      discovered,
      relaxed,
      maxFrontier,
      elapsedMs: now() - started,
      cancelled,
      limitReached,
      usedHeuristic: Boolean(heuristic),
    },
  }
}
