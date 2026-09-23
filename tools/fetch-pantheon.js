#!/usr/bin/env node
/* tools/fetch-pantheon.js — the artwork for the Pantheons tab, from hollowknight.wiki into
   assets/pantheon/. No dependencies (Node ≥ 18). Usage: node tools/fetch-pantheon.js [--force]

   Six files, with their name on the wiki:
     bind-nail/shell/charms/soul.png   the icons of the four bindings
     godseeker.png                     the image on the Godseeker's page
     bench.png                         the Pantheons bench's banner, whole: it's landscape
                                       (540 × 186) and the timeline tile frames it by the
                                       bench's knob with object-position, so it doesn't
                                       need cropping by hand.

   And three crops of the wiki's two screenshots of the rest room (2560 × 1440), one per
   station, for the rest cards. The two screenshots overlap: together they're the whole
   room, from left to right the cocoon, the hot springs and the bench.
     rest-spring.png    the hot springs, with their bather
     rest-bench.png     the bench
     rest-cocoon.png    the Lifeblood Cocoon and its flowers
   They come out at 560 × 315 (16:9, double the size they're painted at) and Pillow crops them;
   without python3 they aren't generated.

   Afterwards it's worth quantising them like the portraits (a 256-colour palette with alpha):
   the binding icons go from ~40 KB to ~10 KB with no visible difference. The crops already
   come out quantised: ~50 KB each, from ~260 KB. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, '..', 'assets', 'pantheon');
const FORCE = process.argv.includes('--force');
const UA = { 'user-agent': 'hollow-stats/1.0 (proyecto personal)' };
const API = 'https://hollowknight.wiki/mw/api.php';

/* destination → [wiki file, thumbnail width] */
const FILES = {
  'bind-nail.png':   ['File:Nail Binding.png', 96],
  'bind-shell.png':  ['File:Shell Binding.png', 96],
  'bind-charms.png': ['File:Charms Binding.png', 96],
  'bind-soul.png':   ['File:Soul Binding.png', 96],
  'godseeker.png':   ['File:Godseeker-2.png', 160],
  'bench.png':       ['File:Banner Bench.png', 360],
};

/* destination → [wiki screenshot, crop box in its pixels: left, top, right, bottom] */
const CROPS = {
  'rest-spring.png': ['File:Pantheons Hot Spring.png', [0, 560, 1280, 1280]],
  'rest-bench.png':  ['File:Pantheons Hot Spring.png', [1360, 745, 2240, 1240]],
  'rest-cocoon.png': ['File:Pantheons Lifeblood Cocoon.png', [180, 420, 1180, 982]],
};
const CROP_SIZE = [560, 315];

async function urlOf(title, width) {
  const url = `${API}?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url`
    + (width ? `&iiurlwidth=${width}` : '') + `&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const page = (await res.json()).query.pages[0];
  const ii = page.imageinfo && page.imageinfo[0];
  if (!ii) throw new Error('not on the wiki');
  return ii.thumburl || ii.url;
}

async function download(title, width) {
  const res = await fetch(await urlOf(title, width), { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/* Crops, scales and converts to a palette with Pillow: arguments source destination l t r b width height. */
const PY_CROP = 'import sys\nfrom PIL import Image\n'
  + 'src, dst = sys.argv[1], sys.argv[2]\n'
  + 'l, t, r, b, w, h = map(int, sys.argv[3:9])\n'
  + 'im = Image.open(src).convert("RGBA").crop((l, t, r, b)).resize((w, h), Image.LANCZOS)\n'
  + 'im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(dst, optimize=True)\n';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  for (const [dest, [title, width]] of Object.entries(FILES)) {
    const file = path.join(OUT, dest);
    if (!FORCE && fs.existsSync(file)) { ok++; continue; }
    try {
      fs.writeFileSync(file, await download(title, width));
      ok++;
      console.log('  ' + dest + '  ←  ' + title);
    } catch (e) {
      console.log('  ' + dest + '  FAILED: ' + e.message);
    }
  }

  // Each screenshot is downloaded once even if two crops come from it.
  const shots = {};
  for (const [dest, [title, box]] of Object.entries(CROPS)) {
    const file = path.join(OUT, dest);
    if (!FORCE && fs.existsSync(file)) { ok++; continue; }
    try {
      if (!shots[title]) {
        shots[title] = path.join(OUT, '.shot-' + Object.keys(shots).length + '.png');
        fs.writeFileSync(shots[title], await download(title, 0));
      }
      execFileSync('python3', ['-c', PY_CROP, shots[title], file, ...box.map(String), ...CROP_SIZE.map(String)], { stdio: 'pipe' });
      ok++;
      console.log('  ' + dest + '  ←  ' + title + ' [' + box.join(', ') + ']');
    } catch (e) {
      console.log('  ' + dest + '  FAILED: ' + (e.stderr ? 'no python3/Pillow' : e.message));
    }
  }
  for (const shot of Object.values(shots)) fs.rmSync(shot, { force: true });

  const total = Object.keys(FILES).length + Object.keys(CROPS).length;
  console.log(`${ok} of ${total} in assets/pantheon/.`);
})();
