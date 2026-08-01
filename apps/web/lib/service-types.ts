import type { CutStatus, HeatBand, SideStatus } from "@tender-baron/game-domain";

export type ViewId = "room" | "fire" | "rest" | "pass";

export type HeatPlacement = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly coalUnits: number;
  readonly intensity: number;
  readonly band: HeatBand;
  readonly neighbors: readonly string[];
};

export type CoverView = {
  readonly id: "A" | "B" | "C" | "D";
  readonly coverId: string;
  readonly label: string;
  readonly cutId: string;
  readonly cut: string;
  readonly target: string;
  readonly targetShape: "diamond" | "square";
  readonly sideId: string;
  readonly side: string;
  readonly cutStatus: CutStatus;
  readonly sideStatus: SideStatus;
  readonly statusLabel: string;
  readonly cellId?: string;
  readonly path: readonly string[];
};

export type ServiceViewModel = {
  readonly serviceTitle: string;
  readonly occasion: string;
  readonly promise: string;
  readonly covers: readonly CoverView[];
  readonly placements: readonly HeatPlacement[];
  readonly sidesReady: number;
  readonly syncWindowTicks: number;
  readonly attention: {
    readonly label: string;
    readonly detail: string;
    readonly status: string;
  };
  readonly restSlots: readonly {
    readonly id: string;
    readonly label: string;
    readonly coverId?: CoverView["id"];
    readonly mode: string;
    readonly detail: string;
  }[];
  readonly ledgerPreview: readonly { readonly label: string; readonly cents: number }[];
  readonly cutsOnGrill: number;
};
