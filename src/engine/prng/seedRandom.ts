/**
 * A simple, deterministic Mulberry32 PRNG.
 * Given the same seed, produces the same sequence of numbers.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a numeric seed from crypto.getRandomValues if available,
 * falling back to Math.random.
 */
export function generateSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

/**
 * Pick a random item from an array using the provided PRNG.
 * Returns undefined if the array is empty.
 */
export function pickRandom<T>(arr: readonly T[], rng: () => number): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Shuffle an array without mutating the original, using Fisher-Yates and the provided PRNG.
 */
export function shuffleArray<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
