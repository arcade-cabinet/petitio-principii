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
        test: {
          name: "scripts",
          include: ["scripts/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
