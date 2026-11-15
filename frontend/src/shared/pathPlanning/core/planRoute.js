import { astar } from '../algorithms/astar.js'
import {
  DEFAULT_ROUTE_OBJECTIVE,
  ROUTE_OBJECTIVE_VALUES,
  ROUTE_OBJECTIVES,
  ROUTE_STATUS,
} from '../constants.js'
import { PathPlanningError } from '../errors.js'
import { computePathMetrics } from '../metrics/pathMetrics.js'
import { estimateTravelTime } from '../metrics/travelTime.js'
import { pathToLonLat } from './coordinates.js'
import {
  cellToIndex,
  indexToGlobalCell,
  isCellNavigable,
  isUsableMovementCost,
  minimumMovementCost,
} from './field.js'
import { validatePath } from './pathValidation.js'
import { createMarsGridField } from './gridField.js'

function publicCell(field, index) {
  return pathToLonLat(field, [index])[0]
}

function emptyResult(status, message, { objective, start = null, goal = null, details = null, stats = null } = {}) {
  return {
    ok: false,
    status,
    message,
    objective,
    start,
    goal,
    path: [],
    distanceMetres: null,
    distanceKm: null,
    traversalCost: null,
    metrics: null,
    validation: null,
    geology: null,
    searchWindow: null,
    stats,
    details,
  }
}

function endpointProblem(field, cell, role) {
  if (!cell || !Number.isInteger(cell.row) || !Number.isInteger(cell.col)) {
    return {
      status: role === 'start' ? ROUTE_STATUS.INVALID_START : ROUTE_STATUS.INVALID_GOAL,
      reason: 'not-a-cell',
      message: `The ${role} must be a cell with integer row and column values.`,
    }
  }
  const index = cellToIndex(field, cell.row, cell.col)
  if (index < 0) {
    return {
      status: role === 'start' ? ROUTE_STATUS.INVALID_START : ROUTE_STATUS.INVALID_GOAL,
      reason: 'outside-search-window',
      message: `The ${role} cell (row ${cell.row}, col ${cell.col}) is outside the search window.`,
    }
  }
  if (!isCellNavigable(field, index)) {
    const reason = field.navigationValid[index] !== 1 ? 'not-navigable' : 'missing-movement-cost'
    return {
      status: role === 'start' ? ROUTE_STATUS.INVALID_START : ROUTE_STATUS.INVALID_GOAL,
      reason,
      message: reason === 'not-navigable'
        ? `The ${role} cell (row ${cell.row}, col ${cell.col}) is not navigable.`
        : `The ${role} cell (row ${cell.row}, col ${cell.col}) has no usable movement cost.`,
    }
  }
  return null
}

/**
 * Plan on an already-read field. Synchronous and UI-independent; the browser
 * uses this to reuse a cached window when only the objective changes.
 */
