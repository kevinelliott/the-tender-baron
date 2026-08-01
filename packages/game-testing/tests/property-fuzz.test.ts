import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  canonicalize,
  createSaveEnvelope,
  makeAction,
  reduce,
  replayEvents,
  resumeSave
} from "@tender-baron/game-domain";
import type { ServiceState } from "@tender-baron/game-domain";
import { ServiceHarness } from "../src/harness.js";
import { buildGoldenFirstService } from "../src/golden.js";

function briefingHarness(): ServiceHarness {
  const service = new ServiceHarness();
  service.act("OPEN_HOUSE", {}, "open");
  return service;
}

function openHarness(): ServiceHarness {
  const service = briefingHarness();
  service.act("INSPECT_PARTY", {}, "inspect");
  service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select");
  service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place");
  return service;
}

describe("property and fuzz coverage", () => {
  it("rejects arbitrary skipped sequence and stale revision offsets atomically", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }),
        fc.integer({ min: 1, max: 10_000 }),
        (sequenceOffset, revisionOffset) => {
          const service = briefingHarness();
          const before = canonicalize(service.state);
          const action = {
            ...makeAction(service.state, "INSPECT_PARTY", {}, "fuzz-stale"),
            actionSequence: service.state.nextActionSequence + sequenceOffset,
            expectedRevision: service.state.revision + revisionOffset
          };
          const result = reduce(service.state, action, service.rules, service.content);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.code).toBe("TB_ACTION_SEQUENCE");
            expect(canonicalize(result.state)).toBe(before);
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it("keeps exact duplicates idempotent for arbitrary stable IDs", () => {
    fc.assert(
      fc.property(fc.uuid(), (actionId) => {
        const service = briefingHarness();
        const action = makeAction(service.state, "INSPECT_PARTY", {}, actionId);
        const first = reduce(service.state, action, service.rules, service.content);
        expect(first.ok && !("preview" in first)).toBe(true);
        if (!first.ok || "preview" in first) return;
        const second = reduce(first.state, action, service.rules, service.content);
        expect(second.ok && !("preview" in second) && second.duplicate).toBe(true);
        if (!second.ok || "preview" in second) return;
        expect(second.state).toBe(first.state);
        expect(second.event).toEqual(first.event);
      }),
      { numRuns: 300 }
    );
  });

  it("advances exactly the requested serialized ticks around pause/resume", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 80 }),
        fc.integer({ min: 0, max: 80 }),
        (beforePause, afterResume) => {
          const service = openHarness();
          service.tick(beforePause);
          service.act("PAUSE_SERVICE", {}, `pause-${beforePause}`);
          const pausedTick = service.state.currentTick;
          service.act("RESUME_SERVICE", {}, `resume-${afterResume}`);
          service.tick(afterResume);
          expect(service.state.currentTick).toBe(pausedTick + afterResume);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("fails closed when fixed-point progress would exceed numeric bounds", () => {
    const service = openHarness();
    const corrupted = {
      ...service.state,
      cuts: service.state.cuts.map((cut) =>
        cut.id === "cut_strip_a"
          ? { ...cut, surfaceMilli: service.rules.numericLimit }
          : cut
      )
    } satisfies ServiceState;
    const action = makeAction(corrupted, "ADVANCE_TICK", { ticks: 1 }, "overflow");
    const result = reduce(corrupted, action, service.rules, service.content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TB_NUMERIC_RANGE");
      expect(result.state).toBe(corrupted);
    }
  });

  it("replays and resumes every durable first-service boundary", () => {
    const { harness, replay } = buildGoldenFirstService();
    const durableActionIds = new Set([
      "inspect-party",
      "place-strip-a",
      "rest-strip-a",
      "rest-filet-d",
      "rest-strip-b",
      "rest-ribeye-c",
      "call-the-table",
      "settle-service"
    ]);
    replay.events.forEach((event, index) => {
      if (!durableActionIds.has(event.action.actionId)) return;
      const prefix = replay.events.slice(0, index + 1);
      const prefixReplay = replayEvents(
        harness.initialState,
        prefix,
        harness.rules,
        harness.content
      );
      const envelope = createSaveEnvelope(`boundary-${index}`, prefixReplay);
      const resumed = resumeSave(envelope, harness.rules, harness.content);
      expect(canonicalize(resumed.state)).toBe(canonicalize(prefixReplay.state));
      expect(resumed.replayDigest).toBe(prefixReplay.replayDigest);
    });
  });
});
