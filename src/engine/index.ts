export { generateArgumentGraph, type ArgumentGraph } from "./core/ArgumentGraph";
export type { SfxKey } from "./core/audio-effects";
export type { CommandVerb, ParsedCommand } from "./core/Command";
export {
  createInitialGameState,
  type GameState,
  type TranscriptEntry,
} from "./core/GameState";
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
