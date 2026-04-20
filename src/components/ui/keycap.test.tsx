import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KeyCap } from "./keycap";

/**
 * T64 — KeyCap visual upgrade.
 *
 * Per docs/UX.md §1.3, the three emphasis levels must be visually distinct
 * at arm's length on a phone screen:
 *
 *   - calm    — opacity-only signal of "available but not useful here."
 *   - charged — full opacity + violet outer glow.
 *   - primary — full opacity + violet glow + inner-pink tint + pulse ring.
 *
 * These tests pin the data-emphasis attribute (so callers can target each
 * level for screenshots / a11y queries), and assert that the class signature
 * each level applies is structurally distinct — primary has the gradient
 * `before:` overlay; charged has the `0_0_10px` violet glow but not the
 * pink one; calm has neither.
 */

function pressFn() {
  return vi.fn();
}

describe("KeyCap emphasis visuals (T64)", () => {
  it("calm: opacity-only, no extra glow box-shadow", () => {
    render(<KeyCap label="L" variant="verb" emphasis="calm" onPress={pressFn()} />);
    const btn = screen.getByRole("button", { name: "L" });
    expect(btn).toHaveAttribute("data-emphasis", "calm");
    // calm class signature: opacity-55, no box-shadow override.
    expect(btn.className).toMatch(/opacity-55/);
    expect(btn.className).not.toMatch(/0_0_10px_rgba\(122,92,255/); // no charged glow
    expect(btn.className).not.toMatch(/before:bg-gradient/); // no primary tint
  });

  it("charged: full opacity + violet outer glow, no pink overlay", () => {
    render(<KeyCap label="X" variant="verb" emphasis="charged" onPress={pressFn()} />);
    const btn = screen.getByRole("button", { name: "X" });
    expect(btn).toHaveAttribute("data-emphasis", "charged");
    expect(btn.className).toMatch(/opacity-95/);
    expect(btn.className).toMatch(/0_0_10px_rgba\(122,92,255/); // violet glow
    expect(btn.className).not.toMatch(/before:bg-gradient/); // no primary pink tint
    expect(btn.className).not.toMatch(/animation:pulse-violet/); // no pulse ring
  });

  it("primary: pink glow + gradient overlay + pulse ring", () => {
    render(<KeyCap label="A" variant="verb" emphasis="primary" onPress={pressFn()} />);
    const btn = screen.getByRole("button", { name: "A" });
    expect(btn).toHaveAttribute("data-emphasis", "primary");
    expect(btn.className).toMatch(/opacity-100/);
    expect(btn.className).toMatch(/ring-1/);
    expect(btn.className).toMatch(/ring-\[var\(--color-violet\)\]/);
    expect(btn.className).toMatch(/0_0_18px_rgba\(255,209,250/); // pink glow
    expect(btn.className).toMatch(/before:bg-gradient-to-b/); // pink tint overlay
    expect(btn.className).toMatch(/animation:pulse-violet/); // pulse ring
  });

  it("default emphasis is 'charged' (back-compat for unspecified call sites)", () => {
    render(<KeyCap label="Q" variant="verb" onPress={pressFn()} />);
    const btn = screen.getByRole("button", { name: "Q" });
    expect(btn).toHaveAttribute("data-emphasis", "charged");
  });

  it("disabled key drops emphasis treatment to opacity-40 universal dim", () => {
    render(
      <KeyCap label="N" variant="direction" emphasis="primary" disabled onPress={pressFn()} />
    );
    const btn = screen.getByRole("button", { name: "N" });
    // Primary's pulse + tint shouldn't apply when disabled — we want
    // disabled silhouettes to look uniformly inert regardless of what
    // emphasis the layout would have given them.
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/opacity-40/);
    expect(btn.className).not.toMatch(/animation:pulse-violet/);
  });

  it("traversed direction key gets the trailing-glow shadow (silhouette + pink hint)", () => {
    render(
      <KeyCap label="N" variant="direction" emphasis="charged" traversed onPress={pressFn()} />
    );
    const btn = screen.getByRole("button", { name: "N" });
    expect(btn.className).toMatch(/0_0_8px_rgba\(255,209,250,0\.25\)/);
  });

  it("data-variant tag is exposed for downstream queries (visual regression, a11y audits)", () => {
    render(<KeyCap label="N" variant="direction" onPress={pressFn()} />);
    expect(screen.getByRole("button", { name: "N" })).toHaveAttribute("data-variant", "direction");
  });
});
