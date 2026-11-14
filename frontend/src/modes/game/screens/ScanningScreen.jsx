import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import CharacterDiscover from "./CharacterDiscover";
import { CHARACTERS } from "../data/characters";
import { loadSavedProgress, markCreatureScanned } from "../../map/game/marsModel";

const PILL_BUTTON_STYLE = {
  position: "fixed",
  top: 22,
  left: 22,
  zIndex: 20,
  padding: "9px 18px",
  borderRadius: 999,
  border: "1px solid rgba(255, 224, 160, 0.42)",
  background: "rgba(22, 8, 16, 0.65)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  color: "rgba(255, 236, 196, 0.95)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: "0 6px 22px rgba(0, 0, 0, 0.45)",
};

export default function ScanningScreen({ initialIndex = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const paramCharId = searchParams.get("characterId") ?? location.state?.characterId ?? null;
  const paramSlot = searchParams.get("slot") ?? location.state?.slot ?? null;
  const fromMap = Boolean(location.state?.fromMap || paramSlot !== null || paramCharId !== null);

  const resolvedInitialIndex = (() => {
    if (paramCharId !== null) {
      const foundIndex = CHARACTERS.findIndex((item) => item.id === Number(paramCharId));
      if (foundIndex !== -1) return foundIndex;
    }
    return initialIndex % CHARACTERS.length;
  })();

  const [index, setIndex] = useState(resolvedInitialIndex);
  const [discovered, setDiscovered] = useState(false);
  const [scannedCount, setScannedCount] = useState(() => loadSavedProgress().scannedSlots.length);

  const current = CHARACTERS[index];

  const handleDiscover = () => {
    setDiscovered(true);
    if (fromMap) {
      const updated = markCreatureScanned(paramSlot, current.id);
      setScannedCount(updated.scannedSlots.length);
    }
  };

  const handleReturnToMap = () => {
    navigate("/map", { replace: true });
  };

  const handleFightCreature = () => {
    const query = new URLSearchParams();
    query.set("characterId", String(current.id));
    if (paramSlot !== null) query.set("slot", String(paramSlot));
    navigate(`/battle?${query.toString()}`, {
      replace: true,
      state: {
        fromMap: true,
        characterId: current.id,
        slot: paramSlot,
      },
    });
  };

  const handleNext = () => {
    setDiscovered(false);
    setIndex((prev) => (prev + 1) % CHARACTERS.length);
  };

  useEffect(() => {
    if (!fromMap) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        navigate("/map", { replace: true });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fromMap, navigate]);

  const allScanned = scannedCount >= CHARACTERS.length;

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh" }}>
      <CharacterDiscover
        key={`${current.id}-${paramSlot ?? "standalone"}`}
        silhouetteSrc={current.silhouette}
        characterSrc={current.character}
        characterName={current.name}
        onDiscover={handleDiscover}
      />

      {fromMap ? (
        discovered ? (
          <div
            style={{
              position: "fixed",
              top: 22,
              left: 22,
              zIndex: 20,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={handleReturnToMap}
              style={{
                ...PILL_BUTTON_STYLE,
                position: "static",
                borderColor: allScanned
                  ? "rgba(126, 244, 212, 0.72)"
                  : "rgba(255, 224, 160, 0.65)",
                color: allScanned ? "#cafff0" : "#fff1cf",
              }}
            >
              {allScanned
                ? `← Return to Map · Locate Perseverance (${scannedCount}/${CHARACTERS.length})`
                : `← Return to Mars Map (${scannedCount}/${CHARACTERS.length} Scanned)`}
            </button>
            <button
              type="button"
              onClick={handleFightCreature}
              style={{
                ...PILL_BUTTON_STYLE,
                position: "static",
                border: "1.5px solid rgba(255, 204, 128, 0.88)",
                background: "linear-gradient(180deg, rgba(184, 74, 39, 0.92) 0%, rgba(110, 34, 18, 0.94) 100%)",
                color: "#fff4dc",
                boxShadow: "0 6px 24px rgba(0, 0, 0, 0.55), 0 0 18px rgba(218, 98, 44, 0.45)",
              }}
            >
              ⚔ Fight {current.name} →
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleReturnToMap}
            style={{
              ...PILL_BUTTON_STYLE,
              opacity: 0.78,
            }}
          >
            ← Back to Map
          </button>
        )
      ) : (
        discovered && (
          <div
            style={{
              position: "fixed",
              top: 22,
              left: 22,
              zIndex: 20,
              display: "flex",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={handleNext}
              style={{ ...PILL_BUTTON_STYLE, position: "static" }}
            >
              Next Creature ({index + 1}/{CHARACTERS.length}) →
            </button>
            <button
              type="button"
              onClick={handleFightCreature}
              style={{
                ...PILL_BUTTON_STYLE,
                position: "static",
                border: "1.5px solid rgba(255, 204, 128, 0.88)",
                background: "linear-gradient(180deg, rgba(184, 74, 39, 0.92) 0%, rgba(110, 34, 18, 0.94) 100%)",
                color: "#fff4dc",
              }}
            >
              ⚔ Fight {current.name} →
            </button>
          </div>
        )
      )}
    </div>
  );
}
