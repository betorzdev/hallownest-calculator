// js/achievements.js: the game's 63 achievements, and which of them a slot has.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const D = require('../js/data.js');
const C = require('../js/codec.js');
const HJ = require('../js/hunter.js');
const CO = require('../js/collectibles.js');
const CP = require('../js/completion.js');
const A = require('../js/achievements.js');

const TEXT = require('../kb/data/all_text.json');
const HOUR = 3600;
const count = (o, marks) => A.count({ build: C.PRESETS.base, owned: [], book: {}, progress: {}, meta: null, ...o }, marks);
const item = (r, id) => r.groups.flatMap((g) => g.items).find((it) => it.id === id);
const on = (r, id) => item(r, id).on;

test('the 63 of the game: unique ids, the wiki\'s 13 groups, 25 hidden, an icon each', () => {
  assert.equal(A.TOTAL, 63);
  assert.equal(new Set(A.ACHIEVEMENTS.map((a) => a.id)).size, 63);
  assert.equal(new Set(A.ACHIEVEMENTS.map((a) => a.key)).size, 63);
  const r = count({});
  assert.deepEqual(r.groups.map((g) => g.id), A.GROUPS);
  assert.equal(r.groups.reduce((n, g) => n + g.max, 0), 63);
  assert.equal(A.ACHIEVEMENTS.filter((a) => a.hidden).length, 25);
  for (const a of A.ACHIEVEMENTS) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'achievements', a.id + '.png')), `${a.id} has no icon`);
    assert.ok(A.RULES[a.id], `${a.id} has no rule`);
    // Not `hand`, it's marked somewhere: a progress id, a Journal entry or another screen.
    if (!a.hand) assert.ok(a.mark, `${a.id} is marked nowhere`);
  }
});

test('their names and texts are the game\'s, copied as is', () => {
  const plain = (s) => s.replace(/[‘’]/g, '\'').trim();
  for (const a of A.ACHIEVEMENTS) {
    for (const lang of ['es', 'en']) {
      const L = TEXT[lang.toUpperCase()];
      assert.equal(a.name[lang], plain(L[a.key + '_TITLE']), `${a.id} ${lang} name`);
      assert.equal(a.text[lang], plain(L[a.key + '_TEXT']), `${a.id} ${lang} text`);
    }
  }
});

test('an empty slot has none; the hand ones count only when marked', () => {
  const r = count({});
  assert.equal(r.done, 0);
  // With no save from the game, every hand one is up to you.
  assert.deepEqual(r.groups.flatMap((g) => g.items).filter((it) => !it.sure).map((it) => it.id).sort(), [...A.HAND].sort());
  assert.equal(count({}, ['speedrun-1', 'falsehood', 'nope']).done, 1);
  assert.deepEqual(A.toggle(['completion'], 'falsehood'), ['completion']);
  assert.deepEqual(A.toggle(['completion'], 'completion'), []);
  assert.deepEqual(A.toggle([], 'steel-soul', true), ['steel-soul']);
});

test('the thresholds are the game\'s code', () => {
  // One version of each charm (the game counts gotCharm_1…40).
  const charms = [...new Map(D.CHARMS.map((c) => [CP.BASE[c.id] || c.id, c.id])).values()];
  assert.equal(charms.length, 40);
  assert.equal(on(count({ owned: charms.slice(0, 19) }), 'enchanted'), false);
  assert.equal(on(count({ owned: charms.slice(0, 20) }), 'enchanted'), true);
  // Two versions of the same charm are one charm.
  assert.equal(on(count({ owned: ['kingsoul', 'voidheart'] }), 'charmed'), true);
  assert.equal(count({ owned: ['fheart', 'uheart'] }).groups[0].done, 1);
  assert.equal(on(count({ build: { ...C.PRESETS.base, masks: 6 } }), 'protected'), true);
  assert.equal(on(count({ build: { ...C.PRESETS.base, masks: 6 } }), 'masked'), false);
  assert.equal(on(count({ build: { ...C.PRESETS.base, vessels: 1 } }), 'soulful'), true);
  const grubs = CO.ITEMS.filter((it) => it.kind === 'grub').map((it) => it.id);
  assert.equal(on(count({ progress: { found: grubs.slice(0, 22) } }), 'grubfriend'), false);
  assert.equal(on(count({ progress: { found: grubs.slice(0, 23) } }), 'grubfriend'), true);
  // Connection: four stations, not counting Dirtmouth's nor the Nest.
  const stags = (ids) => count({ progress: { found: ids } });
  assert.equal(on(stags(['dirtmouth-stag', 'stag-nest-stag', 'crossroads-stag', 'greenpath-stag', 'queens-station-stag']), 'connection'), false);
  assert.equal(on(stags(['crossroads-stag', 'greenpath-stag', 'queens-station-stag', 'kings-station-stag']), 'connection'), true);
  const maps = CO.ITEMS.filter((it) => it.kind === 'map').map((it) => it.id);
  assert.equal(maps.length, 13);
  assert.equal(on(count({ progress: { found: maps.slice(1) } }), 'cartographer'), false);
  assert.equal(on(count({ progress: { found: maps } }), 'cartographer'), true);
  assert.equal(on(count({ progress: { counts: { essence: 600 } } }), 'attunement'), true);
  assert.equal(on(count({ progress: { counts: { essence: 120 }, ids: ['dream-awakened'] } }), 'attunement'), true);
});

