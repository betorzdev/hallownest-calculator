'use strict';
// Reference values taken from hollowknight.wiki (see docs/guide.md, "Where the numbers come from").
const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../js/engine.js');
const codec = require('../js/codec.js');
const D = require('../js/data.js');

// "Everything maxed" build with no charms and one mask down, which is the partial health
// at which neither Fury nor Elegy is active (hp: 0 would be full health).
const S = (o = {}) => codec.normalize({ ...codec.PRESETS.max, hp: 8, ...o });
const sheet = (st) => engine.compute(st);
const val = (st, id) => sheet(st).stats[id].value;
const row = (st, id) => sheet(st).stats[id];
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('roundEven: half to even like Mathf.RoundToInt', () => {
  assert.equal(engine.roundEven(52.5), 52);
  assert.equal(engine.roundEven(24.5), 24);
  assert.equal(engine.roundEven(31.5), 32);
  assert.equal(engine.roundEven(36.75), 37);
  assert.equal(engine.roundEven(10.5), 10);
  assert.equal(engine.roundEven(19.5), 20);
  assert.equal(engine.roundEven(7), 7);
});

test('nail: base table, Strength, Fury and both with stepped rounding', () => {
  const base = [5, 9, 13, 17, 21], str = [8, 14, 20, 26, 32], fury = [9, 16, 23, 30, 37], both = [14, 24, 35, 46, 56];
  for (let lvl = 0; lvl < 5; lvl++) {
    assert.equal(val(S({ nail: lvl }), 'nail.damage'), base[lvl], `base level ${lvl}`);
    assert.equal(val(S({ nail: lvl, charms: ['ustrength'] }), 'nail.damage'), str[lvl], `strength level ${lvl}`);
    assert.equal(val(S({ nail: lvl, charms: ['fstrength'] }), 'nail.damage'), str[lvl], `fragile strength level ${lvl}`);
    assert.equal(val(S({ nail: lvl, charms: ['fury'], hp: 1 }), 'nail.damage'), fury[lvl], `fury level ${lvl}`);
    assert.equal(val(S({ nail: lvl, charms: ['ustrength', 'fury'], hp: 1 }), 'nail.damage'), both[lvl], `both level ${lvl}`);
  }
  // Fury equipped but not at 1 mask: no effect and marked as inactive.
  const r = row(S({ charms: ['fury'], hp: 0 }), 'nail.damage');
  assert.equal(r.value, 21);
  assert.ok(r.contribs.some((c) => c.source === 'charm:fury' && c.active === false));
});

test('arts: no Strength bonus, with Fury and a single rounding', () => {
  const great = [12, 22, 32, 42, 52], greatFury = [22, 39, 57, 74, 92], cyc = [6, 11, 16, 21, 26];
  for (let lvl = 0; lvl < 5; lvl++) {
    assert.equal(val(S({ nail: lvl }), 'nail.greatSlash'), great[lvl]);
    assert.equal(val(S({ nail: lvl, charms: ['ustrength'] }), 'nail.greatSlash'), great[lvl], "Strength doesn't affect them");
    assert.equal(val(S({ nail: lvl, charms: ['fury'], hp: 1 }), 'nail.greatSlash'), greatFury[lvl]);
    assert.equal(val(S({ nail: lvl }), 'nail.dashSlash'), great[lvl]);
    assert.equal(val(S({ nail: lvl }), 'nail.cyclone'), cyc[lvl]);
  }
  assert.equal(val(S({ charms: ['fury'], hp: 1 }), 'nail.cyclone'), 46);
  const c = row(S(), 'nail.cyclone');
  assert.deepEqual(c.parts.map((p) => p.v), [78, 156]);
  assert.equal(row(S({ arts: { cyclone: false, dash: true, great: true } }), 'nail.cyclone').applies, false);
  assert.equal(val(S(), 'nail.artCharge'), 1.35);
  assert.equal(val(S({ charms: ['glory'] }), 'nail.artCharge'), 0.75);
});

