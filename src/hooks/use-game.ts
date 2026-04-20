import {
  type GameState,
  type WorldBridge,
  applyCommand,
  createInitialGameState,
  describeRoom,
  generateArgumentGraph,
  generatePhrase,
} from "@/engine";
import { sfxForRhetoricalType } from "@/lib/audio-manifest";
import { readTranscript } from "@/world";
import { useCallback, useState } from "react";
import { useAudio } from "./use-audio";
import { useWorld } from "./use-world";

/**
 * Composition hook — wires React state, the koota world handle, the pure
 * reducer, and the audio bus together.
 *
 * Game logic lives in @/engine/core/reducer.ts (pure). World state lives
 * in @/world (koota). Audio lives in useAudio (Howler). This hook is the
 * only place that knows all four exist.
 */
export interface GameHandle {
  state: GameState;
  startGame: (seed: number) => Promise<void>;
  submitCommand: (raw: string) => void;
  requestNewGame: () => void;
  toggleMute: () => boolean;
  isMuted: () => boolean;
}

export function useGame(): GameHandle {
  const [state, setState] = useState<GameState>(createInitialGameState);
  const world = useWorld();
  const audio = useAudio();

  /** Rebuild state.transcript + state.output from the koota world. */
  const project = useCallback(
    (base: GameState): GameState => {
      const w = world.getWorld();
      if (!w) return base;
      const transcript = readTranscript(w);
      const output = transcript.map((e) => e.text);
      return { ...base, transcript, output };
    },
    [world]
  );

  /**
   * The reducer expects a WorldBridge — we build one per call that
   * combines world movement with audio ambient cues. Keeping the bridge
   * this thin means the reducer stays testable with a mock bridge.
   */
  const makeBridge = useCallback(
    (roomTypes: Map<string, Parameters<typeof sfxForRhetoricalType>[0]>): WorldBridge => ({
      movePlayer: (roomId, toRoomType) => {
        world.movePlayer(roomId);
        audio.playSfx(sfxForRhetoricalType(toRoomType));
        // Cache the type so later bridges don't re-derive
        roomTypes.set(roomId, toRoomType);
      },
      appendLine: (kind, text) => world.appendLine(kind, text),
      findNextHopToCircle: (fromRoomId) => world.findNextHopToCircle(fromRoomId),
    }),
    [audio, world]
  );

  const startGame = useCallback(
    async (seed: number) => {
      audio.stopBgm();

      const graph = generateArgumentGraph(seed);
      const phrase = generatePhrase(seed);
      const startRoom = graph.rooms.get(graph.startRoomId);

      world.install(graph);
      audio.playBgm();
      if (startRoom) audio.playSfx(sfxForRhetoricalType(startRoom.rhetoricalType));

      // Seed the transcript via koota entities
      const seedLines = [
        "Petitio Principii",
        `Seed: ${seed} — "${phrase}"`,
        "",
        "You find yourself at the threshold of an argument.",
        "The premise smells faintly of tautology.",
        "",
        ...(startRoom ? describeRoom(startRoom) : ["The argument begins..."]),
      ];
      for (const text of seedLines) {
        world.appendLine(classifyLine(text), text);
      }

      setState((prev) =>
        project({
          ...prev,
          seed,
          currentRoomId: graph.startRoomId,
          rooms: graph.rooms,
          turnCount: 0,
          started: true,
          phrase,
        })
      );
    },
    [audio, project, world]
  );

  const requestNewGame = useCallback(() => {
    audio.stopBgm();
    audio.playSfx("ui.back");
    world.discard();
    setState(createInitialGameState());
  }, [audio, world]);

  const submitCommand = useCallback(
    (raw: string) => {
      if (!raw.trim()) return;
      audio.playSfx("ui.press");
      setState((prev) => {
        const bridge = makeBridge(new Map());
        const next = applyCommand(prev, raw, bridge, audio);
        return project(next);
      });
    },
    [audio, makeBridge, project]
  );

  return {
    state,
    startGame,
    submitCommand,
    requestNewGame,
    toggleMute: audio.toggleMute,
    isMuted: audio.isMuted,
  };
}

function classifyLine(text: string): "narration" | "echo" | "title" | "spacer" {
  if (text === "") return "spacer";
  if (text.startsWith(">")) return "echo";
  if (text.startsWith("== ") && text.endsWith(" ==")) return "title";
  return "narration";
}
