import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  canonicalize,
  checkedAdd,
  createInitialState,
  sha256Hex
} from "@tender-baron/game-domain";
import type { FirstServiceContent, GameRules } from "@tender-baron/game-domain";
import {
  FIRST_SERVICE_CONTENT,
  RULES_V1,
  validateFirstServicePack
} from "@tender-baron/game-content";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("canonical bytes and content validation", () => {
  it("matches the standard SHA-256 vector without an environment crypto API", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("sorts object keys, normalizes Unicode, omits optional object fields, and preserves arrays", () => {
    expect(
      canonicalize({ z: undefined, b: 2, a: "e\u0301", list: [3, 2, 1] })
    ).toBe('{"a":"é","b":2,"list":[3,2,1]}');
    expect(canonicalHash({ b: 2, a: 1 })).toBe(canonicalHash({ a: 1, b: 2 }));
  });

  it("rejects floats, undefined array entries, and unsafe arithmetic", () => {
    expect(() => canonicalize({ value: 1.5 })).toThrow(/safe integer/);
    expect(() => canonicalize([1, undefined])).toThrow(/cannot be undefined/);
    expect(() => checkedAdd(Number.MAX_SAFE_INTEGER, 1, "overflow")).toThrow(
      /safe integer/
    );
  });

  it("accepts the pinned rules and first-service content graph", () => {
    expect(validateFirstServicePack(RULES_V1, FIRST_SERVICE_CONTENT)).toEqual([]);
  });

  it("rejects hash drift, asymmetric coal references, floats, and duplicate identities", () => {
    const rules = clone(RULES_V1) as GameRules & {
      ref: { id: string; version: number; contentHash: string };
    };
    rules.ref.contentHash = "0".repeat(64);
    const content = clone(FIRST_SERVICE_CONTENT) as FirstServiceContent & {
      coalCells: Array<{ id: string; active: boolean; neighbors: string[]; servicePlacement: boolean }>;
      cuts: Array<{ id: string; minimumRestTicks: number }>;
    };
    content.coalCells[0]!.neighbors = ["missing"];
    content.cuts[1]!.id = content.cuts[0]!.id;
    const issues = validateFirstServicePack(rules, content);
    expect(issues.map((issue) => issue.message).join(" ")).toMatch(/Rules hash/);
    expect(issues.map((issue) => issue.message).join(" ")).toMatch(/Unknown neighbor/);
    expect(issues.map((issue) => issue.message).join(" ")).toMatch(/unique/);

    const floating = clone(FIRST_SERVICE_CONTENT) as FirstServiceContent & {
      cuts: Array<{ minimumRestTicks: number }>;
    };
    floating.cuts[0]!.minimumRestTicks = 1.5;
    expect(validateFirstServicePack(RULES_V1, floating)[0]?.message).toMatch(/safe integer/);
  });

  it("binds the supplied rules and content bodies to their unchanged refs", () => {
    const rules = clone(RULES_V1) as GameRules & {
      ledger: { fuelCostCents: number };
    };
    rules.ledger.fuelCostCents += 1;
    expect(validateFirstServicePack(rules, FIRST_SERVICE_CONTENT)).toContainEqual({
      path: "rules.ref.contentHash",
      message: "Rules hash does not match its body."
    });
    expect(() =>
      createInitialState("tampered-rules", "seed", rules, FIRST_SERVICE_CONTENT)
    ).toThrow(/rules body/);

    const content = clone(FIRST_SERVICE_CONTENT) as FirstServiceContent & {
      cuts: Array<{ menuRevenueCents: number }>;
    };
    content.cuts[0]!.menuRevenueCents += 1;
    expect(validateFirstServicePack(RULES_V1, content)).toContainEqual({
      path: "content.ref.contentHash",
      message: "Content hash does not match its body."
    });
    expect(() =>
      createInitialState("tampered-content", "seed", RULES_V1, content)
    ).toThrow(/content body/);
  });
});
