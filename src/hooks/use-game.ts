import {
  type GameState,
  type WorldBridge,
  applyCommand,
  createInitialGameState,
  describeRoom,
  dismissActiveHint,
  generateArgumentGraph,
  generatePhrase,
} from "@/engine";
import { createSeededRandom } from "@/engine";
import { ArgumentAgent } from "@/engine/ai/argument-agent";
import { sfxForRhetoricalType } from "@/lib/audio-manifest";
import { readTranscript } from "@/world";
import { useCallback, useRef, useState } from "react";
import { useAudio } from "./use-audio";
import { type WorldHandle, useWorld } from "./use-world";

/**
 * Composition hook — wires React state, the koota world handle, the pure
 * reducer, the audio bus, and the Yuka argument agent together.
 *
 * Game logic lives in @/engine/core/reducer.ts (pure). World state lives
 * in @/world (koota). Audio lives in useAudio (Howler). The argument
 * agent is a Yuka StateMachine instantiated once per game. This hook is
 * the only place that knows all four exist.
 */
export interface GameHandle {
  state: GameState;
  world: WorldHandle;
  startGame: (seed: number) => Promise<void>;
  submitCommand: (raw: string) => void;
  requestNewGame: () => void;
  /** Clear the active onboarding hint without consuming a turn. */
  dismissHint: () => void;
  toggleMute: () => boolean;
  isMuted: () => boolean;
}

export function useGame(): GameHandle {
  const [state, setState] = useState<GameState>(createInitialGameState);
  const world = useWorld();
  const audio = useAudio();
  // One ArgumentAgent per game. Rebuilt on startGame with a seed-derived rng
  // so the same seed + same player acts produce the same narration.
  const agentRef = useRef<ArgumentAgent | null>(null);
  const seedRef = useRef<number>(0);

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

  const makeBridge = useCallback((): WorldBridge | null => {
    const agent = agentRef.current;
    if (!agent) return null;
    return {
      movePlayer: (roomId, toRoomType) => {
        world.movePlayer(roomId);
        world.bumpVisitCount(roomId);
        audio.playSfx(sfxForRhetoricalType(toRoomType));
      },
      appendLine: (kind, text) => world.appendLine(kind, text),
      beginTurn: () => world.beginTurn(),
      readHintsShown: () => world.readHintsShown(),
      markHintShown: (id) => world.markHintShown(id),
      findNextHopToCircle: (fromRoomId) => world.findNextHopToCircle(fromRoomId),
      markVisited: (roomId) => world.markVisited(roomId),
      markRoomAccepted: (roomId) => world.markAccepted(roomId),
      markRoomRejected: (roomId) => world.markRejected(roomId),
      markRoomQuestioned: (roomId) => world.markQuestioned(roomId),
      markCircleClosed: () => world.markCircleClosed(),
      readMemory: (turnCount) => world.readMemory(turnCount),
      argument: agent,
      seed: seedRef.current,
      visitCount: (roomId) => world.visitCount(roomId),
    };
  }, [audio, world]);

  const startGame = useCallback(
    async (seed: number) => {
      audio.stopBgm();
      seedRef.current = seed;

      // One Yuka argument agent per game, seeded so choice-between-variants
      // is deterministic for (seed, player-acts).
      agentRef.current = new ArgumentAgent({ rng: createSeededRandom(seed ^ 0x41a7) });

      const graph = generateArgumentGraph(seed);
      const phrase = generatePhrase(seed);
      const startRoom = graph.rooms.get(graph.startRoomId);

      world.install(graph);
      audio.playBgm();
      if (startRoom) audio.playSfx(sfxForRhetoricalType(startRoom.rhetoricalType));

      // The seed + phrase used to print here as narration; the player
      // already picks them on the splash screen and they now live in the
      // STATUS panel of the HUD deck. Keeping them in the diegetic feed
      // broke the fiction — the game opens directly with the threshold.
      const seedLines = [
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
    agentRef.current = null;
    setState(createInitialGameState());
  }, [audio, world]);

  const submitCommand = useCallback(
    (raw: string) => {
      if (!raw.trim()) return;
      audio.playSfx("ui.press");
      setState((prev) => {
        const bridge = makeBridge();
        if (!bridge) return prev;
        const next = applyCommand(prev, raw, bridge, audio);
        return project(next);
      });
    },
    [audio, makeBridge, project]
  );

  const dismissHint = useCallback(() => {
    setState((prev) => dismissActiveHint(prev));
  }, []);

  return {
    state,
    world,
    startGame,
    submitCommand,
    requestNewGame,
    dismissHint,
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
