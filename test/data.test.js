'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../js/data.js');

test('45 charms with unique ids and slots 1–40', () => {
  assert.equal(D.CHARMS.length, 45);
  assert.equal(new Set(D.CHARMS.map((c) => c.id)).size, 45);
  const nums = new Set(D.CHARMS.map((c) => c.num));
  for (let n = 1; n <= 40; n++) assert.ok(nums.has(n), `slot ${n} is missing`);
  for (const c of D.CHARMS) {
    assert.ok(c.es && c.en && c.wikiFile && c.blurb, `${c.id} incomplete`);
    assert.ok(Number.isInteger(c.notches) && c.notches >= 0 && c.notches <= 5, `${c.id} notches`);
  }
});

test('mutually exclusive groups share a slot', () => {
  const byGroup = {};
  for (const c of D.CHARMS) if (c.group) (byGroup[c.group] = byGroup[c.group] || []).push(c);
  assert.deepEqual(Object.keys(byGroup).sort(), ['greed', 'grimm', 'heart', 'king', 'strength']);
  for (const list of Object.values(byGroup)) {
    assert.equal(list.length, 2);
    assert.equal(list[0].num, list[1].num);
  }
  assert.equal(D.CHARM_BY_ID.voidheart.notches, 0);
  assert.equal(D.CHARM_BY_ID.kingsoul.notches, 5);
});

test('stat definitions are consistent', () => {
  assert.equal(new Set(D.STAT_DEFS.map((d) => d.id)).size, D.STAT_DEFS.length);
  const groups = new Set(D.GROUPS.map((g) => g.id));
  for (const d of D.STAT_DEFS) {
    assert.ok(groups.has(d.group), `${d.id} unknown group`);
    assert.ok(d.label && (d.short || d.group === 'spell'), `${d.id} has no label`);   // spells use their name as the short label
    assert.ok(['int', 'dec1', 'dec2', 'dec3', 'sec', 'pct', 'mult', 'speed', 'flag'].includes(d.fmt), `${d.id} format`);
    if (d.fmt === 'flag') assert.ok(['on', 'off'].includes(d.better));
    else assert.ok(['up', 'down', 'none'].includes(d.better));
  }
});

test('there is a file for every ART artwork', () => {
  const root = path.join(__dirname, '..', 'assets');
  for (const [group, files] of Object.entries(D.ART)) {
    for (const key of Object.keys(files)) {
      const file = path.join(root, group, key + '.png');
      assert.ok(fs.existsSync(file) && fs.statSync(file).size > 100, `${file} is missing (run node tools/fetch-icons.js)`);
    }
  }
});

test('there is an icon per charm in assets/charms', () => {
  const dir = path.join(__dirname, '..', 'assets', 'charms');
  for (const c of D.CHARMS) {
    const file = path.join(dir, c.id + '.png');
    assert.ok(fs.existsSync(file) && fs.statSync(file).size > 100, `${file} is missing (run node tools/fetch-icons.js)`);
  }
});

/* The sheet's "Effects" plates: each one points to something that exists. */
test('effects: charm, moment, stat and artwork exist', () => {
  const whens = new Set(D.EFFECT_WHEN.map((w) => w.id));
  const hasArt = ([group, key]) => D.ART[group] && D.ART[group][key];
  for (const fx of D.CHARM_EFFECTS) {
    const ids = [].concat(fx.charm);
    const label = ids.join('/');
    for (const id of ids) assert.ok(D.CHARM_BY_ID[id], `${label}: unknown charm`);
    assert.ok(whens.has(fx.when), `${label}: moment ${fx.when}`);
    assert.ok(fx.title && fx.line && fx.note, `${label}: texts missing`);
    if (fx.art) assert.ok(hasArt(fx.art), `${label}: artwork ${fx.art}`);
    for (const a of Object.values(fx.artWith || {})) assert.ok(hasArt(a), `${label}: artwork ${a}`);
    for (const id of Object.keys(fx.artWith || {})) assert.ok(D.CHARM_BY_ID[id], `${label}: artWith ${id}`);
    // With a figure, the sentence has somewhere to put it; without one, it doesn't expect it.
    for (const lang of ['es', 'en']) assert.equal(fx.line[lang].includes('{v}'), !!fx.stat, `${label}: {v} in ${lang}`);
    if (fx.stat) assert.ok(D.STAT_BY_ID[fx.stat], `${label}: stat ${fx.stat}`);
    if (fx.extra) {
      assert.ok(D.STAT_BY_ID[fx.extra.stat], `${label}: extra stat ${fx.extra.stat}`);
      for (const lang of ['es', 'en']) assert.ok(fx.extra.line[lang].includes('{v}') && fx.extra.note[lang].includes('{v}'), `${label}: extra {v} in ${lang}`);
    }
    assert.ok([undefined, 'plus', 'pctOver'].includes(fx.show), `${label}: show ${fx.show}`);
  }
});
