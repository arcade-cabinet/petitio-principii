export interface RhetoricalTerm {
  id: string;
  term: string;
  definition: string;
  category: "fallacy" | "device" | "structure";
}

export const RHETORICAL_TERMS: readonly RhetoricalTerm[] = [
  {
    id: "petitio-principii",
    term: "Petitio Principii",
    definition: "Assuming the conclusion as a premise; begging the question.",
    category: "fallacy",
  },
  {
    id: "ad-hominem",
    term: "Ad Hominem",
    definition: "Attacking the person rather than the argument.",
    category: "fallacy",
  },
  {
    id: "straw-man",
    term: "Straw Man",
    definition: "Misrepresenting an opponent's argument to attack it more easily.",
    category: "fallacy",
  },
  {
    id: "false-dichotomy",
    term: "False Dichotomy",
    definition: "Presenting only two options when more exist.",
    category: "fallacy",
  },
  {
    id: "equivocation",
    term: "Equivocation",
    definition: "Using the same word with different meanings across an argument.",
    category: "fallacy",
  },
  {
    id: "analogy",
    term: "Analogy",
    definition: "Comparing two things to suggest similarity in an unexamined respect.",
    category: "device",
  },
  {
    id: "syllogism",
    term: "Syllogism",
    definition: "A deductive argument with two premises and a conclusion.",
    category: "structure",
  },
  {
    id: "reductio-ad-absurdum",
    term: "Reductio ad Absurdum",
    definition: "Disproving a premise by showing it leads to an absurd conclusion.",
    category: "structure",
  },
  {
    id: "appeal-to-authority",
    term: "Appeal to Authority",
    definition: "Using an authority figure's opinion as evidence.",
    category: "fallacy",
  },
  {
    id: "slippery-slope",
    term: "Slippery Slope",
    definition: "Asserting that one event will lead to extreme consequences without justification.",
    category: "fallacy",
  },
];
