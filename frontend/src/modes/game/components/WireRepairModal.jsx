import { useEffect, useRef, useState } from "react";
import wireRepairBg from "../assets/images/perseverance_wire_repair.jpeg";

/**
 * 4 Wire Definitions matching perseverance_wire_repair.jpeg
 * Coordinates are in percentage (0..100) of the image container (1376 x 768).
 * Left terminals: x ≈ 30.8%, Right terminals: x ≈ 66.0%
 */
const WIRES = [
  {
    id: "yellow",
    label: "Yellow Wire",
    color: "#f5df26",
    border: "#231f1a",
    glow: "rgba(245, 223, 38, 0.65)",
    leftX: 30.8,
    leftY: 28.1,
    rightX: 66.0,
    rightY: 62.0,
  },
  {
    id: "red",
    label: "Red Wire",
    color: "#e62622",
    border: "#231f1a",
    glow: "rgba(230, 38, 34, 0.65)",
    leftX: 30.8,
    leftY: 45.2,
    rightX: 66.0,
    rightY: 28.1,
  },
  {
    id: "blue",
    label: "Blue Wire",
    color: "#1f3ae2",
    border: "#15192b",
    glow: "rgba(31, 58, 226, 0.65)",
    leftX: 30.8,
    leftY: 62.0,
    rightX: 66.0,
    rightY: 45.2,
  },
  {
    id: "pink",
    label: "Pink Wire",
    color: "#e928d7",
    border: "#251423",
    glow: "rgba(233, 40, 215, 0.65)",
    leftX: 30.8,
    leftY: 78.6,
    rightX: 66.0,
    rightY: 78.6,
  },
];

