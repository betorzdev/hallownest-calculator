# The landscape: what's already out there and which patterns to steal

Researched in September 2026. Every URL here has been visited except the ones marked
**[not accessible]** (Fandom returns 402/403, light.gg 403, Steam guides 429).

## 1. The Hollow Knight ecosystem

### The wiki (`hollowknight.wiki`)

It's the source of everything —our numbers too— and at the same time the gap in front of us.

| Page | What it gives | What it lacks |
|---|---|---|
| [Damage Values and Enemy Health](https://hollowknight.wiki/w/Damage_Values_and_Enemy_Health_(Hollow_Knight)) | Nail 5/9/13/17/21, Fury as "1.75 × Nail (9/16/23/30/37)", every enemy's and boss's health | **Static** tables: they can't be sorted, filtered or searched, and the damage table isn't crossed with the health one. You do the division |
| [Charms](https://hollowknight.wiki/w/Charms) | The 45 charms with icon, name, cost and **prose description** | Zero numbers in the index: "Increases the power of spells". The data exists but not there |
| [Fragile Strength](https://hollowknight.wiki/w/Fragile_Strength) | It does quantify: 8/14/20/26/32 normal, 14/24/35/46/56 with Fury | **Four clicks and a footnote** away, inside 2,000 words. And it can't be compared with another charm without opening another tab |
| [Charm Synergies](https://hollowknight.wiki/w/Charm_Synergies) | ~12 pairs, all with a number (Sharp Shadow ×1.5, spores +35%, Unn 6.0 → 12.0) | **They aren't detected on their own**: you already have to know the pair exists to go looking for it |
| [Nightmare King Grimm](https://hollowknight.wiki/w/Nightmare_King_Grimm) | Health 1500, Attuned 1250 / Ascended 1650 | The damage he deals you, in prose ("two Masks of damage"). No attack-by-attack table |
| [Pantheons](https://hollowknight.wiki/w/Pantheons) | Quantified bindings: nail at 4/7/10/13/13, shell 4 masks, soul 33 | Neither health per pantheon nor tracking |

The wiki left Fandom on **31 October 2023** because of the advertising and the lack of control.
Fandom is still the first Google result for many searches and it's the **only site with pages in
Spanish**.

### The only real calculator

**The Knight's Calculator** — <https://isaiahchin.github.io/the-knights-calculator/> ·
[repo](https://github.com/IsaiahChin/the-knights-calculator)

The closest thing to ours, and the yardstick. In: 5 nails, 3 spells, **40 charms with an
11-notch budget**, 165 filterable enemies. Out: DPS (12.20 with the Old Nail), damage per hit,
swing interval (0.41 s), spell damage, soul 99/33/11.

It doesn't have: **hits to kill, a delta against a reference, A/B comparison, a share link, or
languages**. Next.js + React + Tailwind, **5 stars and 1 fork in three years**, no licence. The
quantitative niche is occupied by a single obscure app, in English and impossible to cite on a
Discord.

### Build planners (they plan, they don't calculate)

- [hk-charm-builder](https://imp-dance.github.io/hk-charm-builder/) — traces the charm menu,
  allows overcharming and **detects synergies**. No output stats. 1 star.
- [perchance hk-charm-gen](https://perchance.org/hk-charm-gen) — a random generator.

They all answer "does it fit in 11 notches?". None answers "and what does this do to my damage?".

### Lists and maps (the healthy part of the ecosystem)

- **[Hallownest Atlas](https://www.hollowknightmap.org/)** — the best-made thing there is. A dark,
  atmospheric theme, 145 points, 12 areas, 47 bosses, 45 charms, 46 grubs;
  [a 112% checklist](https://www.hollowknightmap.org/112-checklist/) with "0% · 0/151",
  **"🔗 Copy Share Link"**, saved in `localStorage`, filters by DLC and **explicit spoiler
  tagging**. Deliberately not a numbers tool. English only.
- **[game-checklists](https://game-checklists.com/hollow-knight/112-checklist/)** — 0/123, sorted
  by optimal route and not alphabetically, **one screenshot per requirement**, charms in the
  game's inventory order, progress shared between sister lists.

### Speedrun and randomizer

[speedrun.com/hollowknight/guides](https://www.speedrun.com/hollowknight/guides): the 112% guide
is marked **"out of date"** by its own authors. Routing knowledge lives in Discord and pastebins:
unindexed, unversioned, rotting. Randomizer trackers are **game mods**, not websites.

### Silksong (what's coming)

- [silksongwiki.com/database](https://silksongwiki.com/database/) — 59 tools, 194 enemies, 7
  crests; a search box with the **`/`** shortcut; updated in August 2026.
- [silksong.codes](https://www.silksong.codes/en/guides/all-charms-guide/) — 51 properly
  quantified tools (Clock Beetle: 30 s cooldown, 3 silk), no ads, but the `/en/` is unused i18n:
  there's only English.
- [silksongmaps.net](https://silksongmaps.net/tools/) — **six languages, Spanish included**, but
  the data is still "from preview material" and stale.
- And SEO filler is already colonising the gap, **publishing badly worked-out figures**: one
  circulates saying that the Mantis Ladies have 50 health and it takes "50 hits with the Old Nail,
  25 with the Channelled, 17 with the Spiral Nail" — 5 × 50 ≠ 50, and the Spiral Nail doesn't exist.

### Spanish

| Site | Spanish? | How good |
|---|---|---|
| `hollowknight.wiki` | No. The language links in the footer **go out to Fandom** | The damage page, the one that matters, is English only |
| Fandom ES **[not accessible]** | Yes | A community mirror on the platform the English wiki fled; partial numbers |
| Spanish Steam guides **[not accessible]** | Yes | Popular, but locked inside Steam: not searchable or versioned |
| [portal.33bits.net](https://portal.33bits.net/guia-hollow-knight/) | Yes | From May 2018, with no revision date and **not a single combat number** |
| Knight's Calculator, Hallownest Atlas, game-checklists, silksongwiki | **No** | English only |

**There's no quantified Hollow Knight combat resource in Spanish.** It's an open position nobody
is contesting.

## 2. Patterns from the best data sites for other games

**[Overframe](https://overframe.gg/build/1052/revenant/the-lich-king-revenant/)** (Warframe) — the
closest analogue to notches. A **"60 / 60"** budget, a panel with the base and the modified value,
and above all **derived composites**: "Damage Reduction: 44.4%", "EFFECTIVE HIT POINTS: 1,159",
and every ability already resolved (19.95 s, cost 12.5, range 58.75 m).
→ *Steal: a budget meter + base/modified columns + one big headline derived figure.*

**[Fextralife Elden Ring Build Calculator](https://eldenring.wiki.fextralife.com/Build_calculator)**
— the best table idea I've seen: each row with **`Current | Added | Equip | Total`** columns. The
delta is structure, not an add-on. A "Get build URL" button and an "Original / Compact" density
toggle. Dead weight: it lives inside Fextralife's ad and video chrome.

**[tarnished.dev](https://www.tarnished.dev/build-planner)** — the richest inputs there are (8
stats, 3 loadouts, affinities) and **no delta, no comparison, no link**. Lesson: rich inputs
don't make a good tool.

**[Pokémon Showdown damage calculator](https://calc.pokemonshowdown.com/)** — the gold standard for
"hits to kill". It doesn't give a number: it gives a **one-sentence verdict** — "X-Y% -- guaranteed
2HKO", "37.5% chance to 2HKO". A number is data; "guaranteed 2HKO" is an answer. Also: an "Auto
dark / Light / Dark" theme.

**[Showdown teambuilder](https://play.pokemonshowdown.com/teambuilder)** — sliders you move until
the derived stat goes up by one point (threshold input), illegal combinations **blocked at input**
instead of warned about, and **text import/export** that round-trips completely.

**[Path of Building](https://github.com/PathOfBuildingCommunity/PathOfBuilding)** — a fixed summary
in the sidebar, a **"Calcs"** tab that **shows where each number comes from**, and a **delta when
hovering anything you don't wear yet**. When those tooltips broke
([issue #3247](https://github.com/PathOfBuildingCommunity/PathOfBuilding/issues/3247)) people
treated it as a serious bug: the on-the-fly delta *is* the product.

**[Kiranico](https://mhrise.kiranico.com/)** (Monster Hunter) — extreme density with calm: 3,953
weapons, 1,591 armour pieces, 112 monsters, a **`Search... Ctrl+K`** command palette with its
explicit empty state, and **15 languages, with Spanish and Latin American Spanish**. It's the yardstick.

**[Pikalytics](https://www.pikalytics.com/)** — cards where the number is the headline (37.61%
usage) and, very much ours, **2/3/4-piece "cores" with their percentage**: the equivalent of
"charm combinations people wear together".

**light.gg** **[not accessible, 403]** — from the documentation: it compares your roll against the
community average and **inverts the query** (you pick the perks you want and it tells you which
weapons can roll them). → *Steal the inversion: let the user ask for the result and give them back the builds.*

## 3. The gap we can fill

**No site quickly answers: "with these charms and this nail, how many hits do I need for boss X,
and how many can I take?"**

Questions that today need three tabs and a calculator by hand:

- *"Is Fragile Strength worth 3 notches against Nightmare King Grimm?"* It takes 1500 health, the
  Pure Nail 21 and Strength 32 → **72 hits versus 48**. The wiki has both numbers on different
  pages and doesn't do the division.
- *"With the Nail Binding, how much longer does the Pantheon get?"* The cap of 13 versus the Pure
  Nail's 21: **62% more hits**. Nobody works it out.
- *"Which single charm change removes the most hits per notch it costs?"* A damage-per-notch
  ranking. It doesn't exist anywhere.
- *"How many of this boss's hits can I take?"* The damage-taken side is almost unquantified on the
  wiki, which writes "two Masks" in prose.
- **And all of that in Spanish.** Zero coverage.

Our starting advantage: `kb/data/hp.json` already has 136 enemies and 45 bosses, and
`hall_of_gods.json` the Attuned/Ascended health of the 44 statues. **The site doesn't load any of
it yet** (`js/data.js` only knows the Knight).

## 4. Concrete mechanics to build

1. **A target picker with a verdict sentence.** "Nightmare King Grimm · 1500 health · 48 nail
   hits (−24 against your reference) · or 8 Vengeful Spirits + 12 hits · you survive 3 hits (2
   masks each, 5 masks)."
2. **A damage-per-notch ranking** against the chosen target: Δhits ÷ notches. The star view, and
   nobody has it.
3. **A delta when hovering a charm you don't wear** — the inspector already exists; what's missing
   is including the effect on the target: "−24 hits against NKG, notches 9 → 12 (OVERCHARMED)".
4. **A/B comparison of two builds** in two columns with the difference marked, verdicts included.
5. **Godhome bindings as first-class modifiers** (nail → cap 13 → 4/7/10/13/13; shell → 4 masks;
   soul → 33; charms → grid disabled), recomputing everything.
6. **A synergy detector** with the ~12 documented pairs and their number.
7. **A command palette with `/` and Ctrl+K**, with a **bilingual** index: so that «amuleto» and
   "charm" search for the same thing.
8. **"Show the sum"** on every derived number: `21 (Pure Nail) × 1.5 (Fragile Strength) = 32 →
   ceil(1500 / 32) = 47 hits`. It's the trust mechanism and it vaccinates us against the invented
   numbers already circulating.
9. **Sharing by text as well as by URL** (Showdown's format), to paste into Discord.
10. **A spoiler gate by tier** (base game / Hidden Dreams / Grimm Troupe / Lifeblood / Godmaster)
    with a one-click "I've already beaten it", copied from Hallownest Atlas's DLC filter.

## 5. Traps, each one seen on a real site

- **Prose instead of numbers** — the wiki charm index's "greatly increases". Here every effect
  carries a number or an explicit "not quantifiable".
- **Numbers that exist but can't be compared** — the Fragile Strength table, correct and buried in
  a footnote. Never force building a table out of N pages.
- **Rich inputs without deltas** — tarnished.dev.
- **Not being able to share** — the Knight's Calculator can't be cited in a discussion, and that's
  a good part of why it's had 5 stars for three years.
- **General spoiler warnings** instead of spoiler controls.
- **Stale data with no visible date** — silksongmaps with preview material, 33bits from 2018, the
  speedrun.com guide that labels itself out of date. **A revision date and the game version on
  every dataset.**
- **Ads and video drowning the tool** — the reason the wiki left Fandom.
- **Data locked away where it isn't indexed** — Steam, Discord, pastebins. Ours is static HTML,
  crawlable and linkable by charm and by boss.
- **A mandatory light theme** on dense-table sites (the wiki, Kiranico).
- **Publishing derived numbers without the formula** — the Mantis Ladies nonsense. Showing the
  arithmetic is a defensive moat.
