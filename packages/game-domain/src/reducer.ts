import { canonicalHash, canonicalize } from "./canonical.js";
import { asDomainError, fault } from "./errors.js";
import { checkedAdd, checkedSubtract, clampInteger, requireInteger } from "./math.js";
import type {
  ActionType,
  CutState,
  FirstServiceContent,
  GameAction,
  GameEvent,
  GameRules,
  GuestOutcome,
  LedgerAccrual,
  ReduceResult,
  ServiceState,
  SideState,
  TableState
} from "./model.js";
import {
  addLedgerAccrual,
  advanceCutOneTick,
  advanceSideOneTick,
  buildLedger,
  coalCell,
  coalIntensities,
  cutDefinition,
  evaluateCutQuality,
  heatBandForIntensity,
  previewRake,
  sameVersionRef,
  sideDefinition
} from "./simulation.js";

interface Transition {
  readonly state: ServiceState;
  readonly changes: readonly string[];
  readonly ledgerDelta: LedgerAccrual;
}

const ZERO_LEDGER_DELTA: LedgerAccrual = {
  ingredientCostCents: 0,
  recoveryCourtesyCostCents: 0,
  wasteCostCents: 0
};

function allowedService(state: ServiceState, statuses: readonly ServiceState["serviceStatus"][]): void {
  if (!statuses.includes(state.serviceStatus)) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `This action is not allowed while service is ${state.serviceStatus}.`,
      "Return to the current service task."
    );
  }
}

function getCut(state: ServiceState, cutId: string): CutState {
  const cut = state.cuts.find((candidate) => candidate.id === cutId);
  if (cut === undefined) {
    fault(
      "TB_CONTENT_MISMATCH",
      `Cut ${cutId} is not part of this service.`,
      "Choose one of the four pinned cuts."
    );
  }
  return cut;
}

function getSide(state: ServiceState, sideId: string): SideState {
  const side = state.sides.find((candidate) => candidate.id === sideId);
  if (side === undefined) {
    fault(
      "TB_CONTENT_MISMATCH",
      `Side ${sideId} is not part of this service.`,
      "Choose one of the four pinned sides."
    );
  }
  return side;
}

function replaceCut(state: ServiceState, nextCut: CutState): ServiceState {
  return {
    ...state,
    cuts: state.cuts.map((cut) => (cut.id === nextCut.id ? nextCut : cut))
  };
}

function replaceSide(state: ServiceState, nextSide: SideState): ServiceState {
  return {
    ...state,
    sides: state.sides.map((side) => (side.id === nextSide.id ? nextSide : side))
  };
}

function withoutOptional<T extends object, K extends keyof T>(
  value: T,
  ...keys: readonly K[]
): Omit<T, K> {
  const result = { ...value };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

function closeOpenHeatSegment(cut: CutState, endedTick: number): CutState {
  const lastIndex = cut.heatPath.length - 1;
  if (lastIndex < 0) {
    return cut;
  }
  return {
    ...cut,
    heatPath: cut.heatPath.map((segment, index) =>
      index === lastIndex && segment.endedTick === undefined
        ? { ...segment, endedTick }
        : segment
    )
  };
}

function startHeatSegment(cut: CutState, cellId: string, tick: number): CutState {
  return {
    ...cut,
    cellId,
    heatPath: [
      ...cut.heatPath,
      {
        cellId,
        startedTick: tick,
        orientation: cut.orientation,
        rulesVersion: 1
      }
    ]
  };
}

function occupiedGrillCells(state: ServiceState, excludingCutId?: string): readonly string[] {
  return state.cuts
    .filter(
      (cut) =>
        cut.id !== excludingCutId &&
        (cut.status === "ON_GRILL" || cut.status === "AT_RISK") &&
        cut.cellId !== undefined
    )
    .map((cut) => cut.cellId as string);
}

function assertGrillPlacement(
  state: ServiceState,
  cutId: string,
  cellId: string,
  content: FirstServiceContent
): void {
  const cell = coalCell(content, cellId);
  if (!cell.servicePlacement) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "That coal cell is not a service placement.",
      "Choose one of the four labeled placements."
    );
  }
  if (occupiedGrillCells(state, cutId).includes(cellId)) {
    fault(
      "TB_CAPACITY_EXCEEDED",
      "That grill placement is already occupied.",
      "Choose an open placement or move another cut first."
    );
  }
  const activeCount = state.cuts.filter(
    (cut) =>
      cut.id !== cutId && (cut.status === "ON_GRILL" || cut.status === "AT_RISK")
  ).length;
  if (activeCount >= state.capacities.grill) {
    fault(
      "TB_CAPACITY_EXCEEDED",
      "The grill has no remaining cut capacity.",
      "Move a cut to rest before placing another."
    );
  }
}

