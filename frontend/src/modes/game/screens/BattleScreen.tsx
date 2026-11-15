import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import backgroundImg from "../assets/images/background.jpg";
import characterImg from "../assets/images/companion_back.png";
import MissionGuideModal from "../components/MissionGuideModal.jsx";
import { getCharacterById } from "../data/characters.js";
import {
  completeMissionTask,
  getActiveSerialMission,
  isMissionUnlocked,
  loadMissionProgress,
  MISSIONS,
  recordAlienDefeated,
} from "../data/missions.js";
import { loadSavedProgress } from "../../map/game/marsModel.js";
import "./BattleScreen.css";

interface Move {
  name: string;
  type: "SOUND" | "NORMAL";
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  description: string;
}

const MOVES: Move[] = [
  {
    name: "SONIC BEAM",
    type: "SOUND",
    power: 85,
    accuracy: 100,
    pp: 15,
    maxPp: 15,
    description: "Fires a concentrated frequency laser that pierces defenses.",
  },
  {
    name: "RESONANCE WAVE",
    type: "SOUND",
    power: 65,
    accuracy: 100,
    pp: 20,
    maxPp: 20,
    description: "Vibrates the battlefield with harmonic sound waves.",
  },
  {
    name: "HYPER VOICE",
    type: "SOUND",
    power: 90,
    accuracy: 95,
    pp: 10,
    maxPp: 10,
    description: "A loud ultrasonic shout that rattles the target.",
  },
  {
    name: "SCREECH",
    type: "NORMAL",
    power: 0,
    accuracy: 90,
    pp: 30,
    maxPp: 30,
    description: "Emits a harsh screech that sharply lowers enemy defense.",
  },
];

class BattleAudioEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playTone(
    freq: number,
    type: OscillatorType = "square",
    duration = 0.15,
    gainStart = 0.15,
    gainEnd = 0.01
  ) {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainStart, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  playSonicBeam() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.6);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 0.5);
      filter.Q.value = 5;

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch {
      // Audio fallback
    }
  }

  playHit() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.1);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.sin(i * 12.9898) * 43758.5453) % 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start();

      this.playTone(110, "square", 0.18, 0.3, 0.01);
    } catch {
      // Audio fallback
    }
  }

  playSelect() {
    this.playTone(660, "square", 0.08, 0.1, 0.01);
  }

  playRepair() {
    if (this.muted) return;
    this.playTone(523.25, "triangle", 0.12, 0.18, 0.01);
    setTimeout(() => this.playTone(659.25, "triangle", 0.12, 0.18, 0.01), 110);
    setTimeout(() => this.playTone(783.99, "triangle", 0.16, 0.2, 0.01), 220);
    setTimeout(() => this.playTone(1046.5, "sine", 0.28, 0.22, 0.01), 340);
  }

  playRun() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio fallback
    }
  }
}

const audio = new BattleAudioEngine();

