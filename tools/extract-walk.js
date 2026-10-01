#!/usr/bin/env node
/* tools/extract-walk.js — generates js/map-walk.js: where the Knight can walk on the map, room by
   room, read from the map's own drawings (assets/map/rooms-full.png, js/map.js). `npm run walk`.
   No dependencies; needs Node 18. Rerun it after tools/extract-map.py.

   The game draws each room as its corridors and chambers, filled, over nothing: a pixel that's
   drawn is somewhere the Knight can be, and the empty space between corridors is rock. So each
   room's walkable ground is its drawing's fill, sampled on a grid of CELL map units (a fortieth
   of a unit: two and a half of the atlas's pixels, a corridor being six to ten cells wide): a
   cell is ground when at least half its pixels are (groundAt): the dark fill, and a light line
   only where it doesn't border the empty background (a platform drawn across a shaft, which he
   walks over); the outline by the background is a wall, rock, as is the black gap between two
   corridors (so he never walks a wall's line, nor crosses it). A room with several
   drawings (its _b, _left… pieces, and the one the game swaps in once the world changes there,
   js/map.js's alt) is the union of them all: whatever is ever drawn is ground.

   The output, per room (the scene the doors name, js/rooms.js): [x0, y0, w, h, runs]: the grid's
   bottom-left corner in the map's units (y upwards), its size in cells, and the cells as run
   lengths, row by row from the top row down, the rows laid end to end, alternating rock and
   ground and starting with rock; each run one character of RLE64 (0–63; a longer run is written
   as 63, then a zero run of the other kind, then the rest). js/app-knight.js decodes them. */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const M = require(path.join(ROOT, 'js', 'map.js'));
const R = require(path.join(ROOT, 'js', 'rooms.js'));
const ATLAS = path.join(ROOT, 'assets', 'map', 'rooms-full.png');
const OUT = path.join(ROOT, 'js', 'map-walk.js');

const CELL = 0.025;         // map units a cell
const DRAWN = 40;           // alpha above which a pixel is drawn
const LIT = 100;            // luminance from which a drawn pixel is a line (an outline or a platform), not the fill
const EDGE = 3;             // pixels: a line this close to the empty background is a wall
const GROUND = 0.5;         // the share of a cell's pixels that must be ground
const RLE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/* A PNG's pixels: 8-bit RGBA, not interlaced (what tools/extract-map.py writes). → { w, h, data } */
function readPng(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG: ' + file);
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('latin1', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || type !== 6 || interlace) throw new Error(`unsupported PNG (depth ${depth}, type ${type}, interlace ${interlace})`);
  const bpp = 4, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), data = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride, up = dst - stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= bpp ? data[dst + i - bpp] : 0, b = y ? data[up + i] : 0, c = y && i >= bpp ? data[up + i - bpp] : 0;
      let v;
      if (f === 0) v = x;
      else if (f === 1) v = x + a;
      else if (f === 2) v = x + b;
      else if (f === 3) v = x + ((a + b) >> 1);
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      else throw new Error('bad PNG filter ' + f);
      data[dst + i] = v & 255;
    }
  }
  return { w, h, data };
}

// A drawing's name → the room it draws (js/rooms.js's scene), or '' (none the doors know).
const sceneOf = (name) => (R.DOORS[name] ? name : (([, s]) => (R.DOORS[s] ? s : ''))(/^(.*)_(b|c|d|part_b|left|right|top|bot|top_2)$/.exec(name) || []));

