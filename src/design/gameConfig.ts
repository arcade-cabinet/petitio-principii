/**
 * @deprecated Use `@/config` directly. This shim preserves the flat
 * `GAME_CONFIG.typewriterSpeed` shape the older callsites import. It
 * adapts the new nested `@/config` JSON into the old flat constant so
 * we don't have to touch every consumer in a single commit.
 *
 * New code should prefer `import { GAME_CONFIG } from "@/config"`
 * and use `GAME_CONFIG.typewriter.charsPerSecond`, etc.
 */

import { GAME_CONFIG as CONFIG } from "@/config";
import pkg from "../../package.json";

export const GAME_CONFIG = {
  typewriterSpeed: CONFIG.typewriter.charsPerSecond,
  typewriterEnabled: CONFIG.typewriter.enabled,
  maxOutputLines: CONFIG.output.maxLines,
  startingRoomCount: CONFIG.argumentGraph.startingRoomCount,
  circularConnectionProbability: CONFIG.argumentGraph.circularConnectionProbability,
  version: pkg.version,
} as const;
