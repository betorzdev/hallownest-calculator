# Hallownest Calculator — the full guide

> Everything the site does, screen by screen, and the rules behind every number. For the
> short tour, see the [README](../README.md).

A site for seeing **how the Hollow Knight Knight's stats change with each charm** (and with
each permanent upgrade). You pick what you're wearing and the sheet shows you every value, how
much it has changed and which charm changed it. In Spanish and in English.

No framework and no build. Open `index.html` in the browser, or serve the folder:

```sh
python3 -m http.server 8000    # then http://localhost:8000
```

## What's on the page

The site is made of **screens, like the pages of the game's pause menu**: one shows at a time.

- **Header**, in one row: the title under the game's filigree —the one from the Hall of Gods
  screen, `assets/hall/tablet-hdr.png`, white as there and small—, which is the header's only
  ornament and, like the logo on almost any website, a link to the start screen (Charms). On
  its left, what belongs to the site: the language (English / Español; until you choose, the
  site follows the browser's language, English if it's neither) and *Share*. On its right,
  what's yours: the save selector (the Knight and the save you're playing, or *Select save* in
  free mode; it opens [its screen](#saves)). It isn't a footnote link: the Knight stands under a
  lamp's light that breathes, the label goes in the game's menu capitals, and on hover or focus
  the Knight lights up and the menu's pointers appear either side. Behind
  it, as behind the whole page, the main menu's atmosphere (`.atmos`, fixed to the window): a
  vignette that sinks the four edges to the menu's measured `#04060C`, **22 dust motes** rising
  slowly from the bottom of the window to the top (with `prefers-reduced-motion` they don't
  appear) and a noise grain at 2.5% (an inline SVG, so it works over `file://`). All of it sits
  under the content: the screens' black covers it, so it shows in the header, the margins and
  between blocks, and never covers a word. On mobile it stays in one row, so content starts sooner: the title on the left,
  smaller and without its filigree, and the Knight (with the save's number, if you're in one),
  the language and *Share* on the right.
- **The screen bar**, which stays stuck at the top: **Charms · Your game · Combat · Journal · Progress**,
  in the serif and in lowercase, with an accent rule under the one you're viewing, lying on the
  bar's bottom edge like a page tab (the same mark as Combat's tabs); the Journal carries your completed entries
  over the total alongside ("2/146"), and Progress your completion ("58 %"). On a phone the five
  share the bar's width. On the
  right, the **mini-bar**: nail damage, DPS, the mask, soul and a notch, with the game's sprites
  and the same flash as the sheet, to see them while you scroll down (on mobile, when you reach
  the grid, the status block stays up top and this is what stays in view). On Combat it shows
  those of the build you're fighting with: in a pantheon room, the one frozen on entry and with
  its bindings, which may not be the sheet's. The screen goes in the URL (`view=`, in "State and
  link"): **Back and Forward** move from one to another without touching the build —going back
  from *Your game* doesn't return the nail you had—, and on reload you stay where you were.
  They also walk through the places inside a screen, which the history entry carries (not the
  URL): Combat's tabs (Arena, Hall of Gods, Pantheons), the arena's Journal open, a Hall
  statue's fight, the tablet and, on mobile, the plaque and the Journal's page read in place of
  their list. A "‹" button, closing the tablet or the Journal undoes the entry that opened them
  (it's Back), so the history doesn't pile up. The marks, a half-done fight and the build
  aren't places: Back doesn't touch them (`navNow`, `navTo` and `App.navParts` in `js/app.js`).
  Switching screens scrolls up to its start, just below the bar. Only the chosen one shows,
  but the others keep being painted, hidden (`showScreen` in `js/app.js`): that way one's HUD
  doesn't animate on return what happened while you were looking at another.
- **Charms**, the start screen: **the sheet, which is the game's Inventory screen** (the mould is the wiki's
  `Inventory_Godseeker_Mode.png`; the mockup, `design/06-sheet-variants.html`): almost pure
  black, corner brackets, the screen's title, "Charms", and, from top to bottom, **the status
  block** —everything that matters, above the charm grid and in one row, so that on an 800 px
  tall screen the figures and the grid can be seen at once (`renderStatus`)— and then the
  charm band:
  - **the game's HUD**, the same as the arena's (`hudHtml` in `js/app.js`) but larger: the soul
    orb, the frame's tail with the masks on it and the reserve vessels, with the purple aura
    behind if you're overcharmed. Below it, **health** and **soul** as figures only, with no
    other text: the HUD already draws the rest, and how the masks and the orb are touched is
    said by their `title`. The masks are aligned **by their body, not their canvas**: measured
    on the sprites themselves (alpha ≥ 128), `mask.png` carries a 51 × 66 body inside a
    60 × 86 canvas and `mask-lb.png` one of 51 × 65 inside 87 × 96, because the rest is halo.
    With `object-fit` that came out crooked —the white ones were left with 16.7 px of useful
    width and the blue ones lower—, so the slot **is** the body (`--pip-h`, `css/app.css`) and
    each sprite is scaled and shifted as needed to fit it, letting lifeblood's halo spill out,
    just like the orb's. **The masks are also the health control**: press the third and you're
    left with three, press the last and you're back to full health, and the figure says where
    you stand ("6/15", the maximum in grey). Lifeblood is spent first, just as in the game, so
    what you have left fills the white ones first, and the lost slots stay shadowed —like the
    HUD's dark gap— so you can go back up. The game's two conditional charms come from that
    health: Grubberfly's Elegy with full masks (Lifeblood Heart's and Lifeblood Core's
    lifeblood doesn't count: losing it doesn't switch the beam off, and with Joni's Blessing any
    hit switches it off) and Fury of the Fallen at 1 mask. The orb isn't drawn by hand: it's the
    game's sprite (`assets/hud/soul-meter.png`, the wiki's `Soul_Meter.png`), with the two eyes
    peeking out of the white, which is exactly how the wiki describes it: *"a circular meter
    that fills with white liquid, revealing two eye holes that give it the look of a face"*.
    **Soul can also be spent by hand**, even though no figure changes, just to see it, and it
    works as in the game: it's a single number, the orb fills first and the rest goes to the
    vessels, in order, so there's never a full vessel with the orb half-full nor the second one
    full with the first empty. Each tap on the orb casts a spell from your build (33, or 24
    with Spell Twister): the orb drops and, if the vessels hold soul, **they refill it right
    away** (half a second; the wiki says "after a short delay" without giving the figure, and
    with `prefers-reduced-motion` it's instant). When there's not enough for another, the next
    tap fills everything. A full vessel, when tapped, empties along with the ones to its right;
    an empty one (or a half-full one, which happens with Spell Twister) fills, and with it
    everything before it: the orb and the earlier vessels. The figure says how much you have
    left ("165/198"). It isn't saved: on reload, soul is full. The reserve vessels
    are the HUD's circles, with the interface's soul inside (`assets/hud/soul.png`, a white
    disc). **Only the ones you have are drawn**: the one you're missing doesn't show as an
    empty ring, because an empty vessel reads as spent soul, not as a vessel that isn't yours —
    unlike the masks, where the shadowed slot really is health you've lost. Careful: the Soul
    Vessel icon (`vessel.png`) is the **item you pick up**, not what the HUD shows;
  - **the nail damage**, in large type, with **the nail you carry** next to it, vertical as in
    the game's Inventory and with the arena's cold spotlight behind it;
  - **the six figures**, after a rule and unboxed, in two rows of three: **damage per second**, **reach** (with the charm that gives it
    to you) and **strongest hit**, and below them **hits until you die** (with its equivalent if
    you're hit for 2 masks, which is what almost everything in the late game does; overcharm
    shows here, cutting the figure in half), **soul per hit** (with the hits you're missing to
    heal) and **healing**. The strongest hit compares arts and spells **in the same unit**:
    Cyclone Slash counts by the total of its three hits, because its "per hit" figure can't be
    compared with a Great Slash, and spells by their total damage; only what's been learnt
    counts and ties go to the art, which costs no soul. The note says which one it is and what
    it costs ("Abyss Shriek · 33 soul", "Cyclone Slash · 3 hits");
  - **the preview**: with a mouse, when hovering a charm on the grid, each figure in the block
    that would change with a click carries "→ what would remain" alongside (if you already wear
    it, what would remain on removing it); on the six it takes the place of its note, so nothing
    changes height. No green, since a hypothesis isn't an advantage; what gets worse, in red.
    It goes out on click —the figure flashes with its chip— until the pointer moves to another
    charm, and it doesn't show if the effect depends on health (Fury, Elegy) or if the charm
    doesn't fit (`paintPreview`).
    The **Notches** row too: the ones it would take come out as a lit ring with the centre at
    half tone, breathing —between the used one's full dot and the free one's dark ring, in the
    same slot—, in magenta and lengthening the row if it would overcharm you; over one you
    wear, its own go out; in a partner swap (Fragile ↔ Unbreakable Heart, Grimmchild ↔
    Carefree Melody, Kingsoul ↔ Void Heart) the partner's pass to the new one, and the spare
    ones go out. The label says how they would end up: "2 free → 0", "1 free → overcharmed".
    It comes from the state the click would leave (`notchPreview`, `C.toggleCharm`); a locked
    charm has no preview, and in one column the row doesn't exceed its height, so as not to move
    the grid;
  - **the charms, on a full-bleed black band**, between two rules, laid out like the game's
    charm screen: Equipped with the grid below, and to its right, in a narrower column (336 px,
    where the eleven notches fit in a row), Notches with the charm's detail. They're two independent columns: if the notches grow (when overcharming, more dots
    and the notice come out), their column grows, but the grid stays attached to Equipped. In
    one column go Equipped, Notches, the grid and the detail, below the grid so as not to push
    it under the finger. On the band:
    - **Equipped** and **Notches**, the pair of blocks from the game's charm screen:
      the charms you wear —a click or a tap on one removes it, and the detail shows it; the
      grid puts it back— with a dark dot marking the next slot (with none equipped, the row is
      just that slot, with no text) and, in its
      header, *Clear*, as text and unboxed; below, the
      row of notches — a lit white dot per notch used, a dark ring per free notch. They all
      take the same slot, so the row is the same length full as empty and filling one doesn't
      shift the others. The dots use the HUD sprite (`assets/hud/notch-ui.png`) as a CSS mask,
      embedded in base64 because Chrome treats each local file as a different origin and blocks
      external masks over `file://`; that way they keep their silhouette and halo but can be
      tinted. If you're overcharmed, the notice shows here, below the notches: at the top it
      wouldn't be seen while you touch the grid;
    - below, the **quick charm grid**, traced from the game's charm screen: **four rows of ten
      slots**, from charm no. 1 (top left) to no. 40 (bottom right), with the even rows offset
      by half a slot. The proportions come from measuring an official screenshot (slot 0.806 of
      the pitch, rows 0.968 of the pitch, offset 0.554), so a row measures 12.85 slots and the
      slot is the grid's width over that, up to 68 px (62 px on the band at full width, 40 px in
      Your game's column), so the four rows fit at any width. Five slots change version in the game —the three
      fragile ones for their unbreakable versions, Kingsoul for Void Heart and Grimmchild for
      Carefree Melody—; if you have one (you mark it on Your game), the slot shows **only that
      one**, whole, as the game does; with neither, it splits into two shadowed halves. Only the artwork, no data: lit the ones you wear, **with a soft
      light behind them** (a radial halo in the accent, as the game marks the equipped one,
      stronger under the pointer), dimmed the ones that don't fit. A click (or a tap) equips or removes, and what each one
      does is read in the detail;
    - **the charm's detail**, to the right of the grid, which is where the game describes the
      chosen charm: on one row its name (and below it, in the other language), what it costs in
      the game's notch points —in magenta if it would overcharm you—; below, its line, a status line (overcharm, replaces, doesn't
      fit, needs…) and **what changes in your build, before → after**, with the synergies with
      what you already wear at the end of each line. With no charm chosen it shows **what the
      charms you wear add up to**: your sheet against the same build with only Void Heart, in
      the same before → after rows, and how to use it at the foot (with no charms of your own,
      only that). **It's always the same size**, also with no charm chosen, so the band doesn't grow or shrink when going from one to another: the line
      takes two lines at most (whole in its `title`), each change one and the list six; if there
      are more —Joni's Blessing and Shaman Stone—, the last one says how many remain and opens
      them on the full sheet, highlighted. It's what a floating inspector used to do, and the 45
      charm cards that used to sit below are gone: they repeated the grid. **It's read-only**:
      equipping and removing happen on the grid and in Equipped (it had an equip button, which
      repeated the same thing and was removed). With a mouse it shows the charm under the
      pointer, and the full-sheet rows it would move light up; on leaving the grid it goes back
      to the last one you pressed. With a finger, a tap equips or removes as always, and the
      detail tells what changed; if the charm doesn't fit, it says why. With the keyboard, the
      focused charm is the detail's. The ones that don't fit show what they would do anyway. It repaints on its own (`paintDetail`), without
      redoing the grid under the pointer, and each impact is computed on demand (`impact`);

  - the three **spells** and the three **Nail Arts**, **as plates**: the game's artwork on
    black, frameless, with a white light behind it (soul is white) and the figure below. What
    you haven't learnt comes out **as a silhouette and unlit**, like a dimmed Hall statue,
    instead of a box with a dash. The sprites are never stretched: the 192 px ones are scaled
    down and the fluke's, at 88, stays at its size;
  - **Effects**: what your charms do that doesn't show in the figures above —seeing your
    position on the map, thorns when taking damage, the companions, soul when taking a hit…—,
    one plate per effect like the spell and art ones: the game's artwork with its light (the
    weaverling, Grimmchild, the thorns, the map, the Shade), the figure and **when it triggers**
    (always with you, on hitting, on taking damage, on focusing…). In the corner, the charm's
    medal; if the figure comes from a synergy, both. The drawbacks (Joni's Blessing, the fragile
    ones) in red. The plates with a figure lead to their row on the full sheet. The data, in
    `CHARM_EFFECTS` (`js/data.js`);
  - **See every stat**: the full sheet, 81 stats in eight groups. It opens below its button,
    which stays in place and then closes it from the top ("Hide the detail"); when open, it
    carries an identical one at the end, and closing it from there takes you back to the top one.
    Each row carries its value, the delta against the reference and chips with the charm or the
    upgrade that contributes; pressing it expands the calculation and the breakdown. At the top
    you choose what to **compare** against: the base Knight, your same upgrades with no charms or
    a build you pin. At the end, **what your charms give you**: what each one adds.

  The sheet arranges itself by **its own width** (`container: inv`), not the window's.
