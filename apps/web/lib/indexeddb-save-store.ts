import { exportSave } from "@tender-baron/game-domain";
import type { SaveEnvelope } from "@tender-baron/game-domain";

export const SERVICE_DB_NAME = "tender-baron-device-service-v1";
export const SERVICE_SAVE_ID = "first-embers-current";

const DATABASE_VERSION = 1;
const SAVE_STORE = "saves";
const QUARANTINE_STORE = "quarantine";
const BACKUP_SUFFIX = "::last-verified";

export type SaveExpectation = {
  readonly revision: number;
  readonly stateDigest: string;
} | null;

export type SaveSummary = {
  readonly id: string;
  readonly revision: number;
  readonly stateDigest: string;
  readonly savedAt: number;
};

type StoredSave = SaveSummary & {
  readonly payload: string;
};

function backupId(saveId: string): string {
  return `${saveId}${BACKUP_SUFFIX}`;
}

function expectationFor(record: StoredSave): Exclude<SaveExpectation, null> {
  return { revision: record.revision, stateDigest: record.stateDigest };
}

function metadataFor(envelope: SaveEnvelope, payload: string): StoredSave {
  return {
    id: envelope.saveId,
    payload,
    revision: envelope.state.revision,
    stateDigest: envelope.stateDigest,
    savedAt: Date.now(),
  };
}

function sameExpectation(record: StoredSave | undefined, expected: SaveExpectation): boolean {
  if (expected === null) return record === undefined;
  return record !== undefined
    && record.revision === expected.revision
    && record.stateDigest === expected.stateDigest;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed.")), { once: true });
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted.")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")), { once: true });
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("This browser does not provide durable device storage.");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SERVICE_DB_NAME, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SAVE_STORE)) {
        database.createObjectStore(SAVE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(QUARANTINE_STORE)) {
        database.createObjectStore(QUARANTINE_STORE, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not open device storage.")), { once: true });
    request.addEventListener("blocked", () => reject(new Error("Device storage is blocked by another tab.")), { once: true });
  });
}

async function readRecord(database: IDBDatabase, id: string): Promise<StoredSave | undefined> {
  const transaction = database.transaction(SAVE_STORE, "readonly");
  const record = await requestResult(transaction.objectStore(SAVE_STORE).get(id) as IDBRequest<StoredSave | undefined>);
  await transactionDone(transaction);
  return record;
}

export class SaveConflictError extends Error {
  readonly current?: SaveSummary;

  constructor(saveId: string, current?: StoredSave) {
    super(`A newer writer changed ${saveId} before this action could be saved.`);
    this.name = "SaveConflictError";
    this.current = current === undefined ? undefined : {
      id: current.id,
      revision: current.revision,
      stateDigest: current.stateDigest,
      savedAt: current.savedAt,
    };
  }
}

export class IndexedDbSaveStore {
  async read(saveId: string): Promise<string | undefined> {
    const database = await openDatabase();
    try {
      return (await readRecord(database, saveId))?.payload;
    } finally {
      database.close();
    }
  }

  async readExpectation(saveId: string): Promise<SaveExpectation> {
    const database = await openDatabase();
    try {
      const record = await readRecord(database, saveId);
      return record === undefined ? null : expectationFor(record);
    } finally {
      database.close();
    }
  }

  async readBackup(saveId: string): Promise<string | undefined> {
    const database = await openDatabase();
    try {
      return (await readRecord(database, backupId(saveId)))?.payload;
    } finally {
      database.close();
    }
  }

  async write(envelope: SaveEnvelope, expected: SaveExpectation): Promise<SaveExpectation> {
    const payload = exportSave(envelope);
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SAVE_STORE, "readwrite");
      const store = transaction.objectStore(SAVE_STORE);
      const existingRequest = store.get(envelope.saveId) as IDBRequest<StoredSave | undefined>;

      await new Promise<void>((resolve, reject) => {
        let rejected = false;
        existingRequest.addEventListener("success", () => {
          const existing = existingRequest.result;
          if (!sameExpectation(existing, expected)) {
            rejected = true;
            transaction.abort();
            reject(new SaveConflictError(envelope.saveId, existing));
            return;
          }
          const next = metadataFor(envelope, payload);
          if (existing !== undefined) {
            store.put({ ...existing, id: backupId(envelope.saveId) } satisfies StoredSave);
          } else {
            store.put({ ...next, id: backupId(envelope.saveId) } satisfies StoredSave);
          }
          store.put(next);
        }, { once: true });
        existingRequest.addEventListener("error", () => reject(existingRequest.error ?? new Error("Could not compare the device save.")), { once: true });
        transaction.addEventListener("complete", () => resolve(), { once: true });
        transaction.addEventListener("abort", () => {
          if (!rejected) reject(transaction.error ?? new Error("Device save transaction was aborted."));
        }, { once: true });
        transaction.addEventListener("error", () => reject(transaction.error ?? new Error("Device save transaction failed.")), { once: true });
      });
      return { revision: envelope.state.revision, stateDigest: envelope.stateDigest };
    } finally {
      database.close();
    }
  }

  async restoreBackup(saveId: string, payload: string, envelope: SaveEnvelope): Promise<SaveExpectation> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SAVE_STORE, "readwrite");
      transaction.objectStore(SAVE_STORE).put({
        ...metadataFor(envelope, payload),
        id: saveId,
      } satisfies StoredSave);
      await transactionDone(transaction);
      return { revision: envelope.state.revision, stateDigest: envelope.stateDigest };
    } finally {
      database.close();
    }
  }

  async quarantine(saveId: string, payload: string, reason: string): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction([SAVE_STORE, QUARANTINE_STORE], "readwrite");
      transaction.objectStore(QUARANTINE_STORE).put({
        id: `quarantine-${saveId}-${Date.now()}`,
        saveId,
        payload,
        reason,
        failedAt: Date.now(),
      });
      transaction.objectStore(SAVE_STORE).delete(saveId);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async delete(saveId: string, expected: SaveExpectation): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SAVE_STORE, "readwrite");
      const store = transaction.objectStore(SAVE_STORE);
      const existingRequest = store.get(saveId) as IDBRequest<StoredSave | undefined>;
      await new Promise<void>((resolve, reject) => {
        let rejected = false;
        existingRequest.addEventListener("success", () => {
          const existing = existingRequest.result;
          if (!sameExpectation(existing, expected)) {
            rejected = true;
            transaction.abort();
            reject(new SaveConflictError(saveId, existing));
            return;
          }
          store.delete(saveId);
          store.delete(backupId(saveId));
        }, { once: true });
        transaction.addEventListener("complete", () => resolve(), { once: true });
        transaction.addEventListener("abort", () => {
          if (!rejected) reject(transaction.error ?? new Error("Save deletion was aborted."));
        }, { once: true });
        transaction.addEventListener("error", () => reject(transaction.error ?? new Error("Save deletion failed.")), { once: true });
      });
    } finally {
      database.close();
    }
  }

  async list(): Promise<readonly SaveSummary[]> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SAVE_STORE, "readonly");
      const records = await requestResult(transaction.objectStore(SAVE_STORE).getAll() as IDBRequest<StoredSave[]>);
      await transactionDone(transaction);
      return records
        .filter((record) => !record.id.endsWith(BACKUP_SUFFIX))
        .map(({ id, revision, stateDigest, savedAt }) => ({ id, revision, stateDigest, savedAt }))
        .sort((left, right) => right.savedAt - left.savedAt);
    } finally {
      database.close();
    }
  }
}
