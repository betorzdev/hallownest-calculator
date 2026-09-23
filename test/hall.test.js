/* test/hall.test.js — the Hall of Gods: its statues, its pedestals and its marks.
   The structure is the wiki's ("Hall of Gods"): if someone moves a statue, splits a
   pedestal that isn't split or invents a boss, this fires before the grid lies. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const foes = require('../js/enemies.js');
const H = require('../js/hall.js');

const SPANISH_CHARS = /[áéíóúüñ¿¡]/i;

test("44 fights on 35 pedestals, in the wiki's order", () => {
  assert.equal(H.STATUES.length, 44);
  assert.equal(new Set(H.STATUES.map((s) => s.id)).size, 44, 'repeated ids');
  assert.equal(H.PEDESTALS.length, 35);
  assert.equal(H.PEDESTALS[0][0].id, 'gruz-mother');
  assert.equal(H.PEDESTALS.at(-1)[0].id, 'absolute-radiance');
  // The five pantheon finales, in their place at the end of the Hall.
  assert.deepEqual(H.STATUES.slice(-7).map((s) => s.id), ['oro-mato', 'sheo', 'sly', 'pure-vessel', 'grimm', 'nkg', 'absolute-radiance']);
});

test('four lever pedestals and five dreamcatcher ones, and no more', () => {
  const doubles = (via) => H.PEDESTALS.filter((p) => p.length === 2 && p[1].via === via).map((p) => p.map((s) => s.id).join('/'));
  assert.deepEqual(doubles('lever'), [
    'hornet-protector/hornet-sentinel', 'mantis-lords/sisters-of-battle', 'nosk/winged-nosk', 'crystal-guardian/enraged-guardian']);
  assert.deepEqual(doubles('dream'), [
    'false-knight/failed-champion', 'broken-vessel/lost-kin', 'soul-master/soul-tyrant', 'dung-defender/white-defender', 'grimm/nkg']);
  assert.ok(H.PEDESTALS.every((p) => p.length <= 2), 'a pedestal with three');
  H.STATUES.forEach((s, i) => {
    if (s.of) {
      assert.equal(s.of, H.STATUES[i - 1].id, `${s.id}: "of" has to be the statue before`);
      assert.ok(['lever', 'dream'].includes(s.via), `${s.id}: "via" ${s.via}`);
    } else {
      assert.equal(s.via, undefined, `${s.id}: "via" with no partner`);
    }
  });
});

test('every statue is a boss with Attuned and Ascended health', () => {
  for (const s of H.STATUES) {
    const f = foes.FOE_BY_ID[s.id];
    assert.ok(f, `"${s.id}" is no entry`);
    assert.equal(f.kind, 'boss', `${s.id} isn't a boss`);
    for (const d of ['at', 'asra']) {
      const v = Array.isArray(f[d]) ? f[d][0] : f[d];
      assert.ok(Number.isFinite(v) && v > 0, `${s.id}: ${d} ${f[d]}`);
    }
  }
  // The ones the Hall uncovered: Ascended's second king, Oblobbles and Mato.
  const g = (id) => [foes.FOE_BY_ID[id].at, foes.FOE_BY_ID[id].asra];
  assert.deepEqual(g('vengefly-king'), [450, 1165], '735 the left one and 430 the right one');
  assert.deepEqual(foes.FOE_BY_ID['vengefly-king'].phasesAsra[0].parts.map((p) => p.hp), [735, 430]);
  assert.deepEqual(g('oblobbles'), [900, 1500]);
  assert.deepEqual(g('oro-mato'), [2100, 2800], 'Mato is worth 1000 on Ascended too');
});

test('the titles and the notes come in both languages', () => {
  for (const s of H.STATUES) {
    for (const k of ['title', 'arena']) {
      if (!s[k] && k === 'arena') continue;
      assert.equal(typeof s[k].es, 'string', `${s.id}.${k} has no Spanish`);
      assert.equal(typeof s[k].en, 'string', `${s.id}.${k} has no English`);
      assert.ok(!SPANISH_CHARS.test(s[k].en), `${s.id}.${k}: Spanish in the English: ${s[k].en}`);
    }
  }
  assert.equal(H.STATUE_BY_ID['gruz-mother'].title.es, 'Somnoliento dios de la fertilidad');
  assert.equal(H.STATUE_BY_ID['gruz-mother'].title.en, 'Slumbering god of fertility');
});

test("every statue, every symbol, every state of the idol and the tablet have their image", () => {
  const dir = path.join(__dirname, '..', 'assets', 'hall');
  const isMissing = (f) => !fs.existsSync(path.join(dir, f));
  const artIds = [...new Set(H.STATUES.map(H.artOf))];
  assert.equal(artIds.length, 39, '35 pedestals and the 4 lever variants');
  const files = [...artIds.map((id) => id + '.png'),
    ...H.DIFFS.map((d) => `badge-${d}.png`), ...H.DIFFS.map((d) => `idol-${d}.png`),
    'tablet.png', 'tablet-hdr.png', 'tablet-ftr.png'];
  assert.deepEqual(files.filter(isMissing), [], 'images missing: npm run hall');
  // The dreamcatcher ones share their partner's statue.
  assert.equal(H.artOf(H.STATUE_BY_ID['failed-champion']), 'false-knight');
  assert.equal(H.artOf(H.STATUE_BY_ID['hornet-sentinel']), 'hornet-sentinel');
});

/* The entrance tablet, column by column, as it appears in "Screenshot HK Hall of Gods 03". */
const TABLET_EN = [
  ['Gruz Mother', 'Vengefly King', 'Brooding Mawlek', 'False Knight', 'Failed Champion', 'Hornet Protector',
   'Hornet Sentinel', 'Massive Moss Charger', 'Flukemarm', 'Mantis Lords', 'Sisters of Battle'],
  ['Oblobble', 'Hive Knight', 'Broken Vessel', 'Lost Kin', 'Nosk', 'Winged Nosk',
   'The Collector', 'God Tamer', 'Crystal Guardian', 'Enraged Guardian', 'Uumuu'],
  ['Traitor Lord', 'Grey Prince Zote', 'Soul Warrior', 'Soul Master', 'Soul Tyrant', 'Dung Defender',
   'White Defender', 'Watcher Knight', 'No Eyes', 'Marmu', 'Galien'],
  ['Markoth', 'Xero', 'Gorb', 'Elder Hu', 'Oro & Mato', 'Paintmaster Sheo',
   'Nailsage Sly', 'Pure Vessel', 'Grimm', 'Nightmare King', 'Radiance'],
];
const tabletName = (id) => { const s = H.STATUE_BY_ID[id]; return s.tablet ? s.tablet.en : foes.FOE_BY_ID[id].name.en; };

