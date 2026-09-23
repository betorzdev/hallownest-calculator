'use strict';
// The arena's rules (js/fight.js), charm by charm: design/04-charms-in-combat.md §3.3 and §3.4.
// The numbers come from the real sheet (js/engine.js) with the "Everything maxed" build.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../js/engine.js');
const codec = require('../js/codec.js');
const D = require('../js/data.js');
const FT = require('../js/fight.js');

const build = (charms = [], o = {}) => codec.normalize({ ...codec.PRESETS.max, charms, ...o });
const baseSheet = (b) => engine.compute(b, 'es');
const liveSheet = (b, f) => engine.compute(b, 'es', { fight: FT.health(f) });

/* A test fight: your side at the build's full health, and a 500 target. */
function arena(charms = [], o = {}) {
  const b = build(charms, o);
  const f = FT.reset({ melody: 0 }, baseSheet(b), null);
  const target = { hp: 500, max: 500, name: { es: 'Blanco', en: 'Target' } };
  const ctx = { target, targetIsMinion: false, radiant: false, foe: {}, phase: 0, tab: 'combat', joniMax: 0, fragile: [] };
  const run = (action, extra = {}) => {
    const sh = liveSheet(b, f);
    const c = { ...ctx, ...extra, stats: sh.stats, joniMax: sh.joniLifeblood || 0, has: (id) => b.charms.includes(id),
                fragile: b.charms.filter((id) => D.CHARM_BY_ID[id] && D.CHARM_BY_ID[id].fragile) };
    return FT.apply(f, action, c);
  };
  const kinds = (evs) => evs.map((e) => e.kind);
  return { b, f, target, run, kinds };
}
const hit = (n = 1, negated = false) => ({ type: 'foeHit', dmg: n, label: 'Golpe', negated });

test("reset: the sheet's full health, and whatever comes from a previous room", () => {
  const { f } = arena(['lbheart', 'baldur']);
  assert.deepEqual([f.masks, f.lbJoni, f.lbCharm, f.lbCocoon, f.soul, f.shell], [9, 0, 2, 0, 99, 4]);
  assert.equal(f.focusing, false);
  const g = FT.reset({ melody: 3 }, baseSheet(build()), { masks: 4, lbJoni: 0, lbCharm: 1, lbCocoon: 2, soul: 40, shell: 2, elegyHalted: true });
  assert.deepEqual([g.masks, g.lbCharm, g.lbCocoon, g.soul, g.shell, g.elegyHalted, g.melody], [4, 1, 2, 40, 2, true, 3]);
  assert.equal(FT.total(g), 7);
  // clamp: the build changes midway and the caps drop.
  FT.clamp(g, baseSheet(build([], { masks: 5 })));
  assert.deepEqual([g.masks, g.lbCharm, g.shell], [4, 0, 0]);
});

test("the usual: nail hit, spell, heal, enemy hit in pile order, Radiant", () => {
  const a = arena(['lbheart']);
  const { f, target, run, kinds } = a;
  let evs = run({ type: 'strike' });
  assert.equal(target.hp, 479);
  assert.equal(f.soul, 105);          // with the meter full, the hit gives the reserve's figure: 99 + 6
  assert.deepEqual(kinds(evs), ['hit']);
  assert.equal(evs[0].move, 'nail');
  assert.equal(f.hits, 1);
  evs = run({ type: 'spell', key: 'hw' });
  assert.equal(f.soul, 72);
  assert.equal(target.hp, 479 - 80);
  f.lbCocoon = 3;
  evs = run(hit(4));
  assert.deepEqual([f.lbCocoon, f.lbCharm, f.masks], [0, 1, 9]);
  assert.deepEqual(kinds(evs), ['take']);
  assert.equal(evs[0].left, 10);
  run(hit(2));
  assert.deepEqual([f.lbCharm, f.masks], [0, 8]);
  evs = run({ type: 'focus' });
  assert.deepEqual([f.masks, f.soul, f.focusing, f.healed], [9, 39, true, 1]);
  assert.deepEqual(kinds(evs), ['focus']);
  evs = run(hit(1), { radiant: true });
  assert.equal(FT.alive(f), false);
  assert.deepEqual(kinds(evs), ['radiant']);
});

test('falling: the "You fell" line and the fragile charms that break', () => {
  const a = arena(['fstrength', 'uheart']);
  let evs = a.run(hit(20));
  assert.deepEqual(a.kinds(evs), ['down', 'fragile']);
  assert.deepEqual(evs[1].ids, ['fstrength']);
  // Against a dream boss or outside the Combat tab, they don't break.
  const b = arena(['fstrength']);
  assert.deepEqual(b.kinds(b.run(hit(20), { foe: { dream: true } })), ['down']);
  const c = arena(['fstrength']);
  assert.deepEqual(c.kinds(c.run(hit(20), { tab: 'hall' })), ['down']);
});

test("killing a minion gives soul and replaces the hit's line", () => {
  const a = arena();
  a.f.soul = 10;
  a.target.hp = 5; a.target.max = 15;
  const evs = a.run({ type: 'strike' }, { targetIsMinion: true });
  assert.deepEqual(a.kinds(evs), ['minion']);
  assert.equal(a.f.soul, 10 + 11 + 11);
  assert.equal(a.f.dealt, 0);
});

