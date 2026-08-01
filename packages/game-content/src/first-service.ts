import { canonicalHash } from "@tender-baron/game-domain";
import type {
  CutDefinition,
  FirstServiceContent,
  GameRules,
  SideDefinition
} from "@tender-baron/game-domain";

const RULES_BODY = {
  schemaVersion: 1,
  tickDurationMs: 250,
  fixedPointScale: 1000,
  numericLimit: 9_000_000_000_000_000,
  coalBudget: 6,
  coalCellCapacity: 3,
  ownCoalIntensityMilli: 1_000,
  neighborCoalIntensityMilli: 250,
  cookThresholdMilli: 1_000,
  searThresholdMilli: 2_000,
  riskToleranceMilli: 8_000,
  grillCapacity: 4,
  restCapacity: 2,
  sideCapacity: 2,
  ledger: {
    tipsEnabled: false,
    fuelCostCents: 600,
    scheduledLaborCostCents: 2_400,
    maintenanceCostCents: 400,
    hostAssistCourtesyCostCents: 200,
    sharedCourseCourtesyCostCents: 350,
    honestServiceCourtesyCostCents: 250
  }
} as const;

export const RULES_V1: GameRules = {
  ...RULES_BODY,
  ref: {
    id: "tender_baron_rules",
    version: 1,
    contentHash: canonicalHash(RULES_BODY)
  }
};

const ROSE_TARGET = {
  id: "target_rose_center",
  displayName: "Rose center",
  accessibleDescription: "Deep crust, warm rose center, and a clear juice-retention window.",
  surface: { minimum: 28_000, maximum: 46_000 },
  core: { minimum: 19_000, maximum: 31_000 },
  char: { minimum: 9_000, maximum: 28_000 },
  moistureMinimum: 78_000
} as const;

const WARM_PINK_TARGET = {
  id: "target_warm_pink_center",
  displayName: "Warm pink center",
  accessibleDescription: "Even crust, warm pink center, and a stable resting finish.",
  surface: { minimum: 30_000, maximum: 49_000 },
  core: { minimum: 24_000, maximum: 40_000 },
  char: { minimum: 9_000, maximum: 30_000 },
  moistureMinimum: 76_000
} as const;

const CUTS: readonly CutDefinition[] = [
  {
    id: "cut_strip_a",
    coverId: "cover_a",
    displayName: "Strip for cover A",
    thermal: {
      surfaceByBand: { HOLD: 180, COOK: 600, SEAR: 1_000 },
      coreByBand: { HOLD: 330, COOK: 500, SEAR: 400 },
      charByBand: { HOLD: 40, COOK: 200, SEAR: 500 },
      moistureLossByBand: { HOLD: 15, COOK: 45, SEAR: 90 },
      openRestCarryover: 250,
      clocheCarryover: 175,
      openRestMoistureLoss: 45,
      clocheMoistureLoss: 25
    },
    target: ROSE_TARGET,
    minimumRestTicks: 24,
    idealRestTicks: 48,
    ingredientCostCents: 1_250,
    menuRevenueCents: 4_800
  },
  {
    id: "cut_strip_b",
    coverId: "cover_b",
    displayName: "Strip for cover B",
    thermal: {
      surfaceByBand: { HOLD: 180, COOK: 610, SEAR: 1_020 },
      coreByBand: { HOLD: 340, COOK: 520, SEAR: 420 },
      charByBand: { HOLD: 40, COOK: 210, SEAR: 510 },
      moistureLossByBand: { HOLD: 15, COOK: 48, SEAR: 92 },
      openRestCarryover: 260,
      clocheCarryover: 180,
      openRestMoistureLoss: 45,
      clocheMoistureLoss: 25
    },
    target: WARM_PINK_TARGET,
    minimumRestTicks: 26,
    idealRestTicks: 52,
    ingredientCostCents: 1_250,
    menuRevenueCents: 4_800
  },
  {
    id: "cut_ribeye_c",
    coverId: "cover_c",
    displayName: "Ribeye for cover C",
    thermal: {
      surfaceByBand: { HOLD: 170, COOK: 560, SEAR: 920 },
      coreByBand: { HOLD: 300, COOK: 450, SEAR: 350 },
      charByBand: { HOLD: 45, COOK: 230, SEAR: 540 },
      moistureLossByBand: { HOLD: 12, COOK: 38, SEAR: 75 },
      openRestCarryover: 280,
      clocheCarryover: 190,
      openRestMoistureLoss: 38,
      clocheMoistureLoss: 22
    },
    target: ROSE_TARGET,
    minimumRestTicks: 30,
    idealRestTicks: 58,
    ingredientCostCents: 1_600,
    menuRevenueCents: 5_600
  },
  {
    id: "cut_filet_d",
    coverId: "cover_d",
    displayName: "Filet for cover D",
    thermal: {
      surfaceByBand: { HOLD: 160, COOK: 540, SEAR: 900 },
      coreByBand: { HOLD: 360, COOK: 520, SEAR: 430 },
      charByBand: { HOLD: 35, COOK: 180, SEAR: 450 },
      moistureLossByBand: { HOLD: 18, COOK: 52, SEAR: 105 },
      openRestCarryover: 320,
      clocheCarryover: 210,
      openRestMoistureLoss: 52,
      clocheMoistureLoss: 30
    },
    target: WARM_PINK_TARGET,
    minimumRestTicks: 34,
    idealRestTicks: 64,
    ingredientCostCents: 1_850,
    menuRevenueCents: 6_200
  }
];

