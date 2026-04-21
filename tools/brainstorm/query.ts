/**
 * Query the cluster's embedding space from the CLI. Prints the 10
 * nearest passages to the query, scoped to a specific cluster.
 */

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { embedBatch, ollamaIsRunning } from "./ollama";
import { AUTHORING_DB } from "./paths";

const MODEL = process.env.BRAINSTORM_EMBED_MODEL ?? "mxbai-embed-large";

export async function queryCli(argv: string[]): Promise<number> {
  const clusterIdx = argv.findIndex((a) => a === "--cluster");
  if (clusterIdx < 0) {
    console.error("usage: pnpm brainstorm query --cluster <id> <query-text...>");
    return 1;
  }
  const clusterId = argv[clusterIdx + 1];
  if (!clusterId || clusterId.startsWith("--") || !clusterId.trim()) {
    console.error("usage: pnpm brainstorm query --cluster <id> <query-text...>");
    console.error("error: --cluster requires a non-empty cluster id");
    return 1;
  }
  const queryText = argv
    .slice(0, clusterIdx)
    .concat(argv.slice(clusterIdx + 2))
    .join(" ")
    .trim();
  if (!queryText) {
    console.error("error: query text is empty");
    return 1;
  }
  if (!(await ollamaIsRunning())) {
    console.error("error: Ollama not reachable. Run `ollama serve`.");
    return 1;
  }

  const [vec] = await embedBatch(MODEL, [queryText]);
  const db = new Database(AUTHORING_DB, { readonly: true });
  sqliteVec.load(db);
  const knn = db.prepare(
    `
    SELECT hm.source_ref, hm.text, vec_distance_cosine(hv.embedding, ?) AS d
    FROM cluster_sent_vec hv
    JOIN cluster_sent_meta hm ON hm.rowid = hv.rowid
    WHERE hm.cluster_id = ?
    ORDER BY d ASC
    LIMIT 10
  `
  );
  const rows = knn.all(
    Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength),
    clusterId
  ) as Array<{
    source_ref: string;
    text: string;
    d: number;
  }>;
  db.close();

  console.log(`query: "${queryText}"`);
  console.log(`cluster: ${clusterId}\n`);
  for (const [i, row] of rows.entries()) {
    const sim = ((1 - row.d / 2) * 100).toFixed(1);
    console.log(`${i + 1}. [${sim}%] ${row.source_ref}`);
    console.log(`   ${row.text.slice(0, 240).replace(/\s+/g, " ")}`);
    console.log();
  }
  return 0;
}