test('Thorns of Agony: base nail on taking a hit, no soul, also when it is stopped', () => {
  const a = arena(['thorns', 'fstrength']);
  a.f.soul = 0;
  let evs = a.run(hit(1));
  assert.deepEqual(a.kinds(evs), ['take', 'thorns']);
  assert.equal(a.target.hp, 479);       // 21, not 32: Strength doesn't raise Thorns of Agony
  assert.equal(a.f.soul, 0);
  // Carefree Melody negates the hit and Thorns of Agony fires all the same.
  const m = arena(['thorns', 'melody']);
  evs = m.run(hit(1, true));
  assert.deepEqual(m.kinds(evs), ['negated', 'thorns']);
  assert.equal(m.f.masks, 9);
  assert.equal(m.target.hp, 479);
  // Baldur Shell absorbs and Thorns of Agony fires all the same.
  const b = arena(['thorns', 'baldur']);
  b.f.masks = 8;
  b.run({ type: 'focus' });
  evs = b.run(hit(1));
  assert.deepEqual(b.kinds(evs), ['shell', 'focusLost', 'thorns']);
  assert.equal(b.target.hp, 479);
  // Dead, no thorns.
  const d = arena(['thorns']);
  assert.deepEqual(d.kinds(d.run(hit(9))), ['down']);
});

test('Grubsong: 15 soul only with real damage, 25 with Elegy', () => {
  const a = arena(['grubsong']);
  a.f.soul = 0;
  assert.deepEqual(a.kinds(a.run(hit(1))), ['take', 'grubsong']);
  assert.equal(a.f.soul, 15);
  const e = arena(['grubsong', 'elegy']);
  e.f.soul = 0;
  e.run(hit(1));
  assert.equal(e.f.soul, 25);
  // Neither negated by Carefree Melody nor absorbed by Baldur Shell.
  const m = arena(['grubsong', 'melody']);
  m.f.soul = 0;
  m.run(hit(1, true));
  assert.equal(m.f.soul, 0);
  const b = arena(['grubsong', 'baldur']);
  b.f.masks = 8; b.f.soul = 33;
  b.run({ type: 'focus' });
  b.run(hit(1));
  assert.equal(b.f.soul, 0);
});

test('Baldur Shell: absorbs up to 4 hits while focusing, but the heal is lost all the same', () => {
  const a = arena(['baldur']);
  const { f, run, kinds } = a;
  f.masks = 5; f.soul = 99;
  run({ type: 'focus' });
  assert.deepEqual([f.masks, f.soul, f.focusing], [6, 66, true]);
  let evs = run(hit(1));
  assert.deepEqual(kinds(evs), ['shell', 'focusLost']);
  assert.deepEqual([f.masks, f.soul, f.shell, f.focusing], [5, 66, 3, false]);
  assert.equal(evs[1].soul, 33);
  // Outside the window, the shell doesn't cover.
  evs = run(hit(1));
  assert.deepEqual(kinds(evs), ['take']);
  assert.deepEqual([f.masks, f.shell], [4, 3]);
  // Your next action closes the window: the hit after it is normal.
  run({ type: 'focus' }); run({ type: 'strike' });
  assert.equal(f.focusing, false);
  assert.deepEqual(kinds(run(hit(1))), ['take']);
  // "Done" closes it too.
  run({ type: 'focus' }); run({ type: 'focusDone' });
  assert.deepEqual(kinds(run(hit(1))), ['take']);
  // With the shell broken, the hit deals damage and the heal is lost.
  f.shell = 0; f.masks = 5;
  run({ type: 'focus' });
  evs = run(hit(1));
  assert.deepEqual(kinds(evs), ['take', 'focusLost']);
  assert.equal(f.masks, 4);
  // Without Baldur Shell the window exists all the same: it's what the charm buys.
  const n = arena([]);
  n.f.masks = 5;
  n.run({ type: 'focus' });
  assert.deepEqual(n.kinds(n.run(hit(1))), ['take', 'focusLost']);
  assert.equal(n.f.masks, 4);
});

test('Carefree Melody: the counter rises with each hit and returns to 0 on negating', () => {
  const a = arena(['melody']);
  assert.equal(FT.melodyChance(a.f), 0);
  a.run(hit(1)); a.run(hit(1)); a.run(hit(1));
  assert.equal(a.f.melody, 3);
  assert.equal(FT.melodyChance(a.f), 30.3);
  a.run(hit(1, true));
  assert.deepEqual([a.f.melody, a.f.masks], [0, 6]);
  for (let i = 0; i < 9; i++) a.run(hit(0));
  assert.equal(FT.melodyChance(a.f), 90.9);
  // Without Carefree Melody, "negated" doesn't exist: it's a normal hit.
  const n = arena([]);
  n.run(hit(1, true));
  assert.equal(n.f.masks, 8);
  assert.equal(n.f.melody, 0);
});

test("Fury and Elegy follow the fight's health", () => {
  const a = arena(['fury', 'elegy']);
  const { f, target, run, kinds } = a;
  let evs = run({ type: 'strike' });
  assert.deepEqual(kinds(evs), ['hit', 'elegy']);
  assert.equal(target.hp, 500 - 21 - 10);
  run(hit(1));
  evs = run({ type: 'strike' });
  assert.deepEqual(kinds(evs), ['hit']);            // without full health there's no beam
  f.masks = 1;
  evs = run({ type: 'strike' });
  assert.deepEqual(kinds(evs), ['hit', 'elegy']);   // at 1 mask with Fury: red beam
  assert.deepEqual([evs[0].n, evs[1].n], [37, 15]);
  f.lbCocoon = 2;
  evs = run({ type: 'strike' });
  assert.deepEqual(kinds(evs), ['hit']);            // lifeblood on top: Fury stays, Elegy doesn't
  assert.equal(evs[0].n, 37);
});

