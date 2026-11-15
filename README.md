# Project Zero Requiem

**S.U.N.A IV** · NASA Space Apps Challenge concept

An interactive Mars exploration website created for the NASA Space Apps Challenge. It combines a Cesium 3D globe, a detailed 2D Jezero map, rover journeys, scientific source links, and a separate fictional game experience.

This is an independent prototype, not a NASA or USGS product. Mission data and mapped geology are identified below; characters, combat, Mark Watney's journey, visual effects, and game mechanics are fictional or illustrative.

## Contents

- [Explore the site](#explore-the-site)
- [What is in the site](#what-is-in-the-site)
- [How the map works](#how-the-map-works)
- [Game and route structure](#game-and-route-structure)
- [Run locally](#run-locally)
- [Project layout](#project-layout)
- [Optional data and configuration](#optional-data-and-configuration)
- [Data, science, and attribution](#data-science-and-attribution)
- [Reproducing bundled map data](#reproducing-bundled-map-data)
- [Deployment and troubleshooting](#deployment-and-troubleshooting)
- [Limits](#limits)

## Explore the site

1. Open `/` or `/map` and select **Explore Mars**. Drag the globe to rotate it, scroll or pinch to zoom, and use the on-screen controls to pause rotation, reset the camera, or enter fullscreen.
2. Choose a **point of interest** to fly to a region and open its story, NASA image, and source link. The locations include Jezero Crater, Olympus Mons, Valles Marineris, Gale Crater, Elysium Planitia, Hellas Planitia, Syrtis Major, and Cerberus Fossae.
3. Use **Science map layers** to choose the natural surface, MOLA elevation, CTX, HiRISE, or USGS geology. CTX and HiRISE cover selected regions rather than the whole planet. The MOLA and geology views include on-page legends.
4. At **Jezero Crater**, choose **See in 2D**. Pan the regional map by dragging, use the zoom buttons or mouse wheel, switch its raster layer, and select a named feature for its description and source. The 2D map is a page section that can scroll; interacting with the map controls its own zoom.
5. Choose **Rovers & stories** to trace Perseverance or Curiosity, fit a route, inspect its rover marker, and open NASA's mission map. The Mark Watney route is a pop-culture reference to *The Martian*, not a mission track.
6. Open **About this demo** for an explanation of the map's construction. Open **Game Mode** for the separate fictional game flow.

Audio is enabled by default in the map UI, but browser autoplay policy may delay playback until the first interaction. The sound control can mute it. Reduced-motion preferences affect map motion.

## What is in the site

- **Explore Mars (`/` and `/map`):** Rotate and zoom a 3D Mars globe; choose named places; switch between a natural surface, NASA MOLA elevation, regional CTX and HiRISE imagery, and a USGS geology overlay where coverage exists.
- **Jezero region:** Open a pannable 2D map with orbital imagery, locally bundled 20 m CTX DEM shaded relief, USGS SIM 3464 geology, named features, and Perseverance's route. A cursor readout shows terrain and geology grid values when optional local raster data is installed.
- **Rovers and stories:** Inspect bundled Perseverance and Curiosity traverse snapshots, view rover models, and follow official mission links. Mark Watney's route is identified as fiction.
- **About (`/about`):** Explains the globe, raster layers, rover models, routes, and sources.
- **Game (`/game`):** A separate menu, cutscene, loading, scanning, character discovery, and battle flow. Creatures and combat are fictional. These screens share progress utilities with older map-based expedition code, but that expedition component is not currently routed into `/game`.

The rover tracks are **bundled snapshots**, not live positions. NASA and USGS source pages are linked from the map and About views.

## How the map works

### 3D planetary view

`CesiumMarsHero.jsx` creates a Cesium viewer with `Cesium.Ellipsoid.MARS`. A local Mars texture provides the natural base appearance. When a science layer is selected, the viewer drapes a NASA Mars Trek image layer over the sphere. A Cesium ion tileset can add optional 3D terrain when an appropriate token is available. The atmosphere, lighting, and rotation are presentation effects.

Landmarks are defined in `marsLandmarks.js` as coordinates, descriptions, NASA source pages, and image credits. Cesium positions their markers on the Mars ellipsoid and updates their visibility as the camera moves. The controls include camera flight, zoom, rotation, fullscreen, imagery selection, point-of-interest visibility, and raster legends.

### 2D Jezero region

`JezeroMap.jsx` combines several layers in one pan-and-zoom view: a global MOLA base, regional CTX/HiRISE tiles where covered, a local shaded-relief image generated from the 20 m CTX DEM, and a transparent geology image derived from USGS SIM 3464. The layer selector changes the visible raster. A map legend names the current layer. NASA tiles arrive through the site's `/api/mars-tiles/` proxy; the relief and geology images are served from `frontend/public/jezero/`.

The map labels Jezero and nearby valleys, plains, and craters. Feature details link to the USGS Gazetteer or NASA. Jezero's panel includes a short formation and naming story. A selected Perseverance route can also be shown in this regional view.

### Routes and models

`marsRoutes.json` stores simplified longitude/latitude tracks for Perseverance and Curiosity. The UI converts those coordinates into positions on the Mars globe and connects them in order. The route cards report the date and link to current NASA mission maps. Rover GLB models are visual markers, not live telemetry. The fictional Watney path is stored separately within the same route data.

### Mars tile proxy

`marsTileProxy.js` accepts `/api/mars-tiles/{layer}/{z}/{y}/{x}` requests for an allowlist of Mars Trek layers. It checks the layer and tile coordinates, fetches the corresponding NASA tile, validates that the response is an image, and keeps a small in-memory cache. This middleware is attached to the Vite development server. A production deployment must provide an equivalent endpoint if it needs the live orbital tile layers.

## Game and route structure

The active route configuration is in `frontend/src/app/router.tsx`:

- `/` and `/map` — Mars map and globe.
- `/about` — map explanation and source links.
- `/game` and `/menu` — game menu.
- `/cutscene` — local intro video.
- `/loading` — transition screen that returns to `/map`.
- `/scan` and `/discover` — fictional character scanning and discovery.
- `/battle` — fictional character battle.

The game has six local character sprites and silhouettes. Scanning can record a discovered creature in browser saved progress; battle uses that scanned state and local sound effects. Its menu and cutscene lead back to the Mars map. The older `src/modes/map/game/MarsGame.jsx` expedition, including its illustrated walking map, science waypoints, and rover records, remains in the source tree but is not mounted by the active router. Its documentation in `src/modes/map/docs/MARS_GAME.md` is useful background, not a promise that those controls appear in the current `/game` flow.

## Run locally

Use Node.js **20.19+ or 22.12+** and npm (the installed Vite version's Node requirement).

```sh
git clone https://github.com/aarogyathapa098/Zero_Requiem.git
cd Zero_Requiem/frontend
npm install
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`. In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

From the repository root, the equivalent development command is `npm run dev` after installing dependencies in `frontend`.

### Build and checks

Run from `frontend`, or use the matching root scripts:

```sh
npm run build
npm run preview
npm run lint
npm run test
```

`npm run test:grid` runs Mars grid tests; `npm run validate:grid` checks the optional local raster set and needs the external files below. The build produces `frontend/dist/`. A static host must serve the single-page app with an `index.html` fallback for routes such as `/about` and `/battle`.

The root `package.json` forwards `dev`, `build`, `preview`, `lint`, `test`, `test:grid`, and `validate:grid` to `frontend`. It does not install frontend dependencies itself. Run `npm install` in `frontend` first.

## Project layout

```text
frontend/
  public/                     Static textures, audio, video, models, and Jezero images
  src/app/router.tsx          Active website routes
  src/modes/map/              Mars globe, Jezero map, About page, data, and older expedition code
  src/modes/game/             Current menu, cutscene, scan, discovery, and battle screens
  src/shared/marsGrid/        Read-only API for optional terrain and geology rasters
  marsTileProxy.js            NASA Mars Trek tile proxy used by Vite
  marsGridServer.js           Local grid response middleware
  vite.config.ts              Build and development server configuration
```

The map uses React, CesiumJS, and local assets. Vite proxies allowlisted NASA Mars Trek tiles through `/api/mars-tiles/...`. The 2D Jezero map is a separate React view. The game screens use local character and media assets; combat is not a NASA simulation.

The application is a React 19 single-page app with React Router, TypeScript and JavaScript modules, Vite, CesiumJS, Three.js, OpenLayers, and Lucide icons. `src/main.tsx` mounts the router. The map and game screens are lazy-loaded by route or component, so their larger assets are requested when needed.

## Optional data and configuration

- Optional 3D terrain uses Cesium ion asset `3644333`. Set `VITE_CESIUM_ION_TOKEN=your_token` in `frontend/.env.local` to enable it. `VITE_` variables are exposed to browser code, so use a scoped public client token.
- Orbital CTX, HiRISE, and MOLA tiles require internet access and a server that provides the Mars tile proxy. CTX and HiRISE coverage is regional.
- The SOLBOUND terrain/geology grid is optional. Its eight GeoTIFFs and legend belong in `frontend/src/modes/map/nasa-data/output/`. That directory is gitignored and absent from a clean clone. See the [Mars grid guide](frontend/src/modes/map/docs/MARS_GRID.md) for filenames, validation, and hosting details.
- The checked-in Jezero relief and geology images work independently of the optional grid. The original 20 m CTX DEM TIFF is not bundled.

### Optional SOLBOUND raster grid

The grid is a separate, read-only data layer for Jezero. It contains elevation, slope, roughness, source-DEM validity, movement cost, navigation validity, geology ID, and geology coverage rasters, plus a geology legend. Its verified array shape is **5,067 rows by 4,456 columns** at **20 m per cell**. Geology coverage and terrain validity are different flags: a cell may have one without the other.

The current 2D map uses the grid for its cursor readout when the files are available. It does not calculate a walking route or modify the rasters. The loader supports cell and longitude/latitude queries and uses HTTP range requests. Follow the [Mars grid guide](frontend/src/modes/map/docs/MARS_GRID.md) to provision the files and run validation; a clean Git clone does not contain this large dataset.

## Data, science, and attribution

**NASA Mars Trek** supplies MOLA elevation, CTX, and HiRISE tiles. Layer IDs and coverage bounds are in [`marsImagery.js`](frontend/src/modes/map/data/marsImagery.js). [Mars Trek API](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars).

The map uses these products for different purposes:

- **MGS MOLA:** A global color-shaded elevation view. Its colors represent elevation, not natural surface color.
- **MRO CTX:** Regional orbital mosaics that provide broad surface detail around selected locations.
- **MRO HiRISE:** Smaller, higher-resolution mosaics available around selected sites. The Jezero mosaic's displayed resolution is limited by coverage and screen zoom.
- **Local natural texture:** A bundled Mars image used as the globe's baseline and fallback, sourced separately from Solar System Scope.

**NASA MMGIS** supplied the Perseverance and Curiosity traverse coordinates bundled in [`marsRoutes.json`](frontend/src/modes/map/data/marsRoutes.json). Downloaded **14 November 2026**, these snapshots may be older than NASA's live maps. [Perseverance route data](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json) · [Curiosity route data](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json) · [Perseverance live map](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/) · [Curiosity live map](https://science.nasa.gov/mission/msl-curiosity/location-map/).

**USGS SIM 3464** supplies the Jezero/Nili Planum geologic units used for the local overlay. Cite Sun and Stack (2020), *Geologic map of Jezero crater and the Nili Planum region, Mars*, DOI [10.3133/sim3464](https://doi.org/10.3133/sim3464). Its 1:75,000 units provide regional context, not verification of a particular rock or sample. Named places link to the [USGS Gazetteer of Planetary Nomenclature](https://planetarynames.wr.usgs.gov/).

The geology image and compact polygon lookup are derived from the publication's geologic unit data. The display colors are the website's palette, not a reproduction of the published sheet's symbols. The source mapping can be offset from later rover-operations imagery by roughly 100–200 m, so a unit displayed under a waypoint must be treated as regional context.

The 2D relief is derived from a supplied 20 m CTX DEM, `M20_JezeroCrater_CTXDEM_20m.tif`; it is shaded elevation, not an optical photograph. NASA landmark images and source pages are listed in [`marsLandmarks.js`](frontend/src/modes/map/data/marsLandmarks.js). Rover models and bundled CZML sample data came from [Cesium sample data](https://github.com/CesiumGS/cesium/tree/main/Apps/SampleData). The globe also uses a [Solar System Scope Mars texture](https://www.solarsystemscope.com/textures/).

The older map-based expedition code places six educational waypoints along a Perseverance traverse and includes NASA-linked science notes. These notes describe Jezero generally; the waypoints are **not verified sample or outcrop locations**. Its illustrated terrain, aliens, and combat are fictional. The current game screens do not fetch live NASA data.

### Primary links to include in a Space Apps submission

- **Imagery and mapping:** [NASA Mars Trek viewer](https://trek.nasa.gov/mars/) and [Mars Trek tile API](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars).
- **Rover missions:** [Perseverance mission](https://science.nasa.gov/mission/mars-2020-perseverance/) and [Curiosity mission](https://science.nasa.gov/mission/msl-curiosity/).
- **Rover tracks:** [Perseverance MMGIS GeoJSON](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json) and [Curiosity MMGIS GeoJSON](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json).
- **Geology:** [USGS SIM 3464 publication and database](https://pubs.usgs.gov/publication/sim3464).
- **Place names:** [USGS Gazetteer](https://planetarynames.wr.usgs.gov/) and [Jezero's entry](https://planetarynames.wr.usgs.gov/Feature/14300).
- **Context:** [NASA Mars facts](https://science.nasa.gov/mars/facts/), [Perseverance live location map](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/), and [Curiosity live location map](https://science.nasa.gov/mission/msl-curiosity/location-map/).

These are the main dataset and mission references. The code also links individual landmark articles, images, and nearby place-name records. Their URLs are kept beside their content in `marsLandmarks.js`, `JezeroMap.jsx`, and `AboutPage.jsx`, so a source can be checked from the page where it appears.

### Asset credits and reuse

- The Mars surface texture is credited to [Solar System Scope](https://www.solarsystemscope.com/textures/), whose texture page describes its CC BY 4.0 terms. The three-dimensional rover assets and CZML sample came from [Cesium sample data](https://github.com/CesiumGS/cesium/tree/main/Apps/SampleData).
- The local font license files are `frontend/public/fonts/OFL-Manrope.txt` and `frontend/public/fonts/OFL-Barlow.txt`. Icons come from `lucide-react` under its package license.
- The Jezero relief PNG was derived from a supplied CTX DEM file. The original TIFF is not checked in. The optional SOLBOUND rasters are also excluded from Git because of their size.
- There is **no repository-wide `LICENSE` file** in this checkout. Do not assume that a code license, if added later, also licenses third-party imagery, fonts, models, or datasets. Keep the source and license information for each asset with the project submission.

See [asset sources and licenses](frontend/src/modes/map/docs/ASSETS.md) for additional credits and terms. Cite all NASA, USGS, and other sources used in a Space Apps submission. USGS-authored information is generally public domain, but individual third-party images can have separate terms. The [2026 Space Apps participant terms](https://www.spaceappschallenge.org/legal/) require source citations and applicable license documentation for non-NASA materials.

## Reproducing bundled map data

The checked-in `marsRoutes.json` is the dataset the site currently reads. To refresh it, download the `M20` and `MSL` traverse and current-waypoint GeoJSON files from NASA MMGIS into `frontend/src/modes/map/scripts/data/rovers/`, then run `node src/modes/map/scripts/buildRoverRoutes.mjs` from `frontend`. The script simplifies the real rover tracks and reads the fictional route from `frontend/public/mars/Mars.czml`. Its `retrieved` date is currently hard-coded to `2026-11-14`; update that date in the script when refreshing the source files, then review the generated route metadata before distributing the new snapshot.

The geology overlay can be regenerated from the USGS SIM 3464 database using `frontend/src/modes/map/scripts/build-sim3464.py`. Its source geodatabase must be downloaded and extracted separately. See the [map notes](frontend/src/modes/map/docs/README.md) for the expected location and Python dependencies. The checked-in PNG and compact lookup already let a clean clone display the geology overlay without rebuilding it.

The Jezero shaded relief was generated from the supplied 20 m CTX DEM. The script and georeferencing metadata are in the map module; the large source TIFF is not included in this repository. Rebuilding that PNG therefore requires access to the original supplied raster.

## Deployment and troubleshooting

The Vite build produces static files, but **static files alone do not provide the NASA Mars Trek tile proxy**. `vite.config.ts` attaches `/api/mars-tiles/` only to the development server. `npm run preview` serves the build for inspection, but it does not attach that tile proxy. For a deployed site to show live MOLA/CTX/HiRISE tiles, provide an equivalent server-side endpoint using the logic in `marsTileProxy.js`. The local globe texture and bundled Jezero images can still render without it.

If the optional grid is present at build time, Vite copies its rasters into `dist/mars-grid/`. A static host must support HTTP byte-range requests for GeoTIFF reads; otherwise, use a host or endpoint that does. The grid is absent in a clean clone, so its cursor readout may be unavailable until the data is provisioned.

Common checks:

- **Blank 3D globe:** Confirm that WebGL and hardware acceleration are available in the browser. The app shows a retry view if Cesium initialization fails.
- **Missing optional 3D terrain:** Confirm a valid, appropriately scoped Cesium ion token with access to asset `3644333`. The base globe can still work without this tileset.
- **Missing orbital imagery:** Check internet access and that `/api/mars-tiles/` is served by the deployment. Also check whether the selected CTX or HiRISE mosaic covers the chosen point.
- **Missing grid values:** Provision the eight GeoTIFFs and `geology_legend.csv` as described in the [grid guide](frontend/src/modes/map/docs/MARS_GRID.md). Set `VITE_MARS_GRID_BASE_URL` if the browser files are served from another URL, or `MARS_GRID_DATA_DIR` for Node validation against another local directory.
- **A direct link to `/about` or `/battle` returns 404:** Configure the host's SPA fallback to `index.html` while preserving the asset and API paths.
- **Audio does not start on page load:** Browsers can block autoplay. Interact with the page and use the sound control to retry or mute it.

## Limits

- This educational prototype is not a navigation or mission-planning tool.
- Rover positions, imagery mosaics, and labels reflect bundled or selected sources; no live mission telemetry is claimed.
- The optional grid provides read-only terrain queries; it does not implement pathfinding.
- Atmospheric effects, lighting, and fictional game content are not scientific observations.

For detail, see the [map notes](frontend/src/modes/map/docs/README.md), [Mars grid guide](frontend/src/modes/map/docs/MARS_GRID.md), and [asset inventory](frontend/src/modes/map/docs/ASSETS.md). Some older map/game notes describe an expedition component that is still in the repository but is not in the current route configuration.

## Contributors

Team: **zero_requiem**

- Aarogya Thapa
- Nischal Raj Joshi
- Nishkarsa Thapa Magar
- Shirbhooshan Razopadhyay
- Shaira Gurung
- Upashya Pathak