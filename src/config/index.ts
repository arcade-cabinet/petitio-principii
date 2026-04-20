/**
 * Config barrel — the ONE place we turn JSON into typed TS.
 *
 * Tunables live as JSON because they are *data*, not code: inspectable by
 * non-programmers, diffable, and editable without retyping the whole
 * module graph. Content generators (see `scripts/build-corpus.ts`) emit
 * JSON into `src/config/generated/` on the same principle; hand-authored
 * configs live here at the top level.
 *
 * All consumers go through this file — e.g. `GAME_CONFIG.argumentGraph
 * .startingRoomCount` instead of reaching for the JSON directly. That
 * keeps import sites stable even if the file layout changes.
 */

import type { RhetoricalType } from "@/content";
import gameJson from "./game.json";
import rhetoricJson from "./rhetoric.json";

// ---------------------------------------------------------------------------
// Game tunables
// ---------------------------------------------------------------------------

export interface GameConfig {
  readonly typewriter: {
    readonly charsPerSecond: number;
    readonly enabled: boolean;
  };
  readonly output: {
    readonly maxLines: number;
  };
  readonly argumentGraph: {
    readonly startingRoomCount: number;
    readonly circularConnectionProbability: number;
  };
  readonly audio: {
    readonly masterVolumeDefault: number;
    readonly masterVolumeReducedMotion: number;
    readonly bgmFadeInMs: number;
    readonly bgmFadeOutMs: number;
  };
  readonly map: {
    readonly nodeRadius: number;
    readonly nodeSpacing: number;
  };
}

export const GAME_CONFIG = gameJson as GameConfig;

// ---------------------------------------------------------------------------
// Rhetoric tunables — per-type tonal centre, dissonance, path cost
// ---------------------------------------------------------------------------

export interface RhetoricEntry {
  readonly tonalCentre: { readonly hz: number; readonly note: string };
  readonly dissonance: number;
  readonly pathCost: number;
}

export interface RhetoricConfig {
  readonly types: Readonly<Record<RhetoricalType, RhetoricEntry>>;
}

// The JSON has $schema / $comment / $description keys that TS doesn't know
// about. The cast is checked at runtime by consumers going through the
// accessor functions below — which is where type safety actually matters.
const rhetoric = rhetoricJson as unknown as RhetoricConfig;

export const RHETORIC_CONFIG: RhetoricConfig = rhetoric;

export function rhetoricOf(type: RhetoricalType): RhetoricEntry {
  return rhetoric.types[type];
}

export function pathCostFor(type: RhetoricalType): number {
  return rhetoric.types[type].pathCost;
}

export function tonalCentreFor(type: RhetoricalType): { hz: number; note: string } {
  return rhetoric.types[type].tonalCentre;
}

export function dissonanceOf(type: RhetoricalType): number {
  return rhetoric.types[type].dissonance;
}
