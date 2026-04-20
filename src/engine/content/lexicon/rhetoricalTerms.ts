export interface RhetoricalTerm {
  term: string;
  definition: string;
  category: "fallacy" | "device" | "structure";
}

export const RHETORICAL_TERMS: readonly RhetoricalTerm[] = [
  {
    term: "Petitio Principii",
    definition: "Assuming the conclusion as a premise; begging the question.",
    category: "fallacy",
  },
  {
    term: "Ad Hominem",
    definition: "Attacking the person rather than the argument.",
    category: "fallacy",
  },
  {
    term: "Straw Man",
    definition: "Misrepresenting an opponent's argument to attack it more easily.",
    category: "fallacy",
  },
  {
    term: "False Dichotomy",
    definition: "Presenting only two options when more exist.",
    category: "fallacy",
  },
  {
    term: "Equivocation",
    definition: "Using the same word with different meanings across an argument.",
    category: "fallacy",
  },
  {
    term: "Analogy",
    definition: "Comparing two things to suggest similarity in an unexamined respect.",
    category: "device",
  },
  {
    term: "Syllogism",
    definition: "A deductive argument with two premises and a conclusion.",
    category: "structure",
  },
  {
    term: "Reductio ad Absurdum",
    definition: "Disproving a premise by showing it leads to an absurd conclusion.",
    category: "structure",
  },
  {
    term: "Appeal to Authority",
    definition: "Using an authority figure's opinion as evidence.",
    category: "fallacy",
  },
  {
    term: "Slippery Slope",
    definition: "Asserting that one event will lead to extreme consequences without justification.",
    category: "fallacy",
  },
];
