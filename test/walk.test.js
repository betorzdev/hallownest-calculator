// js/walk.js: the way the Knight takes across the map, on js/map-walk.js (tools/extract-walk.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert');

const R = require('../js/rooms.js');
const M = require('../js/map.js');
const MW = require('../js/map-walk.js');
const W = require('../js/walk.js');

// A bench's point, as js/app-map.js places it: the game's pin, or its room.
const sceneOf = (name) => name.replace(/_(b|c|d|part_b|left|right)$/, '');
const point = (scene) => { const b = M.PINS.find((p) => p[0] === 'bench' && sceneOf(p[1]) === scene); return b ? [b[2], b[3]] : W.roomPoint(scene); };
const foot = { point };
const all = { point, stags: W.RIDES.stag.stops, trams: Object.values(W.RIDES.tram.lines), lifts: Object.values(W.RIDES.lift.lines) };
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const length = (legs) => legs.reduce((s, l) => s + l.pts.reduce((t, p, i) => t + (i ? dist(p, l.pts[i - 1]) : 0), 0), 0);
const kinds = (legs) => legs.map((l) => l.kind).join(' ');

test("every drawn room with doors has its ground, and the runs fill the grid", () => {
  const missing = [];
  for (const [name] of Object.entries(M.ROOMS)) {
    const sc = R.DOORS[name] ? name : (name.match(/^(.*)_(b|c|d|part_b|left|right|top|bot|top_2)$/) || [])[1];
    if (sc && R.DOORS[sc] && !MW.MASKS[sc]) missing.push(name);
  }
  assert.deepEqual(missing, ['Ruins1_31b'], 'a drawing with nothing in it has no ground');
  for (const [sc, [x0, y0, w, h, runs]] of Object.entries(MW.MASKS)) {
    assert.ok(R.DOORS[sc] && w > 0 && h > 0 && x0 >= M.BOUNDS[0] - 1 && y0 >= M.BOUNDS[1] - 1, sc);
    let cells = 0;
    for (const ch of runs) { const n = MW.RLE64.indexOf(ch); assert.ok(n >= 0, sc); cells += n; }
    assert.equal(cells, w * h, sc);
    assert.ok(W.maskOf(sc).g.some((v) => v), sc + ' has some ground');
  }
});

test('the tables name each room\'s doors and stops in order, with a cost for every pair and every door\'s step', () => {
  for (const [sc, [names, costs, steps]] of Object.entries(MW.TABLES)) {
    assert.deepEqual(names, W.nodesOf(sc).map((n) => n.name), sc);
    assert.equal(costs.length, (names.length * (names.length - 1)) / 2, sc);
    for (const c of costs) assert.ok(c >= 0, sc);   // 0: two doors on one cell
    assert.equal(steps.length, names.length, sc);
    // A door's step is -1 only when its other side has no point (the White Palace, undrawn).
    names.forEach((n, i) => assert.ok(n.includes('[') ? steps[i] >= 0 || /^White_Palace_/.test(sc) : steps[i] === -1, sc + ' ' + n));
  }
  // Rebuilt here, a table says the same: the tables and the walk agree.
  for (const sc of ['Crossroads_01', 'Town', 'Ruins2_10b']) assert.deepEqual(W.tableOf(sc), MW.TABLES[sc], sc);
});

test("every stop of a ride has the game's pin, in a room the doors know", () => {
  const stops = [['stag', W.RIDES.stag.stops], ['tram', Object.values(W.RIDES.tram.lines).flat()], ['lift', Object.values(W.RIDES.lift.lines).flat()]];
  for (const [kind, list] of stops) for (const pin of list) {
    assert.ok(M.PINS.some((p) => p[0] === kind && p[1] === pin), kind + ' ' + pin);
    const room = R.DOORS[pin] ? pin : pin.replace(/_(b|c|d)$/, '');
    assert.ok(R.DOORS[room] && MW.TABLES[room] && MW.TABLES[room][0].includes(`${kind}:${pin}`), kind + ' ' + pin + ' in ' + room);
  }
});

