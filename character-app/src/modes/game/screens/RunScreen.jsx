import React, { useEffect, useRef, useState } from "react";
import backgroundImg from "../assets/images/background.jpg";
import AstronautRun from "../components/AstronautRun";

const SPEED = 0.07; // px of movement per ms while a key is held

// idle1 is a still frame — no bob/hover animation applied

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * RunScreen
 * ----------
 * Separate game screen. Spawns the working run-model astronaut
 * (AstroRun sprite cycle) and lets the player move it around the
 * scene with the WASD keys (arrows work too).
 *
 * WASD controls:
 *   W / ArrowUp    -> move up
 *   S / ArrowDown  -> move down
 *   A / ArrowLeft  -> move left
 *   D / ArrowRight -> move right
 *
 * When no key is held the run animation plays the idle animation
 * (gentle bob) instead of the running cycle.
 */
export default function RunScreen() {
  const sceneRef = useRef(null);
  const keysRef = useRef(new Set());
  const posRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [isMoving, setIsMoving] = useState(false);

  // Track container size (for movement bounds)
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // WASD / arrow key listeners
  useEffect(() => {
    const down = (e) => {
      const key = e.key.toLowerCase();
      if (["w", "arrowup"].includes(key)) keysRef.current.add("w");
      if (["s", "arrowdown"].includes(key)) keysRef.current.add("s");
      if (["a", "arrowleft"].includes(key)) keysRef.current.add("a");
      if (["d", "arrowright"].includes(key)) keysRef.current.add("d");
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key)) e.preventDefault();
      setIsMoving(true);
    };
    const up = (e) => {
      const key = e.key.toLowerCase();
      if (["w", "arrowup"].includes(key)) keysRef.current.delete("w");
      if (["s", "arrowdown"].includes(key)) keysRef.current.delete("s");
      if (["a", "arrowleft"].includes(key)) keysRef.current.delete("a");
      if (["d", "arrowright"].includes(key)) keysRef.current.delete("d");
      setIsMoving(keysRef.current.size > 0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Movement loop
  useEffect(() => {
    let raf;
    let last = performance.now();
    const step = (now) => {
      const dt = now - last;
      last = now;
      const keys = keysRef.current;
      const moving = keys.size > 0;
      if (moving !== isMoving) setIsMoving(moving);
      if (moving) {
        const dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
        const dy = (keys.has("w") ? -1 : 0) + (keys.has("s") ? 1 : 0);
        if (dx !== 0 || dy !== 0) {
          const w = size.w;
          const h = size.h;
          const half = 110; // approx half of the rendered astronaut box
          posRef.current.x = clamp(posRef.current.x + dx * SPEED * dt, half, Math.max(half, w - half));
          posRef.current.y = clamp(posRef.current.y + dy * SPEED * dt, half, Math.max(half, h - half));
          setPos({ x: posRef.current.x, y: posRef.current.y });
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size, isMoving]);

  const charSize = 200;

  return (
    <div
      ref={sceneRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        background: "#160a10",
      }}
    >
      <style>{/* no idle animation */}</style>
      <img
        className="zr-bg"
        src={backgroundImg}
        alt="background"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />

      {/* The movable astronaut */}
      <div
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: charSize,
          height: charSize,
          transform: "translate(-50%, -50%)",
          zIndex: 3,
          display: "grid",
          placeItems: "center",
          filter: "drop-shadow(0 0 18px rgba(255,220,80,0.7))",
          animation: "none",
        }}
      >
        <AstronautRun playing={isMoving} style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 12px rgba(255,220,80,0.7))" }} />
      </div>

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 16,
          zIndex: 5,
          color: "rgba(255,240,214,0.75)",
          fontSize: 12,
          letterSpacing: 1,
          fontFamily: "'Segoe UI', sans-serif",
          background: "rgba(12,4,10,0.45)",
          border: "1px solid rgba(255,220,150,0.25)",
          borderRadius: 999,
          padding: "8px 16px",
          backdropFilter: "blur(6px)",
        }}
      >
        W A S D / Arrows to move the astronaut
      </div>
    </div>
  );
}