(() => {
  const png = readPng(ATLAS);
  const alphaAt = (x, y) => (x < 0 || y < 0 || x >= png.w || y >= png.h ? 0 : png.data[(y * png.w + x) * 4 + 3]);
  /* A pixel of the ground: the fill (drawn and dark), or a light line that has no empty background
     within EDGE pixels: a platform or a ledge drawn across a corridor, which he walks over. A line
     by the background is the drawing's outline, a wall: rock, as the gap between two corridors. */
  const groundAt = (x, y) => {
    if (alphaAt(x, y) <= DRAWN) return false;
    const i = (y * png.w + x) * 4;
    if (0.3 * png.data[i] + 0.59 * png.data[i + 1] + 0.11 * png.data[i + 2] < LIT) return true;
    for (let dy = -EDGE; dy <= EDGE; dy++) for (let dx = -EDGE; dx <= EDGE; dx++) if (alphaAt(x + dx, y + dy) <= DRAWN) return false;
    return true;
  };
  // Each room's drawings: [centre x, centre y, width, height (map units), atlas rect].
  const byScene = {};
  for (const [name, r] of Object.entries(M.ROOMS)) {
    const sc = sceneOf(name);
    if (!sc) continue;
    const [, cx, cy, w, h, , , full, , alt] = r;
    (byScene[sc] = byScene[sc] || []).push([cx, cy, w, h, full]);
    if (alt) byScene[sc].push([cx, cy, w, h, alt]);
  }
  const lines = [];
  let cells = 0, ground = 0, chars = 0;
  for (const sc of Object.keys(byScene).sort()) {
    const draws = byScene[sc];
    // The grid: the union of the drawings' boxes, on CELL's lattice.
    const x0 = Math.floor(Math.min(...draws.map((d) => d[0] - d[2] / 2)) / CELL) * CELL;
    const y0 = Math.floor(Math.min(...draws.map((d) => d[1] - d[3] / 2)) / CELL) * CELL;
    const x1 = Math.ceil(Math.max(...draws.map((d) => d[0] + d[2] / 2)) / CELL) * CELL;
    const y1 = Math.ceil(Math.max(...draws.map((d) => d[1] + d[3] / 2)) / CELL) * CELL;
    const w = Math.round((x1 - x0) / CELL), h = Math.round((y1 - y0) / CELL);
    const grid = new Uint8Array(w * h);
    for (const [cx, cy, dw, dh, [ax, ay, aw, ah]] of draws) {
      // The drawing's pixels that fall in each cell (the atlas at the drawing's own scale).
      const sx = aw / dw, sy = ah / dh;
      for (let j = 0; j < h; j++) {
        const top = y1 - j * CELL, bot = top - CELL;           // the row's y span, map units
        const py0 = Math.floor((cy + dh / 2 - top) * sy), py1 = Math.ceil((cy + dh / 2 - bot) * sy);
        for (let i = 0; i < w; i++) {
          const left = x0 + i * CELL, right = left + CELL;
          const px0 = Math.floor((left - (cx - dw / 2)) * sx), px1 = Math.ceil((right - (cx - dw / 2)) * sx);
          let n = 0, on = 0;
          for (let py = Math.max(0, py0); py < Math.min(ah, py1); py++) for (let px = Math.max(0, px0); px < Math.min(aw, px1); px++) { n++; if (groundAt(ax + px, ay + py)) on++; }
          if (n && on / n >= GROUND) grid[j * w + i] = 1;
        }
      }
    }
    // The runs, rock first.
    let runs = '', cur = 0, len = 0;
    const emit = () => { while (len > 63) { runs += RLE64[63] + RLE64[0]; len -= 63; } runs += RLE64[len]; };
    for (let k = 0; k < grid.length; k++) {
      if (grid[k] === cur) { len++; continue; }
      emit(); cur = grid[k]; len = 1;
    }
    emit();
    if (!grid.some((v) => v)) continue;              // a drawing with nothing in it (Ruins1_31b): no ground, he goes straight
    cells += grid.length; ground += grid.reduce((a, b) => a + b, 0); chars += runs.length;
    lines.push(`    ${JSON.stringify(sc)}: [${x0.toFixed(2)}, ${y0.toFixed(2)}, ${w}, ${h}, ${JSON.stringify(runs)}],`);
  }
  /* The tables: what it costs to cross each room between its doors and stops, and to step through
     each door, by js/walk.js's own walk on these masks (so the two always agree), which needs them
     loaded first. */
  globalThis.HK = globalThis.HK || {};
  globalThis.HK.mapWalk = { CELL, RLE64, MASKS: Object.fromEntries(lines.map((l) => { const m = /^\s*("[^"]+"): (\[.*\]),$/.exec(l); return [JSON.parse(m[1]), JSON.parse(m[2])]; })) };
  const W = require(path.join(ROOT, 'js', 'walk.js'));
  const tables = [];
  for (const sc of Object.keys(R.DOORS).sort()) {
    const t = W.tableOf(sc);
    if (t) tables.push(`    ${JSON.stringify(sc)}: [${JSON.stringify(t[0])}, [${t[1].join(', ')}], [${t[2].join(', ')}]],`);
  }
  fs.writeFileSync(OUT, [
    '/* js/map-walk.js — GENERATED by tools/extract-walk.js (`npm run walk`) from the map\'s drawings',
    '   (assets/map/rooms-full.png, js/map.js): don\'t edit by hand. Where the Knight can walk on the',
    '   map, room by room: the ground each room\'s drawing covers, on a grid of CELL map units.',
    '     MASKS  scene → [x0, y0, w, h, runs]: the grid\'s bottom-left corner (the map\'s units, y',
    '            upwards), its size in cells, and the cells as run lengths, row by row from the top',
    '            row down, the rows laid end to end, alternating rock and ground and starting with',
    '            rock; each run one character of RLE64 (a longer run is 63, a zero run of the other',
    '            kind, then the rest). js/walk.js decodes them and walks the ground.',
    '     TABLES scene → [names, costs, steps]: the room\'s doors and stops (js/walk.js, nodesOf),',
    '            what it costs to walk between each pair (the pairs i < j in order, in map units on',
    '            the grid, rock crossed at js/walk.js\'s ROCK) and, for each, the step through its',
    '            door to the other side (-1 for a stop), so a way across the kingdom needn\'t walk',
    '            every room\'s grid. */',
    '(() => {',
    "  'use strict';",
    '  const HK = globalThis.HK || (globalThis.HK = {});',
    `  const CELL = ${CELL};`,
    `  const RLE64 = '${RLE64}';`,
    '  const MASKS = {',
    ...lines,
    '  };',
    '  const TABLES = {',
    ...tables,
    '  };',
    '  HK.mapWalk = { CELL, RLE64, MASKS, TABLES };',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = HK.mapWalk;",
    '})();',
    '',
  ].join('\n'));
  console.log(`js/map-walk.js: ${lines.length} rooms, ${cells} cells (${Math.round(100 * ground / cells)}% ground), ${chars} characters of runs, ${tables.length} tables`);
})();
