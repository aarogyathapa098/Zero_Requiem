import { useId } from "react";

/* ------------------------------------------------------------------
   VitalsHUD.jsx — drop-in survival-style HUD meters.
   No CSS file, no dependencies besides React. Copy this file as-is.

   Exports:
     StatRing   – one circular meter (use it alone, anywhere)
     VitalsHUD  – main big ring + 3 small rings, laid out like the reference
     Icons      – default SVG icons (Apple, Heart, Drop, Bolt, Shield)
   ------------------------------------------------------------------ */

/* ---------- Default icons (all use currentColor, so they're recolorable) ---------- */
const svgProps = { viewBox: "0 0 24 24", fill: "currentColor", width: "100%", height: "100%" };

export const Icons = {
  Apple: () => (
    <svg {...svgProps}>
      <path d="M12 7.500C10.500 6 7.500 5.800 5.800 7.800 3.800 10.200 4.800 14.500 7 18c1.200 1.800 2.500 3.200 3.800 3 .6-.1.900-.4 1.200-.4s.6.300 1.200.4c1.300.2 2.600-1.200 3.800-3 2.200-3.500 3.200-7.800 1.200-10.200C16.500 5.800 13.500 6 12 7.500z" />
      <path d="M12.200 6c-.5-2 .4-3.800 2.400-4.500.4 2-.4 3.800-2.400 4.500z" />
    </svg>
  ),
  Heart: () => (
    <svg {...svgProps}>
      <path d="M12 21s-8-4.900-8-11a4.600 4.600 0 0 1 8-3 4.600 4.600 0 0 1 8 3c0 6.100-8 11-8 11z" />
    </svg>
  ),
  Drop: () => (
    <svg {...svgProps}>
      <path d="M12 2.500c3.500 4.300 6 7.600 6 11a6 6 0 0 1-12 0c0-3.400 2.500-6.700 6-11z" />
    </svg>
  ),
  Bolt: () => (
    <svg {...svgProps}>
      <path d="M13 2 4.500 13.500H11L10 22l9-12h-6.500L13 2z" />
    </svg>
  ),
  Shield: () => (
    <svg {...svgProps}>
      <path d="M12 2.500 4.500 5.500v6c0 4.600 3.100 8.200 7.500 10 4.400-1.800 7.500-5.400 7.500-10v-6L12 2.500z" />
    </svg>
  ),
};

/* ---------- StatRing ---------- */
/**
 * @param {number}  value        current value
 * @param {number}  max          max value (default 100)
 * @param {number}  size         diameter in px (default 72)
 * @param {string|[string,string]} color  ring fill – a color, or [from, to] for a gradient
 * @param {React.ReactNode} icon          ANY node: <Icons.Heart/>, <img/>, emoji, your own SVG
 * @param {React.ReactNode} children      custom center content (overrides icon). Great for numbers.
 * @param {number}  thickness    ring thickness, in % of size (default 14)
 * @param {number}  warnBelow    pulses when value/max falls under this fraction (e.g. 0.2)
 * @param {string}  iconColor    color for the icon (default: ring color)
 * @param {boolean} clockwise    fill direction (default true)
 */
