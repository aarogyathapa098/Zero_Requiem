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
import { createTerrain, renderMap, renderMinimap } from './marsRenderer'
import { windAt } from './marsWeather'
import { VitalsHUD, Icons } from './VitalsHUD'
import './mars.css'

const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'])
const INTERACT_RANGE = 88
const WALK_TO_SCAN_RANGE = 62
const TOUCH_SCAN_RANGE = 32

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
  const liveCreatures = useRef(computeMapCreatures(loaded.current, 0, reducedMotion))
  const nearbyCreatureRef = useRef(null)
  const navigatingRef = useRef(false)
  const camera = useRef({ ...loaded.current.player })
  const wind = useRef(windAt(0))
  const facing = useRef(1)
  const size = useRef({ width: 1000, height: 650, scale: 1, dpr: 1 })

  // ── Survival Vitals State ────────────────────────────────────────────────
  const vitals = useRef({ ...loaded.current.vitals })
  const [vitalsState, setVitalsState] = useState({ ...vitals.current })
  const [hudState, setHudState] = useState(() => ({
    scannedCount: loaded.current.scannedSlots.length,
    totalCount: SCRAP_TRAIL_SITES.length,
    nearbySlot: null,
    roverReached: loaded.current.roverReached,
  }))
  const [dismissedRoverBanner, setDismissedRoverBanner] = useState(false)

  const persistCurrentState = useCallback(() => {
    game.current = {
      ...game.current,
      vitals: { ...vitals.current },
    }
    saveSavedProgress(game.current)
  }, [])

  const enterCreatureScan = useCallback(creature => {
    if (!creature || creature.scanned || navigatingRef.current) return
    navigatingRef.current = true
    keys.current.clear()
    walkTarget.current = null
    pendingScanSlot.current = null
    persistCurrentState()
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
      } else if ((key === 'e' || key === 'enter' || key === ' ') && nearbyCreatureRef.current) {
        event.preventDefault()
        enterCreatureScan(nearbyCreatureRef.current)
      }
    }
    const up = event => keys.current.delete(event.key.toLowerCase())
    const clear = () => {
      keys.current.clear()
      walkTarget.current = null
      pendingScanSlot.current = null
    }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [enterCreatureScan])

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
      size.current = { width, height, dpr, scale: width < 650 ? 1.0 : 1.35 }
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
        // Keep walkTarget locked on a clicked roaming creature until arrival
        if (pendingScanSlot.current !== null) {
          const targetCreature = creatures.find(c => c.slot === pendingScanSlot.current && !c.scanned)
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
          if (Math.hypot(dx, dy) > 6) {
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

        // Check nearest unscanned creature for interaction
        let closestUnscanned = null
        let closestDist = Infinity
        for (const creature of creatures) {
          if (creature.scanned) continue
          const d = distance(game.current.player, creature)
          if (d < closestDist) {
            closestDist = d
            closestUnscanned = creature
          }
        }

        nearbyCreatureRef.current = closestUnscanned && closestDist <= INTERACT_RANGE
          ? closestUnscanned
          : null

        if (
          pendingScanSlot.current !== null &&
          closestUnscanned &&
          closestUnscanned.slot === pendingScanSlot.current &&
          closestDist <= WALK_TO_SCAN_RANGE
        ) {
          enterCreatureScan(closestUnscanned)
          return
        }

        if (
          moving &&
          now - mountedAt > 750 &&
          closestUnscanned &&
          closestDist <= TOUCH_SCAN_RANGE
        ) {
          enterCreatureScan(closestUnscanned)
          return
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
      const scale = width < 650 ? 1.1 : 1.35
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
        nearbyCreatureRef.current ? nearbyCreatureRef.current.slot : -1
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
          roverReached: game.current.roverReached,
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
  }, [enterCreatureScan, persistCurrentState, reducedMotion])

  const pointerWalk = event => {
    if (event.button !== 0 || navigatingRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const view = size.current
    const clickX = (event.clientX - rect.left - view.width / 2) / view.scale + camera.current.x
    const clickY = (event.clientY - rect.top - view.height / 2) / view.scale + camera.current.y

    // Check if player clicked on an unscanned creature silhouette
    const clickedCreature = liveCreatures.current.find(creature => {
      if (creature.scanned) return false
      const centerX = creature.x
      const centerY = creature.y - 24
      return Math.hypot(clickX - centerX, clickY - centerY) <= 44
    })

    if (clickedCreature) {
      if (distance(game.current.player, clickedCreature) <= INTERACT_RANGE) {
        enterCreatureScan(clickedCreature)
        return
      }
      pendingScanSlot.current = clickedCreature.slot
      walkTarget.current = { x: clickedCreature.x, y: clickedCreature.y }
      return
    }

    pendingScanSlot.current = null
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
    nearbyCreatureRef.current = null
    setDismissedRoverBanner(false)
    setVitalsState({ ...fresh.vitals })
    setHudState({
      scannedCount: 0,
      totalCount: SCRAP_TRAIL_SITES.length,
      nearbySlot: null,
      roverReached: false,
    })
  }

  // Dynamic Oxygen Ring Color based on remaining O2
  const o2Color = vitalsState.oxygen > 35
    ? ['#38ef7d', '#11998e']
    : vitalsState.oxygen > 18
    ? ['#f7b733', '#fc4a1a']
    : ['#ff416c', '#ff4b2b']

  const allScanned = hudState.scannedCount >= hudState.totalCount
  const activeNearby = hudState.nearbySlot !== null
    ? liveCreatures.current.find(c => c.slot === hudState.nearbySlot && !c.scanned)
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
        aria-label="Mars game map. Use W A S D or arrow keys to move, click creatures or press E near silhouettes eating rover scrap to scan them."
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
            Creatures Scanned: {hudState.scannedCount} / {hudState.totalCount}
          </strong>
          <span className="mars-tracker-sub">
            {allScanned
              ? 'All silhouettes catalogued · Head to Perseverance Rover'
              : 'Track unknown silhouettes feasting on Perseverance scrap'}
          </span>
        </div>
      </div>

      {/* Interactive Scan Prompt when near an unscanned creature */}
      {activeNearby && (
        <button
          type="button"
          className="mars-scan-prompt"
          onClick={() => enterCreatureScan(activeNearby)}
        >
          ✦ Scan Unknown Creature [E]
        </button>
      )}

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
