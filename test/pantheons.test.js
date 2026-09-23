/* test/pantheons.test.js — the five Pantheons and the bindings.
   The structure is the wiki's: if someone moves a room or invents a fight, this fires
   before the timeline lies. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const foes = require('../js/enemies.js');
const P = require('../js/pantheons.js');

const kinds = (p) => {
  const t = { fight: 0, rest: 0, godseeker: 0 };
  for (const r of p.rooms) t[r.type] += 1;
  return t;
};

test('each pantheon has the rooms the wiki gives', () => {
  assert.deepEqual(P.PANTHEONS.map((p) => p.id), ['master', 'artist', 'sage', 'knight', 'hallownest']);
  for (const id of ['master', 'artist', 'sage', 'knight']) {
    const p = P.PANTHEON_BY_ID[id];
    assert.deepEqual(kinds(p), { fight: 10, rest: 1, godseeker: 1 }, id);
    // A rest in room 6 and the Godseeker in room 11 in all four: kb/ had it wrong for the Master.
    assert.equal(p.rooms[5].type, 'rest', `${id}: room 6 is a rest`);
    assert.equal(p.rooms[10].type, 'godseeker', `${id}: room 11 is the Godseeker`);
  }
  const h = P.PANTHEON_BY_ID.hallownest;
  assert.deepEqual(kinds(h), { fight: 42, rest: 7, godseeker: 4 });
  assert.deepEqual(h.rooms.map((r, i) => (r.type === 'rest' ? i + 1 : 0)).filter(Boolean), [12, 18, 24, 30, 37, 43, 50]);
});

test('every fight points to an entry that exists, and the final boss is the right one', () => {
  for (const p of P.PANTHEONS) {
    for (const r of p.rooms) {
      if (r.type !== 'fight') continue;
      assert.ok(foes.FOE_BY_ID[r.foe], `${p.id}: "${r.foe}" is no entry`);
      if (r.count !== undefined) assert.ok(Number.isInteger(r.count) && r.count > 1, `${p.id}/${r.foe}: count ${r.count}`);
      if (r.hp !== undefined) assert.ok(r.hp > 0, `${p.id}/${r.foe}: hp ${r.hp}`);
    }
  }
  const lastFoe = (id) => P.PANTHEON_BY_ID[id].rooms.at(-1).foe;
  assert.equal(lastFoe('master'), 'oro-mato');
  assert.equal(lastFoe('artist'), 'sheo');
  assert.equal(lastFoe('sage'), 'sly');
  assert.equal(lastFoe('knight'), 'pure-vessel');
  assert.equal(lastFoe('hallownest'), 'absolute-radiance');
});

test("Hallownest's rooms with their own variation", () => {
  const h = P.PANTHEON_BY_ID.hallownest.rooms;
  assert.equal(h[0].foe, 'vengefly-king');
  assert.equal(h[0].count, 2, 'room 1 is TWO Vengefly Kings');
  assert.equal(h[9].foe, 'brooding-mawlek');
  assert.equal(h[9].hp, 750, "Hallownest's Brooding Mawlek has 750, not 1050");
});

/* ── Bindings ───────────────────────────────────────────────────────────────
   The figures are those of the wiki's "Pantheons" page. */
require('../js/i18n.js');
require('../js/data.js');
const engine = require('../js/engine.js');
const codec = require('../js/codec.js');
const val = (st, bindings, id) =>
  engine.compute(codec.normalize(st), 'es', bindings ? { bindings } : undefined).stats[id].value;

test('Nail Binding: 4/7/10/13/13, and 6/10/15/20/20 with Strength', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((n) => val({ nail: n }, { nail: true }, 'nail.damage')), [4, 7, 10, 13, 13]);
  assert.deepEqual([0, 1, 2, 3, 4].map((n) => val({ nail: n, notches: 11, charms: ['ustrength'] }, { nail: true }, 'nail.damage')),
    [6, 10, 15, 20, 20]);
  // The arts go on the bound damage; Sharp Shadow, Thorns of Agony and Dreamshield, not.
  assert.equal(val({ nail: 4, arts: { great: true } }, { nail: true }, 'nail.greatSlash'), 32);
  assert.equal(val({ nail: 4, notches: 11, charms: ['sharpshadow'] }, { nail: true }, 'nail.sharpShadow'), 21);
});

