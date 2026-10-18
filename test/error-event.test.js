/* test/error-event.test.js — what Footworn gets when a part of the page fails (errorProps in
   js/app.js, docs/guide.md "Files"): the part, the message cut to 64 characters, and the script
   and line, also when the script's address carries its version (?v=, npm run pages). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
const body = /function errorProps\(part, e\) \{\n([\s\S]*?)\n {2}\}/.exec(src);
const errorProps = new Function('part', 'e', body[1]);
const fail = (stack, message = 'App.sister.linkHtml is not a function') => ({ message, stack });

test('the script and line, with the version the pages put on it', () => {
  const e = fail('TypeError: x\n    at renderMasthead (https://hallownestcalculator.com/js/app.js?v=f7cd29ca:608:31)\n    at safely (https://hallownestcalculator.com/js/app.js?v=f7cd29ca:966:11)');
  assert.deepStrictEqual(errorProps('masthead', e), { part: 'masthead', msg: 'App.sister.linkHtml is not a function', at: 'app.js:608' });
});

test('and without it (a script loaded with no version)', () => {
  assert.strictEqual(errorProps('map', fail('TypeError: x\n    at draw (file:///site/js/app-map.js:120:5)')).at, 'app-map.js:120');
});

test('the message is cut to 64 characters, and a thrown value with no stack still reports', () => {
  assert.strictEqual(errorProps('x', fail('', 'a'.repeat(100))).msg.length, 64);
  assert.deepStrictEqual(errorProps('x', 'plain'), { part: 'x', msg: 'plain', at: '' });
});
