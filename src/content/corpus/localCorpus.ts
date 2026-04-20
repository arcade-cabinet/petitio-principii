import { RHETORICAL_TERMS } from "../lexicon/rhetoricalTerms";

export interface FallacyEntry {
  id: string;
  name: string;
  latinName?: string;
  definition: string;
  example: string;
}

const FALLACY_METADATA: Readonly<Record<string, Omit<FallacyEntry, "id" | "definition">>> = {
  "petitio-principii": {
    name: "Begging the Question",
    latinName: "Petitio Principii",
    example:
      "'The Bible is true because it says so in the Bible.' The conclusion is embedded in the premise.",
  },
  "ad-hominem": {
    name: "Ad Hominem",
    example:
      "'You can't trust her argument about taxation—she hasn't even paid her own taxes.' The personal failing is irrelevant to the argument's validity.",
  },
  "straw-man": {
    name: "Straw Man",
    example:
      "Person A: 'We should reduce military spending.' Person B: 'So you want to leave us defenceless?' B has distorted A's position.",
  },
  equivocation: {
    name: "Equivocation",
    example:
      "'Nothing is better than eternal happiness. A ham sandwich is better than nothing. Therefore, a ham sandwich is better than eternal happiness.' The word 'nothing' shifts meaning.",
  },
  "false-dichotomy": {
    name: "False Dichotomy",
    example:
      "'You're either with us or against us.' The world may contain people who are neither, or both, or who disagree on the terms.",
  },
  "slippery-slope": {
    name: "Slippery Slope",
    example:
      "'If we allow same-sex marriage, next people will want to marry their pets.' The chain is asserted, not demonstrated.",
  },
  "appeal-to-authority": {
    name: "Appeal to Authority",
    example:
      "'Einstein believed in God, so there must be a God.' Einstein's authority in physics does not extend to theology.",
  },
};

export const LOCAL_CORPUS: readonly FallacyEntry[] = RHETORICAL_TERMS.filter(
  (term) => term.category === "fallacy"
).map((term) => {
  const metadata = FALLACY_METADATA[term.id];

  if (!metadata) {
    throw new Error(`Missing fallacy corpus metadata for term id: ${term.id}`);
  }

  return {
    id: term.id,
    name: metadata.name,
    latinName: metadata.latinName,
    definition: term.definition,
    example: metadata.example,
  };
});
