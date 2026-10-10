#!/usr/bin/env node
/* tools/trailer-v3/shots.js — the site's screens for the third trailer, captured at 2× with
   headless Chrome. `node tools/trailer-v3/shots.js <user?.dat | saves folder>`: a real save is
   dropped on the import (lit, then read) and loaded into slot 1 for the map, which is captured
   twice at the same layout: every pin (the "before") and only what's missing, with each pin's
   box dumped to JSON so trailer.html can make the ones you have vanish one by one.
   ONLY=drag,map… captures some; LANGS=en and FORMS=wide narrow it down.
   The Map's walk is filmed apart, by walk.js, from the slot written to out/ls.json.
   Out: tools/trailer-v3/out/shots/<lang>-<wide|tall>-<name>.png (+ -pins.js for the map, -zone.js for where the import's zone is). */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('../../js/data.js');
require('../../js/codec.js');
const F = require('../../js/savefile.js');
require('../../js/saves.js');
const S = globalThis.HK.saves;

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out', 'shots');
const pack = process.argv[2];
if (!pack) { console.error('usage: node tools/trailer-v3/shots.js <user?.dat | saves folder>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

function findSave(dir, name) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { const r = e.name === name ? findSave(p, '') : findSave(p, name); if (r) return r; }
    else if (!name && /^user\d\.dat$/.test(e.name)) return p;
  }
  return null;
}
/* The save the trailer drops: a .dat given as is (a plain game, with no mods: the preview says so),
   or from the pack, one mid-game, so that plenty vanishes and plenty stays. */
const SAVE = /\.dat$/.test(pack) ? pack : findSave(pack, "30.2 - Watcher's Spire - Pre Nail Upgrades");
const DROPPED = path.join(__dirname, 'out', 'user1.dat');
fs.copyFileSync(SAVE, DROPPED);
const r = F.read(fs.readFileSync(SAVE));
const mem = new Map();
const store = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
S.importTo(store, 1, F.toSnapshot(r.pd, r.sd, fs.statSync(SAVE).mtime.toISOString()));
S.select(store, 1);
const ls = JSON.stringify(Object.fromEntries(mem));
fs.writeFileSync(path.join(__dirname, 'out', 'ls.json'), ls);
const impfile = path.relative(ROOT, DROPPED);
/* FULL=<user?.dat>: a finished game for the screens that a mid-game one leaves empty (Pantheons, Achievements). */
let lsFull = ls;
if (process.env.FULL) {
  const rf = F.read(fs.readFileSync(process.env.FULL)), mf = new Map();
  const sf = { getItem: (k) => (mf.has(k) ? mf.get(k) : null), setItem: (k, v) => mf.set(k, String(v)), removeItem: (k) => mf.delete(k) };
  S.importTo(sf, 1, F.toSnapshot(rf.pd, rf.sd, fs.statSync(process.env.FULL).mtime.toISOString()));
  S.select(sf, 1);
  lsFull = JSON.stringify(Object.fromEntries(mf));
}

const BUILD = '#v=1&nail=4&masks=9&vessels=3&notches=11&spells=222&arts=111&charms=voidheart,ustrength,quickslash,fury';
const MAP = { view: 'map', ls, mapwhole: 1, mapfound: 1 };
const SHOTS = [
  // name, debug.html params, window size (wide), mobile height
  ['idle', { view: 'home', imp: 'idle', impfile }, [1440, 1000], 1700],
  ['drag', { view: 'home', imp: 'drag', impfile }, [1440, 1000], 1700],
  ['ready', { view: 'home', imp: 'ready', impfile }, [1440, 1000], 1700],
  ['map-all', { ...MAP, pins: 'all' }, [1440, 1250], 1400],
  ['map-missing', { ...MAP, pins: 'missing' }, [1440, 1250], 1400],
  ['home', { view: 'home', ls }, [1440, 1000], 1700],
  ['charms', { view: 'charms', hash: BUILD, hover: 'shaman' }, [1440, 960], 1800],
  ['achievements', { view: 'progress', pgshow: 'feats', ls: lsFull }, [1440, 1000], 1800],
  ['pantheon', { view: 'godhome', tab: 'pantheon', ls: lsFull }, [1440, 1000], 1800],
  ['inventory', { view: 'inventory', ls }, [1440, 1000], 1800],
  ['fight', { tab: 'combat', hash: BUILD, foe: 'false-knight', hits: 6, take: 2, freeze: 5000 }, [1440, 900], 1800],
];
const CHROME = process.env.CHROME || 'google-chrome';
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const langs = (process.env.LANGS || 'en,es').split(','), forms = (process.env.FORMS || 'wide,tall').split(',');
for (const lang of langs) for (const [name, params, [W, H], mH] of SHOTS) for (const form of forms) {
  if (only && !only.includes(name)) continue;
  const w = form === 'wide' ? W : 390, h = form === 'wide' ? H : mH;
  const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), lang, w, h });
  const url = 'file://' + path.join(ROOT, 'debug.html') + '?' + q;
  const args = ['--headless', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=2',
    '--blink-settings=primaryHoverType=2,primaryPointerType=4,availableHoverTypes=2,availablePointerTypes=4',
    '--virtual-time-budget=8000', `--window-size=${Math.max(w, 500)},${h}`];
  const file = path.join(OUT, `${lang}-${form}-${name}.png`);
  execFileSync(CHROME, [...args, `--screenshot=${file}`, url], { stdio: 'ignore', timeout: 90000 });
  console.log(file);
  /* The map's pins and the import's zone, dumped by debug.html. A script, not JSON:
     trailer.html runs over file://, where fetch() is blocked. */
  const dump = params.pins ? ['pins', 'PINS'] : params.imp === 'idle' ? ['zone', 'ZONE'] : null;
  if (dump) {
    const dom = execFileSync(CHROME, [...args, '--dump-dom', url], { encoding: 'utf8', maxBuffer: 64 << 20, timeout: 90000 });
    const m = dom.match(new RegExp(`<pre id="${dump[0]}">([^<]*)</pre>`));
    if (!m) { fs.writeFileSync(file + '.dom.html', dom); throw new Error(`no ${dump[0]} in ${name}`); }
    const json = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    fs.writeFileSync(file.replace(/\.png$/, `-${dump[0]}.js`), `(window.${dump[1]} = window.${dump[1]} || {})['${lang}-${form}-${name}'] = ${json};\n`);
  }
}
