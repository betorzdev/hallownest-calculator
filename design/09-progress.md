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
- Phase 6, the map, goes in the second tab whichever is chosen.
