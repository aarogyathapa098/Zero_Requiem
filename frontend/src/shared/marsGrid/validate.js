// Validation helpers for the shared Mars grid.
//
// `validateMarsGrid` performs metadata, alignment, legend and sample-cell
// checks without touching the raster files. With `{ deep: true }` it also
// streams every cell and compares the counts against the completed pipeline QA
// baseline. The optional `qualityReport` object is the parsed
// `geology_quality_report.json`; when supplied, its metadata, class counts and
// point-in-polygon sample cells are re-checked against the loaded rasters.

import {
  EXPECTED_GRID,
  GEOLOGY_CLASS_MAX,
  GEOLOGY_CLASS_MIN,
  GEOLOGY_UNMAPPED,
  GRID_LAYERS,
  LAYER_ORDER,
  LEGEND_FILE,
  PIPELINE_BASELINE,
  REFERENCE_LAYER,
} from './constants.js'

const TOLERANCE_METRES = 1e-3
const TOLERANCE_DEGREES = 1e-9

function approximately(left, right, tolerance = TOLERANCE_METRES) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance
}

function countsFromMap(map) {
  const output = {}
  for (const key of [...map.keys()].sort((left, right) => left - right)) output[key] = map.get(key)
  return output
}

function compareCountMaps(actualMap, expectedObject) {
  const keys = new Set([
    ...[...actualMap.keys()].map(key => String(key)),
    ...Object.keys(expectedObject),
  ])
  const mismatches = []
  for (const key of keys) {
    const expected = expectedObject[key] ?? 0
    const actual = actualMap.get(Number(key)) ?? 0
    if (actual !== expected) mismatches.push(`${key}: ${actual} != ${expected}`)
  }
  return mismatches
}

async function scanGrid(grid, blockRows) {
  const stats = {
    cells: 0,
    validMask: { 0: 0, 1: 0 },
    navigationValid: { 0: 0, 1: 0 },
    geologyCoverage: { 0: 0, 1: 0 },
    geology: new Map(),
    nan: { elevation: 0, slope: 0, roughness: 0, movementCost: 0 },
    navigationWithoutValid: 0,
    coverageMismatch: 0,
    geologyOutOfRange: 0,
    invalidMaskValues: 0,
    invalidNavigationValues: 0,
    invalidCoverageValues: 0,
    movementOutOfRange: 0,
    mappedGeologyCells: 0,
    classZeroCells: 0,
  }

  for (let row = 0; row < grid.height; row += blockRows) {
    const height = Math.min(blockRows, grid.height - row)
    const chunk = await grid.readWindowAll({ row, col: 0, width: grid.width, height })
    const {
      validMask,
      navigationValid,
      geologyId,
      geologyCoverage,
      elevation,
      slope,
      roughness,
      movementCost,
    } = chunk.values

    for (let index = 0; index < validMask.length; index++) {
      stats.cells++

      const valid = validMask[index]
      const navigable = navigationValid[index]
      const geology = geologyId[index]
      const coverage = geologyCoverage[index]

      if (valid === 0 || valid === 1) stats.validMask[valid]++
      else stats.invalidMaskValues++

      if (navigable === 0 || navigable === 1) stats.navigationValid[navigable]++
      else stats.invalidNavigationValues++

      if (coverage === 0 || coverage === 1) stats.geologyCoverage[coverage]++
      else stats.invalidCoverageValues++

      if (navigable === 1 && valid !== 1) stats.navigationWithoutValid++
      if ((geology === GEOLOGY_UNMAPPED) !== (coverage === 0)) stats.coverageMismatch++

      if (geology < GEOLOGY_CLASS_MIN && geology !== GEOLOGY_UNMAPPED) stats.geologyOutOfRange++
      if (geology > GEOLOGY_CLASS_MAX) stats.geologyOutOfRange++

      stats.geology.set(geology, (stats.geology.get(geology) ?? 0) + 1)
      if (geology === 0) stats.classZeroCells++
      if (geology >= GEOLOGY_CLASS_MIN) stats.mappedGeologyCells++

      if (!Number.isFinite(elevation[index])) stats.nan.elevation++
      if (!Number.isFinite(slope[index])) stats.nan.slope++
      if (!Number.isFinite(roughness[index])) stats.nan.roughness++
      if (!Number.isFinite(movementCost[index])) stats.nan.movementCost++
      else if (movementCost[index] < 1 || movementCost[index] > 5) stats.movementOutOfRange++
    }
  }

  return stats
}

