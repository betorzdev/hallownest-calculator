// js/benches.js: each bench of the game as it draws it (tools/extract-benches.py).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const B = require('../js/benches.js');
const M = require('../js/map.js');

test('every bench has its picture, with the Knight sitting on it', () => {
  for (const [key, [w, , x]] of Object.entries(B.ART)) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'benches', key + '.png')), key);
    assert.ok(x > 0 && x < w, key);
  }
  // His seat (11 below his point) on the picture: above its foot, and not far over its top.
  for (const [scene, [key, y]] of Object.entries(B.SCENES)) {
    assert.ok(B.ART[key], scene);
    assert.ok(y + 11 > -10 && y + 11 < B.ART[key][1], scene);
  }
  assert.equal(B.SCENES.Crossroads_30[0], 'town-bench', 'the town bench, drawn when no bench is known');
});

test("the map's bench pins that name a real scene all have their bench", () => {
  const scenes = new Set(M.PINS.filter((p) => p[0] === 'bench').map((p) => p[1]));
  for (const s of ['Town', 'Crossroads_47', 'Crossroads_04', 'Fungus2_31', 'Abyss_18', 'Fungus1_15', 'Deepnest_East_06']) {
    assert.ok(scenes.has(s) && B.SCENES[s], s);
  }
  assert.ok(Object.keys(B.SCENES).length >= 50);
});
