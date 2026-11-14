import { useEffect, useRef, useState } from 'react'
import { MAP_SIZE, movePlayer, newProgress, restoreProgress, SAVE_KEY } from './marsModel'
import { createTerrain, renderMap, renderMinimap } from './marsRenderer'
import { windAt } from './marsWeather'
import { VitalsHUD, Icons } from './VitalsHUD'
import './mars.css'

const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'])
let sessionProgress = null

function loadProgress() {
  let saved
  try { saved = localStorage.getItem(SAVE_KEY) }
  catch { return restoreProgress(sessionProgress) }
  if (sessionProgress) return restoreProgress(sessionProgress)
  try { return restoreProgress(JSON.parse(saved)) }
  catch { return newProgress() }
}

export default function MarsGame({ reducedMotion = false }) {
  const loaded = useRef(loadProgress())
  const game = useRef(loaded.current)
  const canvas = useRef(null)
  const minimap = useRef(null)
  const host = useRef(null)
  const keys = useRef(new Set())
  const walkTarget = useRef(null)
  const camera = useRef({ ...loaded.current.player })
  const wind = useRef(windAt(0))
  const size = useRef({ width: 1000, height: 650, scale: 1, dpr: 1 })

  // ── Survival Vitals State ────────────────────────────────────────────────
  const vitals = useRef({
    oxygen: 100,
    maxOxygen: 100,
    health: 100,
    maxHealth: 100,
    hunger: 100,
    maxHunger: 100,
    water: 100,
    maxWater: 100,
  })
  const [vitalsState, setVitalsState] = useState({ ...vitals.current })

  useEffect(() => {
    const save = () => {
      sessionProgress = game.current
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.current)) }
      catch { /* storage fallback */ }
    }
    const timer = setInterval(save, 3000)
    window.addEventListener('pagehide', save)
    return () => { clearInterval(timer); window.removeEventListener('pagehide', save); save() }
  }, [])

  useEffect(() => {
    const down = event => {
      if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return
      const key = event.key.toLowerCase()
      if (movementKeys.has(key)) {
        event.preventDefault()
        keys.current.add(key)
        walkTarget.current = null
      }
    }
    const up = event => keys.current.delete(event.key.toLowerCase())
    const clear = () => { keys.current.clear(); walkTarget.current = null }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

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

    let previous = performance.now()
    let lastHud = 0
    let frame

    const update = now => {
      const dt = Math.min((now - previous) / 1000, 0.05)
      previous = now
      wind.current = windAt(now / 1000)
      let moving = false

      if (!document.hidden) {
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
        game.current = {
          ...game.current,
          player: moving ? movePlayer(game.current.player, direction, dt, wind.current, 100) : game.current.player,
        }

        // ── Vitals Depletion Simulation ──────────────────────────────────────
        // 1. Oxygen: Depletes steadily at 1 every 60 seconds (dt / 60)
        vitals.current.oxygen = Math.max(0, vitals.current.oxygen - dt / 60)

        // 2. Hunger: Depletes steadily over time (1 every 30 seconds)
        vitals.current.hunger = Math.max(0, vitals.current.hunger - dt / 30)

        // 3. Water: Depletes steadily over time (1 every 20 seconds)
        vitals.current.water = Math.max(0, vitals.current.water - dt / 20)

        // 4. Health: Proportionally depletes when oxygen drops below 35 (in 30-40 range)
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
        [],
        camera.current,
        size.current,
        walkTarget.current,
        now / 1000,
        moving,
        reducedMotion,
        wind.current,
        false,
        false,
        false
      )

      if (now - lastHud > 120) {
        lastHud = now
        if (minimap.current) {
          renderMinimap(
            minimap.current,
            terrain,
            game.current,
            [],
            false,
            now / 1000,
            reducedMotion,
            false
          )
        }
        setVitalsState({ ...vitals.current })
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
  }, [reducedMotion])

  const pointerWalk = event => {
    if (event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const view = size.current
    const clickX = (event.clientX - rect.left - view.width / 2) / view.scale + camera.current.x
    const clickY = (event.clientY - rect.top - view.height / 2) / view.scale + camera.current.y
    walkTarget.current = {
      x: Math.max(45, Math.min(MAP_SIZE.width - 45, clickX)),
      y: Math.max(45, Math.min(MAP_SIZE.height - 45, clickY)),
    }
  }

  // Dynamic Oxygen Ring Color based on remaining O2
  const o2Color = vitalsState.oxygen > 35
    ? ['#38ef7d', '#11998e']
    : vitalsState.oxygen > 18
    ? ['#f7b733', '#fc4a1a']
    : ['#ff416c', '#ff4b2b']

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
        aria-label="Mars game map. Use W A S D or arrow keys to move, or click anywhere to walk."
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
          aria-label="Circular local minimap centered on your explorer"
        />
      </div>

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
