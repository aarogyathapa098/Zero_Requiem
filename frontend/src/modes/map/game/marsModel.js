import { GAME_METERS_PER_UNIT, gameToLonLat, lonLatToGame, straightLineMetres, TRAVERSE_WAYPOINTS } from './marsGeo.js'
import { getGeologyAt } from '../data/sim3464.js'
import { PERSEVERANCE_PATH } from './marsTraverse.js'
import { ROVER_RECORDS, SCRAP_PICKUPS, SUPPLY_PICKUPS } from '../data/roverRecords.js'
import { CHARACTERS, getCharacterById } from '../../game/data/characters.js'

export const MAP_SIZE = { width: 2400, height: 1800 }
export const CAMP = { x: 2220, y: 1050 }
export const START = { x: 2100, y: 1050 }
export const SAVE_KEY = 'orbital-mars-expedition-v3'
export const SCAN_RANGES = [0, 100, 155, 215]
export const PERSEVERANCE_ROVER = PERSEVERANCE_PATH.at(-1) || { x: 337, y: 1132 }

// Compute 6 spaced scrap-metal feeding sites along Perseverance's traverse,
// each gap bringing the player progressively closer to Perseverance Rover.
const TRAIL_FRACTIONS = [0.24, 0.41, 0.51, 0.61, 0.70, 0.84]

function buildScrapTrailSites() {
  const cumulative = [0]
  for (let i = 1; i < PERSEVERANCE_PATH.length; i++) {
    const prev = PERSEVERANCE_PATH[i - 1]
    const curr = PERSEVERANCE_PATH[i]
    cumulative.push(cumulative[i - 1] + Math.hypot(curr.x - prev.x, curr.y - prev.y))
  }
  const totalLength = cumulative.at(-1) || 1
  const indices = TRAIL_FRACTIONS.map(fraction => {
    const target = totalLength * fraction
    const found = cumulative.findIndex(dist => dist >= target)
    return found === -1 ? PERSEVERANCE_PATH.length - 2 : found
  })

  return indices.map((pathIndex, slot) => {
    const nextLimit = slot < indices.length - 1
      ? indices[slot + 1]
      : PERSEVERANCE_PATH.length - 1
    // Allow each creature to gradually creep up to ~42% of the gap closer toward Perseverance over time
    const maxAdvanceIndex = Math.max(
      pathIndex,
      pathIndex + Math.floor((nextLimit - pathIndex) * 0.42)
    )
    const point = PERSEVERANCE_PATH[pathIndex]
    return {
      slot,
      pathIndex,
      maxAdvanceIndex,
      x: point.x,
      y: point.y,
    }
  })
}

export const SCRAP_TRAIL_SITES = buildScrapTrailSites()

