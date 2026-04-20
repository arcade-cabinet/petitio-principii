import type { World } from "koota";
import * as Tone from "tone";
import { AudioTheme, IsPlayer, IsRoom, Position, RoomId } from "../traits";

let synth: Tone.PolySynth | null = null;
let lastRoomId: string | null = null;

/**
 * Initialize the audio engine. Must be called from a user-gesture handler
 * because browsers require a gesture before `AudioContext` can start.
 */
export async function initAudio(): Promise<void> {
  if (synth) return;
  await Tone.start();
  synth = new Tone.PolySynth(Tone.Synth, {
    envelope: { attack: 1.2, decay: 0.3, sustain: 0.8, release: 2.5 },
    oscillator: { type: "sine" },
  }).toDestination();
  synth.volume.value = -18;
}

/** Tear down the audio engine — call on game end or hot-reload. */
export function disposeAudio(): void {
  synth?.dispose();
  synth = null;
  lastRoomId = null;
}

/**
 * Room-aware ambient pad. Queries the player's Position and the room matching
 * that id, reading its AudioTheme to choose a chord. Triggers once per room
 * transition so movement is what drives audio, not frame time.
 */
export function updateAudio(world: World): void {
  if (!synth) return;

  let playerRoomId = "";
  world
    .query(IsPlayer, Position)
    .select(Position)
    .readEach(([position]) => {
      playerRoomId = position.roomId;
    });

  if (!playerRoomId || playerRoomId === lastRoomId) return;

  let theme: { baseFrequency: number; dissonance: number } | null = null;
  world
    .query(IsRoom, RoomId, AudioTheme)
    .select(RoomId, AudioTheme)
    .readEach(([id, audio]) => {
      if (id.value === playerRoomId) {
        theme = { baseFrequency: audio.baseFrequency, dissonance: audio.dissonance };
      }
    });

  if (!theme) return;

  const { baseFrequency, dissonance } = theme;
  const third = baseFrequency * (dissonance > 0.5 ? 1.059463 : 1.25); // m2 vs. M3
  const fifth = baseFrequency * (dissonance > 0.3 ? Math.SQRT2 : 1.5); // tritone vs. P5
  synth.releaseAll();
  synth.triggerAttackRelease([baseFrequency, third, fifth], "4n");

  lastRoomId = playerRoomId;
}
