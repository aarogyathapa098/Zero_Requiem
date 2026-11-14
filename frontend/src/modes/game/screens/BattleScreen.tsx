import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import backgroundImg from "../assets/images/background.jpg";
import characterImg from "../assets/images/character.png";
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

export default function BattleScreen() {
  const navigate = useNavigate();

  // Audio state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  // Combatant stats
  const [enemyHp, setEnemyHp] = useState(85);
  const maxEnemyHp = 85;
  const [playerHp, setPlayerHp] = useState(78);
  const maxPlayerHp = 78;
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
    | "message"
  >("intro");

  const [dialogue, setDialogue] = useState("A wild CHRONOS appeared!");
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

  // Audio Helper using Web Audio API
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playTone = (
    freq: number,
    type: OscillatorType = "square",
    duration = 0.15,
    gainStart = 0.15,
    gainEnd = 0.01
  ) => {
    if (muted) return;
    const ctx = getAudioContext();
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
  };

  const playSonicBeamSound = () => {
    if (muted) return;
    const ctx = getAudioContext();
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
      // Ignore audio error
    }
  };

  const playHitSound = () => {
    if (muted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      // Noise burst + low square drop
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start();

      playTone(110, "square", 0.18, 0.3, 0.01);
    } catch {
      // Ignore audio error
    }
  };

  const playSelectSound = () => playTone(660, "square", 0.08, 0.1, 0.01);

  const playRunSound = () => {
    if (muted) return;
    const ctx = getAudioContext();
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
      // Ignore audio error
    }
  };

  // Initial Entrance Sequence
  useEffect(() => {
    playTone(440, "triangle", 0.2, 0.15, 0.01);
    const enterTimer = setTimeout(() => {
      setHasEntered(true);
      setDialogue("Go, ECHOSONIC!");
      const readyTimer = setTimeout(() => {
        setDialogue("What will ECHOSONIC do?");
        setPhase("idle");
      }, 1200);
      return () => clearTimeout(readyTimer);
    }, 1100);

    return () => clearTimeout(enterTimer);
  }, []);

  // Handle Fight Click
  const handleOpenFight = () => {
    playSelectSound();
    setPhase("moves");
    setSelectedMoveIndex(0);
  };

  // Execute Move (e.g. Sonic Beam)
  const handleExecuteMove = (moveIndex: number) => {
    const move = MOVES[moveIndex];
    if (phase !== "moves" || move.pp <= 0) return;

    playSelectSound();
    setPhase("player_attacking");
    setDialogue(`ECHOSONIC used ${move.name}!`);

    // Move animation sequence
    setIsPlayerCharging(true);

    if (move.name === "SONIC BEAM") {
      playSonicBeamSound();
      setIsSonicBeamActive(true);
    } else {
      playTone(520, "sawtooth", 0.4, 0.2, 0.01);
    }

    setTimeout(() => {
      // Impact moment
      setIsPlayerCharging(false);
      setIsSonicBeamActive(false);
      setIsShaking(true);
      setIsEnemyHit(true);
      playHitSound();

      setTimeout(() => {
        setIsShaking(false);
        setIsEnemyHit(false);

        // Calculate damage
        const damage = Math.round(move.power * 0.45 + (Math.random() * 8));
        const newEnemyHp = Math.max(0, enemyHp - damage);
        setEnemyHp(newEnemyHp);

        if (newEnemyHp <= 0) {
          // Enemy Faints!
          setTimeout(() => {
            setIsEnemyFainted(true);
            setDialogue("Wild CHRONOS fainted!");
            playTone(280, "triangle", 0.4, 0.2, 0.01);

            setTimeout(() => {
              setPlayerExp((exp) => Math.min(100, exp + 45));
              setDialogue("ECHOSONIC gained 240 EXP. Points!");
              setPhase("fainted_enemy");
            }, 1200);
          }, 600);
        } else {
          // Enemy Retaliation Turn
          setTimeout(() => {
            setDialogue("Wild CHRONOS used VOID PULSE!");
            setIsEnemyLunging(true);
            playTone(320, "sawtooth", 0.35, 0.2, 0.01);

            setTimeout(() => {
              setIsEnemyLunging(false);
              setIsShaking(true);
              setIsPlayerHit(true);
              playHitSound();

              const enemyDmg = Math.round(18 + Math.random() * 12);
              const newPlayerHp = Math.max(0, playerHp - enemyDmg);
              setPlayerHp(newPlayerHp);

              setTimeout(() => {
                setIsShaking(false);
                setIsPlayerHit(false);

                if (newPlayerHp <= 0) {
                  setIsPlayerFainted(true);
                  setDialogue("ECHOSONIC fainted! Blacked out...");
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
    playRunSound();
    setDialogue("Got away safely!");
    setPhase("ran");
  };

  // Handle Bag & Pokemon (Classic retro dialog messages)
  const handleBag = () => {
    playSelectSound();
    setDialogue("You opened the BAG. No battle items left in inventory!");
    setPhase("message");
  };

  const handlePokemon = () => {
    playSelectSound();
    setDialogue("ECHOSONIC is currently your only sound-type combatant!");
    setPhase("message");
  };

  const handleDismissMessage = () => {
    setDialogue("What will ECHOSONIC do?");
    setPhase("idle");
  };

  const handleResetBattle = () => {
    setEnemyHp(maxEnemyHp);
    setPlayerHp(maxPlayerHp);
    setIsEnemyFainted(false);
    setIsPlayerFainted(false);
    setDialogue("What will ECHOSONIC do?");
    setPhase("idle");
  };

  // HP Color utility
  const getHpColorClass = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio > 0.5) return "hp-green";
    if (ratio > 0.2) return "hp-yellow";
    return "hp-red";
  };

  const selectedMove = MOVES[selectedMoveIndex];

  return (
    <div className="battle-viewport">
      <div className={`battle-screen ${isShaking ? "is-shaking" : ""}`}>
        {/* Intro Transition Overlay */}
        <div className="battle-intro-overlay" aria-hidden="true" />

        {/* Top Utility Controls */}
        <div className="battle-top-bar">
          <button
            type="button"
            className="top-bar-btn"
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? "AUDIO: OFF" : "AUDIO: ON"}
          </button>
          <button
            type="button"
            className="top-bar-btn"
            onClick={() => navigate("/")}
          >
            MENU
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

          {/* Enemy Pedestal & Sprite */}
          <div className="battle-pedestal-enemy" />
          <div
            className={`combatant-enemy ${hasEntered ? "has-entered" : ""} ${
              isEnemyHit ? "is-hit" : ""
            } ${isEnemyLunging ? "is-lunging" : ""} ${
              isEnemyFainted ? "is-fainted" : ""
            }`}
          >
            <img
              src={characterImg}
              alt="Wild Chronos"
              className="pokemon-sprite-enemy"
            />
          </div>

          {/* Player Pedestal & Sprite */}
          <div className="battle-pedestal-player" />
          <div
            className={`combatant-player ${hasEntered ? "has-entered" : ""} ${
              isPlayerCharging ? "is-charging" : ""
            } ${isPlayerHit ? "is-hit" : ""} ${
              isPlayerFainted ? "is-fainted" : ""
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
              <span className="hud-name">CHRONOS</span>
              <span className="hud-level">
                <span className="hud-level-prefix">:L</span>25
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
          <div
            className="battle-dialogue-pane"
            onClick={phase === "message" ? handleDismissMessage : undefined}
          >
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
                      className={`move-btn ${
                        selectedMoveIndex === idx ? "is-active" : ""
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
                      playSelectSound();
                      setPhase("idle");
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </>
            ) : (
              /* 2x2 FireRed Command Box */
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
                  className="command-btn btn-bag"
                  disabled={phase !== "idle"}
                  onClick={handleBag}
                >
                  BAG
                </button>
                <button
                  type="button"
                  className="command-btn btn-pokemon"
                  disabled={phase !== "idle"}
                  onClick={handlePokemon}
                >
                  POKéMON
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

        {/* ── Victory / Defeat / Escape Overlays ──────────────────────── */}
        {phase === "fainted_enemy" && (
          <div className="battle-end-overlay">
            <h2 className="battle-end-title">★ VICTORY! ★</h2>
            <p>Wild CHRONOS was defeated by your SONIC RESONANCE!</p>
            <div className="battle-end-actions">
              <button
                type="button"
                className="battle-end-btn"
                onClick={handleResetBattle}
              >
                REMATCH
              </button>
              <button
                type="button"
                className="battle-end-btn"
                onClick={() => navigate("/")}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}

        {phase === "fainted_player" && (
          <div className="battle-end-overlay">
            <h2 className="battle-end-title" style={{ color: "#ff4444" }}>
              DEFEATED
            </h2>
            <p>ECHOSONIC fainted! Your sound waves faded...</p>
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
                onClick={() => navigate("/")}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}

        {phase === "ran" && (
          <div className="battle-end-overlay">
            <h2 className="battle-end-title" style={{ color: "#60a5fa" }}>
              ESCAPED
            </h2>
            <p>You safely retreated from the encounter.</p>
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
                onClick={() => navigate("/")}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
