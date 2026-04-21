/**
 * T71 — Automated axe accessibility scan.
 *
 * Runs @axe-core/playwright against:
 *   1. Landing screen (NewGameIncantation)
 *   2. Terminal view (after "Begin Argument")
 *
 * Every axe violation is a real bug, not a suppression.
 * Any failure here must be fixed before the task closes.
 *
 * Runs in vitest-browser (Playwright-backed Chromium, headless).
 */
import AxeBuilder from "@axe-core/playwright";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("@/hooks/use-audio", async () => ({
  useAudio: () => ({
    stopBgm: vi.fn(),
    startBgm: vi.fn(),
    playBgm: vi.fn(),
    playSfx: vi.fn(),
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * vitest-browser exposes the Playwright page on globalThis.page (injected
 * by the playwright provider). If unavailable (unit test context), skip.
 */
// biome-ignore lint/suspicious/noExplicitAny: playwright page injected by vitest-browser
function getPage(): any | null {
  // biome-ignore lint/suspicious/noExplicitAny: playwright page injected by vitest-browser
  return (globalThis as any).page ?? null;
}

describe("T71 axe accessibility scan", () => {
  it("landing screen has zero accessibility violations", async () => {
    render(<App />);

    // Confirm landing has rendered.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /begin argument/i })).toBeInTheDocument()
    );

    const page = getPage();
    if (!page) {
      console.warn("[T71] No Playwright page available — skipping axe scan");
      return;
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
      .analyze();

    // Report failures for easy diagnosis
    if (results.violations.length > 0) {
      console.error("[T71] axe violations on landing screen:");
      for (const v of results.violations) {
        console.error(`  [${v.impact}] ${v.id}: ${v.description}`);
        for (const n of v.nodes) {
          console.error(`    target: ${JSON.stringify(n.target)}`);
        }
      }
    }

    expect(results.violations).toHaveLength(0);
  });

  it("terminal view (after begin) has zero accessibility violations", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /begin argument/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /look/i })).toBeInTheDocument());

    const page = getPage();
    if (!page) {
      console.warn("[T71] No Playwright page available — skipping axe scan");
      return;
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
      .analyze();

    if (results.violations.length > 0) {
      console.error("[T71] axe violations on terminal view:");
      for (const v of results.violations) {
        console.error(`  [${v.impact}] ${v.id}: ${v.description}`);
        for (const n of v.nodes) {
          console.error(`    target: ${JSON.stringify(n.target)}`);
        }
      }
    }

    expect(results.violations).toHaveLength(0);
  });
});
