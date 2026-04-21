import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Pages project base derived from package.json `name` so a future rename
// updates one place, not two. CodeRabbit caught the prior hard-coded
// "/petitio-principii/" as a drift-risk.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  name: string;
};
const PAGES_BASE = `/${pkg.name}/`;

// Base path depends on deploy target:
//   - Capacitor (native WebView): relative paths so file:// loads work.
//   - GitHub Pages project site: served under PAGES_BASE.
//   - Local dev / preview: PAGES_BASE so route-relative links match prod.
// Pattern matches sibling arcade-cabinet games (midway-mayhem, winged-daemon).
const base = process.env.CAPACITOR === "true" ? "./" : PAGES_BASE;

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // Prevent RTL from spinning up a second copy of React in the browser-mode
    // test runner (see the "useRef of null" failure mode). Dedupe keeps the
    // entire React graph unified across direct imports and test-lib's peers.
    // motion/react has its own React import path; without dedupe, vitest-browser
    // ends up loading two copies and the "Invalid hook call" surfaces.
    dedupe: ["react", "react-dom", "motion", "motion/react"],
  },
  // Pre-bundle these so the vitest-browser runner doesn't trigger a dynamic
  // re-optimization mid-test (which aborts the in-flight test file import).
  optimizeDeps: {
    include: [
      "@testing-library/react",
      "@testing-library/user-event",
      "@testing-library/jest-dom",
      "motion/react",
    ],
  },
  build: {
    target: "esnext",
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            headless: true,
          },
        },
      },
      {
        extends: true,
        test: {
          name: "scripts",
          include: ["scripts/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "tools",
          include: ["tools/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
