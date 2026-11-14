import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JezeroMap from './components/JezeroMap.jsx'
import MarsGame from './game/MarsGame.jsx'
import './mapApp.css'

export default function MapMode() {
  const navigate = useNavigate()
  const [view, setView] = useState<'regional' | 'game'>('game')
  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  return (
    <div className="map-app">
      <nav className="map-app-nav" aria-label="Map views">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <strong>orbital<span>.</span></strong>
          <span style={{ fontSize: '12px', color: '#8899aa', letterSpacing: '1px' }}>
            JEZERO CRATER EXPEDITION
          </span>
        </div>
        <div>
          <button
            type="button"
            className={view === 'game' ? 'active' : ''}
            onClick={() => setView('game')}
          >
            Game map + minimap
          </button>
          <button
            type="button"
            className={view === 'regional' ? 'active' : ''}
            onClick={() => setView('regional')}
          >
            Regional 2D map
          </button>
          <button
            type="button"
            style={{ borderColor: '#6fb6ff', color: '#cce6ff' }}
            onClick={() => navigate('/battle')}
          >
            Battle Arena
          </button>
          <button
            type="button"
            style={{ color: '#aaa' }}
            onClick={() => navigate('/')}
          >
            Menu
          </button>
        </div>
      </nav>
      {view === 'regional' ? (
        <JezeroMap onBack={() => setView('game')} />
      ) : (
        <MarsGame
          onExit={() => setView('regional')}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  )
}