- **The numbers move**: on equipping, removing or pressing a mask, each figure that has changed
  —the damage, the six, health and soul, the plates, the mobile bar and the full-sheet rows—
  **flashes once** in white (Focus's glow, not the accent). Only on the repaint that follows
  the change (`flashIds`, in `commit()`): collapsing or opening something doesn't repeat it. In
  the top part (the damage, the six, health and soul), next to it appears **what your last
  action moved** —"+22.6" on equipping Quick Slash, not the distance to the base Knight— and
  **it goes away by itself** after 4 s (`--dur-delta`, `changeChip`): it's a notice. The
  distance to the reference (base, no charms or pinned) is read on the full sheet, which is
  where it's chosen. The deltas are coloured text, unboxed.
- **What arrives moves once, too** (`App.was` in `js/app.js`: the build and the charms found
  before the change, only for the repaint that follows it). The charm you equip comes into
  *Equipped* as a light that settles and lights up once on the grid, and its notches fill one
  by one from the left; removing it, they drain from the right. *Clear* sends the equipped
  ones away one after another, from the last, fading as dust, and only then empties. The detail
  fades into another charm when it changes. On Your game, the masks, vessels and notches you add
  light up from the dark in order (the ones you remove let their light go), the nail you pick
  takes the spotlight, and a spell, art or ability you learn (or a new level of it) lights its
  plate; a charm you mark as found lights up on its grid. Screens fade in when you switch
  between them. It's all fades and light, no slides or bounces (`design/00-system.md`, Motion),
  and with `prefers-reduced-motion` only the result is seen.
- **With a mouse, what can be pressed says what it will do.** The nail damage and the six figures
  open the full sheet at their row: on hover the label takes the accent and the figure a soft
  white glow. The HUD previews the click, like Your game's pieces: the masks it
  would fill come up to half light and the ones it would empty go dim; a vessel shows whether it
  would fill or empty; and the orb shows the level a spell would leave, orb first and then the
  vessels. The spell, art and effect plates light their artwork and their halo swells a little.
  What can't be pressed (health, soul, the nail) doesn't react.
  Across the site the same rule holds: the screen bar shows the current tab's rule, faint, under
  the one you point at; on Your game the nail you point at takes a faint spotlight and the plates
  light up; in Combat an attack's artwork takes the light and the Journal picker's row its
  portrait; in the Hall a difficulty you haven't marked shows its symbol at half and the statue
  brightens; on the Pantheons a binding not marked on the door previews its light; and the Journal's
  rows light their medallion.
- **What's only to look at moves by itself**, slowly, as the game's lights and objects do (and not
  at all with `prefers-reduced-motion`): the Hunter's light and the Void Idol's breathe, and so
  does the chosen pantheon's boss; the enemy on the arena's stage floats; the diamond of each
  screen's rule glints now and then. On the HUD the soul's surface rises and falls a hair, a
  lifeblood mask breathes its blue, and the orb's rim glints while there's enough for a spell or a
  Focus.
- **The buttons are the game's menu items** (`.btn`), like the save slots': the menu's capitals, no
  box, and on hover or focus the menu's two pointers either side, which are also the focus mark.
  So that they read as buttons at rest too (on a phone there's no hover), each one sits between
  two hairlines in the accent that fade out at both ends; faint, they light up under the pointer.
  The one the screen leads to (*Enter the pantheon*, *Again*, *Import from the game*…) goes in bone
  with its hairlines whole and a soft light behind it; *Give up* turns red under the pointer, like *Clear Save*. The
  segmented choices (the import's systems, the Journal picker's kinds, what to compare the sheet
  with) are words in a row with the chosen one over the accent's rule.
- **The notices** (*Link copied*, a charm you can't touch in a pantheon, no soul for a spell…) are
  the game's on-screen messages, not a web card: the text in the game's face just under the
  screen bar —where the Journal's notice goes, and under the arena's band when it's out—, between two short rules with their diamond, over a soft dark veil so it reads on
  anything. It fades in, holds 2.4 s and fades out (`toast` in `js/app.js`). Every notice goes
  through it, the Journal's included, and its figures go in the numbers' face, not in Cinzel.
- **One tint per section**, the system of the game's map screen (`design/00-system.md` §3):
  Charms, the guide and Your game, in City of Tears' (`--tint-sheet`); combat, in Crystal
  Peak's (`--tint-combat`); the Hall and the Pantheons, in Godhome's; the Journal, in Fungal
  Wastes' (`--tint-journal`). The section titles —in Cinzel— go in the tint. The map's tints are
  so pale that three of them read as the same bone, so the **lights** carry them: each section
  has a **lamp**, its tint's hue with a fixed lightness and more chroma (`--lamp`, derived in
  `css/app.css` with relative colour; without it, the tint itself). The rule and diamond under
  the title, the corner brackets, the cold spotlight behind the Knight, the nail and the
  portraits (`--scene-glow`) and the halo behind the spell and art plates (`--halo-plate`) take
  it: blue-lavender on the sheet, pink-violet in combat, gold in Godhome, cyan in the Journal.
  The spotlight is as bright as the old cold one, so what's written over it keeps its AA. The
  screen bar's bottom rule takes the lamp of the screen in view. The figures and what responds
  to the finger don't change. The screens carry the same header, inside the black: the title
  centred with its rule and the diamond. On Combat, the title is its three tabs, with the
  active one in the tint.
- **Overcharm**, traced from the game. On crossing the threshold there's a white and magenta
  flash and a screen shake, only once (`overcharmFx` in `js/app.js`): it only fires when you
  cause it, not on opening a link that's already overcharmed, and with `prefers-reduced-motion`
  nothing is seen. With the flash, the screen edges are tinted purple for a moment and fade out
  slowly, over about two seconds: they don't stay, which was tiring. While the overcharm lasts
  the notice shows —on Charms below the notches, on Your game above the screen; on Combat the
  HUD's aura already says it—, and
  in the notch row **the notches of the charm that took you over the line come out in magenta
  and the row grows beyond your maximum** — which is exactly what the game does (with 11
  notches, 9 used and a 3-notch charm: nine white and three magenta, twelve in total).
- **Your game**: another page of the Inventory, with the same black and corner brackets and no
  boxes inside: what you've achieved in the game. Under the title, two starting points, as text:
  *Base Knight* (a new game's: Old Nail, 5 masks, 3 notches, no Dream Nail, no cloak, no
  charms, no equipment, no key items and nothing carried: it removes those too) and *Everything maxed* (every
  upgrade, all the equipment and key items, keeping your charms). The screen's focal point is **the nail picker**, at the head of the left column:
  the five nails standing in a row on one baseline, the one you carry taller, with the cold
  spotlight behind it and its damage larger (the nail's own, without charms: with them it's on
  Charms), the others in half-light with their damage below; under the row, its name. (A separate large nail beside the picker, and then the picker
  across the full width, were tried the same day and removed: one repeated it, the other left
  too much empty space.) The page goes in **two columns that don't share rows**, so a tall block leaves no hole
  beside it: on the left what you learn (the nail, its arts, the spells, the abilities and the
  equipment), on the right what you collect (the body, the charms found and the items); on
  mobile, one column in the order nail, body, arts, spells, abilities, equipment, charms, items. The body —masks,
  soul vessels and notches— **with the game's own pieces**: a row of masks, the vessels and the
  notches, lit up to what you have and shadowed after, like the HUD's lost mask. Tapping a
  dark one lights up to it; tapping a lit one takes it off with every one after it, so one tap
  reaches any value (with 3 vessels, the first leaves none), and with the mouse the ones that
  would go dim before you click. The ones every Knight starts with (5 masks, 3 notches) can't
  be removed. **Lowering the notches keeps a state the game allows**: a charm only goes on with at
  least one notch free (the last one may overcharm you), so the last ones you equipped come off
  until the order you wore them in could have happened, and a notice says which (`normalize`
  in `js/codec.js`, which applies it to links too). Next, the arts and the spells as small plates you tap (as a silhouette what you
  haven't learnt, with its figure what you have), and under each spell **its two levels as
  their own artwork** (Vengeful Spirit and Shade Soul…) after a dimmed "—" for not learnt; the
  chosen one carries the accent's veil. Below, the **abilities** that change some number, with
  the same plates: the Dream Nail in its three steps (not found, the Dream Nail, and the *Awoken
  Dream Nail* the Seer gives for 1800 essence: the same for the figures, but part of the 112%),
  the cloak (no cloak, Mothwing Cloak or Shade
  Cloak, chosen by their artwork) and Grimmchild's phase (I–IV, four of the game's notches), which only shows if you have it among
  your charms found —it belongs to the charm, and whoever banishes the troupe has Carefree
  Melody in its place— and whose IV needs the Dream Nail, because it's won by defeating
  Nightmare King Grimm (wiki, "Grimmchild"). Next to them, the **charms found**, on the game's grid, shadowed the
  ones you don't have. The five two-version slots are one whole slot that switches, so at
  most one version is marked: each tap moves it on —none, the first, the second, none again—,
  it shows the marked one (with none, the first, shadowed) and two dots under it say which
  (wiki, "Fragile Heart", "Kingsoul", "Void Heart": Divine makes the fragile one unbreakable
  for good, Void Heart replaces Kingsoul and Grimmchild and Carefree Melody exclude each
  other). Void Heart, as in the game, is always equipped and can't be removed (except by the
  Charms binding), and it's always the first one equipped, even if a link lists it later
  (`normalize` in `js/codec.js`). Changing the collection removes whatever you wear and no longer have.
  Everything maxed is the end of the game: the unbreakable ones, Void Heart and Grimmchild. On
  Charms, the ones you don't have also show shadowed: they're looked at like the rest (the
  detail tells what they would do and says "Not found"), but they aren't equipped. **They're
  unlocked right there**: while some are missing, the grid's hint says so ("the dimmed ones can be
  unlocked"); the tile itself carries no mark (a "+" on it looked like a button of its own, and
  it wasn't); under the mouse the detail says
  "Not found: click to unlock it", and clicked (or tapped) the detail shows a real button, **Mark
  as found**, without going to Your game (in a two-version slot, as that version); then the grid
  equips it as usual. **A click pins the charm in the detail**: on the way from the grid to the
  button the pointer crosses other charms, and passing over them doesn't take its place; only
  resting on one (0.4 s) does, and leaving the grid ends the pin. They're
  saved apart from the build (`hollow.owned`), because they're your game and not what you're
  wearing, and the two starting points set them: the Base Knight, none; Everything maxed, all. On mobile, in one column.
  **Equipment and items**, the rest of the game's Inventory, which changes no figure but is your
  game: the **equipment** (Mantis Claw, Monarch Wings, Crystal Heart, Isma's Tear, Dreamgate) and
  the **key items** (King's Brand, Lumafly Lantern, the City Crest and the three keys, the Tram
  Pass, the Godtuner) as plates you tap, a silhouette until you have them; and **what you carry**
  (geo, essence, Pale Ore, Simple Keys, Rancid Eggs and the four relics), each with the Journal's
  [− N +], where the number can also be typed. The geo plate says what's in Millibelle's bank,
  and the head of the block what Lemm would pay for your relics (200, 450, 800 and 1200 geo each).
  All of it is kept in `hollow.progress` (`js/progress.js`) and comes in with an imported save.
  With nothing saved, none of it: unlike the charms, none of it changes a figure.
  Masks and vessels are added whole, one at a time, because that's what changes a figure and
  each step previews a real effect. **The loose pieces go under their row**: *Mask Shards* (up to
  three: the fourth makes a mask) and *Vessel Fragments* (up to two), the game's own pieces lit
  up to how many you have, as the Inventory keeps them; with every mask (or every vessel) the
  row isn't there. They're your game's record (`hollow.progress`), not the build's. Health isn't set here either: it's set on the health meter, by
  pressing your masks. Whoever comes in for the first time starts with *Everything maxed*, to
  see everything. The abilities default to what the sheet took for granted before it had
  them —Shade Cloak, Dream Nail and Grimmchild at phase 4, which hits for 11—, so an old link
  gives the same sheet, and only what's missing shows in the URL (`dream=0`, `cloak=1`,
  `grimm=2`). Without the Dream Nail there's no dream soul or Essence, nor its button in
  Combat; without a cloak there's no dash or Dash Slash; without the Shade Cloak, Sharp Shadow
  does nothing; and Dream Wielder, Dashmaster and Sharp Shadow say so in their detail
  ("It needs…"). At phase 1 Grimmchild doesn't attack (wiki, "Grimmchild"). What the sheet does
  still take for granted is having rested at a bench, so Lifeblood Heart's and Lifeblood
  Core's lifeblood always counts.
- **Conversions**: a stat can empty into another instead of being lost. Joni's Blessing is the
  only one in the game: the masks become lifeblood. The engine declares it with `into`
  (`js/engine.js`, in `health()`) and `diff()` marks both halves —`transfer: 'out'` the one
  that empties, `'in'` the one that receives—, so "Masks 9 → 0" isn't painted red: the detail
  says "become lifeblood" and the balance shows in total health.
- **Combat**: the third screen, with the arena, the Hall of Gods and the Pantheons (further
  down, "Combat").
- **Journal**: the fourth screen, your game's Hunter's Journal, to mark how far along its quest
  you are (further down, "The Hunter's Journal: your game").

On mobile everything stacks in one column, and the screen bar stays at the top in two rows:
the four tabs spread out (the active one underlined, and the Journal with its completed
entries below the name) and the mini-bar across the full width.

**Notches**: the game's rules. You can equip a charm that exceeds your notches if you have at
least one free; you become *overcharmed* (double damage taken) and can't equip anything more.

## Files

- `index.html` — the page; twenty-seven classic scripts (it works over `file://`) and GoatCounter's,
  the visit counter: no cookies, one visit per page load and, as events, the screen switches
  (`screen-*`), the language (`lang-*`) and *Share*. The hash with the build is never sent, and it
  counts nothing over `file://`, on `localhost` or in an iframe. Without it the site works the
  same (`track()` in `js/app.js`).
- `es/index.html` — the same page in Spanish, at its own address (`/es/`) so that search
  engines index the Spanish too: they ignore the hash, and with it `lang=es`. It's `index.html`
  with a Spanish `<head>` (title, description, `canonical`, Open Graph) and `<base href="../">`,
  so it loads the same files. It's generated with `npm run es` (`tools/es-page.js`) and never
  edited by hand; `test/es-page.test.js` fails if it falls behind `index.html`. Both pages carry
  the `hreflang` links to each other, and so does `sitemap.xml`.
- `css/tokens.css` — the tokens of the dark theme, the only one.
- `css/app.css` — layout and components.
- `js/i18n.js` — the interface language: `t(key)`, `pick({es, en})` and the number formats.
- `js/data.js` — game data: tables, the 45 charms (name in both languages, notches, exclusive
  group, category, icon), the stat definitions and `ART`, the artwork manifest.
- `js/enemies.js` — the simulator's 180 enemy and boss entries: health (normal, Attuned and
  Ascended, which for multi-bar bosses is the sum of their parts: a test checks it), masks they take from you and, for bosses, the list of attacks in both languages.
  The 14 that aren't a single bar carry their `phases`, with the parts alive in each; those
  that summon, their `summons`; and those with immunities, their `warn` or their `notes`.
  It comes from `kb/`; the portraits are downloaded with `npm run enemies`, which tries three
  sources per entry: its page's image, the Hunter's Journal portrait (`B <Name>.png`) and the
  standalone file (`<Name>.png`). With the three, all 180 are there. The page's image isn't
  always right —sometimes it's another state or a piece of the boss—, and those six entries
  carry their file pinned in `PORTRAIT` (`tools/fetch-enemies.js`, all 180 checked against the
  Journal): False Knight in armour and not unmasked, the God Tamer riding the Beast, the whole
  Flukemon, the Sisters of Battle as Mantis and not their statue, and Failed Champion and Soul
  Tyrant, which have no picture of their own —they're the dream variants of False Knight and
  Soul Master and fight with the same figure: the wiki only keeps their bare head and their
  stunned pose—, with their waking version's. A part with `art` carries its own picture
  (`PART_ART`, 9 more).
