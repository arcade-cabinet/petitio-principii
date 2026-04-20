import traceryDefault from "tracery-grammar";

// `@types/tracery-grammar` uses `export = tracery` with a fixed literal shape,
// so the module can't be augmented. But the JS runtime exposes `setRng` —
// see node_modules/tracery-grammar/tracery.js line 864: `tracery.setRng = setRng`.
// Narrow the default import once here so the wrapper body is cast-free.
const tracery = traceryDefault as typeof traceryDefault & {
  setRng: (rng: () => number) => void;
};

/**
 * Seeded Tracery wrapper.
 *
 * `tracery-grammar` exposes a process-global RNG via `tracery.setRng(fn)`.
 * Everything inside a single `flatten()` call uses that RNG. We wrap usage
 * so callers provide a seeded function and we restore the previous RNG on
 * the way out — reentrant-safe via an explicit stack.
 *
 * Usage:
 *
 *   import { withSeededRng } from "@/lib/seeded-tracery";
 *   import { createSeededRandom } from "@/engine";
 *   import tracery from "tracery-grammar";
 *
 *   const grammar = tracery.createGrammar(myGrammarJson);
 *   const rng = createSeededRandom(seed);
 *   const text = withSeededRng(rng, () => grammar.flatten("#origin#"));
 *
 * Why a stack: a grammar's `flatten` may trigger another `flatten` (nested
 * grammars, custom modifiers) — if that nested call uses a different seed
 * it must not leak out. `withSeededRng` pushes on entry and pops on exit.
 *
 * Why synchronous: Tracery's rng is process-global. If any call were
 * asynchronous the wrapper would have to serialize concurrent callers or
 * risk interleaving. We keep the API strictly synchronous to make the
 * invariant trivially provable: between `push` and `pop` only one logical
 * caller is active.
 */

type Rng = () => number;

// A small LIFO so nested `withSeededRng` calls restore to the right RNG.
// `tracery.setRng` mutates module-level state; we shadow it with this.
const rngStack: Rng[] = [];

// Stash the original (Math.random-based) RNG so a final pop returns to
// default behaviour rather than whatever the first caller was.
const DEFAULT_RNG: Rng = Math.random;

/**
 * Run `fn` with Tracery's global RNG set to `rng`. Restores the prior
 * RNG on return — even if `fn` throws. Safe to nest.
 */
export function withSeededRng<T>(rng: Rng, fn: () => T): T {
  rngStack.push(rng);
  tracery.setRng(rng);
  try {
    return fn();
  } finally {
    rngStack.pop();
    const restore = rngStack[rngStack.length - 1] ?? DEFAULT_RNG;
    tracery.setRng(restore);
  }
}

/** For tests that need to inspect the stack depth (should always be 0 outside a call). */
export function _getStackDepthForTests(): number {
  return rngStack.length;
}
