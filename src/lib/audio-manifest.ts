/**
 * Semantic audio manifest — maps game events to real audio assets.
 *
 * Event keys are the single source of truth for "what sound plays when X
 * happens." Add a key here first, then wire it in the consumer; adding
 * `<Howl/>` calls inline is forbidden because it would bypass this index
 * and make event→asset traceability impossible.
 *
 * Source attribution:
 *   - UI / rhetoric SFX: Kenney asset packs (CC0)
 *     (Interface Sounds, Sci-Fi Sounds)
 *   - BGM: Clément Panchout, "I want to believe" (2004), licensed per
 *     `/Volumes/home/assets/Audio/Music/...`
 */

import type { SfxKey } from "@/engine";

export type { SfxKey } from "@/engine";
export type BgmKey = "bgm.main";

/** Maps a semantic key to its asset URL (served from /public). */
export const SFX_MANIFEST: Readonly<Record<SfxKey, string>> = {
  "ui.press": "/audio/sfx/ui-press.ogg",
  "ui.back": "/audio/sfx/ui-back.ogg",
  "ui.confirm": "/audio/sfx/ui-confirm.ogg",
  "ui.deny": "/audio/sfx/ui-deny.ogg",
  "ui.reveal": "/audio/sfx/ui-reveal.ogg",
  "ui.melt-away": "/audio/sfx/ui-melt-away.ogg",
  "rhetoric.accept": "/audio/sfx/rhetoric-accept.ogg",
  "rhetoric.reject": "/audio/sfx/rhetoric-reject.ogg",
  "rhetoric.question": "/audio/sfx/rhetoric-question.ogg",
  "rhetoric.examine": "/audio/sfx/rhetoric-examine.ogg",
  "rhetoric.trace": "/audio/sfx/rhetoric-trace.ogg",
  "room.enter": "/audio/sfx/room-enter.ogg",
  "room.premise": "/audio/sfx/room-premise.ogg",
  "room.fallacy": "/audio/sfx/room-fallacy.ogg",
  "room.circular": "/audio/sfx/room-circular.ogg",
  "room.meta": "/audio/sfx/room-meta.ogg",
  "circle.closed": "/audio/sfx/circle-closed.ogg",
};

export const BGM_MANIFEST: Readonly<Record<BgmKey, string>> = {
  "bgm.main": "/audio/bgm.opus",
};

/**
 * Semantic resolvers — callers describe intent ("a rhetorical action was
 * taken with verb=accept") and we return the sfx key. Keeps game logic
 * from needing to know the exact filename vocabulary.
 */
export function sfxForVerb(verb: string): SfxKey | null {
  switch (verb) {
    case "accept":
      return "rhetoric.accept";
    case "reject":
      return "rhetoric.reject";
    case "question":
    case "ask":
      return "rhetoric.question";
    case "examine":
    case "look":
      return "rhetoric.examine";
    case "trace":
      return "rhetoric.trace";
    // Directional movement collapses to a single room-enter
    case "north":
    case "south":
    case "east":
    case "west":
    case "up":
    case "down":
    case "back":
    case "forward":
      return "room.enter";
    default:
      return null;
  }
}

export function sfxForRhetoricalType(
  type:
    | "premise"
    | "conclusion"
    | "definition"
    | "analogy"
    | "fallacy"
    | "circular"
    | "objection"
    | "meta"
): SfxKey {
  switch (type) {
    case "premise":
    case "conclusion":
    case "definition":
    case "analogy":
    case "objection":
      return "room.premise";
    case "fallacy":
      return "room.fallacy";
    case "circular":
      return "room.circular";
    case "meta":
      return "room.meta";
  }
}
