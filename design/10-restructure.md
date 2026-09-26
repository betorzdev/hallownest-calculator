# Restructuring the site around your real game

**Status (26 September 2026):** built. The variants are in
[`10-home-variants.html`](10-home-variants.html): **C · the bench** was chosen, and on a phone the
tools fold into one tab. While building, the Hall of Gods and the Pantheons went together as
**Godhome** (one place in the game) and Combat became the arena alone. Left: the check on Windows
with the game running (a bench sat at → the notice with the changes and *Since last time*).

## Why

The site was born as a calculator: Charms is the start screen and the title, the description,
the README and the og:image all sell "how every stat changes with every charm". Since 25–26
September it has something no other Hollow Knight site has: **your real game inside** (the save
file imported, the 112% equal to the game's in 51/51 saves, every collectible, the game's own
map, your shade and your bench) and **following it live** (`js/live.js`: every time the game
saves at a bench, the site catches up by itself). That's now the best of the site, and it's
hidden:

- You come in through Charms; Progress is the **fifth tab** and the map a tab inside it.
- "Live" only shows as a line under the save button in the header and a generic toast ("Your
  save caught up with the game"): it never says **what** changed.
- The bar mixes the record (Journal, Progress, and the Hall of Gods, which lives inside Combat)
  with the tools (Charms, Combat), and the mini-HUD of build figures shows on progress screens too.
- With no game, the only invitation is a strip above every screen ("Your real game… Import").
- The time played and the time of the last save are read from the file (`savefile.js`, `meta`)
  and thrown away.

## Decisions (26 September 2026)

1. **A new start screen, "Your game"** (`view=home`, «Partida»): the state of the link, the last
   bench and when, the completion, the time, the geo, **what you got since the last save**, your
   shade and **what's missing near your bench**. Under it, **"Your Knight"**: today's Inventory
   screen (nail, body, arts, spells, equipment, items), which stops being a screen of its own.
2. **No game (first visit, free mode, a phone) → an invitation**: "Connect your game" in three
   steps, with the save folder's path, and the two other ways in: keep it by hand, or just try
   builds (Charms).
3. **The bar in two groups**: *Your game · Progress · Map · Journal · Godhome* | *Charms · Combat*.
   The record on the left, the tools on the right after a thin rule. The Map leaves Progress;
   **Godhome** takes the Hall of Gods and the Pantheons out of Combat, as its two tabs (one place
   in the game, Albert's call on 26 September), with their fights inside; Combat is the arena
   alone. The mini-HUD only shows with the tools, and in Godhome while you fight.
4. **Same name** (Hallownest Calculator: the address and the search ranking stay), but the
   title, the description, the og:image and the README sell the live tracker first and the
   calculator second.

Old links keep working: `view=game` → `home` (at "Your Knight"), `view=progress` with the map
tab → `map`, Combat's Hall and Pantheons tabs → `godhome`. A link with a build and no `view=` still opens Charms.

## The three variants of "Your game"

The same content in all three; what changes is what leads.

- **A · The profile.** The game's save slot, grown: the Knight, the save's name, the live dot,
  "Last bench: City of Tears · 12 min ago" and the completion on the right. A row of figures
  (time, geo, masks, vessels, charms) and two columns: *Since last time* as a list, and your shade
  and what's missing nearby. The closest to the Saves screen; the calmest.
- **B · The chronicle.** The status in a narrow sticky column (the save, the dot, the figures, the
  shade) and, as the page's body, **every bench of the session**, newest first: the time, the area
  in its tint and what each one brought (as chips with their pictures, and the points of %). The
  one that most feels like following the game live; it needs a short history of saves, not just
  the previous one (`hollow.log`, the last N diffs, instead of `hollow.prev`).
- **C · The bench.** The game's **area title card**: "Resting at" over the area's name, large, on
  the area's own light (`--area-*-mid/deep`), the Knight under it and the four figures; then three
  columns: *Since last time*, your shade, missing nearby. The most "game"; it changes colour with
  every area you rest in.

The states the bar at the bottom of the page walks through: **live**, **paused** (the Resume
button moves here, and stops being a strip above every screen), **kept by hand** (imported once,
marked here since: "Follow the game's file" as its action), **no game** and **a phone with no
game** (it can't follow a file: it offers importing once or keeping it by hand).

## New data (per save)

- `hollow.meta`: `{ time, completion, geo, saved }`. `savefile.js` already works out `meta`;
  `saved` is the file's `lastModified`, from `js/live.js`'s stamp.
- `hollow.prev` (A, C) or `hollow.log` (B): what the save held before the last sync, written by
  `HK.saves.sync` just before it replaces the keys, only when something changed.
- Both join `KEYS` in `js/saves.js`, or they leak between saves.
- **`js/changes.js`**, pure (no DOM, no language), with tests: `diff(prev, next)` → a list of
  `{ kind, id, from, to }` (Journal, charm, equipment, upgrade, collectible, statue, %). The
  "since last time" block and the live toast ("City of Tears bench: Dung Defender, +1 grub, +2%")
  both use it.

## Open

- ~~The bar on a phone~~ (decided 26 September): seven tabs don't fit in 390 px, so on a phone
  Charms and Combat fold into one tab, *Tools*: Your game · Progress · Map · Journal · Godhome
  («Dioses» on a Spanish phone) · Tools.
- "Missing nearby" takes the bench's area; the room the Knight is in isn't in the save
  (`respawnScene` is the bench), so "nearby" is "in the area where you rest".

## Phases

1. This design and its variants (the choice).
2. The bar and the screens: `VIEWS`, the two groups, `view=godhome` and `view=map`, the mini-HUD
   only with the tools, the old links.
3. The data: `hollow.meta`, `hollow.prev`/`hollow.log`, `js/changes.js`.
4. The "Your game" screen (`js/app-home.js`), the live toast with the changes, the dot on its tab,
   the strips moved into it.
5. The public face: title, description, og:image, README, guide, screenshots, `npm run es`.