test('strongest hit: compares arts and spells in the same unit', () => {
  const noSpells = { vs: 0, dd: 0, hw: 0 };
  const noArts = { cyclone: false, dash: false, great: false };

  // With everything learnt, Abyss Shriek (80) narrowly beats Cyclone Slash (26 × 3 = 78).
  assert.equal(val(S(), 'nail.bestBurst'), 80);
  assert.equal(row(S(), 'nail.bestBurst').note, 'Chillido del Abismo · 33 de alma');
  assert.equal(val(S({ charms: ['shaman'] }), 'nail.bestBurst'), 120);

  // Cyclone Slash counts by the total of its three hits, not by its per-hit figure.
  const cyc = S({ arts: { cyclone: true, dash: false, great: false }, spells: noSpells });
  assert.equal(val(cyc, 'nail.bestBurst'), 78);
  assert.deepEqual(row(cyc, 'nail.bestBurst').parts.map((p) => p.v), [78, 156]);
  // With Fury, Cyclone Slash (46 × 3) overtakes any spell without Shaman Stone.
  assert.equal(val(S({ charms: ['fury'], hp: 1 }), 'nail.bestBurst'), 138);

  // A tie between Great Slash and Dash Slash goes to Great Slash.
  const tie = S({ arts: { cyclone: false, dash: true, great: true }, spells: noSpells });
  assert.equal(val(tie, 'nail.bestBurst'), 52);
  assert.match(row(tie, 'nail.bestBurst').note, /^Gran corte · /);

  // The charms that shape the hit leave their chip on the row.
  const shaman = row(S({ charms: ['shaman'], arts: noArts }), 'nail.bestBurst');
  assert.ok(shaman.contribs.some((c) => c.source === 'charm:shaman'));

  // With no arts or spells it doesn't apply.
  assert.equal(row(S({ arts: noArts, spells: noSpells }), 'nail.bestBurst').applies, false);
  assert.equal(row(codec.normalize({ ...codec.PRESETS.base }), 'nail.bestBurst').applies, false);
});

test('Elegy: 50% of the nail with Strength, ×1.5 with Fury', () => {
  const full = (o) => S({ ...o, hp: 0 });
  const one = (o) => S({ ...o, hp: 1 });
  assert.equal(val(full({ charms: ['elegy'] }), 'nail.elegy'), 10);
  assert.equal(val(full({ charms: ['elegy', 'ustrength'] }), 'nail.elegy'), 16);
  assert.equal(val(one({ charms: ['elegy', 'fury'] }), 'nail.elegy'), 15);
  assert.equal(val(one({ charms: ['elegy', 'fury', 'ustrength'] }), 'nail.elegy'), 24);
  assert.equal(val(one({ nail: 3, charms: ['elegy', 'fury', 'ustrength'] }), 'nail.elegy'), 20);
  const t = [2, 4, 6, 8, 10];
  for (let lvl = 0; lvl < 5; lvl++) assert.equal(val(full({ nail: lvl, charms: ['elegy'] }), 'nail.elegy'), t[lvl]);
  assert.equal(row(S({ charms: ['elegy'], hp: 8 }), 'nail.elegy').applies, false);
  assert.equal(row(one({ charms: ['elegy'] }), 'nail.elegy').applies, false, "at 1 mask without Fury it doesn't fire");
  assert.equal(row(S(), 'nail.elegy').hidden, true);
  // Only the white masks count: with Lifeblood Heart (9 + 2), losing the
  // lifeblood doesn't switch the beam off; losing a white mask does.
  assert.equal(val(S({ charms: ['elegy', 'lbheart'], hp: 9 }), 'nail.elegy'), 10, 'without lifeblood, whole masks');
  assert.equal(val(S({ charms: ['elegy', 'lbcore', 'uheart'], hp: 11 }), 'nail.elegy'), 10, '11 white out of 15');
  assert.equal(row(S({ charms: ['elegy', 'lbheart'], hp: 8 }), 'nail.elegy').applies, false, 'one white mask fewer');
  // With Joni's Blessing all health is lifeblood and any hit switches it off.
  assert.equal(val(full({ charms: ['elegy', 'joni'] }), 'nail.elegy'), 10);
  assert.equal(row(S({ charms: ['elegy', 'joni'], hp: 12 }), 'nail.elegy').applies, false, "Joni's Blessing: one hit switches it off");
});

test('Sharp Shadow, Thorns of Agony and Dreamshield use the base nail', () => {
  const st = S({ charms: ['sharpshadow', 'thorns', 'dreamshield', 'ustrength', 'fury'], hp: 1 });
  assert.equal(val(st, 'nail.damage'), 56);
  assert.equal(val(st, 'nail.sharpShadow'), 21);
  assert.equal(val(st, 'nail.thorns'), 21);
  assert.equal(val(st, 'nail.dreamshield'), 21);
  assert.equal(val(S({ charms: ['sharpshadow', 'dashmaster'] }), 'nail.sharpShadow'), 32);
});

