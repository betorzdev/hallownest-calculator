# The Progress screen

A new screen (`view=progress`) for **what the game counts as your completion**, the 112%, and
later **everything you're missing, with where it is**, on a list and on a map. It's the product
the plan of 25 September 2026 was building towards: the save file already says almost all of it
(phases 1 and 2), and no other Hollow Knight site fills its checklist from your real game.

The mockup: [`09-progress-variants.html`](09-progress-variants.html) (open it with a double
click). It uses the site's real CSS, data and rules (`js/completion.js`), over **your own game**
(it shares `localStorage` with `index.html`) or **a sample game half done**; `?v=a|b|c`,
`&game=mine|sample`, `&lang=es|en`, `&w=390`. Tapping an item marks it there only.

## What's on it, whatever the variant

- **The figure the game shows**: *Completion* (`COMPLETION`, «Finalización»), large and in bone,
  over 112. It's the number the game's map shows with World Sense, and the site's count was
  checked against the game's own in 51 real saves (`tools/check-pack.js`): all 51 match.
- **The wiki's fifteen categories**, in its order, each with its points: bosses 14, warrior
  dreams 7, Colosseum 3, charms 36, equipment 14, spells 6, nail arts 3, mask shards 4, vessel
  fragments 3, nail upgrades 4, Dream Nail and essence 3, Dreamers 3, the Grimm Troupe 6,
  Lifeblood 1, Godmaster 5.
- **Each thing as a plate**, the same as Your game's: its artwork (the Hunter's Journal's
  portrait for a boss, the charm, the item), a silhouette until you have it, and a tap marks
  it by hand. What it marks is where the site already keeps it: a boss is its Journal entry, a
  charm is your collection, the equipment and the Dreamers are `hollow.progress`. So marking the
  Soul Master here marks it in the Journal too, and the other way round.
- **Two tabs**, *List · Map*. The map is phase 6; until then the tab isn't there.
- **The accent only on what's touched** (§3 of `00-system.md`): the points and the bars are data,
  in bone; a full category turns to `--good`.

## The three variants

**A · The Journal.** The fifteen categories are the list, each with its points and a thin
bar; the one chosen is the page beside it, with its plates. It's the Hunter's Journal's own
pattern (list and page), already known on the site, and on a phone the page replaces the list,
as the Journal does. It shows one category at a time: calm, but you don't see everything at once.

**B · The Inventory.** Every category open, one after another in two columns, the long ones
(bosses, charms) on the left, like Your game. Under the figure, a strip of fifteen segments,
each as wide as its points, fills as you go. Everything is in view with one scroll; it's the
longest page on the site (some 130 plates).

**C · The tablet.** One row per category, like the Hall of Gods' tablet: its name, its things as
small pips (lit, half-lit for a spell half learnt, dark) and its points. A row opens to show
its plates. The densest overview: the whole 112% fits in one screen, and you open only what
you want to look at.

**C · The tablet was chosen on 26 September 2026**: the whole 112% in one screen, and it's the
one that grows best when the collectibles come (a row more per kind, not a page more).

## What comes after the choice

- Phase 4 built the tablet in `js/app-progress.js` with `js/completion.js` behind it (26 September 2026). What changes your figures is marked on Your game, not here; the Map tab comes with phase 6.
- Phase 5 added the collectibles (26 September 2026): 202, from `js/collectibles.js`, as more
  rows of the tablet under their own title, each thing with its area and place (the game's
  titles) or who sells or gives it; a filter by area with the areas' light; and the Grubfather's
  and the Seer's ladders as two rows. The written hints were left out: the map (phase 6) gives
  the exact spot.
- Phase 6 built the Map (26 September 2026), in the second tab: the game's own map read from its
  files (`tools/extract-map.py`), rooms whole where you've been, rough where you only bought the
  area's map, barely there the rest; the missing collectibles on it, a card per pin to mark it,
  your shade and your Dreamgate. Drag, wheel, pinch, and three zoom buttons.

## Phase 7 (26 September 2026, done)

From the plan of 25 September 2026 (what the save file offers, item by item), the last part:

- **Shops**: on Progress, what's left to buy from Sly, Salubra, Iselda and Leg Eater, with its
  price (the save says what's been bought: `slyShellFrag<n>`, `salubraNotch<n>`…), to plan the geo.
- **Characters and quests**: a chosen fifteen or so with their state (Bretta, Sly, Zote, Cloth,
  Tiso, Quirrel, the Nailsmith, Myla, the Delicate Flower…), not the hundreds of dialogue flags.
- **Locked statues in the Hall of Gods**: the ones you don't have yet shown locked, as in the
  game (`statueState<X>.isUnlocked` / `hasBeenSeen`).
- **Broken fragile charms**: the Charms detail says "Broken" or "With the Divine"
  (`brokenCharm_23…25`, `gaveFragile*`). The wiki says a broken one "can not be equipped": it's
  kept as yours but not wearable, and still counts for the 112% (the game keeps gotCharm).

All four are built: the shops and the characters as two more sections of the tablet, the locked
statues in the Hall's grid and plaque, the broken fragile charms in Charms' grid and detail.

Left out on purpose: written hints for each collectible (the Map gives the exact spot), the
rooms' raw state (`sceneData` is only used to detect things), the endings seen (the save doesn't
keep them clearly).

**26 September 2026, after phase 7**: the tablet's first tab holds the 112% and nothing else. The
collectibles, the characters and the shops, which had gone under it, each have their own tab:
*112% · Collectibles · Characters · Shops · Map*.

**Then, the same day: only the 112% and the Map.** The collectibles' tab repeated the Map, the
reward ladders repeated things already counted elsewhere, and the characters and the shops
added little to what the site is for; they were removed, with their data (`QUESTS`, `SHOPS`,
the progress flags). The Map's kind filter carries each kind's count instead («23/46»).

**26 September 2026, the Map's layers.** Everything the map can show is a layer the user shows
or hides, in a filter moved under the map with *Show all* and *Hide all*: the collectibles; the
112%'s things where they're found (charms, equipment, spells and arts, bosses and trials, the
warriors' graves, the Dreamers); the places (the game's titles, benches, shops and characters,
trams, hot springs, cocoons); and yours (your bench, shade, Dreamgate and the markers placed in
the game). *Always show the whole map* is a preference, not the save's, so a bench never
undoes it.
