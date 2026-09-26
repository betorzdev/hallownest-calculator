#!/usr/bin/env node
/* tools/fetch-knight.js — the Knight's artwork, from hollowknight.wiki into assets/knight/.
   Needs python3 with Pillow for the animation strips (and to quantise, like the portraits).
   Usage: node tools/fetch-knight.js [--force]

   Three stills, with their name on the wiki:
     knight.png      the Knight from the front (The Knight.png, 1070 × 1461 as original). It's
                     painted ~130 px tall, so the 240 px wide thumbnail is enough: it covers
                     2× screens.
     shade.png       his Shade (The Knight Shade.png, 145 × 174): what remains on falling.
     overcharm.png   the purple aura the HUD puts behind the masks while you're overcharmed
                     (Overcharm.png, 746 × 165). At 480 wide, because the specks of light
                     blur if a small thumbnail is stretched.

   And three strips for the Knight who walks the page (js/app-knight.js, css: .kn), baked
   here from the wiki's sprites: cells of 104 × 140, feet on y = 134, body centred on x ≈ 53,
   facing right, one frame per cell from left to right.
     idle.png        1 cell:  The Knight Idle.png (63 × 132), standing.
     run.png         6 cells: Knight sprint.gif (102 × 138, 100 ms a frame). The gif has no
                     transparency: it comes on an opaque dark blue, (26, 30, 35), which is cut
                     out by colour distance (≤ 14 goes; the kept pixels next to a cut one and
                     still near it go half, so the edge doesn't saw). Its Knight runs to the
                     left (the nail on his back shows on the right), so every frame is mirrored
                     to face right like the other two. The frames aren't recentred: they're
                     already registered to each other.
     sit.png         1 cell:  The Knight Resting.png (81 × 121), sitting on a bench.
   The sprites are downloaded to a temporary folder and only the strips are kept. */
'use strict';
const fs = require('fs');
const os = require('os');
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
/* The sprites the strips are baked from (originals), and the strips they make. */
const SPRITES = {
  'Knight_sprint.gif':     'File:Knight sprint.gif',
  'The_Knight_Idle.png':   'File:The Knight Idle.png',
  'The_Knight_Resting.png': 'File:The Knight Resting.png',
};
const STRIPS = ['idle.png', 'run.png', 'sit.png'];

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

async function download(title, width, file) {
  let res = null;
  for (const url of await urlsOf(title, width)) {
    res = await fetch(url, { headers: UA });
    if (res.ok) break;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

/* To a 256-colour palette with its alpha, like the rest of the artwork. */
const PY_PALETTE = 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n'
  + '  im = Image.open(f)\n'
  + '  if im.mode != "RGBA": im = im.convert("RGBA")\n'
  + '  im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(f, optimize=True)\n';

/* The strips: python3 strips.py <sprites folder> <assets/knight>. */
const PY_STRIPS = `
import sys, os, math
from PIL import Image, ImageOps
src, out = sys.argv[1], sys.argv[2]
CELL = (104, 140); FEET = 134; CX = 53
BG = (26, 30, 35)
def dist(p): return math.sqrt((p[0] - BG[0]) ** 2 + (p[1] - BG[1]) ** 2 + (p[2] - BG[2]) ** 2)
def keyed(frame):
    im = frame.convert('RGBA'); w, h = im.size; px = im.load()
    d = [[dist(px[x, y]) for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if d[y][x] <= 14: px[x, y] = (0, 0, 0, 0)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or d[y][x] > 28: continue
            if any(0 <= x + i < w and 0 <= y + j < h and px[x + i, y + j][3] == 0 for i in (-1, 0, 1) for j in (-1, 0, 1)):
                px[x, y] = (r, g, b, 128)
    return im
def strip(frames, at):
    s = Image.new('RGBA', (CELL[0] * len(frames), CELL[1]), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        x, y = at(f)
        s.paste(f, (i * CELL[0] + x, y), f)
    return s.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
centred = lambda f: (CX - f.size[0] // 2, FEET - f.size[1])
gif = Image.open(os.path.join(src, 'Knight_sprint.gif'))
run = []
for i in range(gif.n_frames):
    gif.seek(i); run.append(ImageOps.mirror(keyed(gif.copy())))
strip(run, lambda f: (1, 0)).save(os.path.join(out, 'run.png'), optimize=True)
idle = Image.open(os.path.join(src, 'The_Knight_Idle.png')).convert('RGBA')
strip([idle], centred).save(os.path.join(out, 'idle.png'), optimize=True)
sit = Image.open(os.path.join(src, 'The_Knight_Resting.png')).convert('RGBA')
strip([sit], centred).save(os.path.join(out, 'sit.png'), optimize=True)
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  const fresh = [];
  for (const [dest, [title, width]] of Object.entries(FILES)) {
    const file = path.join(OUT, dest);
    if (!FORCE && fs.existsSync(file)) { ok++; continue; }
    try {
      await download(title, width, file);
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

  if (!FORCE && STRIPS.every((f) => fs.existsSync(path.join(OUT, f)))) { console.log(`${STRIPS.length} strips already in assets/knight/.`); return; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hollow-knight-'));
  try {
    for (const [name, title] of Object.entries(SPRITES)) {
      await download(title, 0, path.join(tmp, name));
      console.log('  ' + name + '  ←  ' + title);
    }
    execFileSync('python3', ['-c', PY_STRIPS, tmp, OUT], { stdio: 'pipe' });
    console.log(`${STRIPS.length} strips baked into assets/knight/ (${STRIPS.join(', ')}).`);
  } catch (e) {
    console.log('Strips FAILED: ' + (e.stderr ? e.stderr.toString().trim().split('\n').pop() : e.message) + ' (python3 with Pillow is needed).');
    process.exitCode = 1;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();
