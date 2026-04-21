import { Capacitor } from "@capacitor/core";

/**
 * Mobile platform bootstrap and runtime helpers.
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
 *   - Expose helpers for in-game haptics and status-bar visibility toggling.
 *   - Register the Android back-button handler.
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
 * nothing. Resolves after status bar / splash screen / visibility-reset
 * have all been configured (or immediately on non-native platforms).
 *
 * Visibility-reset note: the OS persists status-bar hidden/visible state
 * across kill-and-relaunch — if the app was killed mid-game while the
 * status bar was hidden, the next cold-start lands on the landing screen
 * but without its status bar. We defensively call `statusBarShow()` here
 * so every cold launch starts with the bar visible; `startGame()` will
 * hide it again when the player commits to a new game.
 */
export async function init(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await Promise.all([configureStatusBar(), hideSplash(), statusBarShow()]);
  } catch (err) {
    // A plugin failure must never block the app from rendering.
    // Log and continue; the user still gets to play the game.
    console.warn("[mobile] native init failed", err);
  }
}

// ── Haptics ─────────────────────────────────────────────────────────────────

/**
 * Fire a success haptic. Called when ACCEPT is issued in a circular room
 * and the argument agent responds with a Triumphant state.
 * Safe to call on web — no-op.
 */
export async function hapticSuccess(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch (err) {
    console.warn("[mobile] hapticSuccess failed", err);
  }
}

/**
 * Fire a warning haptic. Called when REJECT is issued.
 * Safe to call on web — no-op.
 */
export async function hapticWarning(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (err) {
    console.warn("[mobile] hapticWarning failed", err);
  }
}

// ── Status bar visibility ────────────────────────────────────────────────────

/**
 * Enter immersive in-game mode: hide the status bar.
 * Called when the game starts (landing → in-game transition).
 */
export async function statusBarHide(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, StatusBarAnimation } = await import("@capacitor/status-bar");
    await StatusBar.hide({ animation: StatusBarAnimation.Fade });
  } catch (err) {
    console.warn("[mobile] statusBarHide failed", err);
  }
}

/**
 * Restore the status bar on the landing screen.
 * Called when the game ends / new-game is requested.
 */
export async function statusBarShow(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, StatusBarAnimation } = await import("@capacitor/status-bar");
    await StatusBar.show({ animation: StatusBarAnimation.Fade });
  } catch (err) {
    console.warn("[mobile] statusBarShow failed", err);
  }
}

// ── Android back button ──────────────────────────────────────────────────────

/** Callback invoked when the Android back button is pressed in-game. */
export type BackHandler = () => void;

/**
 * Register the Android hardware back-button handler.
 *
 * Semantics:
 *  - If a `onInGame` callback is supplied (truthy), it fires instead of
 *    the default OS back action. The host UI should confirm "new game?" or
 *    navigate to the landing screen.
 *  - If `onInGame` is null/undefined, the default OS behaviour applies
 *    (suspend / background the app), which is the correct landing-screen
 *    behaviour on Android.
 *
 * Returns a cleanup function that removes the listener; call it from
 * React's useEffect cleanup or when unmounting the handler.
 *
 * Safe to call on web — returns a no-op cleanup.
 */
export function registerBackHandler(onInGame: BackHandler | null): () => void {
  // When there is no in-game handler, skip registering the listener entirely.
  // Attaching a Capacitor back listener overrides the default Android back
  // behaviour, so registering with a null handler would prevent the OS from
  // backgrounding the app on the landing screen.
  if (!Capacitor.isNativePlatform() || !onInGame) return () => {};

  let disposed = false;
  let handle: { remove: () => Promise<void> } | null = null;

  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const listener = await App.addListener("backButton", () => {
        // onInGame is captured at registration time; it's non-null by the
        // guard above.
        onInGame();
      });
      if (disposed) {
        // Cleanup was called before the Promise resolved — remove immediately.
        void listener.remove();
        return;
      }
      handle = listener;
    } catch (err) {
      console.warn("[mobile] registerBackHandler failed", err);
    }
  })();

  return () => {
    disposed = true;
    void handle?.remove();
    handle = null;
  };
}
