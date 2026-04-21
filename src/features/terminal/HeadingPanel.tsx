import {
  type CompassDirection,
  type CompassHeading,
  CompassRose,
} from "@/components/ui/compass-rose";
import { GlowCard } from "@/components/ui/spotlight-card";

/**
 * HeadingPanel — the "where am I facing" panel.
 *
 * Hosts the interactive 8-cardinal CompassRose. Receives the available
 * exits from the parent and an `onDirection` callback that submits the
 * spatial command. The compass spins to the last heading the player
 * pressed.
 *
 * Wrapped in a GlowCard (pointer-tracked spotlight + organic
 * SVG-distorted border) instead of a machined BezelPanel.
 */

const READOUT_LABEL: Record<CompassDirection, string> = {
  north: "North",
  northeast: "Northeast",
  east: "East",
  southeast: "Southeast",
  south: "South",
  southwest: "Southwest",
  west: "West",
  northwest: "Northwest",
};

export interface HeadingPanelProps {
  readonly heading: CompassHeading;
  /** Set of directions currently available as exits from the present room. */
  readonly available: ReadonlySet<CompassDirection>;
  /** Called when the player clicks an enabled compass direction. */
  readonly onDirection: (dir: CompassDirection) => void;
  /** Total rooms visited so far. Shown beneath the compass. */
  readonly visitedCount: number;
}

export function HeadingPanel({ heading, available, onDirection, visitedCount }: HeadingPanelProps) {
  const label = heading ? READOUT_LABEL[heading] : "—";
  return (
    <GlowCard
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden bg-[var(--color-panel)]/55 px-6 py-6 backdrop-blur-sm"
      radius={20}
      border={1}
      spotlightSize={280}
    >
      <div className="font-[family-name:var(--font-display)] text-[0.75rem] tracking-[0.28em] uppercase text-[var(--color-dim)]">
        Heading
      </div>
      <div className="w-full max-w-[260px]" style={{ opacity: 0.9 }}>
        <CompassRose
          available={available}
          lastHeading={heading}
          onDirection={onDirection}
          size="100%"
        />
      </div>
      <div className="text-center">
        <div
          className="font-[family-name:var(--font-display)] text-[1.4rem] text-[var(--color-highlight)]"
          style={{ textShadow: "0 0 6px rgba(255,209,250,0.35)" }}
        >
          {label}
        </div>
        <div className="mt-2 font-[family-name:var(--font-display)] text-[0.75rem] tracking-[0.18em] uppercase text-[var(--color-muted)]">
          {visitedCount} room{visitedCount === 1 ? "" : "s"} visited
        </div>
      </div>
    </GlowCard>
  );
}
