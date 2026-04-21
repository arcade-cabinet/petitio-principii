---
title: Assets pending — placeholder renders to replace before store submission
updated: 2026-04-21
status: current
domain: ops
---

# Assets pending

The Capacitor CLI's `npx cap add ios` command ships a set of generic
placeholder images (flat colour blocks, oversized). These work for a
debug build running in the iPhone simulator but Apple will reject a
TestFlight / App Store submission that still carries them, and Google
Play Store store-listing requires its own hero art that was not part
of T76.

This document is the authoritative checklist. Do not close T78 (iOS
TestFlight) or the equivalent Android store-listing task until every
asset below has been replaced with a real render.

## iOS — `ios/App/App/Assets.xcassets/`

### AppIcon

| File | Size | Current state |
|------|------|---------------|
| `AppIcon.appiconset/AppIcon-512@2x.png` | 1024×1024 | **Placeholder** (Capacitor-scaffolded generic block) |

- **Needed**: 1024×1024 PNG, sRGB, **no alpha channel** (Apple's
  review bot rejects alpha in app icons), square, no transparency.
- **Design direction**: violet (`#7c3aed`) on ink (`#05010a`) — the
  same palette the landing screen and splash use. A literal "P.P."
  glyph set in Yesteryear, or an abstract circle-closing mark. See
  `docs/DESIGN.md` for the visual vocabulary.
- Xcode 14+ accepts a single 1024×1024 and generates the rest; no
  need for the old per-size set.

### Launch / splash

| File | Size | Current state |
|------|------|---------------|
| `Splash.imageset/splash-2732x2732.png` | 2732×2732 | **Placeholder** |
| `Splash.imageset/splash-2732x2732-1.png` | 2732×2732 (dark) | **Placeholder** |
| `Splash.imageset/splash-2732x2732-2.png` | 2732×2732 (dark) | **Placeholder** |

- **Needed**: 2732×2732 PNG centred composition — safe-area crop is
  square from the middle 2048×2048. Ink background (`#05010a`) with
  the violet mark centred. The `Contents.json` references a light
  variant and two dark-appearance variants; ship matching assets so
  the launch screen doesn't flash white on dark-mode devices.
- The `LaunchScreen.storyboard` references the `Splash` image asset
  directly; swapping the PNGs is enough — no storyboard edit needed.
- `capacitor.config.ts` sets `SplashScreen.backgroundColor = "#05010a"`
  and `spinnerColor = "#7c3aed"`; the launch frame that Capacitor
  shows after the storyboard but before the WebView hands off should
  match this palette.

## Android — `android/app/src/main/res/`

Same category of placeholder images ships with the Android Capacitor
scaffold. They are adequate for debug APKs and the CI artifact but
not for a Play Store submission.

| Directory | File | Current state |
|-----------|------|---------------|
| `mipmap-hdpi/` through `mipmap-xxxhdpi/` | `ic_launcher.png` + round variants | **Placeholder** |
| `drawable-port-*/` | `splash.png` (portrait) | **Placeholder** |
| `drawable-land-*/` | `splash.png` (landscape) | **Placeholder** |

- **Needed**: adaptive icon foreground + background pair (vector or
  1024×1024 PNG), 108dp safe zone. Play Console also wants a
  512×512 hero icon and at least two screenshots per supported form
  factor.
- Run the final assets through Android Asset Studio (or the Capacitor
  `cordova-res` helper) to regenerate the per-dpi mipmaps cleanly.

## Store listing copy (both platforms)

Not asset files per se, but they block submission in the same way:

- Short description (80 chars on Play, 170 on App Store).
- Long description / what's new (4000 chars).
- Privacy policy URL.
- Two screenshots minimum per device form-factor (phone + tablet).
  These should be the actual viewport screenshots from T69 once
  captured.

## Related tasks

- **T78** — iOS TestFlight submission. Gated on every row above being
  real, plus Apple Developer enrollment.
- **T73** — Android release signing is orthogonal (keystore, not
  assets) but both must land before the first signed store-ready
  build.
- **T69** — 12 viewport screenshots under `docs/screenshots/`, the
  source material for the store listings.
