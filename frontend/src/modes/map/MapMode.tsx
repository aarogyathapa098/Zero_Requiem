import MarsGame from './game/MarsGame.jsx'

export default function MapMode() {
  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  return <MarsGame reducedMotion={reducedMotion} />
}
