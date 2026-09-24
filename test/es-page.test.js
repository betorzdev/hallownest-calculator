/* test/es-page.test.js — es/index.html is index.html with a Spanish <head>, never behind it.
   Whoever edits index.html runs `npm run es`; otherwise the Spanish page would load an old copy. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { build } = require('../tools/es-page.js');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('es/index.html is up to date with index.html (npm run es)', () => {
  assert.strictEqual(read('es/index.html'), build(read('index.html')));
});

test('both pages point at each other and at themselves', () => {
  const SITE = 'https://betorzdev.github.io/hallownest-calculator/';
  for (const [file, own] of [['index.html', SITE], ['es/index.html', SITE + 'es/']]) {
    const html = read(file);
    assert.match(html, new RegExp(`<link rel="canonical" href="${own}">`), file);
    assert.match(html, new RegExp(`hreflang="en" href="${SITE}"`), file);
    assert.match(html, new RegExp(`hreflang="es" href="${SITE}es/"`), file);
  }
});