test('nail: speed, reach and knockback', () => {
  close(val(S(), 'nail.cooldown'), 0.41);
  close(val(S({ charms: ['quickslash'] }), 'nail.cooldown'), 0.28);
  close(val(S(), 'nail.dps'), 21 / 0.41);
  assert.equal(val(S(), 'nail.range'), 1);
  close(val(S({ charms: ['longnail'] }), 'nail.range'), 1.15);
  close(val(S({ charms: ['pride'] }), 'nail.range'), 1.25);
  close(val(S({ charms: ['longnail', 'pride'] }), 'nail.range'), 1.4);
  close(val(S({ charms: ['heavy'] }), 'nail.knockback'), 1.75);
  // Swings that fit in the invulnerability after a hit: 1.3 ÷ 0.41; with Stalwart Shell, 1.75; with Quick Slash, ÷ 0.28.
  assert.equal(val(S(), 'nail.hitsInIframes'), 3);
  assert.equal(val(S({ charms: ['stalwart'] }), 'nail.hitsInIframes'), 4);
  assert.equal(val(S({ charms: ['quickslash'] }), 'nail.hitsInIframes'), 4);
  assert.equal(val(S({ charms: ['stalwart', 'quickslash'] }), 'nail.hitsInIframes'), 6);
});

test("health: masks, Lifeblood Heart, Joni's Blessing, lifeblood, overcharmed", () => {
  assert.equal(val(S({ masks: 5 }), 'health.masks'), 5);
  assert.equal(val(S({ masks: 6 }), 'health.masks'), 6);
  assert.equal(val(S(), 'health.masks'), 9);
  assert.equal(val(S({ charms: ['uheart'] }), 'health.masks'), 11);
  const joni = { 5: 7, 6: 9, 7: 10, 8: 12, 9: 13, 10: 14, 11: 16 };
  for (const [m, lb] of Object.entries(joni)) assert.equal(engine.joniLifeblood(Number(m)), lb, `Joni's Blessing with ${m} masks`);
  const j = S({ charms: ['joni'] });
  assert.equal(val(j, 'health.masks'), 0);
  assert.equal(val(j, 'health.lifeblood'), 13);
  assert.equal(val(j, 'health.total'), 13);
  assert.equal(val(S({ charms: ['joni', 'uheart'] }), 'health.lifeblood'), 16);
  assert.equal(val(S({ charms: ['joni', 'lbheart', 'lbcore'] }), 'health.lifeblood'), 19);
  assert.equal(val(S({ charms: ['lbheart', 'lbcore'] }), 'health.lifeblood'), 6);
  const over = S({ notches: 3, charms: ['ustrength', 'quickslash'] });
  const sh = sheet(over);
  assert.equal(sh.notches.overcharmed, true);
  assert.equal(sh.stats['health.damageMult'].value, 2);
  assert.equal(sh.stats['abil.overcharmed'].value, true);
  assert.equal(sh.stats['health.hitsToDie'].value, 5);
  assert.equal(val(S(), 'health.hitsToDie'), 9);
  assert.equal(val(S(), 'health.iframes'), 1.3);
  assert.equal(val(S({ charms: ['stalwart'] }), 'health.iframes'), 1.75);
  assert.equal(val(S({ charms: ['hiveblood'] }), 'health.hivebloodRegen'), 10);
  assert.equal(val(S({ charms: ['hiveblood', 'joni'] }), 'health.hivebloodRegen'), 20);
  close(val(S({ charms: ['melody'] }), 'health.carefreeAvg'), 22.46);
  assert.equal(val(S({ charms: ['baldur'] }), 'health.baldurBlocks'), 4);
});

