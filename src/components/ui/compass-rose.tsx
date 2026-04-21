/**
 * CompassRose — decorative compass glyph that rotates to the player's
 * last heading.
 *
 * 8-point star (4 cardinals + 4 sub-points) inside a silver dashed ring.
 * When the player presses N/S/E/W, TerminalDisplay passes that direction
 * as `heading`; the star body rotates to point that way while the NSEW
 * labels counter-rotate so they stay upright and readable.
 *
 * The game remains click/tap only — this SVG is aria-hidden and takes no
 * input. It's purely diegetic chrome: the needle reacts, the player
 * doesn't drive it directly.
 *
 * Reduced-motion: when the user prefers reduced motion the rotation
 * transition collapses to an instant snap (the body-level media query in
 * the style block below).
 */

export type CompassHeading = "north" | "east" | "south" | "west" | null;

const HEADING_ANGLE: Record<Exclude<CompassHeading, null>, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

export function CompassRose({
  className,
  size = "100%",
  heading = null,
}: {
  className?: string;
  /** CSS size — number (px) or string ("100%", "20rem"). Defaults to "100%" so
   *  the parent's sizing drives responsive behaviour. */
  size?: number | string;
  heading?: CompassHeading;
}) {
  const angle = heading ? HEADING_ANGLE[heading] : 0;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      className={className}
      style={{ width: size, height: "auto", display: "block" }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="pp-compass-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3d0c5a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#050208" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pp-compass-high-lit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="15%" stopColor="#d49df8" />
          <stop offset="100%" stopColor="#5e1a82" />
        </linearGradient>
        <linearGradient id="pp-compass-mod-lit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c77dff" />
          <stop offset="40%" stopColor="#7b2cb0" />
          <stop offset="100%" stopColor="#3c096c" />
        </linearGradient>
        <linearGradient id="pp-compass-mod-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3c096c" />
          <stop offset="100%" stopColor="#15051e" />
        </linearGradient>
        <linearGradient id="pp-compass-very-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a0526" />
          <stop offset="100%" stopColor="#050108" />
        </linearGradient>
        <linearGradient id="pp-compass-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#e0e4e8" />
          <stop offset="55%" stopColor="#8a95a5" />
          <stop offset="100%" stopColor="#f8f9fa" />
        </linearGradient>
        <filter id="pp-compass-silver-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pp-compass-star-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.9" />
        </filter>
        <filter id="pp-compass-base-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="15" stdDeviation="12" floodColor="#000" floodOpacity="1" />
        </filter>
      </defs>

      <circle cx="250" cy="250" r="250" fill="url(#pp-compass-bg)" />

      {/* Nested bezel rings. Static — do NOT rotate. */}
      <g filter="url(#pp-compass-base-shadow)">
        <circle cx="250" cy="250" r="185" fill="#0c0414" stroke="#2b0b3f" strokeWidth="3" />
        <circle cx="250" cy="250" r="170" fill="#050108" stroke="#1a0526" strokeWidth="1" />
        <circle
          cx="250"
          cy="250"
          r="195"
          fill="none"
          stroke="url(#pp-compass-silver)"
          strokeWidth="3"
          strokeDasharray="3 14"
          opacity="0.4"
          filter="url(#pp-compass-silver-glow)"
        />
        <circle
          cx="250"
          cy="250"
          r="120"
          fill="none"
          stroke="#4a0e68"
          strokeWidth="1"
          opacity="0.5"
        />
        <circle
          cx="250"
          cy="250"
          r="70"
          fill="none"
          stroke="#2b0b3f"
          strokeWidth="1"
          opacity="0.8"
        />
      </g>

      {/* Rotating body: star + sub-points. The compass `needle` spins to
          point N/E/S/W when the player picks a direction. */}
      <g
        style={{
          transformOrigin: "250px 250px",
          transform: `rotate(${angle}deg)`,
          transition: "transform 1.2s cubic-bezier(0.25, 1, 0.2, 1)",
        }}
      >
        {/* Sub-points at 45°. */}
        <g filter="url(#pp-compass-star-shadow)">
          <polygon points="250,250 350,150 250,210" fill="url(#pp-compass-high-lit)" />
          <polygon points="250,250 350,150 290,250" fill="url(#pp-compass-very-dark)" />
          <polygon points="250,250 350,350 290,250" fill="url(#pp-compass-mod-dark)" />
          <polygon points="250,250 350,350 250,290" fill="url(#pp-compass-mod-lit)" />
          <polygon points="250,250 150,350 250,290" fill="url(#pp-compass-very-dark)" />
          <polygon points="250,250 150,350 210,250" fill="url(#pp-compass-high-lit)" />
          <polygon points="250,250 150,150 210,250" fill="url(#pp-compass-mod-lit)" />
          <polygon points="250,250 150,150 250,210" fill="url(#pp-compass-mod-dark)" />
        </g>

        {/* Primary cardinal arms. */}
        <g filter="url(#pp-compass-star-shadow)">
          <polygon points="250,250 250,40 225,225" fill="url(#pp-compass-high-lit)" />
          <polygon points="250,250 250,40 275,225" fill="url(#pp-compass-mod-dark)" />
          <polygon points="250,250 460,250 275,225" fill="url(#pp-compass-mod-lit)" />
          <polygon points="250,250 460,250 275,275" fill="url(#pp-compass-very-dark)" />
          <polygon points="250,250 250,460 225,275" fill="url(#pp-compass-mod-lit)" />
          <polygon points="250,250 250,460 275,275" fill="url(#pp-compass-very-dark)" />
          <polygon points="250,250 40,250 225,225" fill="url(#pp-compass-high-lit)" />
          <polygon points="250,250 40,250 225,275" fill="url(#pp-compass-mod-dark)" />
        </g>
      </g>

      {/* Center hub — stays on axis. */}
      <g filter="url(#pp-compass-silver-glow)">
        <circle cx="250" cy="250" r="16" fill="url(#pp-compass-silver)" />
        <circle cx="250" cy="250" r="7" fill="#050108" />
        <circle cx="250" cy="250" r="3" fill="#d49df8" />
      </g>

      {/* Cardinal labels — counter-rotate so they stay upright. Each label
          is individually counter-rotated around its own centre. */}
      <g
        fill="url(#pp-compass-silver)"
        fontFamily="'Times New Roman', serif"
        fontWeight="900"
        fontSize="36"
        textAnchor="middle"
        dominantBaseline="middle"
        filter="url(#pp-compass-silver-glow)"
      >
        <text
          x="250"
          y="32"
          style={{
            transformOrigin: "250px 32px",
            transform: `rotate(${-angle}deg)`,
            transition: "transform 1.2s cubic-bezier(0.25, 1, 0.2, 1)",
          }}
        >
          N
        </text>
        <text
          x="468"
          y="254"
          style={{
            transformOrigin: "468px 254px",
            transform: `rotate(${-angle}deg)`,
            transition: "transform 1.2s cubic-bezier(0.25, 1, 0.2, 1)",
          }}
        >
          E
        </text>
        <text
          x="250"
          y="472"
          style={{
            transformOrigin: "250px 472px",
            transform: `rotate(${-angle}deg)`,
            transition: "transform 1.2s cubic-bezier(0.25, 1, 0.2, 1)",
          }}
        >
          S
        </text>
        <text
          x="32"
          y="254"
          style={{
            transformOrigin: "32px 254px",
            transform: `rotate(${-angle}deg)`,
            transition: "transform 1.2s cubic-bezier(0.25, 1, 0.2, 1)",
          }}
        >
          W
        </text>
      </g>
    </svg>
  );
}
