import type { World } from "koota";
import { Dijkstra, Edge, Graph, Node } from "yuka";
import { IsRoom, RhetoricalSpace, RoomId } from "../traits";

/**
 * Build a yuka sparse graph out of the koota world.
 *
 * Each IsRoom entity becomes a Node (keyed by an integer index derived from
 * iteration order); each Exit becomes an undirected Edge weighted by the
 * rhetorical "cost" of the passage. Fallacies and circular corridors are
 * cheaper to traverse than honest argumentation — the game treats bad-faith
 * moves as rhetorically attractive.
 */
export interface RhetoricalPath {
  /** Ordered list of room ids from source to target, inclusive. */
  rooms: string[];
  /** Whether Dijkstra found a path. */
  found: boolean;
}

const RHETORICAL_COST: Record<string, number> = {
  premise: 1.0,
  conclusion: 1.0,
  definition: 0.9,
  analogy: 1.1,
  objection: 1.3,
  meta: 1.2,
  fallacy: 0.5, // seductively cheap
  circular: 0.3, // cheapest: it doesn't go anywhere
};

export function buildRhetoricalGraph(world: World): {
  graph: Graph<Node, Edge>;
  indexByRoomId: Map<string, number>;
  roomIdByIndex: Map<number, string>;
} {
  const graph = new Graph<Node, Edge>();
  graph.digraph = false;

  const indexByRoomId = new Map<string, number>();
  const roomIdByIndex = new Map<number, string>();

  let i = 0;
  world
    .query(IsRoom, RoomId, RhetoricalSpace)
    .select(RoomId)
    .readEach(([id]) => {
      const node = new Node(i);
      graph.addNode(node);
      indexByRoomId.set(id.value, i);
      roomIdByIndex.set(i, id.value);
      i++;
    });
  // Edges are added by callers via wireEdges() from the engine ArgumentGraph —
  // the koota Exit entities carry only the target, not the source, so the
  // engine graph remains the source of truth for adjacency. This is the
  // only cross-layer reach: world reads from engine, never the reverse.

  return { graph, indexByRoomId, roomIdByIndex };
}

/**
 * Add edges from an engine ArgumentGraph into the yuka graph. Weights come
 * from the destination room's rhetorical type.
 */
export function wireEdges(
  graph: Graph<Node, Edge>,
  rooms: ReadonlyMap<
    string,
    { id: string; exits: { targetRoomId: string }[]; rhetoricalType: string }
  >,
  indexByRoomId: ReadonlyMap<string, number>
): void {
  for (const room of rooms.values()) {
    const from = indexByRoomId.get(room.id);
    if (from === undefined) continue;
    for (const exit of room.exits) {
      const to = indexByRoomId.get(exit.targetRoomId);
      if (to === undefined || to === from) continue;
      const target = rooms.get(exit.targetRoomId);
      const cost = target ? (RHETORICAL_COST[target.rhetoricalType] ?? 1.0) : 1.0;
      graph.addEdge(new Edge(from, to, cost));
    }
  }
}

export function shortestRhetoricalPath(
  graph: Graph<Node, Edge>,
  indexByRoomId: ReadonlyMap<string, number>,
  roomIdByIndex: ReadonlyMap<number, string>,
  fromRoomId: string,
  toRoomId: string
): RhetoricalPath {
  const source = indexByRoomId.get(fromRoomId);
  const target = indexByRoomId.get(toRoomId);
  if (source === undefined || target === undefined) {
    return { rooms: [], found: false };
  }

  const search = new Dijkstra(graph, source, target);
  search.search();

  if (!search.found) return { rooms: [], found: false };

  const pathIndices = search.getPath();
  const rooms: string[] = [];
  for (const idx of pathIndices) {
    const id = roomIdByIndex.get(idx);
    if (id !== undefined) rooms.push(id);
  }
  return { rooms, found: true };
}
