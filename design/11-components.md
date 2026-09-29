# The component system

Started on 27 September 2026, once the content was complete. The tokens (`css/tokens.css`)
were already sound (see [`00-system.md`](00-system.md)); what had drifted was the level above:
`css/app.css` grew screen by screen, and the same control was re-invented under different
names (~15 button classes for four jobs, three search fields, two number steppers).

The pass goes from the general to the specific, one round at a time, each chosen with Albert on
the living catalogue [`11-components.html`](11-components.html). It loads the site's real CSS
(open it with a double click), and every decision stays there as the reference.

| Round | What | State |
|---|---|---|
| 1 | Foundations: tracking, control heights, interface icons | **decided 27-sep, applied** |
| 2 | Buttons: four kinds (menu, text, icon, disclosure), redesigned so they read as buttons at rest | **decided 27-sep, applied** |
| 3 | Choosing and typing: choose one, on/off, search (and the steppers' number, done in round 2) | **decided 27-sep, applied** |
| 4 | Showing: tags and chips, filters, notices; the section title and the bracketed panel stay | **decided 27-sep, applied** |
| 5 | Patterns: the open row, empty states, what you don't have yet; the screen header stays | **decided 27-sep, applied** |
| 6 | Screen by screen: what didn't follow the system, screen by screen | **decided 27-sep, applied** |

## Round 1 · Foundations

**Tracking: one token per use, not per element.** Thirteen `letter-spacing` values (0.01–0.3em)
became four:

| Token | Value | Use |
|---|---|---|
| `--track-title` | 0.04em | the display face at title size (the site's title, the Knight's and the enemy's names, the toast); also the squeeze of a Cinzel control that must fit on a phone |
| `--track-label` | 0.08em | the sans's small-caps labels (level 2, `.lbl`), 11 px |
| `--track-caps` | 0.12em | Cinzel in small capitals: buttons, tabs, section titles |
| `--track-wide` | 0.2em | the super-title over an area's name, the note under the Hunter's name |

Figures stay at 0 (`--font-num`, tabular). The Hunter's handwriting takes `--track-title`.

**Control heights: two with a mouse, 44 px with a finger.** `--ctl-sm` (32) and `--ctl` (40);
under `@media (pointer: coarse)` both become 44, the touch minimum in Apple's and Google's guides.
That replaced nine heights (22–54) and the scattered `pointer: coarse` overrides. The game's
pieces (charms, notches, spell dots, mask shards) are not controls: their size comes from the
sprite and stays where it is.

**Interface icons: `.ic`, 12 px, or `.ic.is-lg`, 16 px, with a 1.6 px stroke.** The width sets
the size, the height follows the viewBox, and `vector-effect: non-scaling-stroke` keeps the
stroke at 1.6 screen pixels whatever the drawing's units. Use 12 inside text (chevron, back,
undo, reset, the Journal's tick) and 16 for an icon alone in a button. Ornaments (rules,
diamonds, the fleur, the lever, the GitHub mark) aren't interface icons and keep their own sizes.

## Round 2 · Buttons

The rule for all four: **a button reads as a button at rest**, with no mouse over it, on a phone
and the first time. Before, the menu button's hairlines were at 55% and faded at both ends, and
"Clear", "Share", "← Saves", All · None and the steppers were grey text with nothing around them.
~15 classes did four jobs; now there are four.

| Kind | Class | Job | Look |
|---|---|---|---|
| Menu | `.btn` (+ `.btn-primary`, `.is-danger`) | a screen's or a dialog's actions | a thin frame with the panels' corner brackets in the accent; primary, longer brackets and a veil of the accent (one per screen); `.btn-lg`, taller and in `--fs-sm`, only for the call-to-action a flow ends in (the import preview's *Import*); danger, red at rest |
| Text | `.text-btn` | an action inside a line or a list | the secondary ink, always underlined with the accent's line; an icon in front (✕, ↶, ←) isn't underlined |
| Icon | `.icon-btn` | a glyph alone: close, − and + | a thin accent ring inside a `--ctl-sm` hit area; fills with the accent under the pointer; always with `aria-label` |
| Disclosure | `.disc-btn` (+ `.disc-ring`, `.is-pick`) | opens something below, without leaving the screen | a row between two rules, the label on the left and the chevron in the icons' ring on the right, lit while open; `.is-pick` is the picker's form (what's chosen + what the button does) |

What moved:

- `.eq-clear`, `.hj-bulk-btn`, `.hj-pick-btn`, `.imp-back` and `.mh-link` are `.text-btn` with
  only their layout left in their own class.
- `.step` and `.hj-step` are `.icon-btn`; the stepper around them lost its box, and the number sits
  in a sunken well with its rule. The map's zoom keeps its boxed toolbar (a control floating over
  the map), and `.banner-close` is gone (the map card's close is an `.icon-btn`).
- `.help-q` keeps its small ring inside the row's full height, now in the accent's line.
- `.toggle-all` ("See every stat") and `.jr-toggle` (the enemy picker) are `.disc-btn`.
- The fleur pointers left `.btn`: the frame is the focus mark's place now, and the browser's focus
  ring is back.

**The exception:** the screens copied from the game keep the game's own unboxed controls in their
ink: the Hall's tablet (`.tablet-back`), the save slots (`.save-act`, with its fleurs) and the
header's save selector (`.mh-save`). A box there looked pasted on (22-sep).

The Hall's "Mark in bulk" (a `.btn`) and the Journal's (a `.text-btn`) were settled in round 3.

## Round 3 · Choosing and typing

The same rule as the buttons: what can be touched looks it at rest. Choose-one groups were grey
words with the chosen one underlined, so the others read as text; there were six of them.

| Component | Class | Look | Used by |
|---|---|---|---|
| Choose one | `.seg` (`.seg.sm`) | each word on a faint line of the accent (40%); the chosen one in bone on the accent's line, doubled with a shadow so nothing moves; a count in `<i>` | compare with, the import's systems, the Journal's filters (`.hj-tabs`) and an entry's state (`.hj-state`, its `·` separators gone), the enemy picker's kinds, the language (`.langsel`, its `·` gone), a spell's side (`.sd-side`) |
| On/off | `.check` + `.check-box` | a 16 px square on the accent's line; on, filled with the accent and a dark tick | the map's layers (native checkbox), the Journal's row picks (`.hj-pick`, was `.hj-box`), following the game (`.imp-sync-v`, was a `.btn` with a diamond) |
| Search | `.search` | a sunken well with its rule and the lens in front (the steppers' number well); the rule takes the accent under the pointer and, doubled, while typing | the Journal (`.hj-search`), the enemy picker (`.jr-search`), the map (`.pgm-q`) |
| Mark in bulk | `.text-btn.bulk-toggle` | a text button with the chevron; open, in bone on the accent's whole line | the Hall and the Journal |

`.search` and not `.field`: `.field` was already the Body rows on Your game. The lens and the tick
are `App.lens` and `App.tick` in `js/app.js`. The screen-level tabs (`.tab`: Hall of Gods | Pantheons)
and the site's bar (`.nav-tab`) are headers, not choose-one groups: they go with round 5's screen header.

## Round 4 · Showing

The rule round 2 left: **a frame says "press me"**, so what only informs carries none.

| Component | Class | Look | Used by |
|---|---|---|---|
| Tag | `.tag` | small capitals in the secondary ink after the game's hollow diamond (`--diamond`, 5 px); no box | "Example" on Your game (`.hmI-tag`), the kind of a change (`.hm-item-k`), Steam on the import (`.imp-steel`) |
| Chip | `.chip` | the tag without the capitals (it carries charm names and values), after the same diamond; `.chip-charm` takes the accent under the pointer, `.syn` the conditions' ochre | the full sheet's rows |
| Filter | `.pg-area.pgm-kind` + `.check-box` | an on/off: the round 3 box in front, its icon (grey when off) and its count | the map's layers |
| Notice | `.banner` (`.is-run`, `.is-hint`) | the level's 2 px rule on the left and a breath of its colour (7%) behind; tag and text in the level's inks | overcharm (danger, magenta, the default), in a pantheon (a condition, ochre), your real game (information, bone) |

Unchanged: the floating notice (`.toast`, the game's on-screen message), the overcharm note inside
the charm band (`.banner.is-band`, unboxed), the live save's lit diamond (`.save-tag`, a state
light), the keycaps of the import (`kbd`, boxed by convention), the section title (`screenHead()`:
Cinzel in the section's tint, the rule and its diamond in the section's lamp) and the panel's corner
brackets (2 px, the buttons' brackets writ large).

## Round 5 · Patterns

| Pattern | Where | Look |
|---|---|---|
| The open row | `.jr-row.is-cur`, `.hj-row.is-cur`, `.pg-row.is-open > .pg-head` | the accent's 2 px bar on the left over the chosen veil (`--picked`); it was a frame in the Journal and the enemy picker, and a frame says "press me" |
| The chosen one | `.jr-row.is-on`, `.foecard.is-on` | the same bar without the veil (the enemy you fight while reading another) |
| Empty | `App.emptyHtml(text, action, { tag, cls })` → `.empty` | centred under a short rule with its diamond (the screen title's rule, 128 px), in the secondary ink, with the action that solves it when there is one; `.is-inline` drops the rule and sits on one line, for a slot that must keep its height (the enemy's attacks, which now carry "Select enemy") or a dropdown (the map's search) |
| What you don't have yet | `--missing-art` | one grey, `grayscale(1) brightness(0.4)`, for the charm not found, the Journal entry not encountered, the Hall symbol not won and the map layer that's off (it replaced `--charm-missing-art` 0.38, `--hj-unseen-medal` 0.42, the Hall badge's 0.5 at 75% and the layer's 50% opacity) |

The screen header was already one (`screenHead()`: the title in Cinzel in the section's tint, the
rule with its diamond, then the screen's own line). One fix: the title takes the focus on opening,
for screen readers (`tabindex="-1"`), and headless Chrome showed it the focus ring as if it were a
control; a heading with `tabindex="-1"` shows none now.

## Round 6 · Screen by screen

The ten screens, checked against rounds 1 to 5. Most already followed the system; what didn't:

| Screen | What didn't fit | Now |
|---|---|---|
| Hall of Gods, Pantheons | the chosen statue and the chosen pantheon in a frame (a frame says "press me") | no frame: its light on (it already was) and its pedestal, the niche's or the door's bottom edge, in the accent |
| Your game | the cards that lead to another screen (Progress, Map, Your shade, Journal, Just try builds) read as text at rest | an arrow in the accent after each title, stepping forward under the pointer |
| Progress | the rows open below, with no sign of it | the disclosure's ring with its chevron at the end of each row, lit while open |
| Inventory | the spell and ability levels marked the chosen one with a veiled box | a choose-one (`.seg`'s look): each on its faint line, the chosen one on the accent's line, doubled |
| Inventory, Charms, Combat | **a white light behind every plate you have**: with a full game, ~30 of them, so it said nothing and competed with the nail's spotlight; and what you lacked had a dimmer one, so every plate glowed | the light goes only where you look, as in the game's Inventory: under the pointer or the focus, and a moment (`halo-flash`, `--dur-flash`) on the plate that just changed; what you have shows in colour, what you don't in `--missing-art` (it was a black silhouette, which needed its light to be seen at all) |
| Charms | "Tap a charm to equip…" in the empty detail pane, in grey italics | the empty state (`App.emptyHtml`) |

Left as they are, on purpose: the screen bar's tabs and the section tabs (headers), the game's
pieces (charms, notches, masks, vessels, pedestals, the Hall's symbols), the arena's attacks and
the screens copied from the game.
