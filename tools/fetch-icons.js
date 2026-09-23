#!/usr/bin/env node
/* tools/fetch-icons.js — downloads the game's original artwork from hollowknight.wiki's CDN
   into assets/. No dependencies (Node ≥ 18, global fetch).
   Usage: node tools/fetch-icons.js [--force]

   What it downloads:
     assets/charms/<id>.png       from CHARMS[].wikiFile
     assets/<group>/<key>.png     from HK.data.ART (nails, spells, arts, abilities, HUD)

   The CDN path follows MediaWiki's convention: /<md5[0]>/<md5[0..2]>/<File>.
   The 192 px thumbnail is requested first (the spell icons weigh up to 320 KB as
   originals); when the original is already 192 px or smaller the thumbnail gives 404 and the original is downloaded. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const data = require('../js/data.js');

const ROOT = path.join(__dirname, '..', 'assets');
const FORCE = process.argv.includes('--force');
const THUMB = 192;
const UA = { 'user-agent': 'hollow-stats/1.0 (proyecto personal)' };

/* The CDN puts thumb/ before the pair of digits and repeats the name at the end. */
function thumbUrl(file) {
  const md5 = crypto.createHash('md5').update(file).digest('hex');
  const name = encodeURIComponent(file).replace(/'/g, '%27');
  return `https://cdn.wikimg.net/en/hkwiki/images/thumb/${md5[0]}/${md5.slice(0, 2)}/${name}/${THUMB}px-${name}`;
}
function fullUrl(file) {
  const md5 = crypto.createHash('md5').update(file).digest('hex');
  const name = encodeURIComponent(file).replace(/'/g, '%27');
  return `https://cdn.wikimg.net/en/hkwiki/images/${md5[0]}/${md5.slice(0, 2)}/${name}`;
}

async function getPng(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('the response is not a PNG');
  return buf;
}

/* Download list: { dir, name, file } */
function jobs() {
  const list = data.CHARMS.map((c) => ({ dir: 'charms', name: c.id, file: c.wikiFile }));
  for (const [group, files] of Object.entries(data.ART)) {
    for (const [key, file] of Object.entries(files)) list.push({ dir: group, name: key, file });
  }
  return list;
}

(async () => {
  let ok = 0, skipped = 0;
  const failed = [];
  for (const job of jobs()) {
    const dir = path.join(ROOT, job.dir);
    const dest = path.join(dir, `${job.name}.png`);
    if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) { skipped++; continue; }
    fs.mkdirSync(dir, { recursive: true });
    let buf = null, err = null;
    for (const url of [thumbUrl(job.file), fullUrl(job.file)]) {
      try { buf = await getPng(url); break; } catch (e) { err = e; }
    }
    if (!buf) {
      failed.push(`${job.dir}/${job.name}`);
      console.error(`FAIL  ${job.dir}/${job.name}  ${job.file}  ${err.message}`);
      continue;
    }
    fs.writeFileSync(dest, buf);
    ok++;
    console.log(`ok    ${job.dir}/${job.name}  (${buf.length} bytes)`);
  }
  console.log(`${ok} downloaded, ${skipped} already there, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);
  process.exit(failed.length ? 1 : 0);
})();
