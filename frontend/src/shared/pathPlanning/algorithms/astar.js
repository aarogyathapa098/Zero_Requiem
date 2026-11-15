import { runSearch } from './search.js'

/** Standard 8-neighbour A* with an admissible octile heuristic. */
export function astar(field, options = {}) {
  return runSearch(field, { ...options, useHeuristic: true, algorithm: 'astar' })
}
