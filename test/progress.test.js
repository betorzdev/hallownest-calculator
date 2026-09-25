// js/progress.js: what a game has beyond the Knight's numbers (a slot's hollow.progress).
'use strict';
const test = require('node:test');
const assert = require('node:assert');

require('../js/data.js');
const P = require('../js/progress.js');
const F = require('../js/savefile.js');
const R = require('../js/rooms.js');

// The Knight of a new game, as playerData carries it.
const BASE = { charmSlots: 3, maxHealthBase: 5, MPReserveMax: 0, nailSmithUpgrades: 0, grimmChildLevel: 0,
  fireballLevel: 0, quakeLevel: 0, screamLevel: 0, royalCharmState: 0, equippedCharms: [] };

test('it keeps only what it knows: ids once and in order, counts clamped, rooms by name', () => {
  assert.deepEqual(P.normalize({ ids: ['lurien', 'nope', 'monomon', 'lurien'],
    counts: { shards: 7, geo: -3, 'pale-ore': 2.4, nope: 5 }, bench: 'Town', shade: { scene: 'Fungus3_02', geo: 120 } }),
  { ids: ['monomon', 'lurien'], counts: { shards: 3, 'pale-ore': 2 }, bench: 'Town', shade: { scene: 'Fungus3_02', geo: 120 } });
  assert.deepEqual(P.normalize(null), { ids: [], counts: {}, bench: '', shade: null });
  assert.deepEqual(P.normalize({ bench: '<b>', shade: { scene: 'None', geo: 5 } }), { ids: [], counts: {}, bench: '', shade: null });
});

test('a save brings its progress: equipment, keys, Dreamers, Colosseum, pantheons, the Divine', () => {
  const pd = { ...BASE, hasWalljump: true, hasDoubleJump: true, monomonDefeated: true, colosseumBronzeCompleted: true,
    hornetOutskirtsDefeated: true, dreamNailUpgraded: true, destroyedNightmareLantern: true, hasGodfinder: true,
    hasLantern: true, usedWhiteKey: true, bossDoorStateTier2: { completed: true }, bossDoorStateTier3: { completed: false },
    gaveFragileGreed: true, gaveFragileHeart: true, fragileHealth_unbreakable: true };
  assert.deepEqual(P.fromSave(pd).ids, ['mantis-claw', 'monarch-wings', 'lumafly-lantern', 'elegant-key', 'dream-awakened',
    'hornet-sentinel', 'monomon', 'trial-warrior', 'banishment', 'godtuner', 'pantheon-artist', 'divine-greed']);
});

test('what you carry, your bench and your shade', () => {
  const pd = { ...BASE, geo: 2024, dreamOrbs: 2409, heartPieces: 2, vesselFragments: 1, ore: 1, rancidEggs: 3,
    simpleKeys: 0, trinket1: 4, trinket4: 1, bankerBalance: 500, respawnScene: 'GG_Atrium', shadeScene: 'Fungus3_02', geoPool: 750 };
  const p = P.fromSave(pd);
  assert.deepEqual(p.counts, { geo: 2024, essence: 2409, shards: 2, fragments: 1, 'pale-ore': 1, 'rancid-egg': 3,
    'wanderers-journal': 4, 'arcane-egg': 1, bank: 500 });
  assert.equal(p.bench, 'GG_Atrium');
  assert.deepEqual(p.shade, { scene: 'Fungus3_02', geo: 750 });
  assert.equal(R.areaOf(p.bench), 'godhome');
  assert.equal(R.areaOf(p.shade.scene), 'fog');
  // No shade: the game leaves "None" in its room.
  assert.equal(P.fromSave({ ...pd, shadeScene: 'None' }).shade, null);
  assert.equal(F.toSnapshot(pd)['hollow.progress'], JSON.stringify(p));
});

test('a new game has no progress key', () => {
  assert.equal(F.toSnapshot({ ...BASE, respawnScene: '', shadeScene: 'None' })['hollow.progress'], undefined);
  assert.equal(P.isEmpty({}), true);
});

test('marking by hand', () => {
  let p = P.toggle({}, 'mantis-claw');
  assert.equal(P.has(p, 'mantis-claw'), true);
  p = P.toggle(p, 'mantis-claw');
  assert.equal(P.has(p, 'mantis-claw'), false);
  assert.deepEqual(P.toggle({}, 'nope'), P.normalize({}));
  p = P.setCount({}, 'shards', 2);
  assert.equal(P.count(p, 'shards'), 2);
  assert.equal(P.count(P.setCount(p, 'shards', 9), 'shards'), 3);
});

test('every room a save can name has an area, and every area its two names', () => {
  for (const [id, a] of Object.entries(R.AREAS)) {
    assert.ok(a.es && a.en, id);
    assert.ok(!/[’]/.test(a.es + a.en), id);
  }
  for (const s of ['Town', 'Tutorial_01', 'Crossroads_47', 'Ruins1_29', 'Fungus1_16_alt', 'Deepnest_East_13', 'Room_Tram',
    'Room_Colosseum_02', 'Hive_03', 'Abyss_22', 'Waterways_02', 'White_Palace_01', 'GG_Atrium']) {
    assert.ok(R.AREAS[R.areaOf(s)], s);
  }
  assert.equal(R.areaOf('Nowhere_99'), '');
});