test('soul: vessels, per hit, Dream Nail, costs', () => {
  assert.equal(val(S(), 'soul.main'), 99);
  assert.equal(val(S({ vessels: 3 }), 'soul.reserve'), 99);
  assert.equal(val(S({ vessels: 1 }), 'soul.reserve'), 33);
  assert.equal(val(S(), 'soul.total'), 198);
  assert.equal(val(S(), 'soul.perHit'), 11);
  assert.equal(val(S({ charms: ['catcher'] }), 'soul.perHit'), 14);
  assert.equal(val(S({ charms: ['eater'] }), 'soul.perHit'), 19);
  assert.equal(val(S({ charms: ['catcher', 'eater'] }), 'soul.perHit'), 22);
  assert.equal(val(S(), 'soul.perHitReserve'), 6);
  assert.equal(val(S({ charms: ['catcher'] }), 'soul.perHitReserve'), 8);
  assert.equal(val(S({ charms: ['eater'] }), 'soul.perHitReserve'), 12);
  assert.equal(val(S({ charms: ['catcher', 'eater'] }), 'soul.perHitReserve'), 14);
  assert.equal(val(S(), 'soul.dreamNail'), 33);
  assert.equal(val(S({ charms: ['wielder'] }), 'soul.dreamNail'), 66);
  assert.equal(val(S({ charms: ['grubsong'] }), 'soul.onHit'), 15);
  assert.equal(val(S({ charms: ['grubsong', 'elegy'] }), 'soul.onHit'), 25);
  assert.equal(val(S({ charms: ['kingsoul'] }), 'soul.passive'), 2);
  assert.equal(val(S(), 'soul.spellCost'), 33);
  assert.equal(val(S({ charms: ['twister'] }), 'soul.spellCost'), 24);
  assert.equal(val(S(), 'soul.hitsPerSpell'), 3);
  assert.equal(val(S({ charms: ['twister', 'catcher', 'eater'] }), 'soul.hitsPerSpell'), 2);
  assert.equal(val(S(), 'soul.hitsPerFocus'), 3);
  assert.equal(val(S(), 'soul.castsPerFull'), 6);
  assert.equal(val(S({ charms: ['twister'] }), 'soul.castsPerFull'), 8);
});

test("spells: levels, Shaman Stone, Flukenest and Defender's Crest", () => {
  const lv = (vs, dd, hw, charms = []) => S({ spells: { vs, dd, hw }, charms });
  assert.equal(val(lv(1, 1, 1), 'spell.vs'), 15);
  assert.equal(val(lv(1, 1, 1, ['shaman']), 'spell.vs'), 20);
  assert.equal(val(lv(2, 2, 2), 'spell.vs'), 30);
  assert.equal(val(lv(2, 2, 2, ['shaman']), 'spell.vs'), 40);
  assert.equal(val(lv(1, 1, 1), 'spell.dd'), 35);
  assert.equal(val(lv(1, 1, 1, ['shaman']), 'spell.dd'), 53);
  assert.deepEqual(row(lv(1, 1, 1, ['shaman']), 'spell.dd').parts.map((p) => p.v), [23, 30]);
  assert.equal(val(lv(2, 2, 2), 'spell.dd'), 65);
  assert.equal(val(lv(2, 2, 2, ['shaman']), 'spell.dd'), 88);
  assert.deepEqual(row(lv(2, 2, 2, ['shaman']), 'spell.dd').parts.map((p) => p.v), [23, 50, 15]);
  assert.equal(val(lv(1, 1, 1), 'spell.hw'), 39);
  assert.equal(val(lv(1, 1, 1, ['shaman']), 'spell.hw'), 60);
  assert.equal(val(lv(2, 2, 2), 'spell.hw'), 80);
  assert.equal(val(lv(2, 2, 2, ['shaman']), 'spell.hw'), 120);
  assert.equal(val(lv(1, 1, 1, ['flukenest']), 'spell.vs'), 36);
  assert.equal(val(lv(1, 1, 1, ['flukenest', 'shaman']), 'spell.vs'), 45);
  assert.equal(val(lv(2, 1, 1, ['flukenest']), 'spell.vs'), 64);
  assert.equal(val(lv(2, 1, 1, ['flukenest', 'shaman']), 'spell.vs'), 80);
  const vol = row(lv(1, 1, 1, ['flukenest', 'crest']), 'spell.vs');
  assert.equal(vol.value, 26);
  assert.equal(vol.approx, true);
  assert.equal(val(lv(1, 1, 1, ['flukenest', 'crest', 'shaman']), 'spell.vs'), 32);
  assert.equal(row(lv(0, 1, 1), 'spell.vs').applies, false);
  assert.equal(row(lv(2, 2, 2), 'spell.vs').label, 'Alma sombría');
  close(val(lv(1, 1, 1), 'spell.vsPerSoul'), 15 / 33);
  close(val(lv(1, 1, 1, ['twister']), 'spell.vsPerSoul'), 15 / 24);
});

