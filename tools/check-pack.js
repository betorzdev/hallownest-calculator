#!/usr/bin/env node
/* tools/check-pack.js — the site against the game, on a folder of real saves.
   `npm run check-pack -- <folder>`: every userN.dat under it (at any depth) is imported as the
   site imports it (js/savefile.js → a slot's keys), and what the site then counts is set
   against what the game itself saved:
     completion  js/completion.js vs playerData.completionPercentage (must match: exit code 1 if not)
     journal     js/hunter.js vs journalEntriesCompleted / journalNotesCompleted /
                 journalEntriesTotal (only reported: the game updates those three now and then,
                 so an older save can be behind its own entries)
   The saves stay where they are: they're somebody's games and don't go in the repo. */
'use strict';
const fs = require('fs');
const path = require('path');
require('../js/data.js');
const C = require('../js/codec.js');
const HJ = require('../js/hunter.js');
const CP = require('../js/completion.js');
const F = require('../js/savefile.js');

const root = process.argv[2];
if (!root || !fs.existsSync(root)) {
  console.error('usage: npm run check-pack -- <folder with userN.dat saves>');
  process.exit(2);
}

function saves(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...saves(p));
    else if (/^user\d+\.dat$/.test(e.name)) out.push(p);
  }
  return out;
}
// Numbered folders (a route: "6.1 - …") in their order, the rest by name.
const order = (p) => parseFloat(path.relative(root, p)) || 0;
const files = saves(root).sort((a, b) => order(a) - order(b) || a.localeCompare(b));

let bad = 0, lag = 0, unreadable = 0;
for (const file of files) {
  const name = path.relative(root, file);
  const r = F.read(fs.readFileSync(file));
  if (!r.ok) { unreadable++; console.log(`??  ${name}: ${r.error}`); continue; }
  const snap = F.toSnapshot(r.pd);
  const json = (k, def) => (snap[k] ? JSON.parse(snap[k]) : def);
  const book = json('hollow.journal', {});
  const c = CP.count({
    build: C.decode(snap['hollow.build']), owned: json('hollow.owned', []), book, progress: json('hollow.progress', {}),
  });
  const game = Math.round(Number(r.pd.completionPercentage) || 0);
  const j = HJ.counts(book);
  const ours = [j.encountered, j.completed, j.total].join('/');
  const theirs = [r.pd.journalEntriesCompleted, r.pd.journalNotesCompleted, r.pd.journalEntriesTotal].join('/');
  const okC = c.total === game, okJ = ours === theirs;
  if (!okC) bad++;
  if (!okJ) lag++;
  const parts = okC ? '' : '  ' + c.categories.map((k) => `${k.id} ${k.got}/${k.max}`).join(', ');
  console.log(`${okC ? 'ok' : 'XX'}  ${String(c.total).padStart(3)}% (game ${String(game).padStart(3)}%)  `
    + `journal ${ours}${okJ ? '' : ` (game ${theirs})`}  ${name}  v${r.pd.version || '?'}${parts}`);
}
console.log(`\n${files.length} saves · completion: ${files.length - bad - unreadable} match, ${bad} differ`
  + ` · journal: ${lag} differ from the game's own counters · ${unreadable} unreadable`);
process.exit(bad || unreadable ? 1 : 0);
