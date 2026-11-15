import { runSearch } from './search.js'

/**
 * Dijkstra's algorithm. Used as an independent optimal-cost reference for A*;
 * it shares the same neighbours, traversability and edge costs.
 */
export function dijkstra(field, options = {}) {
  return runSearch(field, { ...options, useHeuristic: false, algorithm: 'dijkstra' })
}
