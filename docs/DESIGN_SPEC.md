# Experience and Visual Design Specification

## 1. Direction: Coal Table / Service Theatre

The Tender Baron is an operate-mode pixel service game with two interconnected
views of one live evening. **Coal Table** is the close working view of the fire,
heat paths, rest rack, and carving rail. **Service Theatre** is the spatial view
of the four-guest occasion, sides, attention, and whole-table pass. The player
conducts one canonical service across both; these are not separate minigames and
not panels squeezed into a single dashboard.

The visual world combines a maître d' reservation folio, a theatre floor plan,
and the practical marks of live-fire service: wax-pencil heat paths, brass
cues, clipped notes, and a restrained service-score rail. The score is connective
timing language rather than a third view. It keeps table promises visible when
the player enters the fire and keeps heat/rest consequences visible when the
player returns to the room.

The first viewport is Service Theatre during the soft reopening: one authored
four-guest table, the Baron, the open grill beyond the pass, and one clear
**Open the house** action. Entering the fire crosses the pass into Coal Table
without advancing time. Wallet controls, token balances, market language, and
ownership calls to action are absent.

## 2. Why this world fits

The game's unique mechanism is conducting deterministic heat paths, active
rests, and guest attention so a whole table lands together. A conventional
restaurant dashboard would reduce that to timers and cards. A single giant
room scene would hide firecraft; a single giant grill would hide hospitality.
The paired views let each decision reach useful scale without severing their
shared promise.

The paired views and their connective score rail expose the actual decisions:

- Coal Table lets heat paths read as authored lines across coal zones, not
  hidden progress bars.
- Resting reads as an intentional held note with a safe window and tradeoffs.
- Course and table dependencies align on a shared time axis.
- Recovery appears as a playable rearrangement of the score, not a red failure
  modal.
- Service Theatre keeps hospitality and occasion spatial instead of compressing
  people into ticket rows.
- The shared promise rail preserves table/cut causality across every transition.

The strongest alternate was a dense isometric dollhouse restaurant. It offers
immediate game recognition and delightful room detail, but it makes precise
heat and synchronization harder to read, especially on mobile. Keep that
language for the between-service restoration view, not the primary service
topology.

## 3. The Baron

The Baron is a gracious host and teacher, never an authority figure looming
over the player.

- **Silhouette:** round-shouldered velvet dinner jacket, soft waistcoat, white
  moustache, folded service cloth, and one small brass lapel pin. No cowboy hat,
  cattle brand, weapons, trophy horns, or giant butcher knife.
- **Movement:** economical and attentive. He straightens a chair, checks the
  coal glow with an open palm, offers a coat, or quietly marks the reservation
  book. He does not pound tables, flex, shout, or celebrate excess.
- **Role:** he introduces one decision at a time, then recedes. Advice is a
  brief observation tied to visible state: “The ribeye can rest. Their greens
  cannot.” He never overrides the player's choice.
- **Voice:** warm, lightly theatrical, concise, and specific. Praise names the
  craft or care shown: “Well held. The whole table arrived together.” Avoid
  aristocratic entitlement, mock accents, dominance language, and wealth
  worship.
- **Player relationship:** the player is restoring the house with him and may
  eventually earn the affectionate title of Baron. The character is not an NFT,
  a source of premium advantages, or a purchase gate.

## 4. Primary service topology

Both views consume one immutable snapshot/reducer stream. The persistent house
rail shows canonical tick, active table promise, active cut/rest state, and the
next honest decision. Switching views submits no domain action, advances zero
ticks, and changes no selection unless the player explicitly chooses one.

### Coal Table

- The irregular coal field owns 52–64% of desktop width and is the largest,
  most tactile plane.
- A narrow reservation/promise folio stays at the left edge; it shows the one
  active four-guest table in the first service, not three simultaneous tables.
- The rest rack and carving rail bridge the coal field to a narrow live glimpse
  through the pass. That glimpse shows the same table and attention state as
  Service Theatre.
- Coal shaping, cut selection, complete heat path, rest, side-ready cues,
  recovery, and carve are available here. Room staging and guest dialogue are
  not duplicated.

### Service Theatre

- The room stage owns the upper 58–68%: one four-guest occasion table in the
  first service, the Baron, sides/pass, and readable attention poses.
- The lower conductor rail shows current cut, abstract heat/rest path, table
  promise, recovery, and house-ledger preview without becoming a second grill.
