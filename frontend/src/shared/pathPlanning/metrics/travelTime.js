// Estimated traverse duration.
//
// `movement_cost.tif` is a unitless terrain traversal-cost raster. It is not a
// speed, energy, or time measurement, so travel time is derived from a
// separate, explicitly labelled, configurable speed model.
//
// Two modes are supported:
//   - 'baseline':        one configurable average effective speed.
//   - 'terrain-adjusted': per-segment speed varies with slope and roughness.
//
// Durations are driving-time estimates, not total mission elapsed time.

export const MARTIAN_SOL_SECONDS = 24 * 3600 + 39 * 60 + 35 // 88,775 s

export const DEFAULT_TRAVEL_SPEED_CONFIG = Object.freeze({
  mode: 'baseline',
  nominalSpeedMPerS: 0.05,   // configurable baseline effective rover speed
  minSpeedMPerS: 0.01,
  maxSpeedMPerS: 0.20,
  slopeSlowdownMPerSPerDegree: 0.002,
  roughnessSlowdownMPerSPerMetre: 0.005,
  uphillPenaltyFactor: 1.25,
  downhillPenaltyFactor: 0.90,
  stationaryTimeSeconds: 0,
})

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value))
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null
}

function segmentSlope(field, fromIndex, toIndex, geometry) {
  const fromElevation = field.elevation[fromIndex]
  const toElevation = field.elevation[toIndex]
  if (!Number.isFinite(fromElevation) || !Number.isFinite(toElevation) || geometry.distance <= 0) return 0
  const rise = toElevation - fromElevation
  return Math.atan2(Math.abs(rise), geometry.distance) * (180 / Math.PI)
}

function segmentRoughness(field, fromIndex, toIndex) {
  const values = [field.roughness[fromIndex], field.roughness[toIndex]].filter(Number.isFinite)
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function estimateTravelTime(field, path, config = {}) {
  const settings = { ...DEFAULT_TRAVEL_SPEED_CONFIG, ...config }
  const minimumSpeed = Math.max(settings.minSpeedMPerS, 1e-6)
  const maximumSpeed = Math.max(settings.maxSpeedMPerS, minimumSpeed)
  const nominalSpeed = clamp(settings.nominalSpeedMPerS, minimumSpeed, maximumSpeed)

  const result = {
    mode: settings.mode === 'terrain-adjusted' ? 'terrain-adjusted' : 'baseline',
    totalDistanceMetres: 0,
    totalSeconds: 0,
    minutes: 0,
    hours: 0,
    minutesRemainder: 0,
    sols: 0,
    averageSpeedMPerS: null,
    segmentCount: 0,
    stationaryTimeSeconds: Math.max(0, settings.stationaryTimeSeconds || 0),
    assumptions: {
      nominalSpeedMPerS: nominalSpeed,
      minSpeedMPerS: minimumSpeed,
      maxSpeedMPerS: maximumSpeed,
      slopeSlowdownMPerSPerDegree: settings.slopeSlowdownMPerSPerDegree,
      roughnessSlowdownMPerSPerMetre: settings.roughnessSlowdownMPerSPerMetre,
      uphillPenaltyFactor: settings.uphillPenaltyFactor,
      downhillPenaltyFactor: settings.downhillPenaltyFactor,
    },
  }

  if (!Array.isArray(path) || path.length < 2) {
    result.totalSeconds = result.stationaryTimeSeconds
    result.minutes = result.totalSeconds / 60
    result.hours = Math.floor(result.minutes / 60)
    result.minutesRemainder = result.minutes - result.hours * 60
    result.sols = result.totalSeconds / MARTIAN_SOL_SECONDS
    return result
  }

  let totalSeconds = 0
  let segmentCount = 0
  for (let position = 1; position < path.length; position++) {
    const fromIndex = path[position - 1]
    const toIndex = path[position]
    const fromRow = (fromIndex / field.width) | 0
    const fromCol = fromIndex - fromRow * field.width
    const toRow = (toIndex / field.width) | 0
    const toCol = toIndex - toRow * field.width
    const dr = toRow - fromRow
    const dc = toCol - fromCol
    const diagonal = dr !== 0 && dc !== 0
    const distance = diagonal
      ? field.diagonalDistance
      : dr !== 0 ? field.verticalDistance : field.horizontalDistance
    if (!Number.isFinite(distance) || distance <= 0) continue

    let speed = nominalSpeed
    if (result.mode === 'terrain-adjusted') {
      const slope = segmentSlope(field, fromIndex, toIndex, { distance })
      const roughness = segmentRoughness(field, fromIndex, toIndex)
      speed = nominalSpeed
        - slope * (settings.slopeSlowdownMPerSPerDegree || 0)
        - roughness * (settings.roughnessSlowdownMPerSPerMetre || 0)
      speed = clamp(speed, minimumSpeed, maximumSpeed)
      const fromElevation = field.elevation[fromIndex]
      const toElevation = field.elevation[toIndex]
      if (Number.isFinite(fromElevation) && Number.isFinite(toElevation)) {
        if (toElevation > fromElevation) speed /= (settings.uphillPenaltyFactor || 1)
        else if (toElevation < fromElevation) speed *= (settings.downhillPenaltyFactor || 1)
        speed = clamp(speed, minimumSpeed, maximumSpeed)
      }
    }

    totalSeconds += distance / speed
    segmentCount++
    result.totalDistanceMetres += distance
  }

  totalSeconds += result.stationaryTimeSeconds
  result.totalSeconds = totalSeconds
  result.minutes = totalSeconds / 60
  result.hours = Math.floor(result.minutes / 60)
  result.minutesRemainder = result.minutes - result.hours * 60
  result.sols = totalSeconds / MARTIAN_SOL_SECONDS
  result.segmentCount = segmentCount
  result.averageSpeedMPerS = result.totalDistanceMetres > 0
    ? result.totalDistanceMetres / Math.max(1, totalSeconds - result.stationaryTimeSeconds)
    : null
  return result
}

export function formatTravelTime(travelTime) {
  if (!travelTime) return '—'
  const minutes = Math.round(travelTime.minutes)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours > 0) return `${hours} h ${remainingMinutes} min`
  return `${minutes} min`
}

export function formatMartianSols(sols) {
  if (!Number.isFinite(sols)) return '—'
  return `${sols.toFixed(3)} sols`
}
