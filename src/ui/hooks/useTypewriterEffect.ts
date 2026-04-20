import { createEffect, createSignal, onCleanup } from "solid-js";

export interface TypewriterOptions {
  speed?: number;
  enabled?: boolean;
}

/**
 * SolidJS-native typewriter effect primitive.
 *
 * @param getLines - Reactive getter (signal) that returns the full line array.
 * @param options  - Speed in characters/second and enable flag.
 */
export function createTypewriterEffect(
  getLines: () => string[],
  options: TypewriterOptions = {}
): { displayedLines: () => string[]; isTyping: () => boolean } {
  const { speed = 30, enabled = true } = options;
  const [displayedLines, setDisplayedLines] = createSignal<string[]>([]);
  const [isTyping, setIsTyping] = createSignal(false);

  // Plain mutable variables are safe here — SolidJS components run once.
  let prevLength = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  // Top-level cleanup: ensure the interval is cleared when the owner scope
  // (the component that called createTypewriterEffect) is disposed.
  onCleanup(() => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  });

  createEffect(() => {
    const lines = getLines(); // reactive tracking

    if (!enabled) {
      setDisplayedLines(lines);
      prevLength = lines.length;
      return;
    }

    if (lines.length <= prevLength) {
      if (lines.length < prevLength) setDisplayedLines(lines);
      prevLength = lines.length;
      return;
    }

    const prev = lines.slice(0, prevLength);
    const newLines = lines.slice(prevLength);
    prevLength = lines.length;

    // Clear any running interval before starting a new one
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
    setIsTyping(true);

    let lineIndex = 0;
    let charIndex = 0;

    timer = setInterval(() => {
      if (lineIndex >= newLines.length) {
        clearInterval(timer);
        timer = undefined;
        setIsTyping(false);
        return;
      }

      const currentLine = newLines[lineIndex] ?? "";
      charIndex++;

      setDisplayedLines([
        ...prev,
        ...newLines.slice(0, lineIndex),
        currentLine.slice(0, charIndex),
      ]);

      if (charIndex >= currentLine.length) {
        lineIndex++;
        charIndex = 0;
      }
    }, 1000 / speed);
  });

  return { displayedLines, isTyping };
}
