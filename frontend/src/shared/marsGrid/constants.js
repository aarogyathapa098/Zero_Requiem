// Canonical description of the SOLBOUND Mars terrain & geology grid.
//
// The eight GeoTIFFs are produced by the protected pipeline in
// `frontend/src/modes/map/nasa-data/`. This module only describes them; it never
// regenerates or writes raster data.

export const GEOLOGY_UNMAPPED = -1
export const GEOLOGY_CLASS_MIN = 0
export const GEOLOGY_CLASS_MAX = 13

export const MARS_RADIUS_M = 3396190
export const STANDARD_PARALLEL_DEG = 18.4663

// Verified from the transferred files on disk (and matching
// nasa-data/output/geology_quality_report.json).
// width = number of columns, height = number of rows.
export const EXPECTED_GRID = Object.freeze({
  width: 4456,
  height: 5067,
  totalCells: 4456 * 5067,
  pixelSize: 20,
  origin: [4328999.999999998, 1143420.0000000028],
  resolution: [20, -20],
  transform: [20, 0, 4328999.999999998, 0, -20, 1143420.0000000028],
  crsCitation: 'Jezero_Crater_Projection',
  standardParallelDegrees: STANDARD_PARALLEL_DEG,
  marsRadiusMetres: MARS_RADIUS_M,
})

export const GRID_LAYERS = Object.freeze({
  elevation: {
    id: 'elevation',
    file: 'elevation_m.tif',
    field: 'elevation_m',
    label: 'Elevation',
    units: 'm',
    dtype: 'float32',
    nodata: Number.NaN,
    kind: 'continuous',
  },
  slope: {
    id: 'slope',
    file: 'slope_deg.tif',
    field: 'slope_deg',
    label: 'Slope',
    units: 'deg',
    dtype: 'float32',
    nodata: Number.NaN,
    kind: 'continuous',
  },
  roughness: {
    id: 'roughness',
    file: 'roughness_std_m.tif',
    field: 'roughness_std_m',
    label: 'Roughness',
    units: 'm',
    dtype: 'float32',
    nodata: Number.NaN,
    kind: 'continuous',
  },
  validMask: {
    id: 'validMask',
    file: 'valid_mask.tif',
    field: 'valid_mask',
    label: 'Valid DEM',
    units: 'mask',
    dtype: 'uint8',
    nodata: 0,
    kind: 'mask',
  },
  movementCost: {
    id: 'movementCost',
    file: 'movement_cost.tif',
    field: 'movement_cost',
    label: 'Movement cost',
    units: 'multiplier',
    dtype: 'float32',
    nodata: Number.NaN,
    kind: 'continuous',
  },
  navigationValid: {
    id: 'navigationValid',
    file: 'navigation_valid.tif',
    field: 'navigation_valid',
    label: 'Navigable',
    units: 'mask',
    dtype: 'uint8',
    nodata: 0,
    kind: 'mask',
  },
  geologyId: {
    id: 'geologyId',
    file: 'geology_id.tif',
    field: 'geology_id',
    label: 'Geology class',
    units: 'class_id',
    dtype: 'int16',
    nodata: GEOLOGY_UNMAPPED,
    kind: 'categorical',
  },
  geologyCoverage: {
    id: 'geologyCoverage',
    file: 'geology_coverage.tif',
    field: 'geology_coverage',
    label: 'Geology coverage',
    units: 'mask',
    dtype: 'uint8',
    nodata: null,
    kind: 'mask',
  },
})

export const LAYER_ORDER = Object.freeze([
  'elevation',
  'slope',
  'roughness',
  'validMask',
  'movementCost',
  'navigationValid',
  'geologyId',
  'geologyCoverage',
])

export const REFERENCE_LAYER = 'elevation'
export const LEGEND_FILE = 'geology_legend.csv'
export const QUALITY_REPORT_FILE = 'geology_quality_report.json'

// Counts published by the completed pipeline QA
// (nasa-data/output/geology_quality_report.json). They are used as a baseline
// when the quality report is available, never to rewrite the data.
export const PIPELINE_BASELINE = Object.freeze({
  totalCells: 22578552,
  validDemCells: 22564575,
  invalidDemCells: 13977,
  navigableDemCells: 22545539,
  nonNavigableDemCells: 33013,
  mappedGeologyCells: 6686784,
  unmappedGeologyCells: 15891768,
  geologyClassCounts: Object.freeze({
    '-1': 15891768,
    0: 67727,
    1: 31869,
    2: 864492,
    3: 438793,
    4: 1747,
    5: 73875,
    6: 1418921,
    7: 643140,
    8: 465010,
    9: 142428,
    10: 1740064,
    11: 417756,
    12: 375973,
    13: 4989,
  }),
})
