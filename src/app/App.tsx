import { Chassis } from "@/components/ui/chassis";
import { CrystalField } from "@/components/ui/crystal-field";
import { NewGameIncantation } from "@/features/new-game/NewGameIncantation";
import { TerminalDisplay } from "@/features/terminal/TerminalDisplay";
import { useGame } from "@/hooks/use-game";

/**
 * App shell. Four layers, back to front:
 *
 *   0. CrystalField      — the memory-palace backdrop (canvas, always on)
 *   1. Chassis           — brushed-black-steel surround the panels sit in
 *   2. PanelDeck         — bezel-framed panels (swipeable on narrow)
 *   3. KeyRow            — the HUD of rhetorical action keys (in-game only)
 *
 * No CRT metaphor; the surface is a luminous projection of an argument.
 * No typing; the player presses keys. The chassis reads as a physical
 * device mounted on a living violet nebula — see docs/LORE.md.
 */
export function App() {
  const game = useGame();

  return (
    <div className="relative h-[100svh] w-screen overflow-hidden">
      <CrystalField />
      <Chassis>
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
      </Chassis>
    </div>
  );
}
