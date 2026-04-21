import { BezelPanel } from "@/components/ui/bezel-panel";
import { type CompassHeading, CompassRose } from "@/components/ui/compass-rose";

/**
 * HeadingPanel — the "where am I facing" panel.
 *
 * Dedicated surface for the compass rose + the last-heading readout.
 * Previously the compass lived as a faint underlay of the PRESENT
 * panel at 25% opacity; pulled into its own bezel-framed panel so it
 * can earn its real estate and be unambiguously readable.
 */

const READOUT_LABEL: Record<Exclude<CompassHeading, null>, string> = {
  north: "North",
  east: "East",
  south: "South",
  west: "West",
};

export interface HeadingPanelProps {
  readonly heading: CompassHeading;
  /** Total rooms visited so far. Shown beneath the compass. */
  readonly visitedCount: number;
}

export function HeadingPanel({ heading, visitedCount }: HeadingPanelProps) {
  const label = heading ? READOUT_LABEL[heading] : "—";
  return (
    <BezelPanel
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-6 py-6"
      rivets="corners"
      rivetSize={10}
      aria-label="Heading"
    >
      <div className="font-[family-name:var(--font-display)] text-[0.75rem] tracking-[0.28em] uppercase text-[var(--color-dim)]">
        Heading
      </div>
      <div className="w-full max-w-[260px]" style={{ opacity: 0.9 }}>
        <CompassRose heading={heading} size="100%" />
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
    </BezelPanel>
  );
}
