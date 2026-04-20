import { Capacitor } from "@capacitor/core";

/**
 * Mobile platform bootstrap.
 *
 * Invoked once from `src/app/main.tsx` right before React renders. On the
 * web this is a no-op — the dynamic imports below only resolve when the
 * app is running inside a Capacitor WebView, so none of the plugin code
 * ends up in the web bundle's initial chunk (Vite tree-shakes the branch
 * at build time and, worst case, lazy-loads on demand at runtime).
 *
 * Responsibilities on native:
 *   - Lock the status bar to the ink palette (dark icons on #05010a).
 *   - Hide the Capacitor splash screen after React has mounted.
 *
 * Palette must match `src/design/globals.css --color-ink` and the
 * `SplashScreen.backgroundColor` in `capacitor.config.ts`.
 */
const INK = "#05010a";

async function configureStatusBar(): Promise<void> {
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  await StatusBar.setStyle({ style: Style.Dark });
  // Android-only; the call is a no-op on iOS but @capacitor/status-bar
  // doesn't throw on unsupported platforms.
  if (Capacitor.getPlatform() === "android") {
    await StatusBar.setBackgroundColor({ color: INK });
  }
}

async function hideSplash(): Promise<void> {
  const { SplashScreen } = await import("@capacitor/splash-screen");
  await SplashScreen.hide({ fadeOutDuration: 400 });
}

/**
 * Initialize the native mobile surface. Safe to call on the web — does
 * nothing. Resolves after both status bar and splash screen have been
 * configured (or immediately on non-native platforms).
 */
export async function init(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await Promise.all([configureStatusBar(), hideSplash()]);
  } catch (err) {
    // A plugin failure must never block the app from rendering.
    // Log and continue; the user still gets to play the game.
    console.warn("[mobile] native init failed", err);
  }
}