- `js/journal.js` — the Hunter's Journal, which is the combat picker: the 180 entries in
  Journal order and, for the 163 that have a Journal entry, its number, the description, the
  Hunter's notes and who signs them, in both languages. It doesn't come from `kb/`: it's
  generated by `npm run journal` (`tools/fetch-journal.js`) from the two wikis —the order and
  the English from hollowknight.wiki, the Spanish from the Spanish wiki, which is the game's
  text— and it downloads the list's medallions to `assets/journal/`. Nothing is translated by
  hand: an entry without text in both languages shows none. For your game's Journal it also
  carries `BOOK`, the game's 168 entries with what each one requires (the defeats and the note
  in the wiki's table: whether it's inspected, whether it counts for the Mark…), and `EXTRAS`,
  the five that aren't creatures. Their text, the Journal names that aren't the foe entry's
  ("Hornet", "Radiance") and the game's line when inspecting come from a fourth source, the
  dump of the game's own texts (`stradivari96/hollow-knight-translator`, pinned to the commit
  of patch 1.5.12620), because the wikis don't carry them cleanly.
- `js/hunter.js` — the rules of your game's Journal: what's saved (the defeats you have left,
  like the game), how it's marked, the counts, the Hunter's Mark and what the Hunter says.
  Pure, no DOM, with its test (`test/hunter.test.js`).
