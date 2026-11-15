// Route metrics derived from the actual grid values along a path.
// Physical distance and accumulated movement cost stay separate.

import { ROUTE_OBJECTIVES } from '../constants.js'
import { edgeCost, stepGeometry } from '../core/costModel.js'

function finiteAverage(sum, count) {
  return count > 0 ? sum / count : null
}

export function computePathMetrics(field, path, {
  objective = ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST,
} = {}) {
  const result = {
    distanceMetres: 0,
    distanceKm: 0,
    traversalCost: 0,
    objectiveCost: 0,
    objective,
    cellCount: path.length,
    directionChanges: 0,
    startElevation: null,
    endElevation: null,
    elevationGain: null,
    elevationLoss: null,
    elevationComplete: true,
    maxSlope: null,
    averageSlope: null,
    maxRoughness: null,
    averageRoughness: null,
    geology: {
      units: [],
      mappedCells: 0,
      unmappedCells: 0,
      totalCells: path.length,
    },
  }
  if (path.length === 0) return result

  let slopeSum = 0
  let slopeCount = 0
  let roughnessSum = 0
  let roughnessCount = 0
  let gain = 0
  let loss = 0
  let previousDirection = null
  const geologyCounts = new Map()

  for (let position = 0; position < path.length; position++) {
    const index = path[position]
    const elevation = field.elevation[index]
    if (Number.isFinite(elevation)) {
      if (position === 0) result.startElevation = elevation
      if (position === path.length - 1) result.endElevation = elevation
      if (position > 0) {
        const previousElevation = field.elevation[path[position - 1]]
        if (Number.isFinite(previousElevation)) {
          const change = elevation - previousElevation
          if (change > 0) gain += change
          else loss -= change
        } else {
          result.elevationComplete = false
        }
      }
    } else {
      result.elevationComplete = false
    }

    const slope = field.slope[index]
    if (Number.isFinite(slope)) {
      slopeSum += slope
      slopeCount++
      if (result.maxSlope === null || slope > result.maxSlope) result.maxSlope = slope
    }
    const roughness = field.roughness[index]
    if (Number.isFinite(roughness)) {
      roughnessSum += roughness
      roughnessCount++
      if (result.maxRoughness === null || roughness > result.maxRoughness) result.maxRoughness = roughness
    }

    const geologyId = field.geologyId[index]
    if (geologyId === -1) {
      result.geology.unmappedCells++
    } else {
      result.geology.mappedCells++
      geologyCounts.set(geologyId, (geologyCounts.get(geologyId) ?? 0) + 1)
    }

    if (position > 0) {
      const geometry = stepGeometry(field, path[position - 1], index)
      if (geometry) {
        result.distanceMetres += geometry.distance
        result.traversalCost += edgeCost(field, path[position - 1], index, geometry, ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST)
        result.objectiveCost += edgeCost(field, path[position - 1], index, geometry, objective)
        if (previousDirection) {
          if (previousDirection.dr !== geometry.dr || previousDirection.dc !== geometry.dc) result.directionChanges++
        }
        previousDirection = geometry
      }
    }
  }

  if (result.elevationComplete) {
    result.elevationGain = gain
    result.elevationLoss = loss
  }
  result.distanceKm = result.distanceMetres / 1000
  result.averageSlope = finiteAverage(slopeSum, slopeCount)
  result.averageRoughness = finiteAverage(roughnessSum, roughnessCount)

  const legend = field.geologyLegend ?? null
  result.geology.units = [...geologyCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([classId, cells]) => {
      const entry = legend?.get?.(classId) ?? null
      return {
        classId,
        cells,
        name: entry?.name ?? `Geology class ${classId}`,
        symbol: entry?.symbol ?? null,
        mapped: true,
      }
    })
  if (result.geology.unmappedCells > 0) {
    result.geology.units.push({
      classId: -1,
      cells: result.geology.unmappedCells,
      name: 'Unmapped geology',
      symbol: null,
      mapped: false,
    })
  }
  return result
}
