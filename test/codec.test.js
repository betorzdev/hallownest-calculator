'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const codec = require('../js/codec.js');

test('encode: the base Knight only carries the version', () => {
  assert.equal(codec.encode(codec.DEFAULTS), 'v=1');
  assert.equal(codec.isEmpty('#v=1'), true);
  assert.equal(codec.isEmpty(''), true);
  assert.equal(codec.isEmpty('#nail=2'), false);
});

test('encode/decode: round trip of several builds', () => {
  const builds = [
    codec.DEFAULTS,
    codec.PRESETS.max,
    { nail: 2, masks: 7, vessels: 1, notches: 8, spells: { vs: 1, dd: 0, hw: 2 }, arts: { cyclone: true, dash: false, great: true },
      charms: ['fury', 'ustrength', 'voidheart'], hp: 1 },
    { charms: ['grimmchild', 'catcher', 'eater'], hp: 4 },
  ];
  for (const b of builds) {
    const n = codec.normalize(b);
    assert.deepEqual(codec.decode('#' + codec.encode(n)), n);
    assert.deepEqual(codec.decode(codec.encode(n)), n);
  }
  const s = codec.encode(codec.normalize(builds[2]));
  assert.equal(s, 'v=1&nail=2&masks=7&vessels=1&notches=8&spells=102&arts=101&charms=fury,ustrength,voidheart&hp=1');
});

test('decode: tolerates junk and clamps ranges', () => {
  const st = codec.decode('#v=1&nail=9&masks=-3&vessels=abc&notches=99&spells=9x&arts=1&charms=fury,,nada,fury,ustrength&hp=dead&loquesea=1');
  assert.equal(st.nail, 4);
  assert.equal(st.masks, 5, 'below the minimum it stays at the base 5');
  assert.equal(st.vessels, 0);
  assert.equal(st.notches, 11);
  assert.deepEqual(st.spells, { vs: 2, dd: 0, hw: 0 });
  assert.deepEqual(st.arts, { cyclone: true, dash: false, great: false });
  assert.deepEqual(st.charms, ['fury', 'ustrength']);
  assert.equal(st.hp, 0, 'unreadable health is full health');
  assert.deepEqual(codec.decode('¿¿¿'), codec.normalize({}));
});

test('normalize: mutually exclusive charms, the last one wins', () => {
  assert.deepEqual(codec.normalize({ charms: ['fstrength', 'ustrength'] }).charms, ['ustrength']);
  assert.deepEqual(codec.normalize({ charms: ['ustrength', 'fstrength'] }).charms, ['fstrength']);
  assert.deepEqual(codec.normalize({ charms: ['grimmchild', 'fury', 'melody'] }).charms, ['fury', 'melody']);
  assert.deepEqual(codec.normalize({ charms: ['kingsoul', 'voidheart'] }).charms, ['voidheart']);
});

test("charmAction/toggleCharm: the game's notch rules", () => {
  const st = codec.normalize({ notches: 5, charms: ['ustrength'] });   // 3 used, 2 free
  assert.deepEqual(codec.charmAction(st, 'ustrength'), { action: 'unequip' });
  assert.equal(codec.charmAction(st, 'compass').action, 'equip');
  assert.equal(codec.charmAction(st, 'compass').overcharm, false);
  // It costs more than what's free but at least one notch remains: allowed, overcharmed.
  assert.equal(codec.charmAction(st, 'eater').overcharm, true);
  const over = codec.toggleCharm(st, 'eater');
  assert.deepEqual(over.charms, ['ustrength', 'eater']);
  // Overcharmed: nothing more can be equipped, except the 0-notch ones.
  assert.equal(codec.charmAction(over, 'compass').action, 'blocked');
  assert.equal(codec.charmAction(over, 'compass').reason.es, 'Ya estás sobrecargado');
  assert.equal(codec.toggleCharm(over, 'compass'), null);
  assert.equal(codec.charmAction(over, 'voidheart').action, 'equip');
  // With 0 free without being overcharmed.
  const full = codec.normalize({ notches: 3, charms: ['ustrength'] });
  assert.equal(codec.charmAction(full, 'compass').reason.es, 'No te quedan muescas libres');
  // Swap within a group: counted without the partner.
  assert.equal(codec.charmAction(full, 'fstrength').action, 'swap');
  assert.deepEqual(codec.toggleCharm(full, 'fstrength').charms, ['fstrength']);
  // Removing is always allowed.
  assert.deepEqual(codec.toggleCharm(over, 'eater').charms, ['ustrength']);
});

