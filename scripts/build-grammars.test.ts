import { createSeededRandom } from "@/engine";
import { withSeededRng } from "@/lib/seeded-tracery";
import tracery from "tracery-grammar";
import { describe, expect, it } from "vitest";
import { type GeneratedGrammars, buildGrammars } from "./build-grammars";

/**
 * T42 guarantees:
 *
 *   1. build-grammars emits a well-formed artifact covering all 8 rhetorical
 *      types × 3 acts, all 4 agent states × 3 verbs, plus the incantation
 *      grammar.
 *   2. Slot vocabularies are populated from the real frozen sources
 *      (surrealist-fragments, NOUNS, ADJECTIVES) — not placeholder stubs.
 *   3. Every description/agent rule Tracery-flattens to a non-empty string
 *      when fed the runtime-required symbol overrides (fragment / acks /
 *      roomTitle / roomType / roomArticle).
 *   4. Under `withSeededRng(createSeededRandom(seed))`, expanding any rule
 *      twice with the same seed yields byte-identical output — the invariant
 *      T41 established now extends to the real grammar.
 */

const RHETORICAL_TYPES = [
  "premise",
  "conclusion",
  "definition",
  "analogy",
  "fallacy",
  "circular",
  "objection",
  "meta",
] as const;

const ACTS = ["I", "II", "III"] as const;

const AGENT_STATES = ["Composed", "Defensive", "Seductive", "Triumphant"] as const;

const VERBS = ["accept", "reject", "question"] as const;

/**
 * Build a Tracery grammar object from the emitted JSON, with the runtime
 * overrides a real caller would install:
 *
 *   - `fragment` / `fragment_short` / `fragmentA` / `fragmentB` come from slots
 *   - `acceptedAck` / `rejectedAck` / `questionedAck` come from acks
 *   - `roomTitle` / `roomType` / `roomArticle` fake runtime context
 */
function realizeGrammar(g: GeneratedGrammars, ruleSet: readonly string[]) {
  return tracery.createGrammar({
    origin: [...ruleSet],
    fragment: [...g.slots.fragment],
    fragment_short: [...g.slots.fragment_short],
    fragmentA: [...g.slots.fragmentA],
    fragmentB: [...g.slots.fragmentB],
    acceptedAck: [...g.acks.accepted],
    rejectedAck: [...g.acks.rejected],
    questionedAck: [...g.acks.questioned],
    roomTitle: ["The Rotunda of Seven Entrances"],
    roomType: ["circular"],
    roomArticle: ["a"],
  });
}

describe("buildGrammars", () => {
  const grammars = buildGrammars(new Date("2026-04-20T23:00:00Z"));

  it("covers all 8 rhetorical types × 3 acts with ≥ 1 rule each", () => {
    for (const type of RHETORICAL_TYPES) {
      for (const act of ACTS) {
        const rules = grammars.descriptions[type][act];
        expect(rules.length, `${type}/${act}`).toBeGreaterThanOrEqual(1);
        for (const r of rules) {
          expect(r, `${type}/${act}`).not.toBe("");
        }
      }
    }
  });

  it("covers all 4 agent states × 3 verbs with ≥ 1 rule each", () => {
    for (const state of AGENT_STATES) {
      for (const verb of VERBS) {
        const rules = grammars.agent[state][verb];
        expect(rules.length, `${state}/${verb}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("populates slot vocabularies from the frozen surrealist corpus", () => {
    // Surrealist source requires ≥ 30 fragments; slot lists mirror that pool.
    expect(grammars.slots.fragment.length).toBeGreaterThanOrEqual(30);
    expect(grammars.slots.fragment_short.length).toBe(grammars.slots.fragment.length);
    expect(grammars.slots.fragmentA.length).toBe(grammars.slots.fragment.length);
    expect(grammars.slots.fragmentB.length).toBe(grammars.slots.fragment.length);
  });

  it("supplies the incantation grammar's adj + noun pools", () => {
    expect(grammars.incantation.origin).toContain("#adj# #adj# #noun#");
    expect(grammars.incantation.adj.length).toBeGreaterThan(10);
    expect(grammars.incantation.noun.length).toBeGreaterThan(10);
  });

  it("has ack clauses that reference fragment_short", () => {
    for (const kind of ["accepted", "rejected", "questioned"] as const) {
      const clauses = grammars.acks[kind];
      expect(clauses.length).toBeGreaterThanOrEqual(1);
      for (const c of clauses) {
        expect(c).toMatch(/#fragment_short#/);
      }
    }
  });

  it("translates curly-brace placeholders to Tracery #symbol# form", () => {
    // Spot-check one rule known to contain every kind of placeholder.
    const analogyI = grammars.descriptions.analogy.I;
    const hasPairRule = analogyI.some(
      (r) => r.includes("#fragmentA#") && r.includes("#fragmentB#")
    );
    expect(hasPairRule).toBe(true);
    for (const act of ACTS) {
      for (const rule of grammars.descriptions.premise[act]) {
        expect(rule).not.toMatch(/\{[a-zA-Z]/); // no un-translated curly placeholders
      }
    }
  });

  it("flattens every description rule to a non-empty string under a seeded RNG", () => {
    for (const type of RHETORICAL_TYPES) {
      for (const act of ACTS) {
        const grammar = realizeGrammar(grammars, grammars.descriptions[type][act]);
        const rng = createSeededRandom(123);
        const out = withSeededRng(rng, () => grammar.flatten("#origin#"));
        expect(out.length, `${type}/${act}`).toBeGreaterThan(0);
        expect(out, `${type}/${act}`).not.toMatch(/#[a-zA-Z_]+#/); // nothing left unflattened
      }
    }
  });

  it("flattens every agent rule to a non-empty string under a seeded RNG", () => {
    for (const state of AGENT_STATES) {
      for (const verb of VERBS) {
        const grammar = realizeGrammar(grammars, grammars.agent[state][verb]);
        const rng = createSeededRandom(456);
        const out = withSeededRng(rng, () => grammar.flatten("#origin#"));
        expect(out.length, `${state}/${verb}`).toBeGreaterThan(0);
        expect(out, `${state}/${verb}`).not.toMatch(/#[a-zA-Z_]+#/);
      }
    }
  });

  it("flattens the incantation grammar to three words under a seeded RNG", () => {
    const grammar = tracery.createGrammar({
      origin: [...grammars.incantation.origin],
      adj: [...grammars.incantation.adj],
      noun: [...grammars.incantation.noun],
    });
    const rng = createSeededRandom(789);
    const out = withSeededRng(rng, () => grammar.flatten("#origin#"));
    expect(out.split(/\s+/).length).toBe(3);
  });

  it("produces byte-identical output for the same seed + rule (determinism invariant)", () => {
    // A composition that exercises multiple symbol lookups in one flatten.
    const grammar = realizeGrammar(grammars, grammars.descriptions.premise.II);
    const first = withSeededRng(createSeededRandom(42), () => grammar.flatten("#origin#"));
    const second = withSeededRng(createSeededRandom(42), () => grammar.flatten("#origin#"));
    expect(first).toBe(second);
  });
});
