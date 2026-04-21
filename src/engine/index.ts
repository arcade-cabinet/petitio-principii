export { generateArgumentGraph, type ArgumentGraph } from "./core/ArgumentGraph";
export type { SfxKey } from "./core/audio-effects";
export type { ClockSlotId, CommandVerb, Move, ParsedCommand } from "./core/Command";
export {
  type ActiveHint,
  createInitialGameState,
  type GameState,
  type TranscriptEntry,
} from "./core/GameState";
export { dismissActiveHint } from "./core/reducer";
export {
  describeExamineFor,
  describeFallacy,
  describeRoom,
  generatePhrase,
  getHelpText,
  RHETORICAL_EXAMINE,
} from "./core/NarrativeGenerator";
export { parseCommand } from "./core/Parser";
export type { Passage } from "./core/Passage";
export {
  applyCommand,
  applyMove,
  type AudioSink as EngineAudioSink,
  type WorldBridge,
} from "./core/reducer";
export type { Direction, Exit, Room } from "./core/Room";
export {
  createSeededRandom,
  generateSeed,
  pickRandom,
  shuffleArray,
} from "./prng/seedRandom";
