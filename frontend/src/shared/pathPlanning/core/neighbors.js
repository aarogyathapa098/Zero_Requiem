import { NEIGHBOR_OFFSETS } from '../constants.js'
import { isCellNavigable } from './field.js'

export { NEIGHBOR_OFFSETS }

/** Return the local index of a neighbour, or -1 when it leaves the field. */
export function neighborIndex(field, index, direction) {
  const row = (index / field.width) | 0
  const col = index - row * field.width
  const nextRow = row + direction.dr
  const nextCol = col + direction.dc
  if (nextRow < 0 || nextRow >= field.height || nextCol < 0 || nextCol >= field.width) return -1
  return nextRow * field.width + nextCol
}

/**
 * A transition is allowed when the destination is navigable and, for a
 * diagonal step, neither orthogonal cell beside the corner is blocked.
 */
export function isTransitionAllowed(field, index, nextIndex, direction) {
  if (nextIndex < 0 || !isCellNavigable(field, nextIndex)) return false
  if (!direction.diagonal) return true
  const row = (index / field.width) | 0
  const col = index - row * field.width
  const nextCol = col + direction.dc
  const nextRow = row + direction.dr
  return isCellNavigable(field, row * field.width + nextCol)
    && isCellNavigable(field, nextRow * field.width + col)
}
