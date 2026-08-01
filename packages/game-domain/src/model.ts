import type { DomainError } from "./errors.js";

export type ServiceStatus =
  | "DORMANT"
  | "BRIEFING"
  | "SETUP"
  | "OPEN"
  | "CLOSING"
  | "SETTLED"
  | "ABANDONED";

export type CutStatus =
  | "CASE"
  | "TEMPERING"
  | "ON_GRILL"
  | "RESTING"
  | "READY_TO_CARVE"
  | "AT_RISK"
  | "PLATED"
  | "SERVED"
  | "STAFF_MEAL"
  | "COMPOSTED";

export type SideStatus =
  | "PLANNED"
  | "STARTED"
  | "READY"
  | "HELD"
  | "PLATED"
  | "SERVED"
  | "REWORKED";

export type TableStatus =
  | "RESERVED"
  | "SEATED"
  | "PROMISE_REVIEWED"
  | "ORDER_COMMITTED"
  | "IN_SERVICE"
  | "READY_TO_DELIVER"
  | "RECOVERY_REQUIRED"
  | "RESOLVED";

export type AttentionStatus = "QUIET" | "REQUESTED" | "DEFERRED" | "RESOLVED" | "MISSED";
export type RestMode = "OPEN_REST" | "CLOCHE_HOLD";
export type Orientation = "NORTH" | "EAST" | "SOUTH" | "WEST";
export type HeatBand = "HOLD" | "COOK" | "SEAR";
export type CutQuality = "EXACT" | "NEAR" | "RECOVERED" | "MISSED";
export type GuestOutcome = "DELIGHTED" | "CONTENT" | "RECOVERABLE_CONCERN";

