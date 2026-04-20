import { Show, createSignal } from "solid-js";
import type { Component } from "solid-js";
import { ModalNewGame } from "./ui/components/ModalNewGame";
import { StarfieldBackground } from "./ui/components/StarfieldBackground";
import { TerminalScreen } from "./ui/components/TerminalScreen";
import { createGameEngine } from "./ui/hooks/useGameEngine";

const App: Component = () => {
  const [showModal, setShowModal] = createSignal(true);
  const { gameState, startGame, submitCommand } = createGameEngine();

  function handleStartGame(seed: number) {
    startGame(seed);
    setShowModal(false);
  }

  return (
    <div class="app-root">
      <StarfieldBackground />
      <TerminalScreen
        lines={gameState().output}
        onCommand={submitCommand}
        onNewGame={() => setShowModal(true)}
      />
      <Show when={showModal()}>
        <ModalNewGame onStart={handleStartGame} />
      </Show>
    </div>
  );
};

export default App;
