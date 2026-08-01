import { describe, expect, it } from "vitest";
import { canonicalize, replayEvents } from "@tender-baron/game-domain";
import { buildGoldenFirstService } from "../src/golden.js";

describe("golden first-service replay", () => {
  it("settles the four-cover table with exact deterministic ledger math", () => {
    const { replay } = buildGoldenFirstService();
    expect(replay.state.serviceStatus).toBe("SETTLED");
    expect(replay.state.table.synchronized).toBe(true);
    expect(replay.state.table.guestOutcome).toBe("DELIGHTED");
    expect(replay.state.cuts.map((cut) => cut.quality)).toEqual([
      "EXACT",
      "EXACT",
      "EXACT",
      "EXACT"
    ]);
    expect(replay.state.settlement?.ledger).toEqual({
      currency: "house_cents",
      tipsEnabled: false,
      grossServiceRevenueCents: 21_400,
      ingredientCostCents: 7_210,
      fuelCostCents: 600,
      scheduledLaborCostCents: 2_400,
      recoveryCourtesyCostCents: 0,
      wasteCostCents: 0,
      maintenanceCostCents: 400,
      operatingResultCents: 10_790
    });
    expect(replay.replayDigest).toBe(
      "cab1803abb7a67fca5c7a01963f512423412f4a554dd71a6dff12404c8889a6f"
    );
    expect(replay.stateDigest).toHaveLength(64);
    expect(replay.state.settlement?.integrity).toEqual({
      replayDigest: replay.replayDigest,
      stateDigest: replay.stateDigest
    });
  });

  it("replays the same canonical log 1,000 times to identical bytes", () => {
    const { harness, replay } = buildGoldenFirstService();
    const expectedState = canonicalize(replay.state);
    const expectedEvents = canonicalize(replay.events);
    for (let run = 0; run < 1_000; run += 1) {
      const repeated = replayEvents(
        harness.initialState,
        replay.events,
        harness.rules,
        harness.content
      );
      expect(canonicalize(repeated.state)).toBe(expectedState);
      expect(canonicalize(repeated.events)).toBe(expectedEvents);
      expect(repeated.replayDigest).toBe(replay.replayDigest);
      expect(repeated.stateDigest).toBe(replay.stateDigest);
    }
  }, 180_000);
});