test('on foot, the way keeps to the ground the map draws, and the stations are walked between', () => {
  const legs = W.find('Town', 'Crossroads_47', foot);
  assert.equal(kinds(legs), 'walk');
  const pts = legs[0].pts;
  assert.ok(pts.length > 10, 'turns along the corridors: ' + pts.length);
  assert.deepEqual(pts[0], point('Town'));
  assert.deepEqual(pts[pts.length - 1], point('Crossroads_47'));
  // Every turn on the ground (the bench's own point, pinned by the game, may be a step off it).
  const { g } = W.grid();
  for (const p of pts.slice(1, -1)) assert.ok(g[W.cellAt(p)], 'off the ground: ' + p);
  assert.ok(length(legs) > 7 && length(legs) < 12, 'the walk is about 8 units: ' + length(legs).toFixed(1));
});

test('the rides are taken when they are shorter: the stag, the tram and the lift', () => {
  // Greenpath's station to the Distant Village's: by stag.
  assert.equal(kinds(W.find('Fungus1_16_alt', 'Deepnest_09', all)), 'walk stag walk');
  // Resting Grounds to King's Station: a ride either way (the stag, or the City's east lift straight down).
  assert.match(kinds(W.find('RestingGrounds_09', 'Ruins2_08', all)), /^walk (stag|lift) walk$/);
  // The Hidden Station to the Stag Nest, the kingdom's two ends: by stag.
  assert.ok(kinds(W.find('Abyss_22', 'Cliffs_02', all)).includes('stag'));
  // The Ancient Basin's bench to the Hive's: the lower tram.
  assert.equal(kinds(W.find('Abyss_18', 'Hive_01', all)), 'walk tram walk');
  // The Crossroads' station to the City's first bench: the lift down.
  assert.equal(kinds(W.find('Crossroads_47', 'Ruins1_02', all)), 'walk lift walk');
  // Dirtmouth to the Crossroads' station: a short hop, walked (a stag ride is worth a longer walk).
  assert.equal(kinds(W.find('Town', 'Crossroads_47', all)), 'walk');
  // With no rides, the same ways go on foot, longer.
  assert.equal(kinds(W.find('Abyss_18', 'Hive_01', foot)), 'walk');
  assert.ok(length(W.find('Abyss_18', 'Hive_01', foot)) > length(W.find('Abyss_18', 'Hive_01', all)));
  // A ride's leg is its two stops.
  const lift = W.find('Crossroads_47', 'Ruins1_02', all).find((l) => l.kind === 'lift');
  assert.equal(lift.pts.length, 2);
  assert.ok(Math.abs(lift.pts[0][0] - lift.pts[1][0]) < 0.2, 'a lift goes straight down');
});

test('no way by dream, and the Black Egg Temple\'s bench starts at its door', () => {
  assert.equal(W.find('Town', 'GG_Atrium', all), null);
  assert.equal(W.find('White_Palace_01', 'Town', all), null);
  assert.equal(kinds(W.find('Room_Final_Boss_Atrium', 'Town', all)), 'walk');
  // To a point in a room instead of its bench (the Map's "How to get there").
  const end = W.roomPoint('Crossroads_08');
  const legs = W.find('Town', 'Crossroads_08', { ...foot, end });
  assert.deepEqual(legs[legs.length - 1].pts.slice(-1)[0], end);
});

test('every bench the doors reach has a way from every other, in good time', () => {
  const benches = M.PINS.filter((p) => p[0] === 'bench' && !/^(GG_|White_Palace_)/.test(p[1])).map((p) => sceneOf(p[1]));
  const t0 = Date.now();
  let n = 0;
  for (const a of benches) for (const b of benches) if (a !== b && (n++ % 7 === 0)) assert.ok(W.find(a, b, all), a + ' → ' + b);
  const per = (Date.now() - t0) / Math.ceil(n / 7);
  assert.ok(per < 200, 'a way in ' + per.toFixed(0) + ' ms');
});

test('a polyline keeps its turns and loses its staircase', () => {
  const pts = [[0, 0], [1, 0.01], [2, 0], [2, 1], [2, 2]];
  assert.deepEqual(W.simplify(pts, 0.05), [[0, 0], [2, 0], [2, 2]]);
  assert.deepEqual(W.simplify(pts, 0.001), [[0, 0], [1, 0.01], [2, 0], [2, 2]]);   // (2, 1) is on the line
});
