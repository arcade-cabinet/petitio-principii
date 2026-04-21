/**
 * HeroClock — the Victorian railway clock that crowns the landing screen.
 *
 * A station-clock motif: brushed-silver bezel, convex crystal, deep-violet
 * enamel dial, Roman numerals (IIII for 4, per clock-face convention) set
 * in Yesteryear, silver filigree pediment above, and a hung-from-the-ceiling
 * bracket. References Gents of Leicester, Smiths Enfield circa 1910 — the
 * English railway-station tradition — restyled in our purple/silver/black
 * palette.
 *
 * The clock is decorative, not interactive. The hands rest at 10:10 (the
 * classic watch-display angle that frames the maker's name without
 * obscuring it). A subtle breathing animation respects prefers-reduced-
 * motion.
 *
 * In a follow-up commit this component will gain a `melting` prop that
 * triggers the dissolve transition referenced by docs/VOICE.md
 * ("therefore the watch melts").
 */
import { motion, useReducedMotion } from "motion/react";

const VB = 600;
const CX = VB / 2;
const CY = 360; // dial center is below the pediment
const CASE_R = 220; // outer brushed-silver bezel
const BEZEL_INNER_R = 200; // inner edge of the bezel ring
const DIAL_R = 188; // violet enamel dial
const NUMERAL_R = 158; // Roman numerals band
const TICK_OUTER_R = 178;
const TICK_INNER_R = 168;
const HOUR_TICK_INNER_R = 162;
const HUB_R = 9;
const PEDIMENT_TOP_Y = 50;
const BRACKET_TOP_Y = 8;

const ROMAN: ReadonlyArray<string> = [
  "XII", // 12
  "I",
  "II",
  "III",
  "IIII", // 4 — clock-face convention, not "IV"
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
];

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + Math.cos(rad) * r, y: CY + Math.sin(rad) * r };
}

export interface HeroClockProps {
  /** Width — the clock auto-scales (height follows). Default 100% of parent. */
  readonly width?: string | number;
  /** A11y label override. */
  readonly ariaLabel?: string;
  /** Today's date (YYYY-MM-DD); rendered in the calendar window at 6 o'clock. */
  readonly today?: string;
  /** Current seed; rendered in the sub-dial near the hub. */
  readonly seed?: number;
  /**
   * When true, the clock dissolves with downward gravity, opacity fade,
   * and a slight rotation — the visual companion to the lore line
   * `*therefore the watch melts*` (docs/VOICE.md). Used for the
   * landing→game transition. Animation duration is ~1.4s; the parent is
   * responsible for unmounting the clock once the melt completes.
   */
  readonly melting?: boolean;
}

