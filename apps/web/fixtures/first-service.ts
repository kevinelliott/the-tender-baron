import type { FirstServiceFixture } from "@/lib/service-types";

export const firstServiceFixture = {
  fixtureVersion: "ui-fixture-v1",
  serviceId: "service_first_embers_v1",
  serviceTitle: "First Embers",
  occasion: "Four neighborhood regulars return for the soft reopening.",
  promise: "Serve all four covers together before the last tram.",
  canonicalTick: 1482,
  serviceStatus: "OPEN",
  rulesRef: "rules_first_service_v1",
  contentRef: "content_first_embers_v1",
  zones: [
    { id: "sear", label: "Sear", description: "Fierce surface progress", coalUnits: 3, pattern: "dense" },
    { id: "cook", label: "Cook", description: "Steady center progress", coalUnits: 2, pattern: "open" },
    { id: "hold", label: "Hold", description: "Gentle holding space", coalUnits: 1, pattern: "sparse" },
  ],
  covers: [
    { id: "A", label: "Cover A", cut: "Strip", target: "Rose center", targetShape: "diamond", side: "Ember shallot", status: "on-grill", zone: "sear", path: ["Sear", "Cook", "Rest"] },
    { id: "B", label: "Cover B", cut: "Strip", target: "Warm pink center", targetShape: "square", side: "Creamed greens", status: "on-grill", zone: "cook", path: ["Cook", "Turn", "Rest"] },
    { id: "C", label: "Cover C", cut: "Ribeye", target: "Rose center", targetShape: "diamond", side: "Smoked potato", status: "resting", zone: "rest", path: ["Sear", "Cook", "Open rest"] },
    { id: "D", label: "Cover D", cut: "Filet", target: "Warm pink center", targetShape: "square", side: "Brass-pan mushrooms", status: "tempering", zone: "case", path: ["Temper", "Sear", "Cook"] },
  ],
  sidesReady: 2,
  syncWindowTicks: 30,
  attention: {
    label: "Water for the table",
    detail: "Acknowledge within 18 ticks or ask the Baron to cover once.",
    status: "requested",
  },
  restSlots: [
    { id: "rest-1", label: "Rest slot one", coverId: "C", mode: "OPEN_REST", detail: "Carryover settling · carve window approaching" },
    { id: "rest-2", label: "Rest slot two", mode: "AVAILABLE", detail: "Available for the next cut" },
  ],
  ledgerPreview: [
    { label: "Menu revenue", cents: 14800 },
    { label: "Ingredients", cents: -4620 },
    { label: "Fuel", cents: -940 },
    { label: "Scheduled labor", cents: -5200 },
    { label: "Maintenance", cents: -620 },
  ],
} as const satisfies FirstServiceFixture;
