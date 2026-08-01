import { describe, expect, it } from "vitest";
import {
  canonicalize,
  createInitialState,
  makeAction,
  reduce
} from "@tender-baron/game-domain";
import type { GameAction } from "@tender-baron/game-domain";
import { FIRST_SERVICE_CONTENT, RULES_V1 } from "@tender-baron/game-content";
import { ServiceHarness } from "../src/harness.js";

describe("single-action reducer contract", () => {
  it("returns the prior event for an exact duplicate and rejects ID conflicts", () => {
    const initial = createInitialState("duplicate", "seed", RULES_V1, FIRST_SERVICE_CONTENT);
    const action = makeAction(initial, "OPEN_HOUSE", {}, "same-id");
    const accepted = reduce(initial, action, RULES_V1, FIRST_SERVICE_CONTENT);
    expect(accepted.ok && !("preview" in accepted)).toBe(true);
    if (!accepted.ok || "preview" in accepted) return;

    const duplicate = reduce(accepted.state, action, RULES_V1, FIRST_SERVICE_CONTENT);
    expect(duplicate.ok && !("preview" in duplicate) && duplicate.duplicate).toBe(true);
    if (!duplicate.ok || "preview" in duplicate) return;
    expect(duplicate.state).toBe(accepted.state);
    expect(duplicate.event).toEqual(accepted.event);

    const conflict: GameAction = {
      ...action,
      type: "INSPECT_PARTY",
      payload: {}
    };
    const rejected = reduce(accepted.state, conflict, RULES_V1, FIRST_SERVICE_CONTENT);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error.code).toBe("TB_ACTION_ID_CONFLICT");
      expect(rejected.state).toBe(accepted.state);
    }
  });

  it("rejects stale revisions and skipped sequences without consuming either", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    const current = service.state;

    const stale = {
      ...makeAction(current, "INSPECT_PARTY", {}, "stale"),
      expectedRevision: current.revision - 1
    };
    const staleResult = reduce(current, stale, service.rules, service.content);
    expect(staleResult.ok).toBe(false);
    if (!staleResult.ok) {
      expect(staleResult.error.code).toBe("TB_STATE_REVISION");
      expect(staleResult.state).toBe(current);
    }

    const skipped = {
      ...makeAction(current, "INSPECT_PARTY", {}, "skipped"),
      actionSequence: current.nextActionSequence + 1
    };
    const skippedResult = reduce(current, skipped, service.rules, service.content);
    expect(skippedResult.ok).toBe(false);
    if (!skippedResult.ok) {
      expect(skippedResult.error.code).toBe("TB_ACTION_SEQUENCE");
      expect(skippedResult.state).toBe(current);
    }
  });

  it("keeps rake previews non-canonical and rejects stale apply", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    service.act("INSPECT_PARTY", {}, "inspect");
    const revision = service.state.revision;
    const preview = service.previewRake("coal_a", "coal_b", 1);
    expect(preview.previewRevision).toBe(revision);
    expect(service.state.revision).toBe(revision);
    expect(service.actions).toHaveLength(2);

    service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select-after-preview");
    const staleApply = makeAction(
      service.state,
      "APPLY_RAKE",
      {
        sourceCellId: "coal_a",
        targetCellId: "coal_b",
        amount: 1,
        previewRevision: revision
      },
      "stale-apply"
    );
    const rejected = reduce(service.state, staleApply, service.rules, service.content);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe("TB_PREVIEW_STALE");
  });

  it("applies an exact rake and preserves finite coal", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    service.act("INSPECT_PARTY", {}, "inspect");
    const preview = service.previewRake("coal_a", "coal_b", 1);
    service.act(
      "APPLY_RAKE",
      {
        sourceCellId: "coal_a",
        targetCellId: "coal_b",
        amount: 1,
        previewRevision: preview.previewRevision
      },
      "apply-rake"
    );
    expect(service.state.coalField).toEqual(preview.coalField);
    expect(service.state.coalField.reduce((sum, cell) => sum + cell.value, 0)).toBe(6);
  });

  it("serializes pause/resume and rejects batched or paused ticks", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    service.act("INSPECT_PARTY", {}, "inspect");
    service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select");
    service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place");
    service.act("TURN_CUT", { cutId: "cut_strip_a" }, "turn");
    service.act("APPLY_BASTE", { cutId: "cut_strip_a", profileId: "HOUSE_BASTE" }, "baste");
    service.act("PAUSE_SERVICE", {}, "pause");

    const pausedTick = makeAction(service.state, "ADVANCE_TICK", { ticks: 1 }, "paused-tick");
    const pausedResult = reduce(service.state, pausedTick, service.rules, service.content);
    expect(pausedResult.ok).toBe(false);
    if (!pausedResult.ok) expect(pausedResult.error.code).toBe("TB_ACTION_NOT_ALLOWED");

    service.act("RESUME_SERVICE", {}, "resume");
    const batched = {
      ...makeAction(service.state, "ADVANCE_TICK", { ticks: 1 }, "batch"),
      payload: { ticks: 2 }
    } as unknown as GameAction;
    const batchResult = reduce(service.state, batched, service.rules, service.content);
    expect(batchResult.ok).toBe(false);
    if (!batchResult.ok) expect(batchResult.error.code).toBe("TB_TICK_RANGE");
    expect(canonicalize(batchResult.state)).toBe(canonicalize(service.state));
  });

  it("abandons without revenue and accepts no later mutation", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    service.act("INSPECT_PARTY", {}, "inspect");
    service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select");
    service.act("ABANDON_SERVICE", {}, "abandon");
    expect(service.state.serviceStatus).toBe("ABANDONED");
    expect(service.state.settlement?.ledger.grossServiceRevenueCents).toBe(0);
    expect(service.state.settlement?.ledger.ingredientCostCents).toBe(1_250);

    const later = makeAction(service.state, "OPEN_HOUSE", {}, "later");
    const result = reduce(service.state, later, service.rules, service.content);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("TB_ACTION_NOT_ALLOWED");
  });
});
