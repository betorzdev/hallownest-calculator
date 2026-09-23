#!/usr/bin/env node
/* tools/fetch-enemies.js — downloads the portrait of every enemy and boss from
   hollowknight.wiki into assets/enemies/<id>.png. No dependencies (Node ≥ 18).
   Usage: node tools/fetch-enemies.js [--force] [--size 200]

   Unlike fetch-icons.js, here we don't know the file name: the API is asked for it by the
   page title (`prop=pageimages`, which returns the infobox's main image) and at the same
   time for the thumbnail already scaled, which is what saves us the megabytes.

   Many common enemies have no infobox with an image, so there are three attempts per
   entry, from most to least reliable:
     1. `prop=pageimages` on its page.
     2. `File:B <Name>.png` — the Hunter's Journal portrait, which is the wiki's convention
        for enemies with a Journal entry. It resolves 26 of the 34 that failed with the
        first attempt.
     3. `File:<Name>.png` — the ones without a Journal entry (Goam and the Zotelings of
        the Eternal Ordeal).

   Some titles don't match the entry's name (the boss is called one thing and the page
   another): they go in ALIAS. Whatever isn't found is listed at the end to check by
   hand; the site works without a portrait.

   The page's image isn't always right: sometimes it's a state that isn't the fight's, or
   just a piece of the boss. Those carry their file in PORTRAIT. And the parts of a boss
   that are another character, or the same one in another state, carry their own picture
   (PART_ART, the part's art field in js/enemies.js), so each arena card shows who it is.
   To change one already downloaded, delete its .png and run the tool again. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const foes = require('../js/enemies.js');

const OUT = path.join(__dirname, '..', 'assets', 'enemies');
const FORCE = process.argv.includes('--force');
const sizeArg = process.argv.indexOf('--size');
const SIZE = sizeArg > -1 ? Number(process.argv[sizeArg + 1]) : 200;
const UA = { 'user-agent': 'hollow-stats/1.0 (proyecto personal)' };
const API = 'https://hollowknight.wiki/mw/api.php';

/* Wiki titles that aren't the name we use in the entry. */
const ALIAS = {
  'watcher-knights': 'Watcher Knight',
  'grimm': 'Troupe Master Grimm',
  'nkg': 'Nightmare King Grimm',
  'oro-mato': 'Brothers Oro & Mato',
  'sheo': 'Paintmaster Sheo',
  'sly': 'Great Nailsage Sly',
  'zote-the-mighty': 'Zote the Mighty',
  // The Colosseum clone has no art of its own: it's the same Zote.
  'zoteling-the-mighty': 'Zote the Mighty',
};

const title = (f) => ALIAS[f.id] || f.name.en;

/* Portraits that aren't their page's image. Checked by hand on 22 September 2026,
   against each entry's Hunter's Journal picture ("B <name>.png"). */
const PORTRAIT = {
  'false-knight': 'B False Knight.png',       // the page carries the unmasked one: it's the maggot
  'god-tamer': 'B God Tamer.png',             // the page carries the Tamer alone, without the Beast
  'flukemon': 'B Flukemon.png',               // the page carries only its top half
  // Failed Champion and Soul Tyrant have no picture of their own (nor a Journal entry
  // in the game): they are the dream variants of False Knight and Soul Master, and
  // they fight with the same figure. The wiki only keeps the Champion's bare head and
  // the Tyrant's stunned pose, so they carry their waking version's, in another pose.
  'failed-champion': 'Boss false knight.png',
  'soul-tyrant': 'Soul Master Idle.png',
  // Their page's image is their Hall statue, a black silhouette. In the fight they are the
  // same figures as the Mantis Lords ("Screenshot HK Sisters of Battle 01").
  'sisters-of-battle': 'B Mantis Lords.png',
};

/* The picture of each part that isn't its entry's portrait: <art>.png. */
const PART_ART = {
  'false-knight-maggot': 'False Knight Unmasked.png',
  'failed-champion-head': 'Failed-Champion.png',
  'god-tamer-tamer': 'God Tamer Tamer.png',
  'god-tamer-beast': 'God Tamer Beast.png',
  'oro-mato-oro': 'Oro.png',
  'oro-mato-mato': 'Mato.png',
  'flukemon-top': 'Flukemon Upper.png',
  'flukemon-bottom': 'Flukemon Lower.png',
  'mantis-lord': 'Mantis Lord Single.png',    // a single one: the Mantis Lords and the Sisters of Battle
};

