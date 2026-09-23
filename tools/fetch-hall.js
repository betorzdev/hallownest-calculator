#!/usr/bin/env node
/* tools/fetch-hall.js — the artwork for the Hall of Gods tab, from hollowknight.wiki into
   assets/hall/. No dependencies (Node ≥ 18); if there's python3 with Pillow, it converts them
   to a 256-colour palette with alpha, like the portraits.
   Usage: node tools/fetch-hall.js [--force]

     <id>.png                  each pedestal's statue (35) and those of the 4 lever variants,
                               which have their own; the dreamcatcher ones share their
                               partner's (js/hall.js, artOf)
     badge-at/asra/radiant     the bronze, silver and radiant symbols you win
     idol-at/asra/radiant      the Knight's statue at the end of the Hall in its three states
                               (Void Idol, Lord of Shades, God of Gods)
     tablet                    the entrance tablet, the one you read to see the list
     tablet-hdr / tablet-ftr   the two ornaments of its screen, top and bottom: GMHr and GMFtr,
                               the same ones that frame the Godmaster pages on the wiki and
                               that appear, identical, in its screenshot ("Screenshot HK Hall of Gods 03")

   The statues have very different proportions (Gorb is 169 × 313; Oro and Mato, 1367 × 1117),
   so they're requested by height and not by width: they all arrive at the same height. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, '..', 'assets', 'hall');
const FORCE = process.argv.includes('--force');
const UA = { 'user-agent': 'hollow-stats/1.0 (proyecto personal)' };
const API = 'https://hollowknight.wiki/mw/api.php';

const STATUE_H = 240;
/* destination → [wiki file, thumbnail height] */
const FILES = {
  'badge-at.png':      ['File:Attuned Badge.png', 64],
  'badge-asra.png':    ['File:Ascended Badge.png', 64],
  'badge-radiant.png': ['File:Radiant Badge.png', 64],
  'idol-at.png':       ['File:Statue Knight.png', 160],
  'idol-asra.png':     ['File:Statue Lord of Shades.png', 160],
  'idol-radiant.png':  ['File:Statue God of Gods.png', 160],
  'tablet.png':        ['File:Hall of Gods-tablet.png', 160],
  'tablet-hdr.png':    ['File:GMHr.png', 111],
  'tablet-ftr.png':    ['File:GMFtr.png', 70],
};
const STATUE_FILE = {
  'gruz-mother': 'Statue Gruz Mother.png',
  'vengefly-king': 'Statue Vengefly King.png',
  'brooding-mawlek': 'Statue Brooding Mawlek.png',
  'false-knight': 'Statue False Knight.png',
  'hornet-protector': 'Statue Hornet Protector.png',
  'hornet-sentinel': 'Statue Hornet Sentinel.png',
  'massive-moss-charger': 'Statue Massive Moss Charger.png',
  'flukemarm': 'Statue Flukemarm.png',
  'mantis-lords': 'Statue Mantis Lords.png',
  'sisters-of-battle': 'Sisters of Battle.png',
  'oblobbles': 'Statue Oblobbles.png',
  'hive-knight': 'Statue Hive Knight.png',
  'broken-vessel': 'Statue Broken Vessel.png',
  'nosk': 'Statue Nosk.png',
  'winged-nosk': 'Statue Winged Nosk.png',
  'the-collector': 'Statue Collector.png',
  'god-tamer': 'Statue God Tamer.png',
  'crystal-guardian': 'Statue Crystal Guardian.png',
  'enraged-guardian': 'Statue Enraged Guardian.png',
  'uumuu': 'Statue Uumuu.png',
  'traitor-lord': 'Statue Traitor Lord.png',
  'grey-prince-zote': 'Statue Grey Prince Zote.png',
  'soul-warrior': 'Statue Soul Warrior.png',
  'soul-master': 'Statue Soul Master.png',
  'dung-defender': 'Statue Dung Defender.png',
  'watcher-knights': 'Statue Watcher Knights.png',
  'no-eyes': 'Statue No Eyes.png',
  'marmu': 'Statue Marmu.png',
  'xero': 'Statue Xero.png',
  'markoth': 'Statue Markoth.png',
  'galien': 'Statue Galien.png',
  'gorb': 'Statue Gorb.png',
  'elder-hu': 'Statue Elder Hu.png',
  'oro-mato': 'Statue Brothers Oro Mato.png',
  'sheo': 'Statue Paintmaster Sheo.png',
  'sly': 'Statue Great Nailsage Sly.png',
  'pure-vessel': 'Statue Pure Vessel.png',
  'grimm': 'Statue Grimm.png',
  'absolute-radiance': 'Absolute Radiance Statue.png',
};
for (const [id, file] of Object.entries(STATUE_FILE)) FILES[id + '.png'] = ['File:' + file, STATUE_H];

async function urlOf(title, height) {
  const url = `${API}?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size`
    + `&iiurlheight=${height}&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const page = (await res.json()).query.pages[0];
  const ii = page.imageinfo && page.imageinfo[0];
  if (!ii) throw new Error('not on the wiki');
  // If the original is already shorter, the wiki doesn't scale: it's used as is.
  return ii.height <= height ? ii.url : ii.thumburl || ii.url;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  const fresh = [];
  for (const [dest, [title, height]] of Object.entries(FILES)) {
    const file = path.join(OUT, dest);
    if (!FORCE && fs.existsSync(file)) { ok++; continue; }
    try {
      const res = await fetch(await urlOf(title, height), { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      ok++;
      fresh.push(file);
      console.log('  ' + dest + '  ←  ' + title);
    } catch (e) {
      console.log('  ' + dest + '  FAILED: ' + e.message);
    }
  }
  if (fresh.length) {
    const py = 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n'
      + '  im = Image.open(f)\n'
      + '  if im.mode != "RGBA": im = im.convert("RGBA")\n'
      + '  im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(f, optimize=True)\n';
    try { execFileSync('python3', ['-c', py, ...fresh], { stdio: 'pipe' }); console.log('Converted to a palette.'); }
    catch (err) { console.log('No python3/Pillow: they stay RGBA.'); }
  }
  console.log(`${ok} of ${Object.keys(FILES).length} in assets/hall/.`);
})();
