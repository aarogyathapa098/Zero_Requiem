/**
 * environmentAudio.js
 * -------------------
 * Global audio manager for the Mars expedition ambient sound.
 * Loops throughout the game starting from the map route, and feeds
 * a Web Audio API AnalyserNode to drive real-time visualizers.
 */

class EnvironmentAudioManager {
  constructor() {
    this.audio = null;
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.gainNode = null;
    this.frequencyData = null;
    this._isPlaying = false;
    this._hasStarted = false;
    this.subscribers = new Set();
    this.unlockRegistered = false;
  }

  init() {
    if (typeof window === "undefined") return;
    if (this.audio) return;

    const soundUrl = `${import.meta.env.BASE_URL}audio/environment_sound.mp3`;
    const audio = new Audio(soundUrl);
    audio.loop = true;
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";

    // Extra safeguard for mobile browsers that miss loop attribute
    audio.addEventListener("ended", () => {
      if (this._isPlaying) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    });

    this.audio = audio;

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (AudioContextClass) {
      try {
        this.ctx = new AudioContextClass();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.75;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(0.7, this.ctx.currentTime);

        this.source = this.ctx.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
      } catch (err) {
        console.warn("[environmentAudio] Web Audio setup fallback:", err);
      }
    }
  }

  /**
   * Starts looping the environment sound when the player reaches the map.
   * If already started, keeps playing seamlessly.
   */
  startFromMap() {
    this.init();
    if (this._hasStarted) {
      // Ensure audio continues playing if it was not intentionally paused
      if (this._isPlaying && this.audio && this.audio.paused) {
        this.play();
      }
      return;
    }
    this._hasStarted = true;
    this.play();
  }

  async play() {
    this.init();
    if (!this.audio) return;

    try {
      if (this.ctx && this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.setValueAtTime(0.7, this.ctx.currentTime);
      }
      await this.audio.play();
      this._isPlaying = true;
      this.notify();
    } catch {
      // Autoplay blocked by browser policy until user gesture
      this._isPlaying = false;
      this.notify();

      if (!this.unlockRegistered) {
        this.unlockRegistered = true;
        const unlock = () => {
          this.unlockRegistered = false;
          if (this._hasStarted) {
            this.play();
          }
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("keydown", unlock);
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
      }
    }
  }

  pause() {
    if (!this.audio) return;
    this.audio.pause();
    this._isPlaying = false;
    this.notify();
  }

  toggle() {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  isPlaying() {
    return this._isPlaying;
  }

  /**
   * Copies the current frequency spectrum into targetArray.
   * @param {Uint8Array} targetArray
   * @returns {boolean} whether data was retrieved
   */
  getFrequencyData(targetArray) {
    if (!this.analyser || !this.frequencyData) return false;
    this.analyser.getByteFrequencyData(this.frequencyData);
    if (targetArray) {
      targetArray.set(this.frequencyData);
    }
    return true;
  }

  /**
   * Subscribes to play/pause state changes.
   * @param {(playing: boolean) => void} callback
   * @returns {() => void} unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this._isPlaying);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const cb of this.subscribers) {
      try {
        cb(this._isPlaying);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

export const environmentAudio = new EnvironmentAudioManager();
