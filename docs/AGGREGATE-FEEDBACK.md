---
title: Aggregate Feedback Backlog (post-squash-merge)
updated: 2026-04-21
status: current
domain: context
---

# Aggregate Feedback Backlog

After squash-merging PRs #22, #21, #20, #9 as-is (admin override, no wait for CI), this is the **consolidated backlog** of everything still outstanding: PR review feedback (bot + human), failing checks, Dependabot alerts, self-flagged QA gaps, and any stubs/placeholders/TODOs in the tree. Each item lands in a single follow-up PR.

Legend: 🔴 critical · 🟠 major · 🟡 minor · 🔵 trivial · 🛡 security · 🧪 QA gap · 🧩 stub

---

## A. PR #22 — 3D + clock + compass + SCUMM verbs

### A1 🟠 `hero-clock.tsx:136-154` — rate-scaled displayed time drifts from wall clock
The previous push already cut the drift accumulator, but CodeRabbit's review body still references it. Verify on main that `setNow(new Date())` is anchored to `Date.now()` (no `accumulatedRef * rate`). Confirm reduced-motion users still receive live time updates (don't early-return from the rAF loop on `prefers-reduced-motion`; only stop the sweep visual, keep `setNow` running).

### A2 🟠 `hero-clock.tsx:110` — melt filter `<feTurbulence>` animates `baseFrequency` via `<animate>` which Safari ignores silently
Switch to a CSS-driven timeline or a JS tween that writes `setAttribute` on the turbulence node. Validate on iOS Safari 17+ that the melt actually animates.

### A3 🟠 `compass-rose.tsx:181` — SVG interactive wedges remove default focus outline but provide no visible replacement
Keyboard users can't see focus. Add a `:focus-visible` ring (stroke + glow) to each `role="button"` wedge, or wrap hit areas in a `<g>` with `tabIndex={0}` and style from CSS.

### A4 🟠 `VerbPanel.tsx:127-129` — `available`/`primary` typed as `ReadonlySet<string>` but logic uses narrower `VerbId` union
Narrow the prop types to `ReadonlySet<VerbId>` and update the single call-site in `TerminalDisplay.tsx` to pass the right type. Silently-wrong `string` membership checks are a future-bug magnet.

### A5 🔴 `smoke.test.tsx:185` — `beforeAccept` was captured AFTER the Accept click
Fixed on PR #22 branch before merge. **Verify on main** it's still correct (snapshot BEFORE the click). If regressed, re-fix.

### A6 🟠 `smoke.test.tsx:147,153-173` — tests click disabled verb buttons (silent no-op)
`VerbPanel` renders every verb always; disabled state gates availability. `findByRole` / `getByRole` don't wait for `enabled`. Add `await waitFor(() => expect(btn).toBeEnabled())` before every verb click in the smoke test's tutorial-burn loop, especially for `Trace Back` (6th in pedagogy).

### A7 🟠 `keycapLayout.ts:72` — CodeRabbit flagged the comment contradicts code
Re-read comment vs. implementation; align whichever is correct. Likely the "accept as primary in circle rooms" precedence order comment is stale.

### A8 🟡 `TerminalDisplay.tsx:123,149` — `lastCardinalHeading` derivation misses history
Gemini flagged: the compass reflects only the *latest* horizontal move, not history (e.g., a player who went E→E→E sees only one E heading). Consider either a trail of last-N headings, or document that "heading" means "most recent cardinal."

### A9 🔵 `compass-rose.tsx:93` — nit: hit-radius magic number
Extract `HIT_R = 18` to a named constant and a CSS var if themable.

### A10 🔵 `VerbPanel.tsx:129` — nit: group tint values as `color-mix()` literals
Extract to Tailwind tokens in `tailwind.config.ts` so the SCUMM palette is themable.

### A11 🔵 `keycapSurface.test.ts:37` — fixture could dedupe direction list
Define the 10-direction list once at module top and reuse.

### A12 🧪 `Safari / iOS` — no manual smoke test
The melt filter, real-time rAF clock, and focus-visible rings have not been exercised on mobile Safari.

---

## B. PR #21 — keycap multi-word verb fix

### B1 🛡 🔴 `ci.yml` — `pull_request_target` + checkout of PR head SHA is a fork-code-execution vector
Same vuln was flagged on PR #20. PR #20's v2 version (which landed on main after #21) adds a `startsWith(github.head_ref, 'release-please--')` gate that scopes `pull_request_target` to release-please bot PRs only — addressing the concern. **Verify on main** this gate is present in both jobs (`verify` and `android-apk`). Add a comment referencing the security rationale.

### B2 🟠 `ci.yml` — double-trigger on same-repo human PRs
Same as A above — PR #20's v2 `if:` guard handles it. Verify on main.