export function planRouteOnField(field, {
  start,
  goal,
  objective = DEFAULT_ROUTE_OBJECTIVE,
  maxExpansions = 0,
  shouldCancel = null,
  cancelInterval,
  travelSpeedConfig = null,
  environmentalAssessment = null,
} = {}) {
  if (!field || !Number.isInteger(field.cellCount)) {
    return emptyResult(ROUTE_STATUS.ERROR, 'A valid search field is required.', { objective })
  }
  if (!ROUTE_OBJECTIVE_VALUES.includes(objective)) {
    return emptyResult(
      ROUTE_STATUS.ERROR,
      `Unknown routing objective "${objective}". Expected one of: ${ROUTE_OBJECTIVE_VALUES.join(', ')}.`,
      { objective },
    )
  }

  const startProblem = endpointProblem(field, start, 'start')
  if (startProblem) return emptyResult(startProblem.status, startProblem.message, { objective, start, goal })
  const goalProblem = endpointProblem(field, goal, 'goal')
  if (goalProblem) return emptyResult(goalProblem.status, goalProblem.message, { objective, start, goal })

  const startIndex = cellToIndex(field, start.row, start.col)
  const goalIndex = cellToIndex(field, goal.row, goal.col)
  if (startIndex === goalIndex) {
    return emptyResult(
      ROUTE_STATUS.INVALID_GOAL,
      'Start and destination are the same cell.',
      { objective, start, goal },
    )
  }

  const minimumCost = minimumMovementCost(field)
  if (minimumCost === null) {
    return emptyResult(
      ROUTE_STATUS.ERROR,
      'The search window contains no navigable cells with a usable movement cost.',
      { objective, start, goal },
    )
  }

  const search = astar(field, {
    startIndex,
    goalIndex,
    objective,
    minimumCost,
    maxExpansions,
    shouldCancel,
    cancelInterval,
  })
  const window = field.searchWindow ?? field.window
  const stats = {
    ...search.stats,
    window: {
      row: window.row,
      col: window.col,
      width: window.width,
      height: window.height,
      cells: window.width * window.height,
      padding: window.padding ?? null,
    },
    windowReadMs: field.readMs ?? null,
  }

  if (!search.found) {
    const status = search.reason === 'cancelled' ? ROUTE_STATUS.CANCELLED
      : search.reason === 'search-limit' ? ROUTE_STATUS.SEARCH_LIMIT
        : search.reason === 'invalid-start' ? ROUTE_STATUS.INVALID_START
          : search.reason === 'invalid-goal' ? ROUTE_STATUS.INVALID_GOAL
            : ROUTE_STATUS.UNREACHABLE
    const message = search.reason === 'cancelled' ? 'Route calculation was cancelled.'
      : search.reason === 'search-limit'
        ? `Search stopped after ${search.stats.expanded} expanded cells before reaching the destination.`
        : `No navigable route connects the selected start and destination inside the `
          + `${window.width}x${window.height} search window.`
    const result = emptyResult(status, message, { objective, start, goal, stats })
    result.searchWindow = stats.window
    return result
  }

  const publicPath = pathToLonLat(field, search.path)
  const metrics = computePathMetrics(field, search.path, { objective })
  metrics.travelTime = estimateTravelTime(field, search.path, travelSpeedConfig || undefined)
  const validation = validatePath(field, {
    path: search.path,
    startIndex,
    goalIndex,
    objective,
    expectedCost: search.cost,
    expectedDistance: metrics.distanceMetres,
  })

  const success = validation.ok
  const status = success ? ROUTE_STATUS.SUCCESS : ROUTE_STATUS.INVALID_PATH
  const message = success
    ? `Calculated a ${metrics.cellCount}-cell route over ${(metrics.distanceMetres / 1000).toFixed(2)} km.`
    : `The calculated path failed validation: ${validation.issues.slice(0, 3).map(item => item.message).join(' ')}`

  return {
    ok: success,
    status,
    message,
    objective,
    start: publicCell(field, startIndex),
    goal: publicCell(field, goalIndex),
    path: publicPath,
    distanceMetres: metrics.distanceMetres,
    distanceKm: metrics.distanceKm,
    traversalCost: metrics.traversalCost,
    metrics,
    validation,
    geology: metrics.geology,
    environment: environmentalAssessment ?? null,
    searchWindow: stats.window,
    stats,
    details: null,
  }
}

function statusForError(error) {
  if (!(error instanceof PathPlanningError)) return ROUTE_STATUS.ERROR
  if (error.code === 'window-too-large') return ROUTE_STATUS.WINDOW_TOO_LARGE
  if (error.code === 'invalid-start') return ROUTE_STATUS.INVALID_START
  if (error.code === 'invalid-goal') return ROUTE_STATUS.INVALID_GOAL
  return ROUTE_STATUS.ERROR
}

function isField(value) {
  return Boolean(value && Number.isInteger(value.width) && Number.isInteger(value.height)
    && Number.isInteger(value.cellCount) && value.navigationValid && value.movementCost)
}

/**
 * Public entry point. Accepts a MarsGrid (async window read) or a field
 * (synchronous reuse) and always returns a structured result instead of
 * throwing for expected routing failures.
 */
export async function planRoute(provider, options = {}) {
  const { objective = DEFAULT_ROUTE_OBJECTIVE } = options
  if (isField(provider)) return planRouteOnField(provider, options)
  try {
    const field = await createMarsGridField(provider, options)
    return planRouteOnField(field, options)
  } catch (error) {
    const status = statusForError(error)
    const result = emptyResult(status, error.message ?? String(error), {
      objective,
      start: options.start ?? null,
      goal: options.goal ?? null,
      details: error.details ?? { code: error.code ?? null },
      stats: { fieldReadMs: null },
    })
    return result
  }
}

export { ROUTE_OBJECTIVES }
