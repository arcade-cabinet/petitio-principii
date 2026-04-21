import { describe, expect, it, vi } from "vitest";

/**
 * Smoke test for the runtime db wrapper.
 *
 * We mock `@capacitor-community/sqlite` and `@capacitor/core` so we
 * can exercise the code path without actually booting jeep-sqlite or
 * native sqlite. The test verifies that `openGameDb` does the right
 * platform-branch calls and that `run` dispatches SELECT vs. modify.
 *
 * Real end-to-end coverage lives in the browser E2E (Maestro flows
 * against the built APK / served web bundle) — this is the unit belt.
 */

const queryMock = vi.fn();
const runMock = vi.fn();
const executeMock = vi.fn();
const closeMock = vi.fn();
const openMock = vi.fn();
const createConnectionMock = vi.fn();
const retrieveConnectionMock = vi.fn();
const closeConnectionMock = vi.fn();
const isConnectionMock = vi.fn();
const isDatabaseMock = vi.fn();
const copyFromAssetsMock = vi.fn();
const initWebStoreMock = vi.fn();

const connStub = {
  open: openMock,
  close: closeMock,
  query: queryMock,
  run: runMock,
  execute: executeMock,
};

class SQLiteConnectionMock {
  createConnection = createConnectionMock.mockResolvedValue(connStub);
  retrieveConnection = retrieveConnectionMock.mockResolvedValue(connStub);
  closeConnection = closeConnectionMock.mockResolvedValue(undefined);
  isConnection = isConnectionMock;
  isDatabase = isDatabaseMock;
}

vi.mock("@capacitor-community/sqlite", () => ({
  SQLiteConnection: SQLiteConnectionMock,
  CapacitorSQLite: {
    initWebStore: initWebStoreMock,
    copyFromAssets: copyFromAssetsMock,
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "native" /* skip web-init shortcut */ },
}));

describe("src/lib/db.ts — runtime wrapper", () => {
  it("openGameDb creates a connection and opens it", async () => {
    isDatabaseMock.mockResolvedValue({ result: true });
    isConnectionMock.mockResolvedValue({ result: false });

    const { openGameDb } = await import("./db");
    const db = await openGameDb();

    expect(createConnectionMock).toHaveBeenCalled();
    expect(openMock).toHaveBeenCalled();
    expect(db).toBeDefined();
  });

  it("run() dispatches SELECT vs. modify correctly", async () => {
    isDatabaseMock.mockResolvedValue({ result: true });
    isConnectionMock.mockResolvedValue({ result: false });
    queryMock.mockResolvedValue({ values: [{ id: "midnight", hour: 0 }] });
    runMock.mockResolvedValue({ changes: { changes: 1 } });

    const { openGameDb } = await import("./db");
    const db = await openGameDb();

    const selectRes = await db.run("SELECT id FROM cases WHERE id = ?", ["midnight"]);
    expect(queryMock).toHaveBeenCalledWith("SELECT id FROM cases WHERE id = ?", ["midnight"]);
    expect(selectRes.rows[0].id).toBe("midnight");

    const insertRes = await db.run(
      "INSERT INTO progress_case (case_id, started_at) VALUES (?, ?)",
      ["midnight", 123]
    );
    expect(runMock).toHaveBeenCalled();
    expect(insertRes.changes).toBe(1);
  });

  it("vecSearch() builds a knn query and maps rows", async () => {
    isDatabaseMock.mockResolvedValue({ result: true });
    isConnectionMock.mockResolvedValue({ result: false });
    queryMock.mockResolvedValueOnce({
      values: [
        { rowid: 7, d: 0.12 },
        { rowid: 3, d: 0.18 },
      ],
    });

    const { openGameDb } = await import("./db");
    const db = await openGameDb();
    const vec = new Float32Array(384);
    vec[0] = 1;
    const hits = await db.vecSearch("hotspot_vec_mini", vec, 2);
    expect(hits).toEqual([
      { rowid: 7, distance: 0.12 },
      { rowid: 3, distance: 0.18 },
    ]);
  });
});
