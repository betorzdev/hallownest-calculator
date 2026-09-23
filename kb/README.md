# Combat knowledge base — Hollow Knight 1.5

For answering combat questions without going back to the wiki. It isn't part of the site
(`index.html` doesn't load it); it's reference material.

## Index

| File | What it contains |
|---|---|
| `01-mechanics.md` | How the system works: rounding, stagger, parries, i-frames, soul, healing, Godhome difficulties |
| `02-arsenal.md` | All the Knight's damage tables: nail, arts, spells, charms, DPS |
| `03-bosses.md` | An entry for each of the 49 bosses: health, phases, each attack with its tell, stagger and tactics |
| `04-enemies.md` | Health of the 136 enemies + a summary of boss health |
| `05-godhome.md` | Bindings, the 5 Pantheons in full order, the Hall of Gods with health values and arena changes |
| `06-colosseum.md` | The 3 Trials wave by wave, and the Eternal Ordeal |
| `07-builds.md` | Builds by scenario, with their notch cost, and the costly mistakes |

## `data/` — raw material

| File | What it is |
|---|---|
| `hp.json` | Master health table: 136 enemies + 45 bosses, by expansion |
| `entities.json` | 176 enemy and boss entries from the infobox: health, area, drops, Hunter's Journal number |
| `staggers.json` | Stagger for the 20 bosses that get staggered: hits, combo and window |
| `hall_of_gods.json` | Attuned/Ascended health and arena changes for the 44 statues |
| `trials.json` | The exact waves of the three Colosseum Trials |
| `pantheons.json` | Boss order for Pantheons 1–4 |
| `tactics-en.txt` | The *Behaviour and Tactics* sections of the 49 bosses, in English, as they come from the wiki. It's the source of `03-bosses.md`; check it if you need a detail that didn't make it into the summary |
| `fetch-wiki.py` | Script to download wikitext again: `python3 fetch-wiki.py "Page name" list.txt` |

## Source and reliability

Everything comes from **`hollowknight.wiki`** as raw wikitext (`?action=raw` and its API at
`/mw/api.php`), downloaded in **September 2026**. The wiki now covers both Hollow Knight and
Silksong; **only Hollow Knight is here** (`Category:Bosses (Hollow Knight)` and
`Category:Enemies (Hollow Knight)`).

Two wiki errata are corrected and noted where they appear:
- False Knight: the master table says 255, but 65×3 + 40×4 = **355**.
- Gorb: the master table gives him Galien's values; the correct ones are **200/320/416/500/570**.

## Names

Everything here uses the official **English** names, which is how the wiki indexes them: charms,
nails, spells, arts, bosses and enemies. The official Spanish names are in the site's data
(`js/data.js`, `js/enemies.js`), and `03-bosses.md` adds the Spanish for a boss where it has
been checked. At the time of writing, the Spanish wiki was behind Cloudflare and couldn't be
queried from here.

## Relation to the site

The calculator (`js/engine.js`, `js/data.js`) covers **the Knight's side**: how his stats change
with each charm and upgrade. This folder covers **the other side**: what those numbers are used
against.

**There is already a bridge**: the site's combat simulator loads `js/enemies.js`, which was built
from here — health and area from `data/hp.json` and `data/entities.json`, Godhome health and the
Spanish attack names from `03-bosses.md`, English attack names from `data/tactics-en.txt`, and who
deals 2 masks from `01-mechanics.md` §1. This folder still isn't loaded by the page: what travels
is `js/enemies.js`. **If you correct a number here, correct it there too.**
