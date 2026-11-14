import { useEffect, useRef, useState } from "react";
import backgroundImg from "./background.jpg";
import silhouetteImg from "./silhouette.png";
import characterImg from "./character.png";
import RadarButton from "./RadarButton";

/**
 * CharacterDiscover
 * -----------------
 * Full-screen "bestiary" scene.
 *
 *  • Undiscovered: the character is shown only as a ? silhouette that sways
 *    gently left and right.
 *  • Discovered: the silhouette burns away, the character bursts into view,
 *    and keeps swaying (calmer rhythm) as an idle animation.
 *
 * Everything is self-contained: keyframes are injected with the component.
 * Swap `characterName` or the image props to reuse it for another creature.
 */

const REVEAL_MS = 1050;

const CSS = `
  .zr-scene {
    --art-size: min(72vw, calc(50vmin + 140px), 440px);
    --gold: #ffd98a;
    --gold-soft: rgba(255, 214, 140, 0.75);
    position: relative;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    overflow: hidden;
    isolation: isolate;
    background: #160a10;
    font-family: "Segoe UI", "Trebuchet MS", system-ui, sans-serif;
    color: #fff3d6;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  /* ── Backdrop ─────────────────────────────────────────────── */
  .zr-bg {
    position: absolute;
    inset: -5%;
    width: 110%;
    height: 110%;
    object-fit: cover;
    animation: zr-drift 32s ease-in-out infinite alternate;
  }

  @keyframes zr-drift {
    from { transform: scale(1) translate3d(-1.2%, 0, 0); }
    to   { transform: scale(1.07) translate3d(1.2%, -1%, 0); }
  }

  .zr-tint {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(120% 90% at 50% 112%, rgba(38, 4, 16, 0.82) 0%, rgba(38, 4, 16, 0) 62%),
      radial-gradient(80% 60% at 50% 42%, rgba(255, 160, 100, 0.12) 0%, rgba(0, 0, 0, 0) 65%),
      radial-gradient(120% 100% at 50% 50%, rgba(0, 0, 0, 0) 38%, rgba(12, 0, 8, 0.66) 100%);
  }

  .zr-mote {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 228, 178, 0.9);
    box-shadow: 0 0 10px rgba(255, 196, 120, 0.95);
    opacity: 0;
    pointer-events: none;
    animation-name: zr-mote-rise;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }

  @keyframes zr-mote-rise {
    0%   { transform: translate3d(0, 40px, 0) scale(0.6); opacity: 0; }
    12%  { opacity: 0.75; }
    80%  { opacity: 0.45; }
    100% { transform: translate3d(26px, -200px, 0) scale(1.15); opacity: 0; }
  }

  /* ── Stage ────────────────────────────────────────────────── */
  .zr-stage {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -52%);
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: var(--art-size);
  }

  .zr-figure {
    position: relative;
    width: var(--art-size);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
  }

  /* Invisible hit target covering the character */
  .zr-hit {
    position: absolute;
    inset: 4%;
    border: 0;
    padding: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    z-index: 5;
  }
  .zr-hit:disabled { cursor: default; }
  .zr-hit:focus-visible {
    outline: 2px solid var(--gold-soft);
    outline-offset: 2px;
  }

  .zr-rays {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 148%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0.3;
    mix-blend-mode: screen;
    background: repeating-conic-gradient(
      from 0deg,
      rgba(255, 220, 150, 0.4) 0deg 1.6deg,
      rgba(255, 220, 150, 0) 1.6deg 16deg
    );
    -webkit-mask: radial-gradient(circle, #000 10%, rgba(0, 0, 0, 0.35) 42%, transparent 68%);
    mask: radial-gradient(circle, #000 10%, rgba(0, 0, 0, 0.35) 42%, transparent 68%);
    animation: zr-spin 70s linear infinite;
    transition: opacity 1s ease;
  }
  .zr-rays--lit { opacity: 0.5; }

  @keyframes zr-spin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }

  .zr-halo {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 82%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    pointer-events: none;
    filter: blur(16px);
    background: radial-gradient(
      circle,
      rgba(255, 222, 140, 0.5) 0%,
      rgba(255, 156, 92, 0.26) 40%,
      rgba(255, 120, 80, 0) 70%
    );
    animation: zr-halo-pulse 4.8s ease-in-out infinite;
    transition: background 0.8s ease;
  }
  .zr-halo--lit {
    background: radial-gradient(
      circle,
      rgba(255, 236, 172, 0.72) 0%,
      rgba(255, 172, 100, 0.34) 42%,
      rgba(255, 120, 80, 0) 72%
    );
  }

  @keyframes zr-halo-pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.6; }
    50%      { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
  }

  /* ── Idle sway (used in BOTH phases) ──────────────────────── */
  .zr-sway {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    animation: zr-sway 5.6s ease-in-out infinite;
    will-change: transform;
  }
  .zr-sway--calm { animation-duration: 4.2s; }

  @keyframes zr-sway {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25%      { transform: translateX(-9px) rotate(-1.6deg); }
    75%      { transform: translateX(9px) rotate(1.6deg); }
  }

  .zr-art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    -webkit-user-drag: none;
  }

  .zr-art--silhouette {
    filter: drop-shadow(0 14px 28px rgba(255, 110, 60, 0.25));
    transition: filter 0.35s ease, transform 0.35s ease;
  }
  .zr-figure:hover .zr-art--silhouette {
    transform: translateY(-4px);
    filter: drop-shadow(0 18px 36px rgba(255, 160, 80, 0.55)) brightness(1.12);
  }

  .zr-art--character {
    filter:
      drop-shadow(0 18px 30px rgba(18, 0, 8, 0.55))
      drop-shadow(0 0 26px rgba(255, 210, 120, 0.38));
  }

  /* Silhouette dissolving away */
  .zr-art--banish {
    animation: zr-banish 0.8s cubic-bezier(0.4, 0, 0.7, 1) forwards;
  }

  @keyframes zr-banish {
    0%   { opacity: 1; transform: scale(1); filter: brightness(1); }
    25%  { opacity: 1; transform: scale(1.04); filter: brightness(1.7); }
    100% { opacity: 0; transform: scale(1.24); filter: brightness(2.6) blur(6px); }
  }

  /* Character bursting into view */
  .zr-art--emerge {
    animation: zr-emerge 1.05s cubic-bezier(0.16, 0.9, 0.28, 1.2) forwards;
  }

  @keyframes zr-emerge {
    0% {
      opacity: 0;
      transform: scale(0.32) translateY(70px) rotate(-12deg);
      filter: brightness(2.6) blur(8px);
    }
    45% {
      opacity: 1;
      transform: scale(1.14) translateY(-14px) rotate(4deg);
      filter: brightness(1.25) blur(0);
    }
    68% { transform: scale(0.95) translateY(5px) rotate(-2deg); }
    84% { transform: scale(1.04) translateY(-3px) rotate(1deg); }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0) rotate(0);
      filter: brightness(1) blur(0);
    }
  }

  /* ── Reveal effects ───────────────────────────────────────── */
  .zr-ring {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 46%;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 2px solid rgba(255, 228, 168, 0.9);
    transform: translate(-50%, -50%) scale(0.25);
    opacity: 0;
    pointer-events: none;
    animation: zr-ring 1.1s ease-out forwards;
  }
  .zr-ring--b {
    border-color: rgba(255, 172, 96, 0.7);
    animation-duration: 1.35s;
    animation-delay: 0.12s;
  }

  @keyframes zr-ring {
    0%   { opacity: 0.95; transform: translate(-50%, -50%) scale(0.25); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(2.4); }
  }

  .zr-spark {
    position: absolute;
    left: 50%;
    top: 47%;
    line-height: 1;
    pointer-events: none;
    text-shadow: 0 0 14px rgba(255, 190, 90, 0.95);
    animation: zr-spark-fly var(--dur) ease-out var(--delay) forwards;
    will-change: transform, opacity;
  }

  @keyframes zr-spark-fly {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
    }
    15% { opacity: 1; }
    100% {
      opacity: 0;
      transform:
        translate(calc(-50% + var(--dx)), calc(-50% + var(--dy)))
        scale(1.15)
        rotate(160deg);
    }
  }

  .zr-flash {
    position: absolute;
    inset: 0;
    z-index: 6;
    pointer-events: none;
    background: radial-gradient(
      circle at 50% 48%,
      rgba(255, 246, 214, 0.92) 0%,
      rgba(255, 196, 116, 0.5) 22%,
      rgba(255, 140, 90, 0) 56%
    );
    animation: zr-flash 0.9s ease-out forwards;
  }

  @keyframes zr-flash {
    0%   { opacity: 0; }
    12%  { opacity: 0.9; }
    100% { opacity: 0; }
  }

  /* ── Caption / nameplate ──────────────────────────────────── */
  .zr-label {
    height: 68px;
    margin-top: 2px;
    display: grid;
    place-items: center;
  }

  .zr-hint {
    padding: 10px 24px;
    border-radius: 999px;
    border: 1px solid rgba(255, 206, 130, 0.5);
    background: rgba(20, 4, 12, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: var(--gold);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    cursor: pointer;
    animation: zr-hint-glow 2.8s ease-in-out infinite;
    transition: transform 0.2s ease, background 0.2s ease;
  }
  .zr-hint:hover { transform: translateY(-2px); background: rgba(46, 12, 22, 0.7); }
  .zr-hint:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }

  @keyframes zr-hint-glow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 190, 100, 0);
      border-color: rgba(255, 206, 130, 0.4);
    }
    50% {
      box-shadow: 0 0 26px 2px rgba(255, 180, 90, 0.35);
      border-color: rgba(255, 220, 160, 0.9);
    }
  }

  .zr-name {
    text-align: center;
    opacity: 0;
    animation: zr-name-in 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) 0.1s forwards;
  }

  .zr-name small {
    display: block;
    margin-bottom: 5px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.42em;
    text-transform: uppercase;
    color: rgba(255, 214, 150, 0.75);
  }

  .zr-name strong {
    display: block;
    font-size: clamp(17px, 3.2vmin, 26px);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #fff2cc;
    text-shadow: 0 0 24px rgba(255, 180, 80, 0.7);
  }

  @keyframes zr-name-in {
    from { opacity: 0; transform: translateY(12px) scale(0.96); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }

  /* ── Replay control ───────────────────────────────────────── */
  .zr-reset {
    position: absolute;
    left: 50%;
    bottom: 22px;
    transform: translateX(-50%);
    z-index: 5;
    padding: 9px 18px;
    border-radius: 999px;
    border: 1px solid rgba(255, 220, 160, 0.35);
    background: rgba(18, 4, 10, 0.45);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: rgba(255, 226, 175, 0.85);
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    opacity: 0;
    animation: zr-fade-up 0.6s ease 0.25s forwards;
    transition: border-color 0.2s ease, color 0.2s ease;
  }
  .zr-reset:hover { border-color: var(--gold); color: #fff3d6; }
  .zr-reset:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }

  @keyframes zr-fade-up {
    from { opacity: 0; transform: translate(-50%, 8px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
  }

  /* ── Holographic data-bank popup ──────────────────────────── */
  .zr-holo {
    position: absolute;
    right: 22px;
    top: 46%;
    transform: translateY(-50%);
    z-index: 7;
    width: min(260px, 38vw);
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid rgba(110, 230, 255, 0.55);
    background:
      linear-gradient(135deg, rgba(40, 180, 230, 0.18), rgba(20, 60, 110, 0.35)),
      rgba(8, 22, 40, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: #c8f3ff;
    font-family: "Consolas", "Courier New", monospace;
    box-shadow:
      0 0 24px rgba(90, 210, 255, 0.35),
      inset 0 0 18px rgba(90, 210, 255, 0.12);
    overflow: hidden;
    opacity: 0;
    animation: zr-holo-in 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) 0.35s forwards,
               zr-holo-flicker 3.6s ease-in-out 1.1s infinite;
  }

  .zr-holo::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      rgba(120, 230, 255, 0.06) 0px,
      rgba(120, 230, 255, 0.06) 1px,
      transparent 1px,
      transparent 3px
    );
    mix-blend-mode: screen;
  }

  .zr-holo::after {
    content: "";
    position: absolute;
    top: 0;
    left: -40%;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(180, 240, 255, 0.25), transparent);
    animation: zr-holo-sweep 2.6s ease-in-out 1.2s infinite;
    pointer-events: none;
  }

  .zr-holo-eyebrow {
    font-size: 9px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: rgba(170, 235, 255, 0.75);
    margin-bottom: 6px;
  }

  .zr-holo-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #e6fbff;
    text-shadow: 0 0 12px rgba(120, 230, 255, 0.8);
    margin-bottom: 8px;
  }

  .zr-holo-body {
    font-size: 11px;
    line-height: 1.45;
    color: rgba(200, 240, 255, 0.85);
  }

  .zr-holo-bar {
    margin-top: 10px;
    height: 3px;
    border-radius: 2px;
    background: rgba(120, 230, 255, 0.15);
    overflow: hidden;
  }

  .zr-holo-bar > span {
    display: block;
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #6fe6ff, #b8f4ff);
    box-shadow: 0 0 8px rgba(120, 230, 255, 0.9);
    animation: zr-holo-progress 1.4s ease-out 0.5s forwards;
    transform-origin: left;
    transform: scaleX(0);
  }

  @keyframes zr-holo-in {
    from { opacity: 0; transform: translateY(-50%) translateX(40px); }
    to   { opacity: 1; transform: translateY(-50%) translateX(0); }
  }

  @keyframes zr-holo-flicker {
    0%, 100% { opacity: 1; }
    48% { opacity: 0.92; }
    50% { opacity: 0.78; }
    52% { opacity: 0.96; }
    96% { opacity: 0.88; }
  }

  @keyframes zr-holo-sweep {
    0%   { left: -40%; }
    100% { left: 140%; }
  }

  @keyframes zr-holo-progress {
    to { transform: scaleX(1); }
  }

  .zr-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  /* ── Accessibility ────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .zr-bg,
    .zr-mote,
    .zr-rays,
    .zr-halo,
    .zr-sway,
    .zr-hint { animation: none !important; }

    .zr-holo { animation: none !important; opacity: 1; transform: translateY(-50%); }
    .zr-holo::after { animation: none !important; }
    .zr-holo-bar > span { animation: none !important; transform: scaleX(1); }

    .zr-art--emerge { animation: zr-fade-in 0.5s ease-out forwards; }
    .zr-art--banish { animation: zr-fade-out 0.35s ease-out forwards; }
    .zr-spark,
    .zr-ring,
    .zr-flash { display: none; }
  }

  @keyframes zr-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes zr-fade-out {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
`;