export interface VersionRef {
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface NumericRange {
  readonly minimum: number;
  readonly maximum: number;
}

export interface ThermalRates {
  readonly surfaceByBand: Readonly<Record<HeatBand, number>>;
  readonly coreByBand: Readonly<Record<HeatBand, number>>;
  readonly charByBand: Readonly<Record<HeatBand, number>>;
  readonly moistureLossByBand: Readonly<Record<HeatBand, number>>;
  readonly openRestCarryover: number;
  readonly clocheCarryover: number;
  readonly openRestMoistureLoss: number;
  readonly clocheMoistureLoss: number;
}

export interface TargetProfile {
  readonly id: string;
  readonly displayName: string;
  readonly accessibleDescription: string;
  readonly surface: NumericRange;
  readonly core: NumericRange;
  readonly char: NumericRange;
  readonly moistureMinimum: number;
}

export interface CutDefinition {
  readonly id: string;
  readonly coverId: string;
  readonly displayName: string;
  readonly thermal: ThermalRates;
  readonly target: TargetProfile;
  readonly minimumRestTicks: number;
  readonly idealRestTicks: number;
  readonly ingredientCostCents: number;
  readonly menuRevenueCents: number;
}

export interface SideDefinition {
  readonly id: string;
  readonly coverId: string;
  readonly displayName: string;
  readonly durationTicks: number;
  readonly readyWindowTicks: number;
  readonly ingredientCostCents: number;
  readonly remakeCostCents: number;
}

export interface CoalCellDefinition {
  readonly id: string;
  readonly active: boolean;
  readonly neighbors: readonly string[];
  readonly servicePlacement: boolean;
}

export interface FirstServiceContent {
  readonly schemaVersion: 1;
  readonly ref: VersionRef;
  readonly serviceId: "service_first_embers_v1";
  readonly expectedDurationSeconds: number;
  readonly coalCells: readonly CoalCellDefinition[];
  readonly initialCoalCounts: readonly KeyValueNumber[];
  readonly cuts: readonly CutDefinition[];
  readonly sides: readonly SideDefinition[];
  readonly table: {
    readonly id: "table_soft_reopening";
    readonly coverIds: readonly string[];
    readonly synchronizationWindowTicks: number;
    readonly attentionTick: number;
  };
}

export interface GameRules {
  readonly schemaVersion: 1;
  readonly ref: VersionRef;
  readonly tickDurationMs: 250;
  readonly fixedPointScale: 1000;
  readonly numericLimit: number;
  readonly coalBudget: number;
  readonly coalCellCapacity: number;
  readonly ownCoalIntensityMilli: number;
  readonly neighborCoalIntensityMilli: number;
  readonly cookThresholdMilli: number;
  readonly searThresholdMilli: number;
  readonly riskToleranceMilli: number;
  readonly grillCapacity: number;
  readonly restCapacity: number;
  readonly sideCapacity: number;
  readonly ledger: {
    readonly tipsEnabled: false;
    readonly fuelCostCents: number;
    readonly scheduledLaborCostCents: number;
    readonly maintenanceCostCents: number;
    readonly hostAssistCourtesyCostCents: number;
    readonly sharedCourseCourtesyCostCents: number;
    readonly honestServiceCourtesyCostCents: number;
  };
}

export interface KeyValueNumber {
  readonly key: string;
  readonly value: number;
}

export interface HeatPathSegment {
  readonly cellId: string;
  readonly startedTick: number;
  readonly endedTick?: number;
  readonly orientation: Orientation;
  readonly bastingProfileId?: string;
  readonly rulesVersion: number;
}

export interface CutState {
  readonly id: string;
  readonly coverId: string;
  readonly status: CutStatus;
  readonly cellId?: string;
  readonly orientation: Orientation;
  readonly surfaceMilli: number;
  readonly coreMilli: number;
  readonly charMilli: number;
  readonly moistureMilli: number;
  readonly restMode?: RestMode;
  readonly restStartedTick?: number;
  readonly carvedAtTick?: number;
  readonly platedAtTick?: number;
  readonly quality?: CutQuality;
  readonly riskReason?: "RUNNING_HOT" | "REST_WINDOW";
  readonly heatPath: readonly HeatPathSegment[];
  readonly selectedCostRecognized: boolean;
  readonly recovered: boolean;
}

export interface SideState {
  readonly id: string;
  readonly coverId: string;
  readonly status: SideStatus;
  readonly startedTick?: number;
  readonly readyTick?: number;
  readonly platedAtTick?: number;
  readonly remakes: number;
  readonly costRecognized: boolean;
}

export interface TableState {
  readonly id: string;
  readonly status: TableStatus;
  readonly firstEligibleTick?: number;
  readonly calledAtTick?: number;
  readonly synchronized?: boolean;
  readonly recoveryChoice?: "SHARED_COURSE" | "SERVE_HONESTLY";
  readonly guestOutcome?: GuestOutcome;
}

export interface AttentionState {
  readonly status: AttentionStatus;
  readonly requestedAtTick?: number;
  readonly resolvedAtTick?: number;
}

export interface LedgerAccrual {
  readonly ingredientCostCents: number;
  readonly recoveryCourtesyCostCents: number;
  readonly wasteCostCents: number;
}

export interface HouseLedger {
  readonly currency: "house_cents";
  readonly tipsEnabled: false;
  readonly grossServiceRevenueCents: number;
  readonly ingredientCostCents: number;
  readonly fuelCostCents: number;
  readonly scheduledLaborCostCents: number;
  readonly recoveryCourtesyCostCents: number;
  readonly wasteCostCents: number;
  readonly maintenanceCostCents: number;
  readonly operatingResultCents: number;
}

export interface SettlementIntegrity {
  readonly replayDigest: string;
  readonly stateDigest: string;
}

export interface Settlement {
  readonly ledger: HouseLedger;
  readonly guestOutcome: GuestOutcome;
  readonly synchronized: boolean;
  readonly settledAtTick: number;
  readonly integrity?: SettlementIntegrity;
}

export interface GameEvent {
  readonly schemaVersion: 1;
  readonly eventId: string;
  readonly action: GameAction;
  readonly revisionBefore: number;
  readonly revisionAfter: number;
  readonly tickAfter: number;
  readonly changes: readonly string[];
  readonly ledgerDelta: LedgerAccrual;
}

export interface AcceptedActionRecord {
  readonly actionId: string;
  readonly actionHash: string;
  readonly event: GameEvent;
}

export interface ServiceState {
  readonly schemaVersion: 1;
  readonly serviceId: string;
  readonly serviceStatus: ServiceStatus;
  readonly paused: boolean;
  readonly revision: number;
  readonly currentTick: number;
  readonly rulesRef: VersionRef;
  readonly contentRef: VersionRef;
  readonly serviceSeed: string;
  readonly coalField: readonly KeyValueNumber[];
  readonly cuts: readonly CutState[];
  readonly sides: readonly SideState[];
  readonly table: TableState;
  readonly attention: AttentionState;
  readonly capacities: {
    readonly grill: number;
    readonly rest: number;
    readonly side: number;
  };
  readonly acceptedActionIds: readonly AcceptedActionRecord[];
  readonly nextActionSequence: number;
  readonly ledgerAccrual: LedgerAccrual;
  readonly hostAssistRemaining: number;
  readonly settlement?: Settlement;
}

export interface ActionPayloadMap {
  readonly OPEN_HOUSE: Record<string, never>;
  readonly INSPECT_PARTY: Record<string, never>;
  readonly SELECT_CUT: { readonly cutId: string };
  readonly PREVIEW_RAKE: {
    readonly sourceCellId: string;
    readonly targetCellId: string;
    readonly amount: number;
  };
  readonly APPLY_RAKE: {
    readonly sourceCellId: string;
    readonly targetCellId: string;
    readonly amount: number;
    readonly previewRevision: number;
  };
  readonly PLACE_CUT: { readonly cutId: string; readonly cellId: string };
  readonly MOVE_CUT: { readonly cutId: string; readonly cellId: string };
  readonly TURN_CUT: { readonly cutId: string };
  readonly APPLY_BASTE: { readonly cutId: string; readonly profileId: "HOUSE_BASTE" };
  readonly MOVE_TO_REST: { readonly cutId: string };
  readonly SET_REST_MODE: { readonly cutId: string; readonly mode: RestMode };
  readonly ADVANCE_SIDE: { readonly sideId: string; readonly operation: "START" | "PLATE" };
  readonly TEND_TABLE: { readonly response: "ACKNOWLEDGE" | "DEFER" };
  readonly CHOOSE_RECOVERY: {
    readonly targetType: "CUT" | "SIDE" | "TABLE" | "ATTENTION";
    readonly targetId: string;
    readonly choiceId:
      | "MOVE_TO_HOLD"
      | "CARVE_EARLY"
      | "RETURN_TO_HEAT"
      | "CLOCHE_HOLD"
      | "STAFF_MEAL"
      | "REMAKE_SIDE"
      | "DELAY_TABLE"
      | "HOST_ASSIST"
      | "SHARED_COURSE"
      | "SERVE_HONESTLY";
  };
  readonly CARVE_CUT: { readonly cutId: string };
  readonly CALL_THE_TABLE: Record<string, never>;
  readonly ADVANCE_TICK: { readonly ticks: 1 };
  readonly PAUSE_SERVICE: Record<string, never>;
  readonly RESUME_SERVICE: Record<string, never>;
  readonly SETTLE_SERVICE: Record<string, never>;
  readonly ABANDON_SERVICE: Record<string, never>;
}

export type ActionType = keyof ActionPayloadMap;

export type GameAction<T extends ActionType = ActionType> = T extends ActionType
  ? {
      readonly schemaVersion: 1;
      readonly actionId: string;
      readonly actionSequence: number;
      readonly expectedRevision: number;
      readonly issuedAtTick: number;
      readonly type: T;
      readonly payload: ActionPayloadMap[T];
    }
  : never;

export interface RakePreview {
  readonly previewRevision: number;
  readonly coalField: readonly KeyValueNumber[];
  readonly intensities: readonly KeyValueNumber[];
}

export type ReduceResult =
  | {
      readonly ok: true;
      readonly state: ServiceState;
      readonly event: GameEvent;
      readonly duplicate: boolean;
    }
  | {
      readonly ok: true;
      readonly state: ServiceState;
      readonly preview: RakePreview;
      readonly duplicate: false;
    }
  | {
      readonly ok: false;
      readonly state: ServiceState;
      readonly error: DomainError;
    };

export interface ReplayResult {
  readonly initialState: ServiceState;
  readonly state: ServiceState;
  readonly events: readonly GameEvent[];
  readonly replayDigest: string;
  readonly stateDigest: string;
}

export interface SaveEnvelope {
  readonly schemaVersion: 1;
  readonly saveId: string;
  readonly forkedFromSaveId?: string;
  readonly rulesRef: VersionRef;
  readonly contentRef: VersionRef;
  readonly initialState: ServiceState;
  readonly events: readonly GameEvent[];
  readonly state: ServiceState;
  readonly replayDigest: string;
  readonly stateDigest: string;
}
