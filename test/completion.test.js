// js/completion.js: the 112%, counted from what a slot keeps.
'use strict';
const test = require('node:test');
const assert = require('node:assert');

require('../js/data.js');
const C = require('../js/codec.js');
const HJ = require('../js/hunter.js');
const CP = require('../js/completion.js');
const F = require('../js/savefile.js');

// The wiki's categories ("Completion (Hollow Knight)"), in its order, and what each is worth.
const WIKI = { bosses: 14, dreams: 7, colosseum: 3, charms: 36, equipment: 14, spells: 6, arts: 3, masks: 4,
  vessels: 3, nail: 4, dreamNail: 3, dreamers: 3, grimm: 6, hive: 1, godmaster: 5 };

// Every entry the 112% reads from the Journal, completed.
const JOURNAL_IDS = CP.CATEGORIES.flatMap((c) => c.items).filter((it) => it[1] === 'journal').map((it) => it[0])
  .concat(['grimm', 'nkg']);
const fullBook = () => Object.fromEntries(JOURNAL_IDS.map((id) => [id, 0]));

const count = (o) => CP.count({ build: C.PRESETS.base, owned: [], book: {}, progress: {}, ...o });
const cat = (r, id) => r.categories.find((c) => c.id === id);

test("the categories are the wiki's, and they add up to 112", () => {
  assert.equal(CP.TOTAL, 112);
  const r = count({});
  assert.deepEqual(Object.fromEntries(r.categories.map((c) => [c.id, c.max])), WIKI);
});

test('a new game is at 0%, and everything is 112%', () => {
  assert.equal(count({}).total, 0);
  const all = count({ build: C.PRESETS.max, owned: C.OWN_MAX, book: fullBook(), progress: { ids: CP.IDS } });
  // divine-* means the fragile one is away: with them the three fragile charms don't count.
  assert.equal(all.total, 112 - 3);
  const ids = CP.IDS.filter((id) => !id.startsWith('divine-'));
  assert.equal(count({ build: C.PRESETS.max, owned: C.OWN_MAX, book: fullBook(), progress: { ids } }).total, 112);
});

test('each piece of equipment is worth 2, and the cloaks come from the build', () => {
  const r = count({ build: { ...C.PRESETS.base, cloak: 1 }, progress: { ids: ['mantis-claw'] } });
  assert.equal(cat(r, 'equipment').got, 4);
  assert.equal(cat(count({ build: { ...C.PRESETS.base, cloak: 2 } }), 'equipment').got, 4);
});

test('masks, vessels, nail and spells count their steps', () => {
  const b = { ...C.PRESETS.base, masks: 7, vessels: 1, nail: 3, spells: { vs: 2, dd: 1, hw: 0 } };
  const r = count({ build: b });
  assert.deepEqual([cat(r, 'masks').got, cat(r, 'vessels').got, cat(r, 'nail').got, cat(r, 'spells').got], [2, 1, 3, 3]);
});

test('charms: any version counts once, and a fragile one with the Divine does not', () => {
  const owned = ['fheart', 'ugreed', 'voidheart', 'melody', 'dreamshield'];
  const r = count({ owned });
  assert.equal(cat(r, 'charms').got, 3);            // Fragile Heart, Unbreakable Greed, Void Heart
  assert.equal(cat(r, 'grimm').got, 2);             // Carefree Melody (Grimmchild's slot) and Dreamshield
  assert.equal(cat(count({ owned, progress: { ids: ['divine-heart'] } }), 'charms').got, 2);
});

test('bosses come from the Journal, except Hornet Sentinel', () => {
  const book = HJ.normalize({ 'false-knight': 0, 'hornet-protector': 0 });
  assert.equal(cat(count({ book }), 'bosses').got, 2);
  assert.equal(cat(count({ book, progress: { ids: ['hornet-sentinel'] } }), 'bosses').got, 3);
});

test('Grimm: Nightmare King or the banishment are the same point', () => {
  assert.equal(cat(count({ book: HJ.normalize({ nkg: 0 }) }), 'grimm').got, 1);
  assert.equal(cat(count({ progress: { ids: ['banishment'] } }), 'grimm').got, 1);
  assert.equal(cat(count({ book: HJ.normalize({ nkg: 0 }), progress: { ids: ['banishment'] } }), 'grimm').got, 1);
});

test('the progress key keeps only what it knows, once and in order', () => {
  assert.deepEqual(CP.normalize({ ids: ['lurien', 'nope', 'monomon', 'lurien'] }), { ids: ['monomon', 'lurien'] });
  assert.deepEqual(CP.normalize(null), { ids: [] });
});

// The Knight of a new game, as playerData carries it.
const BASE = { charmSlots: 3, maxHealthBase: 5, MPReserveMax: 0, nailSmithUpgrades: 0, grimmChildLevel: 0,
  fireballLevel: 0, quakeLevel: 0, screamLevel: 0, royalCharmState: 0, equippedCharms: [] };

test('a save brings its progress: equipment, Dreamers, Colosseum, pantheons, the Divine', () => {
  const pd = { ...BASE, hasWalljump: true, hasDoubleJump: true, monomonDefeated: true, colosseumBronzeCompleted: true,
    hornetOutskirtsDefeated: true, dreamNailUpgraded: true, destroyedNightmareLantern: true, hasGodfinder: true,
    bossDoorStateTier2: { completed: true }, bossDoorStateTier3: { completed: false },
    gaveFragileGreed: true, gaveFragileHeart: true, fragileHealth_unbreakable: true };
  assert.deepEqual(CP.fromSave(pd).ids, ['hornet-sentinel', 'mantis-claw', 'monarch-wings', 'dream-awakened',
    'monomon', 'trial-warrior', 'banishment', 'godtuner', 'pantheon-artist', 'divine-greed']);
  assert.equal(F.toSnapshot(pd)['hollow.progress'], JSON.stringify({ ids: CP.fromSave(pd).ids }));
});

test('a save counts what the game counts', () => {
  const pd = { ...BASE, maxHealthBase: 6, MPReserveMax: 33, fireballLevel: 1, hasDash: true, hasDreamNail: true,
    gotCharm_2: true, gotCharm_36: true, royalCharmState: 2,   // Kingsoul half-made: no point yet
    killedFalseKnight: true, killsFalseKnight: 0, hornetOutskirtsDefeated: true, lurienDefeated: true };
  const snap = F.toSnapshot(pd);
  const r = CP.count({ build: C.decode(snap['hollow.build']), owned: JSON.parse(snap['hollow.owned']),
    book: JSON.parse(snap['hollow.journal']), progress: JSON.parse(snap['hollow.progress']) });
  // mask 1 + vessel 1 + spell 1 + cloak 2 + Dream Nail 1 + compass 1 + False Knight 1 + Sentinel 1 + Lurien 1
  assert.equal(r.total, 10);
});