test("the tablet: the 44 statues, in four columns of eleven and with the names from its screenshot", () => {
  assert.deepEqual([...H.TABLET].sort(), H.STATUES.map((s) => s.id).sort(), "they aren't the Hall's 44");
  assert.deepEqual(H.TABLET.map(tabletName), TABLET_EN.flat());
  // Its order isn't quite STATUES': Galien comes before Markoth and Xero.
  assert.deepEqual(H.TABLET.slice(30, 35), ['no-eyes', 'marmu', 'galien', 'markoth', 'xero']);
});

test("the tablet's statue names, only where they aren't the entry's", () => {
  const tabletNamed = H.STATUES.filter((s) => s.tablet);
  assert.deepEqual(tabletNamed.map((s) => s.id), ['oblobbles', 'watcher-knights', 'oro-mato', 'sly', 'grimm', 'nkg', 'absolute-radiance']);
  for (const s of tabletNamed) {
    assert.notEqual(s.tablet.en, foes.FOE_BY_ID[s.id].name.en, `${s.id}: "tablet" same as the entry`);
    assert.ok(!SPANISH_CHARS.test(s.tablet.en), `${s.id}.tablet: Spanish in the English`);
    assert.ok(s.tablet.es.length > 0, `${s.id}.tablet has no Spanish`);
  }
  // Its page's ESname or the statue's title on the Spanish wiki.
  assert.equal(H.STATUE_BY_ID['watcher-knights'].tablet.es, 'Caballero vigía');
  assert.equal(H.STATUE_BY_ID['nkg'].tablet.es, 'Rey Pesadilla');
});

test("the tablet's symbol is the highest you have, or none", () => {
  assert.equal(H.tabletMark({}, 'xero'), null);
  assert.equal(H.tabletMark(null, 'xero'), null);
  assert.equal(H.tabletMark({ xero: ['at'] }, 'xero'), 'at');
  assert.equal(H.tabletMark({ xero: ['at', 'asra'] }, 'xero'), 'asra');
  assert.equal(H.tabletMark({ xero: ['radiant', 'at', 'asra'] }, 'xero'), 'radiant', "doesn't depend on the saved order");
  assert.equal(H.tabletMark({ xero: ['base'] }, 'xero'), null);
  assert.equal(H.tabletMark({ gorb: ['at'] }, 'xero'), null);
});

test('the saved marks are cleaned', () => {
  assert.deepEqual(H.normalizeMarks(null), {});
  assert.deepEqual(H.normalizeMarks([]), {});
  assert.deepEqual(H.normalizeMarks({
    'gruz-mother': ['radiant', 'at', 'at', 'base'],
    'no-such-boss': ['at'],
    'xero': 'at',
    'gorb': [],
  }), { 'gruz-mother': ['at', 'radiant'] });
});

test('the Void Idol: all at one difficulty, or at a higher one', () => {
  const allAt = (diffs) => Object.fromEntries(H.STATUES.map((s) => [s.id, diffs]));
  assert.equal(H.idolTier({}), null);
  assert.equal(H.idolTier(allAt(['at'])), 'at');
  assert.equal(H.idolTier(allAt(['asra'])), 'asra', 'winning on Ascended counts for the Attuned level');
  assert.equal(H.idolTier(allAt(['at', 'radiant'])), 'radiant');
  const almost = allAt(['radiant']);
  delete almost['absolute-radiance'];
  assert.equal(H.idolTier(almost), null, 'with one unbeaten there is no idol');
});

