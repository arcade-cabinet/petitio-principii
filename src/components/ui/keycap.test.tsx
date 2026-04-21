import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KeyCap } from "./keycap";

/**
 * T64 — KeyCap emphasis contract.
 *
 * Per docs/UX.md §1.3 the three emphasis levels (calm / charged / primary)
 * must be visually distinct at arm's length on a phone screen. The visual
 * fidelity is verified by T69's viewport screenshot suite — pixel-level
 * confidence belongs there.
 *
 * These tests lock in the public *contract* the component publishes:
 *
 *   - data-emphasis attribute reflects the prop (downstream test queries +
 *     visual-regression rely on this).
 *   - data-variant attribute reflects the variant prop.
 *   - The pulse-violet animation is the load-bearing primary-only signal;
 *     calm and charged must not have it; disabled never has it.
 *
 * Per CodeRabbit's nit on the prior version, we don't grep the exact
 * Tailwind class serialization (e.g. `0_0_10px_rgba(122,92,255,...)`) —
 * that's implementation-defined and rotates between Tailwind versions.
 * Class assertions are limited to one stable signal: the pulse animation.
 */

function pressFn() {
  return vi.fn();
}

describe("KeyCap emphasis (T64)", () => {
  it("calm: data-emphasis=calm, no pulse animation", () => {
    render(<KeyCap label="L" variant="verb" emphasis="calm" onPress={pressFn()} />);
    const btn = screen.getByRole("button", { name: "L" });
    expect(btn).toHaveAttribute("data-emphasis", "calm");
    expect(btn.className).not.toMatch(/pulse-violet/);
  });

  it("charged: data-emphasis=charged, no pulse animation", () => {
    render(<KeyCap label="X" variant="verb" emphasis="charged" onPress={pressFn()} />);
    const btn = screen.getByRole("button", { name: "X" });
    expect(btn).toHaveAttribute("data-emphasis", "charged");
    expect(btn.className).not.toMatch(/pulse-violet/);
  });

  it("primary: data-emphasis=primary AND pulse animation present", () => {
    render(<KeyCap label="A" variant="verb" emphasis="primary" onPress={pressFn()} />);
    const btn = screen.getByRole("button", { name: "A" });
    expect(btn).toHaveAttribute("data-emphasis", "primary");
    // pulse-violet is the documented primary-only treatment per
    // docs/UX.md §1.3 — losing it would break the "tap this next" signal.
    expect(btn.className).toMatch(/pulse-violet/);
  });

  it("default emphasis is 'charged' (back-compat for unspecified call sites)", () => {
    render(<KeyCap label="Q" variant="verb" onPress={pressFn()} />);
    expect(screen.getByRole("button", { name: "Q" })).toHaveAttribute("data-emphasis", "charged");
  });

  it("disabled drops emphasis treatment uniformly (no primary pulse)", () => {
    render(
      <KeyCap label="N" variant="direction" emphasis="primary" disabled onPress={pressFn()} />
    );
    const btn = screen.getByRole("button", { name: "N" });
    expect(btn).toBeDisabled();
    // Disabled silhouettes never animate, regardless of what emphasis the
    // layout function would have assigned them.
    expect(btn.className).not.toMatch(/pulse-violet/);
  });

  it("traversed direction key sets data-variant=direction", () => {
    render(
      <KeyCap label="N" variant="direction" emphasis="charged" traversed onPress={pressFn()} />
    );
    expect(screen.getByRole("button", { name: "N" })).toHaveAttribute("data-variant", "direction");
  });

  it("data-variant tag is exposed for downstream queries", () => {
    render(<KeyCap label="N" variant="direction" onPress={pressFn()} />);
    expect(screen.getByRole("button", { name: "N" })).toHaveAttribute("data-variant", "direction");
  });
});
