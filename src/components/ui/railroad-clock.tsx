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
  onPointerCancel: (id: SlotId, pointerId: number) => void;
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
  onPointerCancel,
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

  // Glow / inset style:
  // - chord-pending: strong pink glow (pulse already handled by fill color)
  // - active: inset shadow (pressed-in look) via SVG filter + subtle glow
  // - enabled: soft ambient glow
  const glowStyle: React.CSSProperties | undefined = isChordPending
    ? { filter: "drop-shadow(0 0 10px rgba(236,72,153,0.95))" }
    : isActive
      ? { filter: "url(#rc-slot-inset) drop-shadow(0 0 6px rgba(168,85,247,0.7))" }
      : isEnabled
        ? { filter: "drop-shadow(0 0 4px rgba(124,58,237,0.5))" }
        : undefined;

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG does not support <button>; role="button" on <g> is the correct ARIA pattern for SVG interactive elements.
    <g
      role="button"
      aria-label={label.replaceAll("\n", " ")}
      aria-disabled={!isEnabled}
      tabIndex={isEnabled ? 0 : -1}
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
      onPointerCancel={(e) => {
        onPointerCancel(id, e.pointerId);
      }}
      onLostPointerCapture={(e) => {
        onPointerCancel(id, e.pointerId);
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
  //
  // pressMap removed — it was tracked but never read; chord state is
  // entirely captured by firstPress/chordFired/chordTimer.
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPress = useRef<{ pointerId: number; slotId: SlotId } | null>(null);
  const chordFired = useRef(false);

  const clearChordState = useCallback(() => {
    if (chordTimer.current) {
      clearTimeout(chordTimer.current);
      chordTimer.current = null;
    }
    firstPress.current = null;
    chordFired.current = false;
  }, []);

  const clearChordTimer = useCallback(() => {
    if (chordTimer.current) {
      clearTimeout(chordTimer.current);
      chordTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (slotId: SlotId, pointerId: number) => {
      if (!firstPress.current) {
        // First press — open chord window, light this slot pink.
        chordFired.current = false;
        firstPress.current = { pointerId, slotId };
        setPendingChordSlot(slotId);
        clearChordTimer();
        chordTimer.current = setTimeout(() => {
          // Window expired: reset to single-tap mode so a late second press
          // is NOT treated as a chord. The pink glow stays until pointer-up
          // fires the tap (consistent with documented behavior).
          chordTimer.current = null;
          firstPress.current = null;
          chordFired.current = false;
          setPendingChordSlot(null);
        }, CHORD_WINDOW_MS);
      } else {
        // Second press — only fire chord if window is still open (timer still running).
        const other = firstPress.current;
        if (other.slotId !== slotId && chordTimer.current !== null) {
          clearChordTimer();
          chordFired.current = true;
          firstPress.current = null;
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
        clearChordTimer();
        firstPress.current = null;
        chordFired.current = false;
        setPendingChordSlot(null);
      }
    },
    [clearChordTimer, onCommit]
  );

  /** Cancel / lost-capture: reset all chord state so next interaction is clean. */
  const handlePointerCancel = useCallback(
    (_slotId: SlotId, _pointerId: number) => {
      clearChordState();
      setPendingChordSlot(null);
    },
    [clearChordState]
  );

  useEffect(() => {
    return () => clearChordState();
  }, [clearChordState]);

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

        {/* Brushed-silver bezel ring — stronger contrast, top-left highlight */}
        <linearGradient id="rc-bezel-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0f4f8" />
          <stop offset="12%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#8a93a4" />
          <stop offset="50%" stopColor="#252d3a" />
          <stop offset="72%" stopColor="#7a8392" />
          <stop offset="88%" stopColor="#9aa3b2" />
          <stop offset="100%" stopColor="#dde3eb" />
        </linearGradient>

        {/* Polished edge highlight ring gradient — bright top-left, dark bottom-right */}
        <linearGradient id="rc-bezel-highlight" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0.2)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </linearGradient>

        {/* Dial background — recessed radial */}
        <radialGradient id="rc-dial-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1a0526" />
          <stop offset="100%" stopColor="#050108" />
        </radialGradient>

        {/* Dial ambient-occlusion ring — darkens the dial perimeter to sell depth */}
        <radialGradient id="rc-dial-ao" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="70%" stopColor="transparent" />
          <stop offset="88%" stopColor="rgba(0,0,0,0.45)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
        </radialGradient>

        {/* Hub jewel radial gradient — bright rim annulus, dark recessed centre */}
        <radialGradient id="rc-hub-jewel" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#8090a8" />
          <stop offset="30%" stopColor="#c8d4e0" />
          <stop offset="55%" stopColor="#4a5568" />
          <stop offset="80%" stopColor="#1a1f2a" />
          <stop offset="100%" stopColor="#0a0d14" />
        </radialGradient>

        {/* Hub depth filter — drop shadow + inner rim-light highlight */}
        <filter id="rc-hub-depth" x="-80%" y="-80%" width="260%" height="260%">
          {/* Outer drop shadow — hub sits proud of the dial */}
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="4"
            floodColor="#000"
            floodOpacity="0.85"
            result="drop"
          />
          {/* Inner rim-light: blur alpha, offset toward top-left, clip inside shape */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="hub-blur" />
          <feOffset in="hub-blur" dx="-1" dy="-2" result="hub-offset" />
          <feComposite in="hub-offset" in2="SourceAlpha" operator="in" result="hub-inner" />
          <feFlood floodColor="rgba(200,212,224,0.6)" result="hub-light" />
          <feComposite in="hub-light" in2="hub-inner" operator="in" result="hub-rim" />
          <feMerge>
            <feMergeNode in="drop" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="hub-rim" />
          </feMerge>
        </filter>

        {/* Silver glow filter for major ticks */}
        <filter id="rc-silver-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Hand drop shadow — bumped intensity for clear elevation over dial */}
        <filter id="rc-hand-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="2" dy="12" stdDeviation="8" floodColor="#000" floodOpacity="0.95" />
        </filter>

        {/* Slot inset shadow — pressed-in appearance for active slots */}
        <filter id="rc-slot-inset" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="slot-blur" />
          <feOffset in="slot-blur" dx="0" dy="3" result="slot-offset" />
          <feComposite in="slot-offset" in2="SourceAlpha" operator="in" result="slot-inner" />
          <feFlood floodColor="rgba(0,0,0,0.7)" result="slot-shadow-color" />
          <feComposite
            in="slot-shadow-color"
            in2="slot-inner"
            operator="in"
            result="slot-colored"
          />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="slot-colored" />
          </feMerge>
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
      {/* Outer rim catch light — thin bright arc at very edge */}
      <circle cx={CX} cy={CY} r={247} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
      {/* Polished highlight inner edge — bright top-left, dark bottom-right */}
      <circle
        cx={CX}
        cy={CY}
        r={240}
        fill="none"
        stroke="url(#rc-bezel-highlight)"
        strokeWidth={3}
      />
      {/* Case-edge silver stroke */}
      <circle cx={CX} cy={CY} r={238} fill="none" stroke="url(#rc-silver)" strokeWidth={1.5} />

      {/* ── Dial background (recessed, radial gradient) ── */}
      <circle cx={CX} cy={CY} r={236} fill="url(#rc-dial-bg)" filter="url(#rc-dial-depth)" />
      {/* Ambient occlusion overlay — darkens perimeter to read as inset/recessed */}
      <circle cx={CX} cy={CY} r={236} fill="url(#rc-dial-ao)" style={{ pointerEvents: "none" }} />
      {/* Shadow arc — top-left light source casts shadow on lower-right dial rim */}
      <circle
        cx={CX}
        cy={CY}
        r={230}
        fill="none"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={10}
        strokeDasharray="450 1000"
        strokeDashoffset={-100}
        style={{ pointerEvents: "none" }}
        opacity={0.65}
      />
      {/* Highlight arc — bright rim catch on the upper-left dial edge */}
      <circle
        cx={CX}
        cy={CY}
        r={235}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={3}
        strokeDasharray="280 1000"
        strokeDashoffset={-480}
        style={{ pointerEvents: "none" }}
      />

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
            onPointerCancel={handlePointerCancel}
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
            onPointerCancel={handlePointerCancel}
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

      {/* ── Centre hub (pivot cap — jewel-like recessed cap with depth) ── */}
      <g filter="url(#rc-hub-depth)">
        {/* Outer silver rim — raised ring that forms the cap edge */}
        <circle cx={CX} cy={CY} r={11} fill="url(#rc-silver)" />
        {/* Jewel face — radial gradient simulates concave faceted gem surface */}
        <circle cx={CX} cy={CY} r={10} fill="url(#rc-hub-jewel)" />
        {/* Dark recessed centre well */}
        <circle cx={CX} cy={CY} r={4.5} fill="#04060c" />
        {/* Specular highlight — off-centre to reinforce top-left light source */}
        <circle cx={CX - 1.5} cy={CY - 2} r={1.8} fill="rgba(255,255,255,0.75)" />
        {/* Violet iris point */}
        <circle cx={CX} cy={CY} r={1} fill="#c4b5fd" />
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
