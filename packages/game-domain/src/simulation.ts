import { canonicalHash } from "./canonical.js";
import { fault } from "./errors.js";
import {
  checkedAdd,
  checkedSubtract,
  clampInteger,
  requireInteger
} from "./math.js";
import type {
  CoalCellDefinition,
  CutDefinition,
  CutQuality,
  CutState,
  FirstServiceContent,
  GameRules,
  HeatBand,
  HouseLedger,
  KeyValueNumber,
  LedgerAccrual,
  RakePreview,
  ServiceState,
  SideDefinition,
  SideState
} from "./model.js";

export function sameVersionRef(
  left: { readonly id: string; readonly version: number; readonly contentHash: string },
  right: { readonly id: string; readonly version: number; readonly contentHash: string }
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version &&
    left.contentHash === right.contentHash
  );
}

export function createInitialState(
  serviceId: string,
  serviceSeed: string,
  rules: GameRules,
  content: FirstServiceContent
): ServiceState {
  if (rules.schemaVersion !== 1 || content.schemaVersion !== 1) {
    fault(
      "TB_SCHEMA_UNSUPPORTED",
      "Rules and content must use schema version 1.",
      "Load the supported first-service pack."
    );
  }
  if (content.serviceId !== "service_first_embers_v1") {
    fault(
      "TB_CONTENT_MISMATCH",
      "The content pack does not define the first authored service.",
      "Load the pinned First Embers content pack."
    );
  }
  const coalTotal = content.initialCoalCounts.reduce(
    (total, entry) => checkedAdd(total, entry.value, "initial coal total", 0, rules.numericLimit),
    0
  );
  if (coalTotal !== rules.coalBudget) {
    fault(
      "TB_CONTENT_MISMATCH",
      "The initial coal field does not match the pinned coal budget.",
      "Repair the authored content before opening service."
    );
  }

  return {
    schemaVersion: 1,
    serviceId,
    serviceStatus: "DORMANT",
    paused: false,
    revision: 0,
    currentTick: 0,
    rulesRef: rules.ref,
    contentRef: content.ref,
    serviceSeed,
    coalField: content.initialCoalCounts.map((entry) => ({ ...entry })),
    cuts: content.cuts.map((cut) => ({
      id: cut.id,
      coverId: cut.coverId,
      status: "CASE",
      orientation: "NORTH",
      surfaceMilli: 0,
      coreMilli: 0,
      charMilli: 0,
      moistureMilli: 100_000,
      heatPath: [],
      selectedCostRecognized: false,
      recovered: false
    })),
    sides: content.sides.map((side) => ({
      id: side.id,
      coverId: side.coverId,
      status: "PLANNED",
      remakes: 0,
      costRecognized: false
    })),
    table: {
      id: content.table.id,
      status: "RESERVED"
    },
    attention: {
      status: "QUIET"
    },
    capacities: {
      grill: rules.grillCapacity,
      rest: rules.restCapacity,
      side: rules.sideCapacity
    },
    acceptedActionIds: [],
    nextActionSequence: 0,
    ledgerAccrual: {
      ingredientCostCents: 0,
      recoveryCourtesyCostCents: 0,
      wasteCostCents: 0
    },
    hostAssistRemaining: 1
  };
}

export function coalValue(field: readonly KeyValueNumber[], cellId: string): number {
  return field.find((entry) => entry.key === cellId)?.value ?? 0;
}

export function coalCell(content: FirstServiceContent, cellId: string): CoalCellDefinition {
  const cell = content.coalCells.find((candidate) => candidate.id === cellId);
  if (cell === undefined || !cell.active) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `Coal cell ${cellId} is not active in the pinned field.`,
      "Choose an active coal cell."
    );
  }
  return cell;
}

