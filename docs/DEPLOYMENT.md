---
title: Deployment
updated: 2026-04-20
status: current
domain: ops
---

# Deployment

Petitio Principii ships to three surfaces from one Vite bundle:

| Surface | Environment flag | Asset base | Deploy path |
|---------|------------------|------------|-------------|
| Local dev / preview | *(none)* | `/` | `pnpm dev` / `pnpm preview` |
| GitHub Pages | `GITHUB_PAGES=true` | `/petitio-principii/` | `cd.yml` on push to main |
| Android (Capacitor) | `CAPACITOR=true` | `./` (relative, file://) | `ci.yml` `android-apk` job |

`vite.config.ts` picks the correct `base` from these env flags. Setting
the wrong flag at build time produces a bundle whose asset URLs are
resolved against the wrong root — the page will load but every `/assets/…`
reference 404s.

## Local development

```bash
pnpm install
pnpm dev           # vite dev server, hot reload, no Capacitor
```

`pnpm verify` mirrors CI exactly: `check → typecheck → test → build`.
Always run it before pushing.

## Web (GitHub Pages)

The Pages workflow (`.github/workflows/cd.yml`) runs on push to `main`
and deploys the `dist/` output from a `GITHUB_PAGES=true pnpm build`.
No manual steps.

## Android debug APK

### In CI

`.github/workflows/ci.yml` has a dedicated `android-apk` job that runs
on every PR in parallel with the fast `verify` gate. It:

1. Sets up JDK 21 Temurin + the Android SDK (pinned action SHAs).
2. Runs `CAPACITOR=true pnpm build` to produce `dist/` with relative
   asset paths.
3. Runs `npx cap sync android` to copy `dist/` into
   `android/app/src/main/assets/public/` and refresh plugin registration.
4. Runs `./gradlew assembleDebug` in the committed `android/` Gradle
   project.
5. Uploads the resulting `app-debug.apk` as a PR artifact (30-day
   retention).

The `android/` scaffold is committed; the CI job does NOT re-run
`npx cap add android`. That keeps the native project reproducible and
lets us patch Android-specific resources (strings.xml, colors.xml,
AndroidManifest.xml) without them getting nuked by a cap-add.

### Locally (requires Android SDK)

Pre-requisites:
- JDK 21 (e.g. `brew install --cask zulu21`)
- Android SDK with `cmdline-tools` + a platform matching
  `android/variables.gradle` (default: `compileSdk 35`, `targetSdk 35`)
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` exported

```bash
# Build web bundle for native
CAPACITOR=true pnpm build

# Copy bundle into Android project + refresh plugins
npx cap sync android

# Assemble debug APK
cd android
./gradlew assembleDebug

# APK lands at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device with:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### If you don't have the Android SDK

You don't need it. Push your branch, open a PR, and the `android-apk`
job downloads the APK as an artifact attached to the PR — download and
side-load from there.

### Bootstrapping a fresh clone

The `android/` directory in this repo is the live Gradle project.
Anyone can open it in Android Studio directly. If the project ever
drifts from `capacitor.config.ts` (new plugins, renamed app, etc.):

```bash
# Regenerate from config (destructive — blows away custom edits)
rm -rf android
npx cap add android
```

…but only do this if nothing in `android/app/src/main/res/` or
`AndroidManifest.xml` has been hand-edited.

## iOS

Deferred. iOS requires Xcode on a macOS build host and an Apple Developer
account for signed builds. When we pick it up, add `@capacitor/ios` and
`npx cap add ios`; the shared `src/lib/mobile.ts` already handles iOS
via the same Capacitor platform detection.

## Updating splash screen / status bar

Both are declared in `capacitor.config.ts`:

```ts
plugins: {
  SplashScreen: { backgroundColor: "#05010a", launchShowDuration: 2000 },
  StatusBar:    { style: "DARK", backgroundColor: "#05010a" },
}
```

After editing, `npx cap sync android` pushes the config into the native
project. See `docs/MOBILE.md` for the matching palette tokens.

## Audit trail

- `src/lib/mobile.ts`: dynamic-imports status-bar + splash plugins only
  when `Capacitor.isNativePlatform()`, so the web bundle stays lean.
- `capacitor.config.ts`: appId `com.arcadecabinet.petitioprincipii`,
  webDir `dist`.
- `vite.config.ts`: dynamic `base` per deploy target.
- `android/.gitignore` (scaffolded by Capacitor): excludes the local
  Gradle cache (`.gradle/`), build outputs (`build/`), IDE artifacts
  (`*.iml`, `.idea/`), and local SDK paths (`local.properties`). The
  Gradle wrapper under `android/gradle/wrapper/` IS committed — CI needs
  it to invoke `./gradlew` reproducibly.
