/**
 * Stage 6 — emit the per-cluster synthesis brief markdown.
 *
 * Reads the cluster manifest + the signatures.json + a sample of
 * sentences to produce `authoring/briefs/<cluster-id>.md`, the
 * author-facing document per docs/design/pivot/05-BRAINSTORM-PIPELINE.md §4.6.
 *
 * The brief is a synthesis of:
 *   - cluster context
 *   - aggregate style signature (quantitative)
 *   - per-source divergences (what each source contributes uniquely)
 *   - authorial permissions (what the cluster lets you do that no
 *     single source does)
 *   - forbidden registers
 *   - five seed passages for calibration
 *   - ten authorial questions to ask before writing
 */

import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, readClusterManifests, readCorpusManifest } from "./io";
import { AUTHORING_BRIEFS_DIR, SENTENCES_DIR, SIGNATURES_DIR } from "./paths";
import type { ClusterManifest, StyleSignature } from "./types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function readSigs(clusterId: string): Promise<StyleSignature[]> {
  const p = path.join(SIGNATURES_DIR, clusterId, "signatures.json");
  return JSON.parse(await fs.readFile(p, "utf8")) as StyleSignature[];
}

async function pickSeedPassages(
  cluster: ClusterManifest,
  n: number
): Promise<Array<{ source_ref: string; text: string }>> {
  const manifest = await readCorpusManifest();
  const picked: Array<{ source_ref: string; text: string }> = [];
  for (const src of cluster.sources) {
    const entry = manifest.sources.find((s) => s.ref === src.ref);
    if (!entry) continue;
    const sentPath = path.join(
      SENTENCES_DIR,
      slugify(entry.author),
      `${slugify(entry.work)}.jsonl`
    );
    try {
      const raw = await fs.readFile(sentPath, "utf8");
      const lines = raw.split("\n").filter((l) => l.trim());
      // Pick a handful of sentences from the middle of the source; avoid
      // front/back matter contamination.
      const mid = Math.floor(lines.length / 2);
      for (let i = 0; i < 2 && picked.length < n; i++) {
        const rec = JSON.parse(lines[mid + i * 100] ?? lines[mid]) as {
          text: string;
        };
        // Only keep sentences in a reasonable length range for
        // calibration.
        const words = (rec.text.match(/\S+/g) ?? []).length;
        if (words >= 8 && words <= 40) {
          picked.push({ source_ref: src.ref, text: rec.text });
        }
      }
    } catch {
      // ignore; a missing source just contributes nothing to the seed set
    }
    if (picked.length >= n) break;
  }
  return picked;
}

function fmt(n: number, digits = 3): string {
  return n.toFixed(digits);
}

