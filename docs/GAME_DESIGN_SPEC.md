---
title: "The Tender Baron Game Design Specification"
tags: [the-tender-baron, game-design, restaurant-games, stewardship, first-service]
status: active
created: 2026-07-31
---

# Decision summary

The first playable vertical is one authored four-guest dinner table completed in
guest mode in 8–12 minutes. The player reads the occasion, shapes a three-zone
coal bed, staggers four cuts with different thermal profiles, uses resting time
to finish sides and tend the table, carves, and delivers all four covers inside
one synchronization window.

The game is deterministic. Heat, duration, placement, movement, rest, and
service order produce the outcome. Pressure comes from finite space and promises
made to a whole table—not hidden randomness, dexterity gates, or generic
patience bars.

Profit is a truthful, local restaurant operating result. The close-of-service
ledger reconciles revenue, food, fuel, labor, recovery, and waste. Surplus may be
reinvested in the staff, menu, equipment, and house, but it is not transferable,
tokenized, redeemable, passive, or presented as financial return.

# 1. Player fantasy and tone

The player is the Baron's new fire captain and eventual successor: part grill
craftsperson, part dining-room conductor, part caretaker of a faded storybook
steakhouse.

The fantasy is:

> Read the room. Shape the fire. Keep the promise.

The Baron is a gracious host and teacher. He is warm, observant, lightly
theatrical, and willing to absorb a difficult night without shaming the player.
He is never a cattle magnate, conqueror, butcher caricature, gambling host,
celebrity-chef tyrant, or mouthpiece for token value.

The game celebrates:

- care under pressure;
- legible craft and improvement;
- feeding a whole table at the right moment;
- staff welfare and responsible purchasing;
- restoring a place because people value gathering there.

It does not celebrate extraction, conspicuous wealth, animal gore, scarcity
theater, grinding, speculation, or maximizing revenue at guests' expense.

# 2. Mechanical fingerprint

## Core verbs

`inspect`, `select`, `temper`, `rake`, `place`, `sear`, `turn`, `move`, `baste`,
`rest`, `hold`, `carve`, `pair`, `pace`, `attend`, `recover`, and `reinvest`.

## Player decisions

1. **Fire topology:** where finite coals create sear, cook, and holding zones.
2. **Thermal route:** which zone each cut occupies and for how long.
3. **Capacity:** which cut receives scarce hot space, rest space, and attention.
4. **Pacing:** when to begin sides and when to answer a table need.
5. **Recovery:** how to preserve hospitality when one promise slips.
6. **Stewardship:** what the house can afford and what it should improve next.

## Sources of pressure

- grill and resting capacity;
- different thickness, marbling, and target profiles;
- carryover during rest;
- sides whose ready windows must meet the cuts;
- one table-level occasion and one optional attention event;
- visible food, fuel, labor, comp, and waste consequences.

There is no hidden quality roll. Authored guest variation changes the planning
problem, never the truth of the simulation.

## Explicit differentiation

| Game | Mechanical center | Pressure shape | Result reveal |
| --- | --- | --- | --- |
| Dos Esposas | ingredient composition and explicit transformation consequences | inventory and commitment | resulting asset/dish and its disposition |
| Samurai Sushi | ordered station craft and intimate counter pacing | sequence, counter space, and individual guest attention | plate and guest response |
| The Tender Baron | coal topology, thermal routes, active rest, and whole-table synchronization | finite heat/rest capacity and shared promises | carved cross-sections plus table-level service outcome |

The Tender Baron must not inherit a cantina workbench, sushi station sequence,
rapid ticket queue, token-inventory puzzle, or individual patience-bar loop.

# 3. First service: 8–12 minute authored vertical

## Scenario

**Service ID:** `service_first_embers_v1`

**Occasion:** Four neighborhood regulars return for the house's soft reopening.
They want to eat together and leave in time for the last tram. Their shared pace
and synchronization promise are shown before the player commits the cuts.

**Fixed order:**

| Cover | Cut | Thermal character | Target | Side |
| --- | --- | --- | --- | --- |
| A | strip | medium thickness, quick surface response | rose center | ember shallot |
| B | strip | medium thickness, quick surface response | warm pink center | creamed greens |
| C | ribeye | broad, marbled, slower center response | rose center | smoked potato |
| D | filet | thick, lean, strong carryover | warm pink center | brass-pan mushrooms |