const SIDES: readonly SideDefinition[] = [
  {
    id: "side_ember_shallot",
    coverId: "cover_a",
    displayName: "Ember shallot",
    durationTicks: 28,
    readyWindowTicks: 48,
    ingredientCostCents: 240,
    remakeCostCents: 240
  },
  {
    id: "side_creamed_greens",
    coverId: "cover_b",
    displayName: "Creamed greens",
    durationTicks: 32,
    readyWindowTicks: 44,
    ingredientCostCents: 320,
    remakeCostCents: 320
  },
  {
    id: "side_smoked_potato",
    coverId: "cover_c",
    displayName: "Smoked potato",
    durationTicks: 36,
    readyWindowTicks: 52,
    ingredientCostCents: 360,
    remakeCostCents: 360
  },
  {
    id: "side_brass_pan_mushrooms",
    coverId: "cover_d",
    displayName: "Brass-pan mushrooms",
    durationTicks: 24,
    readyWindowTicks: 40,
    ingredientCostCents: 340,
    remakeCostCents: 340
  }
];

const CONTENT_BODY = {
  schemaVersion: 1,
  serviceId: "service_first_embers_v1",
  expectedDurationSeconds: 600,
  coalCells: [
    { id: "coal_a", active: true, neighbors: ["coal_b", "coal_d"], servicePlacement: true },
    { id: "coal_b", active: true, neighbors: ["coal_a", "coal_c", "coal_e"], servicePlacement: true },
    { id: "coal_c", active: true, neighbors: ["coal_b", "coal_f"], servicePlacement: false },
    { id: "coal_d", active: true, neighbors: ["coal_a", "coal_e"], servicePlacement: false },
    { id: "coal_e", active: true, neighbors: ["coal_b", "coal_d", "coal_f"], servicePlacement: true },
    { id: "coal_f", active: true, neighbors: ["coal_c", "coal_e"], servicePlacement: true }
  ],
  initialCoalCounts: [
    { key: "coal_a", value: 2 },
    { key: "coal_b", value: 0 },
    { key: "coal_c", value: 0 },
    { key: "coal_d", value: 1 },
    { key: "coal_e", value: 1 },
    { key: "coal_f", value: 2 }
  ],
  cuts: CUTS,
  sides: SIDES,
  table: {
    id: "table_soft_reopening",
    coverIds: ["cover_a", "cover_b", "cover_c", "cover_d"],
    synchronizationWindowTicks: 30,
    attentionTick: 16
  }
} as const;

export const FIRST_SERVICE_CONTENT: FirstServiceContent = {
  ...CONTENT_BODY,
  ref: {
    id: "first_embers_content",
    version: 1,
    contentHash: canonicalHash(CONTENT_BODY)
  }
};

export const HASHABLE_RULES_V1 = RULES_BODY;
export const HASHABLE_FIRST_SERVICE_CONTENT = CONTENT_BODY;