test('the bosses come from the Journal and the progress the 112% reads', () => {
  const book = HJ.encounter(HJ.encounter({}, 'false-knight'), 'zote-the-mighty');
  const r = count({ book, progress: { ids: ['failed-champion', 'hornet-sentinel', 'pantheon-knight'] } });
  for (const id of ['falsehood', 'rivalry', 'strength', 'proof-of-resolve', 'soul-shade']) assert.equal(on(r, id), true, id);
  assert.equal(on(r, 'test-of-resolve'), false);
});

test('the endings: what a save from the game settles, rules out or points to', () => {
  const save = (o, meta = {}) => count({ progress: { ids: o.ids || [] }, owned: o.owned || [],
    meta: { time: 30 * HOUR, completion: 90, steel: false, ...meta } });
  // Not finished: none of them.
  let r = save({});
  for (const id of A.HAND) assert.deepEqual([id, item(r, id).sure, item(r, id).on], [id, true, false]);
  // The Hollow Knight fallen without Void Heart: the first ending, not Hornet's.
  r = save({ ids: ['ending-vessel'] });
  assert.equal(on(r, 'the-hollow-knight'), true);
  assert.deepEqual([item(r, 'sealed-siblings').sure, on(r, 'sealed-siblings')], [true, false]);
  // With Void Heart, either: by hand.
  r = save({ ids: ['ending-vessel'], owned: ['voidheart'] });
  assert.equal(item(r, 'the-hollow-knight').sure, false);
  assert.equal(item(r, 'sealed-siblings').sure, false);
  // The time only grows: finished under 5 hours is Speedrun 2 and 1.
  r = save({ ids: ['ending-radiance'] }, { time: 4.5 * HOUR });
  assert.equal(on(r, 'speedrun-2'), true);
  assert.equal(on(r, 'speedrun-1'), true);
  r = save({ ids: ['ending-radiance'] }, { time: 7 * HOUR });
  assert.equal(item(r, 'speedrun-2').sure, false);
  assert.equal(on(r, 'speedrun-1'), true);
  // 100% now and finished points to Completion; under 20 hours, to Speed Completion too.
  r = save({ ids: ['ending-vessel'] }, { completion: 104, time: 18 * HOUR });
  assert.deepEqual([item(r, 'completion').sure, item(r, 'completion').hint], [false, 'likely']);
  assert.equal(item(r, 'speed-completion').hint, 'likely');
  assert.deepEqual([item(r, 'pure-completion').sure, on(r, 'pure-completion')], [true, false]);
  // Steel Soul is the save's: finished in it, or not a Steel Soul game.
  assert.equal(on(save({ ids: ['pantheon-hallownest'] }, { steel: true }), 'steel-soul'), true);
  assert.deepEqual([item(save({ ids: ['ending-vessel'] }), 'steel-soul').sure, on(save({ ids: ['ending-vessel'] }), 'steel-soul')], [true, false]);
  // A save imported before the site read Steel Soul: by hand.
  assert.equal(item(save({ ids: ['ending-vessel'] }, { steel: undefined }), 'steel-soul').sure, false);
  // Mister Mushroom's seven meetings and an ending point to it.
  assert.equal(item(save({ ids: ['ending-vessel', 'mushroom-seven'] }), 'passing-of-the-age').hint, 'likely');
  assert.deepEqual([item(save({ ids: ['ending-vessel'] }), 'passing-of-the-age').sure, on(save({ ids: ['ending-vessel'] }), 'passing-of-the-age')], [true, false]);
});

test('the account by hand: a record of its own, toggled plate by plate, never with Steam\'s file in', () => {
  let rec = A.handRecord(null);
  assert.deepEqual(rec, { source: 'hand', unlocked: {} });
  rec = A.toggleAccount(rec, 'falsehood');
  rec = A.toggleAccount(rec, 'rivalry', true);
  assert.deepEqual(rec.unlocked, { FK_DEFEAT: 0, ZOTE: 0 });
  assert.equal(A.account(rec).done, 2);
  assert.equal(A.account(rec).time('falsehood'), 0);
  rec = A.toggleAccount(rec, 'falsehood');
  assert.deepEqual(rec.unlocked, { ZOTE: 0 });
  assert.equal(A.toggleAccount(rec, 'nope'), rec);
  // Steam's record doesn't move by hand.
  const steam = { source: 'steam', unlocked: { CHARMED: 1 }, hand: rec.unlocked };
  assert.equal(A.toggleAccount(steam, 'falsehood'), steam);
  // And the marks it kept come back as a hand record.
  assert.deepEqual(A.handRecord(steam.hand), { source: 'hand', unlocked: { ZOTE: 0 } });
});
