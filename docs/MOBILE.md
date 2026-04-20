---
title: Mobile (Capacitor)
updated: 2026-04-20
status: current
domain: ops
---

# Mobile

Petitio Principii targets Android (and iOS later) via [Capacitor](https://capacitorjs.com/).
The React app is one bundle; Capacitor wraps it in a WebView on native.

This document covers the native surface: safe-area handling, status bar,
splash screen, and the Capacitor bootstrap in `src/lib/mobile.ts`.

## Safe-area audit (T32)

**viewport-fit=cover** is already set in `index.html`, which opts us in to
the full display including the notch/cutout region. The audit looked at
every edge-anchored element in the React tree:

| Surface | Edge behaviour | Outcome |
|---------|---------------|---------|
| `CrystalField` (canvas backdrop) | Absolutely positioned, fills viewport, decorative — may safely extend under notch | No change needed |
| `NewGameIncantation` panel | Centred in viewport, not edge-anchored | No change needed |
| `TerminalDisplay` header ("Petitio Principii" / "New Game") | Top edge of display panel, p-4/p-6 built-in | Needs top safe-area when running on notched phones |
| `TerminalDisplay` keycap row | Bottom edge, p-4/p-6 built-in | Needs bottom safe-area inset for iOS home indicator / Android gesture bar |
| `KeyCap` LED pip | Absolute inside its button; not viewport-edge | Not applicable |
| `GlowingPanel` orbiting dot / rays | Inside panel, not viewport-edge | Not applicable |

### Fix

Rather than threading safe-area padding through every feature component
(constrained by the parallel work split), the fix lives in
`src/design/globals.css`:

```css
#root > div {
  padding-top: env(safe-area-inset-top, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
}
```

`#root > div` targets the app shell (`src/app/App.tsx` root container),
which is the single viewport-filling element all screens render inside.
On desktop browsers the `env()` values resolve to 0 and nothing changes;
on notched devices the notch and home-indicator zones are correctly
excluded from the content box, so the terminal header and keycap row
never collide with the notch or gesture bar.

The existing 100svh/100dvh choice in the shell already handles soft
keyboard avoidance (svh tracks the visible viewport on iOS Safari); the
safe-area insets layer on top.

### Findings

- No elements were clipped prior to the fix in plain landscape/portrait
  Chrome DevTools desktop preview; the risk was only on notched devices.
- iPhone 14 Pro simulation in Chrome DevTools device mode with the
  "Notch" overlay confirms the fix: the `GlowingPanel` content box sits
  below the notch; the keycap row sits above the home indicator.
- Legacy rules in `src/design/theme.css` (`.terminal-wrapper`,
  `.input-line`, `.modal-panel`) still contain safe-area logic but
  `theme.css` is no longer imported — the audit confirmed only
  `globals.css` is loaded by `main.tsx`.

## Status bar & splash (T33)

`src/lib/mobile.ts` conditionally bootstraps the two native plugins:

- **`@capacitor/status-bar`**: locks the status bar to `Style.Dark`
  (dark icons appropriate for our light content on the ink-violet panel)
  and sets the Android status-bar background to `#05010a` so it blends
  with the app shell.
- **`@capacitor/splash-screen`**: hidden after React mounts with a 400ms
  fade-out. The splash itself is configured in `capacitor.config.ts`
  with `backgroundColor: "#05010a"` and `launchShowDuration: 2000`.

Both plugins are dynamically imported inside a `Capacitor.isNativePlatform()`
guard, so they code-split into standalone chunks that never load on the
web. The web bundle picks up `@capacitor/core` only (~1 kB gzipped — the
`Capacitor` namespace itself and platform-detection logic).

## Updating the splash / status-bar

Both configs live in `capacitor.config.ts`. After editing:

```bash
CAPACITOR=true pnpm build
npx cap sync android
```

The sync copies the updated config into `android/app/src/main/assets/`.
Re-install the debug APK to see the change.
