// Normalize a raw MEDA RSS feed entry into a stable observation object.
// Missing values in the feed are represented by '--'. Never convert them to 0.

export const MARTIAN_SOL_SECONDS = 24 * 3600 + 39 * 60 + 35

export function normalizeMedaSol(entry, fetchedAt = new Date()) {
  if (!entry || typeof entry !== 'object') return null
  const value = key => {
    const raw = entry[key]
    if (raw === '--' || raw === null || raw === undefined || raw === '') return null
    const number = Number(raw)
    return Number.isFinite(number) ? number : raw
  }
  const terrestrialDate = entry.terrestrial_date ?? null
  const sol = entry.sol ?? null
  const observation = {
    source: 'NASA Perseverance MEDA (RSS JSON feed)',
    sourceType: 'point-observation',
    location: 'Perseverance rover, Jezero Crater',
    spatialScope: 'single-rover-location',
    sol: sol !== null ? Number(sol) : null,
    terrestrialDate,
    solarLongitude: value('ls'),
    season: entry.season ?? null,
    minAirTempC: value('min_temp'),
    maxAirTempC: value('max_temp'),
    pressurePa: value('pressure'),
    sunrise: entry.sunrise ?? null,
    sunset: entry.sunset ?? null,
    fetchedAt: fetchedAt.toISOString(),
    raw: entry,
  }
  observation.freshness = assessFreshness(observation, fetchedAt)
  return observation
}

export function assessFreshness(observation, now = new Date()) {
  if (!observation || !observation.terrestrialDate) {
    return { status: 'unknown', ageDays: null, message: 'Observation timestamp is missing.' }
  }
  const observed = new Date(observation.terrestrialDate + 'T00:00:00Z')
  if (Number.isNaN(observed.getTime())) {
    return { status: 'unknown', ageDays: null, message: 'Observation timestamp could not be parsed.' }
  }
  const ageDays = (now.getTime() - observed.getTime()) / (24 * 3600 * 1000)
  if (ageDays < 0) {
    return { status: 'future-dated', ageDays, message: 'Observation timestamp is in the future relative to the client clock.' }
  }
  if (ageDays <= 7) {
    return { status: 'recent', ageDays, message: 'Latest available observation; not a forecast of future conditions.' }
  }
  if (ageDays <= 90) {
    return { status: 'stale', ageDays, message: 'Observation is more than a week old and should not be treated as current conditions.' }
  }
  return { status: 'historical', ageDays, message: 'Observation is historical and not representative of current conditions.' }
}

export function normalizeMedaFeed(payload, fetchedAt = new Date()) {
  const sols = Array.isArray(payload?.sols) ? payload.sols : []
  const observations = sols.map(entry => normalizeMedaSol(entry, fetchedAt)).filter(Boolean)
  const latest = observations.length ? observations[observations.length - 1] : null
  return {
    ok: observations.length > 0,
    source: 'NASA Perseverance MEDA weather feed (mars.nasa.gov RSS JSON)',
    sourceType: 'derived-outreach-feed',
    endpoint: 'https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json',
    fetchedAt: fetchedAt.toISOString(),
    observationCount: observations.length,
    observations,
    latest,
  }
}
