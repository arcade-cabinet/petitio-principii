import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HintLine } from "./HintLine";

/**
 * T63 — HintLine overlay.
 *
 * Per docs/UX.md §6 and the T63 PRD entry:
 *   - Visible when hint != null; absent when null.
 *   - Tap dismiss → onDismiss called.
 *   - 6s elapsed → onDismiss called automatically.
 *   - The aria-live region (status role) announces the new hint.
 *
 * Vitest's fake timers move time without waiting; the AnimatePresence
 * exit animation happens, but our assertions check the dismiss callback
 * not the DOM removal — we just need to know the timer fired.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe("HintLine", () => {
  it("renders nothing when hint is null", () => {
    render(<HintLine hint={null} onDismiss={vi.fn()} />);
    expect(screen.queryByTestId("hint-line")).toBeNull();
  });

  it("renders the hint text and id when present", () => {
    render(
      <HintLine
        hint={{ id: "first-look", text: "Tip: LOOK re-reads the present.", turnId: 1 }}
        onDismiss={vi.fn()}
      />
    );
    const line = screen.getByTestId("hint-line");
    expect(line).toHaveAttribute("data-hint-id", "first-look");
    expect(line).toHaveTextContent("Tip: LOOK re-reads the present.");
  });

  it("calls onDismiss when the player taps the line", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <HintLine
        hint={{ id: "first-examine", text: "Tip: EXAMINE names the room.", turnId: 2 }}
        onDismiss={onDismiss}
      />
    );
    await user.click(screen.getByRole("button", { name: /Dismiss hint/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses after 6s elapses", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <HintLine
        hint={{
          id: "first-question",
          text: "Tip: QUESTION when an assumption feels unearned.",
          turnId: 3,
        }}
        onDismiss={onDismiss}
      />
    );
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(6100);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not auto-dismiss before the 6s timer fires", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <HintLine
        hint={{ id: "first-reject", text: "Tip: REJECT to refuse a step.", turnId: 5 }}
        onDismiss={onDismiss}
      />
    );
    vi.advanceTimersByTime(5900);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("resets the timer when the hint id changes mid-fade", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <HintLine hint={{ id: "first-look", text: "A.", turnId: 1 }} onDismiss={onDismiss} />
    );
    vi.advanceTimersByTime(4000);
    rerender(
      <HintLine hint={{ id: "first-examine", text: "B.", turnId: 2 }} onDismiss={onDismiss} />
    );
    // Original 4s elapsed but a new hint started — reset timer; 5s more
    // shouldn't trip the auto-dismiss yet.
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
    // Now another 1.5s pushes past the new hint's 6s window.
    vi.advanceTimersByTime(1500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
