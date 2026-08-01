"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SerialClockAdapter,
  createInitialState,
  createSaveEnvelope,
  exportSave,
  importSave,
  makeAction,
  reduce,
  replayEvents,
} from "@tender-baron/game-domain";
import type {
  ActionPayloadMap,
  ActionType,
  GameEvent,
  RakePreview,
  SaveEnvelope,
  ServiceState,
} from "@tender-baron/game-domain";
import { FIRST_SERVICE_CONTENT, RULES_V1 } from "@tender-baron/game-content";
import {
  IndexedDbSaveStore,
  SERVICE_SAVE_ID,
  SaveConflictError,
} from "@/lib/indexeddb-save-store";
import type {
  SaveExpectation,
  SaveSummary,
} from "@/lib/indexeddb-save-store";

type StorageState = "LOADING" | "SAVED" | "RECOVERED" | "MEMORY_ONLY" | "CONFLICT" | "ERROR";

type RecoveryState = {
  readonly title: string;
  readonly detail: string;
  readonly canContinue: boolean;
} | null;

type ConflictState = {
  readonly title: string;
  readonly detail: string;
  readonly remoteRevision?: number;
} | null;

type PendingInput = {
  readonly type: ActionType;
  readonly payload: ActionPayloadMap[ActionType];
  readonly resolve: (accepted: boolean) => void;
};

export type BoundRakePreview = RakePreview & {
  readonly previewId: string;
};

const SERVICE_INSTANCE_ID = "device-first-embers-v1";
const SERVICE_SEED = "first-embers-authored-seed-v1";

function freshInitialState(): ServiceState {
  return createInitialState(SERVICE_INSTANCE_ID, SERVICE_SEED, RULES_V1, FIRST_SERVICE_CONTENT);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The device save could not be read.";
}

function saveExpectation(envelope: SaveEnvelope): Exclude<SaveExpectation, null> {
  return { revision: envelope.state.revision, stateDigest: envelope.stateDigest };
}

function safeFilename(saveId: string): string {
  return `${saveId.replace(/[^a-z0-9-]+/gi, "-")}.tender-baron.json`;
}