### B3 🟠 `ci.yml` — `concurrency.group: ci-${{ github.ref }}` cancels prior runs on base branch
Fixed in PR #20 v2: `ci-${{ github.event.pull_request.number || github.ref }}`. Verify on main.

### B4 🟡 `keycapSurface.ts:52` — regression test missing
PR #21 added the test. **Verify** `src/features/terminal/keycapSurface.test.ts` contains the "recognizes parsed verbs" test. (Confirmed in earlier session; re-assert on main.)

---

## C. PR #20 — release-please CI trigger v2

Same 4 items as B — they all landed on main via the merge. No additional items beyond B.

---

## D. PR #9 — release 1.0.0

No review comments. Merged clean.

---

## E. Dependabot security alerts (NEW — discovered via push)

### E1 🛡 🔴 `lodash-es` — Code Injection via `_.template` imports key names (HIGH)
GitHub alert #2. Update lodash-es to a patched version. If not used, remove.

### E2 🛡 🟠 `lodash-es` — Prototype Pollution via array path bypass in `_.unset` / `_.omit` (MODERATE)
GitHub alert #1. Same package, same fix.

Check which dependency pulls `lodash-es` in (`pnpm why lodash-es`) and either upgrade transitively or pin via pnpm overrides.

---

## F. Self-flagged QA gaps (from earlier session audit)

### F1 🧪 No paper-playtest of micro flow (room→room argument loop)
A human read-through from entry through a full argument arc verifying: narration reads, verb glyphs match intent, melt fires at circle-close, trace-back reveals the correct argument chain. Not done.

### F2 🧪 No paper-playtest of meso flow (Salon world)
Per `docs/design/WORLDS-meso.md` §Salon: walk the full Salon region on paper, verifying all rooms, fallacy placements, circular-atrium convergence, and objection nodes against the design doc. Not done.

### F3 🧪 No paper-playtest of meso flow (Apollonius world)
Same as F2 for the Apollonius region. Not done.

### F4 🧪 No world-parity audit between Salon and Apollonius
Compare the two worlds on: node count, exit density, fallacy diversity, challenge curve, connection-point quality (seams between sub-regions), language richness. The design gate is "equivalent richness and challenge and complexity and solid connection points." Not done.

### F5 🧪 No multi-viewport visual QC
Phone (360×640), foldable (280×653 folded, 673×841 unfolded), tablet (810×1080). Dev server not started. Chrome DevTools MCP screenshot sweep not taken. Lighthouse audit not run.

### F6 🧪 No macro-flow paper-playtest
Act I → Act II → Act III progression: scene transitions, scoring, end-state variants. Not done.

---

## G. Engine/content stubs (from grep)

### G1 🧩 `src/hooks/use-game.ts:186` — `TODO(T98): rewire when Move type lands`
T98 is the clock-ui chord-input agent work. Determine whether `Move` type has landed; if yes, rewire; if no, track explicitly.

### G2 🧩 `src/content/corpus/wikipediaClient.ts:9` — `// TODO: Implement live Wikipedia API calls`
Entire client is a stub returning empty. Either implement (respect Wikipedia API etiquette: user-agent, rate limit) or delete the file if corpus is frozen (per commit `f587d01`, build-time RiTa pipeline emits frozen corpus — the live client may be obsolete).

### G3 🧩 `src/content/corpus/philosophyApiClient.ts:9` — `// TODO: Implement SEP or PhilPapers API integration`
Same as G2. Either implement (SEP doesn't have a public API; PhilPapers requires API key) or delete.

---

## H. World-weaver engine seam (T10 from the 10-task batch)

### H1 🧩 Engine rewrite deferred
Per `memory/feedback_engine-seam-rewrite.md`: generic PRNG-over-templates cannot host the authored-worlds meso design. The 10-task batch had this as T10 and deferred it to a follow-up PR. **This aggregate PR does not implement it either** — it's a multi-hour engine rewrite that warrants its own PR with its own review cycle. Tracked here for visibility; will be its own PR after this aggregate lands.

Design anchors: `docs/design/WORLDS-meso.md` §§ Salon, Apollonius. Meso sections are authoritative for region content. Must replace `ROOM_TEMPLATES` codepath entirely (codepath is being deleted, per `feedback_engine-seam-rewrite.md`).

---

## I. Execution order for this aggregate PR

1. Verify main matches post-merge expectations (A1, A5, B1–B3, B4)
2. Fix A2, A3, A4, A6, A7 (code fixes with tests)
3. A8: decide heading-history model, document
4. A9, A10, A11: nit cleanup
5. E1, E2: dependabot fixes (pnpm update + overrides)
6. G2, G3: delete obsolete stubs (confirm corpus is frozen first)
7. G1: evaluate T98 status, rewire or document
8. F1–F6: execute paper-playtests + viewport sweep, record findings in this doc
9. H1: leave for separate follow-up PR (out of scope)
10. A12: optional — only if practical in this pass