test("healing: times, Deep Focus and Quick Focus, Joni's Blessing", () => {
  close(val(S(), 'heal.timePerFocus'), 0.891);
  assert.equal(val(S(), 'heal.masksPerFocus'), 1);
  close(val(S({ charms: ['quickfocus'] }), 'heal.timePerFocus'), 0.597);
  close(val(S({ charms: ['deepfocus'] }), 'heal.timePerFocus'), 1.47);
  assert.equal(val(S({ charms: ['deepfocus'] }), 'heal.masksPerFocus'), 2);
  close(val(S({ charms: ['deepfocus'] }), 'heal.timePerMask'), 0.735);
  close(val(S({ charms: ['quickfocus', 'deepfocus'] }), 'heal.timePerFocus'), 0.985);
  close(val(S({ charms: ['quickfocus', 'deepfocus'] }), 'heal.timePerMask'), 0.4925);
  close(val(S({ charms: ['deepfocus'] }), 'heal.soulPerMask'), 16.5);
  assert.equal(val(S(), 'heal.fullHeal'), 6);
  assert.equal(val(S({ charms: ['deepfocus'] }), 'heal.fullHeal'), 12);
  assert.equal(val(S(), 'heal.canFocus'), true);
  const j = sheet(S({ charms: ['joni'] }));
  assert.equal(j.stats['heal.canFocus'].value, false);
  assert.equal(j.stats['heal.timePerFocus'].applies, false);
  assert.equal(val(S({ charms: ['spore'] }), 'heal.spore'), 26);
  assert.equal(val(S({ charms: ['spore', 'crest'] }), 'heal.spore'), 40);
  close(val(S({ charms: ['spore', 'deepfocus'] }), 'heal.sporeRadius'), 1.35);
  assert.equal(val(S({ charms: ['unn'] }), 'heal.moveWhileFocus'), true);
});

test('movement: running, dashes, Shape of Unn', () => {
  close(val(S(), 'move.run'), 8.3);
  close(val(S({ charms: ['sprintmaster'] }), 'move.run'), 10);
  close(val(S({ charms: ['sprintmaster', 'dashmaster'] }), 'move.run'), 11.5);
  close(val(S({ charms: ['dashmaster'] }), 'move.run'), 8.3);
  close(val(S(), 'move.dashCooldown'), 0.6);
  close(val(S({ charms: ['dashmaster'] }), 'move.dashCooldown'), 0.4);
  assert.equal(val(S({ charms: ['dashmaster'] }), 'move.dashDown'), true);
  close(val(S({ charms: ['dashmaster'] }), 'move.shadowCooldown'), 1.5);
  close(val(S(), 'move.shadowSpeed'), 20);
  close(val(S({ charms: ['sharpshadow'] }), 'move.shadowSpeed'), 28);
  assert.equal(val(S({ charms: ['unn'] }), 'move.unnSpeed'), 6);
  assert.equal(val(S({ charms: ['unn', 'quickfocus'] }), 'move.unnSpeed'), 12);
});

test('companions: weaverlings, hatchlings, Grimmchild, shield', () => {
  assert.equal(val(S({ charms: ['weaversong'] }), 'pet.weaverling'), 3);
  assert.equal(val(S({ charms: ['weaversong'] }), 'pet.weaverlingSoul'), 0);
  assert.equal(val(S({ charms: ['weaversong', 'grubsong'] }), 'pet.weaverlingSoul'), 3);
  close(val(S({ charms: ['weaversong', 'sprintmaster'] }), 'pet.weaverlingSpeed'), 1.5);
  assert.equal(val(S({ charms: ['womb'] }), 'pet.hatchling'), 9);
  assert.equal(val(S({ charms: ['womb', 'fury'], hp: 1 }), 'pet.hatchling'), 14);
  assert.equal(val(S({ charms: ['womb', 'crest'] }), 'pet.hatchling'), 4);
  assert.equal(val(S({ charms: ['womb', 'crest'] }), 'pet.hatchlingCloud'), 5);
  assert.equal(val(S({ charms: ['womb'] }), 'pet.hatchlingCost'), 8);
  assert.equal(val(S({ charms: ['grimmchild'] }), 'pet.grimmchild'), 11);   // always in its last phase
  close(val(S({ charms: ['grimmchild'] }), 'pet.grimmchildDps'), 11 / 1.8);
  assert.equal(val(S({ charms: ['crest'] }), 'pet.crestCloud'), 3);
  close(val(S({ charms: ['dreamshield', 'wielder'] }), 'pet.dreamshieldSize'), 1.15);
});

