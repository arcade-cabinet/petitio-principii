import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid()],
  base: "./",
  build: {
    outDir: "dist",
    target: "es2020",
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["src/ui/**/*.test.tsx", "jsdom"],
      ["src/ui/**/*.test.ts", "jsdom"],
    ],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
