import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  computeMapCreatures,
  distance,
  getActiveTargetCreature,
  loadSavedProgress,
  MAP_SIZE,
  movePlayer,
  PERSEVERANCE_ROVER,
  resetSavedProgress,
  saveSavedProgress,
  SCRAP_TRAIL_SITES,
} from './marsModel'
import { ROVER_RECORDS, SUPPLY_PICKUPS } from '../data/roverRecords'
import {
  completeMissionTask,
  loadMissionProgress,
  resetMissionProgress,
} from '../../game/data/missions'
import MissionGuideModal from '../../game/components/MissionGuideModal'
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
const CRATE_INTERACT_RANGE = 64
const RECORD_INTERACT_RANGE = 52
const SUPPLY_INTERACT_RANGE = 48
const AUTO_PICKUP_RANGE = 24

export default function MarsGame({ reducedMotion = false }) {
  const navigate = useNavigate()
  const loaded = useRef(loadSavedProgress())
  const game = useRef(loaded.current)
  const missionRef = useRef(loadMissionProgress())
  const canvas = useRef(null)
  const minimap = useRef(null)
  const host = useRef(null)
  const keys = useRef(new Set())
  const walkTarget = useRef(null)
  const pendingScanSlot = useRef(null)
  const pendingCrateSlot = useRef(null)
  const pendingRecordId = useRef(null)
  const liveCreatures = useRef(computeMapCreatures(loaded.current, 0, reducedMotion))
  const nearbyCreatureRef = useRef(null)
  const nearbyCrateRef = useRef(null)
  const nearbyRecordRef = useRef(null)
  const nearbySupplyRef = useRef(null)
  const navigatingRef = useRef(false)
  const camera = useRef({ ...loaded.current.player })
  const wind = useRef(windAt(0))
  const facing = useRef(1)
  const size = useRef({ width: 1000, height: 650, scale: 2.5, dpr: 1 })

  // ── Survival Vitals & Serial Mission State ──────────────────────────────
  const vitals = useRef({ ...loaded.current.vitals })
  const [vitalsState, setVitalsState] = useState({ ...vitals.current })
  const [missionState, setMissionState] = useState(() => loadMissionProgress())
  const [activeRecord, setActiveRecord] = useState(null)
  const [showMissionGuide, setShowMissionGuide] = useState(false)
  const [storyBanner, setStoryBanner] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const toastTimerRef = useRef(null)

  const [hudState, setHudState] = useState(() => ({
    scannedCount: loaded.current.scannedSlots.length,
    totalCount: SCRAP_TRAIL_SITES.length,
    nearbySlot: null,
    nearbyCrateSlot: null,
    nearbyRecordId: null,
    nearbySupplyId: null,
    roverReached: loaded.current.roverReached,
    collectedScrap: [...loaded.current.collectedScrap],
    collectedRecords: [...loaded.current.collectedRecords],
    collectedSupplies: [...loaded.current.collectedSupplies],
    inventoryCounts: { ...loaded.current.inventoryCounts },
    player: { ...loaded.current.player },
    trailElapsed: loaded.current.trailElapsed || 0,
    creatures: liveCreatures.current,
  }))
  const [dismissedFinaleModal, setDismissedFinaleModal] = useState(false)

  const showToast = useCallback(text => {
    setToastMessage(text)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3400)
  }, [])

  const persistCurrentState = useCallback(() => {
    game.current = {
      ...game.current,
      vitals: { ...vitals.current },
    }
    saveSavedProgress(game.current)
  }, [])

  const syncFromStorage = useCallback(() => {
    const freshMap = loadSavedProgress()
    const freshMission = loadMissionProgress()
    game.current = freshMap
    vitals.current = { ...freshMap.vitals }
    missionRef.current = freshMission
    setVitalsState({ ...freshMap.vitals })
    setMissionState(freshMission)
  }, [])

  const openRoverRecord = useCallback(record => {
    if (!record) return
    keys.current.clear()
    walkTarget.current = null
    pendingRecordId.current = null

    // Mission 5 integration: Classified historical reports require the Data-Decryptor Chip
    const canReadReports =
      missionRef.current.reportsDecrypted ||
      missionRef.current.obtainedScraps.includes(5) ||
      missionRef.current.completedMissions.includes(5)

    if (!canReadReports) {
      showToast(
        '🔒 Encrypted Crew Report — Defeat Alien 5 (Archive Sentinel) for the Data-Decryptor Chip (Mission 5)!'
      )
      return
    }

    const alreadyOwned = game.current.collectedRecords.includes(record.id)
    if (!alreadyOwned) {
      game.current = {
        ...game.current,
        collectedRecords: [...game.current.collectedRecords, record.id],
        research: (game.current.research || 0) + 10,
      }
      persistCurrentState()
      showToast(`📄 Decrypted Report #${record.number}: ${record.title}`)
    }
    setActiveRecord(record)
  }, [persistCurrentState, showToast])

  const handleRepairMissionCrate = useCallback(creature => {
    if (!creature) return
    keys.current.clear()
    walkTarget.current = null
    pendingCrateSlot.current = null

    if (creature.taskCompleted) {
      showToast(`✓ ${creature.targetObject} is already online!`)
      return
    }

    if (!creature.scrapObtained) {
      showToast(
        `🔒 ${creature.targetObject} Damaged — Defeat ${creature.alienTitle} first to obtain ${creature.scrapName}!`
      )
      return
    }

    // Persist current vitals before applying mission repair bonuses
    persistCurrentState()
    const updatedMission = completeMissionTask(creature.characterId)
    const updatedMap = loadSavedProgress()

    game.current = updatedMap
    vitals.current = { ...updatedMap.vitals }
    missionRef.current = updatedMission
    setVitalsState({ ...updatedMap.vitals })
    setMissionState(updatedMission)

    showToast(`🔧 Repaired ${creature.targetObject} with ${creature.scrapName}! (${creature.systemEffectLabel})`)
    setStoryBanner({
      title: `★ Mission ${creature.missionNumber} Complete: ${creature.missionTitle}`,
      body: creature.completionStory,
      effect: creature.systemEffectLabel,
    })

    // Mission 5 bonus: open the decrypted crew chronicle modal so player can read it immediately
    if (creature.missionNumber === 5 && ROVER_RECORDS.length > 0) {
      setActiveRecord(ROVER_RECORDS[0])
    }
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
    showToast(`+1 ${supply.name} added to Suit Inventory`)
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
    if (!creature || !creature.unlocked || creature.defeated || navigatingRef.current) return
    navigatingRef.current = true
    keys.current.clear()
    walkTarget.current = null
    pendingScanSlot.current = null
    pendingCrateSlot.current = null
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
        pendingCrateSlot.current = null
        pendingRecordId.current = null
      } else if ((key === 'e' || key === 'enter' || key === ' ') && !activeRecord && !showMissionGuide) {
        if (nearbyCreatureRef.current) {
          event.preventDefault()
          enterCreatureScan(nearbyCreatureRef.current)
        } else if (nearbyCrateRef.current) {
          event.preventDefault()
          handleRepairMissionCrate(nearbyCrateRef.current)
        }
      } else if (key === 'f' && !activeRecord && !showMissionGuide) {
        if (nearbyCrateRef.current) {
          event.preventDefault()
          handleRepairMissionCrate(nearbyCrateRef.current)
        } else if (nearbyRecordRef.current) {
          event.preventDefault()
          openRoverRecord(nearbyRecordRef.current)
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
      pendingCrateSlot.current = null
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
  }, [activeRecord, collectSupplyItem, enterCreatureScan, handleRepairMissionCrate, openRoverRecord, showMissionGuide])

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
      const activeSerialCreature = getActiveTargetCreature(creatures)

      if (!document.hidden && !navigatingRef.current) {
        if (pendingScanSlot.current !== null) {
          const targetCreature = creatures.find(
            c => c.slot === pendingScanSlot.current && c.unlocked && !c.defeated
          )
          if (targetCreature) {
            walkTarget.current = { x: targetCreature.x, y: targetCreature.y }
          } else {
            pendingScanSlot.current = null
          }
        }

        if (pendingCrateSlot.current !== null) {
          const targetCrate = creatures.find(
            c => c.slot === pendingCrateSlot.current && c.unlocked
          )
          if (targetCrate) {
            walkTarget.current = { x: targetCrate.crateX, y: targetCrate.crateY }
          } else {
            pendingCrateSlot.current = null
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

        // 1. Check nearest unlocked & undefeated Alien
        let closestCreature = null
        let closestDist = Infinity
        for (const creature of creatures) {
          if (!creature.unlocked || creature.defeated) continue
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

        // 2. Check nearest unlocked Mission Crate / Repair Target
        let closestCrate = null
        let closestCrateDist = Infinity
        for (const creature of creatures) {
          if (!creature.unlocked || creature.taskCompleted) continue
          const d = Math.hypot(
            game.current.player.x - creature.crateX,
            game.current.player.y - creature.crateY
          )
          if (d < closestCrateDist) {
            closestCrateDist = d
            closestCrate = creature
          }
        }
        nearbyCrateRef.current = closestCrate && closestCrateDist <= CRATE_INTERACT_RANGE
          ? closestCrate
          : null

        if (
          pendingCrateSlot.current !== null &&
          closestCrate &&
          closestCrate.slot === pendingCrateSlot.current &&
          closestCrateDist <= 38
        ) {
          handleRepairMissionCrate(closestCrate)
        }

        // 3. Check nearest white paper Rover Record
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

        // 4. Check uncollected Supply packs
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

        // ── Vitals Depletion Simulation (Mission 4 clogs intake until Carbon Filter is fixed) ──
        const isIntakeClogged =
          activeSerialCreature?.missionNumber === 4 && !missionRef.current.carbonFilterRestored
        const o2DrainRate = isIntakeClogged ? dt / 22 : dt / 60
        vitals.current.oxygen = Math.max(0, vitals.current.oxygen - o2DrainRate)
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
        nearbySupplyRef.current ? nearbySupplyRef.current.id : null,
        nearbyCrateRef.current ? nearbyCrateRef.current.slot : -1
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
        missionRef.current = loadMissionProgress()
        setMissionState(missionRef.current)
        setVitalsState({ ...vitals.current })
        setHudState({
          scannedCount: game.current.scannedSlots.length,
          totalCount: SCRAP_TRAIL_SITES.length,
          nearbySlot: nearbyCreatureRef.current ? nearbyCreatureRef.current.slot : null,
          nearbyCrateSlot: nearbyCrateRef.current ? nearbyCrateRef.current.slot : null,
          nearbyRecordId: nearbyRecordRef.current ? nearbyRecordRef.current.id : null,
          nearbySupplyId: nearbySupplyRef.current ? nearbySupplyRef.current.id : null,
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
  }, [collectSupplyItem, enterCreatureScan, handleRepairMissionCrate, openRoverRecord, persistCurrentState, reducedMotion])

  const pointerWalk = event => {
    if (event.button !== 0 || navigatingRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const view = size.current
    const clickX = (event.clientX - rect.left - view.width / 2) / view.scale + camera.current.x
    const clickY = (event.clientY - rect.top - view.height / 2) / view.scale + camera.current.y

    // 1. Check if player clicked on an unlocked Mission Crate / Repair Target
    const clickedCrate = liveCreatures.current.find(
      creature =>
        creature.unlocked &&
        !creature.taskCompleted &&
        Math.hypot(clickX - creature.crateX, clickY - creature.crateY) <= 24
    )
    if (clickedCrate) {
      if (
        Math.hypot(
          game.current.player.x - clickedCrate.crateX,
          game.current.player.y - clickedCrate.crateY
        ) <= CRATE_INTERACT_RANGE
      ) {
        handleRepairMissionCrate(clickedCrate)
        return
      }
      pendingCrateSlot.current = clickedCrate.slot
      pendingScanSlot.current = null
      pendingRecordId.current = null
      walkTarget.current = { x: clickedCrate.crateX, y: clickedCrate.crateY }
      return
    }

    // 2. Check if player clicked on an unlocked, undefeated Alien
    const clickedCreature = liveCreatures.current.find(creature => {
      if (!creature.unlocked || creature.defeated) return false
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
      pendingCrateSlot.current = null
      pendingRecordId.current = null
      walkTarget.current = { x: clickedCreature.x, y: clickedCreature.y }
      return
    }

    // 3. Check if player clicked on a white paper Rover Record
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
      pendingCrateSlot.current = null
      walkTarget.current = { x: clickedRecord.x, y: clickedRecord.y }
      return
    }

    // 4. Check if player clicked on an uncollected Supply Pack
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
      pendingCrateSlot.current = null
      pendingRecordId.current = null
      walkTarget.current = { x: clickedSupply.x, y: clickedSupply.y }
      return
    }

    pendingScanSlot.current = null
    pendingCrateSlot.current = null
    pendingRecordId.current = null
    walkTarget.current = {
      x: Math.max(45, Math.min(MAP_SIZE.width - 45, clickX)),
      y: Math.max(45, Math.min(MAP_SIZE.height - 45, clickY)),
    }
  }

  const handleNewExpedition = () => {
    const fresh = resetSavedProgress()
    const freshMissions = resetMissionProgress()
    game.current = fresh
    vitals.current = { ...fresh.vitals }
    missionRef.current = freshMissions
    camera.current = { ...fresh.player }
    walkTarget.current = null
    pendingScanSlot.current = null
    pendingCrateSlot.current = null
    pendingRecordId.current = null
    nearbyCreatureRef.current = null
    nearbyCrateRef.current = null
    nearbyRecordRef.current = null
    nearbySupplyRef.current = null
    setDismissedFinaleModal(false)
    setActiveRecord(null)
    setStoryBanner(null)
    setMissionState(freshMissions)
    setVitalsState({ ...fresh.vitals })
    setHudState({
      scannedCount: 0,
      totalCount: SCRAP_TRAIL_SITES.length,
      nearbySlot: null,
      nearbyCrateSlot: null,
      nearbyRecordId: null,
      nearbySupplyId: null,
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

  const activeMissionCreature = getActiveTargetCreature(hudState.creatures)
  const allMissionsComplete = !activeMissionCreature && missionState.completedMissions.length >= 6

  const activeNearbyCreature = hudState.nearbySlot !== null
    ? liveCreatures.current.find(c => c.slot === hudState.nearbySlot)
    : null
  const activeNearbyCrate = hudState.nearbyCrateSlot !== null
    ? liveCreatures.current.find(c => c.slot === hudState.nearbyCrateSlot)
    : null
  const activeNearbyRecord = hudState.nearbyRecordId
    ? ROVER_RECORDS.find(r => r.id === hudState.nearbyRecordId)
    : null
  const activeNearbySupply = hudState.nearbySupplyId
    ? SUPPLY_PICKUPS.find(s => s.id === hudState.nearbySupplyId)
    : null

  // Determine serial mission step text for the top-right tracker card
  const getSerialStepLabel = () => {
    if (!activeMissionCreature) {
      return {
        eyebrow: 'S.U.N.A. IV Transmission Broadcasted',
        title: `All 6 Missions Complete · Secret Mission Accomplished`,
        sub: 'Survival data & decrypted historical reports transmitted back to Earth.',
      }
    }
    const m = activeMissionCreature
    if (m.stage === 'repair') {
      return {
        eyebrow: `Mission ${m.missionNumber}/6 · ${m.missionTitle} (Step 3/3: Repair)`,
        title: `🔧 Use ${m.scrapName} → Fix ${m.targetObject}`,
        sub: m.taskDescription,
      }
    }
    if (m.stage === 'battle') {
      return {
        eyebrow: `Mission ${m.missionNumber}/6 · ${m.missionTitle} (Step 2/3: Battle)`,
        title: `⚔ Defeat ${m.alienTitle} for ${m.scrapName}`,
        sub: m.scrapBattleText,
      }
    }
    return {
      eyebrow: `Mission ${m.missionNumber}/6 · ${m.missionTitle} (Step 1/3: Encounter)`,
      title: `✦ Locate & Scan ${m.alienTitle}`,
      sub: `${m.behavior} · Then defeat it for ${m.scrapName}.`,
    }
  }

  const serialStep = getSerialStepLabel()

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
        aria-label="Mars game map. Use W A S D or arrow keys to move, follow the serial mission waypoint to encounter aliens, obtain scrap, and repair mission crates."
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
          aria-label="Circular local minimap tracking active mission target"
        />
      </div>

      {/* Serial Mission Tracker HUD in Top Right */}
      <div className="mars-tracker-hud">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="mars-menu-btn"
            style={{
              borderColor: 'rgba(111, 182, 255, 0.75)',
              color: '#d4f7ff',
              background: 'rgba(14, 28, 48, 0.85)',
            }}
            onClick={() => setShowMissionGuide(true)}
          >
            📋 Mission Log ({missionState.completedMissions.length}/6)
          </button>
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
        </div>

        <div className={`mars-tracker-card${allMissionsComplete ? ' is-complete' : ''}`} role="status">
          <span className="mars-tracker-eyebrow">{serialStep.eyebrow}</span>
          <strong className="mars-tracker-count">{serialStep.title}</strong>
          <span className="mars-tracker-sub">{serialStep.sub}</span>
        </div>
      </div>

      {/* Story Progression Banner when a Mission Crate is Repaired */}
      {storyBanner && (
        <div
          className="mars-rover-modal"
          role="dialog"
          aria-label="Mission milestone completed"
          style={{ maxWidth: 520, zIndex: 45 }}
        >
          <strong>{storyBanner.title}</strong>
          <p style={{ marginTop: 8 }}>{storyBanner.body}</p>
          <p style={{ fontSize: 12, color: '#69f0ae', marginTop: 4 }}>
            ✓ System Effect: {storyBanner.effect}
          </p>
          <div className="mars-rover-actions">
            <button type="button" onClick={() => setStoryBanner(null)}>
              Continue Mission →
            </button>
            <button
              type="button"
              onClick={() => {
                setStoryBanner(null)
                setShowMissionGuide(true)
              }}
            >
              View Mission Log
            </button>
          </div>
        </div>
      )}

      {/* Mission 1 Gate: Life-Support HUD & Holographic Terminal are locked until Supply Crate is fixed! */}
      {missionState.hudUnlocked ? (
        <>
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
            onOpenRecord={record => openRoverRecord(record)}
          />

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
        </>
      ) : (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: 20,
            bottom: 20,
            zIndex: 25,
            maxWidth: 340,
            padding: '12px 16px',
            borderRadius: 10,
            border: '1.5px solid rgba(255, 110, 90, 0.78)',
            background: 'rgba(28, 10, 14, 0.88)',
            backdropFilter: 'blur(8px)',
            color: '#ffd8cf',
            fontFamily: 'Consolas, monospace',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          }}
        >
          <strong style={{ display: 'block', color: '#ff8a75', fontSize: 12, letterSpacing: '0.08em' }}>
            ⚠ LIFE-SUPPORT HUD OFFLINE (MISSION 1)
          </strong>
          <small style={{ display: 'block', marginTop: 4, lineHeight: 1.45, color: '#f5d5cc' }}>
            Defeat Alien 1 (Scavenger Dustling) next to your crashed drop pod for Silicate Scrap, then fix the smashed Supply Crate to unlock your HUD.
          </small>
        </div>
      )}

      {/* Floating Pickup Toast */}
      {toastMessage && (
        <div className="mars-pickup-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      {/* Interactive Prompts for Nearby Alien, Mission Crate, Historical Report, or Supply */}
      <div className="mars-prompt-stack">
        {activeNearbyCreature && (
          <button
            type="button"
            className="mars-scan-prompt"
            onClick={() => enterCreatureScan(activeNearbyCreature)}
          >
            {activeNearbyCreature.scanned
              ? `⚔ Battle ${activeNearbyCreature.alienTitle} for ${activeNearbyCreature.scrapName} [E]`
              : `✦ Scan ${activeNearbyCreature.alienTitle} (Mission ${activeNearbyCreature.missionNumber}) [E]`}
          </button>
        )}
        {activeNearbyCrate && (
          <button
            type="button"
            className="mars-scan-prompt is-supply"
            onClick={() => handleRepairMissionCrate(activeNearbyCrate)}
          >
            {activeNearbyCrate.scrapObtained
              ? `🔧 Use ${activeNearbyCrate.scrapName} → ${activeNearbyCrate.taskActionLabel} [F]`
              : `🔒 ${activeNearbyCrate.targetObject} — Defeat ${activeNearbyCrate.alienNumber} for ${activeNearbyCrate.scrapName}`}
          </button>
        )}
        {activeNearbyRecord && (
          <button
            type="button"
            className="mars-scan-prompt is-record"
            onClick={() => openRoverRecord(activeNearbyRecord)}
          >
            {missionState.reportsDecrypted || missionState.obtainedScraps.includes(5)
              ? `📄 Read Decrypted Report #${activeNearbyRecord.number}: ${activeNearbyRecord.title} [F]`
              : `🔒 Encrypted Report #${activeNearbyRecord.number} (Needs Mission 5 Data-Decryptor Chip)`}
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

      {/* Decrypted Historical Report Modal */}
      <RoverRecordModal
        record={activeRecord}
        collectedIds={hudState.collectedRecords}
        onClose={() => setActiveRecord(null)}
        onSelectRecord={rec => setActiveRecord(rec)}
      />

      {/* In-Game Serial Mission Log Modal */}
      <MissionGuideModal
        isOpen={showMissionGuide}
        onClose={() => setShowMissionGuide(false)}
        activeCharacterId={activeMissionCreature?.characterId ?? 6}
        onProgressChange={() => syncFromStorage()}
      />

      {/* Final Mission 6 Completion Modal: S.U.N.A. IV Quantum Relay Transmission Broadcasted */}
      {allMissionsComplete && !dismissedFinaleModal && !storyBanner && (
        <div className="mars-rover-modal" role="dialog" aria-label="Final transmission broadcasted">
          <strong>★ S.U.N.A. IV FINAL TRANSMISSION COMPLETE</strong>
          <p>
            You repaired the S.U.N.A. IV Quantum Relay Crate with Prime Harmonic Scrap and broadcasted all survival data and recovered historical reports back to Earth. Your secret mission is complete!
          </p>
          <div className="mars-rover-actions">
            <button type="button" onClick={() => setDismissedFinaleModal(true)}>
              Keep Exploring Mars
            </button>
            <button type="button" onClick={() => setShowMissionGuide(true)}>
              Review Mission Log (6/6)
            </button>
            <button type="button" onClick={handleNewExpedition}>
              Restart Story Expedition
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
