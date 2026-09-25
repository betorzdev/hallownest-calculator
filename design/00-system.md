# The system: audit and decisions

This is the working document. [01-web](01-web.md) brings the best practices,
[02-hollow-knight](02-hollow-knight.md) the game's language and
[03-competition](03-competition.md) what already exists. Only **what we do** is here.

Everything measured on this page was checked against the repository in September 2026:
contrasts with the WCAG formula, colours with quantisation on the sprites in `assets/`,
screenshots with headless Chrome at 1280 and at 390 px.

## 0. Status (21 September 2026)

The audit in §2 is **applied**, except the WebP images. The fonts are now self-hosted
(`assets/fonts/`, 23 September) and the charm icons, quantised to a palette (from 1.3 MB to 0.3 MB).
What has changed on the page:

| | Before | Now |
|---|---|---|
| Figures | Cinzel (no real lowercase: "0.891 s" came out as "0.891 ꜱ") | `--font-num`, a system sans with `tabular-nums` |
| Units | the size of the number | their own `.u` tag, 0.4–0.62em and in grey |
| Accent | decorated the data (the hero's `5`, the `.card-val`s) | only what's interactive; the figures, in bone |
| Ink | `--faint` at 3.2:1, fails AA in 15 places | merged into `--muted`; **the whole palette passes AA, min. 4.7:1** |
| Font sizes | 24 different ones, with half-pixel steps | 7 steps + 2 `clamp()` |
| Spacing | 358 literal px against 68 token uses | **0 literal px** in `gap`/`padding`/`margin` |
| Labels | 9 small-caps rules, from 8.5 to 12 px, up to 0.4em | two levels: Cinzel ≥13 px, and the sans at 11 px |
| Badges | 40 green chips with border and background + full-bleed magenta ribbons | chromeless text; colour is kept for what costs something |
| Surfaces | six tones within 6% lightness | the field sinks, the sheet stays |
| Footer | 14 px, 3.8:1, 115 characters per line | small print: centred across the full width, 13 px, `--ink-foot` (4.9:1, only on the page background), and a provenance line |
| Mobile | a top bar in three rows; "Got it" on top of its title | one row of three columns; the button, in its place |

**22 September 2026: the sheet is the game's Inventory screen.** With the new sections
(Combat, Journal, Hall, Pantheons) turned into game screens, the header and the sheet were left
looking like a *dashboard*. They were remade from the mockup
[`06-sheet-variants.html`](06-sheet-variants.html) (variant A1): almost pure black instead of the
slate, the arena's HUD instead of the two meters, the large nail with the cold spotlight behind,
the six figures unboxed, spells and arts as plates (as a silhouette what you haven't learnt), the
charms on a black band, the Hall's filigree in the header with the menu's motes, the figures
that flash on change and **§3's per-section tint, adopted**. Everything in §6 still stands:
nothing behind a figure, figures in `--font-num`, the accent only on what's interactive.

The same day, **Gear moved to the same language**: it was the last thing with the *dashboard*
look (slate blocks with boxed rows inside, and the labels in Cinzel at 13 px, below §4's minimum
of 18). Now it's another page of the Inventory: the black with corner brackets, your game on the
left after a rule (the five nails standing, the arts and spells as plates you tap, the body with
the game item next to the −/+), and the charms unboxed, with their cost in notch points.
Overcharm is flagged on those dots, in magenta, and not with a ribbon per card.

And then, **combat** (Combat, Hall of Gods and Pantheons): the same black screen with corner
brackets in each section's tint and no slate boxes inside. Two new tokens for what's touched on
that black, shared with Gear: `--veil` (on hover) and `--picked` (the chosen one, with
`--accent-line`). The enemy's attacks, which are just text, keep a thin rule in the tint; yours
and the charms, which carry artwork, none. The Hall's tablet wasn't touched: it was already the
game's screen.

That same day, **out went the "last change"** below the charm band: it repeated what each
figure's flash and chip already say. In its place, **Effects**: what charms do that doesn't show
in the figures (the map, the thorns, the companions, soul when taking damage…), as plates like the
spell and art ones, with the effect's artwork and when it triggers. It was chosen among three
variants in [`07-effect-variants.html`](07-effect-variants.html): the plates (B), against a list
by moment (A) and a compact frieze (C).

And at the end of the day, **the site became screens**. It was a single 4,200 px scroll (8,000 on
mobile) with five stacked applications, and it read as chaotic for four measured reasons:
everything appeared twice (the charms on the grid and in 45 cards 1,500 px further down, spells
and arts on the sheet and in Gear), the order was backwards (the guide sent you to Gear, which
was below the result, and the presets lived next to the language), there were three header
styles and two collapse buttons, and combat started at 2,600 px. Now, like the game's pause menu:
- **A one-row header** (the title centred under the filigree, small; the language, "EN · ES", and *Share* as loose text at the top right)
- **A one-row header** (the title under the filigree, small; the language and *Share*)
  and **a screen bar stuck at the top**: *Charms · Your game · Combat* in the serif, in
  lowercase and with the accent diamond in front of the active one —that's how the game marks its
  page—, the Journal apart with its completed entries, and the mini-bar on the right (outside on Combat).
- **Charms** is the sheet, with the charm band moved up under the HUD and **the charm's detail**
  in the space below the notches: what the floating inspector did, without floating. The 45 cards
  were removed: they repeated the grid. **Your game** is Gear's four blocks in two rows, with the
  presets under the title. **Combat** carries its three tabs as its title.
- **A single screen header**: the title centred in Cinzel with its rule and the diamond, inside
  the black, on all three. No collapse buttons or floating button.
- The screen goes in the URL (`view=`), outside the build, and Back/Forward only change the
  screen. The backup from before is at `../hollow-antes-de-reestructurar`.

Right after, **the figures went back to the top**: with the band under the HUD, the damage and
the DPS sat below the grid and often couldn't be seen, and the charm's detail (0 to 10 lines)
made the band grow and shrink on hover. Now there's **a status block in one row** —the HUD with
health and soul as figures only, with no notes; the nail damage with the small nail; the six
figures in 3×2—, which fits with the grid in 800 px of height; the band goes like the game's charm
screen (Equipped and Notches on top, the grid and **the detail to its right, at a fixed height**,
with the list in six lines and "and N more"); with a mouse, **the figures themselves show "→ what
would remain"** when hovering a charm; and the mini-bar adds the DPS. The backup from before:
`../hollow-antes-del-estado`.

And **out went the footer** (the wiki note, the rounding and Team Cherry, with §5.10's provenance
line): Albert removed it from every screen. Where the numbers come from and the artwork credit
are still in `README.md` (since 23 September 2026, `docs/guide.md`). (On 23 September 2026 a smaller footer came back, only with the
fan-project notice, © Team Cherry and the wikis under CC BY-SA, for publishing the repo:
`renderColophon` in `js/app.js`.)

And **the Hunter's Journal became the fourth screen**: it was a full-screen `<dialog>` (like the
Hall's tablet), made before there were screens, and it was left as the only tab that covered the
site. Now it goes like the others —centred header, corner brackets and its tint, `--tint-journal`
`#BCE6F4`, §3's "Enemies" one—, in the URL (`view=journal`) and with Back; the list and the page
measure the window under the bar and scroll inside.

On 23-Sep, **the Journal became an open book** (before, it was the only screen with boxes inside
boxes and form controls). No cards: the Hunter loose with his light and the counts like the sheet;
the index and the entry, two pages with a **spine** (a rule in the tint, with the fold's light in
an ellipse so it doesn't read as a box edge; no corner brackets of its own, since with the
screen's they made two frames) and the entry number (`No. 42`) tiny underneath. The row being read is marked with **the Arena
picker's rectangle** (`--picked` and the accent rule; at first it was a halo behind the medallion); the tabs and the state, as text with an underline. The portrait, at 300 px with the
arena's light. **The Hunter's notes are handwritten** (`--font-hand`, Patrick Hand SC, chosen over
Architects Daughter for legibility) and, with the entry encountered but not completed, they're
there but **blurred**; on completing it, the ink settles (a fade, no motion). The parchment that
was proposed was discarded: the game isn't parchment and it would have broken with the other
three screens.
That same day, **make it obvious that it's marked**: the control ("Not encountered · Encountered ·
Completed", with no label in front) moved from the foot of the page to the top, before the portrait (at 768 px tall
it sat 600 px below the window); the Journal opens on the first entry you're missing (it used to
open on Crawlid, which has no control), and next to the counts the Hunter says how it's marked.
And **the screen fits without scrolling**: the Hunter smaller (artwork at 110 px, his line and the
figures one step down, the small print of the rules in the counts' `title`), and the book
measures what's left of the window below him (`hjFit`, minimum 300 px), with the portrait in
proportion to the book (`26cqh`). It fits whole from about 850 px of height; below that, it
scrolls a little.
**Mark in bulk**, unboxed: collapsed, a text button at the foot of the book; open, it grows
upwards (`column-reverse`, the button doesn't move) in three lines —which ones it acts on, the
three actions as text with their figure, and the button with All · None—, so the list stays in
view while boxes are ticked. The long help (Shift, Space, the Mark) goes in the `title`.

**The Arena's enemy picker, in one tap**: hovering a row reads it on the page (the arrows too)
and tapping it picks it (Enter too). Out of the page went "Fight", "Back to the fight" and "See
their statue", and the double click: the page is read-only. On mobile, with no "hover", only the
list remains. The dropdown says "Select enemy" / "Close", and "Reset" is text with its circled
arrow. In both Journals (the picker and your game's) **hovering peeks the entry on the page
without moving the rectangle**, and on leaving the list without tapping the selected one comes
back; **selecting is a click**. In your game's it matters: when you take the mouse to the page to
mark, what you mark is always the rectangle's one.

That same day, in one batch: **the Hall's tablet is read inside its tab** (in place of the
statues, with no veil or full screen, with "‹ Statues" in its ink); **when hovering a charm,
Notches shows the ones it would take** (a lit ring that pulses, magenta if it overcharms, dimmed
the ones that would be freed, and "2 free → 0" alongside); **the arena explains what doesn't read
on its own** with a "?" that opens, below, the sum with the real figures (the spells' notches,
Cyclone Slash, Focus, the Dream Nail and a legend for the enemy's side); the mini-bar also shows
on Combat, with the build you're fighting with; with no charms, Equipped is just the slot; and
the charm's detail no longer carries an equip button: it's read-only.

What's left from §5: **self-hosting Cinzel and Spectral, subsetted** (today they still come from
Google Fonts, and offline the identity falls back to Georgia without warning) and **the images to
WebP** (1.85 MB in 73 PNGs → ~406 KB). And the whole product, §5.11–14.

## 1. What's right and mustn't be touched

It's worth starting here, because it's more than it seems and it's the first thing that breaks
when refactoring.

- **The page background is the game's main menu, and it's well measured.** Our `#16203A` gives
  H223 S62 V23; the real menu's gradient, measured on the official screenshot, gives `#203050` =
  H220 S60 V31. **Three degrees of hue and two points of saturation apart.** It isn't touched.
- **The corner brackets (`.bk`) are the right pattern.** The Hunter's Journal doesn't use closed
  frames: it uses corners and a centred flourish. We were already doing it by instinct and it
  matches what was measured.
- **The palette passes AA almost entirely.** Twelve of the fourteen ink colours reach 4.5:1 on
  every surface; eight reach AAA.
- **Data in `.js` and not in `.json`.** It's what allows opening `index.html` with a double
  click: ES modules and `fetch()` are blocked by `file://` (opaque origin). It isn't a
  shortcoming, it's the right decision and it has to be kept.
- **The state in the URL's hash**, readable and with only what differs from the base.
- **The `prefers-reduced-motion` block** and the overcharm flash only firing when the user causes it.
- **Spectral for the body.** The game uses Perpetua, but Perpetua is documented as having
  *"a small x-height that hurts reading"*; Spectral is a serif designed for screens. It's the
  right substitution, not a patch.

## 2. The audit

### 2.1 Accessibility — a single real failure, repeated fifteen times

| Colour | On `--card` | Verdict |
|---|---|---|
| `--ink-strong` #f7f9fd | 17.6:1 | AAA |
| `--ink` #f0f2f8 | 16.6:1 | AAA |
| `--ink-2` #a7b0c6 | 8.6:1 | AAA |
| `--label` #8f9ab4 | 6.6:1 | AAA |
| `--muted` #7b85a2 | 5.1:1 | AA |
| **`--faint` #64708e** | **3.8:1** | **fails AA** |
| **`--medal-off-ink` #616d88** | **3.6:1** | **fails AA** |

`--faint` is used in **fifteen places**, several at **10–11 px in small caps with wide
letter-spacing** —`.block-head`, `.group h3`, `.stat-detail h4`, `.insp h3`, `.minihud i` at 8.5
px—, which is the worst possible case: thin strokes, minimum size, low contrast. There's no
"large text" excuse.

**Fix:** raise `--faint` to **`#7E8084`** (4.5:1) or, better, **merge it with `--muted`**: if two
greys can't be told apart, they're the same grey with two names. And `--medal-off-ink` to `#86888C`.

Also, on the screenshots:

- **Nothing is right-aligned.** `grep -c "text-align: right"` → **0**. No column of numbers can be
  scanned vertically.
- **The `.tnum` class is defined and used nowhere.** `font-variant-numeric` only appears in the
  stat detail and in the inspector. The hero's big number, the cards' badges and the full sheet's
  eight tables carry **proportional figures**: they dance.
- `scroll-margin-block-start` is missing with the sticky compact bar on mobile: when tabbing, the
  bar covers what's focused (WCAG 2.4.11).

### 2.2 Type scale — there's no scale

**23 different sizes**, with half-pixel steps: 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 15 /
15.5 / 17. Nobody tells 13 from 13.5; what that difference does is spend a decision and leave
a misaligned edge. GOV.UK runs an entire national service with **seven steps**.

### 2.3 Spacing — the system exists and is skipped 78% of the time

| | |
|---|---|
| Uses of `var(--s-N)` | **68** |
| Literal pixels | **244** |
| Distinct px values | **62** |

And the scale itself breaks the rhythm where it shows the most: `--s-5: 22px`, `--s-6: 26px`,
`--s-7: 34px`. Between 22 and 26 there's no perceptible difference; they're two decisions for a
single result.

### 2.4 Performance

- **1.85 MB in 73 PNGs.** Converted to WebP q82: **406 KB, 78% less.** With AVIF, Baseline
  *widely available* since July 2026, less still.
- **Cinzel and Spectral are requested from Google Fonts** while the README says "open
  `index.html` in the browser". Offline, the whole identity falls back to Georgia **without
  warning**. They have to be self-hosted and subsetted: for Spanish and English, Latin plus
  `áéíóúüñ¿¡«»` is enough, a tenth of the glyphs.
- The charm icons are ~130 px and are painted at 36–56 px. Right for 2× screens, but they lack
  explicit `width`/`height`.

### 2.5 Mobile

- The top bar **breaks into three rows** and leaves "Share" loose and centred.
- In the first-use guide, the "Got it" button sits **on top of the title** (`position: static` in
  the ≤899 px block): it reads "Got it / HOW IT WORKS". (The guide was removed on 25 September 2026.)
- The rest —the one-column stack, the sticky compact bar, the inspector anchored at the bottom—
  is well solved. (Since 22 September the compact bar lives inside the screen bar and the
  inspector is the charm band's detail: §0.)

### 2.6 Modern CSS still unused

A single `container-type`, and no `clamp()`, `@layer`, `color-mix()` or `:has()`, all already
*widely available*. It isn't a failure, but they're four tools that would remove code: `@layer`
ends the specificity wars, `color-mix()` derives the hover states in one line and `clamp()` would
make half the rules of the three breakpoints unnecessary.

## 3. The pending decision: the accent

`css/tokens.css` defines `--accent: #9ec6ea` and justifies it as **"the blue of soul"**.
Checked against our own sprites:

| | Measured | HSV |
|---|---|---|
| Soul (`assets/hud/soul.png`) | `#ECECEC` | **0% saturation** |
| The orb (`soul-meter.png`) | `#F9EEF1` | S 4% |
| Lifeblood (`mask-lb.png`) | `#63BDD7` | **S 53%** |
| Our accent | `#9EC6EA` | S 32% |

**The game's soul is white.** The game's saturated cyan is **lifeblood**, which already has its
own token (`--lifeblood-line: #7ec8de`). So the current accent is neither soul nor lifeblood:
it's an in-between blue that also **clashes semantically** with lifeblood.

**Decided (21 September 2026): the accent gets less work.** It doesn't decorate data. The
figures go in `--ink-strong` —like the game's HUD, which is bone— and `--accent` only marks what
responds to the finger: focus, hover, equipped. Left with a single meaning, it no longer matters
that it isn't "soul": it no longer says anything about the data it accompanies. The per-area tint
(option 1) is still the study's best idea and was waiting for there to be sections to tint.
**Adopted on 22 September 2026**, now with five: `--tint-sheet` (`#D5DDFD`) for the sheet, the
guide and Gear, `--tint-combat` (`#F8CFFC`) for combat and Godhome's for the Hall and the
Pantheons. It goes on titles, corner brackets and ornaments, never on data or on what's
interactive, so the accent keeps its only job.

The three options that were studied, in order of what they would do:

1. **Adopt the game map's accent system.** It's the most usable finding of the whole research:
   the map screen is pure black with each region in a **pale, desaturated tint** of its area
   (S 12–23%, V 95–100%). One accent per section —Charms `#D5DDFD`, Bosses `#F8CFFC`, Enemies
   `#BCE6F4`, Builds `#D8FFCC`, Godhome `#F7D9A7`—, all **above 12:1** against the background.
   Faithful to the game and accessible without effort, which is a rare combination.
2. **Keep `#9EC6EA` but change its name and comment**, and reserve the saturated cyan
   exclusively for lifeblood. Cost: zero. Benefit: the token stops lying.
3. Keep it as it is. It works visually; you just have to know that the justification written in
   the file is false.

## 4. The proposed system

### Typography: seven steps, three families

| Token | px | For what |
|---|---|---|
| `--fs-2xs` | 11 | small-caps labels, units |
| `--fs-xs` | 13 | dense cells, badges |
| `--fs-sm` | 14 | secondary interface |
| `--fs-md` | 16 | body ← base |
| `--fs-lg` | 18 | prose, lead paragraph |
| `--fs-xl` | 24 | block titles |
| `--fs-2xl` | 34 | large figures |
| `--fs-3xl` | `clamp(2.5rem, 2rem + 2.5vw, 3.75rem)` | the page title |

Three families, each with a job:

- **Cinzel** — section labels, in capitals, `letter-spacing: 0.14em`, **minimum 18 px**. (Today
  we go down to 10.5 px with 0.24em: below 12 px a Roman capital's wide tracking stops reading as
  a word and starts reading as separate letters.)
- **Spectral** — prose, flavour text, descriptions. Italics for what in the game is flavour text.
- **A sans with tabular figures** — **every** table of numbers. It's the deliberate departure
  from the game, and it defends itself: the game never had to align a column of damage.
  `font-variant-numeric: tabular-nums` and numbers on the right.

In Spanish, no `letter-spacing` above 0.14em and no headers that truncate: **let them break onto
two lines**, because Spanish takes up ~20% more.

### Spacing: eight steps and not a single loose px

```
--sp-1:4  --sp-2:8  --sp-3:12  --sp-4:16  --sp-6:24  --sp-8:32  --sp-12:48  --sp-16:64
```

Deliberately non-linear: a 4/8/12/16/20/24 scale gives adjacent values that can't be told apart.

### Colour: surfaces by tone, never by shadow

What we already have is right in structure. The changes are three: **raise `--faint` to 4.5:1**,
**derive the states with `color-mix()`** instead of picking them by hand, and **decide the
accent** (§3).

```css
--row-hover: color-mix(in oklab, var(--card) 94%, var(--accent));
--accent-hover: oklch(from var(--accent) calc(l + .06) c h);
```

And accent fills **always with dark text**: white on `#C9A227` gives 2.4:1.

**Godhome (decided on 21 September 2026): a light, never a gold box.** The Hall's statues are
almost black silhouettes and need light behind them; the light is a radial halo
(`--godhome-light`, `-rest`, `-off` in `tokens.css`) centred under the body and faded into the
surface underneath, with three intensities depending on the state, and the pedestal is a rule of
`--godhome-line`. Thirty-five identical gold rectangles weighed more than the silhouettes.

### Motion

~250 ms to respond to an interaction, ~400 ms for a fade, `cubic-bezier(.4,0,.2,1)`, **no
bounce**. The game doesn't have a single transition with overshoot.

## 5. The plan, by value-to-cost ratio

### Now (hours, not days)

1. **`--faint` to 4.5:1** or merged into `--muted`. Fifteen uses, one accessibility failure fewer.
2. **Put `.tnum` to work** and **right-align the numbers** on the full sheet and in the badges.
   Half an hour, and it's the biggest visible jump towards "this looks professional".
3. **Self-host Cinzel and Spectral, subsetted**, in `assets/fonts/`. It removes the network
   dependency and fixes the site opened with a double click, which is the use case the README promises.
4. **The images to WebP with a PNG fallback**, and `width`/`height` on every `<img>`. **−78% of
   the bytes** and zero CLS.
5. **Fix the two mobile failures**: the top bar in three rows and "Got it" on top of its title.
6. **`scroll-margin-block-start`** so the compact bar doesn't cover the focus.

### Later (the refactor, in a single move)

7. **Collapse the 23 sizes into seven** and the 62 spacing values into eight. It's mechanical and
   it has to be done in one go, not drop by drop.
8. **`@layer`** (`reset, tokens, base, layout, components, utilities`) and `clamp()` for the title
   and the body, which lets you trim rules from the three breakpoints.
9. **Decide the accent** (§3) and, if the map's system is adopted, one tint per section.
10. **A data provenance line** in the footer: "Data: community wiki · patch 1.5.78.11 · checked
    in September 2026". It's what separates a reference site from a blog, and in an ecosystem
    where badly worked-out figures already circulate it's our moat.

### The product (what nobody else has)

11. ~~**Add the enemies.**~~ **Done (21 September 2026).** `js/enemies.js` carries **180
    entries** —51 bosses with their attacks in both languages and 129 enemies— with normal,
    Attuned and Ascended health, and the masks each attack takes from you.
    It goes in as an assignment, not a `fetch`, so it still works over `file://`. On top of it
    goes the **combat simulator**: one card per entity —the boss and each of its parts at normal
    size, the minions smaller—, each with its own attack buttons, and you choose who you hit. The
    14 bosses that aren't a single bar carry their phases (the Mantis Lords: 210, and then
    160+160), and the minions come out for real.
    The portraits (`assets/enemies/`, **180 PNGs, 1.12 MB** already quantised: all 180 entries
    have theirs) are downloaded by `tools/fetch-enemies.js`.
    The Spanish names are being switched to the official ones —the English wiki's `Localisation`
    block and the Spanish wiki, which is now accessible—: **152 of the 180** entries carry them
    as of 21 September. The rule is that nothing is translated by hand.
    On top, the **Pantheons** tab: all five, room by room, with the **bindings** applied by the
    engine (the Nail Binding leaves the hit at 4/7/10/13/13), a **timeline** with what's cleared
    and what's current, and **rests where the user chooses what to do** —hot springs, bench,
    Lifeblood Cocoon, changing charms—, because the order matters: the bench wipes the cocoon's
    lifeblood. Health and soul carry from room to room.
12. **The verdict sentence.** A number is data; *"48 hits, 24 fewer than with your previous
    build"* is an answer. It's the pattern that made the Pokémon Showdown calculator ubiquitous,
    and **no Hollow Knight website does it**.
13. **A damage-per-notch ranking** against the chosen target. The star view, and it doesn't exist
    anywhere.
14. **"Show the sum"** on every derived number. We already do it on the full sheet; it has to be
    extended to everything. With invented numbers circulating on SEO sites, showing the
    arithmetic is a defence.

## 6. What we're not going to do

- **Background illustration behind the tables.** The game's backgrounds read because there's
  nothing on top of them.
- **Cinzel in the body or in the cells.** It's all caps and has no usable lowercase.
- **Thin serifs at 13 px on dark.** Their strokes disappear; it's the number one failure of
  "Hollow Knight style" websites.
- **Parallax.** The game's works because you move horizontally at a controlled speed. Here you
  scan looking for numbers.
- **`#000` background or `#fff` text.** Pure white on near-black gives 18–21:1 and produces
  halation; the target for main text is **12–15:1**, not 21:1.
- **Reproducing the game's hiding of information.** The charms' flavour text is lovely inside
  the game and useless outside it. **We reproduce its calm, not its mystery.**

## 7. The brief, in one sentence

**Make it look like a page of the Hunter's Journal, not a screenshot of Hallownest**: an almost
black field, one card, bone-coloured serif prose, one area tint per section, ornament only in the
corners, and the numbers in a clean sans, aligned. *Dark elegance and melancholy* —the brief Team
Cherry gave their composer— but legible at 13 px.