- `js/progress.js` — what a game has beyond the Knight's numbers, a slot's `hollow.progress`:
  `ids` (equipment and key items, the Dreamers, the Colosseum's trials, the pantheons
  cleared…), `counts` (geo, essence, the loose shards and fragments, Pale Ore, Rancid Eggs,
  Simple Keys, the relics, Millibelle's bank), `bench` and `shade` (their rooms), each with the
  `playerData` field it comes from; and marking by hand (`toggle`, `setCount`). Pure, with its
  test (`test/progress.test.js`).
- `js/rooms.js` — generated by `npm run rooms` (`tools/fetch-rooms.js`): each of the game's
  rooms (its scene, `Crossroads_47`) with its area, and each area's name as the game writes it
  (`MAP_NAME_*`) and the area light it takes. The room table comes from the community
  randomizer's `rooms.json` (homothetyhk/RandomizerMod, pinned to a commit).
- `js/collectibles.js` — generated by `npm run collectibles` (`tools/fetch-collectibles.js`), not
  edited by hand: the kingdom's 202 collectibles, each with its kind, its room and how a save
  says you have it (`how`: its room's object picked up, a playerData bool, the Seer's or the
  Grubfather's reward, a root or a flame), where it comes from if it isn't found (`src`) and,
  when known, where it sits in its room (`xy`, for the map). The places and their rooms' objects
  come from the community's ItemChanger (`locations.json`, `items.json`, pinned to a commit);
  what isn't picked up from the floor (the shops, the rewards, the Colosseum…) is set by hand
  from the wiki.
- `js/completion.js` — your game's completion, the 112%: the wiki's fifteen categories and
  what each item is read from. Most of it is already in the slot (the build, the charms found,
  the Journal: the game marks the bosses with the same `killed<X>` the Journal reads); the rest
  (equipment, Dreamers, Colosseum, Hornet Sentinel, pantheons cleared, a fragile charm with the
  Divine…) is in the slot's `hollow.progress` (`js/progress.js`). `count()` gives the total and each
  category's part. Checked against the game's own figure in 51 real saves (`tools/check-pack.js`);
  pure, with its test (`test/completion.test.js`). The Progress screen shows it.
- `js/pantheons.js` — the five Pantheons room by room: fight (with its entry), rest or
  Godseeker, and the variation of the rooms that have one (two Vengefly Kings in Hallownest's
  first, the Brooding Mawlek at 750). It comes from `kb/`, checked against the wiki.
- `js/hall.js` — the Hall of Gods: the 44 statues in the wiki's order, each with its title in
  both languages (the game's, from the two wikis) and what changes in its arena, grouped into
  35 pedestals (the lever ones and the dreamcatcher ones go in twos). It also cleans the saved
  marks, marks and removes them by hand (`toggleMark`, with the rule that Radiant switches on
  Ascended) and says which level the Void Idol is at.
  And the entrance tablet: its order (`TABLET`), the statue names where they aren't the
  entry's (`tablet`) and which symbol each row carries (`tabletMark`).
  It comes from `kb/05-godhome.md`, checked against the "Hall of Gods" and «Salón de los
  Dioses» pages.
- `js/engine.js` — the engine: `compute(state, lang, options)` returns each stat with its
  value and its contributions; `diff(a, b)` says what changes between two sheets. The maths
  doesn't depend on the language: only the text it emits does. `options.bindings` applies a
  Pantheon's bindings; with no options, the sheet is the usual one.
- `js/fight.js` — the arena's combat rules: `apply(state, action, context)` returns the events
  of a hit, a hit taken, a heal or a wait, with the charms that react to each thing (Thorns of
  Agony, Grubsong, Baldur Shell, Carefree Melody, Spore Shroom, the clock passives).
  Pure, no DOM and no language: `js/app-arena.js` turns its events into log lines. The reason for
  each rule, charm by charm, is in `design/04-charms-in-combat.md`.
- `js/codec.js` — the build's state: defaults, presets, equipping rules and the URL encoding.
- `js/saves.js` — free mode and the four save slots over `localStorage`: what goes in a slot,
  switching, a new game, clearing one, importing into one and syncing one with the game (which
  keeps the pantheon in progress and the pinned build). Pure, with the storage passed in
  (`test/saves.test.js`).
- `js/savefile.js` — the game's save file (`userN.dat`) read and turned into a slot: the
  header, base64 and AES-256-ECB (written by hand: `crypto.subtle` has no ECB and isn't there
  over `file://`), then `playerData`'s fields mapped to the build, the charms found, the
  Journal, the Hall, the door and the rest of the 112% (`hollow.progress`). The field names are checked against the game's text and the
  site's lists in `test/savefile.test.js`, which also makes a `.dat` with Node's AES and reads it back.
- `js/live.js` — a slot kept in step with the game's file: whether the browser can
  (`canLive()`), the file handles per slot in IndexedDB (`hollow-live`) with the stamp last taken
  in, and a watcher that asks the file every 2 s while the tab is visible. No DOM and no language;
  the plan and what was checked on Windows are in `design/08-live-sync.md`, and `debug-live.html`
  is the probe that checked it.
- `js/app.js` — the core: state, `localStorage` and the link, the header, the screen bar and
  the mini-bar, the HUD (`hudHtml`), the general render and the events. Each screen has its own
  script, loaded after it, and they all share the `HK.app` object: what changes value lives
  there (`App.state`, `App.run`…) and the rest is exported once and taken at the top of each
  script (the rules, in its header).
  - `js/app-charms.js` — Charms: the status block, the charm band and its detail, the plates,
    the effects and the full sheet.
  - `js/app-game.js` — Your game: nail, body (with the loose shards and fragments), arts, spells,
    abilities, equipment, the charms you've found and the items you carry.
  - `js/app-arena.js` — Combat: the simulator, the combat Journal to pick an enemy and the arena.
  - `js/app-hall.js` — the Hall of Gods tab: marks, statues, plaque and tablet.
  - `js/app-pantheons.js` — the Pantheons tab: the lifeblood door and the run room by room.
  - `js/app-journal.js` — the Hunter's Journal screen: your game's book.
  - `js/app-progress.js` — the Progress screen: the 112% as a tablet, category by category.
  - `js/app-saves.js` — the Saves screen: free mode, the four slots and their buttons, and the
    import view (steps, drop zone, preview), and the link with the game (the slot's line, the
    notice when it's paused, the watcher of the slot you're in).
  - `js/app-boot.js` — startup: what's saved, the link and the first render. It goes last.
- `assets/` — the game's artwork: `charms/`, `nails/`, `spells/`, `arts/`, `abilities/`
  and `hud/`. `tools/fetch-icons.js` downloads them from the wiki's CDN (`npm run icons`).
  Each family has its shape and its frame: charms are square and go in a circle, spells and
  arts are landscape (up to 3.2:1) and go in a rectangle, and nails are vertical (1:4.5) and
  are laid down 90°. `enemies/` are the combat portraits and `pantheon/` the icons of the
  bindings, the Godseeker, the bench and the three corners of the rest room, cropped from their
  screenshots on the wiki (`npm run pantheon`).
  `site/` is what search engines and link previews show: `og.jpg` (1200 × 630, the top of
  `docs/screenshots/charms.webp`) and the favicon, Void Heart squared to 48 and 192 px, plus
  `apple-touch-icon.png` on the page's background. Regenerate them if the Charms screen changes.
  `knight/` is the artwork for your side of the arena: the Knight, his Shade and the HUD's
  overcharm aura (`npm run knight`; with python3 and Pillow they're quantised on download).
  `journal/` is the Journal list's medallions (`npm run journal`), and `hunter/`, what your
  game's Journal paints: the book (the old button's, no longer used), the Hunter, the complete
  entry's frame, the page's flourish and the portraits of the Shade, the Hunter's Mark and the
  Weathered Mask.
  `hall/` is the Hall of Gods' 39 statues, its three symbols, the Void Idol in its three
  states, and the entrance tablet with the two ornaments of its screen (`npm run hall`,
  364 KB already paletted).
- `docs/` — this guide, and in `docs/screenshots/` the README's captures (WebP, taken with
  `debug.html` at 1440 × 900 and 390 px; `spells-effects.webp` is cut from a taller Charms
  capture, with a build whose charms have effects and synergies). Not part of the page.
- `design/` — design material: the audit and the system (`00-system.md`), web best practices,
  the game's visual language with the measured palettes, and which Hollow Knight websites
  already exist. It isn't part of the page. **Read it before touching the design.**
- `kb/` — the combat knowledge base: bosses, enemy health, Godhome, Colosseum and builds. It
  isn't part of the page either; `kb/data/hp.json` is the source for the day the site has targets.
- `test/` — tests with `node --test` (no dependencies): `npm test`.
- `tools/check-pack.js` — the site against the game on a folder of real saves (`npm run
  check-pack -- <folder>`): each `userN.dat` is imported as the site imports it and its
  completion must equal the game's `completionPercentage` (exit code 1 if not); the Journal's
  counts are set against the game's own three counters, only reported, because the game updates
  those now and then. The saves aren't in the repo.
- `tools/artpack.js` — the copy that's published as an Artifact (`npm run artpack -- <folder>`).
  An Artifact allows no more than 255 files and the site has over 480, so the portraits
  (`enemies/`) and the medallions (`journal/`) travel packed as data: URIs in `js/artpack.js`,
  which `D.art()` checks before the path; `index.html` loads that script before `js/app.js`. It
  leaves 188 files and writes their list. It isn't used locally.
- `debug*.html` — support pages, not part of the site:
  - `debug.html` — opens the page with fixed prefs for screenshots
    (`?w=390&h=2000&top=2450&lang=en&detail=1&guide=1&view=charms&open=fury&fx=70&hash=…`).
    It goes inside an iframe because headless Chrome crops below 500 px wide.
    `view=charms|game|fight` picks the screen (it also goes in the iframe's hash, because a
    link with a build and no `view=` opens Charms; `fight=1` and `tab=` already mean Combat).
    `view=saves&saves=1` opens Saves in free mode with slot 2 halfway through a game
    (`&slot=2` makes it the active one).
    `open=<id>` focuses that charm on the grid, with its detail alongside; `hover=<id>` hovers
    it, with the preview on the figures (the capture needs `debug-hover.html`'s
    `--blink-settings`), and `fx=<ms>` freezes
    the overcharm flash at that instant of the animation. `fight=1&foe=<id>` opens combat;
    `tab=hall&statue=<id>&hdiff=<at|asra|radiant>` opens the Hall at that statue (without
    `hdiff`, on its plaque), `marks=at|asra|radiant|all|mix` seeds the won symbols,
    `pick=1` taps the statue, which on mobile opens its plaque, and `tablet=1` reads the tablet
    (`tablettop=<px>`, the same as `top`, scrolls the page up after opening it);
    `tab=pantheon&run=<pantheon>&room=<n>&masks=<n>&lb=<n>&cocoon=<n>` seeds a half-done run
    to capture the timeline and the rooms; `binds=all|nail,soul` picks the bindings, and
    `bdone=<n>&ball=knight` seeds the lifeblood door. `hits=<n>&take=<n>&focus=<n>` hits, takes hits
    and focuses that many times, `click=restCocoon,restSit` presses those buttons in order (by
    their `data-act`), `info=spell:dd,foe` opens those arena explanations, and `freeze=<ms>` freezes the animations of your scene and of the sheet's HUD at
    that instant (with 5000 they've finished and you can see how it ends up).
    `journal=1` (or `view=journal`) opens your game's Journal (with an `h` of one screen, e.g. 900),
    `jread=<id>` reads that entry, `jfilter=unseen|seen|done` presses that list tab,
    `jseed=mix|seen|ready|mark|<n>` seeds the game, `jmark=none|seen|done` presses that state
    on the entry being read (and the notice shows) and `jtop=<px>` scrolls down the screen.
  - `debug-smoke.html` — smoke test: drives the site and writes the result into a `<pre>`.
    `google-chrome --headless --dump-dom .../debug-smoke.html`
  - `debug-hover.html` — the mouse smoke test: the detail that follows the pointer and the
    preview on the figures and on the notches. Headless Chrome behaves as touch, so it's run with
    `--blink-settings=primaryHoverType=2,primaryPointerType=4,availableHoverTypes=2,availablePointerTypes=4`
    (with that it gives `(hover: hover) and (pointer: fine)`).
  - `debug-overflow.html` — lists the elements that spill past the width, for the mobile side
    (`?view=game|fight` measures that screen; `?tab=pantheon&run=master&room=2&view=charms`
    measures the charm grid locked halfway through a pantheon).
    `?tab=pantheon&run=hallownest` measures the Pantheons tab with its 53 tiles;
    `?tab=combat` measures the Journal on its list and `&read=<id>`, on its page;
    `?tab=hall&lang=es` measures the Hall (with `&statue=<id>&pick=1`, its plaque; with
    `&hdiff=asra`, the fight; with `&click=hallBulk,hallMarkAll`, the *Mark in bulk* panel open
    and used, which in `debug.html` also works for the screenshot; with `&click=tablet`, the tablet).
    `?journal=1` measures your game's Journal; `&jread=<id>&jseen=1`, a page with its count.
    `&help=1` opens all the arena explanations before measuring.

### Combat

The third screen. On its **Arena** tab you pick any of the game's **180 enemies and bosses**
and you trade blows by hand: no animation, you decide the order, and time is counted but not
simulated (below, "Charms in the arena"). It's
**the fight out in the world, on Normal**: difficulty isn't chosen here, but at each statue in
the Hall of Gods, which is where the game sets it. The bosses that only exist in Godhome (Oro
and Mato, Sheo, Sly, Pure Vessel, the Sisters of Battle, Winged Nosk and Absolute Radiance)
are still here with their Attuned health, which is the only one they have outside Ascended.

Its three tabs —Arena, Hall of Gods and Pantheons— are the screen's title, centred over its
rule, and it's **another Inventory screen**: the same black, with the corner brackets in the section's tint (Crystal
Peak's on the Arena, Godhome's in the Hall and the Pantheons), and no slate boxes inside. What
can be touched goes without a background or a box: your attacks are plates like the spells and
arts on the Charms screen, and the enemy's are the rows of a list, with a thin rule in the
section's tint between them. On hover it's veiled (`--veil`) and the name takes the accent, and
the chosen one carries the accent's veil and rule (`--picked`, the same as on Your game). The
enemy is lit by **its area's light** (below), and who you're hitting is marked by an accent rule
on its left. The pantheons aren't statues but doors:
each final boss stands in an arch of Godhome's light with a thin gold frame, rising from the
threshold, lit on the chosen one and under the pointer (`--pantheon-door*`), so they don't
repeat the Hall's niches.

- **The picker is the Hunter's Journal**, traced from the game's screen. On the left, the list
  **in Journal order** (roughly the order in which you run into them, not alphabetical), each
  row with its game **medallion** and the **nail hits** it takes with your build. On the right,
  the page: the portrait on black, the name in small caps, **the Journal text and the Hunter's
  notes** in both languages, and at the foot what the game doesn't say: health, nail hits and
  hits until you die if it hits you with its strongest attack. If the boss has a statue,
  **"See their statue"** opens the Hall of Gods on it (the Hollow Knight and the Radiance lead
  to Pure Vessel and Absolute Radiance, which replace them there).
  - **Reading isn't picking.** Tapping a row opens it on the page, like moving the cursor in
    the Journal; fighting is the page's *Fight* button, `Enter` in the search box or a double
    click. That way an entry can be read without throwing away a fight you're halfway
    through, and picking the same enemy again says *Back to the fight* and doesn't reset it.
  - Above, a search box and the *All / Bosses / Enemies* filter with each one's count.
    The search ignores accents and runs **in both languages at once** —"false knight" finds
    «Falso Caballero»—, and the count moves with what you type: searching "crawlid" from the
    bosses leaves *Bosses 0 · Enemies 1* and tells you where to look. The arrows move the entry
    being read (from the search box or from the list), `Esc` clears what's typed and, if it
    was already empty, closes the Journal.
  - Whoever hasn't picked anyone **starts against Crawlid**, the Journal's first entry, so
    that combat never comes out empty. *No enemy* is at the foot of the list and then
    **combat opens on the Journal**; on reload Crawlid comes back.
    It isn't a dropdown: it pushes the arena down and doesn't close on a tap outside.
  - The 23 entries without their own Journal entry go **after their original**: the dreams
    (Failed Champion after False Knight), the Godhome versions and the Zotelings of the Eternal
    Ordeal, with their portrait in a round well instead of the medallion. Three of them
    complete another's entry —Enraged Guardian, Hornet Sentinel and Absolute Radiance— and show
    its text.
  - On mobile the list and the page take turns: tapping a row moves to the page, and
    *‹ Journal* goes back.
The arena comes in three bands, so a whole exchange fits on one screen without scrolling:
**the stage** (you and whoever is in front, face to face), **the commands** (your attacks and
theirs, side by side) and **the log**. On mobile they go one under the other: your scene, the
scoreboard in a row, the enemy, their attacks before yours, and the log.

**An enemy isn't a health bar**, and that's why the arena is one card per entity:

- On the left of the stage, **you**, as a scene from the game, under your name in the same
  capitals as the enemy's title. At the top, the **HUD** as the game paints
  it: the soul orb **filled up to the soul you carry** (the sprite is clipped between the edges
  of its disc, so empty not even the halo shows), the frame's tail with the masks on it —the
  lost ones, shadowed; lifeblood, blue and leaving no gap— and the reserve vessels, each with
  its level. Below, the **Knight** (the picture from his wiki page) standing on the foreground
  as a pure black silhouette, in front of a cold spotlight without which his cloak couldn't be
  seen. The figures are written in the header, like the enemy's; the scene is decoration. What
  just happened is animated by comparing it with the last thing painted: the mask that breaks
  with a flash and the game's **invulnerability flicker**, the one Focus gives back with a white
  glow, and the soul that rises or falls. And three states from the game: with **a single
  mask** he gives off black smoke (`Knight_One_Mask.gif`), on falling **his Shade** remains, and
  when overcharmed the HUD carries **its purple aura** behind the masks (`Overcharm.png`).
  Without motion (`prefers-reduced-motion`) you see how it ends up, not how it changes.
- On the right, **whoever you're hitting**, on a mirrored foreground and in **the ambience of
  its area**, with the palettes measured on the game (`design/02-hollow-knight.md` §2–3, the
  `--area-*` tokens): the scene behind it is the area's value ramp, as the game paints each area
  in one hue family darkening towards you, the upper mid-tone at the top, the lower one in the
  middle and black at the foot, where the black rocks catch a hairline of the area's accent. It
  fades to black at the sides and the top, so it reads as a lit place and not as a box, and a
  pale, neutral light behind the enemy lifts its silhouette. Godhome and the Radiance, the two
  bright ones, go at a little over half. False Knight
  stands in the Crossroads' blue, Hornet in Greenpath's green, the Crystal Guardian in Crystal
  Peak's violet, the Hive Knight in the Hive's amber, the Sisters of Battle in Godhome's gold;
  Grimm and the Nightmare King (and the Grimmkin) bring the Troupe's crimson, darkened towards
  black, and both Radiances Godhome's ramp with their own gold on the rocks' edge. The area is the entry's zone in `js/enemies.js`; where the game's map paints
  two regions in one tint, the one without a palette takes the other's (the Royal Waterways, the
  Fungal Wastes'; Fog Canyon, the Queen's Gardens'), and the Soul Sanctum and the Tower of Love
  take the City of Tears'. In the Hall of Gods and the Pantheons it keeps its boss's area, since
  Godhome recreates each arena. Only the scene is tinted: the title card, the bar and the
  figures stay in bone. A common enemy's area is the first place its wiki page's
  «Location» section names, as its region of the game's map (the Mantis Youth, the Fungal Wastes;
  the Kingsmould, the White Palace; the Sibling, the Abyss), and your game's Journal shows it under
  each name. The arena's card doesn't: there it's beside the point. Two turn up
  all over the kingdom (Bluggsac and Lifeseed) and keep "Hallownest"; they, and the Howling Cliffs,
  which have no measured palette, keep the plain black and the cold spotlight. Beaten, its place goes
  dark with it.
  under **the title card the game shows when the fight starts**: the small line, the big name
  and, in some, the line below («Madre» big and «Gruz» under it, as the Spanish game has it).
  They come from the game's text (`<KEY>_SUPER`, `_MAIN`, `_SUB`), 46 bosses in `TITLES` in
  `js/enemies.js`; whoever has none shows its name. Under the title, the phase, the total and
  the "?"; then its bar, like a boss's, with its figures. What happens to it is animated from the
  last thing painted, like your HUD: the hit **flashes it white** and pushes it back a little,
  **the figure it took rises and fades**, the bar leaves **a pale trail** of what was lost, a
  **new phase** is announced like an area on entry, staggered it bows and dims, and when the fight
  ends **it dissolves into the main menu's dust**. With several bars, the stage shows the one
  you're hitting.
- Between the two, **the scoreboard**, the screen's answer and its one focal point: your **nail
  hits to win** at the hero's size, in bone (what's standing, what's waiting in the queue and
  the phases to come; with a decisive part standing, only that one), and, smaller, how many of
  **its strongest attack you can still take** (its title says which and how many masks; on
  Radiant, one). It moves with each action. Under it, **Undo**.
- **The band.** Your attacks and theirs are a long list, and scrolling down it would leave
  the Knight and the enemy out of view. When the stage leaves the screen (less than 160 px of it
  still in view), **a band sticks under the bar with the same face-off in small**: the Knight with
  his HUD, the scoreboard and Undo, and whoever you're hitting with its portrait and bar. It's
  painted from what the stage has just painted, so the same hit flashes and its figure rises
  there too. It takes the place of the bar's scoreboard (on mobile it covers that row, in two rows
  of its own: your HUD and the scoreboard, and the enemy below) and goes when you scroll back
  up. It repeats what the stage says, so the screen reader skips it.
