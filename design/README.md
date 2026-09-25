# Design

Reference material for deciding how this site looks and behaves. It isn't part of the page
(`index.html` doesn't load it), just like `kb/`.

| File | What it contains |
|---|---|
| [`00-system.md`](00-system.md) | **Start here.** An audit of what's there today, the proposed system and the plan in order of value |
| [`01-web.md`](01-web.md) | Web best practices: what's a hard rule and what's taste. Contrasts calculated and browser support checked against Baseline |
| [`02-hollow-knight.md`](02-hollow-knight.md) | The game's visual language: palettes measured by area, typefaces, interface conventions, what people like and what translates to the web |
| [`03-competition.md`](03-competition.md) | Which Hollow Knight websites already exist, what they lack, and the patterns worth stealing from the best data sites for other games |
| [`04-charms-in-combat.md`](04-charms-in-combat.md) | The 45 charms one by one: what they do in a fight, what the arena simulates today and the model (a sheet with the fight's health, the `js/fight.js` reducer, a clock) so that they all fit, with the plan in deliveries |
| [`05-spell-variants.html`](05-spell-variants.html) | Five ways of choosing how many of a spell's impacts land, working with the real CSS and sprites (open it with a double click). **B, notches**, was chosen on 22 September 2026 |
| [`06-sheet-variants.html`](06-sheet-variants.html) | The header and the sheet remade as the **game's Inventory screen**, with the real engine and sprites, at 1440 and 390 px side by side, and controls for variant, language, build and options (also via the URL: `?variant=a2&build=joni&lang=es`). **A1, one page**, was chosen, with the filigree in the header, the motes and the per-section tint, on 22 September 2026; the bench ghost was tried on the site and removed because it looked ugly |
| [`08-live-sync.md`](08-live-sync.md) | Keeping a slot in step with the real game: the three ways researched (watching the save file, the HKTracker mod, a mod of our own), the plan for the first and where it stands |

## The five things to know

1. **The game's soul is white** (`#ECECEC`, 0% saturation), not cyan. The saturated cyan is
   **lifeblood** (`#63BDD7`). The `tokens.css` comment that called the accent "the blue of
   soul" was wrong.
2. **The game's map screen is a ready-made accent system**: pure black with each region in a
   pale, desaturated tint (S 12–23%, V 95–100%). Atmospheric and above 12:1 contrast at once.
3. **The template is the Hunter's Journal page**, not a screenshot of Hallownest: black, one
   card, filigree only in the corners.
4. **Numbers go in a sans with tabular figures, right-aligned.** It's the deliberate departure
   from the game, which never had to solve a comparison table.
5. **No Hollow Knight website answers "how many hits do I need for this boss?"**, and none does
   it in Spanish. `kb/data/hp.json` already has the data and the site doesn't load it yet.

Researched in September 2026. The colours are measured on official screenshots and on the
sprites in `assets/`; the contrasts, calculated with the WCAG formula; browser support, checked
against the Baseline API.
