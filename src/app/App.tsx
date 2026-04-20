import { CrystalField } from "@/components/ui/crystal-field";
import { NewGameIncantation } from "@/features/new-game/NewGameIncantation";
import { TerminalDisplay } from "@/features/terminal/TerminalDisplay";
import { useGameEngine } from "@/hooks/use-game-engine";

/**
 * App shell. Three layers, back to front:
 *
 *   0. CrystalField      — the memory-palace backdrop (canvas, always on)
 *   1. GlowingPanel      — the display surface (modal OR in-game terminal)
 *   2. KeyRow            — the HUD of rhetorical action keys (in-game only)
 *
 * The CRT metaphor has been retired: the surface is a luminous projection
 * of an argument, not a monitor. The player does not type; they press keys.
 */
export function App() {
  const engine = useGameEngine();

  return (
    <div className="relative h-[100svh] w-screen overflow-hidden">
      <CrystalField />
      {engine.state.started ? (
        <TerminalDisplay
          state={engine.state}
          onCommand={engine.submitCommand}
          onNewGame={engine.requestNewGame}
        />
      ) : (
        <NewGameIncantation onBegin={engine.startGame} />
      )}
    </div>
  );
}
