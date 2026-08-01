"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialState,
  createSaveEnvelope,
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
  ServiceState,
} from "@tender-baron/game-domain";
import { FIRST_SERVICE_CONTENT, RULES_V1 } from "@tender-baron/game-content";
import {
  IndexedDbSaveStore,
  SERVICE_SAVE_ID,
} from "@/lib/indexeddb-save-store";

type StorageState = "LOADING" | "SAVED" | "RECOVERED" | "MEMORY_ONLY" | "ERROR";

type RecoveryState = {
  readonly title: string;
  readonly detail: string;
  readonly canContinue: boolean;
} | null;

const SERVICE_INSTANCE_ID = "device-first-embers-v1";
const SERVICE_SEED = "first-embers-authored-seed-v1";

function freshInitialState(): ServiceState {
  return createInitialState(SERVICE_INSTANCE_ID, SERVICE_SEED, RULES_V1, FIRST_SERVICE_CONTENT);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The device save could not be read.";
}

export function useServiceSession() {
  const [state, setState] = useState<ServiceState>(() => freshInitialState());
  const [storageState, setStorageState] = useState<StorageState>("LOADING");
  const [recovery, setRecovery] = useState<RecoveryState>(null);
  const [notice, setNotice] = useState("Loading the verified device-local service…");
  const [busy, setBusy] = useState(false);
  const [rakePreview, setRakePreview] = useState<RakePreview | null>(null);

  const stateRef = useRef(state);
  const initialStateRef = useRef(state);
  const eventsRef = useRef<readonly GameEvent[]>([]);
  const storageRef = useRef(new IndexedDbSaveStore());
  const busyRef = useRef(false);

  const updateState = useCallback((next: ServiceState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const persistEvents = useCallback(async (events: readonly GameEvent[]) => {
    const replay = replayEvents(
      initialStateRef.current,
      events,
      RULES_V1,
      FIRST_SERVICE_CONTENT,
    );
    await storageRef.current.write(createSaveEnvelope(SERVICE_SAVE_ID, replay));
    eventsRef.current = events;
    updateState(replay.state);
    setStorageState("SAVED");
    return replay.state;
  }, [updateState]);

  const startFresh = useCallback(async (reason?: string) => {
    const initial = freshInitialState();
    initialStateRef.current = initial;
    eventsRef.current = [];
    updateState(initial);
    setRakePreview(null);
    try {
      await storageRef.current.clear();
      await persistEvents([]);
      setNotice(reason ?? "A fresh device-local First Embers service is ready.");
    } catch (error) {
      setStorageState("MEMORY_ONLY");
      setNotice(`Fresh service is available in this tab only. ${errorMessage(error)}`);
    }
  }, [persistEvents, updateState]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const current = await storageRef.current.readCurrent();
        if (cancelled) return;
        if (current === undefined) {
          await persistEvents([]);
          if (!cancelled) setNotice("First Embers is ready and saved on this device.");
          return;
        }

        try {
          const envelope = importSave(current, SERVICE_SAVE_ID, RULES_V1, FIRST_SERVICE_CONTENT);
          initialStateRef.current = envelope.initialState;
          eventsRef.current = envelope.events;
          updateState(envelope.state);
          setStorageState("SAVED");
          setNotice(`Verified local service resumed at tick ${envelope.state.currentTick}.`);
          return;
        } catch (currentError) {
          await storageRef.current.quarantine(current, errorMessage(currentError));
          const backup = await storageRef.current.readBackup();
          if (backup !== undefined) {
            try {
              const envelope = importSave(backup, SERVICE_SAVE_ID, RULES_V1, FIRST_SERVICE_CONTENT);
              initialStateRef.current = envelope.initialState;
              eventsRef.current = envelope.events;
              updateState(envelope.state);
              await storageRef.current.restoreBackup(backup);
              setStorageState("RECOVERED");
              setRecovery({
                title: "The latest save was set aside",
                detail: `A verified backup resumed at tick ${envelope.state.currentTick}. The rejected bytes remain quarantined on this device.`,
                canContinue: true,
              });
              setNotice("Verified backup restored. Review the recovery note before continuing.");
              return;
            } catch {
              // Fall through to a clean, clearly labeled recovery state.
            }
          }

          const initial = freshInitialState();
          initialStateRef.current = initial;
          eventsRef.current = [];
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
        setStorageState("MEMORY_ONLY");
        setNotice(`Device storage is unavailable; this tab can still play. ${errorMessage(error)}`);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [persistEvents, updateState]);

  const dispatch = useCallback(async <T extends ActionType>(type: T, payload: ActionPayloadMap[T]) => {
    if (busyRef.current) {
      setNotice("The previous service action is still being saved.");
      return false;
    }
    busyRef.current = true;
    setBusy(true);
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
        setRakePreview(result.preview);
        setNotice(`Rake preview ready at revision ${result.preview.previewRevision}. Apply it or choose another path.`);
        return true;
      }

      const events = result.duplicate ? eventsRef.current : [...eventsRef.current, result.event];
      const next = await persistEvents(events);
      setRakePreview(null);
      setNotice(`${result.event.changes.join(" · ")} Saved at tick ${next.currentTick}.`);
      return true;
    } catch (error) {
      setStorageState("ERROR");
      setNotice(`The action was not committed. ${errorMessage(error)}`);
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [persistEvents]);

  const previewRake = useCallback(async (sourceCellId: string, targetCellId: string) => {
    return dispatch("PREVIEW_RAKE", { sourceCellId, targetCellId, amount: 1 });
  }, [dispatch]);

  const applyRake = useCallback(async (sourceCellId: string, targetCellId: string) => {
    if (rakePreview === null || rakePreview.previewRevision !== stateRef.current.revision) {
      setNotice("Preview this rake against the current coal field before applying it.");
      return false;
    }
    return dispatch("APPLY_RAKE", {
      sourceCellId,
      targetCellId,
      amount: 1,
      previewRevision: rakePreview.previewRevision,
    });
  }, [dispatch, rakePreview]);

  return {
    state,
    content: FIRST_SERVICE_CONTENT,
    rules: RULES_V1,
    storageState,
    recovery,
    notice,
    busy,
    rakePreview,
    dispatch,
    previewRake,
    applyRake,
    announce: setNotice,
    dismissRecovery: () => setRecovery(null),
    startFresh,
  };
}
