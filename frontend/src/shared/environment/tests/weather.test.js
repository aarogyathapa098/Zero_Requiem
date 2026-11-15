import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { assessFreshness, normalizeMedaFeed, normalizeMedaSol } from '../normalization/weatherNormalizer.js'
import { WeatherCache } from '../services/weatherCache.js'

describe('weather normalization', () => {
  test('preserves missing values as null instead of zero', () => {
    const observation = normalizeMedaSol({ terrestrial_date: '2024-04-24', sol: '1130', min_temp: '--', max_temp: -23.2, pressure: 777.1, season: 'late autumn' })
    assert.equal(observation.minAirTempC, null)
    assert.equal(observation.maxAirTempC, -23.2)
    assert.equal(observation.pressurePa, 777.1)
  })

  test('marks old observations as stale or historical', () => {
    const old = normalizeMedaSol({ terrestrial_date: '2020-01-01', sol: '1' })
    assert.ok(['stale', 'historical'].includes(old.freshness.status))
    const recent = normalizeMedaSol({ terrestrial_date: new Date().toISOString().slice(0, 10), sol: '2' })
    assert.equal(recent.freshness.status, 'recent')
  })

  test('normalizes a feed and reports observation count', () => {
    const normalized = normalizeMedaFeed({ sols: [{ terrestrial_date: '2024-04-24', sol: '1130', pressure: 777.1 }] })
    assert.equal(normalized.ok, true)
    assert.equal(normalized.observationCount, 1)
    assert.equal(normalized.latest.pressurePa, 777.1)
  })

  test('cache expires entries after ttl', () => {
    const cache = new WeatherCache({ ttlMs: 10 })
    cache.set('key', { value: 1 }, 0)
    assert.deepEqual(cache.get('key', 5), { value: 1 })
    assert.equal(cache.get('key', 20), null)
  })
})