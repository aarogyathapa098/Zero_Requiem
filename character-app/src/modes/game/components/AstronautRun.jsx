import React, { useEffect, useRef, useState } from "react";
import idle1 from "../assets/sprites/astros/idle1.png";
import run1  from "../assets/sprites/astros/run1.png";
import run2  from "../assets/sprites/astros/run2.png";
import run3  from "../assets/sprites/astros/run3.png";
import run4  from "../assets/sprites/astros/run4.png";
import run5  from "../assets/sprites/astros/run5.png";
import run6  from "../assets/sprites/astros/run6.png";

const RUN_FRAMES  = [run1, run2, run3, run4, run5, run6];
const IDLE_FRAMES = [idle1];

/**
 * AstronautRun
 * -------------
 * Sprite-sheet animator for the astronaut.
 *
 * Behaviour
 *  - playing=true  → cycles through RUN_FRAMES at frameDuration ms per frame.
 *                    Every frame is rendered at exactly the same pixel box so
 *                    no single frame causes a size pop.
 *  - playing=false → immediately shows idle1.png (no bob / hover, no run-frame freeze).
 *
 * Props
 *  - frames        override the run frame array (defaults to run1-run6)
 *  - idleFrame     override the idle still (defaults to idle1)
 *  - frameDuration ms per run frame  (default 80 ms)
 *  - playing       true = run cycle, false = idle still
 *  - className     forwarded to wrapper <div>
 *  - style         forwarded to wrapper <div>
 *  - alt           alt text for the frame image
 */
export default function AstronautRun({
  frames        = RUN_FRAMES,
  idleFrame     = idle1,
  frameDuration = 80,
  playing       = true,
  className     = "",
  style,
  alt           = "Astronaut",
}) {
  const [runFrame, setRunFrame] = useState(0);
  // Reset to first run-frame each time we start running so there's no stale frame on restart
  const prevPlaying = useRef(playing);
  useEffect(() => {
    if (playing && !prevPlaying.current) setRunFrame(0);
    prevPlaying.current = playing;
  }, [playing]);

  // Run cycle ticker
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setRunFrame((f) => (f + 1) % frames.length);
    }, frameDuration);
    return () => clearInterval(id);
  }, [frames.length, frameDuration, playing]);

  const src = playing ? frames[runFrame] : idleFrame;

  // Wrapper div locks the visual bounding box; the img fills it with object-fit
  // so differing sprite canvas sizes never change the rendered size.
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          userSelect: "none",
          display: "block",
          // Prevent the browser reflow from intrinsic size changes between frames
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      />
    </div>
  );
}
