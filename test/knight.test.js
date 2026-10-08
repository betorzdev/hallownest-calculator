/* test/knight.test.js — the Knight who walks the page (js/app-knight.js): every move he plays drawn
   from the game (js/knight-moves.js, tools/extract-knight.py) with its strip in assets/knight/, the
   page loading the module before him, and his height on the bar. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/app-knight.js'), 'utf8');
require('../js/knight-moves.js');
const { KNIGHT } = globalThis.HK;

test('every move he plays is in js/knight-moves.js, with its strip, registered to one pivot', () => {
  const names = new Set([...src.matchAll(/\b(?:play|loop|show|pinSvg|frame\(pin,)\s*\(?'([\w-]+)'/g)].map((m) => m[1]));
  for (const base of [...src.matchAll(/loop\('([\w-]+)' \+ \(/g)].map((m) => m[1])) {
    for (const v of ['', '-shell', '-spore', '-both']) names.add(base + v);   // the slug's variants
  }
  assert.ok(names.size >= 15, `found his moves in the script (${names.size})`);
  for (const n of names) {
    const m = KNIGHT.MOVES[n];
    assert.ok(m, `${n} is in js/knight-moves.js`);
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/knight', n + '.png')), `assets/knight/${n}.png is there`);
    assert.ok(m.n >= 1 && m.fps > 0 && m.w > 0 && m.h > 0, `${n} has frames and a cell`);
    assert.ok(m.px > 0 && m.px < m.w && m.py > 0 && m.py < m.h, `${n}'s pivot is inside its cell`);
    assert.ok(m.loop >= -1 && m.loop < m.n, `${n}'s loopStart is a frame of it, or -1`);
  }
  assert.ok(KNIGHT.FLOOR > 0 && KNIGHT.FLOOR < KNIGHT.MOVES.idle.h, 'his feet are below the pivot, inside the idle cell');
});

test('the strips he carries are the ones the site plays: no clip only the design page needs', () => {
  const strips = fs.readdirSync(path.join(ROOT, 'assets/knight')).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
  const stills = ['knight', 'shade', 'overcharm'];   // the wiki's (tools/fetch-knight.js)
  for (const s of strips) assert.ok(stills.includes(s) || KNIGHT.MOVES[s], `assets/knight/${s}.png is a move or a still`);
  for (const n of Object.keys(KNIGHT.MOVES)) assert.ok(strips.includes(n), `${n} has its strip`);
});

test('the page loads js/knight-moves.js before js/app-knight.js and js/app-map.js', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const at = (f) => html.indexOf(`<script src="js/${f}`);
  assert.ok(at('knight-moves.js') > 0, 'js/knight-moves.js is loaded');
  assert.ok(at('knight-moves.js') < at('app-map.js') && at('knight-moves.js') < at('app-knight.js'), 'before the scripts that draw him');
});

test('he stands 32 px on the bar, with room under the titles', () => {
  const tokens = fs.readFileSync(path.join(ROOT, 'css/tokens.css'), 'utf8');
  assert.match(tokens, /--kn-bar: 32px;/);
  const css = fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8');
  assert.match(css, /\.nav-tab \{ white-space: nowrap; padding-bottom: 12px; \}/);
});
