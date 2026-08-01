import {
  canonicalHash,
  canonicalize,
  coalIntensities,
  heatBandForIntensity,
  requireInteger
} from "@tender-baron/game-domain";
import type {
  FirstServiceContent,
  GameRules,
  HeatBand
} from "@tender-baron/game-domain";
import {
  HASHABLE_FIRST_SERVICE_CONTENT,
  HASHABLE_RULES_V1
} from "./first-service.js";

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export function validateFirstServicePack(
  rules: GameRules,
  content: FirstServiceContent
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  try {
    canonicalize(rules);
    canonicalize(content);
  } catch (error) {
    issues.push({ path: "$", message: error instanceof Error ? error.message : "Not canonical" });
    return issues;
  }

  if (rules.ref.contentHash !== canonicalHash(HASHABLE_RULES_V1)) {
    issues.push({ path: "rules.ref.contentHash", message: "Rules hash does not match its body." });
  }
  if (content.ref.contentHash !== canonicalHash(HASHABLE_FIRST_SERVICE_CONTENT)) {
    issues.push({ path: "content.ref.contentHash", message: "Content hash does not match its body." });
  }
  if (rules.tickDurationMs !== 250) {
    issues.push({ path: "rules.tickDurationMs", message: "Rules version 1 must use 250 ms ticks." });
  }
  if (rules.ledger.tipsEnabled !== false) {
    issues.push({ path: "rules.ledger.tipsEnabled", message: "Tips are absent from rules version 1." });
  }

  const cellIds = content.coalCells.map((cell) => cell.id);
  if (!unique(cellIds)) {
    issues.push({ path: "content.coalCells", message: "Coal cell IDs must be unique." });
  }
  const activeCells = new Set(content.coalCells.filter((cell) => cell.active).map((cell) => cell.id));
  for (const cell of content.coalCells) {
    for (const neighbor of cell.neighbors) {
      if (!activeCells.has(neighbor)) {
        issues.push({ path: `content.coalCells.${cell.id}`, message: `Unknown neighbor ${neighbor}.` });
      }
      const reverse = content.coalCells.find((candidate) => candidate.id === neighbor);
      if (reverse !== undefined && !reverse.neighbors.includes(cell.id)) {
        issues.push({ path: `content.coalCells.${cell.id}`, message: `Neighbor ${neighbor} is not symmetric.` });
      }
    }
  }
  const coalKeys = content.initialCoalCounts.map((entry) => entry.key);
  if (!unique(coalKeys) || coalKeys.some((key) => !activeCells.has(key))) {
    issues.push({ path: "content.initialCoalCounts", message: "Coal counts must map once to active cells." });
  }
  const coalTotal = content.initialCoalCounts.reduce((total, entry) => total + entry.value, 0);
  if (coalTotal !== rules.coalBudget) {
    issues.push({ path: "content.initialCoalCounts", message: "Coal budget does not reconcile." });
  }
  if (content.coalCells.filter((cell) => cell.servicePlacement).length < rules.grillCapacity) {
    issues.push({ path: "content.coalCells", message: "The field cannot satisfy grill capacity." });
  }

  const coverIds = content.table.coverIds;
  const cutIds = content.cuts.map((cut) => cut.id);
  const sideIds = content.sides.map((side) => side.id);
  if (!unique(coverIds) || !unique(cutIds) || !unique(sideIds)) {
    issues.push({ path: "content", message: "Cover, cut, and side IDs must each be unique." });
  }
  if (content.cuts.length !== 4 || content.sides.length !== 4 || coverIds.length !== 4) {
    issues.push({ path: "content", message: "First Embers requires four covers, cuts, and sides." });
  }
  for (const cut of content.cuts) {
    if (!coverIds.includes(cut.coverId)) {
      issues.push({ path: `content.cuts.${cut.id}.coverId`, message: "Cut cover is not in the table." });
    }
    if (
      cut.target.surface.minimum > cut.target.surface.maximum ||
      cut.target.core.minimum > cut.target.core.maximum ||
      cut.target.char.minimum > cut.target.char.maximum ||
      cut.target.accessibleDescription.length === 0
    ) {
      issues.push({ path: `content.cuts.${cut.id}.target`, message: "Target profile is invalid." });
    }
    for (const value of [
      cut.minimumRestTicks,
      cut.idealRestTicks,
      cut.ingredientCostCents,
      cut.menuRevenueCents,
      ...Object.values(cut.thermal.surfaceByBand),
      ...Object.values(cut.thermal.coreByBand),
      ...Object.values(cut.thermal.charByBand),
      ...Object.values(cut.thermal.moistureLossByBand)
    ]) {
      try {
        requireInteger(value, `cut ${cut.id} value`, 0, rules.numericLimit);
      } catch (error) {
        issues.push({ path: `content.cuts.${cut.id}`, message: error instanceof Error ? error.message : "Invalid integer" });
      }
    }
  }
  for (const side of content.sides) {
    if (!coverIds.includes(side.coverId)) {
      issues.push({ path: `content.sides.${side.id}.coverId`, message: "Side cover is not in the table." });
    }
    for (const value of [
      side.durationTicks,
      side.readyWindowTicks,
      side.ingredientCostCents,
      side.remakeCostCents
    ]) {
      try {
        requireInteger(value, `side ${side.id} value`, 0, rules.numericLimit);
      } catch (error) {
        issues.push({ path: `content.sides.${side.id}`, message: error instanceof Error ? error.message : "Invalid integer" });
      }
    }
  }

  const field = content.initialCoalCounts;
  const bands = new Set<HeatBand>(
    coalIntensities(field, content, rules).map((entry) => heatBandForIntensity(entry.value, rules))
  );
  for (const requiredBand of ["HOLD", "COOK", "SEAR"] as const) {
    if (!bands.has(requiredBand)) {
      issues.push({ path: "content.initialCoalCounts", message: `Initial field lacks ${requiredBand} band.` });
    }
  }

  return issues;
}

export function assertValidFirstServicePack(
  rules: GameRules,
  content: FirstServiceContent
): void {
  const issues = validateFirstServicePack(rules, content);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
}
