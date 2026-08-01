export type ViewId = "room" | "fire" | "rest" | "pass";

export type HeatZone = {
  id: "sear" | "cook" | "hold";
  label: string;
  description: string;
  coalUnits: number;
  pattern: "dense" | "open" | "sparse";
};

export type Cover = {
  id: "A" | "B" | "C" | "D";
  label: string;
  cut: string;
  target: string;
  targetShape: "diamond" | "square";
  side: string;
  status: "on-grill" | "resting" | "tempering" | "side-needed";
  zone: HeatZone["id"] | "case" | "rest";
  path: readonly string[];
};

export type FirstServiceFixture = {
  fixtureVersion: string;
  serviceId: string;
  serviceTitle: string;
  occasion: string;
  promise: string;
  canonicalTick: number;
  serviceStatus: "OPEN";
  rulesRef: string;
  contentRef: string;
  zones: readonly HeatZone[];
  covers: readonly Cover[];
  sidesReady: number;
  syncWindowTicks: number;
  attention: {
    label: string;
    detail: string;
    status: "requested";
  };
  restSlots: readonly {
    id: string;
    label: string;
    coverId?: Cover["id"];
    mode: "OPEN_REST" | "AVAILABLE";
    detail: string;
  }[];
  ledgerPreview: readonly { label: string; cents: number }[];
};
