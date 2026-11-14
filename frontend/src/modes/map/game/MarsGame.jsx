import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  computeMapCreatures,
  distance,
  loadSavedProgress,
  MAP_SIZE,
  movePlayer,
  PERSEVERANCE_ROVER,
  resetSavedProgress,
  saveSavedProgress,
  SCRAP_TRAIL_SITES,
} from './marsModel'
import { ROVER_RECORDS, SCRAP_PICKUPS, SUPPLY_PICKUPS } from '../data/roverRecords'
import { createTerrain, renderMap, renderMinimap } from './marsRenderer'
import { windAt } from './marsWeather'
import { VitalsHUD, Icons } from './VitalsHUD'
import HoloPhoneHUD from './HoloPhoneHUD'
import RoverRecordModal from './RoverRecordModal'
import './mars.css'

const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'])
const INTERACT_RANGE = 68
const WALK_TO_SCAN_RANGE = 46
const TOUCH_SCAN_RANGE = 24
const RECORD_INTERACT_RANGE = 52
const SUPPLY_INTERACT_RANGE = 48
const AUTO_PICKUP_RANGE = 24

export default function MarsGame({ reducedMotion = false }) {
  const navigate = useNavigate()
  const loaded = useRef(loadSavedProgress())
  const game = useRef(loaded.current)
  const canvas = useRef(null)
  const minimap = useRef(null)
  const host = useRef(null)
  const keys = useRef(new Set())
  const walkTarget = useRef(null)
  const pendingScanSlot = useRef(null)
  const pendingRecordId = useRef(null)
  const liveCreatures = useRef(computeMapCreatures(loaded.current, 0, reducedMotion))
  const nearbyCreatureRef = useRef(null)
  const nearbyRecordRef = useRef(null)
  const nearbySupplyRef = useRef(null)
  const nearbyScrapRef = useRef(null)
  const navigatingRef = useRef(false)
  const camera = useRef({ ...loaded.current.player })
  const wind = useRef(windAt(0))
  const facing = useRef(1)
  // Camera zoom updated: 1.35 -> 2.5x (mobile 1.0 -> 1.5x)
  const size = useRef({ width: 1000, height: 650, scale: 2.5, dpr: 1 })

  // ── Survival Vitals State ────────────────────────────────────────────────
  const vitals = useRef({ ...loaded.current.vitals })
  const [vitalsState, setVitalsState] = useState({ ...vitals.current })
  const [activeRecord, setActiveRecord] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const toastTimerRef = useRef(null)

  const [hudState, setHudState] = useState(() => ({
    scannedCount: loaded.current.scannedSlots.length,
    totalCount: SCRAP_TRAIL_SITES.length,
    nearbySlot: null,
    nearbyRecordId: null,
    nearbySupplyId: null,
    nearbyScrapId: null,
    roverReached: loaded.current.roverReached,
    collectedScrap: [...loaded.current.collectedScrap],
    collectedRecords: [...loaded.current.collectedRecords],
    collectedSupplies: [...loaded.current.collectedSupplies],
    inventoryCounts: { ...loaded.current.inventoryCounts },
    player: { ...loaded.current.player },
    trailElapsed: loaded.current.trailElapsed || 0,
    creatures: liveCreatures.current,
  }))
  const [dismissedRoverBanner, setDismissedRoverBanner] = useState(false)

  const showToast = useCallback(text => {
    setToastMessage(text)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2800)
  }, [])

  const persistCurrentState = useCallback(() => {
    game.current = {
      ...game.current,
      vitals: { ...vitals.current },
    }
    saveSavedProgress(game.current)
  }, [])

  const openRoverRecord = useCallback(record => {
    if (!record) return
    keys.current.clear()
    walkTarget.current = null
    pendingRecordId.current = null
    const alreadyOwned = game.current.collectedRecords.includes(record.id)
    if (!alreadyOwned) {
      game.current = {
        ...game.current,
        collectedRecords: [...game.current.collectedRecords, record.id],
        research: (game.current.research || 0) + 10,
      }
      persistCurrentState()
      showToast(`📄 Recovered Record #${record.number}: ${record.title}`)
    }
    setActiveRecord(record)
  }, [persistCurrentState, showToast])

  const collectScrapItem = useCallback(scrap => {
    if (!scrap || game.current.collectedScrap.includes(scrap.id)) return
    game.current = {
      ...game.current,
      collectedScrap: [...game.current.collectedScrap, scrap.id],
    }
    persistCurrentState()
    showToast(`⚙ Salvaged Rover Scrap: ${scrap.name}`)
  }, [persistCurrentState, showToast])

  const collectSupplyItem = useCallback(supply => {
    if (!supply || game.current.collectedSupplies.includes(supply.id)) return
    const currentCounts = game.current.inventoryCounts || { food: 0, water: 0, oxygen: 0 }
    game.current = {
      ...game.current,
      collectedSupplies: [...game.current.collectedSupplies, supply.id],
      inventoryCounts: {
        ...currentCounts,
        [supply.kind]: (currentCounts[supply.kind] || 0) + 1,
      },
    }
    persistCurrentState()
    showToast(`+1 ${supply.name} added to Hologram Inventory`)
  }, [persistCurrentState, showToast])

  const handleConsumeSupply = useCallback(kind => {
    const counts = game.current.inventoryCounts || { food: 0, water: 0, oxygen: 0 }
    if (!counts[kind] || counts[kind] <= 0) return
    game.current = {
      ...game.current,
      inventoryCounts: {
        ...counts,
        [kind]: counts[kind] - 1,
      },
    }
    if (kind === 'food') {
      vitals.current.hunger = Math.min(vitals.current.maxHunger, vitals.current.hunger + 30)
      vitals.current.health = Math.min(vitals.current.maxHealth, vitals.current.health + 8)
      showToast('🍎 Consumed EVA Ration (+30 Hunger)')
    } else if (kind === 'water') {
      vitals.current.water = Math.min(vitals.current.maxWater, vitals.current.water + 35)
      vitals.current.health = Math.min(vitals.current.maxHealth, vitals.current.health + 6)
      showToast('💧 Drank H₂O Pouch (+35 Water)')
    } else if (kind === 'oxygen') {
      vitals.current.oxygen = Math.min(vitals.current.maxOxygen, vitals.current.oxygen + 35)
      showToast('🫧 Used Reserve O₂ Cell (+35 Oxygen)')
    }
    persistCurrentState()
    setVitalsState({ ...vitals.current })
    setHudState(prev => ({
      ...prev,
      inventoryCounts: { ...game.current.inventoryCounts },
    }))
  }, [persistCurrentState, showToast])

  const enterCreatureScan = useCallback(creature => {
    if (!creature || navigatingRef.current) return
    navigatingRef.current = true
    keys.current.clear()
    walkTarget.current = null
    pendingScanSlot.current = null
    pendingRecordId.current = null
    persistCurrentState()
    if (creature.scanned) {
      navigate(`/battle?characterId=${creature.characterId}&slot=${creature.slot}`, {
        state: {
          fromMap: true,
          characterId: creature.characterId,
          slot: creature.slot,
        },
      })
      return
    }
    navigate(`/scan?characterId=${creature.characterId}&slot=${creature.slot}`, {
      state: {
        fromMap: true,
        characterId: creature.characterId,
        slot: creature.slot,
      },
    })
  }, [navigate, persistCurrentState])

  useEffect(() => {
    const timer = setInterval(persistCurrentState, 2500)
    window.addEventListener('pagehide', persistCurrentState)
    return () => {
      clearInterval(timer)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      window.removeEventListener('pagehide', persistCurrentState)
      persistCurrentState()
    }
  }, [persistCurrentState])

  useEffect(() => {
    const down = event => {
      if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return
      const key = event.key.toLowerCase()
      if (movementKeys.has(key)) {
        event.preventDefault()
        keys.current.add(key)
        walkTarget.current = null
        pendingScanSlot.current = null
        pendingRecordId.current = null
      } else if ((key === 'e' || key === 'enter' || key === ' ') && nearbyCreatureRef.current && !activeRecord) {
        event.preventDefault()
        enterCreatureScan(nearbyCreatureRef.current)
      } else if (key === 'f' && !activeRecord) {
        if (nearbyRecordRef.current) {
          event.preventDefault()
          openRoverRecord(nearbyRecordRef.current)
        } else if (nearbyScrapRef.current) {
          event.preventDefault()
          collectScrapItem(nearbyScrapRef.current)
        } else if (nearbySupplyRef.current) {
          event.preventDefault()
          collectSupplyItem(nearbySupplyRef.current)
        }
      }
    }
    const up = event => keys.current.delete(event.key.toLowerCase())
    const clear = () => {
      keys.current.clear()
      walkTarget.current = null
      pendingScanSlot.current = null
      pendingRecordId.current = null
    }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [activeRecord, collectScrapItem, collectSupplyItem, enterCreatureScan, openRoverRecord])

  useEffect(() => {
    const element = canvas.current
    if (!element || !host.current) return
    const context = element.getContext('2d')
    if (!context) return
    const terrain = createTerrain()

    const resize = new ResizeObserver(() => {
      if (!host.current) return
      const width = host.current.clientWidth || window.innerWidth
      const height = host.current.clientHeight || window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6)
      element.width = Math.round(width * dpr)
      element.height = Math.round(height * dpr)
      // Camera zoom: 1.35 -> 2.5x (mobile 1.0 -> 1.5x)
      size.current = { width, height, dpr, scale: width < 650 ? 1.5 : 2.5 }
    })
    resize.observe(host.current)

    const mountedAt = performance.now()
    let previous = mountedAt
    let lastHud = 0
    let frame

    const update = now => {
      const dt = Math.min((now - previous) / 1000, 0.05)
      previous = now
      const timeSec = now / 1000
      wind.current = windAt(timeSec)
      let moving = false

      if (!document.hidden && !navigatingRef.current) {
        game.current.trailElapsed = (game.current.trailElapsed || 0) + dt
      }

      const creatures = computeMapCreatures(game.current, timeSec, reducedMotion)
      liveCreatures.current = creatures

      if (!document.hidden && !navigatingRef.current) {
        if (pendingScanSlot.current !== null) {
          const targetCreature = creatures.find(c => c.slot === pendingScanSlot.current)
          if (targetCreature) {
            walkTarget.current = { x: targetCreature.x, y: targetCreature.y }
          } else {
            pendingScanSlot.current = null
          }
        }

        const held = keys.current
        let direction = {
          x: Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft')),
          y: Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup')),
        }
        if (!direction.x && !direction.y && walkTarget.current) {
          const dx = walkTarget.current.x - game.current.player.x
          const dy = walkTarget.current.y - game.current.player.y
          if (Math.hypot(dx, dy) > 5) {
            direction = { x: dx, y: dy }
          } else {
            walkTarget.current = null
          }
        }
        moving = Boolean(direction.x || direction.y)
        if (direction.x !== 0) facing.current = direction.x > 0 ? 1 : -1
        if (moving) {
          game.current = {
            ...game.current,
            player: movePlayer(game.current.player, direction, dt, wind.current, 100),
          }
        }

        // 1. Check nearest creature (prioritize unscanned, or allow fighting already-scanned creature)
        let closestCreature = null
        let closestDist = Infinity
        for (const creature of creatures) {
          const d = distance(game.current.player, creature)
          if (d < closestDist) {
            closestDist = d
            closestCreature = creature
          }
        }
        nearbyCreatureRef.current = closestCreature && closestDist <= INTERACT_RANGE
          ? closestCreature
          : null

        if (
          pendingScanSlot.current !== null &&
          closestCreature &&
          closestCreature.slot === pendingScanSlot.current &&
          closestDist <= WALK_TO_SCAN_RANGE
        ) {
          enterCreatureScan(closestCreature)
          return
        }

        if (
          moving &&
          now - mountedAt > 750 &&
          closestCreature &&
          !closestCreature.scanned &&
          closestDist <= TOUCH_SCAN_RANGE
        ) {
          enterCreatureScan(closestCreature)
          return
        }

        // 2. Check nearest white paper Rover Record
        let closestRecord = null
        let closestRecordDist = Infinity
        for (const record of ROVER_RECORDS) {
          const d = distance(game.current.player, record)
          if (d < closestRecordDist) {
            closestRecordDist = d
            closestRecord = record
          }
        }
        nearbyRecordRef.current = closestRecord && closestRecordDist <= RECORD_INTERACT_RANGE
          ? closestRecord
          : null

        if (
          pendingRecordId.current &&
          closestRecord &&
          closestRecord.id === pendingRecordId.current &&
          closestRecordDist <= 34
        ) {
          openRoverRecord(closestRecord)
        }

        // 3. Check uncollected Scrap Metal piles & Supply packs
        let closestScrap = null
        let closestScrapDist = Infinity
        for (const creature of creatures) {
          const scrap = SCRAP_PICKUPS.find(s => s.slot === creature.slot)
          if (!scrap || game.current.collectedScrap.includes(scrap.id)) continue
          const d = Math.hypot(
            game.current.player.x - creature.anchorX,
            game.current.player.y - creature.anchorY
          )
          if (d < closestScrapDist) {
            closestScrapDist = d
            closestScrap = { ...scrap, x: creature.anchorX, y: creature.anchorY }
          }
        }
        nearbyScrapRef.current = closestScrap && closestScrapDist <= SUPPLY_INTERACT_RANGE
          ? closestScrap
          : null
        if (closestScrap && closestScrapDist <= AUTO_PICKUP_RANGE) {
          collectScrapItem(closestScrap)
        }

        let closestSupply = null
        let closestSupplyDist = Infinity
        for (const supply of SUPPLY_PICKUPS) {
          if (game.current.collectedSupplies.includes(supply.id)) continue
          const d = distance(game.current.player, supply)
          if (d < closestSupplyDist) {
            closestSupplyDist = d
            closestSupply = supply
          }
        }
        nearbySupplyRef.current = closestSupply && closestSupplyDist <= SUPPLY_INTERACT_RANGE
          ? closestSupply
          : null
        if (closestSupply && closestSupplyDist <= AUTO_PICKUP_RANGE) {
          collectSupplyItem(closestSupply)
        }

        // Check arrival at Perseverance once all creatures have been scanned
        if (
          game.current.scannedSlots.length >= SCRAP_TRAIL_SITES.length &&
          !game.current.roverReached &&
          distance(game.current.player, PERSEVERANCE_ROVER) <= 95
        ) {
          game.current = { ...game.current, roverReached: true }
          persistCurrentState()
        }

        // ── Vitals Depletion Simulation ──────────────────────────────────────
        vitals.current.oxygen = Math.max(0, vitals.current.oxygen - dt / 60)
        vitals.current.hunger = Math.max(0, vitals.current.hunger - dt / 30)
        vitals.current.water = Math.max(0, vitals.current.water - dt / 20)

        let healthDrain = 0
        if (vitals.current.oxygen < 35) {
          const o2Deficit = (35 - vitals.current.oxygen) / 35
          healthDrain += o2Deficit * 1.8 * dt
        }
        if (vitals.current.hunger <= 0) healthDrain += 0.5 * dt
        if (vitals.current.water <= 0) healthDrain += 0.8 * dt

        vitals.current.health = Math.max(0, vitals.current.health - healthDrain)
      }

      const { width, height } = size.current
      // Camera zoom: 1.35 -> 2.5x (mobile 1.0 -> 1.5x)
      const scale = width < 650 ? 1.5 : 2.5
      size.current.scale = scale

      const desiredX = Math.max(width / scale / 2, Math.min(MAP_SIZE.width - width / scale / 2, game.current.player.x))
      const desiredY = Math.max(height / scale / 2, Math.min(MAP_SIZE.height - height / scale / 2, game.current.player.y))
      const lerp = reducedMotion ? 1 : 1 - Math.exp(-dt * 7)
      camera.current.x += (desiredX - camera.current.x) * lerp
      camera.current.y += (desiredY - camera.current.y) * lerp

      renderMap(
        context,
        terrain,
        game.current,
        creatures,
        camera.current,
        size.current,
        walkTarget.current,
        timeSec,
        moving,
        reducedMotion,
        wind.current,
        false,
        false,
        false,
        facing.current,
        nearbyCreatureRef.current ? nearbyCreatureRef.current.slot : -1,
        nearbyRecordRef.current ? nearbyRecordRef.current.id : null,
        nearbySupplyRef.current ? nearbySupplyRef.current.id : null
      )

      if (now - lastHud > 120) {
        lastHud = now
        if (minimap.current) {
          renderMinimap(
            minimap.current,
            terrain,
            game.current,
            creatures,
            false,
            timeSec,
            reducedMotion,
            false
          )
        }
        setVitalsState({ ...vitals.current })
        setHudState({
          scannedCount: game.current.scannedSlots.length,
          totalCount: SCRAP_TRAIL_SITES.length,
          nearbySlot: nearbyCreatureRef.current ? nearbyCreatureRef.current.slot : null,
          nearbyRecordId: nearbyRecordRef.current ? nearbyRecordRef.current.id : null,
          nearbySupplyId: nearbySupplyRef.current ? nearbySupplyRef.current.id : null,
          nearbyScrapId: nearbyScrapRef.current ? nearbyScrapRef.current.id : null,
          roverReached: game.current.roverReached,
          collectedScrap: [...game.current.collectedScrap],
          collectedRecords: [...game.current.collectedRecords],
          collectedSupplies: [...game.current.collectedSupplies],
          inventoryCounts: { ...game.current.inventoryCounts },
          player: { ...game.current.player },
          trailElapsed: game.current.trailElapsed || 0,
          creatures,
        })
      }
      frame = requestAnimationFrame(update)
    }

    frame = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      terrain.width = 0
      terrain.height = 0
    }
  }, [collectScrapItem, collectSupplyItem, enterCreatureScan, openRoverRecord, persistCurrentState, reducedMotion])

  const pointerWalk = event => {
    if (event.button !== 0 || navigatingRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const view = size.current
    const clickX = (event.clientX - rect.left - view.width / 2) / view.scale + camera.current.x
    const clickY = (event.clientY - rect.top - view.height / 2) / view.scale + camera.current.y

    // 1. Check if player clicked on a white paper Rover Record
    const clickedRecord = ROVER_RECORDS.find(
      record => Math.hypot(clickX - record.x, clickY - record.y) <= 18
    )
    if (clickedRecord) {
      if (distance(game.current.player, clickedRecord) <= RECORD_INTERACT_RANGE) {
        openRoverRecord(clickedRecord)
        return
      }
      pendingRecordId.current = clickedRecord.id
      pendingScanSlot.current = null
      walkTarget.current = { x: clickedRecord.x, y: clickedRecord.y }
      return
    }

    // 2. Check if player clicked on an uncollected Supply Pack
    const clickedSupply = SUPPLY_PICKUPS.find(
      supply =>
        !game.current.collectedSupplies.includes(supply.id) &&
        Math.hypot(clickX - supply.x, clickY - supply.y) <= 18
    )
    if (clickedSupply) {
      if (distance(game.current.player, clickedSupply) <= SUPPLY_INTERACT_RANGE) {
        collectSupplyItem(clickedSupply)
        return
      }
      pendingScanSlot.current = null
      pendingRecordId.current = null
      walkTarget.current = { x: clickedSupply.x, y: clickedSupply.y }
      return
    }

    // 3. Check if player clicked on a creature (unscanned -> scan, scanned -> fight)
    const clickedCreature = liveCreatures.current.find(creature => {
      const centerX = creature.x
      const centerY = creature.y - 16
      return Math.hypot(clickX - centerX, clickY - centerY) <= 30
    })

    if (clickedCreature) {
      if (distance(game.current.player, clickedCreature) <= INTERACT_RANGE) {
        enterCreatureScan(clickedCreature)
        return
      }
      pendingScanSlot.current = clickedCreature.slot
      pendingRecordId.current = null
      walkTarget.current = { x: clickedCreature.x, y: clickedCreature.y }
      return
    }

    pendingScanSlot.current = null
    pendingRecordId.current = null
    walkTarget.current = {
      x: Math.max(45, Math.min(MAP_SIZE.width - 45, clickX)),
      y: Math.max(45, Math.min(MAP_SIZE.height - 45, clickY)),
    }
  }

  const handleNewExpedition = () => {
    const fresh = resetSavedProgress()
    game.current = fresh
    vitals.current = { ...fresh.vitals }
    camera.current = { ...fresh.player }
    walkTarget.current = null
    pendingScanSlot.current = null
    pendingRecordId.current = null
    nearbyCreatureRef.current = null
    nearbyRecordRef.current = null
    nearbySupplyRef.current = null
    nearbyScrapRef.current = null
    setDismissedRoverBanner(false)
    setActiveRecord(null)
    setVitalsState({ ...fresh.vitals })
    setHudState({
      scannedCount: 0,
      totalCount: SCRAP_TRAIL_SITES.length,
      nearbySlot: null,
      nearbyRecordId: null,
      nearbySupplyId: null,
      nearbyScrapId: null,
      roverReached: false,
      collectedScrap: [],
      collectedRecords: [],
      collectedSupplies: [],
      inventoryCounts: { ...fresh.inventoryCounts },
      player: { ...fresh.player },
      trailElapsed: 0,
      creatures: computeMapCreatures(fresh, 0, reducedMotion),
    })
  }

  // Dynamic Oxygen Ring Color based on remaining O2
  const o2Color = vitalsState.oxygen > 35
    ? ['#38ef7d', '#11998e']
    : vitalsState.oxygen > 18
    ? ['#f7b733', '#fc4a1a']
    : ['#ff416c', '#ff4b2b']

  const allScanned = hudState.scannedCount >= hudState.totalCount
  const activeNearbyCreature = hudState.nearbySlot !== null
    ? liveCreatures.current.find(c => c.slot === hudState.nearbySlot)
    : null
  const activeNearbyRecord = hudState.nearbyRecordId
    ? ROVER_RECORDS.find(r => r.id === hudState.nearbyRecordId)
    : null
  const activeNearbySupply = hudState.nearbySupplyId
    ? SUPPLY_PICKUPS.find(s => s.id === hudState.nearbySupplyId)
    : null
  const activeNearbyScrap = hudState.nearbyScrapId
    ? SCRAP_PICKUPS.find(s => s.id === hudState.nearbyScrapId)
    : null

  return (
    <main
      id="explorer"
      tabIndex={-1}
      ref={host}
      className="mars-game"
      aria-label="Mars expedition map"
    >
      <canvas
        ref={canvas}
        className="mars-map"
        tabIndex={0}
        role="application"
        aria-label="Mars game map. Use W A S D or arrow keys to move, click creatures to scan, or click white rover records to read NASA chronicles."
        onPointerDown={pointerWalk}
      />
      <div className="mars-map-shade" aria-hidden="true" />

      {/* Minimap in Top Left */}
      <div className="mars-minimap" aria-label="Rover Radar Minimap">
        <canvas
          ref={minimap}
          width="180"
          height="180"
          role="img"
          aria-label="Circular local minimap tracking unknown creatures feeding on rover scrap"
        />
      </div>

      {/* Scrap Trail & Objective HUD in Top Right */}
      <div className="mars-tracker-hud">
        <button
          type="button"
          className="mars-menu-btn"
          onClick={() => {
            persistCurrentState()
            navigate('/')
          }}
        >
          ← Main Menu
        </button>

        <div className={`mars-tracker-card${allScanned ? ' is-complete' : ''}`} role="status">
          <span className="mars-tracker-eyebrow">
            {allScanned ? 'Scrap Trail Complete' : 'Rover Scrap Signal'}
          </span>
          <strong className="mars-tracker-count">
            Specimens: {hudState.scannedCount}/{hudState.totalCount} · Records: {hudState.collectedRecords.length}/{ROVER_RECORDS.length}
          </strong>
          <span className="mars-tracker-sub">
            {allScanned
              ? 'All silhouettes catalogued · Head to Perseverance Rover'
              : 'Scan creatures eating scrap & collect white rover records'}
          </span>
        </div>
      </div>

      {/* Holographic Horizontal Phone on Right Side of Screen */}
      <HoloPhoneHUD
        vitals={vitalsState}
        creatures={hudState.creatures}
        collectedScrap={hudState.collectedScrap}
        collectedRecords={hudState.collectedRecords}
        collectedSupplies={hudState.collectedSupplies}
        inventoryCounts={hudState.inventoryCounts}
        player={hudState.player}
        trailElapsed={hudState.trailElapsed}
        onConsumeSupply={handleConsumeSupply}
        onOpenRecord={record => setActiveRecord(record)}
      />

      {/* Floating Pickup Toast */}
      {toastMessage && (
        <div className="mars-pickup-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      {/* Interactive Prompts for Nearby Creature, White Paper Record, Scrap, or Supply */}
      <div className="mars-prompt-stack">
        {activeNearbyCreature && (
          <button
            type="button"
            className="mars-scan-prompt"
            onClick={() => enterCreatureScan(activeNearbyCreature)}
          >
            {activeNearbyCreature.scanned
              ? `⚔ Fight ${activeNearbyCreature.name} [E]`
              : '✦ Scan Unknown Creature [E]'}
          </button>
        )}
        {activeNearbyRecord && (
          <button
            type="button"
            className="mars-scan-prompt is-record"
            onClick={() => openRoverRecord(activeNearbyRecord)}
          >
            📄 Read Rover Record #{activeNearbyRecord.number}: {activeNearbyRecord.title} [F]
          </button>
        )}
        {activeNearbyScrap && (
          <button
            type="button"
            className="mars-scan-prompt is-supply"
            onClick={() => collectScrapItem(activeNearbyScrap)}
          >
            ⚙ Salvage {activeNearbyScrap.name} [F]
          </button>
        )}
        {activeNearbySupply && (
          <button
            type="button"
            className="mars-scan-prompt is-supply"
            onClick={() => collectSupplyItem(activeNearbySupply)}
          >
            ➕ Pick Up {activeNearbySupply.name} [F]
          </button>
        )}
      </div>

      {/* Broken Rover Record / Newspaper Modal */}
      <RoverRecordModal
        record={activeRecord}
        collectedIds={hudState.collectedRecords}
        onClose={() => setActiveRecord(null)}
        onSelectRecord={rec => setActiveRecord(rec)}
      />

      {/* Arrival Banner at Perseverance Rover once all creatures are scanned */}
      {allScanned && hudState.roverReached && !dismissedRoverBanner && (
        <div className="mars-rover-modal" role="dialog" aria-label="Perseverance rover reached">
          <strong>★ Perseverance Rover Located</strong>
          <p>
            You followed the trail of eaten scrap metal and catalogued all {hudState.totalCount} mysterious specimens leading to Perseverance!
          </p>
          <div className="mars-rover-actions">
            <button type="button" onClick={() => setDismissedRoverBanner(true)}>
              Keep Exploring
            </button>
            <button type="button" onClick={handleNewExpedition}>
              New Randomized Trail
            </button>
            <button
              type="button"
              onClick={() => {
                persistCurrentState()
                navigate('/battle')
              }}
            >
              Battle Mode →
            </button>
          </div>
        </div>
      )}

      {/* Vitals HUD in Bottom Left (Subnautica Style) */}
      <div className="mars-vitals-hud" aria-label="Explorer Vitals">
        <VitalsHUD
          main={{
            label: 'O₂',
            value: vitalsState.oxygen,
            max: vitalsState.maxOxygen,
            color: o2Color,
            warnBelow: 0.35,
          }}
          satellites={[
            {
              value: vitalsState.hunger,
              max: vitalsState.maxHunger,
              color: '#f0922e',
              icon: <Icons.Apple />,
              warnBelow: 0.25,
            },
            {
              value: vitalsState.health,
              max: vitalsState.maxHealth,
              color: '#e0403a',
              icon: <Icons.Heart />,
              warnBelow: 0.3,
            },
            {
              value: vitalsState.water,
              max: vitalsState.maxWater,
              color: '#3cc0ee',
              icon: <Icons.Drop />,
              warnBelow: 0.25,
            },
          ]}
          mainSize={122}
          satSize={56}
        />
      </div>
    </main>
  )
}