function checkLayerMetadata(add, grid) {
  const reference = grid.layers[REFERENCE_LAYER]
  add(
    'grid_dimensions',
    grid.width === EXPECTED_GRID.width && grid.height === EXPECTED_GRID.height,
    `${grid.width} columns x ${grid.height} rows (expected ${EXPECTED_GRID.width} x ${EXPECTED_GRID.height})`,
  )
  add(
    'grid_total_cells',
    grid.totalCells === EXPECTED_GRID.totalCells,
    `${grid.totalCells.toLocaleString()} cells (expected ${EXPECTED_GRID.totalCells.toLocaleString()})`,
  )
  add(
    'grid_pixel_size',
    approximately(grid.resolution.x, EXPECTED_GRID.resolution[0])
      && approximately(grid.resolution.y, EXPECTED_GRID.resolution[1]),
    `${grid.resolution.x} x ${grid.resolution.y} m`,
  )
  add(
    'grid_transform',
    grid.transform.every((value, index) => approximately(value, EXPECTED_GRID.transform[index])),
    `[${grid.transform.join(', ')}]`,
  )
  add(
    'grid_crs',
    grid.crs.citation === EXPECTED_GRID.crsCitation
      && approximately(grid.crs.standardParallelDegrees, EXPECTED_GRID.standardParallelDegrees, TOLERANCE_DEGREES)
      && approximately(grid.crs.semiMajorAxisMetres, EXPECTED_GRID.marsRadiusMetres),
    `${grid.crs.citation}, standard parallel ${grid.crs.standardParallelDegrees} deg, R=${grid.crs.semiMajorAxisMetres} m`,
  )
  add(
    'grid_layer_order',
    LAYER_ORDER.every(layerId => Boolean(grid.layers[layerId])),
    `${Object.keys(grid.layers).length} layers loaded`,
  )

  for (const layerId of LAYER_ORDER) {
    const layer = grid.layers[layerId]
    const spec = GRID_LAYERS[layerId]
    const reasons = []
    if (layer.width !== reference.width || layer.height !== reference.height) reasons.push('dimensions')
    if (!approximately(layer.resolution.x, reference.resolution.x)) reasons.push('x resolution')
    if (!approximately(layer.resolution.y, reference.resolution.y)) reasons.push('y resolution')
    if (!approximately(layer.origin.x, reference.origin.x)) reasons.push('x origin')
    if (!approximately(layer.origin.y, reference.origin.y)) reasons.push('y origin')
    if (layer.crs.citation !== reference.crs.citation) reasons.push('CRS')
    add(
      `layer_alignment_${layerId}`,
      reasons.length === 0,
      reasons.length ? `misaligned: ${reasons.join(', ')}` : 'pixel-aligned with elevation_m.tif',
    )
    add(
      `layer_dtype_${layerId}`,
      layer.dtype === spec.dtype,
      `${layer.file}: ${layer.dtype} (expected ${spec.dtype})`,
    )
    const nodataOk = spec.nodata === null
      ? layer.declaredNoData === null
      : (Number.isNaN(spec.nodata)
        ? Number.isNaN(layer.declaredNoData)
        : Object.is(layer.declaredNoData, spec.nodata))
    add(
      `layer_nodata_${layerId}`,
      nodataOk,
      `${layer.file}: declared ${String(layer.declaredNoData)}, expected ${String(spec.nodata)}`,
    )
  }
}