- **Call the table** is the central action. It is possible before perfection and
  previews the current whole-table truth.
- The open grill remains visible beyond the pass as live state, but detailed
  coal manipulation requires entering Coal Table.

### View transition and continuity

- Desktop uses the physical pass as the transition: **Enter the fire** and
  **Read the room** are stable labeled controls with preserved focus targets.
- The transition carries active table, cut, rest slot, preview revision, and
  now-line. A stale preview is visibly dismissed rather than applied later.
- No crossfade may conceal a state change. Reduced motion swaps instantly and
  announces the destination plus unchanged canonical tick.
- Browser back/forward may navigate presentation state but never replay a
  domain action or rewind the service.
- A deep link may reopen a view only after the save tail verifies; otherwise it
  returns to a verified recovery screen.

### Tablet, 768–1179 CSS px

Keep one view at a time with the persistent house rail. Coal Table places the
coal field above rest/carving; Service Theatre keeps the four-guest stage above
the conductor rail. Contextual case, sides, and ledger use anchored sheets that
preserve current reducer state.

### Mobile, below 768 CSS px

Use one task plane at a time, not a miniature desktop:

- A sticky **Now line** names the active cut, table promise, and nearest safe
  decision window.
- Bottom navigation: **Room**, **Fire**, **Rest**, **Pass**. Room and Fire are
  the mobile forms of Service Theatre and Coal Table; Rest and Pass are focused
  subplanes, not new simulations.
- The connective service score becomes a vertical event lane. Time remains
  comparable through a fixed now-line and explicit durations; it never relies
  on horizontal dragging.
- At 320–479 px, drawers become full-width sheets above safe-area insets. The
  current action and recovery choice remain reachable with the on-screen
  keyboard open.

## 5. Signature interactions

### Coal-map shaping

The coal bed is a top-down irregular field on a visible 8 px art grid, divided
into physical coals rather than abstract rectangular temperature buttons.
Raking groups coals and changes the deterministic heat field. Heat appears
through ember density, coal outline, sparing color, a pattern overlay, and a
text label such as **fierce**, **steady**, or **holding**.

- Pointer/touch: rake with a constrained stroke; the preview shows which coals
  will move and the resulting zone before release.
- Keyboard/switch: select a coal group, choose direction and distance, preview,
  then apply.
- Undo is available before a cut enters the changed zone. After commitment,
  recovery choices are offered instead of rewriting history.

### Grill and heat path

Each cut shows thickness, starting temperature, requested doneness, elapsed
exposure, and its full path across zones. Selecting a cut highlights the path
on both the coal map and service score. The interface explains consequences in
plain language: **Moving now favors the center but softens the crust.**

No circular countdown dominates the food. Safe windows are ranges, not twitch
deadlines, and exact outcomes follow the visible model.

### Active resting

Resting is a station with capacity and decisions, not a disabled timer.

- A cut enters a labeled rest window with carryover direction, juice-retention
  state, and the table components that can be advanced during the hold.
- The player may extend, carve, return briefly to heat, or repurpose. Every
  option previews the quality and synchronization tradeoff.
- The score uses a true rest glyph and muted held span; assistive text says
  **resting safely for about 42 more seconds**, not merely “paused.”

### Carving

Carving is an authored reveal of the deterministic result. The cut sits on a
high-contrast board; selectable cut lines preview slice count, thickness, and
service style. A single deliberate stroke resolves the choice. Keyboard users
select a cut pattern and activate **Carve**.

The cross-section is appetizing and diagrammatic: warm center values, crust,
grain, and juice sheen. Avoid gore, blood pools, or photoreal meat. Doneness is
always paired with its label and requested target.

### Whole-table pass

The pass is the signature synchronization decision. All plates for a table
gather along one stave, showing temperature, hold cost, missing components, and
guest-context needs. **Call the table** becomes available when service is
possible, not only when perfect. An imperfect call may be the right recovery.

## 6. Color and material

Use a restrained full palette with warm low-light contrast. The physical scene
is an oak dining room at evening service, lit by shaded lamps and the coal bed.

| Token | Value | Role |
| --- | --- | --- |
| Coal | `#171516` | deepest field, outline, primary text on light surfaces |
| Bone china | `#F2E7D2` | primary readable task surface |
| Oxblood | `#762F3A` | active table, house identity, major service cue |
| Ember | `#E66B32` | heat and urgency; never the only state indicator |
| Brass | `#C69A45` | focus, earned restoration, conductor cues |
| Bottle green | `#25463A` | ready, rested, settled, restorative action |
| Plum smoke | `#6E6572` | secondary information and inactive score spans |
| Electric blue | `#4F8EBB` | cool-zone and informational accent used sparingly |

