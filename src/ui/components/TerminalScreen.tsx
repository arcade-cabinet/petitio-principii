import { For, createEffect } from "solid-js";
import type { Component } from "solid-js";
import { InputLine } from "./InputLine";
import { TextLine } from "./TextLine";

interface TerminalScreenProps {
  lines: string[];
  onCommand: (input: string) => void;
  onNewGame: () => void;
}

export const TerminalScreen: Component<TerminalScreenProps> = (props) => {
  let outputRef!: HTMLDivElement;

  createEffect(() => {
    // Track props.lines so the effect re-runs whenever lines change
    void props.lines;
    if (outputRef) outputRef.scrollTop = outputRef.scrollHeight;
  });

  function handleCommand(input: string) {
    if (input.toLowerCase() === "new game" || input.toLowerCase() === "new") {
      props.onNewGame();
      return;
    }
    props.onCommand(input);
  }

  return (
    <div class="terminal-wrapper">
      <div class="terminal-panel crt-effect">
        <div class="terminal-header">
          <span class="terminal-title">PETITIO PRINCIPII</span>
          <button class="new-game-btn" onClick={props.onNewGame} type="button">
            NEW GAME
          </button>
        </div>
        <div class="terminal-output" ref={outputRef}>
          <div class="scanlines" aria-hidden="true" />
          <For each={props.lines}>{(line) => <TextLine text={line} />}</For>
        </div>
        <InputLine onSubmit={handleCommand} />
      </div>
    </div>
  );
};
