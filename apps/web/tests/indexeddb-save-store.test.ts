import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createInitialState,
  createSaveEnvelope,
  exportSave,
  makeAction,
  reduce,
  replayEvents,
} from "@tender-baron/game-domain";
import type { GameEvent, SaveEnvelope, ServiceState } from "@tender-baron/game-domain";
import { FIRST_SERVICE_CONTENT, RULES_V1 } from "@tender-baron/game-content";
import {
  IndexedDbSaveStore,
  SERVICE_DB_NAME,
  SERVICE_SAVE_ID,
  SaveConflictError,
} from "../lib/indexeddb-save-store";

const SAVE_STORE = "saves";

function envelopeAfter(
  initialState: ServiceState,
  events: readonly GameEvent[],
  saveId = SERVICE_SAVE_ID,
): SaveEnvelope {
  return createSaveEnvelope(
    saveId,
    replayEvents(initialState, events, RULES_V1, FIRST_SERVICE_CONTENT),
  );
}

function openedEnvelope(): { readonly initial: SaveEnvelope; readonly opened: SaveEnvelope } {
  const initialState = createInitialState(
    "device-first-embers-v1",
    "first-embers-authored-seed-v1",
    RULES_V1,
    FIRST_SERVICE_CONTENT,
  );
  const initial = envelopeAfter(initialState, []);
  const result = reduce(
    initialState,
    makeAction(initialState, "OPEN_HOUSE", {}, "test-open-house"),
    RULES_V1,
    FIRST_SERVICE_CONTENT,
  );
  if (!result.ok || "preview" in result) throw new Error("The test fixture could not open the house.");
  return { initial, opened: envelopeAfter(initialState, [result.event]) };
}

async function putCurrent(record: Record<string, unknown>): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(SERVICE_DB_NAME, 1);
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SAVE_STORE, "readwrite");
      transaction.objectStore(SAVE_STORE).put(record);
      transaction.addEventListener("complete", () => resolve(), { once: true });
      transaction.addEventListener("error", () => reject(transaction.error), { once: true });
    });
  } finally {
    database.close();
  }
}

describe("IndexedDbSaveStore recovery compare-and-swap", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: new IDBFactory(),
    });
  });

  it("does not quarantine a newer valid writer after hydration read stale corrupted bytes", async () => {
    const store = new IndexedDbSaveStore();
    const { initial, opened } = openedEnvelope();
    const initialExpectation = await store.write(initial, null);
    await putCurrent({
      id: SERVICE_SAVE_ID,
      payload: "{corrupt",
      revision: initial.state.revision,
      stateDigest: initial.stateDigest,
      savedAt: 1,
    });
    const stale = await store.readSnapshot(SERVICE_SAVE_ID);
    expect(stale).toBeDefined();

    await store.write(opened, initialExpectation);

    await expect(
      store.quarantine(SERVICE_SAVE_ID, stale!.expectation, "invalid JSON"),
    ).rejects.toBeInstanceOf(SaveConflictError);
    await expect(store.read(SERVICE_SAVE_ID)).resolves.toBe(exportSave(opened));
  });

  it("rejects quarantine when any field in the captured record snapshot drifts", async () => {
    const store = new IndexedDbSaveStore();
    const { initial } = openedEnvelope();
    await store.write(initial, null);
    const corrupted = {
      id: SERVICE_SAVE_ID,
      payload: "{corrupt",
      revision: initial.state.revision,
      stateDigest: initial.stateDigest,
      savedAt: 1,
    };
    await putCurrent(corrupted);
    const stale = await store.readSnapshot(SERVICE_SAVE_ID);
    expect(stale).toBeDefined();

    await putCurrent({ ...corrupted, savedAt: 2 });

    await expect(
      store.quarantine(SERVICE_SAVE_ID, stale!.expectation, "invalid JSON"),
    ).rejects.toBeInstanceOf(SaveConflictError);
    await expect(store.read(SERVICE_SAVE_ID)).resolves.toBe(corrupted.payload);
  });

  it("does not restore a backup over a writer that wins after quarantine", async () => {
    const store = new IndexedDbSaveStore();
    const { initial, opened } = openedEnvelope();
    await store.write(initial, null);
    await putCurrent({
      id: SERVICE_SAVE_ID,
      payload: "{corrupt",
      revision: initial.state.revision,
      stateDigest: initial.stateDigest,
      savedAt: 1,
    });
    const stale = await store.readSnapshot(SERVICE_SAVE_ID);
    expect(stale).toBeDefined();
    await store.quarantine(SERVICE_SAVE_ID, stale!.expectation, "invalid JSON");
    const backup = await store.readBackup(SERVICE_SAVE_ID);
    expect(backup).toBe(exportSave(initial));

    await store.write(opened, null);

    await expect(
      store.restoreBackup(SERVICE_SAVE_ID, backup!, initial, null),
    ).rejects.toBeInstanceOf(SaveConflictError);
    await expect(store.read(SERVICE_SAVE_ID)).resolves.toBe(exportSave(opened));
  });
});
