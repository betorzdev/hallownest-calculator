/* test/changes.test.js — "Since last time": what a game gained between two saves (js/changes.js). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const C = require('../js/codec.js');
const CH = require('../js/changes.js');
const P = require('../js/progress.js');

const snap = (o = {}) => ({
  'hollow.build': C.encode(C.normalize({ nail: 1, masks: 5, vessels: 0, notches: 3, spells: { vs: 1, dd: 0, hw: 0 },
    arts: { cyclone: false, dash: false, great: false }, charms: [], dream: false, cloak: 1, grimm: 1, ...(o.build || {}) })),
  'hollow.owned': JSON.stringify(o.owned || []),
  ...(o.book ? { 'hollow.journal': JSON.stringify(o.book) } : {}),
  ...(o.hall ? { 'hollow.hall': JSON.stringify(o.hall) } : {}),
  ...(o.progress ? { 'hollow.progress': JSON.stringify(o.progress) } : {}),
});
const kinds = (list) => list.map((c) => c.kind + (c.id ? ':' + c.id : '') + (c.to !== undefined ? '=' + c.to : ''));

test('the same game twice gained nothing', () => {
  const g = CH.fromSnap(snap({ owned: ['compass'], book: { 'false-knight': 0 } }));
  assert.deepEqual(CH.diff(g, g), []);
  assert.deepEqual(CH.diff(null, g), [], 'with nothing before, nothing to tell');
});

test('each kind of gain, in the order they are told, and the completion last', () => {
  const a = CH.fromSnap(snap({ owned: ['compass'], book: { vengefly: 2 }, progress: { ids: [], found: [] } }));
  const b = CH.fromSnap(snap({
    build: { masks: 6, nail: 2, spells: { vs: 1, dd: 1, hw: 0 }, arts: { cyclone: true, dash: false, great: false }, cloak: 2, dream: true },
    owned: ['compass', 'swarm'], book: { vengefly: 0, 'false-knight': 0 }, hall: { 'gruz-mother': ['at'] },
    progress: { ids: ['mantis-claw'], found: ['grub-crossroads-acid'] },
  }));
  const list = CH.diff(a, b);
  assert.deepEqual(kinds(list.filter((c) => c.kind !== 'pct')), [
    'journal:vengefly', 'journal:false-knight', 'charm:swarm', 'item:mantis-claw', 'upgrade:masks=6', 'upgrade:nail=2',
    'spell:dd=1', 'art:cyclone', 'cloak=2', 'dream', 'found:grub-crossroads-acid', 'statue:gruz-mother',
  ]);
  assert.deepEqual(list.find((c) => c.id === 'vengefly'), { kind: 'journal', id: 'vengefly', done: true, was: true }, 'completed now');
  assert.deepEqual(list.find((c) => c.id === 'false-knight'), { kind: 'journal', id: 'false-knight', done: true }, 'new and done at once');
  const pct = list[list.length - 1];
  assert.equal(pct.kind, 'pct');
  assert.ok(pct.to > pct.from);
  assert.equal(pct.to, CH.pct(b));
});

test('losses are not told: a charm given away, a lower nail', () => {
  const a = CH.fromSnap(snap({ build: { nail: 3 }, owned: ['compass', 'fheart'] }));
  const b = CH.fromSnap(snap({ build: { nail: 2 }, owned: ['compass'] }));
  assert.deepEqual(CH.diff(a, b), []);
});

test('what is not a gain, or another row tells, stays out: a broken charm, a tram line, an ending', () => {
  const a = CH.fromSnap(snap({ progress: { ids: [] } }));
  const b = CH.fromSnap(snap({ progress: { ids: ['broken-heart', 'divine-greed', 'tram-upper', 'ending-vessel', 'ending-radiance', 'zote-dead', 'queen-fragment'] } }));
  assert.deepEqual(kinds(CH.diff(a, b).filter((c) => c.kind !== 'pct')), ['item:queen-fragment', 'item:zote-dead']);
  for (const id of CH.UNTOLD) assert.ok(id in P.IDS, id + ' is a progress id');
});

test('a snapshot with keys missing reads as an empty game', () => {
  const g = CH.fromSnap({});
  assert.deepEqual(g.owned, []);
  assert.deepEqual(g.book, {});
  assert.deepEqual(g.progress.found, []);
  assert.deepEqual(CH.fromSnap({ 'hollow.owned': 'not json' }).owned, []);
});
