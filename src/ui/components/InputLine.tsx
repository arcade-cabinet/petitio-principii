import { type KeyboardEvent, useState } from "react";

interface InputLineProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function InputLine({ onSubmit, disabled = false }: InputLineProps) {
  const [value, setValue] = useState("");

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && value.trim()) {
      onSubmit(value.trim());
      setValue("");
    }
  }

  return (
    <div className="input-line">
      <span className="prompt-symbol">{">"}</span>
      <input
        className="terminal-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Command input"
      />
      <span className="cursor-blink" aria-hidden="true" />
    </div>
  );
}
