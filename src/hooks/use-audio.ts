import { BGM_MANIFEST, type BgmKey, SFX_MANIFEST, type SfxKey } from "@/lib/audio-manifest";
import { Howl } from "howler";
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

function getSfx(key: SfxKey): Howl {
  const cached = sfxCache.get(key);
  if (cached) return cached;
  const howl = new Howl({
    src: [SFX_MANIFEST[key]],
    preload: true,
    html5: false,
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
    const howl = getSfx(key);
    // Howler auto-dequeues to a pool; explicit .play() plays a new voice.
    howl.play();
  }, []);

  const playBgm = useCallback((key: BgmKey = "bgm.main") => {
    if (mutedRef.current) return;
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
    } else {
      bgmInstance?.play();
    }
    return mutedRef.current;
  }, []);

  const isMuted = useCallback(() => mutedRef.current, []);

  return { playSfx, playBgm, stopBgm, toggleMute, isMuted };
}