export default function BattleScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Resolve the scanned enemy creature (fighting is allowed after scanning only)
  const routeState = (location.state as { characterId?: number; slot?: number } | null) ?? null;
  const paramCharId = searchParams.get("characterId") ?? routeState?.characterId ?? null;
  const paramSlot = searchParams.get("slot") ?? routeState?.slot ?? null;

  const savedProgress = loadSavedProgress();
  const scannedSlots: number[] = Array.isArray(savedProgress?.scannedSlots)
    ? savedProgress.scannedSlots
    : [];
  const creatureOrder: number[] = Array.isArray(savedProgress?.creatureOrder)
    ? savedProgress.creatureOrder
    : [];
  const scannedCharIds = scannedSlots
    .map((slotIdx) => creatureOrder[slotIdx])
    .filter(Boolean);

  // Mission & UI state
  const [missionProgress, setMissionProgress] = useState(() => loadMissionProgress());
  const [showMissionGuide, setShowMissionGuide] = useState(false);

  const activeSerial = getActiveSerialMission(missionProgress);
  const maxUnlockedId = activeSerial ? activeSerial.id : 5;
  const rawEnemyId =
    paramCharId !== null
      ? Number(paramCharId)
      : scannedCharIds[scannedCharIds.length - 1] ?? null;

  const isRequestedUnlocked =
    rawEnemyId !== null && isMissionUnlocked(rawEnemyId, missionProgress);
  const resolvedEnemyId = isRequestedUnlocked ? rawEnemyId : maxUnlockedId;

  const isTargetScanned =
    resolvedEnemyId !== null &&
    (scannedCharIds.includes(resolvedEnemyId) ||
      (paramSlot !== null &&
        isRequestedUnlocked &&
        scannedSlots.includes(Number(paramSlot))));

  const enemyCreature = getCharacterById(resolvedEnemyId ?? 1);
  const enemyName = enemyCreature.name;
  const enemySprite = enemyCreature.character;
  const maxEnemyHp = enemyCreature.enemyMaxHp || 85;

  // Enforce fighting only after scanning the respective unlocked creature
  useEffect(() => {
    if (!isTargetScanned) {
      if (resolvedEnemyId !== null) {
        const query = new URLSearchParams();
        query.set("characterId", String(resolvedEnemyId));
        query.set("slot", String(resolvedEnemyId - 1));
        navigate(`/scan?${query.toString()}`, { replace: true });
      } else {
        navigate("/map", { replace: true });
      }
    }
  }, [isTargetScanned, navigate, resolvedEnemyId]);

  // Audio state
  const [muted, setMuted] = useState(false);

  // Combatant stats
  const [enemyHp, setEnemyHp] = useState(maxEnemyHp);
  const [playerHp, setPlayerHp] = useState(88);
  const maxPlayerHp = 88;
  const [playerExp, setPlayerExp] = useState(45);

  // Battle state machine
  const [phase, setPhase] = useState<
    | "intro"
    | "idle"
    | "moves"
    | "player_attacking"
    | "enemy_turn"
    | "fainted_enemy"
    | "fainted_player"
    | "ran"
  >("intro");

  const [dialogue, setDialogue] = useState(
    `Mission ${enemyCreature.missionNumber}: ${enemyCreature.alienTitle} appeared!`
  );
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);

  // Animation triggers
  const [hasEntered, setHasEntered] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isPlayerCharging, setIsPlayerCharging] = useState(false);
  const [isSonicBeamActive, setIsSonicBeamActive] = useState(false);
  const [isEnemyHit, setIsEnemyHit] = useState(false);
  const [isEnemyLunging, setIsEnemyLunging] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [isEnemyFainted, setIsEnemyFainted] = useState(false);
  const [isPlayerFainted, setIsPlayerFainted] = useState(false);

  // Reset stats if user switches to a different alien via Mission Guide
  useEffect(() => {
    setEnemyHp(enemyCreature.enemyMaxHp || 85);
    setPlayerHp(maxPlayerHp);
    setIsEnemyFainted(false);
    setIsPlayerFainted(false);
    setPhase("intro");
    setDialogue(
      `Mission ${enemyCreature.missionNumber}: ${enemyCreature.alienTitle} — ${enemyCreature.behavior}`
    );

    audio.playTone(440, "triangle", 0.2, 0.15, 0.01);
    const enterTimer = setTimeout(() => {
      setHasEntered(true);
      setDialogue(`Defeat ${enemyCreature.alienNumber} to obtain ${enemyCreature.scrapName}!`);
      const readyTimer = setTimeout(() => {
        setDialogue("What will ECHOSONIC do?");
        setPhase("idle");
      }, 1200);
      return () => clearTimeout(readyTimer);
    }, 1100);

    return () => clearTimeout(enterTimer);
  }, [
    enemyCreature.id,
    enemyCreature.alienNumber,
    enemyCreature.alienTitle,
    enemyCreature.behavior,
    enemyCreature.enemyMaxHp,
    enemyCreature.missionNumber,
    enemyCreature.scrapName,
  ]);

  const toggleMute = () => {
    audio.muted = !muted;
    setMuted(!muted);
  };

  // Handle Fight Click
  const handleOpenFight = () => {
    audio.playSelect();
    setPhase("moves");
    setSelectedMoveIndex(0);
  };

  // Execute Move (e.g. Sonic Beam)
  const handleExecuteMove = (moveIndex: number) => {
    const move = MOVES[moveIndex];
    if (phase !== "moves" || move.pp <= 0) return;

    audio.playSelect();
    setPhase("player_attacking");
    setDialogue(`ECHOSONIC used ${move.name}!`);

    // Move animation sequence
    setIsPlayerCharging(true);

    if (move.name === "SONIC BEAM") {
      audio.playSonicBeam();
      setIsSonicBeamActive(true);
    } else {
      audio.playTone(520, "sawtooth", 0.4, 0.2, 0.01);
    }

    setTimeout(() => {
      // Impact moment
      setIsPlayerCharging(false);
      setIsSonicBeamActive(false);
      setIsShaking(true);
      setIsEnemyHit(true);
      audio.playHit();

      setTimeout(() => {
        setIsShaking(false);
        setIsEnemyHit(false);

        // Calculate damage
        const damage = Math.round(move.power * 0.52 + (Date.now() % 8));
        const newEnemyHp = Math.max(0, enemyHp - damage);
        setEnemyHp(newEnemyHp);

        if (newEnemyHp <= 0) {
          // Enemy Faints! Record Scrap drop for this Mission!
          setTimeout(() => {
            setIsEnemyFainted(true);
            const updatedMissions = recordAlienDefeated(enemyCreature.id);
            setMissionProgress(updatedMissions);
            setDialogue(
              `${enemyCreature.alienTitle} defeated! Obtained ${enemyCreature.scrapName}!`
            );
            audio.playTone(280, "triangle", 0.4, 0.2, 0.01);

            setTimeout(() => {
              setPlayerExp((exp) => Math.min(100, exp + 45));
              setDialogue(
                `Recovered ${enemyCreature.scrapName}! Ready to repair ${enemyCreature.targetObject}.`
              );
              setPhase("fainted_enemy");
            }, 1200);
          }, 600);
        } else {
          // Enemy Retaliation Turn
          setTimeout(() => {
            const enemyMove = enemyCreature.enemySignatureMove || "VOID PULSE";
            setDialogue(`${enemyCreature.alienTitle} used ${enemyMove}!`);
            setIsEnemyLunging(true);
            audio.playTone(320, "sawtooth", 0.35, 0.2, 0.01);

            setTimeout(() => {
              setIsEnemyLunging(false);
              setIsShaking(true);
              setIsPlayerHit(true);
              audio.playHit();

              const enemyDmg = Math.round(16 + (Date.now() % 8));
              const newPlayerHp = Math.max(0, playerHp - enemyDmg);
              setPlayerHp(newPlayerHp);

              setTimeout(() => {
                setIsShaking(false);
                setIsPlayerHit(false);

                if (newPlayerHp <= 0) {
                  setIsPlayerFainted(true);
                  setDialogue("ECHOSONIC fainted! Emergency suit recall triggered...");
                  setPhase("fainted_player");
                } else {
                  setDialogue("What will ECHOSONIC do?");
                  setPhase("idle");
                }
              }, 600);
            }, 500);
          }, 1200);
        }
      }, 500);
    }, 850);
  };

  // Handle Run
  const handleRun = () => {
    audio.playRun();
    setDialogue("Got away safely!");
    setPhase("ran");
  };

  const handleResetBattle = () => {
    setEnemyHp(maxEnemyHp);
    setPlayerHp(maxPlayerHp);
    setIsEnemyFainted(false);
    setIsPlayerFainted(false);
    setDialogue("What will ECHOSONIC do?");
    setPhase("idle");
  };

  // Handle using the dropped Scrap to repair the Mission Crate (or return to Rover for Mission 2 wire repair)
  const handleExecuteMissionRepair = () => {
    audio.playRepair();
    if (enemyCreature.id === 2) {
      navigate("/map");
      return;
    }
    const updated = completeMissionTask(enemyCreature.id);
    setMissionProgress(updated);
    setDialogue(
      `Mission ${enemyCreature.missionNumber} Complete! ${enemyCreature.targetObject} repaired!`
    );
  };

  // HP Color utility
  const getHpColorClass = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio > 0.5) return "hp-green";
    if (ratio > 0.2) return "hp-yellow";
    return "hp-red";
  };

  const selectedMove = MOVES[selectedMoveIndex];
  const isCurrentMissionRepaired = missionProgress.completedMissions.includes(enemyCreature.id);

  return (
    <div className="battle-viewport">
      <div className={`battle-screen ${isShaking ? "is-shaking" : ""}`}>
        {/* Intro Transition Overlay */}
        <div className="battle-intro-overlay" aria-hidden="true" />

        {/* Mission Banner Pill (Top Left) */}
        <div className="battle-mission-banner">
          <span className="battle-mission-tag">
            {enemyCreature.isMission
              ? `MISSION ${enemyCreature.missionNumber}: ${enemyCreature.missionTitle.toUpperCase()}`
              : `WILD ENCOUNTER: ${enemyCreature.name.toUpperCase()}`}
          </span>
          <span className="battle-mission-sub">
            {enemyCreature.isMission
              ? `Scrap Target: ${enemyCreature.scrapName} → Fix ${enemyCreature.targetObject}`
              : enemyCreature.behavior}
          </span>
        </div>

        {/* Top Utility Controls */}
        <div className="battle-top-bar">
          <button
            type="button"
            className="top-bar-btn is-mission-btn"
            onClick={() => setShowMissionGuide(true)}
          >
            ❖ MISSIONS ({missionProgress.completedMissions.length}/{MISSIONS.length})
          </button>
          <button
            type="button"
            className="top-bar-btn"
            onClick={toggleMute}
          >
            {muted ? "AUDIO: OFF" : "AUDIO: ON"}
          </button>
          <button
            type="button"
            className="top-bar-btn"
            onClick={() => navigate("/map")}
          >
            ← MARS MAP
          </button>
        </div>

        {/* ── Main Battlefield Arena ───────────────────────────────────── */}
        <div className="battle-arena">
          <img
            src={backgroundImg}
            alt="Battle Arena"
            className="battle-bg-image"
          />
          <div className="battle-vignette" />
          <div className="battle-scanlines" />

          {/* Enemy Pedestal & Sprite (Right Enemy matches scanned creature) */}
          <div className="battle-pedestal-enemy" />
          <div
            className={`combatant-enemy ${hasEntered ? "has-entered" : ""} ${isEnemyHit ? "is-hit" : ""
              } ${isEnemyLunging ? "is-lunging" : ""} ${isEnemyFainted ? "is-fainted" : ""
              }`}
          >
            <img
              src={enemySprite}
              alt={enemyCreature.alienTitle}
              className="pokemon-sprite-enemy"
            />
          </div>

          {/* Player Pedestal & Sprite (Left Companion always permanent) */}
          <div className="battle-pedestal-player" />
          <div
            className={`combatant-player ${hasEntered ? "has-entered" : ""} ${isPlayerCharging ? "is-charging" : ""
              } ${isPlayerHit ? "is-hit" : ""} ${isPlayerFainted ? "is-fainted" : ""
              }`}
          >
            <img
              src={characterImg}
              alt="Echosonic"
              className="pokemon-sprite-player"
            />
          </div>

          {/* Sonic Beam Shockwave FX */}
          {isSonicBeamActive && (
            <div className="sonic-fx-container" aria-hidden="true">
              <div className="sonic-beam-line" />
              <div className="sonic-wave-ring sonic-ring-1" />
              <div className="sonic-wave-ring sonic-ring-2" />
              <div className="sonic-wave-ring sonic-ring-3" />
              <div className="sonic-wave-ring sonic-ring-4" />
            </div>
          )}

          {/* ── Enemy Status HUD (FireRed Style) ────────────────────────── */}
          <div className="hud-card-enemy">
            <div className="hud-top-row">
              <span className="hud-name">{enemyName}</span>
              <span className="hud-level">
                <span className="hud-level-prefix">:L</span>
                {enemyCreature.enemyLevel || 25}
              </span>
            </div>
            <div className="hud-hp-row">
              <span className="hud-hp-label">HP</span>
              <div className="hud-hp-bar-track">
                <div
                  className={`hud-hp-bar-fill ${getHpColorClass(enemyHp, maxEnemyHp)}`}
                  style={{ width: `${(enemyHp / maxEnemyHp) * 100}%` }}
                />
              </div>
            </div>
            <div className="hud-scrap-caption">
              {enemyCreature.alienNumber} · Holds: {enemyCreature.scrapName}
            </div>
          </div>

          {/* ── Player Status HUD (FireRed Style) ────────────────────────── */}
          <div className="hud-card-player">
            <div className="hud-top-row">
              <span className="hud-name">ECHOSONIC</span>
              <span className="hud-level">
                <span className="hud-level-prefix">:L</span>28
              </span>
            </div>
            <div className="hud-hp-row">
              <span className="hud-hp-label">HP</span>
              <div className="hud-hp-bar-track">
                <div
                  className={`hud-hp-bar-fill ${getHpColorClass(playerHp, maxPlayerHp)}`}
                  style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}
                />
              </div>
            </div>
            <div className="hud-hp-numbers">
              {playerHp}/ {maxPlayerHp}
            </div>
            <div className="hud-exp-row">
              <span className="hud-exp-label">EXP</span>
              <div className="hud-exp-track">
                <div
                  className="hud-exp-fill"
                  style={{ width: `${playerExp}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Controls Console (FireRed Dialog & Menu) ───────────── */}
        <div className="battle-console">
          {/* Left: Dialogue Box */}
          <div className="battle-dialogue-pane">
            <div className="battle-dialogue-text">{dialogue}</div>
            <div className="dialogue-arrow">▼</div>
          </div>

          {/* Right: Menu Pane */}
          <div className="battle-menu-pane">
            {phase === "moves" ? (
              /* Moves Submenu */
              <>
                <div className="moves-grid">
                  {MOVES.map((move, idx) => (
                    <button
                      key={move.name}
                      type="button"
                      className={`move-btn ${selectedMoveIndex === idx ? "is-active" : ""
                        }`}
                      onMouseEnter={() => setSelectedMoveIndex(idx)}
                      onClick={() => handleExecuteMove(idx)}
                    >
                      <span className="move-cursor">▶</span>
                      <span className="move-name">{move.name}</span>
                    </button>
                  ))}
                </div>
                <div className="move-info-box">
                  <div className="move-info-type">
                    <span>TYPE/</span>
                    <span
                      className={
                        selectedMove.type === "SOUND"
                          ? "type-pill-sound"
                          : "type-pill-normal"
                      }
                    >
                      {selectedMove.type}
                    </span>
                  </div>
                  <div className="move-info-pp">
                    <span>PP</span>
                    <span>
                      {selectedMove.pp}/{selectedMove.maxPp}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-move-cancel"
                    onClick={() => {
                      audio.playSelect();
                      setPhase("idle");
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </>
            ) : (
              /* Mars-graded Command Box: FIGHT and RUN */
              <div className="command-grid">
                <button
                  type="button"
                  className="command-btn btn-fight"
                  disabled={phase !== "idle"}
                  onClick={handleOpenFight}
                >
                  FIGHT
                </button>
                <button
                  type="button"
                  className="command-btn btn-run"
                  disabled={phase !== "idle"}
                  onClick={handleRun}
                >
                  RUN
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Victory / Scrap Drop / Task Repair Overlay ──────────────── */}
        {phase === "fainted_enemy" && (
          <div className="battle-end-overlay">
            <h2 className="battle-end-title">
              {enemyCreature.isMission
                ? `★ MISSION ${enemyCreature.missionNumber}: ${enemyCreature.missionTitle.toUpperCase()} ★`
                : `★ WILD ${enemyCreature.name.toUpperCase()} DEFEATED ★`}
            </h2>

            <div className="battle-mission-reward-card">
              <div className="battle-reward-row">
                <span className="battle-reward-label">THE ALIEN DEFEATED:</span>
                <strong>{enemyCreature.alienTitle}</strong>
                <small>{enemyCreature.behavior}</small>
              </div>

              <div className="battle-reward-row is-scrap-drop">
                <span className="battle-reward-label">SCRAP OBTAINED:</span>
                <strong>⚙ {enemyCreature.scrapName}</strong>
                <small>{enemyCreature.scrapOrigin}</small>
              </div>

              {enemyCreature.isMission && (
                <>
                  <div className="battle-reward-row">
                    <span className="battle-reward-label">MISSION TASK:</span>
                    <p className="battle-task-text">{enemyCreature.taskDescription}</p>
                  </div>

                  {!isCurrentMissionRepaired ? (
                    <button
                      type="button"
                      className="battle-repair-cta"
                      onClick={handleExecuteMissionRepair}
                    >
                      {enemyCreature.id === 2
                        ? "🔧 RETURN TO PERSEVERANCE ROVER ON MAP & FIX WIRES →"
                        : `🔧 USE ${enemyCreature.scrapName.toUpperCase()} → ${enemyCreature.taskActionLabel.toUpperCase()}`}
                    </button>
                  ) : (
                    <div className="battle-repaired-badge" role="status">
                      ✓ {enemyCreature.targetObject.toUpperCase()} REPAIRED!
                      <span>{enemyCreature.systemEffectLabel}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="battle-end-actions">
              <button
                type="button"
                className="battle-end-btn"
                onClick={() => navigate("/map")}
              >
                {!enemyCreature.isMission
                  ? "← RETURN TO MARS MAP"
                  : isCurrentMissionRepaired
                    ? enemyCreature.missionNumber < 5
                      ? `▶ PROCEED TO NEXT MISSION ON MAP →`
                      : "★ RETURN TO MARS SURFACE (ALL MISSIONS COMPLETE)"
                    : `← RETURN TO MAP & FIX ${enemyCreature.targetObject.toUpperCase()}`}
              </button>
              <button
                type="button"
                className="battle-end-btn"
                onClick={() => setShowMissionGuide(true)}
              >
                ❖ DIRECTIVES ({missionProgress.completedMissions.length}/{MISSIONS.length})
              </button>
            </div>
          </div>
        )}

        {phase === "fainted_player" && (
          <div className="battle-end-overlay">
            <h2 className="battle-end-title" style={{ color: "#ff4444" }}>
              DEFEATED
            </h2>
            <p>
              ECHOSONIC fainted against {enemyCreature.alienTitle}! Your sound waves faded...
            </p>
            <div className="battle-end-actions">
              <button
                type="button"
                className="battle-end-btn"
                onClick={handleResetBattle}
              >
                TRY AGAIN
              </button>
              <button
                type="button"
                className="battle-end-btn"
                onClick={() => setShowMissionGuide(true)}
              >
                📋 MISSION GUIDE
              </button>
              <button
                type="button"
                className="battle-end-btn"
                onClick={() => navigate("/map")}
              >
                RETURN TO MAP
              </button>
            </div>
          </div>
        )}

        {phase === "ran" && (
          <div className="battle-end-overlay">
            <h2 className="battle-end-title" style={{ color: "#ffd89a" }}>
              ESCAPED
            </h2>
            <p>You safely retreated from the {enemyCreature.alienTitle} encounter.</p>
            <div className="battle-end-actions">
              <button
                type="button"
                className="battle-end-btn"
                onClick={handleResetBattle}
              >
                BATTLE AGAIN
              </button>
              <button
                type="button"
                className="battle-end-btn"
                onClick={() => setShowMissionGuide(true)}
              >
                📋 MISSION GUIDE
              </button>
              <button
                type="button"
                className="battle-end-btn"
                onClick={() => navigate("/map")}
              >
                RETURN TO MAP
              </button>
            </div>
          </div>
        )}
      </div>

      <MissionGuideModal
        isOpen={showMissionGuide}
        onClose={() => setShowMissionGuide(false)}
        activeCharacterId={enemyCreature.id}
        onProgressChange={(next) => setMissionProgress(next)}
      />
    </div>
  );
}
