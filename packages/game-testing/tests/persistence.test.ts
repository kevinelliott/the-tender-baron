import { describe, expect, it } from "vitest";
import {
  MemorySaveStore,
  canonicalHash,
  canonicalize,
  createSaveEnvelope,
  createInitialState,
  exportSave,
  importSave,
  resumeSave,
  sha256Hex,
  stateDigestInput
} from "@tender-baron/game-domain";
import type { GameEvent, SaveEnvelope, ServiceState } from "@tender-baron/game-domain";
import { FIRST_SERVICE_CONTENT, RULES_V1 } from "@tender-baron/game-content";
import { buildGoldenFirstService } from "../src/golden.js";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function selfAuthoredEnvelope(
  mutate: (initialState: ServiceState) => void
): SaveEnvelope {
  const initialState = clone(
    createInitialState("forged-service", "forged-seed", RULES_V1, FIRST_SERVICE_CONTENT)
  );
  mutate(initialState);
  const events: GameEvent[] = [];
  const replayDigest = sha256Hex(
    "tender-baron/replay/v1" +
      canonicalize(RULES_V1.ref) +
      canonicalize(FIRST_SERVICE_CONTENT.ref) +
      canonicalize(initialState) +
      canonicalize(events)
  );
  const stateDigest = canonicalHash(stateDigestInput(initialState));
  return {
    schemaVersion: 1,
    saveId: "self-authored",
    rulesRef: RULES_V1.ref,
    contentRef: FIRST_SERVICE_CONTENT.ref,
    initialState,
    events,
    state: initialState,
    replayDigest,
    stateDigest
  };
}

describe("save, resume, import, fork, and corruption handling", () => {
  it("round-trips a settled save and imports it as a labeled fork", () => {
    const { harness, replay } = buildGoldenFirstService();
    const envelope = createSaveEnvelope("save-original", replay);
    const serialized = exportSave(envelope);
    const resumed = resumeSave(envelope, harness.rules, harness.content);
    expect(resumed.replayDigest).toBe(replay.replayDigest);
    expect(resumed.stateDigest).toBe(replay.stateDigest);

    const imported = importSave(serialized, "save-imported", harness.rules, harness.content);
    expect(imported.saveId).toBe("save-imported");
    expect(imported.forkedFromSaveId).toBe("save-original");
    expect(imported.replayDigest).toBe(replay.replayDigest);
  });

  it("rejects torn event tails, altered state, malformed JSON, and oversized imports", () => {
    const { harness, replay } = buildGoldenFirstService();
    const envelope = createSaveEnvelope("save", replay);

    const torn = clone(envelope) as SaveEnvelope & { events: SaveEnvelope["events"] };
    torn.events = torn.events.slice(0, -1);
    expect(() => resumeSave(torn, harness.rules, harness.content)).toThrow(/digest/i);

    const altered = clone(envelope) as SaveEnvelope & {
      state: SaveEnvelope["state"] & { currentTick: number };
    };
    altered.state.currentTick += 1;
    expect(() => resumeSave(altered, harness.rules, harness.content)).toThrow(/saved state/i);

    expect(() => importSave("{", "bad", harness.rules, harness.content)).toThrow(/valid JSON/);
    expect(() =>
      importSave("x".repeat(2_000_001), "large", harness.rules, harness.content)
    ).toThrow(/size bound/);
    expect(() =>
      importSave(
        JSON.stringify({ padding: "é".repeat(1_000_000) }),
        "multibyte-large",
        harness.rules,
        harness.content
      )
    ).toThrow(/size bound/);
  });

  it("rejects self-authored replay roots across authority and state-machine fields", () => {
    const mutations: Array<[string, (state: ServiceState) => void]> = [
      ["status", (state) => Object.assign(state, { serviceStatus: "OPEN" })],
      ["capacity", (state) => Object.assign(state.capacities, { rest: 999 })],
      ["ledger", (state) => Object.assign(state.ledgerAccrual, { ingredientCostCents: 999 })],
      ["history", (state) => Object.assign(state, { acceptedActionIds: [{ actionId: "forged" }] })],
      ["tick", (state) => Object.assign(state, { currentTick: 4 })],
      ["cut topology", (state) => Object.assign(state, { cuts: state.cuts.slice(1) })],
      ["side state", (state) => Object.assign(state.sides[0]!, { status: "SERVED" })],
      ["numeric bounds", (state) => Object.assign(state.cuts[0]!, { surfaceMilli: 999 })],
      ["host assist", (state) => Object.assign(state, { hostAssistRemaining: 999 })]
    ];

    for (const [label, mutate] of mutations) {
      const forged = selfAuthoredEnvelope(mutate);
      expect(
        () => resumeSave(forged, RULES_V1, FIRST_SERVICE_CONTENT),
        label
      ).toThrow(/canonical initial state/);
    }

    const imported = selfAuthoredEnvelope((state) => {
      Object.assign(state.capacities, { grill: 999, rest: 999, side: 999 });
      Object.assign(state, { hostAssistRemaining: 999 });
    });
    expect(() =>
      importSave(
        JSON.stringify(imported),
        "rejected-fork",
        RULES_V1,
        FIRST_SERVICE_CONTENT
      )
    ).toThrow(/canonical initial state/);
  });

  it("keeps explicit local forks separate and deletes only the selected save", () => {
    const { replay } = buildGoldenFirstService();
    const store = new MemorySaveStore();
    const original = createSaveEnvelope("a", replay);
    store.write(original);
    const fork = store.fork("a", "b");
    expect(fork.forkedFromSaveId).toBe("a");
    expect(store.list().map((save) => save.saveId)).toEqual(["a", "b"]);
    expect(store.delete("a")).toBe(true);
    expect(store.read("a")).toBeUndefined();
    expect(store.read("b")?.saveId).toBe("b");
  });
});
