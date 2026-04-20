import { createSignal, Show } from "solid-js";
import type { Component } from "solid-js";
import { ModalNewGame } from "@app/terminal/components/ModalNewGame";
import { StarfieldBackground } from "@app/terminal/components/StarfieldBackground";
import { TerminalScreen } from "@app/terminal/components/TerminalScreen";
import { createGameEngine } from "@app/terminal/hooks/useGameEngine";

const App: Component = () => {
  const { gameState, submitCommand, startGame } = createGameEngine();
  const [showTerminal] = createSignal(true);

  return (
    <div class="app-container">
      <StarfieldBackground />
      <div class="content-overlay">
        <Show 
          when={gameState().started} 
          fallback={<ModalNewGame onStart={startGame} />}
        >
          <Show when={showTerminal()}>
            <TerminalScreen 
              lines={gameState().output} 
              onCommand={submitCommand} 
              onNewGame={() => startGame(gameState().seed)}
            />
          </Show>
        </Show>
      </div>
    </div>
  );
};

export default App;