function checkLegend(add, grid) {
  const entries = grid.getLegendClasses()
  add('legend_file', Boolean(LEGEND_FILE), `Loaded ${entries.length} classes from ${LEGEND_FILE}`)
  add('legend_class_count', entries.length === 14, `${entries.length} classes (expected 14)`)
  const ids = entries.map(entry => entry.classId).sort((left, right) => left - right)
  const expectedIds = Array.from({ length: 14 }, (_, index) => index)
  add(
    'legend_class_ids',
    ids.length === expectedIds.length && ids.every((id, index) => id === expectedIds[index]),
    `class IDs ${ids.join(', ')}`,
  )

  const classZero = grid.getLegendEntry(0)
  add(
    'legend_class_0',
    classZero?.name === 'Jezero fan 2 unit' && classZero?.symbol === 'NHjf2' && classZero.pixelCount > 0,
    classZero ? `class 0 = ${classZero.name} (${classZero.symbol}), ${classZero.pixelCount} pixels` : 'class 0 missing',
  )

  const classFive = grid.getLegendEntry(5)
  add(
    'legend_class_5_resolution',
    classFive?.name === 'Nili Planum 2 unit'
      && classFive?.symbol === 'Nnp2'
      && classFive?.conflictStatus === 'RESOLVED_BY_PROJECT_DECISION'
      && String(classFive?.conflictedOrigFids).replace(/[^0-9]/g, '') === '112',
    classFive
      ? `class 5 = ${classFive.name} (${classFive.symbol}), ${classFive.conflictStatus}, ORIG_FID ${classFive.conflictedOrigFids}`
      : 'class 5 missing',
  )

  const legendPixels = entries.reduce((total, entry) => total + entry.pixelCount, 0)
  add(
    'legend_pixel_count_sum',
    legendPixels === PIPELINE_BASELINE.mappedGeologyCells,
    `${legendPixels.toLocaleString()} pixels (expected ${PIPELINE_BASELINE.mappedGeologyCells.toLocaleString()})`,
  )

  const mismatches = []
  for (const entry of entries) {
    const expected = PIPELINE_BASELINE.geologyClassCounts[entry.classId]
    if (entry.pixelCount !== expected) mismatches.push(`${entry.classId}: ${entry.pixelCount} != ${expected}`)
  }
  add(
    'legend_counts_match_baseline',
    mismatches.length === 0,
    mismatches.length ? mismatches.join(', ') : 'all 14 class pixel counts match the pipeline baseline',
  )
}

function checkQualityReportMetadata(add, grid, qualityReport) {
  add(
    'quality_report_status',
    qualityReport?.qa_overall_status === 'PASS',
    `qa_overall_status = ${qualityReport?.qa_overall_status ?? 'missing'}`,
  )
  const reference = qualityReport?.stage_a_baseline?.reference_grid
  const reportTransform = Array.isArray(reference?.transform)
    ? reference.transform.slice(0, 6).map(Number)
    : (typeof reference?.transform === 'string'
      ? reference.transform.trim().split(/[,\s]+/).slice(0, 6).map(Number)
      : [])
  const transformMatches = reportTransform.length === 6
    && reportTransform.every((value, index) => approximately(value, grid.transform[index]))
  add(
    'quality_report_grid',
    reference?.width === grid.width
      && reference?.height === grid.height
      && transformMatches,
    reference
      ? `report grid ${reference.width}x${reference.height}, transform "${reference.transform}"`
      : 'report reference grid missing',
  )
  const reportCounts = qualityReport?.raster_value_distributions?.geology_id_counts
  const mismatches = reportCounts
    ? Object.entries(PIPELINE_BASELINE.geologyClassCounts)
      .filter(([key, value]) => reportCounts[key] !== value)
      .map(([key, value]) => `${key}: ${reportCounts[key]} != ${value}`)
    : ['report class counts missing']
  add(
    'quality_report_class_counts',
    mismatches.length === 0,
    mismatches.length ? mismatches.join(', ') : 'report class counts match the embedded baseline',
  )
}

