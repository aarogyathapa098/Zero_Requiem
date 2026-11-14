import { useEffect, useRef, useState } from 'react'
import holoImgSrc from '../../game/assets/media/hologram_slide_transparent.png'
import holoVideoSrc from '../../game/assets/media/hologram_slide_transparent.webm'
import { ROVER_RECORDS, SCRAP_PICKUPS, SUPPLY_PICKUPS } from '../data/roverRecords'
import { gameToLonLat } from './marsGeo'
import { distance, PERSEVERANCE_ROVER } from './marsModel'

function CategoryIcon({ id }) {
  switch (id) {
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
      )
    case 'files':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13h8M8 17h6" />
        </svg>
      )
    case 'vitals':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
    case 'specimens':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      )
    case 'chrono':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      )
  }
}

function formatClock(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0))
  const mins = String(Math.floor(total / 60)).padStart(2, '0')
  const secs = String(total % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

export default function HoloPhoneHUD({
  vitals,
  creatures = [],
  collectedScrap = [],
  collectedRecords = [],
  collectedSupplies = [],
  inventoryCounts = { food: 0, water: 0, oxygen: 0 },
  player = { x: 2100, y: 1050 },
  trailElapsed = 0,
  onConsumeSupply,
  onOpenRecord,
}) {
  const [phase, setPhase] = useState('closed') // 'closed' | 'opening' | 'open'
  const [activeCategory, setActiveCategory] = useState(null)
  const [clock, setClock] = useState(() => new Date())
  const videoRef = useRef(null)
  const revealTimerRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }
  }, [])

  const openHologram = () => {
    if (phase !== 'closed') return
    setPhase('opening')
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      video.play().catch(() => {
        setPhase('open')
      })
    }
    // Reveal the coded hologram UI once the slide-out animation reaches its unfolded frame
    revealTimerRef.current = setTimeout(() => {
      setPhase('open')
    }, 1050)
  }

  const closeHologram = () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPhase('closed')
    setActiveCategory(null)
  }

  const totalConsumables =
    (inventoryCounts.food || 0) +
    (inventoryCounts.water || 0) +
    (inventoryCounts.oxygen || 0)
  const totalItems = collectedScrap.length + totalConsumables + collectedRecords.length
  const scannedCount = creatures.filter(c => c.scanned).length
  const coords = gameToLonLat(player)
  const distToPerseveranceM = Math.round(distance(player, PERSEVERANCE_ROVER) * 6.5)

  const categories = [
    {
      id: 'inventory',
      label: 'Inventory',
      sub: `${collectedScrap.length} Scrap · ${totalConsumables} Rations`,
    },
    {
      id: 'files',
      label: 'Rover Files',
      sub: `${collectedRecords.length}/${ROVER_RECORDS.length} Records`,
    },
    {
      id: 'vitals',
      label: 'Vitals & Suit',
      sub: `O₂ ${Math.round(vitals.oxygen)}% · HP ${Math.round(vitals.health)}%`,
    },
    {
      id: 'specimens',
      label: 'Specimens',
      sub: `${scannedCount}/${creatures.length} Catalogued`,
    },
    {
      id: 'chrono',
      label: 'Chrono & Sol',
      sub: `${formatClock(clock)} · Sol 1421`,
    },
    {
      id: 'nav',
      label: 'Nav Telemetry',
      sub: `${distToPerseveranceM}m to Rover`,
    },
  ]

  const uncollectedRecords = ROVER_RECORDS.filter(r => !collectedRecords.includes(r.id))
  const nearestRecord = uncollectedRecords.reduce(
    (best, item) => {
      const d = distance(player, item)
      return d < best.dist ? { item, dist: d } : best
    },
    { item: null, dist: Infinity }
  )

  const uncollectedSupplies = SUPPLY_PICKUPS.filter(s => !collectedSupplies.includes(s.id))
  const nearestSupply = uncollectedSupplies.reduce(
    (best, item) => {
      const d = distance(player, item)
      return d < best.dist ? { item, dist: d } : best
    },
    { item: null, dist: Infinity }
  )

  return (
    <aside
      className={`holo-phone-dock is-${phase}`}
      aria-label="Holographic field terminal"
    >
      {/* ── Docked State: Right-side handle from hologram_slide_transparent.png ── */}
      {phase === 'closed' && (
        <div className="holo-docked-wrap">
          <img
            src={holoImgSrc}
            alt=""
            className="holo-docked-img"
            draggable="false"
          />
          <button
            type="button"
            className="holo-left-edge-trigger"
            onClick={openHologram}
            title="Press left edge of holographic phone to open inventory & telemetry"
          >
            <span className="holo-edge-chevron" aria-hidden="true">◀</span>
            <span className="holo-edge-label">HOLO</span>
            <span className="holo-edge-badge">{totalItems}</span>
          </button>
        </div>
      )}

      {/* ── Unfolding / Open State: hologram_slide_transparent.webm + Coded OS ── */}
      <div
        className={`holo-open-stage${phase !== 'closed' ? ' is-visible' : ''}`}
        aria-hidden={phase === 'closed'}
      >
        <video
          ref={videoRef}
          className="holo-video-media"
          src={holoVideoSrc}
          muted
          playsInline
          preload="auto"
          onEnded={() => setPhase('open')}
        />

        {/* Clickable left handle grip to fold/dock the hologram */}
        <button
          type="button"
          className="holo-handle-close"
          onClick={closeHologram}
          title="Fold holographic phone"
        >
          <span>▶ FOLD</span>
        </button>

        {phase === 'open' && (
          <>
            {/* ── Main Left Glass Pane (20.6% -> 67.4%) ─────────────────────── */}
            <div className="holo-glass-main">
              <header className="holo-os-header">
                {activeCategory ? (
                  <button
                    type="button"
                    className="holo-back-btn"
                    onClick={() => setActiveCategory(null)}
                  >
                    ← Categories
                  </button>
                ) : (
                  <span className="holo-os-brand">
                    HOLO-OS v4.2 // JEZERO ARCHIVE LINK
                  </span>
                )}
                <span className="holo-os-coords">
                  {coords.latitude.toFixed(3)}°N · {coords.longitude.toFixed(3)}°E
                </span>
              </header>

              {/* Category Home Grid */}
              {!activeCategory && (
                <div className="holo-category-grid" role="list">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className="holo-category-tile"
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      <span className="holo-cat-icon">
                        <CategoryIcon id={cat.id} />
                      </span>
                      <span className="holo-cat-text">
                        <strong>{cat.label}</strong>
                        <small>{cat.sub}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* In-Depth View: INVENTORY (Scrap Metals, Food, Water, O2, Files) */}
              {activeCategory === 'inventory' && (
                <div className="holo-depth-pane">
                  <div className="holo-depth-section">
                    <span className="holo-sec-title">
                      EVA Consumables (Click to Use)
                    </span>
                    <div className="holo-supply-row">
                      <button
                        type="button"
                        className="holo-use-btn"
                        disabled={!inventoryCounts.food}
                        onClick={() => onConsumeSupply?.('food')}
                      >
                        <span>🍎 Ration ({inventoryCounts.food})</span>
                        <small>+30 Hunger</small>
                      </button>
                      <button
                        type="button"
                        className="holo-use-btn"
                        disabled={!inventoryCounts.water}
                        onClick={() => onConsumeSupply?.('water')}
                      >
                        <span>💧 Water ({inventoryCounts.water})</span>
                        <small>+35 H₂O</small>
                      </button>
                      <button
                        type="button"
                        className="holo-use-btn"
                        disabled={!inventoryCounts.oxygen}
                        onClick={() => onConsumeSupply?.('oxygen')}
                      >
                        <span>🫧 O₂ Cell ({inventoryCounts.oxygen})</span>
                        <small>+35 O₂</small>
                      </button>
                    </div>
                  </div>

                  <div className="holo-depth-section">
                    <span className="holo-sec-title">
                      Perseverance Scrap Metal Salvaged ({collectedScrap.length}/{SCRAP_PICKUPS.length})
                    </span>
                    <div className="holo-scrap-list">
                      {SCRAP_PICKUPS.map(scrap => {
                        const owned = collectedScrap.includes(scrap.id)
                        return (
                          <div
                            key={scrap.id}
                            className={`holo-scrap-item${owned ? ' is-owned' : ''}`}
                          >
                            <div>
                              <strong>
                                {owned ? `⚙ ${scrap.name}` : `🔒 Unrecovered Scrap #${scrap.slot + 1}`}
                              </strong>
                              <small>
                                {owned
                                  ? `${scrap.grade} · ${scrap.weight} — ${scrap.description}`
                                  : 'Feasted on by an unknown creature along the rover trail. Scan or approach its scrap pile to salvage.'}
                              </small>
                            </div>
                            <span className="holo-scrap-tag">
                              {owned ? 'SALVAGED' : `SITE #${scrap.slot + 1}`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* In-Depth View: ROVER FILES / RECORDS */}
              {activeCategory === 'files' && (
                <div className="holo-depth-pane">
                  <span className="holo-sec-title">
                    Scattered NASA &amp; Rover Chronicles ({collectedRecords.length}/{ROVER_RECORDS.length} Recovered)
                  </span>
                  <div className="holo-files-list">
                    {ROVER_RECORDS.map(rec => {
                      const unlocked = collectedRecords.includes(rec.id)
                      return (
                        <button
                          key={rec.id}
                          type="button"
                          className={`holo-file-row${unlocked ? ' is-unlocked' : ''}`}
                          disabled={!unlocked}
                          onClick={() => unlocked && onOpenRecord?.(rec)}
                        >
                          <span className="holo-file-num">#{rec.number}</span>
                          <span className="holo-file-info">
                            <strong>
                              {unlocked ? rec.title : 'Unrecovered Paper Record'}
                            </strong>
                            <small>
                              {unlocked
                                ? `${rec.category} · Click to read broken record`
                                : `Scattered near (${rec.x}, ${rec.y}) on the Mars surface`}
                            </small>
                          </span>
                          <span className="holo-file-action">
                            {unlocked ? 'READ ↗' : 'LOCKED'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* In-Depth View: VITALS & SUIT */}
              {activeCategory === 'vitals' && (
                <div className="holo-depth-pane">
                  <span className="holo-sec-title">
                    Biometric &amp; EVA Suit Diagnostics
                  </span>
                  <div className="holo-vitals-detail-grid">
                    <div className="holo-vital-card">
                      <span>O₂ Reserve</span>
                      <strong>{Math.round(vitals.oxygen)}%</strong>
                      <small>
                        {vitals.oxygen > 35 ? 'Nominal pressure' : 'CRITICAL · Low O₂ draining health'}
                      </small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Suit / Health</span>
                      <strong>{Math.round(vitals.health)}%</strong>
                      <small>Thermal &amp; radiation shielding active</small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Calories (Hunger)</span>
                      <strong>{Math.round(vitals.hunger)}%</strong>
                      <small>{inventoryCounts.food} ration bars in pack</small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Hydration (Water)</span>
                      <strong>{Math.round(vitals.water)}%</strong>
                      <small>{inventoryCounts.water} water pouches in pack</small>
                    </div>
                  </div>
                </div>
              )}

              {/* In-Depth View: SPECIMENS */}
              {activeCategory === 'specimens' && (
                <div className="holo-depth-pane">
                  <span className="holo-sec-title">
                    Scrap-Feasting Martian Specimens ({scannedCount}/{creatures.length})
                  </span>
                  <div className="holo-specimen-grid">
                    {creatures.map(c => (
                      <div
                        key={c.slot}
                        className={`holo-specimen-card${c.scanned ? ' is-scanned' : ''}`}
                      >
                        <img
                          src={c.scanned ? c.characterSrc : c.silhouetteSrc}
                          alt={c.scanned ? c.name : 'Unknown silhouette'}
                        />
                        <div>
                          <strong>{c.scanned ? c.name : `Unknown #${c.slot + 1}`}</strong>
                          <small>
                            {c.scanned
                              ? 'Catalogued · Scrap salvaged'
                              : `${Math.round(c.distToRover * 6.5)}m from Perseverance`}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* In-Depth View: CHRONO & SOL */}
              {activeCategory === 'chrono' && (
                <div className="holo-depth-pane">
                  <span className="holo-sec-title">
                    Planetary &amp; Mission Chronometer
                  </span>
                  <div className="holo-vitals-detail-grid">
                    <div className="holo-vital-card">
                      <span>Local Terminal Time</span>
                      <strong>{formatClock(clock)}</strong>
                      <small>Synchronized with orbiter relay</small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Mission Elapsed (EVA)</span>
                      <strong>{formatDuration(trailElapsed)}</strong>
                      <small>Active surface traverse duration</small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Martian Sol</span>
                      <strong>SOL 1421</strong>
                      <small>Jezero Crater · Perseverance Sector</small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Rover Distance</span>
                      <strong>{distToPerseveranceM} m</strong>
                      <small>{scannedCount}/6 creature signals cleared</small>
                    </div>
                  </div>
                </div>
              )}

              {/* In-Depth View: NAV TELEMETRY */}
              {activeCategory === 'nav' && (
                <div className="holo-depth-pane">
                  <span className="holo-sec-title">
                    Surface Navigation &amp; Signal Finder
                  </span>
                  <div className="holo-vitals-detail-grid">
                    <div className="holo-vital-card">
                      <span>Explorer Coordinates</span>
                      <strong>
                        {Math.round(player.x)}, {Math.round(player.y)}
                      </strong>
                      <small>
                        {coords.latitude.toFixed(4)}°N, {coords.longitude.toFixed(4)}°E
                      </small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Nearest Paper Record</span>
                      <strong>
                        {nearestRecord.item
                          ? `#${nearestRecord.item.number} (${Math.round(nearestRecord.dist * 6.5)}m)`
                          : 'All 14 Found!'}
                      </strong>
                      <small>
                        {nearestRecord.item ? nearestRecord.item.title : 'Archive complete'}
                      </small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Nearest Supply Pack</span>
                      <strong>
                        {nearestSupply.item
                          ? `${nearestSupply.item.kind.toUpperCase()} (${Math.round(nearestSupply.dist * 6.5)}m)`
                          : 'All Collected'}
                      </strong>
                      <small>
                        {nearestSupply.item ? nearestSupply.item.name : 'No remaining caches'}
                      </small>
                    </div>
                    <div className="holo-vital-card">
                      <span>Perseverance Rover</span>
                      <strong>{distToPerseveranceM} m</strong>
                      <small>
                        {scannedCount >= creatures.length
                          ? 'Waypoint unlocked!'
                          : `Scan ${creatures.length - scannedCount} more creature(s)`}
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Sub-Pane Inside Glass (68.8% -> 80.6%) ──────────────── */}
            <div className="holo-glass-side">
              <div className="holo-side-clock">
                <small>SOL 1421 · TIME</small>
                <strong>{formatClock(clock)}</strong>
              </div>

              <div className="holo-side-vitals">
                {[
                  { label: 'O₂', val: vitals.oxygen, col: '#38ef7d' },
                  { label: 'HP', val: vitals.health, col: '#e0403a' },
                  { label: 'FD', val: vitals.hunger, col: '#f0922e' },
                  { label: 'H₂O', val: vitals.water, col: '#3cc0ee' },
                ].map(bar => (
                  <div key={bar.label} className="holo-mini-bar">
                    <div className="holo-mini-bar-top">
                      <span>{bar.label}</span>
                      <span>{Math.round(bar.val)}%</span>
                    </div>
                    <div className="holo-mini-track">
                      <span
                        style={{
                          width: `${Math.max(0, Math.min(100, bar.val))}%`,
                          background: bar.col,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="holo-side-counts">
                <span>⚙ SCRAP: {collectedScrap.length}/6</span>
                <span>📄 FILES: {collectedRecords.length}/14</span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
