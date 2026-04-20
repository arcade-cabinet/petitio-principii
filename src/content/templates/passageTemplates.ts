export interface PassageTemplate {
  description: string;
  rhetoricalMove: string;
}

export const PASSAGE_TEMPLATES: readonly PassageTemplate[] = [
  {
    description: "A narrow corridor of inference",
    rhetoricalMove: "from assumption to assertion",
  },
  {
    description: "A long, winding staircase of implications",
    rhetoricalMove: "from analogy to equivocation",
  },
  {
    description: "A doorway framed by two competing premises",
    rhetoricalMove: "from premise to conclusion",
  },
  {
    description: "A sliding panel behind a bookcase of definitions",
    rhetoricalMove: "from definition to redefinition",
  },
  {
    description: "A bridge of dubious similarity",
    rhetoricalMove: "from case to generalization",
  },
  {
    description: "A low arch marked 'THEREFORE'",
    rhetoricalMove: "from evidence to conclusion",
  },
  {
    description: "A revolving door that always returns you to the start",
    rhetoricalMove: "circular reasoning",
  },
  {
    description: "An unmarked passage that feels familiar",
    rhetoricalMove: "suppressed premise",
  },
];
