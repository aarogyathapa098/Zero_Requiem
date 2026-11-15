// Local search field built from a bounded MarsGrid window.
//
// A field owns one typed array per required layer and addresses cells by a
// local row-major index. `rowOffset`/`colOffset` translate back to the global
// raster grid. Algorithms only touch this object; they never read GeoTIFFs.

import { EXPECTED_GRID } from '../../marsGrid/constants.js'

function normalizeArray(source, Type, length, fallback) {
  if (source == null) {
    const output = new Type(length)
    if (fallback !== undefined) output.fill(fallback)
    return output
  }
  if (source.length !== length) {
    throw new TypeError(`Layer length ${source.length} does not match ${length} cells.`)
  }
  return source instanceof Type ? source : new Type(source)
}

export function isUsableMovementCost(value) {
  return Number.isFinite(value) && value > 0
}

export function createField({
  width,
  height,
  rowOffset = 0,
  colOffset = 0,
  transform = EXPECTED_GRID.transform,
  resolution = EXPECTED_GRID.resolution,
  radius = undefined,
  standardParallelDegrees = undefined,
  navigationValid,
  movementCost,
  elevation,
  slope,
  roughness,
  geologyId,
  geologyLegend = null,
} = {}) {
  if (!Number.isInteger(width) || width <= 0) throw new TypeError('width must be a positive integer.')
  if (!Number.isInteger(height) || height <= 0) throw new TypeError('height must be a positive integer.')
  if (!Number.isInteger(rowOffset) || !Number.isInteger(colOffset)) {
    throw new TypeError('rowOffset and colOffset must be integers.')
  }
  const cellCount = width * height
  const field = {
    width,
    height,
    cellCount,
    rowOffset,
    colOffset,
    transform,
    resolution,
    radius,
    standardParallelDegrees,
    navigationValid: normalizeArray(navigationValid, Uint8Array, cellCount),
    movementCost: normalizeArray(movementCost, Float32Array, cellCount),
    elevation: normalizeArray(elevation, Float32Array, cellCount, Number.NaN),
    slope: normalizeArray(slope, Float32Array, cellCount, Number.NaN),
    roughness: normalizeArray(roughness, Float32Array, cellCount, Number.NaN),
    geologyId: normalizeArray(geologyId, Int16Array, cellCount, -1),
    geologyLegend,
    horizontalDistance: Math.abs(resolution?.x ?? EXPECTED_GRID.pixelSize),
    verticalDistance: Math.abs(resolution?.y ?? EXPECTED_GRID.pixelSize),
  }
  field.orthogonalDistance = Math.min(field.horizontalDistance, field.verticalDistance)
  field.diagonalDistance = Math.hypot(field.horizontalDistance, field.verticalDistance)
  field.window = { row: rowOffset, col: colOffset, width, height }
  field._minimumMovementCost = undefined
  return field
}

export function isCellNavigable(field, index) {
  return index >= 0
    && index < field.cellCount
    && field.navigationValid[index] === 1
    && isUsableMovementCost(field.movementCost[index])
}

export function indexToGlobalCell(field, index) {
  const row = (index / field.width) | 0
  const col = index - row * field.width
  return { row: row + field.rowOffset, col: col + field.colOffset }
}

export function cellToIndex(field, row, col) {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return -1
  const localRow = row - field.rowOffset
  const localCol = col - field.colOffset
  if (localRow < 0 || localRow >= field.height || localCol < 0 || localCol >= field.width) return -1
  return localRow * field.width + localCol
}

/** Smallest usable movement cost in the field, used by the A* heuristic. */
export function minimumMovementCost(field) {
  if (field._minimumMovementCost !== undefined) return field._minimumMovementCost
  let minimum = Infinity
  const navigation = field.navigationValid
  const costs = field.movementCost
  for (let index = 0; index < field.cellCount; index++) {
    if (navigation[index] !== 1) continue
    const cost = costs[index]
    if (isUsableMovementCost(cost) && cost < minimum) minimum = cost
  }
  field._minimumMovementCost = Number.isFinite(minimum) ? minimum : null
  return field._minimumMovementCost
}
