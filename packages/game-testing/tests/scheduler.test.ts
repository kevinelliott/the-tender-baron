import { describe, expect, it } from "vitest";
import { SerialClockAdapter } from "@tender-baron/game-domain";

function runFineCadence() {
  const clock = new SerialClockAdapter(0, 250);
  clock.onFrame(100);
  clock.onFrame(250);
  clock.onFrame(400);
  clock.captureInput("move-a", 600);
  clock.onFrame(800);
  clock.captureInput("rest-a", 900);
  clock.onFrame(1_250);
  return clock.tokens();
}

function runCoarseCadence() {
  const clock = new SerialClockAdapter(0, 250);
  clock.onFrame(599);
  clock.captureInput("move-a", 600);
  clock.onFrame(899);
  clock.captureInput("rest-a", 900);
  clock.onFrame(1_250);
  return clock.tokens();
}

describe("serialized clock adapter", () => {
  it("produces cadence-equivalent tick/input bytes", () => {
    expect(runFineCadence()).toEqual(runCoarseCadence());
    expect(runFineCadence()).toEqual([
      { kind: "ADVANCE_TICK", dueAtMs: 250 },
      { kind: "ADVANCE_TICK", dueAtMs: 500 },
      { kind: "INPUT", inputId: "move-a", capturedAtMs: 600 },
      { kind: "ADVANCE_TICK", dueAtMs: 750 },
      { kind: "INPUT", inputId: "rest-a", capturedAtMs: 900 },
      { kind: "ADVANCE_TICK", dueAtMs: 1_000 },
      { kind: "ADVANCE_TICK", dueAtMs: 1_250 }
    ]);
  });

  it("discards inactive time and reanchors after resume", () => {
    const clock = new SerialClockAdapter(0, 250);
    clock.pause(600);
    clock.resume(5_000);
    clock.onFrame(5_500);
    expect(clock.tokens()).toEqual([
      { kind: "ADVANCE_TICK", dueAtMs: 250 },
      { kind: "ADVANCE_TICK", dueAtMs: 500 },
      { kind: "ADVANCE_TICK", dueAtMs: 5_250 },
      { kind: "ADVANCE_TICK", dueAtMs: 5_500 }
    ]);
  });

  it("rejects non-monotonic capture and gameplay input while paused", () => {
    const clock = new SerialClockAdapter(1_000, 250);
    clock.onFrame(1_200);
    expect(() => clock.onFrame(1_100)).toThrow(/monotonic/);
    clock.pause(1_250);
    expect(() => clock.captureInput("hidden", 1_300)).toThrow(/paused/);
  });
});
