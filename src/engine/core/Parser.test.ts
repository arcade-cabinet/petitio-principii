import { describe, expect, it } from "vitest";
import { parseCommand } from "./Parser";

describe("parseCommand", () => {
  it("parses direction shortcuts", () => {
    expect(parseCommand("n").verb).toBe("north");
    expect(parseCommand("s").verb).toBe("south");
    expect(parseCommand("e").verb).toBe("east");
    expect(parseCommand("w").verb).toBe("west");
    expect(parseCommand("u").verb).toBe("up");
    expect(parseCommand("d").verb).toBe("down");
  });

  it("parses full direction words", () => {
    expect(parseCommand("north").verb).toBe("north");
    expect(parseCommand("SOUTH").verb).toBe("south");
    expect(parseCommand("East").verb).toBe("east");
  });

  it("parses go <direction>", () => {
    expect(parseCommand("go north").verb).toBe("north");
    expect(parseCommand("GO SOUTH").verb).toBe("south");
  });

  it("parses examine commands", () => {
    expect(parseCommand("examine").verb).toBe("examine");
    expect(parseCommand("x premise").verb).toBe("examine");
    expect(parseCommand("inspect room").verb).toBe("examine");
  });

  it("parses look command", () => {
    expect(parseCommand("look").verb).toBe("look");
    expect(parseCommand("l").verb).toBe("look");
  });

  it("parses help command", () => {
    expect(parseCommand("help").verb).toBe("help");
    expect(parseCommand("?").verb).toBe("help");
    expect(parseCommand("h").verb).toBe("help");
  });

  it("parses accept and reject", () => {
    expect(parseCommand("accept").verb).toBe("accept");
    expect(parseCommand("agree").verb).toBe("accept");
    expect(parseCommand("reject").verb).toBe("reject");
    expect(parseCommand("deny").verb).toBe("reject");
  });

  it("parses question and ask", () => {
    expect(parseCommand("question").verb).toBe("question");
    expect(parseCommand("ask").verb).toBe("ask");
    expect(parseCommand("ask why").verb).toBe("ask");
  });

  it("parses new game", () => {
    expect(parseCommand("new").verb).toBe("new");
    expect(parseCommand("new game").verb).toBe("new");
  });

  it("preserves raw input", () => {
    const cmd = parseCommand("examine premise");
    expect(cmd.raw).toBe("examine premise");
  });

  it("handles unknown commands gracefully", () => {
    const cmd = parseCommand("xyzzy");
    expect(cmd.verb).toBe("examine");
    expect(cmd.args).toContain("xyzzy");
  });
});
