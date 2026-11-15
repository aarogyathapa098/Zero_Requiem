import { fetchMedaFeed } from '../providers/medaProvider.js'
import { normalizeMedaFeed } from '../normalization/weatherNormalizer.js'
import { WeatherCache } from './weatherCache.js'

const cache = new WeatherCache({ ttlMs: 30 * 60 * 1000 })

export async function getLatestMedaWeather({ forceRefresh = false, fetchImpl, signal } = {}) {
  const cacheKey = 'meda:latest'
  if (!forceRefresh) {
    const cached = cache.get(cacheKey)
    if (cached) return { ...cached, fromCache: true }
  }
  const result = await fetchMedaFeed({ fetchImpl, signal })
  if (!result.ok) {
    return {
      ok: false,
      source: 'NASA Perseverance MEDA weather feed (mars.nasa.gov RSS JSON)',
      sourceType: 'derived-outreach-feed',
      endpoint: 'https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json',
      fetchedAt: new Date().toISOString(),
      observationCount: 0,
      observations: [],
      latest: null,
      error: result.error,
      fromCache: false,
    }
  }
  const normalized = normalizeMedaFeed(result.payload, new Date())
  cache.set(cacheKey, normalized)
  return { ...normalized, fromCache: false }
}
