import { useEffect, useRef, useState } from "react";

export interface TypewriterOptions {
  speed?: number;
  enabled?: boolean;
}

export function useTypewriterEffect(
  lines: string[],
  options: TypewriterOptions = {}
): { displayedLines: string[]; isTyping: boolean } {
  const { speed = 30, enabled = true } = options;
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const prevLinesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!enabled) {
      setDisplayedLines(lines);
      return;
    }

    const prev = prevLinesRef.current;
    prevLinesRef.current = lines;

    if (lines.length <= prev.length) {
      setDisplayedLines(lines);
      return;
    }

    const newLines = lines.slice(prev.length);
    setIsTyping(true);

    let lineIndex = 0;
    let charIndex = 0;

    const interval = setInterval(() => {
      if (lineIndex >= newLines.length) {
        clearInterval(interval);
        setIsTyping(false);
        return;
      }

      const currentLine = newLines[lineIndex];
      charIndex++;

      setDisplayedLines([
        ...prev,
        ...newLines.slice(0, lineIndex),
        currentLine?.slice(0, charIndex) ?? "",
      ]);

      if (charIndex >= (currentLine?.length ?? 0)) {
        lineIndex++;
        charIndex = 0;
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [lines, speed, enabled]);

  return { displayedLines, isTyping };
}
