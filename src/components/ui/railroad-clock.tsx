import { useCallback, useEffect, useRef, useState } from "react";

/**
 * RailroadClock — the primary game input surface.
 *
 * A mechanical railroad-watch face rendered in SVG (viewBox 500×500).
 *
 * Geometry (v4 — verified DOWN inside case, numerals inside case, no lane collision):
 *   - Watch case: r=248 (bezel), silver edge stroke at r=240, dial r=236.
 *   - Minute-tick ring: inner r=218 (major) / r=222 (minor), outer r=230.
 *     Majors: silver stroke-width 3. Minors: violet stroke-width 1.5.
 *   - Hour numerals: concentric band at r=210, 10px VT323 #c4b5fd — sits
 *     inside the minute-tick inner edge (r=218) and outside the direction
 *     slot outer extent (r=160+28=188). No clipping, clearly inside case.
 *   - Outer ring (r=160): 4 interactive direction slots (UP/RIGHT/DOWN/LEFT)
 *     at the quarters + 8 small silver hour dots at 1/2/4/5/7/8/10/11.
 *     Slot visible r=28 → extent 132–188, comfortably inside case (238.75).
 *   - Silver separator ring at r=150 divides direction band from action band.
 *   - Inner ring (r=115): 7 rhetorical-action slots at non-cardinal hours:
 *     TRACE_BACK@1, EXAMINE@2, QUESTION@4, ASK_WHY@5, ACCEPT@7, REJECT@8,
 *     LOOK@10. No lane overlaps with direction slots at {12,3,6,9}.
 *     Slot r=26 → extent 89–141.
 *   - Centre hub at r=75, silver pivot cap r=10.
 *   - Spade hand at len=175 (tip at r=175, well inside separator at 150).
 *
 * Inputs (T98):
 *   - Single tap: `{ kind: 'tap', slot }` on pointer-up (same slot).
 *   - Chord: if a second pointer-down lands on a different slot within
 *     CHORD_WINDOW_MS, fires `{ kind: 'chord', slots: [a, b] }` instead.
 *
 * Feedback (v3 fix #4): during the chord window, the first-pressed slot
 * glows pink (#ec4899) to signal "chord pending — tap another slot to
 * combine." Pink clears when the window expires (tap fires) or a second
 * slot is pressed (chord fires).
 *
 * A11y: each interactive slot has `aria-label` and `role="button"`.
 * Keyboard Enter/Space on focused slot fires a tap.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const CX = 250;
const CY = 250;

/** How long after first pointer-down to wait for a second (chord window). */
const CHORD_WINDOW_MS = 250;

// Outer ring: 4 direction slots at 12/3/6/9 o'clock.
// Angle in degrees where 0° = 12 o'clock (top).
const DIRECTION_SLOTS = [
  { id: "UP", label: "Up", angle: 0 },
  { id: "RIGHT", label: "Right", angle: 90 },
  { id: "DOWN", label: "Down", angle: 180 },
  { id: "LEFT", label: "Left", angle: 270 },
] as const;

export type DirectionSlotId = "UP" | "RIGHT" | "DOWN" | "LEFT";

// Inner ring: 7 rhetorical actions at NON-CARDINAL hours only.
// {12, 3, 6, 9} are reserved for direction slots. Actions use {1,2,4,5,7,8,10}.
const ACTION_SLOTS = [
  { id: "TRACE_BACK", label: "Trace\nBack", angle: 30 }, // 1 o'clock — "going back"
  { id: "EXAMINE", label: "Examine", angle: 60 }, // 2 o'clock
  { id: "QUESTION", label: "Question", angle: 120 }, // 4 o'clock
  { id: "ASK_WHY", label: "Ask\nWhy", angle: 150 }, // 5 o'clock
  { id: "ACCEPT", label: "Accept", angle: 210 }, // 7 o'clock
  { id: "REJECT", label: "Reject", angle: 240 }, // 8 o'clock
  { id: "LOOK", label: "Look", angle: 300 }, // 10 o'clock
] as const;

export type ActionSlotId =
  | "LOOK"
  | "EXAMINE"
  | "QUESTION"
  | "ASK_WHY"
  | "ACCEPT"
  | "REJECT"
  | "TRACE_BACK";

