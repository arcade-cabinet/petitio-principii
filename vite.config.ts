import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Base path depends on deploy target:
//   - Capacitor (native WebView): relative paths so file:// loads work.
//   - GitHub Pages: served under /petitio-principii/.
//   - Local dev / preview: server root.
const base =
  process.env.CAPACITOR === "true"
    ? "./"
    : process.env.GITHUB_PAGES === "true"
      ? "/petitio-principii/"
      : "/";

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
    dedupe: ["react", "react-dom"],
  },
  // Pre-bundle these so the vitest-browser runner doesn't trigger a dynamic
  // re-optimization mid-test (which aborts the in-flight test file import).
  optimizeDeps: {
    include: ["@testing-library/react", "@testing-library/user-event", "@testing-library/jest-dom"],
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
    ],
  },
});
