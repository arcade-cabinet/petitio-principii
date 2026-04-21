/**
 * Thin wrapper around the local Ollama HTTP API for generating
 * embeddings. We use `/api/embed` (plural form — `POST /api/embed`
 * accepts an `input` array and returns parallel `embeddings`).
 *
 * Models we use:
 *   - mxbai-embed-large (1024-dim) — authoring-time retrieval
 *   - all-MiniLM-L6-v2  (384-dim)  — *browser* runtime (bundled ONNX,
 *                                    not Ollama-served)
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export interface EmbedResponse {
  readonly model: string;
  readonly embeddings: number[][];
}

/**
 * Embed a batch of strings. Ollama handles batches natively; we cap
 * batch size to 32 to keep individual requests short.
 */
export async function embedBatch(
  model: string,
  inputs: ReadonlyArray<string>
): Promise<Float32Array[]> {
  if (inputs.length === 0) return [];
  const CHUNK = 32;
  const out: Float32Array[] = [];
  for (let i = 0; i < inputs.length; i += CHUNK) {
    const slice = inputs.slice(i, i + CHUNK);
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, input: slice }),
    });
    if (!res.ok) {
      throw new Error(
        `ollama embed failed: ${res.status} ${res.statusText} — is \`ollama serve\` running and \`${model}\` pulled?`
      );
    }
    const body = (await res.json()) as EmbedResponse;
    for (const vec of body.embeddings) {
      out.push(Float32Array.from(vec));
    }
  }
  return out;
}

export async function ollamaIsRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
