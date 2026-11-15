// Public surface of the shared SOLBOUND route-planning subsystem.
//
// Typical browser usage:
//   import { planRoute } from '../../shared/pathPlanning/index.js'
//   const result = await planRoute(grid, { start, goal, objective })
//
// Typical test usage:
//   const field = createField({ ...typed arrays... })
//   const result = planRouteOnField(field, { start, goal })

export {
  DEFAULT_CANCEL_CHECK_INTERVAL,
  DEFAULT_MAX_SEARCH_CELLS,
  DEFAULT_MAX_SEARCH_DIMENSION,
  DEFAULT_ROUTE_OBJECTIVE,
  DEFAULT_SEARCH_PADDING_CELLS,
  NEIGHBOR_OFFSETS,
  ROUTE_OBJECTIVES,
  ROUTE_OBJECTIVE_VALUES,
  ROUTE_STATUS,
} from './constants.js'

export { PathPlanningError } from './errors.js'

export { astar } from './algorithms/astar.js'
export { dijkstra } from './algorithms/dijkstra.js'
export { runSearch } from './algorithms/search.js'

export {
  cellToIndex,
  createField,
  indexToGlobalCell,
  isCellNavigable,
  isUsableMovementCost,
  minimumMovementCost,
} from './core/field.js'
export { edgeCost, createHeuristic, octileDistance, stepGeometry } from './core/costModel.js'
export { NEIGHBOR_OFFSETS as DIRECTIONS, isTransitionAllowed, neighborIndex } from './core/neighbors.js'
export { reconstructPath } from './core/pathReconstruction.js'
export { validatePath } from './core/pathValidation.js'
export { chooseSearchWindow, createMarsGridField, SEARCH_LAYERS } from './core/gridField.js'
export { planRoute, planRouteOnField } from './core/planRoute.js'
export { pathToLonLat } from './core/coordinates.js'
export { computePathMetrics } from './metrics/pathMetrics.js'
