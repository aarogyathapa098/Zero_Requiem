export class WeatherCache {
  constructor({ ttlMs = 30 * 60 * 1000 } = {}) {
    this.ttlMs = ttlMs
    this.entries = new Map()
  }

  get(key, now = Date.now()) {
    const entry = this.entries.get(key)
    if (!entry) return null
    if (now - entry.storedAt > this.ttlMs) {
      this.entries.delete(key)
      return null
    }
    return entry.value
  }

  set(key, value, now = Date.now()) {
    this.entries.set(key, { value, storedAt: now })
  }

  clear() {
    this.entries.clear()
  }
}
