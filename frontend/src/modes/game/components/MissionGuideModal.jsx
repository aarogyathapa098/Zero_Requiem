import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MISSION_CHARACTERS } from "../data/characters.js";
import {
  completeMissionTask,
  getActiveSerialMission,
  isMissionUnlocked,
  loadMissionProgress,
  MISSIONS,
} from "../data/missions.js";
import {
  distance,
  loadSavedProgress,
  markCreatureScanned,
} from "../../map/game/marsModel.js";
import WireRepairModal from "./WireRepairModal.jsx";

const DIRECTIVE_CSS = `
  .ares-overlay {
    position: fixed;
    inset: 0;
    z-index: 120;
    background: rgba(8, 10, 16, 0.24);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    padding: 18px;
    color: #f3ecdc;
    font-family: "Georgia", "Times New Roman", "Manrope", serif;
    user-select: none;
  }

  /* Compact Floating Window (Does NOT use the whole screen, transparent glass) */
  .ares-window {
    position: relative;
    width: min(900px, 88vw);
    height: min(550px, 80vh);
    border-radius: 14px;
    border: 1.5px solid rgba(226, 210, 180, 0.42);
    background: linear-gradient(
      135deg,
      rgba(34, 26, 28, 0.56) 0%,
      rgba(22, 20, 28, 0.62) 100%
    );
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow:
      0 20px 50px rgba(0, 0, 0, 0.55),
      inset 0 0 0 1px rgba(255, 245, 220, 0.1);
    display: flex;
    overflow: hidden;
  }

  /* ── Left Vertical Icon Sidebar ─────────────────────────────────────────── */
  .ares-sidebar {
    width: 60px;
    background: rgba(18, 20, 28, 0.45);
    border-right: 1px solid rgba(206, 185, 148, 0.24);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 0;
    position: relative;
    z-index: 3;
    flex-shrink: 0;
  }

  .ares-pennant {
    width: 28px;
    height: 36px;
    background: linear-gradient(180deg, #dec79b 0%, #b89c6d 100%);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%);
    display: grid;
    place-items: center;
    color: #2b2623;
    font-weight: 900;
    font-size: 15px;
    margin-bottom: 18px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  }

  .ares-nav-tabs {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    align-items: center;
  }

  .ares-step-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1.5px solid rgba(214, 198, 168, 0.25);
    background: rgba(20, 22, 30, 0.55);
    color: #cfc5b2;
    display: grid;
    place-items: center;
    font-family: "Manrope", sans-serif;
    font-size: 12px;
    font-weight: 700;
    transition: all 0.2s ease;
  }

  .ares-step-dot.is-current {
    background: #f3ede0;
    border-color: #ffffff;
    color: #1f2330;
    box-shadow: 0 0 12px rgba(243, 237, 224, 0.65);
  }

  .ares-step-dot.is-done {
    background: rgba(28, 110, 78, 0.65);
    border-color: #4ce09a;
    color: #98ffd0;
  }

  .ares-step-dot.is-locked {
    opacity: 0.38;
  }

  .ares-sidebar-bottom {
    margin-top: auto;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid rgba(214, 198, 168, 0.3);
    background: rgba(20, 24, 34, 0.55);
    color: #e6dac4;
    display: grid;
    place-items: center;
    font-family: "Manrope", sans-serif;
    font-size: 10.5px;
    font-weight: 700;
  }

  /* ── Main Content Wrapper ───────────────────────────────────────────────── */
  .ares-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 2;
    overflow: hidden;
  }

  /* Top Bar ("In Progress" + Close circle button) */
  .ares-topbar {
    height: 50px;
    padding: 0 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(226, 210, 180, 0.16);
    flex-shrink: 0;
  }

  .ares-status-label {
    font-size: 15px;
    color: #e6d4b0;
    letter-spacing: 0.03em;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ares-close-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1.5px solid rgba(120, 108, 92, 0.6);
    background: radial-gradient(circle, #f5efe2 0%, #dfd6c3 100%);
    color: #2d2f3b;
    font-size: 15px;
    font-weight: 900;
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s ease, filter 0.15s ease;
  }

  .ares-close-circle:hover {
    transform: scale(1.06);
    filter: brightness(1.05);
  }

  /* ── Two-Column Body ────────────────────────────────────────────────────── */
  .ares-columns {
    flex: 1;
    display: grid;
    grid-template-columns: 310px 1px 1fr;
    gap: 20px;
    padding: 14px 22px 18px;
    overflow: hidden;
  }

  @media (max-width: 820px) {
    .ares-window {
      width: 94vw;
      height: 86vh;
    }
    .ares-columns {
      grid-template-columns: 1fr;
      overflow-y: auto;
    }
    .ares-v-divider {
      display: none;
    }
  }

  .ares-v-divider {
    width: 1px;
    background: linear-gradient(
      180deg,
      rgba(232, 218, 194, 0.08) 0%,
      rgba(232, 218, 194, 0.45) 15%,
      rgba(232, 218, 194, 0.45) 85%,
      rgba(232, 218, 194, 0.08) 100%
    );
  }

  /* ── Left Column: Sequential Timeline 1 → 2 → 3 → 4 → 5 → 6 ────────────── */
  .ares-left-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .ares-directive-header-box {
    background: rgba(28, 32, 44, 0.52);
    border: 1px solid rgba(226, 216, 195, 0.48);
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 2px;
  }

  .ares-directive-header-box strong {
    font-size: 13.5px;
    color: #f6efe0;
    font-weight: 600;
  }

  .ares-directive-header-box span {
    font-size: 11.5px;
    color: #dbb779;
  }

  /* Timeline Wrapper with vertical connector line */
  .ares-timeline-list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .ares-mission-item {
    position: relative;
    width: 100%;
    text-align: left;
    padding: 9px 12px;
    border-radius: 6px;
    border: 1px solid rgba(130, 140, 165, 0.32);
    background: rgba(26, 30, 42, 0.48);
    color: #ebe3d2;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.18s ease;
    font-family: inherit;
  }

  .ares-mission-item:hover:not(:disabled) {
    border-color: rgba(230, 215, 185, 0.65);
    background: rgba(42, 48, 64, 0.65);
  }

  .ares-mission-item.is-selected {
    background: linear-gradient(90deg, rgba(246, 241, 228, 0.94) 0%, rgba(234, 224, 204, 0.92) 100%);
    border-color: #ffffff;
    color: #222634;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  }

  .ares-mission-item.is-locked,
  .ares-mission-item:disabled {
    opacity: 0.42;
    cursor: not-allowed;
    background: rgba(16, 18, 26, 0.35);
    border-color: rgba(100, 108, 125, 0.2);
  }

  .ares-timeline-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(226, 210, 180, 0.4);
    display: grid;
    place-items: center;
    font-family: "Manrope", sans-serif;
    font-size: 11.5px;
    font-weight: 800;
    flex-shrink: 0;
  }

  .ares-mission-item.is-selected .ares-timeline-num {
    background: #222634;
    color: #f6f1e4;
    border-color: #222634;
  }

  .ares-item-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .ares-item-title {
    font-size: 13.5px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ares-item-dist {
    font-family: "Manrope", "Segoe UI", sans-serif;
    font-size: 11px;
    color: #b5bccb;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ares-mission-item.is-selected .ares-item-dist {
    color: #555a68;
    font-weight: 600;
  }

  /* Right badge inside mission item */
  .ares-item-badge-active {
    width: 22px;
    height: 22px;
    background: #1be7c6;
    transform: rotate(45deg);
    border-radius: 3px;
    display: grid;
    place-items: center;
    box-shadow: 0 0 10px rgba(27, 231, 198, 0.75);
    flex-shrink: 0;
  }

  .ares-item-badge-active span {
    transform: rotate(-45deg);
    color: #132624;
    font-size: 11px;
    font-weight: 900;
    line-height: 1;
  }

  .ares-item-badge-pin {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(54, 60, 76, 0.65);
    border: 1px solid rgba(180, 190, 210, 0.3);
    color: #b8c0d0;
    display: grid;
    place-items: center;
    font-size: 11px;
    flex-shrink: 0;
  }

  .ares-item-badge-pin.is-done {
    background: rgba(26, 92, 62, 0.75);
    border-color: #4ce09a;
    color: #7effc1;
  }

  /* ── Right Column: Detailed Directive View ──────────────────────────────── */
  .ares-right-col {
    display: flex;
    flex-direction: column;
    padding: 0 4px;
    overflow-y: auto;
  }

  .ares-detail-title {
    margin: 0;
    font-size: clamp(19px, 2vw, 24px);
    font-weight: 600;
    color: #f9f3e6;
  }

  .ares-detail-loc {
    margin-top: 3px;
    font-size: 13px;
    color: #deb97a;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .ares-ornament-line {
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(220, 198, 164, 0.5) 0%,
      rgba(220, 198, 164, 0.2) 90%,
      transparent 100%
    );
    margin: 10px 0;
    position: relative;
  }

  .ares-task-angle-header {
    font-size: 14px;
    color: #63f2dc;
    margin-bottom: 5px;
    font-weight: 600;
  }

  .ares-story-desc {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.48;
    color: #ece4d2;
  }

  .ares-story-sub-list {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: "Manrope", "Segoe UI", sans-serif;
    font-size: 12px;
    color: #dcd3c2;
  }

  .ares-story-sub-list strong {
    color: #f4d290;
  }

  /* Mission Objectives Box with Segmented Bars */
  .ares-objectives-heading {
    font-size: 13.5px;
    color: #f2e9d8;
    margin: 2px 0 6px;
  }

  .ares-objectives-box {
    background: rgba(20, 24, 34, 0.46);
    border: 1px solid rgba(150, 165, 190, 0.22);
    border-radius: 6px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ares-obj-row {
    display: grid;
    grid-template-columns: 155px 1fr 42px;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #ece4d4;
  }

  .ares-seg-bar-wrap {
    display: flex;
    align-items: center;
    gap: 3px;
    font-family: "Consolas", monospace;
    color: #d8d0c0;
    font-size: 13px;
  }

  .ares-seg-track {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(20, 1fr);
    gap: 2px;
    padding: 1px 3px;
  }

  .ares-seg-block {
    height: 9px;
    border-radius: 1px;
    background: rgba(120, 145, 170, 0.22);
  }

  .ares-seg-block.is-filled {
    background: #33d9e6;
    box-shadow: 0 0 5px rgba(51, 217, 230, 0.5);
  }

  .ares-obj-pct {
    text-align: right;
    font-weight: 600;
    color: #f5efe0;
    font-size: 12.5px;
  }

  /* Required Resources Tiles */
  .ares-resources-heading {
    font-size: 13.5px;
    color: #e8decb;
    margin: 10px 0 6px;
  }

  .ares-resources-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ares-res-tile {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px 5px 5px;
    border-radius: 6px;
    background: rgba(34, 48, 62, 0.48);
    border: 1px solid rgba(120, 175, 205, 0.36);
  }

  .ares-res-tile.is-owned {
    background: rgba(26, 68, 64, 0.58);
    border-color: #4ce8c2;
  }

  .ares-res-icon-box {
    width: 34px;
    height: 34px;
    border-radius: 4px;
    background: rgba(16, 24, 34, 0.6);
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .ares-res-icon-box img {
    width: 30px;
    height: 30px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .ares-res-meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-family: "Manrope", "Segoe UI", sans-serif;
  }

  .ares-res-meta small {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9ec8dc;
  }

  .ares-res-meta strong {
    font-size: 11.5px;
    color: #f3efe4;
  }

  /* ── Compact Bottom Action Buttons (Does NOT stretch across whole screen) ─ */
  .ares-cta-area {
    margin-top: auto;
    padding-top: 12px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ares-primary-btn {
    padding: 9px 22px;
    border-radius: 999px;
    border: 1.5px solid #e6fff9;
    background: linear-gradient(90deg, #3bd6c6 0%, #68eab8 55%, #ece56c 100%);
    color: #16202a;
    font-family: "Manrope", "Segoe UI", sans-serif;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.03em;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(67, 222, 200, 0.35);
    transition: transform 0.15s ease, filter 0.15s ease;
  }

  .ares-primary-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.06);
  }

  .ares-primary-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    filter: grayscale(0.5);
  }

  .ares-abort-pill {
    padding: 8px 20px;
    border-radius: 999px;
    border: 1px solid rgba(214, 198, 172, 0.42);
    background: rgba(24, 22, 30, 0.55);
    color: #ece2d0;
    font-family: "Manrope", "Segoe UI", sans-serif;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .ares-abort-pill:hover {
    border-color: #f3e6cc;
    background: rgba(44, 38, 48, 0.75);
  }

  .ares-transition-toast {
    margin-bottom: 8px;
    padding: 7px 12px;
    border-radius: 6px;
    border: 1px solid #43dec8;
    background: rgba(20, 62, 58, 0.65);
    color: #d6fff6;
    font-family: "Manrope", sans-serif;
    font-size: 12px;
    font-weight: 600;
  }
`;

