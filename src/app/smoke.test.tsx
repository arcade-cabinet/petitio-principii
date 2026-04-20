import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

/**
 * T56 — end-to-end smoke test.
 *
 * Renders the top-level App, goes through the landing page, and verifies:
 *
 *   1. The NewGameIncantation surfaces a "Begin Argument" button.
 *   2. Clicking it transitions into the TerminalDisplay (past/present/
 *      future layout renders).
 *   3. Pressing a rhetorical verb appends to the present zone (proving
 *      the reducer → koota → React loop is actually wired end-to-end
 *      through real hooks, not mocks).
 *
 * This is the one test that exercises the *whole* pipeline — engine +
 * world + hooks + UI — through Playwright (the vitest-browser provider
 * is Playwright under the hood, per @vitest/browser-playwright). A break
 * anywhere in the stack surfaces here, so we treat a pass as the
 * "shippable" signal for the branch.
 */

// useGame kicks off a Howler-backed audio engine; silence it under test
// so CI doesn't need an audio device. The real module is already defensive
// against a missing AudioContext, but this keeps the test console quiet.
vi.mock("@/hooks/use-audio", async () => {
  return {
    useAudio: () => ({
      stopBgm: vi.fn(),
      startBgm: vi.fn(),
      playBgm: vi.fn(),
      playSfx: vi.fn(),
    }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App end-to-end smoke", () => {
  it("lands on the incantation screen with a Begin Argument button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /begin argument/i })).toBeInTheDocument();
  });

  it("Begin Argument transitions into the terminal view", async () => {
    const user = userEvent.setup();
    render(<App />);

    const begin = screen.getByRole("button", { name: /begin argument/i });
    await user.click(begin);

    // The terminal's verb keycaps appear once the game starts.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /look/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /examine/i })).toBeInTheDocument();
    });
  });

  it("pressing LOOK once appends at least one new transcript line to the present", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /begin argument/i }));
    await waitFor(() => expect(screen.getByTestId("present-zone")).toBeInTheDocument());

    const beforeText = screen.getByTestId("present-zone").textContent ?? "";
    await user.click(screen.getByRole("button", { name: /^Look$/i }));

    // Post-click, either the present gained content or a past entry appeared
    // (the first verb is LOOK on turn 1, so it becomes the present turn;
    // the opening turn moves into PAST).
    await waitFor(() => {
      const present = screen.getByTestId("present-zone");
      const past = screen.queryByTestId("past-zone");
      const changed = present.textContent !== beforeText || past !== null;
      expect(changed).toBe(true);
    });
  });
});
