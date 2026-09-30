// js/map.js: the game's own map (tools/extract-map.py), and the collectibles on it.
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const M = require('../js/map.js');
const CO = require('../js/collectibles.js');
const R = require('../js/rooms.js');

const place = (scene) => M.ROOMS[scene] || M.ANCHORS[scene] || M.HOSTS[scene];

test("the map has the game's areas, rooms with their drawings, and its pins", () => {
  assert.equal(M.AREAS.length, 14);
  assert.ok(Object.keys(M.ROOMS).length > 300);
  for (const [name, r] of Object.entries(M.ROOMS)) {
    const [area, , , w, h, , , full, rough] = r;
    assert.ok(M.AREAS[area] !== undefined && w > 0 && h > 0, name);
    for (const [rect, atlas] of [[full, M.ATLAS.full], [rough, M.ATLAS.rough]]) {
      assert.ok(rect[0] + rect[2] <= atlas[0] && rect[1] + rect[3] <= atlas[1], name);
    }
  }
});

test('every collectible has a place on the map', () => {
  for (const it of CO.ITEMS) assert.ok(place(it.scene), it.id + ' ' + it.scene);
});

test("the game's own pins sit in their room", () => {
  for (const [kind, scene, x, y] of M.PINS) {
    const r = M.ROOMS[scene];
    if (!r) continue;                               // a Dreamer's pin is named by who, not by a room
    // (A pin may sit a little outside its room's drawing, as the Stag Nest's does: its room isn't drawn.)
    assert.ok(Math.abs(x - r[1]) <= r[3] / 2 + 3 && Math.abs(y - r[2]) <= r[4] / 2 + 3, `${kind} ${scene}`);
  }
  // One pin per grub, whispering root, stag station and flame the catalogue places by them.
  const count = (k) => M.PINS.filter((p) => p[0] === k).length;
  assert.equal(count('grub'), 44);
  assert.equal(count('stag'), 11);
  assert.equal(count('flame'), 10);
});

test("the map's titles and the warriors' graves", () => {
  // Each of the 14 areas carries the site's area for its name; each place title sits on a known room.
  assert.equal(M.AREA_IDS.length, M.AREAS.length);
  for (const id of M.AREA_IDS) assert.ok(R.AREAS[id], id);
  assert.ok(M.PLACE_LABELS.length >= 20);
  for (const [scene, name] of M.PLACE_LABELS) {
    assert.ok(M.ROOMS[scene] || M.ANCHORS[scene], scene);
    assert.ok(name.es && name.en, scene);
  }
  // The seven warrior dreams, one grave each.
  assert.deepEqual(M.PINS.filter((p) => p[0] === 'grave').map((p) => p[1]).sort(),
    ['Cliffs_02', 'Deepnest_40', 'Deepnest_East_10', 'Fungus1_34', 'Fungus2_32', 'Fungus3_40', 'RestingGrounds_02']);
});

test("the doors join rooms both ways, and every bench can be walked to from King's Pass", () => {
  assert.ok(Object.keys(R.DOORS).length > 300);
  // Three rooms the doors reach that the map places on a neighbour (js/app-map.js, ALIAS); and the
  // White Palace, which the game's map doesn't draw (the walk skips a room with no point).
  const ALIASED = new Set(['Room_Sly_Storeroom', 'Room_Bretta_Basement']);
  for (const [a, doors] of Object.entries(R.DOORS)) {
    assert.ok(place(a) || ALIASED.has(a) || a.startsWith('White_Palace_'), a);
    for (const [d, [b, e]] of Object.entries(doors)) {
      // A door's name says its side of the room, or that it's in the background (js/app-map.js, doorPoint).
      assert.match(d, /^(left|right|top|bot|door)\d+$|^(door|room)_/, a + '[' + d + ']');
      assert.ok(R.DOORS[b] && R.DOORS[b][e] && R.DOORS[b][e][0] === a && R.DOORS[b][e][1] === d, a + '[' + d + '] <-> ' + b + '[' + e + ']');
    }
  }
  // Breadth first from the first room. Godhome and the White Palace are entered by dream, not by a door.
  const seen = new Set(['Tutorial_01']), queue = ['Tutorial_01'];
  while (queue.length) { const sc = queue.shift(); for (const [n] of Object.values(R.DOORS[sc] || {})) if (!seen.has(n)) { seen.add(n); queue.push(n); } }
  const sceneOf = (name) => name.replace(/_(b|c|d|part_b|left|right)$/, '');
  for (const [kind, scene] of M.PINS) {
    if (kind !== 'bench' || /^(GG_|White_Palace_)/.test(scene)) continue;
    assert.ok(seen.has(sceneOf(scene)), scene);
  }
});

test('the key items have their place on the map (js/app-map.js, KEY_AT)', () => {
  // The ItemChanger places js/app-map.js puts them on: each must be among the map's SPOTS.
  for (const ic of ['Sly', 'City_Crest', "Shopkeeper's_Key", 'Sly_(Key)', 'Love_Key', 'Tram_Pass', 'Godtuner',
    "Collector's_Map", "Hunter's_Journal"]) assert.ok(M.SPOTS[ic], ic);
});