async function checkSampleCells(add, grid, samples) {
  if (!samples?.length) {
    add('quality_report_samples', false, 'No point-in-polygon sample cells were supplied.')
    return
  }
  let failures = 0
  for (const sample of samples) {
    let cell
    try {
      cell = await grid.readCell(sample.row, sample.col)
    } catch (error) {
      failures++
      add(
        `sample_${sample.sample_type ?? `${sample.row}_${sample.col}`}`,
        false,
        `row ${sample.row}, col ${sample.col}: ${error.message}`,
      )
      continue
    }
    const expectedClass = sample.raster_class_id
    const expectedCoverage = sample.raster_coverage
    const ok = cell.values.geologyId === expectedClass
      && cell.values.geologyCoverage === expectedCoverage
    if (!ok) failures++
    add(
      `sample_${sample.sample_type ?? `${sample.row}_${sample.col}`}`,
      ok,
      `row ${sample.row}, col ${sample.col}: class ${cell.values.geologyId}/${expectedClass}, `
      + `coverage ${cell.values.geologyCoverage}/${expectedCoverage}`,
    )
  }

  const classZero = samples.find(sample => sample.sample_type === 'class_0_midpoint_pixel')
  if (classZero) {
    const cell = await grid.readCell(classZero.row, classZero.col)
    add(
      'sample_class_0_is_data',
      cell.values.geologyId === 0
        && !grid.isNoData('geologyId', cell.values.geologyId)
        && cell.flags.geologyMapped,
      `class 0 at row ${classZero.row}, col ${classZero.col} is valid mapped geology, not NoData`,
    )
  }

  const origFid112 = samples.find(sample => sample.sample_type === 'ORIG_FID_112_representative_pixel')
  if (origFid112) {
    const cell = await grid.readCell(origFid112.row, origFid112.col)
    const legend = grid.getLegendEntry(cell.values.geologyId)
    add(
      'sample_orig_fid_112',
      cell.values.geologyId === 5
        && legend?.name === 'Nili Planum 2 unit'
        && legend?.symbol === 'Nnp2',
      `row ${origFid112.row}, col ${origFid112.col}: class ${cell.values.geologyId}`
      + ` (${legend?.name ?? 'no legend'})`,
    )
  }

  add(
    'quality_report_samples_summary',
    failures === 0,
    `${samples.length - failures}/${samples.length} point-in-polygon sample cells match`,
  )
}