export function coalIntensities(
  field: readonly KeyValueNumber[],
  content: FirstServiceContent,
  rules: GameRules
): readonly KeyValueNumber[] {
  return content.coalCells
    .filter((cell) => cell.active)
    .map((cell) => {
      let intensity = coalValue(field, cell.id) * rules.ownCoalIntensityMilli;
      requireInteger(intensity, `coal intensity for ${cell.id}`, 0, rules.numericLimit);
      for (const neighborId of cell.neighbors) {
        intensity = checkedAdd(
          intensity,
          coalValue(field, neighborId) * rules.neighborCoalIntensityMilli,
          `coal intensity for ${cell.id}`,
          0,
          rules.numericLimit
        );
      }
      return { key: cell.id, value: intensity };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function heatBandForIntensity(intensity: number, rules: GameRules): HeatBand {
  if (intensity >= rules.searThresholdMilli) {
    return "SEAR";
  }
  if (intensity >= rules.cookThresholdMilli) {
    return "COOK";
  }
  return "HOLD";
}

export function previewRake(
  state: ServiceState,
  sourceCellId: string,
  targetCellId: string,
  amount: number,
  content: FirstServiceContent,
  rules: GameRules
): RakePreview {
  requireInteger(amount, "rake amount", 1, rules.coalCellCapacity);
  const source = coalCell(content, sourceCellId);
  const target = coalCell(content, targetCellId);
  if (!source.neighbors.includes(target.id)) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "Coal may be raked only between orthogonally adjacent active cells.",
      "Choose a labeled neighboring cell."
    );
  }
  const sourceCount = coalValue(state.coalField, sourceCellId);
  const targetCount = coalValue(state.coalField, targetCellId);
  if (sourceCount < amount || targetCount + amount > rules.coalCellCapacity) {
    fault(
      "TB_CAPACITY_EXCEEDED",
      "That rake would exceed the available coal or target cell capacity.",
      "Move fewer coals or choose another cell."
    );
  }

  const field = state.coalField
    .map((entry) => {
      if (entry.key === sourceCellId) {
        return { key: entry.key, value: entry.value - amount };
      }
      if (entry.key === targetCellId) {
        return { key: entry.key, value: entry.value + amount };
      }
      return { ...entry };
    })
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    previewRevision: state.revision,
    coalField: field,
    intensities: coalIntensities(field, content, rules)
  };
}

export function cutDefinition(content: FirstServiceContent, cutId: string): CutDefinition {
  const cut = content.cuts.find((candidate) => candidate.id === cutId);
  if (cut === undefined) {
    fault(
      "TB_CONTENT_MISMATCH",
      `Cut ${cutId} is not in the pinned service.`,
      "Choose one of the four authored cuts."
    );
  }
  return cut;
}

export function sideDefinition(content: FirstServiceContent, sideId: string): SideDefinition {
  const side = content.sides.find((candidate) => candidate.id === sideId);
  if (side === undefined) {
    fault(
      "TB_CONTENT_MISMATCH",
      `Side ${sideId} is not in the pinned service.`,
      "Choose one of the four authored sides."
    );
  }
  return side;
}

export function evaluateCutQuality(cut: CutState, definition: CutDefinition): CutQuality {
  const inRange = (value: number, range: { minimum: number; maximum: number }) =>
    value >= range.minimum && value <= range.maximum;
  const exact =
    inRange(cut.surfaceMilli, definition.target.surface) &&
    inRange(cut.coreMilli, definition.target.core) &&
    inRange(cut.charMilli, definition.target.char) &&
    cut.moistureMilli >= definition.target.moistureMinimum;
  if (exact && !cut.recovered) {
    return "EXACT";
  }

  const nearTolerance = 10_000;
  const near =
    cut.surfaceMilli >= definition.target.surface.minimum - nearTolerance &&
    cut.surfaceMilli <= definition.target.surface.maximum + nearTolerance &&
    cut.coreMilli >= definition.target.core.minimum - nearTolerance &&
    cut.coreMilli <= definition.target.core.maximum + nearTolerance &&
    cut.moistureMilli >= definition.target.moistureMinimum - nearTolerance;
  if (near) {
    return cut.recovered ? "RECOVERED" : "NEAR";
  }
  return cut.recovered ? "RECOVERED" : "MISSED";
}

export function advanceCutOneTick(
  cut: CutState,
  definition: CutDefinition,
  intensity: number,
  rules: GameRules,
  currentTick: number
): CutState {
  if (cut.status === "ON_GRILL") {
    const band = heatBandForIntensity(intensity, rules);
    const surfaceMilli = checkedAdd(
      cut.surfaceMilli,
      definition.thermal.surfaceByBand[band],
      `${cut.id} surface progress`,
      0,
      rules.numericLimit
    );
    const coreMilli = checkedAdd(
      cut.coreMilli,
      definition.thermal.coreByBand[band],
      `${cut.id} core progress`,
      0,
      rules.numericLimit
    );
    const charMilli = checkedAdd(
      cut.charMilli,
      definition.thermal.charByBand[band],
      `${cut.id} char progress`,
      0,
      rules.numericLimit
    );
    const moistureMilli = clampInteger(
      checkedSubtract(
        cut.moistureMilli,
        definition.thermal.moistureLossByBand[band],
        `${cut.id} moisture`,
        0,
        100_000
      ),
      0,
      100_000
    );

    const runningHot =
      coreMilli > definition.target.core.maximum + rules.riskToleranceMilli ||
      surfaceMilli > definition.target.surface.maximum + rules.riskToleranceMilli;
    return {
      ...cut,
      status: runningHot ? "AT_RISK" : cut.status,
      surfaceMilli,
      coreMilli,
      charMilli,
      moistureMilli,
      ...(runningHot ? { riskReason: "RUNNING_HOT" as const } : {})
    };
  }

  if (cut.status === "RESTING" || cut.status === "READY_TO_CARVE") {
    const mode = cut.restMode ?? "OPEN_REST";
    const carryover =
      mode === "OPEN_REST"
        ? definition.thermal.openRestCarryover
        : definition.thermal.clocheCarryover;
    const moistureLoss =
      mode === "OPEN_REST"
        ? definition.thermal.openRestMoistureLoss
        : definition.thermal.clocheMoistureLoss;
    const coreMilli = checkedAdd(
      cut.coreMilli,
      carryover,
      `${cut.id} rest carryover`,
      0,
      rules.numericLimit
    );
    const moistureMilli = clampInteger(
      checkedSubtract(cut.moistureMilli, moistureLoss, `${cut.id} rest moisture`, 0, 100_000),
      0,
      100_000
    );
    const restElapsed = currentTick - (cut.restStartedTick ?? currentTick);
    const runningLate = restElapsed > definition.idealRestTicks + rules.riskToleranceMilli / 1000;
    return {
      ...cut,
      status:
        runningLate
          ? "AT_RISK"
          : restElapsed >= definition.minimumRestTicks
            ? "READY_TO_CARVE"
            : "RESTING",
      coreMilli,
      moistureMilli,
      ...(runningLate ? { riskReason: "REST_WINDOW" as const } : {})
    };
  }

  return cut;
}

