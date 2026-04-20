import tracery from "tracery-grammar";
import { createSeededRandom } from "../engine/prng/seedRandom";

export interface GeneratedNarrative {
  premise: string;
  conclusion: string;
  argument: string;
}

export function createGrammar(seed: number) {
  const rng = createSeededRandom(seed);
  
  // Tracery expects a function that returns a float between 0 and 1
  const grammar = tracery.createGrammar({
    "surreal_noun": ["the melting watch", "the lobster telephone", "the persistence of memory", "the cloud-eye", "the son of man"],
    "absurd_action": ["dissolves into logic", "becomes a bird", "weeps silver tears", "multiplies by zero", "defies gravity"],
    "logical_connector": ["Therefore", "Thus", "It follows that", "Consequently"],
    "argument": ["#surreal_noun# #absurd_action#. #logical_connector#, #surreal_noun# #absurd_action#."]
  });

  (grammar as any).rng = rng;
  return grammar;
}

export const generateAbsurdArgument = (seed: number): string => {
  const grammar = createGrammar(seed);
  return grammar.flatten("#argument#");
};
