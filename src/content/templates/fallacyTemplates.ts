export interface FallacyTemplate {
  name: string;
  encounter: string;
  hint: string;
}

export const FALLACY_TEMPLATES: readonly FallacyTemplate[] = [
  {
    name: "Petitio Principii",
    encounter:
      "The argument assumes its conclusion. The premise and the conclusion are the same statement, dressed differently.",
    hint: "Try TRACE BACK to see where this reasoning began.",
  },
  {
    name: "Equivocation",
    encounter:
      "The word 'reason' has shifted meaning mid-argument. It meant 'cause' at the start; now it means 'justification'.",
    hint: "EXAMINE DEFINITION might clarify things.",
  },
  {
    name: "False Dichotomy",
    encounter: "The argument presents only two options. But the corridor has three doors.",
    hint: "LOOK AROUND for the third option.",
  },
  {
    name: "Ad Hominem",
    encounter:
      "The opposing voice has shifted from attacking the argument to attacking you personally. This is not a useful move.",
    hint: "REJECT this line of reasoning.",
  },
  {
    name: "Slippery Slope",
    encounter:
      "One small concession, the argument suggests, will lead inevitably to catastrophe. The staircase looks very long from here.",
    hint: "QUESTION ASSUMPTION before descending.",
  },
  {
    name: "Straw Man",
    encounter:
      "You find a caricature of your own position propped up in the corner. It is much easier to knock down than what you actually said.",
    hint: "EXAMINE it closely to reveal the distortion.",
  },
  {
    name: "Appeal to Authority",
    encounter:
      "A booming voice cites a famous philosopher who once walked these halls. The name is impressive, but the reasoning is absent.",
    hint: "ASK WHY the authority's claim is actually true.",
  },
];
