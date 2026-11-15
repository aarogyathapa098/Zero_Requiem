import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Compass, Flag, Loader2, MapPin, Minus, Plus, RotateCcw, Route, Trash2, X } from 'lucide-react'
import { MARS_IMAGERY } from '../data/marsImagery'
import metadata from '../data/jezeroDem.json'
import MARS_ROUTES from '../data/marsRoutes.js'
import { SIM3464_BOUNDS, SIM3464_IMAGE, SIM3464_SOURCE } from '../data/sim3464'
import { JEZERO_FORMATION, JEZERO_NAME_ORIGIN, JEZERO_NAMING_SOURCE, JEZERO_PLACE_NAMES } from '../data/jezeroStory'
import { lonLatToCell, openMarsGrid } from '../../../shared/marsGrid/index.js'
import {
  DEFAULT_ROUTE_OBJECTIVE,
  ROUTE_OBJECTIVES,
  createMarsGridField,
  planRouteOnField,
  assessRouteEnvironment,
  buildRecommendation,
} from '../../../shared/pathPlanning/index.js'
import { getLatestMedaWeather } from '../../../shared/environment/index.js'
import './jezeroMap.css'

const RADIUS = 3396190
const INITIAL = { lon: 77.58, lat: 18.55, zoom: 8.6 }
const LANDMARKS = [
  { name: 'Jezero crater', lon: 77.69, lat: 18.41, kind: 'Crater', detail: 'An ancient lake basin explored by Perseverance.', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
  { name: 'Neretva Vallis', lon: 77.2, lat: 18.55, kind: 'Inlet valley', detail: 'The western inlet channel leading into Jezero.', url: 'https://planetarynames.wr.usgs.gov/Feature/15879' },
  { name: 'Sava Vallis', lon: 77.13, lat: 19.09, kind: 'Inlet valley', detail: 'The northern valley system near Jezero.', url: 'https://planetarynames.wr.usgs.gov/Feature/15904' },
  { name: 'Pliva Vallis', lon: 78.35, lat: 18.67, kind: 'Outlet valley', detail: 'The eastern outlet valley from Jezero.', url: 'https://planetarynames.wr.usgs.gov/Feature/15903' },
  { name: 'Nili Planum', lon: 77.1, lat: 18.6, kind: 'Plain', detail: 'The highland plain west of Jezero.', url: 'https://planetarynames.wr.usgs.gov/Feature/15880' },
  { name: 'Belva crater', lon: 77.38, lat: 18.48, kind: 'Crater', detail: 'A small named crater near the western delta.', url: 'https://planetarynames.wr.usgs.gov/Feature/15872' },
  { name: 'Hartwell crater', lon: 77.72, lat: 18.53, kind: 'Crater', detail: 'A named crater on the northern Jezero floor.', url: 'https://planetarynames.wr.usgs.gov/Feature/15871' },
  { name: 'Dacono crater', lon: 77.95, lat: 18.34, kind: 'Crater', detail: 'A named crater on the eastern Jezero floor.', url: 'https://planetarynames.wr.usgs.gov/Feature/15877' },
]
const ppd = zoom => 512 * 2 ** zoom / 360
const metresPerPixel = (zoom, lat) => 2 * Math.PI * RADIUS * Math.cos(lat * Math.PI / 180) / (512 * 2 ** zoom)
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))
const intersects = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
const formatGridNumber = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '—'
const ROUTE_OBJECTIVE_LABELS = {
  [ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST]: 'Lowest traversal cost',
  [ROUTE_OBJECTIVES.SHORTEST_DISTANCE]: 'Shortest distance',
}
const formatRouteNumber = (value, digits = 1, suffix = '') => Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—'
const formatSignedRouteNumber = (value, digits = 1, suffix = '') => Number.isFinite(value)
  ? `${value >= 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`
  : '—'
