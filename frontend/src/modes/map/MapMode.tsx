import { useNavigate } from 'react-router-dom'
import SimpleGlobe from './components/SimpleGlobe.jsx'
import './mars3d.css'

export default function MapMode() {
  const navigate = useNavigate()
  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  const handleOpenGame = () => {
    navigate('/game')
  }

  return (
    <div className="mars-3d-screen" role="main" aria-label="Mars 3D Model Explorer">
      <div className="mars-3d-stars" aria-hidden="true" />

      {/* 3D Mars Globe */}
      <div className="mars-3d-canvas-wrap">
        <SimpleGlobe
          world="mars"
          rotating={true}
          zoom={0}
          reset={0}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Top Left: Mission / Atlas Branding */}
      <header className="mars-3d-header">
        <div className="mars-3d-brand">
          ZERO REQUIEM<span>.</span>MARS
        </div>
        <span className="mars-3d-sub">3D Planetary Model · Orbit Recon</span>
      </header>

      {/* Top Right: Gamified Game Mode Button */}
      <button
        type="button"
        className="mars-gamemode-topright-btn"
        onClick={handleOpenGame}
        aria-label="Enter Game Mode: Immerse yourself in storytelling in Mars"
      >
        <div className="mars-gamemode-icon-wrap" aria-hidden="true">
          <span className="mars-gamemode-icon">🎮</span>
          <span className="mars-gamemode-pulse" />
        </div>
        <div className="mars-gamemode-body">
          <div className="mars-gamemode-heading">
            <span className="mars-gamemode-title">GAME MODE</span>
            <span className="mars-gamemode-badge">STORY</span>
          </div>
          <span className="mars-gamemode-subtitle">
            Immerse yourself in storytelling in Mars
          </span>
        </div>
        <span className="mars-gamemode-arrow" aria-hidden="true">➔</span>
      </button>

      {/* Telemetry HUD */}
      <div className="mars-3d-hud">
        <div className="mars-3d-hud-stat">
          <span className="mars-3d-hud-label">Target Basin</span>
          <span className="mars-3d-hud-val">Jezero Crater</span>
        </div>
        <div className="mars-3d-hud-stat">
          <span className="mars-3d-hud-label">Diameter</span>
          <span className="mars-3d-hud-val">6,779 km</span>
        </div>
        <div className="mars-3d-hud-stat">
          <span className="mars-3d-hud-label">Gravity</span>
          <span className="mars-3d-hud-val">3.71 m/s²</span>
        </div>
      </div>

      <div className="mars-3d-hint">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  )
}
