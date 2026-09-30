// js/scene-objects.js (tools/extract-scenes.py) and js/people.js: what each room holds, for the Map.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SO = require('../js/scene-objects.js');
const PE = require('../js/people.js');
const M = require('../js/map.js');
const SV = require('../js/savefile.js');

const placed = (scene) => !!(M.ROOMS[scene] || M.ANCHORS[scene] || M.HOSTS[scene]);

test('the enemies count for a Journal entry the site reads from a save', () => {
  const known = new Set([...Object.values(SV.JOURNAL_PD), 'Crawler', 'Dummy']);
  for (const [scene, rows] of Object.entries(SO.ENEMIES)) {
    for (const [pd, n] of rows) assert.ok(known.has(pd) && n >= 1, `${scene} ${pd}`);
  }
});

test("what the Map puts in a drawn room has its room's size, to be placed in it", () => {
  for (const list of [SO.SECRETS, SO.ROCKS, SO.CHESTS, SO.TOTEMS, SO.TABLETS]) {
    for (const scene of Object.keys(list)) if (M.ROOMS[scene]) assert.ok(SO.SIZES[scene], scene);
  }
  assert.equal(Object.values(SO.CHESTS).flat().length, 12);
  assert.equal(Object.values(SO.TABLETS).flat().length, 33);
});

test('every lore tablet carries its text in both languages', () => {
  for (const rows of Object.values(SO.TABLETS)) for (const [name, , , , text] of rows) assert.ok(text.es && text.en, name);
});

test("the characters' meetings: each in a room the map places, with its own bool", () => {
  for (const who of PE.PEOPLE) {
    assert.ok(who.es && who.en, who.id);
    for (const [scene, , , flag] of who.stops) assert.ok(placed(scene) && /^[a-zA-Z0-9_]+$/.test(flag), `${who.id} ${scene}`);
  }
  assert.equal(PE.FLAGS.length, new Set(PE.FLAGS).size);
});

test('the Map has the pictures it asks for', () => {
  for (const f of ['totem', 'tablet']) assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'world', f + '.png')), f);
});