test('set: changes upgrades and health without touching the rest', () => {
  const st = codec.normalize({ charms: ['fury'] });
  const a = codec.set(st, 'nail', 4);
  assert.equal(a.nail, 4);
  assert.deepEqual(a.charms, ['fury']);
  assert.equal(codec.set(st, 'spells.vs', 2).spells.vs, 2);
  assert.equal(codec.set(st, 'hp', 1).hp, 1);
  assert.equal(codec.set(st, 'hp', 'zzz').hp, 0);
  assert.equal(st.nail, 0, "doesn't mutate the original");
});

test('abilities: by default, everything acquired; in the URL only what is missing', () => {
  const old = codec.decode('#v=1&nail=4&charms=sharpshadow,wielder');
  assert.equal(old.dream, true, 'an older link carries the Dream Nail');
  assert.equal(old.cloak, 2, 'and the Shade Cloak');
  assert.equal(old.grimm, 4, 'and Grimmchild at phase 4');
  const st = codec.normalize({ dream: false, cloak: 1, grimm: 2 });
  assert.equal(codec.encode(st), 'v=1&dream=0&cloak=1&grimm=2');
  assert.deepEqual(codec.decode(codec.encode(st)), st);
  const bad = codec.decode('#cloak=7&grimm=0&dream=0');
  assert.equal(bad.cloak, 2);
  assert.equal(bad.grimm, 1);
  assert.equal(bad.dream, false);
  assert.equal(codec.set(codec.DEFAULTS, 'dream', 0).dream, false, "the Dream Nail's button sends 0 or 1");
});

test("the base Knight is a new game's; Grimmchild's phase 4 needs the Dream Nail", () => {
  const b = codec.normalize(codec.PRESETS.base);
  assert.equal(b.nail, 0); assert.equal(b.masks, 5); assert.equal(b.vessels, 0); assert.equal(b.notches, 3);
  assert.deepEqual(b.charms, []);
  assert.equal(b.dream, false, 'you start without the Dream Nail');
  assert.equal(b.cloak, 0, 'and without a cloak');
  assert.equal(codec.normalize({ dream: false, grimm: 4 }).grimm, 3);
  assert.equal(codec.normalize({ dream: true, grimm: 4 }).grimm, 4);
});

test('collection: in each two-version slot, at most one', () => {
  assert.deepEqual(codec.OWN_SLOTS.map((x) => x.states.join('/')),
    ['fheart/uheart', 'fgreed/ugreed', 'fstrength/ustrength', 'kingsoul/voidheart', 'grimmchild/melody']);
  let l = codec.ownSet(['fury', 'fheart'], 'heart', 'uheart');
  assert.deepEqual(l, ['fury', 'uheart'], 'replaces the other one');
  l = codec.ownSet(l, 'heart', null);
  assert.deepEqual(l, ['fury'], 'null: none');
  assert.deepEqual(codec.ownSet(l, 'heart', 'kingsoul'), ['fury'], "one from another slot doesn't change anything");
  assert.deepEqual(codec.ownNormalize(['fheart', 'fury', 'uheart', 'nada', 'fury']), ['fury', 'uheart']);
  assert.deepEqual(codec.ownNormalize(['kingsoul', 'voidheart']), ['voidheart']);
  assert.equal(codec.ownEquippable(['uheart'], 'uheart'), true);
  assert.equal(codec.ownEquippable(['uheart'], 'fheart'), false);
});

test('collection: Everything maxed is the end of the game', () => {
  const max = codec.OWN_MAX;
  assert.equal(max.length, 40, "one per game slot");
  for (const id of ['uheart', 'ugreed', 'ustrength', 'voidheart', 'grimmchild']) assert.ok(max.includes(id), id);
  for (const id of ['fheart', 'fgreed', 'fstrength', 'kingsoul', 'melody']) assert.ok(!max.includes(id), id);
  assert.deepEqual(codec.ownNormalize(max), [...max]);
});

test('a link with a broken "%" reads the same, without that pair', () => {
  let st;
  assert.doesNotThrow(() => { st = codec.decode('#v=1&charms=%E0&nail=3'); });
  assert.equal(st.nail, 3);
  assert.doesNotThrow(() => codec.decode('#nail=2&%zz=1&masks=%'));
});