function SegmentedBar({ percent }) {
  const totalBlocks = 20;
  const filledBlocks = Math.round((Math.max(0, Math.min(100, percent)) / 100) * totalBlocks);
  return (
    <div className="ares-seg-bar-wrap">
      <span>[</span>
      <div className="ares-seg-track">
        {Array.from({ length: totalBlocks }, (_, idx) => (
          <span
            key={idx}
            className={`ares-seg-block${idx < filledBlocks ? " is-filled" : ""}`}
          />
        ))}
      </div>
      <span>]</span>
    </div>
  );
}

/**
 * @param {{
 *   isOpen?: boolean;
 *   onClose?: () => void;
 *   activeCharacterId?: number | null;
 *   standalone?: boolean;
 *   onProgressChange?: (next: any) => void;
 * }} props
 */
export default function MissionGuideModal({
  isOpen = true,
  onClose = undefined,
  activeCharacterId = null,
  standalone = false,
  onProgressChange = undefined,
}) {
  const navigate = useNavigate();
  const [missionProgress, setMissionProgress] = useState(() => loadMissionProgress());
  const [mapProgress, setMapProgress] = useState(() => loadSavedProgress());
  const [transitionBanner, setTransitionBanner] = useState(null);
  const [showWireRepair, setShowWireRepair] = useState(false);

  const activeSerial = getActiveSerialMission(missionProgress);
  const defaultSelectedId = activeSerial?.id ?? Number(activeCharacterId || 1);
  const [selectedId, setSelectedId] = useState(defaultSelectedId);

  // Sync selected mission to current active serial mission (1 → 2 → 5)
  useEffect(() => {
    if (!isOpen) return;
    const freshMission = loadMissionProgress();
    const freshMap = loadSavedProgress();
    setMissionProgress(freshMission);
    setMapProgress(freshMap);
    const currentSerial = getActiveSerialMission(freshMission);
    if (currentSerial) {
      setSelectedId(currentSerial.id);
    } else if (activeCharacterId && MISSION_CHARACTERS.some((c) => c.id === Number(activeCharacterId))) {
      setSelectedId(Number(activeCharacterId));
    }
  }, [isOpen, activeCharacterId]);

  if (!isOpen) return null;

  const scannedCharIds = (mapProgress.scannedSlots || [])
    .map((slotIdx) => mapProgress.creatureOrder?.[slotIdx] ?? slotIdx + 1)
    .filter(Boolean);

  const playerPos = mapProgress.player || { x: 2100, y: 1050 };

  // Strict serial timeline check for Missions 1 -> 2 -> 5
  const getMissionStateForChar = (char) => {
    const isUnlocked = isMissionUnlocked(char.id, missionProgress);
    const isScanned =
      isUnlocked &&
      (scannedCharIds.includes(char.id) ||
        missionProgress.defeatedAliens.includes(char.id) ||
        missionProgress.completedMissions.includes(char.id));
    const isDefeated =
      isUnlocked &&
      (missionProgress.defeatedAliens.includes(char.id) ||
        missionProgress.obtainedScraps.includes(char.id) ||
        missionProgress.completedMissions.includes(char.id));
    const hasScrap =
      isUnlocked &&
      (missionProgress.obtainedScraps.includes(char.id) ||
        missionProgress.completedMissions.includes(char.id));
    const isCompleted = missionProgress.completedMissions.includes(char.id);

    const targetPt = hasScrap && !isCompleted ? char.cratePos : char.alienPos;
    const distMeters = Math.max(
      5,
      Math.round(distance(playerPos, targetPt || { x: 1800, y: 950 }) * 3.2)
    );

    let stage = "locked";
    if (isCompleted) stage = "completed";
    else if (hasScrap) stage = "repair";
    else if (isScanned && isUnlocked) stage = "battle";
    else if (isUnlocked) stage = "scan";

    return {
      isUnlocked,
      isScanned,
      isDefeated,
      hasScrap,
      isCompleted,
      distMeters,
      stage,
    };
  };

  // Ensure selectedChar can never point to a locked future mission
  const rawSelectedChar =
    MISSION_CHARACTERS.find((c) => c.id === Number(selectedId)) || MISSION_CHARACTERS[0];
  const selectedChar = getMissionStateForChar(rawSelectedChar).isUnlocked
    ? rawSelectedChar
    : MISSION_CHARACTERS.find((c) => c.id === (activeSerial?.id ?? 1)) || MISSION_CHARACTERS[0];
  const selectedState = getMissionStateForChar(selectedChar);

  const finalizeMissionRepair = (missionId) => {
    const updated = completeMissionTask(missionId);
    const freshMap = loadSavedProgress();
    setMissionProgress(updated);
    setMapProgress(freshMap);
    onProgressChange?.(updated);

    const nextSerial = getActiveSerialMission(updated);
    if (nextSerial) {
      setTransitionBanner(
        `✓ Mission ${selectedChar.missionNumber} Complete! Unlocked Mission ${nextSerial.missionNumber}: ${nextSerial.title}`
      );
      setSelectedId(nextSerial.id);
    } else {
      setTransitionBanner(
        `★ All ${MISSIONS.length} Missions Complete! Historical Reports Recovered.`
      );
    }
  };

  const handlePrimaryAction = () => {
    if (!selectedState.isUnlocked) return;

    if (selectedState.stage === "scan") {
      onClose?.();
      navigate(`/scan?characterId=${selectedChar.id}&slot=${selectedChar.slot}`, {
        state: {
          fromMap: true,
          characterId: selectedChar.id,
          slot: selectedChar.slot,
        },
      });
      return;
    }

    if (selectedState.stage === "battle") {
      markCreatureScanned(selectedChar.slot, selectedChar.id);
      setMapProgress(loadSavedProgress());
      onClose?.();
      navigate(`/battle?characterId=${selectedChar.id}&slot=${selectedChar.slot}`, {
        state: {
          fromMap: true,
          characterId: selectedChar.id,
          slot: selectedChar.slot,
        },
      });
      return;
    }

    if (selectedState.stage === "repair") {
      if (selectedChar.id === 2) {
        // Mission 2 requires connecting the 4 Perseverance Rover wires
        setShowWireRepair(true);
        return;
      }
      finalizeMissionRepair(selectedChar.id);
      return;
    }

    if (selectedState.stage === "completed") {
      const nextSerial = getActiveSerialMission(missionProgress);
      if (nextSerial) {
        setSelectedId(nextSerial.id);
      } else {
        onClose?.();
        if (standalone) navigate("/map");
      }
    }
  };

  const reconPct = selectedState.isDefeated
    ? 100
    : selectedState.isScanned
    ? 60
    : selectedState.isUnlocked
    ? 20
    : 0;
  const scrapPct = selectedState.hasScrap
    ? 100
    : selectedState.isScanned
    ? 45
    : selectedState.isUnlocked
    ? 15
    : 0;
  const readinessPct = selectedState.isCompleted
    ? 100
    : selectedState.hasScrap
    ? 75
    : selectedState.isScanned
    ? 40
    : selectedState.isUnlocked
    ? 25
    : 0;

  const getPrimaryCtaLabel = () => {
    if (!selectedState.isUnlocked) {
      return `Locked (Complete Mission ${selectedChar.prevMissionId} First)`;
    }
    if (selectedState.stage === "scan") {
      return `Scan ${selectedChar.alienTitle} →`;
    }
    if (selectedState.stage === "battle") {
      return `Battle ${selectedChar.alienTitle} →`;
    }
    if (selectedState.stage === "repair") {
      return selectedChar.id === 2
        ? `Fix Perseverance Rover Wires →`
        : `Fix ${selectedChar.targetObject} →`;
    }
    const nextSerial = getActiveSerialMission(missionProgress);
    return nextSerial
      ? `Go to Mission ${nextSerial.missionNumber} →`
      : `All Missions Complete`;
  };

  const getTaskHeaderLine = () => {
    if (selectedState.stage === "scan") {
      return `< Step 1/3: Locate & Scan ${selectedChar.alienTitle} >`;
    }
    if (selectedState.stage === "battle") {
      return `< Step 2/3: Defeat ${selectedChar.alienNumber} for ${selectedChar.scrapName} >`;
    }
    if (selectedState.stage === "repair") {
      return `< Step 3/3: ${selectedChar.taskActionLabel} >`;
    }
    return `< Completed: ${selectedChar.systemEffectLabel} >`;
  };

  return (
    <div
      className="ares-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="S.U.N.A. IV Mission Timeline"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <style>{DIRECTIVE_CSS}</style>

      <div className="ares-window">
        {/* ── Left Vertical Timeline Step Sidebar (Missions 1 → 2 → 5) ─── */}
        <aside className="ares-sidebar" aria-label="Mission timeline progress">
          <div className="ares-pennant" aria-hidden="true">
            !
          </div>

          <div className="ares-nav-tabs">
            {MISSION_CHARACTERS.map((char) => {
              const st = getMissionStateForChar(char);
              const isCurrent = activeSerial?.id === char.id;
              return (
                <div
                  key={char.id}
                  className={`ares-step-dot${isCurrent ? " is-current" : ""}${
                    st.isCompleted ? " is-done" : ""
                  }${!st.isUnlocked ? " is-locked" : ""}`}
                  title={
                    st.isUnlocked
                      ? `Mission ${char.missionNumber}: ${char.missionTitle}`
                      : `Mission ${char.missionNumber} Locked (Complete Mission ${char.prevMissionId} first)`
                  }
                >
                  {st.isCompleted ? "✓" : char.missionNumber}
                </div>
              );
            })}
          </div>

          <div className="ares-sidebar-bottom" title="Completed Missions">
            {missionProgress.completedMissions.length}/{MISSIONS.length}
          </div>
        </aside>

        {/* ── Main Content Area ────────────────────────────────────────── */}
        <div className="ares-main">
          <header className="ares-topbar">
            <span className="ares-status-label">
              <span>❖ Mission Timeline (1 → 2 → 5)</span>
              <small style={{ color: "#8ceeff", fontSize: 12 }}>
                {activeSerial
                  ? `Active: Mission ${activeSerial.missionNumber} (${missionProgress.completedMissions.length}/${MISSIONS.length} Done)`
                  : "All 3 Missions Completed"}
              </small>
            </span>
            <button
              type="button"
              className="ares-close-circle"
              onClick={() => {
                if (onClose) onClose();
                else if (standalone) navigate("/map");
              }}
              aria-label="Close mission screen"
            >
              ✕
            </button>
          </header>

          <div className="ares-columns">
            {/* ── Left Column: Sequential Timeline 1 → 2 → 5 ──────────── */}
            <div className="ares-left-col">
              <div className="ares-directive-header-box">
                <strong>◈ Serial Expedition Timeline</strong>
                <span>Complete Mission 1 → Mission 2 → Mission 5 in order</span>
              </div>

              <div className="ares-timeline-list">
                {MISSION_CHARACTERS.map((char) => {
                  const st = getMissionStateForChar(char);
                  const isSelected = selectedChar.id === char.id;

                  return (
                    <button
                      key={char.id}
                      type="button"
                      disabled={!st.isUnlocked}
                      className={`ares-mission-item${isSelected ? " is-selected" : ""}${
                        !st.isUnlocked ? " is-locked" : ""
                      }`}
                      onClick={() => {
                        if (!st.isUnlocked) return;
                        setTransitionBanner(null);
                        setSelectedId(char.id);
                      }}
                    >
                      <span className="ares-timeline-num">{char.missionNumber}</span>

                      <div className="ares-item-text">
                        <span className="ares-item-title">{char.missionTitle}</span>
                        <span className="ares-item-dist">
                          {st.isCompleted
                            ? `✓ ${char.targetObject} Fixed`
                            : !st.isUnlocked
                            ? `🔒 Locked — Finish Mission ${char.prevMissionId} first`
                            : `${st.distMeters}m · ${
                                st.stage === "repair"
                                  ? `Fix ${char.targetObject}`
                                  : char.alienTitle
                              }`}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="ares-item-badge-active" aria-hidden="true">
                          <span>❯</span>
                        </div>
                      ) : (
                        <div
                          className={`ares-item-badge-pin${
                            st.isCompleted ? " is-done" : ""
                          }`}
                          aria-hidden="true"
                        >
                          {st.isCompleted ? "✓" : !st.isUnlocked ? "🔒" : "◎"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Center Vertical Line ─────────────────────────────────── */}
            <div className="ares-v-divider" aria-hidden="true" />

            {/* ── Right Column: Active Unlocked Mission Details ────────── */}
            <div className="ares-right-col">
              {transitionBanner && (
                <div className="ares-transition-toast" role="status">
                  {transitionBanner}
                </div>
              )}

              <h2 className="ares-detail-title">
                Mission {selectedChar.missionNumber}: {selectedChar.missionTitle}
              </h2>
              <div className="ares-detail-loc">
                <span>📍</span>
                <span>{selectedChar.locationTag}</span>
              </div>

              <div className="ares-ornament-line" aria-hidden="true" />

              <div className="ares-task-angle-header">{getTaskHeaderLine()}</div>

              <p className="ares-story-desc">
                {selectedState.isCompleted
                  ? selectedChar.completionStory
                  : selectedChar.arrivalBriefing}
              </p>

              <ul className="ares-story-sub-list">
                <li>
                  <strong>1. Encounter:</strong> {selectedChar.alienTitle} — {selectedChar.behavior}
                </li>
                <li>
                  <strong>2. Battle &amp; Scrap:</strong> {selectedChar.scrapBattleText}
                </li>
                <li>
                  <strong>3. Repair Task:</strong> {selectedChar.taskDescription}
                </li>
              </ul>

              <div className="ares-ornament-line" aria-hidden="true" />

              <div className="ares-objectives-heading">Mission Objectives:</div>
              <div className="ares-objectives-box">
                <div className="ares-obj-row">
                  <span>Alien Recon &amp; Combat:</span>
                  <SegmentedBar percent={reconPct} />
                  <span className="ares-obj-pct">{reconPct}%</span>
                </div>

                <div className="ares-obj-row">
                  <span>Scrap Salvage:</span>
                  <SegmentedBar percent={scrapPct} />
                  <span className="ares-obj-pct">{scrapPct}%</span>
                </div>

                <div className="ares-obj-row">
                  <span>System Repair:</span>
                  <SegmentedBar percent={readinessPct} />
                  <span className="ares-obj-pct">{readinessPct}%</span>
                </div>
              </div>

              <div className="ares-resources-heading">Mission Target &amp; Parts</div>
              <div className="ares-resources-row">
                {/* Resource Tile 1: Target Alien */}
                <div
                  className={`ares-res-tile${selectedState.isDefeated ? " is-owned" : ""}`}
                >
                  <div className="ares-res-icon-box">
                    <img
                      src={
                        selectedState.isScanned
                          ? selectedChar.character
                          : selectedChar.silhouette
                      }
                      alt={selectedChar.alienTitle}
                    />
                  </div>
                  <div className="ares-res-meta">
                    <small>{selectedState.isDefeated ? "✓ Defeated" : "Alien"}</small>
                    <strong>{selectedChar.name}</strong>
                  </div>
                </div>

                {/* Resource Tile 2: Scrap / Module */}
                <div
                  className={`ares-res-tile${selectedState.hasScrap ? " is-owned" : ""}`}
                >
                  <div className="ares-res-icon-box" style={{ color: "#5ce6d0" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="4" width="12" height="16" rx="2" />
                      <line x1="10" y1="2" x2="14" y2="2" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                    </svg>
                  </div>
                  <div className="ares-res-meta">
                    <small>{selectedState.hasScrap ? "✓ Salvaged" : "Scrap Drop"}</small>
                    <strong>{selectedChar.scrapName}</strong>
                  </div>
                </div>

                {/* Resource Tile 3: Target Crate / System */}
                <div
                  className={`ares-res-tile${selectedState.isCompleted ? " is-owned" : ""}`}
                >
                  <div className="ares-res-icon-box" style={{ color: "#7ad7ff" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                  </div>
                  <div className="ares-res-meta">
                    <small>{selectedState.isCompleted ? "✓ Repaired" : "Crate Target"}</small>
                    <strong>{selectedChar.targetObject}</strong>
                  </div>
                </div>
              </div>

              <div className="ares-cta-area">
                <button
                  type="button"
                  className="ares-abort-pill"
                  onClick={() => {
                    if (onClose) onClose();
                    else if (standalone) navigate("/map");
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="ares-primary-btn"
                  disabled={!selectedState.isUnlocked}
                  onClick={handlePrimaryAction}
                >
                  {getPrimaryCtaLabel()}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WireRepairModal
        isOpen={showWireRepair}
        onClose={() => setShowWireRepair(false)}
        onComplete={() => {
          setShowWireRepair(false);
          finalizeMissionRepair(2);
        }}
      />
    </div>
  );
}
