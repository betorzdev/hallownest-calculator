#!/usr/bin/env node
/* tools/trailer/shots.js — the site's screens for the trailer, captured at 2× with headless Chrome.
   `node tools/trailer/shots.js <saves folder>`: a real game (two saves from the pack, the second
   synced over the first so Your game shows "since last time") goes into slot 1, and debug.html
   captures each screen in both languages, wide (1440) and mobile (390).
   Out: tools/trailer/out/shots/<lang>-<wide|tall>-<name>.png (git-ignored). */
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
if (!pack) { console.error('usage: node tools/trailer/shots.js <saves folder>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

function findSave(dir, name) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { const r = e.name === name ? findSave(p, '') : findSave(p, name); if (r) return r; }
    else if (!name && /^user\d\.dat$/.test(e.name)) return p;
  }
  return null;
}
function snapOf(file) {
  const r = F.read(fs.readFileSync(file));
  return F.toSnapshot(r.pd, r.sd, fs.statSync(file).mtime.toISOString());
}
const mem = new Map();
const store = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
S.importTo(store, 1, snapOf(findSave(pack, "30 - King's Station - Post Kingdom's Edge")));
S.select(store, 1);
S.sync(store, 1, snapOf(findSave(pack, "30.2 - Watcher's Spire - Pre Nail Upgrades")));
const ls = JSON.stringify(Object.fromEntries(mem));

const BUILD = '#v=1&nail=4&masks=9&vessels=3&notches=11&spells=222&arts=111&charms=voidheart,ustrength,quickslash,fury';
const SHOTS = [
  // name, debug.html params, window size (wide), mobile height
  ['home', { view: 'home', live: 'live', ls }, [1440, 1200], 1700],
  ['map', { view: 'map', ls }, [1440, 1000], 1400],
  ['charms', { view: 'charms', hash: BUILD, hover: 'shaman' }, [1440, 960], 1800],
  ['effects', { view: 'charms', hash: BUILD.replace('voidheart,ustrength,quickslash,fury', 'voidheart,grubsong,elegy,weaversong,dreamshield,thorns') }, [1440, 1700], 2600],
  ['fight', { tab: 'combat', hash: BUILD, foe: 'false-knight', hits: 6, take: 2, freeze: 5000 }, [1440, 900], 1800],
  ['journal', { journal: 1, jseed: 'mix', jread: 'vengefly', jmark: 'seen' }, [1440, 900], 1600],
  ['hall', { view: 'godhome', tab: 'hall', marks: 'mix', statue: 'gruz-mother' }, [1440, 900], 1800],
  ['pantheon', { view: 'godhome', tab: 'pantheon', run: 'master', room: 5, masks: 3, lb: 3, cocoon: 3, bdone: 8 }, [1440, 900], 1800],
  ['progress', { view: 'progress', ls }, [1440, 1100], 1800],
];
const CHROME = process.env.CHROME || 'google-chrome';
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const lang of ['en', 'es']) for (const [name, params, [W, H], mH] of SHOTS) for (const form of ['wide', 'tall']) {
  if (only && !only.includes(name)) continue;
  const w = form === 'wide' ? W : 390, h = form === 'wide' ? H : mH;
  const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), lang, w, h });
  const file = path.join(OUT, `${lang}-${form}-${name}.png`);
  execFileSync(CHROME, ['--headless', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=2',
    '--blink-settings=primaryHoverType=2,primaryPointerType=4,availableHoverTypes=2,availablePointerTypes=4',
    '--virtual-time-budget=8000', `--window-size=${Math.max(w, 500)},${h}`, `--screenshot=${file}`,
    'file://' + path.join(ROOT, 'debug.html') + '?' + q], { stdio: 'ignore', timeout: 90000 });
  console.log(file);
}
