# The Tender Baron

**A gentle hand on a serious fire.**

The Tender Baron is a slow-burn pixel restaurant game about shaping a coal bed,
resting cuts, caring for a dining room, and deciding when a whole table is ready
to move together. It is part of the Open Sign Games family alongside Dos
Esposas, Samurai Sushi, and Fry Signal, but it has its own verbs, pace, topology,
progression, and service pressure.

The repository is currently a **product foundation, not a playable release**.
There is no production contract, token, wallet flow, deployment, public-chain
receipt, or verified provenance feature. The first implementation target is a
walletless four-guest service.

## Product promise

- Shape an irregular coal field and preview its deterministic heat zones.
- Move four distinct cuts through inspectable heat paths.
- Use two rest slots as active planning space while sides and hospitality move.
- Recover honestly when a cut, side, or table promise drifts.
- Carve the authored result and decide when to **Call the table**.
- Close a transparent house ledger where profit means restaurant stewardship:
  revenue minus ingredients, coal, staff, recovery, waste, and maintenance.
- Reinvest local, non-transferable surplus in staff care, the house, menu
  breadth, equipment, and neighborhood relationships.

The first service is complete without a wallet. No token, owned item, wallet
balance, or cross-title asset improves heat, capacity, guest outcomes,
progression, score, pricing, or operating surplus.

## Foundation map

| Document | Authority |
| --- | --- |
| [`PRODUCT.md`](PRODUCT.md) | Durable product truth, users, positioning, and constraints |
| [`docs/GAME_DESIGN_SPEC.md`](docs/GAME_DESIGN_SPEC.md) | First service, deterministic mechanics, states, recovery, content, and gameplay gates |
| [`docs/DESIGN_SPEC.md`](docs/DESIGN_SPEC.md) | Interconnected Coal Table / Service Theatre interaction and visual direction |
| [`docs/TECHNICAL_SPEC.md`](docs/TECHNICAL_SPEC.md) | Reducer, canonical events, fixed-point rules, persistence, replay, and stable failures |
| [`docs/ECONOMY_AND_INTEROPERABILITY.md`](docs/ECONOMY_AND_INTEROPERABILITY.md) | Stewardship ledger, optional keepsakes, asset identity, wallet, and passport boundaries |
| [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md) | Trust boundaries, threat model, privacy, and release evidence |
| [`docs/CONTENT_AND_TONE_REVIEW.md`](docs/CONTENT_AND_TONE_REVIEW.md) | Baron, staff, guest, food, sourcing, allergen, and claim review |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Adopted decisions and explicitly deferred choices |
| [`docs/DELIVERY_PLAN.md`](docs/DELIVERY_PLAN.md) | Ordered implementation and evidence gates |
| [`docs/SOURCE_NOTES.md`](docs/SOURCE_NOTES.md) | Buzz events, source snapshots, hashes, and sibling evidence |

## Authority and determinism

The Phase 0 prototype is **device-authoritative only for the player's private
save**. It works offline and stores a versioned snapshot plus canonical action
log. That local result is not issuer-verified proof of profit, skill, service,
or receipt eligibility. Export/import is explicit; deletion erases the local
save; divergent histories never silently merge.

Gameplay advances through a pure fixed-tick reducer using integers and
fixed-point values. Frame rate, wall time, network state, wallet state, and
hidden randomness cannot change a result. A settled service stores a replay
digest over its pinned rules, content, initial state, and canonical action log.

## Delivery lifecycle

1. **Foundation:** complete and independently review the product, domain,
   design, economy, security, privacy, decision, and delivery contracts.
2. **Walletless vertical:** implement one four-guest service from reservation
   through close ledger, with deterministic replay and full input parity.
3. **Ownership, separately:** only after the game proves itself, consider one
   optional account-bound commemorative receipt after settlement.
4. **Public-chain rehearsal:** promote the exact reviewed candidate from the
   shared loopback-only Localnet to explicit Shadownet testing. Mainnet is not a
   development target and requires a separate decision.

Builds, tests, Localnet runs, Shadownet operations, deployments, authenticated
runtime checks, and physical-device proof are different evidence. A later
release report must name exactly which of those exists for the exact commit.

## Current status

- Product, game, design, economy, security, privacy, and delivery contracts are
  being reconciled on `foundation/first-service`.
- Kevin selected Coal Table and Service Theatre as interconnected views. The
  literal exploratory images under `.impeccable/mocks/` remain unapproved and
  include documented deviations; the written cross-view contract is authority.
- Application scaffold, reducer, content pack, tests, and runtime do not exist
  yet.
- Formal exact and phonetic clearance for **The Tender Baron** remains required
  before public brand commitment.

## Non-goals for the first releases

- an umbrella or Tender Baron fungible token;
- presale, staking, yield, buyback, bonding curve, referral emissions, or paid
  randomness;
- marketplace, arbitrary NFT ingestion, foreign-asset custody, or consumptive
  imports;
- public profit leaderboards, daily streak pressure, grind gates, pay-to-win,
  or paid recovery;
- Mainnet deployment.
