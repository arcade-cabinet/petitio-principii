import type { ArgumentGraph, Room } from "@/engine";
import {
  IsPlayer,
  Position,
  RhetoricalSpace,
  RoomId,
  type World,
  appendOutput,
  buildRhetoricalGraph,
  buildWorld,
  shortestRhetoricalPath,
  wireEdges,
} from "@/world";
import { useCallback, useRef } from "react";

/**
 * Owns the koota World + Yuka pathfinding cache for the current game.
 *
 * No game logic lives here. The hook exposes a narrow API that the
 * reducer consumes via the engine's `WorldBridge` interface:
 *   - install(graph)   — (re)build world + path cache from an argument graph
 *   - discard()        — tear everything down for a new game
 *   - appendLine       — route a transcript line into koota
 *   - movePlayer       — move the player entity
 *   - findNextHopToCircle — Yuka Dijkstra toward nearest circular/meta room
 *   - readRoomById     — used for audio ambient cues
 */

export interface WorldHandle {
  install: (graph: ArgumentGraph) => void;
  discard: () => void;
  appendLine: (kind: "narration" | "echo" | "title" | "spacer", text: string) => void;
  movePlayer: (roomId: string) => void;
  findNextHopToCircle: (fromRoomId: string) => string | null;
  /** Exposed for tests / for the UI's always-visible argument map */
  getWorld: () => World | null;
}

interface PathCache {
  graph: ReturnType<typeof buildRhetoricalGraph>["graph"];
  indexByRoomId: Map<string, number>;
  roomIdByIndex: Map<number, string>;
}

export function useWorld(): WorldHandle {
  const worldRef = useRef<World | null>(null);
  const pathRef = useRef<PathCache | null>(null);
  const graphRef = useRef<ArgumentGraph | null>(null);

  const install = useCallback((graph: ArgumentGraph) => {
    graphRef.current = graph;
    worldRef.current = buildWorld(graph);
    const { graph: g, indexByRoomId, roomIdByIndex } = buildRhetoricalGraph(worldRef.current);
    wireEdges(g, graph.rooms, indexByRoomId);
    pathRef.current = { graph: g, indexByRoomId, roomIdByIndex };
  }, []);

  const discard = useCallback(() => {
    worldRef.current = null;
    pathRef.current = null;
    graphRef.current = null;
  }, []);

  const appendLine = useCallback(
    (kind: "narration" | "echo" | "title" | "spacer", text: string) => {
      const world = worldRef.current;
      if (!world) return;
      appendOutput(world, kind, text);
    },
    []
  );

  const movePlayer = useCallback((roomId: string) => {
    const world = worldRef.current;
    if (!world) return;
    world
      .query(IsPlayer, Position)
      .select(Position)
      .updateEach(([position]) => {
        position.roomId = roomId;
      });
  }, []);

  const findNextHopToCircle = useCallback((fromRoomId: string): string | null => {
    const world = worldRef.current;
    const cache = pathRef.current;
    if (!world || !cache) return null;

    const targets: string[] = [];
    world
      .query(RhetoricalSpace, RoomId)
      .select(RhetoricalSpace, RoomId)
      .readEach(([space, id]) => {
        if (space.type === "circular" || space.type === "meta") {
          targets.push(id.value);
        }
      });

    let best: string | null = null;
    let shortest = Number.POSITIVE_INFINITY;
    for (const target of targets) {
      const path = shortestRhetoricalPath(
        cache.graph,
        cache.indexByRoomId,
        cache.roomIdByIndex,
        fromRoomId,
        target
      );
      if (path.found && path.rooms.length > 1 && path.rooms.length < shortest) {
        shortest = path.rooms.length;
        best = path.rooms[1] ?? null;
      }
    }
    return best;
  }, []);

  const getWorld = useCallback(() => worldRef.current, []);

  return { install, discard, appendLine, movePlayer, findNextHopToCircle, getWorld };
}

/** Helper re-export so tests can type against the same Room shape. */
export type { Room };
