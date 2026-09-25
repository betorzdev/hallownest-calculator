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
  { ids: ['monomon', 'lurien'], counts: { shards: 3, 'pale-ore': 2 }, found: [], bench: 'Town', shade: { scene: 'Fungus3_02', geo: 120 }, gate: null, mapped: [] });
  assert.deepEqual(P.normalize(null), { ids: [], counts: {}, found: [], bench: '', shade: null, gate: null, mapped: [] });
  assert.deepEqual(P.normalize({ bench: '<b>', shade: { scene: 'None', geo: 5 } }), { ids: [], counts: {}, found: [], bench: '', shade: null, gate: null, mapped: [] });
  assert.deepEqual(P.normalize({ found: ['grub-crossroads-acid', 'nope', 'grub-crossroads-acid'] }).found, ['grub-crossroads-acid']);
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
  // On the game's map (js/map.js): the shade's and the Dreamgate's points, and the rooms drawn.
  const q = P.fromSave({ ...pd, shadeMapPos: { x: -4.757, y: 2.672, z: 0 }, hasDreamGate: true, dreamGateScene: 'Mines_05',
    dreamgateMapPos: { x: 5.86, y: 7.281, z: 0 }, scenesVisited: ['Town', 'Crossroads_02'], scenesMapped: ['Town', 'Crossroads_01', '<x>'] }, null);
  assert.deepEqual(q.shade, { scene: 'Fungus3_02', geo: 750, x: -4.757, y: 2.672 });
  assert.deepEqual(q.gate, { scene: 'Mines_05', x: 5.86, y: 7.281 });
  assert.deepEqual(q.mapped, ['Town', 'Crossroads_02', 'Crossroads_01']);
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

const CO = require('../js/collectibles.js');
const room = (sceneName, id, activated = true) => ({ sceneName, id, activated });

test("the catalogue: the wiki's totals, unique ids, and every room in an area", () => {
  const TOTAL = { 'grub': 46, 'mask-shard': 16, 'vessel-fragment': 9, 'pale-ore': 6, 'charm-notch': 8, 'simple-key': 4,
    'rancid-egg': 21, 'wanderers-journal': 14, 'hallownest-seal': 17, 'kings-idol': 8, 'arcane-egg': 4,
    'whispering-root': 15, 'grimmkin-flame': 10, 'map': 13, 'stag': 11 };
  assert.deepEqual(CO.KINDS, Object.keys(TOTAL));
  for (const [k, n] of Object.entries(TOTAL)) assert.equal(CO.ITEMS.filter((it) => it.kind === k).length, n, k);
  assert.equal(new Set(CO.ITEMS.map((it) => it.id)).size, CO.ITEMS.length);
  for (const it of CO.ITEMS) assert.ok(R.AREAS[R.areaOf(it.scene)], it.id + ' ' + it.scene);
});

test('a save says which collectibles you have', () => {
  const pd = { ...BASE, slyShellFrag1: true, dreamReward7: true, grubRewards: 16, collectorDefeated: true,
    scenesEncounteredDreamPlantC: ['Crossroads_07'], scenesFlameCollected: ['Fungus1_10'], mapGreenpath: true, openedCrossroads: true };
  const sd = { persistentBoolItems: [room('Crossroads_35', 'Grub Bottle'), room('Crossroads_05', 'Grub Bottle', false),
    room('Fungus1_36', 'Heart Piece'), room('Fungus1_13', 'Dream Plant')] };
  const f = new Set(P.detect(pd, sd));
  for (const id of ['grub-crossroads-acid', 'mask-shard-sly-1', 'mask-shard-seer', 'mask-shard-5-grubs', 'rancid-egg-grubs',
    'mask-shard-stone-sanctuary', 'whispering-root-crossroads', 'whispering-root-greenpath', 'grimmkin-flame-greenpath',
    'greenpath-map', 'crossroads-stag', 'grub-collector-1']) assert.ok(f.has(id), id);
  for (const id of ['grub-crossroads-center', 'hallownest-seal-grubs', 'mask-shard-sly-2']) assert.ok(!f.has(id), id);
  // After the ritual its nine flames were taken, whatever the list says; Brumm's is the banishment's.
  const flames = P.detect({ ...BASE, grimmChildLevel: 4 }, null).filter((id) => id.startsWith('grimmkin-flame'));
  assert.equal(flames.length, 9);
  assert.ok(!flames.includes('grimmkin-flame-brumm'));
  assert.deepEqual(P.fromSave({ ...pd, respawnScene: '', shadeScene: 'None' }, sd).found, P.detect(pd, sd));
});

test('a collectible marked by hand', () => {
  let p = P.toggleFound({}, 'grub-crossroads-acid');
  assert.equal(P.hasFound(p, 'grub-crossroads-acid'), true);
  p = P.toggleFound(p, 'grub-crossroads-acid');
  assert.equal(P.hasFound(p, 'grub-crossroads-acid'), false);
  assert.deepEqual(P.toggleFound({}, 'nope').found, []);
});
