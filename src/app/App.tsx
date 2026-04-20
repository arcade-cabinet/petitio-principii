import { CrystalField } from "@/components/ui/crystal-field";
import { NewGameIncantation } from "@/features/new-game/NewGameIncantation";
import { TerminalDisplay } from "@/features/terminal/TerminalDisplay";
import { useGame } from "@/hooks/use-game";

/**
 * App shell. Three layers, back to front:
 *
 *   0. CrystalField      — the memory-palace backdrop (canvas, always on)
 *   1. GlowingPanel      — the display surface (modal OR in-game terminal)
 *   2. KeyRow            — the HUD of rhetorical action keys (in-game only)
 *
 * No CRT metaphor; the surface is a luminous projection of an argument.
 * No typing; the player presses keys. See docs/LORE.md for the conceit.
 */
export function App() {
  const game = useGame();

  return (
    <div className="relative h-[100svh] w-screen overflow-hidden">
      <CrystalField />
      {game.state.started ? (
        <TerminalDisplay
          state={game.state}
          world={game.world}
          onCommand={game.submitCommand}
          onNewGame={game.requestNewGame}
        />
      ) : (
        <NewGameIncantation onBegin={game.startGame} />
      )}
    </div>
  );
}
