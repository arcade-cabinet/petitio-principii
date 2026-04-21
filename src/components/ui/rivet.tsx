/**
 * Rivet — a small silver polished disc used as a chassis fastener.
 *
 * Rendered entirely with CSS gradients + inset shadows. A faint pink rim
 * picks up the game's pink accent so rivets read as part of the same
 * surface as the keycap LEDs and hint chevron.
 *
 * Pure visual element. Not interactive, no focus ring.
 *
 * Palette notes (from 21st.dev's MetalButton + RetroButton references):
 *   - White top-left speculum (pressed metal)
 *   - Neutral mid tone body (#9ba0aa / #3a3e46 gradient)
 *   - Black rim shadow for depth
 *   - A soft pink ring at the outer edge so the rivet's presence picks up
 *     the nebula glow from the scene.
 */
export function Rivet({
  size = 12,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 30% 30%, #ffffff 0%, #c0c5cc 18%, #6c7280 55%, #2a2d32 100%)",
        boxShadow: [
          // outer rim shadow for depth
          "0 1px 2px rgba(0,0,0,0.85)",
          // inset speculum highlight
          "inset 0.5px 0.5px 0.5px rgba(255,255,255,0.85)",
          // inset lower shadow so the head reads domed
          "inset -0.5px -0.5px 0.5px rgba(0,0,0,0.6)",
          // faint pink ambient — picks up the scene's nebula
          "0 0 3px rgba(255,209,250,0.35)",
        ].join(", "),
      }}
    />
  );
}
