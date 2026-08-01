---
title: "The Tender Baron Token and Economy Boundary"
tags: [the-tender-baron, game-economy, tezos, interoperability, wallet-safety]
status: active
created: 2026-07-31
---

# Decision

The Tender Baron is a restaurant-stewardship game with optional onchain
keepsakes, not a token economy with a steakhouse wrapped around it.

The complete first service, the house ledger, progression, and every mechanic
that can change play remain game-authoritative and offchain. The first playable
vertical should contain no wallet prompt or chain mutation. A later release may
offer one earned, non-power-bearing keepsake after the player closes a complete
service. That offer must be skippable, understandable, and unnecessary for save
recovery or continued play.

The remote GitHub repository had no refs when checked with `git ls-remote` on
2026-07-31, so this is a foundation contract rather than an audit of an existing
implementation.

# Economy thesis: profit as stewardship

The game may make operating profit legible because the player is restoring and
running a restaurant. It must never imply that the player is earning a
withdrawable token, investment return, or real-world income.

The canonical per-service house ledger is:

```text
gross revenue = menu sales
operating costs = ingredients + coal + staff + waste + recovery/comps + maintenance
operating surplus = gross revenue - operating costs
```

Guest trust and hospitality feedback are separate nonfinancial results. Tips are
absent from rules version 1 so guest care cannot be reduced to a revenue bonus.

`Operating surplus` is an offchain game value. It is reinvested into authored
restaurant choices such as restoring a room, opening a menu chapter, improving
the carving cart, training staff, or funding a guest-story event. It is not a
token, is not transferable, has no cash-out path, has no exchange rate, and is
not affected by wallet holdings or secondary-market prices.

The service close should explain *why* the house gained or lost ground:
temperature accuracy, table synchronization, thoughtful recoveries, waste,
coal use, staffing, comps, and hospitality. The useful fantasy is “the house
can afford its next chapter,” not “number went up.”

## Offchain-only gameplay accounting

These records never become transferable assets and never require a wallet:

- active tickets, reservations, guest preferences, occasions, and patience;
- cuts, thickness, marbling, temper, heat path, doneness, rest, carryover, and
  carve state;
- coal-map topology, fuel, grill/rest capacity, sides, pairings, and station
  timing;
- prices, revenue, tips, wages, ingredient costs, coal costs, waste, comps,
  maintenance, operating surplus, and reinvestment budget;
- reputation, guest trust, staff relationships, mastery, techniques, recipes,
  room restoration, story progress, and difficulty;
- scores, streaks, challenges, accessibility preferences, analytics, and save
  recovery data.

No detail from an ordinary service is automatically public. In particular,
guest/order history, scores, margin, accessibility settings, analytics IDs, and
private service IDs must never be written onchain.

# What may become onchain later

Onchain state is justified only when public provenance adds meaning after play.
The safe candidates are deliberately narrow:

1. **Commemorative service receipt.** An account-bound proof that the player
   completed an authored milestone such as reopening the Ember Room or hosting
   the first full-table service. It records an opaque salted commitment,
   content version, issuer, and receipt policy—not the service ledger or score.
2. **House keepsake.** A menu card, reopening-night poster, table plaque, staff
   portrait, or decorative carving-cart emblem earned through authored play.
   Its in-game effect is visual or narrative only.
3. **Passport stamp.** An optional account-bound statement that a named,
   versioned achievement was earned in The Tender Baron. Other titles may show
   a cosmetic cameo or postcard when an exact allowlisted stamp is present.
4. **Provenance-aware decor.** A later transferable cosmetic may preserve its
   issuer and history, but transfer must never carry mastery, restaurant
   progress, capacity, discount, or score.

Do not put cuts, ingredients, coal, menu prices, revenue, surplus, reputation,
recipes, techniques, tools with stats, staff, grill capacity, recovery options,
or progression onchain. Do not destroy an owned keepsake through normal play.

The first chain experiment should be one account-bound receipt. Transferable
decor, markets, foreign-asset custody, consumptive imports, and Mainnet are
separate future products, not MVP assumptions.

# Full identity and registry contract

Names, tickers, slugs, images, metadata text, culinary meaning, and a wallet's
claim that it owns something are not asset identity.

The minimum runtime identity of a tokenized item is:

```text
chain_id + contract_address + token_id
```

For a receipt contract, use the equivalent exact receipt identifier. A reviewed
`AssetBinding` row must also pin:

- source title and intended Tender Baron role;
- token standard and allowed entrypoints;
- decimals and exact raw-unit rules;
- origination operation, code hash, schema/entrypoint digest, and deployment
  manifest hash;