test("Joni's Blessing: her masks go after Lifeblood Heart, Fury with the last one, Elegy switches off at the first hit", () => {
  const a = arena(['joni', 'lbheart', 'fury', 'elegy']);
  const { f, run } = a;
  assert.deepEqual([f.masks, f.lbJoni, f.lbCharm], [0, 13, 2]);
  assert.deepEqual(a.kinds(run({ type: 'strike' })), ['hit', 'elegy']);
  run(hit(3));
  assert.deepEqual([f.lbCharm, f.lbJoni, f.elegyHalted], [0, 12, true]);
  assert.deepEqual(a.kinds(run({ type: 'strike' })), ['hit']);
  f.lbJoni = 1;
  assert.equal(run({ type: 'strike' })[0].n, 37);
  run(hit(1));
  assert.equal(FT.alive(f), false);
});

test('Spore Shroom: a cloud when focusing, with a 4.25 s cooldown or until taking damage', () => {
  const a = arena(['spore', 'crest']);
  const { f, target, run, kinds } = a;
  f.masks = 5; f.soul = 99;
  let evs = run({ type: 'focus' });
  assert.deepEqual(kinds(evs), ['focus', 'spore']);
  assert.equal(target.hp, 460);
  assert.equal(f.sporeAt, 4.25);
  evs = run({ type: 'focus' });
  assert.deepEqual(kinds(evs), ['focus']);          // clock at 1.141: not yet
  run(hit(1));
  evs = run({ type: 'focus' });
  assert.deepEqual(kinds(evs), ['focus', 'spore']); // the damage makes it ready
});

test('Shadow Dash, Dream Nail and weaverlings', () => {
  const a = arena(['sharpshadow', 'dashmaster', 'weaversong', 'grubsong', 'wielder']);
  const { f, target, run, kinds } = a;
  f.soul = 0;
  assert.deepEqual(kinds(run({ type: 'dash' })), ['dash']);
  assert.deepEqual([target.hp, f.soul], [468, 0]);        // 32 and no soul
  assert.deepEqual(kinds(run({ type: 'dream' })), ['dream']);
  assert.equal(f.soul, 66);
  assert.deepEqual(kinds(run({ type: 'dream' }, { foe: { dreamNail: false } })), ['dreamNo']);
  assert.deepEqual(kinds(run({ type: 'dream' }, { foe: { dreamNail: { fromPhase: 3 } }, phase: 2 })), ['dreamNo']);
  assert.deepEqual(kinds(run({ type: 'dream' }, { foe: { dreamNail: { fromPhase: 3 } }, phase: 3 })), ['dream']);
  f.soul = 0;
  const evs = run({ type: 'weavers' });
  assert.deepEqual(kinds(evs), ['weavers', 'weaversSoul']);
  assert.deepEqual([target.hp, f.soul, evs[0].bites], [459, 9, 3]);
  const w = arena(['weaversong']);
  w.f.soul = 0;
  assert.deepEqual(w.kinds(w.run({ type: 'weavers' })), ['weavers']);
  assert.equal(w.f.soul, 0);
});

test('Stalwart Shell: the invulnerability and the swings that fit in it', () => {
  const a = arena(['stalwart']);
  let evs = a.run(hit(1));
  assert.deepEqual(a.kinds(evs), ['take', 'iframes']);
  assert.deepEqual([evs[1].s, evs[1].hits], [1.75, 4]);
  const q = arena(['stalwart', 'quickslash']);
  assert.equal(q.run(hit(1))[1].hits, 6);
  assert.deepEqual(arena([]).kinds(arena([]).run(hit(1))), ['take']);
});

test("clock: each action lasts what the sheet says; enemy attacks, nothing", () => {
  const a = arena(['glory']);
  const { f, run } = a;
  run({ type: 'strike' });
  assert.ok(Math.abs(f.clock - 0.41) < 1e-9);
  run({ type: 'art', key: 'great' });
  assert.ok(Math.abs(f.clock - 1.16) < 1e-9);
  run({ type: 'spell', key: 'vs' });
  assert.ok(Math.abs(f.clock - 1.16) < 1e-9);       // 0 s: the wiki doesn't document it
  run(hit(1));
  assert.ok(Math.abs(f.clock - 1.16) < 1e-9);
  f.masks = 5;
  run({ type: 'focus' });
  assert.ok(Math.abs(f.clock - (1.16 + 0.25 + 0.891)) < 1e-9);
  run({ type: 'wait', s: 2 });
  assert.ok(Math.abs(f.clock - (1.16 + 1.141 + 2)) < 1e-9);
  const q = arena(['quickslash']);
  q.run({ type: 'strike' });
  assert.ok(Math.abs(q.f.clock - 0.28) < 1e-9);
});

test('Kingsoul, Grimmchild and Glowing Womb run with the clock', () => {
  const k = arena(['kingsoul']);
  k.f.soul = 0;
  k.run({ type: 'wait', s: 3 });
  assert.equal(k.f.soul, 4);
  assert.deepEqual(k.kinds(k.run({ type: 'wait', s: 1 })), ['wait', 'kingsoul']);
  assert.equal(k.f.soul, 8);
  const g = arena(['grimmchild']);
  let evs = g.run({ type: 'wait', s: 3.6 });
  assert.deepEqual(g.kinds(evs), ['wait', 'grimmchild']);
  assert.deepEqual([evs[1].n, evs[1].ticks, g.target.hp], [22, 2, 478]);
  const w = arena(['womb']);
  w.f.soul = 12;
  evs = w.run({ type: 'wait', s: 8 });
  assert.deepEqual(w.kinds(evs), ['wait', 'womb']);
  assert.deepEqual([w.f.soul, w.target.hp, evs[1].ticks], [4, 491, 1]);   // only one hatchling: there's no soul for the second
  assert.deepEqual(w.kinds(w.run({ type: 'wait', s: 4 })), ['wait']);
});

