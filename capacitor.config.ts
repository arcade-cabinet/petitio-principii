import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration.
 *
 * Petitio Principii ships to Android, iOS, and the web from the same Vite
 * bundle. Capacitor plugin calls are gated on `Capacitor.isNativePlatform()`
 * in `src/lib/mobile.ts` so none of the native code path affects the web build.
 *
 * Palette is locked to the ink-violet theme in `src/design/globals.css`:
 *   --color-ink:    #05010a  (deep black-violet background)
 *   --color-violet: #7c3aed  (accent — used as splash accent tint)
 *
 * Splash screen: violet (#7c3aed) text/logo on ink (#05010a) background,
 * matching the landing screen chrome exactly (T74).
 */
const config: CapacitorConfig = {
  appId: "com.arcadecabinet.petitioprincipii",
  appName: "Petitio Principii",
  webDir: "dist",
  ios: {
    scheme: "PetitioPrincipii",
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      // Ink background with violet accent tint — matches landing chrome (T74).
      backgroundColor: "#05010a",
      launchShowDuration: 2000,
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#05010a",
    },
    CapacitorSQLite: {
      // Seed dbs the plugin should copy on first launch. On native,
      // Capacitor CLI syncs `dist/assets/databases/*.db` (set by
      // `scripts/stage-game-db.sh`) into the platform's native
      // asset path; on web, jeep-sqlite reads from that same URL.
      // The db name the plugin expects is `<DB_NAME>SQLite.db` where
      // `<DB_NAME>` matches `createConnection(DB_NAME, …)`.
      iosDatabaseLocation: "Library/CapacitorDatabase",
      androidIsEncryption: false,
    },
  },
};

export default config;
