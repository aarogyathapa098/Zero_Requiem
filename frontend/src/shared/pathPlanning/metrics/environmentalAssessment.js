// Route-level environmental assessment.
//
// Weather data are point observations from the Perseverance rover location, not
// spatially distributed measurements for every grid cell. This module therefore
// never claims route-wide wind or temperature coverage; it reports the
// observation, its freshness, and its limited spatial relevance.

export function assessRouteEnvironment(routeResult, weather) {
  const assessment = {
    available: Boolean(weather?.ok && weather.latest),
    source: weather?.source ?? null,
    sourceType: weather?.sourceType ?? null,
    endpoint: weather?.endpoint ?? null,
    fetchedAt: weather?.fetchedAt ?? null,
    fromCache: Boolean(weather?.fromCache),
    observation: weather?.latest ?? null,
    spatialRelevance: 'point-observation-only',
    freshness: weather?.latest?.freshness ?? { status: 'unavailable', ageDays: null, message: 'No observation available.' },
    values: {
      minAirTempC: weather?.latest?.minAirTempC ?? null,
      maxAirTempC: weather?.latest?.maxAirTempC ?? null,
      pressurePa: weather?.latest?.pressurePa ?? null,
      solarLongitude: weather?.latest?.solarLongitude ?? null,
      season: weather?.latest?.season ?? null,
      sunrise: weather?.latest?.sunrise ?? null,
      sunset: weather?.latest?.sunset ?? null,
    },
    warnings: [],
    cautions: [],
    availableFields: [],
  }

  if (!assessment.available) {
    assessment.warnings.push('Environmental data are unavailable; the recommendation is based on terrain metrics only.')
    if (weather?.error) assessment.warnings.push(`Weather provider error: ${weather.error}`)
    return assessment
  }

  const freshness = assessment.freshness.status
  if (freshness === 'stale' || freshness === 'historical') {
    assessment.warnings.push(
      `The latest available observation is ${Math.round(assessment.freshness.ageDays)} days old and must not be treated as current conditions.`,
    )
  }
  if (freshness === 'future-dated') {
    assessment.warnings.push('The observation timestamp is in the future relative to the client clock; verify data provenance.')
  }

  assessment.availableFields = Object.entries(assessment.values)
    .filter(([, value]) => value !== null)
    .map(([key]) => key)

  if (assessment.availableFields.length === 0) {
    assessment.warnings.push('The latest observation contains no usable numeric environmental values.')
  }

  assessment.cautions.push(
    'MEDA observations are point measurements at the Perseverance rover location and do not provide wind speed, temperature, or pressure for every cell along this route.',
  )
  assessment.cautions.push(
    'No spatially distributed wind or temperature model is currently integrated; route-wide environmental exposure cannot be established.',
  )

  // Terrain-environment interaction cautions (only where supported by actual metrics).
  const metrics = routeResult?.metrics
  if (metrics) {
    if (Number.isFinite(metrics.maxSlope) && metrics.maxSlope >= 20) {
      assessment.cautions.push(`The route includes a segment with ${metrics.maxSlope.toFixed(1)}° slope; terrain difficulty is elevated regardless of weather.`)
    }
    if (Number.isFinite(metrics.maxRoughness) && metrics.maxRoughness >= 5) {
      assessment.cautions.push(`The route includes rough terrain (max roughness ${metrics.maxRoughness.toFixed(2)} m).`)
    }
  }

  return assessment
}