test('Hiveblood: gives back the last mask after 10 s without damage; damage restarts it and healing cancels it', () => {
  const a = arena(['hiveblood']);
  const { f, run, kinds } = a;
  run(hit(2));
  assert.equal(f.masks, 7);
  run({ type: 'wait', s: 10 });
  assert.equal(f.masks, 8);                        // an attack of 2 only gives back 1
  assert.deepEqual(kinds(run({ type: 'wait', s: 10 })), ['wait']);
  run(hit(1)); run({ type: 'wait', s: 6 }); run(hit(1));
  assert.deepEqual(kinds(run({ type: 'wait', s: 6 })), ['wait']);   // the second hit restarted the count
  assert.deepEqual(kinds(run({ type: 'wait', s: 4 })), ['wait', 'hiveblood']);
  assert.equal(f.masks, 7);
  run(hit(1)); f.soul = 99;
  run({ type: 'focus' });                          // Focus cancels the regeneration
  assert.deepEqual(kinds(run({ type: 'wait', s: 10 })), ['wait']);
  // With Joni's Blessing it regenerates hers, in 20 s.
  const j = arena(['hiveblood', 'joni']);
  j.run(hit(1));
  assert.equal(j.f.lbJoni, 12);
  assert.deepEqual(j.kinds(j.run({ type: 'wait', s: 10 })), ['wait']);
  assert.deepEqual(j.kinds(j.run({ type: 'wait', s: 10 })), ['wait', 'hiveblood']);
  assert.equal(j.f.lbJoni, 13);
});

test('entries: the arena flags only where they belong (Void Heart, Dream Nail, dream bosses)', () => {
  const F = require('../js/enemies.js');
  const by = F.FOE_BY_ID;
  assert.deepEqual(F.FOES.filter((x) => x.void).map((x) => x.id).sort(), ['sibling', 'void-tendrils']);
  assert.equal(by['pure-vessel'].dreamNail, false);
  assert.deepEqual(by['hollow-knight'].dreamNail, { fromPhase: 3 });
  assert.equal(by['hollow-knight'].phases.length, 4);
  assert.deepEqual(F.FOES.filter((x) => x.dream).map((x) => x.id).sort(),
    ['elder-hu', 'failed-champion', 'galien', 'gorb', 'grey-prince-zote', 'lost-kin', 'markoth', 'marmu', 'nkg', 'no-eyes', 'soul-tyrant', 'white-defender', 'xero']);
  // Vengeful Spirit hits twice whoever recoils (the wiki and kb/03-bosses.md) and Xero, who moves with the projectile.
  assert.deepEqual(F.FOES.filter((x) => x.spellTwice).map((x) => x.id).sort(),
    ['broken-vessel', 'failed-champion', 'lost-kin', 'xero']);
  assert.deepEqual(F.FOES.filter((x) => x.noFlukes).map((x) => x.id).sort(), ['hollow-knight', 'pure-vessel']);
  for (const x of F.FOES) {
    assert.ok(x.dreamNail === undefined || x.dreamNail === false || Number.isInteger(x.dreamNail.fromPhase), x.id);
    assert.ok(x.dream === undefined || x.dream === true, x.id);
    assert.ok(x.void === undefined || x.void === true, x.id);
  }
});

test('Dreamshield: stops the projectiles on its list without anything touching you, hits for base nail and breaks for 2 s', () => {
  const { f, target, run, kinds } = arena(['dreamshield', 'thorns', 'melody', 'ustrength']);
  f.masks = 8;
  run({ type: 'focus' });
  assert.equal(f.focusing, true);
  let evs = run({ type: 'foeHit', dmg: 2, label: 'Orbe', blocked: true });
  assert.deepEqual(kinds(evs), ['blocked']);
  assert.deepEqual([f.masks, f.melody, target.hp, f.focusing], [9, 0, 500, true], 'no damage, no Thorns of Agony, no Carefree Melody, no lost heal');
  assert.equal(FT.shieldReady(f), false);
  // Broken, "blocked" is a normal hit: damage, the heal is lost and Thorns of Agony fires.
  evs = run({ type: 'foeHit', dmg: 1, label: 'Orbe', blocked: true });
  assert.deepEqual(kinds(evs), ['take', 'focusLost', 'thorns']);
  assert.deepEqual([f.masks, f.melody, target.hp], [7, 1, 479], 'Thorns of Agony: base nail, not 32 with Strength');
  // It comes back after 2 s on the clock.
  run({ type: 'wait', s: 2 });
  assert.equal(FT.shieldReady(f), true);
  // The "Dreamshield" action: base nail (21, not 32 with Strength), no soul, and it breaks.
  const soul = f.soul;
  evs = run({ type: 'shield' });
  assert.deepEqual(kinds(evs), ['shield']);
  assert.deepEqual([evs[0].n, target.hp, f.soul, FT.shieldReady(f)], [21, 458, soul, false]);
  // On Radiant too: the hit that doesn't land doesn't kill.
  run({ type: 'wait', s: 2 });
  evs = run({ type: 'foeHit', dmg: 1, label: 'Orbe', blocked: true }, { radiant: true });
  assert.deepEqual(kinds(evs), ['blocked']);
  assert.equal(FT.alive(f), true);
  // Without the charm, "blocked" is nothing: a normal hit.
  const b = arena(['thorns']);
  assert.deepEqual(b.kinds(b.run({ type: 'foeHit', dmg: 1, label: 'Orbe', blocked: true })), ['take', 'thorns']);
});

