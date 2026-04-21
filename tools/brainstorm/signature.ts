/**
 * Stage 4 — style-signature extraction.
 *
 * For every source in every cluster + every cluster as a whole,
 * compute the style signature described in
 * docs/design/pivot/05-BRAINSTORM-PIPELINE.md §4.4.
 *
 * Output: tools/brainstorm/signatures/<cluster-id>/signatures.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, readClusterManifests, readCorpusManifest } from "./io";
import { SENTENCES_DIR, SIGNATURES_DIR } from "./paths";
import type { ClusterManifest, StyleSignature } from "./types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Very rough heuristic: words of ≥ 3 syllables OR ending in common
 * Latinate suffixes (-tion, -ment, -ence, -ance, -ity, -ous, -ize,
 * -ise, -ate, -ify) count as "Latinate." Not etymologically
 * rigorous, but stable enough for signature comparison.
 */
const LATINATE_RE = /\b\w*(?:tion|ment|ence|ance|ity|ous|ize|ise|ate|ify)\b/gi;

const MODALS = new Set([
  "can",
  "could",
  "may",
  "might",
  "must",
  "shall",
  "should",
  "will",
  "would",
  "ought",
]);

const SENSORY = {
  visual: [
    "see",
    "saw",
    "seen",
    "looked",
    "look",
    "looking",
    "glance",
    "glanced",
    "stared",
    "staring",
    "bright",
    "dark",
    "dim",
    "pale",
    "shadow",
    "shadows",
    "glittered",
    "colour",
    "color",
    "glimpsed",
  ],
  auditory: [
    "heard",
    "hear",
    "hearing",
    "listened",
    "listen",
    "silence",
    "silent",
    "sound",
    "sounded",
    "whisper",
    "whispered",
    "rang",
    "rings",
    "ringing",
    "echo",
    "voice",
  ],
  tactile: [
    "felt",
    "feel",
    "feeling",
    "touch",
    "touched",
    "cold",
    "warm",
    "smooth",
    "rough",
    "wet",
    "dry",
    "soft",
  ],
  olfactory: ["smell", "smelled", "scent", "perfume", "odor", "odour", "reek", "reeked"],
  kinesthetic: [
    "walked",
    "stepped",
    "ran",
    "moved",
    "moving",
    "climbed",
    "descend",
    "descended",
    "bent",
    "leaned",
    "rose",
    "stood",
  ],
};

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

interface SentenceRec {
  ref: string;
  sentence_idx: number;
  text: string;
}

async function readSentencesForRef(ref: string): Promise<SentenceRec[]> {
  // The corpus manifest knows which file to look in; we search by ref.
  // This is linear across sources but fine for our scale.
  const manifest = await readCorpusManifest();
  const src = manifest.sources.find((s) => s.ref === ref);
  if (!src) return [];
  const file = path.join(SENTENCES_DIR, slugify(src.author), `${slugify(src.work)}.jsonl`);
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as SentenceRec);
  } catch {
    return [];
  }
}