async function checkDeepCounts(add, grid, baseline, blockRows) {
  const stats = await scanGrid(grid, blockRows)
  const total = grid.totalCells
  add('deep_total_cells', stats.cells === total, `${stats.cells.toLocaleString()} cells scanned (expected ${total.toLocaleString()})`)
  add(
    'deep_valid_mask_values',
    stats.invalidMaskValues === 0,
    `${stats.invalidMaskValues} values outside 0/1`,
  )
  add(
    'deep_valid_mask_counts',
    stats.validMask[1] === baseline.validDemCells && stats.validMask[0] === baseline.invalidDemCells,
    `valid ${stats.validMask[1].toLocaleString()} / invalid ${stats.validMask[0].toLocaleString()} `
    + `(expected ${baseline.validDemCells.toLocaleString()} / ${baseline.invalidDemCells.toLocaleString()})`,
  )
  add(
    'deep_navigation_values',
    stats.invalidNavigationValues === 0,
    `${stats.invalidNavigationValues} values outside 0/1`,
  )
  add(
    'deep_navigation_counts',
    stats.navigationValid[1] === baseline.navigableDemCells
      && stats.navigationValid[0] === baseline.nonNavigableDemCells,
    `navigable ${stats.navigationValid[1].toLocaleString()} / blocked ${stats.navigationValid[0].toLocaleString()} `
    + `(expected ${baseline.navigableDemCells.toLocaleString()} / ${baseline.nonNavigableDemCells.toLocaleString()})`,
  )
  add(
    'deep_navigation_implies_valid',
    stats.navigationWithoutValid === 0,
    `${stats.navigationWithoutValid} navigable cells have valid_mask != 1`,
  )
  add(
    'deep_coverage_values',
    stats.invalidCoverageValues === 0,
    `${stats.invalidCoverageValues} values outside 0/1`,
  )
  add(
    'deep_coverage_counts',
    stats.geologyCoverage[1] === baseline.mappedGeologyCells
      && stats.geologyCoverage[0] === baseline.unmappedGeologyCells,
    `covered ${stats.geologyCoverage[1].toLocaleString()} / unmapped ${stats.geologyCoverage[0].toLocaleString()} `
    + `(expected ${baseline.mappedGeologyCells.toLocaleString()} / ${baseline.unmappedGeologyCells.toLocaleString()})`,
  )
  add(
    'deep_geology_values_in_range',
    stats.geologyOutOfRange === 0,
    `${stats.geologyOutOfRange} values outside -1 and ${GEOLOGY_CLASS_MIN}..${GEOLOGY_CLASS_MAX}`,
  )
  const geologyMismatches = compareCountMaps(stats.geology, baseline.geologyClassCounts)
  add(
    'deep_geology_counts',
    geologyMismatches.length === 0,
    geologyMismatches.length ? geologyMismatches.join(', ') : 'all 15 geology value counts match the pipeline baseline',
  )
  add(
    'deep_class_0_present',
    stats.classZeroCells === baseline.geologyClassCounts[0] && stats.classZeroCells > 0,
    `class 0 has ${stats.classZeroCells.toLocaleString()} cells (expected ${baseline.geologyClassCounts[0].toLocaleString()})`,
  )
  add(
    'deep_coverage_matches_geology',
    stats.coverageMismatch === 0,
    `${stats.coverageMismatch} cells where geology_coverage does not equal "geology_id != -1"`,
  )
  add(
    'deep_elevation_nodata',
    stats.nan.elevation === baseline.invalidDemCells,
    `${stats.nan.elevation.toLocaleString()} NaN elevation cells (expected ${baseline.invalidDemCells.toLocaleString()})`,
  )
  const nonNavigable = total - baseline.navigableDemCells
  add(
    'deep_derived_nodata',
    stats.nan.slope === nonNavigable
      && stats.nan.roughness === nonNavigable
      && stats.nan.movementCost === nonNavigable,
    `NaN slope ${stats.nan.slope.toLocaleString()}, roughness ${stats.nan.roughness.toLocaleString()}, `
    + `movement ${stats.nan.movementCost.toLocaleString()} (expected ${nonNavigable.toLocaleString()} each)`,
  )
  add(
    'deep_movement_cost_range',
    stats.movementOutOfRange === 0,
    `${stats.movementOutOfRange} finite movement costs outside 1..5`,
  )

  return {
    ...stats,
    geologyCounts: countsFromMap(stats.geology),
  }
}

/**
 * Validate an open MarsGrid.
 *
 * @returns {Promise<{ ok: boolean, checks: Array<{ id: string, ok: boolean, detail: string }>, summary: object }>}
 */
export async function validateMarsGrid(grid, {
  deep = false,
  qualityReport = null,
  baseline = PIPELINE_BASELINE,
  sampleChecks = null,
  blockRows = 256,
} = {}) {
  if (!grid || typeof grid.readWindowAll !== 'function') {
    throw new TypeError('validateMarsGrid expects an open MarsGrid instance.')
  }
  const checks = []
  const add = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail })

  add('grid_open', grid.isOpen, grid.isOpen ? 'Grid handles are open' : 'Grid is closed')
  checkLayerMetadata(add, grid)
  checkLegend(add, grid)
  if (qualityReport) checkQualityReportMetadata(add, grid, qualityReport)

  const samples = sampleChecks ?? qualityReport?.point_in_polygon_sample_checks ?? []
  if (samples.length || qualityReport) await checkSampleCells(add, grid, samples)
  else add('quality_report_samples', true, 'No quality report supplied; sample-cell checks skipped.')

  let deepStats = null
  if (deep) {
    deepStats = await checkDeepCounts(add, grid, baseline, blockRows)
  }

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      width: grid.width,
      height: grid.height,
      totalCells: grid.totalCells,
      layerCount: Object.keys(grid.layers).length,
      legendClasses: grid.getLegendClasses().length,
      deep: Boolean(deepStats),
      ...(deepStats
        ? {
          validDemCells: deepStats.validMask[1],
          navigableDemCells: deepStats.navigationValid[1],
          mappedGeologyCells: deepStats.mappedGeologyCells,
          classZeroCells: deepStats.classZeroCells,
          geologyClassCounts: deepStats.geologyCounts,
        }
        : {}),
    },
  }
}
