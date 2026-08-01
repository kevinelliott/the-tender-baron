# Content and Tone Review

## 1. Purpose

The Tender Baron is a fictional game about restaurant craft, hospitality, and
stewardship. Content review prevents its title, food, guests, labor, profit, and
restoration fantasy from drifting into macho, aristocratic, extractive, unsafe,
or unsupported claims.

Review is required before content is enabled. A finished-looking asset is not a
substitute for named review evidence.

## 2. The Baron

The Baron is a gracious host and teacher.

Allowed qualities:

- attentive, concise, lightly theatrical, generous, observant;
- soft-shouldered velvet jacket, waistcoat, folded service cloth, moustache,
  small house pin;
- advice tied to visible state and consequences;
- praise for care, timing, recovery, honesty, and the whole table.

Reject:

- cattle magnate, conqueror, feudal ruler, robber baron, plantation owner,
  butcher brute, celebrity-chef tyrant, or wealth mascot;
- cowboy hats, cattle brands, trophy horns, weapons, giant knives, land maps,
  domination poses, shouting, table pounding, or conspicuous hoards;
- titles, ranks, copy, or progression based on subjects, servants, conquest,
  bloodline, inherited superiority, or accumulation for its own sake;
- accents, class markers, disability, age, body, gender, race, nationality, or
  dietary needs used as jokes or competence signals.

The player may affectionately earn the house title “Baron” only as shorthand
for trusted stewardship, never legal ownership over people or land.

## 3. Staff and labor

- Staff are named collaborators with schedules, skills, boundaries, stories,
  and visible care needs—not anonymous capacity boosts.
- Scheduled labor cost is a fixed, disclosed operating obligation. The player
  cannot reduce it by understaffing, wage suppression, unpaid work, unsafe pace,
  or skipping breaks.
- Reinvestment includes training, breaks, equipment, safer workflows, reliable
  hours, and staff-chosen improvements.
- A difficult service cannot be solved through abuse, humiliation, firing as a
  spectacle, or automated exploitation.
- “Efficiency” means clearer preparation and better coordination, not squeezing
  people.

## 4. Guests and occasions

- Guest needs come from authored occasion, pace, accessibility, dietary, and
  hospitality context; no demographic trait predicts patience, spending, taste,
  or difficulty.
- Tips are hospitality feedback inside the fictional ledger, not a moral score
  or pressure to tolerate mistreatment.
- Guests may be disappointed, but they do not become caricatures, enemies, or
  disposable throughput.
- Recovery copy admits the current truth. It does not hide an error, blame the
  guest, or reward deception.
- Romantic, family, business, celebration, grief, solo, and community occasions
  require varied, specific review without assuming one cultural norm.

## 5. Food and sourcing

The game models authored culinary objects and abstract thermal rules. It does
not provide real-world cooking, food-safety, storage, sanitation, sourcing,
nutrition, animal-welfare, or medical guidance.

Every enabled cut, plant main, side, sauce, and garnish must have:

- stable identity and version;
- exact displayed name and component list;
- allergen profile and cross-contact language reviewed for the intended region;
- dietary labels derived from exact components, never atmosphere or inference;
- authored recovery and disposition outcomes;
- art that matches the actual components;
- source/reference and review IDs for any real-world provenance, sustainability,
  welfare, aging, cut, regional, or historical claim.

Missing evidence produces neutral or unknown copy, never a positive claim.
“Local,” “ethical,” “sustainable,” “heritage,” “grass-fed,” “humane,” “dry
aged,” and similar language cannot be decorative flavor text.

## 6. Meat, plant, and dietary breadth

- Food is appetizing and diagrammatic. Avoid blood pools, gore, carcass imagery,
  fetishized marbling, oversized knives, or triumph over an animal.
- Doneness uses a label, accessible description, cross-section shape/pattern,
  and palette together.
- Plant-forward mains are first-class authored thermal and service challenges,
  not consolation substitutions or difficulty reductions.
- Dietary and allergen needs are not quirks, penalties, or premium upgrades.
- The tutorial and later menu must not imply that meat consumption, luxury
  spending, alcohol, or a particular doneness signifies status or maturity.

## 7. Profit and restoration copy

Use:

- operating result, surplus, reserve, reinvest, maintain, restore, staff care,
  courtesy, waste, neighborhood, promise kept.

Avoid:

- earn money, cash out, yield, passive income, asset appreciation, alpha,
  liquidity, ROI, scarcity, floor price, whale, staking, investor, empire,
  dominate, maximize extraction, or guaranteed value.

The closing sequence leads with occasion, craft, hospitality, recovery, and
what the player learned. The ledger follows as an honest reconciliation. Large
surplus never overrides a failed hospitality promise, and a humane recovery is
not framed as a bad optimization merely because it costs the house.

## 8. Accessibility and comprehension review

Review every first-service state at 320, 390, 768, 1024, and 1440 CSS pixels,
keyboard-only, switch-style input, touch, pointer, 200% zoom, reduced motion,
forced colors, and a screen reader.

Participants must be able to explain:

- what the active table needs and why;
- where each cut is in its heat and rest path;
- what will change before applying a rake, move, hold, recovery, carve, or pass;
- why an imperfect call may be the honest choice;
- each line in the close-of-service ledger;
- that the complete first service needs no wallet;
- that local results are not verified financial or provenance claims.

## 9. Review record

```text
ReviewRecord {
  id,
  contentType,
  contentId,
  contentVersion,
  reviewerRole,
  scope,
  evidenceRefs[],
  decision: approved | revise | rejected,
  notes,
  reviewedAt
}
```

Required roles vary by content and may include culinary, allergen/regulatory,
labor/tone, accessibility, cultural, legal/claims, and security/privacy review.
Self-review may prepare a record but cannot satisfy a gate that calls for named
independent expertise.
