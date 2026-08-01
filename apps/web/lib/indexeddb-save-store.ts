import { exportSave } from "@tender-baron/game-domain";
import type { SaveEnvelope } from "@tender-baron/game-domain";

export const SERVICE_DB_NAME = "tender-baron-device-service-v1";
export const SERVICE_SAVE_ID = "first-embers-current";
export const SERVICE_BACKUP_ID = "first-embers-last-verified";

const DATABASE_VERSION = 1;
const SAVE_STORE = "saves";
const QUARANTINE_STORE = "quarantine";

type StoredSave = {
  readonly id: string;
  readonly payload: string;
  readonly savedAt: number;
};

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
  if (!("indexedDB" in globalThis)) {
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

export class IndexedDbSaveStore {
  async readCurrent(): Promise<string | undefined> {
    const database = await openDatabase();
    try {
      return (await readRecord(database, SERVICE_SAVE_ID))?.payload;
    } finally {
      database.close();
    }
  }

  async readBackup(): Promise<string | undefined> {
    const database = await openDatabase();
    try {
      return (await readRecord(database, SERVICE_BACKUP_ID))?.payload;
    } finally {
      database.close();
    }
  }

  async write(envelope: SaveEnvelope): Promise<void> {
    const payload = exportSave(envelope);
    const database = await openDatabase();
    try {
      const previous = await readRecord(database, SERVICE_SAVE_ID);
      const transaction = database.transaction(SAVE_STORE, "readwrite");
      const store = transaction.objectStore(SAVE_STORE);
      if (previous !== undefined) {
        store.put({ ...previous, id: SERVICE_BACKUP_ID });
      } else {
        store.put({ id: SERVICE_BACKUP_ID, payload, savedAt: Date.now() } satisfies StoredSave);
      }
      store.put({ id: SERVICE_SAVE_ID, payload, savedAt: Date.now() } satisfies StoredSave);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async restoreBackup(payload: string): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SAVE_STORE, "readwrite");
      transaction.objectStore(SAVE_STORE).put({
        id: SERVICE_SAVE_ID,
        payload,
        savedAt: Date.now(),
      } satisfies StoredSave);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async quarantine(payload: string, reason: string): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction([SAVE_STORE, QUARANTINE_STORE], "readwrite");
      transaction.objectStore(QUARANTINE_STORE).put({
        id: `quarantine-${Date.now()}`,
        payload,
        reason,
        failedAt: Date.now(),
      });
      transaction.objectStore(SAVE_STORE).delete(SERVICE_SAVE_ID);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async clear(): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SAVE_STORE, "readwrite");
      transaction.objectStore(SAVE_STORE).delete(SERVICE_SAVE_ID);
      transaction.objectStore(SAVE_STORE).delete(SERVICE_BACKUP_ID);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }
}
