# SEO: how the site gets found, and what people search for

Researched on 27 September 2026. The demand comes from sweeping Google's autocomplete
(`suggestqueries.google.com`, the seed plus `a`–`z`) in English and Spanish: **~1,400 English and
~1,000 Spanish suggestions** for "hollow knight", "… 112", "… save", "… charm", "… best",
"… how to", "hollow knight amuleto", "… mapa", "… partida". Autocomplete says *what* people type,
not *how many*: there's no free volume source, so the order in this document is by fit and by
how often a theme recurs across seeds, not by traffic. Search Console (the site is verified:
`google-site-verification` in `index.html`) is where the real numbers will come from.

## 1. The general rules (2026)

What's a hard rule and what's taste, as in `01-web.md`.

**Hard rules**

- **Google indexes URLs, and ignores what comes after `#`.** Every hash route is the same page to
  it. Google's own guidance is the History API for SPAs; this site can't use it (`pushState`
  throws on `file://`, whose origin is opaque), so **the indexable pages have to be real files**.
- **Google renders JavaScript, but late and not always.** Text that only exists after the scripts
  run is indexed in a second wave, if at all; other engines and every AI crawler (the ones that
  feed ChatGPT, Perplexity, Claude…) mostly **don't run JS**. What should rank must be in the HTML.
- **One page per intent.** A page ranks for what its title, its H1 and its first paragraph say.
  A page that says "save tracker, 112%, map, journal, charms, combat" ranks for none of them.
- **Each language at its own URL** with `hreflang` both ways and a self-canonical. (Done:
  `/` and `/es/`.)
- **Title ≤ ~60 characters, the query first; description ~150**, written as the answer. Google
  rewrites both when they don't match the query.
- **Mobile-first and Core Web Vitals** (LCP < 2.5 s, INP < 200 ms, CLS < 0.1): Google indexes
  the phone version.
- **Structured data only for what's on the page** (`WebApplication`, `FAQPage`,
  `BreadcrumbList`, `VideoGame` as `about`). FAQ rich results are gone for most sites since 2023,
  but the markup still helps the page get **quoted by AI Overviews**.

**How search changed**

- **AI Overviews take the informational clicks**: studies put CTR at position 1 30–58% lower
  when one shows. They hurt "how many charm notches are there"; they **don't** answer "check my
  save" or "calculate my build": **a tool's intent can't be summarised**. That's our side.
- **Being quoted is the new ranking** for informational queries: a clear sentence that answers
  (*"Nightmare King Grimm has 1500 health: 72 hits with the Pure Nail, 48 with Fragile
  Strength"*) in the first lines, with the source and the date. Original data (our derived
  numbers, the formula shown) is exactly what gets cited, and what thin SEO filler can't copy.
- **Reddit, Steam guides and YouTube** own a big share of the game results ("… reddit", "… steam",
  "… youtube" appear as suffixes on every seed). A link from a helpful reply in
  r/HollowKnight or a Steam guide is worth more than any on-page change.
- **Freshness counts for games**: a visible "updated" date and the game patch (1.5.12620) on every
  data page. The competitors' staleness (2018 guides, a 2022 analyzer) is a weakness to exploit.

**Taste, not rules**: keyword density, meta keywords (ignored since 2009), exact-match domains,
word-count targets.

## 2. The site today (audit)

| What | State | |
|---|---|---|
| Indexable URLs | **2**: `/` and `/es/` | Every screen (`#view=map`, `#view=journal`…) is invisible |
| Text in the HTML | **15 words** in `<body>` (the nav) | Everything else is written by `app.js` |
| `<title>` | 78 characters, "Hallownest Calculator:" first | The brand leads; nobody searches it yet. It'll be cut at ~60 |
| Description | Good, but lists 7 things | One intent per page fixes it |
| `hreflang`, canonical, `x-default` | Right, both ways | `tools/pages.js` keeps them in step |
| Open Graph / Twitter | Complete, 1200 × 630 | `og.jpg` still shows the Charms screen; the pitch is now the save |
| JSON-LD | `WebApplication` + `WebSite` | Fine. Add `FAQPage`/`BreadcrumbList` on the new pages |
| `sitemap.xml` | 2 URLs, `lastmod` 24 September | Stale `lastmod` is ignored; generate it |
| `robots.txt` | None possible | A project site can't: robots lives at `betorzdev.github.io/robots.txt`. Submit the sitemap in Search Console instead |
| Domain | `betorzdev.github.io/hallownest-calculator/` | Works; a custom domain would be a brand and a portable asset (links survive leaving GitHub). Not urgent |
| Brand name | "Hallownest Calculator" | Nobody searches it; it doesn't say "save" or "112%". It's fine as a brand, but the **page titles have to carry the queries** |
| Speed | Static, no build, local fonts | Good by construction. 32 scripts: measure LCP on a phone once |

