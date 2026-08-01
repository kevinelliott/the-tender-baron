import { describe, expect, it } from "vitest";
import {
  MemorySaveStore,
  canonicalize,
  createInitialState,
  createSaveEnvelope,
  makeAction,
  replayActions,
  replayEvents,
  resumeSave,
  verifyReplayResult
} from "@tender-baron/game-domain";
import type {
  FirstServiceContent,
  GameEvent,
  GameRules,
  ReplayResult,
  SaveEnvelope
} from "@tender-baron/game-domain";
import { FIRST_SERVICE_CONTENT, RULES_V1 } from "@tender-baron/game-content";
import { buildGoldenFirstService } from "../src/golden.js";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("replay and save integrity failure paths", () => {
  it("rejects preview-only and duplicate action records from canonical replay", () => {
    const initial = createInitialState("replay-errors", "seed", RULES_V1, FIRST_SERVICE_CONTENT);
    const preview = makeAction(
      initial,
      "PREVIEW_RAKE",
      { sourceCellId: "coal_a", targetCellId: "coal_b", amount: 1 },
      "preview"
    );
    expect(() => replayActions(initial, [preview], RULES_V1, FIRST_SERVICE_CONTENT)).toThrow(
      /preview-only/
    );

    const open = makeAction(initial, "OPEN_HOUSE", {}, "open");
    expect(() => replayActions(initial, [open, open], RULES_V1, FIRST_SERVICE_CONTENT)).toThrow(
      /duplicate/
    );
  });

  it("rejects tampered event bytes and candidate digests", () => {
    const { harness, replay } = buildGoldenFirstService();
    const events = clone(replay.events) as GameEvent[];
    events[0] = { ...events[0]!, changes: ["tampered"] };
    expect(() => replayEvents(harness.initialState, events, harness.rules, harness.content)).toThrow(
      /diverged/
    );

    const badDigest = { ...replay, replayDigest: "0".repeat(64) } satisfies ReplayResult;
    expect(() => verifyReplayResult(badDigest, harness.rules, harness.content)).toThrow(
      /digest/
    );
    const badState = { ...replay, stateDigest: "1".repeat(64) } satisfies ReplayResult;
    expect(() => verifyReplayResult(badState, harness.rules, harness.content)).toThrow(
      /recorded state/
    );
  });

  it("fails replay and save resume closed on pinned rule/content drift", () => {
    const { replay } = buildGoldenFirstService();
    const envelope = createSaveEnvelope("drift", replay);
    const rules = clone(RULES_V1) as GameRules & {
      ref: { id: string; version: number; contentHash: string };
    };
    rules.ref.contentHash = "a".repeat(64);
    expect(() => resumeSave(envelope, rules, FIRST_SERVICE_CONTENT)).toThrow(/different rules/);

    const content = clone(FIRST_SERVICE_CONTENT) as FirstServiceContent & {
      ref: { id: string; version: number; contentHash: string };
    };
    content.ref.contentHash = "b".repeat(64);
    expect(() => resumeSave(envelope, RULES_V1, content)).toThrow(/different content/);

    const unsupported = { ...envelope, schemaVersion: 2 } as unknown as SaveEnvelope;
    expect(() => resumeSave(unsupported, RULES_V1, FIRST_SERVICE_CONTENT)).toThrow(
      /unsupported/
    );
  });

  it("does not silently fork a missing save", () => {
    const store = new MemorySaveStore();
    expect(() => store.fork("missing", "new")).toThrow(/does not exist/);
    expect(store.list()).toEqual([]);
  });

  it("keeps canonical replay independent of object insertion order", () => {
    const { replay } = buildGoldenFirstService();
    const reordered = JSON.parse(canonicalize(replay.events)) as readonly GameEvent[];
    expect(canonicalize(reordered)).toBe(canonicalize(replay.events));
  });
});
