import { describe, expect, it } from "vitest";
import {
  MemorySaveStore,
  createSaveEnvelope,
  exportSave,
  importSave,
  resumeSave
} from "@tender-baron/game-domain";
import type { SaveEnvelope } from "@tender-baron/game-domain";
import { buildGoldenFirstService } from "../src/golden.js";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
