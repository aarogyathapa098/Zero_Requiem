import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { buildRecommendation } from '../index.js'

function route(overrides = {}) {
  return {
    ok: true,
    distanceMetres: 1000,
    traversalCost: 1000,
    metrics: {
      cellCount: 50,
      distanceMetres: 1000,
      traversalCost: 1000,
      maxSlope: 5,
      maxRoughness: 1,
      elevationGain: 10,
      travelTime: { totalSeconds: 1000, minutes: 16.67, sols: 0.011 },
    },
    environment: { available: false, freshness: { status: 'unavailable' }, warnings: [], cautions: [] },
    ...overrides,
  }
}

describe('route recommendation', () => {
  test('recommends the lower traversal-cost route and reports the percentage', () => {
    const primary = route({ traversalCost: 800, metrics: { ...route().metrics, traversalCost: 800, maxSlope: 4, maxRoughness: 0.8, travelTime: { totalSeconds: 800, minutes: 13.3, sols: 0.009 } } })
    const alternative = route({ traversalCost: 1000 })
    const recommendation = buildRecommendation(primary, alternative, { primaryObjective: 'Lowest traversal cost' })
    assert.equal(recommendation.confidence, 'moderate')
    assert.ok(recommendation.reasons.some(reason => reason.includes('lower accumulated traversal cost')))
    assert.ok(!recommendation.sameRoute)
  })

  test('reports identical routes when metrics match', () => {
    const primary = route()
    const alternative = route()
    const recommendation = buildRecommendation(primary, alternative)
    assert.equal(recommendation.sameRoute, true)
    assert.ok(recommendation.reasons.some(reason => reason.includes('same route')))
  })

  test('adds environmental and terrain warnings without fabricating data', () => {
    const primary = route({
      metrics: { ...route().metrics, maxSlope: 25, maxRoughness: 6 },
      environment: {
        available: true,
        freshness: { status: 'recent', ageDays: 1 },
        warnings: [],
        cautions: ['Environmental values are point observations at the Perseverance rover location and do not describe conditions along the entire route.'],
      },
    })
    const alternative = route()
    const recommendation = buildRecommendation(primary, alternative)
    assert.ok(recommendation.warnings.some(warning => warning.includes('25.0°')))
    assert.ok(recommendation.warnings.some(warning => warning.includes('rough terrain')))
    assert.ok(recommendation.warnings.some(warning => warning.includes('point observations')))
  })

  test('lowers confidence when terrain data is missing', () => {
    const primary = { ok: true, distanceMetres: 1000, traversalCost: 1000, metrics: null, environment: null }
    const recommendation = buildRecommendation(primary, null)
    assert.equal(recommendation.confidence, 'low')
  })
})