function primarySensoryChannels(sig: StyleSignature): string {
  const m = sig.sensory_mix;
  const entries = (Object.entries(m) as Array<[keyof typeof m, number]>).sort(
    (a, b) => b[1] - a[1]
  );
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k} ${Math.round(v * 100)}%`)
    .join(", ");
}

function dominantPov(sig: StyleSignature): string {
  const entries: Array<[string, number]> = [
    ["1st-person", sig.pov_1st],
    ["2nd-person", sig.pov_2nd],
    ["3rd-person", sig.pov_3rd],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return `${entries[0][0]} (${Math.round(entries[0][1] * 100)}%) / ${entries[1][0]} (${Math.round(entries[1][1] * 100)}%)`;
}

/**
 * Generate authorial-permission candidates by pairing what one source
 * does with what another source does. Uses the top-bigrams of each
 * per-source signature as a crude proxy for "what the source
 * returns to."
 */
/** Function-word bigrams are not interesting "signatures" — skip them
 *  when choosing representative bigrams for the brief. */
const STOPWORD_BIGRAM_TOKENS = new Set([
  "the",
  "of",
  "in",
  "to",
  "a",
  "and",
  "is",
  "that",
  "it",
  "was",
  "for",
  "on",
  "with",
  "he",
  "she",
  "they",
  "at",
  "by",
  "as",
  "from",
  "had",
  "be",
  "this",
  "an",
  "or",
  "but",
  "not",
  "so",
  "if",
  "which",
  "you",
  "we",
  "i",
  "his",
  "her",
  "their",
  "its",
  "have",
  "has",
  "will",
  "would",
  "could",
  "are",
  "were",
  "been",
]);

function pickSignatureBigram(sig: StyleSignature): string | null {
  for (const { bigram } of sig.signature_bigrams) {
    const parts = bigram.split(" ");
    if (parts.every((p) => STOPWORD_BIGRAM_TOKENS.has(p))) continue;
    return bigram;
  }
  return null;
}

function authorialPermissions(_cluster: ClusterManifest, perSource: StyleSignature[]): string[] {
  if (perSource.length < 2) {
    return [
      "Write in this single source's register but reframe its concerns to the case at hand. The synthesis comes from contrast with your own detective.",
    ];
  }
  const out: string[] = [];
  for (let i = 0; i < perSource.length; i++) {
    for (let j = i + 1; j < perSource.length && out.length < 5; j++) {
      const a = perSource[i];
      const b = perSource[j];
      const aTop = pickSignatureBigram(a) ?? "a characteristic turn of phrase";
      const bTop = pickSignatureBigram(b) ?? "a characteristic turn of phrase";
      out.push(
        `You may write in the manner of *${a.source_ref}* (which returns to "${aTop}") but with the emotional stakes of *${b.source_ref}* (which returns to "${bTop}"). Neither does both.`
      );
    }
  }
  return out;
}

function forbiddenRegisters(cluster: ClusterManifest, aggregate: StyleSignature): string[] {
  const topBigram = pickSignatureBigram(aggregate) ?? "a high-frequency bigram";
  const topTrigram =
    aggregate.signature_trigrams.find((t) =>
      t.trigram.split(" ").some((w) => !STOPWORD_BIGRAM_TOKENS.has(w))
    )?.trigram ?? "a high-frequency trigram";
  return [
    `Direct paraphrase of any \`signature bigram\` above a frequency threshold (e.g. "${topBigram}").`,
    `Direct paraphrase of any \`signature trigram\` above a frequency threshold (e.g. "${topTrigram}").`,
    "Any passage whose nearest-source-neighbor scores cosine distance < 0.18 against the cluster embedding space — you are too close; revise.",
    ...(cluster.exclude.length > 0
      ? cluster.exclude.map((e) => `Excluded by cluster manifest: ${e}`)
      : []),
  ];
}

function authorialQuestions(_cluster: ClusterManifest, aggregate: StyleSignature): string[] {
  const median = aggregate.sentence_length_p50;
  const senses = primarySensoryChannels(aggregate);
  const pov = dominantPov(aggregate);
  return [
    `What is your detective doing when we first meet them? (The answer should not be "investigating." It should be a small task native to this milieu.)`,
    `What time of day / season is it? (The cluster's sources situate roughly every opening scene — match the instinct.)`,
    `Whose voice is the persona *not* (among real historical voices they'd plausibly have known)?`,
    "What object does your detective touch first?",
    "What sound can they hear from outside the room?",
    `The cluster's median sentence length is ${median} words. Will your detective speak in shorter? Longer? State the choice explicitly before you write.`,
    `The cluster's dominant POV is ${pov}. Is your detective in the dominant POV, or are you breaking the cluster's grain?`,
    `The cluster leans ${senses}. Which sensory channel will your detective privilege?`,
    "What is one word your detective will never use?",
    "What is a line from the seed passages below that you recognize as *not yours* — and what is the line you will write instead?",
  ];
}

