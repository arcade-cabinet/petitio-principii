export interface FallacyEntry {
  name: string;
  latinName?: string;
  definition: string;
  example: string;
}

export const LOCAL_CORPUS: readonly FallacyEntry[] = [
  {
    name: "Begging the Question",
    latinName: "Petitio Principii",
    definition:
      "An argument that assumes the truth of its conclusion as a premise, making the reasoning circular.",
    example:
      "'The Bible is true because it says so in the Bible.' The conclusion is embedded in the premise.",
  },
  {
    name: "Ad Hominem",
    definition:
      "Attacking the person making an argument rather than addressing the argument itself.",
    example:
      "'You can't trust her argument about taxation—she hasn't even paid her own taxes.' The personal failing is irrelevant to the argument's validity.",
  },
  {
    name: "Straw Man",
    definition: "Misrepresenting an opponent's argument to make it easier to attack.",
    example:
      "Person A: 'We should reduce military spending.' Person B: 'So you want to leave us defenceless?' B has distorted A's position.",
  },
  {
    name: "Equivocation",
    definition:
      "Using a word or phrase with multiple meanings in a way that shifts meaning mid-argument.",
    example:
      "'Nothing is better than eternal happiness. A ham sandwich is better than nothing. Therefore, a ham sandwich is better than eternal happiness.' The word 'nothing' shifts meaning.",
  },
  {
    name: "False Dichotomy",
    definition: "Presenting only two choices when more alternatives exist.",
    example:
      "'You're either with us or against us.' The world may contain people who are neither, or both, or who disagree on the terms.",
  },
  {
    name: "Slippery Slope",
    definition:
      "Asserting that one event will lead to a chain of negative consequences without justification.",
    example:
      "'If we allow same-sex marriage, next people will want to marry their pets.' The chain is asserted, not demonstrated.",
  },
  {
    name: "Appeal to Authority",
    definition:
      "Using the opinion of an authority figure as evidence, without considering whether the authority is relevant or reliable.",
    example:
      "'Einstein believed in God, so there must be a God.' Einstein's authority in physics does not extend to theology.",
  },
];
