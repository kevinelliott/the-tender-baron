import { fault } from "./errors.js";
import { requireInteger } from "./math.js";

export type ClockToken =
  | { readonly kind: "ADVANCE_TICK"; readonly dueAtMs: number }
  | { readonly kind: "INPUT"; readonly inputId: string; readonly capturedAtMs: number };

export class SerialClockAdapter {
  readonly #tickDurationMs: number;
  #nextTickAtMs: number;
  #lastObservedMs: number;
  #paused = false;
  readonly #tokens: ClockToken[] = [];

  constructor(anchorMs: number, tickDurationMs: number) {
    requireInteger(anchorMs, "clock anchor", 0);
    requireInteger(tickDurationMs, "tick duration", 1);
    this.#tickDurationMs = tickDurationMs;
    this.#nextTickAtMs = anchorMs + tickDurationMs;
    this.#lastObservedMs = anchorMs;
  }

  #observe(timestampMs: number): void {
    requireInteger(timestampMs, "monotonic timestamp", 0);
    if (timestampMs < this.#lastObservedMs) {
      fault(
        "TB_ACTION_SEQUENCE",
        "Clock observations must be monotonic.",
        "Discard the stale capture and keep the serialized input queue."
      );
    }
    this.#lastObservedMs = timestampMs;
  }

  #flush(timestampMs: number): void {
    this.#observe(timestampMs);
    if (this.#paused) {
      return;
    }
    while (this.#nextTickAtMs <= timestampMs) {
      this.#tokens.push({ kind: "ADVANCE_TICK", dueAtMs: this.#nextTickAtMs });
      this.#nextTickAtMs += this.#tickDurationMs;
    }
  }

  onFrame(timestampMs: number): void {
    this.#flush(timestampMs);
  }

  captureInput(inputId: string, capturedAtMs: number): void {
    if (this.#paused) {
      this.#observe(capturedAtMs);
      fault(
        "TB_ACTION_NOT_ALLOWED",
        "Gameplay input cannot be captured while the simulation scheduler is paused.",
        "Resume the service before issuing gameplay input."
      );
    }
    this.#flush(capturedAtMs);
    this.#tokens.push({ kind: "INPUT", inputId, capturedAtMs });
  }

  pause(timestampMs: number): void {
    this.#flush(timestampMs);
    this.#paused = true;
  }

  resume(timestampMs: number): void {
    this.#observe(timestampMs);
    if (!this.#paused) {
      fault(
        "TB_ACTION_NOT_ALLOWED",
        "The scheduler is not paused.",
        "Continue the current service cadence."
      );
    }
    this.#paused = false;
    this.#nextTickAtMs = timestampMs + this.#tickDurationMs;
  }

  tokens(): readonly ClockToken[] {
    return this.#tokens.map((token) => ({ ...token }));
  }
}