- **Undo** (and **Ctrl+Z**, Cmd+Z on a Mac) takes back the last action: yours, theirs, a summon
  or closing the heal. The whole fight is copied before each one —with Carefree Melody's
  counter and, in a pantheon, the run's health—, up to 50. Choosing who you hit or which
  impacts land isn't undone: they're changed with a tap. The stack empties on reset, when the
  enemy or the room changes and when the build changes mid-fight. The finishing blow can be
  undone too.
- In the commands, **your attacks**, in four groups: **Nail** (the nail and its arts),
  **Spells**, **Soul** (Focus and the Dream Nail) and **Charms** (Sharp Shadow, the Weaverlings,
  Dreamshield and *Wait*); only the ones you have show. Each is a plate, like the spells and arts
  on the Charms screen: its artwork from the game on a soft white halo (soul is white), the name,
  the figure large in bone and, below, the soul it costs or gives with the game's soul. The "?"
  sits in the plate's top corner. When it can't be done right now, it says why ("Not enough soul",
  "Already at full health"). They come from your sheet, so they change with you.
- Next to them, **their attacks**: they have no artwork, so they're rows with a thin rule in the
  section's tint under each, the name on the left and, on the right, the figure in bone with the
  game's mask, which already says what it takes. Under the pointer the row is veiled, its name
  takes the accent and its rule the accent's line. With a single entity in front, its card
  doesn't repeat the stage: only its attacks show. With several, **one card for each thing in
  front of you**, and each with **its own attack
  buttons**. The Mantis Lords open with one of 210 and in phase 2 they're two of 160; the
  Watcher Knights are six of 220 but **never more than two standing**; the Sisters of Battle,
  one of 500 and then three of 750. What you see is the game's bar, not the sum. **Each card
  carries the picture of who it is**: the Tamer and the Beast, Oro and Mato, the two halves of
  the Flukemon, a single Mantis per card, and False Knight's armour (or Failed Champion's)
  until it falls and the maggot comes out (or its head), each with its own. **And its own
  attacks** (the attack's `by` field, from each boss's wiki page): the Tamer only has the Jump
  and the Beast, Roll and Spew; Oro carries Dash-Slash and Mato Cyclone Slash; and the maggot
  doesn't attack, because it's False Knight's stagger: its card says *Does not attack*.
- **The minions come out for real**: the *Summon* button, with the minion's portrait on it so
  you see what comes out, gives them their own card, smaller and indented, with their attack
  and their health. Broken Vessel's Infected Balloon is worth
  **1**, not the 15 it's worth on its own. Killing them gives soul, which is what they're for.
  - **It isn't only bosses that summon**: so do Aspid Mother (Aspid Hatchling), Carver Hatcher
    (Dirtcarver), Elder Baldur (Baldur) and Husk Hive (Hiveling), and some husks in Deepnest
    rise as Corpse Creepers. Flukemarm, on dying, splits into two halves of 15 (it's a
    two-phase entry, like a boss).
  - **What it summons follows the difficulty**: on Ascended the Collector switches to its three
    at 26 health, in Godhome Gruz Mother no longer releases Gruzzers and Uumuu summons Oomas,
    and Flukemarm brings out its first six Flukefeys at 35. In a pantheon the room rules:
    Hallownest's eleven "Ascended arena" rooms summon as on Ascended even though the health is
    Attuned's.
  - Each button's note says how many and when ("one by one, up to 15; 2 more on death").
    Checked against the wiki's 180 pages in September 2026; it's in `kb/04-enemies.md`.
- **You choose who you hit** by tapping their card; the chosen one carries an accent rule.
- **Their attacks** are the ones the wiki documents, each with the masks it takes from you.
  Almost everything deals 1; the late bosses deal 2, and that's marked attack by attack (False
  Knight's Slam deals 2, his shockwave 1).
- The **log** notes each hit with its sum, which is the point: the arithmetic is visible. It
  speaks in two voices and a narrator: yours with a small nail stroke, theirs with the mask they
  took, and the phases, the stagger and whoever comes in, centred between two rules.
- **The ending** carries the fight in figures under its title: the time your actions took and
  the damage per second (if the clock ran), the hits dealt, the health lost, the soul spent and
  the heals, and *Again*. The Hall and the pantheon rooms show the same figures.

Rules of their own that the simulator honours because the wiki documents them: **False
Knight** alternates armour (65) and maggot (40) over seven phases —three of armour and four of
maggot: after the third he does a last Fury, breaks the floor and falls, and the seventh is the
finishing blow, which the screen announces (the phase's `note`)—, and **Failed Champion** the
same, with 360 of armour and 60 for the first head and 40 for the rest; when one **Oblobble**
dies the other goes up to 300 and heals; if the **Beast** falls, the Tamer stops fighting even
with all its health left; and when a **Watcher Knight** falls the next of the six comes in.

What **is flagged but not simulated**: immunities and damage caps. The Watcher Knights' Roll
says "immune to the nail, not to spells", Pure Vessel's Parry says that hitting there doesn't
damage it, and Uumuu warns on its card that it can't be damaged until its membrane is broken.
They're notes, not a state machine.

Two details you notice when using it: some bosses' health **grows with your nail** (the
Collector goes from 750 to 850), and being **overcharmed** doubles what they take from you,
because the simulator uses the same `health.damageMult` as the sheet.