function formatSignature(sig: StyleSignature): string {
  const contentBigrams = sig.signature_bigrams
    .filter((b) => !b.bigram.split(" ").every((w) => STOPWORD_BIGRAM_TOKENS.has(w)))
    .slice(0, 6);
  return [
    `- Sentence length: p10=${sig.sentence_length_p10}, p50=${sig.sentence_length_p50}, p90=${sig.sentence_length_p90}, max=${sig.sentence_length_max}`,
    `- Vocabulary register: Latinate ≈ ${fmt(sig.latinate_ratio * 100, 1)}%; type-token ratio ${fmt(sig.type_token_ratio, 3)}`,
    `- Modal-verb frequency: ${fmt(sig.modal_verb_rate * 100, 2)}%`,
    `- Sensory mix (top 3): ${primarySensoryChannels(sig)}`,
    `- POV: ${dominantPov(sig)}`,
    `- Content bigrams: ${contentBigrams.map((b) => `"${b.bigram}" (${b.count})`).join(", ") || "(none above stopword threshold)"}`,
  ].join("\n");
}

export async function synthesizeBrief(cluster: ClusterManifest): Promise<void> {
  const sigs = await readSigs(cluster.id);
  const aggregate = sigs.find((s) => s.source_ref === null);
  const perSource = sigs.filter((s) => s.source_ref !== null);

  if (!aggregate) {
    console.warn(`  ${cluster.id}: no aggregate signature; skipping brief`);
    return;
  }

  const seeds = await pickSeedPassages(cluster, 5);
  const permissions = authorialPermissions(cluster, perSource);
  const forbidden = forbiddenRegisters(cluster, aggregate);
  const questions = authorialQuestions(cluster, aggregate);

  const md = `---
title: Synthesis Brief — ${cluster.title}
cluster_id: ${cluster.id}
generated: ${new Date().toISOString().slice(0, 10)}
status: generated
---

# Synthesis Brief — ${cluster.title}

> Cluster id: \`${cluster.id}\`
> Generated by \`tools/brainstorm/synthesize.ts\` from the cluster's
> manifest + extracted style signatures.

## Context

- **Period:** ${cluster.context.period}
- **Milieu:** ${cluster.context.milieu}
- **Genre:** ${cluster.context.genre}

### Sources in this cluster

${cluster.sources
  .map((s) => `- \`${s.ref}\` — role: **${s.role}**, weight: ${s.weight.toFixed(2)}`)
  .join("\n")}

${cluster.notes ? `\n**Curator's note:** ${cluster.notes}\n` : ""}

## Aggregate style signature (cluster as a whole)

${formatSignature(aggregate)}

## Per-source divergences

${perSource.map((s) => `### \`${s.source_ref}\`\n\n${formatSignature(s)}`).join("\n\n")}

## What this cluster's synthesis permits that no single source does

${permissions.map((p) => `- ${p}`).join("\n")}

## Forbidden registers

${forbidden.map((f) => `- ${f}`).join("\n")}

## Five seed passages for calibration

Read these **slowly**. Then close them. Then write.

${seeds
  .map((s, i) => `### ${i + 1}. from \`${s.source_ref}\`\n\n> ${s.text.replace(/\n/g, " ")}\n`)
  .join("\n")}

## Ten authorial questions to ask yourself before writing

${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

---

*This brief is a synthesis starting point. Use \`pnpm brainstorm query --cluster ${cluster.id} "<phrase>"\` to retrieve nearest passages from the cluster. Use \`pnpm brainstorm check <scene-file>\` to verify your authored prose is not paraphrasing any single source.*
`;

  await ensureDir(AUTHORING_BRIEFS_DIR);
  const out = path.join(AUTHORING_BRIEFS_DIR, `${cluster.id}.md`);
  await fs.writeFile(out, md, "utf8");
  console.log(`  ${cluster.id}: brief → ${path.relative(process.cwd(), out)}`);
}

export async function synthesizeAll(): Promise<void> {
  const clusters = await readClusterManifests();
  for (const c of clusters) {
    try {
      await synthesizeBrief(c);
    } catch (err) {
      console.warn(`  ${c.id}: brief failed — ${(err as Error).message}`);
    }
  }
}
