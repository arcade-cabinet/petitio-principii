import { ConsentBanner } from "@/components/ui/consent-banner";
import { ShareCard } from "@/components/ui/share-card";
import { CrystalField } from "@/components/ui/crystal-field";
import { NewGameIncantation } from "@/features/new-game/NewGameIncantation";
import { TerminalDisplay } from "@/features/terminal/TerminalDisplay";
import { useGame } from "@/hooks/use-game";
import { initTelemetry, trackCircleClosed } from "@/lib/telemetry";
import { isCircleClosed } from "@/world";
import { useEffect, useMemo, useRef } from "react";

// T81 — initialise telemetry once on app boot (reads consent from localStorage).
initTelemetry();

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
 *
 * T81: Opt-in analytics via Plausible — consent banner on first launch.
 * T93: When the circle closes, a ShareCard overlay appears.
 */
export function App() {
  const game = useGame();

  // T93 — compute circle-closed for the share overlay.
  // biome-ignore lint/correctness/useExhaustiveDependencies: transcript drives re-read
  const circleClosed = useMemo(() => {
    const w = game.world.getWorld();
    return w ? isCircleClosed(w) : false;
  }, [game.world, game.state.transcript.length]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: transcript drives re-read
  const visited = useMemo(
    () => game.world.readVisitHistory(),
    [game.world, game.state.transcript.length, game.state.currentRoomId],
  );

  // T81 — fire circle_closed telemetry event once when the circle closes.
  const circleTrackedRef = useRef(false);
  useEffect(() => {
    if (circleClosed && !circleTrackedRef.current) {
      circleTrackedRef.current = true;
      trackCircleClosed(game.state.seed, game.state.turnCount);
    }
    // Reset tracker when a new game starts.
    if (!game.state.started) {
      circleTrackedRef.current = false;
    }
  }, [circleClosed, game.state.started, game.state.seed, game.state.turnCount]);

  return (
    <div className="relative h-[100svh] w-screen overflow-hidden">
      <CrystalField />
      {game.state.started ? (
        <>
          <TerminalDisplay
            state={game.state}
            world={game.world}
            onCommand={game.submitCommand}
            onNewGame={game.requestNewGame}
            onHintDismiss={game.dismissHint}
          />
          {/* T93 — share card overlay, shown only after circle closes */}
          {circleClosed && (
            <div
              className="absolute inset-0 z-50 flex items-end justify-center pb-8 px-4 pointer-events-none"
              aria-live="polite"
            >
              <div className="pointer-events-auto w-full max-w-lg">
                <ShareCard
                  visited={visited}
                  currentRoomId={game.state.currentRoomId}
                  circleClosed={circleClosed}
                  seed={game.state.seed}
                  phrase={game.state.phrase}
                  turnCount={game.state.turnCount}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <NewGameIncantation onBegin={game.startGame} />
      )}

      {/* T81 — analytics consent banner (first launch only, defaults OFF) */}
      <ConsentBanner />
    </div>
  );
}