Target language is shown with words, a cross-section diagram, and a shape marker;
it never depends on color alone. Temperatures and durations are accelerated game
abstractions, not real-world cooking guidance.

**Available spaces:** four service placements within a small irregular coal
field, two rest slots, two side slots, and one shared table-attention lane.

**Coal budget:** six coal units. The onboarding target creates three labeled
zones: `SEAR`, `COOK`, and `HOLD`. Dragging is optional; focus + arrow, tap +
destination, and direct zone controls provide equivalent placement.

## Beat sheet

| Elapsed target | Beat | Player learning |
| ---: | --- | --- |
| 0:00–0:45 | The Baron opens the room and introduces the returning table. | The goal is a shared occasion, not four independent timers. |
| 0:45–1:45 | Inspect the order and compare cut cards. | Thickness, thermal character, target, side, and pace are visible commitments. |
| 1:45–2:45 | Rake six coals into three labeled zones. | Heat is topology; the same coal budget can create different paths. |
| 2:45–4:15 | Temper, place, and stagger filet, ribeye, then the strips. | Different cuts should not start together merely because they serve together. |
| 4:15–5:45 | Turn or move cuts as surface/core indicators advance. | Movement changes a recorded, inspectable heat path. |
| 5:45–7:00 | Move the first cuts to two rest slots and start sides. | Resting is active planning time with finite capacity. |
| 7:00–8:15 | Resolve one table-attention beat and align remaining sides. | Hospitality consumes attention but does not pause the fire. |
| 8:15–9:15 | Carve previews expose deterministic cross-sections; choose any recovery. | The result comes from prior choices, and mistakes create decisions. |
| 9:15–10:15 | Plate and serve all four covers within the shared window. | A perfect individual cut can still miss the table promise. |
| 10:15–11:30 | Read guest feedback and reconcile the house ledger. | Care, cost, waste, trust, and surplus are distinct results. |
| 11:30–12:00 | Choose one restoration and reach `SETTLED`. | Progress is a meaningful choice, not a repeated claim loop. |

The tutorial pauses simulation fully while an explanation is open. Dismissing
the explanation resumes from the same canonical tick; there is no slow-time
mode, invisible modal progress, or time-scale action in rules version 1.

## Guidance policy

- The first coal placement has a suggested shape but accepts any valid layout.
- The first cut placement previews projected surface and core direction.
- Later moves show consequences, not a single commanded answer.
- No essential action window is under five seconds.
- The service cannot enter an unrecoverable state before the carving beat.
- The player may pause, inspect every path, or restart without losing currency,
  progression, owned items, or reputation.
- Wallet, token balance, provenance, rarity, marketplace, and network terms do
  not appear before `SETTLED`.

# 4. Deterministic fire and rest model

## Simulation contract

Every service pins `contentVersion`, `rulesVersion`, `serviceSeed`, and the full
authored party definition. `serviceSeed` may select an authored dialogue variant
or attention beat, but it must not alter cooking rules, prices, costs, recovery
effects, or reward value.

Each accepted action applies pure rules to immutable prior state:

```text
reduce(previousState, action, pinnedRules, pinnedContent)
  -> { state, event } | { error }
```

`pinnedRules` declares an integer `tickDurationMs`; rendering time and wall-clock
time never enter the reducer. A serial clock adapter emits canonical
`ADVANCE_TICK` actions one tick at a time while the service is active; due ticks
are enqueued through an input's monotonic capture time before that input. The
adapter reanchors after pause, background, or reload and never catches up time
spent inactive. Every accepted action has a stable
`actionId`, monotonically increasing `actionSequence`, expected state revision,
and canonical byte encoding. Duplicate action IDs are idempotent; skipped,
stale, or out-of-order sequences fail without partial mutation.

The ordered action log plus pinned content must reproduce a byte-equivalent
final gameplay and ledger result on every supported device. `SETTLED` stores a
`replayDigest` over the canonical rules, content, initial state, and action log.