export function StatRing({
  value = 100,
  max = 100,
  size = 72,
  color = "#e8892b",
  icon = null,
  children = null,
  thickness = 14,
  warnBelow = 0,
  iconColor,
  clockwise = true,
  style,
  className,
}) {
  const uid = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const [from, to] = Array.isArray(color) ? color : [color, color];

  const R = 50 - thickness / 2 - 7; // ring radius, leaves room for the outer rim stroke
  const C = 2 * Math.PI * R;
  const warn = warnBelow > 0 && pct < warnBelow;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,.45))",
        animation: warn ? "vh-pulse 0.9s ease-in-out infinite" : undefined,
        ...style,
      }}
    >
      <style>{`@keyframes vh-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@media (prefers-reduced-motion:reduce){[style*="vh-pulse"]{animation:none!important}}`}</style>

      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
          <radialGradient id={`p${uid}`} cx="50%" cy="40%" r="65%">
            <stop offset="0" stopColor="#2f6f70" />
            <stop offset="1" stopColor="#1b4546" />
          </radialGradient>
        </defs>

        {/* outer halo (darkest) */}
        <circle cx="50" cy="50" r="49.200" fill="#0c2628" />
        {/* outer rim: the extra lighter stroke */}
        <circle cx="50" cy="50" r="46.300" fill="#173c3e" stroke="#5aa8a0" strokeWidth="2.400" />
        {/* ring track */}
        <circle cx="50" cy="50" r={R} fill="none" stroke="#0f2f31" strokeWidth={thickness} />
        {/* ring progress */}
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={`url(#g${uid})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          opacity={pct <= 0 ? 0 : 1}
          transform={`rotate(-90 50 50)${clockwise ? "" : " scale(1,-1) translate(0,-100)"}`}
          style={{ transition: "stroke-dashoffset .35s ease" }}
        />
        {/* inner disc */}
        <circle
          cx="50"
          cy="50"
          r={R - thickness / 2 - 1.5}
          fill={`url(#p${uid})`}
          stroke="#0e2a2c"
          strokeWidth="1.5"
        />
      </svg>

      {/* center content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: iconColor || from,
          pointerEvents: "none",
        }}
      >
        {children ? (
          children
        ) : icon ? (
          <div style={{ width: "42%", height: "42%", display: "flex" }}>{icon}</div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Big number center (used by the main ring) ---------- */
export function StatReadout({ label, value, size = 150 }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
        color: "#eafcff",
        fontFamily: "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif",
        textShadow: "0 1px 2px rgba(0,0,0,.5)",
      }}
    >
      <span style={{ fontSize: size * 0.17, fontWeight: 700, color: "#bfeff2", letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: size * 0.22, fontWeight: 700, marginTop: size * 0.02 }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

/* ---------- VitalsHUD ---------- */
/**
 * Every meter is a plain object — swap anything per game / per scenario:
 *   { value, max, color, icon, label, warnBelow }
 *
 * <VitalsHUD
 *   main={{ label: "O₂", value: 135, max: 180 }}
 *   satellites={[
 *     { value: 60, icon: <Icons.Apple/>, color: "#e8892b" },
 *     { value: 85, icon: <Icons.Heart/>, color: "#d9382f" },
 *     { value: 40, icon: <Icons.Drop/>,  color: "#35b8e8" },
 *   ]}
 * />
 */
const DEFAULT_MAIN = { label: "O₂", value: 100, max: 100, color: ["#b8f23a", "#1fbf5b"] };
const DEFAULT_SATS = [
  { value: 100, max: 100, color: "#f0922e", icon: <Icons.Apple /> },
  { value: 100, max: 100, color: "#e0403a", icon: <Icons.Heart />, warnBelow: 0.25 },
  { value: 100, max: 100, color: "#3cc0ee", icon: <Icons.Drop /> },
];

export function VitalsHUD({
  main = DEFAULT_MAIN,
  satellites = DEFAULT_SATS,
  mainSize = 130,
  satSize = 60,
  style,
  className,
}) {
  const m = { ...DEFAULT_MAIN, ...main };
  const [left, bottom, right] = satellites;

  // positions are relative to the main ring so the whole thing scales together
  const w = mainSize + satSize * 1.9;
  const h = mainSize + satSize * 0.95;
  const cx = w / 2;
  const top = (s) => ({ position: "absolute", top: s.y, left: s.x });

  const sats = [
    left && { ...left, x: cx - mainSize * 0.5 - satSize * 0.55, y: mainSize * 0.76 },
    bottom && { ...bottom, x: cx - satSize / 2, y: mainSize * 0.9 },
    right && { ...right, x: cx + mainSize * 0.5 - satSize * 0.45, y: mainSize * 0.76 },
  ].filter(Boolean);

  return (
    <div className={className} style={{ position: "relative", width: w, height: h, ...style }}>
      <div style={{ position: "absolute", top: 0, left: cx - mainSize / 2 }}>
        <StatRing
          size={mainSize}
          value={m.value}
          max={m.max}
          color={m.color}
          thickness={12}
          warnBelow={m.warnBelow}
        >
          {m.icon ? m.icon : <StatReadout label={m.label} value={m.value} size={mainSize} />}
        </StatRing>
      </div>

      {sats.map((s, i) => (
        <div key={i} style={top(s)}>
          <StatRing size={satSize} {...s} />
        </div>
      ))}
    </div>
  );
}

export default VitalsHUD;