function computeSignature(
  clusterId: string,
  sourceRef: string | null,
  sentences: SentenceRec[]
): StyleSignature {
  const lengths: number[] = [];
  let totalWords = 0;
  const typeSet = new Set<string>();
  const bigramCount = new Map<string, number>();
  const trigramCount = new Map<string, number>();
  const sensoryCount = { visual: 0, auditory: 0, tactile: 0, olfactory: 0, kinesthetic: 0 };
  let latinateMatches = 0;
  let modalMatches = 0;
  let pov1 = 0;
  let pov2 = 0;
  let pov3 = 0;

  for (const s of sentences) {
    const text = s.text.toLowerCase();
    const words = text.match(/[a-z']+/g) ?? [];
    lengths.push(words.length);
    totalWords += words.length;
    for (const w of words) typeSet.add(w);
    for (let i = 0; i < words.length - 1; i++) {
      const bg = `${words[i]} ${words[i + 1]}`;
      bigramCount.set(bg, (bigramCount.get(bg) ?? 0) + 1);
    }
    for (let i = 0; i < words.length - 2; i++) {
      const tg = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      trigramCount.set(tg, (trigramCount.get(tg) ?? 0) + 1);
    }
    // POV heuristic: first-person pronouns, second, third
    for (const w of words) {
      if (
        w === "i" ||
        w === "me" ||
        w === "my" ||
        w === "mine" ||
        w === "we" ||
        w === "our" ||
        w === "us"
      )
        pov1++;
      else if (w === "you" || w === "your" || w === "yours") pov2++;
      else if (
        w === "he" ||
        w === "she" ||
        w === "him" ||
        w === "her" ||
        w === "they" ||
        w === "them" ||
        w === "their"
      )
        pov3++;
      if (MODALS.has(w)) modalMatches++;
      for (const ch of Object.keys(SENSORY) as (keyof typeof SENSORY)[]) {
        if (SENSORY[ch].includes(w)) sensoryCount[ch]++;
      }
    }
    const lmatch = text.match(LATINATE_RE);
    if (lmatch) latinateMatches += lmatch.length;
  }

  const povTotal = pov1 + pov2 + pov3 || 1;
  const sensoryTotal =
    sensoryCount.visual +
      sensoryCount.auditory +
      sensoryCount.tactile +
      sensoryCount.olfactory +
      sensoryCount.kinesthetic || 1;

  const topBigrams = [...bigramCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([bigram, count]) => ({ bigram, count }));

  const topTrigrams = [...trigramCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([trigram, count]) => ({ trigram, count }));

  return {
    cluster_id: clusterId,
    source_ref: sourceRef,
    sentence_count: sentences.length,
    word_count: totalWords,
    sentence_length_p10: percentile(lengths, 10),
    sentence_length_p50: percentile(lengths, 50),
    sentence_length_p90: percentile(lengths, 90),
    sentence_length_max: lengths.length ? Math.max(...lengths) : 0,
    latinate_ratio: totalWords > 0 ? latinateMatches / totalWords : 0,
    type_token_ratio: totalWords > 0 ? typeSet.size / totalWords : 0,
    modal_verb_rate: totalWords > 0 ? modalMatches / totalWords : 0,
    sensory_mix: {
      visual: sensoryCount.visual / sensoryTotal,
      auditory: sensoryCount.auditory / sensoryTotal,
      tactile: sensoryCount.tactile / sensoryTotal,
      olfactory: sensoryCount.olfactory / sensoryTotal,
      kinesthetic: sensoryCount.kinesthetic / sensoryTotal,
    },
    pov_1st: pov1 / povTotal,
    pov_2nd: pov2 / povTotal,
    pov_3rd: pov3 / povTotal,
    signature_bigrams: topBigrams,
    signature_trigrams: topTrigrams,
  };
}

export async function extractSignaturesForCluster(c: ClusterManifest): Promise<void> {
  const allSentences: SentenceRec[] = [];
  const perSource = new Map<string, SentenceRec[]>();
  for (const src of c.sources) {
    const s = await readSentencesForRef(src.ref);
    if (s.length === 0) {
      console.warn(`  ${c.id}: no sentences for source ${src.ref} (did you fetch + normalize?)`);
      continue;
    }
    perSource.set(src.ref, s);
    allSentences.push(...s);
  }
  const signatures: StyleSignature[] = [];
  for (const [ref, sentences] of perSource.entries()) {
    signatures.push(computeSignature(c.id, ref, sentences));
  }
  signatures.push(computeSignature(c.id, null, allSentences));

  const outDir = path.join(SIGNATURES_DIR, c.id);
  await ensureDir(outDir);
  await fs.writeFile(
    path.join(outDir, "signatures.json"),
    JSON.stringify(signatures, null, 2),
    "utf8"
  );
  console.log(
    `  ${c.id}: signatures emitted (${perSource.size} per-source + 1 aggregate, ${allSentences.length} total sentences)`
  );
}

export async function extractAllSignatures(): Promise<void> {
  const clusters = await readClusterManifests();
  for (const c of clusters) {
    await extractSignaturesForCluster(c);
  }
}
