import { ConsentBanner } from "@/components/ui/consent-banner";
import { CrystalField } from "@/components/ui/crystal-field";
import { NewGameIncantation } from "@/features/new-game/NewGameIncantation";
import { useGame } from "@/hooks/use-game";
import { registerBackHandler } from "@/lib/mobile";
import { initTelemetry, trackCircleClosed } from "@/lib/telemetry";
import { isCircleClosed } from "@/world";
import { Suspense, lazy, useEffect, useMemo, useRef } from "react";

// Lazy-load the in-game surface. TerminalDisplay is only shown once the
// player clicks "Begin Argument" — keeping it out of the initial bundle
// lets the landing screen paint faster and trims the first-visit JS. The
// whole terminal stack (command parser UI, key rows, argument map) lives
// under this chunk.
const TerminalDisplay = lazy(() =>
  import("@/features/terminal/TerminalDisplay").then((m) => ({ default: m.TerminalDisplay }))
);

// T93 — lazy-load the share-card canvas module. It's only mounted after the
// circle closes, so keeping it out of the initial bundle saves gzipped bytes
// of canvas-drawing code that the average first-visit player never needs.
const ShareCard = lazy(() =>
  import("@/components/ui/share-card").then((m) => ({ default: m.ShareCard }))
);

// T81 — initialise telemetry once on app boot (reads consent from localStorage).
initTelemetry();

/**
 * Suspense fallback for the landing→game transition. On a fast connection
 * the TerminalDisplay chunk (~49 kB gzipped) resolves within ~100 ms and
 * this is never seen; on Slow 3G it can be ~1 s, so a quiet pill keeps the
 * user anchored rather than flashing blank. Styling stays within existing
 * design tokens — no new dependencies.
 */
function TerminalLoadingPill() {
  return (
    <output
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-live="polite"
    >
      <span className="rounded-[4px] border border-[var(--color-panel-edge)] bg-[var(--color-panel)]/70 px-4 py-2 font-[family-name:var(--font-display)] text-[0.9rem] tracking-[0.16em] uppercase text-[var(--color-dim)]">
        Loading…
      </span>
    </output>
  );
}

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
 *
 * Android back-button behaviour (T75):
 *   - In-game: fires requestNewGame (returns to landing / "new game?").
 *   - On landing: default OS behaviour (suspend/background).
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
    [game.world, game.state.transcript.length, game.state.currentRoomId]
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

  // Register the Android hardware back-button handler.
  // When the game is active, back → requestNewGame (return to landing).
  // When on the landing screen, pass null so the OS default applies
  // (suspend / background the app).
  useEffect(() => {
    const cleanup = registerBackHandler(game.state.started ? game.requestNewGame : null);
    return cleanup;
  }, [game.state.started, game.requestNewGame]);

  return (
    <div className="relative h-[100svh] w-screen overflow-hidden">
      <CrystalField />
      {/* T71: <main> landmark so screen readers can navigate the primary content area */}
      <main className="absolute inset-0" aria-label={game.state.started ? "Game" : "Landing"}>
        {game.state.started ? (
          <Suspense fallback={<TerminalLoadingPill />}>
            <TerminalDisplay
              state={game.state}
              world={game.world}
              onMove={game.submitMove}
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
                  <Suspense fallback={null}>
                    <ShareCard
                      visited={visited}
                      currentRoomId={game.state.currentRoomId}
                      circleClosed={circleClosed}
                      seed={game.state.seed}
                      phrase={game.state.phrase}
                      turnCount={game.state.turnCount}
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </Suspense>
        ) : (
          <NewGameIncantation onBegin={game.startGame} />
        )}
      </main>

      {/* T81 — analytics consent banner (first launch only, defaults OFF) */}
      <ConsentBanner />
    </div>
  );
}
