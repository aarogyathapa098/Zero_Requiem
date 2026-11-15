import { useEffect, useRef, useState } from "react";
import { environmentAudio } from "../../../../shared/audio/environmentAudio";

/**
 * SoundButton
 * -----------
 * Round sci-fi audio button with a glowing purple tapered sound-wave visualizer.
 * Connects directly to the environment ambient audio loop, reacting in real-time
 * to frequency and amplitude changes.
 *
 * Props:
 *  - size: diameter in px (default 60)
 *  - showBadge: whether to render the status pill underneath (default true)
 *  - onChange: optional callback fired when play/pause state changes
 *  - onLevel: optional callback fired each frame with the average audio level (0-1)
 */
export default function SoundButton({
  size = 60,
  showBadge = true,
  onChange,
  onLevel,
}) {
  const canvasRef = useRef(null);
  const levelsRef = useRef(new Float32Array(17));
  const freqDataRef = useRef(new Uint8Array(128));
  const rafRef = useRef(0);
  const isPlayingRef = useRef(false);
  const onLevelRef = useRef(onLevel);
  const [isPlaying, setIsPlaying] = useState(false);

  onLevelRef.current = onLevel;

  // Sync with global environment audio state
  useEffect(() => {
    const unsubscribe = environmentAudio.subscribe((playing) => {
      isPlayingRef.current = playing;
      setIsPlaying(playing);
      onChange?.(playing);
    });
    return unsubscribe;
  }, [onChange]);

  const toggle = () => {
    environmentAudio.toggle();
  };

  // Draw loop for real-time sound visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const g = canvas.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const levels = levelsRef.current;
    const N = levels.length;
    const mid = (N - 1) / 2;
    let pulse = 0;

    const frame = (t) => {
      let avg = 0;

      if (isPlayingRef.current) {
        environmentAudio.getFrequencyData(freqDataRef.current);
        const data = freqDataRef.current;

        // Sample frequencies radiating from middle (sub-bass/rhythm) to left and right wings (trebles)
        for (let i = 0; i < N; i++) {
          const dist = Math.abs(i - mid) / mid;
          const from = Math.floor(dist * 38);
          const to = Math.max(from + 2, Math.floor((dist + 0.12) * 44));
          let sum = 0;
          for (let j = from; j < to; j++) {
            sum += data[j] || 0;
          }
          const raw = sum / (to - from) / 255;
          const v = Math.min(1, raw * 1.85);
          levels[i] += (v - levels[i]) * 0.35; // smooth envelope
          avg += levels[i];
        }
        avg /= N;
        onLevelRef.current?.(avg);
      } else {
        // Smoothly decay bars when paused / muted
        for (let i = 0; i < N; i++) {
          levels[i] *= 0.86;
        }
      }

      pulse += (avg - pulse) * 0.22;

      g.clearRect(0, 0, size, size);
      const c = size / 2;

      // Dark background disc
      const disc = g.createRadialGradient(c, c * 0.9, size * 0.05, c, c, c);
      if (isPlayingRef.current) {
        disc.addColorStop(0, "#201738");
        disc.addColorStop(1, "#0a0717");
      } else {
        disc.addColorStop(0, "#130f22");
        disc.addColorStop(1, "#07050f");
      }
      g.beginPath();
      g.arc(c, c, c - 2, 0, Math.PI * 2);
      g.fillStyle = disc;
      g.fill();

      // Outer glowing rim
      g.lineWidth = isPlayingRef.current ? 2 : 1.5;
      g.strokeStyle = isPlayingRef.current
        ? `rgba(196, 130, 255, ${0.45 + pulse * 0.5})`
        : "rgba(130, 110, 175, 0.32)";
      g.stroke();

      // Soft ambient radial glow
      const glow = g.createRadialGradient(c, c, 0, c, c, c * 0.88);
      glow.addColorStop(
        0,
        isPlayingRef.current
          ? `rgba(175, 65, 255, ${0.14 + pulse * 0.42})`
          : "rgba(120, 70, 180, 0.04)"
      );
      glow.addColorStop(1, "rgba(170, 60, 255, 0)");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(c, c, c - 3, 0, Math.PI * 2);
      g.fill();

      // Symmetrical center-out wave: starts from the middle and tapers outward to left and right
      const left = size * 0.17;
      const width = size * 0.66;
      const maxH = size * 0.58;
      const gap = width / N;
      const barW = Math.max(1.8, gap * 0.62);

      g.shadowColor = isPlayingRef.current
        ? "rgba(215, 95, 255, 0.9)"
        : "rgba(140, 90, 200, 0.3)";
      g.shadowBlur = isPlayingRef.current
        ? size * (0.07 + pulse * 0.15)
        : 0;

      for (let i = 0; i < N; i++) {
        const dist = Math.abs(i - mid) / mid;
        // Cosine curve: maximum in the middle (dist=0), tapering smoothly to left and right (dist=1)
        const taper = 0.22 + 0.78 * Math.cos(dist * (Math.PI / 2));
        const idleWave =
          isPlayingRef.current || reduceMotion
            ? 0
            : Math.sin(t / 800 - dist * Math.PI) * 0.035;
        const currentLevel = Math.max(0, levels[i] + idleWave);
        const h = Math.max(
          size * 0.04,
          (0.08 + currentLevel * 0.92) * taper * maxH
        );
        const x = left + i * gap;
        const y = c - h / 2;

        const fill = g.createLinearGradient(0, y, 0, y + h);
        if (isPlayingRef.current) {
          fill.addColorStop(0, "#f5d0fe");
          fill.addColorStop(0.38, "#d946ef");
          fill.addColorStop(1, "#8b5cf6");
        } else {
          fill.addColorStop(0, "#8a5ea8");
          fill.addColorStop(1, "#4a2c6d");
        }
        g.fillStyle = fill;
        g.globalAlpha = isPlayingRef.current ? 1 : 0.45;

        g.beginPath();
        if (typeof g.roundRect === "function") {
          g.roundRect(x, y, barW, h, barW / 2);
        } else {
          g.rect(x, y, barW, h);
        }
        g.fill();
      }

      g.globalAlpha = 1;
      g.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  return (
    <div
      className="mars-sound-widget"
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        userSelect: "none",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isPlaying}
        aria-label={
          isPlaying
            ? "Mute Mars environmental sound"
            : "Play Mars environmental sound"
        }
        title={
          isPlaying
            ? "Mars Environment Sound: Playing (Click to mute)"
            : "Mars Environment Sound: Muted (Click to play)"
        }
        style={{
          width: size,
          height: size,
          padding: 0,
          border: "none",
          borderRadius: "50%",
          background: "transparent",
          cursor: "pointer",
          boxShadow: isPlaying
            ? "0 0 22px rgba(180, 80, 255, 0.45), 0 4px 16px rgba(0, 0, 0, 0.6)"
            : "0 4px 12px rgba(0, 0, 0, 0.5)",
          transition: "box-shadow 220ms ease, transform 150ms ease",
          outlineOffset: 3,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size, display: "block" }}
        />
      </button>

      {showBadge && (
        <span
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: isPlaying ? "#d8b4fe" : "#8a75a5",
            background: isPlaying
              ? "rgba(25, 17, 42, 0.85)"
              : "rgba(18, 14, 28, 0.75)",
            border: isPlaying
              ? "1px solid rgba(192, 132, 252, 0.45)"
              : "1px solid rgba(110, 90, 140, 0.28)",
            borderRadius: "999px",
            padding: "2px 8px",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            boxShadow: isPlaying
              ? "0 0 10px rgba(175, 75, 255, 0.25)"
              : "none",
            pointerEvents: "none",
            transition: "all 200ms ease",
            whiteSpace: "nowrap",
          }}
        >
          {isPlaying ? "ENV AUDIO" : "MUTED"}
        </span>
      )}
    </div>
  );
}