**The one thing that matters**: the site answers a dozen distinct searches and exposes one page
with no text. Everything in §5 follows from that.

## 3. What people search for

Grouped by intent, with the site's fit. Examples are real suggestions.

### A · My save: "what am I missing?" — **the best fit, the least contested**

`hollow knight save analyzer`, `save checker`, `save file analyzer`, `save completion analyzer`,
`save progress checker`, `save tracker`, `112 checker`, `112 analyzer`, `112 tracker`,
**`hollow knight 112 what am i missing`**, `how to know which grubs are missing`, `how to know
which mask shards are missing`, `stuck at 111`, `112 but no achievement`.
And its doorway: **`hollow knight save file location`** (+ `mac`, `linux`, `xbox`, `switch`),
`does hollow knight save on steam cloud`, `back up save`.
Spanish: `hollow knight 112 save checker`, `editor partida hollow knight`, `copiar partida`.

The only competitor is [ReznoRMichael's Save Completion
Analyzer](https://reznormichael.github.io/hollow-knight-completion-check/): v2.1.0, © 2020–2022,
English only, ~200 words, **no save locations**. We do more (live at every bench, the map with
what's missing, the Journal) and in two languages.

### B · 112% — **the biggest cluster**

`112 checklist` (+ `in order`, `español`, `excel`, `map`, `save file`), `112 requirements`,
`112 guide`, `112 list`, `112 missables`, `112 map`, `112 interactive map`, `112 godhome`,
`112 journal`, `112 vs 100`, `106 vs 112`, `112 que se necesita`, `112 requisitos`, `112 guia
español`, `112 lista`, `112 porciento`.

Contested: [hollowknightmap.org](https://www.hollowknightmap.org/112-checklist/) (400–500 words,
"How 112% works", a 5-question FAQ, links to `/charms/`, `/grubs/`, `/bosses/`),
[game-checklists](https://game-checklists.com/hollow-knight/112-checklist/),
[hollowknightchecklist.org](https://hollowknightchecklist.org/),
[hollowknightinteractivemap.com](https://hollowknightinteractivemap.com/), scripterswar. **All
English, all ticked by hand.** Our angle: *"a 112% checklist that ticks itself from your save"*,
and **the Spanish side is empty** (`checklist español`, `guia 112 español` → Vandal, Steam).

### C · Charms — **big, and very Spanish**

English: `charm calculator`, `charm builder`, `build maker`, `charm combos`, `synergies`, `tier
list`, `best charms for <boss>` (NKG, Radiance, Pantheon 5, Hornet 2, Zote), `best damage
build`, `best nail build`, `charm notches`, `charm locations`, `damage calculator`, `dps
calculator`, `hit calculator`.
Spanish: **one query per charm**, `hollow knight amuleto <name>` — «coraza de baldur», «bendición
de joni», «corazón del vacío», «fuerza frágil», «elegía de larvamosca», «escudo onírico»… often
misspelt or half-named («amuleto rosa», «amuleto blanco», «amuleto veneno»). The answers today
are 3DJuegos, Korosenai, Entregamers, a Steam guide: prose, **no numbers**.

Contested in English by the wikis and [The Knight's
Calculator](https://isaiahchin.github.io/the-knights-calculator/) (English, no hits-to-kill).
We already show up in Bing for "hollow knight charm calculator damage" through the GitHub repo.

### D · Bosses and combat

`boss health`, `damage values`, `damage table`, `bosses order`, `boss tier list`, `best build
for <boss>`, `pantheon 5 charms`, `hall of gods`. Mostly informational (AI Overviews will take
many), except the per-boss "how many hits" that nobody computes (`03-competition.md` §3).

### E · Map

`hollow knight map` / `interactive map` / `mapa` / `mapa completo`, the head term. Dominated
by Map Genie, IGN, hollowknightmap.org. Our map is the game's own, with **your** pins: rank it as
part of A/B ("112 map with what you're missing"), not against Map Genie.

### F · Hunter's Journal

`hunter's journal`, `112 hunter`, `hunter's mark`, `missing journal entries`: small, precise, and
our Journal screen is the only tracker of it.

### Out of scope

`silksong …` (a third of every sweep: a different game), lore, characters, endings, speedruns.

## 4. The competition in one line each

- **Wikis** (hollowknight.wiki, Fandom, Fextralife): own every informational head term. Don't fight.
- **hollowknightmap.org**: the template to copy for a landing page: H1 = the query, "How it
  works", FAQ, links to category pages.
- **ReznoRMichael's analyzer**: owns "save analyzer" by default, stale, English only.
- **Spanish**: 3DJuegos, Vandal, Korosenai, Steam guides: prose guides, no tools, no numbers.

## 5. The plan, by value and cost

**Status (27 September 2026)**: 1, 4 (title, static text; `og.jpg` already showed Your game) and
5 are done: `tools/pages.js` (`npm run pages`) writes the 14 pages, their About blocks and the
sitemap (without `lastmod`: a generated date would either lie or break the up-to-date test), and
`test/pages.test.js` guards them. The combat page went to `/boss-damage-calculator/` ·
`/es/calculadora-de-danio/`, and the Spanish slugs carry the game's names. 2, 3 and 6 are next;
submitting the sitemap in Search Console is a manual step.

1. **Real pages for each intent** (high value, medium cost). Generated like `es/index.html`: the
   same app with its own `<head>` (title, description, canonical, `hreflang`), **its own static
   text** in the body (an H1 with the query, 150–400 words that answer it, an FAQ) and the screen
   it opens on. `<base href="../">` keeps every path working, and over `file://` they're just
   more HTML files. One generator (`tools/pages.js`, `npm run pages`) and a test that fails if
   one falls behind, like `test/es-page.test.js`. In both languages:

   | Page | Opens | Title leads with |
   |---|---|---|
   | `/save-analyzer/` · `/es/analizador-partida/` | Saves → import | "Hollow Knight save analyzer: what's missing for 112%" |
   | `/112-checklist/` · `/es/checklist-112/` | Progress | "Hollow Knight 112% checklist, ticked from your save" |
   | `/charm-calculator/` · `/es/calculadora-amuletos/` | Charms | "Hollow Knight charm calculator: damage, hits, notches" |
   | `/map/` · `/es/mapa/` | Map | "Hollow Knight map with what you're missing" |
   | `/hunters-journal/` · `/es/diario-del-cazador/` | Journal | "Hunter's Journal tracker" |
   | `/godhome/` · `/es/sala-de-dioses/` (the game's name) | Godhome | "Pantheons and Hall of Gods" |
   | `/combat/` · `/es/combate/` | Combat | "Hollow Knight boss damage calculator: hits to kill" |

   The save-analyzer page carries **the save location on every platform** (the three paths are
   already in `js/app-saves.js`, plus Steam Cloud and what consoles can't do): it's the most
   searched doorway into the only thing we do that nobody else does live.

2. **Per-charm pages, Spanish first** (high value in ES, medium cost, generated from
   `js/data.js`): `/es/amuletos/<slug>/`, name as the game says it, cost, where it is, **every
   number it changes** (the engine already knows), synergies, and a link to try it. 45 pages
   with real numbers aren't thin content: they're the only quantified answer in Spanish.
   English after, `/charms/<slug>/`.
3. **Per-boss pages** (medium value, medium cost): health, hits per nail and with the usual
   charms, attack damage, from `js/enemies.js`. Only bosses (~49), not the 180 entries: the
   enemies are too thin to deserve a page.
4. **Fix the home** (low cost): title ≤ 60 with the query first ("Hollow Knight save tracker &
   112% checklist · Hallownest Calculator"), a few lines of static text under the nav (what
   the site is, links to the pages above), `og.jpg` from the Your game screen.
5. **A generated `sitemap.xml`** with every page and real `lastmod`, submitted in Search Console.
6. **Off-page** (high value, no code): answer real "what am I missing" / "stuck at 111%" threads
   on r/HollowKnight and the Steam forums with the tool when it fits; a Spanish Steam guide that
   links to it; GitHub topics on the repo (`hollow-knight`, `save-analyzer`, `112-percent`).
7. **Timing**: the physical re-release (PS5, Switch 2) arrives on **16 October 2026**, and the
   Switch 2 Edition is due this year: a wave of new and returning players. Pages 1 should be
   indexed before then (indexing takes days to weeks). Honest note for every page: **reading
   the save needs the PC/Mac/Linux file**; console players get the hand-marked checklist.

**Measure** with Search Console (queries, impressions, position per page) and GoatCounter
(which page they land on). Review a month after the pages go live.

## Sources

[Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) ·
[URL fragments and indexing](https://seojuice.com/glossary/seo/programmatic-seo/url-fragment-indexing/) ·
[AI Overviews and CTR, 2026](https://www.stackmatix.com/blog/google-ai-overviews-impact-seo-2026) ·
[hollowknightmap.org 112% checklist](https://www.hollowknightmap.org/112-checklist/) ·
[Save Completion Analyzer](https://reznormichael.github.io/hollow-knight-completion-check/) ·
[3DJuegos: amuletos](https://www.3djuegos.com/juegos/hollow-knight/guias-y-trucos/todos-amuletos-hollow-knight-como-conseguirlos) ·
[Korosenai: amuletos](https://www.korosenai.es/videojuegos-indie/hollow-knight/guia-localizacion-amuletos/) ·
[Screen Rant: physical editions, 16 October 2026](https://screenrant.com/hollow-knight-october-2026-return-silksong/) ·
[Nintendo Life: Switch 2 Edition](https://www.nintendolife.com/news/2025/12/hollow-knight-silksong-expansion-coming-2026-hollow-knight-switch-2-edition-also-announced)
