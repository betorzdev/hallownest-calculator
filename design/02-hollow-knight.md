# Hollow Knight's visual language

The colours here are **measured**, not estimated: median-cut quantisation on 80 official
screenshots of 16 areas downloaded from `hollowknight.wiki`, plus the game's 73 sprites that
already live in `assets/`. The measurements on our own sprites are **re-verified** in this
repository.

Confidence marks: **[MEASURED]** comes from official pixels · **[CONFIRMED]** the authors say so or
several independent sources do · **[CONSENSUS]** the community repeats it without confirmation ·
**[CORRECTION]** it contradicts a widespread assumption.

## 1. Where that line comes from

Ari Gibson drew in **paper sketchbooks**, scanned them and put the PNGs straight into Unity; he
only cleaned up in Photoshop. He filled three sketchbooks and says "very little" was wasted:
some sprites went into the game after a single sketch. **[CONFIRMED]**

Hence what's hardest to imitate: **it's a brush line, not a vector line**. It has variable
thickness, it tapers, it trembles and **it doesn't quite close**. In Hollow Knight there isn't a
single uniform 1 px stroke. A `1px solid` border is, literally, the opposite.

**Influences**, because they circulate badly:

- Metroid, Zelda II, Faxanadu and Mega Man X, in structure. **[CONFIRMED]**
- **Paper Mario's badges** are the origin of the charm system. **[CONFIRMED]**
- **Dark Souls isn't a direct influence**: co-director William Pellen says he **hadn't played
  it** during development; they were after "the same feeling of not knowing what comes next".
  **[CONFIRMED]** — worth knowing, because the comparison is everywhere.
- **Ghibli comes in mostly through the music**: Team Cherry's brief to Christopher Larkin was
  for it to evoke *"a dark elegance and melancholy"*. **[CONFIRMED]** It's the closest thing to an
  official statement of the tone, and it works as a compass.
- **Arthur Rackham**: there's no source from the authors. **[CONSENSUS]**, don't cite it as fact.

## 2. Darkness is composition, not background

It isn't "a dark background": it's a **four-layer atmospheric ramp**, and it goes from light to
dark **towards the viewer**, the opposite of almost every game. Measured in Kingdom's Edge:

| Layer | Measured | Treatment |
|---|---|---|
| Distant fog | `#A6B7AB` → `#788C86` | A pale blot, no line, minimal contrast |
| Midground | `#63706D` → `#46535C` | Visible line, slight shading |
| Playfield | `#29343F` → `#43464A` | Full line, full local colour |
| Foreground | `#000000` (55% of the band) | **Pure black silhouette, with no inner detail at all** |

Contrast **and** saturation drop together. The foreground isn't "dark blue": it's `#000000`. And
on top, a vignette on all four edges. Pure black is between **14% and 49%** of the pixels in
every area sampled.

The **lights are few, small and warm**: the lamps in the City of Tears measure `#B2BDE2` with a
soft radial halo; Greenpath's bioluminescent specks are warm-white dots of 2–4 px. The player is
taught to follow the light, and that's why a lit bench reads as a refuge.

## 3. Colour

### The rule that governs everything

**One hue family per area, as a value ramp from pure black to a pale tint, plus exactly one
saturated accent.** The City of Tears is the pure case: everything, from `#02040E` to `#4577A8`,
falls within hue 210–226. The only break in the frame is the warmth of the street lamps.

Median saturation per area: Kingdom's Edge **0.21**, the Abyss **0.06** (almost greyscale), City
of Tears **0.79** — the most saturated, but **monochrome**, so it still reads as calm. **The
world is dark and desaturated; what's saturated are loose pieces.**

### The four corrections that change our palette

Verified **in this repository** on `assets/hud/`:

| Common belief | Measured | |
|---|---|---|
| "Soul is cyan / blue" | **`soul.png` = `#ECECEC`, 0% saturation.** The orb, `#F9EEF1` | **[CORRECTION]** |
| "The saturated cyan is soul" | It's **lifeblood**: `mask-lb.png` = `#63BDD7`, S 54% | **[CORRECTION]** |
| "Geo is gold" | `#E2EBDE`, a white with green. **There's no gold coin colour** | **[CORRECTION]** |
| "Overcharm is red" | It's **purple/magenta**: `#BA7DAE`. The wiki talks about "purple cracks" | **[CORRECTION]** |
| "Kingdom's Edge is blood orange" | It's **the game's most desaturated area**: a bluish ash grey `#627376` / `#46535C` | **[CORRECTION]** |

The warmth you remember is in **the Hive** (`#C39B6E`), **Godhome** (`#F7D9A7`), **the Radiance**
(`#FFE08D`) or **Grimm's crimson** (`#B2385A`).

This hits us squarely: `css/tokens.css` today justifies the accent as *"the blue of soul"*. The
colour itself works, but **soul is white**, and that blue also clashes with lifeblood, which
really is the game's cyan.

### Base palette **[MEASURED]**

| Role | Hex |
|---|---|
| Void / page black | `#000000` |
| Deep navy (menu) | `#04060C` → `#0D1428` |
| Raised navy surface | `#192744` / `#232740` |
| Slate card (Journal book) | `#55595A` |
| Mask ivory (health) | `#EADBE3` |
| Bone white (vessel, spells) | `#F2F1F2` → `#FFFFFF` |
| Notch | `#BEB8C1` |
| **Soul** | `#ECECEC` |
| **Geo** | `#E2EBDE` |
| **Lifeblood** | `#65C0D9` |
| **Overcharm** | `#BA7DAE` |
| Radiance | `#FFE08D` / `#FFF7B7` |
| Godhome | `#F7D9A7` / `#CBA182` |
| Grimm's crimson | `#B2385A` / `#922748` |

### By area **[MEASURED]**

| Area | Base | Mid | Accent |
|---|---|---|---|
| Dirtmouth | `#05070F` | `#191F42` → `#27335D` | `#50608C` |
| Forgotten Crossroads | `#060816` | `#141C40` → `#303A6E` | `#5F699E` |
| Greenpath | `#040C13` | `#0C2839` → `#2C535A` | `#579B8C`, acid `#52D186` |
| Fungal Wastes | `#03070D` | `#143248` → `#3F6969` | `#8BC093` |
| City of Tears | `#02040E` | `#0A1739` → `#1D4879` | `#4577A8`, street lamp `#B2BDE2` |
| Crystal Peak | `#030308` | `#1B163D` → `#2D2961` | `#9660CE`, `#D9A8F3` |
| Deepnest | `#02030A` | `#0E132C` → `#263350` | `#4A596C` |
| Resting Grounds | `#000000` (49%) | `#050714` → `#0C193B` | `#75AFCF` |
| Ancient Basin | `#000000` (39%) | `#111219` → `#2D2B2D` | `#61616A` |
| Kingdom's Edge | `#000000` | `#29343F` → `#46535C` | `#627376`, `#9DACA1` |
| Queen's Gardens | `#010607` | `#101E29` → `#1C4242` | `#20675A`, `#419582` |
| The Hive | `#070508` | `#352328` → `#523A3C` | `#C39B6E`, `#F5E1A5` |
| White Palace | `#161724` | `#363A53` → `#555B76` | `#DAE8F2` — **the light area** |
| Path of Pain | `#0E0F1A` | `#2D3045` → `#4B4E66` | `#A5AEB7` |
| Godhome | `#20181A` | `#58403F` → `#997464` | `#F7D9A7` — **inverted**: dark silhouettes on gold |
| The Abyss | `#000000` | `#262523` → `#45423E` | `#BDB6AF` (S 0.06) |
| Colosseum | `#0B070C` | `#331F28` → `#48404D` | `#A7A59E` |

### The game's map: the most usable finding

