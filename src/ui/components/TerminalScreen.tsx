import { useEffect, useRef } from "react";
import { InputLine } from "./InputLine";
import { TextLine } from "./TextLine";

interface TerminalScreenProps {
  lines: string[];
  onCommand: (input: string) => void;
  onNewGame: () => void;
}

export function TerminalScreen({ lines, onCommand, onNewGame }: TerminalScreenProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom when lines change; outputRef.current is not a reactive value
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  function handleCommand(input: string) {
    if (input.toLowerCase() === "new game" || input.toLowerCase() === "new") {
      onNewGame();
      return;
    }
    onCommand(input);
  }

  return (
    <div className="terminal-wrapper">
      <div className="terminal-panel crt-effect">
        <div className="terminal-header">
          <span className="terminal-title">PETITIO PRINCIPII</span>
          <button className="new-game-btn" onClick={onNewGame} type="button">
            NEW GAME
          </button>
        </div>
        <div className="terminal-output" ref={outputRef}>
          <div className="scanlines" aria-hidden="true" />
          {lines.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: terminal lines have no stable IDs
            <TextLine key={i} text={line} />
          ))}
        </div>
        <InputLine onSubmit={handleCommand} />
      </div>
    </div>
  );
}
