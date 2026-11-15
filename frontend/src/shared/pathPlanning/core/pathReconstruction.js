/** Reconstruct a start→goal local-index path from a predecessor array. */
export function reconstructPath(parent, startIndex, goalIndex) {
  if (startIndex === goalIndex) return [startIndex]
  const reversed = []
  let current = goalIndex
  let guard = 0
  while (current !== -1 && guard <= parent.length) {
    reversed.push(current)
    if (current === startIndex) {
      reversed.reverse()
      return reversed
    }
    current = parent[current]
    guard++
  }
  return null
}
