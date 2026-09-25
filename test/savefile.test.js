/* test/savefile.test.js — importing a real game: the .dat read back (a file made here the way
   the game makes it, with Node's own AES), the field names checked against the site's lists
   and the game's text, and playerData turned into a slot. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

const D = require('../js/data.js');
const C = require('../js/codec.js');
const J = require('../js/journal.js');
const HG = require('../js/hall.js');
const F = require('../js/savefile.js');

const KEY = 'UKu52ePUBwetZ9wNX88o54dnfKRu0T1l';
const HEADER = [0, 1, 0, 0, 0, 255, 255, 255, 255, 1, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 0, 0];

// A userN.dat as the game writes it: header, length in 7-bit bytes, base64 of AES-256-ECB, 0x0B.
function datOf(json) {
  const c = crypto.createCipheriv('aes-256-ecb', Buffer.from(KEY, 'latin1'), null);
  const b64 = Buffer.from(Buffer.concat([c.update(JSON.stringify(json), 'utf8'), c.final()]).toString('base64'), 'ascii');
  const len = [];
  for (let n = b64.length; ; n >>= 7) { if (n < 0x80) { len.push(n); break; } len.push((n & 0x7f) | 0x80); }
  return new Uint8Array(Buffer.concat([Buffer.from(HEADER), Buffer.from(len), b64, Buffer.from([11])]));
}

// The Knight of a new game, as playerData carries it.
const BASE = { charmSlots: 3, maxHealthBase: 5, MPReserveMax: 0, nailSmithUpgrades: 0, grimmChildLevel: 0,
  fireballLevel: 0, quakeLevel: 0, screamLevel: 0, royalCharmState: 0, equippedCharms: [] };

test('a .dat made like the game makes it is decrypted back to its playerData', () => {
  // Long enough for many blocks and a length of three 7-bit bytes, with accents in it.
  const pd = { ...BASE, geo: 1234, note: 'Aguijón '.repeat(3000) };
  const r = F.read(datOf({ playerData: pd, sceneData: {} }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.pd, pd);
});

test('a save that is already JSON is read as it is; anything else is refused', () => {
  const json = new TextEncoder().encode('﻿' + JSON.stringify({ playerData: BASE }));
  assert.equal(F.read(json).ok, true);
  assert.deepEqual(F.read(new TextEncoder().encode('hello')), { ok: false, error: 'unreadable' });
  assert.deepEqual(F.read(new TextEncoder().encode('{"playerData":{"geo":3}}')), { ok: false, error: 'notSave' });
  const broken = datOf({ playerData: BASE });
  broken[40] ^= 0xff;
  assert.equal(F.read(broken).ok, false);
});

test('every entry, statue and charm has its playerData name', () => {
  for (const r of J.BOOK) {
    if (r.start || r.id === 'void-idol') continue;
    assert.ok(F.JOURNAL_PD[r.id], r.id);
  }
  for (const s of HG.STATUES) assert.ok(F.HALL_PD[s.id], s.id);
  const suffixes = Object.values(F.JOURNAL_PD);
  assert.equal(new Set(suffixes).size, suffixes.length);
});

test("the charm numbers are the game's: CHARM_NAME_<n> names the same charm", () => {
  const text = require('../kb/data/all_text.json').EN;
  for (const [n, id] of Object.entries(F.CHARM_OF_NUM)) {
    const c = D.CHARM_BY_ID[id];
    if (!c) continue;    // the five with two versions
    assert.equal(text['CHARM_NAME_' + n].replace(/’/g, "'"), c.en, n);
  }
});

test('a new game comes in as the base Knight with nothing found', () => {
  const snap = F.toSnapshot(BASE);
  assert.deepEqual(snap, { 'hollow.build': C.encode(C.PRESETS.base), 'hollow.owned': '[]' });
});

test('the build: upgrades, the swapped nail arts, the cloak and the charms in the order worn', () => {
  const pd = { ...BASE, nailSmithUpgrades: 4, maxHealthBase: 9, MPReserveMax: 99, charmSlots: 11,
    fireballLevel: 2, quakeLevel: 1, screamLevel: 2, hasCyclone: true, hasDashSlash: true, hasUpwardSlash: false,
    hasDreamNail: true, hasDash: true, hasShadowDash: true, grimmChildLevel: 4,
    gotCharm_6: true, gotCharm_25: true, fragileStrength_unbreakable: true, gotCharm_36: true, royalCharmState: 4,
    gotCharm_32: true, equippedCharms: [25, 6, 36, 32] };
  const st = F.build(pd, F.owned(pd));
  assert.deepEqual(st, C.normalize({ nail: 4, masks: 9, vessels: 3, notches: 11,
    spells: { vs: 2, dd: 1, hw: 2 }, arts: { cyclone: true, dash: false, great: true },
    charms: ['voidheart', 'ustrength', 'fury', 'quickslash'], dream: true, cloak: 2, grimm: 4 }));
});

test('the charms found: the two versions, the White Fragment and Carefree Melody', () => {
  const pd = { ...BASE, gotCharm_23: true, gotCharm_24: true, fragileGreed_unbreakable: true,
    gotCharm_36: true, royalCharmState: 2, gotCharm_40: true, grimmChildLevel: 5, gotCharm_1: true };
  assert.deepEqual(F.owned(pd).sort(), ['fheart', 'melody', 'swarm', 'ugreed']);
  assert.deepEqual(F.owned({ ...pd, royalCharmState: 3 }).sort(), ['fheart', 'kingsoul', 'melody', 'swarm', 'ugreed']);
  // A charm worn that it doesn't have (a broken save) doesn't go on.
  assert.deepEqual(F.build({ ...pd, equippedCharms: [2, 1] }, F.owned(pd)).charms, ['swarm']);
});

test('the Journal, the Hall and the lifeblood door', () => {
  const pd = { ...BASE,
    killedBuzzer: true, killsBuzzer: 12, killedCrawler: true, killsCrawler: 0,
    killedFalseKnight: true, killsFalseKnight: 0, killedMenderBug: false, killsMenderBug: 1,
    statueStateGruzMother: { completedTier1: true, completedTier2: true, completedTier3: false },
    statueStateFailedChampion: { completedTier1: false, completedTier2: false, completedTier3: false },
    bossDoorStateTier1: { completed: true, boundNail: true, boundSoul: true },
    bossDoorStateTier4: { completed: true, allBindings: true } };
  assert.deepEqual(F.journal(pd), { 'vengefly': 12, 'false-knight': 0 });
  assert.deepEqual(F.hall(pd), { 'gruz-mother': ['at', 'asra'] });
  assert.deepEqual(F.door(pd), { done: { master: ['nail', 'soul'], knight: ['nail', 'shell', 'charms', 'soul'] }, all: ['knight'] });
  const snap = F.toSnapshot(pd);
  assert.deepEqual(Object.keys(snap).sort(), ['hollow.bindings', 'hollow.build', 'hollow.hall', 'hollow.journal', 'hollow.owned', 'hollow.progress']);
  // The pantheons cleared are part of the 112%, not of the door (js/completion.js).
  assert.deepEqual(JSON.parse(snap['hollow.progress']).ids, ['pantheon-master', 'pantheon-knight']);
});

test("the preview's extras: time, completion, geo, Steel Soul and the pantheons completed", () => {
  const m = F.meta({ ...BASE, playTime: 3725.5, completionPercentage: 87, geo: 1200, permadeathMode: 2,
    bossDoorStateTier1: { completed: true }, bossDoorStateTier3: { completed: true, boundNail: true },
    bossDoorStateTier5: { completed: false, boundNail: false } });
  assert.deepEqual(m, { version: '', time: 3725.5, completion: 87, geo: 1200, steel: true, pantheons: ['master', 'sage'] });
  assert.equal(F.meta({ ...BASE, version: '1.5.78.11833' }).version, '1.5.78.11833');
  assert.equal(F.meta({ ...BASE, version: '<b>' }).version, '');
  assert.deepEqual(F.meta(BASE).pantheons, []);
});
