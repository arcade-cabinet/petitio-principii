/**
 * Typography configuration — values mirror the CSS custom properties in theme.css.
 * Font sizes use clamp() in CSS for fluid scaling; the values here are the
 * design-intent sizes at a typical desktop viewport (≥900px).
 */
export const TYPOGRAPHY = {
  /** CSS: clamp(14px, 4vw, 16px) */
  baseFontSize: "clamp(14px, 4vw, 16px)",
  /** CSS: clamp(13px, 3.8vw, 15px) — boosted to clamp(15px, 4.2vw, 16px) on mobile */
  terminalFontSize: "clamp(13px, 3.8vw, 15px)",
  /** CSS: clamp(11px, 3vw, 12px) */
  smallFontSize: "clamp(11px, 3vw, 12px)",
  lineHeight: 1.6,
  letterSpacing: {
    normal: "0",
    wide: "0.05em",
    wider: "0.1em",
    widest: "0.2em",
  },
} as const;
