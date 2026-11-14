import { useEffect, useRef, useState } from 'react'
import holoImgSrc from '../../game/assets/media/hologram-stationary.png'
import holoVideoSrc from '../../game/assets/media/hologram_slide_transparent.webm'
import { ROVER_RECORDS, SCRAP_PICKUPS, SUPPLY_PICKUPS } from '../data/roverRecords'
import { gameToLonLat } from './marsGeo'
import { distance, PERSEVERANCE_ROVER } from './marsModel'

function CategoryIcon({ id }) {
  switch (id) {
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
      )
    case 'files':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13h8M8 17h6" />
        </svg>
      )
    case 'vitals':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
    case 'specimens':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      )
    case 'chrono':
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9">
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

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Start playing the WebM video only after the user clicks the PNG's left edge
  useEffect(() => {
    if (phase !== 'opening') return
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0.45
    video.play().catch(() => {
      setPhase('open')
    })
  }, [phase])

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    // Pause on the fully unfolded frame (~1.85s) so it stays open and never closes on its own
    if (video.currentTime >= 1.85) {
      video.pause()
      if (phase !== 'open') {
        setPhase('open')
      }
    }
  }

  const openHologram = () => {
    if (phase !== 'closed') return
    setPhase('opening')
  }

  const closeHologram = () => {
    if (videoRef.current) {
      videoRef.current.pause()
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
      sub: `${collectedScrap.length} Scrap · ${totalConsumables} Packs`,
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
      sub: `${scannedCount}/${creatures.length} Scanned`,
    },
    {
      id: 'chrono',
      label: 'Chrono & Sol',
      sub: `${formatClock(clock)}`,
    },
    {
      id: 'nav',
      label: 'Nav Radar',
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
      {/* ── Closed State: ONLY render the PNG before it is clicked ────────── */}
      {phase === 'closed' ? (
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
      ) : (
        /* ── Opening / Open State: Mount video only after click, right handle pushed off-screen ── */
        <div className="holo-open-stage is-visible">
          <video
            ref={videoRef}
            className="holo-video-media"
            src={holoVideoSrc}
            muted
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={() => {
              if (videoRef.current) videoRef.current.pause()
              setPhase('open')
            }}
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
              {/* ── Main Left Inner Glass Box (23.2% -> 60.6%, top 24.2% -> 77.0%) ── */}
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
                      HOLO-OS // JEZERO ARCHIVE
                    </span>
                  )}
                  <span className="holo-os-coords">
                    {coords.latitude.toFixed(2)}°N · {coords.longitude.toFixed(2)}°E
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

                {/* In-Depth View: INVENTORY (Scrap Metals, Food, Water, O2) */}
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
                          <span>🍎 Food ({inventoryCounts.food})</span>
                          <small>+30 Hunger</small>
                        </button>
                        <button
                          type="button"
                          className="holo-use-btn"
                          disabled={!inventoryCounts.water}
                          onClick={() => onConsumeSupply?.('water')}
                        >
                          <span>💧 H₂O ({inventoryCounts.water})</span>
                          <small>+35 Water</small>
                        </button>
                        <button
                          type="button"
                          className="holo-use-btn"
                          disabled={!inventoryCounts.oxygen}
                          onClick={() => onConsumeSupply?.('oxygen')}
                        >
                          <span>🫧 O₂ ({inventoryCounts.oxygen})</span>
                          <small>+35 O₂</small>
                        </button>
                      </div>
                    </div>

                    <div className="holo-depth-section">
                      <span className="holo-sec-title">
                        Perseverance Scrap ({collectedScrap.length}/{SCRAP_PICKUPS.length})
                      </span>
                      <div className="holo-scrap-list">
                        {SCRAP_PICKUPS.map(scrap => {
                          const owned = collectedScrap.includes(scrap.id)
                          return (
                            <div
                              key={scrap.id}
                              className={`holo-scrap-item${owned ? ' is-owned' : ''}`}
                            >
                              <div className="holo-file-info">
                                <strong>
                                  {owned ? `⚙ ${scrap.name}` : `🔒 Unknown Scrap #${scrap.slot + 1}`}
                                </strong>
                                <small>
                                  {owned
                                    ? `${scrap.grade} (${scrap.weight}) · ${scrap.description}`
                                    : 'Feasted on by creature along rover trail.'}
                                </small>
                              </div>
                              <span className="holo-scrap-tag">
                                {owned ? 'OWNED' : `SITE #${scrap.slot + 1}`}
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
                      NASA &amp; Rover Chronicles ({collectedRecords.length}/{ROVER_RECORDS.length})
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
                                  ? `${rec.category} · Click to read record`
                                  : `Near (${rec.x}, ${rec.y}) on Mars surface`}
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
                        <small>{vitals.oxygen > 35 ? 'Nominal pressure' : 'Low O₂ warning'}</small>
                      </div>
                      <div className="holo-vital-card">
                        <span>Suit Integrity</span>
                        <strong>{Math.round(vitals.health)}%</strong>
                        <small>Shielding online</small>
                      </div>
                      <div className="holo-vital-card">
                        <span>Calories</span>
                        <strong>{Math.round(vitals.hunger)}%</strong>
                        <small>{inventoryCounts.food} rations available</small>
                      </div>
                      <div className="holo-vital-card">
                        <span>Hydration</span>
                        <strong>{Math.round(vitals.water)}%</strong>
                        <small>{inventoryCounts.water} pouches available</small>
                      </div>
                    </div>
                  </div>
                )}

                {/* In-Depth View: SPECIMENS */}
                {activeCategory === 'specimens' && (
                  <div className="holo-depth-pane">
                    <span className="holo-sec-title">
                      Scrap-Feasting Specimens ({scannedCount}/{creatures.length})
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
                          <div className="holo-file-info">
                            <strong>{c.scanned ? c.name : `Unknown #${c.slot + 1}`}</strong>
                            <small>
                              {c.scanned
                                ? 'Catalogued'
                                : `${Math.round(c.distToRover * 6.5)}m to Rover`}
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
                        <span>Local Time</span>
                        <strong>{formatClock(clock)}</strong>
                        <small>Orbiter relay sync</small>
                      </div>
                      <div className="holo-vital-card">
                        <span>EVA Elapsed</span>
                        <strong>{formatDuration(trailElapsed)}</strong>
                        <small>Surface traverse time</small>
                      </div>
                      <div className="holo-vital-card">
                        <span>Martian Sol</span>
                        <strong>SOL 1421</strong>
                        <small>Jezero Crater</small>
                      </div>
                      <div className="holo-vital-card">
                        <span>Rover Range</span>
                        <strong>{distToPerseveranceM} m</strong>
                        <small>{scannedCount}/6 signals cleared</small>
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
                        <span>Explorer Pos</span>
                        <strong>
                          {Math.round(player.x)}, {Math.round(player.y)}
                        </strong>
                        <small>
                          {coords.latitude.toFixed(3)}°N, {coords.longitude.toFixed(3)}°E
                        </small>
                      </div>
                      <div className="holo-vital-card">
                        <span>Nearest Record</span>
                        <strong>
                          {nearestRecord.item
                            ? `#${nearestRecord.item.number} (${Math.round(nearestRecord.dist * 6.5)}m)`
                            : 'All 14 Found!'}
                        </strong>
                        <small>
                          {nearestRecord.item ? nearestRecord.item.title : 'Complete'}
                        </small>
                      </div>
                      <div className="holo-vital-card">
                        <span>Nearest Supply</span>
                        <strong>
                          {nearestSupply.item
                            ? `${nearestSupply.item.kind.toUpperCase()} (${Math.round(nearestSupply.dist * 6.5)}m)`
                            : 'All Collected'}
                        </strong>
                        <small>
                          {nearestSupply.item ? nearestSupply.item.name : 'Cleared'}
                        </small>
                      </div>
                      <div className="holo-vital-card">
                        <span>Perseverance</span>
                        <strong>{distToPerseveranceM} m</strong>
                        <small>
                          {scannedCount >= creatures.length
                            ? 'Waypoint unlocked!'
                            : `${creatures.length - scannedCount} scan(s) left`}
                        </small>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right Sub-Pane Inside Glass (63.0% -> 75.6%, top 24.2% -> 77.0%) ── */}
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
                  <span>⚙ {collectedScrap.length}/6</span>
                  <span>📄 {collectedRecords.length}/14</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
