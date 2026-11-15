// Public surface of the shared SOLBOUND Mars grid module.
//
// Typical browser usage:
//   import { openMarsGrid } from '../../shared/marsGrid/index.js'
//   const grid = await openMarsGrid()          // /mars-grid/ via Vite
//   const cell = await grid.queryLonLat(77.45, 18.44)
//
// Typical Node usage:
//   const grid = await openMarsGridFromDirectory('path/to/nasa-data/output')
//   await grid.queryCell(2348, 1141)

export {
  EXPECTED_GRID,
  GEOLOGY_CLASS_MAX,
  GEOLOGY_CLASS_MIN,
  GEOLOGY_UNMAPPED,
  GRID_LAYERS,
  LAYER_ORDER,
  LEGEND_FILE,
  MARS_RADIUS_M,
  PIPELINE_BASELINE,
  QUALITY_REPORT_FILE,
  REFERENCE_LAYER,
  STANDARD_PARALLEL_DEG,
} from './constants.js'

export {
  cellCenterToWorld,
  cellToLonLat,
  containsCell,
  containsLonLat,
  containsWorld,
  gridBounds,
  gridBoundsArray,
  lonLatToCell,
  lonLatToWorld,
  metresPerDegreeLatitude,
  metresPerDegreeLongitude,
  pixelToWorld,
  worldToCell,
  worldToLonLat,
  worldToPixel,
} from './coords.js'

export {
  DEFAULT_DATA_DIR_URL,
  DEFAULT_GRID_BASE_URL,
  REQUIRED_GRID_FILES,
  SERVED_GRID_FILES,
  gridFileUrl,
  missingGridFilesMessage,
  resolveGridBaseUrl,
  resolveMarsGridDataDir,
} from './config.js'

export {
  MarsGrid,
  openMarsGrid,
  openMarsGridFromDirectory,
  openMarsGridFromUrl,
  parseCsv,
  parseLegend,
} from './MarsGrid.js'

export {
  MarsGridAlignmentError,
  MarsGridDataError,
  MarsGridError,
  MarsGridRangeError,
} from './errors.js'

export { validateMarsGrid } from './validate.js'