Bone china, ink, and oxblood own large surfaces. Brass is a material cue, not
generic “premium gold,” currency, or rarity. Do not use gradients, black-and-
gold luxury clichés, neon chain glows, glass cards, or red/green alone for
doneness and readiness.

Materials are charcoal iron, velvet, oak, china, wax pencil, and folded paper.
UI task planes remain crisp vector/CSS; guests, food, tools, room fixtures, and
the Baron are authored pixel art.

## 7. Typography and iconography

- **Display:** a custom condensed, softly flared house lettering style used for
  the wordmark, room chapters, and closing-service verdict. It should feel like
  a restored theatre or dining-room program, not a Western saloon slab or a
  fashion serif.
- **Live UI:** one highly legible humanist sans with open counters, distinct
  `I/l/1`, tabular numerals, broad language support, and a comfortable x-height.
- **Data:** a compact mono only for durations, temperatures, operation hashes,
  addresses, token IDs, and ledger columns.
- A bitmap face may appear in short labels at 18 px or larger. Instructions,
  errors, timings, receipts, and body copy remain vector text.

Icons share the group's 24 px optical box, square terminals, 2 px base stroke,
label pairing, and four-pixel corner notch on focus/provenance marks. Local
metaphors are coal rake, rest rack, cloche, carving fork, reservation folio,
service bell, and score cue. Avoid cattle heads, coins, crowns, rockets, gems,
and candlestick charts.

## 8. Pixel asset grammar

- Author environment geometry on an 8 px spatial grid; room tiles at 16×16,
  tools and ingredients at 24×24 or 32×32, plated dishes at 64×64, and people
  at 64×96 or 96×128 depending on camera.
- Render gameplay sprites only at integer scale with nearest-neighbor
  interpolation. Do not mix sprite resolutions inside one depth layer.
- Use a top-left dining-room light and a low secondary ember light. Limit each
  material to two or three value steps plus a controlled highlight.
- Cuts must differ by thickness, shape, fat structure, and label—not hue alone.
  Food art must match actual recipe components; decorative garnish cannot imply
  an ingredient the player did not use.
- Every interactive art object has a non-art label, silhouette distinction,
  focus state, and 44×44 CSS px hit target.

## 9. Motion and sound-ready cues

Motion answers what changed, what caused it, what needs attention, or what is
alive.

- Coal breathes in staggered 2–4 frame loops at 4–6 fps.
- Raking resolves in 4–6 frames; moving and turning a cut in 4–8 frames at
  8–12 fps.
- UI state changes use 120–200 ms step or transform/opacity transitions.
- The signature service motion is **bell → score sweep → pass**: one brass cue
  crosses the table stave as plates leave together, lasting 450–700 ms.
- Carving gets one restrained cross-section reveal. Routine success does not
  trigger confetti, rarity beams, screen shake, or random celebration.
- Long waiting states show elapsed time and plain text. No animation is allowed
  to imply transaction finality.

Reduced motion replaces travel and ambient loops with immediate state swaps,
a static score cue, and equivalent text. Sound, music, shake, flashing, and
motion controls are independent and persisted. Critical timing is never audio
only.

## 10. State and copy contract

Design all of: first run, guest play, pre-service setup, ready, active heat,
safe rest, attention needed, recoverable miss, table callable, service settled,
loading, partial data, offline, disconnected wallet, connecting, wrong network,
review, wallet requested, submitted, included, confirming, success, cancelled,
rejected, timeout, contract mismatch, stale indexer, reorg, and unavailable.

Gameplay copy states the cause, current truth, and available recovery. Examples:

- **The strip is ahead of its sides. Rest it for a softer crust, or slice it as
  the house special.**
- **Table two can be called now. The gratin will be warm, not crisp.**
- **Wallet request cancelled. Nothing was spent; your service remains saved.**

“Perfect,” “rare,” and “valuable” never imply market value. Onchain receipts
show account, network, contract/version, exact payload or asset change, fee,
operation hash, timestamps, confirmations, manifest, and finality.

## 11. Accessibility requirements

