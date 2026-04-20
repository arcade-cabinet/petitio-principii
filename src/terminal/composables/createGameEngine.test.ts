import { IsPlayer, Position } from "@/world";
import { describe, expect, it } from "vitest";
import { createGameEngine } from "./createGameEngine";

describe("createGameEngine", () => {
  it("builds a world on startGame and the player Position matches the start room", () => {
    const engine = createGameEngine();
    expect(engine.world()).toBeNull();

    engine.startGame(42);

    const world = engine.world();
    expect(world).not.toBeNull();
    if (!world) return;

    const startRoomId = engine.gameState().currentRoomId;
    expect(startRoomId).not.toBe("");

    let observed = "";
    world
      .query(IsPlayer, Position)
      .select(Position)
      .readEach(([position]) => {
        observed = position.roomId;
      });

    expect(observed).toBe(startRoomId);
  });
});