export function advanceSideOneTick(
  side: SideState,
  definition: SideDefinition,
  currentTick: number
): SideState {
  if (side.status === "STARTED") {
    const elapsed = currentTick - (side.startedTick ?? currentTick);
    if (elapsed >= definition.durationTicks) {
      return {
        ...side,
        status: "READY",
        readyTick: currentTick
      };
    }
  }
  if (side.status === "READY") {
    const readyElapsed = currentTick - (side.readyTick ?? currentTick);
    if (readyElapsed > definition.readyWindowTicks) {
      return { ...side, status: "HELD" };
    }
  }
  return side;
}

export function buildLedger(
  state: ServiceState,
  content: FirstServiceContent,
  rules: GameRules,
  includeRevenue: boolean
): HouseLedger {
  const grossServiceRevenueCents = includeRevenue
    ? content.cuts.reduce((total, cut) => {
        const served = state.cuts.find((candidate) => candidate.id === cut.id)?.status === "SERVED";
        return served
          ? checkedAdd(total, cut.menuRevenueCents, "gross service revenue", 0, rules.numericLimit)
          : total;
      }, 0)
    : 0;
  const operatingCosts = [
    state.ledgerAccrual.ingredientCostCents,
    rules.ledger.fuelCostCents,
    rules.ledger.scheduledLaborCostCents,
    state.ledgerAccrual.recoveryCourtesyCostCents,
    state.ledgerAccrual.wasteCostCents,
    rules.ledger.maintenanceCostCents
  ].reduce(
    (total, value) => checkedAdd(total, value, "operating costs", 0, rules.numericLimit),
    0
  );
  const operatingResultCents = checkedSubtract(
    grossServiceRevenueCents,
    operatingCosts,
    "operating result",
    -rules.numericLimit,
    rules.numericLimit
  );

  return {
    currency: "house_cents",
    tipsEnabled: false,
    grossServiceRevenueCents,
    ingredientCostCents: state.ledgerAccrual.ingredientCostCents,
    fuelCostCents: rules.ledger.fuelCostCents,
    scheduledLaborCostCents: rules.ledger.scheduledLaborCostCents,
    recoveryCourtesyCostCents: state.ledgerAccrual.recoveryCourtesyCostCents,
    wasteCostCents: state.ledgerAccrual.wasteCostCents,
    maintenanceCostCents: rules.ledger.maintenanceCostCents,
    operatingResultCents
  };
}

export function addLedgerAccrual(
  current: LedgerAccrual,
  delta: Partial<LedgerAccrual>,
  rules: GameRules
): LedgerAccrual {
  return {
    ingredientCostCents: checkedAdd(
      current.ingredientCostCents,
      delta.ingredientCostCents ?? 0,
      "ingredient cost",
      0,
      rules.numericLimit
    ),
    recoveryCourtesyCostCents: checkedAdd(
      current.recoveryCourtesyCostCents,
      delta.recoveryCourtesyCostCents ?? 0,
      "recovery courtesy cost",
      0,
      rules.numericLimit
    ),
    wasteCostCents: checkedAdd(
      current.wasteCostCents,
      delta.wasteCostCents ?? 0,
      "waste cost",
      0,
      rules.numericLimit
    )
  };
}

export function stateDigestInput(state: ServiceState): unknown {
  if (state.settlement === undefined) {
    return state;
  }
  const { integrity: _integrity, ...settlement } = state.settlement;
  return { ...state, settlement };
}

export function stateHash(state: ServiceState): string {
  return canonicalHash(stateDigestInput(state));
}
