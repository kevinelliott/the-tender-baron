import { describe, expect, it } from "vitest";
import { makeAction, reduce, replayActions } from "@tender-baron/game-domain";
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
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    service.act("INSPECT_PARTY", {}, "inspect");
    service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select");
    service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place");
    service.tickTo(service.content.table.attentionTick);
    expect(service.state.attention.status).toBe("REQUESTED");
    service.act("TEND_TABLE", { response: "DEFER" }, "defer");
    expect(service.state.attention.status).toBe("DEFERRED");
    service.act("TEND_TABLE", { response: "ACKNOWLEDGE" }, "acknowledge");
    expect(service.state.attention.status).toBe("RESOLVED");
  });

  it("moves deferred attention to MISSED at the exact authored deadline", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "open");
    service.act("INSPECT_PARTY", {}, "inspect");
    service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select");
    service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place");
    service.tickTo(service.content.table.attentionTick);
    service.act("TEND_TABLE", { response: "DEFER" }, "defer");

    const deadline =
      service.content.table.attentionTick +
      service.content.table.attentionMaximumDeferralTicks;
    service.tickTo(deadline - 1);
    expect(service.state.attention.status).toBe("DEFERRED");
    service.tick();
    expect(service.state.attention).toEqual({
      status: "MISSED",
      requestedAtTick: service.content.table.attentionTick
    });

    const lateAcknowledgement = reduce(
      service.state,
      makeAction(service.state, "TEND_TABLE", { response: "ACKNOWLEDGE" }, "late-ack"),
      service.rules,
      service.content
    );
    expect(lateAcknowledgement.ok).toBe(false);
    if (!lateAcknowledgement.ok) {
      expect(lateAcknowledgement.error.code).toBe("TB_ACTION_NOT_ALLOWED");
    }
  });

  it("keeps AT_RISK physics live and preserves grill/rest capacity ownership", () => {
    const grillRisk = atRiskCut();
    const grillBefore = grillRisk.state.cuts[0]!;
    expect(grillBefore.riskLocation).toBe("GRILL");
    grillRisk.tick(5);
    expect(grillRisk.state.cuts[0]!.coreMilli).toBeGreaterThan(grillBefore.coreMilli);
    expect(grillRisk.state.cuts[0]!.moistureMilli).toBeLessThan(grillBefore.moistureMilli);
    grillRisk.act(
      "CHOOSE_RECOVERY",
      { targetType: "CUT", targetId: "cut_strip_a", choiceId: "CLOCHE_HOLD" },
      "grill-risk-to-cloche"
    );
    expect(grillRisk.state.cuts[0]).toMatchObject({
      status: "RESTING",
      restMode: "CLOCHE_HOLD"
    });
    expect(grillRisk.state.cuts[0]!.cellId).toBeUndefined();
    expect(grillRisk.state.cuts[0]!.heatPath.at(-1)!.endedTick).toBe(
      grillRisk.state.currentTick
    );

    const restRisk = new ServiceHarness();
    restRisk.act("OPEN_HOUSE", {}, "rest-open");
    restRisk.act("INSPECT_PARTY", {}, "rest-inspect");
    for (const cutId of ["cut_strip_a", "cut_strip_b", "cut_ribeye_c"] as const) {
      restRisk.act("SELECT_CUT", { cutId }, `rest-select-${cutId}`);
    }
    restRisk.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "rest-place-a");
    restRisk.act("PLACE_CUT", { cutId: "cut_strip_b", cellId: "coal_e" }, "rest-place-b");
    restRisk.tickTo(30);
    restRisk.act("MOVE_TO_REST", { cutId: "cut_strip_a" }, "rest-a");
    restRisk.act("MOVE_TO_REST", { cutId: "cut_strip_b" }, "rest-b");
    while (
      !["cut_strip_a", "cut_strip_b"].every(
        (cutId) => restRisk.state.cuts.find((cut) => cut.id === cutId)?.status === "AT_RISK"
      )
    ) {
      restRisk.tick();
      if (restRisk.state.currentTick > 150) throw new Error("Rest risk boundary was not reached.");
    }
    const restingBefore = restRisk.state.cuts.find((cut) => cut.id === "cut_strip_a")!;
    expect(restingBefore.riskLocation).toBe("REST");
    restRisk.tick();
    expect(restRisk.state.cuts.find((cut) => cut.id === "cut_strip_a")!.coreMilli).toBeGreaterThan(
      restingBefore.coreMilli
    );

    restRisk.act(
      "PLACE_CUT",
      { cutId: "cut_ribeye_c", cellId: "coal_b" },
      "rest-place-third"
    );
    const thirdToRest = reduce(
      restRisk.state,
      makeAction(
        restRisk.state,
        "MOVE_TO_REST",
        { cutId: "cut_ribeye_c" },
        "rest-third-capacity"
      ),
      restRisk.rules,
      restRisk.content
    );
    expect(thirdToRest.ok).toBe(false);
    if (!thirdToRest.ok) expect(thirdToRest.error.code).toBe("TB_CAPACITY_EXCEEDED");
  });

  it("gates whole-table and side-delay recovery and never charges twice", () => {
    const early = new ServiceHarness();
    early.act("OPEN_HOUSE", {}, "early-open");
    early.act("INSPECT_PARTY", {}, "early-inspect");
    early.act("SELECT_CUT", { cutId: "cut_strip_a" }, "early-select");
    early.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "early-place");
    const premature = reduce(
      early.state,
      makeAction(
        early.state,
        "CHOOSE_RECOVERY",
        {
          targetType: "TABLE",
          targetId: early.state.table.id,
          choiceId: "SHARED_COURSE"
        },
        "premature-table-recovery"
      ),
      early.rules,
      early.content
    );
    expect(premature.ok).toBe(false);
    expect(early.state.ledgerAccrual.recoveryCourtesyCostCents).toBe(0);

    early.act(
      "ADVANCE_SIDE",
      { sideId: "side_ember_shallot", operation: "START" },
      "early-side-start"
    );
    const prematureDelay = reduce(
      early.state,
      makeAction(
        early.state,
        "CHOOSE_RECOVERY",
        {
          targetType: "SIDE",
          targetId: "side_ember_shallot",
          choiceId: "DELAY_TABLE"
        },
        "premature-side-delay"
      ),
      early.rules,
      early.content
    );
    expect(prematureDelay.ok).toBe(false);
    while (early.state.sides[0]?.status !== "HELD") early.tick();
    early.act(
      "CHOOSE_RECOVERY",
      {
        targetType: "SIDE",
        targetId: "side_ember_shallot",
        choiceId: "DELAY_TABLE"
      },
      "eligible-side-delay"
    );
    const chargedOnce = early.state.ledgerAccrual.recoveryCourtesyCostCents;
    const repeatedDelay = reduce(
      early.state,
      makeAction(
        early.state,
        "CHOOSE_RECOVERY",
        {
          targetType: "SIDE",
          targetId: "side_ember_shallot",
          choiceId: "DELAY_TABLE"
        },
        "repeat-side-delay"
      ),
      early.rules,
      early.content
    );
    expect(repeatedDelay.ok).toBe(false);
    expect(early.state.ledgerAccrual.recoveryCourtesyCostCents).toBe(chargedOnce);

    const golden = buildGoldenFirstService({ missingPotato: true });
    const recoveryIndex = golden.harness.actions.findIndex(
      (action) =>
        action.type === "CHOOSE_RECOVERY" && action.payload.targetType === "TABLE"
    );
    const afterRecovery = replayActions(
      golden.harness.initialState,
      golden.harness.actions.slice(0, recoveryIndex + 1),
      golden.harness.rules,
      golden.harness.content
    );
    const repeatTable = reduce(
      afterRecovery.state,
      makeAction(
        afterRecovery.state,
        "CHOOSE_RECOVERY",
        {
          targetType: "TABLE",
          targetId: afterRecovery.state.table.id,
          choiceId: "SERVE_HONESTLY"
        },
        "repeat-table-recovery"
      ),
      golden.harness.rules,
      golden.harness.content
    );
    expect(repeatTable.ok).toBe(false);
    expect(afterRecovery.state.ledgerAccrual.recoveryCourtesyCostCents).toBe(350);
  });

  it("opens synchronization only when a complete cover becomes service-eligible", () => {
    const service = new ServiceHarness();
    service.act("OPEN_HOUSE", {}, "sync-open");
    service.act("INSPECT_PARTY", {}, "sync-inspect");
    service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "sync-select");
    service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "sync-place");
    service.act(
      "ADVANCE_SIDE",
      { sideId: "side_ember_shallot", operation: "START" },
      "sync-side-start"
    );
    service.tickTo(30);
    service.act("MOVE_TO_REST", { cutId: "cut_strip_a" }, "sync-rest");
    service.tickTo(60);
    service.act("CARVE_CUT", { cutId: "cut_strip_a" }, "sync-carve");
    expect(service.state.table.firstEligibleTick).toBeUndefined();
    service.act(
      "ADVANCE_SIDE",
      { sideId: "side_ember_shallot", operation: "PLATE" },
      "sync-side-plate"
    );
    expect(service.state.table.firstEligibleTick).toBe(60);
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