export function HeroClock({
  width = "100%",
  ariaLabel,
  today,
  seed,
  melting = false,
}: HeroClockProps) {
  const reducedMotion = useReducedMotion();

  // Hands at 10:10 — minute hand at 60° (toward "II"), hour hand at 305°
  // (toward "X" with slight offset for the 10:10 minute lean).
  const minuteAngle = 60;
  const hourAngle = 305;

  // 12 hour ticks (long, silver) + 48 minute ticks (short, dim).
  const hourTicks = Array.from({ length: 12 }).map((_, i) => i * 30);
  const minuteTicks = Array.from({ length: 60 })
    .map((_, i) => i * 6)
    .filter((a) => a % 30 !== 0);

  // Two animation modes: idle (slow breathe) and melting (one-shot dissolve).
  // The melting variants override the breathing scale and add downward
  // translation, opacity fade, rotation, and a slight horizontal skew that
  // sells the "softening" of the SVG geometry. Reduced-motion users get the
  // opacity fade only — no movement.
  const animateProps = melting
    ? reducedMotion
      ? { animate: { opacity: 0 }, transition: { duration: 0.6, ease: "easeIn" as const } }
      : {
          animate: {
            opacity: 0,
            y: 80,
            rotate: 8,
            scale: 0.95,
            skewX: 6,
            filter: "blur(4px)",
          },
          transition: { duration: 1.4, ease: [0.55, 0.04, 0.7, 0.95] as const },
        }
    : reducedMotion
      ? {}
      : {
          animate: { scale: [1, 1.005, 1] },
          transition: {
            duration: 6,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut" as const,
          },
        };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VB} ${VB}`}
      style={{ width, height: "auto", display: "block" }}
      aria-label={
        ariaLabel ?? "Petitio Principii — a Victorian station clock hung above the landing"
      }
      role="img"
      {...animateProps}
    >
      <defs>
        {/* Brushed-silver gradient for the bezel ring. */}
        <linearGradient id="hc-bezel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8f9fb" />
          <stop offset="18%" stopColor="#cfd4dc" />
          <stop offset="42%" stopColor="#7a8392" />
          <stop offset="62%" stopColor="#3a4252" />
          <stop offset="82%" stopColor="#a3acba" />
          <stop offset="100%" stopColor="#eef1f5" />
        </linearGradient>

        {/* Inner bezel highlight — picks up a top-left light source. */}
        <linearGradient id="hc-bezel-inner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#dde1ea" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#1a1f2c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0a0d14" stopOpacity="0.7" />
        </linearGradient>

        {/* Violet enamel dial — deep, slightly recessed center. */}
        <radialGradient id="hc-dial" cx="50%" cy="38%" r="68%">
          <stop offset="0%" stopColor="#2a1147" />
          <stop offset="55%" stopColor="#180828" />
          <stop offset="100%" stopColor="#080313" />
        </radialGradient>

        {/* Convex crystal highlight — a soft elliptical sheen top-left. */}
        <radialGradient id="hc-crystal" cx="32%" cy="22%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Spade hand silver. */}
        <linearGradient id="hc-hand" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5f7fa" />
          <stop offset="50%" stopColor="#9ba4b3" />
          <stop offset="100%" stopColor="#e8ecf0" />
        </linearGradient>

        {/* Hub jewel — small recessed cap where hands pivot. */}
        <radialGradient id="hc-hub" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#dfe5ee" />
          <stop offset="40%" stopColor="#7a8294" />
          <stop offset="80%" stopColor="#1a1f2c" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>

        {/* Bracket / pediment metal. */}
        <linearGradient id="hc-bracket" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#5a6373" />
          <stop offset="50%" stopColor="#9ca5b4" />
          <stop offset="100%" stopColor="#3a4252" />
        </linearGradient>

        {/* Drop shadow — clock hangs in front of the night sky. */}
        <filter id="hc-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
          <feOffset dx="0" dy="8" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.65" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Hand drop shadow. */}
        <filter id="hc-hand-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.7" />
        </filter>
      </defs>

      {/* ── Hung-from-the-ceiling bracket ── */}
      {/* A simple silver bar from the top of the SVG down to the pediment. */}
      <rect
        x={CX - 6}
        y={BRACKET_TOP_Y}
        width="12"
        height={PEDIMENT_TOP_Y - BRACKET_TOP_Y - 4}
        fill="url(#hc-bracket)"
        rx="2"
      />
      {/* Decorative cap where the bracket meets the ceiling. */}
      <ellipse cx={CX} cy={BRACKET_TOP_Y + 2} rx="22" ry="4" fill="url(#hc-bracket)" />

      {/* ── Pediment — silver filigree crown above the case ──
           A central trefoil cresting (Victorian acanthus shorthand) with
           two tapering fern-curls extending outward, flanking the bezel
           top. Sits as a thin metal crown, not a blob. */}
      <g transform={`translate(0, ${PEDIMENT_TOP_Y - 4})`}>
        {/* Central trefoil */}
        <path
          d={`
            M ${CX - 22} 60
            Q ${CX - 22} 38, ${CX - 8} 30
            Q ${CX} 18, ${CX + 8} 30
            Q ${CX + 22} 38, ${CX + 22} 60
            Q ${CX + 14} 70, ${CX} 64
            Q ${CX - 14} 70, ${CX - 22} 60
            Z
          `}
          fill="url(#hc-bezel)"
          stroke="#1a1f2c"
          strokeWidth="0.8"
        />
        {/* Tiny finial atop trefoil */}
        <circle cx={CX} cy={20} r={3} fill="url(#hc-bezel)" stroke="#1a1f2c" strokeWidth="0.5" />
        {/* Outward fern-curls — left and right of trefoil, sweeping down to bezel rim */}
        {[-1, 1].map((side) => (
          <path
            key={`curl-${side}`}
            d={`
              M ${CX + side * 22} 56
              C ${CX + side * 50} 56, ${CX + side * 70} 70, ${CX + side * 80} 86
              C ${CX + side * 90} 102, ${CX + side * 78} 116, ${CX + side * 60} 118
            `}
            fill="none"
            stroke="url(#hc-bezel)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}
        {/* Tiny acanthus dots along the curls */}
        {[-1, 1].map((side) =>
          [40, 56, 72].map((t) => (
            <circle
              key={`acanthus-${side}-${t}`}
              cx={CX + side * (22 + t)}
              cy={56 + t * 0.6}
              r={1.5}
              fill="#e8ecf0"
              opacity={0.85}
            />
          ))
        )}
      </g>

      {/* ── Outer brushed-silver bezel (the cast frame around the crystal) ── */}
      <g filter="url(#hc-drop-shadow)">
        <circle cx={CX} cy={CY} r={CASE_R} fill="url(#hc-bezel)" />
        {/* Inner bezel rim — picks up the top-left light. */}
        <circle
          cx={CX}
          cy={CY}
          r={(CASE_R + BEZEL_INNER_R) / 2}
          fill="none"
          stroke="url(#hc-bezel-inner)"
          strokeWidth={CASE_R - BEZEL_INNER_R}
        />
        {/* Sharp edges — top of bezel + dial-meeting line. */}
        <circle cx={CX} cy={CY} r={CASE_R} fill="none" stroke="#0a0d14" strokeWidth="0.8" />
        <circle cx={CX} cy={CY} r={BEZEL_INNER_R} fill="none" stroke="#0a0d14" strokeWidth="0.8" />
      </g>

      {/* ── Dial face — deep violet enamel ── */}
      <circle cx={CX} cy={CY} r={DIAL_R} fill="url(#hc-dial)" />

      {/* ── Tick marks ── */}
      {/* Hour ticks — long silver. */}
      {hourTicks.map((angle) => {
        const a = polar(angle, TICK_OUTER_R);
        const b = polar(angle, HOUR_TICK_INNER_R);
        return (
          <line
            key={`hour-tick-${angle}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="url(#hc-bezel)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        );
      })}
      {/* Minute ticks — short, dim violet. */}
      {minuteTicks.map((angle) => {
        const a = polar(angle, TICK_OUTER_R);
        const b = polar(angle, TICK_INNER_R);
        return (
          <line
            key={`min-tick-${angle}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#5a4a8a"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}

      {/* ── Roman numerals — Yesteryear, silver, hero scale ──
           Each numeral is rotated to stand upright at its clock position
           but its centerline is the radial. Solid silver fill (not the
           bezel gradient — its mid-stops were near-black and made the
           glyph centers vanish). */}
      {ROMAN.map((numeral, i) => {
        const angle = i * 30;
        const pos = polar(angle, NUMERAL_R);
        return (
          <text
            key={`numeral-${numeral}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#e8ecf0"
            fontSize={36}
            fontFamily="var(--font-incantation), 'Yesteryear', cursive"
            style={{
              userSelect: "none",
              filter: "drop-shadow(0 0 3px rgba(192,192,255,0.8))",
            }}
          >
            {numeral}
          </text>
        );
      })}

      {/* ── Engraved bezel ring — "PETITIO · PRINCIPII · MMXXVI" running
           around the inner bezel rim. textPath traces a circle just inside
           the bezel-inner edge so the engraving sits on the metal, not
           on the dial. */}
      <defs>
        <path
          id="hc-bezel-path"
          d={`M ${CX} ${CY - (BEZEL_INNER_R - 6)} a ${BEZEL_INNER_R - 6} ${BEZEL_INNER_R - 6} 0 1 1 -0.01 0`}
        />
      </defs>
      <text
        fill="#9aa3b3"
        fontSize="9"
        fontFamily="var(--font-display), monospace"
        letterSpacing="0.32em"
        opacity="0.8"
        style={{ userSelect: "none" }}
      >
        <textPath href="#hc-bezel-path" startOffset="50%" textAnchor="middle">
          PETITIO · PRINCIPII · MMXXVI · QUOD · ERAT · DEMONSTRANDUM
        </textPath>
      </text>

      {/* ── Sub-dial (seconds-style register) at 9 o'clock — shows seed ── */}
      {seed !== undefined && (
        <g>
          {(() => {
            const sd = polar(270, 78);
            const SD_R = 28;
            return (
              <>
                <circle
                  cx={sd.x}
                  cy={sd.y}
                  r={SD_R}
                  fill="#0a0413"
                  stroke="url(#hc-bezel)"
                  strokeWidth="1.2"
                  opacity="0.95"
                />
                {/* Sub-dial tick marks (every 90°) */}
                {[0, 90, 180, 270].map((a) => {
                  const p1 = {
                    x: sd.x + Math.cos(((a - 90) * Math.PI) / 180) * (SD_R - 2),
                    y: sd.y + Math.sin(((a - 90) * Math.PI) / 180) * (SD_R - 2),
                  };
                  const p2 = {
                    x: sd.x + Math.cos(((a - 90) * Math.PI) / 180) * (SD_R - 6),
                    y: sd.y + Math.sin(((a - 90) * Math.PI) / 180) * (SD_R - 6),
                  };
                  return (
                    <line
                      key={`sd-tick-${a}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#9aa3b3"
                      strokeWidth="0.8"
                    />
                  );
                })}
                <text
                  x={sd.x}
                  y={sd.y - 8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#7a8294"
                  fontSize="5.5"
                  fontFamily="var(--font-display), monospace"
                  letterSpacing="0.2em"
                  style={{ userSelect: "none" }}
                >
                  SEED
                </text>
                <text
                  x={sd.x}
                  y={sd.y + 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#c4b5fd"
                  fontSize="9"
                  fontFamily="var(--font-display), monospace"
                  letterSpacing="0.05em"
                  style={{ userSelect: "none" }}
                >
                  {seed.toString(16).toUpperCase().slice(0, 6).padStart(6, "0")}
                </text>
              </>
            );
          })()}
        </g>
      )}

      {/* ── Calendar window at 3 o'clock — shows today's UTC date ── */}
      {today !== undefined && (
        <g>
          {(() => {
            const cw = polar(90, 80);
            return (
              <>
                <rect
                  x={cw.x - 24}
                  y={cw.y - 11}
                  width={48}
                  height={22}
                  rx="2"
                  fill="#0a0413"
                  stroke="url(#hc-bezel)"
                  strokeWidth="1.2"
                />
                <text
                  x={cw.x}
                  y={cw.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#e8ecf0"
                  fontSize="9.5"
                  fontFamily="var(--font-display), monospace"
                  letterSpacing="0.08em"
                  style={{ userSelect: "none" }}
                >
                  {today.slice(5)}
                </text>
              </>
            );
          })()}
        </g>
      )}

      {/* ── Maker's signature — small text below center, in the dial ── */}
      <text
        x={CX}
        y={CY + 70}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#9aa3b3"
        fontSize={9}
        fontFamily="var(--font-display), monospace"
        letterSpacing="0.3em"
        opacity="0.7"
        style={{ userSelect: "none" }}
      >
        PETITIO · PRINCIPII
      </text>

      {/* ── Hands ── */}
      {/* Hour hand — short, broad spade. */}
      <g transform={`rotate(${hourAngle} ${CX} ${CY})`} filter="url(#hc-hand-shadow)">
        <path
          d={`M ${CX} ${CY - 95} L ${CX - 4} ${CY - 88} L ${CX - 6} ${CY - 50} L ${CX - 4} ${CY + 30} L ${CX + 4} ${CY + 30} L ${CX + 6} ${CY - 50} L ${CX + 4} ${CY - 88} Z`}
          fill="url(#hc-hand)"
          stroke="#1a1f2c"
          strokeWidth="0.5"
        />
      </g>
      {/* Minute hand — long, slim spade. */}
      <g transform={`rotate(${minuteAngle} ${CX} ${CY})`} filter="url(#hc-hand-shadow)">
        <path
          d={`M ${CX} ${CY - 145} L ${CX - 3} ${CY - 135} L ${CX - 4} ${CY - 50} L ${CX - 3} ${CY + 35} L ${CX + 3} ${CY + 35} L ${CX + 4} ${CY - 50} L ${CX + 3} ${CY - 135} Z`}
          fill="url(#hc-hand)"
          stroke="#1a1f2c"
          strokeWidth="0.5"
        />
      </g>

      {/* ── Hub jewel ── */}
      <circle cx={CX} cy={CY} r={HUB_R + 2} fill="#0a0d14" />
      <circle cx={CX} cy={CY} r={HUB_R} fill="url(#hc-hub)" />
      <circle cx={CX - 2} cy={CY - 2} r={2} fill="#fff" opacity="0.6" />

      {/* ── Convex crystal sheen — last so it sits ON TOP of dial+hands ── */}
      <circle cx={CX} cy={CY} r={DIAL_R} fill="url(#hc-crystal)" pointerEvents="none" />
    </motion.svg>
  );
}
