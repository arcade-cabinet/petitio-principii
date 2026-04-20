import type { ArgumentGraph, Room } from "@/engine";
import type { ArgumentMemory } from "@/engine/ai/argument-traits";
import {
  IsPlayer,
  Position,
  RhetoricalSpace,
  RoomId,
  type World,
  appendOutput,
  beginTurn,
  buildRhetoricalGraph,
  buildWorld,
  markCircleClosed,
  markRoomAccepted,
  markRoomQuestioned,
  markRoomRejected,
  markVisited,
  readArgumentMemory,
  readVisitHistory,
  shortestRhetoricalPath,
  wireEdges,
} from "@/world";
import { useCallback, useRef } from "react";

/**
 * Owns the koota World + Yuka pathfinding cache for the current game.
 *
 * No game logic lives here. The hook exposes a narrow API that the
 * reducer consumes via the engine's `WorldBridge` interface — a thin
 * adapter over `@/world` exports so the reducer stays pure (no direct
 * koota access inside engine/).
 */

export interface WorldHandle {
  install: (graph: ArgumentGraph) => void;
  discard: () => void;
  appendLine: (kind: "narration" | "echo" | "title" | "spacer", text: string) => void;
  /** Advance the transcript turn counter — see world/index#beginTurn. */
  beginTurn: () => void;
  movePlayer: (roomId: string) => void;
  markVisited: (roomId: string) => void;
  markAccepted: (roomId: string) => void;
  markRejected: (roomId: string) => void;
  markQuestioned: (roomId: string) => void;
  markCircleClosed: () => void;
  bumpVisitCount: (roomId: string) => void;
  visitCount: (roomId: string) => number;
  readMemory: (turnCount: number) => ArgumentMemory;
  findNextHopToCircle: (fromRoomId: string) => string | null;
  /** Exposed for the argument-map overlay and tests. */
  getWorld: () => World | null;
  /** Chronological visit order projection — the ArgumentMap reads this. */
  readVisitHistory: () => ReturnType<typeof readVisitHistory>;
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
  // Per-room visit counts live outside the world (revisits shouldn't update
  // the Visited trait, which records only first-visit order). This Map is
  // the source of truth for "how many times has the player entered room X".
  const visitCountsRef = useRef<Map<string, number>>(new Map());

  const install = useCallback((graph: ArgumentGraph) => {
    graphRef.current = graph;
    worldRef.current = buildWorld(graph);
    const { graph: g, indexByRoomId, roomIdByIndex } = buildRhetoricalGraph(worldRef.current);
    wireEdges(g, graph.rooms, indexByRoomId);
    pathRef.current = { graph: g, indexByRoomId, roomIdByIndex };
    // The start room is entered on boot — count it once so revisits bump to 2+.
    visitCountsRef.current = new Map([[graph.startRoomId, 1]]);
  }, []);

  const discard = useCallback(() => {
    worldRef.current = null;
    pathRef.current = null;
    graphRef.current = null;
    visitCountsRef.current = new Map();
  }, []);

  const appendLine = useCallback(
    (kind: "narration" | "echo" | "title" | "spacer", text: string) => {
      const world = worldRef.current;
      if (!world) return;
      appendOutput(world, kind, text);
    },
    []
  );

  const beginTurnCb = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    beginTurn(world);
  }, []);

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

  const markVisitedCb = useCallback((roomId: string) => {
    const world = worldRef.current;
    if (!world) return;
    markVisited(world, roomId);
  }, []);

  const markAcceptedCb = useCallback((roomId: string) => {
    const world = worldRef.current;
    if (!world) return;
    markRoomAccepted(world, roomId);
  }, []);

  const markRejectedCb = useCallback((roomId: string) => {
    const world = worldRef.current;
    if (!world) return;
    markRoomRejected(world, roomId);
  }, []);

  const markQuestionedCb = useCallback((roomId: string) => {
    const world = worldRef.current;
    if (!world) return;
    markRoomQuestioned(world, roomId);
  }, []);

  const markCircleClosedCb = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    markCircleClosed(world);
  }, []);

  const bumpVisitCount = useCallback((roomId: string) => {
    const counts = visitCountsRef.current;
    counts.set(roomId, (counts.get(roomId) ?? 0) + 1);
  }, []);

  const visitCount = useCallback((roomId: string): number => {
    return visitCountsRef.current.get(roomId) ?? 0;
  }, []);

  const readMemoryCb = useCallback((turnCount: number): ArgumentMemory => {
    const world = worldRef.current;
    if (!world) {
      return {
        byRoom: new Map(),
        totalAccepted: 0,
        totalRejected: 0,
        totalQuestioned: 0,
        turnCount,
      };
    }
    return readArgumentMemory(world, turnCount);
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

  const readHistoryCb = useCallback(() => {
    const world = worldRef.current;
    if (!world) return [];
    return readVisitHistory(world);
  }, []);

  return {
    install,
    discard,
    appendLine,
    beginTurn: beginTurnCb,
    movePlayer,
    markVisited: markVisitedCb,
    markAccepted: markAcceptedCb,
    markRejected: markRejectedCb,
    markQuestioned: markQuestionedCb,
    markCircleClosed: markCircleClosedCb,
    bumpVisitCount,
    visitCount,
    readMemory: readMemoryCb,
    findNextHopToCircle,
    getWorld,
    readVisitHistory: readHistoryCb,
  };
}

export type { Room };
