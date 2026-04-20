import { trait } from "koota";
import type { Direction } from "../../engine/core/Room";

export const IsPlayer = trait();

export const Position = trait({
  roomId: "",
});

export const RhetoricalSpace = trait({
  type: "premise" as "premise" | "conclusion" | "definition" | "analogy" | "fallacy" | "circular" | "objection" | "meta",
  title: "",
  description: "",
});

export const Exit = trait({
  direction: "north" as Direction,
  targetRoomId: "",
  description: "",
});

export const AudioTheme = trait({
  baseFrequency: 440,
  isDissonant: false,
});
