# Live save sync

**Status (25 September 2026):** step 0 passed on Windows and the Code section is built on the
branch `feat/live-save-sync` (`js/live.js`, `HK.saves.sync`, the import view's checkbox, the
slot's line, the paused/lost notice, `App.reloadGame()`). What's left is the check on Windows with
the game (Verification, last point).

## Research: the three ways

1. **Watch the save file** (chosen first). File System Access API: the page keeps a handle to
   `user1.dat` and re-reads it when `lastModified` changes. No install. The game writes the file on
   resting at a bench and on quitting, so it's "at each bench", not real time. Chrome and Edge on a
   computer only (no Firefox, Safari or mobile; Brave has it off). Chromium's blocklist
   (`chrome_file_system_access_permission_context.cc`) blocks `AppData\Roaming` and `AppData\Local`
   entirely, but not `AppData\LocalLow`, where the saves are: **to be checked on Windows**. A
   cross-origin iframe can't open the picker, so it doesn't work inside a claude.ai artifact; it does
   on GitHub Pages and over `file://` (a secure context in Chrome: checked).
2. **HKTracker**, an existing mod (in `hk-modding/modlinks`, source in
   `kingkiller39/HollowKnightRandomizerTracker2.8`): `ws://localhost:11420/playerData`. `"json"` →
   the whole `PlayerData` (Newtonsoft); then `{ "var", "value" }` on every `SetPlayerBool/Int` for
   `gotCharm_*`, `equippedCharm_*`, `has*`, `*Level`, `charmSlots`, `maxHealth`, `MPReserveMax`,
   `nailSmithUpgrades`, `royalCharmState`; `bool|x` / `int|x` queries; `SaveLoaded` when resting on
   a bench. It doesn't push Journal kills or statues. Chrome asks for Local Network Access permission.
3. **Our own mod** (chosen second). Modding API (`hk-modding/api`), C#, `net472`, built against
   the game's `Managed/*.dll`. The hooks cover everything: `SetPlayerBoolHook`, `SetPlayerIntHook`,
   `SetPlayerVariableHook` (statues, pantheon doors), `RecordKillForJournalHook`, `CharmUpdateHook`,
   `TakeHealthHook`, `AfterTakeDamageHook`, `SoulGainHook`, `SceneChanged`. Plan: 200–400 lines, a
   local WebSocket or SSE server on its own port (not 11420), queue from Unity's main thread,
   accept only the site's origins, published through modlinks. The game is on the user's Windows
   PC; development and tests happen there. Memory reading (LiveSplit style) was ruled out.

## Plan for way 1

## Step 0 — probe on Windows (before building anything)
A throwaway `debug-live.html` (same family as the other `debug-*.html`): pick a file with
`showOpenFilePicker`, store the handle in IndexedDB, poll `getFile().lastModified` every 2 s, log.
Checked on the user's Windows PC with the game:
1. Chrome/Edge lets you pick `user1.dat` inside `%USERPROFILE%\AppData\LocalLow\Team Cherry\Hollow Knight`
   (Chromium blocks Roaming and Local, not LocalLow — unverified).
2. `lastModified` changes when resting on a bench / quitting; a read mid-write fails cleanly.
3. The handle survives a reload over `file://` and over GitHub Pages; what `queryPermission` says after
   a reload (prompt vs granted with "Allow on every visit").
If (1) fails, stop and rethink.

**Result (Windows, Chrome 154, over `file://`, 25 Sep 2026):**
1. The picker took `user4.dat` from the saves folder: `file://` is a secure context there too,
   and `showOpenFilePicker`, `getAsFileSystemHandle` and IndexedDB are all present.
2. The file changed twice while playing (18:50 → 20:03:22 → 20:03:49), each a new `lastModified`
   and read cleanly in ~30 ms (182 KB); the second carried new charms worn and `atBench false`
   (the game had also saved outside a rest: quitting, most likely). No read failed, so a read
   mid-write wasn't caught; the parser's refusal is what covers it (retried on the next tick).
3. After a reload the handle was still in IndexedDB, with permission **`prompt`**; a click on
   *Resume* → `requestPermission` → the browser's own permission prompt → `granted`, and the
   watch went on. So the paused state (a click per visit) is the normal one, as designed.
Not checked: GitHub Pages and Edge (same Chromium code), and whether Chrome's prompt offers
"Allow on every visit" (persistent permission), which would skip the paused state.

## Design

**Where it appears.** Inside the existing import view. When `canLive()` is true:
- "Choose file" calls `showOpenFilePicker({ types: .dat/.json })` instead of the hidden `<input>`;
  drag and drop takes the handle with `DataTransferItem.getAsFileSystemHandle()`.
- The "ready" preview gets a checkbox **«Mantener sincronizada con el juego» / "Keep in sync with
  the game"**, checked by default, with one line: it updates each time you rest on a bench, from this
  browser. Without a handle (no API, or the fallback input) the checkbox isn't there.
`canLive()` = `'showOpenFilePicker' in window` && not in a cross-origin iframe (`try { window.top.location.href }`)
&& `isDesktop()` (already in `js/app-saves.js:140`).

**What a linked slot does.**
- Only the **active** slot watches (poll every 2 s, also while hidden since 26 September 2026:
  playing full screen hides the tab, and the site should be up to date when you look; the
  browser spaces a hidden tab's timers out itself; one immediate check on `visibilitychange`/`focus`). An inactive linked slot is refreshed on entering it.
- On change: `F.read` → `F.toSnapshot` → written into the slot **keeping `hollow.run` and
  `hollow.baseline`** (not in a real save; today `S.importTo` → `restore()` would wipe them). A
  half-done pantheon keeps its charms, as boot already does (`charmLock`).
- The page reloads its state in place (no page reload): `loadMarks/loadDoor/loadJournal/loadOwned`,
  `App.state = withFixed(decoded build)`, `persist()`, `recompute()`, `render()`; a toast says what
  arrived («Tu partida se ha actualizado: 2 amuletos nuevos…» — at minimum «actualizada»).
- Edits made on the site stay until the game saves again; then the game wins (the site mirrors the
  real playthrough). *Decided by the user: game wins; checkbox checked by default.*
- A read that fails (file mid-write, not a save) is ignored and retried on the next tick.

**States the user can see** (slot card on Saves + the existing banner, `renderBanner()`):
- *En vivo*: a small tag on the slot card, like «Estás aquí».
- *En pausa* (permission needs a click after a reload, or the tab lost it): banner «Tu partida está en
  pausa · Reanudar»; the button calls `requestPermission` (needs a user gesture).
  An import that links the file enters its game in place (`enterHere()` in `js/app-saves.js`), not
  with the usual reload: the picker's grant only lasts as long as the page, so a reload would open
  the new game already paused.
- *Sin archivo* (moved/deleted/unreadable): the slot keeps its data; the card says it's no longer
  synced, with «Volver a vincular» (opens the import view for that slot).
- Unlink: a text button on the card. Clearing the slot or importing another file also unlinks.

## Code
- **`js/live.js`** (new classic script, no DOM rendering, no language): the handle store (IndexedDB
  `hollow-live`, keyed by slot — handles can't go in localStorage), `canLive()`, and a generic
  watcher `watch({ read, onData, onState })` with `state: 'live' | 'paused' | 'lost'`. The file
  source is the first `read`; the mod's WebSocket will be a second one with the same shape.
  Loaded before `js/app-saves.js` → **twenty-two scripts**: update `index.html`, `CLAUDE.md`,
  `docs/guide.md`, `README.md` if it counts them, and `npm run es`.
- **`js/saves.js`**: `importTo(store, n, snap, { keep })` (or a `syncTo`) that leaves `hollow.run` and
  `hollow.baseline` alone. Tests in `test/saves.test.js`.
- **`js/app-saves.js`**: picker via handle, checkbox in `dropInner()` ready state, `importDo` stores the
  handle when checked, card tag/buttons, `App.liveBanner()` for `renderBanner()`.
- **`js/app.js`**: a `reloadGame()` that re-runs the loaders and repaints (reusing the boot sequence
  of `js/app-boot.js`), called by the watcher.
- **`js/i18n.js`**: new `{ es, en }` strings (site's own words, no game names needed).
- **`css/app.css`**: tag and paused states with existing tokens only (`css/tokens.css`).
- **`docs/guide.md`**: a section on keeping a slot in sync.
- IndexedDB and every storage access wrapped in `try/catch`; with IDB missing, `canLive()` is false.

## Verification
- `npm test` (saves keep-keys, i18n); `npm run es`; `npm run text -- --audit` not needed (no game names).
- `debug-smoke.html` still passes. Headless Chrome DOES expose `showOpenFilePicker` (checked), so the option shows there; the smoke must not depend on it being absent.
- On Windows with the game: link slot 1 from Edge/Chrome, rest on a bench after changing charms →
  the Charms screen updates within ~2 s with a toast; reload → paused banner → Reanudar; Firefox shows
  the plain import only.