**[CORRECTION] The map screen isn't parchment.** It's **pure black with a thin hand-drawn line, and
each region traced in a pale, desaturated tint of its area's hue.** Measured on `Cornifers
Map.png` at 2000 px:

| Region | Tint | HSV |
|---|---|---|
| Fog Canyon / Queen's Gardens / Archives | `#D8FFCC` | H105 S20 V100 |
| Howling Cliffs | `#E7FFE1` | H108 S12 V100 |
| Crystal Peak / Resting Grounds | `#F8CFFC` | H295 S18 V98 |
| City of Tears | `#D5DDFD` | H228 S16 V99 |
| Fungal Wastes / Royal Waterways | `#BCE6F4` | H196 S23 V98 |
| Deepnest | `#F2E8EE` | H324 S4 V95 |
| Crossroads / Ancient Basin | `#FFFFFF` / `#E4E4E4` | neutral |

**That's our accent system, ready-made.** Saturation 12–23%, value 95–100%, on black:
**atmospheric and above 12:1 contrast at once**, which is a rare combination. Parchment only
appears in **Cornifer's sketches**, and even there it isn't warm brown: it's olive-green paper,
`#ADB4A0` / `#C2C9B6` (H≈80, S 9–12%).

## 4. Typography

**Perpetua** (body and dialogue) and **Trajan Pro Bold** (titles). **[CONFIRMED]** by three
independent routes: the [HollowKnightTextDatabase](https://github.com/jdvannest/HollowKnightTextDatabase)
says *"this application uses the same typefaces as the games: Trajan Pro and Perpetua"* and
distributes them; the asset-extraction threads find an atlas called **"perpetua"** inside the
Unity bundles; and the wiki hosts `File:Perpetua.TTF`.

**The logo isn't a typeface.** It's **hand-drawn lettering**, with irregularities no file
reproduces. **[CONSENSUS]** Anything on DaFont called "Hollow Knight font" is a fan recreation.

**Hallownest's "runic" is decorative glyphs, not a published cipher.** Community reconstructions
circulate, but there's no authorised mapping. **[CONSENSUS — don't trust it.]** It works as SVG
decoration; never to encode real text.

### Free substitutes

| From the game | Substitute | Why |
|---|---|---|
| Trajan Pro (titles) | **Cinzel** | Commissioned by Google in 2012, *"inspired by first-century Roman inscriptions"*. The closest legitimate equivalent. *(We already use it.)* |
| Perpetua (body) | **EB Garamond** | Humanist, warm, enough x-height and real coverage of Spanish diacritics |
| Perpetua (display) | Cormorant Garamond | It captures Perpetua's contrast… and inherits its problem, see below |

**Legibility warning, with a source.** Perpetua is documented as having *"a small x-height that
hurts reading"* and *"long ascenders and descenders that call for a lot of leading, which limits
its use as a running text face"*. **Cormorant Garamond has the same problem, and worse**, and on
a dark background its thin strokes get optically thinner still. **For a damage table at 13–14 px,
a Perpetua is the wrong tool.** *(We use Spectral, which is a screen serif with more x-height: a
good choice.)*

### How the text is set **[MEASURED]**

- **Area titles:** Trajan-like small caps, **very wide tracking** (0.12–0.2em), centred, white,
  between two rules or a filigree, fading in and out over ~2 s.
- **Hunter's Journal titles:** small caps with an enlarged initial capital, centred, pure white on
  pure black.
- **Body and dialogue:** a Perpetua-like serif, normal case, **left-aligned with a ragged right**
  (not justified), with generous leading.
- **Two text voices**: the "official" description in serif and **the Hunter's annotations, in
  monoline handwritten capitals**, in the margin. A very usable pattern for separating "wiki data"
  from "our comment".
- **Geo figures go in the same serif as the body**, not in a tabular face. The game never had to
  align a column of numbers.

## 5. The game's interface

### The charm screen **[MEASURED]**

- The background is **almost black with an illustration of the scene at 6–10% opacity** — you can
  make out a bench and the silhouette of the seated Knight. Neither flat nor textured: **a ghost
  of the scene**.
- Two tabs, "Charms" at the top left and "Inventory" on the right, in a serif in
  normal case, with a small button badge before the active one.
