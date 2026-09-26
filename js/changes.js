/* js/changes.js — what your game gained between two saves: the "Since last time" block of the
   Your game screen and the notice when the game saves while the site follows its file
   (design/10-restructure.md). Pure: no DOM and no language; the interface names each thing.

   A game is what a slot keeps, decoded (fromSnap: the keys as js/saves.js copies them):
     { build, owned, book, hall, progress }
   diff(before, after) → the list of what's new, only gains, in the order they're told:
     { kind: 'journal', id, done }     a Hunter's Journal entry encountered (done: completed with it)
                                       or, already there, completed now (done: true, was: true)
     { kind: 'charm', id }             a charm found (the version you have: Kingsoul, Void Heart…)
     { kind: 'item', id }              something of hollow.progress's ids: equipment, a Dreamer…
     { kind: 'upgrade', id, to }       masks, vessels, notches, nail (to: the new value)
     { kind: 'spell', id, to }         a spell learnt or upgraded (to: 1 or 2)
     { kind: 'art', id }               a Nail Art learnt
     { kind: 'cloak', to }             Mothwing Cloak (1) or Shade Cloak (2)
     { kind: 'dream' }                 the Dream Nail
     { kind: 'found', id }             a collectible (js/collectibles.js): a grub, a shard, a root…
     { kind: 'statue', id, diff }      a Hall of Gods symbol won (at, asra, radiant)
     { kind: 'pct', from, to }         the completion went up (js/completion.js)
   Losses (a charm given to the Divine, geo spent) aren't told: the block is about what you got. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const C = HK.codec || require('./codec.js');
  const HJ = HK.hunter || require('./hunter.js');
  const HG = HK.hall || require('./hall.js');
  const P = HK.progress || require('./progress.js');
  const CP = HK.completion || require('./completion.js');

  const json = (s, d) => { if (typeof s !== 'string') return d; try { return JSON.parse(s); } catch (e) { return d; } };

  /* A slot's snapshot (key → the string stored) → a game. A missing key is an empty one. */
  function fromSnap(snap) {
    const s = snap && typeof snap === 'object' ? snap : {};
    const owned = json(s['hollow.owned'], []);
    return {
      build: typeof s['hollow.build'] === 'string' ? C.decode(s['hollow.build']) : C.normalize(C.PRESETS.base),
      owned: Array.isArray(owned) ? owned.filter((x) => typeof x === 'string') : [],
      book: HJ.normalize(json(s['hollow.journal'], {})),
      hall: HG.normalizeMarks(json(s['hollow.hall'], {})),
      progress: P.normalize(json(s['hollow.progress'], {})),
    };
  }

  const pct = (g) => CP.count({ build: g.build, owned: g.owned, book: g.book, progress: g.progress }).total;

  function diff(a, b) {
    const out = [];
    if (!a || !b) return out;
    // The Journal, in its own order: a new entry, or one already there that's now completed.
    for (const r of HJ.BOOK) {
      const k = HJ.kindOf(r.id);
      if (k === 'start' || k === 'idol') continue;
      const was = HJ.stateOf(a.book, r.id), now = HJ.stateOf(b.book, r.id);
      if (now.seen && !was.seen) out.push({ kind: 'journal', id: r.id, done: now.done });
      else if (now.done && !was.done) out.push({ kind: 'journal', id: r.id, done: true, was: true });
    }
    for (const id of b.owned) if (!a.owned.includes(id)) out.push({ kind: 'charm', id });
    for (const id of b.progress.ids) if (!a.progress.ids.includes(id)) out.push({ kind: 'item', id });
    for (const k of ['masks', 'vessels', 'notches', 'nail']) if (b.build[k] > a.build[k]) out.push({ kind: 'upgrade', id: k, to: b.build[k] });
    for (const k of Object.keys(b.build.spells)) if (b.build.spells[k] > a.build.spells[k]) out.push({ kind: 'spell', id: k, to: b.build.spells[k] });
    for (const k of Object.keys(b.build.arts)) if (b.build.arts[k] && !a.build.arts[k]) out.push({ kind: 'art', id: k });
    if (b.build.cloak > a.build.cloak) out.push({ kind: 'cloak', to: b.build.cloak });
    if (b.build.dream && !a.build.dream) out.push({ kind: 'dream' });
    for (const id of b.progress.found) if (!a.progress.found.includes(id)) out.push({ kind: 'found', id });
    for (const [id, list] of Object.entries(b.hall)) {
      for (const d of list) if (!(a.hall[id] || []).includes(d)) out.push({ kind: 'statue', id, diff: d });
    }
    const from = pct(a), to = pct(b);
    if (to > from) out.push({ kind: 'pct', from, to });
    return out;
  }

  HK.changes = { fromSnap, diff, pct };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.changes;
})();
