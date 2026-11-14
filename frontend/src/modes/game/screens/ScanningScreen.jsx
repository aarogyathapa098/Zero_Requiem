import { useState } from "react";
import CharacterDiscover from "./CharacterDiscover";
import char1 from "../assets/images/characters/1.png";
import char2 from "../assets/images/characters/2.png";
import char3 from "../assets/images/characters/3.png";
import char4 from "../assets/images/characters/4.png";
import char5 from "../assets/images/characters/5.png";
import char6 from "../assets/images/characters/6.png";
import sil1 from "../assets/images/silhouette/1.1.png";
import sil2 from "../assets/images/silhouette/2.1.png";
import sil3 from "../assets/images/silhouette/3.1.png";
import sil4 from "../assets/images/silhouette/4.1.png";
import sil5 from "../assets/images/silhouette/5.1.png";
import sil6 from "../assets/images/silhouette/6.1.png";

export const CHARACTERS = [
  { id: 1, name: "NTM-102", character: char1, silhouette: sil1 },
  { id: 2, name: "SR-112", character: char2, silhouette: sil2 },
  { id: 3, name: "SG-132", character: char3, silhouette: sil3 },
  { id: 4, name: "AJ-911", character: char4, silhouette: sil4 },
  { id: 5, name: "UP-404", character: char5, silhouette: sil5 },
  { id: 6, name: "NRJ-101", character: char6, silhouette: sil6 },
];

export default function ScanningScreen({ initialIndex = 0 }) {
  const [index, setIndex] = useState(initialIndex % CHARACTERS.length);
  const [discovered, setDiscovered] = useState(false);

  const current = CHARACTERS[index];

  const handleNext = () => {
    setDiscovered(false);
    setIndex((prev) => (prev + 1) % CHARACTERS.length);
  };

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh" }}>
      <CharacterDiscover
        key={current.id}
        silhouetteSrc={current.silhouette}
        characterSrc={current.character}
        characterName={current.name}
        onDiscover={() => setDiscovered(true)}
      />

      {discovered && (
        <button
          type="button"
          onClick={handleNext}
          style={{
            position: "fixed",
            top: 22,
            left: 22,
            zIndex: 20,
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid rgba(255, 224, 160, 0.25)",
            background: "rgba(22, 8, 16, 0.52)",
            backdropFilter: "blur(8px)",
            color: "rgba(255, 232, 188, 0.9)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Next Creature ({index + 1}/{CHARACTERS.length}) →
        </button>
      )}
    </div>
  );
}