test('abilities and effects', () => {
  assert.equal(val(S({ charms: ['steady'] }), 'abil.noRecoil'), true);
  assert.equal(val(S(), 'abil.noRecoil'), false);
  assert.equal(val(S({ charms: ['swarm'] }), 'abil.geoPickup'), true);
  assert.equal(val(S({ charms: ['compass'] }), 'abil.mapPosition'), true);
  close(val(S({ charms: ['fgreed'] }), 'abil.geoBonus'), 1.2);
  assert.equal(val(S({ charms: ['dreamshield'] }), 'abil.blockProjectiles'), true);
  assert.equal(val(S({ charms: ['crest'] }), 'abil.legEater'), 20);
  close(val(S({ charms: ['wielder'] }), 'abil.essence'), 1.5);
  assert.equal(val(S({ charms: ['fheart', 'fgreed', 'fstrength'] }), 'abil.fragile'), 3);
  assert.equal(val(S({ charms: ['uheart', 'ugreed', 'ustrength'] }), 'abil.fragile'), 0);
  assert.equal(val(S({ charms: ['voidheart'] }), 'abil.voidNeutral'), true);
});

test('notches: sum, overcharm and Void Heart', () => {
  const sh = sheet(S({ charms: ['kingsoul', 'voidheart', 'ustrength'] }));
  assert.deepEqual(sh.state.charms, ['voidheart', 'ustrength'], 'Kingsoul and Void Heart are mutually exclusive');
  assert.equal(sh.notches.used, 3);
  assert.equal(sheet(S({ notches: 11, charms: ['kingsoul', 'eater', 'joni'] })).notches.used, 13);
  assert.equal(sheet(S({ notches: 11, charms: ['kingsoul', 'eater', 'joni'] })).notches.overcharmed, true);
});

test('coverage: all 45 charms change something on the sheet', () => {
  const scenarios = [
    S({ hp: 1 }),
    S({ hp: 0 }),
  ];
  for (const charm of D.CHARMS) {
    const found = scenarios.some((base) => {
      const withCharm = codec.normalize({ ...base, charms: [charm.id] });
      return engine.diff(engine.compute(base), engine.compute(withCharm)).length > 0;
    });
    assert.ok(found, `${charm.es} changes no stat`);
  }
});

test('sheet shape: every stat defined, contributions labelled', () => {
  const sh = sheet(S({ charms: ['ustrength', 'fury', 'elegy', 'flukenest', 'crest', 'shaman', 'grimmchild'], hp: 1 }));
  for (const def of D.STAT_DEFS) {
    const s = sh.stats[def.id];
    assert.ok(s, `${def.id} is missing`);
    assert.equal(s.group, def.group);
    for (const c of s.contribs) {
      assert.ok(c.source && c.label, `contribution with no source in ${def.id}`);
      assert.ok(['set', 'add', 'mul', 'replace', 'on', 'off', 'via', 'note'].includes(c.op));
    }
  }
  assert.equal(sh.groups.length, D.GROUPS.length);
  assert.equal(sh.groups.flatMap((g) => g.stats).length, D.STAT_DEFS.length);
});

test("diff: Joni's Blessing's conversion isn't read as a loss", () => {
  const ch = engine.diff(sheet(S()), sheet(S({ charms: ['joni'] })));
  const masks = ch.find((c) => c.id === 'health.masks');
  assert.equal(masks.delta, -9);
  assert.equal(masks.transfer, 'out', "the masks don't disappear: they become lifeblood");
  assert.equal(masks.into, 'health.lifeblood');
  assert.equal(masks.good, null, "the half that empties isn't a change for the worse");
  const lb = ch.find((c) => c.id === 'health.lifeblood');
  assert.equal(lb.transfer, 'in');
  assert.equal(lb.good, true);
  assert.equal(ch.find((c) => c.id === 'health.total').delta, 4, "the conversion's balance");
  // On removing it, the same pair: lifeblood going back to masks isn't a loss either.
  const back = engine.diff(sheet(S({ charms: ['joni'] })), sheet(S()));
  assert.equal(back.find((c) => c.id === 'health.masks').transfer, 'out');
  assert.equal(back.find((c) => c.id === 'health.masks').good, null);
  // Without Joni's Blessing there's no conversion to mark.
  const plain = engine.diff(sheet(S()), sheet(S({ charms: ['uheart'] })));
  assert.ok(plain.every((c) => c.transfer === null));
});

