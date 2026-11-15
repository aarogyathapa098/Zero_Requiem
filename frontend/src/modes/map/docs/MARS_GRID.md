# SOLBOUND Mars grid

Shared, read-only access to the transferred SOLBOUND Mars terrain and geology
rasters. Components can query any grid cell by `(row, col)`, projected metres, or
planetocentric lon/lat without opening GeoTIFFs themselves.

The module lives in `frontend/src/shared/marsGrid/` and is independent of the 2D
Jezero map. `JezeroMap.jsx` is the first consumer: it shows the values under the
cursor in the map coordinate readout.

> This integration answers data queries only. It does **not** implement A\* or any
> other pathfinding. The cell/neighbour interface is ready for a future router.

## Data location

All eight rasters plus the legend are expected in:

```
frontend/src/modes/map/nasa-data/output/
```

That folder is gitignored (`**/nasa-data/`), so a clean clone does not contain it.
Provision the pipeline output externally (copy or Git LFS) before running the
browser integration or the Node checks.

| File | Field | dtype | NoData | Meaning |
| --- | --- | --- | --- | --- |
| `elevation_m.tif` | `elevation` | `float32` | NaN | Elevation, metres |
| `slope_deg.tif` | `slope` | `float32` | NaN | Slope, degrees |
| `roughness_std_m.tif` | `roughness` | `float32` | NaN | 3×3 roughness standard deviation, metres |
| `valid_mask.tif` | `validMask` | `uint8` | 0 | 1 = usable source DEM |
| `movement_cost.tif` | `movementCost` | `float32` | NaN | Traversal multiplier, finite range 1–5 |
| `navigation_valid.tif` | `navigationValid` | `uint8` | 0 | 1 = DEM valid **and** slope/roughness within limits |
| `geology_id.tif` | `geologyId` | `int16` | -1 | -1 = unmapped; 0–13 = mapped class |
| `geology_coverage.tif` | `geologyCoverage` | `uint8` | none | 1 = mapped geology, 0 = unmapped |

Supporting files:

- `geology_legend.csv` — 14 mapped classes (0–13) with symbol, unit name,
  resolution note, and conflict decision.
- `geology_quality_report.json` — optional QA report with counts and 15
  point-in-polygon sample cells. Used only for validation, never to rewrite data.

### Geometry

| Property | Value |
| --- | --- |
| Rows | 5,067 |
| Columns | 4,456 |
| Cells | 22,578,552 |
| Pixel size | 20 m × 20 m |
| Affine | `[20, 0, 4328999.999999998, 0, -20, 1143420.0000000028]` |
| CRS citation | `Jezero_Crater_Projection` |
| Sphere | Mars 2000, `R = 3,396,190 m` |
| Standard parallel | `18.4663°` |
| Projection | Equirectangular: `x = R·lon·cos(std)`, `y = R·lat` |

> **Dimension note:** the original task text described the grid as
> “4,456 rows × 5,067 columns”. The verified files are the transpose:
> **5,067 rows × 4,456 columns**, i.e. array shape `(5067, 4456)`. The loader and
> tests use rows ∕ columns as defined above.

Integer `(row, col)` addresses a cell; `(col + 0.5, row + 0.5)` is its centre.
`lonLatToCell` follows the projection above and can return out-of-grid cells.

## Mask semantics

These three masks are intentionally distinct and must not be conflated:

- **`validMask`** (`valid_mask.tif`) — the source DEM is usable. Invalid cells
  have NaN elevation. 22,564,575 valid / 13,977 invalid.
- **`navigationValid`** (`navigation_valid.tif`) — a stricter traversal mask that
  also excludes steep or rough cells. Every navigable cell is DEM-valid, but not
  every DEM-valid cell is navigable. 22,545,539 navigable / 33,013 blocked.
- **`geologyCoverage`** (`geology_coverage.tif`) — the geology map covers this
  cell. It equals `geologyId !== -1` exactly. 6,686,784 covered / 15,891,768
  unmapped.

A cell can be navigable with no geology, or have geology with no DEM. Always read
the flags instead of inferring one mask from another.

### Geology classes

- `geologyId = -1` means **unmapped**, not class 0.
- `0..13` are valid mapped classes; **class 0 must never be treated as NoData**.
  It is `Jezero fan 2 unit (NHjf2)` with 67,727 cells.
- The protected project decision `ORIG_FID 112 → class_id 5`
  (`Nili Planum 2 unit`, `Nnp2`) is preserved, and the legend exposes its
  `RESOLVED_BY_PROJECT_DECISION` note.
- Do not renumber, merge, or reinterpret classes in consumers. Join names through
  `getLegendEntry` / `getLegendClasses`.

## Browser usage