- **Hand-drawn white filigree**: scrolls in the left corners and dividing flourishes above and
  below, each with its central rosette.
- **The charms are NOT on a strict grid.** The icons vary in size and are placed by hand seeking
  visual balance, in loose columns. *(It's the most badly copied detail; our 4×10 grid is a
  deliberate and reasonable concession, but it's worth knowing the game doesn't do that.)*
- **A geo counter at the bottom**: glyph and figure in a light serif. No label, no separator.

**The charm icons** are circular, but **organically** circular: each one is a shell relief, not a
ring with a glyph inside. The edge is part of the sculpture. Measured across the 45 in
`assets/charms/`: **median saturation 13%**, maximum 40%. They group into five tint families, all
muted — bone, bluish grey, terracotta, ochre and pale pink.

**Charm descriptions are flavour text, never numbers.** The philosophy is that each charm
**enables a way of playing** instead of raising a stat; the effects are ×1.25 or ×1.5, never ×10.
*(And there lies our reason to exist, see §7.)*

### The Hunter's Journal: our template

The book's page (`Journal Sample 1–3`) is the best mould there is for this site: a **pure
black** page; **a single slate card `#55595A`** with rounded corners; white filigree placed as
**four corner brackets and a centred flourish at the bottom**, *not* as a closed frame; serif
body inside; a handwritten annotation in capitals below; a tiny page number **outside** the
frame. The creature's artwork goes **directly on the black, frameless**, with its name in small
caps underneath.

*(Our `.bk` corner brackets are already exactly this pattern. It's the most accurate thing in the
current design.)*

### HUD

Masks (`#EADBE3`), vessel and orb (`#F2F1F2` / `#ECECEC`), geo (`#E2EBDE`), notches (`#BEB8C1`).
All at the top left, all small, all hand-drawn. **No boxes, no bars, no frames, no shadows.
Nothing in the HUD is a rectangle.**

**What's on the wiki and what isn't** (searched in September 2026 on both wikis, by prefix and
full text): the loose pieces are there —`Soul Meter.png`, `Soul.png`, `HK Mask.png`, `HK Mask
Lifeblood.png`— but **not the orb's frame or an empty mask**, and **the pages' screenshots come
without the HUD**. The arena's frame (`hudRing`/`hudTail` in `js/app.js`) is therefore
**redrawn**, as §7 asks: a brush stroke that thickens and thins, and the tail under the masks
ending in a curl. Three states do have a source:

- **Overcharm:** `Overcharm.png` (746 × 165) is the purple aura the HUD puts behind the masks —
  veils of `#BA7DAE` smoke with specks of light.
- **A single mask:** `Knight One Mask.gif` shows the Knight giving off black smoke.
- **On falling:** the Shade remains (`The Knight Shade.png`), black with two white eyes. Black on
  black can't be seen: it needs light behind it, just like the Knight, whose cloak is also dark.

For the Knight, the best image is the one from his page (`The Knight.png`, 1070 × 1461, from the
front and with the nail on his back); `The Knight Idle.png` is the 63 × 132 sprite.

### Menus and ornament

The main menu is a **radial navy vignette** — measured: `#04060C` in the corners rising to
`#203050` in the centre, with the hue fixed between 220 and 227 — and about 60 white dust motes of
1–4 px rising slowly. No texture, no noise, no image. *(Our `--page-bg` is exactly that, though
it goes to `#16203a`, quite a bit lighter and bluer than the measured one.)*

The ornaments are documented as **"hand-drawn abstractions of Gothic architectural
ornaments"**, specifically French gables with spirals that look like waves; the interface arrows
come from **abstracting the stone pinnacles of some cathedrals**. A recurring motif: **an abstract
shell, with wings and without them**, in the logo, the menus and the dialogue boxes.

Two ornaments inspected pixel by pixel, both a pure `#FFFFFF` line on transparent: **`Dialogue
Top`** (597×82), a band of interlaced C-scrolls that read as waves, with a ringed central egg and
a pinnacle pointing down; and **`Pantheon Hdr`** (632×173), a symmetrical flourish with a central
bud enclosing a **ring-and-dot motif (an eye)** and two long horns that curl into spirals.