test("entries: proj marks the projectiles for Dreamshield with the wiki's two lists", () => {
  const F = require('../js/enemies.js');
  let n = 0; const bosses = new Set();
  for (const x of F.FOES) for (const a of x.attacks || []) if (a.proj) {
    assert.ok(['block', 'pierce'].includes(a.proj), x.id + ': ' + a.en);
    assert.equal(x.kind, 'boss', x.id);
    n += 1; bosses.add(x.id);
  }
  assert.equal(n, 68); assert.equal(bosses.size, 38);
  const proj = (id, en) => F.FOE_BY_ID[id].attacks.find((a) => a.en === en).proj;
  assert.equal(proj('grimm', 'Fire Bats'), 'block');
  assert.equal(proj('grimm', 'Pufferfish'), 'pierce', "the fireballs pierce; the bats don't");
  assert.equal(proj('the-radiance', 'Sword Burst'), 'pierce');
  assert.equal(proj('dung-defender', 'Dung Toss'), 'block');
  assert.equal(proj('pure-vessel', 'Soul Daggers'), 'pierce');
  assert.equal(proj('xero', 'Nail Cast'), 'pierce', "everything from the Dream Warriors pierces");
  assert.equal(proj('false-knight', 'Slam'), undefined, "the slam isn't a projectile");
});

test("nextTick: the first thing that will happen with the clock, and nothing if there are no passives", () => {
  const ctxOf = (a) => {
    const sh = liveSheet(a.b, a.f);
    return { target: a.target, stats: sh.stats, joniMax: sh.joniLifeblood || 0, has: (id) => a.b.charms.includes(id) };
  };
  assert.equal(FT.nextTick(arena([]).f, ctxOf(arena([]))), null);
  const k = arena(['kingsoul', 'grimmchild']);
  assert.deepEqual(FT.nextTick(k.f, ctxOf(k)), { s: 1.8, charm: 'grimmchild' });
  k.run({ type: 'wait', s: 1.8 });
  const t2 = FT.nextTick(k.f, ctxOf(k));
  assert.equal(t2.charm, 'kingsoul');
  assert.ok(Math.abs(t2.s - 0.2) < 1e-9);
  // With no living target Grimmchild doesn't count; with no soul for the hatchling, Glowing Womb doesn't either.
  k.target.hp = 0;
  assert.equal(FT.nextTick(k.f, ctxOf(k)).charm, 'kingsoul');
  const w = arena(['womb']);
  w.f.soul = 5;
  assert.equal(FT.nextTick(w.f, ctxOf(w)), null);
  w.f.soul = 8;
  assert.equal(FT.nextTick(w.f, ctxOf(w)).s, 4);
  // Hiveblood only with a lost mask; Spore Shroom, only on cooldown.
  const h = arena(['hiveblood', 'spore']);
  assert.equal(FT.nextTick(h.f, ctxOf(h)), null);
  h.run(hit(1));
  assert.deepEqual(FT.nextTick(h.f, ctxOf(h)), { s: 10, charm: 'hiveblood' });
  h.f.masks = 5;
  h.run({ type: 'focus' });
  const t3 = FT.nextTick(h.f, ctxOf(h));
  assert.equal(t3.charm, 'spore');
  assert.ok(Math.abs(t3.s - (4.25 - 1.141)) < 1e-9);
});

/* ── Delivery 3: stagger and soul in two pools ───────────────────────────── */
const F = require('../js/enemies.js');

/* A fight against a real boss: the target carries its stagger entry. */
function boss(id, charms = [], o = {}) {
  const a = arena(charms, o);
  a.target.hp = a.target.max = 5000;   // so it doesn't fall before what we want to count
  const foe = F.FOE_BY_ID[id];
  const stagger = FT.staggerOf(foe, !!o.godhome);
  const ev = (action, extra = {}) => a.run(action, { foe, stagger, spells: a.b.spells, parts: [a.target], ...extra });
  return { ...a, foe, stagger, ev, st: () => a.target.stag || { n: 0, combo: 0, down: false } };
}