export function createRandomizedCreatureOrder(random = Math.random) {
  const ids = CHARACTERS.map(character => character.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

function defaultVitals() {
  return {
    oxygen: 100,
    maxOxygen: 100,
    health: 100,
    maxHealth: 100,
    hunger: 100,
    maxHunger: 100,
    water: 100,
    maxWater: 100,
  }
}

function defaultInventoryCounts() {
  return {
    food: 2,
    water: 2,
    oxygen: 1,
  }
}

const siteStories = [
  { id: 'basalt', name: 'Basalt outcrop', type: 'Rock formation', icon: 'rock', x: 1400, y: 930, color: '#e1ac7e', sample: 'Volcanic rock', fact: 'Some rocks studied by Perseverance in Jezero Crater formed from cooling molten rock. Studying their minerals helps scientists reconstruct the crater’s volcanic history.', source: 'https://www.jpl.nasa.gov/news/nasas-perseverance-makes-new-discoveries-in-mars-jezero-crater/' },
  { id: 'lake', name: 'Ancient lakebed', type: 'Water history', icon: 'lake', x: 1030, y: 720, color: '#acc6bf', sample: 'Lakebed sediment', fact: 'Jezero Crater once contained a lake. Layers of sediment and an ancient river delta preserve clues to the water that shaped this landscape billions of years ago. This site is dry today.', source: 'https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-perseverance-rover-deciphers-ancient-history-of-martian-lake/' },
  { id: 'rim', name: 'Crater rim ridge', type: 'Mountain terrain', icon: 'mountain', x: 1680, y: 460, color: '#e4c69c', sample: 'Rim rock', fact: 'An impact excavated Jezero Crater and exposed rocks in its raised rim. Those rocks can reveal parts of Mars’ history that are older than the sediments on the crater floor.', source: 'https://science.nasa.gov/resource/mars-2020-target-jezero-crater/' },
  { id: 'delta', name: 'Fossil river delta', type: 'Water history', icon: 'lake', x: 720, y: 480, color: '#acc6bf', sample: 'Delta sediment', fact: 'When a river entered Jezero’s ancient lake, it deposited a fan of sand, mud, and rock. Scientists study these sedimentary layers for evidence of past environments that could have supported microbial life.', source: 'https://science.nasa.gov/photojournal/detailed-panorama-of-mars-jezero-crater-delta/' },
  { id: 'dust', name: 'Red regolith field', type: 'Surface material', icon: 'rock', x: 800, y: 1080, color: '#e4a18a', sample: 'Iron-rich dust', fact: 'Iron minerals in Martian soil oxidize, or rust, giving much of the surface its reddish color. Loose dust and broken rock form a surface layer called regolith.', source: 'https://science.nasa.gov/mars/facts/' },
  { id: 'volcanic', name: 'Volcanic stone garden', type: 'Rock formation', icon: 'rock', x: 1540, y: 1390, color: '#c5b8d0', sample: 'Mineral specimen', fact: 'Igneous rocks record how molten material cooled. Their minerals, together with signs of later water alteration, help scientists piece together more than one chapter of Martian history.', source: 'https://www.jpl.nasa.gov/news/nasas-perseverance-makes-new-discoveries-in-mars-jezero-crater/' },
]

const stationNames = {
  basalt: 'Volcanic geology', lake: 'Ancient lake history', rim: 'Crater formation',
  delta: 'River delta history', dust: 'Martian regolith', volcanic: 'Igneous rocks',
}

export const SITES = siteStories.map(site => ({
  ...site,
  name: stationNames[site.id],
  type: 'Educational rover traverse waypoint',
  sample: 'Science note',
  ...lonLatToGame(TRAVERSE_WAYPOINTS[site.id]),
  ...TRAVERSE_WAYPOINTS[site.id],
  locationNote: 'Placed at a mapped Perseverance traverse waypoint. The science note describes Jezero generally; it does not identify this exact rock or sample.',
  coordinateSource: 'Cesium SampleData Mars.czml / PerseverancePath',
}))

export function planMarswalk(from, destination, returnTo = from) {
  const oneWayMetres = straightLineMetres(from, destination)
  const returnMetres = straightLineMetres(destination, returnTo)
  const walkingHours = (oneWayMetres + returnMetres) / 2500
  const activityHours = 0.25
  const reserveHours = 1
  const capacityHours = 4
  const requiredHours = walkingHours + activityHours + reserveHours
  return {
    oneWayMetres,
    roundTripMetres: oneWayMetres + returnMetres,
    walkingHours,
    activityHours,
    reserveHours,
    capacityHours,
    requiredHours,
    withinBudget: requiredHours <= capacityHours,
    oxygenPercent: Math.min(100, Math.round(requiredHours / capacityHours * 100)),
    routeType: 'Straight-line estimate; terrain obstacles and slope not evaluated',
    gameMetresPerUnit: GAME_METERS_PER_UNIT,
  }
}

export const SPECIES = [
  { id: 'dustling', name: 'Dustling', kind: 'Dust wanderer', color: '#d4b682', dark: '#796343', hp: 40, attack: 9, reward: 12, weakness: 'A careful scan exposes its dust core.', description: 'A curious little dust spirit, invented for this game. It drifts between the rocks and guards sparkling research fragments.' },
  { id: 'ferrite', name: 'Ferrite', kind: 'Stone guardian', color: '#c6a0a3', dark: '#7f5e73', hp: 52, attack: 11, reward: 16, weakness: 'Its mineral armor opens after a scan.', description: 'A fictional, rocky guardian with a surprisingly shy personality. Its shell is inspired by the colors of iron-rich minerals.' },
  { id: 'glimmer', name: 'Glimmer', kind: 'Crystal rover', color: '#a5d8c9', dark: '#568e8a', hp: 44, attack: 10, reward: 14, weakness: 'Scan the brightest crystal before pulsing.', description: 'An imagined crystal creature that flickers across the lakebed. Real Mars has no confirmed creatures like this.' },
]

export function newProgress() {
  return {
    mapVersion: 2,
    player: { ...START },
    discoveries: [],
    scannedUnits: {},
    research: 0,
    defeated: 0,
    scannerLevel: 1,
    suitPower: 100,
    beacon: false,
    encountered: [],
    destinationId: null,
    creatureOrder: createRandomizedCreatureOrder(),
    scannedSlots: [],
    scannedAnchors: {},
    trailElapsed: 0,
    roverReached: false,
    vitals: defaultVitals(),
    collectedScrap: [],
    collectedRecords: [],
    collectedSupplies: [],
    inventoryCounts: defaultInventoryCounts(),
  }
}

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

function interpolatePathPoint(floatIndex) {
  const clamped = Math.max(0, Math.min(PERSEVERANCE_PATH.length - 1, floatIndex))
  const low = Math.floor(clamped)
  const high = Math.min(PERSEVERANCE_PATH.length - 1, low + 1)
  const t = clamped - low
  const a = PERSEVERANCE_PATH[low]
  const b = PERSEVERANCE_PATH[high]
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

export function computeMapCreatures(progress, time = 0, reducedMotion = false) {
  const order = Array.isArray(progress?.creatureOrder) && progress.creatureOrder.length === CHARACTERS.length
    ? progress.creatureOrder
    : CHARACTERS.map(c => c.id)
  const scannedSlots = Array.isArray(progress?.scannedSlots) ? progress.scannedSlots : []
  const scannedAnchors = progress?.scannedAnchors || {}
  const elapsed = Math.max(0, Number(progress?.trailElapsed) || 0)

  return SCRAP_TRAIL_SITES.map(site => {
    const { slot } = site
    const characterId = order[slot]
    const character = getCharacterById(characterId)
    const scanned = scannedSlots.includes(slot)

    let anchor
    if (scanned && scannedAnchors[slot]) {
      anchor = scannedAnchors[slot]
    } else {
      const maxSteps = site.maxAdvanceIndex - site.pathIndex
      const stepAdvance = Math.min(maxSteps, elapsed * 0.42)
      anchor = interpolatePathPoint(site.pathIndex + stepAdvance)
    }

    const anchorX = Math.max(60, Math.min(MAP_SIZE.width - 60, anchor.x))
    const anchorY = Math.max(60, Math.min(MAP_SIZE.height - 60, anchor.y))

    const phase = time * 0.65 + slot * 2.05
    const modeWave = Math.sin(phase * 0.55)
    const feasting = !scanned && (reducedMotion || modeWave > -0.2)

    let offsetX = 0
    let offsetY = 0
    let facing = slot % 2 === 0 ? -1 : 1

    if (reducedMotion) {
      offsetX = slot % 2 === 0 ? 11 : -11
      offsetY = 3
      facing = offsetX > 0 ? -1 : 1
    } else if (feasting) {
      const side = slot % 2 === 0 ? 1 : -1
      offsetX = side * (11 + Math.sin(phase * 2.2) * 2.5)
      offsetY = 3 + Math.cos(phase * 1.9) * 2
      facing = offsetX > 0 ? -1 : 1
    } else {
      const roamRadiusX = scanned ? 15 : 24
      const roamRadiusY = scanned ? 11 : 16
      offsetX = Math.cos(phase * 0.9) * roamRadiusX + Math.sin(phase * 1.7) * 4
      offsetY = Math.sin(phase * 1.25) * roamRadiusY
      const vx = -Math.sin(phase * 0.9) * 0.9 * roamRadiusX + Math.cos(phase * 1.7) * 1.7 * 4
      if (Math.abs(vx) > 1.0) facing = vx >= 0 ? 1 : -1
    }

    const x = Math.max(55, Math.min(MAP_SIZE.width - 55, anchorX + offsetX))
    const y = Math.max(55, Math.min(MAP_SIZE.height - 55, anchorY + offsetY))

    return {
      slot,
      characterId: character.id,
      name: character.name,
      characterSrc: character.character,
      silhouetteSrc: character.silhouette,
      scanned,
      feasting,
      roaming: !feasting,
      facing,
      x,
      y,
      anchorX,
      anchorY,
      originX: site.x,
      originY: site.y,
      distToRover: Math.hypot(x - PERSEVERANCE_ROVER.x, y - PERSEVERANCE_ROVER.y),
    }
  })
}

export function getActiveTargetCreature(creatures) {
  if (!Array.isArray(creatures)) return null
  return creatures.find(creature => !creature.scanned) || null
}

export function movePlayer(player, direction, seconds, wind = null, suitPower = 100) {
  const craters = [
    { x: 470, y: 1290, r: 185 },
    { x: 1930, y: 1280, r: 255 },
    { x: 500, y: 650, r: 95 },
    { x: 1250, y: 1520, r: 85 },
    { x: 2070, y: 770, r: 90 },
  ]
  const depthFactor = (() => {
    for (const c of craters) {
      const dist = Math.hypot(player.x - c.x, player.y - c.y)
      if (dist < c.r) {
        const t = dist / c.r
        return 0.5 + 0.5 * t
      }
    }
    return 1
  })()

  const length = Math.hypot(direction.x, direction.y)
  if (!length) return player
  const alignment = wind ? (direction.x * wind.x + direction.y * wind.y) / length : 0
  const factor = (wind ? Math.max(0.82, Math.min(1.12, 1 + alignment * wind.strength * 0.16)) : 1) * (suitPower < 5 ? 0.65 : 1) * depthFactor
  const amount = 165 * factor * Math.max(0, Math.min(seconds, 0.05)) / length
  return {
    x: Math.max(45, Math.min(MAP_SIZE.width - 45, player.x + direction.x * amount)),
    y: Math.max(45, Math.min(MAP_SIZE.height - 45, player.y + direction.y * amount)),
  }
}

export function suitPowerAfter(suitPower, player, direction, wind, seconds) {
  if (!direction.x && !direction.y) return distance(player, CAMP) < 65 ? Math.min(100, suitPower + seconds * 1.5) : suitPower
  const length = Math.hypot(direction.x, direction.y)
  const headwind = wind ? Math.max(0, -(direction.x * wind.x + direction.y * wind.y) / length) * wind.strength : 0
  return Math.max(0, suitPower - seconds * (0.26 + headwind * 0.16))
}

export function spawnCreature(player, random = Math.random, id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) {
  const angle = random() * Math.PI * 2
  const radius = 160 + random() * 180
  const species = SPECIES[Math.min(SPECIES.length - 1, Math.floor(random() * SPECIES.length))]
  return { id, species: species.id, x: Math.max(65, Math.min(MAP_SIZE.width - 65, player.x + Math.cos(angle) * radius)), y: Math.max(65, Math.min(MAP_SIZE.height - 65, player.y + Math.sin(angle) * radius)), age: 0 }
}

export function scanSite(progress, id) {
  const site = SITES.find(item => item.id === id)
  if (!site || progress.discoveries.includes(id) || distance(progress.player, site) > SCAN_RANGES[progress.scannerLevel]) return progress
  const { longitude, latitude } = gameToLonLat(progress.player)
  const unit = getGeologyAt(longitude, latitude)
  return { ...progress, discoveries: [...progress.discoveries, id], research: progress.research + 10,
    scannedUnits: { ...progress.scannedUnits, [id]: unit ? { ...unit, longitude, latitude } : { longitude, latitude, name: 'Unmapped at this position', symbol: '—', description: 'The SIM 3464 polygon layer has no unit at this scan coordinate.' } } }
}

export function startBattle(creature) {
  const species = SPECIES.find(item => item.id === creature.species) || SPECIES[0]
  return { creature, species, enemyHp: species.hp, hp: 100, analyzed: false, turns: 0, result: null, message: 'Scan for a weak point, then use your pulse tool.' }
}

export function battleTurn(battle, action) {
  if (battle.result || !['scan', 'pulse', 'shield'].includes(action)) return battle
  let { enemyHp, hp, analyzed } = battle
  let message
  if (action === 'scan') {
    analyzed = true
    message = `Weak point found. Your next pulse does extra damage. ${battle.species.weakness}`
  } else if (action === 'pulse') {
    const damage = analyzed ? 30 : 16
    enemyHp = Math.max(0, enemyHp - damage)
    message = `Your pulse dealt ${damage} damage.${analyzed ? ' Weak point bonus!' : ' Try scanning for a stronger pulse.'}`
    analyzed = false
  } else {
    hp = Math.min(100, hp + 15)
    message = 'Shield raised. Suit integrity restored; the next hit is reduced.'
  }
  if (enemyHp === 0) return { ...battle, enemyHp, hp, analyzed, result: 'won', turns: battle.turns + 1, message: `${battle.species.name} defeated. Research fragments recovered!` }
  const hit = action === 'shield' ? 3 : battle.species.attack
  hp = Math.max(0, hp - hit)
  return { ...battle, enemyHp, hp, analyzed, turns: battle.turns + 1, result: hp === 0 ? 'lost' : null, message: hp === 0 ? 'Your safety system returned you to camp. Your discoveries are safe.' : `${message} ${battle.species.name} dealt ${hit} damage.` }
}

export function restoreProgress(value) {
  const clean = newProgress()
  if (!value || typeof value !== 'object') return clean
  const integer = (v, max = 100000) => Number.isInteger(v) && v >= 0 && v <= max
  if (Number.isFinite(value.player?.x) && Number.isFinite(value.player?.y)) {
    const player = value.mapVersion === 2 ? value.player : {
      x: CAMP.x + (value.player.x - 1200) * 2 / GAME_METERS_PER_UNIT,
      y: CAMP.y + (value.player.y - 1100) * 2 / GAME_METERS_PER_UNIT,
    }
    clean.player = { x: Math.max(45, Math.min(MAP_SIZE.width - 45, player.x)), y: Math.max(45, Math.min(MAP_SIZE.height - 45, player.y)) }
  }
  clean.discoveries = [...new Set(Array.isArray(value.discoveries) ? value.discoveries.filter(id => SITES.some(site => site.id === id)) : [])]
  if (value.scannedUnits && typeof value.scannedUnits === 'object') {
    for (const id of clean.discoveries) {
      const unit = value.scannedUnits[id]
      if (unit && typeof unit.name === 'string' && typeof unit.symbol === 'string' && Number.isFinite(unit.latitude) && Number.isFinite(unit.longitude)) clean.scannedUnits[id] = unit
    }
  }
  if (integer(value.research)) clean.research = value.research
  if (Number.isFinite(value.suitPower)) clean.suitPower = Math.max(0, Math.min(100, value.suitPower))
  if (integer(value.defeated)) clean.defeated = value.defeated
  if ([1, 2, 3].includes(value.scannerLevel)) clean.scannerLevel = value.scannerLevel
  clean.beacon = value.beacon === true && clean.discoveries.length >= 3 && clean.defeated >= 1
  clean.encountered = [...new Set(Array.isArray(value.encountered) ? value.encountered.filter(id => SPECIES.some(species => species.id === id)) : [])]
  clean.destinationId = SITES.some(site => site.id === value.destinationId) ? value.destinationId : null

  const validIds = new Set(CHARACTERS.map(c => c.id))
  if (
    Array.isArray(value.creatureOrder) &&
    value.creatureOrder.length === CHARACTERS.length &&
    new Set(value.creatureOrder).size === CHARACTERS.length &&
    value.creatureOrder.every(id => validIds.has(id))
  ) {
    clean.creatureOrder = [...value.creatureOrder]
  }
  if (Array.isArray(value.scannedSlots)) {
    clean.scannedSlots = [...new Set(value.scannedSlots.filter(slot => Number.isInteger(slot) && slot >= 0 && slot < SCRAP_TRAIL_SITES.length))]
  }
  if (value.scannedAnchors && typeof value.scannedAnchors === 'object') {
    const anchors = {}
    for (const slot of clean.scannedSlots) {
      const item = value.scannedAnchors[slot]
      if (item && Number.isFinite(item.x) && Number.isFinite(item.y)) {
        anchors[slot] = { x: item.x, y: item.y }
      }
    }
    clean.scannedAnchors = anchors
  }
  if (Number.isFinite(value.trailElapsed) && value.trailElapsed >= 0) {
    clean.trailElapsed = value.trailElapsed
  }
  clean.roverReached = value.roverReached === true
  if (value.vitals && typeof value.vitals === 'object') {
    const base = defaultVitals()
    for (const key of ['oxygen', 'health', 'hunger', 'water']) {
      if (Number.isFinite(value.vitals[key])) {
        base[key] = Math.max(0, Math.min(100, value.vitals[key]))
      }
    }
    clean.vitals = base
  }
  const validScrapIds = new Set(SCRAP_PICKUPS.map(s => s.id))
  if (Array.isArray(value.collectedScrap)) {
    clean.collectedScrap = [...new Set(value.collectedScrap.filter(id => validScrapIds.has(id)))]
  }
  const validRecordIds = new Set(ROVER_RECORDS.map(r => r.id))
  if (Array.isArray(value.collectedRecords)) {
    clean.collectedRecords = [...new Set(value.collectedRecords.filter(id => validRecordIds.has(id)))]
  }
  const validSupplyIds = new Set(SUPPLY_PICKUPS.map(s => s.id))
  if (Array.isArray(value.collectedSupplies)) {
    clean.collectedSupplies = [...new Set(value.collectedSupplies.filter(id => validSupplyIds.has(id)))]
  }
  if (value.inventoryCounts && typeof value.inventoryCounts === 'object') {
    const counts = defaultInventoryCounts()
    for (const key of ['food', 'water', 'oxygen']) {
      if (Number.isInteger(value.inventoryCounts[key]) && value.inventoryCounts[key] >= 0) {
        counts[key] = value.inventoryCounts[key]
      }
    }
    clean.inventoryCounts = counts
  }
  return clean
}

let sessionProgress = null

export function loadSavedProgress() {
  if (sessionProgress) return restoreProgress(sessionProgress)
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const parsed = restoreProgress(JSON.parse(raw))
      sessionProgress = parsed
      return parsed
    }
  } catch {
    /* ignore storage read errors */
  }
  const fresh = newProgress()
  sessionProgress = fresh
  return fresh
}

export function saveSavedProgress(progress) {
  const clean = restoreProgress(progress)
  sessionProgress = clean
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(clean))
  } catch {
    /* ignore storage write errors */
  }
  return clean
}

