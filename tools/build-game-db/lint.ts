/**
 * Linter for the IR.
 *
 * Runs after normalize; all hard structural failures already threw.
 * This pass emits **warnings** on soft issues the author should see
 * but which don't block the build.
 *
 * Rules (per docs/design/pivot/03-SCENE-LANGUAGE.md §6):
 *   - hotspot phrases not found as substrings in the room's prose
 *   - orphan rooms (unreachable from `opens`)
 *   - unreachable verdicts (no clue / claim-state trail can satisfy them)
 *   - claims not referenced by any verdict
 *   - retort pool size in [40, 120]
 *   - verdict valence spread thin (< 3 distinct moral or atmos tags)
 */

import type { CaseIR, PredicateJson } from "./ir";

export interface LintIssue {
  readonly severity: "warning" | "info";
  readonly rule: string;
  readonly message: string;
}

function referencedClaimsIn(pred: PredicateJson): Set<string> {
  const out = new Set<string>();
  const walk = (p: PredicateJson) => {
    if ("all" in p) p.all.forEach(walk);
    else if ("any" in p) p.any.forEach(walk);
    else if ("none" in p) p.none.forEach(walk);
    else if ("claim_state" in p) out.add(p.claim_state);
  };
  walk(pred);
  return out;
}

function reachableRooms(opens: string, exits: CaseIR["exits"]): Set<string> {
  const reached = new Set<string>([opens]);
  const fwd = new Map<string, string[]>();
  for (const e of exits) {
    if (!fwd.has(e.fromRoom)) fwd.set(e.fromRoom, []);
    fwd.get(e.fromRoom)?.push(e.toRoom);
  }
  const queue = [opens];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const next of fwd.get(cur) ?? []) {
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  return reached;
}

export function lint(ir: CaseIR, roomProse: Record<string, string>): LintIssue[] {
  const out: LintIssue[] = [];

  // Rule 1 — hotspot phrases present in their room's prose
  for (const clue of ir.clues) {
    const prose = (roomProse[clue.roomId] ?? "").toLowerCase();
    for (const phrase of clue.hotspotPhrases) {
      if (!prose.includes(phrase.toLowerCase())) {
        out.push({
          severity: "warning",
          rule: "hotspot-not-in-prose",
          message: `clue ${clue.id}: hotspot "${phrase}" not found in room ${clue.roomId}'s prose`,
        });
      }
    }
  }

  // Rule 2 — orphan rooms
  const reached = reachableRooms(ir.opensRoom, ir.exits);
  for (const r of ir.rooms) {
    if (!reached.has(r.id)) {
      out.push({
        severity: "warning",
        rule: "unreachable-room",
        message: `room ${r.id} is not reachable from opens room:${ir.opensRoom}`,
      });
    }
  }

  // Rule 3 — claims not referenced by any verdict
  const claimsInVerdicts = new Set<string>();
  for (const v of ir.verdicts) {
    for (const id of referencedClaimsIn(v.requires)) claimsInVerdicts.add(id);
  }
  for (const c of ir.claims) {
    if (!claimsInVerdicts.has(c.id)) {
      out.push({
        severity: "info",
        rule: "unreferenced-claim",
        message: `claim ${c.id} is not required by any verdict (may be red-herring-by-design)`,
      });
    }
  }

  // Rule 4 — retort pool in [40, 120]
  const n = ir.retorts.length;
  if (n < 40) {
    out.push({
      severity: "warning",
      rule: "retorts-too-few",
      message: `retort pool has ${n} entries; < 40 risks repetition at runtime`,
    });
  } else if (n > 120) {
    out.push({
      severity: "info",
      rule: "retorts-too-many",
      message: `retort pool has ${n} entries; > 120 may thin the knn space`,
    });
  }

  // Rule 5 — verdict valence spread
  const moralTags = new Set(ir.verdicts.map((v) => v.moralValence).filter(Boolean));
  const atmosTags = new Set(ir.verdicts.map((v) => v.atmosValence).filter(Boolean));
  if (ir.verdicts.length >= 6) {
    if (moralTags.size < 3) {
      out.push({
        severity: "warning",
        rule: "valence-moral-thin",
        message: `verdicts span only ${moralTags.size} distinct moral valence(s); ≥3 recommended for a case with ${ir.verdicts.length} verdicts`,
      });
    }
    if (atmosTags.size < 3) {
      out.push({
        severity: "warning",
        rule: "valence-atmos-thin",
        message: `verdicts span only ${atmosTags.size} distinct atmos valence(s); ≥3 recommended for a case with ${ir.verdicts.length} verdicts`,
      });
    }
  }

  // Rule 6 — every clue supports or contradicts something
  const claimsTouched = new Set<string>();
  for (const s of ir.clueSupports) claimsTouched.add(s.clueId);
  for (const c of ir.clueContradicts) claimsTouched.add(c.clueId);
  for (const clue of ir.clues) {
    if (!claimsTouched.has(clue.id)) {
      out.push({
        severity: "info",
        rule: "clue-no-claim",
        message: `clue ${clue.id} does not support or contradict any claim`,
      });
    }
  }

  return out;
}

export function formatIssues(issues: LintIssue[]): string {
  if (issues.length === 0) return "  no lint issues";
  return issues.map((i) => `  [${i.severity}] (${i.rule}) ${i.message}`).join("\n");
}