**The achievement icons** are the only place where the game does use a strict circular
medallion: a navy field `#232740` with a white `#FCFCFD` line inside a clean circle.

### Motion

Slow fades (0.4–2 s), area titles that rise and fall, dust motes, gentle floating on objects, a
radial halo on the lights. **No slides, no scale bounces, no overshooting curves, no flashy
transitions.** Godhome inverts everything else: a light gold background with black ornament in
silhouette — useful to know if someday a light theme that still belongs to the world is wanted.

## 6. What people like, with evidence

The words that repeat in Steam reviews, forums and criticism: **gloomy, desolate, melancholic,
nostalgic, lonely**. The constant framing is looking at *"a civilisation that died long ago"*.
And it's described at once as *"depressing and sinister, and also relaxing and endearing"* —
**that contradiction is the goal**.

Team Cherry's brief to their composer, **"dark elegance and melancholy"**, is the closest thing
there is to an official statement. It's the compass.

What people cite as their own: **the story told by the environment** (ruined architecture and
corpses, no exposition); **the benches as a refuge** (lit, warm, the only place where you change
charms); **the NPCs' humour** (Zote's 57 precepts, Elderbug); and **not being led by the hand**.

Memes and motifs: Hornet's shout that sounds like **"GIT GUD!"** (Team Cherry say it's "GEK
TUU!"), **Zote and his precepts**, Grey Prince Zote's absurdly long subtitles, the Grimm Troupe,
and **Hornet** as the fandom's visual mascot.

### The friction, which is the reason this site exists

- **The map system is the most divisive thing in the game**: you don't see your progress until you
  buy the area's map from Cornifer, and finding him is described as *"a waste of time no other
  metroidvania commits"*. Whoever defends it says it forces you to internalise the space.
- **The Path of Pain**: all or nothing, with almost no checkpoints.
- **The charms' flavour text hides the numbers.** Inside the game **it's lovely**; outside the
  game **it's useless**. That's exactly the gap a stat sheet fills.

**The design implication, and it's the important one:** this site is where the numbers are
**explicit, quick to scan and comparable**. **We don't reproduce the game's hiding of
information. We reproduce its calm.**

## 7. Bringing it to the web

### What does NOT translate

- **Illustrated backgrounds or ink splatters behind a table.** The game's backgrounds read because
  **there's nothing on top of them**. A card on a busy background is illegible.
- **Cinzel for anything other than titles.** It's all caps and has no usable lowercase. Cinzel in
  the body is illegible and reads like a fantasy novel.
- **Thin serifs at small sizes on dark.** Their thin strokes disappear. It's the number one failure
  of "Hollow Knight style" websites.
- **Heavy parallax.** The game's works because you move horizontally at a controlled speed. On a
  page you scan looking for numbers, it makes you dizzy and breaks the reading line.
- **Ultra-dark body text.** Never below `#B8BEC9` on a surface of the `#0A0E18` family.
- **A `#000000` page background.** The game earns it; a page scrolling on an OLED produces smearing
  and harsh contrast. Near-black.

### What DOES translate

1. **A ladder of dark surfaces**, derived from the menu's measured gradient, with the hue fixed at
   ~222. The surfaces rise in lightness; **elevation is said with tone, not shadow**.
2. **One accent per section, taken from the game map's tints** (§3): Charms `#D5DDFD`, Bosses
   `#F8CFFC`, Enemies `#BCE6F4`, Builds `#D8FFCC`, Godhome `#F7D9A7`. All above 12:1 against the
   background. **Faithful and accessible at once.**
3. **Ornament in the corners, not as a frame.** The Hunter's Journal: one corner bracket at the top
   left and another at the bottom right, a centred flourish between large sections, and nothing
   more. **One ornament per screen at most.** Redrawn as inline SVG with `currentColor` and
   `stroke-linecap: round`; never as a bitmap.
