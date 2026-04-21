import { CrystalField } from "@/components/ui/crystal-field";
import { NewGameIncantation } from "@/features/new-game/NewGameIncantation";
import { TerminalDisplay } from "@/features/terminal/TerminalDisplay";
import { useGame } from "@/hooks/use-game";

/**
 * App shell. Three layers, back to front:
 *
 *   0. CrystalField      — the memory-palace backdrop (canvas, always on)
 *   1. PanelDeck         — GlowCard-framed panels floating in dreamspace
 *   2. KeyRow            — the HUD of rhetorical action keys (in-game only)
 *
 * No CRT metaphor, no machined chassis: the surface is a luminous
 * projection of an argument. Each panel is a soft pointer-tracked glow
 * card sitting directly on the nebula backdrop. The player presses
 * keys; nobody types. See docs/LORE.md.
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
          onHintDismiss={game.dismissHint}
        />
      ) : (
        <NewGameIncantation onBegin={game.startGame} />
      )}
    </div>
  );
}
