/* js/walk.js — the way the Knight takes across the map, from one point to another: on foot along
   the ground the map draws, room to room through the game's doors, and by the rides the kingdom
   has when they're shorter: the stag stations, the two trams and the two lifts of the City.
   Pure: no DOM, no language; js/app-knight.js animates what it returns, and the Map's "How to
   get there" draws it. Where things stand on the map is here too (roomPoint, doorPoint), for
   js/app-map.js and for tools/extract-walk.js, which prepares the tables below.

   The ground is js/map-walk.js (MASKS: each room's drawing on a grid of CELL units), laid out
   here once as one grid of the whole map (grid): a cell is ground where any room draws it, rock
   elsewhere. He walks that grid eight ways (astar, within a window around the two ends),
   keeping to the middle of a corridor (a cell within NEAR cells of rock costs more); rock can be
   walked at ROCK times the cost, so a drawing that seals a way with a line, or leaves a gap
   between two rooms, is crossed where the crossing is shortest, and only where nothing goes
   round. The shortest way across the kingdom is Dijkstra over the rooms' doors (js/rooms.js,
   DOORS) and the rides' stops: the cost of crossing a room from one node to another, and of
   stepping through a door to its other side, is that walk on the grid; a door stands where its
   corridor ends (doorAt). A ride joins two of its stops with its own cost (RIDES): a stag ride
   is worth so much walking whatever the distance (the game's is instant), a tram or a lift so
   much a unit plus a stop. Those costs never change, so js/map-walk.js carries them ready
   (TABLES, from this same code): only the two ends and the edges the way takes are walked on
   the grid here. A point off any ground (a bench pinned off its drawing) stands on the nearest
   ground within SNAP cells, or on the rock it's over; a room the map doesn't draw (a shop, the
   Colosseum: a point on its neighbour) is reached across the rock.

   find(from, to, env) → the way as legs, or null (no way: Godhome and the White Palace are
   entered by dream; a room with no point). Each leg { kind: 'walk' | 'stag' | 'tram' | 'lift',
   pts: [[x, y]…] }, in the map's units; a walk's points are its turns (the grid's staircase
   smoothed off), a ride's its two stops. env:
     point(scene) → [x, y]: where a bench is (or null); end: the point to end at instead, in `to`
     stags: the stations he may ride between; trams: its lines, each its stops in order; lifts:
     each its two ends (RIDES has the kingdom's; the caller says which the save has opened).
     A stop is named by the room the game's map pins it in. trace: an array, filled with the
     way's edges by name (debug-walk.html). */