export function resetSavedProgress() {
  const fresh = newProgress()
  return saveSavedProgress(fresh)
}

export function markCreatureScanned(slot, characterId) {
  const current = loadSavedProgress()
  let targetSlot = Number.isInteger(Number(slot)) ? Number(slot) : -1
  if ((targetSlot < 0 || targetSlot >= SCRAP_TRAIL_SITES.length) && characterId != null) {
    targetSlot = current.creatureOrder.indexOf(Number(characterId))
  }
  if (targetSlot < 0 || targetSlot >= SCRAP_TRAIL_SITES.length) return current

  const liveCreatures = computeMapCreatures(current, 0, true)
  const live = liveCreatures[targetSlot]
  const scannedAnchors = {
    ...current.scannedAnchors,
    ...(live ? { [targetSlot]: { x: live.anchorX, y: live.anchorY } } : {}),
  }
  const scrapForSlot = SCRAP_PICKUPS.find(item => item.slot === targetSlot)
  const collectedScrap = scrapForSlot && !current.collectedScrap.includes(scrapForSlot.id)
    ? [...current.collectedScrap, scrapForSlot.id]
    : current.collectedScrap

  const scannedSlots = current.scannedSlots.includes(targetSlot)
    ? current.scannedSlots
    : [...current.scannedSlots, targetSlot]

  const updated = {
    ...current,
    scannedSlots,
    scannedAnchors,
    collectedScrap,
    research: current.research + 15,
  }
  return saveSavedProgress(updated)
}
