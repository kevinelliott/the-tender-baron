# Technical Specification

## 1. Architecture boundary

Phase 0 is a client-only, installable web game with three separately testable
layers:

```text
versioned content pack
        ↓ validate
pure service reducer ← canonical actions
        ↓ snapshot + canonical event log
responsive presentation and local persistence
```

The presentation cannot mutate game state directly. It submits a typed action
to the reducer, renders the accepted state, and records the accepted canonical
event. Persistence, export, analytics, audio, animation, network, and any future
wallet adapter are effects outside the reducer.

No Phase 0 runtime endpoint, contract, indexer, wallet SDK, or public RPC is
required. A future server verifier must execute the same reducer and content
pack; it may not trust a browser-supplied ledger total, score, settlement state,
or receipt claim.

## 2. Versioned packages

The planned application packages are:

- `app`: Next.js route shell, accessibility, responsive presentation, and local
  save orchestration;
- `game-domain`: schemas, reducer, invariants, canonical serialization, and
  replay;
- `game-content`: authored first-service data and build-time validation;
- `game-testing`: golden replays, property/fuzz generators, and accessibility
  fixtures.

Module boundaries are one-way: `game-domain` imports no framework, browser,
storage, clock, random, network, analytics, or wallet API.

## 3. Simulation clock and numeric rules

- `tickDurationMs = 250` for rules version 1.
- Gameplay time advances only through accepted `ADVANCE_TICK` actions, each of
  which advances exactly one tick.
- Pausing, backgrounding, rendering slowly, or reloading advances zero ticks.
- Quantities are signed or unsigned integers with declared bounds.
- Fractional domain values use named integer scales, such as
  `thermal_milli` and `quality_milli`; each schema records its scale.
- Runtime `number` values must remain inside JavaScript safe-integer range.
- Content validation rejects floats, NaN-like strings, overflow, negative
  values where prohibited, ambiguous units, and undeclared scales.

The presentation clock is a scheduler, not an authority. While service is
active it maps a monotonic capture timestamp to the next canonical tick, emits
one serialized `ADVANCE_TICK` per due tick, then enqueues the captured player
action. A delayed render may delay display but cannot regroup, skip, or reorder
tick bytes. Pause, background, reload, and an open explanation stop scheduling
and reset the monotonic anchor on resume; inactive elapsed time is discarded.
All actions pass through the same single-writer queue.

Thermal values are game units, not real-world food-safety instructions. Public
copy must not turn the model into cooking or handling advice.

## 4. Canonical state envelope

```text
ServiceState {
  schemaVersion,
  serviceId,
  serviceStatus,
  revision,
  currentTick,
  rulesRef,
  contentRef,
  serviceSeed,
  coalField,
  cuts,
  sides,
  tables,
  attention,
  capacities,
  acceptedActionIds,
  nextActionSequence,
  settlement?
}
```

The service ID is a local opaque identifier. It never appears in a future
public receipt. `serviceSeed` may select an authored dialogue or attention
variant only; it cannot alter cooking rules, prices, costs, recovery, or value.

Every collection with semantic order uses an array. Every map with no semantic
order is encoded as a sorted array of key/value records before hashing.

## 5. Canonical action envelope

```text
GameAction {
  schemaVersion,
  actionId,
  actionSequence,
  expectedRevision,
  issuedAtTick,
  type,
  payload
}
```

Action types for the first vertical:

- `OPEN_HOUSE`
- `INSPECT_PARTY`
- `SELECT_CUT`
- `PREVIEW_RAKE`
- `APPLY_RAKE`
- `PLACE_CUT`
- `MOVE_CUT`
- `TURN_CUT`
- `APPLY_BASTE`
- `MOVE_TO_REST`
- `SET_REST_MODE`
- `ADVANCE_SIDE`
- `TEND_TABLE`
- `CHOOSE_RECOVERY`
- `CARVE_CUT`
- `CALL_THE_TABLE`
- `ADVANCE_TICK`
- `PAUSE_SERVICE`
- `RESUME_SERVICE`
- `SETTLE_SERVICE`
- `ABANDON_SERVICE`

Preview actions never mutate the canonical service. Apply actions include the
preview revision and fail if state changed in between.

## 6. Reducer contract

```text
reduce(previousState, action, pinnedRules, pinnedContent)
  -> { state, event } | { error }
```

The reducer must:

1. validate the envelope and pinned references;
2. return the prior accepted event for a duplicate `actionId`;
3. reject a reused ID with different canonical bytes;
4. reject skipped, stale, or out-of-order sequence/revision values;
5. validate the action against the current state machine and capacity rules;
6. apply one atomic transition;
7. derive coal, heat, rest, side, table, recovery, and ledger consequences;
8. increment the revision and next sequence exactly once;
9. return a canonical event describing accepted input and derived result.

