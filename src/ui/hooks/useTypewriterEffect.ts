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

  let timer: ReturnType<typeof setInterval> | undefined;
  let currentTarget: string[] = [];
  let lineIndex = 0;
  let charIndex = 0;

  onCleanup(() => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  });

  createEffect(() => {
    const lines = getLines(); // reactive tracking

    if (!enabled) {
      currentTarget = lines;
      setDisplayedLines(lines);
      lineIndex = lines.length;
      charIndex = 0;
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
        setIsTyping(false);
      }
      return;
    }

    if (lines.length < currentTarget.length) {
      lineIndex = lines.length;
      charIndex = 0;
      setDisplayedLines(lines);
    }

    currentTarget = lines;

    if (timer === undefined && lineIndex < currentTarget.length) {
      setIsTyping(true);
      timer = setInterval(() => {
        if (lineIndex >= currentTarget.length) {
          clearInterval(timer);
          timer = undefined;
          setIsTyping(false);
          return;
        }

        const currentLine = currentTarget[lineIndex] ?? "";
        charIndex++;

        setDisplayedLines([
          ...currentTarget.slice(0, lineIndex),
          currentLine.slice(0, charIndex),
        ]);

        if (charIndex >= currentLine.length) {
          lineIndex++;
          charIndex = 0;
        }
      }, 1000 / speed);
    }
  });

  return { displayedLines, isTyping };
}
