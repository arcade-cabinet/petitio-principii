import pkg from "../../package.json";

export const GAME_CONFIG = {
  typewriterSpeed: 30,
  typewriterEnabled: true,
  maxOutputLines: 1000,
  startingRoomCount: 6,
  circularConnectionProbability: 0.3,
  version: pkg.version,
} as const;
