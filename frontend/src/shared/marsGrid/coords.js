// Coordinate helpers for the SOLBOUND Jezero grid.
//
// The eight GeoTIFFs use a custom equirectangular "Jezero_Crater_Projection":
//
//   x = R * lonRad * cos(standardParallel)
//   y = R * latRad
//
// with R = 3,396,190 m (Mars 2000 sphere), standard parallel 18.4663 degrees,
// central meridian 0, and no false easting/northing. Pixel (row, col) maps to
// world coordinates through the north-up affine transform
// [20, 0, 4_328_999.999999998, 0, -20, 1_143_420.0000000028].
//
// Continuous pixel coordinates are used inside this module: integer (row, col)
// addresses a cell, while (col + 0.5, row + 0.5) is that cell's centre.

import {
  EXPECTED_GRID,
  MARS_RADIUS_M,
  STANDARD_PARALLEL_DEG,
} from './constants.js'

const DEGREES_TO_RADIANS = Math.PI / 180
const RADIANS_TO_DEGREES = 180 / Math.PI

const DEFAULT_TRANSFORM = EXPECTED_GRID.transform
const DEFAULT_WIDTH = EXPECTED_GRID.width
const DEFAULT_HEIGHT = EXPECTED_GRID.height

function assertFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be a finite number, received ${value}`)
}

/** Metres per degree of longitude at the grid's standard parallel. */
export function metresPerDegreeLongitude(
  radius = MARS_RADIUS_M,
  standardParallelDegrees = STANDARD_PARALLEL_DEG,
) {
  return radius * DEGREES_TO_RADIANS * Math.cos(standardParallelDegrees * DEGREES_TO_RADIANS)
}

/** Metres per degree of latitude on the sphere. */
export function metresPerDegreeLatitude(radius = MARS_RADIUS_M) {
  return radius * DEGREES_TO_RADIANS
}

/**
 * Planetocentric (lon, lat) in degrees east/north -> projected world metres.
 */
export function lonLatToWorld(lon, lat, {
  radius = MARS_RADIUS_M,
  standardParallelDegrees = STANDARD_PARALLEL_DEG,
} = {}) {
  assertFinite(lon, 'lon')
  assertFinite(lat, 'lat')
  const longitudeMetres = metresPerDegreeLongitude(radius, standardParallelDegrees)
  return {
    x: lon * longitudeMetres,
    y: lat * metresPerDegreeLatitude(radius),
  }
}

/** Projected world metres -> planetocentric (lon, lat) in degrees. */
export function worldToLonLat(x, y, {
  radius = MARS_RADIUS_M,
  standardParallelDegrees = STANDARD_PARALLEL_DEG,
} = {}) {
  assertFinite(x, 'x')
  assertFinite(y, 'y')
  const longitudeMetres = metresPerDegreeLongitude(radius, standardParallelDegrees)
  return {
    lon: x / longitudeMetres,
    lat: y / metresPerDegreeLatitude(radius),
  }
}

/** Continuous pixel coordinates -> world metres. */
export function pixelToWorld(col, row, transform = DEFAULT_TRANSFORM) {
  assertFinite(col, 'col')
  assertFinite(row, 'row')
  const [a, b, c, d, e, f] = transform
  return {
    x: a * col + b * row + c,
    y: d * col + e * row + f,
  }
}

/** World metres -> continuous pixel coordinates. */
export function worldToPixel(x, y, transform = DEFAULT_TRANSFORM) {
  assertFinite(x, 'x')
  assertFinite(y, 'y')
  const [a, b, c, d, e, f] = transform
  const determinant = a * e - b * d
  if (!determinant) throw new Error('The grid affine transform is not invertible.')
  const dx = x - c
  const dy = y - f
  return {
    col: (e * dx - b * dy) / determinant,
    row: (-d * dx + a * dy) / determinant,
  }
}

/** Centre of an integer grid cell -> world metres. */
export function cellCenterToWorld(row, col, transform = DEFAULT_TRANSFORM) {
  return pixelToWorld(col + 0.5, row + 0.5, transform)
}

/** World metres -> integer cell containing the point. */
export function worldToCell(x, y, transform = DEFAULT_TRANSFORM) {
  const pixel = worldToPixel(x, y, transform)
  return {
    row: Math.floor(pixel.row),
    col: Math.floor(pixel.col),
    pixel,
  }
}

/** Centre of an integer grid cell -> planetocentric lon/lat. */
export function cellToLonLat(row, col, options = {}) {
  const { x, y } = cellCenterToWorld(row, col, options.transform ?? DEFAULT_TRANSFORM)
  return worldToLonLat(x, y, options)
}

/** Planetocentric lon/lat -> integer cell (may be outside the grid). */
export function lonLatToCell(lon, lat, options = {}) {
  const world = lonLatToWorld(lon, lat, options)
  const cell = worldToCell(world.x, world.y, options.transform ?? DEFAULT_TRANSFORM)
  return { ...cell, world }
}

/** Grid bounds in world metres (north-up affine is assumed). */
export function gridBounds(
  transform = DEFAULT_TRANSFORM,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
) {
  const topLeft = pixelToWorld(0, 0, transform)
  const bottomRight = pixelToWorld(width, height, transform)
  return {
    west: Math.min(topLeft.x, bottomRight.x),
    south: Math.min(topLeft.y, bottomRight.y),
    east: Math.max(topLeft.x, bottomRight.x),
    north: Math.max(topLeft.y, bottomRight.y),
  }
}

/** Grid bounds as [west, south, east, north]. */
export function gridBoundsArray(
  transform = DEFAULT_TRANSFORM,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
) {
  const bounds = gridBounds(transform, width, height)
  return [bounds.west, bounds.south, bounds.east, bounds.north]
}

/** True when the integer cell address is inside the grid. */
export function containsCell(
  row,
  col,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
) {
  return Number.isInteger(row) && Number.isInteger(col)
    && row >= 0 && row < height && col >= 0 && col < width
}

/** True when the world point is inside the grid footprint. */
export function containsWorld(x, y, transform = DEFAULT_TRANSFORM, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
  assertFinite(x, 'x')
  assertFinite(y, 'y')
  const pixel = worldToPixel(x, y, transform)
  return pixel.col >= 0 && pixel.col < width && pixel.row >= 0 && pixel.row < height
}

/** True when the lon/lat point is inside the grid footprint. */
export function containsLonLat(lon, lat, options = {}) {
  const world = lonLatToWorld(lon, lat, options)
  return containsWorld(
    world.x,
    world.y,
    options.transform ?? DEFAULT_TRANSFORM,
    options.width ?? DEFAULT_WIDTH,
    options.height ?? DEFAULT_HEIGHT,
  )
}
