import { describe, expect, it } from "vitest";
import { makeAction, reduce } from "@tender-baron/game-domain";
import { ServiceHarness } from "../src/harness.js";
import { buildGoldenFirstService } from "../src/golden.js";

function atRiskCut(): ServiceHarness {
  const service = new ServiceHarness();
  service.act("OPEN_HOUSE", {}, "open");
  service.act("INSPECT_PARTY", {}, "inspect");
  service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select");
  service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place");
  while (service.state.cuts[0]?.status !== "AT_RISK") service.tick();
  return service;
}

describe("complete first-service recovery and failure matrix", () => {
  it("supports an honest early carve from an at-risk cut", () => {
    const service = atRiskCut();
    service.act(
      "CHOOSE_RECOVERY",
      { targetType: "CUT", targetId: "cut_strip_a", choiceId: "CARVE_EARLY" },
      "early-carve"
    );
    expect(service.state.cuts[0]).toMatchObject({
      status: "PLATED",
      quality: "RECOVERED",
      recovered: true
    });
  });

  it("keeps staff-meal disposition visible and charges a replacement cut once", () => {
    const service = atRiskCut();
    service.act(
      "CHOOSE_RECOVERY",
      { targetType: "CUT", targetId: "cut_strip_a", choiceId: "STAFF_MEAL" },
      "staff-meal"
    );
    expect(service.state.cuts[0]?.status).toBe("STAFF_MEAL");
    expect(service.state.ledgerAccrual.wasteCostCents).toBe(125);
    service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "replacement");
    expect(service.state.cuts[0]?.status).toBe("TEMPERING");
    expect(service.state.ledgerAccrual.ingredientCostCents).toBe(2_500);
  });

  it("returns a resting cut to visible heat and supports cloche recovery", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    service.act("INSPECT_PARTY", {}, "inspect");
    service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select");
    service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place");
    service.tick(30);
    service.act("MOVE_TO_REST", { cutId: "cut_strip_a" }, "rest");
    service.act(
      "CHOOSE_RECOVERY",
      { targetType: "CUT", targetId: "cut_strip_a", choiceId: "CLOCHE_HOLD" },
      "recover-cloche"
    );
    expect(service.state.cuts[0]).toMatchObject({ status: "RESTING", restMode: "CLOCHE_HOLD" });
    service.act(
      "CHOOSE_RECOVERY",
      { targetType: "CUT", targetId: "cut_strip_a", choiceId: "RETURN_TO_HEAT" },
      "return-heat"
    );
    expect(service.state.cuts[0]).toMatchObject({ status: "ON_GRILL", recovered: true });
  });

  it("records explicit defer/acknowledge attention transitions", () => {
    const service = atRiskCut();
    expect(service.state.attention.status).toBe("REQUESTED");
    service.act("TEND_TABLE", { response: "DEFER" }, "defer");
    expect(service.state.attention.status).toBe("DEFERRED");
    service.act("TEND_TABLE", { response: "ACKNOWLEDGE" }, "acknowledge");
    expect(service.state.attention.status).toBe("RESOLVED");
  });

  it("supports the alternative honest-service whole-table recovery", () => {
    const { replay } = buildGoldenFirstService({
      missingPotato: true,
      tableRecoveryChoice: "SERVE_HONESTLY"
    });
    expect(replay.state.table.recoveryChoice).toBe("SERVE_HONESTLY");
    expect(replay.state.settlement?.ledger.recoveryCourtesyCostCents).toBe(250);
    expect(replay.state.settlement?.ledger.operatingResultCents).toBe(10_540);
  });

  it("rejects incomplete pass, premature settlement, occupied grill, and third side station", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    service.act("INSPECT_PARTY", {}, "inspect");
    for (const cutId of ["cut_strip_a", "cut_strip_b"] as const) {
      service.act("SELECT_CUT", { cutId }, `select-${cutId}`);
    }
    service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place-a");

    const occupied = makeAction(
      service.state,
      "PLACE_CUT",
      { cutId: "cut_strip_b", cellId: "coal_a" },
      "occupied"
    );
    const occupiedResult = reduce(service.state, occupied, service.rules, service.content);
    expect(occupiedResult.ok).toBe(false);
    if (!occupiedResult.ok) expect(occupiedResult.error.code).toBe("TB_CAPACITY_EXCEEDED");

    for (const sideId of ["side_ember_shallot", "side_creamed_greens"] as const) {
      service.act("ADVANCE_SIDE", { sideId, operation: "START" }, `start-${sideId}`);
    }
    const thirdSide = makeAction(
      service.state,
      "ADVANCE_SIDE",
      { sideId: "side_smoked_potato", operation: "START" },
      "third-side"
    );
    const thirdResult = reduce(service.state, thirdSide, service.rules, service.content);
    expect(thirdResult.ok).toBe(false);
    if (!thirdResult.ok) expect(thirdResult.error.code).toBe("TB_CAPACITY_EXCEEDED");

    const call = makeAction(service.state, "CALL_THE_TABLE", {}, "premature-call");
    const callResult = reduce(service.state, call, service.rules, service.content);
    expect(callResult.ok).toBe(false);
    if (!callResult.ok) expect(callResult.error.code).toBe("TB_SETTLEMENT_INCOMPLETE");

    const settle = makeAction(service.state, "SETTLE_SERVICE", {}, "premature-settle");
    const settleResult = reduce(service.state, settle, service.rules, service.content);
    expect(settleResult.ok).toBe(false);
    if (!settleResult.ok) expect(settleResult.error.code).toBe("TB_ACTION_NOT_ALLOWED");
  });
});
