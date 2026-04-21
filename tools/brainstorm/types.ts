/**
 * Shared types for the brainstorm pipeline.
 *
 * See docs/design/pivot/05-BRAINSTORM-PIPELINE.md for the full design
 * and intended outputs.
 */

export interface SourceManifestEntry {
  readonly ref: string;
  readonly author: string;
  readonly work: string;
  readonly original_year: number;
  readonly language: string;
  readonly pd_basis: string;
  readonly gutenberg_id: number | null;
  readonly translator?: string;
  readonly translation_year?: number;
  readonly translator_death?: number;
  readonly source_url?: string;
  readonly notes?: string;
}

export interface CorpusManifest {
  readonly manifest_date: string;
  readonly sources: ReadonlyArray<SourceManifestEntry>;
}

export interface ClusterSource {
  readonly ref: string;
  readonly role: "primary" | "counterweight";
  readonly weight: number;
}

export interface ClusterManifest {
  readonly id: string;
  readonly slot_hour: number | null;
  readonly title: string;
  readonly context: {
    readonly period: string;
    readonly milieu: string;
    readonly genre: string;
  };
  readonly sources: ReadonlyArray<ClusterSource>;
  readonly exclude: ReadonlyArray<string>;
  readonly notes: string;
}

/**
 * One sentence in a cluster's embedded corpus. `rowid` is assigned
 * by sqlite-vec when the vector lands; during in-memory assembly
 * before insert, it is absent.
 */
export interface ClusterSentence {
  readonly cluster_id: string;
  readonly source_ref: string;
  readonly sentence_idx: number;
  readonly text: string;
}

export interface StyleSignature {
  readonly cluster_id: string;
  readonly source_ref: string | null; // null = whole-cluster aggregate
  readonly sentence_count: number;
  readonly word_count: number;
  readonly sentence_length_p10: number;
  readonly sentence_length_p50: number;
  readonly sentence_length_p90: number;
  readonly sentence_length_max: number;
  readonly latinate_ratio: number;
  readonly type_token_ratio: number;
  readonly modal_verb_rate: number;
  readonly sensory_mix: {
    readonly visual: number;
    readonly auditory: number;
    readonly tactile: number;
    readonly olfactory: number;
    readonly kinesthetic: number;
  };
  readonly pov_1st: number;
  readonly pov_2nd: number;
  readonly pov_3rd: number;
  readonly signature_bigrams: ReadonlyArray<{ bigram: string; count: number }>;
  readonly signature_trigrams: ReadonlyArray<{ trigram: string; count: number }>;
}

export type EmbedVector = Float32Array;

export interface EmbeddingsCache {
  // sha256(text + '|' + model_id) → base64 float32 array
  [key: string]: string;
}
