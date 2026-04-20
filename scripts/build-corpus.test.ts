import { describe, expect, it } from "vitest";

import { ADJECTIVES } from "../src/content/lexicon/adjectives.ts";
import { NOUNS } from "../src/content/lexicon/nouns.ts";
import { buildCorpus, renderCorpusModule, renderStableCorpusModule } from "./build-corpus.ts";

describe("build-corpus pipeline", () => {
  const corpus = buildCorpus();

  it("processes every lexicon entry exactly once", () => {
    expect(corpus.nouns).toHaveLength(NOUNS.length);
    expect(corpus.adjectives).toHaveLength(ADJECTIVES.length);
  });

  it("emits a non-empty plural and positive syllable count for every noun", () => {
    for (const noun of corpus.nouns) {
      expect(noun.plural.length).toBeGreaterThan(0);
      expect(noun.syllables).toBeGreaterThan(0);
    }
  });

  it("emits a positive syllable count for every adjective", () => {
    for (const adj of corpus.adjectives) {
      expect(adj.syllables).toBeGreaterThan(0);
    }
  });

  it("stamps an ISO-8601 lastBuilt timestamp", () => {
    expect(() => new Date(corpus.lastBuilt).toISOString()).not.toThrow();
    expect(new Date(corpus.lastBuilt).toISOString()).toBe(corpus.lastBuilt);
  });

  it("rejects non-nouns rather than silently passing them through", () => {
    expect(() => buildCorpus(["happily", ...NOUNS], ADJECTIVES)).toThrow(/non-nouns/);
  });

  it("rejects non-adjectives rather than silently passing them through", () => {
    expect(() => buildCorpus(NOUNS, ["happily", ...ADJECTIVES])).toThrow(/non-adjectives/);
  });

  it("preserves the previous lastBuilt when content is unchanged", () => {
    const first = renderCorpusModule(corpus);
    const later = renderStableCorpusModule(
      { ...corpus, lastBuilt: new Date(Date.now() + 60_000).toISOString() },
      first
    );
    expect(later).toBe(first);
  });
});