/* The API accepts 50 titles per call. */
async function thumbs(titles) {
  const url = `${API}?action=query&format=json&prop=pageimages&pithumbsize=${SIZE}`
    + `&titles=${titles.map(encodeURIComponent).join('|')}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const json = await res.json();
  const out = {};
  const norm = {};
  for (const n of (json.query && json.query.normalized) || []) norm[n.to] = n.from;
  for (const page of Object.values((json.query && json.query.pages) || {})) {
    const asked = norm[page.title] || page.title;
    if (page.thumbnail && page.thumbnail.source) out[asked] = page.thumbnail.source;
  }
  return out;
}

/* Attempts 2 and 3: ask for a specific file instead of for the page. */
async function files(titles) {
  const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=${SIZE}`
    + `&titles=${titles.map(encodeURIComponent).join('|')}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const json = await res.json();
  const out = {};
  for (const page of Object.values((json.query && json.query.pages) || {})) {
    const ii = page.imageinfo && page.imageinfo[0];
    // If the original is already smaller than SIZE there's no thumbnail, and the original will do.
    if (ii) out[page.title] = ii.thumburl || ii.url;
  }
  return out;
}

/* A specific file at SIZE wide. The CDN only serves thumbnails someone has already requested,
   so it's scaled with thumb.php; if the original is narrower, it goes as is. */
async function fileUrl(name) {
  const url = `${API}?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size`
    + `&titles=${encodeURIComponent('File:' + name)}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const ii = ((await res.json()).query.pages[0].imageinfo || [])[0];
  if (!ii) throw new Error(`File:${name} doesn't exist`);
  return ii.width > SIZE
    ? `https://hollowknight.wiki/mw/thumb.php?f=${encodeURIComponent(name.replace(/ /g, '_'))}&width=${SIZE}`
    : ii.url;
}

async function getPng(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error('response too short');
  return buf;
}

/* If there's python3 with Pillow, to a 256-colour palette with alpha, like the rest. */
function toPalette(files) {
  if (!files.length) return;
  const py = 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n'
    + '  im = Image.open(f)\n'
    + '  if im.mode != "RGBA": im = im.convert("RGBA")\n'
    + '  im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(f, optimize=True)\n';
  try { execFileSync('python3', ['-c', py, ...files], { stdio: 'pipe' }); console.log('Converted to a palette.'); }
  catch (err) { console.log('No python3/Pillow: they stay RGBA.'); }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const fetched = [];
  // First the parts' pictures, which don't depend on any page.
  for (const [art, file] of Object.entries(PART_ART)) {
    const dest = path.join(OUT, art + '.png');
    if (!FORCE && fs.existsSync(dest)) continue;
    try {
      fs.writeFileSync(dest, await getPng(await fileUrl(file)));
      fetched.push(dest);
      console.log(`  ${art}.png  ←  ${file}`);
    } catch (e) { console.log(`  ${art}.png  FAILED: ${e.message}`); }
  }
  const pend = foes.FOES.filter((f) => FORCE || !fs.existsSync(path.join(OUT, f.id + '.png')));
  if (!pend.length) { toPalette(fetched); console.log('Nothing more to download: all', foes.FOES.length, 'images are there.'); return; }

  console.log(`Requesting ${pend.length} portraits at ${SIZE} px…`);
  const source = {};
  for (const f of pend.filter((x) => PORTRAIT[x.id])) {
    try { source[f.id] = await fileUrl(PORTRAIT[f.id]); } catch (e) { console.log(`  ${f.id}: ${e.message}`); }
  }
  const byPage = pend.filter((f) => !PORTRAIT[f.id]);
  const pageThumbs = {};
  for (let i = 0; i < byPage.length; i += 50) {
    Object.assign(pageThumbs, await thumbs(byPage.slice(i, i + 50).map(title)));
    process.stdout.write('.');
  }
  // The ones that had no page image: try the Journal and then the standalone file.
  for (const f of byPage) if (pageThumbs[title(f)]) source[f.id] = pageThumbs[title(f)];
  for (const pattern of [(n) => `File:B ${n}.png`, (n) => `File:${n}.png`]) {
    const remaining = byPage.filter((f) => !source[f.id]);
    if (!remaining.length) break;
    for (let i = 0; i < remaining.length; i += 50) {
      const batch = remaining.slice(i, i + 50);
      const found = await files(batch.map((f) => pattern(title(f))));
      for (const f of batch) if (found[pattern(title(f))]) source[f.id] = found[pattern(title(f))];
      process.stdout.write('.');
    }
  }
  process.stdout.write('\n');

  let ok = 0;
  const missing = [];
  for (const f of pend) {
    const src = source[f.id];
    if (!src) { missing.push(`${f.id} (${title(f)}): no page image, no Journal file, no standalone file`); continue; }
    try {
      fs.writeFileSync(path.join(OUT, f.id + '.png'), await getPng(src));
      fetched.push(path.join(OUT, f.id + '.png'));
      ok++;
    } catch (e) {
      missing.push(`${f.id}: ${e.message}`);
    }
  }
  console.log(`Downloaded ${ok} of ${pend.length}.`);
  toPalette(fetched);
  if (missing.length) {
    console.log(`\nNo portrait (${missing.length}) — the site paints them as a silhouette:`);
    for (const l of missing) console.log('  ' + l);
  }
})();