```js
import { openMarsGrid } from '../../shared/marsGrid/index.js'

const grid = await openMarsGrid()          // reads /mars-grid/ by default
try {
  const cell = await grid.queryLonLat(77.45, 18.44)
  // {
  //   inGrid: true,
  //   row, col,
  //   values: { elevation, slope, roughness, validMask, movementCost,
  //             navigationValid, geologyId, geologyCoverage },
  //   flags: { demValid, navigable, geologyMapped, geologyCovered, hasElevation },
  //   geology: { classId, symbol, name, ... } | null,
  //   center: { x, y }, lonLat: { lon, lat }
  // }

  const byCell = await grid.queryCell(2348, 1141) // out-of-grid → { inGrid: false }
  const window = await grid.readWindowAll({ row: 100, col: 200, width: 64, height: 64 })
  // window.values.<layer> is a row-major typed array

  grid.isNoData('elevation', Number.NaN) // true
  grid.containsCell(0, 0)                // true
  grid.getLegendEntry(5)                 // Nili Planum 2 unit (Nnp2)
} finally {
  await grid.close()
}
```

`queryCell` and `queryWorld` are cursor-friendly and return `{ inGrid: false }`
outside the grid. `readCell` throws `MarsGridRangeError` instead. `queryCell`
uses a 32×32-cell LRU block cache so nearby lookups do not re-fetch the same
byte ranges.

## Node usage

```js
import { openMarsGridFromDirectory } from '../../shared/marsGrid/index.js'

const grid = await openMarsGridFromDirectory('path/to/nasa-data/output')
const cell = await grid.readCell(4445, 721)
console.log(cell.values.geologyId) // 5
await grid.close()
```

`openMarsGridFromDirectory()` resolves `MARS_GRID_DATA_DIR` when no path is
passed. Missing folders or files produce an actionable error naming the path and
the missing files.

## Serving and configuration

In development and preview, `frontend/marsGridServer.js` exposes a whitelisted
`/mars-grid/` endpoint with HTTP Range support (206 / 416), streaming reads, and
JSON errors when data is absent. `GET /mars-grid/` returns the available file
list.

When `nasa-data/output/` exists at build time, the eight `.tif` files, legend, and
quality report are copied to `dist/mars-grid/` for static hosting. If the folder
is absent, the build still succeeds and the map reports the grid as unavailable.

| Setting | Scope | Default |
| --- | --- | --- |
| `VITE_MARS_GRID_BASE_URL` | Browser | `/mars-grid` |
| `MARS_GRID_DATA_DIR` | Node / middleware | `src/modes/map/nasa-data/output/` |
| `openMarsGrid({ baseUrl })` | Browser explicit override | — |
| `openMarsGridFromDirectory(dir)` | Node explicit override | — |

Static hosts must preserve HTTP Range responses; `geotiff` reads only the byte
ranges it needs.

## Validation

```sh
npm run test:grid      # loader, metadata, coordinates, masks, legend, deep scan
npm run test           # grid tests + existing camera tests
npm run validate:grid  # 74-check deep CLI report
npm run validate:grid -- --quick            # metadata + sample cells only
npm run validate:grid -- --json             # machine-readable report
npm run validate:grid -- --data-dir <path>  # alternate pipeline output
```

Last verified in this workspace:

- `npm run test:grid` — 12 passed, 1 skipped (missing-data case), 0 failed.
- `npm run test` — 14 passed, 1 skipped, 0 failed.
- `npm run validate:grid` — **PASS**, 74 checks, ~14 s, all counts and 15 sample
  cells match the pipeline QA.
- `npm run lint` — clean.
- `npm run build` — succeeds.
- Browser check of `/map` → **See in 2D** — cursor readout shows cell, elevation,
  slope, geology, DEM/navigation flags; `/mars-grid/*.tif` requests returned HTTP
  206.

The deep scan reproduces the authoritative totals: 22,564,575 valid DEM,
22,545,539 navigable, 6,686,784 mapped geology, 67,727 class 0.

`src/modes/map/scripts/mars.test.js` still fails on Node 24 because it imports
`.png` files (`ERR_UNKNOWN_FILE_EXTENSION`). That is pre-existing and unrelated to
the grid; `npm run test` intentionally runs the camera and grid suites only.

## Dependency

Raster reads use [`geotiff`](https://github.com/geotiffjs/geotiff.js)
`^3.1.0-beta.0`, declared explicitly in `frontend/package.json`. It was already
present transitively through OpenLayers; pinning it makes the grid independent of
`ol`'s dependency tree.

## Limitations

- Data is local-only and gitignored; there is no bundled fallback raster.
- The loader is read-only. It never regenerates rasters, edits `Nili.gdb`,
  changes classifications, or writes `movement_cost.tif`.
- No pathfinding, route smoothing, or cost accumulation is implemented.
- Browser reads depend on HTTP Range support from the host.
- The grid covers the transferred Jezero/Nili area only; positions outside it
  return `inGrid: false`.
