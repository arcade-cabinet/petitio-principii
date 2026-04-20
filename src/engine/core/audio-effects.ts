/**
 * Engine-level audio *intents*. The engine says "a rhetorical.accept
 * happened" — it does not know the file name, the codec, or the volume.
 * The UI layer's audio bus (see src/lib/audio-manifest.ts) translates
 * these semantic keys into actual Howl playback.
 *
 * Keep this set minimal and meaningful; it's the contract between pure
 * game logic and the runtime effects layer.
 */
export type SfxKey =
  | "ui.press"
  | "ui.back"
  | "ui.confirm"
  | "ui.deny"
  | "ui.reveal"
  | "rhetoric.accept"
  | "rhetoric.reject"
  | "rhetoric.question"
  | "rhetoric.examine"
  | "rhetoric.trace"
  | "room.enter"
  | "room.premise"
  | "room.fallacy"
  | "room.circular"
  | "room.meta"
  | "circle.closed";
