// js/steam.js: your Steam account's achievements, read from Steam's stats file.
'use strict';
const test = require('node:test');
const assert = require('node:assert');

require('../js/data.js');
const A = require('../js/achievements.js');
const ST = require('../js/steam.js');

/* Steam's binary KeyValues, written: the inverse of parseKV, enough for a stats file. A value
   that's an object is a node, a number an int32 (what the file holds), a string a string. */
function kv(obj) {
  const out = [];
  const str = (s) => { out.push(...Buffer.from(s, 'utf8'), 0); };
  const node = (o) => {
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === 'object') { out.push(0); str(k); node(v); }
      else if (typeof v === 'string') { out.push(1); str(k); str(v); }
      else { out.push(2); str(k); const b = Buffer.alloc(4); b.writeInt32LE(v | 0); out.push(...b); }
    }
    out.push(8);
  };
  node(obj);
  return new Uint8Array(out);
}
const NAME = 'UserGameStats_1049278056_367520.bin';
// A stats file with these achievements (by key) unlocked at these times.
function file(unlocked) {
  const cache = { crc: 1, PendingChanges: 0 };
  for (const [key, t] of Object.entries(unlocked)) {
    const [stat, bit] = A.STEAM[key];
    const st = cache[stat] || (cache[stat] = { data: 0, AchievementTimes: {} });
    st.data = (st.data | (1 << bit)) | 0;
    st.AchievementTimes[bit] = t;
  }
  return kv({ cache });
}
const ALL = Object.fromEntries(Object.keys(A.STEAM).map((k, i) => [k, 1757000000 + i]));

test('the map covers the 63 positions of the schema: stat 3 bits 1–31, stat 6 bits 0–20 and 22–31, stat 7 bit 0', () => {
  const at = Object.values(A.STEAM).map(([s, b]) => s + '.' + b);
  assert.equal(at.length, 63);
  assert.equal(new Set(at).size, 63);
  const want = [...Array.from({ length: 31 }, (_, i) => '3.' + (i + 1)), ...Array.from({ length: 32 }, (_, i) => '6.' + i).filter((x) => x !== '6.21'), '7.0'];
  assert.deepEqual(at.sort(), want.sort());
  for (const key of Object.keys(A.STEAM)) assert.ok(A.BY_KEY[key], key);
});

test('parseKV reads Steam\'s binary KeyValues, strings, ints and nested nodes', () => {
  const d = ST.parseKV(kv({ a: { b: 'x', c: -2, d: { e: 7 } } }));
  assert.deepEqual(d, { a: { b: 'x', c: -2, d: { e: 7 } } });
  assert.throws(() => ST.parseKV(new Uint8Array([0, 65])), /unterminated|truncated/);
  assert.throws(() => ST.parseKV(new Uint8Array([9, 65, 0])), /type 9/);
});

test('a full account: 63 unlocked with their times, signed masks read as unsigned', () => {
  const r = ST.read(file(ALL), NAME);
  assert.equal(r.ok, true);
  assert.equal(r.account, '1049278056');
  assert.equal(Object.keys(r.unlocked).length, 63);
  assert.equal(r.unlocked.CHARMED, ALL.CHARMED);
  assert.equal(r.unlocked.COMPLETIONGG, ALL.COMPLETIONGG);
  const acc = A.account(r);
  assert.equal(acc.done, 63);
  assert.equal(acc.has('pure-completion'), true);
  assert.equal(acc.time('charmed'), ALL.CHARMED);
});

test('none, some, and no name given', () => {
  assert.deepEqual(ST.read(file({}), NAME), { ok: true, unlocked: {}, account: '1049278056' });
  const r = ST.read(file({ FK_DEFEAT: 1757000000, ENDINGD: 0 }));
  assert.deepEqual(r, { ok: true, unlocked: { FK_DEFEAT: 1757000000, ENDINGD: 0 }, account: null });
  assert.equal(A.account(r).done, 2);
  assert.equal(A.account(r).time('embrace-the-void'), 0);
  assert.equal(A.account(null).done, 0);
});

test('what isn\'t Hollow Knight\'s file is refused', () => {
  // Another game's stats file: a bit where Hollow Knight has no achievement, or a stat it doesn't have.
  assert.deepEqual(ST.read(kv({ cache: { 3: { data: 1, AchievementTimes: {} } } })), { ok: false, error: 'notGame' });
  assert.deepEqual(ST.read(kv({ cache: { 6: { data: 1 << 21 } } })), { ok: false, error: 'notGame' });
  assert.deepEqual(ST.read(kv({ cache: { 9: { data: 1 } } })), { ok: false, error: 'notGame' });
  assert.deepEqual(ST.read(file(ALL), 'UserGameStats_1_1145360.bin'), { ok: false, error: 'notGame' });
  assert.deepEqual(ST.read(file(ALL), 'UserGameStatsSchema_367520.bin'), { ok: false, error: 'notGame' });
  // The two counters beside the achievements are ignored.
  assert.equal(ST.read(kv({ cache: { 3: { data: 2 }, 4: { data: 5 }, 5: { data: 1 } } })).ok, true);
  // Not a stats file at all.
  assert.deepEqual(ST.read(kv({ other: { x: 1 } })), { ok: false, error: 'unreadable' });
  assert.deepEqual(ST.read(new Uint8Array([1, 2, 3])), { ok: false, error: 'unreadable' });
  assert.deepEqual(ST.read(new Uint8Array(0)), { ok: false, error: 'unreadable' });
});

test('the account is never a save\'s: count() knows nothing of Steam', () => {
  const C = require('../js/codec.js');
  const parts = { build: C.PRESETS.base, owned: [], book: {}, progress: {}, meta: null, steam: ST.read(file(ALL), NAME) };
  assert.equal(A.count(parts, []).done, 0);
  assert.ok(!/steam/i.test(A.count.toString()), 'count() reads no Steam');
  // Nor is hollow.account one of a slot's keys.
  assert.ok(!require('../js/saves.js').KEYS.includes('hollow.account'));
});