**Charms in the arena** (`js/fight.js`; the analysis of all 45, one by one, in
`design/04-charms-in-combat.md`). The combat sheet is computed with **the fight's health**,
not the panel's: at one mask Fury of the Fallen raises the nail, and Grubberfly's Elegy only
fires with full masks (lifeblood doesn't count; at one mask, with Fury and no lifeblood on top;
with Joni's Blessing, any hit switches it off until the bench). What reacts to **a hit taken**,
in this order: **Carefree Melody** doesn't roll dice —each enemy attack carries a second
"♪ Negated" button with the probability in view, which rises with each hit since the last block
and goes back to zero, and the counter survives the fight, as in the game—; **Baldur Shell**
absorbs the hit if it catches you focusing (four, until the bench); **Grubsong** gives its soul
only with real damage; **Focus opens a window** that your next action or "Done" closes, and a
hit inside it takes the heal and the soul away **even if the shell absorbs it or Carefree
Melody negates it**, which is what the wiki says; **Thorns of Agony** hits for base nail in all
three cases, with no soul; **Stalwart Shell** notes how many swings fit in the invulnerability;
and a **fragile** charm warns that it breaks if you fall against a boss out in the world. New
actions: the **Shadow Dash** (with Sharp Shadow), the **Dream Nail** (33 or 66 soul; Pure Vessel
gives none, the Hollow Knight only in its last phase), the **Weaverlings** (by hand, because the
wiki doesn't give their rate) and **Wait**, which only appears when you wear a charm that works
with the clock: it jumps straight to the first thing that will happen and says which charm it
belongs to. **Spore Shroom** releases its cloud when you focus. With
**Void Heart**, the Siblings and the Void Tendrils don't attack. The positional ones
(Longnail, Mark of Pride, Steady Body, Heavy Blow, Sprintmaster, Shape of Unn, Defender's
Crest on its own) are named under "Your attacks" and aren't simulated. **Dreamshield** comes in
with the two lists on the wiki's "Dreamshield" page: each enemy attack that's a projectile says
whether "the Dreamshield blocks it" or "it pierces the Dreamshield" (`proj` in `js/enemies.js`:
68 attacks from 38 bosses), the blockable ones carry a "Blocked" button that negates it without
touching you —the heal isn't interrupted, it doesn't count for Carefree Melody, and it doesn't
kill you on Radiant— and breaks the shield for 2 s on the clock, and "Dreamshield" among your
attacks hits for base nail by hand, with no soul, and also breaks it. Your header says whether
it's whole.

**The clock** counts how long your actions take with the sheet's numbers —the swing, an art's
charge, Focus with its wind-up, the Dream Nail, the dash— and the passives run on it: **Kingsoul**
(4 every 2 s), **Grimmchild** (a shot every 1.8 s), **Glowing Womb** (a hatchling every 4 s, if
there are 8 soul) and **Hiveblood** (the last mask after 10 s without damage; 20 for Joni's
Blessing's). That way **Quick Slash** and **Nailmaster's Glory** change something: the same
sequence takes less time, and on winning the damage per second is read. With a warning written
at the foot of the log: the clock counts your actions, not the fight —dodging isn't there—, and
spells take 0 s because the wiki doesn't document their cast time.

**Stagger** counts hits, not damage, as the wiki's "Combat" page says. The nail counts, and so
do spells, arts, Thorns of Agony, each Glowing Womb hatchling, Sharp Shadow and Elegy's beam;
not Grimmchild, the weaverlings, Dreamshield, Spore Shroom or Defender's Crest. The 16 bosses
staggered by hits carry their threshold from `kb/data/staggers.json` in `stagger`
(`js/enemies.js`), and their card counts it ("Stagger 5/9 · in a row 3/7"): consecutive hits,
each within the entry's window (<1 s, <1.5 s or <2 s), need fewer, and **Heavy Blow** takes one
off both. Since the hits carry the clock, an art that takes 1.35 s to charge breaks a <1 s combo.
Staggered, their attacks dim and your **next hit gets them up** (without counting for the next
one); waiting does too, and focusing doesn't, which is what it's for in the game. **Grimm and the
Nightmare King** scatter into bats for 3.5 s and 2 s: hitting them doesn't get them up and at
most 50 is taken from them. Three decisions are noted in `js/fight.js`: a spell counts as many
hits as impacts land (Abyss Shriek, up to four; Vengeful Spirit with Flukenest, its flukes);
**Zote** needs 17 and 14 in Combat (his first fight) and 19 and 16 in the Hall and the
pantheons, because the wiki says that in Godhome he fights as on his third; and the Desolate
Dive that topples **Dung Defender** underground is a note on his entry, because there's no
position here. False Knight, Failed Champion and the two Radiances are staggered by health, and
their phases already do that.

**Soul has two pools.** With the main meter full, a nail hit gives the reserve's figure (6; 8,
12 and 14 with Soul Catcher, Soul Eater and both), and the nail's button shows what it will
really give. What overflows the main meter goes to the vessels, and the reserve refills it
instantly, because the wiki says "after a short delay" without giving the figure. Grubsong, the
Dream Nail, Kingsoul and the weaverlings add their fixed figure. **Not everything gives soul**:
the nail draws nothing from the Collector, Failed Champion or a Sibling, nor from False Knight's
armour, though it does from his maggot (`noSoul` in `js/enemies.js`, from their wiki pages). The
nail's button says so ("no soul"), and that's where the Dream Nail, Grubsong and the weaverlings
with it come in, as in the game.

**Spells, impact by impact.** A spell isn't a number: the sheet describes its impacts
(`impacts` in `js/engine.js`) and in the arena you say how many land, because the wiki warns
that not all of them always land and there's no position or dice here. Each impact is **one of
the game's notches** on the spell's card, with its figure below: lit lands, a ring doesn't. The
gesture is the health masks': tapping a notch lights up to it, and tapping the last lit one
turns it off. That's how the bursts of **Howling Wraiths** (3) and **Abyss Shriek** (4) go,
Flukenest's **flukes** (9 or 16, in small notches and with their count), Desolate Dive's
**fall** and **shockwave**, the three parts of **Descending Dark**, with the 1st burst on the
**left** (35) or on the **right** (30) as text alongside, except with Shaman Stone, which deals
50 on both sides, and the volatile fluke's **impact** and **cloud**. Vengeful Spirit and Shade
Soul carry a second notch, **"×2"**, against the bosses that recoil, which the wiki and `kb/`
document for Broken Vessel, Failed Champion and Lost Kin (`spellTwice`). By default they all
land, which is what the sheet gives; the button shows the damage of what's chosen, the log says
"2 of 4 impacts", zero is a miss (you pay the soul) and on reset they all land again. Only the
impacts that land count towards stagger, and the volatile one's cloud doesn't count. Xero, the
Hollow Knight and Pure Vessel carry a note: the first bounces and doesn't take all the bursts,
and Flukenest doesn't damage the other two on the ground.

**What doesn't read on its own, explained where it is.** In front of each row of notches, the
word **land** acts as a legend, and "left · right" says in its title that it's the side where
you have the enemy. For the rest, a **"?"** at the right of the attack's name opens below it, pushing and
covering nothing, one to three lines with your sheet's figures and the sum in view. Only four
of your attacks carry it: the **spells with notches** (which impact each one is —the fall, only
if you land on them; the 1st burst, 35 on your left and 30 on your right—, why the bursts or the
flukes don't always land, and the "×2"), **Cyclone Slash** (its figure is one spin's: 3 × 26 =
78, and up to 6 if you mash), **Focus** (1.141 s, 0.25 of wind-up plus 0.891, during which a hit
takes away the heal and the soul; with Baldur Shell, no damage but no heal) and the **Dream
Nail** (it doesn't hit: it draws soul). On the enemy's side, a single "?" in its header opens
**the legend of its cards**, with only what's on them: the stagger with its figures ("at 13, or
at 9 in a row under 1 s"), "♪ Negated" with Carefree Melody's ladder, "Blocked", "☠" on Radiant
and how to change who you're hitting. That its attacks are pressed when they reach you goes
without saying, so an enemy with nothing else to explain has no "?". The rest carries no "?", because its note already says it or it's what it looks like. It's a real
button (`aria-expanded`), it works the same with a finger as with the keyboard, and it isn't
saved: it's opened to read.

**In the HUD**, the mask **Hiveblood** is about to give back fills with honey from the bottom up
with the time you've gone without damage (`Hiveblood_Mask.png`, and Joni's Blessing's blue one),
and **Baldur Shell** sits under the orb with the hits it has left, dimmed when broken. The wiki
doesn't have its HUD icon, so it's the game's blue shell (`Baldur_Shell_Trigger.png`) scaled down.

### Hall of Gods

The second tab of the same section, **COMBAT | HALL OF GODS | PANTHEONS**. As in the game: one
statue per boss, and each is challenged at three difficulties. **Attuned** is the fight as in
Hallownest, with Godhome's health; **Ascended**, more health and **double damage** (what dealt 2
now deals 4) and sometimes a new arena; **Radiant**, Ascended and **a single hit kills you**.
Entering heals you fully and falling sends you back to the statue, so nothing carries over here:
it's for rehearsing a boss.

- **The statues are the screen.** The tab opens on them: above, a single row with the **Void
  Idol** (its figure, when it appears and the three counts, the figures in bone and the sans),
  and on its right the two rare actions, *Mark in bulk* and *Read the tablet*; below, the grid
  and, next to it, **the chosen statue's plaque**, the room's focal point (the statue large and
  lit, stuck under the bar while the grid scrolls). The Hall's rules, which are read once, go at
  the foot of the grid. The plaque's column is at most 40% of the room, so the grid keeps its
  statues on narrower screens.
- **44 fights on 35 pedestals**, in the wiki's order. The ones that in the game have a **lever**
  (Hornet, Crystal Guardian, the Mantis Lords, Nosk) or a **dreamcatcher** (False Knight, Broken
  Vessel, Soul Master, Dung Defender, Grimm) carry two bosses, and here that pedestal splits into
  two halves with a shared frame; the dream version carries the Dream Nail.
  The double ones take two cells, and the grid fills the gap left by one that doesn't fit at the
  end of a row with the next statue. Grimm's is the exception: it's the last double one and only
  Absolute Radiance comes after it, so it goes as two single pedestals and Troupe Master Grimm
  fills that gap himself; Absolute Radiance stays last.
- **The statues are the game's** (`assets/hall/`), almost black sculptures: on the page's
  blue-black they vanished, so each one carries **a light** behind it, not a box: a radial halo
  in Godhome's gold, that area's inverted palette (`--godhome-light*`, `css/tokens.css`), faded
  into the card's dark, and a stone **pedestal** under the feet, continuous on the double ones.
  At rest the light is bronze; the chosen one and the one under your finger light up, and the
  ones the filter dims stay in half-light. The names go in the dense cells' sans.
- **The plaque** of the chosen statue carries its name, **its title on the pedestal** ("Angry
  god of the downtrodden"), the button to its other version if it shares a pedestal and **a table
  comparing the three difficulties** with your build: the health, the nail hits it takes and the
  hits of its own you survive at full health (on Radiant, one). Below, *Fight on* Attuned,
  Ascended or Radiant, and what changes about its arena in the Hall. On a wide screen it has no
  *‹ Hall* button: the grid is always beside it.
- **The symbols are your real game's** —bronze, silver or radiant, the game's badges— and they're
  marked by hand: each difficulty in the plaque's table (the *In your game* column) is a button
  with the game's empty ring where its symbol goes, tinged with the accent so it reads as
  something to press; beaten, the badge sits in it. Under the mouse it previews the click, like
  the notches: the badge you'd put breathes in, the one you'd remove fades. Each one goes on its own, as
  in the game (beating Ascended doesn't give you the Attuned one), with the game's rule that
  Radiant only exists after beating Ascended: marking Radiant switches on Ascended and removing
  Ascended switches off Radiant. They show as three small badges under each statue
  and, in the row above the statues, in each one's *N/44* count next to the **Void Idol**, which appears on beating
  all 44 at some difficulty and changes on beating them on Ascended and on Radiant. They're saved
  in `localStorage` (`hollow.hall`).
- **Winning in the simulator marks nothing**: the site records what you do in the game, and the
  simulator only shows how your build performs against that statue. That's why the three
  difficulties are always open, just as you can skip to any room in a pantheon.
- **Each count is a filter**: tapping *33/44 Attuned* dims on the grid the statues already
  beaten at that difficulty and leaves lit the ones still to go; a line right under the row says
  how many. Switching filters, the lights fade out and back on instead of snapping.
- **Marking on the plaque is seen**: the symbol inks in from a blur with a burst of light, on the
  plaque and on the statue's tile, its count flashes and the statue's light swells once; removed,
  its light goes out. If the Idol changes level, it lights up too.
- **Mark in bulk**, a button in the Idol's row, marks or removes a symbol on all 44 at once,
  difficulty by difficulty, with the same Radiant-and-Ascended rule as the plaque. Open, its
  panel goes under the row, below its button: *Mark all* and *Remove all*, each with the three
  badges in the counts' order (the name and the rule go in each button's title).
  What wouldn't change anything is dimmed. Removing wipes your real game, so the last bulk
  action leaves a line with *Undo*, which lasts until the next change of marks and doesn't
  expire on a timer.
- *What changes*, on the plaque, always says something: what the wiki gives as different in
  the Hall (the "arena" field of each boss's Godmaster template) or "As in the base game" (or
  "As in the Pantheon", for those who only fight in Godhome).
- **With the keyboard** the grid is a single tab stop and the arrows move the chosen statue; up
  and down go to the closest one in the neighbouring row, which with the double pedestals isn't
  always the same column.
- **The entrance tablet.** In the game, at the Hall's entrance there's a tablet you read that
  shows all 44 at a glance. Here it's *Read the tablet*, at the end of the Idol's row: the
  tablet's two ornaments around its label, small. (Until 25 September it carried the 44 in
  miniature, which pushed the statues below the fold; the counts beside it already say how much
  of the Hall you have.) Tapping it reads the full tablet, which shows the same screen, traced
  from its screenshot on the wiki ("Screenshot HK Hall of Gods 03"):
  the two Godmaster ornaments (`GMHr` and `GMFtr`, which are exactly the screenshot's), the title
  *Hall of Gods* —the only place in the game where that name appears, `GG_SUMMARY_TITLE`— and
  **four columns of eleven**, each name with **the highest symbol you have** in front of it; the
  radiant one, with its halo. With no symbol, the game's empty ring: a small grey dot and ring,
  measured on the screenshot of a half-finished game. **It doesn't cover the site**: it's read
  inside the Hall, in place of the grid and the plaque (the Idol and its counts stay on top), on
  the frame's black, with no veil or box; until 22 September it was a full-screen `<dialog>`.
  Opening, it fades in and the names appear down the columns; closing, the statues fade back in.
  You go back to the statues with *‹ Statues*, at the top left, in the tablet's typeface and ink
  (the game's *Exit* sits by the bottom ornament because that's a controller spot), with Esc or
  with *Read the tablet*, which stays pressed while it's being read. It isn't saved: on leaving
  the Hall (another tab or another screen), on tapping a count, which filters the grid, or on
  opening a statue from the Journal, the statues come back.
  - The measurements come from the screenshot, in multiples of the names' body size (26 px at
    1920 wide): columns every 16.33, rows every 2.36, the top ornament 28.8 and the bottom one 17.3.
    Here the body size comes from the frame's width (the tablet is a container, and
    `--fs-tablet` is in `cqi`): with four columns the list fills it as in the game, at 16.7 px in
    the widest frame, and the whole tablet fits under the bar. With the frame below 1000 px it
    splits into two columns and on mobile into one, at 18 px; then it's taller than the screen,
    and *‹ Statues* goes on its own line and stays stuck under the bar so you don't have to
    scroll back up 44 rows.
  - **Its order isn't the grid's**: on the tablet Galien comes before Markoth and Xero (as on
    the Spanish wiki), and the English one, which the grid follows, puts him after.
  - **Its names are the statues'**, which aren't always the Journal's: *Oblobble*,
    *Watcher Knight*, *Oro & Mato*, *Nailsage Sly*, *Grimm*, *Nightmare King* and *Radiance*
    (the "name" field of each page's Godmaster template). In Spanish, *Oblobble*, *Caballero
    vigía*, *Grimm* and *Rey Pesadilla* have a source (the ESname or the Spanish wiki's list);
    for the other three there's none that says how the game shortens them, and they stay as on
    the entry: *Hermanos Oro y Mato*, *Gran Sabio del Aguijón Sly* and *Absoluto Destello*.
  - **What the game paints on a row without Radiant isn't in any source**: the screenshot has
    them all. Here goes the highest symbol, which is what its statue's plaque shows.
- On mobile the grid and the plaque take turns, like the Journal's list and page (tapping a
  statue opens its plaque, and *‹ Hall* goes back), and the tab just says *Hall*. The Idol's row
  stacks in three short lines: the name, the three counts across the width and the two actions
  side by side.

### Pantheons

The third tab of the same section. It's a real run: health, lifeblood and soul carry from one
room to the next, and **the rests are the only thing that heals**.

- **Before going in** you choose the pantheon (all five, with their motto and their final boss)
  and the **bindings** you want —each with its icon and what it does; the ones on, lit and with
  the chosen veil—. With all four at once they light up in gold, as in the game. Right under
  them, **what you're about to enter** —the pantheon, its rooms and the bindings on— with
  *Enter the pantheon* beside it; the door and its cocoon come after.
- **Rooms and bosses.** Each pantheon's card and the summary say how many rooms it has and how
  many of them are bosses (the fight rooms: two Vengefly Kings in one room are one boss). Inside
  the run, the header says which room you're in and how many bosses are left: the fights still
  ahead, the current one until you win it; the ones you skipped behind you don't count.
- **The lifeblood door, from your game.** Under each pantheon you mark by hand the bindings you've
  finished it with (and "×4" if it was with all four at once). They're the notches of Godhome's
  door, next to the Hall of Gods: each binding of each pantheon counts once (20 in total) and
  with 8 it opens: every pantheon bench carries a cocoon of 3, 4 or 5 germs (with 8, 12 or 16). The site deduces it and
  the rest room uses it; the simulator marks nothing (it's saved in `hollow.bindings`). A binding
  you mark lights up; completing the four, they light up one after another in Godhome's gold and
  the final boss's light swells.
- **The bindings really change your numbers**, because the engine applies them: the Nail
  Binding leaves the hit at 4/7/10/13/13 (6/10/15/20/20 with Strength) and the arts go on that
  value; the Shell Binding, 4 masks without touching Lifeblood Heart's +2; the Charms Binding,
  none; the Soul Binding, 33 and no extra vessels.
- **The charms are a single selection across the whole site**: the sheet, combat and the
  pantheon's benches show and change the same ones, and with them the notches. The rest brings
  the equipped charms, the notches and the same charm grid as the page; whatever you put on
  there stays equipped on *Charms* and in the link, and the other way round. Sitting on the
  bench, changing charms leaves you at the new full health.
- **Outside the benches, charms can't be touched from anywhere.** As in the game, which only
  lets you change them sitting on a bench: while the run is still half-done (also from other
  combat tabs), the grid, the equipped ones, "Clear", the presets and the
  notch steps don't change them. A notice above the screen says which pantheon and which room
  you're in, with a button that takes you there and another that abandons it without going
  (it says so in a notice, and focus moves to the screen's title); on the Pantheons tab it
  doesn't show, because you're already there. The grids
  come out grey and a click on them explains why not. A link opened halfway changes the rest of
  the build, but not the charms or the notches. With the Charms Binding they can't be changed
  even at the bench, because that pantheon doesn't let you wear any. On finishing or abandoning
  the run, everything responds again.
- **The rest of the build freezes on entry** —nail, masks, vessels, spells and arts—, as in the
  game: changing them on *Your game* halfway doesn't touch the pantheon.
- **The timeline is a path through Godhome** (`pathHtml`): the rooms as round medallions on a
  thin gold thread, which lights up as far as you've walked. The benches and the Godseeker's rooms
  are larger marks on it, cutting it into the stretches the pantheon is played in, and the final
  boss goes last and largest, in its doorway of light. The rooms still to go show their boss, a
  little quieter, so you see everyone you have left; the cleared ones, a gold ring and a small tick; the current one, larger, with the accent's ring glowing and the Knight floating over it, like
  his pin on the game's map, so you find it at a glance; the one
  you fell in, in red. The number goes under each one. The pantheons of 12 rooms fill a row with
  larger medallions; Hallownest's 53 wrap onto several.
- **The way through, before going in**: on the picker, under *Enter the pantheon*, the chosen
  pantheon's path with every room lit, to see who you'll face and where the benches are. Tapping
  a room enters the pantheon straight into it (what's before counts as skipped).
- **You can go straight to any room** by tapping it, to rehearse a fight or try a rest
  without going through everything before it. You arrive with whatever you had —also if you
  skip halfway through a fight—, and **what's skipped doesn't count as cleared**: those rooms
  are struck through and, if you finish that way, the ending says "finished, with N rooms
  skipped", not "completed".
- **The fights** use the usual arena, with Attuned health, and on winning they offer the next room.
- **At the rests you choose what to do and in what order**: bathing in the hot springs (soul and
  masks to the maximum), sitting on the bench (all health and the charms' lifeblood; not soul;
  **it wipes the cocoon's lifeblood and puts the cocoon back**), breaking the cocoon and
  changing charms on the grid. That's why the order matters: breaking the cocoon before sitting
  down wastes it. Each station is a card with its corner of the room and what it would give you
  **at that moment**, with the HUD icons: "+6 masks · +99 soul", or in red "−3 cocoon
  lifeblood" if you sit down wearing it. What's already full says so.
- **The Godseeker** is a room with no fight; in Hallownest it says who is there (Unn, the White
  Lady, the Pale King).
- **Falling ends the attempt** and says in which room; the run is saved in `localStorage`, so a
  53-room Hallownest survives a page reload.

### The Hunter's Journal: your game

The Journal's quest, as in the game, and **from your real game**: it's marked by hand, and the
simulator never touches it. It isn't the combat Journal, which is for picking an enemy: it's
**its own screen**, the fourth in the bar (`view=journal`), with the black, the corner brackets
and the centred title of the others, in Fungal Wastes' tint (`--tint-journal`, the one the map
study set aside for the enemies). Until 22 September it was a full-screen `<dialog>`, like the
Hall's tablet was then, with its *Close*: when the screens arrived it was left as the only tab
that covered the site instead of changing it. Its 168 rows are only painted when it's visible.
Below the Hunter, **the list and the page measure what's left of the window under the bar**
(never less than 460 px): when you scroll down to them they fill it, and each one scrolls
inside. The game's notice when marking shows fixed just below the bar.

- **The game's 168 entries, in their order**: the 163 creatures that are already foe entries
  and five that aren't (the Shade, the Hunter's Mark, the Seal of Binding, the Void Idol and the
  Weathered Mask). The names are the Journal's, which for eight aren't the foe entry's:
  *Hornet*, *Watcher Knight*, *Zote*, *Grimm*, *Nightmare King*, *Nailmasters Oro & Mato*,
  *Hollow Knight* and *Radiance*.
- **Like the game, but markable.** In the game the list only carries what's been encountered;
  here everything shows, so it can be marked, and what you don't have goes **shadowed** (the
  medallion dimmed, the portrait as a silhouette). The description appears on encountering it
  and **the Hunter's notes only on completing it**; until then, the game's sentence: "Defeat N
  more to decipher the Hunter's notes." The complete entry carries **the game's frame** on its
  medallion (`Bestiary frame upgrade.png`), and the medallion's white ring is clipped inside so
  it doesn't peek out.
- **The same thing the game saves is saved** (`kills<X>`): how many defeats you have left, in
  `hollow.journal`. And the sentence itself is the control: "Defeat [−] **44** [+] more…", with
  the number editable and the states *Not encountered · Encountered · Completed* below.
- **The rules you can't see in the list** (the wiki's table; `js/hunter.js`):
  - the entry is added with **the first defeat**, so encountered leaves K−1 at most, and
    **the 45 single-defeat ones are yes or no**. Wingmould, Royal Retainer and Kingsmould open
    without defeating any when you pick up the White Fragment, and leave K;
  - Crawlid and the Shade **come complete** with the Journal; Goam, Charged Lumafly, Garpede and
    the Void Tendrils are got by **inspecting** something, and their page says so with the
    game's line when inspecting (Mossy Vagabond, 10 defeats or its corpse);
  - **the total the game shows isn't fixed**: it starts at the **146** the Hunter's Mark
    requires and goes up by one with each optional entry you encounter (Menderbug, the
    Zotelings, the Grimm Troupe, the Godmaster ones…), up to **164**. The four that aren't
    creatures don't count. That's why the button starts at "2/146";
  - **the Void Idol isn't marked here**: it follows your Hall of Gods symbols, and its
    description changes with its level, as in the game;
  - **the Hunter's Mark** waits for the 146 completed (it says how many are left) and then
    offers the Hunter's button, "Ready to receive reward?". For Flukemunga one is enough,
    according to the wiki. Removing one of the 146 removes the Mark, just as removing Ascended
    removes Radiant. Receiving it is its own moment: the Hunter's light swells in the Journal's
    tint and dust rises from him.
- **Tabs by state**, under the search box, each with its count and with the words of each
  entry's control: *All · Not encountered · Encountered · Completed*. From *All*, a tab keeps
  only those; with one chosen, another adds or removes itself, so the combinations fit (not
  encountered and encountered is what you're missing; encountered and completed, the game's
  list), and with none *All* comes back. The counts follow the search, and the entry you're
  reading never disappears because of a filter. Changing tabs, the list fades in.
- **Marking is seen**: an entry just encountered lights its medallion up from the shadow, one just
  completed lights its frame, the number of defeats and the counts that moved flash, and a feat
  reached (*Keen Hunter*, *True Hunter*) lights up.
- **The Hunter** says at the top what he'd tell you if you went to see him, with the
  thresholds from his wiki page: fewer than 50 entries, 50 to 99, 100 or more, the 146
  encountered, the 146 completed and, with the Mark, the one after. Next to it, the game's two
  counts (with World Sense), **Encountered** and **Completed**. They're read-only, not buttons:
  filtering is the list tabs' job. Careful: the game's *Encountered* count also counts the
  completed ones, and the *Encountered* tab only the ones with the notes still to decipher. And
  the two achievements,
  *Keen Hunter* (encountering the 146) and *True Hunter* (the Mark).
- On marking, **the game's notice** shows, "New Journal Entry" or "Journal Updated", with the
  entry's medallion: it's the site's notice (the same look and place as every other one, just
  under the bar), and it doesn't catch clicks.
- **Mark in bulk**, at the foot of the list, collapsed. Open, **each row carries its checkbox**
  to pick several: with Shift the range from the last one touched is picked, and from the
  keyboard, Space picks the row being read (the checkboxes aren't tab stops: there would be
  168). Crawlid, the Shade and the Idol have none, because they never change. Below, what it
  affects ("On the 3 selected"; with none, **whatever is in the list**: with no search or
  filter, the 168; with "zoteling" in the search box, the three Zotelings; with the *Completed*
  count pressed, what you're missing), *All* / *None*, and *Encounter*, *Complete* and
  *Unmark*, each with how many would change and dimmed if none. The rules are the one-by-one
  ones (`HJ.bulk`), and the Mark only goes in on completing, if the 146 are already there. Once
  the action is done, the selection is dropped; *Undo* brings it back along with what was
  there, until the next change. Collapsing also drops the selection.
- The search runs in both languages, the arrows move the entry being read and, on mobile, the
  list and the page take turns, as in the combat Journal.
- Under each creature's name, **where it's found**: its region of the game's map (the entry's
  zone in `js/enemies.js`), in italics, even before you've encountered it, since that's what
  helps you go looking. The entries that aren't creatures, and Bluggsac and Lifeseed, found all
  over the kingdom, carry none. (The site's addition: the game's Journal doesn't say it.)
- The portrait stands in **its area's light, the same as on the arena's stage**: the area's value
  ramp faded to black all round, with the pale neutral light behind it (a trace of it while not
  encountered). With no area, the arena's cold spotlight.
- **All the Journal's text is the game's** (the dump of its texts, with the key alongside in
  `js/i18n.js`), with its Spanish typos; what the site writes comes in both languages.

### Progress

**Your game's completion, the 112% the game counts**, on its own screen (`view=progress`), the
screen bar's fifth, in the map's green (`--tint-progress`, Fog Canyon's and the Queen's Gardens'
on Cornifer's map). It's the tablet chosen among three variants in
`design/09-progress-variants.html` (`design/09-progress.md`).

- **The figure**, under the title: *Completion* («Finalización», the game's word), large and
  in bone over 112. It's the figure the game's map shows with World Sense, counted by
  `js/completion.js` from what the site keeps, and it was checked against the game's own in 51
  real saves: all match. The screen bar's tab carries it too.
- **One row per category**, the wiki's fifteen in its order (bosses 14, warrior dreams 7,
  Colosseum 3, charms 36, equipment 14, spells 6, nail arts 3, mask shards 4, vessel fragments 3,
  nail upgrades 4, Dream Nail and essence 3, Dreamers 3, the Grimm Troupe 6, Lifeblood 1,
  Godmaster 5): its name, **its things as small pips** —their picture, lit if you have it,
  dimmed if half done (a spell with one level of two), in shadow if not— and its points, which
  turn green when the category is complete. Where there's no picture (the Dreamers, the trials,
  the pantheons), the rule's diamond.
- **A row opens** (one at a time, remembered in `pgOpen`) to show its things as Your game's
  plates. **A tap marks one where the site already keeps it**, so no two screens disagree: a
  boss or a warrior dream is its Hunter's Journal entry (as its first defeat; unmarking clears
  it), a charm is your collection (a two-version one, as its first version), and the rest
  —equipment, Dreamers, trials, Hornet Sentinel, the Awoken Dream Nail, the Seer, the
  Godtuner, the pantheons cleared— is `hollow.progress`. Nightmare King Grimm is its Journal
  entry *or* the banishment; unmarking takes both away. What changes your figures —the masks,
  the vessels, the nail, spells, arts, the cloaks, the Dream Nail— isn't marked here: its plate
  says *On Your game* and takes you there.
- Hornet's two fights are one Journal entry, so they're told apart by where they happen:
  *Hornet · Greenpath* (the Journal's entry) and *Hornet · Kingdom's Edge* (the Sentinel).
- With a save linked to the game, the screen follows it: each bench repaints it.
- **Collectibles**, under the 112%, the same tablet: a row per kind —Captive Grub 46, Mask
  Shard 16, Vessel Fragment 9, Pale Ore 6, Charm Notch 8, Simple Key 4, Rancid Egg 21, the four
  relics (14, 17, 8, 4), Whispering Root 15, the Grimmkin flames 10, Map 13 and Stag Station 11,
  202 in all, each kind named as the game names it (the Inventory's name, or its map's legend)—.
  Each thing's plate says **where it is**: its area and the place inside it, both as the game
  titles them on entering (*City of Tears · Soul Sanctum*), and when it isn't found on the floor,
  who sells or gives it (*Sly · 150 geo*, *Seer · 1500 essence*, *Grubfather · 5 grubs*, a
  Colosseum trial). A map is its area's (it's sold elsewhere). The exact spot will be the map's
  (phase 6). A **filter by area** above them (each area's light as a dot; on a phone, a strip
  that slides sideways) keeps only that area's things; the rows count them there.
- **Rewards**: the Grubfather's seven steps (5 to 46 grubs) and the Seer's nine (100 to 2400
  essence) as two more rows, each step with what it gives, marked where it's kept (a
  collectible, a charm such as Grubsong or Dream Wielder, or your game's, as the Dreamgate).
- A save says all of it itself (`js/progress.js`, `detect`): the game keeps each thing picked
  up from the floor as its room's object, and the rest in playerData. Checked on 51 real saves
  against the game's own counts: grubs, the masks and vessels with their loose pieces, the pale
  ore held and spent, the notches and each relic held or sold all match.

### Saves

**Free mode and four save slots, like the game's profile screen.** The header's selector opens
it (`view=saves`); it isn't a tab in the screen bar. The selector shows the Knight and the save
you're playing (*Save 2*), or *Select save* in free mode. Each row shows its masks and soul
vessels with the HUD's sprites, its nail, and what that game carries: charms found (out of 40)
and the Journal's completed entries over its total. A save imported from the game also says,
as the game's profile screen does, **the area of your last bench** (`respawnScene`, its area from
`js/rooms.js`), whose light tints the card from the right, and **where your shade waits** and
with how much geo, if it does. The Hall of Gods is left out as secondary
(the import's preview does show it). The one you're in is lit from its left edge, carries the accent's line and, at the head
of its card, a lit diamond with *You're here*. The rows share their columns, so the numbers, the
masks, the nails and the buttons line up from one slot to the next.

- **Free mode** is what shows while you haven't chosen a save: everything unlocked (the build
  maxed and every charm found), to try builds. It isn't one of your games, so it's a row of
  its own above the four, the one framed sheet, with the Knight under a bench's lamp instead of
  a number and its note in the buttons' column, and it can't be cleared (Your
  game's two starting points reset it). It's where a first visit lands, and where the data from
  before saves existed stayed: nobody had chosen a save.

- **What goes in a slot** is everything that describes one game: the build (`hollow.build`),
  the charms found (`hollow.owned`), the Journal (`hollow.journal`), the Hall's symbols
  (`hollow.hall`), the lifeblood door (`hollow.bindings`), the rest of what the game has
  (`hollow.progress`: equipment, items, the rest of the 112%, bench and shade), the half-done pantheon (`hollow.run`)
  and the pinned build (`hollow.baseline`). **What doesn't** is yours, not the game's:
  `hollow.prefs` (the language, the screen, the enemy chosen).
- Those keys always hold **the active slot** (free mode included, slot 0), so no screen has to
  know slots exist; the others wait in `hollow.saves` as copies.
- **Tapping a slot** loads it: the page reloads —like the game's loading screen— on Charms, so
  nothing of the game you leave (an undo, the fight in progress) is left over. Tapping the one
  you're in takes you back to Charms. It's seen: the slot's nail catches the light and its masks
  glow, the page fades to black and the new one fades in (`leave`, and `hollow.entered` in
  `sessionStorage` veils it in `index.html`); *New Game* shows the base Knight's five masks
  appearing one by one first, as a new game's HUD does.
- **A slot's buttons are the game's menu items**, stacked in a column of their own behind a rule
  and quieter than the slot (they're what you do to it): capitals in the menu's face, no box, and on
  hover or focus the menu's two pointers on either side (*New Game* gets them too) (drawn in SVG; they're also the focus
  mark). Their icons are the usual ones, drawn in the site's line: *Import from the game* a tray
  with an arrow coming in, which dips when you're on it; *Clear Save* a bin, whose lid lifts. Below
  900 px a full slot's buttons go under it in a row; on a phone an empty slot's import says only
  *Import*, beside *New Game*, and the facts become a little table.
- **New Game** (`PROFILE_NEW_GAME`), on an empty slot, starts as in the game: the base Knight,
  no charms found and everything else empty. You fill it in on Your game.
- **Clear Save** (`PROFILE_CLEAR_BUTTON`) asks first, inside the slot, with the game's
  question (`PROFILE_CLEAR_PROMPT`). The slot is left empty and you stay on Saves. Clearing
  the one you're playing drops you into free mode (the page fades to black and reloads, still on Saves, and fades back in with the row where it was, which then shrinks into *New Game*), since
  the site always shows some game. It's seen being cleared: the masks break one by one from the right, as
  health is lost on the HUD, the vessels drain, and the rest fades as dust rises out of it; then
  the row shrinks to its empty height and *New Game* fades in (without motion, it's cleared at once).
- **Import from the game**, on each of the four, opens **the import view** in the list's place
  (*Saves* at its top, or Esc, goes back). It reads the game's own save file and puts that game in
  the slot. Left, three steps on medallions joined by a thread: **copy the saves folder** (tabs
  for Windows, macOS and Linux, the one you're on chosen by itself, and *Copy*), **open the picker
  and paste it** (the keys each system's picker takes: the name box and Enter on Windows,
  ⇧⌘G on macOS, Ctrl+L on Linux) and **pick the file** (the game keeps save *n* as
  `user<n>.dat`; the `.bak` ones are backups). Right, **the drop zone**: the Knight floating
  under a light that breathes, which brightens when a file is dragged over the view (it can be
  dropped anywhere on it), and *Choose file*. Once read, the zone shows the save as the game's
  profile screen would —masks appearing one by one, soul vessels, nail, time played, completion,
  geo, Steel Soul if it is— with the charms, Journal and Hall counts and the pantheons
  completed (five diamonds, lit in bone one after another, and *3/5*; each one's name on hover), and nothing is written until
  *Import into Save n*; over a full slot it warns first that it will replace it. A file that
  isn't a save brings up the Shade and *Choose another file*. On a phone a note says the saves
  are on the computer you play on. Then the page enters the imported game, as tapping the slot
  would; when the slot is to follow the file, without reloading, so that the permission the
  picker has just given still holds and it starts live, with no paused notice. The file is read
  in the browser and never sent anywhere; the game's file isn't touched.
  A save that's already JSON (the Switch's, or one decrypted with an editor) is read too. What
  comes in, from the game's `playerData`:
  - **the build**: nail, masks, vessels, notches, spells, nail arts, Dream Nail, cloak,
    Grimmchild's phase and the charms worn **in the order you wore them** (`equippedCharms`),
    with full health (the game saves on a bench);
  - **the charms found**, each two-version one as the version you have (unbreakable, Kingsoul or
    Void Heart —the White Fragment alone doesn't count—, Carefree Melody);
  - **the Journal**, entry by entry, with the defeats you have left, as the game counts them;
  - **the Hall of Gods' symbols** and **the lifeblood door's notches**.
  - **the rest of the 112%**: equipment, the Dreamers, the Colosseum's trials, Hornet Sentinel,
    the Dream Nail awakened and the Seer ascended, Grimm's banishment, the Godtuner, the
    pantheons cleared and a fragile charm left with the Divine (`js/completion.js`).
  The pantheon in progress and the pinned build aren't in the game: the slot starts without them.
- **Keep in sync with the game**: where the browser can hand the page the file itself (Chrome
  and Edge on a computer, over `file://` or the web; not Firefox, Safari, a phone or inside an
  embedded frame), *Choose file* and dropping keep a handle to it, and the preview carries an
  option like a row of the game's options menu: *Keep in sync with the game* and its value on a
  button, **On** (the rule's diamond lit) or **Off** (hollow), the game's own `MOH_ON`/`MOH_OFF`;
  **on by default**. On, the slot follows that file. The game writes it on resting at
  a bench and on quitting, so the slot catches up then (checked every 2 s while the tab is
  visible, and at once on coming back to it): every screen repaints in place, what arrived lights
  up and a notice says *Your save caught up with the game*. **The game wins**: what's changed on
  the site holds until the game saves again, and then it's replaced; only the pantheon in
  progress (which keeps its charms, as on opening a link) and the pinned build stay. A file
  caught mid-write is ignored and read again on the next check. Only the save you're in
  follows its file; another linked one catches up on entering it.
  The slot's card says *Follows user1.dat* and, on the one you're in, **live**, **paused** or
  **file missing**, with *Stop following*. The header's save selector says it on every screen:
  under *Save n*, the rule's diamond and the state, lit in bone and breathing while live,
  hollow in the notice's tint when paused or missing (on a phone, the diamond alone, over the
  save's number); its tooltip names the file. The browser's permission doesn't outlive the page:
  after a reload (or a new visit) the link is **paused**, and a notice above the screen says so
  —drawn like the import notice, one line over the bar's hairline, since nothing's wrong— with
  *Resume*, which asks the browser again (it needs the click). If the file is gone, the
  notice says the save keeps what it had and offers *Pick it again* (the import view for that
  slot). Clearing the slot, or importing into it with the option off, ends the link.
  A full slot that follows no file (imported with the option off, made on the site, or after
  *Stop following*) carries **Follow the game** (*Follow* on a narrow screen) above *Import from
  the game*, its icon two arrows chasing each other that turn on hover: it opens the picker,
  the slot takes that file in at once (the game wins) and follows it from then on.
- **The notice for whoever's new**: on a computer (not a phone, nor an iPad asking for the
  desktop site), while nobody has chosen a save (free mode, the four empty), a notice above
  every screen but Saves (*Your real game*) says the game's save can be imported. It isn't a
  box: one line under the screen bar with the bar's hairline beneath it, since nothing's wrong
  (the pantheon's warning, which does cost something, keeps its box). Its button,
  *Import from the game*, opens the import view for Save 1; its ✕ closes it. Either of the two,
  or opening the import view from Saves, puts it away for good (`importHintOff` in
  `hollow.prefs`), and choosing a save hides it as well.
- **Your shade**: when the save you're in comes from the game and your shade waits somewhere, a
  notice above every screen but Saves (*Your shade*) says where and with how much geo, drawn
  like the import notice. Its ✕ hides it until the shade is another one (`shadeOff` in
  `hollow.prefs`); a save without a shade takes it away.
- **The import's preview** also says, quietly at the end of its line, the game's version that
  wrote the save and the mods it had (a save from before 1.5 counts some things otherwise:
  Oblobbles needed three defeats).
- A shared link still lands where you are (free mode or a save): its build replaces that one's.

## State and link

The build lives in the URL, readable and with only what differs from the base Knight:

```
#v=1&nail=4&masks=9&vessels=3&notches=11&spells=222&arts=111
 &charms=ustrength,quickslash,fury&hp=1&lang=es
```

`spells` are the levels of Vengeful Spirit, Desolate Dive and Howling Wraiths; `arts` are
Cyclone Slash, Dash Slash and Great Slash. `hp` is the masks you have left, and it doesn't
appear when you're at full health. `lang` isn't part of the build: it's only the language
preference, and it only appears when it isn't the page's: Spanish on the English page, English
on the Spanish one (`es/`). `view` isn't part of the build either: it's the screen
(`game`, `fight`, `journal` or `saves`), and it doesn't appear on Charms, which is the start screen. A
link with a build and no `view` opens Charms; without a build, the site opens where you left
it. Each screen change leaves a history entry marked by the site (`{hk: 1}`), and going back
to one of them changes the screen without touching the build; a link typed or pasted by hand
does bring its own. "Share" copies the link with the build and the language, but without the
screen: the fight doesn't travel in it. It's also saved in
`localStorage` (`hollow.build`, `hollow.baseline`, `hollow.prefs`, and separately the half-done
pantheon run in `hollow.run`, the Hall of Gods symbols in `hollow.hall` and your game's
Hunter's Journal in `hollow.journal`); on
load the URL rules if it carries anything. Those keys are where you are, free mode or a save:
the rest wait in `hollow.saves` ([Saves](#saves)).

## Where the numbers come from

From the community wiki (`hollowknight.wiki`), page by page. The rounding rules are the game's
(Unity rounds half to the even integer):

- Nail damage: base → ×1.5 (Strength) and round → ×1.75 (Fury) and round.
  With the Pure Nail: 21 / 32 / 37 / 56.
- Arts: base × 2.5 (Great Slash, Dash Slash) or × 1.25 per hit (Cyclone Slash), × 1.75 with
  Fury, a single rounding. Strength does **not** affect them.
- Elegy: 50% of the nail (Strength already applied) and round; with Fury, × 1.5 and round.
- Joni's Blessing: `floor(masks × 1.4f) + 1` with 1.4 in single precision (5 → 7, 9 → 13).
  With the Shell Binding the wiki gives one more than what comes out of that: 7, and 10 with
  Lifeblood Heart.
- When Elegy fires: with all the white masks (lifeblood doesn't count, not even when lost), or
  at 1 mask if you wear Fury. With Joni's Blessing, any hit switches it off until the bench.
- Quick Slash: the time between swings is `max(cooldown, duration)` = 0.28 s; turning or
  dashing between swings cuts the duration short and the cooldown remains, 0.25 s.
- The values marked with `~` (Defender's Crest's clouds, spores, Carefree Melody) are
  approximate on the wiki too.

The Spanish names are those of the game's official translation (see "Credits and licences").

## Languages

Until someone chooses, the site starts in **the browser's language**: the first of
`navigator.languages` that it speaks, and English if none. That list is the one browsers compare
the page against to offer translating it, so for someone who reads Spanish or English their
translator doesn't pop up. The language saved in `hollow.prefs` only counts if it was chosen
(with the selector or with a link that carries it): Spanish used to be saved even when nobody
had touched it. The Spanish page (`es/`) starts in Spanish unless its link says otherwise, and
opening it counts as choosing Spanish.

For whoever does translate the page (a browser in another language gets it in English), the
game names carry `translate="no"` (`NT` in `js/app.js`): charms, the nail, spells, Nail Arts,
abilities, enemies and their attacks, statues, pantheons and Journal entries stay as the game
says them. Only the elements that hold just a name; sentences with a name inside are translated.

All text goes through `js/i18n.js` or through a `{ es, en }` in the data. The engine receives
the language in `compute(state, lang)` and applies it to the labels, reasons and conditions it
emits; the numbers change decimal separator and the space before the `%`.
`test/i18n.test.js` walks through several builds in English and fails if a Spanish accent or an
untranslated word appears.

Nothing is translated by hand: the game names are copied from its own texts (the dump
`kb/data/all_text.json`, which `npm run text -- "Shade Cloak"` searches and
`npm run text -- --audit` cross-checks against the site) or, if the game doesn't name them,
from the wikis. The rules are in `CLAUDE.md`, "Translations".

## Credits and licences

**Unofficial fan project**, free and non-commercial, not affiliated with or endorsed by
[Team Cherry](https://www.teamcherry.com.au/). *Hollow Knight*, its artwork, sprites, texts and
names are © Team Cherry; they're used here only to show the game's own information, and
belong to their owners.
The site says so too, with the wikis, their licence and the contact (the mail and a GitHub mark
linking to the repo), in the footer under every screen
(`renderColophon` in `js/app.js`).

- **Numbers and data**: [hollowknight.wiki](https://hollowknight.wiki/) and the
  [Spanish wiki on Fandom](https://hollowknight.fandom.com/es/), both under
  [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). What's taken or adapted
  from them (the data in `js/enemies.js`, `js/journal.js`, `js/pantheons.js`, `js/hall.js`
  and the notes and data in `kb/`) keeps that licence. Thanks to their editors.
- **Artwork** in `assets/` (except `assets/fonts/`): the game's, downloaded from the wikis
  (`npm run icons` and the other `fetch-*` scripts). © Team Cherry.
- **Which area each room is in** (`js/rooms.js`): from the `rooms.json` of the community's
  [RandomizerMod](https://github.com/homothetyhk/RandomizerMod) (LGPL-2.1); only that fact is taken.
- **Where each collectible is and how the game marks it** (`js/collectibles.js`): from the
  `locations.json` and `items.json` of the community's
  [ItemChanger](https://github.com/homothetyhk/HollowKnight.ItemChanger) (LGPL-2.1); only those
  facts (the room, the object's name, the playerData field) are taken.
- **The game's texts**: its official Spanish and English names come from the dump of its
  TextAssets in [stradivari96/hollow-knight-translator](https://github.com/stradivari96/hollow-knight-translator).
  The dump isn't in this repo: `npm run text` downloads it to `kb/data/all_text.json`.
- **Fonts**: Cinzel, Spectral and Patrick Hand SC, under the
  [SIL Open Font License 1.1](../assets/fonts/OFL.txt).
- **Code**: MIT ([`LICENSE`](../LICENSE)). It covers only the code, not any of the above.

If you hold rights over something here and want it removed, open an issue or write to
[betorzdev@gmail.com](mailto:betorzdev@gmail.com).

## Contact

Made by **Albert** ([@betorzdev](https://github.com/betorzdev)).
Found a wrong number, a bad translation or a bug? Open an
[issue](https://github.com/betorzdev/hallownest-calculator/issues) or write to
[betorzdev@gmail.com](mailto:betorzdev@gmail.com).
