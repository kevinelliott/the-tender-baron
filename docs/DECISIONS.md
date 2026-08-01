# Decisions

This log records adopted product and engineering boundaries. Deferred decisions
are not implied capabilities.

## TB-D-001 — The first release is a walletless game

**Status:** adopted

The complete first service, house ledger, progression, and every mechanic that
changes play remain offchain. No wallet prompt or crypto vocabulary appears
before `SETTLED`.

## TB-D-002 — Profit means restaurant stewardship

**Status:** adopted

Profit is the fictional operating result of the house: menu revenue minus
ingredients, coal, scheduled staff, waste, recovery/comps, and maintenance.
Guest trust is a separate hospitality result; tips are absent from version 1.
Surplus is local, non-transferable, non-redeemable, and used only for authored
reinvestment. It is never a token balance or return claim.

## TB-D-003 — Phase 0 uses device authority for private play only

**Status:** adopted

The walletless prototype persists a versioned snapshot and canonical append-only
action log in local browser storage.

- Offline play is supported after the application and content pack load.
- Export produces one canonical save envelope containing schema/rules/content
  versions, snapshot, action log, and replay digest.
- Import validates every version, event, sequence, revision, digest, and content
  reference before creating a new local save.
- Delete removes the local snapshot, event log, settings, and private ledger.
- Guest-to-account migration is not implemented in Phase 0. A future account
  mode requires explicit preview and confirmation; it cannot silently claim or
  merge a local service.
- Divergent histories never auto-merge. The player chooses one branch or keeps
  both as labeled local forks.
- A local result is never described as issuer-verified profit, skill, service,
  provenance, or receipt eligibility.

A later trusted mode must be server-authoritative or server-verified, run the
same canonical reducer, and verify the complete event log. It requires a new ADR
before any issuer-attested receipt.

## TB-D-004 — The simulation is pure, fixed-tick, and replayable

**Status:** adopted

Version 1 uses a `250 ms` simulation tick. Runtime rules use integers or declared
fixed-point scales; floating point, wall time, animation frames, network, and
wallet state never decide an outcome. Actions carry stable IDs, consecutive
sequences, and expected revisions. Duplicate IDs are idempotent; stale,
skipped, or out-of-order actions fail without partial mutation.

## TB-D-005 — Coal Table and Service Theatre are interconnected views

**Status:** adopted

Kevin selected Coal Table and Service Theatre as interconnected interfaces in
Buzz event `0e2462904b58714c3a4cb6c81e7ef63e776088c72a524436482ec97cb20cc0bf`.
Coal Table owns close firecraft, heat paths, rest, and carving. Service Theatre
owns the four-guest occasion, sides, attention, and whole-table pass. Both read
and mutate one canonical reducer state; view changes advance no time, reroll no
content, and duplicate no action. The service-score rail is connective timing
language, not a third dashboard or a single-page requirement. The exploratory
mock images remain explicitly unapproved as literal implementation comps.

## TB-D-006 — Failure produces recovery, not punishment loops

**Status:** adopted

Every first-service miss offers at least one truthful recovery and no essential
window is under five seconds. Staff meal, rework, remake, compost, and served
food remain distinct dispositions. Ordinary play never destroys a scarce owned
item, creates a debt spiral, or offers a paid rescue.

## TB-D-007 — Token identity never follows semantics

**Status:** adopted

Any future onchain asset is identified by full chain, contract, and token or
receipt identity under a manifest-verified allowlist. Names, symbols, slugs,
images, culinary meaning, and arbitrary NFTs grant no recognition or power.

## TB-D-008 — The first eligible chain feature is one receipt

**Status:** deferred until the walletless vertical passes

The earliest candidate is one optional account-bound commemorative receipt
after `Close the book`. It has no token input, burn, reserve, lock, power,
redemption, cash-out, or marketplace dependency. Its public payload must be a
privacy-minimized opaque commitment rather than a service record.

## TB-D-009 — Shared identity does not create a shared economy

**Status:** adopted

An optional cross-title passport may later carry preferences, account-bound
stamps, and allowlisted cosmetic cameos. It never shares currency, kitchen
inventory, recipes, power, reputation, pricing, discounts, score, leaderboards,
or progression.

## TB-D-010 — Localnet is ordinary; Shadownet is an explicit gate

**Status:** adopted for future chain work

Ordinary development uses the shared loopback-only Tezos Localnet. Shadownet is
an explicit final-rehearsal environment for the exact candidate. Development
commands cannot select Mainnet. Mainnet needs a separate product decision,
threat model, audit, deployment manifest, incident plan, and go/no-go.

## TB-D-011 — The Baron is a host, not an extraction fantasy

**Status:** adopted

The Baron is gracious, attentive, and lightly theatrical. The game rejects land
conquest, cattle-empire growth, staff exploitation, wealth worship, and guest
stereotyping. Labor cost never becomes a mechanic for squeezing staff;
reinvestment includes staff care.

## TB-D-012 — Original GitHub `main` is the snapshot authority

**Status:** adopted

Milestones publish from a signed feature-branch commit through a pull request to
<https://github.com/kevinelliott/the-tender-baron>. A pushed branch or open PR is
review evidence, not the canonical snapshot. After merge, fetch the original
remote, verify the exact `origin/main` commit and required human trailers, and
align the local baseline. Reports distinguish branch, PR, merged-main, deployed
runtime, and device evidence.

## Explicitly undecided

- trusted account/server architecture and hosting;
- account recovery and local-to-account migration;
- whether any receipt is necessary after player research;
- contract standard and transfer policy for a possible receipt;
- transferable decor, marketplace, custody, consumption, cross-chain support,
  and Mainnet;
- public-launch menu breadth and final production art scope.