test('"See their statue" for the Hollow Knight and the Radiance leads to their Hall versions', () => {
  assert.equal(H.statueFor('hollow-knight'), 'pure-vessel');
  assert.equal(H.statueFor('the-radiance'), 'absolute-radiance');
  assert.equal(H.statueFor('xero'), 'xero');
  assert.equal(H.statueFor('crawlid'), null);
});

test('marking by hand: Radiant switches on Ascended, and removing Ascended switches off Radiant', () => {
  const T = H.toggleMark;
  let m = T({}, 'xero', 'at');
  assert.deepEqual(m, { xero: ['at'] });
  m = T(m, 'xero', 'radiant');
  assert.deepEqual(m, { xero: ['at', 'asra', 'radiant'] }, 'Radiant only exists after Ascended');
  m = T(m, 'xero', 'asra');
  assert.deepEqual(m, { xero: ['at'] }, 'without Ascended there is no Radiant');
  m = T(m, 'xero', 'at');
  assert.deepEqual(m, {}, 'with no symbols, the statue disappears from the marks');
  // Attuned goes on its own: Ascended neither gives it nor takes it away.
  m = T({}, 'gorb', 'asra');
  assert.deepEqual(m, { gorb: ['asra'] });
  assert.deepEqual(T(m, 'gorb', 'asra'), {});
  // Doesn't mutate what it's given, and cleans what's broken along the way.
  const dado = { gorb: ['asra'], 'no-such-boss': ['at'] };
  const out = T(dado, 'gorb', 'at');
  assert.deepEqual(dado, { gorb: ['asra'], 'no-such-boss': ['at'] });
  assert.deepEqual(out, { gorb: ['at', 'asra'] });
  assert.deepEqual(T({}, 'no-such-boss', 'at'), {});
  assert.deepEqual(T({}, 'xero', 'base'), {});
});

test("mark in bulk: one symbol on all 44, with the plaque's rules", () => {
  const A = H.markAll;
  const allEqual = (m, list) => H.STATUES.every((s) => String(m[s.id]) === String(list));
  let m = A({}, 'at', true);
  assert.equal(Object.keys(m).length, 44);
  assert.ok(allEqual(m, ['at']), 'all 44 on Attuned');
  m = A(m, 'radiant', true);
  assert.ok(allEqual(m, ['at', 'asra', 'radiant']), 'marking Radiant switches on Ascended');
  assert.equal(H.idolTier(m), 'radiant');
  assert.ok(allEqual(A(m, 'radiant', false), ['at', 'asra']), 'removing Radiant leaves Ascended');
  assert.ok(allEqual(A(m, 'asra', false), ['at']), 'removing Ascended switches off Radiant');
  assert.deepEqual(A(A(m, 'at', false), 'asra', false), {}, 'with no symbols nothing remains');
  // Only touches the ones that don't already have it: the other marks stay as they were.
  const dado = { xero: ['asra'], gorb: ['at'], 'no-such-boss': ['at'] };
  const out = A(dado, 'at', false);
  assert.deepEqual(out, { xero: ['asra'] });
  assert.deepEqual(dado, { xero: ['asra'], gorb: ['at'], 'no-such-boss': ['at'] }, "doesn't mutate what it's given");
  assert.deepEqual(A(A({}, 'asra', true), 'asra', true), A({}, 'asra', true), 'marking twice is the same');
  assert.deepEqual(A({ xero: ['at'] }, 'base', true), { xero: ['at'] }, "an odd difficulty doesn't change anything");
});

test("the short name, only where the full one doesn't fit on the tile, and in both languages", () => {
  const shortNamed = H.STATUES.filter((s) => s.short);
  assert.deepEqual(shortNamed.map((s) => s.id), ['sly', 'grimm'], "in the Hall's order");
  for (const s of shortNamed) {
    assert.equal(typeof s.short.es, 'string');
    assert.equal(typeof s.short.en, 'string');
    assert.ok(!SPANISH_CHARS.test(s.short.en), `${s.id}.short: Spanish in the English`);
  }
});

test('the arena notes the wiki gives, and with no note it is "As in the base game"', () => {
  const arenaOf = (id) => H.STATUE_BY_ID[id].arena;
  for (const id of ['massive-moss-charger', 'watcher-knights', 'soul-master', 'soul-tyrant']) assert.ok(arenaOf(id), `${id} has no note`);
  assert.match(arenaOf('watcher-knights').en, /cannot be reduced to five/);
  assert.match(arenaOf('traitor-lord').en, /Mantis Traitors/);
  assert.match(arenaOf('grey-prince-zote').en, /third/);
  assert.match(arenaOf('false-knight').en, /floor/);
  assert.match(arenaOf('failed-champion').en, /floor/);
  // "Same arena as the base game fight, no difficulty differences": no note, and the plaque says so.
  for (const id of ['hornet-protector', 'oblobbles', 'galien', 'elder-hu', 'pure-vessel']) assert.ok(!arenaOf(id), `${id} has a note`);
});
