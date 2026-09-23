#!/usr/bin/env node
/* tools/fetch-knight.js — the artwork for your side of the arena, from hollowknight.wiki into
   assets/knight/. No dependencies (Node ≥ 18). Usage: node tools/fetch-knight.js [--force]

   Three files, with their name on the wiki:
     knight.png      the Knight from the front (The Knight.png, 1070 × 1461 as original). It's
                     painted ~130 px tall, so the 240 px wide thumbnail is enough: it covers
                     2× screens.
     shade.png       his Shade (The Knight Shade.png, 145 × 174): what remains on falling.
     overcharm.png   the purple aura the HUD puts behind the masks while you're overcharmed
                     (Overcharm.png, 746 × 165). At 480 wide, because the specks of light
                     blur if a small thumbnail is stretched.

   If there's python3 with Pillow they're quantised on download, like the portraits (a
   256-colour palette with alpha); if not, they stay RGBA. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, '..', 'assets', 'knight');
const FORCE = process.argv.includes('--force');
const UA = { 'user-agent': 'hollow-stats/1.0 (proyecto personal)' };
const API = 'https://hollowknight.wiki/mw/api.php';

/* destination → [wiki file, thumbnail width (0 = the original)] */
const FILES = {
  'knight.png':    ['File:The Knight.png', 240],
  'shade.png':     ['File:The Knight Shade.png', 0],
  'overcharm.png': ['File:Overcharm.png', 480],
};

/* The CDN only serves thumbnails someone has already requested: the Knight's 240 one gives
   404 even though the API returns its address. thumb.php, on the wiki itself, generates it at
   any width, so it's the fallback. */
async function urlsOf(title, width) {
  const url = `${API}?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url`
    + (width ? `&iiurlwidth=${width}` : '') + `&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const page = (await res.json()).query.pages[0];
  const ii = page.imageinfo && page.imageinfo[0];
  if (!ii) throw new Error('not on the wiki');
  if (!width) return [ii.url];
  const name = encodeURIComponent(title.replace(/^File:/, '').replace(/ /g, '_'));
  return [ii.thumburl, `https://hollowknight.wiki/mw/thumb.php?f=${name}&width=${width}`];
}

/* To a 256-colour palette with its alpha, like the rest of the artwork. */
const PY_PALETTE = 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n'
  + '  im = Image.open(f)\n'
  + '  if im.mode != "RGBA": im = im.convert("RGBA")\n'
  + '  im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(f, optimize=True)\n';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  const fresh = [];
  for (const [dest, [title, width]] of Object.entries(FILES)) {
    const file = path.join(OUT, dest);
    if (!FORCE && fs.existsSync(file)) { ok++; continue; }
    try {
      let res = null;
      for (const url of await urlsOf(title, width)) {
        res = await fetch(url, { headers: UA });
        if (res.ok) break;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      fresh.push(file);
      ok++;
      console.log('  ' + dest + '  ←  ' + title);
    } catch (e) {
      console.log('  ' + dest + '  FAILED: ' + e.message);
    }
  }
  if (fresh.length) {
    try { execFileSync('python3', ['-c', PY_PALETTE, ...fresh], { stdio: 'pipe' }); console.log('Converted to a palette.'); }
    catch (e) { console.log('No python3/Pillow: they stay RGBA.'); }
  }
  console.log(`${ok} of ${Object.keys(FILES).length} in assets/knight/.`);
})();
