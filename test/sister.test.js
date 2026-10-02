/* test/sister.test.js — the sister site's link and its Hornet (js/app-sister.js): hidden until the
   sister is published, every move she plays drawn (js/hornet-moves.js, tools/extract-hornet.py), and
   the page loading both scripts. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/app-sister.js'), 'utf8');
const i18n = require('../js/i18n.js');
require('../js/hornet-moves.js');
const { HORNET } = globalThis.HK;

test('the link stays hidden until the sister is published', () => {
  assert.match(src, /const SISTER = false;/);
});

test('every move she plays is in js/hornet-moves.js, with its strip', () => {
  const names = new Set([...src.matchAll(/\b(?:play|loop|show)\('([\w-]+)'/g)].map((m) => m[1]));
  assert.ok(names.size >= 10, 'found her moves in the script');
  for (const n of names) {
    const m = HORNET.MOVES[n];
    assert.ok(m, `${n} is in js/hornet-moves.js`);
    assert.ok(m.n > 0 && m.fps > 0 && m.w > 0 && m.h > 0, `${n} has frames`);
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/hornet', n + '.png')), `assets/hornet/${n}.png`);
  }
  assert.ok(HORNET.FLOOR > 0);
});

test('its strings come in both languages', () => {
  for (const k of ['sister', 'sisterHint']) {
    const s = i18n.UI[k];
    assert.ok(s && s.es && s.en, k);
  }
});

test('the page loads the moves and the script, after the Knight and before the boot', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const at = (f) => html.search(new RegExp(`<script src="js/${f.replace('.', '\\.')}(\\?v=[0-9a-f]+)?"></script>`));
  assert.ok(at('hornet-moves.js') > 0 && at('hornet-moves.js') < at('app.js'));
  assert.ok(at('app-knight.js') < at('app-sister.js') && at('app-sister.js') < at('app-boot.js'));
});
