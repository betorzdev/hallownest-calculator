# Hallownest Calculator — project instructions

A site for seeing **how each of the Knight's stats changes with each charm**. Spanish and English.
`README.md` is the short tour with screenshots; `docs/guide.md` explains everything on the page
(keep it up to date when the page changes); these are the rules for working on it.

## Where the knowledge is

Before touching anything, check whether it's already solved:

- **`design/`** — design. **`design/00-system.md` is the entry point**: the audit with the
  measured numbers, the proposed system and the plan by value/cost. Next to it, web best
  practices (`01-web.md`), the game's visual language with the measured palettes
  (`02-hollow-knight.md`) and the competition (`03-competition.md`). **Read it before any
  visual change.**
- **`kb/`** — combat: the 49 bosses, the health of 136 enemies, Godhome, the Colosseum and builds.
  Combat questions are answered from here, without going back to the wiki. **`js/enemies.js`
  comes from here**, and that one is part of the site: the combat simulator's 180 entries. If
  you correct a number in `kb/`, correct it there too. The same goes for `js/pantheons.js`, the
  five Pantheons room by room, and `js/hall.js`, the 44 statues of the Hall of Gods.
  `js/journal.js` (the Hunter's Journal: the combat picker and your game's book) doesn't come
  from `kb/`: `npm run journal` generates it from the two wikis and the dump of the game's texts
  (for what the wikis don't carry cleanly), and it isn't edited by hand. Its marking rules are
  in `js/hunter.js`.

Neither folder is part of the page: `index.html` doesn't load them.

## Hard constraints

- **No framework and no build.** `index.html` loads **eleven classic scripts**, not modules.
  Plus GoatCounter's (`async`, external), the visit counter: the site has to work the same
  without it, so its events go through `track()` in `js/app.js`, which does nothing if it's missing.
- **The site has to work over `file://`** (opening `index.html` with a double click). Everything
  else follows from that: ES modules and `fetch()` are blocked by the opaque origin, so **data
  travels in `.js` files with an assignment, never in `.json`**. If `kb/data/hp.json` ever goes
  into the site, it goes in as `js/enemies.js`, not with a `fetch`.
- **`localStorage` always wrapped in `try/catch`**: over `file://` its behaviour is undefined and
  access can throw.
- **Every colour, typeface and spacing value comes from `css/tokens.css`.** No loose values.
- **Every visible string carries its `{ es, en }` pair**, and the engine receives the language:
  `compute(state, lang)`. The maths never depends on the language.
- **The numbers come from `hollowknight.wiki`**, with the game's rounding (half to the even
  integer). The rules are in `docs/guide.md` and the odd cases are noted where they're used.
- **The repo is written in English**: code, identifiers, comments, tests, docs (`design/`,
  `kb/`) and commit messages. Only the site's Spanish side is Spanish: the `es` of each
  `{ es, en }` pair and the Spanish texts the tests and the smoke test check.

## Translations

**Nothing is translated by hand.** Every visible string carries `{ es, en }` and comes from a
source, in this order. `npm run text -- "Shade Cloak"` searches the first one; `--key CHARM_NAME_`
lists by key; `--audit` cross-checks every game name the site carries against its text.

1. **The game's text**: the dump of its TextAssets, `kb/data/all_text.json` (downloaded the
   first time, pinned to patch 1.5.12620). Charms `CHARM_NAME_*`, items and abilities
   `INV_NAME_*`, Journal entries `NAME_*`, areas and boss titles `<X>_SUPER` + `<X>_MAIN`,
   charm screen labels `CHARM_TXT_*`, Godhome `GG_S_*`, `UI_CHALLENGE_*`, `UI_BINDING_*`,
   `CHALLENGE_UI_LEVEL*`, and the Hunter's Journal `ENCOUNTERED`, `KILL_COUNT_*`, `HUNTER_*`.
   **It's copied as is**: its capitalisation («Aguijón Onírico», «Escudo Onírico») and its
   typos («Guardian Furioso», «estas empezando»). Curly quotes become straight. **Leave the key
   in a comment next to the string** (`// CHARM_TXT_EQUIPPED`): `--audit` checks those.
2. **The English wiki**, the `ESname` in the page's `{{Localisation}}` block
   (`https://hollowknight.wiki/w/<Page>?action=raw`), for what the game doesn't name anywhere
   (Absolute Radiance, Brothers Oro & Mato, Godhome, Hall of Gods).
3. **The Spanish wiki** (`hollowknight.fandom.com/es`), only for what the game doesn't name:
   the bosses' attacks (in bold under «Comportamiento y tácticas») and the Zotelings of «La
   Eterna Disputa». They're fan names: the same attack on two bosses carries the same name,
   and a wiki typo does get corrected («Machaque de aguija» → «aguijón»).
4. **With no source**, it stays in English and that's noted in the comment.

What the site says and the game doesn't **is written for the context**, not word for word:
the two languages say the same thing in their own way («Golpes hasta morir» / "Hits until you
die", «ahora sí» / "now on"). A label that copies an element of the game carries its text
(«Equipado», «Sobrecarga», «Muescas», «Armonía»); in prose the adjective will do («te dejaría
sobrecargado»). A game name inside a sentence goes as in the game. Numbers: Spanish «50 %» and
«0,25 s»; English "50%" and "0.25 s", as the engine's `pct()` and `num()` do. The `{x}`
placeholders are the same in both languages. `npm test` catches Spanish accents or words in the
English and mismatched placeholders; `npm run text -- --audit`, a game name that doesn't say
what the game says.

## When you finish

- `npm test` — `node --test`, no dependencies. `test/i18n.test.js` fails if a Spanish accent
  slips into the English or a string is left untranslated. If you've touched game names,
  `npm run text -- --audit`.
- To look at the page: `debug-smoke.html` drives the site and writes the result; `debug.html`
  sets the preferences for screenshots; `debug-overflow.html` lists what spills past the width;
  `debug-hover.html` tests the mouse behaviour, and has to be run with
  `--blink-settings=primaryHoverType=2,primaryPointerType=4,availableHoverTypes=2,availablePointerTypes=4`
  (without it, headless Chrome behaves as touch).
  Headless Chrome crops below 500 px wide, so they run inside an iframe and need
  `--allow-file-access-from-files`.

## Things that are easy to get wrong without checking

Measured on the sprites in `assets/hud/` and on official screenshots:

- **The game's soul is white** (`soul.png` = `#ECECEC`, 0% saturation), not cyan.
- **The saturated cyan is lifeblood** (`mask-lb.png` = `#63BDD7`), and it already has its own token.
- **Geo isn't gold** (`#E2EBDE`) and **overcharm is purple** (`#BA7DAE`), not red.
- **The game's map screen isn't parchment**: it's black with each region in a pale, desaturated
  tint. It's a ready-made accent system, and it's above 12:1 contrast.

From the Hunter's Journal (the wiki's table, `js/hunter.js`):

- **The game's total isn't 164**: it starts at the **146** the Hunter's Mark requires and goes
  up with each optional entry you encounter, up to 164.
- **The entry is added with the first defeat**: encountered leaves K−1 at most, and the 45
  single-defeat ones are yes or no.
- **Flukemunga**: one is enough for the Mark (the wiki says so; not checked in the game).

The accent is already decided (`design/00-system.md`, §3): **it doesn't decorate data**. The
figures go in bone and `--accent` only marks what responds to the finger. And **numbers don't go
in Cinzel**: it's a capital with no real lowercase, so they go in `--font-num` with tabular figures.
