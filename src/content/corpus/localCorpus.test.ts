import { describe, expect, it } from "vitest";
import { RHETORICAL_TERMS } from "../lexicon/rhetoricalTerms";
import { LOCAL_CORPUS } from "./localCorpus";

describe("LOCAL_CORPUS", () => {
  it("derives all fallacy entries from the canonical rhetorical term list", () => {
    const fallacyTerms = RHETORICAL_TERMS.filter((term) => term.category === "fallacy");

    expect(LOCAL_CORPUS).toHaveLength(fallacyTerms.length);
    expect(LOCAL_CORPUS.map((entry) => entry.id).sort()).toEqual(
      fallacyTerms.map((term) => term.id).sort()
    );
  });

  it("reuses the canonical fallacy definitions", () => {
    const definitionsById = new Map(RHETORICAL_TERMS.map((term) => [term.id, term.definition]));

    for (const entry of LOCAL_CORPUS) {
      expect(entry.definition).toBe(definitionsById.get(entry.id));
    }
  });

  it("assigns a stable id and example to every local corpus entry", () => {
    for (const entry of LOCAL_CORPUS) {
      expect(entry.id).toBeTruthy();
      expect(entry.example).toBeTruthy();
    }
  });
});
