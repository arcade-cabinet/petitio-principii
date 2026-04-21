/**
 * useAppearance — manages the two player-controlled appearance settings:
 *   - T85 dyslexia-friendly font toggle (VT323 → OpenDyslexic)
 *   - T86 text-size step (small / medium / large)
 *
 * Both settings persist to localStorage and are applied immediately via
 * HTML attributes / CSS custom properties on <html>, so they work without
 * a React re-render after the initial hydration.
 *
 * CSS targets:
 *   html[data-dyslexia="true"] body  → "OpenDyslexic", sans-serif
 *   html style="--pp-font-scale: N"  → scales the root font-size
 */
import { useCallback, useEffect, useState } from "react";

export type TextSize = "small" | "medium" | "large";

const STORAGE_KEY_DYSLEXIA = "pp.dyslexia";
const STORAGE_KEY_TEXT_SIZE = "pp.textSize";

const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  small: 0.875,
  medium: 1,
  large: 1.2,
};

function readDyslexia(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_DYSLEXIA) === "true";
  } catch {
    return false;
  }
}

function readTextSize(): TextSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEXT_SIZE);
    if (stored === "small" || stored === "medium" || stored === "large") return stored;
  } catch {
    /* ignore */
  }
  return "medium";
}

function applyDyslexia(enabled: boolean) {
  document.documentElement.setAttribute("data-dyslexia", enabled ? "true" : "false");
  try {
    localStorage.setItem(STORAGE_KEY_DYSLEXIA, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
}

function applyTextSize(size: TextSize) {
  document.documentElement.style.setProperty("--pp-font-scale", String(TEXT_SIZE_SCALE[size]));
  try {
    localStorage.setItem(STORAGE_KEY_TEXT_SIZE, size);
  } catch {
    /* ignore */
  }
}

export interface AppearanceHandle {
  dyslexia: boolean;
  textSize: TextSize;
  toggleDyslexia: () => void;
  setTextSize: (size: TextSize) => void;
}

export function useAppearance(): AppearanceHandle {
  const [dyslexia, setDyslexiaState] = useState<boolean>(readDyslexia);
  const [textSize, setTextSizeState] = useState<TextSize>(readTextSize);

  // Apply persisted settings on mount only. The empty dep array is intentional:
  // we read initial values synchronously from localStorage and apply once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only apply
  useEffect(() => {
    applyDyslexia(dyslexia);
    applyTextSize(textSize);
  }, []);

  const toggleDyslexia = useCallback(() => {
    setDyslexiaState((prev) => {
      const next = !prev;
      applyDyslexia(next);
      return next;
    });
  }, []);

  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    applyTextSize(size);
  }, []);

  return { dyslexia, textSize, toggleDyslexia, setTextSize };
}
