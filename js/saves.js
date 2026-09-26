/* js/saves.js — the save slots: four, like the game's profile screen, and free mode.
   Pure over a Storage-like object (getItem, setItem, removeItem): no DOM and no language.
   A slot is everything that describes one game —the build, the charms found, the Hunter's
   Journal, the Hall's marks, the lifeblood door, the rest of the 112% (js/completion.js), a
   half-done pantheon and the pinned build—;
   the preferences (language, screen, enemy) belong to whoever plays, not to the game, and
   aren't in it.
   Free mode (slot 0, FREE) is what shows while no save has been selected: the everything-unlocked
   sheet, to try builds, which is nobody's game. It's where the site starts, and it's where the
   data from before slots existed stays. It can be entered and left like a save, but not cleared.
   The live keys (the ones every screen already reads and writes) always hold the ACTIVE slot,
   so nothing else has to know that slots exist. The inactive ones wait in SAVES_KEY as copies
   of those keys, raw strings copied as they were:
     { active: 2, slots: { "0": { "hollow.build": "v=1&nail=4…" }, "3": { "hollow.owned": "[…]" } } } */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const C = HK.codec || require('./codec.js');

  const COUNT = 4;
  const FREE = 0;
  const SAVES_KEY = 'hollow.saves';
  const KEYS = Object.freeze(['hollow.build', 'hollow.owned', 'hollow.journal', 'hollow.hall',
    'hollow.bindings', 'hollow.progress', 'hollow.run', 'hollow.baseline']);
  const SLOT_IDS = Array.from({ length: COUNT }, (_, i) => i + 1);
  const ALL_IDS = [FREE, ...SLOT_IDS];

  const get = (store, k) => { try { return store.getItem(k); } catch (e) { return null; } };
  const put = (store, k, v) => { try { if (v == null) store.removeItem(k); else store.setItem(k, v); } catch (e) { /* no storage */ } };

  // Any value → a snapshot: only the slot's keys, only strings.
  function cleanSnap(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const k of KEYS) if (typeof raw[k] === 'string') out[k] = raw[k];
    return out;
  }

  // What's saved, valid: the active slot between 0 (free mode) and 4, and no copy of the active one.
  function read(store) {
    let raw = null;
    try { raw = JSON.parse(get(store, SAVES_KEY) || 'null'); } catch (e) { raw = null; }
    const active = raw && ALL_IDS.includes(raw.active) ? raw.active : FREE;
    const slots = {};
    const from = raw && raw.slots && typeof raw.slots === 'object' ? raw.slots : {};
    for (const n of ALL_IDS) if (n !== active && from[n]) slots[n] = cleanSnap(from[n]);
    return { active, slots };
  }
  const write = (store, saves) => put(store, SAVES_KEY,
    saves.active === FREE && !Object.keys(saves.slots).length ? null : JSON.stringify(saves));

  // The live keys, as a snapshot.
  function snapshot(store) {
    const out = {};
    for (const k of KEYS) { const v = get(store, k); if (v != null) out[k] = v; }
    return out;
  }
  // The live keys take the snapshot's values; those it doesn't carry are removed.
  function restore(store, snap) {
    for (const k of KEYS) put(store, k, Object.prototype.hasOwnProperty.call(snap, k) ? snap[k] : null);
  }

  /* A new game, as in the game: the base Knight (no Dream Nail, no cloak), no charms found and
     the rest empty. The charms go in as an empty list: with nothing saved the site takes them
     all as found (App.loadOwned). */
  const fresh = () => ({ 'hollow.build': C.encode(C.PRESETS.base), 'hollow.owned': '[]' });

  /* Free mode and the four slots, each with its snapshot (the active one read from the live
     keys), or null if it's empty. Free mode is never empty: with no copy, it's the defaults. */
  function list(store) {
    const saves = read(store);
    return ALL_IDS.map((n) => ({ n, active: n === saves.active,
      snap: n === saves.active ? snapshot(store) : saves.slots[n] || (n === FREE ? {} : null) }));
  }

  /* Changes the active slot. The one you leave is copied out, the one you enter is copied in;
     an empty one is entered as a new game, and free mode with nothing saved, with the defaults
     (everything unlocked). Returns whether anything changed. */
  function select(store, n) {
    const saves = read(store);
    if (!ALL_IDS.includes(n) || n === saves.active) return false;
    const next = saves.slots[n] || (n === FREE ? {} : fresh());
    saves.slots[saves.active] = snapshot(store);
    delete saves.slots[n];
    saves.active = n;
    restore(store, next);
    write(store, saves);
    return true;
  }

  /* Clear Save, as in the game: the slot is left empty. The active one can't be empty, because
     it's the one the site is showing, so clearing it leaves you in free mode (with what free mode
     had). Free mode isn't a game: it's not cleared (Your game's two starting points already
     reset it). */
  function clear(store, n) {
    const saves = read(store);
    if (!SLOT_IDS.includes(n)) return false;
    if (n === saves.active) {
      restore(store, saves.slots[FREE] || {});
      delete saves.slots[FREE];
      saves.active = FREE;
    } else {
      if (!saves.slots[n]) return false;
      delete saves.slots[n];
    }
    write(store, saves);
    return true;
  }

  /* A game imported from the real one (js/savefile.js) goes into a slot, replacing whatever it
     held: into the live keys if it's the active one, into its copy if not. Not into free mode,
     which is nobody's game. */
  function importTo(store, n, snap) {
    if (!SLOT_IDS.includes(n)) return false;
    const saves = read(store);
    if (n === saves.active) restore(store, cleanSnap(snap));
    else { saves.slots[n] = cleanSnap(snap); write(store, saves); }
    return true;
  }

  /* The same game, read again because the real one saved (js/live.js): it replaces what the slot
     holds but the site's own keys, which a real save doesn't carry (a half-done pantheon and the
     pinned build). Returns whether anything changed. */
  const SITE_ONLY = Object.freeze(['hollow.run', 'hollow.baseline']);
  function sync(store, n, snap) {
    if (!SLOT_IDS.includes(n)) return false;
    const saves = read(store);
    const was = n === saves.active ? snapshot(store) : saves.slots[n] || {};
    const next = cleanSnap(snap);
    for (const k of SITE_ONLY) { if (was[k] != null) next[k] = was[k]; else delete next[k]; }
    if (KEYS.every((k) => (was[k] == null ? null : was[k]) === (next[k] == null ? null : next[k]))) return false;
    if (n === saves.active) restore(store, next);
    else { saves.slots[n] = next; write(store, saves); }
    return true;
  }

  HK.saves = { COUNT, FREE, SAVES_KEY, KEYS, SITE_ONLY, SLOT_IDS, ALL_IDS, read, snapshot, fresh, list, select, clear, importTo, sync };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.saves;
})();
