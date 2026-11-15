import { ROUTE_OBJECTIVES } from '../constants.js'
import { edgeCost, stepGeometry } from './costModel.js'
import { isCellNavigable, isUsableMovementCost } from './field.js'

function issue(code, message, extra = {}) {
  return { code, message, ...extra }
}

/**
 * Validate a reconstructed local-index path before it is shown as a success.
 * Returns every problem found rather than stopping at the first one.
 */
export function validatePath(field, {
  path,
  startIndex,
  goalIndex,
  objective = ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST,
  expectedCost = null,
  expectedDistance = null,
} = {}) {
  const issues = []
  if (!Array.isArray(path) || path.length === 0) {
    return { ok: false, issues: [issue('empty-path', 'The calculated path is empty.')], distanceMetres: 0, traversalCost: 0 }
  }
  if (path[0] !== startIndex) {
    issues.push(issue('start-mismatch', `The path starts at local index ${path[0]}, not the requested start ${startIndex}.`))
  }
  if (path[path.length - 1] !== goalIndex) {
    issues.push(issue('goal-mismatch', `The path ends at local index ${path[path.length - 1]}, not the requested destination ${goalIndex}.`))
  }

  let distanceMetres = 0
  let traversalCost = 0
  let previous = null
  for (let position = 0; position < path.length; position++) {
    const index = path[position]
    if (!Number.isInteger(index) || index < 0 || index >= field.cellCount) {
      issues.push(issue('cell-out-of-window', `Path position ${position} is outside the search window.`, { position }))
      previous = index
      continue
    }
    if (field.navigationValid[index] !== 1) {
      issues.push(issue('cell-not-navigable', `Path position ${position} is not navigable.`, { position }))
    }
    if (!isUsableMovementCost(field.movementCost[index])) {
      issues.push(issue('invalid-movement-cost', `Path position ${position} has a missing or non-positive movement cost.`, { position }))
    }
    if (previous === null) {
      previous = index
      continue
    }

    const geometry = stepGeometry(field, previous, index)
    if (!geometry) {
      issues.push(issue('illegal-transition', `Path positions ${position - 1} and ${position} are not 8-neighbours.`, { position }))
      previous = index
      continue
    }
    if (geometry.diagonal) {
      const sideA = geometry.fromRow * field.width + geometry.toCol
      const sideB = geometry.toRow * field.width + geometry.fromCol
      if (!isCellNavigable(field, sideA) || !isCellNavigable(field, sideB)) {
        issues.push(issue('corner-cutting', `The diagonal step at position ${position} cuts between two blocked orthogonal cells.`, { position }))
      }
    }
    distanceMetres += geometry.distance
    const cost = edgeCost(field, previous, index, geometry, objective)
    if (!Number.isFinite(cost)) {
      issues.push(issue('invalid-edge-cost', `The edge into position ${position} has no usable movement cost.`, { position }))
    } else {
      traversalCost += cost
    }
    previous = index
  }

  if (Number.isFinite(expectedDistance)) {
    const tolerance = 1e-6 * Math.max(1, Math.abs(expectedDistance))
    if (Math.abs(distanceMetres - expectedDistance) > tolerance) {
      issues.push(issue(
        'distance-mismatch',
        `Reconstructed distance ${distanceMetres} m does not match the search distance ${expectedDistance} m.`,
      ))
    }
  }
  if (Number.isFinite(expectedCost)) {
    const tolerance = 1e-6 * Math.max(1, Math.abs(expectedCost))
    if (Math.abs(traversalCost - expectedCost) > tolerance) {
      issues.push(issue(
        'cost-mismatch',
        `Reconstructed cost ${traversalCost} does not match the search cost ${expectedCost}.`,
      ))
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    distanceMetres,
    traversalCost,
  }
}
