import { ROUTE_OBJECTIVES } from '../constants.js'
import { isUsableMovementCost } from './field.js'

/** Distance and direction of one local-grid step, or null for a non-step. */
export function stepGeometry(field, fromIndex, toIndex) {
  const width = field.width
  const fromRow = (fromIndex / width) | 0
  const fromCol = fromIndex - fromRow * width
  const toRow = (toIndex / width) | 0
  const toCol = toIndex - toRow * width
  const dr = toRow - fromRow
  const dc = toCol - fromCol
  if (dr === 0 && dc === 0) return { dr, dc, diagonal: false, distance: 0, fromRow, fromCol, toRow, toCol }
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1) return null
  const diagonal = dr !== 0 && dc !== 0
  const distance = diagonal
    ? field.diagonalDistance
    : dr !== 0 ? field.verticalDistance : field.horizontalDistance
  return { dr, dc, diagonal, distance, fromRow, fromCol, toRow, toCol }
}

/**
 * C(a,b) = d(a,b) * (M(a) + M(b)) / 2 for the terrain-cost objective.
 * The shortest-distance objective uses d(a,b) directly. Missing or invalid
 * costs produce NaN; callers must skip or report them, never coerce to zero.
 */
export function edgeCost(field, fromIndex, toIndex, geometry, objective) {
  const step = geometry ?? stepGeometry(field, fromIndex, toIndex)
  if (!step || step.distance === 0) return 0
  if (objective === ROUTE_OBJECTIVES.SHORTEST_DISTANCE) return step.distance
  const fromCost = field.movementCost[fromIndex]
  const toCost = field.movementCost[toIndex]
  if (!isUsableMovementCost(fromCost) || !isUsableMovementCost(toCost)) return Number.NaN
  return step.distance * (fromCost + toCost) / 2
}

/** Octile distance in metres, before applying any movement-cost scale. */
export function octileDistance(field, fromRow, fromCol, toRow, toCol) {
  const dr = Math.abs(toRow - fromRow)
  const dc = Math.abs(toCol - fromCol)
  const diagonal = field.diagonalDistance
  const straight = field.orthogonalDistance
  return straight * (dr + dc) + (diagonal - 2 * straight) * Math.min(dr, dc)
}

/**
 * Build an admissible, consistent heuristic for A*.
 * Minimum movement cost <= the average cost of any edge, so scaling the
 * octile distance by the smallest usable cost cannot overestimate.
 */
export function createHeuristic(field, goalIndex, objective, minimumCost) {
  const goalRow = (goalIndex / field.width) | 0
  const goalCol = goalIndex - goalRow * field.width
  const scale = objective === ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST
    ? (Number.isFinite(minimumCost) && minimumCost > 0 ? minimumCost : 1)
    : 1
  return index => {
    const row = (index / field.width) | 0
    const col = index - row * field.width
    return octileDistance(field, row, col, goalRow, goalCol) * scale
  }
}