export function useServiceSession() {
  const [state, setState] = useState<ServiceState>(() => freshInitialState());
  const [storageState, setStorageState] = useState<StorageState>("LOADING");
  const [recovery, setRecovery] = useState<RecoveryState>(null);
  const [conflict, setConflict] = useState<ConflictState>(null);
  const [notice, setNotice] = useState("Loading the verified device-local service…");
  const [busy, setBusy] = useState(false);
  const [rakePreview, setRakePreview] = useState<BoundRakePreview | null>(null);
  const [activeSaveId, setActiveSaveId] = useState(SERVICE_SAVE_ID);
  const [saves, setSaves] = useState<readonly SaveSummary[]>([]);

  const stateRef = useRef(state);
  const initialStateRef = useRef(state);
  const eventsRef = useRef<readonly GameEvent[]>([]);
  const storageRef = useRef(new IndexedDbSaveStore());
  const memoryOnlyRef = useRef(false);
  const activeSaveIdRef = useRef(SERVICE_SAVE_ID);
  const persistedRef = useRef<SaveExpectation>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const userWorkRef = useRef(0);
  const clockRef = useRef<SerialClockAdapter | null>(null);
  const clockCursorRef = useRef(0);
  const pendingInputsRef = useRef(new Map<string, PendingInput>());
  const inputCounterRef = useRef(0);

  const updateState = useCallback((next: ServiceState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const refreshSaves = useCallback(async () => {
    if (memoryOnlyRef.current) {
      setSaves([]);
      return;
    }
    setSaves(await storageRef.current.list());
  }, []);

  const enterConflict = useCallback((error: SaveConflictError) => {
    setStorageState("CONFLICT");
    setConflict({
      title: "Another tab moved this service forward",
      detail: "This tab stopped before overwriting accepted service history. Reload the newer device save or fork this tab’s last verified history.",
      ...(error.current?.revision === undefined ? {} : { remoteRevision: error.current.revision }),
    });
    setNotice("Concurrent device write detected. No action from this tab was committed.");
  }, []);

  const persistEvents = useCallback(async (events: readonly GameEvent[]) => {
    const replay = replayEvents(
      initialStateRef.current,
      events,
      RULES_V1,
      FIRST_SERVICE_CONTENT,
    );
    const envelope = createSaveEnvelope(activeSaveIdRef.current, replay);
    if (memoryOnlyRef.current) {
      eventsRef.current = events;
      updateState(replay.state);
      setStorageState("MEMORY_ONLY");
      return replay.state;
    }
    persistedRef.current = await storageRef.current.write(envelope, persistedRef.current);
    eventsRef.current = events;
    updateState(replay.state);
    setStorageState("SAVED");
    void refreshSaves();
    return replay.state;
  }, [refreshSaves, updateState]);

  const performAction = useCallback(async (
    type: ActionType,
    payload: ActionPayloadMap[ActionType],
    userInitiated: boolean,
  ): Promise<boolean> => {
    if (userInitiated) {
      userWorkRef.current += 1;
      setBusy(true);
    }
    try {
      const current = stateRef.current;
      const action = makeAction(
        current,
        type,
        payload as never,
        `ui-${current.nextActionSequence}-${type.toLowerCase()}`,
      );
      const result = reduce(current, action, RULES_V1, FIRST_SERVICE_CONTENT);
      if (!result.ok) {
        setNotice(`${result.error.message} ${result.error.recovery}`);
        return false;
      }
      if ("preview" in result) {
        const preview = result.preview as BoundRakePreview;
        setRakePreview(preview);
        setNotice(`Rake preview ready at revision ${preview.previewRevision}. Apply this exact path or choose another.`);
        return true;
      }

      const events = result.duplicate ? eventsRef.current : [...eventsRef.current, result.event];
      const next = await persistEvents(events);
      setRakePreview(null);
      if (userInitiated) {
        setNotice(`${result.event.changes.join(" · ")} ${memoryOnlyRef.current ? "Held in this tab" : "Saved"} at tick ${next.currentTick}.`);
      }
      return true;
    } catch (error) {
      if (error instanceof SaveConflictError) {
        enterConflict(error);
      } else {
        setStorageState("ERROR");
        setNotice(`The action was not committed. ${errorMessage(error)}`);
      }
      return false;
    } finally {
      if (userInitiated) {
        userWorkRef.current -= 1;
        if (userWorkRef.current === 0) setBusy(false);
      }
    }
  }, [enterConflict, persistEvents]);

  const enqueueAction = useCallback((
    type: ActionType,
    payload: ActionPayloadMap[ActionType],
    userInitiated: boolean,
  ): Promise<boolean> => {
    const result = queueRef.current.then(
      () => performAction(type, payload, userInitiated),
      () => performAction(type, payload, userInitiated),
    );
    queueRef.current = result.then(() => undefined, () => undefined);
    return result;
  }, [performAction]);

  const drainClock = useCallback(() => {
    const adapter = clockRef.current;
    if (adapter === null) return;
    const tokens = adapter.tokens();
    while (clockCursorRef.current < tokens.length) {
      const token = tokens[clockCursorRef.current];
      clockCursorRef.current += 1;
      if (token?.kind === "ADVANCE_TICK") {
        void enqueueAction("ADVANCE_TICK", { ticks: 1 }, false);
      } else if (token?.kind === "INPUT") {
        const pending = pendingInputsRef.current.get(token.inputId);
        if (pending !== undefined) {
          pendingInputsRef.current.delete(token.inputId);
          void enqueueAction(pending.type, pending.payload, true).then(pending.resolve);
        }
      }
    }
  }, [enqueueAction]);

  const dispatch = useCallback(<T extends ActionType>(
    type: T,
    payload: ActionPayloadMap[T],
  ): Promise<boolean> => {
    if (conflict !== null) {
      setNotice("Resolve the device-save conflict before submitting another service action.");
      return Promise.resolve(false);
    }
    const adapter = clockRef.current;
    if (adapter === null || type === "PAUSE_SERVICE" || type === "RESUME_SERVICE") {
      return enqueueAction(type, payload as ActionPayloadMap[ActionType], true);
    }
    const inputId = `browser-input-${inputCounterRef.current}`;
    inputCounterRef.current += 1;
    return new Promise<boolean>((resolve) => {
      pendingInputsRef.current.set(inputId, {
        type,
        payload: payload as ActionPayloadMap[ActionType],
        resolve,
      });
      adapter.captureInput(inputId, Math.floor(performance.now()));
      drainClock();
    });
  }, [conflict, drainClock, enqueueAction]);

  const pauseService = useCallback(async (reason: "manual" | "background" = "manual") => {
    if (stateRef.current.serviceStatus !== "OPEN" || stateRef.current.paused) return false;
    const adapter = clockRef.current;
    if (adapter !== null) {
      adapter.pause(Math.floor(performance.now()));
      drainClock();
      clockRef.current = null;
      clockCursorRef.current = 0;
    }
    const accepted = await enqueueAction("PAUSE_SERVICE", {}, true);
    if (accepted && reason === "background") {
      setNotice("Service paused when this tab went into the background. Resume deliberately; no away-time ticks were added.");
    }
    return accepted;
  }, [drainClock, enqueueAction]);

  const resumeService = useCallback(async () => {
    const accepted = await enqueueAction("RESUME_SERVICE", {}, true);
    if (accepted) setNotice("Service resumed from a fresh monotonic anchor. No background catch-up was added.");
    return accepted;
  }, [enqueueAction]);

  useEffect(() => {
    if (state.serviceStatus !== "OPEN" || state.paused || recovery !== null || conflict !== null) {
      clockRef.current = null;
      clockCursorRef.current = 0;
      return;
    }
    const adapter = new SerialClockAdapter(Math.floor(performance.now()), RULES_V1.tickDurationMs);
    clockRef.current = adapter;
    clockCursorRef.current = 0;
    let frame = 0;
    const onFrame = (timestamp: number) => {
      if (clockRef.current !== adapter) return;
      adapter.onFrame(Math.floor(timestamp));
      drainClock();
      frame = requestAnimationFrame(onFrame);
    };
    frame = requestAnimationFrame(onFrame);
    return () => {
      cancelAnimationFrame(frame);
      if (clockRef.current === adapter) {
        clockRef.current = null;
        clockCursorRef.current = 0;
      }
    };
  }, [conflict, drainClock, recovery, state.paused, state.serviceStatus]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") void pauseService("background");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [pauseService]);

  const loadEnvelope = useCallback((envelope: SaveEnvelope, storage: StorageState, message: string) => {
    initialStateRef.current = envelope.initialState;
    eventsRef.current = envelope.events;
    activeSaveIdRef.current = envelope.saveId;
    persistedRef.current = saveExpectation(envelope);
    setActiveSaveId(envelope.saveId);
    updateState(envelope.state);
    setStorageState(storage);
    setConflict(null);
    setRakePreview(null);
    setNotice(message);
  }, [updateState]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const current = await storageRef.current.read(SERVICE_SAVE_ID);
        if (cancelled) return;
        if (current === undefined) {
          const initial = freshInitialState();
          const replay = replayEvents(initial, [], RULES_V1, FIRST_SERVICE_CONTENT);
          const envelope = createSaveEnvelope(SERVICE_SAVE_ID, replay);
          persistedRef.current = await storageRef.current.write(envelope, null);
          initialStateRef.current = initial;
          eventsRef.current = [];
          updateState(initial);
          setStorageState("SAVED");
          setNotice("First Embers is ready and saved on this device.");
          await refreshSaves();
          return;
        }

        try {
          const envelope = importSave(current, SERVICE_SAVE_ID, RULES_V1, FIRST_SERVICE_CONTENT);
          loadEnvelope(envelope, "SAVED", `Verified local service resumed at tick ${envelope.state.currentTick}.`);
          await refreshSaves();
          return;
        } catch (currentError) {
          await storageRef.current.quarantine(SERVICE_SAVE_ID, current, errorMessage(currentError));
          const backup = await storageRef.current.readBackup(SERVICE_SAVE_ID);
          if (backup !== undefined) {
            try {
              const envelope = importSave(backup, SERVICE_SAVE_ID, RULES_V1, FIRST_SERVICE_CONTENT);
              persistedRef.current = await storageRef.current.restoreBackup(SERVICE_SAVE_ID, backup, envelope);
              loadEnvelope(envelope, "RECOVERED", "Verified backup restored. Review the recovery note before continuing.");
              setRecovery({
                title: "The latest save was set aside",
                detail: `A verified backup resumed at tick ${envelope.state.currentTick}. The rejected bytes remain quarantined on this device.`,
                canContinue: true,
              });
              await refreshSaves();
              return;
            } catch {
              // Continue to the explicit no-verified-save decision below.
            }
          }

          const initial = freshInitialState();
          initialStateRef.current = initial;
          eventsRef.current = [];
          persistedRef.current = null;
          updateState(initial);
          setStorageState("ERROR");
          setRecovery({
            title: "No verified service could be resumed",
            detail: "The unreadable save was quarantined. Start a fresh local service; no settlement or result was inferred.",
            canContinue: false,
          });
          setNotice("Save recovery needs a decision.");
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof SaveConflictError) {
          let winner: string | undefined;
          try {
            winner = await storageRef.current.read(SERVICE_SAVE_ID);
          } catch (readError) {
            memoryOnlyRef.current = true;
            persistedRef.current = null;
            setStorageState("MEMORY_ONLY");
            setNotice(`Device storage became unavailable while another tab created the first service. This tab can still play in memory. ${errorMessage(readError)}`);
            return;
          }
          if (winner !== undefined) {
            try {
              const envelope = importSave(winner, SERVICE_SAVE_ID, RULES_V1, FIRST_SERVICE_CONTENT);
              loadEnvelope(envelope, "SAVED", "Another tab created the first verified service; this tab loaded that same canonical history.");
              await refreshSaves();
              return;
            } catch (winnerError) {
              const initial = freshInitialState();
              initialStateRef.current = initial;
              eventsRef.current = [];
              persistedRef.current = null;
              updateState(initial);
              setStorageState("ERROR");
              setRecovery({
                title: "The concurrent service could not be verified",
                detail: "Another tab created a device save, but its bytes did not verify. No history or settlement was inferred.",
                canContinue: false,
              });
              setNotice(`Concurrent first-save verification failed. ${errorMessage(winnerError)}`);
              return;
            }
          }
          setStorageState("ERROR");
          setNotice("Another tab won first-save creation, but no current history could be read. Reload before beginning service.");
          return;
        }
        memoryOnlyRef.current = true;
        persistedRef.current = null;
        setStorageState("MEMORY_ONLY");
        setNotice(`Device storage is unavailable. This service can play in this tab, but it will end when the tab closes. ${errorMessage(error)}`);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [loadEnvelope, refreshSaves, updateState]);

  const startFresh = useCallback(async (reason?: string) => {
    const initial = freshInitialState();
    initialStateRef.current = initial;
    eventsRef.current = [];
    updateState(initial);
    setRakePreview(null);
    setRecovery(null);
    setConflict(null);
    if (memoryOnlyRef.current) {
      persistedRef.current = null;
      setStorageState("MEMORY_ONLY");
      setNotice(reason ?? "A fresh memory-only First Embers service is ready in this tab.");
      return;
    }
    try {
      if (persistedRef.current !== null) {
        await storageRef.current.delete(activeSaveIdRef.current, persistedRef.current);
      }
      activeSaveIdRef.current = SERVICE_SAVE_ID;
      setActiveSaveId(SERVICE_SAVE_ID);
      persistedRef.current = null;
      const replay = replayEvents(initial, [], RULES_V1, FIRST_SERVICE_CONTENT);
      persistedRef.current = await storageRef.current.write(createSaveEnvelope(SERVICE_SAVE_ID, replay), null);
      setStorageState("SAVED");
      setNotice(reason ?? "A fresh device-local First Embers service is ready.");
      await refreshSaves();
    } catch (error) {
      if (error instanceof SaveConflictError) enterConflict(error);
      else {
        setStorageState("ERROR");
        setNotice(`A fresh service could not be saved. ${errorMessage(error)}`);
      }
    }
  }, [enterConflict, refreshSaves, updateState]);

  const previewRake = useCallback((sourceCellId: string, targetCellId: string) => {
    return dispatch("PREVIEW_RAKE", { sourceCellId, targetCellId, amount: 1 });
  }, [dispatch]);

  const applyRake = useCallback(() => {
    if (rakePreview === null || rakePreview.previewRevision !== stateRef.current.revision) {
      setNotice("Preview this exact rake against the current coal field before applying it.");
      return Promise.resolve(false);
    }
    return dispatch("APPLY_RAKE", {
      sourceCellId: rakePreview.sourceCellId,
      targetCellId: rakePreview.targetCellId,
      amount: rakePreview.amount,
      previewRevision: rakePreview.previewRevision,
      previewId: rakePreview.previewId,
    });
  }, [dispatch, rakePreview]);

  const clearRakePreview = useCallback((message?: string) => {
    setRakePreview(null);
    if (message !== undefined) setNotice(message);
  }, []);

  const currentEnvelope = useCallback(() => {
    const replay = replayEvents(initialStateRef.current, eventsRef.current, RULES_V1, FIRST_SERVICE_CONTENT);
    return createSaveEnvelope(activeSaveIdRef.current, replay);
  }, []);

  const exportCurrent = useCallback(() => {
    const envelope = currentEnvelope();
    const href = URL.createObjectURL(new Blob([exportSave(envelope)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = safeFilename(envelope.saveId);
    link.click();
    URL.revokeObjectURL(href);
    setNotice(`Exported ${envelope.saveId} with its canonical replay and digests.`);
  }, [currentEnvelope]);

  const forkCurrent = useCallback(async () => {
    const source = activeSaveIdRef.current;
    const replay = replayEvents(initialStateRef.current, eventsRef.current, RULES_V1, FIRST_SERVICE_CONTENT);
    const forkId = `${source}-fork-${Date.now().toString(36)}`;
    const envelope = createSaveEnvelope(forkId, replay, source);
    if (memoryOnlyRef.current) {
      activeSaveIdRef.current = forkId;
      setActiveSaveId(forkId);
      setNotice(`Created memory-only fork ${forkId}. It remains in this tab only.`);
      return;
    }
    try {
      persistedRef.current = await storageRef.current.write(envelope, null);
      activeSaveIdRef.current = forkId;
      setActiveSaveId(forkId);
      setStorageState("SAVED");
      setConflict(null);
      setNotice(`Forked the verified history into ${forkId}.`);
      await refreshSaves();
    } catch (error) {
      if (error instanceof SaveConflictError) enterConflict(error);
      else setNotice(`The fork was not created. ${errorMessage(error)}`);
    }
  }, [enterConflict, refreshSaves]);

  const importFile = useCallback(async (file: File) => {
    if (memoryOnlyRef.current) {
      setNotice("Import needs durable device storage. Export remains available for this memory-only session.");
      return;
    }
    try {
      const saveId = `first-embers-import-${Date.now().toString(36)}`;
      const envelope = importSave(await file.text(), saveId, RULES_V1, FIRST_SERVICE_CONTENT);
      persistedRef.current = await storageRef.current.write(envelope, null);
      loadEnvelope(envelope, "SAVED", `Imported and verified ${file.name} as ${saveId}.`);
      await refreshSaves();
    } catch (error) {
      setNotice(`Import rejected without changing the active service. ${errorMessage(error)}`);
    }
  }, [loadEnvelope, refreshSaves]);

  const deleteCurrent = useCallback(async () => {
    if (memoryOnlyRef.current) {
      await startFresh("The memory-only service was deleted; a fresh tab session is ready.");
      return;
    }
    try {
      const deletedSaveId = activeSaveIdRef.current;
      await storageRef.current.delete(deletedSaveId, persistedRef.current);
      persistedRef.current = null;
      const remaining = await storageRef.current.list();
      const next = remaining.find((save) => save.id === SERVICE_SAVE_ID) ?? remaining[0];
      if (next !== undefined) {
        const payload = await storageRef.current.read(next.id);
        if (payload === undefined) throw new Error("The preserved local service could not be read.");
        const envelope = importSave(payload, next.id, RULES_V1, FIRST_SERVICE_CONTENT);
        loadEnvelope(envelope, "SAVED", `Deleted ${deletedSaveId} and loaded preserved history ${next.id}.`);
        setSaves(remaining);
        return;
      }
      await startFresh("The selected local service was deleted; a fresh service is ready.");
    } catch (error) {
      if (error instanceof SaveConflictError) enterConflict(error);
      else setNotice(`The save was not deleted. ${errorMessage(error)}`);
    }
  }, [enterConflict, loadEnvelope, startFresh]);

  const reloadConflict = useCallback(async () => {
    try {
      const payload = await storageRef.current.read(activeSaveIdRef.current);
      if (payload === undefined) throw new Error("The newer device save no longer exists.");
      const envelope = importSave(payload, activeSaveIdRef.current, RULES_V1, FIRST_SERVICE_CONTENT);
      loadEnvelope(envelope, "SAVED", `Reloaded the newer device history at revision ${envelope.state.revision}.`);
      setRecovery(null);
    } catch (error) {
      setNotice(`The newer history could not be loaded. ${errorMessage(error)}`);
    }
  }, [loadEnvelope]);

  const forkConflict = useCallback(async () => {
    const source = activeSaveIdRef.current;
    const replay = replayEvents(initialStateRef.current, eventsRef.current, RULES_V1, FIRST_SERVICE_CONTENT);
    const forkId = `${source}-conflict-fork-${Date.now().toString(36)}`;
    const envelope = createSaveEnvelope(forkId, replay, source);
    try {
      persistedRef.current = await storageRef.current.write(envelope, null);
      activeSaveIdRef.current = forkId;
      setActiveSaveId(forkId);
      setConflict(null);
      setStorageState("SAVED");
      setNotice(`This tab’s last verified history now continues as ${forkId}. Retry the uncommitted choice if desired.`);
      await refreshSaves();
    } catch (error) {
      setNotice(`The conflict fork could not be created. ${errorMessage(error)}`);
    }
  }, [refreshSaves]);

  return {
    state,
    content: FIRST_SERVICE_CONTENT,
    rules: RULES_V1,
    storageState,
    recovery,
    conflict,
    notice,
    busy,
    rakePreview,
    activeSaveId,
    saves,
    dispatch,
    pauseService,
    resumeService,
    previewRake,
    applyRake,
    clearRakePreview,
    announce: setNotice,
    dismissRecovery: () => setRecovery(null),
    startFresh,
    exportCurrent,
    importFile,
    forkCurrent,
    deleteCurrent,
    reloadConflict,
    forkConflict,
  };
}
