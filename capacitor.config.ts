import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration.
 *
 * Petitio Principii ships to Android (and the web) from the same Vite bundle.
 * iOS is explicitly deferred until Xcode is available on a build machine —
 * the codebase stays compatible (all Capacitor plugin calls are gated on
 * `Capacitor.isNativePlatform()` in `src/lib/mobile.ts`), but we don't
 * scaffold `ios/` here.
 *
 * Palette is locked to the ink-violet theme in `src/design/globals.css`.
 */
const config: CapacitorConfig = {
  appId: "com.arcadecabinet.petitioprincipii",
  appName: "Petitio Principii",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      backgroundColor: "#05010a",
      launchShowDuration: 2000,
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#05010a",
    },
  },
};

export default config;
