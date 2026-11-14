import { useEffect, useRef, useState } from "react";

/**
 * RadarButton — circular radar scan button.
 *
 * Press it and the sweep spins for roughly `duration` ms, then fires
 * onScanComplete so you can change state elsewhere.
 */

const PERIOD = 1600; // ms per full sweep turn

const css = `
.radar-btn{
  --size:96px; --period:1600ms; --turns:2; --start:35deg;
  --ink:#b9d3ee; --glow:#6fb6ff;
  position:relative; display:inline-block; flex:none;
  width:var(--size); height:var(--size);
  padding:0; border:0; border-radius:50%; background:none;
  cursor:pointer; -webkit-tap-highlight-color:transparent;
  transition:transform .14s ease;
}
.radar-btn:active:not([aria-disabled="true"]){ transform:scale(.95); }
.radar-btn[aria-disabled="true"]{ cursor:progress; }
.radar-btn:focus-visible{ outline:3px solid var(--glow); outline-offset:4px; }

.radar-face{
  position:absolute; inset:0; border-radius:50%; overflow:hidden;
  background:radial-gradient(circle at 50% 30%, #3d4f66 0%, #273548 55%, #182230 100%);
  box-shadow:
    inset 0 0 0 3px #a3b5c8,
    inset 0 0 0 5px #111925,
    inset 0 -10px 18px rgba(0,0,0,.35),
    0 6px 14px rgba(0,0,0,.45),
    0 0 0 0 rgba(111,182,255,0);
  transition:box-shadow .4s ease, filter .2s ease;
}
.radar-btn:hover:not([aria-disabled="true"]) .radar-face{ filter:brightness(1.12); }
.radar-btn[data-state="scanning"] .radar-face{
  box-shadow:
    inset 0 0 0 3px #a3b5c8,
    inset 0 0 0 5px #111925,
    inset 0 -10px 18px rgba(0,0,0,.35),
    0 6px 14px rgba(0,0,0,.45),
    0 0 20px 2px rgba(111,182,255,.4);
}

.radar-svg{ position:absolute; inset:0; width:100%; height:100%; }

.radar-sweep{
  position:absolute; inset:7%; border-radius:50%;
  background:conic-gradient(from 0deg,
    rgba(111,182,255,0) 0deg,
    rgba(111,182,255,0) 250deg,
    rgba(111,182,255,.5) 355deg,
    rgba(207,232,255,.95) 359deg,
    rgba(207,232,255,0) 360deg);
  opacity:.55;
  transform:rotate(var(--start));
  transition:opacity .4s ease;
}
.radar-btn[data-state="scanning"] .radar-sweep{
  opacity:1;
  animation:radar-spin var(--period) linear var(--turns);
}
@keyframes radar-spin{
  from{ transform:rotate(var(--start)); }
  to{ transform:rotate(calc(var(--start) + 360deg)); }
}

.radar-blip{
  position:absolute; left:50%; top:50%;
  width:calc(var(--size) * .065); height:calc(var(--size) * .065);
  margin:calc(var(--size) * -.0325) 0 0 calc(var(--size) * -.0325);
  border-radius:50%; background:#dff0ff; box-shadow:0 0 8px 2px var(--glow);
  opacity:0;
  transform:rotate(calc(var(--a) * 1deg)) translateY(calc(var(--size) * var(--r) / -100));
}
.radar-btn[data-state="scanning"] .radar-blip{
  animation:radar-blip var(--period) linear calc((var(--a) - 35) / 360 * var(--period)) var(--turns);
}
@keyframes radar-blip{
  0%{ opacity:1; } 65%{ opacity:0; } 100%{ opacity:0; }
}

.radar-ping{
  position:absolute; inset:0; border-radius:50%; pointer-events:none;
  border:2px solid var(--glow); opacity:0;
}
.radar-btn[data-state="done"] .radar-ping{ animation:radar-ping .9s ease-out; }
@keyframes radar-ping{
  from{ opacity:.8; transform:scale(1); }
  to{ opacity:0; transform:scale(1.5); }
}

@media (prefers-reduced-motion: reduce){
  .radar-btn[data-state="scanning"] .radar-sweep,
  .radar-btn[data-state="scanning"] .radar-blip{ animation:none; }
  .radar-btn[data-state="scanning"] .radar-face{ animation:radar-breathe 1.2s ease-in-out infinite; }
  @keyframes radar-breathe{ 50%{ filter:brightness(1.3); } }
}
`;

export default function RadarButton({
  onScanStart,
  onScanComplete,
  duration = 3000,
  size = 96,
  disabled = false,
  label = "Scan",
  className = "",
  style,
  ...rest
}) {
  const [status, setStatus] = useState("idle"); // idle | scanning | done
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const turns = Math.max(1, Math.round(duration / PERIOD));

  const start = () => {
    if (status !== "idle" || disabled) return;
    setStatus("scanning");
    onScanStart?.();
    timers.current.push(
      setTimeout(() => {
        setStatus("done");
        onScanComplete?.();
        timers.current.push(setTimeout(() => setStatus("idle"), 1000));
      }, turns * PERIOD)
    );
  };

  return (
    <>
      <style>{css}</style>
      <button
        type="button"
        className={`radar-btn ${className}`.trim()}
        data-state={status}
        aria-label={label}
        aria-busy={status === "scanning"}
        aria-disabled={status !== "idle" || disabled}
        onClick={start}
        style={{
          "--size": `${size}px`,
          "--turns": turns,
          "--period": `${PERIOD}ms`,
          ...style,
        }}
        {...rest}
      >
        <span className="radar-face">
          <span className="radar-sweep" />
          <svg className="radar-svg" viewBox="0 0 100 100" aria-hidden="true">
            <g fill="none" stroke="var(--ink)" strokeLinecap="round">
              <circle cx="50" cy="50" r="38" strokeWidth="2" opacity=".7" />
              <circle cx="50" cy="50" r="26" strokeWidth="2" opacity=".6" />
              <circle cx="50" cy="50" r="14" strokeWidth="2" opacity=".5" />
              <path d="M50 12V88M12 50H88" strokeWidth="1" opacity=".18" />
            </g>
            <circle cx="50" cy="50" r="2.6" fill="var(--ink)" />
          </svg>
          <i className="radar-blip" style={{ "--a": 70, "--r": 30 }} />
          <i className="radar-blip" style={{ "--a": 150, "--r": 18 }} />
          <i className="radar-blip" style={{ "--a": 250, "--r": 34 }} />
        </span>
        <span className="radar-ping" />
      </button>
    </>
  );
}