For the walletless prototype, device-local state is authority only for the
player's private service and progression. It is not issuer-verified proof of
profit, skill, or service outcome. Persistence, export/import, deletion,
offline behavior, guest-to-account deferral, and no-silent-merge conflict rules
are adopted in [`DECISIONS.md`](DECISIONS.md#tb-d-003-phase-0-uses-device-authority-for-private-play-only)
and specified in [`TECHNICAL_SPEC.md`](TECHNICAL_SPEC.md#8-persistence-export-and-recovery).
Any later server-authoritative mode must run the same reducer and verify the
canonical log rather than trusting a browser-supplied score or ledger total.

## Heat path

Each cut records append-only path segments:

```text
HeatPathSegment {
  zoneId,
  startedTick,
  endedTick,
  orientation,
  bastingProfileId?,
  rulesVersion
}
```

The rules derive four inspectable values:

- `surfaceProgress`;
- `coreProgress`;
- `moistureRetention`;
- `charProgress`.

Zone intensity, cut thickness, cut conductivity profile, orientation, elapsed
ticks, and prior state determine the values. Thresholds come from the pinned cut
and target profiles. Floating-point behavior must not determine an outcome;
runtime implementations use integers or fixed-point arithmetic.

## Coal topology

- The map is a small integer grid.
- Each cell has a coal count bounded by content rules.
- Intensity derives from its own coals plus explicitly defined orthogonal
  adjacency; there is no invisible diagonal propagation.
- Raking moves existing coals. It never creates fuel for free.
- Coal decay is deterministic and previewed before service.
- Any relight or added-fuel action states its in-game fuel cost before commitment.

## Rest model

Resting is a state with choices, not a passive animation:

- a cut entering rest has a previewed ideal carve window;
- carryover is deterministic from its grill exit state and rest profile;
- the player chooses a rest slot and may choose `OPEN_REST` or `CLOCHE_HOLD`;
- `OPEN_REST` preserves the best texture window but has a shorter serving range;
- `CLOCHE_HOLD` widens the serving range with a visible surface-quality tradeoff;
- carving commits the current cross-section and ends carryover;
- the player works on sides and hospitality while rest advances.

No repeated tapping, shaking, swiping, or invisible timing bonus improves rest.

## Synchronization

A table's delivery window opens when the first cover becomes service-eligible.
The pass shows every cover's current serve range, hold cost, missing component,
and recovery state. `CALL_THE_TABLE` becomes available when service is possible,
not only when perfect; it atomically commits all eligible covers or invokes an
explicit content-authored partial-course recovery.

The first service succeeds at its central promise when `CALL_THE_TABLE` serves
all four covers inside a content-defined 30-tick window. The value is displayed
before the first cut is committed and remains inspectable. Waiting may align the
table or may push an early cover out of its best range, so an imperfect call can
be the honest recovery.

Synchronization is one outcome dimension alongside cut accuracy, side quality,
and hospitality. A missed window changes feedback and may change recovery cost;
it does not erase the service, zero all progress, or destroy an item.

# 5. State machines

## Service

```text
DORMANT -> BRIEFING -> SETUP -> OPEN -> CLOSING -> SETTLED
              \----------\----------\-> ABANDONED
```

- `BRIEFING`: party, occasion, menu, pace, costs, and capacities are inspectable.
- `SETUP`: menu commitments and coal topology may change.
- `OPEN`: table, food, side, attention, and recovery submachines run.
- `CLOSING`: no new cooking starts; results and ledger are reconciled.
- `SETTLED`: durable gameplay result and progression choices are committed.
- `ABANDONED`: local service is closed without fabricated success or loss of any
  separately owned item.

No wallet CTA or ownership branch is interactive before `SETTLED`.

## Table

```text
RESERVED -> SEATED -> PROMISE_REVIEWED -> ORDER_COMMITTED -> IN_SERVICE
        -> READY_TO_DELIVER -> DELIVERED -> RESOLVED
                                  \-> RECOVERY_REQUIRED -> DELIVERED
```

## Cut

```text
CASE -> SELECTED -> TEMPERING -> ON_GRILL -> RESTING -> READY_TO_CARVE
     -> CARVED -> PLATED -> SERVED

ON_GRILL/RESTING/READY_TO_CARVE -> AT_RISK -> RECOVERY_SELECTED
RECOVERY_SELECTED -> ON_GRILL | RESTING | CARVED | STAFF_MEAL | COMPOSTED
```

`AT_RISK` is explanatory and never silently chooses a recovery. `STAFF_MEAL`
and `COMPOSTED` remain visible ledger dispositions and cannot masquerade as
guest service.

## Side

```text
PLANNED -> STARTED -> READY -> HELD -> PLATED -> SERVED
                    \-> RECOVERY_REQUIRED -> REMADE | REWORKED | SERVED
```

## Attention

```text
QUIET -> REQUESTED -> ACKNOWLEDGED -> RESOLVED
                  \-> DEFERRED -> RESOLVED | MISSED
```

An attention request states its consequence and maximum deferral. It cannot
hide the grill, trap focus, or require abandoning an irreversible action.

## Persistence boundaries

Durable local snapshots occur on entry to `SETUP`, `OPEN`, each cut's
`RESTING`, `CLOSING`, and `SETTLED`. Reload restores the latest boundary plus
the ordered action log required to reconstruct intervening deterministic state.
Elapsed wall-clock time while closed does not advance service simulation.

# 6. Failure and recovery catalog

Every recoverable condition offers two or more legible choices whose gameplay,
guest, waste, and ledger consequences are previewed.

| Condition | Recovery A | Recovery B | Prohibited behavior |
| --- | --- | --- | --- |
| Cut is running hot | move to `HOLD`, accepting slower surface progress | carve early and offer a clearly named sliced presentation if content allows | hidden reroll or paid quality rescue |
| Cut exits under target | return to `COOK`, spending table time | slice and finish only when a reviewed recipe explicitly permits it | pretending the original target was met |
| Rest window will miss the table | use `CLOCHE_HOLD`, widening time with visible quality cost | serve in two announced courses with hospitality/reputation tradeoff | invisible timer extension |
| Side is late | remake/expedite with explicit food and labor cost | transparently delay the table and offer a house courtesy | charging the player real currency |
| Wrong cut selected | reassign only if it satisfies another cover exactly | make a staff meal and select again, recording cost | erasing inventory/cost history |
| Attention request deferred | acknowledge and set a visible return promise | ask the Baron to cover it, consuming one finite mentor assist | random guest anger |
| Table misses sync window | serve honestly with specific feedback | invoke a content-authored shared-course recovery before delivery | service wipe or generic one-star punishment |

## First-service safety net

The Baron has one finite `HOST_ASSIST` in the onboarding service. It may resolve
the table-attention beat or slow the simulation while the player inspects an
at-risk cut. It never cooks a cut automatically, changes its thresholds, hides a
cost, or remains as a permanent power upgrade.

The first service always reaches `CLOSING` unless the player explicitly abandons
it. A poor result still produces specific feedback, a truthful ledger, and one
no-cost foundational restoration. The player is invited to replay a different
coal plan, not grind to repair a punishment spiral.

# 7. Stewardship economy

## Results hierarchy

The close presents results in this order:

1. the table's occasion and specific guest feedback;
2. craft: target accuracy, rest quality, sides, and synchronization;
3. hospitality: promises kept, attention, and recovery honesty;
4. house ledger: revenue, costs, waste, and operating result;
5. one reinvestment choice or next lesson.

Money never replaces guest or craft outcomes as the headline score.

## Ledger

The service ledger reconciles in local, non-transferable `house_cents`:

```text
grossServiceRevenue
- ingredientCost
- fuelCost
- scheduledLaborCost
- recoveryCourtesyCost
- wasteCost
- maintenanceCost
= operatingResult
```

Rules:

- all line items are integer minor units;
- prices and committed costs are visible during `BRIEFING`;
- ingredient cost is recognized when a cut/side is committed to service;
- reassignment does not duplicate cost, while a remake does;
- `STAFF_MEAL`, `REWORKED`, and `COMPOSTED` are distinct dispositions;
- tips, token rewards, resale value, APY, floor price, and real-world exchange
  value are absent;
- guest reputation cannot be bought;
- operating result cannot be withdrawn, transferred, traded, or redeemed;
- no offline/passive earnings accrue;
- difficulty cannot be bypassed by purchasing a higher-margin cut or collectible.

## Waste and humane recovery

Waste is visible because stewardship requires truth, but it is not moralized as
player shame. Suitable food may become a staff meal or reviewed next-day
component; unsafe or unusable food is composted/discarded. The game never
encourages serving an unfit dish to protect margin.

## Loss protection

The house begins each chapter with a disclosed operating reserve. A weak service
reduces available optional spending but never creates real debt, negative token
balances, compounding interest, daily-login pressure, or an unrecoverable save.
If the reserve reaches its floor, the Baron offers a fixed-cost community supper
scenario that teaches fundamentals and restores playability without ads,
purchases, wallet actions, or repetition requirements.

## Reinvestment

Reinvestment categories are:

- `STAFF`: care, story scenes, scheduling options, and accessibility in-world;
- `HOUSE`: rooms, fixtures, ambience, and new table topologies;
- `FIRE`: alternative grill/rest layouts with explicit capacity tradeoffs;
- `MENU`: new cuts, plant-forward mains, sides, sauces, and course structures;
- `NEIGHBORHOOD`: supplier relationships and authored guest events.

An upgrade may broaden options or change constraints. It must not multiply
token yield, generate passive income, produce an unbeatable strategy, or require
an onchain asset.

# 8. Progression without grind

## House chapters

1. **First Embers:** reopen the main room; learn coal, rest, and one table.
2. **The Carving Cart:** add tableside carving and two-course timing.
3. **The Oak Room:** introduce two concurrent tables and occasion conflicts.
4. **The Cellar Door:** add pairing, menu composition, and supplier tradeoffs.
5. **The Open House:** conduct a full evening and choose the house's lasting
   identity.

## Mastery threads

- **Firecraft:** understanding topology and thermal routes.
- **Rest & Rhythm:** carryover, hold choices, sides, and synchronization.
- **Hospitality:** occasion, attention, accessibility, and honest recovery.
- **Stewardship:** purchasing, waste, labor, reserves, and reinvestment.

Mastery is private and descriptive. It is not a public rank, token multiplier,
leaderboard, daily streak, battle pass, or competitive power score.

## Unlock contract

- A chapter requires authored learning outcomes and story flags, not currency
  alone.
- Repeating the same service beyond its learning objective is never mandatory.
- A successful service advances at most one previewed major house milestone.
- A failed lesson receives a targeted replay or alternate scenario, not a full
  chapter reset.
- Cosmetic choices can be revisited; no scarcity clock or fear-of-missing-out
  rotation controls ordinary progression.
- New equipment changes topology and tradeoffs. It does not secretly improve
  all thermal curves or quality thresholds.

# 9. Content model

All gameplay content is data-authored, append-only by version, and validated
before runtime use.

```text
VersionedRef {
  id,
  version,
  contentHash
}

CutDefinition {
  id,
  version,
  contentHash,
  displayName,
  sourceCategory,
  thicknessClass,
  conductivityProfileRef,
  moistureProfileRef,
  targetProfileRefs[],
  portionCostCents,
  recoveryPolicyRefs[],
  allergenProfile,
  artKey,
  reviewIds[]
}

PlantMainDefinition {
  id,
  version,
  contentHash,
  displayName,
  thermalProfileRef,
  targetProfileRefs[],
  portionCostCents,
  recoveryPolicyRefs[],
  allergenProfile,
  artKey,
  reviewIds[]
}

CoalMapDefinition {
  id,
  version,
  width,
  height,
  coalBudget,
  cellCapacity,
  adjacencyRule,
  decayProfileRef,
  labeledZoneRules[],
  accessibilityLabels[]
}

ThermalProfile {
  id,
  version,
  fixedPointScale,
  surfaceRatesByIntensity,
  coreTransferRate,
  charRatesByIntensity,
  moistureRates,
  restCarryoverProfileRef
}

TargetProfile {
  id,
  version,
  displayName,
  accessibleDescription,
  surfaceRange,
  coreRange,
  moistureRange,
  charRange,
  crossSectionArtKeys[]
}

SideDefinition {
  id,
  version,
  contentHash,
  stationRequirement,
  durationTicks,
  readyWindowTicks,
  holdPolicy,
  portionCostCents,
  recoveryPolicyRefs[],
  allergenProfile,
  artKey
}

PartyDefinition {
  id,
  version,
  guestRefs[],
  occasionRef,
  sharedPace,
  synchronizationWindowTicks,
  coverOrders[],
  attentionBeatPoolRefs[],
  feedbackRules[],
  storyFlags[]
}

GuestDefinition {
  id,
  version,
  name,
  portraitStates,
  accessibleTells[],
  preferences[],
  dietaryNeeds[],
  dialoguePoolRefs[],
  continuingStoryFlags[]
}

RecoveryPolicy {
  id,
  version,
  triggerPredicate,
  allowedFromStates[],
  choices[],
  gameplayEffects,
  ledgerEffects,
  guestEffects,
  resultingDisposition,
  explanationCopy
}

ServiceDefinition {
  id,
  version,
  contentHash,
  rulesVersion,
  expectedDurationSeconds,
  partyRef,
  coalMapRef,
  capacityRules,
  availableMenuRefs[],
  tutorialBeats[],
  allowedRecoveryRefs[],
  ledgerPolicyRef,
  settlementRewards[],
  researchTags[]
}

LedgerPolicy {
  id,
  version,
  currency: "house_cents",
  tipsEnabled: false,
  laborCostCents,
  fuelCostRules,
  revenueRules,
  courtesyRules,
  wasteRules,
  maintenanceRules,
  reserveFloorCents
}

ProgressionNode {
  id,
  version,
  chapter,
  prerequisiteStoryFlags[],
  learningRequirements[],
  operatingRequirement?,
  choiceGroup?,
  unlockRefs[],
  reversibleCosmetic
}
```

## Validation

The content build rejects:

- dangling, cyclic, or unversioned references;
- duplicate stable IDs or changed content under an existing version/hash;
- floating-point thermal values;
- a target with no accessible non-color description;
- a cut, main, or side with no cost, art, allergen, or recovery policy;
- a recovery that does not declare gameplay, ledger, guest, and disposition
  effects;
- a service with insufficient grill/rest/side capacity to have at least one
  successful deterministic action path;
- a party whose required dishes cannot be produced from its menu;
- hidden or negative line items;
- a progression node reachable only through spending, wallet state, repeated
  daily play, or an owned asset;
- any ordinary content that assigns transferable value to `house_cents`,
  reputation, mastery, or restoration progress.

# 10. Interface and accessibility behavior required by gameplay

- Coal cells, cuts, rest slots, side slots, and table state have text labels and
  stable focus order.
- Every drag action has select/move, tap/destination, and keyboard alternatives.
- Heat intensity uses label, shape/hatch, and value; color is supplementary.
- Surface/core progress uses named states and accessible text, not gauges alone.
- Motion confirms an already-available state. It never carries unique timing or
  quality information.
- Reduced motion removes coal shimmer, smoke travel, carving flourish, and room
  camera drift while preserving all decisions and timing.
- Sound cues have equivalent visible and announced state changes; audio begins
  off by default.
- Pausing is always available outside the final confirmation of a chosen action.
- At 200% zoom and 320 CSS pixels, the player may switch between `FIRE`, `REST &
  SIDES`, and `TABLE` views without losing simulation state or context.
- Minimum pointer/touch target is 44×44 CSS pixels.
- Screen-reader announcements are throttled and prioritize: new risk, cut state
  change, rest window, side ready, attention request, and synchronization state.

# 11. Acceptance tests and release gates

## A. First-service product gates

1. In moderated formative testing, at least 6 of 8 representative first-time
   players reach `SETTLED` without facilitator takeover.
2. Median settled duration is 8–12 minutes; no included participant is removed
   from the denominator for abandonment or poor performance.
3. At least 6 of 8 can explain that cuts were started at different times so the
   whole table could eat together.
4. At least 6 of 8 can name one reason to rest a cut and one recovery tradeoff.
5. Enjoyment, clarity, and pressure are reported separately; operating result is
   never used as a proxy for fun.
6. No wallet/connect/token/marketplace prompt appears before `SETTLED`.

## B. Determinism and state gates

1. Replaying the same pinned content and ordered action log 1,000 times produces
   byte-equivalent final food, guest, progression, and ledger projections.
2. The simulation passes on two JavaScript engines or one engine plus an
   independent reference implementation using identical fixed-point fixtures.
3. Property tests cover every legal and illegal state transition.
4. Invalid backward transitions and actions against stale state revisions fail
   without partial mutation.
5. Pause/reload at every durable boundary restores the exact service; closed
   wall-clock time does not advance heat or guest state.
6. Abandonment never fabricates `SETTLED`, guest success, revenue, or progression.
7. Duplicate action IDs are idempotent; skipped, stale, and out-of-order action
   sequences produce zero mutation and a stable failure code.
8. The stored `replayDigest` changes when and only when canonical rules, content,
   initial state, or accepted action bytes change.

## C. Fire, rest, and synchronization scenarios

1. Two distinct coal layouts with the same coal budget yield their documented
   distinct intensity maps; adjacency has no hidden diagonal effect.
2. Moving one cut through `SEAR -> COOK -> REST` yields the exact golden fixture
   for surface, core, moisture, char, and cross-section.
3. Reversing two path segments changes only the documented outputs.
4. `OPEN_REST` and `CLOCHE_HOLD` produce their previewed windows/tradeoffs.
5. The known successful onboarding action fixture serves all covers inside the
   30-tick table window.
6. A fixture with one delayed side triggers the declared recovery choices and
   cannot soft-lock plating or delivery.
7. No random number, network response, wall-clock instant, frame rate, animation
   completion, or wallet state changes a food or ledger outcome.

## D. Recovery gates

1. Every authored at-risk condition has at least two valid choices or one valid
   choice plus an explicit abandon/restart path.
2. Recovery previews equal applied gameplay, guest, disposition, and ledger
   effects.
3. No recovery consumes real currency, owned assets, or an onchain action.
4. A staff meal, rework, compost, remake, and guest service remain distinct in
   event history and ledger projection.
5. The first service can always reach `CLOSING` after any valid non-abandon action
   sequence; explicit abandonment reaches only `ABANDONED`.

## E. Ledger and progression gates

1. For every settled or abandoned fixture, ledger lines reconcile exactly to
   operating result in integer `house_cents`.
2. Remakes add cost once; reassignments do not duplicate cost; discarded food
   cannot count as served revenue.
3. Reputation and mastery cannot be purchased or transferred.
4. No passive/offline yield, daily streak, time-limited scarcity, loot box,
   public wealth rank, or operating-result leaderboard exists.
5. Every chapter has a no-wallet, no-purchase path and does not require repeating
   one completed learning objective more than once.
6. A zero-reserve save remains recoverable through the authored community-supper
   path and never enters real or compounding debt.

## F. Accessibility and responsive gates

1. Full first service completes with keyboard only, touch only, and pointer only.
2. The service completes at 320×700, 390×844, 768×1024, and 1440×900 without
   horizontal overflow, clipped controls, or hidden simulation state.
3. At 200% zoom, all content reflows and the focused element remains visible.
4. Every coal, target, cut, side, rest, attention, and table state is
   distinguishable without color, motion, or sound.
5. Reduced motion and screen reader modes preserve deterministic timing and
   functional parity.
6. Automated checks find no target below 44×44 CSS pixels and no focus trap.

## G. Ownership-boundary gates for this lane

1. Removing every crypto noun leaves the full first service coherent.
2. Before `SETTLED`, gameplay has zero wallet/provider/network/contract calls.
3. No wallet state, token balance, cross-title passport, keepsake, or owned item
   changes heat, capacity, target windows, guest outcomes, costs, prices,
   recovery choices, or progression requirements.
4. Gameplay settlement remains valid when any later ownership action is rejected,
   times out, fails, or reorganizes.

# 12. First implementation slice

Build only enough to prove the signature interaction:

1. one responsive service screen with `ROOM`, `FIRE`, `REST`, and `PASS` views;
2. one small irregular coal field with four service placements, six movable
   coals, two rest slots, and two side slots;
3. the four fixed first-service covers and four sides;
4. fixed-point deterministic simulation plus append-only action log;
5. one authored attention beat and the recovery catalog needed by the service;
6. carving previews, `CALL_THE_TABLE`, guest feedback, and reconciled ledger;
7. one no-cost restoration choice and guest-mode durable resume;
8. automated deterministic, state, ledger, recovery, accessibility, and
   responsive tests.

Do not include a wallet, token contract, marketplace, generalized asset
inventory, cross-title import, procedural guest generation, multiple rooms,
live economy, or public leaderboard in this slice.

# Sources and evidence

The originating brief, delegation, specialist reports, shared restaurant-group
canon, sibling repository snapshots, and exact file hashes used by this
specification are recorded in [`SOURCE_NOTES.md`](SOURCE_NOTES.md). Product
constraints in [`../PRODUCT.md`](../PRODUCT.md) remain controlling if a source
snapshot later changes.
