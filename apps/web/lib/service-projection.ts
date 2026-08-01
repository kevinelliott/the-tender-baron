import {
  coalIntensities,
  heatBandForIntensity,
} from "@tender-baron/game-domain";
import type {
  FirstServiceContent,
  GameRules,
  ServiceState,
} from "@tender-baron/game-domain";
import type { CoverView, ServiceViewModel } from "./service-types";

const COVER_LETTERS = ["A", "B", "C", "D"] as const;

function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function projectService(
  state: ServiceState,
  content: FirstServiceContent,
  rules: GameRules,
): ServiceViewModel {
  const intensities = coalIntensities(state.coalField, content, rules);
  const covers: CoverView[] = content.cuts.map((definition, index) => {
    const cut = state.cuts.find((candidate) => candidate.id === definition.id);
    const sideDefinition = content.sides.find((candidate) => candidate.coverId === definition.coverId);
    const side = state.sides.find((candidate) => candidate.coverId === definition.coverId);
    if (cut === undefined || side === undefined || sideDefinition === undefined) {
      throw new Error(`Pinned service content is incomplete for ${definition.coverId}.`);
    }
    const path = [
      ...cut.heatPath.map((segment) => `Heat · ${segment.cellId.replace("coal_", "placement ").toUpperCase()}`),
      titleCase(cut.status),
    ];
    return {
      id: COVER_LETTERS[index] ?? "D",
      coverId: definition.coverId,
      label: `Cover ${COVER_LETTERS[index] ?? "D"}`,
      cutId: definition.id,
      cut: definition.displayName.replace(/ for cover [A-D]/i, ""),
      target: definition.target.displayName,
      targetShape: definition.target.id.includes("rose") ? "diamond" : "square",
      sideId: sideDefinition.id,
      side: sideDefinition.displayName,
      cutStatus: cut.status,
      sideStatus: side.status,
      statusLabel: titleCase(cut.status),
      ...(cut.cellId === undefined ? {} : { cellId: cut.cellId }),
      ...(cut.riskLocation === undefined ? {} : { riskLocation: cut.riskLocation }),
      path: path.length > 1 ? path : ["Case", "Temper", "Heat", "Rest", "Carve"],
    };
  });

  const placements = content.coalCells
    .filter((cell) => cell.servicePlacement)
    .map((cell) => {
      const intensity = intensities.find((entry) => entry.key === cell.id)?.value ?? 0;
      const coalUnits = state.coalField.find((entry) => entry.key === cell.id)?.value ?? 0;
      const band = heatBandForIntensity(intensity, rules);
      return {
        id: cell.id,
        label: `Placement ${cell.id.replace("coal_", "").toUpperCase()}`,
        description: `${titleCase(band)} band · ${intensity} heat units`,
        coalUnits,
        intensity,
        band,
        neighbors: cell.neighbors,
      };
    });

  const resting = covers.filter((cover) =>
    cover.cutStatus === "RESTING"
      || cover.cutStatus === "READY_TO_CARVE"
      || (cover.cutStatus === "AT_RISK" && cover.riskLocation === "REST"),
  );
  const restSlots = [0, 1].map((index) => {
    const cover = resting[index];
    const cut = cover === undefined ? undefined : state.cuts.find((candidate) => candidate.id === cover.cutId);
    return {
      id: `rest-${index + 1}`,
      label: `Rest slot ${index + 1}`,
      ...(cover === undefined ? {} : { coverId: cover.id }),
      mode: cut?.restMode ?? "AVAILABLE",
      detail: cover === undefined
        ? "Available for the next cut"
        : `${titleCase(cut?.restMode ?? "OPEN_REST")} · ${titleCase(cut?.status ?? "RESTING")}`,
    };
  });

  const ledger = state.settlement?.ledger;
  const ledgerPreview = ledger === undefined
    ? [
        { label: "Recognized ingredients", cents: -state.ledgerAccrual.ingredientCostCents },
        { label: "Recovery care", cents: -state.ledgerAccrual.recoveryCourtesyCostCents },
        { label: "Waste", cents: -state.ledgerAccrual.wasteCostCents },
        { label: "Scheduled labor", cents: -rules.ledger.scheduledLaborCostCents },
        { label: "Maintenance", cents: -rules.ledger.maintenanceCostCents },
      ]
    : [
        { label: "Menu revenue", cents: ledger.grossServiceRevenueCents },
        { label: "Ingredients", cents: -ledger.ingredientCostCents },
        { label: "Fuel", cents: -ledger.fuelCostCents },
        { label: "Scheduled labor", cents: -ledger.scheduledLaborCostCents },
        { label: "Maintenance", cents: -ledger.maintenanceCostCents },
      ];

  return {
    serviceTitle: "First Embers",
    occasion: "Four neighborhood regulars return for the soft reopening.",
    promise: "Serve all four covers together before the last tram.",
    covers,
    placements,
    sidesReady: state.sides.filter((side) => ["READY", "HELD", "PLATED", "SERVED"].includes(side.status)).length,
    syncWindowTicks: content.table.synchronizationWindowTicks,
    attention: {
      label: state.attention.status === "QUIET" ? "Room calm" : "Water for the table",
      detail: state.attention.status === "QUIET"
        ? `The authored attention beat begins at tick ${content.table.attentionTick}.`
        : state.attention.status === "RESOLVED"
          ? "The table has been acknowledged."
          : "Acknowledge the table or make a deliberate deferral.",
      status: state.attention.status,
    },
    restSlots,
    ledgerPreview,
    cutsOnGrill: state.cuts.filter((cut) => cut.status === "ON_GRILL" || (cut.status === "AT_RISK" && cut.riskLocation === "GRILL")).length,
  };
}