test('diff: detects changes, appearances and their sign', () => {
  const a = S(), b = S({ charms: ['ustrength', 'weaversong'] });
  const ch = engine.diff(engine.compute(a), engine.compute(b));
  const dmg = ch.find((c) => c.id === 'nail.damage');
  assert.ok(dmg && dmg.kind === 'value' && dmg.delta === 11 && dmg.good === true);
  const wv = ch.find((c) => c.id === 'pet.weaverling');
  assert.ok(wv && wv.kind === 'gain');
  assert.equal(ch[0].id, 'nail.damage', 'the most relevant change goes first');
  assert.equal(engine.diff(engine.compute(a), engine.compute(a)).length, 0);
});

test("arena: with options.fight the flags come from the fight's health, not from st.hp", () => {
  const full = { masks: 9, lbJoni: 0, lbExtra: 0, lbCocoon: 0, elegyHalted: false };
  const f = (fight, o = {}) => engine.compute(S({ charms: ['fury', 'elegy'], hp: 0, ...o }), 'es', { fight });
  // Full health: no Fury and with Elegy.
  assert.equal(f(full).stats['nail.damage'].value, 21);
  assert.equal(f(full).stats['nail.elegy'].applies, true);
  assert.equal(f(full).stats['nail.elegy'].value, 10);
  // One mask down switches Elegy off; having lost Lifeblood Heart's lifeblood doesn't.
  assert.equal(f({ ...full, masks: 8 }).stats['nail.elegy'].applies, false);
  assert.equal(f(full, { charms: ['fury', 'elegy', 'lbheart'] }).stats['nail.elegy'].applies, true);
  // At one mask: Fury (37) and the red Elegy (15), unless there's lifeblood on top.
  assert.equal(f({ ...full, masks: 1 }).stats['nail.damage'].value, 37);
  assert.equal(f({ ...full, masks: 1 }).stats['nail.elegy'].value, 15);
  assert.equal(f({ ...full, masks: 1, lbCocoon: 3 }).stats['nail.damage'].value, 37);
  assert.equal(f({ ...full, masks: 1, lbCocoon: 3 }).stats['nail.elegy'].applies, false);
  // st.hp doesn't rule when there's a fight: hp 1 on the panel and full health in the arena.
  assert.equal(engine.compute(S({ charms: ['fury'], hp: 1 }), 'es', { fight: full }).stats['nail.damage'].value, 21);
  assert.equal(f({ ...full, lbExtra: 2 }).currentHealth, 11);
  // Without options.fight, the sheet is the usual one.
  assert.equal(val(S({ charms: ['fury'], hp: 1 }), 'nail.damage'), 37);
});

test("arena: with Joni's Blessing, her masks stand in for masks and any damage switches off Elegy", () => {
  const joni = (fight) => engine.compute(S({ charms: ['fury', 'elegy', 'joni'], hp: 0 }), 'es', { fight });
  const full = { masks: 0, lbJoni: 13, lbExtra: 0, lbCocoon: 0, elegyHalted: false };
  assert.equal(joni(full).joniLifeblood, 13);
  assert.equal(sheet(S({ charms: ['fury'] })).joniLifeblood, 0);
  assert.equal(joni(full).stats['nail.elegy'].applies, true);
  assert.equal(joni({ ...full, lbJoni: 1 }).stats['nail.damage'].value, 37);
  assert.equal(joni({ ...full, lbJoni: 12 }).stats['nail.elegy'].applies, false);
  assert.equal(joni({ ...full, elegyHalted: true }).stats['nail.elegy'].applies, false);
});

