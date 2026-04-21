import { cn } from "@/lib/utils";
import { type ReactNode, useEffect, useId, useRef } from "react";

/**
 * GlowCard — a pointer-tracked spotlight wrapper.
 *
 * Adapted from the 21st.dev "spotlight-card" reference. A radial gradient
 * follows the cursor across the surface, with a brighter ring effect on
 * the border. The hue swings across the game palette range (deep
 * black-violet → pink) as the cursor moves horizontally, so each panel
 * picks up its own color signature when the player is interacting with
 * it.
 *
 * Differences from the upstream reference:
 *   - Single "petitio" color profile mapped to the palette tokens
 *     (no blue/green/red/orange options).
 *   - SVG turbulence filter applied to the spotlight edge so the glow
 *     border feels organic — wisps and distortions instead of a clean
 *     ring. Living-nebula feel rather than UI-clean.
 *   - Flex-friendly: no forced aspect ratio / size map / grid-rows.
 *     Wraps existing panel content (BezelPanel, etc.) without imposing
 *     layout.
 *   - Pointer subscription is local to the card's bounding rect
 *     (rather than the whole viewport), so each card responds to its
 *     own hover region instead of every card glowing in unison.
 *
 * Per-instance unique IDs are used for the SVG filter and pseudo-style
 * scoping so multiple GlowCards on the same page don't clobber each
 * other's spotlights.
 */

export interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  /** Border radius in px. Defaults to 14. */
  radius?: number;
  /** Border thickness in px. Defaults to 2. */
  border?: number;
  /** Spotlight diameter in px. Defaults to 220. */
  spotlightSize?: number;
}

export function GlowCard({
  children,
  className = "",
  radius = 14,
  border = 2,
  spotlightSize = 220,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const filterId = `pp-spot-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handler = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--x", x.toFixed(2));
      card.style.setProperty("--y", y.toFixed(2));
      card.style.setProperty("--xp", (x / rect.width).toFixed(3));
      card.style.setProperty("--yp", (y / rect.height).toFixed(3));
    };
    document.addEventListener("pointermove", handler, { passive: true });
    return () => document.removeEventListener("pointermove", handler);
  }, []);

  const inlineStyles = {
    "--base": 260,
    "--spread": 80,
    "--radius": radius,
    "--border": border,
    "--saturation": 90,
    "--lightness": 62,
    "--bg-spot-opacity": 0.18,
    "--border-spot-opacity": 1,
    "--border-light-opacity": 0.85,
    "--backdrop": "transparent",
    "--backup-border": "rgba(122,92,255,0.18)",
    "--size": spotlightSize,
    "--outer": 1,
    "--border-size": "calc(var(--border) * 1px)",
    "--spotlight-size": "calc(var(--size) * 1px)",
    "--hue": "calc(var(--base) + (var(--xp, 0.5) * var(--spread, 0)))",
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 50) * 1px)
      calc(var(--y, 50) * 1px),
      hsl(var(--hue, 280) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)),
      transparent 70%
    )`,
    backgroundColor: "var(--backdrop)",
    backgroundSize: "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
    backgroundPosition: "50% 50%",
    border: "var(--border-size) solid var(--backup-border)",
    borderRadius: `${radius}px`,
    position: "relative" as const,
  };

  // CSS template literal injected via <style>{...}</style>. The only
  // dynamic input is filterId, which we generate ourselves from useId
  // (safe — not user input). No dangerouslySetInnerHTML required.
  const css = `
    [data-pp-glow="${filterId}"]::before,
    [data-pp-glow="${filterId}"]::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: calc(var(--border-size) * -1);
      border: var(--border-size) solid transparent;
      border-radius: calc(var(--radius) * 1px);
      background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
      background-repeat: no-repeat;
      background-position: 50% 50%;
      mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
      mask-clip: padding-box, border-box;
      mask-composite: intersect;
    }
    [data-pp-glow="${filterId}"]::before {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.85) calc(var(--spotlight-size) * 0.85) at
        calc(var(--x, 50) * 1px)
        calc(var(--y, 50) * 1px),
        hsl(var(--hue, 280) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 60) * 1%) / var(--border-spot-opacity, 1)),
        transparent 100%
      );
      filter: brightness(1.6) url(#${filterId});
    }
    [data-pp-glow="${filterId}"]::after {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
        calc(var(--x, 50) * 1px)
        calc(var(--y, 50) * 1px),
        hsl(330 100% 95% / var(--border-light-opacity, 0.85)),
        transparent 100%
      );
      filter: url(#${filterId});
    }
  `;

  return (
    <>
      {/* Local SVG defs: turbulence + displacement gives the spotlight
          edge organic distortion (nebula wisps instead of a clean
          ring). The filter id is per-instance so cards don't collide. */}
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="6" />
          </filter>
        </defs>
      </svg>
      <style>{css}</style>
      <div
        ref={cardRef}
        data-pp-glow={filterId}
        style={inlineStyles as React.CSSProperties}
        className={cn("relative", className)}
      >
        {children}
      </div>
    </>
  );
}
