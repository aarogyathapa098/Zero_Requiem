import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  MARTIAN_SOL_SECONDS,
  DEFAULT_TRAVEL_SPEED_CONFIG,
  estimateTravelTime,
  formatMartianSols,
  formatTravelTime,
} from '../index.js'
import { createTestField } from './testField.js'

describe('travel time', () => {
  test('converts seconds to minutes, hours and Martian sols', () => {
    assert.equal(MARTIAN_SOL_SECONDS, 88775)
    const field = createTestField({ rows: ['..'] })
    const travel = estimateTravelTime(field, [0, 1], { nominalSpeedMPerS: 20 / 60, maxSpeedMPerS: 1 })
    assert.ok(Math.abs(travel.totalSeconds - 60) < 1e-6)
    assert.ok(Math.abs(travel.minutes - 1) < 1e-6)
    assert.equal(travel.hours, 0)
    assert.ok(Math.abs(travel.minutesRemainder - 1) < 1e-6)
    assert.ok(Math.abs(travel.sols - 60 / 88775) < 1e-9)
    assert.equal(formatTravelTime(travel), '1 min')
    assert.equal(formatMartianSols(travel.sols), `${travel.sols.toFixed(3)} sols`)
  })

  test('baseline and terrain-adjusted modes differ on sloped terrain', () => {
    const field = createTestField({
      rows: ['..'],
      elevations: [[0, 10]],
      slopes: [[0, 5]],
      roughness: [[0, 1]],
    })
    const baseline = estimateTravelTime(field, [0, 1], { mode: 'baseline', nominalSpeedMPerS: 0.1 })
    const adjusted = estimateTravelTime(field, [0, 1], { mode: 'terrain-adjusted', nominalSpeedMPerS: 0.1 })
    assert.equal(baseline.mode, 'baseline')
    assert.equal(adjusted.mode, 'terrain-adjusted')
    assert.ok(adjusted.totalSeconds >= baseline.totalSeconds)
  })

  test('handles zero-distance and single-cell routes', () => {
    const field = createTestField({ rows: ['..'] })
    const travel = estimateTravelTime(field, [0])
    assert.equal(travel.totalSeconds, 0)
    assert.equal(travel.segmentCount, 0)
  })

  test('never uses movement cost as speed', () => {
    const field = createTestField({ rows: ['..'], costs: [[999, 999]] })
    const travel = estimateTravelTime(field, [0, 1], { nominalSpeedMPerS: 0.1 })
    assert.ok(Number.isFinite(travel.totalSeconds))
    assert.equal(travel.assumptions.nominalSpeedMPerS, 0.1)
  })
})