test("spells: which impacts each one is made of (wiki, each spell's page)", () => {
  const lv = (vs, dd, hw, charms = []) => S({ spells: { vs, dd, hw }, charms });
  const imp = (st, key) => row(st, 'spell.' + key).impacts.map((i) => [i.id, i.v, i.count, i.alt || 0, !!i.twice, i.stagger !== false]);
  // Vengeful Spirit and Shade Soul: one projectile, which can hit twice whoever recoils.
  assert.deepEqual(imp(lv(1, 1, 1), 'vs'), [['bolt', 15, 1, 0, true, true]]);
  assert.deepEqual(imp(lv(2, 2, 2, ['shaman']), 'vs'), [['bolt', 40, 1, 0, true, true]]);
  // Flukenest: 9 or 16 flukes of 4 (5 with Shaman Stone); with Defender's Crest, impact and cloud, which doesn't stagger.
  assert.deepEqual(imp(lv(1, 1, 1, ['flukenest']), 'vs'), [['fluke', 4, 9, 0, false, true]]);
  assert.deepEqual(imp(lv(2, 2, 2, ['flukenest', 'shaman']), 'vs'), [['fluke', 5, 16, 0, false, true]]);
  assert.deepEqual(imp(lv(2, 2, 2, ['flukenest', 'crest']), 'vs'), [['impact', 3, 1, 0, false, true], ['cloud', 23, 1, 0, false, false]]);
  // Flukenest's are marked (nest), and only they are.
  const nest = (st) => row(st, 'spell.vs').impacts.map((i) => !!i.nest);
  assert.deepEqual([nest(lv(2, 2, 2)), nest(lv(2, 2, 2, ['flukenest'])), nest(lv(2, 2, 2, ['flukenest', 'crest']))],
    [[false], [true], [true, true]]);
  // Dive: fall and shockwave. Descending Dark: the 1st blast 35 on the left and 30 on the right; with Shaman Stone, 50.
  assert.deepEqual(imp(lv(1, 1, 1), 'dd'), [['dive', 15, 1, 0, false, true], ['wave', 20, 1, 0, false, true]]);
  assert.deepEqual(imp(lv(1, 1, 1, ['shaman']), 'dd'), [['dive', 23, 1, 0, false, true], ['wave', 30, 1, 0, false, true]]);
  assert.deepEqual(imp(lv(2, 2, 2), 'dd'), [['dive', 15, 1, 0, false, true], ['burst1', 35, 1, 30, false, true], ['burst2', 15, 1, 0, false, true]]);
  assert.deepEqual(imp(lv(2, 2, 2, ['shaman']), 'dd'), [['dive', 23, 1, 0, false, true], ['burst1', 50, 1, 0, false, true], ['burst2', 15, 1, 0, false, true]]);
  // Howling Wraiths and Abyss Shriek: equal bursts.
  assert.deepEqual(imp(lv(1, 1, 1), 'hw'), [['burst', 13, 3, 0, false, true]]);
  assert.deepEqual(imp(lv(2, 2, 2, ['shaman']), 'hw'), [['burst', 30, 4, 0, false, true]]);
  // The row's value is still the total with all of them.
  for (const [st, key] of [[lv(2, 2, 2), 'dd'], [lv(2, 2, 2, ['shaman']), 'hw'], [lv(2, 2, 2, ['flukenest']), 'vs']]) {
    const r = row(st, 'spell.' + key);
    assert.equal(r.impacts.reduce((n, i) => n + i.v * i.count, 0), r.value, key);
  }
});

test('abilities: without the Dream Nail there is no dream soul or Essence', () => {
  const st = S({ dream: false, charms: ['wielder'] });
  assert.equal(row(st, 'soul.dreamNail').applies, false);
  assert.equal(row(st, 'soul.dreamCharge').applies, false);
  assert.equal(row(st, 'abil.essence').applies, false);
  assert.equal(val(S({ charms: ['wielder'] }), 'soul.dreamNail'), 66);
});

test('abilities: the cloak governs the dash, Dash Slash and Sharp Shadow', () => {
  const moth = S({ cloak: 1, charms: ['sharpshadow', 'dashmaster'] });
  assert.equal(row(moth, 'nail.sharpShadow').applies, false, "without the Shade Cloak, Sharp Shadow doesn't hit");
  assert.equal(row(moth, 'move.shadowCooldown').applies, false);
  assert.equal(val(moth, 'move.dashCooldown'), D.MOVE.dashCooldownDashmaster);
  assert.equal(val(moth, 'nail.dashSlash'), 52);
  const none = S({ cloak: 0 });
  assert.equal(row(none, 'move.dashCooldown').applies, false);
  assert.equal(row(none, 'nail.dashSlash').applies, false, 'Dash Slash is released while dashing');
  assert.equal(val(S({ charms: ['sharpshadow'] }), 'nail.sharpShadow'), 21);
});

test("abilities: Grimmchild hits according to its phase (wiki: 0, 5, 8, 11)", () => {
  assert.equal(row(S({ grimm: 1, charms: ['grimmchild'] }), 'pet.grimmchild').applies, false);
  assert.equal(val(S({ grimm: 2, charms: ['grimmchild'] }), 'pet.grimmchild'), 5);
  assert.equal(val(S({ grimm: 3, charms: ['grimmchild'] }), 'pet.grimmchild'), 8);
  assert.equal(val(S({ charms: ['grimmchild'] }), 'pet.grimmchild'), 11);
});
