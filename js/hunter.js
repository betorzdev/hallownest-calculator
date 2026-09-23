/* js/hunter.js — your game's Hunter's Journal: its rules.
   The book of 168 entries (BOOK and EXTRAS from js/journal.js, which come from the wiki's
   table and the game's text) and what you have of each one in your real game. Pure: no DOM
   and no language, like js/hall.js. The simulator never touches it: it's marked by hand.

   What's saved is the same thing the game saves (PlayerData: `killed<X>` and `kills<X>`,
   the defeats you have left, which count down to zero): { id: left }.
     no id       you haven't encountered it
     n > 0       encountered: "Defeat n more to decipher the Hunter's notes"
     0           complete: the Hunter's notes can now be read

   Five of the game's rules that come from the wiki ("Hunter's Journal (Hollow Knight)", "The
   Hunter", "Hunter's Mark") and can't be deduced from looking at the list:
     · The entry is added with the first defeat, so encountered leaves K−1 at most.
       The 45 that need a single one are yes or no. The three from the White Fragment
       (Wingmould, Royal Retainer, Kingsmould) open without defeating anyone and leave the full K.
     · Crawlid and the Shade come complete with the Journal. The ones you get by inspecting
       something (Goam, Charged Lumafly, Garpede, Void Tendrils) are also yes or no.
     · The total the game shows isn't fixed: it starts at the 146 the Hunter's Mark requires
       and goes up by one with each optional entry you encounter, up to 164. The 4 that aren't
       creatures at all (the Hunter's Mark, the Seal of Binding, the Void Idol and the
       Weathered Mask) don't count.
     · The Void Idol isn't marked: it comes from beating all 44 in the Hall of Gods, and
       its description changes with its level. It follows the Hall's marks (HG.idolTier).
     · The Hunter's Mark requires completing the 146. For Flukemunga one defeat is enough
       (the wiki's table says so; it hasn't been checked in the game's code). Removing one
       of the 146 removes the Mark, just as removing Ascended removes Radiant in the Hall. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const J = HK.journal || require('./journal.js');
  const HG = HK.hall || require('./hall.js');

  const BOOK = J.BOOK;
  const ROW = Object.fromEntries(BOOK.map((r) => [r.id, r]));
  const EXTRAS = J.EXTRAS;
  const MARK = 'hunters-mark';
  const IDOL = 'void-idol';
  const REQUIRED = BOOK.filter((r) => !r.optional).length;    // 146
  const COUNTED = BOOK.filter((r) => !r.uncounted).length;    // 164
  const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

  /* How many defeats an entry you already have can be missing. */
  function maxLeft(id) {
    const r = ROW[id];
    if (!r || r.kills == null) return 0;
    return r.auto ? r.kills : Math.max(0, r.kills - 1);
  }

  /* Which control it carries: 'start' comes complete, 'idol' follows the Hall, 'mark' is the
     Hunter's Mark, 'count' keeps the defeat count and 'flag' is yes or no. */
  function kindOf(id) {
    if (!ROW[id]) return null;
    if (ROW[id].start) return 'start';
    if (id === IDOL) return 'idol';
    if (id === MARK) return 'mark';
    return maxLeft(id) >= 1 ? 'count' : 'flag';
  }

  /* What's saved, cleaned: ids that don't exist, values that aren't numbers (a null would count
     as complete), out of range or with decimals, the ones that aren't marked, and a Mark without
     its 146. It doesn't touch what it receives. */
  function normalize(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const r of BOOK) {
      if (!own(raw, r.id)) continue;
      const k = kindOf(r.id), v = raw[r.id];
      if (k === 'start' || k === 'idol' || typeof v !== 'number' || !Number.isFinite(v)) continue;
      out[r.id] = Math.min(maxLeft(r.id), Math.max(0, Math.floor(v)));
    }
    if (own(out, MARK) && !markReady(out)) delete out[MARK];
    return out;
  }

  /* What you have of an entry: encountered, how many left, complete. The Idol looks at the
     Hall's marks and says its level. */
  function stateOf(book, id, hallMarks) {
    const k = kindOf(id);
    if (k === 'start') return { seen: true, left: 0, done: true };
    if (k === 'idol') {
      const tier = HG.idolTier(hallMarks || {});
      return { seen: !!tier, left: 0, done: !!tier, tier };
    }
    const seen = own(book, id) && typeof book[id] === 'number';
    return { seen, left: seen ? book[id] : null, done: seen && book[id] === 0 };
  }

  /* One of the 146, ready for the Mark: complete, or seen if one is enough for it. */
  const readyFor = (book, r) => {
    const s = stateOf(book, r.id);
    return r.once ? s.seen : s.done;
  };
  const markLeft = (book) => BOOK.filter((r) => !r.optional && !readyFor(book, r)).length;
  const markReady = (book) => markLeft(book) === 0;

  /* The Journal's counts. `encountered` and `completed` are the game's two counts
     (with World Sense) over `total`, which starts at 146 and grows with the optional entries
     you encounter, up to `max` (164). `reqSeen` is Keen Hunter (encountering the 146);
     `reqDone`, how far along the Mark you are (with the Flukemunga rule). */
  function counts(book) {
    let encountered = 0, completed = 0, optSeen = 0, reqSeen = 0;
    for (const r of BOOK) {
      if (r.uncounted) continue;
      const s = stateOf(book, r.id);
      if (s.seen) { encountered++; if (r.optional) optSeen++; else reqSeen++; }
      if (s.done) completed++;
    }
    return { encountered, completed, total: REQUIRED + optSeen, max: COUNTED, reqSeen, reqDone: REQUIRED - markLeft(book), required: REQUIRED };
  }

  /* Marking by hand: they return a new book, without touching the one they receive. `left` null
     removes the entry. After any change, if the Mark has been left without its 146, it goes. */
  function set(book, id, left) {
    const b = normalize(book);
    const k = kindOf(id);
    if (!k || k === 'start' || k === 'idol') return b;
    if (left === null || left === undefined) delete b[id];
    else {
      const n = Number(left);
      if (!Number.isFinite(n) || (k === 'mark' && !markReady(b))) return b;
      b[id] = Math.min(maxLeft(id), Math.max(0, Math.floor(n)));
    }
    if (own(b, MARK) && !markReady(b)) delete b[MARK];
    return b;
  }
  /* One more defeat (−1) or one fewer (+1). Only on the ones you already have. */
  function step(book, id, d) {
    const s = stateOf(book, id);
    return (s.seen && !s.done) || (s.done && d > 0) ? set(book, id, s.left + d) : normalize(book);
  }
  /* "Encountered": the first defeat (the yes-or-no ones end up complete). From complete, one is
     missing again, which is the closest to where it was. */
  function encounter(book, id) {
    const s = stateOf(book, id);
    if (s.seen && !s.done) return normalize(book);
    return set(book, id, s.done ? Math.min(1, maxLeft(id)) : maxLeft(id));
  }
  const complete = (book, id) => set(book, id, 0);
  const clear = (book, id) => set(book, id, null);

  /* Mark the given entries in bulk, with the same rules as one by one: 'seen'
     encounters the ones you don't have (the yes-or-no ones end up complete), 'done' completes
     the ones missing and 'none' removes the ones you have. The ones that come done and the Idol
     don't change. The Hunter's Mark isn't "encountered": it only goes in with 'done', last, if
     with the rest the 146 are already there; and with 'none' it goes by itself when one of them is removed. */
  function bulk(book, ids, what) {
    let b = normalize(book);
    const markable = ids.filter((id) => ROW[id] && !['start', 'idol', 'mark'].includes(kindOf(id)));
    for (const id of markable) {
      const s = stateOf(b, id);
      if (what === 'seen' && !s.seen) b = encounter(b, id);
      else if (what === 'done' && !s.done) b = complete(b, id);
      else if (what === 'none' && s.seen) b = clear(b, id);
    }
    if (ids.includes(MARK) && what === 'done') b = complete(b, MARK);
    if (ids.includes(MARK) && what === 'none') b = clear(b, MARK);
    return b;
  }
  /* How many entries change from one book to another: what each bulk button says. */
  const changed = (a, b) => BOOK.filter((r) => (own(a, r.id) ? a[r.id] : null) !== (own(b, r.id) ? b[r.id] : null)).length;

  /* Which notice the game gives when an entry changes: 'half' when it's added to the Journal
     ("New Journal Entry") and 'full' when the notes are deciphered ("Journal Updated"). */
  function change(prev, next, id) {
    const a = stateOf(prev, id), b = stateOf(next, id);
    if (!a.done && b.done) return 'full';
    if (!a.seen && b.seen) return 'half';
    return null;
  }

  /* What the Hunter tells you if you go to see him ("The Hunter" page): fewer than 50
     entries, 50 to 99, 100 or more, the 146 encountered, the 146 completed and, with the
     Mark, the one after. */
  function hunterLine(book) {
    if (stateOf(book, MARK).done) return 'gotMark';
    if (markReady(book)) return 'complete';
    const c = counts(book);
    if (c.reqSeen === REQUIRED) return 'entriesDone';
    if (c.encountered >= 100) return 'convo3';
    if (c.encountered >= 50) return 'convo2';
    return 'convo1';
  }

  HK.hunter = {
    BOOK, ROW, EXTRAS, MARK, IDOL, REQUIRED, COUNTED,
    maxLeft, kindOf, normalize, stateOf, markReady, markLeft, counts,
    set, step, encounter, complete, clear, bulk, changed, change, hunterLine,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.hunter;
})();