- metadata/content digest policy and immutable content version;
- issuer, admin, mint, burn, pause, upgrade, and seizure powers;
- supply policy, transferability, custody behavior, royalties/fees, and expiry
  or revocation conditions;
- interoperability policy version, recognition level, caps, and start/end
  conditions.

The manifest-verified registry is the sole authorization source. Client caches
and indexers are non-authoritative projections. Wrong chain, address, token ID,
decimals, code, metadata policy, privileged roles, or manifest generation must
disable recognition or mutation. A lookalike asset may be displayed as an
unverified wallet holding, but it can never unlock content or enter gameplay.

Tender Baron deployment evidence must use its existing project-scoped shared
namespace:

```text
consumers/the-tender-baron/identity.json
consumers/the-tender-baron/manifests/
```

No address, operation, or manifest from Dos Esposas, Samurai Sushi, or another
consumer is evidence for this game.

# Wallet timing and account boundary

This entire sequence is future trusted-mode behavior. It cannot appear from a
device-local result. A trusted verifier must first accept the canonical event
log and issue one server-verified eligibility record under the separately
approved account/authority ADR.

1. The player starts in guest/device-local mode and completes the entire first
   service without crypto vocabulary, a wallet, a faucet, or an RPC dependency.
2. The game saves the service result before presenting any ownership offer.
3. After server-verified eligibility exists, `Close the book` may show an
   optional secondary action explaining one concrete
   keepsake: what it records, what becomes public, whether it transfers, what it
   costs, and what it does *not* do.
4. `Not now` is equal-weight and preserves only the private souvenir choice.
   No issuer-attested entitlement exists until trusted eligibility is issued.
   Wallet linking remains available later in settings or the keepsake cabinet.
5. Linking or unlinking a wallet never creates, deletes, merges, or strands game
   progress. Phase 0 remains device-authoritative. A future game account may
   become authority only for explicitly migrated account records under a new
   account-lifecycle ADR; a wallet is never the save authority.

Immediately before wallet dispatch, with no intervening await, revalidate the
wallet runtime generation, session revision, source account, permission scope,
chain ID, destination, entrypoint, attached tez, canonical payload bytes,
manifest/policy version, intent ID, and expiry. Account, network, permission,
or policy drift must produce zero dispatch. Disconnect/reconnect invalidates
every older wallet runtime generation.

# Transaction preview and receipt

Every chain action gets a human-readable review before the wallet opens. It
must show:

- the action and why it is optional;
- the exact keepsake or passport stamp and quantity;
- selected account, network label, chain ID, destination contract, and
  entrypoint;
- content version, policy/manifest version, and a short inspectable identity;
- what becomes public and permanent, including wallet-address visibility and
  chain timestamps;
- transferability, revocability, custody, and any issuer/admin powers;
- exact attached tez, expected token inputs/outputs, and whether anything is
  minted, transferred, locked, reserved, or burned;
- estimated network fee and the user's approved maximum;
- expiry and the consequence of cancelling or rejecting.

For the first receipt action the truthful disposition is: **mint one
account-bound receipt; spend no token input; burn, reserve, and lock nothing;
attach zero tez apart from the network fee.**

Track the intent and operation hash through `awaiting signature`, `submitted`,
`included`, `confirmed/finalized`, `failed`, `dropped`, `replaced`, and
`reorged`. Only confirmed chain evidence changes the keepsake cabinet. Retry is
idempotent; one eligible service commitment can produce at most one receipt.

# Privacy-preserving receipt

The public receipt may contain the wallet account, content/receipt version,
issuer nonce, opaque commitment, payload hash, operation, and unavoidable chain
timestamps. The commitment must be made from the private service digest plus
256 bits of server randomness so outsiders cannot enumerate service IDs or
infer the underlying ledger.

Never include a database service ID, guest identity, order list, doneness path,
profit/margin, score, dialogue, accessibility preference, or analytics ID.
Before signing, explain that the public record cannot be deleted. Offchain
deletion removes the private service record, salt, account/wallet link, and
analytics join under the retention policy; it cannot erase the public receipt.

# Cross-title passport rules

The passport is optional identity/provenance infrastructure, not a universal
inventory or economy.

Allowed:

- account-bound, versioned completion or story stamps;
- read-only recognition of exact allowlisted stamps;
- a cosmetic guest cameo, postcard, title-card variation, or cabinet display;
- offchain portability of accessibility preferences with explicit consent.

Forbidden:

- umbrella currency, exchange rates, shared balances, or token swaps;
- imported power, recipes, ingredients, equipment stats, capacity, skill,
  reputation, discounts, score, leaderboards, service pressure, or progression;
- automatic wallet scanning or arbitrary NFT ingestion;
- making a passport or wallet necessary to play, save, recover, or finish;
- rewards based on wallet age, wealth, collection size, or transaction volume.

