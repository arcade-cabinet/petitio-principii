import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [solid()],
  build: {
    target: "esnext",
  },
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "app/**/*.test.tsx", "app/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: "chromium" }
      ],
      headless: true,
    },
  },
  resolve: {
    alias: {
      "@src": "/src",
      "@app": "/app",
    },
  },
});