test("entries: the 16 bosses' stagger is kb/data/staggers.json's; the ones that go by health carry none", () => {
  const kb = require('../kb/data/staggers.json');
  const ID = { 'Broken Vessel': 'broken-vessel', 'Dung Defender': 'dung-defender', 'Great Nailsage Sly': 'sly',
    'Grey Prince Zote': 'grey-prince-zote', 'Hive Knight': 'hive-knight', 'Hornet Protector': 'hornet-protector',
    'Hornet Sentinel': 'hornet-sentinel', 'Lost Kin': 'lost-kin', 'Nightmare King Grimm': 'nkg', 'Paintmaster Sheo': 'sheo',
    'Pure Vessel': 'pure-vessel', 'Soul Master': 'soul-master', 'Soul Tyrant': 'soul-tyrant', 'The Collector': 'the-collector',
    'The Hollow Knight': 'hollow-knight', 'Troupe Master Grimm': 'grimm', 'Absolute Radiance': 'absolute-radiance',
    'Failed Champion': 'failed-champion', 'False Knight': 'false-knight', 'The Radiance': 'the-radiance' };
  const first = (x) => Number(String(x).match(/\d+/)[0]);
  const third = (x) => Number(String(x).split('/')[2].match(/\d+/)[0]);
  let n = 0;
  for (const k of kb) {
    const foe = F.FOE_BY_ID[ID[k.boss]];
    assert.ok(foe, k.boss);
    if (k.hits === '-') { assert.equal(foe.stagger, undefined, k.boss + ' is staggered by health'); continue; }
    n += 1;
    assert.equal(foe.stagger.hits, first(k.hits), k.boss);
    assert.equal(foe.stagger.combo, first(k.combo), k.boss);
    assert.equal(foe.stagger.window, Number(k.combo_window.match(/<([\d.]+)s/)[1]), k.boss);
  }
  assert.equal(n, 16);
  assert.equal(F.FOES.filter((x) => x.stagger).length, 16);
  const zote = kb.find((k) => k.boss === 'Grey Prince Zote');
  assert.deepEqual(FT.staggerOf(F.FOE_BY_ID['grey-prince-zote'], true), { ...F.FOE_BY_ID['grey-prince-zote'].stagger, hits: third(zote.hits), combo: third(zote.combo) });
  assert.equal(FT.staggerOf(F.FOE_BY_ID['grey-prince-zote'], false).hits, 17);
  assert.equal(FT.staggerOf(F.FOE_BY_ID['false-knight'], false), null);
  assert.deepEqual([F.FOE_BY_ID.grimm.stagger.bats, F.FOE_BY_ID.nkg.stagger.bats, F.FOE_BY_ID.grimm.stagger.cap], [3.5, 2, 50]);
});

test('stagger: counts hits, not damage; consecutive ones need fewer, and a 1.35 s art breaks the combo', () => {
  // Soul Master: 9 hits, or 7 in a row less than 1 s apart.
  const a = boss('soul-master');
  for (let i = 0; i < 6; i++) a.ev({ type: 'strike' });
  assert.deepEqual([a.st().n, a.st().combo, a.st().down], [6, 6, false]);
  const evs = a.ev({ type: 'strike' });
  assert.deepEqual(a.kinds(evs), ['hit', 'stagger']);
  assert.equal(evs[1].combo, true, 'the seventh in a row');
  assert.equal(a.st().down, true);
  // Separated by a wait, all nine are needed.
  const b = boss('soul-master', ['kingsoul']);
  for (let i = 0; i < 8; i++) { b.ev({ type: 'strike' }); b.ev({ type: 'wait', s: 2 }); }
  assert.deepEqual([b.st().n, b.st().combo, b.st().down], [8, 1, false]);
  const e9 = b.ev({ type: 'strike' });
  assert.equal(e9.find((e) => e.kind === 'stagger').combo, false, 'the ninth, with no combo');
  // The art lands after its charge: 1.35 s breaks the <1 s combo, and the hit counts all the same.
  const c = boss('soul-master');
  for (let i = 0; i < 5; i++) c.ev({ type: 'strike' });
  c.ev({ type: 'art', key: 'great' });
  assert.deepEqual([c.st().n, c.st().combo], [6, 1]);
  c.ev({ type: 'strike' }); c.ev({ type: 'strike' });
  assert.equal(c.st().down, false);
  assert.equal(c.kinds(c.ev({ type: 'strike' })).includes('stagger'), true, 'nine hits, even though the combo broke');
});

test("stagger: Heavy Blow takes one off; spells count their impacts; Grimmchild and Dreamshield don't count", () => {
  const a = boss('soul-master', ['heavy']);
  for (let i = 0; i < 5; i++) a.ev({ type: 'strike' });
  assert.equal(a.kinds(a.ev({ type: 'strike' })).includes('stagger'), true, '6 in a row with Heavy Blow');
  // Abyss Shriek is four hits; Descending Dark, three; Vengeful Spirit with Flukenest, its flukes.
  const b = boss('broken-vessel');
  b.ev({ type: 'spell', key: 'hw' });
  assert.deepEqual([b.st().n, b.st().combo], [4, 4]);
  b.ev({ type: 'spell', key: 'dd' });
  assert.deepEqual([b.st().n, b.st().combo], [7, 7]);
  const hitsOf = (charms, key, spells) => FT.spellOutcome(engine.compute(build(charms, spells ? { spells } : {}), 'es').stats['spell.' + key], null, {}).hits;
  assert.equal(hitsOf(['flukenest'], 'vs'), 16);
  assert.equal(hitsOf(['flukenest', 'crest'], 'vs', { vs: 1, dd: 2, hw: 2 }), 1, 'the volatile one: the impact, not the cloud');
  assert.equal(hitsOf([], 'dd', { vs: 2, dd: 1, hw: 2 }), 2);
  // Elegy is another hit; Dreamshield doesn't count.
  const c = boss('hornet-protector', ['elegy', 'dreamshield']);
  c.ev({ type: 'strike' });
  assert.equal(c.st().n, 2, 'nail and beam');
  c.ev({ type: 'shield' });
  assert.equal(c.st().n, 2);
  // With no stagger entry, nothing: False Knight goes by health.
  const d = boss('false-knight');
  d.ev({ type: 'strike' });
  assert.equal(d.target.stag, undefined);
});

