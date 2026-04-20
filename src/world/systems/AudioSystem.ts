import * as Tone from "tone";
import { world } from "../index";
import { AudioTheme, Position } from "../traits";

let synth: Tone.PolySynth | null = null;

export function initAudio() {
  synth = new Tone.PolySynth(Tone.Synth).toDestination();
  Tone.start();
}

export function updateAudio() {
  if (!synth) return;

  // Simple query to find the player and the room they are in
  let playerPosition = null;
  for (const entity of world.query(Position)) {
    playerPosition = entity.get(Position);
    break;
  }
  
  if (!playerPosition) return;

  const currentRoomId = playerPosition.roomId;
  const room = world.entities.find(e => e.has(AudioTheme) && (e as any).id === currentRoomId);
  
  if (room) {
    room.get(AudioTheme);
    // Logic to modulate Tone.js based on the theme
  }
}
