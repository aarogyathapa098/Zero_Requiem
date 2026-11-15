import { createField } from '../core/field.js'

function valueAt(source, row, col, fallback) {
  if (source == null) return fallback
  if (typeof source === 'function') return source(row, col)
  if (Array.isArray(source)) {
    const value = source[row]?.[col]
    return value == null ? fallback : value
  }
  return source
}

/** Build a field from ASCII rows: any character except '#' is navigable. */
export function createTestField({
  rows,
  costs = 1,
  elevations = 0,
  slopes = 0,
  roughness = 0,
  geology = -1,
  transform,
  resolution,
  geologyLegend,
  rowOffset = 0,
  colOffset = 0,
} = {}) {
  if (!Array.isArray(rows) || rows.length === 0) throw new TypeError('rows must be a non-empty array.')
  const height = rows.length
  const width = rows[0].length
  if (rows.some(row => row.length !== width)) throw new TypeError('Every row must have the same width.')
  const cellCount = width * height
  const navigationValid = new Uint8Array(cellCount)
  const movementCost = new Float32Array(cellCount)
  const elevation = new Float32Array(cellCount)
  const slope = new Float32Array(cellCount)
  const roughnessValues = new Float32Array(cellCount)
  const geologyId = new Int16Array(cellCount)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = row * width + col
      navigationValid[index] = rows[row][col] === '#' ? 0 : 1
      movementCost[index] = valueAt(costs, row, col, 1)
      elevation[index] = valueAt(elevations, row, col, 0)
      slope[index] = valueAt(slopes, row, col, 0)
      roughnessValues[index] = valueAt(roughness, row, col, 0)
      geologyId[index] = valueAt(geology, row, col, -1)
    }
  }
  return createField({
    width,
    height,
    rowOffset,
    colOffset,
    navigationValid,
    movementCost,
    elevation,
    slope,
    roughness: roughnessValues,
    geologyId,
    transform,
    resolution,
    geologyLegend,
  })
}
