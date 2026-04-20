import { describe, expect, it } from "vitest";
import { createSeededRandom, generateSeed, pickRandom, shuffleArray } from "./seedRandom";

describe("createSeededRandom", () => {
  it("produces the same sequence for the same seed", () => {
    const rng1 = createSeededRandom(42);
    const rng2 = createSeededRandom(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences for different seeds", () => {
    const rng1 = createSeededRandom(1);
    const rng2 = createSeededRandom(2);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it("produces values between 0 and 1", () => {
    const rng = createSeededRandom(12345);
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("produces a deterministic sequence (regression test)", () => {
    const rng = createSeededRandom(0xdeadbeef);
    const first = rng();
    expect(typeof first).toBe("number");
    const rng2 = createSeededRandom(0xdeadbeef);
    expect(rng2()).toBe(first);
  });
});

describe("generateSeed", () => {
  it("returns a number", () => {
    const seed = generateSeed();
    expect(typeof seed).toBe("number");
  });

  it("returns a positive integer", () => {
    const seed = generateSeed();
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(seed)).toBe(true);
  });
});

describe("pickRandom", () => {
  it("picks from the array", () => {
    const arr = ["a", "b", "c"];
    const rng = createSeededRandom(99);
    const picked = pickRandom(arr, rng);
    expect(arr).toContain(picked);
  });

  it("is deterministic with same seed", () => {
    const arr = ["x", "y", "z"];
    const rng1 = createSeededRandom(7);
    const rng2 = createSeededRandom(7);
    expect(pickRandom(arr, rng1)).toBe(pickRandom(arr, rng2));
  });
});

describe("shuffleArray", () => {
  it("returns the same elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const rng = createSeededRandom(100);
    const shuffled = shuffleArray(arr, rng);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not mutate the original array", () => {
    const arr = [1, 2, 3];
    const rng = createSeededRandom(1);
    shuffleArray(arr, rng);
    expect(arr).toEqual([1, 2, 3]);
  });

  it("is deterministic", () => {
    const arr = [1, 2, 3, 4, 5];
    const s1 = shuffleArray(arr, createSeededRandom(42));
    const s2 = shuffleArray(arr, createSeededRandom(42));
    expect(s1).toEqual(s2);
  });
});
