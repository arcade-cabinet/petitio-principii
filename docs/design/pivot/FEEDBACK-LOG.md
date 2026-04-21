---
title: Pivot Review Feedback Log
updated: 2026-04-21
status: current
domain: context
---

# Pivot Review Feedback Log

Tracks every substantive review comment across the pivot PRs and how
each was resolved. Bot and human feedback treated the same.

---

## PR #24 — Design docs (merged 2026-04-21)

### CodeRabbit

| # | Loc | Severity | Status | Resolution |
|---|---|---|---|---|
| 1 | 00:71 | Major | ✅ Fixed | §2.2 re-titled "Zero runtime PRNG (target state)" with an explicit 5-step migration checkpoint list. |
| 2 | 01:12 | Major | ✅ Fixed | Blockquote now clarifies beta-only scope: Midnight authored, 11 hours as empty shells with locked card rendering. |
| 3 | 01:29 | Minor | ✅ Fixed | §1 now reads "key-value rows in a single `settings` table" — aligned with §4.4. |
| 4 | 01:501 | **Critical** | ✅ Fixed | Runtime knn SQL now joins `hotspot_vec_mini` to `hotspot_meta` on rowid for case_id/room_id filter. |
| 5 | 02:45 | Minor | ✅ Fixed | "BEGIN ARGUMENT" → "OPEN THE CASE" throughout landing doc. |
| 6 | 03:47 | Minor | ✅ Fixed | Uppercase identifier examples (`clue:A`, `fact:B`) replaced with valid kebab-case references. |
| 7 | 05:§normalize | Major | ✅ Fixed | Added §9a "Content safety — human review is the gate" spelling out that blocklist alone is insufficient; authors must review briefs before check-in, blocklist is first-pass triage only. |
| 8 | 05:§fences | Minor | ⏭️  Deferred | MD040 code-fence language tags. No markdownlint in CI currently; re-address when adding. |
| 9 | 06:369 | Major | ✅ Fixed | `pnpm build-scene` replaced with `pnpm build-game-db` and explicit "planned script" framing. |
| 10 | 06:383 | Minor | ⏭️  Deferred | Same MD040 issue. |

### Copilot

| # | Loc | Status | Resolution |
|---|---|---|---|
| 1 | 00:130 | ✅ Fixed | Runtime embedding model reconciled: doc 00 now says all-MiniLM-L6-v2 + onnxruntime-web matching doc 01 §6.1. |
| 2 | 01:87 | ✅ Fixed | §3 resolves ambiguity: **wa-sqlite** is the web client (not sql.js), chosen because sqlite-vec needs extension loading. |
| 3 | 01:169 | ✅ Fixed | Circular FK broken: `personas.case_id` is now a plain column + index, not an FK. Only `cases.persona_id → personas.id` is an FK. Insert order documented (personas first). |
| 4 | 01:500 | ✅ Fixed | Same as CR #4 above — vec query now joins hotspot_meta. |
| 5 | 03:54 | ✅ Fixed | §2 "Lexical grammar" adds **List** production with element-type rules and examples for string/reference/predicate-atom lists. |
| 6 | 03:150 | ✅ Fixed | `retorts` example rewritten to use canonical `retort { prose <<<...>>> tags { ... } }` form, no inline metadata objects. |
| 7 | 03:443 | ✅ Fixed | "basic fold folding" → "basic code folding". |
| 8 | 06:369 | ✅ Fixed | Same as CR #9 above. |
| 9 | 06:382 | ✅ Fixed | Maestro checklist item now specifies path `.maestro/flows/walk-<case-id>.yaml` and notes gate is NOT-YET-ENFORCED until midnight case's flow lands. |

### Gemini Code Assist

All 8 gemini-code-assist medium-priority comments covered by the
above resolutions (they duplicated CR/Copilot findings on the same
lines). No separate action needed.

---

## PR #27 — Pipeline stages 5+7 + PR #24 feedback sweep

### Copilot (8 actionable)

