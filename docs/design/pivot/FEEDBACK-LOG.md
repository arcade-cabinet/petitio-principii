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

## PR #25 — Brainstorm pipeline foundation (merged 2026-04-21)

CodeRabbit review was in-progress when the PR admin-merged and did
not post actionable comments. A follow-up PR's CI run will re-review
against current main; any issues get addressed in that PR's scope.

---

## Deferred items (tracked, not lost)

- **MD040 code-fence language tags** across docs 05 and 06. Will
  resolve as part of a future docs sweep if markdownlint enters CI.
- **Embedding + sameness-check stages (5 + 7)** of the brainstorm
  pipeline. Stage 6 (synthesize) is the primary author surface and
  it's complete; embeddings layer on top in the next PR.

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