test("stagger: your next hit gets it up and doesn't count; so does waiting; focusing doesn't", () => {
  const a = boss('soul-master', ['kingsoul']);
  for (let i = 0; i < 7; i++) a.ev({ type: 'strike' });
  assert.equal(a.st().down, true);
  a.f.masks = 5; a.f.soul = 99;
  a.ev({ type: 'focus' });
  assert.equal(a.st().down, true, "the stagger's opening is for healing");
  const evs = a.ev({ type: 'strike' });
  assert.deepEqual(a.kinds(evs), ['hit', 'staggerEnd']);
  assert.deepEqual([a.st().down, a.st().n], [false, 0], "the hit that gets it up doesn't count");
  a.ev({ type: 'strike' });
  assert.equal(a.st().n, 1);
  // Waiting lets it get up.
  for (let i = 0; i < 6; i++) a.ev({ type: 'strike' });
  assert.equal(a.st().down, true);
  const w = a.ev({ type: 'wait', s: 2 });
  assert.equal(a.kinds(w).includes('staggerEnd'), true);
  assert.equal(a.st().down, false);
  // In an Abyss Shriek, the first impact gets it up and the other three count.
  for (let i = 0; i < 7; i++) a.ev({ type: 'strike' });
  a.f.soul = 99;
  a.ev({ type: 'spell', key: 'hw' });
  assert.deepEqual([a.st().down, a.st().n], [false, 3]);
});

test("stagger: Grimm scatters into bats for 3.5 s; hitting him doesn't get him up and you take 50 at most", () => {
  const a = boss('grimm');
  let evs = [];
  for (let i = 0; i < 12; i++) evs = a.ev({ type: 'strike' });
  const bats = evs.find((e) => e.kind === 'bats');
  assert.ok(bats, 'twelve in a row');
  assert.deepEqual([bats.s, bats.cap], [3.5, 50]);
  const until = a.st().until;
  // Waiting goes right up to when they come back.
  const tick = FT.nextTick(a.f, { stats: liveSheet(a.b, a.f).stats, has: (id) => a.b.charms.includes(id), target: a.target, parts: [a.target] });
  assert.equal(tick.bats, true);
  assert.ok(Math.abs(tick.s - (until - a.f.clock)) < 1e-9);
  // During the bats the damage is capped at 50 across all hits, and none of them gets him up.
  const hp = a.target.hp;
  let ended = false, capped = 0;
  for (let i = 0; i < 12 && !ended; i++) {
    const k = a.kinds(a.ev({ type: 'strike' }));
    ended = k.includes('batsEnd');
    capped += k.filter((x) => x === 'batsCap').length;
  }
  assert.equal(ended, true, 'they come back on their own after their 3.5 s');
  assert.ok(a.f.clock >= until - 1e-9);
  assert.equal(hp - a.target.hp, 50, "21 + 21 + 8, and the rest doesn't land");
  assert.ok(capped >= 2, "the log flags what doesn't land");
  assert.equal(a.st().down, false);
  // The Nightmare King, 2 s.
  const n = boss('nkg');
  let e2 = [];
  for (let i = 0; i < 12; i++) e2 = n.ev({ type: 'strike' });
  assert.equal(e2.find((e) => e.kind === 'bats').s, 2);
});

test("soul in two pools: with the meter full the hit gives the reserve's figure, and what overflows goes to it", () => {
  const sh = (charms = [], opts) => engine.compute(build(charms), 'es', opts).stats;
  const f = { soul: 99 };
  assert.equal(FT.nailSoul(f, sh()), 6);
  assert.equal(FT.nailSoul(f, sh(['catcher'])), 8);
  assert.equal(FT.nailSoul(f, sh(['eater'])), 12);
  assert.equal(FT.nailSoul(f, sh(['catcher', 'eater'])), 14);
  assert.equal(FT.nailSoul({ soul: 98 }, sh()), 11, "while it isn't full, the meter's");
  assert.equal(FT.soulGain({ soul: 198 }, sh()), 0, 'everything full: nothing');
  assert.equal(FT.soulGain({ soul: 195 }, sh()), 3);
  // With the Soul Binding there's no reserve: full at 33, a hit gives nothing.
  assert.equal(FT.soulGain({ soul: 33 }, sh([], { bindings: { soul: true } })), 0);
  assert.equal(FT.soulGain({ soul: 30 }, sh([], { bindings: { soul: true } })), 3);
  // In the fight: 95 + 11 = 106 (99 in the meter and 7 in the vessels); after that, 6 at a time.
  const a = arena();
  a.f.soul = 95;
  a.run({ type: 'strike' });
  assert.equal(a.f.soul, 106);
  a.run({ type: 'strike' });
  assert.equal(a.f.soul, 112);
});

