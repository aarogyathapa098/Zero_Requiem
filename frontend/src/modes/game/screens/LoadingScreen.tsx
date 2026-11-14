import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoUrl from "../../../assets/zero-requiem-logo.png";
import "./LoadingScreen.css";

const STATUS_STEPS = [
  "Calibrating navigation array",
  "Synchronising orbital telemetry",
  "Aligning S.U.N.A. IV uplink",
  "Preparing surface insertion",
];

/**
 * Placeholder loading screen.
 *
 * TODO: replace the simulated progress with real asset/scene loading and then
 * transition to the game scene (e.g. `navigate("/game", { replace: true })`).
 */
export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (progress >= 100) return;
    const timer = window.setTimeout(() => {
      setProgress((current) => Math.min(100, current + 3 + Math.random() * 8));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [progress]);

  const complete = progress >= 100;
  const stepIndex = Math.min(
    STATUS_STEPS.length - 1,
    Math.floor((progress / 100) * STATUS_STEPS.length),
  );

  return (
    <div className="loading-screen">
      <div className="loading-sky" aria-hidden="true" />
      <div className="loading-grain" aria-hidden="true" />

      <main className="loading-panel">
        <img className="loading-logo" src={logoUrl} alt="Project: Zero Requiem" />

        <p className="loading-status" role="status" aria-live="polite">
          {complete ? "Uplink established" : STATUS_STEPS[stepIndex]}
          {!complete && <span className="loading-ellipsis" aria-hidden="true" />}
        </p>

        <div
          className="loading-track"
          role="progressbar"
          aria-label="Loading"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div className="loading-fill" style={{ width: `${progress}%` }} />
        </div>

        <span className="loading-percent">{Math.round(progress)}%</span>
      </main>

      <Link className="loading-back" to="/">
        Return to menu
      </Link>
    </div>
  );
}
