import { createSignal } from "solid-js";
import type { Component } from "solid-js";

interface InputLineProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export const InputLine: Component<InputLineProps> = (props) => {
  const [value, setValue] = createSignal("");

  function handleKeyDown(e: KeyboardEvent) {
    if (props.disabled) return;
    if (e.key === "Enter" && value().trim()) {
      props.onSubmit(value().trim());
      setValue("");
    }
  }

  return (
    <div class="input-line">
      <span class="prompt-symbol">{">"}</span>
      <input
        class="terminal-input"
        type="text"
        value={value()}
        onInput={(e) => setValue(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={props.disabled ?? false}
        autocomplete="off"
        autocorrect="off"
        spellcheck={false}
        aria-label="Command input"
        autofocus
      />
      <span class="cursor-blink" aria-hidden="true" />
    </div>
  );
};
