import { GlowCard } from "@/components/ui/spotlight-card";
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
    <GlowCard
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-panel)]/55 backdrop-blur-sm"
      radius={20}
      border={1}
      spotlightSize={280}
    >
      <div className="px-6 pb-2 pt-4 font-[family-name:var(--font-display)] text-[0.75rem] tracking-[0.28em] uppercase text-[var(--color-dim)]">
        Argument map
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ArgumentMapOverlay state={state} world={world} />
      </div>
    </GlowCard>
  );
}
