// Named routing objectives, statuses and neighbour rules shared by every
// path-planning algorithm. Keep this module free of React and grid-loading code.

export const ROUTE_OBJECTIVES = Object.freeze({
  LOWEST_TRAVERSAL_COST: 'lowest-traversal-cost',
  SHORTEST_DISTANCE: 'shortest-distance',
})

export const ROUTE_OBJECTIVE_VALUES = Object.freeze(Object.values(ROUTE_OBJECTIVES))
export const DEFAULT_ROUTE_OBJECTIVE = ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST

export const ROUTE_STATUS = Object.freeze({
  SUCCESS: 'success',
  INVALID_START: 'invalid-start',
  INVALID_GOAL: 'invalid-goal',
  INVALID_PATH: 'invalid-path',
  UNREACHABLE: 'unreachable',
  SEARCH_LIMIT: 'search-limit',
  CANCELLED: 'cancelled',
  WINDOW_TOO_LARGE: 'window-too-large',
  ERROR: 'error',
})

export const DEFAULT_SEARCH_PADDING_CELLS = 64
export const DEFAULT_MAX_SEARCH_CELLS = 1024 * 1024
export const DEFAULT_MAX_SEARCH_DIMENSION = 1536
export const DEFAULT_CANCEL_CHECK_INTERVAL = 2048

// Clockwise from north. `side` offsets are the two orthogonal cells that must
// also be navigable before a diagonal step is allowed.
export const NEIGHBOR_OFFSETS = Object.freeze([
  Object.freeze({ name: 'north', dr: -1, dc: 0, diagonal: false }),
  Object.freeze({ name: 'northeast', dr: -1, dc: 1, diagonal: true }),
  Object.freeze({ name: 'east', dr: 0, dc: 1, diagonal: false }),
  Object.freeze({ name: 'southeast', dr: 1, dc: 1, diagonal: true }),
  Object.freeze({ name: 'south', dr: 1, dc: 0, diagonal: false }),
  Object.freeze({ name: 'southwest', dr: 1, dc: -1, diagonal: true }),
  Object.freeze({ name: 'west', dr: 0, dc: -1, diagonal: false }),
  Object.freeze({ name: 'northwest', dr: -1, dc: -1, diagonal: true }),
])
