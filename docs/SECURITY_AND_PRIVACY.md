# Security and Privacy

## 1. Current claim boundary

The foundation specifies a walletless local prototype. It does not contain or
claim a server, account system, wallet adapter, smart contract, token,
deployment, issuer attestation, verified provenance, or public-chain receipt.
Those are future trust boundaries, not implied capabilities.

## 2. Authority table

| Data | Phase 0 authority | May be publicly attested? |
| --- | --- | --- |
| service state and action log | local device | no |
| private house ledger | local reducer | no |
| restoration and mastery | local save | no |
| settings and accessibility preferences | local device | no |
| replay digest | local reducer | no; integrity only |
| future receipt eligibility | no authority exists | no |
| future receipt finality | no authority exists | no |

Local replay proves internal consistency under pinned rules. It does not prove
who played, that events happened only once, that the log was not authored by a
modified client, or that an issuer approved the result.

## 3. Threats in the walletless vertical

- malformed, oversized, cyclic, or hostile imported saves;
- action duplication, reordering, stale previews, and revision races;
- reload/background transitions fabricating elapsed time or settlement;
- corrupted/torn IndexedDB writes;
- content or rules changed under a pinned version;
- floating-point, locale, platform, or frame-rate divergence;
- imported HTML/script in authored content or dialogue;
- privacy leakage through analytics, error reports, export filenames, URLs, or
  browser storage shared across profiles;
- accessibility failures that turn drag, timing, color, motion, or sound into a
  hidden security/authorization step.

Controls are schema and size bounds, pure reducer transitions, canonical event
ordering, idempotency, fixed-point arithmetic, version/content hashes,
transactional persistence, digest verification, output encoding, local-only
defaults, and parity tests.

## 4. Local privacy

- Phase 0 sends no service, guest, order, ledger, progression, accessibility,
  wallet, or analytics data to a server.
- Do not place service IDs, replay digests, ledger values, guest details, or
  recovery choices in URLs, referrers, crash messages, or console logs.
- Export is explicit and names the included data before download.
- Import is explicit, validated, and creates a labeled local fork.
- Delete removes application-owned records on the device and reports what it
  cannot remove, such as a user-created export or browser backup.
- Accessibility preferences remain private local settings and never become
  receipt or passport fields.

Any future telemetry is opt-in, purpose-specific, documented, data-minimized,
retained for a declared period, and independent of wallet identity.

## 5. Future account and migration gate

No guest-to-account migration exists in Phase 0. Before adding one, decide and
test:

- server authority and storage jurisdiction;
- authentication, recovery, session rotation, revocation, and deletion;
- an explicit preview of which local saves move or copy;
- conflict behavior with no silent merge or overwrite;
- unlinking without orphaning progress;
- protection against one wallet correlating histories across titles;
- per-title, purpose-specific consent for any passport recognition.

Account association never converts an old local service into verified issuer
evidence unless a trusted verifier replays and accepts the canonical log under
an approved anti-forgery policy.

## 6. Future public receipt privacy

The minimum candidate payload contains only:

- receipt policy/version;
- rules/content commitment;
- salted opaque service commitment;
- issuer/registry identity needed to interpret the receipt;
- no reversible database or service identifier.

It must not contain guest identity, orders, dialogue, profit, costs, score,
reputation, accessibility settings, analytics identity, location, IP address,
or cross-title history. The preview explains that public chain data is
irreversible even if private account data is later deleted.

## 7. Future wallet authorization boundary

Wallet prompting begins only after a durable, complete service reaches
`SETTLED`, and only for one concrete optional keepsake.

Before approval, show exact network/chain, account, contract, entrypoint,
canonical payload, attached tez, fee cap, public fields, permanence,
transferability, admin powers, content/manifest versions, input disposition,
and cancellation outcome.

Immediately before dispatch, with no intervening await, revalidate:

- wallet runtime generation and session revision;
- current account, chain, and permission scope;
- destination, entrypoint, amount, and canonical payload bytes;
- deployment manifest and policy identity;
- user intent identity and expiry.

Any drift, reconnect overlap, stale scope, manifest mismatch, or expired intent
produces zero sends. Duplicate activation is idempotent.

Lifecycle states are `requested`, `cancelled`, `rejected`, `submitted`,
`included`, `confirmed`, `finalized`, `failed`, `dropped`, `replaced`, and
`reorged`. Submitted is never displayed as owned. Only reconciled confirmed or
finalized evidence enters a cabinet.

## 8. Asset and metadata trust

Recognition uses full `{chainId, contractAddress, tokenId|receiptId}` identity
under a manifest-verified per-title registry. The manifest pins code, metadata
policy, administrator/privileges, supply/transfer rules, and policy version.

Names, symbols, slugs, images, URLs, culinary meaning, and arbitrary NFTs grant
nothing. Remote metadata and media are untrusted: fetch through a bounded
broker, reject private-network targets and redirects, cap size/type/dimensions,
quarantine active content, strip metadata, serve from a separate origin, and
fail closed on registry or manifest drift.

## 9. Abuse invariants

- replay, wallet cycling, reconnecting, account switching, or splitting a
  service cannot improve gameplay, surplus, or receipt eligibility;
- one eligible service commitment can create at most one receipt;
- holdings never change heat, capacity, costs, recovery, guests, progression,
  price, score, or ledger;
- no presale, staking, yield, referral emission, paid randomness, token gate,
  public profit leaderboard, marketplace-first flow, or arbitrary NFT import;
- a public-chain success is not Mainnet readiness;
- a build, digest, Localnet run, configured contract, or indexer row is not
  deployment/finality evidence.

## 10. Release evidence

Every release claim names the exact source commit and separates:

- unit/property/fuzz/browser tests;
- production build;
- local runtime;
- shared Localnet end-to-end reconciliation;
- authenticated remote/deployed runtime;
- Shadownet operation and finality evidence;
- independent security review;
- real wallet and physical-device proof.

Ownership work cannot advance with unresolved critical/high findings. Mainnet
requires a new threat model, contract audit, legal review, incident/rollback
plan, manifest reconstruction, monitoring, and explicit go/no-go.
