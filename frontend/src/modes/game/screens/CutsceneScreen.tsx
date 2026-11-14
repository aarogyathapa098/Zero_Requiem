import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CutsceneScreen.css";

const INTRO_VIDEO_SRC = `${import.meta.env.BASE_URL}videos/intro-video.mp4`;

export default function CutsceneScreen() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);

  const [needsGesture, setNeedsGesture] = useState(false);
  const [failed, setFailed] = useState(false);

  const goToLoading = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    videoRef.current?.pause();
    navigate("/loading", { replace: true });
  }, [navigate]);

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    setNeedsGesture(false);
    void video.play().catch(() => setNeedsGesture(true));
  };

  // Autoplay can be blocked; fall back to an explicit "begin" prompt.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      if (!leavingRef.current) setNeedsGesture(true);
    });
  }, []);

  // Escape skips the intro, same as the button.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") goToLoading();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToLoading]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar || !video.duration) return;
    bar.style.transform = `scaleX(${video.currentTime / video.duration})`;
  };

  return (
    <div className="cutscene-screen">
      <video
        ref={videoRef}
        className="cutscene-video"
        src={INTRO_VIDEO_SRC}
        autoPlay
        playsInline
        preload="auto"
        onEnded={goToLoading}
        onTimeUpdate={handleTimeUpdate}
        onError={() => setFailed(true)}
      />

      {needsGesture && !failed && (
        <button
          type="button"
          className="cutscene-attract"
          onClick={startPlayback}
        >
          <span>Begin transmission</span>
        </button>
      )}

      {failed && (
        <div className="cutscene-error" role="alert">
          <p>The intro transmission could not be played.</p>
          <button type="button" onClick={goToLoading}>
            Continue
          </button>
        </div>
      )}

      <button type="button" className="cutscene-skip" onClick={goToLoading}>
        Skip
        <span aria-hidden="true">&#8250;&#8250;</span>
      </button>

      <div className="cutscene-progress" aria-hidden="true">
        <div ref={progressRef} className="cutscene-progress-fill" />
      </div>
    </div>
  );
}
