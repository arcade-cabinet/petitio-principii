import { BezelPanel } from "@/components/ui/bezel-panel";
import type { GameState } from "@/engine";
import { ArgumentMapOverlay } from "@/features/terminal/ArgumentMapOverlay";
import type { WorldHandle } from "@/hooks/use-world";

/**
 * MapPanel — the argument-map panel.
 *
 * Used to render flush against the top of the display; now in its own
 * bezel-framed panel inside the PanelDeck so the geometry of the walk
 * is legible without competing with the prose.
 */
export interface MapPanelProps {
  readonly state: GameState;
  readonly world: WorldHandle;
}

export function MapPanel({ state, world }: MapPanelProps) {
  return (
    <BezelPanel
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      rivets="corners"
      rivetSize={10}
      aria-label="Argument map"
    >
      <div className="border-b border-[var(--color-panel-edge)]/60 px-6 pb-2 pt-4 font-[family-name:var(--font-display)] text-[0.75rem] tracking-[0.28em] uppercase text-[var(--color-dim)]">
        Argument map
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ArgumentMapOverlay state={state} world={world} />
      </div>
    </BezelPanel>
  );
}
