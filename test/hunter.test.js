/* test/hunter.test.js — your game's Hunter's Journal: the book and its rules.
   The book comes from the wiki's table ("Hunter's Journal (Hollow Knight)"); if someone
   misreads it or touches a game rule (what counts, what the Mark requires), this fires
   before the Journal shows a figure the game doesn't. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const foes = require('../js/enemies.js');
const J = require('../js/journal.js');
const H = require('../js/hunter.js');
const HG = require('../js/hall.js');
const { UI } = require('../js/i18n.js');

const row = (id) => H.ROW[id];
const EXTRA_IDS = ['shade', 'hunters-mark', 'seal-of-binding', 'void-idol', 'weathered-mask'];

test("168 entries in the game's order: 163 foe entries and 5 that aren't creatures", () => {
  assert.equal(H.BOOK.length, 168);
  assert.deepEqual(H.BOOK.map((r) => r.n), Array.from({ length: 168 }, (_, i) => i + 1));
  assert.equal(new Set(H.BOOK.map((r) => r.id)).size, 168, 'repeated ids');
  assert.equal(H.BOOK[0].id, 'crawlid');
  assert.deepEqual(H.BOOK.slice(-5).map((r) => r.id), EXTRA_IDS);
  // The first 163 are foe entries with their own Journal entry and the same number as the picker.
  for (const r of H.BOOK.slice(0, 163)) {
    assert.ok(foes.FOE_BY_ID[r.id], `${r.id}: isn't a foe entry`);
    assert.equal(J.ENTRIES[r.id] && J.ENTRIES[r.id].n, r.n, `${r.id}: different number in ENTRIES`);
  }
  assert.deepEqual(Object.keys(H.EXTRAS), EXTRA_IDS);
});

test("164 count towards the total and 146 are required for the Mark: the 22 that aren't, by name", () => {
  assert.equal(H.COUNTED, 164);
  assert.equal(H.REQUIRED, 146);
  assert.deepEqual(H.BOOK.filter((r) => r.uncounted).map((r) => r.id), ['hunters-mark', 'seal-of-binding', 'void-idol', 'weathered-mask']);
  assert.deepEqual(H.BOOK.filter((r) => r.optional).map((r) => r.id).sort(), [
    'menderbug', 'white-defender', 'zote-the-mighty', 'grey-prince-zote', 'winged-zoteling', 'hopping-zoteling',
    'volatile-zoteling', 'grimmkin-novice', 'grimmkin-master', 'grimmkin-nightmare', 'grimm', 'nkg', 'oro-mato', 'sheo',
    'sly', 'hollow-knight', 'pure-vessel', 'the-radiance', 'hunters-mark', 'seal-of-binding', 'void-idol', 'weathered-mask',
  ].sort());
});

test("what each entry requires, like the wiki's table", () => {
  assert.equal(row('vengefly').kills, 45);
  assert.equal(row('false-knight').kills, 1);
  assert.equal(row('crystal-guardian').kills, 2, 'Enraged Guardian completes its own');
  assert.equal(row('hornet-protector').kills, 2, 'Hornet Sentinel completes its own');
  assert.equal(row('mossy-vagabond').kills, 10);
  assert.ok(row('mossy-vagabond').inspect, 'its infected corpse is inspected');
  for (const id of ['goam', 'charged-lumafly', 'garpede', 'void-tendrils']) {
    assert.equal(row(id).kills, null, id);
    assert.ok(row(id).inspect && row(id).inspect.es && row(id).inspect.en, `${id}: no inspect line`);
  }
  assert.deepEqual(H.BOOK.filter((r) => r.auto).map((r) => r.id), ['wingmould', 'royal-retainer', 'kingsmould']);
  assert.deepEqual(H.BOOK.filter((r) => r.start).map((r) => r.id), ['crawlid', 'shade']);
  assert.deepEqual(H.BOOK.filter((r) => r.once).map((r) => r.id), ['flukemunga']);
  assert.equal(H.BOOK.filter((r) => r.kills === 1).length, 45, 'the single-defeat ones');
  // The Journal names that aren't the foe entry's.
  assert.deepEqual(row('the-radiance').name, { es: 'Destello', en: 'Radiance' });
  assert.deepEqual(row('hornet-protector').name, { es: 'Hornet', en: 'Hornet' });
  assert.equal(H.BOOK.filter((r) => r.name).length, 8);
});

test('every entry has its medallion, and the extras their portrait (the Seal has none)', () => {
  const exists = (...p) => fs.existsSync(path.join(__dirname, '..', 'assets', ...p));
  for (const r of H.BOOK) assert.ok(exists('journal', r.id + '.png'), `${r.id}: no medallion`);
  for (const id of ['shade', 'hunters-mark', 'weathered-mask']) assert.ok(exists('hunter', id + '.png'), `${id}: no portrait`);
  for (const f of ['book', 'hunter', 'frame', 'fleur']) assert.ok(exists('hunter', f + '.png'), `assets/hunter/${f}.png`);
  for (const d of ['at', 'asra', 'radiant']) assert.ok(exists('hall', `idol-${d}.png`), `the Idol ${d}`);
});

test('how many can be missing and which control each one carries', () => {
  assert.equal(H.maxLeft('vengefly'), 44, 'the first defeat already adds it');
  assert.equal(H.maxLeft('false-knight'), 0);
  assert.equal(H.maxLeft('wingmould'), 10, 'opens without defeating any');
  assert.equal(H.maxLeft('goam'), 0);
  assert.equal(H.kindOf('crawlid'), 'start');
  assert.equal(H.kindOf('void-idol'), 'idol');
  assert.equal(H.kindOf('hunters-mark'), 'mark');
  assert.equal(H.kindOf('vengefly'), 'count');
  assert.equal(H.kindOf('mossy-vagabond'), 'count');
  assert.equal(H.kindOf('false-knight'), 'flag');
  assert.equal(H.kindOf('goam'), 'flag');
  assert.equal(H.kindOf('nadie'), null);
  assert.equal(H.BOOK.filter((r) => H.kindOf(r.id) === 'count').length, 113);
});

test('what is saved gets cleaned: nothing broken reaches the Journal', () => {
  for (const junk of [null, undefined, 3, 'x', [], [1, 2]]) assert.deepEqual(H.normalize(junk), {});
  const raw = {
    vengefly: 12.7, gruzzer: -3, tiktik: 999, 'aspid-hunter': null, 'aspid-mother': true, baldur: '5',
    nobody: 1, crawlid: 3, shade: 1, 'void-idol': 0, 'hunters-mark': 0, goam: 7,
  };
  const copy = JSON.parse(JSON.stringify(raw));
  assert.deepEqual(H.normalize(raw), { vengefly: 12, gruzzer: 0, tiktik: 29, goam: 0 });
  assert.deepEqual(raw, copy, "normalize doesn't touch what it receives");
});

test('marking: encounter, count down, complete and remove', () => {
  let b = H.encounter({}, 'vengefly');
  assert.deepEqual(b, { vengefly: 44 });
  assert.equal(H.change({}, b, 'vengefly'), 'half');
  b = H.step(b, 'vengefly', -1);
  assert.equal(b.vengefly, 43);
  assert.equal(H.step(b, 'vengefly', +5).vengefly, 44, "doesn't go past what it requires");
  assert.equal(H.set(b, 'vengefly', -2).vengefly, 0);
  const done = H.complete(b, 'vengefly');
  assert.equal(H.change(b, done, 'vengefly'), 'full');
  assert.equal(H.step(done, 'vengefly', -1).vengefly, 0);
  assert.equal(H.step(done, 'vengefly', +1).vengefly, 1, 'from complete, one is missing again');
  assert.equal(H.encounter(done, 'vengefly').vengefly, 1);
  assert.deepEqual(H.clear(done, 'vengefly'), {});
  assert.deepEqual(H.step({}, 'vengefly', -1), {}, 'not encountered, no count');
  // The yes-or-no ones end up complete on encountering them; the ones that come done aren't touched.
  assert.deepEqual(H.encounter({}, 'false-knight'), { 'false-knight': 0 });
  assert.equal(H.change({}, { 'false-knight': 0 }, 'false-knight'), 'full');
  assert.deepEqual(H.clear({}, 'crawlid'), {});
  assert.deepEqual(H.stateOf({}, 'crawlid'), { seen: true, left: 0, done: true });
  assert.deepEqual(H.set({}, 'void-idol', 0), {});
  // No function touches the book it receives.
  const before = { vengefly: 10 };
  H.step(before, 'vengefly', -1); H.complete(before, 'vengefly'); H.clear(before, 'vengefly');
  assert.deepEqual(before, { vengefly: 10 });
});

test("the Hunter's Mark requires the 146, and goes if you remove one", () => {
  const allRequired = {};
  for (const r of H.BOOK) if (!r.optional && !r.start) allRequired[r.id] = 0;
  assert.equal(H.markReady({}), false);
  assert.equal(H.markLeft({}), 144, 'Crawlid and the Shade are already there');
  assert.deepEqual(H.set({}, 'hunters-mark', 0), {}, "without the 146 it can't be taken");
  assert.equal(H.markReady(allRequired), true);
  const withMark = H.set(allRequired, 'hunters-mark', 0);
  assert.equal(withMark['hunters-mark'], 0);
  assert.equal(H.clear(withMark, 'vengefly')['hunters-mark'], undefined, 'removing one removes the Mark');
  assert.equal(H.encounter(withMark, 'vengefly')['hunters-mark'], undefined, 'and so does leaving it half-done');
  // Flukemunga: one is enough for the Mark; the rest, complete.
  assert.equal(H.markReady({ ...allRequired, flukemunga: 5 }), true);
  assert.equal(H.markReady({ ...allRequired, vengefly: 3 }), false);
  // The optional ones aren't needed: `allRequired` carries none.
  assert.ok(Object.keys(allRequired).every((id) => !H.ROW[id].optional));
});

test("the Void Idol follows the Hall's marks, with its level", () => {
  assert.deepEqual(H.stateOf({}, 'void-idol', {}), { seen: false, left: 0, done: false, tier: null });
  const hallAll = (d) => Object.fromEntries(HG.STATUES.map((s) => [s.id, [d]]));
  assert.equal(H.stateOf({}, 'void-idol', hallAll('at')).tier, 'at');
  assert.equal(H.stateOf({}, 'void-idol', hallAll('radiant')).tier, 'radiant');
  assert.ok(H.stateOf({}, 'void-idol', hallAll('asra')).done);
  for (const d of ['at', 'asra', 'radiant']) assert.ok(H.EXTRAS['void-idol'].desc[d].en, `no description for ${d}`);
});

test("the game's counts: the total starts at 146 and grows with the optional entries", () => {
  assert.deepEqual(H.counts({}), { encountered: 2, completed: 2, total: 146, max: 164, reqSeen: 2, reqDone: 2, required: 146 });
  const c = H.counts({ menderbug: 0, vengefly: 30 });
  assert.equal(c.total, 147);
  assert.equal(c.encountered, 4);
  assert.equal(c.completed, 3);
  assert.equal(c.reqSeen, 3);
  // The four that don't count raise nothing.
  assert.deepEqual(H.counts({ 'seal-of-binding': 0, 'weathered-mask': 0 }), H.counts({}));
  const everything = {};
  for (const r of H.BOOK) if (!r.start && H.kindOf(r.id) !== 'idol') everything[r.id] = 0;
  const full = H.counts(H.normalize(everything));
  assert.equal(full.total, 164);
  assert.equal(full.encountered, 164);
  assert.equal(full.completed, 164);
});

test('what the Hunter says according to your progress, and each line has its text', () => {
  // Encounter n of the required ones, without completing them (or complete if they're single-defeat).
  const withN = (n) => {
    let b = {};
    for (const r of H.BOOK.filter((x) => !x.optional && !x.start).slice(0, n - 2)) b = H.encounter(b, r.id);
    return b;
  };
  const says = (b) => H.hunterLine(b);
  assert.equal(says({}), 'convo1');
  assert.equal(says(withN(49)), 'convo1');
  assert.equal(says(withN(50)), 'convo2');
  assert.equal(says(withN(99)), 'convo2');
  assert.equal(says(withN(100)), 'convo3');
  assert.equal(says(withN(146)), 'entriesDone');
  const allRequired = {};
  for (const r of H.BOOK) if (!r.optional && !r.start) allRequired[r.id] = 0;
  assert.equal(says(allRequired), 'complete');
  assert.equal(says(H.set(allRequired, 'hunters-mark', 0)), 'gotMark');
  for (const v of ['convo1', 'convo2', 'convo3', 'entriesDone', 'complete', 'gotMark']) {
    const k = 'hjSays' + v[0].toUpperCase() + v.slice(1);
    assert.ok(UI[k] && UI[k].es && UI[k].en, `UI.${k} is missing`);
  }
});

test('mark in bulk: encounter, complete and unmark, with the one-by-one rules', () => {
  const allRequired = H.BOOK.map((r) => r.id);
  // Encounter all: the counted ones, with the defeats left; the yes-or-no ones, complete.
  const vistas = H.bulk({}, allRequired, 'seen');
  assert.equal(vistas.vengefly, 44);
  assert.equal(vistas['false-knight'], 0);
  assert.equal(vistas.goam, 0);
  assert.equal(vistas['hunters-mark'], undefined, "the Mark isn't encountered");
  assert.equal(vistas.crawlid, undefined, "Crawlid isn't saved");
  assert.equal(H.counts(vistas).encountered, 164);
  assert.equal(H.counts(vistas).total, 164);
  // Encountering doesn't touch what you already have.
  assert.equal(H.bulk({ vengefly: 3 }, allRequired, 'seen').vengefly, 3);
  // Complete all: the Mark too, which goes last, and the game's total full.
  const allDone = H.bulk({}, allRequired, 'done');
  assert.equal(allDone['hunters-mark'], 0);
  assert.deepEqual(H.counts(allDone), { encountered: 164, completed: 164, total: 164, max: 164, reqSeen: 146, reqDone: 146, required: 146 });
  assert.equal(H.hunterLine(allDone), 'gotMark');
  // Unmark all leaves the book empty: only the ones that come with the Journal remain.
  assert.deepEqual(H.bulk(allDone, allRequired, 'none'), {});
  assert.deepEqual(H.counts(H.bulk(allDone, allRequired, 'none')), H.counts({}));
  // Only the given ones: the three optional Zotelings, without touching anyone else.
  const zotelings = ['winged-zoteling', 'hopping-zoteling', 'volatile-zoteling'];
  assert.deepEqual(H.bulk({ vengefly: 10 }, zotelings, 'done'), { vengefly: 10, 'winged-zoteling': 0, 'hopping-zoteling': 0, 'volatile-zoteling': 0 });
  // Without the 146 the Mark doesn't go in even if requested; removing a required one removes it.
  assert.equal(H.bulk({}, ['hunters-mark'], 'done')['hunters-mark'], undefined);
  assert.equal(H.bulk(allDone, ['vengefly'], 'none')['hunters-mark'], undefined);
  // How many change: what each button says.
  assert.equal(H.changed({}, vistas), 164, 'the 162 that count without Crawlid or the Shade, plus the Seal and the Weathered Mask');
  assert.equal(H.changed(allDone, allDone), 0);
  assert.equal(H.changed({}, allDone), 165, 'and on completing, the Mark too; the Idol never');
  // Doesn't touch what it receives.
  const before = { vengefly: 10 };
  H.bulk(before, allRequired, 'none');
  assert.deepEqual(before, { vengefly: 10 });
});