const SPARK_COLORS = ["#fff6da", "#ffe4a3", "#ffd166", "#ffb066", "#ff8f5e"];

function makeSparks() {
  return Array.from({ length: 26 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 160;
    return {
      id: `${Date.now()}-${i}`,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance * 0.85,
      size: 9 + Math.random() * 13,
      duration: 0.75 + Math.random() * 0.6,
      delay: Math.random() * 0.12,
      glyph: Math.random() > 0.5 ? "✦" : "✧",
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
    };
  });
}

export default function CharacterDiscover({
  backgroundSrc = backgroundImg,
  silhouetteSrc = silhouetteImg,
  characterSrc = characterImg,
  characterName = "Mystery Creature",
  onDiscover,
}) {
  const [phase, setPhase] = useState("hidden"); // hidden | revealing | revealed
  const [sparks, setSparks] = useState([]);
  const timers = useRef([]);

  const [motes] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${55 + Math.random() * 45}%`,
      size: 2 + Math.random() * 3,
      duration: `${9 + Math.random() * 10}s`,
      delay: `${-Math.random() * 18}s`,
    }))
  );

  useEffect(() => {
    const saved = timers.current;
    return () => saved.forEach(clearTimeout);
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const discover = () => {
    if (phase !== "hidden") return;

    setPhase("revealing");
    setSparks(makeSparks());

    timers.current.push(
      setTimeout(() => setPhase("revealed"), REVEAL_MS),
      setTimeout(() => {
        setSparks([]);
        onDiscover?.();
      }, 1400)
    );
  };

  const reset = () => {
    clearTimers();
    setSparks([]);
    setPhase("hidden");
  };

  const isRevealed = phase === "revealed";

  return (
    <div className="zr-scene">
      <style>{CSS}</style>

      <img className="zr-bg" src={backgroundSrc} alt="" aria-hidden="true" />
      <div className="zr-tint" aria-hidden="true" />

      {motes.map((m) => (
        <span
          key={m.id}
          className="zr-mote"
          aria-hidden="true"
          style={{
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            animationDuration: m.duration,
            animationDelay: m.delay,
          }}
        />
      ))}

      <div className="zr-stage">
        <div className="zr-figure">
          <div className={`zr-rays ${phase !== "hidden" ? "zr-rays--lit" : ""}`} aria-hidden="true" />
          <div className={`zr-halo ${isRevealed ? "zr-halo--lit" : ""}`} aria-hidden="true" />

          <div className={`zr-sway ${isRevealed ? "zr-sway--calm" : ""}`}>
            {!isRevealed && (
              <img
                className={`zr-art zr-art--silhouette ${phase === "revealing" ? "zr-art--banish" : ""}`}
                src={silhouetteSrc}
                alt=""
                aria-hidden="true"
                draggable="false"
              />
            )}

            {phase !== "hidden" && (
              <img
                className={`zr-art zr-art--character ${phase === "revealing" ? "zr-art--emerge" : ""}`}
                src={characterSrc}
                alt={isRevealed ? characterName : ""}
                aria-hidden={!isRevealed}
                draggable="false"
              />
            )}
          </div>

          {phase === "revealing" && (
            <>
              <span className="zr-ring" aria-hidden="true" />
              <span className="zr-ring zr-ring--b" aria-hidden="true" />
            </>
          )}

          {sparks.map((s) => (
            <span
              key={s.id}
              className="zr-spark"
              aria-hidden="true"
              style={{
                "--dx": `${s.dx}px`,
                "--dy": `${s.dy}px`,
                "--dur": `${s.duration}s`,
                "--delay": `${s.delay}s`,
                fontSize: s.size,
                color: s.color,
              }}
            >
              {s.glyph}
            </span>
          ))}
        </div>

        <div className="zr-label">
          {isRevealed ? (
            <div className="zr-name">
              <small>Bestiary updated</small>
              <strong>✦ {characterName} ✦</strong>
            </div>
          ) : phase === "hidden" ? (
            <RadarButton
              label="Discover the mysterious creature"
              size={128}
              duration={1600}
              disabled={phase !== "hidden"}
              onScanComplete={discover}
            />
          ) : null}
        </div>
      </div>

      {phase === "revealing" && <div className="zr-flash" aria-hidden="true" />}

      {isRevealed && (
        <button type="button" className="zr-reset" onClick={reset}>
          ↺ Replay discovery
        </button>
      )}

      {isRevealed && (
        <div className="zr-holo" role="status" aria-live="polite">
          <div className="zr-holo-eyebrow">Data bank · sync</div>
          <div className="zr-holo-title">Creature identified</div>
          <div className="zr-holo-body">
            New specimen catalogued and added to the data bank.
          </div>
          <div className="zr-holo-bar">
            <span />
          </div>
        </div>
      )}

      <p className="zr-sr" role="status">
        {isRevealed ? `${characterName} discovered.` : ""}
      </p>
    </div>
  );
}
