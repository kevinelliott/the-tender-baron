# Delivery Plan

## Current state

The repository began empty. The current branch is a foundation branch with
product and implementation contracts only. No application, runtime, reducer,
content pack, test suite, contract, wallet integration, deployment, or public
release exists yet.

## Gate 0 — Foundation

### Deliverables

- product truth and non-goals;
- first-service game and domain specification;
- approved responsive composition and design specification;
- deterministic reducer, canonical event, persistence, replay, and failure
  contracts;
- stewardship economy and progression invariants;
- content/tone, security, privacy, and interoperability boundaries;
- authority ADR and Phase 0 stable failure codes;
- delivery and evidence model;
- resolved internal links and a README that describes the full lifecycle.

### Exit evidence

- documentation validation passes;
- Markdown links resolve;
- no contradictory authority, wallet timing, economy, or network claims;
- independent review has no unresolved foundation blocker;
- exact branch, commit, and clean-state evidence is recorded.

## Gate 1 — Deterministic domain package

### Deliverables

- TypeScript schemas for rules, content, state, actions, events, save envelope,
  settlement, and ledger;
- pure reducer with `250 ms` fixed ticks and bounded integer/fixed-point math;
- canonical UTF-8 JSON serialization and SHA-256 replay digest;
- first-service content pack and build-time graph validator;
- IndexedDB adapter, explicit export/import/delete, and local fork handling;
- stable error mapping to plain-language recovery.

### Exit evidence

- unit tests for every state/action and ledger equation;
- property/fuzz coverage for duplicates, sequence/revision errors, numeric
  bounds, pause/resume, save/load, imports, and every heat/rest boundary;
- 1,000 byte-equivalent golden replays across supported runtimes;
- corrupted/torn save rehearsal with no fabricated progress or settlement;
- no framework, clock, random, network, analytics, or wallet dependency inside
  the domain package.

## Gate 2 — Walletless first-service vertical

### Scope

One authored four-guest soft-reopening table:

1. read the occasion and promise;
2. inspect four cuts;
3. rake six coals into a small irregular field;
4. place and stagger filet, ribeye, and strips;
5. move/turn/baste with previewed consequences;
6. use two active rest slots and two side slots;
7. resolve one hospitality attention beat;
8. choose one recovery;
9. carve the deterministic result;
10. **Call the table**;
11. receive authored feedback and close the house ledger.

### Exit evidence

- new players begin meaningful input within ten seconds and complete in 8–12
  minutes in formative testing;
- room, fire, rest, pass, recovery, carving, feedback, and ledger are complete
  with wallet/RPC/indexer unavailable;
- 320, 390, 768, 1024, and 1440 CSS pixel journeys pass;
- keyboard, switch-style, touch, pointer, 200% zoom, screen reader, non-drag,
  non-color, non-audio, and reduced-motion parity pass;
- no serious/critical automated accessibility finding;
- full package tests, lint, typecheck, production build, and browser tests pass
  at the exact commit;
- a fresh independent product/design/engineering review closes material issues.

## Gate 3 — First-session research and polish

- test comprehension of heat path, rest tradeoffs, table promise, recovery, and
  ledger rather than only task completion;
- prove the game remains distinct in grayscale and when sibling palettes are
  substituted;
- tune authored content and causal motion without changing the reducer;
- finish production pixel assets for only the proven vertical;
- generate root `DESIGN.md` from the built and visually reviewed system;
- run one bounded desktop/mobile visual QA pass, one material-fix batch, and one
  confirmation pass.

Gate 3 is still walletless. A fun and trustworthy game is the prerequisite for
asking whether ownership adds anything.

## Gate 4 — Optional receipt discovery

This gate begins only after a separate go decision.

### Required decisions and artifacts

- trusted server/verifier authority and account lifecycle ADR;
- privacy-minimized eligible-receipt schema;
- non-transferable account-bound receipt standard;
- full asset/issuer registry and typed deployment artifact;
- contract threat model, admin/upgrade policy, audit scope, incident/rollback
  plan, and legal review;
- wallet transaction preview and lifecycle receipt;
- a stable wallet/operation failure-code table covering wrong network, account
  or scope drift, cancellation, rejection, timeout, manifest mismatch, dropped
  or replaced operations, indexer lag, and reorg; raw provider/indexer errors
  never become the user contract;
- local progress independence from link, unlink, switch, rejection, and failure.

### Localnet exit evidence

- shared loopback-only Localnet identity is verified before startup;
- exact artifact is originated and its manifest reconstructed from chain state;
- duplicate/retry/reorg/indexer-delay behavior proves at most one receipt per
  eligible commitment;
- real wallet SDK tests cover reconnect races, account/network/scope drift,
  duplicate activation, stale resume, expiry, rejection, replacement, and
  reorg;
- hostile metadata/media and admin/code/manifest drift fail closed;
- independent review reports no unresolved critical/high finding.

## Gate 5 — Explicit Shadownet rehearsal

- promote the exact immutable candidate that passed Localnet;
- reconstruct readiness evidence rather than trusting configured digests;
- run settle → save → optional preview → reject, then retry → submit → inspect
  lifecycle with real wallet state;
- rehearse reload, dropped/replaced operation, indexer delay, reorg, unlink, and
  wrong-network recovery;
- capture exact operation/receipt/finality evidence, monitoring, and incident
  rehearsal;
- verify real mobile layout and a physical wallet/device journey.

Shadownet success is not Mainnet readiness.

## Gate 6 — Any Mainnet consideration

Mainnet is not scheduled. It requires a new product decision and explicit proof
that the receipt adds durable player value without financializing the game.
Required work includes legal review, contract audit, key/admin operations,
deployment/rollback plan, privacy review, monitoring, support, incident drills,
and a public claim review.

## Evidence vocabulary

Reports must use these terms precisely:

- **specified:** written contract only;
- **implemented:** source exists;
- **tested:** named automated command passed at exact commit;
- **built:** production artifact completed at exact commit;
- **smoked locally:** process ran and the named journey passed locally;
- **Localnet reconciled:** chain state and application evidence matched on the
  shared local runtime;
- **deployed:** artifact exists on the named remote network;
- **authenticated smoke:** the named deployed journey passed with real auth or
  wallet context;
- **device-proven:** the named journey passed on physical hardware;
- **released:** published artifact and access path are independently verified.

No weaker term may stand in for a stronger one.

## GitHub snapshot workflow

The original GitHub repository is canonical. For every accepted milestone:

1. verify the exact feature branch and complete repository gates;
2. read the repository-local `user.name` and `user.email`;
3. commit only in-scope files with matching `Co-authored-by` and
   `Signed-off-by` human trailers;
4. push the feature branch to the original remote and open a linked pull
   request;
5. treat branch and PR state as reviewable work, not a main snapshot;
6. after merge, fetch and verify the exact `origin/main` SHA, commit trailers,
   and repository state;
7. report that merged-main snapshot separately from any build, deployment,
   authenticated smoke, public-chain, or device proof.