(() => {
  'use strict';
  const HK = globalThis.HK || (globalThis.HK = {});
  const R = HK.rooms, MW = HK.mapWalk, M = HK.map;
  const CELL = MW.CELL;
  const SNAP = Math.round(0.5 / CELL);   // cells: how far off the ground a point may stand (half a unit)
  const NEAR = Math.round(0.1 / CELL);   // cells from rock within which walking costs more (he keeps to the middle)
  const ROCK = 200;                      // what a cell of rock costs against 1 of ground: crossed only where nothing goes round
  const WINDOW = Math.round(3 / CELL);   // cells around the two ends of a step that a way round may use
  /* The kingdom's rides, each stop by the room the game's map pins it in (js/map.js, PINS: stag,
     tram, lift; the stag's station at Dirtmouth is pinned on the town, the Stag Nest's on the
     cliffs' room), and what a ride costs against walking a unit: worth, a stag ride whatever the
     distance (a short hop is walked); perUnit and stop, a tram or lift along its line. The lifts
     inside one room (to Crystal Peak, to the Pleasure House) are doors already. */
  const RIDES = {
    stag: { worth: 10, stops: ['Town', 'Crossroads_47', 'Fungus1_16_alt', 'Fungus2_02', 'Fungus3_40', 'Ruins1_29', 'Ruins2_08', 'RestingGrounds_09', 'Deepnest_09', 'Cliffs_02_b', 'Abyss_22'] },
    tram: { perUnit: 0.5, stop: 1, lines: { upper: ['Crossroads_46', 'Crossroads_46b'], lower: ['Abyss_03_b', 'Abyss_03', 'Abyss_03_c'] } },
    lift: { perUnit: 0.7, stop: 0.5, lines: { crossroads: ['Crossroads_49', 'Crossroads_49b'], city: ['Ruins2_10', 'Ruins2_10b'] } },
  };
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

  /* ── Where things stand ── */
  // Rooms the doors don't reach (a storeroom, a basement, the White Palace): placed on their neighbour.
  // (The Colosseum's third trial: js/map.js places the first two on its pin, and this one with them.)
  const ALIAS = { Room_Sly_Storeroom: 'Room_shop', Room_Bretta_Basement: 'Room_Bretta', White_Palace_09: 'Abyss_05',
    Room_Colosseum_Gold: 'Room_Colosseum_Bronze',
    // The Black Egg Temple's inner rooms (its bench, the Hollow Knight's chamber): at its door in the Crossroads.
    Room_Final_Boss_Atrium: 'Room_temple', Room_Final_Boss_Core: 'Room_temple' };
  const roomPoint = (scene) => {
    const sc = ALIAS[scene] || scene, r = M.ROOMS[sc];
    return r ? [r[1], r[2]] : M.ANCHORS[sc] || M.HOSTS[sc] || null;
  };
  /* A door's point: on its room's edge, on the side its name says (js/rooms.js, DOORS: left1,
     right2, top1, bot1), halfway to the facing edge of the room across (the map's rooms overlap
     a little, or leave a gap: both sides of a door meet at one point), and at the middle of
     where the two rooms' boxes overlap the other way (or the end nearest the room across, if
     they don't); a door in the background (door_sly, room_grimm) is the box's point nearest the
     room across. A room the map doesn't draw: its point (an anchor, a host's door), or null. */
  function doorPoint(scene, door, other) {
    const r = M.ROOMS[ALIAS[scene] || scene];
    if (!r) return roomPoint(scene);
    const [, x, y, w, h] = r, or = other && M.ROOMS[ALIAS[other] || other], op = or ? [or[1], or[2], or[3], or[4]] : other && roomPoint(other);
    const o = op ? [op[0], op[1], op[2] || 0, op[3] || 0] : null;     // the room across: centre and size (a point: no size)
    const clamp = (v, c, s) => Math.max(c - s / 2, Math.min(c + s / 2, v));
    // Along the edge: the middle of the two ranges' overlap, or the end nearest the other.
    const along = (c, s, oc, os) => { const lo = Math.max(c - s / 2, oc - os / 2), hi = Math.min(c + s / 2, oc + os / 2); return lo <= hi ? (lo + hi) / 2 : oc < c ? c - s / 2 : c + s / 2; };
    // Across the edge: halfway from this edge (c ± s/2) to the facing one, inside this box.
    const across = (edge, c, s, facing) => (facing === undefined ? edge : clamp((edge + facing) / 2, c, s));
    const side = (/^(left|right|top|bot)/.exec(door) || [])[1];
    if (side === 'left') return [across(x - w / 2, x, w, o && o[0] + o[2] / 2), o ? along(y, h, o[1], o[3]) : y];
    if (side === 'right') return [across(x + w / 2, x, w, o && o[0] - o[2] / 2), o ? along(y, h, o[1], o[3]) : y];
    if (side === 'top') return [o ? along(x, w, o[0], o[2]) : x, across(y + h / 2, y, h, o && o[1] - o[3] / 2)];
    if (side === 'bot') return [o ? along(x, w, o[0], o[2]) : x, across(y - h / 2, y, h, o && o[1] + o[3] / 2)];
    return o ? [clamp(o[0], x, w), clamp(o[1], y, h)] : [x, y];
  }
  // A stop's pin on the game's map, and the room the doors know it by (a pin's _b is a drawing's name, unless it's a room of its own).
  const stopPoint = (kind, pin) => { const p = M.PINS.find((x) => x[0] === kind && x[1] === pin); return p ? [p[2], p[3]] : null; };
  const stopRoom = (pin) => (R.DOORS[pin] ? pin : pin.replace(/_(b|c|d)$/, ''));
  // The room a bench's walk starts or ends in: its own, or the drawn neighbour it's placed on.
  const roomFor = (scene) => (R.DOORS[scene] ? scene : ALIAS[scene] && R.DOORS[ALIAS[scene]] ? ALIAS[scene] : scene);

  /* ── The ground: one grid of the whole map ── */
  let G = null;
  /* { x0, y1, w, h, g (ground, 1 a cell), wall (cells from rock, up to NEAR) }: every room's
     mask painted on one grid a unit wider than the map, built on first use. */
  function grid() {
    if (G) return G;
    const x0 = Math.floor(M.BOUNDS[0]) - 1, y1 = Math.ceil(M.BOUNDS[3]) + 1;
    const w = Math.ceil((Math.ceil(M.BOUNDS[2]) + 1 - x0) / CELL), h = Math.ceil((y1 - Math.floor(M.BOUNDS[1]) + 1) / CELL);
    const n = w * h, g = new Uint8Array(n);
    for (const [mx, my, mw, mh, runs] of Object.values(MW.MASKS)) {
      const ci = Math.round((mx - x0) / CELL), cj = Math.round((y1 - (my + mh * CELL)) / CELL);
      let k = 0, on = 0;
      for (const ch of runs) {
        const len = MW.RLE64.indexOf(ch);
        if (on) for (let c = k; c < k + len; c++) { const i = ci + (c % mw), j = cj + Math.floor(c / mw); if (i >= 0 && j >= 0 && i < w && j < h) g[j * w + i] = 1; }
        k += len; on ^= 1;
      }
    }
    // How far each ground cell is from rock, up to NEAR: one pass per step from the rock.
    const wall = new Uint8Array(n);
    for (let i = 0; i < n; i++) wall[i] = g[i] ? NEAR : 0;
    for (let d = 1; d < NEAR; d++) {
      for (let i = 0; i < n; i++) {
        if (wall[i] !== NEAR) continue;
        const x = i % w, y = (i - x) / w;
        if (!x || !y || x === w - 1 || y === h - 1 || wall[i - w] < d || wall[i + w] < d || wall[i - 1] < d || wall[i + 1] < d) wall[i] = d;
      }
    }
    return (G = { x0, y1, w, h, g, wall });
  }
  const centre = (i) => { const { x0, y1, w } = grid(); return [x0 + (i % w + 0.5) * CELL, y1 - (Math.floor(i / w) + 0.5) * CELL]; };
  const cellAt = (p) => { const { x0, y1, w, h } = grid(); return Math.min(h - 1, Math.max(0, Math.floor((y1 - p[1]) / CELL))) * w + Math.min(w - 1, Math.max(0, Math.floor((p[0] - x0) / CELL))); };
  /* The cell a point stands on: the nearest ground within SNAP cells (with a target, the ground
     within SNAP nearest the target instead), or the rock it's over. */
  function snap(p, target) {
    const { w, h, g } = grid(), c0 = cellAt(p), ci = c0 % w, cj = (c0 - ci) / w;
    if (!target && g[c0]) return c0;
    let best = c0, bd = Infinity;
    for (let j = Math.max(0, cj - SNAP); j <= Math.min(h - 1, cj + SNAP); j++) for (let i = Math.max(0, ci - SNAP); i <= Math.min(w - 1, ci + SNAP); i++) {
      if (!g[j * w + i]) continue;
      const c = centre(j * w + i), d = dist(target || p, c) + (target ? dist(p, c) * 0.25 : 0);
      if (d < bd) { bd = d; best = j * w + i; }
    }
    return best;
  }
  /* The walk from one cell to another: A* over the grid, eight ways (a diagonal only across
     ground, never squeezed past a corner), a step costing more by a wall and ROCK times as much
     into rock, within WINDOW cells around the two (a way round farther than that would cost
     more than crossing a wall). → { cost (map units), cells }. A binary heap on parallel arrays. */
  function astar(from, to) {
    const { w, h, g, wall } = grid();
    const fx = from % w, fy = (from - fx) / w, tx = to % w, ty = (to - tx) / w;
    const x0 = Math.max(0, Math.min(fx, tx) - WINDOW), x1 = Math.min(w - 1, Math.max(fx, tx) + WINDOW);
    const y0 = Math.max(0, Math.min(fy, ty) - WINDOW), y1 = Math.min(h - 1, Math.max(fy, ty) + WINDOW);
    const ww = x1 - x0 + 1, wh = y1 - y0 + 1, n = ww * wh;
    const d = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
    const start = (fy - y0) * ww + (fx - x0), goal = (ty - y0) * ww + (tx - x0);
    const heur = (k) => { const x = k % ww, y = (k - x) / ww; return Math.hypot(x + x0 - tx, y + y0 - ty); };
    const hc = [], hi = [];
    const push = (c, i) => {
      let k = hc.length; hc.push(c); hi.push(i);
      while (k) { const p = (k - 1) >> 1; if (hc[p] <= c) break; hc[k] = hc[p]; hi[k] = hi[p]; k = p; }
      hc[k] = c; hi[k] = i;
    };
    const pop = () => {
      const c = hc.pop(), i = hi.pop(), n2 = hc.length;
      if (!n2) return;
      let k = 0;
      for (;;) {
        let m = 2 * k + 1;
        if (m >= n2) break;
        if (m + 1 < n2 && hc[m + 1] < hc[m]) m++;
        if (hc[m] >= c) break;
        hc[k] = hc[m]; hi[k] = hi[m]; k = m;
      }
      hc[k] = c; hi[k] = i;
    };
    d[start] = 0; push(heur(start), start);
    while (hc.length) {
      const i = hi[0], f = hc[0]; pop();
      if (i === goal) break;
      const x = i % ww, y = (i - x) / ww, c = d[i];
      if (f > c + heur(i) + 1e-9) continue;          // a stale entry
      const gi = (y + y0) * w + (x + x0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= ww || ny >= wh) continue;
        const j = ny * ww + nx, gj = gi + dy * w + dx;
        if (dx && dy && !(g[gj] && g[gi + dx] && g[gi + dy * w])) continue;
        const nc = c + (dx && dy ? Math.SQRT2 : 1) * (g[gj] ? 1 + 0.5 * (NEAR - wall[gj]) : ROCK);
        if (nc < d[j]) { d[j] = nc; prev[j] = i; push(nc + heur(j), j); }
      }
    }
    const cells = [];
    for (let k = goal; k >= 0; k = prev[k]) { const x = k % ww, y = (k - x) / ww; cells.unshift((y + y0) * w + (x + x0)); if (k === start) break; }
    return { cost: d[goal] * CELL, cells };
  }
  // A room's own mask, decoded on its own (the tests look at them): { x0, y1, w, h, g }, or null.
  function maskOf(scene) {
    const m = MW.MASKS[scene];
    if (!m) return null;
    const [x0, y0, w, h, runs] = m, g = new Uint8Array(w * h);
    let k = 0, on = 0;
    for (const ch of runs) { const len = MW.RLE64.indexOf(ch); if (on) g.fill(1, k, k + len); k += len; on ^= 1; }
    return { x0, y1: y0 + h * CELL, w, h, g };
  }

  /* ── The nodes: a room's doors and stops ── */
  /* A door stands where its corridor ends: of the ground near its point on the room's edge, the
     cell nearest the other side (the corridor's mouth), so the step across goes from drawing to
     drawing by the shortest gap. */
  function doorAt(room, door, other) {
    const p = doorPoint(room, door, other);
    if (!p) return null;
    const [, e] = R.DOORS[room][door], q = doorPoint(other, e, room);
    return centre(snap(p, q || p));
  }
  /* A room's fixed nodes, each { name, p, cell }: its doors ('room[door]') and the rides' stops
     in it ('stag:pin', 'tram:pin', 'lift:pin'), the kingdom's whatever the save. */
  function nodesOf(room) {
    const out = [];
    for (const [d, [b]] of Object.entries(R.DOORS[room] || {})) { const p = doorAt(room, d, b); if (p) out.push({ name: `${room}[${d}]`, p, cell: cellAt(p) }); }
    for (const kind of ['stag', 'tram', 'lift']) {
      const stops = kind === 'stag' ? RIDES.stag.stops : Object.values(RIDES[kind].lines).flat();
      for (const pin of stops) if (stopRoom(pin) === room) { const p = stopPoint(kind, pin); if (p) out.push({ name: `${kind}:${pin}`, p, cell: snap(p) }); }
    }
    return out;
  }
  /* A room's table, as js/map-walk.js carries it: its nodes' names, the cost of the walk between
     each pair (the pairs i < j in order) and, for each node, the cost of the step through its
     door to the other side (-1 for a stop). For tools/extract-walk.js. */
  function tableOf(room) {
    const nodes = nodesOf(room);
    if (!nodes.length) return null;
    const costs = [], steps = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) costs.push(astar(nodes[i].cell, nodes[j].cell).cost);
    for (const nd of nodes) {
      const m = /^(.*)\[(.*)\]$/.exec(nd.name);
      if (!m) { steps.push(-1); continue; }
      const [b, e] = R.DOORS[room][m[2]], q = doorAt(b, e, room);
      steps.push(q ? astar(nd.cell, cellAt(q)).cost : -1);
    }
    const r3 = (c) => (c < 0 ? c : Math.round(c * 1000) / 1000);
    return [nodes.map((n) => n.name), costs.map(r3), steps.map(r3)];
  }

  /* ── The way ── */
  // A polyline's turns: the points more than eps off the line between their neighbours (Douglas-Peucker), the ends kept.
  function simplify(pts, eps) {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop(), [ax, ay] = pts[a], [bx, by] = pts[b], len = Math.hypot(bx - ax, by - ay);
      let k = -1, kd = eps;
      for (let i = a + 1; i < b; i++) {
        const [x, y] = pts[i];
        const d = len ? Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / len : Math.hypot(x - ax, y - ay);
        if (d > kd) { kd = d; k = i; }
      }
      if (k >= 0) { keep[k] = 1; stack.push([a, k], [k, b]); }
    }
    return pts.filter((p, i) => keep[i]);
  }
  const dedupe = (pts) => pts.filter((p, i) => !i || dist(p, pts[i - 1]) > 1e-6);

  function find(from, to, env) {
    const pa = env.point(from), pb = env.end || env.point(to);
    from = roomFor(from); to = roomFor(to);
    if (!pa || !pb || !R.DOORS[from] || !R.DOORS[to]) return null;
    const nodes = new Map();        // name → { room, p, cell, links: [[name, cost, kind]], i (its place in the room's table) }
    const byRoom = new Map();       // room → its nodes' names
    const walks = new Map();        // 'a>b' → the walk between two nodes (astar), once asked
    const walkOf = (a, b) => { const k = a + '>' + b; if (!walks.has(k)) walks.set(k, astar(nodes.get(a).cell, nodes.get(b).cell)); return walks.get(k); };
    // The rides the save allows: each stop's links to the stops it rides to.
    const links = {};
    const link = (a, b, cost, kind) => (links[a] = links[a] || []).push([b, cost, kind]);
    const stags = (env.stags || []).map((pin) => `stag:${pin}`);
    for (const a of stags) for (const b of stags) if (a !== b) link(a, b, RIDES.stag.worth, 'stag');
    for (const kind of ['tram', 'lift']) for (const line of env[kind + 's'] || []) {
      for (let i = 1; i < line.length; i++) {
        const p = stopPoint(kind, line[i - 1]), q = stopPoint(kind, line[i]);
        if (!p || !q) continue;
        const c = dist(p, q) * RIDES[kind].perUnit + RIDES[kind].stop;
        link(`${kind}:${line[i - 1]}`, `${kind}:${line[i]}`, c, kind); link(`${kind}:${line[i]}`, `${kind}:${line[i - 1]}`, c, kind);
      }
    }
    // A room's nodes: its doors (each a step from its other side) and stops, and the two ends.
    const ready = new Map();        // room → its table or null
    const add = (name, room, p, cell, nodeLinks, i) => {
      if (nodes.has(name)) return;
      nodes.set(name, { room, p, cell, links: nodeLinks, i });
      if (!byRoom.has(room)) byRoom.set(room, []);
      byRoom.get(room).push(name);
    };
    const ensure = (room) => {
      if (ready.has(room)) return;
      const table = (MW.TABLES && MW.TABLES[room]) || null;
      ready.set(room, table);
      nodesOf(room).forEach(({ name, p, cell }, k) => {
        const i = table && table[0][k] === name ? k : -1;
        let own = links[name] || [];
        const m = /^(.*)\[(.*)\]$/.exec(name);
        if (m) {
          const [b, e] = R.DOORS[room][m[2]], q = doorAt(b, e, room);
          own = q ? [[`${b}[${e}]`, i >= 0 && table[2][i] >= 0 ? table[2][i] : astar(cell, cellAt(q)).cost, 'door']] : [];
        }
        add(name, room, p, cell, own, i);
      });
      if (room === from) add('S', from, pa, snap(pa), [], -1);
      if (room === to) add('E', to, pb, snap(pb), [], -1);
    };
    // From one node of a room to another: by the table, or walked on the grid.
    const across = (a, b) => {
      const A = nodes.get(a), B = nodes.get(b), table = ready.get(A.room);
      if (table && A.i >= 0 && B.i >= 0) {
        const [i, j] = A.i < B.i ? [A.i, B.i] : [B.i, A.i], n = table[0].length;
        return table[1][i * n - (i * (i + 1)) / 2 + (j - i - 1)];
      }
      return walkOf(a, b).cost;
    };
    ensure(from);
    const cost = { S: 0 }, back = {}, seen = new Set(), open = ['S'];
    while (open.length) {
      let k = 0;
      for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[k]]) k = i;
      const n = open.splice(k, 1)[0];
      if (seen.has(n)) continue;
      seen.add(n);
      if (n === 'E') break;
      const N = nodes.get(n);
      const relax = (m, c, kind) => { if (seen.has(m)) return; const t = cost[n] + c; if (!(m in cost) || t < cost[m]) { cost[m] = t; back[m] = [n, kind]; open.push(m); } };
      for (const m of byRoom.get(N.room)) if (m !== n) relax(m, across(n, m), 'room');
      for (const [m, c, kind] of N.links) {
        const d = m.indexOf('[');
        ensure(d >= 0 ? m.slice(0, d) : stopRoom(m.slice(m.indexOf(':') + 1)));
        if (nodes.has(m)) relax(m, c, kind);
      }
    }
    if (!('E' in back)) return null;
    // Back from the end: the edges taken, in order.
    const edges = [];
    for (let n = 'E'; back[n]; n = back[n][0]) edges.unshift([back[n][0], n, back[n][1]]);
    if (env.trace) env.trace.push(...edges.map(([a, b, kind]) => `${a} -${kind}-> ${b}`));   // the way by name, for debug-walk.html
    // Into legs: the walks run on through doors, each edge walked on the grid; a ride is a leg of its own.
    const legs = [];
    let walk = [pa];
    const closeWalk = () => { const pts = simplify(dedupe(walk), CELL * 0.4); if (pts.length > 1) legs.push({ kind: 'walk', pts }); };
    for (const [a, b, kind] of edges) {
      const A = nodes.get(a), B = nodes.get(b);
      if (kind === 'room' || kind === 'door') walk.push(...walkOf(a, b).cells.map(centre), B.p);
      else { closeWalk(); legs.push({ kind, pts: [A.p, B.p] }); walk = [B.p]; }
    }
    closeWalk();
    return legs.length ? legs : null;
  }

  HK.walk = { RIDES, ALIAS, roomPoint, doorPoint, nodesOf, tableOf, find, grid, maskOf, cellAt, snap, astar, simplify };
  if (typeof module !== 'undefined' && module.exports) module.exports = HK.walk;
})();
