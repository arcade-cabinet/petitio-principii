import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
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