export default function WireRepairModal({ isOpen, onClose, onComplete }) {
  const boardRef = useRef(null);
  const [connectedIds, setConnectedIds] = useState([]);
  const [dragging, setDragging] = useState(null); // { wireId, fromSide: 'left'|'right', startX, startY, curX, curY }
  const [wrongFlash, setWrongFlash] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConnectedIds([]);
      setDragging(null);
      setWrongFlash(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getRelativePercent = (clientX, clientY) => {
    const el = boardRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const handleStartDrag = (wire, side, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (connectedIds.includes(wire.id)) return;

    const startX = side === "left" ? wire.leftX : wire.rightX;
    const startY = side === "left" ? wire.leftY : wire.rightY;
    const pt = getRelativePercent(e.clientX, e.clientY);

    setDragging({
      wireId: wire.id,
      fromSide: side,
      startX,
      startY,
      curX: pt.x,
      curY: pt.y,
    });
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const pt = getRelativePercent(e.clientX, e.clientY);
    setDragging((prev) => (prev ? { ...prev, curX: pt.x, curY: pt.y } : null));
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;
    const pt = getRelativePercent(e.clientX, e.clientY);
    const wire = WIRES.find((w) => w.id === dragging.wireId);

    if (wire) {
      const targetX = dragging.fromSide === "left" ? wire.rightX : wire.leftX;
      const targetY = dragging.fromSide === "left" ? wire.rightY : wire.leftY;

      // Check if released near the matching opposite terminal rectangle
      const dist = Math.hypot(pt.x - targetX, pt.y - targetY);
      if (dist <= 9.5) {
        const nextConnected = [...new Set([...connectedIds, wire.id])];
        setConnectedIds(nextConnected);
        setDragging(null);

        if (nextConnected.length === WIRES.length) {
          setTimeout(() => {
            onComplete?.();
          }, 850);
        }
        return;
      }

      // Check if user dropped on a wrong terminal to give visual feedback
      const droppedOnWrong = WIRES.some((other) => {
        if (other.id === wire.id) return false;
        const ox = dragging.fromSide === "left" ? other.rightX : other.leftX;
        const oy = dragging.fromSide === "left" ? other.rightY : other.leftY;
        return Math.hypot(pt.x - ox, pt.y - oy) <= 8.5;
      });

      if (droppedOnWrong) {
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 450);
      }
    }

    setDragging(null);
  };

  const allConnected = connectedIds.length === WIRES.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Perseverance Rover Wire Repair"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 140,
        background: "rgba(6, 10, 16, 0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <div
        style={{
          width: "min(880px, 92vw)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Top Status Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 18px",
            borderRadius: 10,
            background: "rgba(18, 24, 34, 0.88)",
            border: `1.5px solid ${
              allConnected
                ? "#38ef7d"
                : wrongFlash
                ? "#ff5252"
                : "rgba(110, 230, 220, 0.65)"
            }`,
            color: "#f5efe2",
            fontFamily: "Manrope, sans-serif",
            boxShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
          }}
        >
          <div>
            <strong style={{ fontSize: 15, color: allConnected ? "#69f0ae" : "#7ef2ff" }}>
              {allConnected
                ? "✓ PERSEVERANCE ROVER WIRES REPAIRED — POWER CORE ONLINE!"
                : "🔧 MISSION 2: PERSEVERANCE ROVER WIRE REPAIR"}
            </strong>
            <div style={{ fontSize: 12.5, color: "#d5cfc0", marginTop: 2 }}>
              {wrongFlash
                ? "⚠ Color mismatch! Drag each wire rectangle to its matching color code on the opposite side."
                : "Drag each wire from left to right (or right to left) to connect matching color codes."}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                background: allConnected
                  ? "rgba(56, 239, 125, 0.2)"
                  : "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                fontSize: 12.5,
                fontWeight: 800,
                color: allConnected ? "#69f0ae" : "#ffe28a",
              }}
            >
              {connectedIds.length} / {WIRES.length} Connected
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(35, 38, 48, 0.9)",
                color: "#f3ead8",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Interactive Wire Board using perseverance_wire_repair.jpeg */}
        <div
          ref={boardRef}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1376 / 768",
            borderRadius: 14,
            overflow: "hidden",
            border: "2px solid rgba(226, 210, 180, 0.55)",
            boxShadow: "0 22px 55px rgba(0, 0, 0, 0.75)",
            background: "#1c2226",
          }}
        >
          <img
            src={wireRepairBg}
            alt="Perseverance Rover Electrical Wire Panel"
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              pointerEvents: "none",
            }}
          />

          {/* Clickable Close Button over the image's built-in (X) circle at top-left of box */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wire repair panel"
            title="Close Panel"
            style={{
              position: "absolute",
              left: "20.8%",
              top: "11.8%",
              width: "4.6%",
              height: "8.2%",
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              zIndex: 10,
            }}
          />

          {/* SVG Layer for Rectangular Wire Connections (Connected + Active Dragging) */}
          <svg
            viewBox="0 0 1000 558"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            {/* Color-code jacket rectangle on Bottom-Left terminal so all 4 colors (Yellow, Red, Blue, Pink) match 1-to-1 */}
            <rect
              x={258}
              y={(78.6 / 100) * 558 - 9}
              width={44}
              height={18}
              rx={2}
              fill="#e928d7"
              stroke="#231f1a"
              strokeWidth={2.5}
            />

            {/* Completed Rectangular Wires */}
            {WIRES.filter((w) => connectedIds.includes(w.id)).map((w) => {
              const x1 = (w.leftX / 100) * 1000;
              const y1 = (w.leftY / 100) * 558;
              const x2 = (w.rightX / 100) * 1000;
              const y2 = (w.rightY / 100) * 558;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.hypot(dx, dy);
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

              return (
                <g
                  key={w.id}
                  transform={`translate(${x1}, ${y1}) rotate(${angle})`}
                >
                  {/* Outer dark border of the wire rectangle */}
                  <rect
                    x={-6}
                    y={-10}
                    width={len + 12}
                    height={20}
                    rx={3}
                    fill={w.color}
                    stroke={w.border}
                    strokeWidth={3.5}
                  />
                  {/* Inner highlight stripe along the rectangular wire */}
                  <rect
                    x={0}
                    y={-5}
                    width={len}
                    height={4}
                    rx={1.5}
                    fill="rgba(255, 255, 255, 0.35)"
                  />
                </g>
              );
            })}

            {/* Currently Dragged Rectangular Wire */}
            {dragging &&
              (() => {
                const w = WIRES.find((item) => item.id === dragging.wireId);
                if (!w) return null;
                const x1 = (dragging.startX / 100) * 1000;
                const y1 = (dragging.startY / 100) * 558;
                const x2 = (dragging.curX / 100) * 1000;
                const y2 = (dragging.curY / 100) * 558;
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.max(12, Math.hypot(dx, dy));
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                return (
                  <g transform={`translate(${x1}, ${y1}) rotate(${angle})`}>
                    {/* Stretched Rectangle representing the wire being dragged */}
                    <rect
                      x={-4}
                      y={-10}
                      width={len}
                      height={20}
                      rx={3}
                      fill={w.color}
                      stroke={w.border}
                      strokeWidth={3.5}
                    />
                    {/* Copper connector rectangle at the dragged tip */}
                    <rect
                      x={len - 4}
                      y={-7}
                      width={12}
                      height={14}
                      rx={2}
                      fill="#c97a3d"
                      stroke="#2b1b10"
                      strokeWidth={2}
                    />
                  </g>
                );
              })()}
          </svg>

          {/* Interactive Rectangular Drag Handles for Left & Right Wire Terminals */}
          {WIRES.map((w) => {
            const isDone = connectedIds.includes(w.id);
            const isBeingDragged = dragging?.wireId === w.id;

            return (
              <div key={w.id}>
                {/* Left Wire Terminal Rectangle Hitbox */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Drag ${w.label} from left terminal`}
                  onPointerDown={(e) => handleStartDrag(w, "left", e)}
                  style={{
                    position: "absolute",
                    left: "25.5%",
                    top: `${w.leftY - 3.3}%`,
                    width: "7.8%",
                    height: "6.6%",
                    borderRadius: 4,
                    border: isDone
                      ? "2px solid #38ef7d"
                      : isBeingDragged
                      ? "2px solid #ffffff"
                      : "2px dashed rgba(255, 255, 255, 0.55)",
                    background: isDone
                      ? "rgba(56, 239, 125, 0.18)"
                      : "rgba(255, 255, 255, 0.06)",
                    boxShadow: isDone ? "0 0 12px rgba(56, 239, 125, 0.5)" : `0 0 10px ${w.glow}`,
                    cursor: isDone ? "default" : "grab",
                    zIndex: 8,
                  }}
                />

                {/* Right Wire Terminal Rectangle Hitbox */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Connect ${w.label} to right terminal`}
                  onPointerDown={(e) => handleStartDrag(w, "right", e)}
                  style={{
                    position: "absolute",
                    left: "63.5%",
                    top: `${w.rightY - 3.3}%`,
                    width: "7.8%",
                    height: "6.6%",
                    borderRadius: 4,
                    border: isDone
                      ? "2px solid #38ef7d"
                      : isBeingDragged
                      ? "2px solid #ffffff"
                      : "2px dashed rgba(255, 255, 255, 0.55)",
                    background: isDone
                      ? "rgba(56, 239, 125, 0.18)"
                      : "rgba(255, 255, 255, 0.06)",
                    boxShadow: isDone ? "0 0 12px rgba(56, 239, 125, 0.5)" : `0 0 10px ${w.glow}`,
                    cursor: isDone ? "default" : "grab",
                    zIndex: 8,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
