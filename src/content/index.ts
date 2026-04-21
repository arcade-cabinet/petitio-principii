export { ADJECTIVES } from "./lexicon/adjectives";
export { NOUNS } from "./lexicon/nouns";
export { RHETORICAL_TERMS, type RhetoricalTerm } from "./lexicon/rhetoricalTerms";
export { FALLACY_TEMPLATES } from "./templates/fallacyTemplates";
export { PASSAGE_TEMPLATES } from "./templates/passageTemplates";
export { ROOM_TEMPLATES, type RhetoricalType, type RoomTemplate } from "./templates/roomTemplates";
export { LOCAL_CORPUS, type FallacyEntry } from "./corpus/localCorpus";
export { createGrammar, generateAbsurdArgument, type GeneratedNarrative } from "./grammar";
export {
  GENERATED_CORPUS,
  type GeneratedAdjective,
  type GeneratedCorpus,
  type GeneratedNoun,
} from "./generated/corpus";
export {
  SURREALIST_CORPUS,
  type GeneratedSurrealistCorpus,
  type GeneratedSurrealistFragment,
  type TaggedWord,
} from "./generated/surrealist";
export {
  chainDescription,
  type ChainingMemory,
  type ChainingOptions,
} from "./chaining";
