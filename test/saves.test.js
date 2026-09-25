/* test/saves.test.js — free mode and the four save slots over a fake storage: what goes in a
   slot, what stays out, and that switching, starting a new game and clearing never mix two games. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const C = require('../js/codec.js');
const S = require('../js/saves.js');

function fakeStore(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    dump: () => Object.fromEntries(m),
  };
}
const FRESH_BUILD = C.encode(C.PRESETS.base);

test('with nothing saved, the site is in free mode and the four slots are empty', () => {
  const s = fakeStore();
  assert.deepEqual(S.read(s), { active: S.FREE, slots: {} });
  assert.deepEqual(S.list(s).map((x) => [x.n, x.active, x.snap && Object.keys(x.snap).length]),
    [[0, true, 0], [1, false, null], [2, false, null], [3, false, null], [4, false, null]]);
});

test('data from before slots existed stays in free mode, untouched', () => {
  const s = fakeStore({ 'hollow.build': 'v=1&nail=3', 'hollow.journal': '{"crawlid":0}', 'hollow.prefs': '{"lang":"es"}' });
  const free = S.list(s)[0];
  assert.equal(free.n, S.FREE);
  assert.equal(free.active, true);
  assert.deepEqual(free.snap, { 'hollow.build': 'v=1&nail=3', 'hollow.journal': '{"crawlid":0}' });
});

test('free mode with nothing saved comes back with the defaults, not as a new game', () => {
  const s = fakeStore();
  S.select(s, 1);
  assert.equal(s.getItem('hollow.build'), FRESH_BUILD);
  S.select(s, S.FREE);
  assert.equal(s.getItem('hollow.build'), null, 'no build: everything unlocked (App.loadState)');
  assert.equal(s.getItem('hollow.owned'), null, 'no list: every charm found (App.loadOwned)');
  assert.equal(S.clear(s, S.FREE), false, 'free mode is not cleared');
});

test('entering an empty slot starts a new game and keeps the other one aside', () => {
  const s = fakeStore({ 'hollow.build': 'v=1&nail=3', 'hollow.hall': '{"gruz-mother":["at"]}', 'hollow.prefs': '{"lang":"es"}' });
  assert.equal(S.select(s, 2), true);
  const d = s.dump();
  assert.equal(d['hollow.build'], FRESH_BUILD);
  assert.equal(d['hollow.owned'], '[]', 'a new game has no charms found');
  assert.equal(d['hollow.hall'], undefined, 'the Hall is empty');
  assert.equal(d['hollow.prefs'], '{"lang":"es"}', 'the preferences are not in a slot');
  assert.deepEqual(S.read(s), { active: 2, slots: { 0: { 'hollow.build': 'v=1&nail=3', 'hollow.hall': '{"gruz-mother":["at"]}' } } });
});

test('going back restores each game as it was', () => {
  const s = fakeStore({ 'hollow.build': 'v=1&nail=3' });
  S.select(s, 3);
  s.setItem('hollow.journal', '{"crawlid":0}');
  S.select(s, S.FREE);
  assert.equal(s.getItem('hollow.build'), 'v=1&nail=3');
  assert.equal(s.getItem('hollow.journal'), null, "slot 3's Journal stays in slot 3");
  S.select(s, 3);
  assert.equal(s.getItem('hollow.journal'), '{"crawlid":0}');
  assert.equal(s.getItem('hollow.build'), FRESH_BUILD);
  assert.equal(S.select(s, 3), false, 'the active slot is already entered');
  assert.equal(S.select(s, 5), false, 'there are four');
});

test('clearing a slot empties it; clearing the active one also drops you into free mode', () => {
  const s = fakeStore();
  S.select(s, 1);
  s.setItem('hollow.run', '{}');
  S.select(s, 2);
  assert.equal(S.clear(s, 1), true);
  assert.deepEqual(Object.keys(S.read(s).slots), ['0']);
  assert.equal(S.clear(s, 1), false, 'already empty');
  s.setItem('hollow.run', '{"pantheon":"master"}');
  assert.equal(S.clear(s, 2), true);
  assert.equal(s.getItem('hollow.run'), null);
  assert.equal(s.getItem('hollow.build'), null, "free mode's own build: none saved, the defaults");
  assert.deepEqual(S.read(s), { active: S.FREE, slots: {} });
  assert.equal(S.list(s)[2].snap, null, 'the slot is empty');
});

test('corrupt or foreign data is ignored', () => {
  const s = fakeStore({ 'hollow.saves': '{"active":9,"slots":{"0":{"hollow.build":"x"},"2":{"hollow.prefs":"{}","hollow.build":4}}}' });
  assert.deepEqual(S.read(s), { active: S.FREE, slots: { 2: {} } });
  assert.deepEqual(S.read(fakeStore({ 'hollow.saves': 'not json' })), { active: S.FREE, slots: {} });
});

test('a storage that throws leaves the site in free mode and no crash', () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.deepEqual(S.read(bad), { active: S.FREE, slots: {} });
  assert.doesNotThrow(() => S.select(bad, 2));
});

test('an imported game replaces a slot: the live keys if it is active, its copy if not, never free mode', () => {
  const s = fakeStore();
  S.select(s, 1);
  s.setItem('hollow.run', '{}');
  const game = { 'hollow.build': 'v=1&nail=4', 'hollow.owned': '[]', 'hollow.prefs': '{}' };
  assert.equal(S.importTo(s, 1, game), true);
  assert.equal(s.getItem('hollow.build'), 'v=1&nail=4');
  assert.equal(s.getItem('hollow.run'), null, 'the old pantheon in progress goes with the old game');
  assert.equal(s.getItem('hollow.prefs'), null, 'only the slot keys come in');
  assert.equal(S.importTo(s, 3, game), true);
  assert.deepEqual(S.read(s).slots[3], { 'hollow.build': 'v=1&nail=4', 'hollow.owned': '[]' });
  assert.equal(S.importTo(s, S.FREE, game), false);
});

test('a synced game replaces the slot but keeps the site-only keys, and says whether anything changed', () => {
  const s = fakeStore();
  S.select(s, 1);
  s.setItem('hollow.build', 'v=1&nail=1');
  s.setItem('hollow.journal', '{"crawlid":1}');
  s.setItem('hollow.run', '{"pantheon":"p1"}');
  s.setItem('hollow.baseline', 'v=1&nail=0');
  const game = { 'hollow.build': 'v=1&nail=4', 'hollow.owned': '[]', 'hollow.run': '{"x":1}' };
  assert.equal(S.sync(s, 1, game), true);
  assert.equal(s.getItem('hollow.build'), 'v=1&nail=4');
  assert.equal(s.getItem('hollow.journal'), null, 'what the save doesn\'t carry is the game\'s: gone');
  assert.equal(s.getItem('hollow.run'), '{"pantheon":"p1"}', 'the pantheon in progress stays, not the file\'s');
  assert.equal(s.getItem('hollow.baseline'), 'v=1&nail=0', 'the pinned build stays');
  assert.equal(S.sync(s, 1, game), false, 'the same game again changes nothing');
  // An inactive slot, in its copy.
  S.select(s, 2);
  assert.equal(S.sync(s, 1, { 'hollow.build': 'v=1&nail=3' }), true);
  assert.deepEqual(S.read(s).slots[1], { 'hollow.build': 'v=1&nail=3', 'hollow.run': '{"pantheon":"p1"}', 'hollow.baseline': 'v=1&nail=0' });
  assert.equal(S.sync(s, S.FREE, game), false, 'free mode is nobody\'s game');
});