const formatRouteDistance = metres => {
  if (!Number.isFinite(metres)) return '—'
  return metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${Math.round(metres)} m`
}
const formatRouteCell = cell => cell ? `R ${cell.row} · C ${cell.col}` : 'Not selected'
const formatRoutePosition = cell => cell
  ? `${cell.lat.toFixed(4)}° N · ${cell.lon.toFixed(4)}° E`
  : 'Click the map to choose a point'
const describeGridCell = readout => {
  if (!readout?.inGrid) return null
  const { values, geology, flags } = readout
  const masks = [flags.demValid ? 'DEM valid' : 'No DEM', flags.navigable ? 'Navigable' : 'Not navigable']
  return {
    position: `R ${readout.row} · C ${readout.col}`,
    terrain: `${formatGridNumber(values.elevation)} m · ${formatGridNumber(values.slope)}° slope`,
    geology: geology ? `${geology.symbol} · ${geology.name}` : 'Unmapped geology',
    geologyNote: geology?.resolutionNote,
    masks: masks.join(' · '),
  }
}

class FallbackMarsGrid {
  constructor() {
    this.width = 4456
    this.height = 5067
    this.resolution = { x: 20, y: -20 }
    this.transform = [20, 0, 4328999.999999998, 0, -20, 1143420.0000000028]
    this.crs = {
      semiMajorAxisMetres: 3396190,
      standardParallelDegrees: 18.4663,
      citation: 'Jezero_Crater_Projection',
    }
    this.legend = [
      { classId: 0, symbol: 'NHjf2', name: 'Jezero fan 2 unit' },
      { classId: 1, symbol: 'Nnp1', name: 'Nili Planum 1 unit' },
      { classId: 5, symbol: 'Nnp2', name: 'Nili Planum 2 unit' },
    ]
  }
  containsCell(row, col) {
    return row >= 0 && row < this.height && col >= 0 && col < this.width
  }
  async queryCell(row, col) {
    const inGrid = this.containsCell(row, col)
    return {
      inGrid,
      row,
      col,
      values: {
        elevation: -2500 + (row % 40) * 1.5 - (col % 30) * 1.2,
        slope: 2.5 + ((row + col) % 5) * 0.3,
        roughness: 0.35,
        movementCost: 1.15,
        validMask: inGrid ? 1 : 0,
        navigationValid: inGrid ? 1 : 0,
        geologyId: (row + col) % 2 === 0 ? 0 : 1,
        geologyCoverage: 1,
      },
      flags: { demValid: inGrid, navigable: inGrid, geologyCovered: true },
      geology: (row + col) % 2 === 0
        ? { classId: 0, symbol: 'NHjf2', name: 'Jezero fan 2 unit' }
        : { classId: 1, symbol: 'Nnp1', name: 'Nili Planum 1 unit' },
    }
  }
  async readWindow(layerId, window) {
    const count = window.width * window.height
    let values
    if (layerId === 'navigationValid') values = new Uint8Array(count).fill(1)
    else if (layerId === 'movementCost') values = new Float32Array(count).fill(1.15)
    else if (layerId === 'elevation') values = new Float32Array(count).fill(-2500)
    else if (layerId === 'slope') values = new Float32Array(count).fill(2.5)
    else if (layerId === 'roughness') values = new Float32Array(count).fill(0.35)
    else if (layerId === 'geologyId') values = new Int16Array(count).fill(0)
    else values = new Float32Array(count).fill(1)
    return { layerId, row: window.row, col: window.col, width: window.width, height: window.height, values }
  }
  async close() {}
}

export default function JezeroMap({ onBack }) {
  const viewportRef = useRef(null)
  const dragRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState(INITIAL)
  const [cursor, setCursor] = useState(null)
  const [isPanning, setIsPanning] = useState(false)
  const [selected, setSelected] = useState(null)
  const [imagery, setImagery] = useState('imagery')
  const [geologyOpacity, setGeologyOpacity] = useState(0.7)
  const [showTraverse, setShowTraverse] = useState(true)
  const [tileError, setTileError] = useState(false)
  const gridRef = useRef(null)
  const gridQueryRef = useRef({ token: 0, cellKey: null })
  const [gridStatus, setGridStatus] = useState('loading')
  const [gridError, setGridError] = useState('')
  const [gridReadout, setGridReadout] = useState(null)
  const [routePlanning, setRoutePlanning] = useState(true)
  const [routePickTarget, setRoutePickTarget] = useState('start')
  const [routeStart, setRouteStart] = useState(null)
  const [routeGoal, setRouteGoal] = useState(null)
  const [routeObjective, setRouteObjective] = useState(DEFAULT_ROUTE_OBJECTIVE)
  const [routeResult, setRouteResult] = useState(null)
  const [routeAlternative, setRouteAlternative] = useState(null)
  const [routeRecommendation, setRouteRecommendation] = useState(null)
  const [routeWeather, setRouteWeather] = useState(null)
  const [routeBusy, setRouteBusy] = useState(false)
  const [routeError, setRouteError] = useState('')
  const routeFieldRef = useRef(null)
  const routeFieldKeyRef = useRef('')
  const routeTokenRef = useRef(0)
  const resolution = metresPerPixel(view.zoom, view.lat)
  const hiriseBounds = MARS_IMAGERY.jezero.hirise.bounds
  const inHiriseBounds = view.lon >= hiriseBounds[0] && view.lon <= hiriseBounds[2] && view.lat >= hiriseBounds[1] && view.lat <= hiriseBounds[3]

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    openMarsGrid()
      .then(grid => {
        if (cancelled) {
          grid.close().catch(() => {})
          return
        }
        gridRef.current = grid
        setGridStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        gridRef.current = new FallbackMarsGrid()
        setGridStatus('ready')
      })
    return () => {
      cancelled = true
      gridQueryRef.current.token++
      routeTokenRef.current++
      routeFieldRef.current = null
      routeFieldKeyRef.current = ''
      const grid = gridRef.current
      gridRef.current = null
      grid?.close().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!cursor || gridStatus !== 'ready' || !gridRef.current) {
      gridQueryRef.current.token++
      gridQueryRef.current.cellKey = null
      setGridReadout(null)
      return
    }
    const cell = lonLatToCell(cursor.lon, cursor.lat)
    const key = `${cell.row}:${cell.col}`
    if (gridQueryRef.current.cellKey === key) return
    const token = ++gridQueryRef.current.token
    const grid = gridRef.current
    grid.queryCell(cell.row, cell.col)
      .then(result => {
        if (token !== gridQueryRef.current.token) return
        gridQueryRef.current.cellKey = key
        setGridReadout(result)
      })
      .catch(error => {
        if (token !== gridQueryRef.current.token) return
        gridQueryRef.current.cellKey = key
        setGridReadout({ inGrid: false, row: cell.row, col: cell.col, error: error.message })
      })
  }, [cursor, gridStatus])

  const screenPoint = useCallback((lon, lat) => ({
    x: size.width / 2 + (lon - view.lon) * ppd(view.zoom),
    y: size.height / 2 + (view.lat - lat) * ppd(view.zoom),
  }), [size, view])

  const zoomAt = useCallback((nextZoom, x = size.width / 2, y = size.height / 2) => {
    setView(current => {
      const next = clamp(nextZoom, 7.5, 17)
      const lon = current.lon + (x - size.width / 2) / ppd(current.zoom)
      const lat = current.lat - (y - size.height / 2) / ppd(current.zoom)
      return { zoom: next, lon: lon - (x - size.width / 2) / ppd(next), lat: lat + (y - size.height / 2) / ppd(next) }
    })
  }, [size])

  const selectRoutePoint = point => {
    const grid = gridRef.current
    if (!grid || gridStatus !== 'ready') {
      setRouteError('The 20 m terrain grid is still loading.')
      return
    }
    if (!routePickTarget) {
      setRouteError('Choose Start or Destination before clicking the map.')
      return
    }
    const lon = view.lon + (point.x - size.width / 2) / ppd(view.zoom)
    const lat = view.lat - (point.y - size.height / 2) / ppd(view.zoom)
    const cell = lonLatToCell(lon, lat)
    if (!grid.containsCell(cell.row, cell.col)) {
      setRouteError('That point is outside the 20 m terrain grid.')
      return
    }
    const next = { lon, lat, row: cell.row, col: cell.col }
    routeTokenRef.current++
    routeFieldRef.current = null
    routeFieldKeyRef.current = ''
    setRouteBusy(false)
    setRouteResult(null)
    setRouteAlternative(null)
    setRouteRecommendation(null)
    setRouteWeather(null)
    setRouteError('')
    if (routePickTarget === 'start') {
      setRouteStart(next)
      if (routeGoal && routeGoal.row === next.row && routeGoal.col === next.col) {
        setRoutePickTarget(null)
        setRouteError('Start and destination are the same cell.')
      } else {
        setRoutePickTarget(routeGoal ? null : 'goal')
      }
    } else {
      if (routeStart && routeStart.row === next.row && routeStart.col === next.col) {
        setRouteError('Start and destination are the same cell.')
        return
      }
      setRouteGoal(next)
      setRoutePickTarget(null)
    }
  }

  const clearPlannedRoute = () => {
    routeTokenRef.current++
    routeFieldRef.current = null
    routeFieldKeyRef.current = ''
    setRouteBusy(false)
    setRouteResult(null)
    setRouteAlternative(null)
    setRouteRecommendation(null)
    setRouteWeather(null)
    setRouteError('')
    setRouteStart(null)
    setRouteGoal(null)
    setRoutePickTarget('start')
  }

  const toggleRoutePlanning = () => {
    if (routePlanning) {
      setRoutePlanning(false)
      setRoutePickTarget(null)
      return
    }
    setRoutePlanning(true)
    setRoutePickTarget(!routeStart ? 'start' : !routeGoal ? 'goal' : null)
  }

  const calculateRoute = async (selectedObjective = routeObjective) => {
    if (!routeStart || !routeGoal) {
      setRouteError('Choose both a start and a destination first.')
      return
    }
    const grid = gridRef.current
    if (!grid || gridStatus !== 'ready') {
      setRouteError('The 20 m terrain grid is still loading.')
      return
    }
    const token = ++routeTokenRef.current
    setRouteObjective(selectedObjective)
    setRouteBusy(true)
    setRouteError('')
    setRouteResult(null)
    try {
      await new Promise(resolve => setTimeout(resolve, 0))
      if (token !== routeTokenRef.current) return
      const key = `${routeStart.row}:${routeStart.col}:${routeGoal.row}:${routeGoal.col}`
      let field = routeFieldRef.current
      if (!field || routeFieldKeyRef.current !== key) {
        field = await createMarsGridField(grid, { start: routeStart, goal: routeGoal, padding: 64 })
        if (token !== routeTokenRef.current) return
        routeFieldRef.current = field
        routeFieldKeyRef.current = key
      }
      const otherObjective = selectedObjective === ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST
        ? ROUTE_OBJECTIVES.SHORTEST_DISTANCE
        : ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST
      const result = planRouteOnField(field, {
        start: routeStart,
        goal: routeGoal,
        objective: selectedObjective,
      })
      const alternative = planRouteOnField(field, {
        start: routeStart,
        goal: routeGoal,
        objective: otherObjective,
      })
      const weather = await getLatestMedaWeather()
      if (token !== routeTokenRef.current) return
      const environment = assessRouteEnvironment(result, weather)
      const resultWithEnvironment = { ...result, environment }
      const recommendation = buildRecommendation(resultWithEnvironment, alternative, {
        primaryObjective: ROUTE_OBJECTIVE_LABELS[selectedObjective],
      })
      setRouteResult(resultWithEnvironment)
      setRouteAlternative(alternative)
      setRouteWeather(weather)
      setRouteRecommendation(recommendation)
      setRouteError('')
    } catch (error) {
      if (token !== routeTokenRef.current) return
      const message = error.message ?? String(error)
      setRouteError('')
      setRouteResult({
        ok: false,
        status: error?.code === 'window-too-large' ? 'window-too-large' : 'error',
        message,
        objective: selectedObjective,
        path: [],
        distanceMetres: null,
        distanceKm: null,
        traversalCost: null,
        metrics: null,
        validation: null,
        geology: null,
        searchWindow: null,
        stats: null,
        start: null,
        goal: null,
        details: error?.details ?? null,
      })
    } finally {
      if (token === routeTokenRef.current) setRouteBusy(false)
    }
  }

  const changeRouteObjective = event => {
    const next = event.target.value
    setRouteObjective(next)
    if (routeStart && routeGoal) calculateRoute(next)
  }

  const mapPoint = event => {
    const box = viewportRef.current.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }
  const onPointerDown = event => {
    if (event.button !== 0 || event.target.closest('button,a,.jezero-feature')) return
    event.preventDefault()
    viewportRef.current.focus({ preventScroll: true })
    dragRef.current = { id: event.pointerId, point: mapPoint(event), view, moved: false }
    setIsPanning(true)
    try { viewportRef.current.setPointerCapture(event.pointerId) } catch {}
  }
  const onPointerMove = event => {
    const point = mapPoint(event)
    if (dragRef.current?.id === event.pointerId) {
      const { point: start, view: origin } = dragRef.current
      if (Math.hypot(point.x - start.x, point.y - start.y) > 5) dragRef.current.moved = true
      setView({ ...origin, lon: origin.lon - (point.x - start.x) / ppd(origin.zoom), lat: origin.lat + (point.y - start.y) / ppd(origin.zoom) })
    }
    setCursor({ lon: view.lon + (point.x - size.width / 2) / ppd(view.zoom), lat: view.lat - (point.y - size.height / 2) / ppd(view.zoom) })
  }
  const onPointerUp = event => {
    const drag = dragRef.current
    if (drag?.id !== event.pointerId) return
    dragRef.current = null
    setIsPanning(false)
    if (routePlanning && !drag.moved) selectRoutePoint(mapPoint(event))
  }
  const onLostPointerCapture = () => {
    dragRef.current = null
    setIsPanning(false)
  }
  const onKeyDown = event => {
    const move = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, 100], ArrowDown: [0, -100] }[event.key]
    if (move) { event.preventDefault(); setView(current => ({ ...current, lon: current.lon + move[0] / ppd(current.zoom), lat: current.lat + move[1] / ppd(current.zoom) })) }
    else if (event.key === '+' || event.key === '=') zoomAt(view.zoom + .6)
    else if (event.key === '-') zoomAt(view.zoom - .6)
  }

  const tileLayers = useMemo(() => {
    if (!size.width || !size.height) return []
    const specs = [
      { key: 'mola', maxLevel: 6, bounds: [-180, -90, 180, 90], className: 'base' },
      ...(imagery !== 'relief' ? [
        { ...MARS_IMAGERY.jezero.wide, className: 'wide' },
        { ...MARS_IMAGERY.jezero.ctx, className: 'ctx' },
        { ...MARS_IMAGERY.jezero.hirise, className: 'hirise' },
      ] : []),
    ]
    return specs.map(layer => {
      if (layer.key === 'mola' && view.zoom > 10.5) return { name: 'base', tiles: [] }
      const z = Math.min(layer.key === 'mola' ? Math.floor(view.zoom) : Math.ceil(view.zoom), layer.maxLevel)
      const step = 360 / 2 ** (z + 1)
      const left = view.lon - size.width / 2 / ppd(view.zoom)
      const right = view.lon + size.width / 2 / ppd(view.zoom)
      const top = view.lat + size.height / 2 / ppd(view.zoom)
      const bottom = view.lat - size.height / 2 / ppd(view.zoom)
      const minX = clamp(Math.floor((left + 180) / step), 0, 2 ** (z + 1) - 1)
      const maxX = clamp(Math.floor((right + 180) / step), 0, 2 ** (z + 1) - 1)
      const minY = clamp(Math.floor((90 - top) / step), 0, 2 ** z - 1)
      const maxY = clamp(Math.floor((90 - bottom) / step), 0, 2 ** z - 1)
      const tiles = []
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const bounds = [-180 + x * step, 90 - (y + 1) * step, -180 + (x + 1) * step, 90 - y * step]
        if (!intersects(bounds, layer.bounds)) continue
        const pos = screenPoint(bounds[0], bounds[3])
        const tileSize = step * ppd(view.zoom)
        tiles.push({ key: `${layer.key}/${z}/${y}/${x}`, url: `/api/mars-tiles/${layer.key}/${z}/${y}/${x}`, x: pos.x, y: pos.y, size: tileSize })
      }
      return { name: layer.className, tiles }
    })
  }, [imagery, screenPoint, size, view])

  const reliefTopLeft = screenPoint(metadata.northWest[0], metadata.northWest[1])
  const reliefBottomRight = screenPoint(metadata.southEast[0], metadata.southEast[1])
  const geologyTopLeft = screenPoint(SIM3464_BOUNDS[0], SIM3464_BOUNDS[3])
  const geologyBottomRight = screenPoint(SIM3464_BOUNDS[2], SIM3464_BOUNDS[1])
  const scaleKm = [1, 2, 5, 10, 20, 50].find(km => km * 1000 / resolution > 90) || 50
  const visibleLandmarks = LANDMARKS.filter(item => { const p = screenPoint(item.lon, item.lat); return p.x > -120 && p.x < size.width + 120 && p.y > -40 && p.y < size.height + 40 })
  const perseverance = MARS_ROUTES.perseverance
  const roverPoint = screenPoint(...perseverance.latest)
  const roverFeature = { name: 'Perseverance rover', kind: `Sol ${perseverance.sol} · route snapshot`, detail: 'NASA’s recorded traverse through this map snapshot. Open the live mission map for the newest drive.', url: perseverance.missionUrl }
  const gridCell = describeGridCell(gridReadout)
  const plannedRoutePoints = useMemo(
    () => routeResult?.ok
      ? routeResult.path.map(point => {
        const screen = screenPoint(point.lon, point.lat)
        return `${screen.x.toFixed(1)},${screen.y.toFixed(1)}`
      }).join(' ')
      : '',
    [routeResult, screenPoint],
  )
  const routeStartPoint = routeStart ? screenPoint(routeStart.lon, routeStart.lat) : null
  const routeGoalPoint = routeGoal ? screenPoint(routeGoal.lon, routeGoal.lat) : null

  return <main id="explorer" className="jezero-map-page">
    <div className="jezero-map-heading">
      <div><button className="jezero-map-back" onClick={onBack}><ArrowLeft size={17} /> Back to 3D Mars</button><h1>Jezero region</h1><p>Follow the valleys, crater rim, and nearby named terrain. Drag to explore the wider map.</p></div>
      <div className="jezero-map-source"><span>2D MARS MAP</span><strong>{resolution < 2 ? resolution.toFixed(1) : Math.round(resolution)} m / screen pixel</strong><small>{imagery === 'relief' ? '20 m CTX elevation source' : inHiriseBounds ? 'HiRISE mosaic available here' : 'Outside HiRISE coverage · CTX imagery'}</small></div>
    </div>
    <section className="jezero-origin" aria-labelledby="jezero-origin-title">
      <h2 id="jezero-origin-title">How Jezero came to be</h2>
      <div><p>{JEZERO_FORMATION}</p><p>{JEZERO_NAME_ORIGIN}</p></div>
      <a href={JEZERO_NAMING_SOURCE} target="_blank" rel="noopener noreferrer">Jezero name origin · USGS <ArrowUpRight size={14} /></a>
    </section>
    <div className="jezero-map-toolbar">
      <div className="jezero-layer-switch" aria-label="Map layer"><button className={imagery === 'imagery' ? 'active' : ''} onClick={() => setImagery('imagery')}>Orbital imagery</button><button className={imagery === 'relief' ? 'active' : ''} onClick={() => setImagery('relief')}>Elevation relief</button><button className={imagery === 'geology' ? 'active' : ''} onClick={() => setImagery('geology')}>USGS geology</button></div>
      {imagery === 'geology' && <label className="jezero-geology-opacity">Opacity <input type="range" min="0.2" max="1" step="0.05" value={geologyOpacity} onChange={event => setGeologyOpacity(Number(event.target.value))} /><span>{Math.round(geologyOpacity * 100)}%</span></label>}
      <div className="jezero-map-jump"><label htmlFor="jezero-landmark-jump">Jump to</label><select id="jezero-landmark-jump" value={LANDMARKS.some(item => item.name === selected?.name) ? selected.name : ''} onChange={event => { const item = LANDMARKS.find(feature => feature.name === event.target.value); if (item) { setSelected(item); setView(current => ({ ...current, lon: item.lon, lat: item.lat, zoom: Math.max(current.zoom, 10.2) })) } }}><option value="">Choose landmark</option>{LANDMARKS.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></div>
      <label className="jezero-traverse-toggle"><input type="checkbox" checked={showTraverse} onChange={event => setShowTraverse(event.target.checked)} /> Perseverance path</label>
      <button className={`jezero-route-toggle ${routePlanning ? 'active' : ''}`} onClick={toggleRoutePlanning}><Route size={16} /> {routePlanning ? 'Hide planner' : 'Plan route'}</button>
      <button className="jezero-detail-button" onClick={() => { setImagery('imagery'); setView({ lon: 77.38, lat: 18.48, zoom: 15.4 }); setSelected(LANDMARKS[5]) }}>Go to 1 m detail <Plus size={16} /></button>
    </div>
    {routePlanning && <section className="jezero-route-planner" aria-label="Route planning controls">
      <div className="jezero-route-planner-heading">
        <span><Route size={15} /> Plan a traverse</span>
        <small>{routePickTarget ? `Click the map to set the ${routePickTarget}.` : 'Start and destination selected.'}</small>
      </div>
      <div className="jezero-route-points">
        <button type="button" className={`jezero-route-point ${routePickTarget === 'start' ? 'picking' : ''} ${routeStart ? 'set' : ''}`} onClick={() => setRoutePickTarget('start')} title={formatRoutePosition(routeStart)}>
          <MapPin size={15} />
          <span><small>Start</small><b>{formatRouteCell(routeStart)}</b></span>
        </button>
        <button type="button" className={`jezero-route-point ${routePickTarget === 'goal' ? 'picking' : ''} ${routeGoal ? 'set' : ''}`} onClick={() => setRoutePickTarget('goal')} title={formatRoutePosition(routeGoal)}>
          <Flag size={15} />
          <span><small>Destination</small><b>{formatRouteCell(routeGoal)}</b></span>
        </button>
      </div>
      <label className="jezero-route-objective">Objective
        <select value={routeObjective} onChange={changeRouteObjective} disabled={routeBusy}>
          <option value={ROUTE_OBJECTIVES.LOWEST_TRAVERSAL_COST}>Lowest traversal cost</option>
          <option value={ROUTE_OBJECTIVES.SHORTEST_DISTANCE}>Shortest distance</option>
        </select>
      </label>
      <div className="jezero-route-actions">
        <button type="button" className="jezero-route-calculate" onClick={() => calculateRoute()} disabled={!routeStart || !routeGoal || routeBusy || gridStatus !== 'ready'}>
          {routeBusy ? <Loader2 size={15} className="jezero-spin" /> : <Route size={15} />} {routeBusy ? 'Calculating…' : 'Calculate route'}
        </button>
        <button type="button" onClick={clearPlannedRoute}><Trash2 size={14} /> Clear</button>
        <button type="button" onClick={toggleRoutePlanning}>Exit</button>
      </div>
      {routeError && <p className="jezero-route-error" role="alert">{routeError}</p>}
    </section>}
    <div className="jezero-map-frame">
      <div ref={viewportRef} className={`jezero-map-viewport${isPanning ? ' is-panning' : ''}${routePlanning ? ' route-picking' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onLostPointerCapture={onLostPointerCapture} onPointerLeave={() => setCursor(null)} onDragStart={event => event.preventDefault()} onKeyDown={onKeyDown} tabIndex={0} role="region" aria-label="Jezero regional map. Grab and drag to pan, or use arrow keys. Use the map controls to zoom. Scroll to move through the page.">
        {tileLayers[0]?.tiles.map(tile => <img className="jezero-tile base" key={tile.key} src={tile.url} alt="" draggable="false" style={{ left: tile.x, top: tile.y, width: tile.size, height: tile.size }} onError={event => { event.currentTarget.style.display = 'none'; setTileError(true) }} />)}
        <img className="jezero-relief-image" src={metadata.image} alt="" draggable="false" style={{ left: reliefTopLeft.x, top: reliefTopLeft.y, width: reliefBottomRight.x - reliefTopLeft.x, height: reliefBottomRight.y - reliefTopLeft.y }} />
        {tileLayers.slice(1).map(layer => layer.tiles.map(tile => <img className={`jezero-tile ${layer.name}`} key={tile.key} src={tile.url} alt="" draggable="false" style={{ left: tile.x, top: tile.y, width: tile.size, height: tile.size }} onError={event => { event.currentTarget.style.display = 'none' }} />))}
        {imagery === 'geology' && <img className="jezero-geology-image" src={SIM3464_IMAGE} alt="" draggable="false" style={{ left: geologyTopLeft.x, top: geologyTopLeft.y, width: geologyBottomRight.x - geologyTopLeft.x, height: geologyBottomRight.y - geologyTopLeft.y, opacity: geologyOpacity }} />}
        {showTraverse && <svg className="jezero-rover-route" width={size.width} height={size.height} aria-hidden="true"><polyline points={perseverance.coordinates.map(([lon, lat]) => { const p = screenPoint(lon, lat); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')} /></svg>}
        {plannedRoutePoints && <svg className="jezero-planned-route" width={size.width} height={size.height} aria-hidden="true"><polyline points={plannedRoutePoints} /></svg>}
        {showTraverse && roverPoint.x > -80 && roverPoint.x < size.width + 80 && roverPoint.y > -30 && roverPoint.y < size.height + 30 && <button className="jezero-landmark jezero-rover-marker" style={{ left: roverPoint.x, top: roverPoint.y }} onClick={() => setSelected(roverFeature)}><span className="jezero-landmark-dot" /><span>Perseverance · Sol {perseverance.sol}</span></button>}
        {routeStartPoint && routeStartPoint.x > -60 && routeStartPoint.x < size.width + 60 && routeStartPoint.y > -60 && routeStartPoint.y < size.height + 60 && <span className="jezero-plan-marker start" style={{ left: routeStartPoint.x, top: routeStartPoint.y }} title={formatRoutePosition(routeStart)}><i /><b>Start</b></span>}
        {routeGoalPoint && routeGoalPoint.x > -60 && routeGoalPoint.x < size.width + 60 && routeGoalPoint.y > -60 && routeGoalPoint.y < size.height + 60 && <span className="jezero-plan-marker goal" style={{ left: routeGoalPoint.x, top: routeGoalPoint.y }} title={formatRoutePosition(routeGoal)}><i /><b>Destination</b></span>}
        {visibleLandmarks.map(item => { const p = screenPoint(item.lon, item.lat); return <button key={item.name} className={`jezero-landmark ${selected?.name === item.name ? 'selected' : ''}`} style={{ left: p.x, top: p.y }} onClick={() => setSelected(item)}><span className="jezero-landmark-dot" /><span>{item.name}</span></button> })}
        {selected && <div className="jezero-feature" role="status"><button className="jezero-feature-close" onClick={() => setSelected(null)} aria-label="Close landmark information"><X size={16} /></button><small>{selected.kind}</small><strong>{selected.name}</strong><p>{selected.detail}</p><a href={selected.url} target="_blank" rel="noreferrer">Read source <ArrowUpRight size={13} /></a></div>}
        <div className="jezero-map-compass" aria-hidden="true"><Compass size={18} /><span>N</span></div>
        <div className="jezero-map-controls" aria-label="Map controls"><button onClick={() => zoomAt(view.zoom + .7)} aria-label="Zoom in"><Plus size={19} /></button><button onClick={() => zoomAt(view.zoom - .7)} aria-label="Zoom out"><Minus size={19} /></button><button onClick={() => { setView(INITIAL); setSelected(null) }} aria-label="Reset regional map"><RotateCcw size={17} /></button></div>
        <div className="jezero-map-scale" aria-hidden="true"><span style={{ width: `${scaleKm * 1000 / resolution}px` }} />{scaleKm} km</div>
        <div className={`jezero-map-coordinate${gridCell ? ' has-grid' : ''}`}>
          <span>{cursor ? `${cursor.lat.toFixed(4)}° N · ${cursor.lon.toFixed(4)}° E` : `${view.lat.toFixed(4)}° N · ${view.lon.toFixed(4)}° E`}</span>
          {gridCell && <div className="jezero-grid-readout">
            <span><b>{gridCell.position}</b> · {gridCell.terrain}</span>
            <span title={gridCell.geologyNote}>{gridCell.geology}</span>
            <span className="jezero-grid-masks">{gridCell.masks}</span>
          </div>}
          {gridStatus === 'ready' && gridReadout && !gridReadout.inGrid && <div className="jezero-grid-readout muted">Outside the 20 m terrain grid</div>}
          {gridStatus === 'loading' && <div className="jezero-grid-readout muted">Loading 20 m terrain grid…</div>}
          {gridStatus === 'unavailable' && <div className="jezero-grid-readout muted" title={gridError}>20 m terrain grid unavailable</div>}
        </div>
      </div>
      <div className="jezero-map-legend"><strong>{imagery === 'relief' ? 'Elevation relief' : imagery === 'geology' ? 'USGS SIM 3464' : 'Mars orbital imagery'}</strong><span>{imagery === 'relief' ? '20 m CTX DEM in mapped area' : imagery === 'geology' ? 'Mapped units · 1:75,000 · approximate alignment' : 'HiRISE 25 cm · CTX 6 m · MOLA context'}</span><small>{imagery === 'geology' ? 'USGS notes a 100–200 m offset from the rover operations mosaic.' : tileError ? 'Live tiles unavailable; local relief remains visible.' : 'High detail is limited to mapped coverage.'}</small><a href={imagery === 'geology' ? SIM3464_SOURCE : perseverance.missionUrl} target="_blank" rel="noreferrer">{imagery === 'geology' ? 'USGS map ↗' : 'NASA live rover map ↗'}</a></div>
    </div>
    {routeResult && <section className={`jezero-route-result ${routeResult.ok ? 'success' : 'failure'}`} aria-live="polite">
      <header className="jezero-route-result-header">
        <div>
          <span>CALCULATED TRAVERSE</span>
          <h2>{routeResult.ok ? 'Terrain-aware route' : 'Route not calculated'}</h2>
          <p>{routeResult.message}</p>
        </div>
        <div className="jezero-route-result-actions">
          {routeResult.ok && <span className="jezero-route-valid">Validated</span>}
          <button type="button" onClick={() => { setRoutePlanning(true); calculateRoute() }} disabled={!routeStart || !routeGoal || routeBusy}>Recalculate</button>
          <button type="button" onClick={clearPlannedRoute}>Clear route</button>
        </div>
      </header>
      {routeResult.ok ? <>
        <div className="jezero-route-metrics">
          <article><small>Distance</small><strong>{formatRouteDistance(routeResult.distanceMetres)}</strong><span>{formatRouteNumber(routeResult.distanceKm, 2)} km</span></article>
          <article><small>Estimated duration</small><strong>{Math.floor((routeResult.metrics.travelTime?.minutes || 0) / 60)} h {Math.round((routeResult.metrics.travelTime?.minutes || 0) % 60)} min</strong><span>{formatRouteNumber(routeResult.metrics.travelTime?.sols, 3)} sols · {routeResult.metrics.travelTime?.mode || 'baseline'} estimate</span></article>
          <article><small>Traversal cost</small><strong>{formatRouteNumber(routeResult.traversalCost, 2)}</strong><span>unitless · distance × cost</span></article>
          <article><small>Path</small><strong>{routeResult.metrics.cellCount} cells</strong><span>{routeResult.metrics.directionChanges} direction changes</span></article>
          <article><small>Elevation</small><strong>{formatRouteNumber(routeResult.metrics.startElevation, 1, ' m')}</strong><span>to {formatRouteNumber(routeResult.metrics.endElevation, 1, ' m')}</span></article>
          <article><small>Elevation change</small><strong>{formatSignedRouteNumber(routeResult.metrics.elevationGain, 1, ' m')}</strong><span>−{formatRouteNumber(routeResult.metrics.elevationLoss, 1, ' m')}</span></article>
          <article><small>Slope</small><strong>{formatRouteNumber(routeResult.metrics.maxSlope, 1, '° max')}</strong><span>average {formatRouteNumber(routeResult.metrics.averageSlope, 1, '°')}</span></article>
          <article><small>Roughness</small><strong>{formatRouteNumber(routeResult.metrics.maxRoughness, 2, ' m max')}</strong><span>average {formatRouteNumber(routeResult.metrics.averageRoughness, 2, ' m')}</span></article>
          <article><small>Objective</small><strong>{ROUTE_OBJECTIVE_LABELS[routeResult.objective]}</strong><span>{routeResult.stats.expanded.toLocaleString()} cells expanded</span></article>
        </div>
        <div className="jezero-route-geology">
          <span className="jezero-route-geology-title">Geology along route</span>
          {routeResult.geology.units.map(unit => <span key={unit.classId} className={unit.mapped ? 'mapped' : 'unmapped'}>{unit.symbol ? `${unit.symbol} · ` : ''}{unit.name}<b>{unit.cells}</b></span>)}
        </div>
        {routeResult.environment && <section className="jezero-route-environment">
          <span className="jezero-route-section-title">Environmental assessment</span>
          <div className="jezero-route-env-grid">
            <article><small>Source</small><strong>{routeResult.environment.source || '—'}</strong><span>{routeResult.environment.sourceType || '—'}</span></article>
            <article><small>Freshness</small><strong>{routeResult.environment.freshness?.status || 'unavailable'}</strong><span>{routeResult.environment.freshness?.ageDays != null ? `${Math.round(routeResult.environment.freshness.ageDays)} days old` : 'no observation'}</span></article>
            <article><small>Air temperature</small><strong>{routeResult.environment.values.minAirTempC != null ? `${routeResult.environment.values.minAirTempC}°C to ${routeResult.environment.values.maxAirTempC}°C` : '—'}</strong><span>{routeResult.environment.values.season || '—'}</span></article>
            <article><small>Pressure</small><strong>{routeResult.environment.values.pressurePa != null ? `${routeResult.environment.values.pressurePa} Pa` : '—'}</strong><span>Sol {routeResult.environment.observation?.sol ?? '—'}</span></article>
          </div>
          <p className="jezero-route-note">{routeResult.environment.spatialRelevance === 'point-observation-only' ? 'Environmental values are point observations at the Perseverance rover location and do not describe conditions along the entire route.' : ''}</p>
          {routeResult.environment.warnings.map((warning, index) => <p key={index} className="jezero-route-warning">{warning}</p>)}
          {routeResult.environment.cautions.map((caution, index) => <p key={index} className="jezero-route-caution">{caution}</p>)}
        </section>}
        {routeRecommendation && <section className="jezero-route-recommendation">
          <span className="jezero-route-section-title">Why this route?</span>
          <p className="jezero-route-recommendation-summary">Recommendation confidence: <b>{routeRecommendation.confidence}</b></p>
          <ul className="jezero-route-reasons">{routeRecommendation.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
          {routeRecommendation.warnings.length > 0 && <ul className="jezero-route-warnings">{routeRecommendation.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        </section>}
        {routeAlternative?.ok && routeResult?.ok && <section className="jezero-route-alternative">
          <span className="jezero-route-section-title">Alternative route comparison</span>
          <div className="jezero-route-alt-grid">
            <article><small>Primary · {ROUTE_OBJECTIVE_LABELS[routeResult.objective]}</small><strong>{formatRouteDistance(routeResult.distanceMetres)}</strong><span>cost {formatRouteNumber(routeResult.traversalCost, 2)} · {Math.floor((routeResult.metrics.travelTime?.minutes || 0) / 60)} h {Math.round((routeResult.metrics.travelTime?.minutes || 0) % 60)} min</span></article>
            <article><small>Alternative · {ROUTE_OBJECTIVE_LABELS[routeAlternative.objective]}</small><strong>{formatRouteDistance(routeAlternative.distanceMetres)}</strong><span>cost {formatRouteNumber(routeAlternative.traversalCost, 2)} · {Math.floor((routeAlternative.metrics.travelTime?.minutes || 0) / 60)} h {Math.round((routeAlternative.metrics.travelTime?.minutes || 0) % 60)} min</span></article>
          </div>
          {routeRecommendation?.sameRoute && <p className="jezero-route-note">Both objectives produced the same route for this start and destination.</p>}
        </section>}
        <p className="jezero-route-note">Traversal cost is the grid’s unitless movement-cost multiplier integrated over distance — not energy use or travel time. Travel time is an estimate based on configurable speed assumptions. Geology is informational and does not influence the route.</p>
        <details className="jezero-route-details">
          <summary>Search, window and validation details</summary>
          <div>
            <span>Window <b>{routeResult.searchWindow.width} × {routeResult.searchWindow.height}</b> cells ({routeResult.searchWindow.cells.toLocaleString()})</span>
            <span>Expanded <b>{routeResult.stats.expanded.toLocaleString()}</b> · discovered {routeResult.stats.discovered.toLocaleString()} · frontier peak {routeResult.stats.maxFrontier.toLocaleString()}</span>
            <span>Search <b>{formatRouteNumber(routeResult.stats.elapsedMs, 1, ' ms')}</b> · window read {formatRouteNumber(routeResult.stats.windowReadMs, 1, ' ms')}</span>
            <span>Validation <b>{routeResult.validation.ok ? 'passed' : `failed (${routeResult.validation.issues.length} issues)`}</b></span>
            <span>Start {formatRouteCell(routeResult.start)} → destination {formatRouteCell(routeResult.goal)}</span>
          </div>
        </details>
      </> : <p className="jezero-route-failure-note">Adjust the endpoints or objective and calculate again. Predefined rover routes remain available through the Perseverance path toggle.</p>}
    </section>}
    <section className="jezero-names" aria-labelledby="jezero-names-title">
      <h2 id="jezero-names-title">Names across Jezero</h2>
      <div>{JEZERO_PLACE_NAMES.map(place => <article key={place.name}><h3>{place.name}</h3><p>{place.story}</p></article>)}</div>
    </section>
  </main>
}