test('Shell, Soul and Charms bindings', () => {
  assert.equal(val({ masks: 9 }, { shell: true }, 'health.masks'), 4);
  assert.equal(val({ masks: 9, notches: 11, charms: ['uheart'] }, { shell: true }, 'health.masks'), 6,
    "Shell Binding doesn't touch Lifeblood Heart's +2");
  // Joni's Blessing with Shell Binding: 7, and 10 with Lifeblood Heart (the wiki's "Joni's Blessing" page).
  assert.equal(val({ masks: 9, notches: 11, charms: ['joni'] }, { shell: true }, 'health.lifeblood'), 7);
  assert.equal(val({ masks: 9, notches: 11, charms: ['joni', 'uheart'] }, { shell: true }, 'health.lifeblood'), 10);
  assert.equal(val({ masks: 9, notches: 11, charms: ['joni'] }, {}, 'health.lifeblood'), 13, 'without Shell Binding, the formula');
  assert.equal(val({ vessels: 3 }, { soul: true }, 'soul.main'), 33);
  assert.equal(val({ vessels: 3 }, { soul: true }, 'soul.reserve'), 0);
  assert.equal(val({ notches: 11, charms: ['ustrength'] }, { charms: true }, 'nail.damage'), 5);
});

test('without bindings the sheet is exactly the usual one', () => {
  const builds = [{}, { nail: 4, masks: 9, vessels: 3, notches: 11, spells: { vs: 2, dd: 2, hw: 2 },
    arts: { cyclone: true, dash: true, great: true }, charms: ['ustrength', 'quickslash', 'fury', 'shaman'], hp: 1 }];
  for (const b of builds) {
    const a = engine.compute(codec.normalize(b), 'es');
    const c = engine.compute(codec.normalize(b), 'es', { bindings: {} });
    for (const id of Object.keys(a.stats)) assert.deepEqual(c.stats[id].value, a.stats[id].value, id);
  }
});

test('the Godhome health values that had gone wrong', () => {
  const g = (id) => [foes.FOE_BY_ID[id].at, foes.FOE_BY_ID[id].asra];
  assert.deepEqual(g('grimm'), [1000, 1300]);
  assert.deepEqual(g('nkg'), [1250, 1650], 'the Nightmare King is weaker in Godhome');
  assert.deepEqual(g('absolute-radiance'), [2181, 2181], "it has a statue and its health doesn't change");
});

test('the lifeblood door: 20 notches, opens with 8 and gives 3/4/5 germs with 8/12/16', () => {
  assert.equal(P.DOOR_NOTCHES, 20);
  assert.deepEqual([0, 7, 8, 11, 12, 15, 16, 20].map(P.lifeseedsFor), [0, 0, 3, 3, 4, 4, 5, 5]);
  assert.deepEqual(P.nextStep(0), { at: 8, seeds: 3 });
  assert.deepEqual(P.nextStep(9), { at: 12, seeds: 4 });
  assert.equal(P.nextStep(16), null);
});

test('each binding of each pantheon counts once, and "all four at once" counts all four', () => {
  let d = P.toggleBind({}, 'master', 'nail');
  d = P.toggleBind(d, 'master', 'nail');
  assert.equal(P.doorNotches(d), 0, 'marking twice removes it');
  d = P.toggleAll(d, 'knight');
  assert.equal(P.doorNotches(d), 4);
  assert.deepEqual(d.done.knight, P.BINDS);
  d = P.toggleBind(d, 'knight', 'soul');
  assert.deepEqual(d.all, [], 'removing one removes "at once"');
  assert.equal(P.doorNotches(d), 3);
  d = P.toggleAll(P.toggleAll(d, 'sage'), 'sage');
  assert.equal(P.doorNotches(d), 7, 'removing "at once" leaves all four marked');
  assert.deepEqual(P.normalizeDoor({ done: { master: ['nail', 'nail', 'x'], nobody: ['soul'] }, all: ['zote'] }),
    { done: { master: ['nail'] }, all: [] }, 'the unreadable is dropped');
});

test('the cocoon comes out as soon as the door opens, and goes if it closes', () => {
  let d = { done: { master: P.BINDS, artist: ['nail', 'shell', 'charms'] } };      // 7
  assert.equal(P.cocoonOf(d), 0);
  d = P.toggleBind(d, 'artist', 'soul');                                            // 8
  assert.equal(P.cocoonOf(d), 3);
  d = P.toggleAll(P.toggleAll(d, 'sage'), 'knight');                                // 16
  assert.equal(P.cocoonOf(d), 5);
  d = P.toggleBind(P.normalizeDoor({ done: { master: P.BINDS, artist: P.BINDS } }), 'master', 'nail');   // 7
  assert.equal(P.cocoonOf(d), 0);
});