- Target WCAG 2.2 AA with keyboard, switch, touch, and pointer parity.
- Coal raking, cut movement, service-score rearrangement, and carving all have
  select/preview/apply alternatives; none is drag-only or gesture-only.
- Focus order follows room promise → coal/cut → rest → sides → pass → result.
- Visible focus is a 3 px Brass or Electric blue frame with contrasting offset;
  it is never hidden by the pixel border.
- Dialogs and sheets trap focus, name themselves, and return focus to the
  invoker. Live regions announce a timing/state transition once, not every tick.
- Targets are at least 44×44 CSS px. Text supports 200% zoom and user font
  scaling. Hashes and addresses wrap safely and include explicit copy actions.
- Heat, doneness, rest safety, table readiness, and errors use label, shape or
  pattern, and color. High-contrast and forced-colors modes keep all core state.
- No horizontal page overflow, clipped identity, or safe-area obstruction at
  320 px. The first service must be playable with one hand on a 390 px viewport.

## 12. Relationship to sibling titles

### Shared with the restaurant group

- Integer-scaled pixel-world coherence and strong silhouettes.
- Four-pixel corner notch used sparingly for group identity, focus frames, and
  provenance badges.
- 4 px UI rhythm, 44 px targets, readable failures, reduced-motion parity, and
  keyboard/touch/pointer equivalence.
- Plain-language ownership review that distinguishes requested, submitted,
  included, confirmed, and final.
- Optional passport/preferences and non-power cosmetic cameos only.

### Explicitly not shared

- No Dos Esposas clustered pantry/workbench, hot cantina palette, food-machine
  hero, quantity-combine grammar, impact cadence, mascot voice, or page layout.
- No Samurai Sushi counter strip, linear station sequence, washi/nori/indigo
  palette, precision plating rhythm, noren motion, seal language, or quiet
  single-guest composition.
- No universal HUD, ticket card, progression map, station component, score
  language, navigation shell, animation timing, or shared economy surface.

With wordmarks hidden and the palette removed, The Tender Baron must still be
identifiable by its room plan, irregular coal field, parallel table staves,
rest spans, and whole-table pass.

## 13. Acceptance gates

- `TB-UX-001`: a new player begins meaningful input within ten seconds and
  completes the walletless first service in 8–12 minutes.
- `TB-UX-002`: the player can explain which table needs attention, why, and the
  consequence of the next fire/rest/pass choice without opening help.
- `TB-INT-001`: every cut result is reconstructable from the displayed starting
  state and heat path; no hidden RNG changes doneness or economic outcome.
- `TB-INT-002`: coal raking, movement, rest, carving, and pass work without drag,
  motion, sound, fine pointer precision, or color perception.
- `TB-INT-003`: an imperfect cut or delayed side presents at least one truthful
  recovery choice; ordinary play never destroys a scarce owned item.
- `TB-VIS-001`: grayscale crops of the primary service screen remain distinct
  from Dos Esposas and Samurai Sushi without logos or palette.
- `TB-VIS-002`: all gameplay sprites pass integer-scaling and silhouette checks;
  cuts, zones, and states remain labeled.
- `TB-RWD-001`: first-service journeys pass at 320, 390, 768, 1024, and 1440 CSS
  px with no overflow, clipped actions, or safe-area collision.
- `TB-A11Y-001`: no serious or critical automated accessibility findings, plus
  manual keyboard, switch-style, reduced-motion, forced-colors, 200% zoom, and
  screen-reader journeys.
- `TB-MOTION-001`: reduced-motion play preserves all timing and causality; no
  essential state is communicated only through animation or sound.
- `TB-CRYPTO-001`: no wallet request appears before a complete local service;
  any later write has a literal preview, single pending action, recoverable
  lifecycle, and inspectable receipt.
- `TB-FAMILY-001`: swapping sibling palettes cannot make The Tender Baron read
  as another restaurant; topology and interaction grammar carry identity.

## 14. Pre-implementation proof

Before a broad asset pass, prototype only three linked surfaces with temporary
art: coal shaping and heat-path preview, active rest with one recovery, and the
whole-table pass at desktop and 390 px. Validate comprehension and input parity
there. Room decoration, restoration art, additional cuts, wallet UI, and
keepsake presentation follow only after that proof is readable and fun.

This document records intent. Root `DESIGN.md` should be generated from the
built, visually reviewed system once implementation establishes real design tokens,
components, assets, and responsive behavior.