function refreshTableReadiness(state: ServiceState): ServiceState {
  const platedCuts = state.cuts.filter((cut) => cut.status === "PLATED");
  if (platedCuts.length === 0) {
    return state;
  }
  const firstEligibleTick =
    state.table.firstEligibleTick ??
    Math.min(...platedCuts.map((cut) => cut.platedAtTick ?? state.currentTick));
  return {
    ...state,
    table: {
      ...state.table,
      status: platedCuts.length === state.cuts.length ? "READY_TO_DELIVER" : "IN_SERVICE",
      firstEligibleTick
    }
  };
}

function openHouse(state: ServiceState): Transition {
  allowedService(state, ["DORMANT"]);
  return {
    state: {
      ...state,
      serviceStatus: "BRIEFING",
      table: { ...state.table, status: "SEATED" }
    },
    changes: ["service:BRIEFING", "table:SEATED"],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function inspectParty(state: ServiceState): Transition {
  allowedService(state, ["BRIEFING"]);
  return {
    state: {
      ...state,
      serviceStatus: "SETUP",
      table: { ...state.table, status: "PROMISE_REVIEWED" }
    },
    changes: ["service:SETUP", "table:PROMISE_REVIEWED"],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function selectCut(
  state: ServiceState,
  cutId: string,
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  allowedService(state, ["SETUP", "OPEN"]);
  const cut = getCut(state, cutId);
  if (cut.status !== "CASE" && cut.status !== "STAFF_MEAL" && cut.status !== "COMPOSTED") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} cannot be selected from ${cut.status}.`,
      "Choose a cut still in the case or replace a recovered disposition."
    );
  }
  const definition = cutDefinition(content, cutId);
  const delta: LedgerAccrual = {
    ...ZERO_LEDGER_DELTA,
    ingredientCostCents: definition.ingredientCostCents
  };
  const cleanCut = withoutOptional(
    {
      ...cut,
      status: "TEMPERING" as const,
      surfaceMilli: 0,
      coreMilli: 0,
      charMilli: 0,
      moistureMilli: 100_000,
      heatPath: [],
      selectedCostRecognized: true,
      recovered: cut.status !== "CASE"
    },
    "cellId",
    "restMode",
    "restStartedTick",
    "carvedAtTick",
    "platedAtTick",
    "quality",
    "riskReason"
  ) as CutState;
  const next = replaceCut(state, cleanCut);
  return {
    state: {
      ...next,
      ledgerAccrual: addLedgerAccrual(state.ledgerAccrual, delta, rules)
    },
    changes: [`cut:${cutId}:TEMPERING`, `ledger:ingredient:+${definition.ingredientCostCents}`],
    ledgerDelta: delta
  };
}

function applyRake(
  state: ServiceState,
  payload: {
    readonly sourceCellId: string;
    readonly targetCellId: string;
    readonly amount: number;
    readonly previewRevision: number;
  },
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  allowedService(state, ["SETUP", "OPEN"]);
  if (payload.previewRevision !== state.revision) {
    fault(
      "TB_PREVIEW_STALE",
      "The coal field changed after that preview.",
      "Preview the rake again against the current field."
    );
  }
  const preview = previewRake(
    state,
    payload.sourceCellId,
    payload.targetCellId,
    payload.amount,
    content,
    rules
  );
  return {
    state: { ...state, coalField: preview.coalField },
    changes: [
      `coal:${payload.sourceCellId}:-${payload.amount}`,
      `coal:${payload.targetCellId}:+${payload.amount}`
    ],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function placeCut(
  state: ServiceState,
  cutId: string,
  cellId: string,
  content: FirstServiceContent
): Transition {
  allowedService(state, ["SETUP", "OPEN"]);
  const cut = getCut(state, cutId);
  if (cut.status !== "TEMPERING") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} must be selected and tempering before placement.`,
      "Select the cut before placing it on the coal field."
    );
  }
  assertGrillPlacement(state, cutId, cellId, content);
  const nextCut = startHeatSegment({ ...cut, status: "ON_GRILL" }, cellId, state.currentTick);
  const next = replaceCut(state, nextCut);
  return {
    state: {
      ...next,
      serviceStatus: "OPEN",
      table: {
        ...next.table,
        status: "IN_SERVICE"
      }
    },
    changes: [`cut:${cutId}:ON_GRILL:${cellId}`, "service:OPEN", "table:IN_SERVICE"],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function moveCut(
  state: ServiceState,
  cutId: string,
  cellId: string,
  content: FirstServiceContent
): Transition {
  allowedService(state, ["OPEN"]);
  const cut = getCut(state, cutId);
  if (cut.status !== "ON_GRILL") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} cannot move from ${cut.status}.`,
      "Choose a cut actively cooking on the coal field."
    );
  }
  assertGrillPlacement(state, cutId, cellId, content);
  const closed = closeOpenHeatSegment(cut, state.currentTick);
  const nextCut = startHeatSegment(closed, cellId, state.currentTick);
  return {
    state: replaceCut(state, nextCut),
    changes: [`cut:${cutId}:MOVE:${cellId}`],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

const NEXT_ORIENTATION: Readonly<Record<CutState["orientation"], CutState["orientation"]>> = {
  NORTH: "EAST",
  EAST: "SOUTH",
  SOUTH: "WEST",
  WEST: "NORTH"
};

function turnCut(state: ServiceState, cutId: string): Transition {
  allowedService(state, ["OPEN"]);
  const cut = getCut(state, cutId);
  if (cut.status !== "ON_GRILL" || cut.cellId === undefined) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} is not available to turn.`,
      "Choose a cut actively cooking on the coal field."
    );
  }
  const closed = closeOpenHeatSegment(cut, state.currentTick);
  const oriented = { ...closed, orientation: NEXT_ORIENTATION[cut.orientation] };
  const nextCut = startHeatSegment(oriented, cut.cellId, state.currentTick);
  return {
    state: replaceCut(state, nextCut),
    changes: [`cut:${cutId}:TURN:${nextCut.orientation}`],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function basteCut(state: ServiceState, cutId: string, rules: GameRules): Transition {
  allowedService(state, ["OPEN"]);
  const cut = getCut(state, cutId);
  if (cut.status !== "ON_GRILL") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} cannot be basted from ${cut.status}.`,
      "Baste only a cut on the coal field."
    );
  }
  const nextCut: CutState = {
    ...cut,
    surfaceMilli: checkedAdd(cut.surfaceMilli, 500, `${cut.id} basted surface`, 0, rules.numericLimit),
    charMilli: checkedAdd(cut.charMilli, 1_000, `${cut.id} basted char`, 0, rules.numericLimit),
    moistureMilli: clampInteger(
      checkedSubtract(cut.moistureMilli, 250, `${cut.id} basted moisture`, 0, 100_000),
      0,
      100_000
    ),
    heatPath: cut.heatPath.map((segment, index) =>
      index === cut.heatPath.length - 1
        ? { ...segment, bastingProfileId: "HOUSE_BASTE" }
        : segment
    )
  };
  return {
    state: replaceCut(state, nextCut),
    changes: [`cut:${cutId}:BASTE:HOUSE_BASTE`],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function moveToRest(state: ServiceState, cutId: string): Transition {
  allowedService(state, ["OPEN"]);
  const cut = getCut(state, cutId);
  if (cut.status !== "ON_GRILL") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} cannot move to rest from ${cut.status}.`,
      "Move a cut from the coal field into an open rest slot."
    );
  }
  const restingCount = state.cuts.filter(
    (candidate) => candidate.status === "RESTING" || candidate.status === "READY_TO_CARVE"
  ).length;
  if (restingCount >= state.capacities.rest) {
    fault(
      "TB_CAPACITY_EXCEEDED",
      "Both rest slots are occupied.",
      "Carve or recover a resting cut before moving another."
    );
  }
  const closed = closeOpenHeatSegment(cut, state.currentTick);
  const withoutCell = withoutOptional(
    {
      ...closed,
      status: "RESTING" as const,
      restMode: "OPEN_REST" as const,
      restStartedTick: state.currentTick
    },
    "cellId",
    "riskReason"
  ) as CutState;
  return {
    state: replaceCut(state, withoutCell),
    changes: [`cut:${cutId}:RESTING:OPEN_REST`],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function setRestMode(state: ServiceState, cutId: string, mode: "OPEN_REST" | "CLOCHE_HOLD"): Transition {
  allowedService(state, ["OPEN"]);
  const cut = getCut(state, cutId);
  if (cut.status !== "RESTING" && cut.status !== "READY_TO_CARVE") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} cannot change rest mode from ${cut.status}.`,
      "Choose a cut in an active rest slot."
    );
  }
  return {
    state: replaceCut(state, { ...cut, restMode: mode }),
    changes: [`cut:${cutId}:REST_MODE:${mode}`],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function advanceSide(
  state: ServiceState,
  sideId: string,
  operation: "START" | "PLATE",
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  allowedService(state, ["OPEN"]);
  const side = getSide(state, sideId);
  const definition = sideDefinition(content, sideId);

  if (operation === "START") {
    if (side.status !== "PLANNED") {
      fault(
        "TB_ACTION_NOT_ALLOWED",
        `${sideId} cannot start from ${side.status}.`,
        "Choose a side still planned for service."
      );
    }
    const active = state.sides.filter((candidate) => candidate.status === "STARTED").length;
    if (active >= state.capacities.side) {
      fault(
        "TB_CAPACITY_EXCEEDED",
        "Both side stations are occupied.",
        "Plate a ready side before starting another."
      );
    }
    const delta: LedgerAccrual = {
      ...ZERO_LEDGER_DELTA,
      ingredientCostCents: definition.ingredientCostCents
    };
    const next = replaceSide(state, {
      ...side,
      status: "STARTED",
      startedTick: state.currentTick,
      costRecognized: true
    });
    return {
      state: {
        ...next,
        ledgerAccrual: addLedgerAccrual(state.ledgerAccrual, delta, rules)
      },
      changes: [`side:${sideId}:STARTED`, `ledger:ingredient:+${definition.ingredientCostCents}`],
      ledgerDelta: delta
    };
  }

  if (side.status !== "READY" && side.status !== "HELD") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${sideId} cannot be plated from ${side.status}.`,
      "Wait until the side is ready or held."
    );
  }
  return {
    state: replaceSide(state, {
      ...side,
      status: "PLATED",
      platedAtTick: state.currentTick
    }),
    changes: [`side:${sideId}:PLATED`],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function tendTable(
  state: ServiceState,
  response: "ACKNOWLEDGE" | "DEFER"
): Transition {
  allowedService(state, ["OPEN"]);
  if (state.attention.status !== "REQUESTED" && state.attention.status !== "DEFERRED") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "The table has no active attention request.",
      "Return to fire, rest, or sides until attention is requested."
    );
  }
  return {
    state: {
      ...state,
      attention:
        response === "ACKNOWLEDGE"
          ? { ...state.attention, status: "RESOLVED", resolvedAtTick: state.currentTick }
          : { ...state.attention, status: "DEFERRED" }
    },
    changes: [`attention:${response === "ACKNOWLEDGE" ? "RESOLVED" : "DEFERRED"}`],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function chooseCutRecovery(
  state: ServiceState,
  cutId: string,
  choiceId: string,
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  let cut = getCut(state, cutId);
  if (!["AT_RISK", "RESTING", "READY_TO_CARVE"].includes(cut.status)) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} has no available cut recovery from ${cut.status}.`,
      "Choose an at-risk or resting cut."
    );
  }

  if (choiceId === "MOVE_TO_HOLD" || choiceId === "RETURN_TO_HEAT") {
    const intensities = coalIntensities(state.coalField, content, rules);
    const desiredBands = choiceId === "MOVE_TO_HOLD" ? ["HOLD"] : ["COOK", "HOLD"];
    const occupied = occupiedGrillCells(state, cutId);
    const destination = content.coalCells.find((cell) => {
      const intensity = intensities.find((entry) => entry.key === cell.id)?.value ?? 0;
      return (
        cell.active &&
        cell.servicePlacement &&
        !occupied.includes(cell.id) &&
        desiredBands.includes(heatBandForIntensity(intensity, rules))
      );
    });
    if (destination === undefined) {
      fault(
        "TB_CAPACITY_EXCEEDED",
        "No suitable recovery placement is open on the coal field.",
        "Rake a holding/cooking zone or free a placement first."
      );
    }
    const closed = closeOpenHeatSegment(cut, state.currentTick);
    cut = startHeatSegment(
      withoutOptional(
        { ...closed, status: "ON_GRILL" as const, recovered: true },
        "restMode",
        "restStartedTick",
        "riskReason"
      ) as CutState,
      destination.id,
      state.currentTick
    );
    return {
      state: replaceCut(state, cut),
      changes: [`cut:${cutId}:RECOVERY:${choiceId}:${destination.id}`],
      ledgerDelta: ZERO_LEDGER_DELTA
    };
  }

  if (choiceId === "CLOCHE_HOLD") {
    cut = withoutOptional(
      {
        ...cut,
        status: "RESTING" as const,
        restMode: "CLOCHE_HOLD" as const,
        restStartedTick: cut.restStartedTick ?? state.currentTick,
        recovered: true
      },
      "cellId",
      "riskReason"
    ) as CutState;
    return {
      state: replaceCut(state, cut),
      changes: [`cut:${cutId}:RECOVERY:CLOCHE_HOLD`],
      ledgerDelta: ZERO_LEDGER_DELTA
    };
  }

  if (choiceId === "CARVE_EARLY") {
    const plated: CutState = withoutOptional(
      {
        ...closeOpenHeatSegment(cut, state.currentTick),
        status: "PLATED" as const,
        carvedAtTick: state.currentTick,
        platedAtTick: state.currentTick,
        quality: "RECOVERED" as const,
        recovered: true
      },
      "cellId",
      "restMode",
      "riskReason"
    ) as CutState;
    return {
      state: refreshTableReadiness(replaceCut(state, plated)),
      changes: [`cut:${cutId}:RECOVERY:CARVE_EARLY`, `cut:${cutId}:PLATED`],
      ledgerDelta: ZERO_LEDGER_DELTA
    };
  }

  if (choiceId === "STAFF_MEAL") {
    const definition = cutDefinition(content, cutId);
    const delta: LedgerAccrual = {
      ...ZERO_LEDGER_DELTA,
      wasteCostCents: Math.floor(definition.ingredientCostCents / 10)
    };
    const staffMeal = withoutOptional(
      {
        ...closeOpenHeatSegment(cut, state.currentTick),
        status: "STAFF_MEAL" as const,
        recovered: true
      },
      "cellId",
      "restMode",
      "restStartedTick",
      "riskReason"
    ) as CutState;
    const next = replaceCut(state, staffMeal);
    return {
      state: {
        ...next,
        ledgerAccrual: addLedgerAccrual(state.ledgerAccrual, delta, rules)
      },
      changes: [`cut:${cutId}:STAFF_MEAL`, `ledger:waste:+${delta.wasteCostCents}`],
      ledgerDelta: delta
    };
  }

  fault(
    "TB_ACTION_NOT_ALLOWED",
    `${choiceId} is not a valid recovery for a cut.`,
    "Choose a listed cut recovery."
  );
}

function chooseSideRecovery(
  state: ServiceState,
  sideId: string,
  choiceId: string,
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  const side = getSide(state, sideId);
  if (choiceId === "REMAKE_SIDE") {
    if (side.status !== "READY" && side.status !== "HELD") {
      fault(
        "TB_ACTION_NOT_ALLOWED",
        `${sideId} cannot be remade from ${side.status}.`,
        "Choose a ready or held side."
      );
    }
    const active = state.sides.filter(
      (candidate) => candidate.id !== sideId && candidate.status === "STARTED"
    ).length;
    if (active >= state.capacities.side) {
      fault(
        "TB_CAPACITY_EXCEEDED",
        "No side station is open for a remake.",
        "Plate another side or choose a transparent delay."
      );
    }
    const definition = sideDefinition(content, sideId);
    const delta: LedgerAccrual = {
      ingredientCostCents: definition.remakeCostCents,
      recoveryCourtesyCostCents: 0,
      wasteCostCents: Math.floor(definition.ingredientCostCents / 4)
    };
    const next = replaceSide(state, {
      ...side,
      status: "STARTED",
      startedTick: state.currentTick,
      remakes: side.remakes + 1
    });
    return {
      state: {
        ...next,
        ledgerAccrual: addLedgerAccrual(state.ledgerAccrual, delta, rules)
      },
      changes: [
        `side:${sideId}:REMAKE:${side.remakes + 1}`,
        `ledger:ingredient:+${delta.ingredientCostCents}`,
        `ledger:waste:+${delta.wasteCostCents}`
      ],
      ledgerDelta: delta
    };
  }
  if (choiceId === "DELAY_TABLE") {
    const delta: LedgerAccrual = {
      ...ZERO_LEDGER_DELTA,
      recoveryCourtesyCostCents: rules.ledger.honestServiceCourtesyCostCents
    };
    return {
      state: {
        ...state,
        table: {
          ...state.table,
          status: "RECOVERY_REQUIRED",
          recoveryChoice: "SERVE_HONESTLY"
        },
        ledgerAccrual: addLedgerAccrual(state.ledgerAccrual, delta, rules)
      },
      changes: ["table:RECOVERY:SERVE_HONESTLY"],
      ledgerDelta: delta
    };
  }
  fault(
    "TB_ACTION_NOT_ALLOWED",
    `${choiceId} is not a valid recovery for a side.`,
    "Choose remake or transparent delay."
  );
}

function chooseTableRecovery(
  state: ServiceState,
  choiceId: string,
  rules: GameRules
): Transition {
  if (choiceId !== "SHARED_COURSE" && choiceId !== "SERVE_HONESTLY") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${choiceId} is not a valid table recovery.`,
      "Choose a shared course or honest service."
    );
  }
  const recoveryChoice = choiceId as "SHARED_COURSE" | "SERVE_HONESTLY";
  const courtesy =
    recoveryChoice === "SHARED_COURSE"
      ? rules.ledger.sharedCourseCourtesyCostCents
      : rules.ledger.honestServiceCourtesyCostCents;
  const delta: LedgerAccrual = {
    ...ZERO_LEDGER_DELTA,
    recoveryCourtesyCostCents: courtesy
  };
  return {
    state: {
      ...state,
      table: { ...state.table, status: "RECOVERY_REQUIRED", recoveryChoice },
      ledgerAccrual: addLedgerAccrual(state.ledgerAccrual, delta, rules)
    },
    changes: [`table:RECOVERY:${recoveryChoice}`, `ledger:recovery:+${courtesy}`],
    ledgerDelta: delta
  };
}

