// Typed-array binary min-heap with decrease-key.
//
// One entry per local cell keeps memory predictable and avoids allocating an
// object for every neighbour relaxation. `position[index]` is the heap slot,
// -1 when absent, and -2 after the node has been popped.

export class CellPriorityQueue {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new TypeError('Heap capacity must be a positive integer.')
    this.indices = new Int32Array(capacity)
    this.priorities = new Float64Array(capacity)
    this.position = new Int32Array(capacity).fill(-1)
    this.size = 0
  }

  _swap(left, right) {
    const leftIndex = this.indices[left]
    const rightIndex = this.indices[right]
    this.indices[left] = rightIndex
    this.indices[right] = leftIndex
    this.position[leftIndex] = right
    this.position[rightIndex] = left
    const priority = this.priorities[left]
    this.priorities[left] = this.priorities[right]
    this.priorities[right] = priority
  }

  _siftUp(slot) {
    let current = slot
    while (current > 0) {
      const parent = (current - 1) >> 1
      if (this.priorities[parent] <= this.priorities[current]) break
      this._swap(parent, current)
      current = parent
    }
  }

  _siftDown(slot) {
    let current = slot
    const { size } = this
    for (;;) {
      const left = current * 2 + 1
      if (left >= size) break
      const right = left + 1
      let smallest = left
      if (right < size && this.priorities[right] < this.priorities[left]) smallest = right
      if (this.priorities[current] <= this.priorities[smallest]) break
      this._swap(current, smallest)
      current = smallest
    }
  }

  push(index, priority) {
    if (!Number.isFinite(priority)) throw new TypeError('Heap priority must be finite.')
    let slot = this.position[index]
    if (slot === -2) return false
    if (slot >= 0) {
      const previous = this.priorities[slot]
      this.priorities[slot] = priority
      if (priority < previous) this._siftUp(slot)
      else if (priority > previous) this._siftDown(slot)
      return true
    }
    slot = this.size++
    this.indices[slot] = index
    this.priorities[slot] = priority
    this.position[index] = slot
    this._siftUp(slot)
    return true
  }

  pop() {
    if (this.size === 0) return -1
    const top = this.indices[0]
    this.position[top] = -2
    this.size--
    if (this.size > 0) {
      const lastIndex = this.indices[this.size]
      this.indices[0] = lastIndex
      this.priorities[0] = this.priorities[this.size]
      this.position[lastIndex] = 0
      this._siftDown(0)
    }
    return top
  }
}
