import { useState } from "react";
import { ModalNewGame } from "./ui/components/ModalNewGame";
import { StarfieldBackground } from "./ui/components/StarfieldBackground";
import { TerminalScreen } from "./ui/components/TerminalScreen";
import { useGameEngine } from "./ui/hooks/useGameEngine";

export default function App() {
  const [showModal, setShowModal] = useState(true);
  const { gameState, startGame, submitCommand } = useGameEngine();

  function handleStartGame(seed: number) {
    startGame(seed);
    setShowModal(false);
  }

  return (
    <div className="app-root">
      <StarfieldBackground />
      <TerminalScreen
        lines={gameState.output}
        onCommand={submitCommand}
        onNewGame={() => setShowModal(true)}
      />
      {showModal && <ModalNewGame onStart={handleStartGame} />}
    </div>
  );
}
