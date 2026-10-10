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
| [`09-progress.md`](09-progress.md) | The **Progress** screen: the game's 112% category by category, marked by hand or from the save, and later the collectibles and the map. Three variants in [`09-progress-variants.html`](09-progress-variants.html), over your own game or a sample one: A · the Journal (list and page), B · the Inventory (everything open), C · the tablet (a row per category). **C, the tablet**, was chosen on 26 September 2026 |
| [`10-restructure.md`](10-restructure.md) | Restructuring the site around your **real game**: a new start screen, *Your game* (the live link, the last bench, what you got since the last save, your shade, what's missing nearby), the bar in two groups (your game \| the tools) and the public face. Three variants in [`10-home-variants.html`](10-home-variants.html): A · the profile, B · the chronicle, C · the bench. **C, the bench**, was chosen on 26 September 2026 |
| [`11-components.md`](11-components.md) | The **component system**, round by round from the general to the specific (foundations, buttons, the other components, patterns, screens), each chosen on the living catalogue [`11-components.html`](11-components.html), which loads the real CSS and shows every scale and component. Rounds 1 (foundations: tracking, control heights, icons), 2 (four kinds of button), 3 (choose one, on/off, search), 4 (tags, filters, notices), 5 (the open row, empty states, what you lack) and 6 (screen by screen) were decided on 27 September 2026 |
| [`12-seo.md`](12-seo.md) | **SEO**: the general rules for 2026 (hash routes are invisible, AI Overviews, one page per intent), an audit of the site (2 indexable URLs, 15 words of HTML), what people search for in English and Spanish swept from Google's autocomplete (save analyzer, 112%, per-charm in Spanish), the competition per intent and the plan: generated landing pages |
| [`31-steam-import-variants.html`](31-steam-import-variants.html) | How the achievements tab asks for your **Steam account's record** (Steam's stats file) and lets you keep it by hand: A · two doors, B · the scene (the saves screen's drop zone), C · one line with a sheet; each in its idle, linked and by-hand states. **B, the scene**, was chosen on 8 October 2026, with «Elegir el archivo» opening the saves screen's steps view instead of a «where is the file» link |
| [`32-account-card-variants.html`](32-account-card-variants.html) | The **account card** on the achievements tab (Steam's record or the one kept by hand), unboxed: A · under the figure, B · a head row of the tablet drawn like Your game's list rows, C · a block head. **B, the head row**, was chosen on 8 October 2026 |
| [`33-account-idle-variants.html`](33-account-idle-variants.html) | The achievements tab **before any account record**: A · the account's row empty, with the two ways as its actions, B · the scene without its box, C · a tighter scene. **A, the head row**, was chosen on 8 October 2026: one place for the account in every state |
| [`34-since-completion.html`](34-since-completion.html) | The **completion row** at the foot of Your game's *Since last time*, today a row like the items with an empty picture slot: A · the list's sum line (label, figures and the gain's bar, apart from the rows), B · the row kept with the grub as its picture, C · the gain in the block's head, no row. **A, the sum line**, was chosen on 8 October 2026 |
| [`35-achievement-detail.html`](35-achievement-detail.html) | Tapping an achievement opens its **detail**: what it needs and what comes before, and «Ojo» when it can be lost or rules out another (facts from `kb/achievements.md`, the game's names); a secret you don't have keeps its steps veiled; the plate's mark moves inside. A · a panel under the plates (like the Charms detail), B · the plate opens in place across the row, C · a sheet (bottom on a phone, right on a desktop). Six examples, one per kind. **B, in place**, was chosen on 8 October 2026, built, and taken out the same day: with only the game's names, the plate said it all (the pin and the red warnings went onto the plate) |
| [`36-picked-plate.html`](36-picked-plate.html) | The **achievement whose detail is open**, without today's hairline frame (Albert found it ugly): A · the plate's hover halo held and the icon lifted, B · a tab on the detail's ground, C · a notch in the panel's edge under the plate, D · only the name in strong ink and the icon lit. **A, halo and lift**, was chosen on 8 October 2026; gone with the detail |

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
