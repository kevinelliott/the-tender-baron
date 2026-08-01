import { describe, expect, it } from "vitest";
import { ServiceHarness } from "../src/harness.js";
import { buildGoldenFirstService } from "../src/golden.js";

function openWithStrip(): ServiceHarness {
  const service = new ServiceHarness();
  service.act("OPEN_HOUSE", {}, "open");
  service.act("INSPECT_PARTY", {}, "inspect");
  service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select-strip");
  service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place-strip");
  return service;
}

describe("recovery choices and exact ledger consequences", () => {
  it("moves a running-hot cut to the deterministic holding zone", () => {
    const service = openWithStrip();
    while (service.state.cuts[0]?.status !== "AT_RISK") {
      service.tick();
    }
    expect(service.state.cuts[0]?.riskReason).toBe("RUNNING_HOT");
    service.act(
      "CHOOSE_RECOVERY",
      {
        targetType: "CUT",
        targetId: "cut_strip_a",
        choiceId: "MOVE_TO_HOLD"
      },
      "recover-hold"
    );
    expect(service.state.cuts[0]).toMatchObject({
      status: "ON_GRILL",
      cellId: "coal_b",
      recovered: true
    });
  });

  it("changes active rest mode without hiding carryover", () => {
    const service = openWithStrip();
    service.tick(30);
    service.act("MOVE_TO_REST", { cutId: "cut_strip_a" }, "rest");
    service.act(
      "SET_REST_MODE",
      { cutId: "cut_strip_a", mode: "CLOCHE_HOLD" },
      "cloche"
    );
    const before = service.state.cuts[0]?.coreMilli ?? 0;
    service.tick();
    expect(service.state.cuts[0]?.restMode).toBe("CLOCHE_HOLD");
    expect(service.state.cuts[0]?.coreMilli).toBe(before + 175);
  });

  it("uses the one onboarding host assist with a visible courtesy cost", () => {
    const service = openWithStrip();
    service.tickTo(16);
    expect(service.state.attention.status).toBe("REQUESTED");
    service.act(
      "CHOOSE_RECOVERY",
      {
        targetType: "ATTENTION",
        targetId: "table_soft_reopening",
        choiceId: "HOST_ASSIST"
      },
      "host-assist"
    );
    expect(service.state.attention.status).toBe("RESOLVED");
    expect(service.state.hostAssistRemaining).toBe(0);
    expect(service.state.ledgerAccrual.recoveryCourtesyCostCents).toBe(200);
  });

  it("records a side remake once and keeps ingredient and waste dispositions distinct", () => {
    const service = openWithStrip();
    service.act(
      "ADVANCE_SIDE",
      { sideId: "side_ember_shallot", operation: "START" },
      "start-side"
    );
    service.tickTo(77);
    expect(service.state.sides[0]?.status).toBe("HELD");
    service.act(
      "CHOOSE_RECOVERY",
      {
        targetType: "SIDE",
        targetId: "side_ember_shallot",
        choiceId: "REMAKE_SIDE"
      },
      "remake-side"
    );
    expect(service.state.sides[0]).toMatchObject({ status: "STARTED", remakes: 1 });
    expect(service.state.ledgerAccrual).toEqual({
      ingredientCostCents: 1_730,
      recoveryCourtesyCostCents: 0,
      wasteCostCents: 60
    });
  });

  it("settles a missing-side shared-course recovery without fabricating synchronization", () => {
    const { replay } = buildGoldenFirstService({ missingPotato: true });
    expect(replay.state.serviceStatus).toBe("SETTLED");
    expect(replay.state.table.recoveryChoice).toBe("SHARED_COURSE");
    expect(replay.state.table.synchronized).toBe(false);
    expect(replay.state.table.guestOutcome).toBe("RECOVERABLE_CONCERN");
    expect(replay.state.sides.find((side) => side.id === "side_smoked_potato")?.status).toBe(
      "REWORKED"
    );
    expect(replay.state.settlement?.ledger.recoveryCourtesyCostCents).toBe(350);
    expect(replay.state.settlement?.ledger.operatingResultCents).toBe(10_440);
  });
});