An error never partially changes state or consumes an action sequence.

## 7. Canonical bytes and replay digest

Canonical serialization uses UTF-8 JSON with:

- keys sorted lexicographically at every object level;
- arrays preserved in semantic order;
- integers only for domain numbers;
- no insignificant whitespace;
- Unicode strings normalized to NFC;
- absent optional fields omitted rather than serialized as `undefined`;
- explicit `null` only where the schema declares it.

The settlement digest is SHA-256 over a domain-separated envelope:

```text
"tender-baron/replay/v1" ||
canonical(rulesRef) ||
canonical(contentRef) ||
canonical(initialState) ||
canonical(acceptedEvents)
```

The final state and ledger are recomputed during replay; they are not trusted
inputs to the digest. The settled envelope records both digest and resulting
state hash so corruption and reducer drift are distinguishable.

## 8. Persistence, export, and recovery

The Phase 0 adapter uses IndexedDB and writes:

- last durable snapshot;
- every accepted event after that snapshot;
- pinned content/rules references;
- replay and state digests at settlement;
- local settings in a separate record.

Writes use one transaction per accepted action. On startup, the adapter loads
the snapshot and replays the tail before exposing the service. A torn,
unreadable, or mismatched tail is quarantined; the last verified snapshot is
offered without silently claiming later progress.

Export is a user-initiated JSON envelope. Import creates a new local fork after
schema, bounds, content, sequence, reducer, and digest validation. Import never
overwrites an existing save and never makes a local service issuer-verified.

Delete removes service snapshots, logs, private ledger data, settings, and
imported forks from the device. Browser or operating-system backups are outside
the application's deletion authority and must be described honestly if a later
account product is introduced.

## 9. Phase 0 stable failure codes

| Code | Meaning |
| --- | --- |
| `TB_SCHEMA_UNSUPPORTED` | schema version is unsupported |
| `TB_RULES_MISMATCH` | pinned rules are unavailable or changed |
| `TB_CONTENT_MISMATCH` | content reference or hash is unavailable or changed |
| `TB_ACTION_ID_CONFLICT` | an action ID was reused with different bytes |
| `TB_ACTION_SEQUENCE` | sequence is skipped, stale, or out of order |
| `TB_STATE_REVISION` | preview or action targets a stale revision |
| `TB_ACTION_NOT_ALLOWED` | action is illegal in the current state |
| `TB_CAPACITY_EXCEEDED` | grill, rest, side, or pass capacity is unavailable |
| `TB_PREVIEW_STALE` | apply no longer matches its preview |
| `TB_TICK_RANGE` | a tick action attempts anything other than one tick |
| `TB_NUMERIC_RANGE` | integer or fixed-point value would overflow its bounds |
| `TB_REPLAY_DIVERGED` | replay state differs from the recorded verified state |
| `TB_DIGEST_MISMATCH` | canonical bytes do not match the expected digest |
| `TB_SAVE_CORRUPT` | local snapshot or event tail cannot be verified |
| `TB_IMPORT_REJECTED` | imported envelope fails validation |
| `TB_SETTLEMENT_INCOMPLETE` | service cannot settle from its current state |
| `TB_AUTHORITY_UNVERIFIED` | a trusted claim was requested from a local result |

User copy explains cause, current truth, and recovery without exposing raw
exceptions as instructions.

## 10. Verification matrix

- Golden replays cover exact first-service paths and every heat/rest boundary.
- A 1,000-run test replays the same canonical log to byte-equivalent state,
  ledger, event bytes, and digest.
- Property/fuzz tests cover duplicate IDs, stale revisions, missing sequences,
  out-of-order input, pause/resume, save/load, import, and numeric bounds.
- Clock-adapter tests vary render cadence for the same monotonic input timeline
  and require identical accepted `ADVANCE_TICK`/input event bytes.
- Reducer tests prove frame rate, render order, locale, time zone, network,
  wallet state, and animation settings do not affect results.
- Content validation proves at least one successful deterministic path and one
  recovery path through the first service.
- Browser tests cover background/reload recovery and storage failures without
  inventing a completed or settled result.

## 11. Future chain boundary

Wallet, registry, manifest, receipt, and indexer modules are separate future
adapters. They consume only a server-verified receipt eligibility record, never
the local ledger or browser assertion. Final dispatch must synchronously
revalidate runtime generation, session revision, account, chain, scope,
destination, entrypoint, amount, canonical payload bytes, manifest, intent, and
expiry with no intervening await. Any drift yields zero sends.
