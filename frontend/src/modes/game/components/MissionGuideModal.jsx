import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CHARACTERS } from "../data/characters.js";
import {
  completeMissionTask,
  loadMissionProgress,
} from "../data/missions.js";
import { loadSavedProgress, markCreatureScanned } from "../../map/game/marsModel.js";

const GUIDE_CSS = `
  .zr-mission-backdrop {
    position: fixed;
    inset: 0;
    z-index: 120;
    background: rgba(6, 8, 16, 0.86);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 18px;
    font-family: 'Press Start 2P', 'Consolas', 'Courier New', monospace;
    color: #fff3d6;
    user-select: none;
  }

  .zr-mission-window {
    width: min(1040px, 96vw);
    max-height: 90vh;
    background: linear-gradient(180deg, #161b28 0%, #0e111a 100%);
    border: 3px solid #6fb6ff;
    border-radius: 8px;
    box-shadow:
      0 0 40px rgba(0, 0, 0, 0.9),
      0 0 24px rgba(111, 182, 255, 0.32),
      inset 0 0 22px rgba(111, 182, 255, 0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .zr-mission-header {
    padding: 16px 20px;
    background: linear-gradient(90deg, #1d263b 0%, #281924 100%);
    border-bottom: 2px solid rgba(111, 182, 255, 0.45);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .zr-mission-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .zr-mission-eyebrow {
    font-size: 9px;
    letter-spacing: 0.22em;
    color: #7eeeff;
    text-transform: uppercase;
  }

  .zr-mission-heading {
    margin: 0;
    font-size: clamp(13px, 1.8vw, 17px);
    color: #ffe6a8;
    text-shadow: 0 0 12px rgba(255, 196, 100, 0.5);
  }

  .zr-mission-close {
    font-family: inherit;
    font-size: 10px;
    padding: 9px 14px;
    background: #9e2a2b;
    color: #fff;
    border: 2px solid #ff9b85;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 3px 0 #4a0e10;
  }

  .zr-mission-close:hover {
    filter: brightness(1.15);
  }

  .zr-mission-systems-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
    gap: 8px;
    padding: 12px 20px;
    background: rgba(10, 14, 24, 0.9);
    border-bottom: 1px solid rgba(111, 182, 255, 0.28);
  }

  .zr-sys-pill {
    padding: 7px 10px;
    border-radius: 4px;
    border: 1px solid rgba(140, 170, 210, 0.3);
    background: rgba(24, 30, 46, 0.75);
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  .zr-sys-pill.is-online {
    border-color: #38ef7d;
    background: rgba(16, 56, 38, 0.55);
    box-shadow: inset 0 0 10px rgba(56, 239, 125, 0.2);
  }

  .zr-sys-pill small {
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9bb8d8;
  }

  .zr-sys-pill strong {
    font-size: 11px;
    color: #ffd68a;
  }

  .zr-sys-pill.is-online strong {
    color: #69f0ae;
  }

  .zr-mission-list {
    padding: 18px 20px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(430px, 1fr));
    gap: 16px;
  }

  @media (max-width: 600px) {
    .zr-mission-list {
      grid-template-columns: 1fr;
    }
  }

  .zr-mission-card {
    background: linear-gradient(165deg, rgba(28, 36, 54, 0.94) 0%, rgba(16, 20, 32, 0.96) 100%);
    border: 2px solid #3c4f70;
    border-radius: 6px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .zr-mission-card.is-active {
    border-color: #ffd166;
    box-shadow: 0 0 18px rgba(255, 209, 102, 0.25);
  }

  .zr-mission-card.is-completed {
    border-color: #38ef7d;
    box-shadow: 0 0 16px rgba(56, 239, 125, 0.2);
  }

  .zr-mission-card-top {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .zr-mission-avatar {
    width: 68px;
    height: 68px;
    border-radius: 6px;
    background: radial-gradient(circle, #2b3c56 0%, #121722 85%);
    border: 2px solid #567099;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    padding: 4px;
  }

  .zr-mission-avatar img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .zr-mission-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .zr-mission-badge-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .zr-mission-num {
    font-size: 9px;
    color: #7eeeff;
    background: rgba(30, 80, 120, 0.55);
    border: 1px solid #52b7e8;
    padding: 3px 7px;
    border-radius: 3px;
  }

  .zr-mission-status {
    font-size: 8px;
    padding: 3px 7px;
    border-radius: 3px;
    border: 1px solid #708098;
    color: #c8d6e8;
    background: rgba(20, 26, 38, 0.8);
  }

  .zr-mission-status.is-scrap {
    border-color: #ffd166;
    color: #ffe89e;
    background: rgba(90, 62, 12, 0.65);
  }

  .zr-mission-status.is-done {
    border-color: #38ef7d;
    color: #a8ffcb;
    background: rgba(14, 70, 40, 0.7);
  }

  .zr-mission-card-title {
    margin: 0;
    font-size: 12px;
    color: #fff2cc;
    line-height: 1.4;
  }

  .zr-mission-loc {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 11px;
    color: #9ec5eb;
  }

  .zr-mission-bullets {
    margin: 0;
    padding: 10px 12px;
    list-style: none;
    background: rgba(9, 12, 20, 0.78);
    border: 1px solid rgba(110, 145, 195, 0.25);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #dce9f8;
  }

  .zr-mission-bullets strong {
    color: #ffd68a;
  }

  .zr-scrap-chip {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    background: rgba(255, 204, 102, 0.16);
    border: 1px solid rgba(255, 204, 102, 0.55);
    color: #ffe299;
    font-weight: 700;
  }

  .zr-mission-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: auto;
  }

  .zr-m-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    padding: 8px 11px;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid #5c7da8;
    background: #1f304d;
    color: #e6f2ff;
    transition: transform 0.1s, filter 0.15s;
  }

  .zr-m-btn:hover:not(:disabled) {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }

  .zr-m-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .zr-m-btn.is-battle {
    background: linear-gradient(180deg, #b84a27 0%, #6e200e 100%);
    border-color: #ffca80;
    color: #fff4dc;
  }

  .zr-m-btn.is-repair {
    background: linear-gradient(180deg, #1b8a5a 0%, #0e4f32 100%);
    border-color: #69f0ae;
    color: #eafff2;
    flex: 1 1 100%;
  }

  .zr-mission-banner-toast {
    margin: 0 20px 14px;
    padding: 10px 14px;
    border-radius: 5px;
    border: 2px solid #38ef7d;
    background: rgba(14, 62, 38, 0.85);
    color: #caffdf;
    font-size: 10px;
    line-height: 1.5;
    text-align: center;
  }
`;