function chooseAttentionRecovery(state: ServiceState, choiceId: string, rules: GameRules): Transition {
  if (choiceId !== "HOST_ASSIST" || state.hostAssistRemaining < 1) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "The onboarding host assist is unavailable.",
      "Acknowledge the table directly or continue with an honest recovery."
    );
  }
  if (state.attention.status !== "REQUESTED" && state.attention.status !== "DEFERRED") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "There is no attention request for the Baron to cover.",
      "Save the host assist for an active request."
    );
  }
  const delta: LedgerAccrual = {
    ...ZERO_LEDGER_DELTA,
    recoveryCourtesyCostCents: rules.ledger.hostAssistCourtesyCostCents
  };
  return {
    state: {
      ...state,
      attention: { ...state.attention, status: "RESOLVED", resolvedAtTick: state.currentTick },
      hostAssistRemaining: state.hostAssistRemaining - 1,
      ledgerAccrual: addLedgerAccrual(state.ledgerAccrual, delta, rules)
    },
    changes: ["attention:HOST_ASSIST", `ledger:recovery:+${delta.recoveryCourtesyCostCents}`],
    ledgerDelta: delta
  };
}

function chooseRecovery(
  state: ServiceState,
  payload: Extract<GameAction<"CHOOSE_RECOVERY">, { type: "CHOOSE_RECOVERY" }>["payload"],
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  allowedService(state, ["OPEN"]);
  switch (payload.targetType) {
    case "CUT":
      return chooseCutRecovery(state, payload.targetId, payload.choiceId, content, rules);
    case "SIDE":
      return chooseSideRecovery(state, payload.targetId, payload.choiceId, content, rules);
    case "TABLE":
      return chooseTableRecovery(state, payload.choiceId, rules);
    case "ATTENTION":
      return chooseAttentionRecovery(state, payload.choiceId, rules);
  }
}