test("no soul: the Collector, Failed Champion and the Siblings don't give it; from False Knight, only the armour", () => {
  // Data: the whole entry or just the bar (wiki: "The Collector", "Failed Champion", "Sibling", "False Knight").
  assert.deepEqual(F.FOES.filter((x) => x.noSoul).map((x) => x.id).sort(), ['failed-champion', 'sibling', 'the-collector']);
  const fk = F.FOE_BY_ID['false-knight'];
  for (const phaseSet of [fk.phases, fk.phasesAt, fk.phasesAsra]) {
    for (const ph of phaseSet) for (const p of ph.parts) assert.equal(!!p.noSoul, p.name.en === 'Armour', p.name.en);
  }
  // The Collector: the nail draws nothing, and the button says so (soulGain 0).
  const a = boss('the-collector', ['grubsong', 'weaversong']);
  a.f.soul = 50;
  a.ev({ type: 'strike' });
  assert.equal(a.f.soul, 50);
  assert.equal(FT.soulless({ target: a.target, targetIsMinion: false, foe: a.foe }), true);
  assert.equal(FT.soulGain(a.f, liveSheet(a.b, a.f).stats, true), 0);
  // The Dream Nail and the weaverlings with Grubsong do.
  a.ev({ type: 'dream' });
  assert.equal(a.f.soul, 83);
  a.ev({ type: 'weavers' });
  assert.equal(a.f.soul, 92);
  // And Grubsong on taking damage, too.
  a.ev({ type: 'foeHit', dmg: 1, label: 'Jarras' });
  assert.equal(a.f.soul, 107);
  // False Knight: the armour doesn't, the maggot does.
  const armour = boss('false-knight');
  Object.assign(armour.target, { name: fk.phases[0].parts[0].name, noSoul: true });
  armour.f.soul = 20;
  armour.ev({ type: 'strike' });
  assert.equal(armour.f.soul, 20);
  const maggot = boss('false-knight');
  maggot.f.soul = 20;
  maggot.ev({ type: 'strike' });
  assert.equal(maggot.f.soul, 31, "the maggot's bar doesn't carry noSoul");
  // Failed Champion, in the whole fight.
  const fc = boss('failed-champion');
  fc.f.soul = 20;
  fc.ev({ type: 'strike' });
  assert.equal(fc.f.soul, 20);
  // A minion carries its own: one that gives soul gives it even if the boss doesn't.
  const b = boss('the-collector');
  b.f.soul = 20;
  b.ev({ type: 'strike' }, { target: { hp: 5, max: 5, name: { es: 'Bicho', en: 'Bug' } }, targetIsMinion: true });
  assert.equal(b.f.soul, 20 + 11 + 11, "the minion's hit and death");
});

test('spells, impact by impact: how many land decides the damage and the stagger hits', () => {
  const stat = (charms, key, spells) => engine.compute(build(charms, spells ? { spells } : {}), 'es').stats['spell.' + key];
  const out = (charms, key, sel, ctx = {}, spells) => FT.spellOutcome(stat(charms, key, spells), sel, ctx);
  // By default, all: the same as the sheet.
  assert.deepEqual(out([], 'hw', null), { dmg: 80, hits: 4, landed: 4, of: 4, twice: false });
  assert.deepEqual(out(['shaman'], 'hw', null).dmg, 120);
  // Bursts and flukes: the ones that land.
  assert.deepEqual(out([], 'hw', { burst: 3 }), { dmg: 60, hits: 3, landed: 3, of: 4, twice: false });
  assert.equal(out(['flukenest'], 'vs', { fluke: 5 }).dmg, 20);
  assert.equal(out(['flukenest'], 'vs', { fluke: 99 }).dmg, 64, 'never more than there are');
  // Desolate Dive: the fall only if you're on top.
  assert.deepEqual(out([], 'dd', { dive: 0 }, {}, { vs: 2, dd: 1, hw: 2 }), { dmg: 20, hits: 1, landed: 1, of: 2, twice: false });
  // Descending Dark: 65 on the left, 60 on the right; with Shaman Stone, 88 and no side.
  assert.equal(out([], 'dd', null).dmg, 65);
  assert.equal(out([], 'dd', { side: 'right' }).dmg, 60);
  assert.equal(out(['shaman'], 'dd', { side: 'right' }).dmg, 88);
  // The volatile one: the cloud hits but doesn't count towards stagger.
  assert.deepEqual(out(['flukenest', 'crest'], 'vs', { impact: 0 }), { dmg: 23, hits: 0, landed: 1, of: 2, twice: false });
  // Vengeful Spirit hits twice only whoever recoils, and never a minion.
  const bv = { foe: F.FOE_BY_ID['broken-vessel'], targetIsMinion: false };
  assert.deepEqual(out([], 'vs', { bolt: 2 }, bv), { dmg: 60, hits: 2, landed: 2, of: 1, twice: true });
  assert.equal(out([], 'vs', { bolt: 2 }, { foe: F.FOE_BY_ID['soul-master'] }).dmg, 30);
  assert.equal(out([], 'vs', { bolt: 2 }, { ...bv, targetIsMinion: true }).dmg, 30);
  // Flukenest doesn't damage the Hollow Knight or Pure Vessel except in the air: its impacts
  // start at none, and lighting them by hand still works. The other spells, as always.
  const hk = { foe: F.FOE_BY_ID['hollow-knight'], targetIsMinion: false };
  assert.equal(out(['flukenest'], 'vs', null, hk).dmg, 0);
  assert.equal(out(['flukenest'], 'vs', { fluke: 4 }, hk).dmg, 16);
  assert.equal(out(['flukenest', 'crest'], 'vs', null, { foe: F.FOE_BY_ID['pure-vessel'] }).dmg, 0);
  assert.equal(out([], 'vs', null, hk).dmg, 30);
  assert.equal(out(['flukenest'], 'vs', null, bv).dmg, 64);
  // In the fight: Abyss Shriek with 2 of 4 takes 40 and adds 2 to the stagger; missing pays the soul and takes nothing.
  const a = boss('soul-master');
  a.f.soul = 99;
  let evs = a.ev({ type: 'spell', key: 'hw', sel: { burst: 2 } });
  assert.deepEqual([a.target.hp, a.st().n, a.f.soul], [5000 - 40, 2, 66]);
  assert.deepEqual([evs[0].landed, evs[0].of], [2, 4]);
  evs = a.ev({ type: 'spell', key: 'hw', sel: { burst: 0 } });
  assert.deepEqual(a.kinds(evs), ['spellMiss']);
  assert.deepEqual([a.target.hp, a.st().n, a.f.soul], [5000 - 40, 2, 33]);
});