4. **Typography that works:** Cinzel only on section labels, in capitals, with
   `letter-spacing: 0.14em` and **from 18 px up**; a screen serif for prose and flavour text, with
   loose leading; and **a sans with tabular figures for the tables of numbers**. That last one is
   the departure I defend most strongly: damage, health, notches and percentages need a uniform
   colour of mass and digit alignment. **The game never had to solve a comparison table.**
5. **Texture, quietly.** A tiled SVG noise at `opacity: .025` with `mix-blend-mode: overlay` and
   `pointer-events: none`, fixed to the viewport. Plus a radial vignette on the page background,
   which is literally the measured main menu.
6. **Motion budget:** ~250 ms for the response to an interaction, ~400 ms for fades between
   sections, `cubic-bezier(.4, 0, .2, 1)`, **no bounce**. The dust motes, if used, 15–25 at most
   and always inside `prefers-reduced-motion: no-preference`.
7. **The charms, on black and with air.** Circular, on the background and not on a card, and
   **the equipped one is marked with a halo**, which is what the game does — not with a border or a
   checkmark. The overcharmed one, with the real purple `#BA7DAE`.
8. **Two languages:** Spanish takes up ~20% more than English; headers are built to **break onto
   two lines, not to truncate**, and it's best not to go beyond `0.14em` of letter-spacing in
   Spanish, where it harms word recognition more than in English.

### The brief, in one sentence

**Make it look like a page of the Hunter's Journal, not a screenshot of Hallownest**: an almost
black field, one card, bone-coloured serif prose, one area tint per section, ornament only in the
corners and the numbers in a clean sans. Quiet, dignified, and legible enough that nobody has to
squint at a damage table.

## Sources

**Authors:** [Kickstarter](https://www.kickstarter.com/projects/11662585/hollow-knight) ·
[Bandcamp Daily — Larkin](https://daily.bandcamp.com/features/christopher-larkin-review) ·
[GamingBolt — influences](https://gamingbolt.com/hollow-knight-developers-reveal-their-inspirations-for-the-game) ·
[ACMI — Team Cherry](https://www.acmi.net.au/stories-and-ideas/from-ludum-dare-to-pharloom/) ·
[Wikipedia: Ari Gibson](https://en.wikipedia.org/wiki/Ari_Gibson) ·
[SVG / Rock Paper Shotgun — the sketchbooks](https://www.svg.com/366885/the-untold-truth-of-hollow-knight/)

**Typography:** [HollowKnightTextDatabase](https://github.com/jdvannest/HollowKnightTextDatabase) ·
[ZenHAX — asset extraction](https://zenhax.com/viewtopic.php@t=17838.html) ·
[Cinzel](https://github.com/NDISCOVER/Cinzel) ·
[MyFonts: Perpetua field guide](https://www.myfonts.com/a/font/content/font-field-guide/perpetua) ·
[Typewolf: Perpetua](https://www.typewolf.com/perpetua)

**Interface and community:** [Picky Champy's interface analysis](https://champicky.com/2022/03/23/hollow-knight-interface-design-analysis/) ·
[Game UI Database](https://www.gameuidatabase.com/gameData.php?id=113) ·
[wiki: Charms](https://hollowknight.wiki/w/Charms) ·
[ResetEra — the map debate](https://www.resetera.com/threads/lttp-hollow-knight-is-this-map-system-really-that-troublesome-for-some-people.150423/) ·
[TV Tropes: Memes](https://tvtropes.org/pmwiki/pmwiki.php/Memes/HollowKnight) ·
[First Person Scholar](https://www.firstpersonscholar.com/for-all-the-broken-vessels/)

**Image corpus:** 80 screenshots `Screenshot HK <Area> NN.png` from 16 areas via
`hollowknight.wiki/mw/api.php`, plus `Cornifers Map.png`, `Menu Theme Classic Current.png`,
`Inventory Godseeker Mode.png`, `Journal Sample 1–3`, `Charms Set 1–2`, `Dialogue Top/Bottom`,
`Pantheon Hdr/Ftr`, `Overcharm.png` and achievement icons; and the 73 sprites in `assets/`.
