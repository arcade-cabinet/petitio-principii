import { useViewport } from "@/hooks/use-viewport";
import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * PanelDeck — lays out a set of bezel-framed panels.
 *
 * - Landscape / desktop: panels sit side-by-side in a horizontal grid.
 *   Every panel is visible at once, each in its own chassis well.
 * - Portrait / narrow: panels become horizontal scroll-snap pages.
 *   The player swipes left/right between them. A row of small silver
 *   dot indicators shows the current pane.
 *
 * The swipe mechanism uses native CSS scroll-snap — browser-native,
 * inertia-friendly, accessible (keyboard arrows work on focusable
 * children), and free of the handler bookkeeping that a custom pointer
 * tracker would need. The IntersectionObserver tracks which pane is
 * centred so the indicator row can reflect it.
 */

export interface DeckPanel {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
  /** Relative flex weight on wide layouts (defaults to 1). */
  readonly weight?: number;
}

export interface PanelDeckProps {
  readonly panels: ReadonlyArray<DeckPanel>;
  /** Id of the panel that should be the default focus on narrow viewports. */
  readonly defaultPanelId?: string;
}

export function PanelDeck({ panels, defaultPanelId }: PanelDeckProps) {
  const viewport = useViewport();
  if (viewport === "landscape") {
    return <WideLayout panels={panels} />;
  }
  return <PagedLayout panels={panels} defaultPanelId={defaultPanelId} />;
}

function WideLayout({ panels }: { panels: ReadonlyArray<DeckPanel> }) {
  // Panels float in the dreamspace with breathing gaps — no machined
  // dividers. Each panel's GlowCard handles its own organic edge; the
  // chassis behind them is just dark-violet ambient.
  return (
    <div className="flex h-full min-h-0 w-full items-stretch gap-4">
      {panels.map((p) => (
        <div key={p.id} className="flex min-h-0 min-w-0 flex-col" style={{ flex: p.weight ?? 1 }}>
          {p.content}
        </div>
      ))}
    </div>
  );
}

function PagedLayout({
  panels,
  defaultPanelId,
}: {
  panels: ReadonlyArray<DeckPanel>;
  defaultPanelId?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(defaultPanelId ?? panels[0]?.id ?? "");

  // Scroll to the default panel on mount.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const idx = panels.findIndex((p) => p.id === (defaultPanelId ?? panels[0]?.id));
    if (idx < 0) return;
    container.scrollTo({ left: container.clientWidth * idx, behavior: "auto" });
  }, [defaultPanelId, panels]);

  // Observe which pane is most centred — drives the indicator row.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the highest intersectionRatio.
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (best?.isIntersecting) {
          const id = (best.target as HTMLElement).dataset.panelId;
          if (id) setActiveId(id);
        }
      },
      { root: container, threshold: [0.5, 0.75, 1] }
    );
    const panes = container.querySelectorAll<HTMLElement>("[data-panel-id]");
    for (const p of panes) observer.observe(p);
    return () => observer.disconnect();
  }, []);

  const scrollToId = (id: string) => {
    const container = scrollRef.current;
    if (!container) return;
    const idx = panels.findIndex((p) => p.id === id);
    if (idx < 0) return;
    container.scrollTo({ left: container.clientWidth * idx, behavior: "smooth" });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label="panel deck"
      >
        <div className="flex h-full w-max">
          {panels.map((p) => (
            <section
              key={p.id}
              data-panel-id={p.id}
              className="flex h-full w-screen max-w-full flex-shrink-0 snap-center flex-col px-2"
              aria-label={p.label}
            >
              {p.content}
            </section>
          ))}
        </div>
      </div>

      {/* Pane indicator row — tap a dot to jump to that pane. */}
      <div className="flex items-center justify-center gap-2 pb-1" aria-hidden="true">
        {panels.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => scrollToId(p.id)}
            aria-label={`Show ${p.label}`}
            className="rounded-full transition-all duration-200"
            style={{
              width: activeId === p.id ? 14 : 8,
              height: 8,
              background:
                activeId === p.id
                  ? "radial-gradient(circle at 30% 30%, #ffffff 0%, #c0c5cc 18%, #6c7280 55%, #2a2d32 100%)"
                  : "rgba(255,255,255,0.15)",
              boxShadow:
                activeId === p.id
                  ? "0 0 6px rgba(255,209,250,0.45), inset 0.5px 0.5px 0.5px rgba(255,255,255,0.9)"
                  : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
