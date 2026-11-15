import {
  DEFAULT_MAX_SEARCH_CELLS,
  DEFAULT_MAX_SEARCH_DIMENSION,
  DEFAULT_SEARCH_PADDING_CELLS,
} from '../constants.js'
import { PathPlanningError } from '../errors.js'
import { createField } from './field.js'

export const SEARCH_LAYERS = Object.freeze([
  'elevation',
  'slope',
  'roughness',
  'movementCost',
  'navigationValid',
  'geologyId',
])

function assertEndpoint(grid, cell, role) {
  if (!cell || !Number.isInteger(cell.row) || !Number.isInteger(cell.col)) {
    throw new PathPlanningError(
      `The ${role} must be a cell with integer row and column values.`,
      { code: `invalid-${role}`, details: { cell } },
    )
  }
  if (!grid.containsCell(cell.row, cell.col)) {
    throw new PathPlanningError(
      `The ${role} cell (row ${cell.row}, col ${cell.col}) is outside the ${grid.height}x${grid.width} grid.`,
      { code: `invalid-${role}`, details: { cell, reason: 'outside-grid' } },
    )
  }
}

/**
 * Choose the smallest padded rectangle that contains both endpoints without
 * exceeding the configured window limits. Padding is reduced first; a bounding
 * box that still cannot fit is reported explicitly.
 */
export function chooseSearchWindow(grid, start, goal, {
  padding = DEFAULT_SEARCH_PADDING_CELLS,
  maxCells = DEFAULT_MAX_SEARCH_CELLS,
  maxDimension = DEFAULT_MAX_SEARCH_DIMENSION,
} = {}) {
  const minRow = Math.min(start.row, goal.row)
  const maxRow = Math.max(start.row, goal.row)
  const minCol = Math.min(start.col, goal.col)
  const maxCol = Math.max(start.col, goal.col)
  const requiredHeight = maxRow - minRow + 1
  const requiredWidth = maxCol - minCol + 1
  if (requiredHeight > maxDimension || requiredWidth > maxDimension
    || requiredHeight * requiredWidth > maxCells) {
    throw new PathPlanningError(
      `The endpoints span ${requiredWidth}x${requiredHeight} cells, which exceeds the `
      + `${maxDimension}-cell dimension or ${maxCells}-cell search-window limit. `
      + 'Choose closer endpoints or return a smaller route.',
      {
        code: 'window-too-large',
        details: { requiredWidth, requiredHeight, maxCells, maxDimension },
      },
    )
  }

  let effectivePadding = Math.max(0, Math.floor(padding))
  let rect = null
  for (;;) {
    const row = Math.max(0, minRow - effectivePadding)
    const col = Math.max(0, minCol - effectivePadding)
    const bottom = Math.min(grid.height - 1, maxRow + effectivePadding)
    const right = Math.min(grid.width - 1, maxCol + effectivePadding)
    rect = { row, col, width: right - col + 1, height: bottom - row + 1 }
    if (rect.height <= maxDimension && rect.width <= maxDimension
      && rect.height * rect.width <= maxCells) break
    if (effectivePadding === 0) {
      throw new PathPlanningError(
        `The required search window ${rect.width}x${rect.height} exceeds the configured limits.`,
        { code: 'window-too-large', details: { ...rect, maxCells, maxDimension } },
      )
    }
    effectivePadding--
  }
  return { ...rect, padding: effectivePadding, cells: rect.width * rect.height, requestedPadding: padding }
}

/**
 * Read one bounded MarsGrid window and build the local field used by the
 * router. All raster access happens here; neighbour expansion is pure memory.
 */
export async function createMarsGridField(grid, {
  start,
  goal,
  padding = DEFAULT_SEARCH_PADDING_CELLS,
  maxCells = DEFAULT_MAX_SEARCH_CELLS,
  maxDimension = DEFAULT_MAX_SEARCH_DIMENSION,
} = {}) {
  if (!grid || typeof grid.readWindow !== 'function' || typeof grid.containsCell !== 'function') {
    throw new PathPlanningError('A MarsGrid-compatible provider with readWindow and containsCell is required.', {
      code: 'invalid-provider',
    })
  }
  assertEndpoint(grid, start, 'start')
  assertEndpoint(grid, goal, 'goal')
  const window = chooseSearchWindow(grid, start, goal, { padding, maxCells, maxDimension })
  const started = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
  const results = await Promise.all(SEARCH_LAYERS.map(layerId => (
    grid.readWindow(layerId, window, { clamp: false })
  )))
  const readMs = (typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()) - started
  const byLayer = Object.fromEntries(results.map(result => [result.layerId, result.values]))
  const actual = results[0]
  const field = createField({
    width: actual.width,
    height: actual.height,
    rowOffset: actual.row,
    colOffset: actual.col,
    transform: grid.transform,
    resolution: grid.resolution,
    radius: grid.crs?.semiMajorAxisMetres,
    standardParallelDegrees: grid.crs?.standardParallelDegrees,
    navigationValid: byLayer.navigationValid,
    movementCost: byLayer.movementCost,
    elevation: byLayer.elevation,
    slope: byLayer.slope,
    roughness: byLayer.roughness,
    geologyId: byLayer.geologyId,
    geologyLegend: new Map((grid.legend ?? []).map(entry => [entry.classId, entry])),
  })
  field.readMs = readMs
  field.searchWindow = window
  return field
}