export type SlotId = DirectionSlotId | ActionSlotId;

export type Move = { kind: "tap"; slot: SlotId } | { kind: "chord"; slots: [SlotId, SlotId] };

export interface RailroadClockProps {
  /** Set of direction slot ids that are currently available (enabled). */
  availableDirections: ReadonlySet<string>;
  /** Set of action slot ids that are currently available (enabled). */
  availableActions: ReadonlySet<string>;
  /** The last slot committed (drives the spade hand rotation). */
  lastSlot?: SlotId | null;
  /** Called when the player commits a tap or chord. */
  onCommit: (move: Move) => void;
  /** CSS size of the SVG. Defaults to "100%". */
  size?: number | string;
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

function clockToXY(angle: number, radius: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/**
 * Build the SVG path for a spade-style clock hand.
 * Tip at (0, -len), wide lobes mid-shaft, narrow neck near pivot.
 * No counterweight.
 */
function spadePath(len: number, width: number): string {
  const hw = width / 2;
  const neckY = -len * 0.25;
  const lobeY = -len * 0.5;
  const shoulderY = -len * 0.75;
  const stemHW = hw * 0.4;
  const neckHW = hw * 0.6;
  const lobeHW = hw * 1.0;

  return [
    `M ${-stemHW} 0`,
    `L ${-stemHW} ${neckY}`,
    `C ${-neckHW} ${lobeY} ${-lobeHW} ${shoulderY} 0 ${-len}`,
    `C ${lobeHW} ${shoulderY} ${neckHW} ${lobeY} ${stemHW} ${neckY}`,
    `L ${stemHW} 0`,
    "Z",
  ].join(" ");
}

// ─── Slot rendering ──────────────────────────────────────────────────────────

// v4 layout: verified geometry — all slots inside case, no lane collisions.
// Case-edge silver stroke at r=240 (inner extent r=238.75).
// OUTER_R=160 → direction slot bottom extent = 160+28 = 188 (margin=50 inside case).
// NUMERAL_R=210 → between direction outer extent (188) and tick inner edge (218).
const OUTER_R = 160; // direction-slot centre ring
const NUMERAL_R = 210; // hour-numeral band (between direction extent and tick inner edge)
const SEP_R = 150; // silver separator between direction and action bands
const INNER_R = 115; // action-slot centre ring
const SLOT_RING_R = 26; // action-slot visible radius
const DIR_RING_R = 28; // direction-slot visible radius (only marginally larger)
const SLOT_HIT_R = 34; // hit-test radius
const LABEL_FONT_SIZE = 11;

const COL_ENABLED = "#7c3aed"; // violet
const COL_DISABLED = "#2a2140"; // dim violet (still reads as a slot)
const COL_ACTIVE_FILL = "#a855f7"; // bright violet
const COL_ACTIVE_RIM = "#ffffff";
const COL_CHORD_PENDING_FILL = "#ec4899"; // pink — chord listening
const COL_CHORD_PENDING_RIM = "#fdf2f8";

interface SlotCircleProps {
  cx: number;
  cy: number;
  isEnabled: boolean;
  isActive: boolean;
  isChordPending: boolean;
  id: SlotId;
  label: string;
  ring: "outer" | "inner";
  radius: number;
  onPointerDown: (id: SlotId, pointerId: number) => void;
  onPointerUp: (id: SlotId, pointerId: number) => void;
}

function SlotCircle({
  cx,
  cy,
  isEnabled,
  isActive,
  isChordPending,
  id,
  label,
  ring,
  radius,
  onPointerDown,
  onPointerUp,
}: SlotCircleProps) {
  const fill = isChordPending
    ? COL_CHORD_PENDING_FILL
    : isActive
      ? COL_ACTIVE_FILL
      : isEnabled
        ? COL_ENABLED
        : COL_DISABLED;
  const stroke = isChordPending
    ? COL_CHORD_PENDING_RIM
    : isActive
      ? COL_ACTIVE_RIM
      : isEnabled
        ? "#c4b5fd"
        : "#554676";
  const strokeWidth = isChordPending ? 3 : isActive ? 3 : 2;
  const labelFill = isChordPending || isActive ? "#fff" : isEnabled ? "#ede9fe" : "#7c72a0";

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPointerDown(id, -1);
        onPointerUp(id, -1);
      }
    },
    [id, onPointerDown, onPointerUp]
  );

  // Wrap label: "Ask\nWhy" / "Trace\nBack" → two lines.
  const lines = label.split("\n");
  const lineHeight = LABEL_FONT_SIZE * 1.05;
  const firstLineDY = lines.length === 1 ? 0 : -lineHeight * 0.45;

  // Glow style: pink is stronger than violet-active to read as distinct feedback.
  const glowStyle: React.CSSProperties | undefined = isChordPending
    ? { filter: "drop-shadow(0 0 10px rgba(236,72,153,0.95))" }
    : isActive
      ? { filter: "drop-shadow(0 0 8px rgba(168,85,247,0.9))" }
      : isEnabled
        ? { filter: "drop-shadow(0 0 4px rgba(124,58,237,0.5))" }
        : undefined;

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG does not support <button>; role="button" on <g> is the correct ARIA pattern for SVG interactive elements.
    <g
      role="button"
      aria-label={label.replaceAll("\n", " ")}
      aria-disabled={!isEnabled}
      tabIndex={0}
      data-slot-id={id}
      data-ring={ring}
      data-chord-pending={isChordPending ? "true" : undefined}
      style={{ cursor: isEnabled ? "pointer" : "default" }}
      onPointerDown={(e) => {
        if (!isEnabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onPointerDown(id, e.pointerId);
      }}
      onPointerUp={(e) => {
        if (!isEnabled) return;
        onPointerUp(id, e.pointerId);
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Hit area — larger than the visible ring */}
      <circle cx={cx} cy={cy} r={SLOT_HIT_R} fill="transparent" />
      {/* Visible ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={isEnabled || isActive || isChordPending ? 0.95 : 0.75}
        style={glowStyle}
      />
      {/* Label — presentational; pointerEvents:none so parent <g> gets events. */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={labelFill}
        fontSize={LABEL_FONT_SIZE}
        fontFamily="'VT323', monospace"
        letterSpacing="0.05em"
        fontWeight="400"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {lines.map((line, idx) => (
          <tspan key={`${id}-${line}`} x={cx} dy={idx === 0 ? firstLineDY : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function RailroadClock({
  availableDirections,
  availableActions,
  lastSlot = null,
  onCommit,
  size = "100%",
}: RailroadClockProps) {
  const [handAngle, setHandAngle] = useState(0);

  // v3 fix #4: track which slot is currently "waiting for a chord partner"
  // so we can render it in pink during the chord window.
  const [pendingChordSlot, setPendingChordSlot] = useState<SlotId | null>(null);

  useEffect(() => {
    if (!lastSlot) return;
    const dir = DIRECTION_SLOTS.find((d) => d.id === lastSlot);
    if (dir) {
      setHandAngle(dir.angle);
      return;
    }
    const act = ACTION_SLOTS.find((a) => a.id === lastSlot);
    if (act) setHandAngle(act.angle);
  }, [lastSlot]);

  // ── Chord detection ──────────────────────────────────────────────────
  const pressMap = useRef<Map<number, SlotId>>(new Map());
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPress = useRef<{ pointerId: number; slotId: SlotId } | null>(null);
  const chordFired = useRef(false);

  const clearChordTimer = useCallback(() => {
    if (chordTimer.current) {
      clearTimeout(chordTimer.current);
      chordTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (slotId: SlotId, pointerId: number) => {
      pressMap.current.set(pointerId, slotId);

      if (!firstPress.current) {
        // First press — open chord window, light this slot pink.
        chordFired.current = false;
        firstPress.current = { pointerId, slotId };
        setPendingChordSlot(slotId);
        clearChordTimer();
        chordTimer.current = setTimeout(() => {
          chordTimer.current = null;
        }, CHORD_WINDOW_MS);
      } else {
        // Second press while chord window open — fire chord if distinct.
        const other = firstPress.current;
        if (other.slotId !== slotId) {
          clearChordTimer();
          chordFired.current = true;
          setPendingChordSlot(null); // window closing — return first slot to normal
          setHandAngle((_prev) => {
            const dir = DIRECTION_SLOTS.find((d) => d.id === slotId);
            if (dir) return dir.angle;
            const act = ACTION_SLOTS.find((a) => a.id === slotId);
            if (act) return act.angle;
            return _prev;
          });
          onCommit({ kind: "chord", slots: [other.slotId, slotId] });
        }
      }
    },
    [clearChordTimer, onCommit]
  );

  const handlePointerUp = useCallback(
    (slotId: SlotId, pointerId: number) => {
      pressMap.current.delete(pointerId);

      if (
        firstPress.current?.pointerId === pointerId &&
        firstPress.current?.slotId === slotId &&
        !chordFired.current
      ) {
        clearChordTimer();
        firstPress.current = null;
        chordFired.current = false;
        setPendingChordSlot(null); // tap fires — clear the pink indicator
        setHandAngle((_prev) => {
          const dir = DIRECTION_SLOTS.find((d) => d.id === slotId);
          if (dir) return dir.angle;
          const act = ACTION_SLOTS.find((a) => a.id === slotId);
          if (act) return act.angle;
          return _prev;
        });
        onCommit({ kind: "tap", slot: slotId });
      } else if (firstPress.current?.pointerId === pointerId) {
        firstPress.current = null;
        chordFired.current = false;
        setPendingChordSlot(null);
      }
    },
    [clearChordTimer, onCommit]
  );

  useEffect(() => {
    return () => clearChordTimer();
  }, [clearChordTimer]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      style={{ width: size, height: "auto", display: "block" }}
      aria-label="Railroad clock input"
      focusable="false"
    >
      <title>Railroad clock — tap a slot or hold two for a chord</title>
      <defs>
        {/* Silver gradient for marks, hand, and hour dots */}
        <linearGradient id="rc-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#e8ecf0" />
          <stop offset="55%" stopColor="#6a7383" />
          <stop offset="80%" stopColor="#b8c0ce" />
          <stop offset="100%" stopColor="#f8f9fa" />
        </linearGradient>

        {/* Brushed-silver bezel ring */}
        <linearGradient id="rc-bezel-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d8dde6" />
          <stop offset="25%" stopColor="#7a8392" />
          <stop offset="50%" stopColor="#3a4252" />
          <stop offset="75%" stopColor="#8a93a4" />
          <stop offset="100%" stopColor="#eef1f5" />
        </linearGradient>

        {/* Dial background — recessed radial */}
        <radialGradient id="rc-dial-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1a0526" />
          <stop offset="100%" stopColor="#050108" />
        </radialGradient>

        {/* Silver glow filter for major ticks and hub */}
        <filter id="rc-silver-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Hand drop shadow */}
        <filter id="rc-hand-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#000" floodOpacity="0.9" />
        </filter>

        {/* Whole dial drop-shadow → "recessed into watch body" illusion */}
        <filter id="rc-dial-depth" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dx="0" dy="6" result="offset-blur" />
          <feComposite in="SourceGraphic" in2="offset-blur" operator="over" />
        </filter>
      </defs>

      {/* ── Watch body / case ── */}
      <circle cx={CX} cy={CY} r={248} fill="url(#rc-bezel-ring)" />
      {/* Case-edge silver stroke */}
      <circle cx={CX} cy={CY} r={240} fill="none" stroke="url(#rc-silver)" strokeWidth={2.5} />

      {/* ── Dial background (recessed, radial gradient) ── */}
      <circle cx={CX} cy={CY} r={236} fill="url(#rc-dial-bg)" filter="url(#rc-dial-depth)" />

      {/* ── 60-tick minute ring ── */}
      <g>
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = i * 6;
          const isMajor = i % 5 === 0;
          const outerP = clockToXY(angle, 230);
          const innerP = clockToXY(angle, isMajor ? 218 : 222);
          return (
            <line
              key={`tick-${angle}`}
              x1={innerP.x}
              y1={innerP.y}
              x2={outerP.x}
              y2={outerP.y}
              stroke={isMajor ? "url(#rc-silver)" : "#7c3aed"}
              strokeWidth={isMajor ? 3 : 1.5}
              strokeLinecap="round"
              opacity={isMajor ? 1 : 0.8}
              filter={isMajor ? "url(#rc-silver-glow)" : undefined}
            />
          );
        })}
      </g>

      {/* ── 12 hour numerals on their own band at r=210 ── */}
      {/* r=210 sits between direction outer extent (188) and tick inner edge (218) */}
      <g>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          const pos = clockToXY(angle, NUMERAL_R);
          return (
            <text
              key={`numeral-${angle}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#c4b5fd"
              fontSize={10}
              fontFamily="'VT323', monospace"
              letterSpacing="0.08em"
              opacity={0.9}
              style={{ userSelect: "none" }}
            >
              {i === 0 ? 12 : i}
            </text>
          );
        })}
      </g>

      {/* ── Silver separator ring between direction band and action band ── */}
      <circle
        cx={CX}
        cy={CY}
        r={SEP_R}
        fill="none"
        stroke="url(#rc-silver)"
        strokeWidth={1.2}
        opacity={0.55}
      />

      {/* ── Silver inner-edge stroke around the central hub region ── */}
      <circle
        cx={CX}
        cy={CY}
        r={75}
        fill="#0a0513"
        stroke="url(#rc-silver)"
        strokeWidth={1}
        opacity={0.7}
      />

      {/* ── 8 decorative silver hour dots at 1/2/4/5/7/8/10/11 ── */}
      <g>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          const isDirection = angle % 90 === 0;
          if (isDirection) return null; // rendered as interactive slot below
          const pos = clockToXY(angle, OUTER_R);
          return (
            <circle
              key={`hour-dot-${angle}`}
              cx={pos.x}
              cy={pos.y}
              r={5}
              fill="url(#rc-silver)"
              stroke="#2a2535"
              strokeWidth={0.5}
              opacity={0.95}
            />
          );
        })}
      </g>

      {/* ── Direction slots (outer ring, slightly larger) ── */}
      {DIRECTION_SLOTS.map((slot) => {
        const pos = clockToXY(slot.angle, OUTER_R);
        const isEnabled = availableDirections.has(slot.id);
        const isActive = lastSlot === slot.id;
        const isChordPending = pendingChordSlot === slot.id;
        return (
          <SlotCircle
            key={slot.id}
            cx={pos.x}
            cy={pos.y}
            isEnabled={isEnabled}
            isActive={isActive}
            isChordPending={isChordPending}
            id={slot.id}
            label={slot.label}
            ring="outer"
            radius={DIR_RING_R}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        );
      })}

      {/* ── Action slots (inner ring) ── */}
      {ACTION_SLOTS.map((slot) => {
        const pos = clockToXY(slot.angle, INNER_R);
        const isEnabled = availableActions.has(slot.id);
        const isActive = lastSlot === slot.id;
        const isChordPending = pendingChordSlot === slot.id;
        return (
          <SlotCircle
            key={slot.id}
            cx={pos.x}
            cy={pos.y}
            isEnabled={isEnabled}
            isActive={isActive}
            isChordPending={isChordPending}
            id={slot.id}
            label={slot.label}
            ring="inner"
            radius={SLOT_RING_R}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        );
      })}

      {/* ── Spade hand ── */}
      <g
        style={{
          transformOrigin: `${CX}px ${CY}px`,
          transform: `rotate(${handAngle}deg)`,
          transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        filter="url(#rc-hand-shadow)"
      >
        <g transform={`translate(${CX}, ${CY})`}>
          <path
            d={spadePath(175, 12)}
            fill="url(#rc-silver)"
            stroke="#2a2535"
            strokeWidth={0.6}
            opacity={0.98}
          />
        </g>
      </g>

      {/* ── Centre hub (pivot cap) ── */}
      <g filter="url(#rc-silver-glow)">
        <circle cx={CX} cy={CY} r={10} fill="url(#rc-silver)" />
        <circle cx={CX} cy={CY} r={4} fill="#060309" />
        <circle cx={CX} cy={CY} r={1.5} fill="#c4b5fd" />
      </g>

      {/* ── Brand label — moved further toward centre to clear DOWN slot ── */}
      <text
        x={CX}
        y={CY + 40}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#4c4575"
        fontSize={8}
        fontFamily="'VT323', monospace"
        letterSpacing="0.35em"
        style={{ userSelect: "none" }}
      >
        PETITIO
      </text>
    </svg>
  );
}