Each title remains the authority for its own state. Cross-title recognition is
purpose-specific and read-only by default. Every mapping names the source asset
identity, target cosmetic effect, policy version, validity window, and caps.
One title revoking a mapping must not corrupt another title's save.

# Non-negotiable anti-speculation and no-pay-to-win invariants

1. No Tender Baron token and no umbrella token.
2. No presale, staking, yield/APY, bonding curve, buyback, liquidity program,
   referral emission, token-gated service, or promised redemption.
3. Wallet holdings and purchased/transferred items cannot change heat curves,
   timers, doneness, guest patience, costs, revenue, margin, waste, capacity,
   recovery choices, unlock timing, difficulty, score, or reputation.
4. A new wallet holding every recognized cosmetic receives the same gameplay
   state and outcomes as an empty wallet given the same game inputs.
5. No transferable reward for score, mastery, profit, streaks, or wallet
   wealth. Earned mastery markers may be account-bound and non-economic.
6. No paid or economically valuable randomness. Deterministic heat paths stay
   deterministic. Cosmetic presentation randomness cannot affect scarcity or
   transferable value.
7. No ordinary gameplay burn, confiscation, durability decay, rent, forced
   spoilage of owned assets, or irreversible import.
8. No in-game marketplace in the first playable or first keepsake release.
9. Supply and policy changes are versioned, diffable, timelocked where
   privileged, and never silently rewrite an already earned item.
10. Marketing cannot use profit, earn, investment, appreciation, rarity, floor
    price, or “own everything” claims to describe the play loop.

# Abuse cases and acceptance gates

The boundary is not complete until automated and rehearsal evidence covers:

1. First service succeeds with wallet APIs, RPC, and indexer unavailable.
2. Linking, switching, and unlinking wallets leaves the offchain save and house
   ledger unchanged.
3. Identical gameplay inputs produce identical results regardless of wallet
   holdings, passport stamps, or transferred cosmetics.
4. A lookalike name/symbol/image, wrong chain, wrong token ID, decimals drift,
   metadata-policy drift, code/admin drift, or stale manifest is ignored or
   fails closed.
5. Account/network/scope change during approval, disconnect/reconnect overlap,
   duplicate click, stale resume, expiry, and rejection all yield zero stale
   dispatch.
6. Duplicate events, retries, reorgs, and indexer delay never create two
   receipts for one eligible service commitment.
7. Submitted is never shown as owned; only confirmed/finalized evidence enters
   the cabinet, and reorg/replacement states reconcile visibly.
8. The preview exactly matches canonical payload bytes and states network,
   destination, public data, transferability, fee cap, and every asset
   disposition.
9. The public payload contains no service ID, detailed ledger, guest/order
   history, score, accessibility data, or analytics join.
10. Passport recognition changes only the allowlisted cosmetic surface; a test
    asserts that every mechanical/economic state remains equal.
11. Ordinary development selects the shared loopback-only Localnet, Localnet
    indexer-dependent behavior fails closed, Shadownet requires an explicit
    final-rehearsal command, and development commands cannot select Mainnet.
12. Release evidence names the exact commit, contract artifact, deployment
    manifest, network, Shadownet operation/receipt, independent review, and
    physical wallet/mobile rehearsal. Static tests are not deployment proof.

# Delivery sequence

## Phase 0 — first playable

- Entirely offchain house ledger and progression.
- No wallet UI, contract, token, or marketplace.
- Define deterministic service-result and eligible-keepsake schemas without
  publishing them.

## Phase 1 — one optional receipt

- Account-bound commemorative service receipt only.
- Shared Localnet for development; exact candidate promoted to Shadownet for
  final rehearsal.
- Privacy-minimized payload, transaction preview, lifecycle receipt,
  idempotency, manifest reconstruction, and wallet-race regressions.

## Phase 2 — passport recognition

- Exact allowlisted account-bound stamps and cosmetic cameos only.
- Read-only foreign recognition; no custody, consumption, or shared economy.

## Deferred product decisions

- Transferable decor, if it proves worth the trust and operational cost.
- Mainnet deployment.
- Any marketplace surface.
- Escrow, foreign-asset custody, consumptive imports, or cross-chain support.

Each deferred item requires its own product decision, threat model, legal
review, deployment manifest, incident plan, Shadownet rehearsal, and explicit
go/no-go. None is implied by success of an earlier phase.

# Sources

The originating brief, delegated boundary, shared ownership canon, specialist
report, sibling repository snapshots, exact commits, and file hashes used here
are recorded in [`SOURCE_NOTES.md`](SOURCE_NOTES.md).
