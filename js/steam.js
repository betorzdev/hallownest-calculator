/* js/steam.js — the achievements of your Steam account, read from Steam's own file.
   Pure: bytes in, the achievements unlocked out, no DOM and no language. The interface picks the
   error's words.

   Achievements aren't a save's: they're the account's, and Steam keeps the account's record on
   the PC, in its appcache/stats folder: UserGameStats_<account id>_367520.bin (367520 is Hollow
   Knight's app id; the id isn't inside the file, only in its name). Steam loads it at every
   launch of the game and brings it up to date from its servers, and writes it again on each
   unlock (logs/stats_log.txt, checked 8 October 2026). Beside it, UserGameStatsSchema_367520.bin
   says which bit is which achievement; that map is fixed and carried here (js/achievements.js,
   STEAM), and tools/check-steam.js checks it against the schema.

   The file is Steam's binary KeyValues: a tree of (type byte, name, value) with 0x08 closing a
   node. Types: 0 a node, 1 a string (UTF-8, ended by NUL), 2 an int32, 3 a float, 4 a uint32
   (a pointer, unused here), 7 a uint64. The tree:
     cache
       crc, PendingChanges
       <stat id>                 "3", "6", "7": the three ACHIEVEMENTS stats of the schema
         data                    int32: a bit per achievement, set when unlocked
         AchievementTimes
           <bit>                 int32: when it was unlocked, unix seconds
   data is stored signed (−2 when every bit but the first is set): read as unsigned. The stats of
   type INT (4 and 5, two counters) may be there too and are ignored. */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const A = HK.achievements || require('./achievements.js');

  const APP = 367520;
  const NAME = /^UserGameStats_(\d+)_367520\.bin$/;
  // The stats that hold achievements, and the two counters beside them.
  const ACH_STATS = ['3', '6', '7'], OTHER_STATS = ['4', '5'];

  /* The binary KeyValues → a plain object. A malformed file throws. */
  function parseKV(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const dec = new TextDecoder('utf-8');
    let p = 0;
    const string = () => {
      let e = p;
      while (e < b.length && b[e] !== 0) e += 1;
      if (e >= b.length) throw new Error('unterminated string');
      const s = dec.decode(b.subarray(p, e));
      p = e + 1;
      return s;
    };
    const need = (n) => { if (p + n > b.length) throw new Error('truncated'); };
    const node = () => {
      const out = {};
      for (;;) {
        need(1);
        const type = b[p]; p += 1;
        if (type === 8) return out;
        const key = string();
        if (type === 0) out[key] = node();
        else if (type === 1) out[key] = string();
        else if (type === 2) { need(4); out[key] = view.getInt32(p, true); p += 4; }
        else if (type === 3) { need(4); out[key] = view.getFloat32(p, true); p += 4; }
        else if (type === 4) { need(4); out[key] = view.getUint32(p, true); p += 4; }
        else if (type === 7) { need(8); out[key] = Number(view.getBigUint64(p, true)); p += 8; }
        else throw new Error('type ' + type);
      }
    };
    const out = node();
    return out;
  }

  // STEAM (js/achievements.js): key → [stat, bit]; here the other way, "stat.bit" → key.
  const KEY_AT = {};
  for (const [key, [stat, bit]] of Object.entries(A.STEAM)) KEY_AT[stat + '.' + bit] = key;

  /* The file (and its name, when known) → { ok: true, unlocked: { KEY: unix seconds or 0 }, account }
     or { ok: false, error }: 'unreadable' (not KeyValues, or not a stats file) or 'notGame' (a
     stats file of another game: a name that isn't Hollow Knight's, a stat the schema doesn't
     have, or a bit set where Hollow Knight has no achievement). A time of 0 is an unlock Steam
     didn't date. */
  function read(bytes, name = '') {
    let account = null;
    if (name) {
      const m = NAME.exec(name);
      if (!m) return { ok: false, error: 'notGame' };
      account = m[1];
    }
    let kv;
    try { kv = parseKV(bytes); } catch (e) { return { ok: false, error: 'unreadable' }; }
    const cache = kv && kv.cache;
    if (!cache || typeof cache !== 'object') return { ok: false, error: 'unreadable' };
    // An account with nothing yet may carry no stat at all: that's a file with nothing unlocked.
    const stats = Object.keys(cache).filter((k) => /^\d+$/.test(k));
    if (stats.some((k) => !ACH_STATS.includes(k) && !OTHER_STATS.includes(k))) return { ok: false, error: 'notGame' };
    const unlocked = {};
    for (const stat of ACH_STATS) {
      const st = cache[stat];
      if (!st || typeof st !== 'object') continue;
      const data = (Number(st.data) || 0) >>> 0;
      const times = st.AchievementTimes && typeof st.AchievementTimes === 'object' ? st.AchievementTimes : {};
      for (let bit = 0; bit < 32; bit += 1) {
        if (!(data & (2 ** bit))) continue;
        const key = KEY_AT[stat + '.' + bit];
        if (!key) return { ok: false, error: 'notGame' };
        unlocked[key] = Math.max(0, Number(times[bit]) || 0);
      }
    }
    return { ok: true, unlocked, account };
  }

  HK.steam = { APP, NAME, parseKV, read };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.steam;
})();
