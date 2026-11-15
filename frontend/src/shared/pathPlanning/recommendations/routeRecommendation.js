// Explainable route recommendation logic.
//
// Every statement produced here must be traceable to an actual calculation or
// an explicitly identified data source. No invented percentages or reasons.

function finite(value) {
  return Number.isFinite(value) ? value : null
}

function percentDifference(reference, candidate) {
  if (!Number.isFinite(reference) || reference === 0 || !Number.isFinite(candidate)) return null
  return ((candidate - reference) / reference) * 100
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return null
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function compareRouteMetrics(primary, alternative) {
  if (!primary?.metrics || !alternative?.metrics) return null
  const p = primary.metrics
  const a = alternative.metrics
  const pTime = primary.metrics?.travelTime?.totalSeconds ?? null
  const aTime = alternative.metrics?.travelTime?.totalSeconds ?? null
  return {
    distanceMetres: {
      primary: p.distanceMetres,
      alternative: a.distanceMetres,
      difference: a.distanceMetres - p.distanceMetres,
      percent: percentDifference(p.distanceMetres, a.distanceMetres),
    },
    traversalCost: {
      primary: p.traversalCost,
      alternative: a.traversalCost,
      difference: a.traversalCost - p.traversalCost,
      percent: percentDifference(p.traversalCost, a.traversalCost),
    },
    travelTimeSeconds: {
      primary: pTime,
      alternative: aTime,
      difference: (aTime !== null && pTime !== null) ? aTime - pTime : null,
      percent: percentDifference(pTime, aTime),
    },
    maxSlope: {
      primary: p.maxSlope,
      alternative: a.maxSlope,
      difference: (Number.isFinite(a.maxSlope) && Number.isFinite(p.maxSlope)) ? a.maxSlope - p.maxSlope : null,
    },
    maxRoughness: {
      primary: p.maxRoughness,
      alternative: a.maxRoughness,
      difference: (Number.isFinite(a.maxRoughness) && Number.isFinite(p.maxRoughness)) ? a.maxRoughness - p.maxRoughness : null,
    },
    elevationGain: {
      primary: p.elevationGain,
      alternative: a.elevationGain,
      difference: (Number.isFinite(a.elevationGain) && Number.isFinite(p.elevationGain)) ? a.elevationGain - p.elevationGain : null,
    },
    cellCount: {
      primary: p.cellCount,
      alternative: a.cellCount,
      difference: a.cellCount - p.cellCount,
    },
  }
}

export function buildRecommendation(primary, alternative, { primaryObjective } = {}) {
  const reasons = []
  const warnings = []
  const comparison = compareRouteMetrics(primary, alternative)

  if (primary?.ok && primary?.metrics) {
    reasons.push(`Selected route calculated successfully with ${primary.metrics.cellCount} cells over ${(primary.distanceMetres / 1000).toFixed(2)} km.`)
  }

  if (comparison) {
    const costPct = comparison.traversalCost.percent
    if (Number.isFinite(costPct) && costPct > 1) {
      reasons.push(`Primary route has ${Math.abs(costPct).toFixed(1)}% lower accumulated traversal cost than the alternative.`)
    } else if (Number.isFinite(costPct) && costPct < -1) {
      warnings.push(`Primary route has ${Math.abs(costPct).toFixed(1)}% higher accumulated traversal cost than the alternative.`)
    } else {
      reasons.push('Both routes have effectively equal accumulated traversal cost.')
    }

    const distPct = comparison.distanceMetres.percent
    if (Number.isFinite(distPct) && distPct > 1) {
      reasons.push(`Primary route is ${Math.abs(distPct).toFixed(1)}% shorter in physical distance than the alternative.`)
    } else if (Number.isFinite(distPct) && distPct < -1) {
      warnings.push(`Primary route is ${Math.abs(distPct).toFixed(1)}% longer in physical distance than the alternative.`)
    }

    const timePct = comparison.travelTimeSeconds.percent
    if (Number.isFinite(timePct) && timePct > 1) {
      reasons.push(`Primary route has an estimated ${Math.abs(timePct).toFixed(1)}% shorter travel duration than the alternative.`)
    } else if (Number.isFinite(timePct) && timePct < -1) {
      warnings.push(`Primary route has an estimated ${Math.abs(timePct).toFixed(1)}% longer travel duration than the alternative.`)
    }

    if (Number.isFinite(comparison.maxSlope.primary) && Number.isFinite(comparison.maxSlope.alternative)
      && comparison.maxSlope.primary < comparison.maxSlope.alternative - 1) {
      reasons.push(`Primary route avoids the steeper maximum slope (${comparison.maxSlope.primary.toFixed(1)}° vs ${comparison.maxSlope.alternative.toFixed(1)}°).`)
    } else if (Number.isFinite(comparison.maxSlope.primary) && Number.isFinite(comparison.maxSlope.alternative)
      && comparison.maxSlope.primary > comparison.maxSlope.alternative + 1) {
      warnings.push(`Primary route has a steeper maximum slope (${comparison.maxSlope.primary.toFixed(1)}° vs ${comparison.maxSlope.alternative.toFixed(1)}°).`)
    }

    if (Number.isFinite(comparison.maxRoughness.primary) && Number.isFinite(comparison.maxRoughness.alternative)
      && comparison.maxRoughness.primary < comparison.maxRoughness.alternative - 0.5) {
      reasons.push(`Primary route avoids rougher terrain (max roughness ${comparison.maxRoughness.primary.toFixed(2)} m vs ${comparison.maxRoughness.alternative.toFixed(2)} m).`)
    } else if (Number.isFinite(comparison.maxRoughness.primary) && Number.isFinite(comparison.maxRoughness.alternative)
      && comparison.maxRoughness.primary > comparison.maxRoughness.alternative + 0.5) {
      warnings.push(`Primary route crosses rougher terrain (max roughness ${comparison.maxRoughness.primary.toFixed(2)} m vs ${comparison.maxRoughness.alternative.toFixed(2)} m).`)
    }
  }

  if (primary?.metrics?.maxSlope >= 20) {
    warnings.push(`The route includes a segment with ${primary.metrics.maxSlope.toFixed(1)}° slope; terrain difficulty is elevated.`)
  }
  if (primary?.metrics?.maxRoughness >= 5) {
    warnings.push(`The route includes rough terrain (max roughness ${primary.metrics.maxRoughness.toFixed(2)} m).`)
  }

  const environment = primary?.environment
  if (environment) {
    if (!environment.available) {
      warnings.push('Environmental data are unavailable; this recommendation is based on terrain metrics only.')
    } else {
      if (environment.freshness?.status === 'stale' || environment.freshness?.status === 'historical') {
        warnings.push(`Environmental observation is ${Math.round(environment.freshness.ageDays)} days old and is not current conditions.`)
      }
      warnings.push('Environmental values are point observations at the Perseverance rover location and do not describe conditions along the entire route.')
    }
    for (const caution of environment.cautions || []) warnings.push(caution)
  }

  // Confidence.
  let confidence = 'moderate'
  const hasTerrain = Boolean(primary?.metrics)
  const hasEnvironment = Boolean(environment?.available)
  const freshEnvironment = environment?.freshness?.status === 'recent'
  if (hasTerrain && hasEnvironment && freshEnvironment) confidence = 'high'
  else if (hasTerrain && !hasEnvironment) confidence = 'moderate'
  else if (!hasTerrain) confidence = 'low'
  if (environment?.freshness?.status === 'historical') confidence = 'low'

  if (primaryObjective) {
    reasons.unshift(`Optimization objective: ${primaryObjective}.`)
  }

  const sameRoute = primary && alternative && primary.path?.length === alternative.path?.length
    && primary.distanceMetres === alternative.distanceMetres
    && primary.traversalCost === alternative.traversalCost
  if (sameRoute) {
    reasons.push('Both objectives produced the same route for this start and destination.')
  }

  return {
    recommendedId: primary?.ok ? 'primary' : null,
    confidence,
    reasons,
    warnings,
    comparison,
    sameRoute,
  }
}
