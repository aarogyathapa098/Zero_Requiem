import React, { useState, useEffect } from "react";
import backgroundImg  from "../assets/images/background.jpg";
import silhouetteImg  from "../assets/images/silhouette.png";
import characterImg   from "../assets/images/character.png";

// ─── Keyframe injection ────────────────────────────────────────────────────────
const STYLES = `
  @keyframes floatLR {
    0%   { transform: translateX(0px) rotate(0deg); }
    25%  { transform: translateX(-10px) rotate(-2deg); }
    75%  { transform: translateX(10px)  rotate( 2deg); }
    100% { transform: translateX(0px) rotate(0deg); }
  }

  @keyframes revealPop {
    0%   { opacity: 0; transform: scale(0.4) translateY(30px); filter: brightness(0); }
    40%  { opacity: 1; transform: scale(1.18) translateY(-10px); filter: brightness(1.5); }
    65%  { transform: scale(0.92) translateY(4px); filter: brightness(1); }
    80%  { transform: scale(1.06) translateY(-4px); }
    100% { transform: scale(1) translateY(0px); }
  }

  @keyframes shimmer {
    0%   { opacity: 0.6; }
    50%  { opacity: 1; }
    100% { opacity: 0.6; }
  }

  @keyframes glowPulse {
    0%   { box-shadow: 0 0 0px 0px rgba(255,220,80,0); }
    50%  { box-shadow: 0 0 60px 30px rgba(255,220,80,0.45); }
    100% { box-shadow: 0 0 0px 0px rgba(255,220,80,0); }
  }

  @keyframes particles {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-80px) scale(0.3); }
  }

  @keyframes textFadeIn {
    0%   { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .float-anim {
    animation: floatLR 3s ease-in-out infinite;
  }

  .reveal-anim {
    animation: revealPop 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards,
               floatLR 3s ease-in-out 0.9s infinite;
  }

  .silhouette-shimmer {
    animation: shimmer 2.4s ease-in-out infinite, floatLR 3s ease-in-out infinite;
  }

  .glow-ring {
    animation: glowPulse 0.8s ease-out forwards;
  }
`;

// ─── Particle spark component ──────────────────────────────────────────────────
function Particle({ x, y, color }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: color,
        animation: `particles ${0.6 + Math.random() * 0.5}s ease-out forwards`,
        pointerEvents: "none",
        zIndex: 20,
      }}
    />
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ScanningScreen() {
  const [discovered, setDiscovered] = useState(false);
  const [revealing,  setRevealing]  = useState(false);
  const [particles,  setParticles]  = useState([]);
  const [showName,   setShowName]   = useState(false);

  useEffect(() => {
    const tag = document.createElement("style");
    tag.innerHTML = STYLES;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  const handleClick = () => {
    if (discovered || revealing) return;

    const colors = ["#FFD950", "#FF8C42", "#FFF", "#FFB347", "#FF6B6B"];
    setParticles(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: `calc(50% + ${(Math.random() - 0.5) * 160}px)`,
        y: `calc(50% + ${(Math.random() - 0.5) * 160}px)`,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
    );

    setRevealing(true);
    setTimeout(() => { setDiscovered(true); setRevealing(false); setParticles([]); }, 900);
    setTimeout(() => setShowName(true), 950);
  };

  return (
    <div
      style={{
        position: "relative", width: "100vw", height: "100vh",
        overflow: "hidden", fontFamily: "'Segoe UI', sans-serif",
        cursor: !discovered ? "pointer" : "default",
      }}
      onClick={handleClick}
    >
      {/* Background */}
      <img src={backgroundImg} alt="background"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
      />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        zIndex: 1,
      }} />

      {/* Particles */}
      {particles.map((p) => <Particle key={p.id} x={p.x} y={p.y} color={p.color} />)}

      {/* Character container */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        {revealing && (
          <div className="glow-ring" style={{
            position: "absolute", width: 220, height: 220,
            borderRadius: "50%", pointerEvents: "none",
          }} />
        )}

        {/* Silhouette phase */}
        {!discovered && (
          <div style={{ textAlign: "center" }}>
            <img src={silhouetteImg} alt="mystery character"
              className={revealing ? "reveal-anim" : "silhouette-shimmer"}
              style={{
                width: 200, height: 200, objectFit: "contain",
                filter: "brightness(0)", userSelect: "none",
                display: "block", margin: "0 auto",
              }}
            />
            {!revealing && (
              <div style={{
                marginTop: 18, padding: "8px 22px", borderRadius: 999,
                background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,180,50,0.6)",
                color: "#FFD950", fontSize: 14, letterSpacing: 1.5,
                textTransform: "uppercase", animation: "shimmer 2s ease-in-out infinite",
              }}>
                ✦ Tap to Discover ✦
              </div>
            )}
          </div>
        )}

        {/* Revealed phase */}
        {(revealing || discovered) && (
          <div style={{ textAlign: "center" }}>
            <img src={characterImg} alt="discovered character"
              className={discovered ? "float-anim" : "reveal-anim"}
              style={{
                width: 200, height: 200, objectFit: "contain",
                userSelect: "none", display: "block", margin: "0 auto",
                filter: "drop-shadow(0 0 18px rgba(255,220,80,0.7))",
              }}
            />
            {showName && (
              <div style={{
                marginTop: 18, padding: "8px 24px", borderRadius: 999,
                background: "rgba(255,220,80,0.15)", border: "1.5px solid rgba(255,220,80,0.8)",
                backdropFilter: "blur(6px)", color: "#FFD950", fontSize: 15,
                fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
                animation: "textFadeIn 0.6s ease-out forwards",
              }}>
                ✦ Character Discovered! ✦
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {!discovered && (
        <div style={{
          position: "absolute", bottom: 24, left: "50%",
          transform: "translateX(-50%)", color: "rgba(255,255,255,0.45)",
          fontSize: 12, letterSpacing: 1, zIndex: 10,
          animation: "shimmer 3s ease-in-out infinite",
        }}>
          A mysterious creature lurks in the shadows…
        </div>
      )}
    </div>
  );
}