export default function MissionGuideModal({
  isOpen = true,
  onClose,
  activeCharacterId = null,
  standalone = false,
  onProgressChange,
}) {
  const navigate = useNavigate();
  const [missionProgress, setMissionProgress] = useState(() => loadMissionProgress());
  const [mapProgress, setMapProgress] = useState(() => loadSavedProgress());
  const [repairNotice, setRepairNotice] = useState(null);

  if (!isOpen) return null;

  const scannedCharIds = (mapProgress.scannedSlots || [])
    .map((slotIdx) => mapProgress.creatureOrder?.[slotIdx])
    .filter(Boolean);

  const handleScanMissionAlien = (character) => {
    const slotIdx = mapProgress.creatureOrder?.indexOf(character.id) ?? character.id - 1;
    onClose?.();
    navigate(`/scan?characterId=${character.id}&slot=${Math.max(0, slotIdx)}`, {
      state: {
        fromMap: true,
        characterId: character.id,
        slot: Math.max(0, slotIdx),
      },
    });
  };

  const handleBattleMissionAlien = (character) => {
    const slotIdx = Math.max(0, mapProgress.creatureOrder?.indexOf(character.id) ?? character.id - 1);
    // Ensure creature is marked scanned before entering battle
    markCreatureScanned(slotIdx, character.id);
    setMapProgress(loadSavedProgress());
    onClose?.();
    navigate(`/battle?characterId=${character.id}&slot=${slotIdx}`, {
      state: {
        fromMap: true,
        characterId: character.id,
        slot: slotIdx,
      },
    });
  };

  const handleRepairTask = (character) => {
    const updated = completeMissionTask(character.id);
    setMissionProgress(updated);
    setMapProgress(loadSavedProgress());
    setRepairNotice(
      `★ Mission ${character.missionNumber} Complete: Used ${character.scrapName} to fix ${character.targetObject}! (${character.systemEffectLabel})`
    );
    onProgressChange?.(updated);
  };

  const systems = [
    {
      label: "Mission 1 · Crate",
      value: missionProgress.hudUnlocked ? "HUD ONLINE" : "SMASHED",
      online: missionProgress.hudUnlocked,
    },
    {
      label: "Mission 2 · Rover",
      value: missionProgress.roverPowerOnline ? "CORE ONLINE" : "STALLED",
      online: missionProgress.roverPowerOnline,
    },
    {
      label: "Mission 3 · Analyzer",
      value: missionProgress.spectroAnalyzerRepaired ? "BIOSCAN MAX" : "OFFLINE",
      online: missionProgress.spectroAnalyzerRepaired,
    },
    {
      label: "Mission 4 · O₂ Filter",
      value: missionProgress.carbonFilterRestored ? "CLEAN O₂ 100%" : "CLOGGED",
      online: missionProgress.carbonFilterRestored,
    },
    {
      label: "Mission 5 · Reports",
      value: missionProgress.reportsDecrypted ? "DECRYPTED" : "ENCRYPTED",
      online: missionProgress.reportsDecrypted,
    },
    {
      label: "Mission 6 · S.U.N.A. IV",
      value: missionProgress.finalTransmissionSent ? "BROADCASTED" : "SILENT",
      online: missionProgress.finalTransmissionSent,
    },
  ];

  return (
    <div
      className="zr-mission-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Zero Requiem Pixel Mission Guide"
      onClick={() => !standalone && onClose?.()}
    >
      <style>{GUIDE_CSS}</style>
      <div className="zr-mission-window" onClick={(e) => e.stopPropagation()}>
        <header className="zr-mission-header">
          <div className="zr-mission-title-wrap">
            <span className="zr-mission-eyebrow">
              Zero Requiem // Scrap &amp; Mission Integration ({missionProgress.completedMissions.length}/6 Completed)
            </span>
            <h2 className="zr-mission-heading">
              PIXEL MISSION GUIDE &amp; FIELD REPAIRS
            </h2>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {standalone && (
              <button
                type="button"
                className="zr-m-btn"
                onClick={() => navigate("/map")}
              >
                ← MARS MAP
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="zr-mission-close"
                onClick={onClose}
              >
                ✕ CLOSE
              </button>
            )}
          </div>
        </header>

        <div className="zr-mission-systems-bar">
          {systems.map((sys) => (
            <div
              key={sys.label}
              className={`zr-sys-pill${sys.online ? " is-online" : ""}`}
            >
              <small>{sys.label}</small>
              <strong>{sys.value}</strong>
            </div>
          ))}
        </div>

        {repairNotice && (
          <div className="zr-mission-banner-toast" role="status">
            {repairNotice}
          </div>
        )}

        <div className="zr-mission-list">
          {CHARACTERS.map((char) => {
            const isUnlocked =
              char.id === 1 || missionProgress.completedMissions.includes(char.id - 1);
            const isScanned =
              scannedCharIds.includes(char.id) ||
              missionProgress.defeatedAliens.includes(char.id) ||
              missionProgress.completedMissions.includes(char.id);
            const hasScrap = missionProgress.obtainedScraps.includes(char.id);
            const isCompleted = missionProgress.completedMissions.includes(char.id);
            const isHighlighted = Number(activeCharacterId) === char.id;

            return (
              <article
                key={char.id}
                className={`zr-mission-card${
                  isCompleted ? " is-completed" : isHighlighted ? " is-active" : ""
                }`}
                style={{ opacity: isUnlocked ? 1 : 0.62 }}
              >
                <div className="zr-mission-card-top">
                  <div className="zr-mission-avatar">
                    <img
                      src={isScanned ? char.character : char.silhouette}
                      alt={isScanned ? char.alienTitle : `Undiscovered ${char.alienNumber}`}
                    />
                  </div>
                  <div className="zr-mission-meta">
                    <div className="zr-mission-badge-row">
                      <span className="zr-mission-num">
                        MISSION {char.missionNumber} · {char.code}
                      </span>
                      <span
                        className={`zr-mission-status${
                          isCompleted
                            ? " is-done"
                            : hasScrap
                            ? " is-scrap"
                            : ""
                        }`}
                      >
                        {isCompleted
                          ? "✓ TASK REPAIRED"
                          : !isUnlocked
                          ? `🔒 COMPLETE MISSION ${char.id - 1} FIRST`
                          : hasScrap
                          ? `⚙ ${char.scrapName.toUpperCase()} READY`
                          : "⚔ ACTIVE MISSION"}
                      </span>
                    </div>
                    <h3 className="zr-mission-card-title">
                      Mission {char.missionNumber}: {char.missionTitle}
                    </h3>
                    <span className="zr-mission-loc">{char.locationTag}</span>
                  </div>
                </div>

                <ul className="zr-mission-bullets">
                  <li>
                    <strong>The Alien:</strong>{" "}
                    <strong>{char.alienTitle}</strong> — {char.behavior}
                  </li>
                  <li>
                    <strong>The Battle &amp; Scrap:</strong> Defeat {char.alienNumber} to obtain{" "}
                    <span className="zr-scrap-chip">{char.scrapName}</span>.
                  </li>
                  <li>
                    <strong>The Task:</strong> {char.taskDescription}
                  </li>
                </ul>

                <div className="zr-mission-actions">
                  {!isUnlocked ? (
                    <button type="button" className="zr-m-btn" disabled>
                      🔒 Unlocks after Mission {char.id - 1} is completed
                    </button>
                  ) : (
                    <>
                      {!hasScrap && !isCompleted && (
                        <>
                          <button
                            type="button"
                            className="zr-m-btn"
                            onClick={() => handleScanMissionAlien(char)}
                          >
                            {isScanned ? "✦ Re-Scan Alien" : "✦ Scan Alien"}
                          </button>
                          <button
                            type="button"
                            className="zr-m-btn is-battle"
                            disabled={!isScanned}
                            onClick={() => handleBattleMissionAlien(char)}
                          >
                            {isScanned
                              ? `⚔ Battle ${char.name}`
                              : "🔒 Scan on Map First"}
                          </button>
                        </>
                      )}

                      {hasScrap && !isCompleted && (
                        <button
                          type="button"
                          className="zr-m-btn is-repair"
                          onClick={() => handleRepairTask(char)}
                        >
                          🔧 Use {char.scrapName} → {char.taskActionLabel}
                        </button>
                      )}

                      {isCompleted && (
                        <button
                          type="button"
                          className="zr-m-btn is-repair"
                          disabled
                        >
                          ✓ {char.targetObject} Repaired ({char.systemEffectLabel})
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