function carveCut(
  state: ServiceState,
  cutId: string,
  content: FirstServiceContent
): Transition {
  allowedService(state, ["OPEN"]);
  const cut = getCut(state, cutId);
  if (cut.status !== "READY_TO_CARVE") {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      `${cutId} cannot be carved from ${cut.status}.`,
      "Wait for the rest window or choose an explicit recovery."
    );
  }
  const definition = cutDefinition(content, cutId);
  const plated = withoutOptional(
    {
      ...cut,
      status: "PLATED" as const,
      carvedAtTick: state.currentTick,
      platedAtTick: state.currentTick,
      quality: evaluateCutQuality(cut, definition)
    },
    "restMode",
    "riskReason"
  ) as CutState;
  return {
    state: refreshTableReadiness(replaceCut(state, plated)),
    changes: [`cut:${cutId}:PLATED:${plated.quality ?? "MISSED"}`],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function advanceTick(
  state: ServiceState,
  ticks: number,
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  allowedService(state, ["OPEN"]);
  if (state.paused) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "Simulation ticks cannot advance while service is paused.",
      "Resume service to continue canonical time."
    );
  }
  if (ticks !== 1) {
    fault(
      "TB_TICK_RANGE",
      "ADVANCE_TICK must advance exactly one tick.",
      "Serialize due time as individual one-tick actions."
    );
  }
  const currentTick = checkedAdd(state.currentTick, 1, "service tick", 0, rules.numericLimit);
  const intensities = coalIntensities(state.coalField, content, rules);
  const cuts = state.cuts.map((cut) => {
    const definition = cutDefinition(content, cut.id);
    const intensity =
      cut.cellId === undefined
        ? 0
        : intensities.find((entry) => entry.key === cut.cellId)?.value ?? 0;
    return advanceCutOneTick(cut, definition, intensity, rules, currentTick);
  });
  const sides = state.sides.map((side) =>
    advanceSideOneTick(side, sideDefinition(content, side.id), currentTick)
  );
  const attention =
    state.attention.status === "QUIET" && currentTick >= content.table.attentionTick
      ? { status: "REQUESTED" as const, requestedAtTick: currentTick }
      : state.attention;

  const changes = ["tick:+1"];
  if (attention !== state.attention) {
    changes.push("attention:REQUESTED");
  }
  cuts.forEach((cut, index) => {
    const previous = state.cuts[index];
    if (previous !== undefined && previous.status !== cut.status) {
      changes.push(`cut:${cut.id}:${cut.status}`);
    }
  });
  sides.forEach((side, index) => {
    const previous = state.sides[index];
    if (previous !== undefined && previous.status !== side.status) {
      changes.push(`side:${side.id}:${side.status}`);
    }
  });

  return {
    state: { ...state, currentTick, cuts, sides, attention },
    changes,
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function pauseService(state: ServiceState): Transition {
  allowedService(state, ["OPEN"]);
  if (state.paused) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "Service is already paused.",
      "Resume when ready to continue."
    );
  }
  return {
    state: { ...state, paused: true },
    changes: ["service:PAUSED"],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function resumeService(state: ServiceState): Transition {
  allowedService(state, ["OPEN"]);
  if (!state.paused) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "Service is not paused.",
      "Continue the current task."
    );
  }
  return {
    state: { ...state, paused: false },
    changes: ["service:RESUMED"],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function callTheTable(
  state: ServiceState,
  content: FirstServiceContent
): Transition {
  allowedService(state, ["OPEN"]);
  if (state.paused) {
    fault(
      "TB_ACTION_NOT_ALLOWED",
      "The table cannot be called while service is paused.",
      "Resume service before committing the pass."
    );
  }
  if (!state.cuts.every((cut) => cut.status === "PLATED")) {
    fault(
      "TB_SETTLEMENT_INCOMPLETE",
      "Every cover needs a plated cut before the table can be called.",
      "Carve or recover the missing cuts."
    );
  }
  const platedSides = state.sides.filter((side) => side.status === "PLATED").length;
  if (platedSides < state.sides.length && state.table.recoveryChoice === undefined) {
    fault(
      "TB_SETTLEMENT_INCOMPLETE",
      "A missing side needs an explicit whole-table recovery.",
      "Choose shared-course or honest-service recovery before calling."
    );
  }
  if (platedSides < state.sides.length - 1) {
    fault(
      "TB_SETTLEMENT_INCOMPLETE",
      "Too many table components are missing for a truthful call.",
      "Finish another side before calling the table."
    );
  }
  const firstEligibleTick = state.table.firstEligibleTick ?? state.currentTick;
  const synchronized =
    platedSides === state.sides.length &&
    state.currentTick - firstEligibleTick <= content.table.synchronizationWindowTicks;
  const exactCuts = state.cuts.filter((cut) => cut.quality === "EXACT").length;
  const guestOutcome: GuestOutcome =
    synchronized && exactCuts >= 3 && state.attention.status === "RESOLVED"
      ? "DELIGHTED"
      : platedSides === state.sides.length
        ? "CONTENT"
        : "RECOVERABLE_CONCERN";
  const cuts = state.cuts.map((cut) => ({ ...cut, status: "SERVED" as const }));
  const sides = state.sides.map((side) =>
    side.status === "PLATED"
      ? { ...side, status: "SERVED" as const }
      : { ...side, status: "REWORKED" as const }
  );
  const table: TableState = {
    ...state.table,
    status: "RESOLVED",
    calledAtTick: state.currentTick,
    synchronized,
    guestOutcome
  };
  return {
    state: {
      ...state,
      serviceStatus: "CLOSING",
      cuts,
      sides,
      table
    },
    changes: [
      "table:CALLED",
      `table:synchronized:${String(synchronized)}`,
      `guest:${guestOutcome}`,
      "service:CLOSING"
    ],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function settleService(
  state: ServiceState,
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  allowedService(state, ["CLOSING"]);
  if (state.table.guestOutcome === undefined || state.table.synchronized === undefined) {
    fault(
      "TB_SETTLEMENT_INCOMPLETE",
      "The table result is incomplete.",
      "Resolve the whole-table pass before closing the book."
    );
  }
  return {
    state: {
      ...state,
      serviceStatus: "SETTLED",
      settlement: {
        ledger: buildLedger(state, content, rules, true),
        guestOutcome: state.table.guestOutcome,
        synchronized: state.table.synchronized,
        settledAtTick: state.currentTick
      }
    },
    changes: ["service:SETTLED", "ledger:RECONCILED"],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function abandonService(
  state: ServiceState,
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  allowedService(state, ["BRIEFING", "SETUP", "OPEN"]);
  return {
    state: {
      ...state,
      serviceStatus: "ABANDONED",
      paused: false,
      settlement: {
        ledger: buildLedger(state, content, rules, false),
        guestOutcome: "RECOVERABLE_CONCERN",
        synchronized: false,
        settledAtTick: state.currentTick
      }
    },
    changes: ["service:ABANDONED", "ledger:RECONCILED:NO_REVENUE"],
    ledgerDelta: ZERO_LEDGER_DELTA
  };
}

function applyAction(
  state: ServiceState,
  action: GameAction,
  content: FirstServiceContent,
  rules: GameRules
): Transition {
  switch (action.type) {
    case "OPEN_HOUSE":
      return openHouse(state);
    case "INSPECT_PARTY":
      return inspectParty(state);
    case "SELECT_CUT":
      return selectCut(state, action.payload.cutId, content, rules);
    case "APPLY_RAKE":
      return applyRake(state, action.payload, content, rules);
    case "PLACE_CUT":
      return placeCut(state, action.payload.cutId, action.payload.cellId, content);
    case "MOVE_CUT":
      return moveCut(state, action.payload.cutId, action.payload.cellId, content);
    case "TURN_CUT":
      return turnCut(state, action.payload.cutId);
    case "APPLY_BASTE":
      return basteCut(state, action.payload.cutId, rules);
    case "MOVE_TO_REST":
      return moveToRest(state, action.payload.cutId);
    case "SET_REST_MODE":
      return setRestMode(state, action.payload.cutId, action.payload.mode);
    case "ADVANCE_SIDE":
      return advanceSide(state, action.payload.sideId, action.payload.operation, content, rules);
    case "TEND_TABLE":
      return tendTable(state, action.payload.response);
    case "CHOOSE_RECOVERY":
      return chooseRecovery(state, action.payload, content, rules);
    case "CARVE_CUT":
      return carveCut(state, action.payload.cutId, content);
    case "CALL_THE_TABLE":
      return callTheTable(state, content);
    case "ADVANCE_TICK":
      return advanceTick(state, action.payload.ticks, content, rules);
    case "PAUSE_SERVICE":
      return pauseService(state);
    case "RESUME_SERVICE":
      return resumeService(state);
    case "SETTLE_SERVICE":
      return settleService(state, content, rules);
    case "ABANDON_SERVICE":
      return abandonService(state, content, rules);
    case "PREVIEW_RAKE":
      fault(
        "TB_ACTION_NOT_ALLOWED",
        "PREVIEW_RAKE is a non-canonical query and must use the preview result path.",
        "Preview first, then submit APPLY_RAKE with the preview revision."
      );
  }
}

function validateEnvelope(
  state: ServiceState,
  action: GameAction,
  rules: GameRules,
  content: FirstServiceContent
): string {
  if (action.schemaVersion !== 1 || state.schemaVersion !== 1) {
    fault(
      "TB_SCHEMA_UNSUPPORTED",
      "State and actions must use schema version 1.",
      "Load a supported save and action contract."
    );
  }
  if (!sameVersionRef(state.rulesRef, rules.ref)) {
    fault(
      "TB_RULES_MISMATCH",
      "The service rules do not match the pinned state.",
      "Load the exact pinned rules version."
    );
  }
  if (!sameVersionRef(state.contentRef, content.ref)) {
    fault(
      "TB_CONTENT_MISMATCH",
      "The service content does not match the pinned state.",
      "Load the exact pinned content pack."
    );
  }
  requireInteger(action.actionSequence, "action sequence", 0, rules.numericLimit);
  requireInteger(action.expectedRevision, "expected revision", 0, rules.numericLimit);
  requireInteger(action.issuedAtTick, "issued-at tick", 0, rules.numericLimit);
  if (action.issuedAtTick !== state.currentTick) {
    fault(
      "TB_ACTION_SEQUENCE",
      "The action was issued against a different canonical tick.",
      "Recreate the action from the current service state."
    );
  }
  return canonicalHash(action);
}

function canonicalEvent(
  action: GameAction,
  revisionBefore: number,
  revisionAfter: number,
  tickAfter: number,
  transition: Transition
): GameEvent {
  const body = {
    schemaVersion: 1,
    action,
    revisionBefore,
    revisionAfter,
    tickAfter,
    changes: transition.changes,
    ledgerDelta: transition.ledgerDelta
  } as const;
  return {
    ...body,
    eventId: canonicalHash({ domain: "tender-baron/event/v1", body })
  };
}

export function reduce(
  previousState: ServiceState,
  action: GameAction,
  rules: GameRules,
  content: FirstServiceContent
): ReduceResult {
  try {
    const actionHash = validateEnvelope(previousState, action, rules, content);

    if (action.type === "PREVIEW_RAKE") {
      if (action.expectedRevision !== previousState.revision) {
        fault(
          "TB_STATE_REVISION",
          "The rake preview targets a stale state revision.",
          "Preview the current coal field again."
        );
      }
      return {
        ok: true,
        state: previousState,
        preview: previewRake(
          previousState,
          action.payload.sourceCellId,
          action.payload.targetCellId,
          action.payload.amount,
          content,
          rules
        ),
        duplicate: false
      };
    }

    const duplicate = previousState.acceptedActionIds.find(
      (record) => record.actionId === action.actionId
    );
    if (duplicate !== undefined) {
      if (duplicate.actionHash !== actionHash) {
        fault(
          "TB_ACTION_ID_CONFLICT",
          "An accepted action ID was reused with different canonical bytes.",
          "Generate a new action ID from the current state."
        );
      }
      return {
        ok: true,
        state: previousState,
        event: duplicate.event,
        duplicate: true
      };
    }

    if (action.actionSequence !== previousState.nextActionSequence) {
      fault(
        "TB_ACTION_SEQUENCE",
        "The action sequence is skipped, stale, or out of order.",
        "Recreate the action with the next canonical sequence."
      );
    }
    if (action.expectedRevision !== previousState.revision) {
      fault(
        "TB_STATE_REVISION",
        "The action targets a stale state revision.",
        "Review the current service state before retrying."
      );
    }
    if (previousState.serviceStatus === "SETTLED" || previousState.serviceStatus === "ABANDONED") {
      fault(
        "TB_ACTION_NOT_ALLOWED",
        "A terminal service cannot accept another action.",
        "Start a new local service or review the settled result."
      );
    }

    const transition = applyAction(previousState, action, content, rules);
    const revisionAfter = checkedAdd(
      previousState.revision,
      1,
      "state revision",
      0,
      rules.numericLimit
    );
    const nextActionSequence = checkedAdd(
      previousState.nextActionSequence,
      1,
      "next action sequence",
      0,
      rules.numericLimit
    );
    const event = canonicalEvent(
      action,
      previousState.revision,
      revisionAfter,
      transition.state.currentTick,
      transition
    );
    const state: ServiceState = {
      ...transition.state,
      revision: revisionAfter,
      nextActionSequence,
      acceptedActionIds: [
        ...previousState.acceptedActionIds,
        {
          actionId: action.actionId,
          actionHash,
          event
        }
      ]
    };

    canonicalize(event);
    return { ok: true, state, event, duplicate: false };
  } catch (error) {
    return {
      ok: false,
      state: previousState,
      error: asDomainError(error)
    };
  }
}

export function makeAction<T extends ActionType>(
  state: ServiceState,
  type: T,
  payload: Extract<GameAction<T>, { type: T }>["payload"],
  actionId = `action-${state.nextActionSequence}`
): GameAction<T> {
  return {
    schemaVersion: 1,
    actionId,
    actionSequence: state.nextActionSequence,
    expectedRevision: state.revision,
    issuedAtTick: state.currentTick,
    type,
    payload
  } as GameAction<T>;
}