| Loc | Status | Resolution |
|---|---|---|
| embed.ts:107 | ✅ Fixed | Hard-coded 1024 replaced with `MODEL_DIMS` map + `dimForModel()` — swapping to `nomic-embed-text` (768-dim) now throws before the vec0 mismatch. Schema migration note added. |
| embed.ts:131 | ✅ Fixed | CI-mode + Ollama-down now pre-scans for cache misses and throws before any DB work. No more silent-skip-with-warning. |
| embed.ts:150 | ✅ Fixed | `Buffer.from(embedding.buffer, byteOffset, byteLength)` — exact dim×4 byte binding. Same fix applied to query.ts and check.ts. |
| check.ts:8 | ✅ Fixed | Header comment math aligned (dist ≤ 0.36 ⇔ sim ≥ 0.82, not "< 0.18"). |
| query.ts:19 | ✅ Fixed | `clusterId` now validated: non-empty, not starting with `--`, non-whitespace. Prints usage on invalid. |
| query.ts:47 | ✅ Fixed | Buffer offset/length binding (same fix as embed). |
| check.ts:106 | ✅ Fixed | Buffer offset/length binding. |
| doc 01:16 | ✅ Fixed | Intro blockquote now reads "wa-sqlite on web" (matched to §3). |
| doc 05:427 (×2) | ✅ Fixed | "Downstream stages refuse generated briefs" rewritten as manual-culture gate; enforcement script marked as planned, not-yet-implemented. |
| doc 06:374 | ✅ Fixed | Merge checklist split into "Mandatory" and "Planned" sections so nothing is required-but-impossible. |
| FEEDBACK-LOG.md:68 | ✅ Fixed | Moved stages 5+7 to "Landed since prior audit" section. |

### CodeRabbit (major findings, same lines as above)

CodeRabbit's PR #27 findings largely duplicated Copilot's on the same
lines (sql.js/wa-sqlite mixed refs, list grammar contradictions
with `intervals [0, 3, 7, 10]` + `connect from { ... }` block-form,
planned-gates-as-mandatory in doc 06, stale FEEDBACK-LOG entry). All
resolved above plus:

| Loc | Resolution |
|---|---|
| doc 03:66 | List grammar now admits *numbers* as a fifth element type; `intervals [ 0, 3, 7, 10 ]` explicitly legal. |
| doc 03:273 | `connect` example rewritten to use `from [ ... ]` list form instead of the block form; syntax unified. |
| doc 01 first-paint section | All `sql.js` references updated to `wa-sqlite` (§3.2, §3.3, §10). |

---

## PR #25 — Brainstorm pipeline foundation (merged 2026-04-21)

CodeRabbit review was in-progress when the PR admin-merged and did
not post actionable comments. A follow-up PR's CI run will re-review
against current main; any issues get addressed in that PR's scope.

---

## Deferred items (tracked, not lost)

- **MD040 code-fence language tags** across docs 05 and 06. Will
  resolve as part of a future docs sweep if markdownlint enters CI.
- **Brief status-gate enforcement script** — `tools/brainstorm/check-brief-reviewed.ts`
  is called out in doc 05 as a planned pre-commit hook but not yet
  implemented. Currently a manual-culture gate.

## Landed since prior audit

- **Embedding + sameness-check stages (5 + 7)** — landed in PR #27.
  `pnpm brainstorm embed` + `pnpm brainstorm check` + `pnpm brainstorm
  query` are all live. 92,659 vectors across 9 clusters indexed
  locally. Query smoke-tested against yukon-gold-rush returns
  thematic neighbors ("a claim that's been quiet too long" → London
  claim-country prose at 81% similarity).

---

## Policy going forward

Every future PR on the pivot lands with a "Review feedback addressed"
section in its description that lists the comments it resolves.
Admin-merging before harvesting feedback is disallowed; the pre-merge
checklist is:

1. Pull all inline + review + issue comments via `gh api`.
2. Append an entry to this log.
3. Resolve actionable items in the same branch OR defer explicitly
   with rationale.
4. Only then merge.

This file is the audit trail.
