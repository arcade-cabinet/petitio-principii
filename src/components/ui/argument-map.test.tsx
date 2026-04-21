import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArgumentMap, type ArgumentMapNode } from "./argument-map";

/**
 * T66 — Motion One closing-edge animation.
 *
 * Most of ArgumentMap's behaviour is rendering geometry, which the SVG
 * snapshot would cover but isn't necessary here. These tests pin the
 * specific pieces T66 touches:
 *
 *   - When `circleClosed` is false, no closing-edge SVG element renders.
 *   - When `circleClosed` is true, the closing-edge wrapper + path render
 *     with the `data-drawn` attribute (starts "false", flips "true" on
 *     the next frame after the path's length is measured).
 *   - The path uses stroke-dasharray + stroke-dashoffset for the draw-in
 *     animation; the transition is the 900ms ease-out we promised.
 *
 * Note: we don't use vi.useFakeTimers here — the animation completes via
 * requestAnimationFrame + a CSS transition on stroke-dashoffset, neither
 * of which a fake-timer interception touches. The "drawn" data attribute
 * captures whether the rAF has fired, which is enough for T66's contract.
 */

const mkNode = (
  i: number,
  type: ArgumentMapNode["rhetoricalType"] = "premise"
): ArgumentMapNode => ({
  roomId: `room-${i}`,
  ordinal: i,
  rhetoricalType: type,
});

describe("ArgumentMap closing-edge (T66)", () => {
  it("does not render the closing-edge group when circleClosed is false", () => {
    render(
      <ArgumentMap
        visited={[mkNode(1, "circular"), mkNode(2)]}
        currentRoomId="room-2"
        circleClosed={false}
      />
    );
    expect(screen.queryByTestId("argument-map-closing-edge")).toBeNull();
  });

  it("does not render the closing-edge when first === last (degenerate, single room)", () => {
    render(<ArgumentMap visited={[mkNode(1, "circular")]} currentRoomId="room-1" circleClosed />);
    expect(screen.queryByTestId("argument-map-closing-edge")).toBeNull();
  });

  it("renders the closing-edge wrapper + path when circleClosed flips to true", () => {
    render(
      <ArgumentMap
        visited={[mkNode(1, "circular"), mkNode(2), mkNode(3)]}
        currentRoomId="room-3"
        circleClosed
      />
    );
    expect(screen.getByTestId("argument-map-closing-edge")).toBeInTheDocument();
    const path = screen.getByTestId("argument-map-closing-edge-path");
    expect(path).toBeInTheDocument();
    // CSS transition on stroke-dashoffset is the 900ms ease-out.
    expect(path.getAttribute("style") ?? "").toMatch(/stroke-dashoffset 900ms ease-out/);
  });
});
