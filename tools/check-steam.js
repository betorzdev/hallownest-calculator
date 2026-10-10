#!/usr/bin/env node
/* tools/check-steam.js — the site's Steam map against Steam's own schema, on this PC.
   `npm run check-steam [-- <appcache/stats folder>]` (default: Steam's on Linux,
   ~/.local/share/Steam/appcache/stats). It reads UserGameStatsSchema_367520.bin (the game's
   stats schema, which Steam writes there once the game has run) and checks that js/achievements.js's
   STEAM says the same: every achievement in the same stat and bit, none missing, none extra
   (exit code 1 if not). Then it reads each UserGameStats_<account>_367520.bin in the folder as
   the site does (js/steam.js) and prints what it holds: how many unlocked, the last one and when.
   The files stay where they are: they're somebody's account. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
require('../js/data.js');
const A = require('../js/achievements.js');
const ST = require('../js/steam.js');

const dir = process.argv[2] || path.join(os.homedir(), '.local/share/Steam/appcache/stats');
const schemaFile = path.join(dir, `UserGameStatsSchema_${ST.APP}.bin`);
if (!fs.existsSync(schemaFile)) {
  console.error(`no schema at ${schemaFile}: run the game once on Steam, or pass the folder`);
  process.exit(1);
}

let bad = 0;
const schema = ST.parseKV(fs.readFileSync(schemaFile))[String(ST.APP)];
const steamHas = {};   // key → [stat, bit], as Steam's schema says
for (const [stat, st] of Object.entries(schema.stats || {})) {
  if (st.type !== 'ACHIEVEMENTS') continue;
  for (const [bit, a] of Object.entries(st.bits || {})) steamHas[a.name] = [Number(stat), Number(bit)];
}
for (const [key, at] of Object.entries(steamHas)) {
  const ours = A.STEAM[key];
  if (!ours) { bad += 1; console.log(`✗  ${key} is in Steam's schema (stat ${at[0]}, bit ${at[1]}) and not in STEAM`); continue; }
  if (ours[0] !== at[0] || ours[1] !== at[1]) { bad += 1; console.log(`✗  ${key}: STEAM says ${ours.join('.')}, Steam ${at.join('.')}`); }
  if (!A.BY_KEY[key]) { bad += 1; console.log(`✗  ${key} isn't an achievement the site knows`); }
}
for (const key of Object.keys(A.STEAM)) if (!steamHas[key]) { bad += 1; console.log(`✗  ${key} is in STEAM and not in Steam's schema`); }
console.log(`${Object.keys(steamHas).length} achievements in Steam's schema (version ${schema.version}): ${bad ? bad + ' differences' : 'the map matches'}`);

const files = fs.readdirSync(dir).filter((f) => ST.NAME.test(f));
if (!files.length) console.log('no account file in the folder');
for (const f of files) {
  const r = ST.read(fs.readFileSync(path.join(dir, f)), f);
  if (!r.ok) { bad += 1; console.log(`✗  ${f}: ${r.error}`); continue; }
  const acc = A.account(r);
  const last = Object.entries(r.unlocked).sort((a, b) => b[1] - a[1])[0];
  const when = last && last[1] ? new Date(last[1] * 1000).toISOString().slice(0, 10) : '—';
  console.log(`${f}: ${acc.done}/${acc.total} unlocked; last ${last ? last[0] : '—'} on ${when}`);
  const missing = A.ACHIEVEMENTS.filter((a) => !acc.has(a.id)).map((a) => a.key);
  if (missing.length) console.log(`   missing: ${missing.join(' ')}`);
}
process.exitCode = bad ? 1 : 0;
