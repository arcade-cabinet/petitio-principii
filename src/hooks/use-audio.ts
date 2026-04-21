import { BGM_MANIFEST, type BgmKey, SFX_MANIFEST, type SfxKey } from "@/lib/audio-manifest";
import { Howl, Howler } from "howler";
import { useCallback, useEffect, useRef } from "react";

/**
 * useAudio — Howler-backed audio bus.
 *
 * Design:
 *   - One module-level cache per SFX key so rapid presses reuse the same
 *     Howl instance (no allocation on every tap).
 *   - BGM is a singleton Howl that survives React remounts; starts on the
 *     first user gesture (iOS/AudioContext requirement), loops indefinitely.
 *   - Respects `prefers-reduced-motion` → master volume halved.
 *   - `mute()` / `unmute()` are intent-level, persisted to localStorage so
 *     a muted player stays muted on refresh.
 *
 * The hook exposes ONLY the semantic API (playSfx, playBgm, ...). Callers
 * never touch Howl directly and never reference filenames.
 */

const sfxCache = new Map<SfxKey, Howl>();
let bgmInstance: Howl | null = null;
let bgmKeyLoaded: BgmKey | null = null;
let audioUnlocked = false;

/**
 * Mobile browsers (iOS Safari, Android Chrome) suspend the AudioContext
 * until a synchronous user gesture explicitly resumes it. Howler's
 * autoUnlock helps but doesn't fire reliably when the first audio call
 * is queued behind async work. Call this from a click/touch handler
 * BEFORE any audio play to guarantee the context is alive.
 */
function unlockAudio(): void {
  if (audioUnlocked) return;
  const ctx = Howler.ctx;
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
  audioUnlocked = true;
}

function getSfx(key: SfxKey): Howl {
  const cached = sfxCache.get(key);
  if (cached) return cached;
  const howl = new Howl({
    src: [SFX_MANIFEST[key]],
    preload: true,
    // html5:true forces HTML <audio> playback. Web Audio (html5:false)
    // is faster but on iOS it stays suspended unless every play call is
    // a direct user-gesture continuation. HTML <audio> survives async
    // boundaries and is the more reliable mobile path.
    html5: true,
    volume: 0.7,
  });
  sfxCache.set(key, howl);
  return howl;
}

const MUTE_STORAGE_KEY = "ppp:audio:muted";

function readMutedPref(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMutedPref(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // storage disabled (private mode, etc.) — tolerate silently
  }
}

export interface AudioBus {
  /** Play a one-shot SFX. Safe to call rapidly; caps at ~3 overlapping voices per key. */
  playSfx: (key: SfxKey) => void;
  /** Start the BGM if not already playing. Must be called from a user gesture. */
  playBgm: (key?: BgmKey) => void;
  /** Stop the BGM with a 0.8s fade-out. */
  stopBgm: () => void;
  /** Toggle master mute. Persisted across sessions via localStorage. */
  toggleMute: () => boolean;
  /** Current mute state. */
  isMuted: () => boolean;
  /**
   * Resume the AudioContext from a synchronous user-gesture handler.
   * Mobile browsers (iOS Safari, Android Chrome) keep the AudioContext
   * suspended until this is called from inside a click/touch event. The
   * landing-screen Begin button calls this BEFORE any async work so the
   * subsequent BGM/SFX plays survive the async startGame chain.
   */
  unlock: () => void;
}

export function useAudio(): AudioBus {
  const mutedRef = useRef<boolean>(false);

  // Initialize from storage + prefers-reduced-motion master damping.
  useEffect(() => {
    mutedRef.current = readMutedPref();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const master = reducedMotion ? 0.25 : 0.6;
    // Lazy: volume is applied per-Howl on creation; also adjust any already-loaded ones.
    for (const howl of sfxCache.values()) {
      howl.volume(master);
    }
    if (bgmInstance) bgmInstance.volume(master);
  }, []);

  const playSfx = useCallback((key: SfxKey) => {
    if (mutedRef.current) return;
    unlockAudio();
    const howl = getSfx(key);
    howl.play();
  }, []);

  const playBgm = useCallback((key: BgmKey = "bgm.main") => {
    unlockAudio();
    // Create the Howl unconditionally — even when muted — so a later
    // unmute has something to resume. Without this, a player who starts
    // a fresh session muted would never get music back when toggling
    // unmute (the toggle has nothing to .play() on a null instance).
    if (!bgmInstance || bgmKeyLoaded !== key) {
      bgmInstance?.stop();
      bgmInstance = new Howl({
        src: [BGM_MANIFEST[key]],
        loop: true,
        volume: 0,
        html5: true, // stream for long BGM so we don't block the event loop on decode
      });
      bgmKeyLoaded = key;
    }
    if (mutedRef.current) return;
    if (!bgmInstance.playing()) {
      bgmInstance.play();
      bgmInstance.fade(0, 0.4, 2000);
    }
  }, []);

  const stopBgm = useCallback(() => {
    if (!bgmInstance) return;
    bgmInstance.fade(bgmInstance.volume(), 0, 800);
    setTimeout(() => bgmInstance?.stop(), 850);
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    writeMutedPref(mutedRef.current);
    if (mutedRef.current) {
      bgmInstance?.pause();
    } else if (bgmInstance) {
      // Resume from pause OR start fresh if BGM was never .play()'d
      // (e.g., the session began muted and `playBgm` was a no-op past
      // the early-return until the recent fix).
      if (!bgmInstance.playing()) {
        bgmInstance.play();
        bgmInstance.fade(0, 0.4, 2000);
      }
    }
    return mutedRef.current;
  }, []);

  const isMuted = useCallback(() => mutedRef.current, []);

  const unlock = useCallback(() => unlockAudio(), []);

  return { playSfx, playBgm, stopBgm, toggleMute, isMuted, unlock };
}
